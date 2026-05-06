import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Zap } from 'lucide-react';
import { CommTemplate } from '@/types';

interface TemplateConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: CommTemplate | null;
  values: Record<string, string>;
  setValues: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onConfirm: () => void;
  renderedText: string;
}

export const TemplateConfigModal = ({
  isOpen,
  onClose,
  template,
  values,
  setValues,
  onConfirm,
  renderedText
}: TemplateConfigModalProps) => {
  if (!template) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Overlay de fond */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-md"
          />

          {/* Contenu de la Modale */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* En-tête */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Configurer le modèle</h3>
                <p className="text-xs text-slate-500">{template.title}</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-xl transition-all">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Corps de la modale */}
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Formulaire des Placeholders */}
                <div className="space-y-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Éléments à remplir</p>
                  <div className="space-y-3">
                    {template.placeholders.map((ph) => (
                      <div key={ph} className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">{ph}</label>
                        <input
                          type="text"
                          value={values[ph] || ''}
                          onChange={(e) => setValues(prev => ({ ...prev, [ph]: e.target.value }))}
                          placeholder={`Saisir ${ph.toLowerCase()}...`}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1A237E] outline-none transition-all"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Aperçu en temps réel */}
                <div className="space-y-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Aperçu du message</p>
                  <div className="bg-indigo-50/30 border border-indigo-100 rounded-2xl p-4 min-h-[200px] relative">
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {renderedText || template.standardText}
                    </p>
                    <button 
                      onClick={() => navigator.clipboard.writeText(renderedText)}
                      className="absolute top-2 right-2 p-1.5 text-indigo-400 hover:text-indigo-600 transition-colors"
                      title="Copier le texte"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Pied de modale */}
            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-[10px] text-slate-400 italic max-w-[250px]">
                Le contenu sera automatiquement inséré dans une nouvelle fiche d'activité.
              </p>
              <div className="flex gap-3 w-full sm:w-auto">
                <button
                  onClick={onClose}
                  className="flex-1 sm:flex-none px-6 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-100 transition-all"
                >
                  Annuler
                </button>
                <button
                  onClick={onConfirm}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2 bg-[#1A237E] text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-900/20 hover:bg-[#151b63] transition-all"
                >
                  <Zap size={16} />
                  Créer l'activité
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