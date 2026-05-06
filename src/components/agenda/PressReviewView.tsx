import React, { useState, useEffect } from 'react';
import { Share2, CheckCircle, Smartphone, Globe, Linkedin, Facebook, X, AlertCircle, Edit3, Save } from 'lucide-react';
import { EditorialActivity } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';


interface EditorialEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  results: Record<string, string>;
  onSave: (platform: string, text: string, title: string) => Promise<void>;
  rejection_reason?: string; // Optionnel : pour afficher le motif de rejet
}

interface PressReviewProps {
  activities: EditorialActivity[];
  onValidate: (id: string) => void;
  onEdit?: (activity: EditorialActivity) => void; // Optionnel pour éviter d'autres erreurs
  userRole?: string;
  readOnlyForCabinet?: boolean;
}

// Au début de src/components/agenda/PressReviewView.tsx
export const PressReviewView = ({ 
  activities, 
  onValidate, 
  onEdit, 
  userRole, 
  readOnlyForCabinet = false 
}: PressReviewProps) => {
 const EditorialEditorModal = ({ 
  isOpen, 
  onClose, 
  title: initialTitle, 
  results, 
  onSave,
  rejection_reason 
}: EditorialEditorModalProps) => {
  const [activePlatform, setActivePlatform] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [title, setTitle] = useState<string>(initialTitle);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const platforms = Object.keys(results);
    if (platforms.length > 0) {
      setActivePlatform(platforms[0]);
      setContent(results[platforms[0]]);
    }
    setTitle(initialTitle);
  }, [results, initialTitle, isOpen]);

  const handlePlatformChange = (p: string) => {
    setActivePlatform(p);
    setContent(results[p]);
  };

  const handleInternalSave = async () => {
    setIsSaving(true);
    try {
      await onSave(activePlatform, content, title);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

 
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-[#0f172a] w-full max-w-5xl max-h-[92vh] rounded-[2.5rem] border border-white/10 shadow-2xl flex flex-col overflow-hidden"
      >
        
        {/* --- 1. HEADER FIXE --- */}
        <div className="flex-shrink-0 p-6 md:p-8 border-b border-white/5 bg-slate-900/50 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#175a95]/20 rounded-2xl">
              <Edit3 size={24} className="text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-tight">Révision Éditoriale</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Ajustement des contenus avant validation</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-slate-400 transition-all">
            <X size={24} />
          </button>
        </div>

        {/* --- 2. ZONE CENTRALE SCROLLABLE --- */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 custom-scrollbar">
          
          {/* Motif de Rejet (Alerte visuelle) */}
          {rejection_reason && (
            <div className="bg-rose-500/10 border-2 border-rose-500/20 p-6 rounded-[2rem] flex items-start gap-4 animate-in fade-in slide-in-from-top-2">
              <div className="bg-rose-500 p-2 rounded-xl">
                <AlertCircle className="text-white" size={20} />
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-black text-rose-500 uppercase tracking-widest">Instruction de correction du Cabinet</p>
                <p className="text-rose-100 text-sm italic leading-relaxed font-medium">"{rejection_reason}"</p>
              </div>
            </div>
          )}

          {/* Sélecteur de plateforme (si multi-canaux) */}
          {Object.keys(results).length > 1 && (
            <div className="flex gap-2 p-1.5 bg-slate-800/50 rounded-2xl w-fit">
              {Object.keys(results).map(p => (
                <button
                  key={p}
                  onClick={() => handlePlatformChange(p)}
                  className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    activePlatform === p ? 'bg-[#175a95] text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          {/* Édition du Titre */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Titre de l'article</label>
            <input 
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-800/30 border border-white/5 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-blue-500/50 transition-all"
            />
          </div>

          {/* ZONE TEXTE PRINCIPALE */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Contenu final</label>
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 to-emerald-600/20 rounded-[2rem] blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="relative w-full h-[350px] bg-slate-900/80 border border-white/10 rounded-[1.5rem] p-6 md:p-8 text-slate-200 text-base font-serif italic leading-relaxed outline-none focus:border-blue-500/50 transition-all custom-scrollbar"
              />
            </div>
          </div>
        </div>

        {/* --- 3. FOOTER FIXE --- */}
        <div className="flex-shrink-0 p-6 md:p-8 border-t border-white/5 bg-slate-900/80 flex flex-col sm:flex-row justify-end items-center gap-4">
          <button 
            onClick={onClose}
            className="text-[11px] font-black text-slate-400 uppercase tracking-widest hover:text-white transition-colors"
          >
            Abandonner les modifications
          </button>
          <button
            onClick={handleInternalSave}
            disabled={isSaving}
            className="w-full sm:w-auto px-10 py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-emerald-900/20 transition-all flex items-center justify-center gap-3 active:scale-95"
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Synchronisation...
              </span>
            ) : (
              <>
                <Save size={18} />
                Enregistrer & Soumettre au Cabinet
              </>
            )}
          </button>
        </div>

      </motion.div>
    </div>
  );
}};