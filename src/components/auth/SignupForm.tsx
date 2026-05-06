import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useSupabaseAuth';
import { AlertCircle, CheckCircle, X } from 'lucide-react';

type Props = {
  onSuccess: () => void;
  onSwitchToLogin: () => void;
};

export default function SignupForm({ onSuccess, onSwitchToLogin }: Props) {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState(''); // Nouveau : Nom complet
  const [password, setPassword] = useState('');
  const [error, setError] = useState<{ message: string; type: 'email-exists' | 'weak-password' | 'generic' } | null>(null);
  const [loading, setLoading] = useState(false);

  // Auto-dismiss error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const getErrorDetails = (err: any) => {
    const errorMsg = err?.message || err?.error_description || err?.error || '';
    
    // Vérifier le type d'erreur
    if (errorMsg.includes('User already registered') || errorMsg.includes('already exists')) {
      return {
        message: 'Cette adresse email est déjà utilisée. Veuillez vous connecter ou utiliser une autre email.',
        type: 'email-exists' as const
      };
    }
    
    if (errorMsg.includes('password') || errorMsg.includes('weak')) {
      return {
        message: 'Le mot de passe est trop faible. Utilisez au moins 8 caractères avec des lettres et des chiffres.',
        type: 'weak-password' as const
      };
    }
    
    return {
      message: err?.message || 'Erreur lors de la création du compte.',
      type: 'generic' as const
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // On passe fullName au service d'inscription
      await signUp(email.trim(), password, fullName.trim());
      onSuccess();
    } catch (err: any) {
      const errorDetails = getErrorDetails(err);
      setError(errorDetails);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="space-y-3 sm:space-y-4 md:space-y-5 p-4 sm:p-5 md:p-6 bg-slate-900/95 rounded-2xl sm:rounded-3xl shadow-xl border border-slate-800 w-full" onSubmit={handleSubmit}>
      <h2 className="text-base sm:text-lg md:text-xl font-black text-white uppercase text-center mb-3 sm:mb-4 md:mb-6">Créer un profil MEFB</h2>

      {/* MESSAGE D'ERREUR - POP-UP STYLE */}
      {error && (
        <div className={`flex items-start gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl sm:rounded-2xl border animate-in fade-in duration-300 ${
          error.type === 'email-exists' ? 'bg-rose-950/60 border-rose-700/40' :
          error.type === 'weak-password' ? 'bg-amber-950/60 border-amber-700/40' :
          'bg-slate-800/60 border-slate-700/40'
        }`}>
          <AlertCircle size={16} className={`mt-0.5 shrink-0 sm:w-[20px] sm:h-[20px] ${
            error.type === 'email-exists' ? 'text-rose-400' :
            error.type === 'weak-password' ? 'text-amber-400' :
            'text-slate-400'
          }`} />
          <div className="flex-1">
            <p className={`text-xs sm:text-sm font-bold ${
              error.type === 'email-exists' ? 'text-rose-200' :
              error.type === 'weak-password' ? 'text-amber-200' :
              'text-slate-200'
            }`}>
              {error.message}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      )}
      
      <div>
        <label className="block text-[8px] sm:text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1.5 sm:mb-2">Nom Complet</label>
        <input 
          type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
          className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 bg-slate-800 border border-slate-700 rounded-xl sm:rounded-2xl text-xs sm:text-sm md:text-base text-slate-100 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-[#175a95]/30 focus:border-[#175a95] shadow-sm transition"
          required placeholder="Ex: Ibrahim Bah"
        />
      </div>

      <div>
        <label className="block text-[8px] sm:text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1.5 sm:mb-2">Email Professionnel</label>
        <input 
          type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 bg-slate-800 border border-slate-700 rounded-xl sm:rounded-2xl text-xs sm:text-sm md:text-base text-slate-100 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-[#175a95]/30 focus:border-[#175a95] shadow-sm transition"
          required placeholder="exemple@mefb.gov.gn"
        />
      </div>

      <div>
        <label className="block text-[8px] sm:text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1.5 sm:mb-2">Mot de passe</label>
        <input 
          type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 bg-slate-800 border border-slate-700 rounded-xl sm:rounded-2xl text-xs sm:text-sm md:text-base text-slate-100 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-[#175a95]/30 focus:border-[#175a95] shadow-sm transition"
          required placeholder="Minimum 8 caractères"
        />
      </div>

      <div className="rounded-xl sm:rounded-2xl border border-amber-500/30 bg-amber-950/20 p-3 sm:p-4 text-[8px] sm:text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-amber-200">
        🔒 NOUVEAUX COMPTES: Rôle "Observateur (Invité)" uniquement
        <p className="mt-2 text-[9px] sm:text-[10px] md:text-[11px] font-medium text-amber-100/70">
          Après création, contactez un <span className="text-amber-400 font-black">Super Admin</span> pour obtenir un rôle (Communication, Cabinet, Admin...).
        </p>
      </div>

      <button 
        type="submit" disabled={loading}
        className="w-full py-2 sm:py-2.5 md:py-3 bg-[#175a95] text-white rounded-xl sm:rounded-2xl font-black text-[10px] sm:text-xs md:text-sm uppercase shadow-lg shadow-slate-950/30 transition hover:bg-blue-800 disabled:opacity-50 mt-3 sm:mt-4"
      >
        {loading ? 'Initialisation...' : 'Créer le compte MEFB'}
      </button>

      <button type="button" onClick={onSwitchToLogin} className="w-full text-[8px] sm:text-[9px] md:text-[10px] font-black text-slate-400 uppercase hover:text-white transition-colors py-2">
        Se connecter avec un compte existant
      </button>
    </form>
  );
}