import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Printer, BookOpen, FileCheck, FileDown, Layout,
  AlertCircle, Sparkles, Search, User, ShieldCheck, Clock, Calendar,
  Tag, TrendingUp, CheckCircle2, Circle, FileClock, Users, ChevronLeft, ChevronRight
} from 'lucide-react';
import { HistoryEntry, EditorialActivity } from '../../types';
import { generateMonthlySummary, generateMagazineArticleFromPublication } from '../../services/aiService';
import { generateMonthlyReport } from '../../services/reportService';
import { PerformanceCardsGrid } from '../press/PerformanceCardsGrid';
import { PedagogicalModule } from './PedagogicalModule';
import { supabase } from '../../lib/supabaseClient';

interface HistoryViewProps {
  entries: (HistoryEntry & { activityType?: string })[];
  activities: EditorialActivity[];
  onPrint: () => void;
  onExportCSV: () => void;
  initialMode?: 'journal' | 'bilan';
  showUpdateMessage?: (message: string) => void;
  allProfiles?: any[];
  userRole?: string;
}

const getInstitutionalStyle = (themeColor: string) => `
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=Playfair+Display:wght@700;900&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', sans-serif; color: #1e293b; background: #f8fafc; position: relative; min-height: 100vh; }
    .watermark-bg { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 600px; opacity: 0.05; z-index: -1; pointer-events: none; }
    .top-bar { position: sticky; top: 0; background: white; padding: 15px 40px; display: flex; justify-content: flex-end; border-bottom: 1px solid #e2e8f0; z-index: 1000; }
    .btn-download { background: #175a95; color: white; border: none; padding: 12px 24px; border-radius: 10px; font-weight: 900; cursor: pointer; display: flex; align-items: center; gap: 10px; text-transform: uppercase; font-size: 12px; }
    .header-doc { background: ${themeColor}; color: white; padding: 60px 40px; text-align: center; position: relative; }
    .content-area { max-width: 900px; margin: -30px auto 60px; background: white; padding: 60px; border-radius: 20px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); position: relative; }
    .branding-container { display: flex; justify-content: center; align-items: center; gap: 28px; margin-bottom: 24px; flex-wrap: wrap; }
    .logo-img { height: 80px; object-fit: contain; filter: brightness(0) invert(1); }
    .simandou-img { height: 50px; object-fit: contain; filter: brightness(0) invert(1); opacity: 0.9; }
    .footer-branding { height: 38px; display: block; margin: 0 auto 12px; opacity: 0.35; filter: grayscale(1); }
    .footer-doc { text-align: center; padding: 40px; color: #94a3b8; font-size: 10px; font-weight: 700; border-top: 1px solid #eee; }
    @media print { .top-bar { display: none; } body { background: white; } .content-area { box-shadow: none; margin-top: 0; } .watermark-bg { opacity: 0.08; } }
  </style>
`;

