/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ModelsView } from './components/agenda/ModelsView';
import { 
  Settings, 
  Search, 
  PlusCircle,
  Menu,
  Sparkles, 
  CheckCircle,
  CheckCircle2,
  XCircle,
  Info,
  Clock
} from 'lucide-react';
import { ContactsView } from './components/contacts/ContactsView';
import { supabase } from './lib/supabaseClient';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import confetti from 'canvas-confetti';
import { CabinetDecisionModal } from './components/press/CabinetDecisionModal';
import { PublicationSidebar } from './components/press/PublicationSidebar';

// --- Layout & Composants ---
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardView } from './components/agenda/DashboardView';
import { CalendarView } from './components/agenda/CalendarView';
import { TemplatesView } from './components/agenda/TemplatesView';
import { TemplateConfigModal } from './components/agenda/TemplateConfigModal';
import { InterviewModal } from './components/agenda/InterviewModal';
import { AgendaUploader } from './components/agenda/AgendaUploader';
import { ActivityDetailSidebar } from './components/agenda/ActivityDetailSidebar';
import { AddAgendaActivitiesModal } from './components/agenda/AddAgendaActivitiesModal';
import { ArchivesView } from './components/agenda/ArchivesView';
import { HistoryView } from './components/agenda/HistoryView';
import { ConfigurationView } from './components/agenda/ConfigurationView';
import { MaintenancePage } from './components/maintenance/MaintenancePage';

import { EditorialEditorModal } from './components/agenda/EditorialEditorModal';
import { PressReviewView } from './components/agenda/PressReviewView';
import { PressView } from './components/press/PressView';
import LoginForm from './components/auth/LoginForm';
import SignupForm from './components/auth/SignupForm';
import { UserProfileModal } from './components/auth/UserProfileModal';
import { NotificationContainer } from './components/ui/NotificationContainer';
import { AddPressArticleModal } from './components/press/AddPressArticleModal';

// --- Services & Utils ---
import { exportHistoryToCSV } from './utils/csvExport';
import { generateEditorialContent, generateWebsiteArticleFromInterview } from './services/aiService';
import { useAuth } from './hooks/useSupabaseAuth';
import { hasSupabaseConfig } from './lib/supabaseClient';

// --- Types & Constantes ---
import { 
  EditorialActivity, 
  ActivityType, 
  EditorialCategory, 
  ActivityStatus, 
  WorkflowStatus,
  CommTemplate,
  CommunicationChannel,
  PressArticle,
  HistoryEntry
} from './types';
import { COMM_TEMPLATES } from './constants';

