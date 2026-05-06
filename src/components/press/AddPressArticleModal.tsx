import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Globe, Sparkles, Loader2, Plus, Newspaper, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PressArticle } from '@/types';
import { analyzePressUrl } from '@/services/pressAiService';
import { notificationService } from '@/services/notificationService';

interface AddPressArticleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (article: Omit<PressArticle, 'id'>) => void;
}

export const AddPressArticleModal = ({ isOpen, onClose, onAdd }: AddPressArticleModalProps) => {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [source, setSource] = useState("");
  const [summary, setSummary] = useState("");
  const [sentiment, setSentiment] = useState<'positive' | 'neutral' | 'negative'>('neutral');
  const [category, setCategory] = useState<'Economie' | 'Budget' | 'Politique' | 'International'>('Economie');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setUrl(""); setTitle(""); setSource(""); setSummary("");
      setSentiment('neutral');
      setCategory('Economie');
    }
  }, [isOpen]);

  const handleAiAnalysis = async () => {
    if (!url) return;
    setIsAnalyzing(true);
    try {
      const data = await analyzePressUrl(url);
      setTitle(data.title);
      setSource(data.source);
      setSummary(data.summary);
      setSentiment(data.sentiment);
      setCategory(data.category);
    } catch (err) {
      notificationService.error("L'IA n'a pas pu analyser ce lien.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAnalyzing) return; // Sécurité

    if (!url || !title || !source || !summary) {
      notificationService.warning("Veuillez remplir tous les champs avant d'ajouter l'article.");
      return;
    }

    setIsAnalyzing(true);
    try {
      const newArticle: Omit<PressArticle, 'id'> = {
        title,
        source,
        summary,
        url,
        sentiment,
        category,
        status: 'published',
        date: new Date().toLocaleDateString('fr-FR')
      };

      onAdd(newArticle);
      onClose();
    } catch (err) {
      console.error("Erreur soumission:", err);
      notificationService.error("Erreur lors de l'enregistrement. Veuillez réessayer.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }} 
            animate={{ scale: 1, opacity: 1, y: 0 }} 
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/20"
          >
          {/* Header */}
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#175a95] rounded-xl text-white shadow-lg">
                <Newspaper size={20} />
              </div>
              <div>
                <h3 className="text-xl font-black text-[#175a95] uppercase">Veille Média Stratégique</h3>
                <p className="text-[10px] font-bold text-emerald-600 uppercase">Ministère de l'Économie, des Finances et du Budget</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col h-[75vh]">
            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
              
              {/* Zone URL */}
              <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200 space-y-4">
                <label className="text-[11px] font-black text-[#175a95] uppercase tracking-[0.2em] block">URL de l'article</label>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="url" value={url} onChange={(e) => setUrl(e.target.value)} required
                      placeholder="Coller le lien ici..."
                      className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-950 outline-none focus:border-[#175a95] transition-all"
                    />
                  </div>
                  <button 
                    type="button" onClick={handleAiAnalysis} disabled={!url || isAnalyzing}
                    className="flex items-center justify-center gap-2 px-8 py-4 bg-[#149308] text-white rounded-xl text-xs font-black uppercase shadow-lg hover:bg-green-700 disabled:opacity-50 transition-all"
                  >
                    {isAnalyzing ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                    Analyser par IA
                  </button>
                </div>
              </div>

              {/* Champs de saisie - CORRIGÉS POUR LISIBILITÉ */}
              <div className={`space-y-6 ${isAnalyzing ? 'opacity-30' : ''}`}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Source</label>
                    <input 
                      type="text" value={source} onChange={(e) => setSource(e.target.value)} required 
                      className="w-full p-4 bg-white border-2 border-slate-100 rounded-xl text-sm font-extrabold text-slate-900" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Titre</label>
                    <input 
                      type="text" value={title} onChange={(e) => setTitle(e.target.value)} required 
                      className="w-full p-4 bg-white border-2 border-slate-100 rounded-xl text-sm font-extrabold text-[#175a95]" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Résumé pour le Cabinet</label>
                  <textarea 
                    value={summary} onChange={(e) => setSummary(e.target.value)} required rows={4} 
                    className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-bold text-slate-800 leading-relaxed italic" 
                  />
                </div>

                {/* Sentiment & Thématique */}
                <div className="flex flex-col md:flex-row gap-8 p-6 bg-slate-50 rounded-[2rem] border border-slate-200">
                  <div className="flex-1 space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Sentiment de l'article</label>
                    <div className="flex flex-wrap gap-2.5">
                      {[
                        { id: 'positive', icon: <TrendingUp size={16} />, text: 'POSITIF', activeClass: 'bg-emerald-600 border-emerald-600 text-white', normalClass: 'text-emerald-600 border-emerald-100 bg-emerald-50' },
                        { id: 'neutral', icon: <Minus size={16} />, text: 'NEUTRE', activeClass: 'bg-slate-600 border-slate-600 text-white', normalClass: 'text-slate-600 border-slate-200 bg-white' },
                        { id: 'negative', icon: <TrendingDown size={16} />, text: 'CRITIQUE', activeClass: 'bg-rose-600 border-rose-600 text-white', normalClass: 'text-rose-600 border-rose-100 bg-rose-50' }
                      ].map(s => (
                      <button 
                        key={s.id} 
                        type="button" 
                        onClick={() => setSentiment(s.id as any)}
                        className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl border-2 transition-all text-[10px] font-black uppercase tracking-tighter ${
                        sentiment === s.id ? `${s.activeClass} shadow-lg scale-105` : `${s.normalClass} hover:bg-slate-50`
                        }`}
                        >
                        {s.icon} {s.text}
                      </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="w-full md:w-64 space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Thématique</label>
                    <select 
                      value={category} onChange={(e) => setCategory(e.target.value as any)} required 
                      className="w-full p-4 bg-white border-2 border-slate-200 rounded-xl text-sm font-extrabold text-slate-950 outline-none"
                    >
                      {['Economie', 'Budget', 'Politique', 'International'].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-200 flex flex-col md:flex-row gap-4 shrink-0">
              <button type="button" onClick={onClose} className="flex-1 py-4 bg-white border-2 border-slate-300 rounded-2xl font-black text-slate-700 text-xs uppercase hover:bg-slate-100 transition-all">Annuler</button>
              <button type="submit" className="flex-1 py-4 bg-[#175a95] text-white rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-blue-800 transition-all flex items-center justify-center gap-2">
                <Plus size={18} /> Ajouter à la Veille
              </button>
            </div>
          </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};