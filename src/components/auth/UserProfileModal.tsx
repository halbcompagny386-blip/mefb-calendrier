import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Lock, Camera, X, Save, Edit3, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useSupabaseAuth';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  showUpdateMessage?: (msg: string) => void;
}

export const UserProfileModal = ({ isOpen, onClose, showUpdateMessage }: UserProfileModalProps) => {
  const { user, profile, refreshProfile } = useAuth();
  
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setFullName(profile?.full_name || '');
      setPassword('');
      setConfirmPassword('');
    }
  }, [isOpen, profile]);

  if (!isOpen || !user || !profile) return null;

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password && password !== confirmPassword) {
      if (showUpdateMessage) showUpdateMessage('❌ Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);

    try {
      // Mettre à jour le nom dans la table profile
      if (fullName !== profile.full_name) {
        const oldName = profile.full_name;

        const { error: profileError } = await supabase
          .from('profiles')
          .update({ full_name: fullName })
          .eq('id', user.id);
          
        if (profileError) throw profileError;

        // Mise à jour en cascade sur l'historique (Publications) pour garder le matching des avatars
        if (oldName) {
          await supabase.from('social_publications')
            .update({ publisher_name: fullName })
            .ilike('publisher_name', `%${oldName}%`);
            
          await supabase.from('social_publications')
            .update({ user_name: fullName })
            .ilike('user_name', `%${oldName}%`);
        }
      }

      // Mettre à jour le mot de passe via Auth
      if (password) {
        const { error: passwordError } = await supabase.auth.updateUser({ password });
        if (passwordError) throw passwordError;
      }

      await refreshProfile();
      if (showUpdateMessage) showUpdateMessage('✅ Profil mis à jour avec succès');
      onClose();
    } catch (err: any) {
      console.error(err);
      if (showUpdateMessage) showUpdateMessage(`❌ Erreur: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!e.target.files || e.target.files.length === 0) return;
      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      // 1. Upload vers le bucket "avatars"
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        if (uploadError.message.includes('Bucket not found')) {
            throw new Error("Le bucket de stockage 'avatars' n'existe pas encore sur votre base de données Supabase.");
        }
        throw uploadError;
      }

      // 2. Obtenir l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // 3. Mettre à jour le profil avec la nouvelle URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      await refreshProfile();
      if (showUpdateMessage) showUpdateMessage('✅ Photo de profil mise à jour');
    } catch (err: any) {
      console.error('Erreur upload avatar:', err);
      if (showUpdateMessage) showUpdateMessage(`❌ Impossible de charger la photo: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden relative"
          >
            {/* Header / Couverture */}
            <div className="h-32 bg-gradient-to-r from-[#0f3d6b] to-[#1e88e5] relative">
              <button 
                onClick={onClose}
                className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 text-white rounded-full backdrop-blur transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Contenu Profil */}
            <div className="px-8 pb-8">
              {/* Avatar flottant */}
              <div className="relative -mt-16 w-32 h-32 mx-auto mb-6 group">
                <div className="w-full h-full rounded-full border-4 border-white overflow-hidden bg-slate-100 shadow-xl relative">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="Profil" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-[#175a95] flex items-center justify-center text-white text-4xl font-black uppercase">
                      {(profile.full_name || 'U').charAt(0)}
                    </div>
                  )}
                  
                  {/* Overlay bouton upload */}
                  <div 
                    className={`absolute inset-0 bg-black/50 flex flex-col items-center justify-center cursor-pointer transition-opacity ${uploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                    onClick={() => !uploading && fileInputRef.current?.click()}
                  >
                    {uploading ? (
                      <Loader2 className="animate-spin text-white mb-1" size={24} />
                    ) : (
                      <>
                        <Camera className="text-white mb-1" size={24} />
                        <span className="text-[9px] font-bold text-white uppercase tracking-wider">Modifier</span>
                      </>
                    )}
                  </div>
                </div>
                {/* Petit badge rôle ajusté */}
                <div className="absolute bottom-1 right-1 w-8 h-8 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center shadow-lg" title={profile.role}>
                  <User size={14} className="text-white" />
                </div>
                
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  ref={fileInputRef} 
                  onChange={handleAvatarUpload} 
                  disabled={uploading}
                />
              </div>

              <div className="text-center mb-8">
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">{profile.full_name || 'Utilisateur'}</h3>
                <p className="text-xs font-bold uppercase tracking-widest mt-1">
                  {profile.role === 'Guest' ? (
                    <span className="text-amber-600 flex items-center justify-center gap-1">
                      <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                      Observateur (Invité)
                    </span>
                  ) : (
                    <span className="text-emerald-600">{profile.role}</span>
                  )}
                </p>
                <p className="text-xs text-slate-500 mt-1">{user.email}</p>
                {profile.role === 'Guest' && (
                  <p className="text-[10px] text-amber-500 mt-2 px-4">
                    💡 Contactez un Super Admin pour obtenir un rôle plus élevé.
                  </p>
                )}
              </div>

              {/* Formulaire Modification */}
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-2 flex items-center gap-1"><Edit3 size={12} /> Nom Complet</label>
                  <input 
                    type="text" 
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    className="w-full px-4 py-3 mt-1 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#175a95] transition-all text-sm font-bold"
                  />
                </div>
                
                <div className="pt-4 border-t border-slate-100">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-2 flex items-center gap-1"><Lock size={12} /> Nouveau Mot de passe</label>
                  <input 
                    type="password" 
                    placeholder="Laisser vide pour ne pas modifier"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full px-4 py-3 mt-1 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#175a95] transition-all text-sm"
                  />
                </div>

                {password && (
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-2 flex items-center gap-1"><Lock size={12} /> Confirmer Mot de passe</label>
                    <input 
                      type="password" 
                      placeholder="Confirmer le nouveau mot de passe"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className={`w-full px-4 py-3 mt-1 rounded-xl border ${confirmPassword !== password && confirmPassword ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-slate-50'} focus:bg-white focus:ring-2 focus:ring-[#175a95] transition-all text-sm`}
                    />
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={loading || (password.length > 0 && password !== confirmPassword)}
                  className="w-full mt-6 py-4 bg-[#175a95] hover:bg-[#124a7c] text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg hover:shadow-[#175a95]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Enregistrer les modifications
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
