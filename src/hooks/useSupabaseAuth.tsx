import React from 'react';
import { supabase, hasSupabaseConfig } from '../lib/supabaseClient';
import type { User } from '@supabase/supabase-js';

export type UserRole = 'Cabinet' | 'Communication' | 'Admin' | 'Guest' | 'Super_Admin';

export type SupabaseProfile = {
  id: string;
  role: UserRole;
  full_name?: string;
  avatar_url?: string;
};

export function normalizeRole(rawRole?: string): UserRole {
  const value = (rawRole || 'Guest').toString().trim().toLowerCase();
  const normalized = value.replace(/[_\s-]+/g, ' ');

  if (/^(super admin|super_admin|super-admin|superadmin)$/.test(normalized)) {
    return 'Super_Admin';
  }

  if (/^(admin|administrator)$/.test(normalized)) {
    return 'Admin';
  }

  if (/^(communication|service communication|service comm|comm|communication service)$/.test(normalized)) {
    return 'Communication';
  }

  if (/^(cabinet|cabinet member|cheffe de cabinet|chef de cabinet|cabinet du ministère)$/.test(normalized)) {
    return 'Cabinet';
  }

  return 'Guest';
}

export type AuthContextValue = {
  user: User | null;
  profile: SupabaseProfile | null;
  loading: boolean;
  profileLoading: boolean;  // ⭐ Track profile loading separately
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName?: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: (userId?: string) => Promise<void>;
  retryAuth: () => Promise<void>;
};

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [profile, setProfile] = React.useState<SupabaseProfile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [profileLoading, setProfileLoading] = React.useState(false);  // ⭐ Track profile loading
  const [error, setError] = React.useState<string | null>(null);
  
  // ⭐ CRITICAL: Track if we've already initiated auth to prevent lock contention
  const authInitiatedRef = React.useRef(false);
  const isMountedRef = React.useRef(true);

  const getAuthInitErrorMessage = (err?: unknown) => {
    // ⭐ Ignore expected/non-critical errors
    if (err instanceof Error) {
      const msg = err.message.toLowerCase();
      
      // These errors are NORMAL and don't need to be shown to the user
      if (msg.includes('refresh token not found') || 
          msg.includes('invalid refresh token') ||
          msg.includes('invalid token')) {
        console.debug("ℹ️ Auth state: No active session (user not logged in)");
        return null; // Return null to NOT show error to user
      }
    }
    
    if (!window.navigator.onLine) {
      return "Vous êtes hors ligne. Vérifiez votre connexion Internet.";
    }
    if (!hasSupabaseConfig) {
      return "Supabase n'est pas configuré. Vérifiez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.";
    }
    if (err instanceof Error) {
      return `Impossible de contacter Supabase : ${err.message}`;
    }
    return "Impossible de contacter Supabase. Vérifiez votre connexion et la configuration.";
  };

  const fetchProfile = React.useCallback(async (userId: string) => {
  if (!hasSupabaseConfig) return;

  console.log(`🔍 Fetching profile for user: ${userId}`);
  const startTime = performance.now();

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    const duration = performance.now() - startTime;
    console.log(`⏱️ Profile query took ${duration.toFixed(0)}ms`);

    if (error) {
      // PROFIL N'EXISTE PAS - Créer un profil par défaut
      if (error.code === 'PGRST116') {
        console.log('⚠️ Profile not found - creating default profile for user:', userId);
        
        const createStart = performance.now();
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert([{ 
            id: userId, 
            role: 'Guest',  // Default role for new users
            full_name: 'Utilisateur',
            created_at: new Date().toISOString()
          }])
          .select('*')
          .single();
        
        const createDuration = performance.now() - createStart;
        console.log(`⏱️ Profile creation took ${createDuration.toFixed(0)}ms`);
        
        if (createError) {
          console.error('❌ Erreur création profil par défaut:', createError.message);
          setProfile(null);
          return;
        }
        
        if (newProfile) {
          console.log('✅ Default profile created:', { id: newProfile.id, role: newProfile.role });
          setProfile({
            id: newProfile.id,
            role: normalizeRole(newProfile.role),
            full_name: newProfile.full_name,
            avatar_url: newProfile.avatar_url,
          });
        }
      } else {
        console.warn('❌ Erreur lors de la récupération du profil:', error.message);
        setProfile(null);
      }
      return;
    }

    if (data) {
      console.log('✅ Profile loaded successfully:', { id: data.id, role: data.role });
      setProfile({
        id: data.id,
        role: normalizeRole(data.role),
        full_name: data.full_name,
        avatar_url: data.avatar_url,
      });
    }
  } catch (err) {
    console.error('Erreur inattendue fetchProfile:', err);
    setProfile(null);
  }
}, []);

  const refreshProfile = React.useCallback(async (userId?: string) => {
    if (!hasSupabaseConfig) return;
    const targetUserId = userId || user?.id;
    if (!targetUserId) return;
    await fetchProfile(targetUserId);
  }, [fetchProfile, user]);

  const retryAuth = React.useCallback(async () => {
    if (!hasSupabaseConfig) {
      setError("Supabase n'est pas configuré. Vérifiez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.");
      setLoading(false);
      return;
    }

    if (isMountedRef.current) {
      setError(null);
      setLoading(true);
    }

    try {
      // Don't call getSession() to avoid lock contention
      // The onAuthStateChange listener will handle auth state
      // Just refresh the profile if user exists
      if (user) {
        await fetchProfile(user.id);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(getAuthInitErrorMessage(err));
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [user, fetchProfile]);

  React.useEffect(() => {
    isMountedRef.current = true;
    // Cleanup on unmount
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  React.useEffect(() => {
    if (!hasSupabaseConfig) {
      if (isMountedRef.current) {
        setError("Supabase n'est pas configuré. Vérifiez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.");
        setLoading(false);
      }
      return;
    }

    // ⭐ CRITICAL: Prevent multiple simultaneous auth initialization
    if (authInitiatedRef.current) {
      console.debug("🔒 Auth already initiated, skipping duplicate initialization");
      return;
    }
    authInitiatedRef.current = true;

    if (isMountedRef.current) {
      setError(null);
    }

    let authListenerUnsubscribe: (() => void) | null = null;
    let listenerCalledRef = { called: false };

    // ⭐ Use onAuthStateChange as PRIMARY source of truth
    // Don't call getSession() - let the listener handle auth state
    
    // AGGRESSIVE FAILSAFE: If listener doesn't respond in 3s, end loading anyway
    // The listener will still run in background to load the profile
    const failSafeTimeout = window.setTimeout(() => {
      if (!isMountedRef.current) return;
      
      if (!listenerCalledRef.called) {
        console.warn("⏱️ Auth state listener didn't respond within 3s - treating as no session");
        setLoading(false);
        setProfile(null);
        setUser(null);
      } else {
        console.log("✅ Auth state listener responded, no need for failsafe");
      }
    }, 3000);

    try {
      console.log("🚀 Initializing auth state listener...");
      const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!isMountedRef.current) return;

        listenerCalledRef.called = true;
        console.log(`📡 Auth state changed: event=${event}, hasSession=${!!session}`);
        
        const user = session?.user ?? null;
        setUser(user);
        
        // ⭐ CRITICAL FIX: Don't await fetchProfile here - load it in background
        // This was blocking the listener and causing long timeouts
        if (user) {
          console.log(`✅ User logged in: ${user.email}`);
          setError(null);
          setProfileLoading(true);  // ⭐ Mark profile as loading
          
          // Load profile in background WITHOUT blocking the listener
          // This allows setLoading(false) to happen immediately
          // BUT profileLoading stays true until profile is fully loaded
          fetchProfile(user.id)
            .catch(err => {
              console.warn("⚠️ Background profile fetch error:", err);
            })
            .finally(() => {
              console.log("✅ Profile loading complete");
              setProfileLoading(false);  // ⭐ Mark profile as done loading
            });
        } else {
          console.log("ℹ️ User logged out or no session");
          setProfile(null);
          setProfileLoading(false);
        }

        // ⭐ Clear timeout and finish loading immediately
        // Don't wait for profile to finish loading
        if (failSafeTimeout) {
          window.clearTimeout(failSafeTimeout);
        }
        setLoading(false);
      });

      authListenerUnsubscribe = authListener.subscription.unsubscribe;
    } catch (err) {
      console.error("❌ Auth listener error:", err);
      listenerCalledRef.called = true;
      if (isMountedRef.current) {
        setError(getAuthInitErrorMessage(err));
        setLoading(false);
      }
      if (failSafeTimeout) {
        window.clearTimeout(failSafeTimeout);
      }
    }

    return () => {
      authInitiatedRef.current = false;
      if (failSafeTimeout) {
        window.clearTimeout(failSafeTimeout);
      }
      if (authListenerUnsubscribe) {
        try {
          authListenerUnsubscribe();
        } catch (e) {
          console.debug("Error unsubscribing auth listener:", e);
        }
      }
    };
  }, [fetchProfile]);

  React.useEffect(() => {
    if (!hasSupabaseConfig || !user) return;

    const channel = supabase
      .channel(`profiles-user-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${user.id}`
      }, () => {
        if (isMountedRef.current) {
          fetchProfile(user.id);
        }
      })
      .subscribe();

    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [user, fetchProfile]);

  React.useEffect(() => {
    if (!hasSupabaseConfig || !user) return;

    // ⭐ Only start periodic refresh after initial auth is complete
    const intervalId = window.setInterval(async () => {
      if (!isMountedRef.current || !user) return;
      
      try {
        // Just refresh the profile, don't call getSession to avoid lock contention
        await fetchProfile(user.id);
      } catch (err) {
        console.debug('Periodic profile refresh error:', err);
        // Silently fail - not critical
      }
    }, 5 * 60 * 1000); // Every 5 minutes

    return () => {
      window.clearInterval(intervalId);
    };
  }, [user, fetchProfile]);

  const signIn = async (email: string, password: string) => {
    if (!hasSupabaseConfig) throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
    
    try {
      console.log(`🔐 Attempting sign-in for: ${email}`);
      const { error, data } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        console.error(`❌ Sign-in failed for ${email}:`, error.message);
        throw error;
      }
      
      console.log(`✅ Sign-in successful for ${email}, waiting for auth state update...`);
      // Le loading state sera géré par onAuthStateChange listener
      // Le listener se chargera de charger le profil
    } catch (err) {
      console.error('Erreur lors de la connexion:', err);
      throw err;
    }
  };

  const resetPassword = async (email: string) => {
    if (!hasSupabaseConfig) throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
    if (isMountedRef.current) setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (isMountedRef.current) setLoading(false);
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
  if (!hasSupabaseConfig) throw new Error('Supabase non configuré.');

  try {
    // 🔒 SÉCURITÉ: Le rôle par défaut est TOUJOURS 'Guest' pour les nouveaux comptes
    // C'est au Super_Admin de donner un rôle après création
    const enforcedRole: UserRole = 'Guest';
    
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: { data: { full_name: fullName, role: enforcedRole } }
    });

    if (error) throw error;

    if (data.user) {
      // Vérifier si un profil existant existe et le supprimer avant d'en créer un nouveau
      // pour s'assurer que le rôle par défaut est bien 'Guest'
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('id', data.user.id)
        .single();
      
      // Si un profil existe avec un rôle différent de 'Guest', on le met à jour
      if (existingProfile && existingProfile.role !== 'Guest') {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ role: 'Guest', full_name: fullName || null })
          .eq('id', data.user.id);
        
        if (updateError) {
          console.warn('Mise à jour du rôle existant:', updateError.message);
        }
      } else if (!existingProfile) {
        // Créer un nouveau profil avec le rôle 'Guest'
        const profilePayload = {
          id: data.user.id,
          role: enforcedRole,
          full_name: fullName || null
        };
        const { error: profileError } = await supabase.from('profiles').insert(profilePayload);
        if (profileError) throw new Error('Erreur création profil: ' + profileError.message);
      }

      // Si un utilisateur est directement connecté après inscription (pas de confirmation email),
      // on charge son profil immédiatement
      if (data.session) {
        setUser(data.user);
        await fetchProfile(data.user.id);
      }
    }
  } finally {
    // Le loading state sera géré par onAuthStateChange listener
    // Ne pas le remettre à false ici pour laisser le listener le gérer
  }
};

  const signOut = async () => {
    if (!hasSupabaseConfig) {
      // Forcer la déconnexion locale même sans config Supabase
      setProfile(null);
      setUser(null);
      setError(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Pas besoin d'appeler removeAllChannels() - le cleanup du useEffect dans App.tsx
      // s'en charge automatiquement quand user devient null
      
      // Timeout de sécurité pour éviter que le logout ne bloque
      const logoutPromise = supabase.auth.signOut();
      const timeoutPromise = new Promise<void>((resolve) => 
        setTimeout(() => {
          console.warn("Timeout logout - forcing disconnect");
          resolve();
        }, 3000)
      );
      
      await Promise.race([logoutPromise, timeoutPromise]);
      
      // Déconnexion réussie
      setProfile(null);
      setUser(null);
      setError(null);
    } catch (err) {
      console.error("Erreur lors de la déconnexion Supabase:", err);
      // Forcer la déconnexion locale même si la requête réseau échoue
      setProfile(null);
      setUser(null);
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, profileLoading, error, signIn, signUp, resetPassword, signOut, refreshProfile, retryAuth }}>
      {children}
    </AuthContext.Provider>
  );
}