export default function App() {
  // --- États UI et Navigation ---
  const [activeTab, setActiveTab] = useState<'dashboard' | 'calendar' | 'templates' | 'history' | 'configuration' | 'archive' | 'review' | 'press' | 'contacts'>('dashboard');
  const [pressSubTab, setPressSubTab] = useState<'veille' | 'validation'>('veille');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [messageQueue, setMessageQueue] = useState<string[]>([]);
  const [currentMessage, setCurrentMessage] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(
  localStorage.getItem('theme') as 'light' | 'dark' || 'light'
  );
  const [aiTone, setAiTone] = useState<'diplomatic' | 'direct' | 'creative'>(() => {
    return (localStorage.getItem('aiTone') as 'diplomatic' | 'direct' | 'creative') || 'diplomatic';
  });

  useEffect(() => {
    localStorage.setItem('aiTone', aiTone);
  }, [aiTone]);

  // --- États Éditeur IA ---
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorContent, setEditorContent] = useState("");
  const [editorPlatform, setEditorPlatform] = useState("");
  const [editorTitle, setEditorTitle] = useState("");

  // --- États Données (Synchronisés avec Supabase) ---
  const [activities, setActivities] = useState<EditorialActivity[]>([]);
  const [pressArticles, setPressArticles] = useState<PressArticle[]>([]);
  const [isPressModalOpen, setIsPressModalOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<EditorialActivity | null>(null);
  const [showAddAgendaActivityModal, setShowAddAgendaActivityModal] = useState(false);
  const [publications, setPublications] = useState<any[]>([]);
  const [pubCount, setPubCount] = useState(0);
  const [selectedPub, setSelectedPub] = useState<any>(null);
  const [isPubSidebarOpen, setIsPubSidebarOpen] = useState(false);
  const [allProfiles, setAllProfiles] = useState<any[]>([]);

  // --- États Interview Modal pour Templates ---
  const [isInterviewModalOpen, setIsInterviewModalOpen] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState<{ template: CommTemplate; platform: string } | null>(null);
  const [interviewResponses, setInterviewResponses] = useState<Record<string, string>>({});
  const [pressHistoryEntries, setPressHistoryEntries] = useState<HistoryEntry[]>([]);
  const [pressInitialTab, setPressInitialTab] = useState<'veille' | 'validation'>(() => {
    return (localStorage.getItem('pressInitialTab') as 'veille' | 'validation') || 'veille';
  });
  const [pressValidationFilter, setPressValidationFilter] = useState<'pending' | 'approved' | 'rejected'>(() => {
    return (localStorage.getItem('pressValidationFilter') as 'pending' | 'approved' | 'rejected') || 'pending';
  });

  // --- État pour la date sélectionnée au calendrier ---
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);

  // --- États pour tracker l'utilisateur qui a cliqué (animation visible uniquement pour lui) ---
  const [userWhoClickedActivityId, setUserWhoClickedActivityId] = useState<string | null>(null);
  const [clickedActivityUserRole, setClickedActivityUserRole] = useState<string | null>(null);

  // --- État Tabs Modèles de Communication ---
  const [templatesTab, setTemplatesTab] = useState<'models' | 'library'>('models');

  const normalizeStatus = (status?: string) => status?.toString().trim().toLowerCase() || '';
  const isInternalPressArticle = (article: PressArticle) =>
    article.source?.trim().toUpperCase() === 'PRODUCTION INTERNE';

  // 🔧 FILTRE : Compteurs d'articles de presse filtrés par mois courant
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  const currentMonthPressArticles = pressArticles.filter(a => {
    if (!a.created_at) return false;
    const articleDate = new Date(a.created_at);
    return articleDate.getMonth() === currentMonth && articleDate.getFullYear() === currentYear;
  });

  const internalPendingPressCount = currentMonthPressArticles.filter(a =>
    normalizeStatus(a.status) === 'pending_validation' && isInternalPressArticle(a)
  ).length;

  const approvedPressCount = currentMonthPressArticles.filter(a =>
    ['published', 'approved'].includes(normalizeStatus(a.status)) && isInternalPressArticle(a)
  ).length;

  const [historyInitialMode, setHistoryInitialMode] = useState<'journal' | 'bilan'>('bilan');
  const [archiveInitialFilter, setArchiveInitialFilter] = useState<'cabinet' | 'presse'>('cabinet');
  const [archiveRecentCabinetActivities, setArchiveRecentCabinetActivities] = useState<EditorialActivity[] | null>(null);
  const [maintenanceMode, setMaintenanceMode] = useState<{ active: boolean; activatedBy?: string }>({ active: false });

  const latestAgendaDate = React.useMemo(() => {
    const dates = activities
      .map(a => new Date(a.created_at || a.date || 0))
      .filter(d => !isNaN(d.getTime()));
    if (dates.length === 0) return null;
    const latest = new Date(Math.max(...dates.map(d => d.getTime())));
    return latest.toISOString().split('T')[0];
  }, [activities]);

  useEffect(() => {
    localStorage.setItem('pressInitialTab', pressInitialTab);
  }, [pressInitialTab]);

  useEffect(() => {
    localStorage.setItem('pressValidationFilter', pressValidationFilter);
  }, [pressValidationFilter]);

  // --- Authentification ---
  const { user, profile, loading: authLoading, profileLoading, error: authError, signOut, retryAuth } = useAuth();
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // --- CHARGEMENT AUTOMATIQUE AU DÉMARRAGE ---
  useEffect(() => {
    if (user && hasSupabaseConfig) {
      loadAllData();
    }
  }, [user]);

  // --- Réinitialiser l'animation quand on quitte le calendrier ---
  useEffect(() => {
    if (activeTab !== 'calendar') {
      setUserWhoClickedActivityId(null);
      setClickedActivityUserRole(null);
    }
  }, [activeTab]);

  // --- ÉCOUTE DU MODE MAINTENANCE (Supabase Realtime Broadcast) ---
  useEffect(() => {
    const channel = supabase
      .channel('app-control')
      .on('broadcast', { event: 'maintenance' }, ({ payload }) => {
        setMaintenanceMode({ active: payload.active, activatedBy: payload.activatedBy });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  localStorage.setItem('theme', theme);
}, [theme]);

const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

const [decisionModal, setDecisionModal] = useState<{isOpen: boolean, articleId: string, title: string}>({
  isOpen: false, articleId: '', title: ''
});

const loadAllData = useCallback(async () => {
  // Guard clause: si pas d'utilisateur, ne rien charger
  if (!user || !hasSupabaseConfig) {
    return;
  }

  try {
    // 1. Récupération des activités de l'agenda
    const { data: acts, error: actsError } = await supabase
      .from('activities')
      .select('*')
      .order('created_at', { ascending: false });

    if (actsError) throw actsError;
    
    if (acts) {
      // ✅ Désérialiser les colonnes JSONB qui ont été sérialisées en strings
      const deserializedActs = acts.map((act: any) => ({
        ...act,
        channels: typeof act.channels === 'string' ? JSON.parse(act.channels || '[]') : (act.channels || []),
        comments: typeof act.comments === 'string' ? JSON.parse(act.comments || '[]') : (act.comments || []),
        interview_questions: typeof act.interview_questions === 'string' ? JSON.parse(act.interview_questions || '[]') : (act.interview_questions || []),
        history: typeof act.history === 'string' ? JSON.parse(act.history || '[]') : (act.history || []),
      }));
      setActivities(deserializedActs);
    }

    // 2. RÉCUPÉRATION DE LA REVUE DE PRESSE (Pour la cloche du Cabinet)
   const { data: pubs, error: pubsError } = await supabase
      .from('social_publications')
      .select('*')
      .order('published_at', { ascending: false });

    if (!pubsError && pubs) {
      setPublications(pubs);
      // 🔧 FILTRE : Compter UNIQUEMENT les publications du mois courant (conforme à la requête utilisateur)
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      const currentMonthPubs = pubs.filter(p => {
        if (!p.published_at) return false;
        const pubDate = new Date(p.published_at);
        return pubDate.getMonth() === currentMonth && pubDate.getFullYear() === currentYear;
      });
      
      const uniqueUrlCount = new Set(currentMonthPubs.map(p => p.url)).size;
      setPubCount(uniqueUrlCount);
    }

    // 3. CHARGEMENT DES ARTICLES DE VEILLE PUBLIQUE
    const { data: pressData, error: pressError } = await supabase
      .from('press_review')
      .select('*')
      .order('created_at', { ascending: false });

    if (pressError) throw pressError;
    if (pressData) {
      setPressArticles(pressData);

      const hasPublishedExternal = pressData.some(a => (a.status === 'published' || a.status === 'approved') && a.source !== 'PRODUCTION INTERNE');
      const hasInternalOrPending = pressData.some(a => a.status === 'pending_validation' || a.status === 'rejected' || a.source === 'PRODUCTION INTERNE');
      if (!hasPublishedExternal && hasInternalOrPending) {
        setPressInitialTab('validation');
      }
    }

    // 4. CHARGEMENT DE TOUS LES PROFILS (POUR AVATARS)
    const { data: profilesData } = await supabase.from('profiles').select('*');
    if (profilesData) {
      setAllProfiles(profilesData);
    }
  } catch (err) {
    // Silencieusement gérer les erreurs si l'utilisateur est maintenant déconnecté
    if (!user) {
      console.log("Utilisateur déconnecté, abandon du chargement des données.");
      return;
    }
    console.error("Erreur globale:", err);
  }
}, [user, hasSupabaseConfig]);

useEffect(() => {
  if (user && hasSupabaseConfig) {
    // Charger les données immédiatement après la connexion
    loadAllData();
  }
}, [user, hasSupabaseConfig, loadAllData]); // Enlever activeTab de la dépendance pour éviter les rechargements inutiles

// --- TEMPS RÉEL : Mise à jour automatique des compteurs en temps réel ---
useEffect(() => {
  if (!user || !hasSupabaseConfig) return;

  // Variable pour tracker si le component est monté (évite les fuites mémoire)
  let isMounted = true;
  const channels: any[] = [];

  // Attendre un tick React avant de créer les listeners
  // Cela évite les race conditions lors de la connexion
  const timeoutId = setTimeout(() => {
    // Vérifier que le component est toujours monté et que user existe toujours
    if (!isMounted || !user) return;

    try {
      // 1. Écoute les changements sur les activités
      const activitiesChannel = supabase
        .channel('realtime_activities_auto')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'activities' },
          (payload) => {
            console.log("📊 Changement détecté dans les activités", payload.eventType);
            if (isMounted) loadAllData();
          }
        )
        .subscribe();

      channels.push(activitiesChannel);

      // 2. Écoute les changements sur les articles de presse
      const pressChannel = supabase
        .channel('realtime_press_auto')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'press_review' },
          (payload) => {
            console.log("📰 Changement détecté dans la presse", payload.eventType);
            if (isMounted) loadAllData();
          }
        )
        .subscribe();

      channels.push(pressChannel);

      // 3. Écoute les changements sur les publications sociales
      const pubChannel = supabase
        .channel('realtime_pub_auto')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'social_publications' },
          (payload) => {
            console.log("📱 Changement détecté dans les publications", payload.eventType);
            if (isMounted) loadAllData();
          }
        )
        .subscribe();

      channels.push(pubChannel);
    } catch (e) {
      console.error("Erreur lors de la création des listeners realtime:", e);
    }
  }, 100);

  // Cleanup : fermer les channels et le timeout
  return () => {
    isMounted = false;
    clearTimeout(timeoutId);
    
    // Nettoyer les channels proprement
    channels.forEach(channel => {
      try {
        supabase.removeChannel(channel);
      } catch (e) {
        console.warn("Erreur lors du nettoyage du channel:", e);
      }
    });
  };
}, [user, hasSupabaseConfig, loadAllData]);

const addPressHistoryEntry = (entry: HistoryEntry) => {
  setPressHistoryEntries(prev => [entry, ...prev]);
};

const mergedHistoryEntries = useMemo(() => {
  return [...pressHistoryEntries, ...activities.flatMap(a => (a.history || []).map(h => ({ ...h, activityType: a.type })))]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}, [activities, pressHistoryEntries]);

const openPubDetails = (pub: any) => {
  setSelectedPub(pub);
  setIsPubSidebarOpen(true);
};

