// src/components/press/CabinetDecisionModal.tsx
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, X, AlertCircle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (feedback: string) => void;
  title: string;
}

export const CabinetDecisionModal = ({ isOpen, onClose, onConfirm, title }: Props) => {
  const [feedback, setFeedback] = useState("");

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="bg-white dark:bg-[#161e2d] w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/10"
          >
            <div className="p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-amber-500/20 text-amber-500 rounded-2xl">
                    <AlertCircle size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Instructions du Cabinet</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Dossier : {title}</p>
                  </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full transition-all">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-3">
                <label className="text-[11px] font-black text-slate-500 uppercase flex items-center gap-2">
                  <MessageSquare size={14} /> Vos corrections & suggestions
                </label>
                <textarea 
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Ex: Veuillez mettre plus en avant les chiffres de la Banque Mondiale..."
                  className="w-full h-40 p-6 bg-slate-50 dark:bg-[#0a0f1d] border-2 border-slate-100 dark:border-white/5 rounded-3xl text-sm font-medium text-slate-800 dark:text-white outline-none focus:border-[#149308] transition-all"
                />
              </div>

              <div className="flex gap-4">
                <button onClick={onClose} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase hover:bg-slate-200 transition-all">Annuler</button>
                <button 
                  onClick={() => {
                    onConfirm(feedback);
                    setFeedback("");
                    onClose();
                  }}
                  className="flex-[2] py-4 bg-[#149308] text-white rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 hover:bg-green-700 transition-all"
                >
                  <Send size={16} /> Envoyer aux Rédacteurs
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};