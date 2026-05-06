import React, { useState } from 'react';
import { 
  FileText, 
  ArrowRight, 
  Layout,
  Sparkles
} from 'lucide-react';
import { motion } from 'framer-motion';
import { generateEditorialContent, humanizeAndCorrectContent } from '../../services/aiService';

interface ModelsViewProps {
  onOpenEditor: (results: Record<string, string>, title: string) => void;
}

export const ModelsView = ({ onOpenEditor }: ModelsViewProps) => {
  const [longArticle, setLongArticle] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [humanInput, setHumanInput] = useState('');
  const [humanizedText, setHumanizedText] = useState('');
  const [isHumanizing, setIsHumanizing] = useState(false);

  const handleAdaptArticle = async () => {
    if (!longArticle.trim()) return;
    setIsProcessing(true);
    
    try {
      const [facebookContent, linkedinContent] = await Promise.all([
        generateEditorialContent(longArticle, "Adaptation d'article", 'Facebook'),
        generateEditorialContent(longArticle, "Adaptation d'article", 'LinkedIn'),
      ]);

      const xContent = await generateEditorialContent(
        facebookContent,
        "Adaptation d'article",
        'X'
      );

      const results: Record<string, string> = {
        'LinkedIn': linkedinContent,
        'Facebook': facebookContent,
        'X': xContent,
      };

      onOpenEditor(results, "Adaptation d'article long");
    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleHumanizeText = async () => {
    if (!humanInput.trim()) return;
    setIsHumanizing(true);
    setHumanizedText('');

    try {
      const result = await humanizeAndCorrectContent(humanInput);
      const finalText = result || "Erreur lors de la correction.";
      setHumanizedText(finalText);
      onOpenEditor({ 'Humanisé': finalText }, 'Humanisation & Correction');
    } catch (error) {
      console.error(error);
      const errorText = "Erreur lors de la correction.";
      setHumanizedText(errorText);
      onOpenEditor({ 'Humanisé': errorText }, 'Humanisation & Correction');
    } finally {
      setIsHumanizing(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto pb-20">
      <div className="mb-10">
        <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
          <Layout className="text-[#175a95]" size={32} />
          Centre de Production IA
        </h2>
        <p className="mt-2 text-slate-500 font-medium italic max-w-2xl">
          Accédez aux outils d’écriture automatique et de correction conçus pour les productions du Cabinet.
        </p>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl shadow-slate-200/50 space-y-6 flex flex-col h-full"
        >
          <div className="flex items-center gap-4">
            <div className="p-4 bg-blue-50 text-[#175a95] rounded-2xl">
              <FileText size={28} />
            </div>
            <div>
              <h3 className="font-black text-slate-800 uppercase text-sm">Option A : Adaptation Stratégique</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Transformer un article existant</p>
            </div>
          </div>

          <textarea 
            value={longArticle}
            onChange={(e) => setLongArticle(e.target.value)}
            placeholder="Collez ici l'article long du Rédacteur en Chef..."
            className="w-full flex-1 min-h-[300px] p-6 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 focus:border-[#175a95] focus:bg-white outline-none transition-all text-sm font-medium leading-relaxed"
          />

          <button 
            onClick={handleAdaptArticle}
            disabled={isProcessing || !longArticle}
            className="w-full py-5 bg-[#175a95] text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg shadow-blue-900/20 active:scale-95 disabled:opacity-50"
          >
            {isProcessing ? "Traitement IA..." : "Générer les formats Multi-Canaux"}
            <ArrowRight size={18} />
          </button>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl space-y-6 flex flex-col h-full"
        >
          <div className="flex items-center gap-4">
            <div className="p-4 bg-white/10 text-[#149308] rounded-2xl">
              <Sparkles size={28} />
            </div>
            <div>
              <h3 className="font-black text-white uppercase text-sm">Option B : Humanisation & Correction</h3>
              <p className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">Corrigez et humanisez un brouillon IA</p>
            </div>
          </div>

          <textarea
            value={humanInput}
            onChange={(e) => setHumanInput(e.target.value)}
            placeholder="Collez ici l'article généré par l'IA ou votre brouillon avec des coquilles..."
            className="w-full min-h-[220px] p-5 bg-slate-950/70 rounded-[2rem] border border-slate-800 focus:border-[#149308] outline-none transition-all text-sm text-slate-100 placeholder:text-slate-500"
          />

          <button
            onClick={handleHumanizeText}
            disabled={isHumanizing || !humanInput}
            className="w-full py-4 bg-[#149308] text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-emerald-900/30 active:scale-95 disabled:opacity-50"
          >
            {isHumanizing ? 'Humanisation en cours...' : 'Humaniser & Corriger'}
          </button>

          {humanizedText ? (
            <div className="rounded-[2rem] border border-slate-700 bg-slate-950/80 p-4 text-slate-100 text-sm leading-relaxed max-h-[220px] overflow-y-auto custom-scrollbar">
              {humanizedText}
            </div>
          ) : (
            <div className="rounded-[2rem] border border-slate-800 bg-slate-950/80 p-4 text-slate-400 text-xs italic">
              L'IA appliquera : nettoyage des termes de remplissage, correction orthographique, style institutionnel et rythme naturel.
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};