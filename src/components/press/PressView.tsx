import React, { useState, useEffect } from 'react'; // Ajout de useEffect
import { 
  Search, Plus, ExternalLink, Globe, FileText, Trash2, Copy, Sparkles,
  CheckCircle, Clock, XCircle, ChevronRight, UserCheck, RefreshCw, X, Archive, Edit
} from 'lucide-react';
import { PressArticle } from '../../types';
import { supabase } from '../../lib/supabaseClient'; // Import indispensable pour le temps réel
import { EditorialEditorModal } from '../agenda/EditorialEditorModal';
import { generateEditorialContent, generatePressSummary } from '../../services/aiService';

interface PressViewProps {
  articles: PressArticle[];
  onAddArticle: () => void;
  onArchiveArticle: (id: string) => void;      // Archive l'article
  onHardDeleteArticle?: (id: string) => void; // Supprime définitivement
  onValidateArticle?: (id: string, status: 'approved' | 'rejected') => void; 
  userRole?: string;
  fetchArticles: () => Promise<void>;
  showUpdateMessage: (message: string) => void;
  initialTab?: 'veille' | 'validation';
  initialValidationFilter?: 'pending' | 'approved' | 'rejected';
  onTabChange?: (tab: 'veille' | 'validation') => void;
  onValidationFilterChange?: (filter: 'pending' | 'approved' | 'rejected') => void;
}

