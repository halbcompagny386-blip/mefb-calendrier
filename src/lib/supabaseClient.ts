import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Cette exportation est cruciale pour corriger l'erreur dans App.tsx
export const hasSupabaseConfig = Boolean(
  import.meta.env.VITE_SUPABASE_URL && 
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Diagnostic logging
if (!hasSupabaseConfig) {
  console.error('⚠️ SUPABASE CONFIG MISSING:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    envKeys: Object.keys(import.meta.env).filter(k => k.includes('SUPABASE'))
  });
} else {
  console.info('✓ Supabase configured:', { url: supabaseUrl.substring(0, 20) + '...' });
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    fetch: async (url, options) => {
      const response = await fetch(url, options);
      
      // Si on reçoit une erreur 400 sur la route de rafraîchissement du token
      if (!response.ok && response.status === 400 && typeof url === 'string' && url.includes('grant_type=refresh_token')) {
        console.warn('⚠️ Token de rafraîchissement invalide détecté. Nettoyage de la session locale...');
        // Nettoyer tous les tokens Supabase du localStorage
        try {
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach(key => localStorage.removeItem(key));
        } catch (e) {
          console.error('Erreur lors du nettoyage du localStorage:', e);
        }
      }
      
      return response;
    }
  }
});