import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  CheckCircle,
  Calendar,
  Clock,
  LayoutDashboard,
  AlertCircle,
  Send,
  Mail,
  Globe,
  Sparkles,
  Share2,
  ArrowRight,
  ChevronRight,
  Users // Import pour le bouton Groupe
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { PublicationTracker } from '../press/PublicationTracker';
import { generateBriefingMessage } from '../../services/briefingService';
// Importation groupée de toutes les fonctions nécessaires
import {
  generateGroupBriefing,
  generateEditorialContent
} from '../../services/aiService';

interface DashboardProps {
  activities: any[];
  onActivityClick: (activity: any) => void;
  onTabChange: (tab: any) => void;
  onViewArchiveCabinet: () => void;
  onOpenAddAgendaActivities?: () => void;
  showUpdateMessage: (message: string) => void;
  onQuickValidate: (activityId: string) => Promise<void>;
  pendingCount: number;
  pubCount: number;
  fetchPubCount: () => Promise<void>;
  userRole?: string; // Nouveau : Rôle de l'utilisateur pour restrictions d'affichage
  canEditActivities?: boolean; // Nouveau : Permet d'ouvrir la fiche d'activité
  approvedPressCount?: number; // Nombre d'articles de presse validés par le Cabinet
}

export const DashboardView = ({
  activities,
  onActivityClick,
  onTabChange,
  onViewArchiveCabinet,
  onOpenAddAgendaActivities,
  showUpdateMessage,
  onQuickValidate,
  pendingCount,
  pubCount,
  fetchPubCount,
  userRole,
  canEditActivities = true, // Nouveau : Destructuration du prop
  approvedPressCount = 0
}: DashboardProps) => {

  // --- État pour l'animation du compteur qui vient de s'incrémenter ---
  const [animatedIndex, setAnimatedIndex] = useState<number | null>(null);
  const previousStatsRef = React.useRef({ total: 0, confirmed: 0, pending: 0, published: 0 });

  // --- Normaliser le rôle pour les contrôles d'accès ---
  const normalizedRole = userRole?.toString().trim().toLowerCase();
  const isCabinet = normalizedRole === 'cabinet';
  const isCommunication = normalizedRole === 'communication' || normalizedRole === 'service communication';
  const isGuest = normalizedRole === 'guest';
  const isObserver = normalizedRole === 'observateur' || normalizedRole === 'observer';
  const isObserverOrGuest = isGuest || isObserver; // Masquer compteurs pour Observateurs et Invités
  const isAdmin = normalizedRole === 'admin' || normalizedRole === 'super_admin';

  // --- TEMPS RÉEL : Synchronisation automatique des compteurs ---
  useEffect(() => {
    // Ne pas configurer le temps réel pour Observateurs et Invités
    if (isObserverOrGuest) return;

    const channels: any[] = [];

    // 1. Écoute les changements sur les activités éditoriales
    const activitiesChannel = supabase
      .channel('realtime_activities')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'activities' },
        () => {
          console.log("✅ Changement détecté dans les activités");
          // Déclenche un rechargement des données
          if (onActivityClick?.toString().length > 0) {
            // Vérifie si une fonction de rechargement est disponible
            window.addEventListener('storage', () => {
              // Notification passive du changement
            });
          }
        }
      )
      .subscribe();

    channels.push(activitiesChannel);

    // 2. Écoute les changements sur les articles de presse
    const pressChannel = supabase
      .channel('realtime_press_count')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'press_review' },
        () => {
          console.log("✅ Changement détecté dans les articles de presse");
        }
      )
      .subscribe();

    channels.push(pressChannel);

    // 3. Écoute les changements sur les publications sociales
    const pubChannel = supabase
      .channel('realtime_pub_count')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'social_publications' },
        () => {
          console.log("🔄 Mise à jour du compteur de publications détectée !");
          fetchPubCount();
        }
      )
      .subscribe();

    channels.push(pubChannel);

    // Nettoyage à la fermeture du composant
    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [fetchPubCount, isObserverOrGuest, onActivityClick]);

  // --- LOGIQUE FILTRE : Session du Jour (Correction Ibrahim) ---
  // --- LOGIQUE FILTRE : Session du Jour (Correction Ibrahim) ---
  const stats = React.useMemo(() => {
    if (!activities || activities.length === 0) {
      return { total: 0, confirmed: 0, pending: pendingCount || 0, published: pubCount || 0 };
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // On ne garde que ce qui a été créé AUJOURD'HUI
    const todaysActivities = activities.filter(a => {
      if (!a.created_at) return false;
      return new Date(a.created_at) >= todayStart;
    });

    const confirmedCount = todaysActivities.filter(a =>
      a.workflow === 'Validé' || a.status === 'Confirmé' || (a as any).validation_status === 'Validé'
    ).length;

    const pendingAgendaCount = todaysActivities.filter(a =>
      a.workflow === 'Soumis' || (a as any).validation_status === 'Soumis'
    ).length;

    return {
      total: todaysActivities.length,
      confirmed: confirmedCount + (approvedPressCount || 0),
      pending: (pendingCount || 0) + pendingAgendaCount,
      published: pubCount || 0
    };
  }, [activities, pendingCount, pubCount, approvedPressCount]);

  // --- Détecte et anime le compteur qui vient d'augmenter ---
  // --- ANIMATION TEMPORAIRE (MAX 7 SECONDES) ---
  useEffect(() => {
    const prevStats = previousStatsRef.current;
    
    // On déclenche l'index d'animation seulement si une valeur a augmenté
    if (stats.total > prevStats.total) setAnimatedIndex(0);
    else if (stats.confirmed > prevStats.confirmed) setAnimatedIndex(1);
    else if (stats.pending > prevStats.pending) setAnimatedIndex(2);
    else if (stats.published > prevStats.published) setAnimatedIndex(3);

    // TA LOGIQUE : Arrêt automatique après 7 secondes
    const timeout = setTimeout(() => {
      setAnimatedIndex(null);
    }, 7000);

    previousStatsRef.current = stats;
    return () => clearTimeout(timeout);
  }, [stats]);

  const statCards = [
    { label: "Total Activités", value: stats.total, icon: Calendar, bg: "bg-blue-50 dark:bg-blue-900/20", color: "text-[#175a95]" },
    { label: "Confirmées", value: stats.confirmed, icon: CheckCircle, bg: "bg-emerald-50 dark:bg-emerald-900/20", color: "text-[#149308]" },
    { label: "En Validation", value: stats.pending, icon: Clock, bg: "bg-amber-50 dark:bg-amber-900/20", color: "text-amber-500" },
    { label: "Publiées", value: stats.published, icon: Send, bg: "bg-indigo-50 dark:bg-indigo-900/20", color: "text-indigo-600" }
  ];

  const showTracePanel =
    userRole?.toLowerCase() === 'communication' ||
    userRole?.toLowerCase() === 'service communication' ||
    userRole?.toLowerCase() === 'admin' ||
    userRole?.toLowerCase() === 'super_admin' ||
    userRole?.toLowerCase() === 'super-admin';

  // Masquer l'upload agenda et la fiche d'activité pour Cabinet, Communication, et Observateur
  const canUploadAgenda = !isCabinet && !isCommunication && !isGuest;
  const canEditActivitySidebar = !isCabinet;

  // --- FONCTION D'ENVOI OPTIMISÉE (INDIVIDUEL + GROUPES) ---
  const handleSendFlashBriefing = async (activity: any, mode: 'whatsapp' | 'email' | 'whatsapp_group') => {
    try {
      // --- 1. LOGIQUE WHATSAPP GROUPE / MULTIPLE (L'interface de sélection) ---
      if (mode === 'whatsapp_group') {
        const response = await generateGroupBriefing(activity);

        if (response === "TRIGGER_INDIVIDUAL_CONVOCATION") {
          showUpdateMessage("ℹ️ Groupe restreint : Passage en envoi individuel.");
          return handleSendFlashBriefing(activity, 'whatsapp'); 
        }

        // ✅ LOGIQUE "COCHAGE" : On utilise l'API de partage pour laisser l'utilisateur cocher les contacts
        const shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(response)}`;
        window.open(shareUrl, '_blank');
        showUpdateMessage("✅ WhatsApp ouvert : Cochez les contacts/groupes dans la liste.");
        return;
      }

      // --- 2. EXTRACTION DES NOMS (Ton code original préservé) ---
      const rawNames = [
        ...(activity.responsible || '').split(/[,|/]| et /),
        ...(activity.participants || '').split(/[,|/]| et /)
      ];

      const names = Array.from(new Set(
        rawNames
          .map((n: string) => n.trim())
          .filter(n => n.length > 1 && n !== '-' && n.toLowerCase() !== 'aucun' && n.toLowerCase() !== 'non spécifiés')
      ));

      if (names.length === 0) {
        showUpdateMessage("⚠️ Aucune personne à convoquer spécifiée.");
        return;
      }

      // --- 3. CHARGEMENT ANNUAIRE DB + LOCAL (Ton code original préservé) ---
      let allContacts: any[] = [];
      const { data, error } = await supabase.from('ministere_contacts').select('*');
      if (data) allContacts = [...data];

      const localContactsMod = await import('../../data/contacts');
      const staticContacts = localContactsMod.MINISTERE_CONTACTS || {};

      Object.entries(staticContacts).forEach(([nom, info]: [string, any]) => {
        if (!allContacts.find(c => c.nom?.toLowerCase() === nom.toLowerCase())) {
          allContacts.push({ nom, email: info.email, telephone: info.tel });
        }
      });

      // --- 4. NORMALISATION ET ENVOI (Amélioré pour l'Email) ---
      let sentCount = 0;
      let notFoundNames: string[] = [];

      const normalizeTitle = (title: string) => {
        let t = (title || '').toLowerCase().trim();
        const dictionary: Record<string, string> = { 'sg': 'secretaire general', 'cc': 'chef de cabinet', 'dg': 'directeur general', 'dga': 'directeur general adjoint' };
        if (dictionary[t]) t = dictionary[t];
        t = t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\b(du|de la|des|de l'|de l|le|la|les|de)\b/g, '');
        return t.replace(/\bcheffe\b/g, 'chef').replace(/\bassistante\b/g, 'assistant').trim();
      };

      for (const searchName of names) {
        const normalizedSearch = normalizeTitle(searchName);
        let contact = allContacts.find(c => normalizeTitle(c.nom) === normalizedSearch);
        
        if (!contact) {
          contact = allContacts.find(c => {
            const nomAnnuaire = normalizeTitle(c.nom);
            return nomAnnuaire.includes(normalizedSearch) || normalizedSearch.includes(nomAnnuaire);
          });
        }

        if (contact) {
          const responseIA = await generateBriefingMessage(activity);

            if (!responseIA.isStrategic) {
             showUpdateMessage("⚠️ Note : L'activité manque de détails, le message de secours a été utilisé.");
            }
          const message = typeof responseIA === 'object' ? responseIA.content : responseIA; // Assure-toi que cette fonction génère un message neutre (sans nom d'expéditeur)
          const destination = mode === 'whatsapp' ? contact.telephone : contact.email;

          if (destination) {
            if (mode === 'whatsapp') {
              let cleanNumber = destination.replace(/[\s\-\(\)]/g, '');
              if (!cleanNumber.startsWith('+') && cleanNumber.length >= 8) cleanNumber = '224' + cleanNumber; // Format Guinée par défaut si besoin
              
              const waUrl = `https://wa.me/${cleanNumber.replace(/^\+/, '')}?text=${encodeURIComponent(message)}`;
              window.open(waUrl, '_blank');
            } else {
              // ✅ AMÉLIORATION EMAIL : Sujet clair et message universel
              const subject = `Convocation : ${activity.title}`;
              const mailtoUrl = `mailto:${encodeURIComponent(destination)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
              
              // On tente Gmail en premier pour la richesse du texte, sinon mailto
              const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(destination)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
              
              const win = window.open(gmailUrl, '_blank');
              if (!win) window.location.href = mailtoUrl; 
            }
            sentCount++;
          } else {
            notFoundNames.push(searchName);
          }
        } else {
          notFoundNames.push(searchName);
        }
      }

      // --- 5. FINALISATION ---
      if (sentCount > 0) {
        showUpdateMessage(`✅ ${sentCount} convocation(s) préparée(s) !`);
        await onQuickValidate(activity.id);
      }
      if (notFoundNames.length > 0) {
        showUpdateMessage(`⚠️ Contacts introuvables : ${notFoundNames.join(', ')}`);
      }

    } catch (err) {
      console.error("❌ Erreur:", err);
      showUpdateMessage("❌ Erreur technique lors de l'envoi.");
    }
  };

  const recentActivities = [...activities]
    .filter(a => a.title)
    .sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, 8);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">

      {/* SECTION 1 : STATS */}
      {!isObserverOrGuest && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, i) => (
            <div 
              key={i} 
              className={`bg-white dark:bg-[#161e2d] p-6 rounded-3xl border border-slate-100 dark:border-white/5 shadow-sm transition-all duration-500 ${
                animatedIndex === i 
                  ? 'scale-105 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-500/50 shadow-lg shadow-emerald-400/20' 
                  : 'scale-100'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 ${stat.bg} rounded-2xl flex items-center justify-center transition-all ${animatedIndex === i ? 'animate-pulse' : ''}`}>
                  <stat.icon size={22} className={stat.color} />
                </div>
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-tighter">
                  {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).toUpperCase()}
                </span>
              </div>
              <p className={`text-3xl font-black text-slate-800 dark:text-white transition-all ${animatedIndex === i ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                {stat.value}
              </p>
              <p className="text-[11px] font-bold text-slate-400 uppercase mt-1 tracking-widest">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className={`${showTracePanel ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-6`}>
          <div className="bg-white dark:bg-[#161e2d] rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-50 flex flex-col sm:flex-row gap-3 sm:gap-0 justify-between items-start sm:items-center">
                <div>
                  <h3 className="text-xs font-black text-[#175a95] uppercase tracking-widest">Dernières activités du Cabinet</h3>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  {(isCabinet || isAdmin) && onOpenAddAgendaActivities && (
                    <button
                      onClick={onOpenAddAgendaActivities}
                      className="px-4 py-2 bg-[#175a95] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all"
                    >
                      Ajouter une activité
                    </button>
                  )}
                  <button onClick={onViewArchiveCabinet} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center gap-1">
                    Voir tout <ArrowRight size={12} />
                  </button>
                </div>
              </div>

            <div className="divide-y divide-slate-50 max-h-[600px] overflow-y-auto">
              {recentActivities.length > 0 ? (
                recentActivities.map(a => (
                  <div
                    key={a.id}
                    onClick={() => onActivityClick(a)}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center group hover:bg-slate-50 cursor-pointer transition-all dark:hover:bg-slate-50 gap-3 sm:gap-0"
                  >
                    <div className="min-w-0 flex-1 w-full sm:w-auto">
                      <p className="text-[10px] font-bold text-[#175a95] dark:text-blue-400 group-hover:text-[#175a95] uppercase mb-1">{a.date}</p>
                      <h4 className="font-black text-slate-800 dark:text-slate-200 group-hover:text-slate-800 text-sm truncate uppercase tracking-tight">{a.title}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 group-hover:text-slate-500 truncate italic mt-1">{a.description || '...'}</p>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                      {/* Hiding quick actions for 'communication' members as requested */}
                      {!userRole?.toLowerCase().includes('communication') && (
                        <div className="hidden group-hover:flex items-center gap-2">
                          {/* BOUTON CONVOCATION GROUPE WHATSAPP */}
                          <button onClick={(e) => { e.stopPropagation(); handleSendFlashBriefing(a, 'whatsapp_group'); onQuickValidate(a.id); }} className="p-2 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-600 hover:text-white transition-all" title="Convocation Groupe WhatsApp">
                            <Send size={14} />
                          </button>

                          <button onClick={(e) => { e.stopPropagation(); handleSendFlashBriefing(a, 'email'); }} className="p-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-600 hover:text-white transition-all" title="Envoyer via Gmail">
                            <Mail size={14} />
                          </button>
                        </div>
                      )}
                      <span className={`text-[9px] font-black px-3 py-1.5 rounded-xl uppercase tracking-tighter border whitespace-nowrap ${a.workflow === 'Publié' ? 'bg-[#149308] text-white' : 'bg-slate-50 text-slate-400'}`}>
                        {a.workflow || 'Brouillon'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center text-slate-400 font-bold uppercase italic">Aucune donnée synchronisée</div>
              )}
            </div>
          </div>
        </div>

        {showTracePanel && (
          <div className="space-y-6">
            <PublicationTracker onUpdate={fetchPubCount} showUpdateMessage={showUpdateMessage} />
            <div className="bg-[#175a95] p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
              <div className="relative z-10">
                <h4 className="font-black text-xs uppercase mb-3 flex items-center gap-2"><AlertCircle size={16} /> Traçabilité du Cabinet</h4>
                <p className="text-[11px] leading-relaxed opacity-90 font-bold italic">Chaque lien de publication doit être renseigné ici pour la génération automatique du rapport de performance mensuel.</p>
              </div>
              <div className="absolute -right-4 -bottom-4 opacity-10"><Share2 size={100} /></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};