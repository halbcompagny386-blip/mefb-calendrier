import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Loader2, Sparkles, ChevronRight, CheckCircle2 } from 'lucide-react';
import { generateInterviewQuestions } from '../../services/aiService';

interface InterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  activity: any | null;
  onComplete: (responses: Record<string, string>) => void;
  title?: string;
}

const DEFAULT_QUESTIONS = [
  "Quels sont les 3 points clés à retenir de cette activité ?",
  "Quelle citation marquante a été prononcée ?",
  "Quels sont les prochains jalons (Next Steps) de ce dossier ?"
];

export const InterviewModal = ({
  isOpen,
  onClose,
  activity,
  onComplete,
  title = "Collecte d'Informations pour Rédaction"
}: InterviewModalProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [currentInput, setCurrentInput] = useState("");
  const [isInterviewComplete, setIsInterviewComplete] = useState(false);
  const [questions, setQuestions] = useState<string[]>(DEFAULT_QUESTIONS);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);

  // Charger les questions générées par l'IA
  useEffect(() => {
    if (isOpen && activity) {
      setIsLoadingQuestions(true);
      generateInterviewQuestions(activity)
        .then((generatedQuestions) => {
          setQuestions(generatedQuestions);
          setIsLoadingQuestions(false);
        })
        .catch(() => {
          setQuestions(DEFAULT_QUESTIONS);
          setIsLoadingQuestions(false);
        });
    }
  }, [isOpen, activity?.id]);

  // Réinitialiser quand on ouvre/ferme le modal
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setResponses({});
      setCurrentInput("");
      setIsInterviewComplete(false);
    }
  }, [isOpen]);

  const handleNextQuestion = () => {
    if (!currentInput.trim()) {
      alert("Veuillez répondre à la question avant de continuer.");
      return;
    }

    const questionKey = `q${currentStep + 1}`;
    const newResponses = { ...responses, [questionKey]: currentInput };
    setResponses(newResponses);
    setCurrentInput("");

    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsInterviewComplete(true);
    }
  };

  const handleFinalize = () => {
    onComplete(responses);
    onClose();
  };

  if (!isOpen || !activity) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white dark:bg-[#0a0f1d] w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-white/10 max-h-[85vh] flex flex-col"
          >
            {/* HEADER */}
            <div className="p-8 border-b border-slate-100 dark:border-white/5 bg-gradient-to-r from-[#175a95] to-[#149308] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-2xl">
                  <Sparkles size={24} />
                </div>
                <div>
                  <h3 className="font-black text-lg uppercase tracking-tight">{title}</h3>
                  <p className="text-[10px] font-bold opacity-80">{activity.title || "Activité"}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-full transition-all"
              >
                <X size={24} />
              </button>
            </div>

            {/* CONTENU - SCROLLABLE */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-6">
              {!isInterviewComplete ? (
                <>
                  {isLoadingQuestions ? (
                    <div className="flex flex-col items-center justify-center h-48">
                      <Loader2 size={32} className="animate-spin text-[#175a95] mb-4" />
                      <p className="text-[12px] font-bold text-slate-600">Génération des questions...</p>
                    </div>
                  ) : (
                    <>
                      {/* Progression */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            Question {currentStep + 1}/{questions.length}
                          </p>
                        </div>
                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#175a95] to-[#149308] transition-all"
                            style={{ width: `${((currentStep + 1) / questions.length) * 100}%` }}
                          />
                        </div>
                      </div>

                      {/* Question */}
                      <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-50/50 dark:from-blue-900/20 dark:to-blue-900/10 rounded-2xl border border-blue-200 dark:border-blue-800 relative">
                        <p className="text-[14px] font-bold text-slate-800 dark:text-slate-100 leading-relaxed">
                          {questions[currentStep]}
                        </p>
                      </div>

                      {/* Réponse */}
                      <div className="space-y-3">
                        <textarea
                          rows={6}
                          value={currentInput}
                          onChange={(e) => setCurrentInput(e.target.value)}
                          placeholder="Saisissez votre réponse ici..."
                          className="w-full p-5 bg-slate-50 dark:bg-slate-900/40 border-2 border-slate-200 dark:border-white/10 rounded-2xl text-sm outline-none focus:border-[#175a95] transition-all font-medium text-slate-800 dark:text-slate-100 custom-scrollbar"
                        />
                      </div>

                      {/* Bouton Suivant */}
                      <button
                        onClick={handleNextQuestion}
                        className="w-full py-4 bg-gradient-to-r from-[#175a95] to-[#149308] text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                      >
                        {currentStep < questions.length - 1
                          ? "Question Suivante"
                          : "Finaliser les Réponses"}
                        <ChevronRight size={16} />
                      </button>
                    </>
                  )}
                </>
              ) : (
                <div className="space-y-6">
                  {/* Statut Complété */}
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 p-8 rounded-2xl border border-emerald-200 dark:border-emerald-800 flex items-center gap-4">
                    <CheckCircle2 size={32} className="text-[#149308] flex-shrink-0" />
                    <div>
                      <p className="text-[12px] font-black text-[#149308] uppercase">Interview Complétée</p>
                      <p className="text-[11px] text-green-700 dark:text-green-300 font-bold">
                        Vos réponses seront utilisées pour enrichir la génération du contenu.
                      </p>
                    </div>
                  </div>

                  {/* Résumé des réponses */}
                  <div className="space-y-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Résumé des réponses:</p>
                    {Object.entries(responses).map(([key, value], idx) => (
                      <div key={key} className="space-y-2">
                        <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                          Q{idx + 1}. {questions[idx]}
                        </p>
                        <p className="text-[12px] text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-100 dark:border-white/5 italic">
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* FOOTER */}
            <div className="p-8 border-t border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5 flex gap-4 shrink-0">
              <button
                onClick={onClose}
                className="flex-1 py-4 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl font-black text-[11px] uppercase transition-all hover:bg-slate-300 dark:hover:bg-slate-600"
              >
                Annuler
              </button>
              {isInterviewComplete && (
                <button
                  onClick={handleFinalize}
                  className="flex-[2] py-4 bg-gradient-to-r from-[#175a95] to-[#149308] text-white rounded-2xl font-black text-[11px] uppercase shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                >
                  <Send size={16} /> Continuer vers la Rédaction
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
