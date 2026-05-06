import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useSupabaseAuth';
import { Eye, EyeOff, AlertCircle, CheckCircle, X } from 'lucide-react';

type Props = {
  onSuccess: () => void;
  onSwitchToSignup: () => void;
};

export default function LoginForm({ onSuccess, onSwitchToSignup }: Props) {
  const { signIn, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<{ message: string; type: 'invalid-credentials' | 'user-not-found' | 'network' | 'generic' } | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Auto-dismiss error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Auto-dismiss success after 3 seconds
  useEffect(() => {
    if (successMessage && isResetMode) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
        setIsResetMode(false);
        setEmail('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, isResetMode]);

  const getErrorDetails = (err: any) => {
    const errorMsg = err?.message || err?.error_description || err?.error || '';
    
    // Vérifier le type d'erreur
    if (errorMsg.includes('Invalid login credentials')) {
      return {
        message: 'Email ou mot de passe incorrect.',
        type: 'invalid-credentials' as const
      };
    }
    
    if (errorMsg.includes('User not found') || errorMsg.includes('unable to locate the user')) {
      return {
        message: 'Ce compte n\'existe pas dans notre Base de Données.',
        type: 'user-not-found' as const
      };
    }
    
    if (errorMsg.includes('network') || errorMsg.includes('fetch') || errorMsg.includes('Failed to fetch')) {
      return {
        message: 'Erreur réseau. Vérifiez votre connexion Internet.',
        type: 'network' as const
      };
    }
    
    return {
      message: 'Une erreur s\'est produite. Veuillez réessayer.',
      type: 'generic' as const
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (isResetMode) {
        await resetPassword(email.trim());
        setSuccessMessage('✅ Email de réinitialisation envoyé. Vérifiez votre boîte de réception.');
      } else {
        await signIn(email.trim(), password);
        onSuccess();
      }
    } catch (err: any) {
      console.error('Login failed', err);
      const errorDetails = getErrorDetails(err);
      setError(errorDetails);
    } finally {
      setLoading(false);
    }
  };

  if (isResetMode && successMessage) {
    return (
      <div className="space-y-4 sm:space-y-6 rounded-2xl sm:rounded-3xl bg-slate-900/95 p-4 sm:p-6 shadow-xl shadow-slate-950/20 border border-slate-800 text-center w-full">
        <div className="mx-auto mb-4 sm:mb-6 flex h-16 sm:h-20 w-16 sm:w-20 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-300 shadow-inner">
          <span className="text-3xl sm:text-4xl">✔️</span>
        </div>
        <h2 className="text-lg sm:text-2xl font-black text-white uppercase tracking-[0.2em]">Vérifiez votre boîte mail</h2>
        <p className="mt-3 sm:mt-4 text-xs sm:text-sm text-slate-300 leading-6 sm:leading-7">
          Un lien de réinitialisation a été envoyé à <span className="font-bold text-white break-all">{email}</span>.
          <br />
          Si vous ne le voyez pas, vérifiez vos spams.
        </p>
        <button
          type="button"
          onClick={() => {
            setIsResetMode(false);
            setSuccessMessage(null);
            setPassword('');
            setError(null);
          }}
          className="mt-6 sm:mt-8 w-full rounded-xl sm:rounded-2xl bg-[#175a95] py-2 sm:py-3 text-xs sm:text-sm font-black uppercase text-white shadow-lg shadow-slate-900/20 transition hover:bg-blue-800"
        >
          Retour à la connexion
        </button>
      </div>
    );
  }

  return (
    <form className="space-y-3 sm:space-y-4 md:space-y-5 rounded-2xl sm:rounded-3xl bg-slate-900/95 p-4 sm:p-5 md:p-6 shadow-xl shadow-slate-950/20 border border-slate-800 w-full" onSubmit={handleSubmit}>
      {/* MESSAGE D'ERREUR - POP-UP STYLE */}
      {error && (
        <div className={`flex items-start gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl sm:rounded-2xl border animate-in fade-in duration-300 ${
          error.type === 'invalid-credentials' ? 'bg-rose-950/60 border-rose-700/40' :
          error.type === 'user-not-found' ? 'bg-amber-950/60 border-amber-700/40' :
          error.type === 'network' ? 'bg-orange-950/60 border-orange-700/40' :
          'bg-slate-800/60 border-slate-700/40'
        }`}>
          <AlertCircle size={16} className={`mt-0.5 shrink-0 sm:w-[20px] sm:h-[20px] ${
            error.type === 'invalid-credentials' ? 'text-rose-400' :
            error.type === 'user-not-found' ? 'text-amber-400' :
            error.type === 'network' ? 'text-orange-400' :
            'text-slate-400'
          }`} />
          <div className="flex-1">
            <p className={`text-xs sm:text-sm font-bold ${
              error.type === 'invalid-credentials' ? 'text-rose-200' :
              error.type === 'user-not-found' ? 'text-amber-200' :
              error.type === 'network' ? 'text-orange-200' :
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

      {/* MESSAGE DE SUCCÈS - POP-UP STYLE */}
      {successMessage && (
        <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl sm:rounded-2xl border bg-emerald-950/60 border-emerald-700/40 animate-in fade-in duration-300">
          <CheckCircle size={16} className="mt-0.5 shrink-0 sm:w-[20px] sm:h-[20px] text-emerald-400" />
          <div className="flex-1">
            <p className="text-xs sm:text-sm font-bold text-emerald-200">
              {successMessage}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      )}

      <div>
        <label className="block text-[8px] sm:text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-1.5 sm:mb-2">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl sm:rounded-2xl border border-slate-700 bg-slate-800 px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 text-xs sm:text-sm md:text-base text-slate-100 placeholder:text-slate-500 shadow-sm outline-none transition focus:border-[#175a95] focus:ring-2 focus:ring-[#175a95]/30"
          placeholder="exemple@mefb.gov.gn"
          required
        />
      </div>

      {!isResetMode && (
        <div className="relative">
          <label className="block text-[8px] sm:text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-1.5 sm:mb-2">Mot de passe</label>
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl sm:rounded-2xl border border-slate-700 bg-slate-800 px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 pr-9 sm:pr-11 text-xs sm:text-sm md:text-base text-slate-100 placeholder:text-slate-500 shadow-sm outline-none transition focus:border-[#175a95] focus:ring-2 focus:ring-[#175a95]/30"
            placeholder="Votre mot de passe"
            required={!isResetMode}
          />
          <button
            type="button"
            className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-1"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={14} className="sm:w-[16px] sm:h-[16px]" /> : <Eye size={14} className="sm:w-[16px] sm:h-[16px]" />}
          </button>
        </div>
      )}

      <button
        type="submit"
        className="w-full rounded-xl sm:rounded-2xl bg-[#175a95] py-2 sm:py-2.5 md:py-3 text-[10px] sm:text-xs md:text-sm font-black uppercase text-white shadow-lg shadow-slate-900/20 transition hover:bg-blue-800 disabled:opacity-50 mt-3 sm:mt-4"
        disabled={loading}
      >
        {loading ? (isResetMode ? 'Envoi...' : 'Connexion...') : (isResetMode ? 'Réinitialiser' : 'Se connecter')}
      </button>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-2 text-[8px] sm:text-[9px] md:text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">
        <button
          type="button"
          onClick={() => {
            setIsResetMode((prev) => !prev);
            setError(null);
            setSuccessMessage(null);
          }}
          className="text-slate-300 hover:text-white transition"
        >
          {isResetMode ? 'Retour à la connexion' : 'Mot de passe oublié ?'}
        </button>
        <button
          type="button"
          className="text-slate-300 hover:text-white transition"
          onClick={onSwitchToSignup}
        >
          Créer un compte
        </button>
      </div>
    </form>
  );
}
