import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, Copy, Check, Sparkles, Layout, Globe, Facebook, Linkedin, Twitter, Youtube, Send } from 'lucide-react';
import { motion } from 'framer-motion';

interface EditorialEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  results: Record<string, string>;
  onSave: (platform: string, content: string, title?: string) => void;
  rejectionReason?: string; // Motif de rejet du Cabinet
}

export const EditorialEditorModal = ({ isOpen, onClose, title, results, onSave, rejectionReason }: EditorialEditorModalProps) => {
  const [activeTab, setActiveTab] = useState<string>('');
  const [content, setContent] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && results && Object.keys(results).length > 0) {
      const platforms = Object.keys(results);
      if (!activeTab || !platforms.includes(activeTab)) {
        const firstPlatform = platforms[0];
        setActiveTab(firstPlatform);
        setContent(results[firstPlatform]);
      }
    }
  }, [results, isOpen]);

  useEffect(() => {
    if (activeTab && results && results[activeTab]) {
      setContent(results[activeTab]);
    }
  }, [activeTab, results]);

  const handleCopy = () => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getPlatformIcon = (p: string) => {
    switch (p.toLowerCase()) {
      case 'facebook': return <Facebook size={16} />;
      case 'linkedin': return <Linkedin size={16} />;
      case 'site web': return <Globe size={16} />;
      case 'twitter':
      case 'x': return <Twitter size={16} />;
      case 'youtube': return <Youtube size={16} />;
      default: return <Layout size={16} />;
    }
  };

  if (!isOpen || !results || Object.keys(results).length === 0) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-xl">
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        // ✅ CORRECTION : Ajout de flex-col et max-h pour fixer le layout
        className="bg-white dark:bg-[#0a0f1d] w-full max-w-5xl max-h-[90vh] rounded-[3rem] shadow-[0_0_80px_-15px_rgba(23,90,149,0.6)] overflow-hidden border border-white/20 flex flex-col"
      >
        {/* HEADER (FIXE) */}
        <div className="flex-shrink-0 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5">
          <div className="p-8 pb-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[#175a95] rounded-2xl text-white shadow-xl shadow-blue-900/20">
                <Sparkles size={24} className="animate-pulse" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 dark:text-white uppercase text-base tracking-tight">
                  Validation Stratégique Multi-Canal
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase truncate max-w-[400px] mt-1">
                  {title}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full transition-all"
            >
              <X size={28} />
            </button>
          </div>

          {/* ONGLETS (FIXES) */}
          <div className="px-8 flex gap-2 overflow-x-auto pb-4 custom-scrollbar">
            {Object.keys(results).map((plat) => (
              <button
                key={plat}
                onClick={() => setActiveTab(plat)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[11px] font-black uppercase transition-all whitespace-nowrap ${
                  activeTab === plat
                    ? 'bg-[#175a95] text-white shadow-lg scale-105'
                    : 'bg-white dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-white/10 hover:border-[#175a95]'
                }`}
              >
                {getPlatformIcon(plat)} {plat}
              </button>
            ))}
          </div>
        </div>

        {/* ✅ ZONE CENTRALE SCROLLABLE (CONTENU) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-white dark:bg-[#0a0f1d]">
          
          {/* BANDEAU MOTIF DE REJET */}
          {rejectionReason && (
            <div className="p-6 bg-rose-50/80 dark:bg-rose-950/30 border-l-4 border-rose-500 border-b border-rose-200 dark:border-rose-900/50">
              <div className="flex items-start gap-4">
                <div className="w-6 h-6 rounded-full bg-rose-500/30 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-sm text-rose-600 dark:text-rose-400 font-black">!</span>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-600 dark:text-rose-400 mb-2">📋 Motif de rejet du Cabinet</p>
                  <p className="text-sm text-rose-700 dark:text-rose-300 font-semibold leading-relaxed">{rejectionReason}</p>
                </div>
              </div>
            </div>
          )}

          {/* ZONE D'ÉDITION */}
          <div className="p-8 relative">
            <div className="absolute top-12 left-12 pointer-events-none opacity-[0.03] dark:opacity-[0.08]">
              <img src="/branding/logo.png" alt="Sceau" className="w-80" />
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              // ✅ Hauteur min ajustée pour forcer le scroll du parent
              className="w-full min-h-[400px] p-10 bg-slate-50/50 dark:bg-slate-900/40 rounded-[2.5rem] border-2 border-slate-100 dark:border-white/5 text-slate-800 dark:text-slate-100 font-medium text-xl leading-relaxed outline-none focus:border-[#175a95] transition-all shadow-inner relative z-10 resize-none"
              placeholder="Rédaction en cours par l'IA..."
            />
          </div>
        </div>

        {/* FOOTER (FIXE) */}
        <div className="flex-shrink-0 p-8 bg-slate-100/50 dark:bg-white/5 border-t border-slate-100 dark:border-white/5 flex flex-col sm:flex-row gap-4">
          <button
            onClick={handleCopy}
            className="flex items-center justify-center gap-3 px-8 py-5 bg-white dark:bg-slate-800 border-2 border-[#175a95] rounded-2xl text-[11px] font-black uppercase text-[#175a95] dark:text-white hover:bg-[#175a95] hover:text-white transition-all shadow-lg active:scale-95"
          >
            {copied ? <Check size={20} /> : <Copy size={20} />}
            {copied ? 'Contenu Copié !' : `Copier pour révision manuelle`}
          </button>
          <button
            onClick={() => {
              onSave(activeTab, content, title);
              onClose();
            }}
            className="flex-1 flex items-center justify-center gap-3 py-5 bg-[#149308] text-white rounded-2xl font-black text-[11px] uppercase shadow-xl shadow-green-900/20 hover:bg-green-700 transition-all active:scale-95 border-b-4 border-green-900"
          >
            <Send size={20} className="mr-2" /> Soumettre pour Validation Cabinet ({activeTab})
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
};