export const HistoryView = ({
  entries, activities, onPrint, onExportCSV, initialMode = 'bilan', showUpdateMessage, allProfiles, userRole
}: HistoryViewProps) => {
  const [activeMode, setActiveMode] = useState<'journal' | 'bilan' | 'production' | 'pedagogique'>(initialMode);
  const [period, setPeriod] = useState<'mensuel' | 'trimestriel' | 'semestriel' | 'annuel'>('mensuel');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isGeneratingMag, setIsGeneratingMag] = useState<'standard' | 'success' | 'urgent' | null>(null);
  const [productionFeedback, setProductionFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // État pour le mois/année affichés (pour synchroniser avec le calendrier)
  const today = new Date();
  const [displayedDate, setDisplayedDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const displayedYear = displayedDate.getFullYear();
  const displayedMonth = displayedDate.getMonth();

  const [searchAct, setSearchAct] = useState('');
  const [workflowFilter, setWorkflowFilter] = useState('tous');
  const [typeFilter, setTypeFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [searchLog, setSearchLog] = useState('');

  // Navigation mois précédent
  const goToPreviousMonth = () => {
    setDisplayedDate(new Date(displayedYear, displayedMonth - 1, 1));
  };

  // Navigation mois suivant
  const goToNextMonth = () => {
    setDisplayedDate(new Date(displayedYear, displayedMonth + 1, 1));
  };

  useEffect(() => { setActiveMode(initialMode); }, [initialMode]);

  const filteredStats = useMemo(() => {
    const referenceDate = new Date(displayedYear, displayedMonth, 1);
    if (!activities || !Array.isArray(activities)) return [];
    return activities.filter(act => {
      if (!act.date) return false;
      const actDate = new Date(act.date);
      const diffMonths = (referenceDate.getFullYear() - actDate.getFullYear()) * 12 + (referenceDate.getMonth() - actDate.getMonth());
      switch (period) {
        case 'mensuel': return diffMonths === 0;
        case 'trimestriel': return diffMonths >= 0 && diffMonths < 3;
        case 'semestriel': return diffMonths >= 0 && diffMonths < 6;
        case 'annuel': return diffMonths >= 0 && diffMonths < 12;
        default: return true;
      }
    });
  }, [activities, period, displayedYear, displayedMonth]);

  const validatedActivities = useMemo(() => {
    return filteredStats.filter(act => {
      const workflow = String(act.workflow || '').toLowerCase();
      const status = String(act.status || '').toLowerCase();
      return workflow.includes('valid') || status.includes('réalisé') || status.includes('realise');
    });
  }, [filteredStats]);

  const journalActivities = useMemo(() => {
    return filteredStats
      .filter(a => {
        if (workflowFilter !== 'tous') {
          const wf = String(a.workflow || '').toLowerCase();
          if (workflowFilter === 'valide' && !wf.includes('valid')) return false;
          if (workflowFilter === 'publie' && !wf.includes('publi')) return false;
          if (workflowFilter === 'brouillon' && !wf.includes('brouillon')) return false;
          if (workflowFilter === 'soumis' && !wf.includes('soumis')) return false;
        }
        if (typeFilter && String(a.type || '').toLowerCase() !== typeFilter.toLowerCase()) return false;
        if (searchAct) {
          const q = searchAct.toLowerCase();
          return (String(a.title || '').toLowerCase().includes(q) || String(a.description || '').toLowerCase().includes(q));
        }
        return true;
      })
      .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
  }, [filteredStats, workflowFilter, typeFilter, searchAct]);

  const journalByDate = useMemo(() => {
    const groups: Record<string, typeof journalActivities> = {};
    journalActivities.forEach(a => {
      const key = a.date || 'Sans date';
      if (!groups[key]) groups[key] = [];
      groups[key].push(a);
    });
    return Object.entries(groups).sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime());
  }, [journalActivities]);

  const uniqueTypes = useMemo(() => Array.from(new Set(filteredStats.map(a => a.type).filter(Boolean))) as string[], [filteredStats]);

  const urgentTasks = useMemo(() => {
    if (!activities || !Array.isArray(activities)) return [];
    const today = new Date(); today.setHours(0,0,0,0);
    const in7days = new Date(today); in7days.setDate(today.getDate() + 7);
    const ago30days = new Date(today); ago30days.setDate(today.getDate() - 30);

    return activities.filter(a => {
      const wf = String(a.workflow || '').toLowerCase();
      const priority = String(a.priority || '').toLowerCase();
      const actDate = a.date ? new Date(a.date) : null;
      return (priority === 'urgent' || priority === 'haute' || (actDate && actDate >= today && actDate <= in7days && !wf.includes('valid')));
    }).map(a => {
      const actDate = a.date ? new Date(a.date) : null;
      let alertType: 'critical' | 'high' | 'upcoming' | 'stale' = 'high';
      if (String(a.priority).toLowerCase() === 'urgent') alertType = 'critical';
      else if (actDate && actDate >= today && actDate <= in7days) alertType = 'upcoming';
      return { ...a, _alertType: alertType, _daysUntil: actDate ? Math.ceil((actDate.getTime() - today.getTime()) / (86400000)) : null };
    }).sort((a,b) => (a._alertType === 'critical' ? -1 : 1));
  }, [activities]);

  const handleGenerateMagazine = async (theme: 'success' | 'urgent' | 'standard' = 'standard') => {
    setIsGeneratingMag(theme);
    
    try {
      // 1. Récupération plus large (on prend les 50 dernières pour maximiser les chances)
      const { data: publications } = await supabase
        .from('social_publications')
        .select('*')
        .order('published_at', { ascending: false })
        .limit(50);

      // 2. FILTRAGE ASSOUPLI POUR LE "BILAN DE RÉUSSITE"
      let validPubs = (publications || []).filter(p => {
        const content = (p.ai_summary || p.summary || "").toLowerCase();
        
        if (theme === 'success') {
          // Liste de mots-clés plus large pour ne rien rater des succès
          const successTerms = [
            'succès', 'réussite', 'validé', 'signature', 'accord', 
            'performance', 'inauguration', 'lancement', 'satisfaction', 
            'atteint', 'progression', 'favorable', 'conclu', 'avancée'
          ];
          return successTerms.some(term => content.includes(term));
        }
        
        if (theme === 'urgent') {
          return content.includes('urgent') || content.includes('alerte') || 
                 content.includes('retard') || content.includes('risque') || 
                 content.includes('prioritaire');
        }
        return content.length > 40;
      });

      // --- SÉCURITÉ : SI TOUJOURS VIDE, ON FORCE LES RÉALISATIONS DU WORKFLOW ---
      let articles: any[] = [];
      
      if (validPubs.length > 0) {
        const aiResults = await Promise.all(
          validPubs.slice(0, 8).map(async (pub) => {
            const art = await generateMagazineArticleFromPublication(pub, theme);
            return { ...art, platform: pub.platform };
          })
        );
        articles = aiResults;
      } else {
        // Fallback sur tes activités marquées comme "Terminées" ou "Publiées"
        articles = activities
          .filter(act => {
            const status = String(act.workflow || '').toLowerCase();
            return status.includes('publi') || status.includes('valid') || status.includes('terminé');
          })
          .slice(0, 5)
          .map(act => ({
            title: `RÉALISATION : ${act.title?.toUpperCase()}`,
            content: act.description || "Activité finalisée avec succès par le département.",
            platform: "ACTIVITÉ CABINET"
          }));
      }

      // Si vraiment rien n'est trouvé, on crée un message par défaut professionnel
      if (articles.length === 0) {
        articles = [{
          title: "EN ATTENTE DE VALIDATION",
          content: "Aucune publication n'a été marquée comme 'Réussite' pour cette période. Les données sont en cours d'analyse par le Cabinet.",
          platform: "INFO"
        }];
      }

      // --- FINALISATION ET AFFICHAGE ---
      const themes = {
        success: { color: '#149308', text: 'Bilan de Réussites Stratégiques' },
        urgent: { color: '#e11d48', text: 'Note de Vigilance Cabinet' },
        standard: { color: '#175a95', text: 'Le Bulletin Stratégique Mensuel' }
      };
      const selected = themes[theme];

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        showUpdateMessage?.("⚠️ Veuillez autoriser les pop-ups pour voir le document.");
        return;
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>${selected.text}</title>
            ${getInstitutionalStyle(selected.color)}
          </head>
          <body>
            <div class="top-bar">
              <button onclick="window.print()" class="btn-download">🖨️ Imprimer le Bulletin</button>
            </div>
            <div id="pdf-root">
              <div class="header-doc">
                <div class="branding-container">
                  <img src="${window.location.origin}/branding/logo.png" class="logo-img" />
                  <img src="${window.location.origin}/branding/simandou.png" class="simandou-img" />
                </div>
                <h1>${selected.text}</h1>
                <p>RÉPUBLIQUE DE GUINÉE • CABINET MEFB</p>
              </div>
              <div class="content-area">
                ${articles.map((art, i) => `
                  <div style="margin-bottom:30px; border-bottom:1px solid #eee; padding-bottom:20px;">
                    <h2 style="color:${selected.color}; font-size:18px; text-transform:uppercase;">${art.title}</h2>
                    <p style="font-size:14px; line-height:1.6; color:#334155;">${art.content}</p>
                    <div style="margin-top:10px; font-size:10px; color:#94a3b8; font-weight:700;">
                      SOURCE : ${art.platform || 'COMMUNICATION INTERNE'}
                    </div>
                  </div>
                `).join('')}
              </div>
              <div class="footer-doc">
                <p>DOCUMENT GÉNÉRÉ PAR LE SERVICE COMMUNICATION DU MEFB • ${new Date().getFullYear()}</p>
              </div>
            </div>
          </body>
        </html>
      `;

      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();

    } catch (error) {
      console.error("Erreur de génération :", error);
      showUpdateMessage?.("❌ Une erreur est survenue lors de la rédaction IA.");
    } finally {
      setIsGeneratingMag(null);
    }
  };

  const handleGenerateReport = async () => {
    setIsExportingPdf(true);
    const themeColor = '#175a95';

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    try {
      // 1. Récupération des données avec un filtre de qualité
      const { data: pubs } = await supabase
        .from('social_publications')
        .select('*')
        .order('published_at', { ascending: false })
        .limit(20); // On en prend plus pour avoir de la marge après filtrage

      // --- FILTRAGE DE PERTINENCE "REVUE DE PRESSE" ---
      const strategicPubs = (pubs || []).filter(p => {
        const content = (p.ai_summary || p.summary || "").toLowerCase();
        
        // Critère 1 : Longueur minimale pour éviter les posts vides ou simples partages d'images
        if (content.length < 50) return false;

        // Critère 2 : Thématiques liées à la "Presse" et "Activité Officielle"
        // On élimine les posts purement techniques ou les tests
        const keywords = [
          'ministre', 'audience', 'réunion', 'signature', 'décret', 
          'mission', 'développement', 'économie', 'budget', 'coopération',
          'lancement', 'atelier', 'visite', 'officiel'
        ];
        
        return keywords.some(key => content.includes(key));
      }).slice(0, 12); // On garde les 12 plus pertinents après tri

      // 2. Synthèse globale basée uniquement sur les articles filtrés
      const aiReview = await generateMonthlySummary(strategicPubs as any);

      const htmlContent = `
  <!DOCTYPE html>
  <html lang="fr">
    <head>
      <meta charset="UTF-8" />
      <title>Revue de Presse Officielle • MEFB</title>
      ${getInstitutionalStyle(themeColor)}
      <style>
        /* Styles de la revue de presse */
        .ai-analysis-card { 
          background: linear-gradient(to right, #f8fafc, #eff6ff);
          border-left: 6px solid ${themeColor};
          padding: 30px;
          border-radius: 15px;
          margin-bottom: 40px;
        }
        .article-card {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 20px;
          page-break-inside: avoid;
        }
        .platform-tag {
          font-size: 10px;
          font-weight: 900;
          padding: 4px 10px;
          border-radius: 4px;
          text-transform: uppercase;
          background: #f1f5f9;
          color: ${themeColor};
        }
      </style>
    </head>
    <body>
      <div class="top-bar">
        <button onclick="window.print()" class="btn-download">💾 Exporter en PDF</button>
      </div>

      <div id="pdf-root">
        <div class="header-doc">
          <div class="branding-container">
            <img src="${window.location.origin}/branding/logo.png" class="logo-img" />
            <img src="${window.location.origin}/branding/simandou.png" class="simandou-img" />
          </div>
          <h1>Revue de Presse Officielle</h1>
          <p>Veille Institutionnelle & Communication Digitale</p>
        </div>

        <div class="content-area">
          <div class="ai-analysis-card">
            <h3 style="color:${themeColor}; text-transform:uppercase; font-size:12px; margin-bottom:10px;">🔍 Analyse du Cabinet</h3>
            <p style="font-style:italic; color:#1e293b; line-height:1.6;">"${aiReview}"</p>
          </div>

          <h2 style="font-size:14px; text-transform:uppercase; color:#64748b; border-bottom:1px solid #e2e8f0; padding-bottom:10px; margin-bottom:20px;">
            Articles Sélectionnés (${strategicPubs.length})
          </h2>

          ${strategicPubs.map(p => `
            <div class="article-card">
              <span class="platform-tag">${p.platform}</span>
              <h4 style="margin: 10px 0; font-size:16px;">${(p.ai_summary || p.summary || '').split('.')[0]}</h4>
              <p style="font-size:13px; color:#475569;">${p.ai_summary || p.summary}</p>
              <div style="margin-top:10px; font-size:10px; color:#94a3b8;">
                Source : Communication Officielle | ${new Date(p.published_at).toLocaleDateString('fr-FR')}
              </div>
            </div>
          `).join('')}
        </div>

        <div class="footer-doc">
          <p>MINISTÈRE DE L'ÉCONOMIE, DES FINANCES ET DU BUDGET • RÉPUBLIQUE DE GUINÉE</p>
        </div>
      </div>
    </body>
  </html>`;

      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
    } catch (e) {
      console.error(e);
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
        <div className="flex bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 shadow-sm">
          <button onClick={() => setActiveMode('bilan')} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeMode === 'bilan' ? 'bg-[#175a95] text-white shadow-lg' : 'text-slate-400'}`}><Layout size={14}/> Bilan Accomplissements</button>
          <button onClick={() => setActiveMode('production')} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeMode === 'production' ? 'bg-[#149308] text-white shadow-lg' : 'text-slate-400'}`}><Sparkles size={14}/> Réalisations & Production</button>
          <button onClick={() => setActiveMode('pedagogique')} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeMode === 'pedagogique' ? 'bg-[#175a95] text-white shadow-lg' : 'text-slate-400'}`}><BookOpen size={14}/> Capsule du Vendredi</button>
        </div>
        {activeMode === 'bilan' && (
          <div className="flex gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 shadow-sm">
            {['MENSUEL', 'TRIMESTRIEL', 'SEMESTRIEL', 'ANNUEL'].map(p => <button key={p} onClick={() => setPeriod(p.toLowerCase() as any)} className={`px-4 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all ${period === p.toLowerCase() ? 'bg-[#175a95] text-white' : 'text-slate-400'}`}>{p}</button>)}
          </div>
        )}
        {activeMode === 'production' && (
          <div className="flex gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 shadow-sm">
            {['MENSUEL', 'TRIMESTRIEL', 'SEMESTRIEL', 'ANNUEL'].map(p => <button key={p} onClick={() => setPeriod(p.toLowerCase() as any)} className={`px-4 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all ${period === p.toLowerCase() ? 'bg-[#149308] text-white' : 'text-slate-400'}`}>{p}</button>)}
          </div>
        )}
        {(activeMode === 'bilan' || activeMode === 'production') && (
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 shadow-sm">
            <button
              onClick={goToPreviousMonth}
              className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
              title="Mois précédent"
            >
              <ChevronLeft size={16} className="text-[#175a95]" />
            </button>
            <span className="text-[10px] font-black text-slate-600 uppercase px-4 min-w-[140px] text-center">
              {['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'][displayedMonth]} {displayedYear}
            </span>
            <button
              onClick={goToNextMonth}
              className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
              title="Mois suivant"
            >
              <ChevronRight size={16} className="text-[#175a95]" />
            </button>
          </div>
        )}
      </div>

      {activeMode === 'bilan' ? (
        <div className="space-y-8"><PerformanceCardsGrid onUpdate={onExportCSV} showUpdateMessage={showUpdateMessage} period={period} allProfiles={allProfiles} /></div>
      ) : activeMode === 'production' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden">
              <div className="px-8 pt-8 pb-4 flex justify-between items-center">
                <h3 className="font-black text-slate-900 dark:text-white text-lg uppercase">Réalisations du Ministère</h3>
                <div className="flex gap-2"><button onClick={onExportCSV} className="p-2 bg-slate-100 rounded-xl hover:bg-blue-600 hover:text-white transition-all"><FileDown size={16}/></button></div>
              </div>
              <div className="max-h-[500px] overflow-y-auto divide-y divide-slate-50">
                {filteredStats.map((act, i) => (
                  <div key={i} className="px-8 py-5 flex gap-4 hover:bg-slate-50 transition-all">
                    <span className="w-7 h-7 rounded-lg bg-slate-100 text-[10px] font-black flex items-center justify-center">{i+1}</span>
                    <div className="flex-1">
                      <div className="flex gap-2 mb-1">
                        <span className="text-[9px] font-black text-[#175a95] uppercase">{act.date}</span>
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${act.workflow === 'Publié' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>{act.workflow || 'Brouillon'}</span>
                      </div>
                      <h4 className="font-black text-sm uppercase">{act.title}</h4>
                      <p className="text-[11px] text-slate-500 line-clamp-2">{act.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            {/* PANNEAU PRODUCTION OPTIMISÉ */}
            <div className="bg-gradient-to-br from-[#175a95] to-[#0d3b63] rounded-[2rem] p-6 text-white shadow-xl relative overflow-hidden">
              <Sparkles size={100} className="absolute -bottom-8 -right-8 text-white/5" />
              <h3 className="text-[10px] font-black uppercase tracking-widest mb-5 flex items-center gap-2"><Sparkles size={14} className="text-amber-400"/> Production Éditoriale Stratégique</h3>
              <div className="space-y-3">
                <button onClick={handleGenerateReport} className="group w-full py-3.5 bg-white/5 hover:bg-white/10 rounded-xl flex items-center gap-3 px-5 transition-all border border-white/5"><Printer size={15} className="text-emerald-400"/><div className="text-left"><span className="text-[10px] font-black uppercase block">Revue de Presse MEFB</span><span className="text-[8px] text-white/40 italic">Synthèse IA stratégique</span></div></button>
                <button onClick={() => handleGenerateMagazine('standard')} className="w-full py-3.5 bg-white/10 hover:bg-white/20 rounded-xl flex items-center gap-3 px-5 transition-all border border-white/10 text-left"><BookOpen size={15} className="text-blue-300"/><span className="text-[10px] font-black uppercase">Mag. Stratégique (Bleu)</span></button>
                <button onClick={() => handleGenerateMagazine('success')} className="w-full py-3.5 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-xl flex items-center gap-3 px-5 transition-all border border-emerald-500/10 text-left"><FileCheck size={15} className="text-emerald-400"/><span className="text-[10px] font-black uppercase">Bilan de Réussites</span><span className="ml-auto bg-emerald-500/30 px-2 py-0.5 rounded-full text-[9px]">{validatedActivities.length}</span></button>
              </div>
            </div>

            {/* VIGILANCE CABINET HAUTE VISIBILITÉ (Encadré Rouge) */}
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border-2 border-rose-100 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 to-orange-400" />
              <h3 className="text-[10px] font-black text-rose-600 uppercase mb-4 flex items-center gap-2"><AlertCircle size={14} className="animate-pulse"/> Vigilance Cabinet Prioritaire {urgentTasks.length > 0 && <span className="ml-auto px-2 py-0.5 rounded bg-rose-600 text-white">{urgentTasks.length}</span>}</h3>
              <div className="space-y-3">
                {urgentTasks.slice(0, 4).map((u, i) => (
                  <div key={i} className="p-4 rounded-2xl bg-rose-50/50 border border-rose-100 hover:border-rose-300 transition-all cursor-pointer">
                    <div className="flex justify-between mb-2"><span className={`text-[7px] font-black px-2 py-0.5 rounded uppercase ${u._alertType === 'critical' ? 'bg-rose-600 text-white' : 'bg-rose-100 text-rose-700'}`}>{u._alertType === 'critical' ? '🔴 CRITIQUE' : '📅 ÉCHÉANCE'}</span><span className="text-[8px] font-bold text-slate-400">{u.date}</span></div>
                    <p className="text-[11px] font-black text-slate-800 leading-tight">{u.title}</p>
                    <div className="mt-2 flex items-center gap-2"><div className="w-5 h-5 rounded-full bg-[#175a95] flex items-center justify-center text-[7px] text-white border border-white font-bold">{u.responsible?.charAt(0) || 'C'}</div><span className="text-[9px] font-bold text-slate-500 uppercase">{u.responsible || 'Cabinet'}</span></div>
                  </div>
                ))}
                {urgentTasks.length === 0 && <div className="text-center py-6"><ShieldCheck size={32} className="mx-auto text-emerald-500 mb-2"/><p className="text-[10px] font-black text-slate-400 uppercase">Situation sous contrôle</p></div>}
              </div>
            </div>
          </div>
        </div>
      ) : activeMode === 'pedagogique' ? (
        <PedagogicalModule userRole={userRole} />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-4 gap-3">
            {[{ icon: FileClock, label: 'Total', value: filteredStats.length, color: 'text-[#175a95]', bg: 'bg-blue-50' }, { icon: CheckCircle2, label: 'Validées', value: validatedActivities.length, color: 'text-emerald-600', bg: 'bg-emerald-50' }, { icon: TrendingUp, label: 'Publiées', value: filteredStats.filter(a => String(a.workflow).includes('Publi')).length, color: 'text-purple-600', bg: 'bg-purple-50' }, { icon: Circle, label: 'Brouillons', value: filteredStats.filter(a => !a.workflow || a.workflow === 'Brouillon').length, color: 'text-amber-600', bg: 'bg-amber-50' }].map((s, i) => (
              <div key={i} className={`${s.bg} rounded-2xl p-4 flex items-center gap-3`}><div className="w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center"><s.icon size={15} className={s.color}/></div><div><p className={`text-xl font-black ${s.color}`}>{s.value}</p><p className="text-[9px] font-bold text-slate-400 uppercase">{s.label}</p></div></div>
            ))}
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-4 flex gap-3">
            <div className="relative flex-1"><Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input type="text" placeholder="Rechercher une activité..." value={searchAct} onChange={e => setSearchAct(e.target.value)} className="w-full pl-8 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold outline-none focus:border-[#175a95]"/></div>
            <select value={workflowFilter} onChange={e => setWorkflowFilter(e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold outline-none">{['tous', 'valide', 'publie', 'soumis', 'brouillon'].map(f => <option key={f} value={f}>{f.toUpperCase()}</option>)}</select>
          </div>
          <div className="space-y-6">
            {journalByDate.map(([date, acts]) => (
              <div key={date}>
                <div className="flex items-center gap-3 mb-3"><div className="px-3 py-1 rounded-full text-[9px] font-black bg-slate-100 text-slate-500 uppercase">{date}</div><div className="flex-1 h-px bg-slate-100"/><span className="text-[9px] font-bold text-slate-300">{acts.length} act.</span></div>
                <div className="space-y-2">{acts.map((act, i) => (
                  <div key={i} className={`bg-white rounded-2xl border border-slate-100 p-4 flex gap-4 border-l-4 ${act.priority === 'urgent' ? 'border-l-rose-500' : 'border-l-transparent'}`}>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1"><span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-blue-50 text-[#175a95] uppercase">{act.type || 'Activité'}</span><span className="text-[8px] font-bold text-slate-300">{act.date}</span></div>
                      <h4 className="font-black text-sm uppercase">{act.title}</h4>
                      <p className="text-[11px] text-slate-500 line-clamp-1">{act.description}</p>
                    </div>
                  </div>
                ))}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};