export const PressView = ({ 
  articles, 
  onAddArticle, 
  onArchiveArticle,
  onHardDeleteArticle,
  onValidateArticle, 
  userRole,
  fetchArticles,
  showUpdateMessage,
  initialTab = 'veille',
  initialValidationFilter = 'pending',
  onTabChange,
  onValidationFilterChange
}: PressViewProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentTab, setCurrentTab] = useState<'veille' | 'validation'>(initialTab);
  const [validationFilter, setValidationFilter] = useState<'pending' | 'approved' | 'rejected'>(initialValidationFilter);
  const [selectedArticle, setSelectedArticle] = useState<PressArticle | null>(null);
  const [detailMode, setDetailMode] = useState<'detail' | 'edit' | null>(null);
  const [detailSummary, setDetailSummary] = useState<string>('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [editorResults, setEditorResults] = useState<Record<string, string>>({});
  const [editorTitle, setEditorTitle] = useState('');
  const [isEditSaving, setIsEditSaving] = useState(false);
  const [isGeneratingAIRevision, setIsGeneratingAIRevision] = useState(false);
  const [copiedArticleId, setCopiedArticleId] = useState<string | null>(null);
  const [localMessage, setLocalMessage] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; articleId: string; title: string }>({ isOpen: false, articleId: '', title: '' });

  // Vérifier si Cabinet / Communication
  const normalizedRole = userRole?.toString().trim().toLowerCase();
  const isCabinet = normalizedRole === 'cabinet';
  const isComm    = normalizedRole === 'communication' || normalizedRole === 'service communication';
  const canAddArticles = !isCabinet && !isComm;

  // RBAC onglets : Communication ne voit pas À VALIDER, Cabinet ne voit pas VALIDÉS/REJETÉS
  const canSeePending  = !isComm;   // Cabinet uniquement
  const canSeeApproved = !isCabinet; // Communication uniquement
  const canSeeRejected = !isCabinet; // Communication uniquement

  // Si le filtre actif n'est pas autorisé pour ce rôle, on défaut sur le premier disponible
  const effectiveFilter = (() => {
    if (validationFilter === 'pending'   && !canSeePending)  return canSeeApproved ? 'approved' : 'rejected';
    if (validationFilter === 'approved'  && !canSeeApproved) return canSeePending ? 'pending' : 'rejected';
    if (validationFilter === 'rejected'  && !canSeeRejected) return canSeePending ? 'pending' : 'approved';
    return validationFilter;
  })() as 'pending' | 'approved' | 'rejected';

  const isCabinetInstructionText = (text?: string) => {
    return Boolean(text && text.trim().toUpperCase().startsWith('INSTRUCTIONS CABINET'));
  };

  const getArticleBody = (article: PressArticle) => {
    if (article.content && article.content.trim().length > 0) {
      return article.content;
    }
    if (isCabinetInstructionText(article.summary)) {
      return undefined;
    }
    return article.summary;
  };

  const getCabinetFeedback = (article: PressArticle) => {
    if (article.cabinet_feedback && article.cabinet_feedback.trim().length > 0) {
      return article.cabinet_feedback;
    }
    if (isCabinetInstructionText(article.summary)) {
      return article.summary;
    }
    return undefined;
  };

  const isInternalArticle = (article: PressArticle) =>
    article.source?.trim().toUpperCase() === 'PRODUCTION INTERNE';

  // --- LOGIQUE TEMPS RÉEL (FINI LES ACTUALISATIONS MANUELLES) ---
  useEffect(() => {
    // 1. On crée le canal d'écoute sur la table press_review
    const channel = supabase
      .channel('press_realtime_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'press_review' }, 
        () => {
          setIsSyncing(true);
          fetchArticles().then(() => {
            setTimeout(() => setIsSyncing(false), 2000); // Animation de synchro
            showUpdateMessage('✅ Synchronisation validée');
          });
        }
      )
      .subscribe();

    // 2. On remet à jour l'onglet et le filtre depuis le parent si besoin
    setCurrentTab(initialTab);
    setValidationFilter(initialValidationFilter);

    // 3. Nettoyage à la fermeture du composant
    return () => {
      if (channel.unsubscribe) {
        channel.unsubscribe();
      }
      supabase.removeChannel(channel);
    };
  }, [fetchArticles, initialTab, initialValidationFilter]);

  useEffect(() => {
    if (currentTab === 'validation' && validationFilter === 'pending') {
      setValidationFilter(initialValidationFilter);
    }
  }, [currentTab, initialValidationFilter]);

  const getSourceBadgeLabel = (article: PressArticle) =>
    isInternalArticle(article) ? 'PRODUCTION INTERNE' : 'SOURCE EXTERNE';

  const openArticleDetail = async (article: PressArticle) => {
    setSelectedArticle(article);
    setDetailMode('detail');
    setDetailSummary('');
    setSummaryError(null);
    setIsSummarizing(true);

    try {
      const body = getArticleBody(article) || article.summary || article.content || '';
      const summary = await generatePressSummary(body, article.title);
      setDetailSummary(summary);
    } catch (error) {
      console.error('Erreur résumé IA presse :', error);
      setSummaryError('Impossible de générer le sommaire IA. Veuillez réessayer.');
    } finally {
      setIsSummarizing(false);
    }
  };

  const openArticleEditor = (article: PressArticle, useAI = false, preFilledContent?: string) => {
    setSelectedArticle(article);
    setDetailMode('edit');

    // Priorité : preFilledContent (résumé IA du modal détail) > contenu article > summary
    const fallbackContent = preFilledContent || getArticleBody(article) || '';
    setEditorResults({ 'Révision manuelle': fallbackContent || 'Génération en cours...' });
    setEditorTitle(`Révision : ${article.title}`);

    if (useAI) {
      // Mode IA : génère une version retravaillée
      setIsGeneratingAIRevision(true);
      generateEditorialContent(
        fallbackContent || article.title || '',
        article.title || "Révision d'article",
        'Publication officielle'
      ).then((aiText) => {
        setEditorResults({ 'Révision IA': aiText || fallbackContent });
        setEditorTitle(`Révision IA : ${article.title}`);
      }).catch((err) => {
        console.error('Erreur IA révision :', err);
        setEditorResults({ 'Révision manuelle': fallbackContent });
        setEditorTitle(`Révision : ${article.title}`);
        setLocalMessage('Erreur IA, modification manuelle activée');
      }).finally(() => {
        setIsGeneratingAIRevision(false);
      });
      return;
    }

    // Mode Manuel : si pas de contenu disponible, génère automatiquement quelque chose
    if (!fallbackContent || fallbackContent.trim().length < 10) {
      setIsGeneratingAIRevision(true);
      generateEditorialContent(
        article.title || article.source || '',
        article.title || "Article de presse",
        'Publication officielle'
      ).then((aiText) => {
        if (aiText) setEditorResults({ 'Révision manuelle': aiText });
      }).catch((err) => {
        console.error('Génération auto échouée :', err);
      }).finally(() => {
        setIsGeneratingAIRevision(false);
      });
    }
  };

  const copyToClipboard = async (content: string, id: string) => {
    if (!navigator.clipboard) return;
    await navigator.clipboard.writeText(content);
    setCopiedArticleId(id);
    setLocalMessage('Texte copié ✅');
    window.setTimeout(() => setCopiedArticleId(null), 2000);
    window.setTimeout(() => setLocalMessage(null), 2000);
  };

  const handleSaveRevision = async (_platform: string, content: string) => {
    if (!selectedArticle) return;
    setIsEditSaving(true);

    const { error } = await supabase
      .from('press_review')
      .update({
        summary: content,
        status: 'pending_validation',
        source: 'PRODUCTION INTERNE', // Force this to place it in Validation Cabinet
        validation_date: null,
        validated_by: null
      })
      .eq('id', selectedArticle.id);

    if (!error) {
      setLocalMessage('Révision enregistrée et dossier renvoyé en validation');
      await fetchArticles();
      setSelectedArticle(null);
      setDetailMode(null);
      setValidationFilter('pending');
    } else {
      console.error('Erreur mise à jour dossier :', error);
      setLocalMessage('Erreur pendant l’enregistrement');
    }

    setIsEditSaving(false);
  };

  const filteredArticles = articles.filter(a => {
    const matchesSearch = a.title?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false;
    const status = (a.status || '').toString().trim().toLowerCase();
    const isPending  = status === 'pending_validation' || status === 'pending' || status === 'en attente';
    const isPublished = status === 'published' || status === 'approved' || status === 'publié' || status === 'validé';
    const isRejected  = status === 'rejected' || status === 'rejeté';
    const isArchived  = status === 'archived' || status === 'archivé';

    if (currentTab === 'validation') {
      if (!isInternalArticle(a)) return false;
      if (effectiveFilter === 'pending')   return matchesSearch && isPending;
      if (effectiveFilter === 'approved')  return matchesSearch && isPublished;
      if (effectiveFilter === 'rejected')  return matchesSearch && isRejected;
      return false;
    }

    const isVisibleInVeille = !isInternalArticle(a) && !isArchived && !isRejected;
    return matchesSearch && isVisibleInVeille;
  });

  const parseFrenchDate = (value?: string) => {
    if (!value) return NaN;
    const frMatch = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (frMatch) {
      const [_, day, month, year] = frMatch;
      return new Date(`${year}-${month}-${day}T00:00:00Z`).getTime();
    }
    return new Date(value).getTime();
  };

  const sortedArticles = filteredArticles.slice().sort((a, b) => {
    const aTime = a.created_at ? new Date(a.created_at).getTime() : parseFrenchDate(a.date);
    const bTime = b.created_at ? new Date(b.created_at).getTime() : parseFrenchDate(b.date);
    return bTime - aTime;
  });

  const internalArticles = articles.filter(isInternalArticle);
  const pendingCount = internalArticles.filter(a => a.status === 'pending_validation').length;
  const approvedCount = internalArticles.filter(a => ['published', 'approved'].includes(a.status || '')).length;
  const rejectedCount = internalArticles.filter(a => a.status === 'rejected').length;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      
      {/* HEADER STRATÉGIQUE AMÉLIORÉ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-[#161e2d] p-8 rounded-[3rem] border border-slate-200 dark:border-white/5 shadow-xl relative overflow-hidden">
        
        {/* Indicateur de Synchronisation en temps réel */}
        {isSyncing && (
          <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500 animate-pulse z-10" />
        )}

        <div className="flex items-center gap-8">
          <button 
            onClick={() => {
              setCurrentTab('veille');
              onTabChange?.('veille');
            }}
            className={`group relative pb-4 text-xs font-black uppercase tracking-[0.2em] transition-all ${currentTab === 'veille' ? 'text-[#175a95]' : 'text-slate-400'}`}
          >
            Veille Internationale
            {currentTab === 'veille' && <div className="absolute bottom-0 left-0 w-full h-1 bg-[#175a95] rounded-full shadow-lg" />}
          </button>
          
          <button 
            onClick={() => {
              setCurrentTab('validation');
              onTabChange?.('validation');
            }}
            className={`group relative pb-4 text-xs font-black uppercase tracking-[0.2em] transition-all ${currentTab === 'validation' ? 'text-[#149308]' : 'text-slate-400'}`}
          >
            Validation Cabinet
            {currentTab === 'validation' && <div className="absolute bottom-0 left-0 w-full h-1 bg-[#149308] rounded-full shadow-lg" />}
          </button>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Badge temps réel */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-full">
            <div className={`w-1.5 h-1.5 rounded-full bg-emerald-500 ${isSyncing ? 'animate-ping' : ''}`} />
            <span className="text-[8px] font-black text-emerald-600 uppercase tracking-tighter">Live Sync</span>
          </div>

          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#175a95] transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="Rechercher un dossier..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-6 py-3 bg-slate-50 dark:bg-[#0a0f1d] rounded-2xl text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-500 font-bold outline-none w-full sm:w-64 border border-transparent focus:border-[#175a95]/30 transition-all shadow-inner"
            />
          </div>
          {canAddArticles && (
            <button onClick={onAddArticle} className="flex items-center gap-2 px-6 py-3 bg-[#175a95] text-white rounded-2xl text-[10px] font-black uppercase shadow-xl hover:scale-105 active:scale-95 transition-all">
              <Plus size={16} /> Nouveau Dossier
            </button>
          )}
        </div>
      </div>

      {currentTab === 'validation' && (
        <div className="flex flex-wrap gap-3 mb-6">

          {/* À VALIDER — visible uniquement pour Cabinet (pas Communication) */}
          {canSeePending && (
            <button
              onClick={() => {
                setValidationFilter('pending');
                onValidationFilterChange?.('pending');
              }}
              className={`px-5 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition ${effectiveFilter === 'pending' ? 'bg-[#175a95] text-white shadow-lg' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
              À valider ({pendingCount})
            </button>
          )}

          {/* VALIDÉS — visible uniquement pour Communication (pas Cabinet) */}
          {canSeeApproved && (
            <button
              onClick={() => {
                setValidationFilter('approved');
                onValidationFilterChange?.('approved');
              }}
              className={`px-5 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition ${effectiveFilter === 'approved' ? 'bg-emerald-500 text-white shadow-lg' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
              Validés ({approvedCount})
            </button>
          )}

          {/* REJETÉS — visible uniquement pour Communication (pas Cabinet) */}
          {canSeeRejected && (
            <button
              onClick={() => {
                setValidationFilter('rejected');
                onValidationFilterChange?.('rejected');
              }}
              className={`px-5 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition ${effectiveFilter === 'rejected' ? 'bg-rose-500 text-white shadow-lg' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
              Rejetés ({rejectedCount})
            </button>
          )}

        </div>
      )}

      <div className={currentTab === 'validation' ? "space-y-6" : "grid grid-cols-1 lg:grid-cols-2 gap-8"}>
        {sortedArticles.map((article) => {
          const status = article.status as string;
          const isApproved = status === 'published' || status === 'approved';
          const isRejected = status === 'rejected';

          if (currentTab === 'validation' && effectiveFilter !== 'pending') {
            return (
              <div key={article.id} className={`relative bg-[#111827] dark:bg-[#0f172a] p-8 rounded-[2.5rem] shadow-2xl flex flex-col animate-in slide-in-from-right overflow-hidden border border-slate-700/50 ${isApproved ? 'border-l-[16px] border-l-emerald-500' : 'border-l-[16px] border-l-rose-500'}`}>
                {/* Gradient overlay */}
                <div className={`absolute inset-0 pointer-events-none ${isApproved ? 'bg-gradient-to-r from-emerald-500/5 to-transparent' : 'bg-gradient-to-r from-rose-500/5 to-transparent'}`}></div>
                
                <div className="relative z-10">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    {/* Left Section: Icon + Content */}
                    <div className="flex items-start gap-6 flex-1">
                      <div className={`w-20 h-20 rounded-3xl flex items-center justify-center shrink-0 shadow-lg ${isApproved ? 'bg-emerald-500/20' : 'bg-rose-500/20'} border ${isApproved ? 'border-emerald-400/30' : 'border-rose-400/30'}`}>
                        <FileText size={40} className={isApproved ? 'text-emerald-400' : 'text-rose-400'} />
                      </div>

                      <div className="space-y-3 flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className={`inline-block px-3 py-1 text-[9px] font-black uppercase rounded-full tracking-widest font-mono ${isApproved ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/50' : 'bg-rose-500/30 text-rose-200 border border-rose-400/50'}`}>
                            {isApproved ? '✓ VALIDÉ' : '✗ REJETÉ'}
                          </span>
                          <span className="text-[9px] text-slate-400 font-bold italic">Source : {article.source}</span>
                        </div>
                        <h4 className="text-xl font-black text-white leading-tight uppercase tracking-tighter">{article.title}</h4>
                        <div className="p-5 bg-slate-200/10 rounded-2xl border border-slate-400/20 mt-3">
                          <p className="text-sm text-slate-300 font-medium leading-relaxed italic">"{getArticleBody(article) ?? 'Contenu de l’article indisponible pour ce dossier.'}"</p>
                        </div>                        
                        {/* 📌 BANDEAU DE MOTIF DE REJET - Affiché uniquement si rejeté et si effectiveFilter === 'rejected' */}
                        {isRejected && effectiveFilter === 'rejected' && article.rejection_reason && (
                          <div className="p-4 rounded-2xl border border-rose-300/40 bg-rose-50/10 mt-4 animate-in fade-in">
                            <div className="flex items-start gap-3">
                              <div className="w-5 h-5 rounded-full bg-rose-500/30 flex items-center justify-center shrink-0 mt-0.5">
                                <span className="text-xs text-rose-300">!</span>
                              </div>
                              <div>
                                <p className="text-[9px] font-black uppercase tracking-[0.15em] text-rose-300 mb-1">Motif du rejet</p>
                                <p className="text-sm text-rose-200 leading-relaxed">{article.rejection_reason}</p>
                              </div>
                            </div>
                          </div>
                        )}                      </div>
                    </div>

                    {/* Right Section: Actions */}
                    <div className="flex flex-col gap-3 md:ml-6 w-full md:w-auto">
                      {!isRejected && (
                        <button
                          onClick={() => copyToClipboard(getArticleBody(article) || '', article.id)}
                          className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-2xl text-[9px] font-black uppercase transition-all"
                        >
                          <Copy size={14} /> Copier
                        </button>
                      )}
                      {isRejected && effectiveFilter === 'rejected' && (
                        <button
                          onClick={() => openArticleEditor(article, false)}
                          className="flex items-center justify-center gap-2 px-6 py-3 bg-[#175a95] hover:bg-[#175a95]/90 text-white border border-[#175a95]/50 hover:border-[#175a95] rounded-2xl text-[9px] font-black uppercase transition-all shadow-lg"
                          title="Éditer et modifier cet article"
                        >
                          <Edit size={14} /> Éditer
                        </button>
                      )}
                      <button
                        onClick={() => setConfirmDialog({ isOpen: true, articleId: article.id, title: article.title })}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-transparent hover:bg-[#175a95]/10 text-slate-500 hover:text-[#175a95] border border-slate-700 hover:border-[#175a95] rounded-2xl text-[9px] font-black uppercase transition-all"
                        title="Archiver et retirer de la liste"
                      >
                        <Archive size={14} /> Archiver
                      </button>
                      {onHardDeleteArticle && (
                        <button
                          onClick={() => {
                            onHardDeleteArticle(article.id);
                            // Fermer la modale de détail si elle est ouverte pour cet article
                            if (selectedArticle?.id === article.id) {
                              setSelectedArticle(null);
                              setDetailMode(null);
                              setDetailSummary('');
                            }
                          }}
                          className="flex items-center justify-center gap-2 px-6 py-3 bg-rose-900/30 hover:bg-rose-700 text-rose-400 hover:text-white border border-rose-800 hover:border-rose-600 rounded-2xl text-[9px] font-black uppercase transition-all"
                          title="Supprimer définitivement"
                        >
                          <X size={14} /> Supprimer
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          if (currentTab === 'validation') {
            // Pour À VALIDER : seulement Cabinet voit les boutons Approuver/Rejeter
            return (
              <div key={article.id} className="relative bg-[#111827] dark:bg-[#0f172a] p-8 rounded-[2.5rem] border-l-[16px] border-l-amber-500 shadow-2xl flex flex-col animate-in slide-in-from-right overflow-hidden border border-slate-700/50">
                {/* Gradient overlay */}
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-amber-500/5 to-transparent"></div>
                
                <div className="relative z-10">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    {/* Left Section: Icon + Content */}
                    <div className="flex items-start gap-6 flex-1">
                      <div className="w-20 h-20 rounded-3xl flex items-center justify-center shrink-0 shadow-lg bg-amber-500/20 border border-amber-400/30">
                        <FileText size={40} className="text-amber-400" />
                      </div>

                      <div className="space-y-3 flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="inline-block px-3 py-1 text-[9px] font-black uppercase rounded-full tracking-widest font-mono bg-amber-500/30 text-amber-200 border border-amber-400/50 animate-pulse">
                            ⚠ URGENT • À VALIDER
                          </span>
                          <span className="text-[9px] text-slate-400 font-bold italic">Source : {article.source}</span>
                        </div>
                        <h4 className="text-xl font-black text-white leading-tight uppercase tracking-tighter">{article.title}</h4>
                        <div className="p-5 bg-slate-200/10 rounded-2xl border border-slate-400/20 mt-3">
                          <p className="text-sm text-slate-300 font-medium leading-relaxed italic">"{getArticleBody(article) ?? 'Contenu de l’article indisponible pour ce dossier.'}"</p>
                        </div>
                      </div>
                    </div>

                    {/* Right Section: Actions Cabinet */}
                    <div className="flex flex-col items-stretch gap-3 md:ml-6 w-full md:w-auto">
                      <button 
                        onClick={() => onValidateArticle?.(article.id, 'rejected')}
                        className="flex items-center justify-center gap-2 px-5 py-3 text-slate-400 hover:text-rose-400 border border-slate-600 hover:border-rose-400 rounded-2xl transition-all text-[9px] font-black uppercase"
                        title="Rejeter ce dossier"
                      >
                        <XCircle size={16} /> Rejeter
                      </button>

                      <button 
                        onClick={() => onValidateArticle?.(article.id, 'approved')}
                        className="flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl shadow-xl transition-all text-[9px] font-black uppercase"
                        title="Approuver ce dossier"
                      >
                        <CheckCircle size={16} /> Approuver
                      </button>

                      {/* Archiver */}
                      <button
                        onClick={() => setConfirmDialog({ isOpen: true, articleId: article.id, title: article.title })}
                        className="flex items-center justify-center gap-2 px-5 py-3 bg-transparent hover:bg-amber-900/30 text-slate-500 hover:text-amber-400 border border-slate-700 hover:border-amber-500 rounded-2xl text-[9px] font-black uppercase transition-all"
                        title="Archiver ce dossier"
                      >
                        <Trash2 size={14} /> Archiver
                      </button>

                      {/* Supprimer définitivement */}
                      {onHardDeleteArticle && (
                        <button
                          onClick={() => {
                            onHardDeleteArticle(article.id);
                            // Fermer la modale de détail si elle est ouverte pour cet article
                            if (selectedArticle?.id === article.id) {
                              setSelectedArticle(null);
                              setDetailMode(null);
                              setDetailSummary('');
                            }
                          }}
                          className="flex items-center justify-center gap-2 px-5 py-3 bg-rose-900/30 hover:bg-rose-700 text-rose-400 hover:text-white border border-rose-800 hover:border-rose-600 rounded-2xl text-[9px] font-black uppercase transition-all"
                          title="Supprimer définitivement"
                        >
                          <X size={14} /> Supprimer
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div key={article.id} className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 flex flex-col hover:shadow-2xl transition-all group">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-[#175a95] group-hover:bg-[#175a95] group-hover:text-white transition-all">
                    <Globe size={22} />
                  </div>
                  <div>
                    <span className="font-black text-[#175a95] text-[11px] uppercase tracking-tighter">{article.source}</span>
                    <div className="mt-1 inline-flex items-center gap-2">
                      <span className="text-[10px] text-slate-300 font-black tracking-widest uppercase">{article.date || "Avril 2026"}</span>
                      <span className={`text-[8px] font-black uppercase tracking-[0.3em] px-2 py-1 rounded-full ${isInternalArticle(article) ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {getSourceBadgeLabel(article)}
                      </span>
                    </div>
                  </div>
                </div>
                <button onClick={() => onArchiveArticle(article.id)} className="text-slate-100 hover:text-rose-500 transition-colors p-2">
                  <Trash2 size={18} />
                </button>
              </div>

              <h4 className="text-lg font-black text-slate-800 leading-tight mb-4 uppercase tracking-tighter">{article.title}</h4>

              <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-50 flex-1">
                <p className="text-[11px] text-slate-500 font-semibold italic leading-relaxed">"{getArticleBody(article) ?? 'Contenu de l’article indisponible pour ce dossier.'}"</p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <a href={article.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[10px] font-black text-[#175a95] uppercase tracking-widest hover:translate-x-1 transition-transform">
                   Lire l'actualité <ChevronRight size={14} />
                </a>
                <button
                  onClick={() => openArticleDetail(article)}
                  className="flex items-center justify-center gap-2 px-5 py-3 bg-[#175a95] text-white rounded-2xl text-[10px] font-black uppercase shadow-lg hover:bg-blue-800 transition-all"
                >
                  <ExternalLink size={16} /> Détails
                </button>
              </div>
            </div>
          );
        })}

        {selectedArticle && detailMode === 'detail' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 overflow-y-auto">
            <div className="w-full max-w-4xl rounded-[2rem] overflow-hidden bg-white dark:bg-[#0a0f1d] shadow-2xl border border-slate-200 dark:border-white/10 max-h-[90vh] flex flex-col my-auto">
              <div className="flex flex-col gap-3 p-6 border-b border-slate-200 dark:border-white/10 md:flex-row md:items-center md:justify-between sticky top-0 bg-white dark:bg-[#0a0f1d] z-10 shrink-0">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">
                    Dossier {selectedArticle.status === 'approved' || selectedArticle.status === 'published' ? 'validé' : selectedArticle.status === 'rejected' ? 'rejeté' : 'en validation'}
                  </p>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white">{selectedArticle.title}</h3>
                  <p className="text-[11px] text-slate-400 mt-2">{selectedArticle.source} • {selectedArticle.date}</p>
                  <span className={`inline-flex mt-2 items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full ${isInternalArticle(selectedArticle) ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    {getSourceBadgeLabel(selectedArticle)}
                  </span>
                </div>
                <button
                  onClick={() => { setSelectedArticle(null); setDetailSummary(''); setDetailMode(null); }}
                  className="flex items-center justify-center gap-2 px-5 py-3 bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 rounded-2xl font-black text-[10px] uppercase tracking-wider transition-all border border-slate-200 hover:border-rose-200 shadow-sm"
                  title="Fermer"
                >
                  <X size={16} /> Fermer
                </button>
              </div>
              <div className="p-8 space-y-8 overflow-y-auto flex-1">
                <div className="rounded-[2rem] bg-slate-50 dark:bg-[#111827] p-8 border border-slate-100 dark:border-white/10">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <h4 className="text-base font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white mb-2">Résumé IA essentiel</h4>
                      <p className="text-[11px] text-slate-500 uppercase tracking-[0.25em]">Comprendre vite l’essentiel de l’article</p>
                    </div>
                    {isSummarizing ? (
                      <span className="inline-flex items-center gap-2 rounded-full bg-[#175a95] px-4 py-2 text-white text-[11px] font-black uppercase tracking-[0.2em] shadow-lg">
                        <span className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse" /> Génération IA en cours...
                      </span>
                    ) : null}
                  </div>

                  {summaryError ? (
                    <div className="mt-6 rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
                      {summaryError}
                    </div>
                  ) : (
                    <p className="mt-6 text-sm leading-relaxed text-slate-700 dark:text-slate-200 whitespace-pre-line">
                      {detailSummary || 'Le résumé IA est en cours de génération. Merci de patienter...'}
                    </p>
                  )}
                </div>


                {getCabinetFeedback(selectedArticle) && (
                  <div className="rounded-[2rem] bg-amber-50 dark:bg-[#202a3a] p-8 border border-amber-200 dark:border-amber-500/20">
                    <h4 className="text-base font-black uppercase tracking-[0.2em] text-amber-700 dark:text-amber-300 mb-4">Instruction Cabinet</h4>
                    <p className="text-sm text-amber-700 dark:text-amber-300 leading-relaxed whitespace-pre-line">
                      {getCabinetFeedback(selectedArticle)}
                    </p>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 justify-end">
                  <button
                    onClick={() => window.open(selectedArticle.url, '_blank', 'noopener')}
                    className="flex items-center justify-center gap-2 px-6 py-4 bg-slate-900 text-white rounded-3xl font-black uppercase text-[10px] shadow-xl hover:bg-slate-700 transition-all"
                  >
                    <ExternalLink size={18} /> Ouvrir sur le site
                  </button>
                  <button
                    onClick={() => { copyToClipboard(getArticleBody(selectedArticle) || '', selectedArticle.id); }}
                    className="flex items-center justify-center gap-2 px-6 py-4 bg-[#175a95] text-white rounded-3xl font-black uppercase text-[10px] shadow-xl hover:bg-blue-800 transition-all"
                  >
                    <Copy size={18} /> Copier le texte
                  </button>
                  <button
                    onClick={() => openArticleEditor(selectedArticle, false, detailSummary || getArticleBody(selectedArticle) || '')}
                    className="flex items-center justify-center gap-2 px-6 py-4 bg-emerald-500 text-white rounded-3xl font-black uppercase text-[10px] shadow-xl hover:bg-emerald-600 transition-all"
                  >
                    <FileText size={18} /> Modifier
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedArticle && detailMode === 'edit' && (
          <EditorialEditorModal
            isOpen={detailMode === 'edit'}
            onClose={() => {
              setSelectedArticle(null);
              setDetailMode(null);
              setEditorResults({});
            }}
            title={editorTitle}
            results={editorResults}
            onSave={handleSaveRevision}
            rejectionReason={selectedArticle?.rejection_reason}
          />
        )}
      </div>

      {/* État vide magnifique */}
      {filteredArticles.length === 0 && (
        <div className="py-32 text-center bg-white rounded-[3rem] border-4 border-dashed border-slate-50">
          <RefreshCw size={48} className={`mx-auto text-slate-100 mb-4 opacity-20 ${isSyncing ? 'animate-spin' : ''}`} />
          <p className="text-slate-300 font-black uppercase text-[10px] tracking-[0.4em]">En attente de synchronisation...</p>
        </div>
      )}

      {/* ═══ DIALOG DE CONFIRMATION ARCHIVAGE (Custom centré) ═══ */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-[#0f172a] rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 pb-4">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center shrink-0">
                  <Trash2 size={24} className="text-rose-500" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">Archiver ce dossier ?</h3>
                  <p className="text-[10px] text-slate-500 mt-1">Action irréversible</p>
                </div>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10">
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
                  "{confirmDialog.title}"
                </p>
                <p className="text-[10px] text-slate-400 mt-2">Ce dossier sera archivé et retiré de la revue presse. Il pourra être restauré depuis les archives.</p>
              </div>
            </div>
            <div className="p-6 pt-4 flex gap-3">
              <button
                onClick={() => setConfirmDialog({ isOpen: false, articleId: '', title: '' })}
                className="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-wider bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-all"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  onArchiveArticle(confirmDialog.articleId);
                  setConfirmDialog({ isOpen: false, articleId: '', title: '' });
                  // Fermer la modale de détail après archivage
                  setSelectedArticle(null);
                  setDetailMode(null);
                  setDetailSummary('');
                }}
                className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-[10px] uppercase tracking-wider bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/20 transition-all"
              >
                <Trash2 size={14} /> Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