const [isGenerating, setIsGenerating] = useState(false);
const [multiPlatformResults, setMultiPlatformResults] = useState<Record<string, string>>({});

  const showUpdateMessage = (message: string) => {
    setMessageQueue((prevQueue) => [...prevQueue, message]);
  };

  const getMessageType = (message: string) => {
    if (message.startsWith('✅')) return 'success';
    if (message.startsWith('❌')) return 'error';
    if (message.startsWith('⚠️') || message.startsWith('ℹ️')) return 'warning';
    return 'info';
  };

  const getMessageStyle = (message: string) => {
    const type = getMessageType(message);
    if (type === 'success') return 'bg-emerald-600 border-emerald-400 text-white';
    if (type === 'error') return 'bg-rose-600 border-rose-400 text-white';
    if (type === 'warning') return 'bg-amber-500 border-amber-300 text-slate-900';
    return 'bg-slate-900 border-slate-700 text-white';
  };

  const getMessageIcon = (message: string) => {
    const type = getMessageType(message);
    if (type === 'success') return <CheckCircle2 className="text-white" size={32} />;
    if (type === 'error') return <XCircle className="text-white" size={32} />;
    if (type === 'warning') return <Clock className="text-slate-900" size={32} />;
    return <Info className="text-white" size={32} />;
  };

  const isCenteredMessage = (message: string) => {
    return message.includes('Synchronisation validée');
  };

  useEffect(() => {
    if (!currentMessage && messageQueue.length > 0) {
      setCurrentMessage(messageQueue[0]);
      setMessageQueue((prevQueue) => prevQueue.slice(1));
    }
  }, [messageQueue, currentMessage]);

  useEffect(() => {
    if (!currentMessage) return;
    const timeout = window.setTimeout(() => setCurrentMessage(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [currentMessage]);

  // --- GESTION PERSISTANTE DE LA PRESSE (INSERTION SUPABASE) ---
 const handleAddPressArticle = async (newArt: Omit<PressArticle, 'id'>) => {
  try {
    showUpdateMessage("⏳ Enregistrement de la veille...");

    const { data, error } = await supabase
      .from('press_review')
      .insert([{ ...newArt, created_at: newArt.created_at || new Date().toISOString() }])
      .select('*');

    if (error) throw error;

    if (data && data[0]) {
      setPressArticles(prev => {
        const exists = prev.some(a => a.id === data[0].id || a.url === data[0].url);
        if (exists) return prev;
        return [data[0], ...prev];
      });
      await loadAllData();
      setActiveTab('press');
      setPressInitialTab('veille');
      showUpdateMessage("✅ Veille enregistrée !");
    }
  } catch (err) {
    console.error("Erreur:", err);
    showUpdateMessage("❌ Erreur lors de l'enregistrement de la veille.");
  }
};

const handleGenerateAllSelected = async () => {
  if (!selectedActivity || !selectedActivity.channels || selectedActivity.channels.length === 0) {
    showUpdateMessage("⚠️ Sélectionnez au moins un canal (Facebook, Web...)");
    return;
  }

  setIsGenerating(true);
  showUpdateMessage(`⏳ Génération de ${selectedActivity.channels.length} contenus en cours...`);

  try {
    const results: Record<string, string> = {};
    
    // Génération parallèle via Groq
    await Promise.all(selectedActivity.channels.map(async (p) => {
      const content = await generateEditorialContent(
        selectedActivity.description || "",
        (selectedActivity as any).title || (selectedActivity as any).Activités,
        p
      );
      results[p] = content;
     }));
    
      // On récupère le texte du premier canal pour l'aperçu dans la Sidebar
     const mainContent = results[selectedActivity.channels[0]] || "";

     // On met à jour l'activité sélectionnée avec ce contenu
     const updatedActivity = { ...selectedActivity, commContent: mainContent };
     setSelectedActivity(updatedActivity);
     handleUpdateActivity(updatedActivity); // Sauvegarde automatique dans Supabase
     setMultiPlatformResults(results);
     // On prend le premier résultat pour l'afficher par défaut dans la modal
     const firstPlatform = selectedActivity.channels[0];
    setEditorContent(results[firstPlatform]);
    setEditorPlatform(firstPlatform);
    setIsEditorOpen(true);
    
    showUpdateMessage("✅ Tous les contenus (YouTube inclus) sont prêts !");
  } catch (error) {
    console.error(error);
    showUpdateMessage("❌ Erreur lors de la génération groupée.");
  } finally {
    setIsGenerating(false);
  }
};

const getReferenceStyle = (type: string) => {
  if (type.includes("CNT")) return "TON SOLENNEL CNT : Mentionner l'examen budgétaire, la transparence et la souveraineté financière.";
  if (type.includes("LFI")) return "TON TECHNIQUE LFI : Focus sur les crédits alloués, la discipline fiscale et les performances du Ministère.";
  if (type.includes("Audience")) return "TON PROTOCOLAIRE : Mettre en avant le renforcement de la coopération et les objectifs de la visite.";
  return "TON PRESTIGE GÉNÉRAL : Style solennel Cabinet Ministériel MEFB.";
};

const generatePressPDF = async (validatedArticles: PressArticle[]) => {
  const doc = new jsPDF();
  const dateStr = new Date().toLocaleDateString('fr-FR');

  try {
    // 1. AJOUT DU LOGO (Optionnel mais recommandé)
    // On peut charger l'image depuis le dossier public
    // const logoImg = "/branding/logo.png"; 
   // doc.addImage(logoImg, 'PNG', 85, 10, 40, 40);// Centré en haut

    // 2. TEXTES OFFICIELS (Décalés vers le bas pour laisser place au logo)
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("RÉPUBLIQUE DE GUINÉE", 105, 55, { align: "center" });
    
    doc.setFontSize(8);
    doc.text("Travail - Justice - Solidarité", 105, 60, { align: "center" });
    
    doc.setFontSize(9);
    doc.setTextColor(23, 90, 149); // Ton bleu #175a95
    doc.text("MINISTÈRE DE L'ÉCONOMIE, DES FINANCES ET DU BUDGET", 105, 70, { align: "center" });
    
    doc.setDrawColor(20, 147, 8); // Ton vert #149308
    doc.line(20, 75, 190, 75);

    // 3. TITRE DU RAPPORT
    doc.setFontSize(16);
    doc.text(`SYNTHÈSE DE LA REVUE DE PRESSE`, 20, 90);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Édition du : ${dateStr}`, 20, 98);

    // 4. TABLEAU DES ARTICLES (Format Pro)
    const tableRows = validatedArticles.map(art => [
      art.date || '-',
      art.source.toUpperCase(),
      art.title,
      art.summary.substring(0, 120) + '...'
    ]);

    // Au lieu de (doc as any).autoTable({ ... })
     autoTable(doc, {
      startY: 105,
      head: [['DATE', 'SOURCE', 'TITRE DU DOSSIER', 'RÉSUMÉ ANALYTIQUE']],
      body: tableRows,
      headStyles: { 
      fillColor: [23, 90, 149], 
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold',
      halign: 'center'
      },
      columnStyles: {
   0: { cellWidth: 25 },
   1: { cellWidth: 30 }, // Plus besoin de fontStyle ici si c'est déjà en haut
   2: { cellWidth: 65 },
   3: { cellWidth: 60 }
      },
      alternateRowStyles: { fillColor: [245, 247, 250] }
    });

    // 5. PIED DE PAGE & SIGNATURE
    const finalY = (doc as any).lastAutoTable.finalY + 30;
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text("Cachet et Signature du Cabinet", 130, finalY);
    
    // Numérotation des pages
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(`Page ${i} sur ${pageCount} - Document généré par le Portail Éditorial MEFB`, 105, 285, { align: "center" });
    }
    
    const validator = validatedArticles[0]?.validated_by || "Le Cabinet";
     doc.setFontSize(10);
     doc.text(`Document certifié conforme par : ${validator}`, 130, finalY + 10);
    
    // TÉLÉCHARGEMENT AUTOMATIQUE
    doc.save(`Revue_Presse_MEFB_${dateStr.replace(/\//g, '-')}.pdf`);
    
  } catch (error) {
    console.error("Erreur PDF:", error);
    showUpdateMessage("❌ Erreur lors de la création du PDF officiel");
  }
};

const fireValidationConfetti = () => {
  const colors = ['#ce1126', '#fcd116', '#009460'];
  confetti({
    particleCount: 150,
    spread: 70,
    origin: { y: 0.6 },
    colors: colors,
    zIndex: 10000, // ← Toujours au-dessus de tout
  });
};

// --- GESTION DE LA VALIDATION DU CABINET (VERSION ALLÉGÉE POUR DÉBLOCAGE) ---
// --- GESTION DE LA VALIDATION DU CABINET (VERSION FINALE : SUPABASE + CONFETTI + PDF) ---
const handleValidatePressArticle = async (id: string, status: 'approved' | 'rejected') => {
  try {
    const newStatus = status === 'approved' ? 'published' : 'rejected';
    
    showUpdateMessage("⏳ Synchronisation avec le Cabinet...");

    // 1. Mise à jour dans Supabase (Statut + Traçabilité)
    const { error } = await supabase
      .from('press_review')
      .update({ 
        status: newStatus,
        validated_by: profile?.full_name || 'Direction du Cabinet', 
        validation_date: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      console.error("Détails de l'erreur Supabase:", error);
      throw error;
    }

    // 2. Mise à jour de l'état local pour une fluidité immédiate
    setPressArticles(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
    
    if (status === 'approved') {
      // --- EFFETS DE RÉUSSITE CABINET ---
      
      // A. Message de succès
      showUpdateMessage("✅ Dossier Officiellement Validé !");
      
      // B. Lancement des confettis nationaux (Rouge-Jaune-Vert)
      fireValidationConfetti();
      
      // C. Lancement du PDF (On cherche l'article actuel pour la synthèse)
      const currentArt = pressArticles.find(a => a.id === id);
      if (currentArt) {
        generatePressPDF([currentArt]); 
      }
    } else {
      showUpdateMessage("❌ Dossier rejeté.");
    }

    // 3. Rafraîchissement global des indicateurs du Dashboard
    loadAllData();
    
  } catch (err) {
    console.error("Erreur technique de validation:", err);
    showUpdateMessage("❌ Erreur de communication avec la base de données.");
  }
};

const handleQuickValidation = async (activityId: string) => {
  const { error } = await supabase
    .from('activities')
    .update({ 
      workflow: 'Validé', 
      validation_status: 'Validé',
      validation_date: new Date().toISOString() 
    })
    .eq('id', activityId);

  if (!error) {
    showUpdateMessage("✅ Activité confirmée par le Cabinet !");
    // Recharger les données pour mettre à jour l'indicateur
    loadAllData(); 
  }
};

// 1. La fonction corrigée (Vérifie le nom de ta fonction de chargement, ici j'utilise loadAllData)
const handleCabinetDecision = async (id: string, decision: 'approved' | 'rejected') => {
  const article = pressArticles.find(a => a.id === id);
  
  if (decision === 'rejected') {
    // On ouvre notre nouvelle modale au lieu du prompt
    setDecisionModal({ isOpen: true, articleId: id, title: article?.title || "" });
    return; // On s'arrête ici, la confirmation se fera via la modale
  }

  // Si validé directement :
  executeCabinetDecision(id, 'approved', "Validé pour publication immédiate.");
};

// Nouvelle fonction d'exécution pour éviter les doublons de code
const executeCabinetDecision = async (id: string, decision: 'approved' | 'rejected', feedback: string) => {
  // FIX: utilise le bon statut selon la décision (jamais 'archived' systématiquement)
  const newStatus = decision === 'approved' ? 'approved' : 'rejected';
  
  const updatePayload: any = {
    status: newStatus,
    validated_by: profile?.full_name || 'Cabinet',
    validation_date: new Date().toISOString(),
    ...(decision === 'rejected' && feedback ? { cabinet_feedback: feedback, rejection_reason: feedback } : {})
  };

  const { error, data } = await supabase
    .from('press_review')
    .update(updatePayload)
    .eq('id', id)
    .select('*')
    .single();

  if (!error && data) {
    const entry: HistoryEntry = {
      id: `${id}-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: profile?.full_name || profile?.role || 'Cabinet',
      action: decision === 'approved' ? 'Publication validée' : 'Article rejeté',
      details: decision === 'approved'
        ? `Le dossier "${data.title}" a été validé par le Cabinet.`
        : `Le dossier "${data.title}" a été rejeté par le Cabinet avec recommandations : ${feedback}`
    };

    addPressHistoryEntry(entry);
    // FIX: on met à jour le statut local au lieu de supprimer l'article de la liste
    setPressArticles(prev => prev.map(a => a.id === id ? { ...a, status: newStatus, validated_by: updatePayload.validated_by, validation_date: updatePayload.validation_date } : a));
    setActiveTab('press');
    setPressInitialTab('validation');
    // Redirige vers le filtre correspondant pour voir le résultat immédiatement
    setPressValidationFilter(decision === 'approved' ? 'approved' : 'rejected');

    if (decision === 'approved') {
      showUpdateMessage("✅ Dossier validé par le Cabinet !");
      fireValidationConfetti();
    } else {
      showUpdateMessage("📩 Dossier rejeté et renvoyé au service Communication.");
    }

    setDecisionModal({ ...decisionModal, isOpen: false });
    loadAllData();
  } else if (error) {
    console.error("Erreur de validation :", error);
    showUpdateMessage("❌ Erreur de communication avec la base de données.");
  }
};

const handleDeletePress = async (id: string) => {
  const { error } = await supabase.from('press_review').delete().eq('id', id);
  if (!error) {
    setPressArticles(prev => prev.filter(a => a.id !== id));
    await loadAllData();
    showUpdateMessage("🗑️ Article définitivement supprimé");
  } else {
    showUpdateMessage("❌ Erreur lors de la suppression");
  }
};

const handleArchivePressArticle = async (id: string) => {
  try {
    showUpdateMessage("⏳ Archivage du dossier Presse...");

    const { error } = await supabase
      .from('press_review')
      .update({ 
        status: 'archived', // C'est ce statut qui déclenche l'apparition dans l'onglet Archives
        validation_date: new Date().toISOString() 
      })
      .eq('id', id);

    if (error) throw error;

    // Mise à jour de l'état local pour refléter le changement immédiatement
    setPressArticles(prev => 
      prev.map(a => a.id === id ? { ...a, status: 'archived' } : a)
    );

    showUpdateMessage("📦 Dossier transféré aux Archives Nationales");
    
    // TRÈS IMPORTANT : Recharger les données pour que la vue Archive soit à jour
    await loadAllData();

  } catch (err) {
    console.error("Erreur archivage:", err);
    showUpdateMessage("❌ Erreur lors du transfert aux archives.");
  }
};

const handleRestorePressArticle = async (id: string) => {
  const { error, data } = await supabase
    .from('press_review')
    .update({ status: 'pending_validation', validation_date: null, validated_by: null })
    .eq('id', id)
    .select('*')
    .single();

  if (!error && data) {
    setPressArticles(prev => prev.map(a => a.id === id ? { ...a, status: 'pending_validation', validation_date: null, validated_by: null } : a));
    showUpdateMessage("Dossier presse restauré pour nouvelle validation");
    loadAllData();
  } else {
    console.error("Erreur restauration archive presse:", error);
    showUpdateMessage("Erreur lors de la restauration du dossier presse");
  }
};

// --- 🗑️ SUPPRESSION DE TOUS LES BROUILLONS ---
const handleDeleteAllDrafts = async () => {
  try {
    // Récupérer tous les brouillons
    const drafts = activities.filter(a => !a.workflow || a.workflow === 'Brouillon');
    
    if (drafts.length === 0) {
      showUpdateMessage("Aucun brouillon à supprimer.");
      return;
    }

    const draftIds = drafts.map(d => d.id);

    // Supprimer tous les brouillons de la BD
    const { error } = await supabase
      .from('activities')
      .delete()
      .in('id', draftIds);

    if (error) {
      console.error("Erreur suppression brouillons:", error);
      showUpdateMessage("❌ Erreur lors de la suppression des brouillons.");
      return;
    }

    // Mettre à jour l'état local
    setActivities(prev => prev.filter(a => !draftIds.includes(a.id)));
    showUpdateMessage(`✅ ${drafts.length} brouillon${drafts.length > 1 ? 's' : ''} supprimé${drafts.length > 1 ? 's' : ''} avec succès.`);
    
    // Recharger les données
    await loadAllData();
  } catch (err) {
    console.error("Erreur:", err);
    showUpdateMessage("❌ Erreur technique lors de la suppression.");
  }
};

// --- GESTION PERSISTANTE DE L'AGENDA (UPDATE SUPABASE) ---
  const handleUpdateActivity = async (updated: EditorialActivity) => {
    // ✅ Sérialiser les colonnes JSONB avant l'envoi à Supabase
    const preparedUpdate = {
      ...updated,
      channels: JSON.stringify(updated.channels || []),
      comments: JSON.stringify(updated.comments || []),
      interview_questions: JSON.stringify(updated.interview_questions || []),
      history: JSON.stringify(updated.history || []),
    };

    const { data, error } = await supabase
      .from('activities')
      .update(preparedUpdate)
      .eq('id', updated.id)
      .select()
      .single();

    if (!error && data) {
      // ✅ Désérialiser les colonnes JSONB après réception
      const deserializedData = {
        ...data,
        channels: typeof data.channels === 'string' ? JSON.parse(data.channels || '[]') : (data.channels || []),
        comments: typeof data.comments === 'string' ? JSON.parse(data.comments || '[]') : (data.comments || []),
        interview_questions: typeof data.interview_questions === 'string' ? JSON.parse(data.interview_questions || '[]') : (data.interview_questions || []),
        history: typeof data.history === 'string' ? JSON.parse(data.history || '[]') : (data.history || []),
      };
      
      setActivities(prev => prev.map(a => a.id === deserializedData.id ? deserializedData : a));
      setSelectedActivity(deserializedData);
      showUpdateMessage("Mise à jour synchronisée");
    }
  };

  const openActivityDetails = (activity: EditorialActivity | PressArticle) => {
    // Accepte les deux types pour compatibilité avec ArchivesView
    if ('location' in activity) {
      // C'est un EditorialActivity
      const normalizedRole = profile?.role?.toString().trim().toLowerCase();
      const isCabinetUser = normalizedRole === 'cabinet';
      
      setSelectedActivity(activity as EditorialActivity);
      // Stocker la date de l'activité pour l'animation du calendrier
      setSelectedCalendarDate((activity as any).date || null);
      
      // 🔒 Stocker l'ID de l'utilisateur qui a cliqué (pour animation exclusive)
      if (isCabinetUser && user?.id) {
        setUserWhoClickedActivityId(user.id);
        setClickedActivityUserRole(normalizedRole);
      }
      
      // Ne pas ouvrir la sidebar pour Cabinet, juste naviguer vers le calendrier
      if (!isCabinetUser) {
        setIsSidebarOpen(true);
      } else {
        setActiveTab('calendar');
      }
    } else if ('source' in activity) {
      // C'est un PressArticle - pour l'instant, on l'affiche pas ici
      console.log('PressArticle cliqué:', activity);
    }
  };

  const handleAddAgendaActivities = async (newActivities: { title: string; date: string; description: string; responsible: string; participants: string; location: string; media: 'O' | 'N'; suggestedModel: string; }[]) => {
    if (newActivities.length === 0) return;

    const now = new Date().toISOString();

    // ⭐ OPTIMISTIC UPDATE : Construction de l'objet strictement conforme au type EditorialActivity
    const optimisticActivities: EditorialActivity[] = newActivities.map((activity, index) => ({
      id: `optimistic-${Date.now()}-${index}`,
      title: activity.title?.trim() || `Activité supplémentaire ${index + 1}`,
      description: activity.description?.trim() || 'Activité ajoutée manuellement.',
      responsible: activity.responsible?.trim() || profile?.full_name || '-',
      participants: activity.participants?.trim() || '-',
      location: activity.location?.trim() || 'À préciser',
      media: activity.media || 'N',
      date: activity.date || latestAgendaDate || now.split('T')[0],
      time: '08:00', // ✅ Obligatoire dans ton type
      status: ActivityStatus.A_VENIR,
      workflow: WorkflowStatus.BROUILLON,
      created_at: now,
      category: EditorialCategory.GOUVERNANCE,
      type: ActivityType.REUNION_CABINET,
      commContent: '',
      channels: [],
      comments: [],
      interview_questions: [],
      rejection_reason: '', // ✅ Ajouté pour ton nouveau système de rejet
      history: [{
        id: `h-manual-${Date.now()}-${index}`,
        timestamp: now,
        user: profile?.full_name || 'Cabinet',
        action: "Création manuelle",
        details: "Ajouté depuis le tableau de bord"
      }],
    }));

    // Mise à jour immédiate de l'UI (Optimisme)
    setActivities(prev => [...optimisticActivities, ...prev]);

    try {
      // Préparation des données pour l'insertion Supabase
      const prepared = optimisticActivities.map(activity => ({
        title: activity.title,
        description: activity.description,
        date: activity.date,
        time: activity.time,
        responsible: activity.responsible,
        participants: activity.participants,
        location: activity.location,
        media: activity.media,
        status: activity.status,
        workflow: activity.workflow,
        created_at: activity.created_at,
        category: activity.category,
        type: activity.type,
        commContent: activity.commContent,
        rejection_reason: activity.rejection_reason,
        // Envoi des tableaux/objets (Supabase gère le JSONB)
        channels: activity.channels,
        comments: activity.comments,
        interview_questions: activity.interview_questions,
        history: activity.history,
      }));
      
      console.log('📤 Envoi vers Supabase...');

      const { error } = await supabase.from('activities').insert(prepared);

      if (error) {
        // Rollback en cas d'erreur
        setActivities(prev => prev.filter(a => !a.id?.toString().startsWith('optimistic-')));
        console.error('❌ ERREUR SUPABASE :', error);
        showUpdateMessage(`❌ Erreur: ${error.message}`);
        return;
      }

      // Rechargement des données réelles depuis le serveur
      await loadAllData();
      showUpdateMessage(`✅ ${newActivities.length} activité(s) ajoutée(s) !`);

    } catch (err: any) {
      // Rollback en cas d'exception
      setActivities(prev => prev.filter(a => !a.id?.toString().startsWith('optimistic-')));
      console.error('❌ ERREUR SYSTÈME :', err);
      showUpdateMessage(`❌ Erreur système : ${err?.message || 'Inconnue'}`);
    }
  };
  const handleUseTemplateWithPlatform = async (template: CommTemplate, platform: string) => {
    if (!selectedActivity) return;
    showUpdateMessage(`Génération ${platform.toUpperCase()}...`);
    try {
      const content = await generateEditorialContent(selectedActivity.description, template.title, platform);
      if (content) {
        setEditorContent(content);
        setEditorPlatform(platform.toUpperCase());
        setEditorTitle(template.title);
        setIsEditorOpen(true);
      }
    } catch (err) {
      showUpdateMessage("Erreur de connexion IA");
    }
  };

  // --- Mémos ---
  const historyEntries = useMemo(() => {
    return activities
      .flatMap(a => (a.history || []).map(h => ({ ...h, activityType: a.type })))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [activities]);

  if (authLoading) return <div className="h-screen flex items-center justify-center bg-white text-[#175a95] font-black italic animate-pulse uppercase tracking-widest">Initialisation MEFB...</div>;

  // Afficher un message d'erreur si l'authentification a échoué
  if (authError) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950 text-white p-8">
        <div className="max-w-md text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-rose-500/20 flex items-center justify-center">
            <XCircle size={32} className="text-rose-400" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white mb-2">Problème de connexion</h2>
            <p className="text-slate-300 text-sm leading-relaxed">{authError}</p>
          </div>
          <button
            onClick={() => retryAuth()}
            className="w-full py-3 bg-[#175a95] text-white rounded-2xl font-black uppercase text-sm hover:bg-blue-700 transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#175a95]/20 blur-3xl" />
          <div className="absolute right-0 top-32 h-96 w-96 rounded-full bg-[#149308]/10 blur-3xl" />
          <div className="absolute inset-x-0 bottom-0 h-80 bg-[radial-gradient(circle_at_center,_rgba(30,41,59,0.4),transparent_55%)]" />
        </div>

        <div className="relative mx-auto flex min-h-screen items-center justify-center px-3 sm:px-4 py-6 sm:py-8 md:py-10">
          <div className="flex flex-col lg:grid w-full max-w-7xl gap-6 sm:gap-8 lg:grid-cols-2">
            <div className="hidden rounded-[2.5rem] border border-white/10 bg-slate-900/80 p-10 shadow-2xl shadow-slate-900/40 backdrop-blur-xl lg:flex flex-col justify-between overflow-hidden">
              <div>
                <div className="mb-10 flex items-center gap-3 rounded-3xl bg-white/10 px-4 py-3 text-sm uppercase tracking-[0.25em] text-slate-200 shadow-inner shadow-slate-950/10">
                  <img src="/branding/logo.png" className="h-16 w-16 rounded-3xl bg-white/10 p-2" alt="MEFB logo" />
                  <span>Portail Editorial MEFB</span>
                </div>
                <h2 className="text-4xl font-black leading-tight text-white">Gestion intelligente des publications du Cabinet</h2>
                <p className="mt-6 max-w-xl text-sm leading-7 text-slate-300">Connectez-vous pour accéder au portail éditorial, enregistrer les preuves de publication, suivre les validations IA et générer le bilan mensuel en temps réel.</p>

                <div className="mt-10 space-y-4">
                  {[
                    'Accès rapide pour les membres du Cabinet et du Service Communication.',
                    'Publication réservée en mode Observateur jusqu’à validation du rôle.',
                    'Interface sécurisée avec suivi d’activité et audit en temps réel.'
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3 text-sm text-slate-200">
                      <span className="mt-1 inline-flex h-7 w-7 items-center justify-center rounded-2xl bg-[#149308]/20 text-[#149308]">✓</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-10 rounded-[2rem] border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
                <p className="font-black uppercase tracking-[0.2em] text-slate-200 mb-4">Processus d’accès</p>
                <ol className="space-y-3 list-decimal list-inside text-slate-300">
                  <li>Créer son compte en un clic.</li>
                  <li>Accéder immédiatement en tant qu'Observateur Invité.</li>
                  <li>Un administrateur définit ensuite votre rôle exact.</li>
                </ol>
              </div>
            </div>

            <div className="relative rounded-xl sm:rounded-2xl md:rounded-[2.5rem] border border-white/10 bg-slate-950/95 p-4 sm:p-6 md:p-8 shadow-2xl shadow-slate-950/30 overflow-hidden w-full">
              <div className="absolute inset-x-0 top-0 h-12 sm:h-16 rounded-t-xl sm:rounded-t-2xl md:rounded-t-[2.25rem] bg-gradient-to-r from-[#175a95] to-[#149308] opacity-15" />
              <div className="relative">
                <div className="flex justify-center">
                  <img src="/branding/logo.png" className="h-16 sm:h-20 md:h-24 w-16 sm:w-20 md:w-24 rounded-2xl sm:rounded-3xl bg-slate-900 p-2 sm:p-3 shadow-lg shadow-slate-950/30" alt="MEFB logo" />
                </div>
                <h1 className="mt-4 sm:mt-6 text-center text-xl sm:text-2xl md:text-3xl font-black text-white uppercase tracking-tight sm:tracking-[0.1em] md:tracking-[0.2em]">Portail Éditorial Cabinet</h1>
                <p className="mt-2 sm:mt-3 text-center text-xs sm:text-sm text-slate-300">Accès sécurisé au suivi des publications ministérielles.</p>
              </div>
              <div className="mt-6 sm:mt-8 md:mt-10">
                {authView === 'login' ? (
                  <LoginForm onSuccess={() => loadAllData()} onSwitchToSignup={() => setAuthView('signup')} />
                ) : (
                  <SignupForm onSuccess={() => setAuthView('login')} onSwitchToLogin={() => setAuthView('login')} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

const handleOpenEditorWithTemplate = async (template: any, platform: string) => {
  // 1. Vérification sécurisée
  if (!selectedActivity) {
    showUpdateMessage("⚠️ Veuillez sélectionner une activité dans le Tableau de Bord.");
    setActiveTab('dashboard');
    return;
  }

  // 2. Afficher le modal d'interview pour collecter les informations
  setPendingTemplate({ template, platform });
  setIsInterviewModalOpen(true);
};

const handleInterviewComplete = async (responses: Record<string, string>) => {
  if (!selectedActivity || !pendingTemplate) return;

  const { template, platform } = pendingTemplate;
  showUpdateMessage(`✨ Génération IA pour ${platform}...`);

  try {
    // Construire le contexte enrichi avec les réponses de l'interview
    const contextFromInterview = Object.values(responses).join(" | ");
    const enrichedDescription = `${selectedActivity.description || ""}\n\nINFORMATIONS HUMANISÉES :\n${contextFromInterview}`;

    // 2. Appel à l'IA (Groq) avec la plateforme correcte et contexte enrichi
    const aiContent = await generateEditorialContent(
      enrichedDescription,
      template.title || selectedActivity.title || "",
      platform
    );

    // 3. Créer l'objet results avec le contenu généré
    const results: Record<string, string> = {
      [platform]: aiContent || "Erreur de génération..."
    };

    // 4. Mise à jour pour la MODALE
    setMultiPlatformResults(results);
    setEditorTitle(template.title);
    setIsEditorOpen(true);

    showUpdateMessage(`✅ Contenu généré pour ${platform} !`);
  } catch (err) {
    console.error("Erreur rédaction:", err);
    showUpdateMessage("❌ Erreur de connexion avec l'IA.");
  } finally {
    setIsInterviewModalOpen(false);
    setPendingTemplate(null);
    setInterviewResponses({});
  }
};

const handleOpenPubSidebar = (pub: any) => {
  setSelectedPub(pub);
  setIsPubSidebarOpen(true);
};

const handleGenerateAI = async () => {
  if (!selectedActivity) return;

  setIsGenerating(true);
  showUpdateMessage("⏳ Génération d'un essai rapide...");

  try {
    const content = await generateEditorialContent(
      selectedActivity.description || "",
      selectedActivity.title || "",
      "Résumé Stratégique"
    );

    // ✅ Créer un objet results avec la plateforme comme clé (sinon la modal sera vide)
    setMultiPlatformResults({ "Essai Rapide": content });
    setEditorTitle("Synthèse Rapide");
    setIsEditorOpen(true);

    showUpdateMessage("✅ Essai généré avec succès !");
  } catch (error) {
    console.error(error);
    showUpdateMessage("❌ Erreur lors de la génération.");
  } finally {
    setIsGenerating(false);
  }
};

const handleGenerateWebsiteArticle = async (interviewNotes: string) => {
  if (!selectedActivity) return;

  setIsGenerating(true);
  showUpdateMessage("⏳ Génération d'un article pour le site web...");

  try {
    const content = await generateWebsiteArticleFromInterview(selectedActivity, interviewNotes);

    setMultiPlatformResults({ "Article Site Web": content });
    setEditorTitle("Article Site Web");
    setIsEditorOpen(true);

    showUpdateMessage("✅ Article pour le site web généré !");
  } catch (error) {
    console.error(error);
    showUpdateMessage("❌ Erreur lors de la génération de l'article web.");
  } finally {
    setIsGenerating(false);
  }
};

const handleSubmitToCabinet = async (platform: string, text: string, titleOverride?: string) => {
  const activityAny = selectedActivity as any;
  const cleanTitle = titleOverride || selectedActivity?.title || activityAny?.Activités || "Article Cabinet";
  const submissionDate = new Date().toISOString().split('T')[0];

  try {
    const { data, error } = await supabase
      .from('press_review')
      .insert([{
        title: cleanTitle,
        summary: text,
        category: platform,
        status: 'pending_validation',
        source: 'PRODUCTION INTERNE',
        date: submissionDate
      }])
      .select()
      .single();

    if (error) throw error;

    if (selectedActivity) {
      handleUpdateActivity({ ...selectedActivity, commContent: text });
    }

    if (data) {
      addPressHistoryEntry({
        id: `submit-${data.id}-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: profile?.full_name || 'Rédacteur',
        action: 'Soumission Cabinet',
        details: `"${data.title}" soumis pour validation Cabinet dans le dossier journal interne.`
      });

      setPressArticles(prev => {
        if (prev.some(a => a.id === data.id)) return prev;
        return [data, ...prev];
      });

      setActiveTab('press');
      setPressInitialTab('validation');
      setPressValidationFilter('pending');
      showUpdateMessage("🚀 Article soumis au Cabinet !");
      loadAllData();
    }
  } catch (err) {
    console.error("Erreur lors de la soumission Cabinet:", err);
    showUpdateMessage("❌ Erreur lors de la soumission Cabinet.");
  }
};

// --- RENDU FINAL DE L'APPLICATION ---
  // Affichage de la page de maintenance pour les non-super-admin
  const isSuperAdminUser = ['super_admin', 'super-admin'].includes(
    profile?.role?.toString().trim().toLowerCase() || ''
  );
  if (maintenanceMode.active && !isSuperAdminUser && user) {
    return <MaintenancePage activatedBy={maintenanceMode.activatedBy} />;
  }

  return (
    <div className={`min-h-screen transition-colors duration-700 relative overflow-hidden flex ${
      theme === 'dark' ? 'bg-[#0a0f1d]' : 'bg-[#eef2f6]'
    }`}>
      <NotificationContainer />

      {/* Branding National en fond */}
      <div className="fixed inset-0 pointer-events-none z-0 flex items-center justify-center overflow-hidden lg:ml-72">
        <img 
          src="/branding/Branding.png" 
          className={`h-[700px] w-auto transition-all duration-1000 ${
            theme === 'dark' ? 'opacity-[0.05]' : 'opacity-[0.12]'
          }`} 
        />
      </div> 

      {/* Sidebar */}
      <Sidebar 
        activeTab={activeTab} setActiveTab={setActiveTab}
        isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen}
        profile={profile} loading={authLoading} signOut={signOut} activities={activities}
        onProfileClick={() => setIsProfileModalOpen(true)}
      />

      {/* Zone de contenu principal */}
      <main className="flex-1 lg:ml-72 flex flex-col relative z-10 min-h-screen overflow-y-auto bg-transparent">
        <Header
         activeTab={activeTab}
         setIsMobileMenuOpen={setIsMobileMenuOpen}
         onAddActivity={() => openActivityDetails({} as any)}
         onGoToTemplates={() => setActiveTab('templates')}
         userRole={profile?.role}
         userName={profile?.full_name}
         loading={authLoading || profileLoading}
         pendingValidationCount={internalPendingPressCount}
         onOpenValidation={() => { setActiveTab('press'); setPressInitialTab('validation'); setPressValidationFilter('pending'); }}
         commNotifCount={pressArticles.filter(a => ['published', 'approved', 'rejected'].includes(normalizeStatus(a.status)) && isInternalPressArticle(a)).length}
         onOpenCommNotif={() => { setActiveTab('press'); setPressInitialTab('validation'); setPressValidationFilter(pressArticles.some(a => ['published', 'approved'].includes(normalizeStatus(a.status)) && isInternalPressArticle(a)) ? 'approved' : 'rejected'); }}
       />

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 pb-32">
          <div className="max-w-7xl mx-auto">
            
            {/* 1. TABLEAU DE BORD */}
            {activeTab === 'dashboard' && (
              <div className="animate-in fade-in duration-500">
                {(() => {
                  const normalizedRole = profile?.role?.toString().trim().toLowerCase();
                  const isCabinet = normalizedRole === 'cabinet';
                  const isCommunication = normalizedRole === 'communication' || normalizedRole === 'service communication';
                  const canUploadAgenda = !isCabinet && !isCommunication;
                  
                  return canUploadAgenda ? (
                    <div className="mb-10">
                      <AgendaUploader onImportComplete={loadAllData} />
                    </div>
                  ) : null;
                })()}
               <DashboardView
                 activities={activities}
                 onActivityClick={openActivityDetails} 
                 onTabChange={setActiveTab}
                 onViewArchiveCabinet={() => {
                   setArchiveInitialFilter('cabinet');
                   setArchiveRecentCabinetActivities(activities.slice().sort((a, b) => {
                     const dateA = new Date(a.created_at || a.date || 0).getTime();
                     const dateB = new Date(b.created_at || b.date || 0).getTime();
                     return dateB - dateA;
                   }).slice(0, 8));
                   setActiveTab('archive');
                 }}
                   onOpenAddAgendaActivities={() => setShowAddAgendaActivityModal(true)}
                   showUpdateMessage={showUpdateMessage}
                   onQuickValidate={handleQuickValidation}
                   pendingCount={internalPendingPressCount}
                   pubCount={pubCount}
                   fetchPubCount={loadAllData}
                   userRole={profile?.role}
                   canEditActivities={(() => {
                     const normalizedRole = profile?.role?.toString().trim().toLowerCase();
                     return normalizedRole !== 'cabinet';
                   })()}
                   approvedPressCount={approvedPressCount}
                 />
                 <AddAgendaActivitiesModal
                   isOpen={showAddAgendaActivityModal}
                   onClose={() => setShowAddAgendaActivityModal(false)}
                   onAdd={handleAddAgendaActivities}
                   defaultDate={latestAgendaDate || undefined}
                   agendaHint={latestAgendaDate ? `Dernier agenda détecté le ${latestAgendaDate}` : 'Aucun agenda récent détecté.'}
                 />
              </div>
            )}

            {activeTab === 'templates' && (() => {
              return (
                <div className="space-y-8 animate-in fade-in duration-700">
                  {/* HEADER AVEC BOUTONS TABS */}
                  <div className="px-2 md:px-4">
                    <h2 className="text-xl md:text-3xl font-black text-slate-800 uppercase tracking-tight mb-4 md:mb-8 flex items-center gap-2 md:gap-3">
                      📋 Modèles de Communication
                    </h2>
                    <div className="rounded-2xl md:rounded-3xl p-1.5 md:p-2 inline-flex gap-1 md:gap-2 bg-slate-900/95 border border-slate-700/40 shadow-2xl w-full overflow-x-auto">
                      <button
                        onClick={() => setTemplatesTab('models')}
                        className={`px-3 md:px-8 py-2 md:py-4 rounded-xl md:rounded-2xl font-black text-[10px] md:text-[12px] uppercase tracking-widest transition-all whitespace-nowrap ${
                          templatesTab === 'models'
                            ? 'bg-[#175a95] text-white shadow-lg scale-105'
                            : 'bg-slate-800 text-slate-300 hover:text-white'
                        }`}
                      >
                        📄 Modèles
                      </button>
                      <button
                        onClick={() => setTemplatesTab('library')}
                        className={`px-3 md:px-8 py-2 md:py-4 rounded-xl md:rounded-2xl font-black text-[10px] md:text-[12px] uppercase tracking-widest transition-all whitespace-nowrap ${
                          templatesTab === 'library'
                            ? 'bg-[#175a95] text-white shadow-lg scale-105'
                            : 'bg-slate-800 text-slate-300 hover:text-white'
                        }`}
                      >
                        ✨ Bibliothèque
                      </button>
                    </div>

                    {/* CONTENU DES TABS */}
                    {templatesTab === 'models' ? (
                      <div className="space-y-12">
                        <ModelsView 
                          onOpenEditor={(results, title) => {
                            setMultiPlatformResults(results);
                            setEditorTitle(title);
                            setIsEditorOpen(true);
                          }}
                        />
                      </div>
                    ) : (
                      <div id="bibliotheque-modeles" data-section="templates-library">
                        <TemplatesView 
                          templates={COMM_TEMPLATES} 
                          onUseTemplate={(template, platform) => handleOpenEditorWithTemplate(template, platform)}
                          onDeleteTemplate={(id) => console.log("Suppression demandée pour", id)}
                          userRole={profile?.role}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

   <CabinetDecisionModal 
  isOpen={decisionModal.isOpen}
  title={decisionModal.title}
  onClose={() => setDecisionModal({ ...decisionModal, isOpen: false })}
  // On précise (feedback: string) pour enlever l'erreur rouge
  onConfirm={(feedback: string) => executeCabinetDecision(decisionModal.articleId, 'rejected', feedback)}
/>

            {/* 3. REVUE DE PRESSE / VALIDATION */}
            {(activeTab === 'press' || activeTab === 'review') && (
              <PressView 
                articles={pressArticles} 
                onAddArticle={() => setIsPressModalOpen(true)} 
                onArchiveArticle={handleArchivePressArticle}
                onHardDeleteArticle={handleDeletePress}
                onValidateArticle={handleCabinetDecision}
                userRole={profile?.role}
                fetchArticles={loadAllData}
                showUpdateMessage={showUpdateMessage}
                initialTab={pressInitialTab}
                initialValidationFilter={pressValidationFilter}
                onTabChange={(tab) => setPressInitialTab(tab)}
                onValidationFilterChange={(filter) => setPressValidationFilter(filter)}
              />
            )}

            {/* 4. ANNUAIRE — masqué pour les comptes Communication */}
            {activeTab === 'contacts' && (() => {
              const nr = profile?.role?.toString().trim().toLowerCase();
              const isCommUser = nr === 'communication' || nr === 'service communication';
              if (isCommUser) {
                return (
                  <div className="flex flex-col items-center justify-center py-32 text-center">
                    <div className="w-20 h-20 rounded-3xl bg-rose-50 flex items-center justify-center mb-6">
                      <span className="text-4xl">🔒</span>
                    </div>
                    <h3 className="text-lg font-black text-slate-700 uppercase tracking-widest mb-2">Accès Restreint</h3>
                    <p className="text-sm text-slate-400 max-w-xs">
                      L'Annuaire du Cabinet est réservé aux membres habilités. Contactez un administrateur pour accéder à cette section.
                    </p>
                  </div>
                );
              }
              return <ContactsView showUpdateMessage={showUpdateMessage} />;
            })()}

            {activeTab === 'calendar' && (
              <CalendarView 
              activities={activities}
              publications={publications} 
              onActivityClick={openActivityDetails}
              onPubClick={handleOpenPubSidebar}
              selectedDate={selectedCalendarDate}
              currentUserId={user?.id || null}
              userWhoClickedActivityId={userWhoClickedActivityId}
              currentUserRole={profile?.role?.toString().trim().toLowerCase() || null}
              clickedActivityUserRole={clickedActivityUserRole}
              />
            )}

            {activeTab === 'archive' && (
              <ArchivesView 
                activities={activities} 
                pressArticles={pressArticles}
                publications={publications}
                initialFilterType={archiveInitialFilter}
                recentCabinetActivities={archiveRecentCabinetActivities || undefined}
                onActivityClick={openActivityDetails} 
                onRestore={(id) => handleUpdateActivity({ id, status: 'Brouillon' } as any)} 
                onRestorePress={handleRestorePressArticle}
                onDeleteAllDrafts={handleDeleteAllDrafts}
                pubCount={pubCount}
              />
            )}
            {activeTab === 'history' && (
              <HistoryView entries={mergedHistoryEntries} activities={activities} 
                onPrint={() => window.print()} 
                onExportCSV={() => exportHistoryToCSV(mergedHistoryEntries)} 
                initialMode={historyInitialMode}
                showUpdateMessage={showUpdateMessage}
                allProfiles={allProfiles}
                userRole={profile?.role?.toString()}
              />
            )}
            {activeTab === 'configuration' && (
              <ConfigurationView
                theme={theme}
                toggleTheme={toggleTheme}
                aiTone={aiTone}
                setAiTone={setAiTone}
                role={profile?.role}
                fullName={profile?.full_name}
                onMaintenanceChange={(active, activatedBy) =>
                  setMaintenanceMode({ active, activatedBy })
                }
                showUpdateMessage={showUpdateMessage}
              />
            )}
          </div>
        </div>
      </main>

      {/* Notification Unique Flash MEFB */}
      <AnimatePresence>
       {currentMessage && (
    <motion.div 
      initial={isCenteredMessage(currentMessage) ? { opacity: 0, y: -10, scale: 0.96 } : { opacity: 0, x: 80, scale: 0.96 }}
      animate={isCenteredMessage(currentMessage) ? { opacity: 1, y: 0, scale: 1 } : { opacity: 1, x: 0, scale: 1 }}
      exit={isCenteredMessage(currentMessage) ? { opacity: 0, y: -10, scale: 0.96 } : { opacity: 0, x: -80, scale: 0.96 }}
      className={`fixed z-[9999] ${isCenteredMessage(currentMessage) ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' : 'top-6 right-6'} border px-6 py-4 rounded-3xl shadow-2xl backdrop-blur-xl min-w-[320px] max-w-sm ${getMessageStyle(currentMessage)}`}
    >
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15 shadow-inner">
          {getMessageIcon(currentMessage)}
        </div>
        <div className="text-left">
          <p className="text-sm font-bold leading-tight tracking-tight">
            {currentMessage}
          </p>
        </div>
      </div>
      <div className="mt-4 h-1 w-full rounded-full overflow-hidden bg-white/15">
        <motion.div 
          initial={{ x: '-100%' }}
          animate={{ x: '0%' }}
          transition={{ duration: 3, ease: 'linear' }}
          className={`h-full ${getMessageType(currentMessage) === 'success' ? 'bg-white/90' : getMessageType(currentMessage) === 'error' ? 'bg-white/80' : 'bg-white/80'}`}
        />
      </div>
    </motion.div>
  )}
</AnimatePresence>

      <AddPressArticleModal isOpen={isPressModalOpen} onClose={() => setIsPressModalOpen(false)} onAdd={handleAddPressArticle} />

     <EditorialEditorModal 
       isOpen={isEditorOpen} 
       onClose={() => setIsEditorOpen(false)}
       title={editorTitle} 
       results={multiPlatformResults} 
       onSave={async (platform, text, title) => {
         await handleSubmitToCabinet(platform, text, title);
       }}
     />

     <ActivityDetailSidebar
       isOpen={isSidebarOpen}
       onClose={() => setIsSidebarOpen(false)}
       activity={selectedActivity}
       onUpdate={handleUpdateActivity}
       onGenerateAI={handleGenerateAI}
       onGenerateWebsiteArticle={handleGenerateWebsiteArticle}
       onStartComm={() => {
         setActiveTab('templates');
         setTemplatesTab('library');
         setIsSidebarOpen(false);
         setTimeout(() => {
           const templatesSection = document.querySelector('[data-section="templates-library"]') as HTMLElement | null;
           if (templatesSection) {
             templatesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
             templatesSection.focus({ preventScroll: true });
           }
         }, 250);
       }}
       isGenerating={isGenerating}
     />

     {/* Interview Modal pour Templates */}
     <InterviewModal
       isOpen={isInterviewModalOpen}
       onClose={() => {
         setIsInterviewModalOpen(false);
         setPendingTemplate(null);
         setInterviewResponses({});
       }}
       activity={selectedActivity}
       onComplete={handleInterviewComplete}
       title="Collecte d'Informations pour Rédaction Multi-Canaux"
     />

     <PublicationSidebar 
       pub={selectedPub}
       isOpen={isPubSidebarOpen}
       onClose={() => setIsPubSidebarOpen(false)}
       allProfiles={allProfiles}
     />
     
     <UserProfileModal
       isOpen={isProfileModalOpen}
       onClose={() => setIsProfileModalOpen(false)}
       showUpdateMessage={showUpdateMessage}
     />
    </div>
  );
}
