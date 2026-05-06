import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Clock, Sparkles, Save, Loader2, MessageSquareText, Info, ChevronRight, CheckCircle2, User, MapPin, Calendar } from 'lucide-react';
import { EditorialActivity } from '../../types';
import { generateInterviewQuestions } from '../../services/aiService';
import { notificationService } from '../../services/notificationService';

// QUESTIONS D'INTERVIEW AMÉLIORÉES POUR LE MEFB
const DEFAULT_INTERVIEW_QUESTIONS: string[] = [
  "Quels sont les 3 points clés à retenir de cette activité ?",
  "Quelle citation marquante a été prononcée ?",
  "Quels sont les prochains jalons (Next Steps) de ce dossier ?"
];

interface ActivityDetailSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activity: EditorialActivity | null;
  onUpdate: (updated: EditorialActivity) => void;
  onGenerateAI: () => Promise<void>;
  onGenerateWebsiteArticle: (interviewNotes: string) => Promise<void>;
  onStartComm: () => void;
  isGenerating?: boolean;
}

export const ActivityDetailSidebar = ({
  isOpen, onClose, activity, onUpdate, onGenerateAI, onGenerateWebsiteArticle, onStartComm, isGenerating = false
}: ActivityDetailSidebarProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState<string[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  const [isInterviewComplete, setIsInterviewComplete] = useState(false);
  const [activeQuestions, setActiveQuestions] = useState<string[]>(DEFAULT_INTERVIEW_QUESTIONS);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);

  // Charger les questions générées par l'IA lors de l'ouverture du sidebar
  useEffect(() => {
    if (isOpen && activity && !activity.description?.includes("RÉPONSE:")) {
      setIsLoadingQuestions(true);

      if (activity.interview_questions && activity.interview_questions.length > 0) {
        setActiveQuestions(activity.interview_questions);
        setIsLoadingQuestions(false);
      } else {
        generateInterviewQuestions(activity)
          .then((questions) => {
            setActiveQuestions(questions);
            setIsLoadingQuestions(false);
          })
          .catch(() => {
            setActiveQuestions(DEFAULT_INTERVIEW_QUESTIONS);
            setIsLoadingQuestions(false);
          });
      }
    }
  }, [isOpen, activity?.id, activity?.interview_questions]);

  useEffect(() => {
    setResponses(Array(activeQuestions.length).fill(""));
  }, [activeQuestions.length]);

  useEffect(() => {
    if (activity?.description && activity.description.includes("RÉPONSE:")) {
      setIsInterviewComplete(true);
    } else {
      setIsInterviewComplete(false);
      setCurrentStep(0);
      setCurrentInput("");
    }
  }, [activity?.id, activeQuestions.length]);

  useEffect(() => {
    setCurrentInput(responses[currentStep] || "");
  }, [currentStep, responses]);

  // Sécurité : Si aucune activité n'est sélectionnée, on ne rend rien
  if (!activity) return null;

  const saveCurrentResponse = (value: string) => {
    const updatedResponses = [...responses];
    updatedResponses[currentStep] = value;
    setResponses(updatedResponses);
    return updatedResponses;
  };

  const getCurrentResponses = () => {
    const currentResponses = [...responses];
    if (currentInput.trim()) {
      currentResponses[currentStep] = currentInput.trim();
    }
    return currentResponses;
  };

  const compileInterviewNotes = () => {
    return getCurrentResponses()
      .map((answer, i) => `QUESTION: ${activeQuestions[i]}\nRÉPONSE: ${answer || ""}`)
      .join("\n\n");
  };

  const handleNextQuestion = () => {
    if (!currentInput.trim()) return;

    const updatedResponses = saveCurrentResponse(currentInput.trim());

    if (currentStep < activeQuestions.length - 1) {
      setCurrentStep(currentStep + 1);
      return;
    }

    const finalNotes = activeQuestions
      .map((q, i) => `QUESTION: ${q}\nRÉPONSE: ${updatedResponses[i] || ""}`)
      .join("\n\n");

    onUpdate({ ...activity, description: finalNotes });
    setIsInterviewComplete(true);
  };

  const handlePreviousQuestion = () => {
    if (currentStep === 0) return;
    saveCurrentResponse(currentInput.trim());
    setCurrentStep(currentStep - 1);
  };

  const preparatoryQuestions = activity?.interview_questions?.length ? activity.interview_questions : activeQuestions;

  const handleGenerateWebsiteArticle = async () => {
    const interviewNotes = compileInterviewNotes();
    const hasAnswers = getCurrentResponses().some((answer) => answer.trim());
    if (!hasAnswers) {
      alert("Veuillez répondre aux questions avant de générer l'article pour le site web.");
      return;
    }

    await onGenerateWebsiteArticle(interviewNotes);
  };

  const hasInterviewNotes = getCurrentResponses().some((answer) => answer.trim());

  const handleSaveChanges = () => {
    const updatedActivity = { ...activity };

    if (hasInterviewNotes) {
      updatedActivity.description = compileInterviewNotes();
      onUpdate(updatedActivity);
    }

    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[60]" 
          />
          <motion.aside 
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-y-0 right-0 w-full sm:w-[550px] bg-white shadow-2xl z-[70] flex flex-col border-l border-slate-100"
          >
            {/* HEADER PRÉCISION MEFB */}
            <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-1.5 h-12 bg-[#175a95] rounded-full" />
                <div>
                  <h3 className="font-black text-slate-800 uppercase text-sm tracking-tighter">Fiche d'Activité</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1 text-[9px] font-black text-[#175a95] uppercase bg-blue-50 px-2 py-0.5 rounded">
                      <Calendar size={10} /> {activity.date}
                    </span>
                    <span className="flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase">
                      <MapPin size={10} /> {activity.location || "Cabinet"}
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={onClose} className="p-3 hover:bg-rose-50 hover:text-rose-500 rounded-2xl transition-all">
                <X size={24} />
              </button>
            </div>

            {/* CONTENU - SCROLLABLE */}
            <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
              
              {/* RÉSUMÉ DES RESPONSABLES (Fuzzy Matching info) */}
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="p-2 bg-white rounded-xl shadow-sm text-[#175a95]"><User size={18} /></div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Responsables assignés</p>
                  <p className="text-xs font-bold text-slate-700">{activity.responsible || "Non assigné"}</p>
                </div>
              </div>

              {/* 1. INTERVIEW DE TERRAIN */}
              <div className="bg-white rounded-[2.5rem] p-8 border-2 border-slate-100 space-y-6 relative overflow-hidden shadow-sm">
                <div className="flex items-center gap-3">
                   <MessageSquareText size={20} className="text-[#175a95]" />
                   <h4 className="text-[11px] font-black uppercase text-slate-800 tracking-wider">Collecte d'informations IA</h4>
                   {isLoadingQuestions && <Loader2 size={16} className="animate-spin text-[#175a95]" />}
                </div>

                {preparatoryQuestions.length > 0 && (
                  <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Questions IA de préparation</p>
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#175a95]">Copiez et envoyez aux rédacteurs</span>
                    </div>
                    <p className="text-[11px] text-slate-500">Ces questions sont générées à partir de l'activité et servent à guider la prise de notes et les interviews avant l'événement.</p>
                    <ol className="list-decimal list-inside space-y-2 text-[12px] text-slate-700">
                      {preparatoryQuestions.map((question, index) => (
                        <li key={index} className="pl-2">
                          <span className="font-semibold text-slate-800">{question}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {!isInterviewComplete ? (
                  <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                    {isLoadingQuestions ? (
                      <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-center justify-center h-24">
                        <div className="text-center">
                          <Sparkles size={20} className="animate-spin text-[#175a95] mx-auto mb-2" />
                          <p className="text-[11px] font-bold text-slate-600">Génération des questions...</p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100 relative">
                         <p className="text-[13px] font-bold text-slate-800 leading-relaxed italic">
                           "{activeQuestions[currentStep]}"
                         </p>
                      </div>
                    )}
                    <textarea 
                      rows={5}
                      value={currentInput} 
                      onChange={(e) => setCurrentInput(e.target.value)}
                      placeholder="Tapez ici les éléments de réponse fournis par le responsable..." 
                      className="w-full p-5 bg-slate-50 border-2 border-transparent rounded-2xl text-sm outline-none focus:bg-white focus:border-[#175a95]/20 transition-all font-medium"
                      disabled={isLoadingQuestions}
                    />

                    <div className="flex items-center gap-3">
                        {currentStep > 0 && (
                          <button
                            onClick={handlePreviousQuestion}
                            className="flex-1 py-4 bg-slate-100 text-slate-700 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-200 transition-all"
                          >
                            Précédente
                          </button>
                        )}
                        <button 
                          onClick={handleNextQuestion} 
                          disabled={isLoadingQuestions}
                          className="flex-1 py-4 bg-[#175a95] text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-blue-900/20 hover:bg-blue-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {currentStep < activeQuestions.length - 1 ? "Question Suivante" : "Finaliser les notes"}
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                ) : (
                  <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <CheckCircle2 size={24} className="text-[#149308]" />
                      <div>
                        <p className="text-[11px] font-black text-[#149308] uppercase">Notes enregistrées</p>
                        <p className="text-[10px] text-green-700 font-bold opacity-70">Prêt pour la rédaction stratégique.</p>
                      </div>
                    </div>
                    <button onClick={() => setIsInterviewComplete(false)} className="text-[10px] font-black text-[#175a95] underline uppercase">Modifier</button>
                  </div>
                )}
              </div>

              {/* 2. BOUTONS D'ACTIONS (LIÉS AU DASHBOARD) */}
              <div className="space-y-4">
                <button
                  onClick={handleGenerateWebsiteArticle}
                  disabled={isGenerating}
                  className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} className="text-emerald-400" />}
                  GÉNÉRER UN ARTICLE POUR LE SITE WEB
                </button>

                <button 
                  onClick={onStartComm}
                  className="w-full py-5 bg-[#175a95] text-white rounded-2xl font-black text-[11px] uppercase shadow-xl shadow-blue-900/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-3"
                >
                  <Send size={16} /> Choisir un Modèle & Rédiger
                </button>
              </div>
            </div>

            {/* FOOTER FIXE */}
            <div className="p-8 border-t border-slate-50 bg-white flex gap-4 shrink-0">
              <button onClick={onClose} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-[11px] uppercase">Annuler</button>
              <button
                onClick={handleSaveChanges}
                disabled={!hasInterviewNotes}
                className="flex-[2] py-4 bg-[#149308] text-white rounded-2xl font-black text-[11px] uppercase shadow-lg shadow-green-900/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:bg-slate-300"
              >
                <Save size={18} /> {hasInterviewNotes ? "Sauvegarder les notes" : "Aucune note à sauvegarder"}
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};