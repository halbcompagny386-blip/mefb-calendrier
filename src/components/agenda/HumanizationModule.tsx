import React, { useState } from 'react';
import { Wand2, Copy, Send, Loader2, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { humanizeAndCorrectContent } from '../../services/aiService';
import { supabase } from '../../lib/supabaseClient';

interface HumanizationModuleProps {
  onSuccess?: (content: string) => void;
}

export const HumanizationModule = ({ onSuccess }: HumanizationModuleProps) => {
  const [inputText, setInputText] = useState('');
  const [humanizedText, setHumanizedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [sendFeedback, setSendFeedback] = useState<'success' | 'error' | null>(null);

  const handleHumanize = async () => {
    if (!inputText.trim()) return;
    setIsProcessing(true);
    try {
      const result = await humanizeAndCorrectContent(inputText);
      setHumanizedText(result);
    } catch (error) {
      console.error("Erreur humanisation:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(humanizedText);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch (error) {
      console.error("Erreur copie:", error);
    }
  };

  const handleSendToDatabase = async () => {
    if (!humanizedText.trim()) return;
    setIsSending(true);
    try {
      // Générer un titre basique depuis les 50 premiers caractères
      const title = humanizedText.substring(0, 80).split('\n')[0] || 'Article humanisé';
      
      const { error } = await supabase
        .from('social_publications')
        .insert([{
          title: title,
          content: humanizedText,
          platform: 'web',
          status: 'draft',
          user_name: 'Service Com MEFB',
          created_at: new Date().toISOString()
        }]);

      if (error) {
        setSendFeedback('error');
        console.error("Erreur envoi base:", error);
      } else {
        setSendFeedback('success');
        setTimeout(() => {
          setInputText('');
          setHumanizedText('');
          setSendFeedback(null);
          if (onSuccess) onSuccess(humanizedText);
        }, 1500);
      }
    } catch (error) {
      setSendFeedback('error');
      console.error("Exception envoi:", error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* HEADER */}
      <div className="px-4">
        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
          <Wand2 className="text-[#175a95]" /> Humanisation & Correction
        </h2>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">
          Transformez un brouillon généré par l'IA en contenu digne du Cabinet
        </p>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl border border-slate-800 space-y-6"
      >
        {!humanizedText ? (
          <>
            {/* TEXTAREA INPUT */}
            <div>
              <label className="text-[10px] font-black text-[#175a95] uppercase tracking-[0.2em] mb-3 block italic">
                Collez votre texte brut
              </label>
              <textarea 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Collez ici l'article généré par l'IA ou votre brouillon avec des coquilles..."
                className="w-full min-h-[300px] p-6 bg-slate-800 rounded-[2rem] border-2 border-slate-700 focus:border-[#175a95] focus:bg-slate-800/80 outline-none transition-all text-sm font-medium leading-relaxed text-white placeholder-slate-400"
              />
            </div>

            {/* BOUTON HUMANISER */}
            <button 
              onClick={handleHumanize}
              disabled={isProcessing || !inputText.trim()}
              className="w-full py-5 bg-gradient-to-r from-[#175a95] to-blue-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg shadow-blue-900/30 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl transition-all"
            >
              {isProcessing ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Humanisation en cours...
                </>
              ) : (
                <>
                  <Wand2 size={18} />
                  Humaniser & Corriger
                </>
              )}
            </button>

            <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700">
              <p className="text-[10px] text-slate-300 italic font-medium leading-relaxed">
                ✨ L'IA appliquera : nettoyage des termes de remplissage, correction orthographique, style institutionnel et rythme naturel.
              </p>
            </div>
          </>
        ) : (
          <>
            {/* BLOC PRÉVISUALISATION */}
            <div className="bg-emerald-50/5 p-6 rounded-2xl border border-emerald-400/20">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle2 size={20} className="text-emerald-400" />
                <p className="text-[11px] font-black text-emerald-300 uppercase">Article Prêt pour Publication</p>
              </div>
              <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 max-h-[400px] overflow-y-auto custom-scrollbar">
                <p className="text-sm leading-relaxed text-slate-100 whitespace-pre-wrap font-medium">
                  {humanizedText}
                </p>
              </div>
            </div>

            {/* ACTIONS */}
            <div className="flex gap-4">
              <button 
                onClick={handleCopyText}
                disabled={copyFeedback}
                className="flex-1 py-4 bg-slate-800 text-slate-200 rounded-2xl font-black text-[10px] uppercase border border-slate-700 hover:border-slate-600 transition-all flex items-center justify-center gap-2 disabled:bg-emerald-900/30 disabled:text-emerald-300"
              >
                <Copy size={16} />
                {copyFeedback ? "Copié !" : "Copier le texte"}
              </button>

              <button 
                onClick={handleSendToDatabase}
                disabled={isSending || sendFeedback === 'success'}
                className="flex-1 py-4 bg-[#149308] text-white rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-green-900/30 hover:bg-green-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSending ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Envoi...
                  </>
                ) : sendFeedback === 'success' ? (
                  <>
                    <CheckCircle2 size={16} />
                    Envoyé !
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Envoyer en base
                  </>
                )}
              </button>
            </div>

            {sendFeedback === 'error' && (
              <div className="p-4 bg-red-50/10 border border-red-400/30 rounded-2xl">
                <p className="text-[10px] text-red-300 font-bold">❌ Erreur lors de l'envoi. Veuillez réessayer.</p>
              </div>
            )}

            {/* BOUTON RECOMMENCER */}
            <button 
              onClick={() => {
                setInputText('');
                setHumanizedText('');
                setSendFeedback(null);
              }}
              className="w-full py-3 bg-slate-800 text-slate-300 rounded-2xl font-black text-[10px] uppercase border border-slate-700 hover:border-slate-600 transition-all"
            >
              ↻ Humaniser un autre texte
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
};