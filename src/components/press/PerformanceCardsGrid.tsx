// src/components/press/PerformanceCardsGrid.tsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabaseClient';
import { Globe, Video, FileText, Image as ImageIcon, Zap, Calendar, User } from 'lucide-react';

interface Publication {
  id: string;
  url: string;
  platform: string;
  format: string;
  publisher_name: string; // <-- La colonne correcte de ton image Supabase
  user_name: string;      // Sécurité
  user_role: string;
  summary: string;
  published_at: string;
  ai_summary?: string;
}

interface PerformanceCardsGridProps {
  onUpdate?: () => void;
  showUpdateMessage?: (message: string) => void;
  period?: 'mensuel' | 'trimestriel' | 'semestriel' | 'annuel';
  allProfiles?: any[];
}

export const PerformanceCardsGrid = ({ onUpdate, showUpdateMessage, period = 'mensuel', allProfiles }: PerformanceCardsGridProps) => {
  const [publications, setPublications] = useState<Publication[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- FILTRAGE PAR PÉRIODE ---
  const filteredPublications = React.useMemo(() => {
    if (!publications.length) return [];
    const now = new Date();

    return publications.filter(pub => {
      if (!pub.published_at) return true;
      const pubDate = new Date(pub.published_at);
      const diffMonths = (now.getFullYear() - pubDate.getFullYear()) * 12 + (now.getMonth() - pubDate.getMonth());

      switch (period) {
        case 'mensuel': return diffMonths === 0;
        case 'trimestriel': return diffMonths >= 0 && diffMonths < 3;
        case 'semestriel': return diffMonths >= 0 && diffMonths < 6;
        case 'annuel': return diffMonths >= 0 && diffMonths < 12;
        default: return true;
      }
    });
  }, [publications, period]);

  // --- LOGO PLATEFORME ---
  const getPlatformIcon = (platform: string) => {
    const p = platform.toLowerCase();
    if (p.includes('facebook')) return <span className="bg-blue-100 p-1.5 rounded-lg"><Globe size={14} className="text-blue-600" /></span>;
    if (p.includes('linkedin')) return <span className="bg-sky-100 p-1.5 rounded-lg"><Globe size={14} className="text-sky-700" /></span>;
    if (p.includes('youtube')) return <span className="bg-red-100 p-1.5 rounded-lg"><Video size={14} className="text-red-600" /></span>;
    return <span className="bg-slate-100 p-1.5 rounded-lg"><Zap size={14} className="text-slate-600" /></span>;
  };

  // --- CHARGEMENT ---
  useEffect(() => {
    const loadPublications = async () => {
      try {
        const { data, error } = await supabase
          .from('social_publications')
          .select('*')
          .order('published_at', { ascending: false });
        if (error) throw error;
        setPublications(data || []);
      } catch (error) {
        console.error('Erreur:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadPublications();
  }, []);

  // --- FONCTION POUR OUVRIR LES DÉTAILS D'UNE CAPSULE ---
  const handleViewDetails = (pub: Publication) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      if (showUpdateMessage) showUpdateMessage("Veuillez autoriser les fenêtres contextuelles (pop-ups).");
      return;
    }

    const themeColor = '#149308'; // Vert pour l'éducation/pédagogie
    const dateStr = pub.published_at ? new Date(pub.published_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
    
    // Parse the AI summary to extract the concept name if it's a capsule
    let conceptName = 'Capsule Pédagogique';
    let contentScript = pub.ai_summary || '';
    let contentSocial = pub.summary || '';
    let visualSuggestions: string[] = [];

    if (pub.platform === 'Capsule Pédagogique' && pub.ai_summary) {
      const text = pub.ai_summary;
      
      const conceptMatch = text.match(/^\[CONCEPT:\s*(.+?)\]/);
      if (conceptMatch) conceptName = conceptMatch[1];

      // Extraction des blocs (nouveau format sérialisé)
      if (text.includes('[SCRIPT]')) {
        const scriptMatch = text.match(/\[SCRIPT\]([\s\S]*?)(?:\[SOCIAL\]|\[VISUALS\]|$)/);
        if (scriptMatch) contentScript = scriptMatch[1].trim();

        const socialMatch = text.match(/\[SOCIAL\]([\s\S]*?)(?:\[VISUALS\]|$)/);
        if (socialMatch) contentSocial = socialMatch[1].trim();

        const visualsMatch = text.match(/\[VISUALS\]([\s\S]*?)$/);
        if (visualsMatch) {
          visualSuggestions = visualsMatch[1].trim().split('\\n').map(l => l.trim()).filter(l => l);
        }
      } else {
        // Ancien format
        contentScript = text.replace(/^\[CONCEPT:.+?\]\n\n?/, '');
      }
    }

    const institutionalStyle = `
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
        
        .section-title { font-family:'Playfair Display'; font-size:24px; font-weight:700; color:#0f172a; margin-top:30px; margin-bottom:15px; line-height:1.3; }
        .suggestion-item { background: white; padding: 16px 20px; border-radius: 10px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid #f1f5f9; display: flex; align-items: center; gap: 12px; margin-bottom: 10px; font-size: 14px; color: #334155; }
        .suggestion-item::before { content: "🎨"; font-size: 18px; }

        @media print { .top-bar { display: none; } body { background: white; } .content-area { box-shadow: none; margin-top: 0; } .watermark-bg { opacity: 0.08; } }
      </style>
    `;

    const socialSection = contentSocial && contentSocial !== contentScript ? `
      <h2 class="section-title">Contenu Réseaux Sociaux</h2>
      <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:24px; border-radius:14px;">
        <p style="color:#64748b; font-size:15px; line-height:1.7; white-space: pre-wrap;">${contentSocial}</p>
      </div>
    ` : '';

    const visualSection = visualSuggestions.length > 0 ? `
      <h2 class="section-title">Suggestions Visuelles (Infographies)</h2>
      <div style="background:#f1f5f9; padding:20px; border-radius:14px;">
        ${visualSuggestions.map(s => `<div class="suggestion-item">${s}</div>`).join('')}
      </div>
    ` : '';

    const htmlContent = `
  <!DOCTYPE html>
  <html lang="fr">
    <head>
      <meta charset="UTF-8" />
      <title>Détails Capsule • ${conceptName}</title>
      ${institutionalStyle}
    </head>
    <body>
      <div class="top-bar">
        <div style="display:flex; align-items:center; gap:16px;">
          <button onclick="window.print()" class="btn-download" id="dlBtn">🖨️ Imprimer la fiche</button>
        </div>
      </div>
      <div id="pdf-root">
        <img src="${window.location.origin}/branding/logo.png" class="watermark-bg" />
        <div class="header-doc">
          <div class="branding-container">
            <img src="${window.location.origin}/branding/logo.png" class="logo-img" />
            <img src="${window.location.origin}/branding/simandou.png" class="simandou-img" />
          </div>
          <h1 style="font-family:'Playfair Display'; font-size: 36px; font-weight: 900; margin: 0 0 10px;">Fiche Pédagogique</h1>
          <p style="text-transform: uppercase; letter-spacing: 2px; opacity: 0.85; font-size: 12px;">Concept : ${conceptName} • ${dateStr}</p>
        </div>
        <div class="content-area">
          <div style="margin-bottom: 30px;">
            <p style="font-size:10px; font-weight:900; color:${themeColor}; text-transform:uppercase; letter-spacing:1px; margin-bottom:10px;">Publié par : ${pub.publisher_name || pub.user_name || 'Agent MEFB'}</p>
            
            <h2 class="section-title" style="margin-top:0;">Script Vidéo Optimisé par IA</h2>
            <div style="background:#eff6ff; border-left:5px solid ${themeColor}; padding:28px 32px; border-radius:14px; margin-bottom: 20px;">
              <pre style="font-family:'Inter',sans-serif; color:#334155; font-size:15px; line-height:1.8; white-space: pre-wrap;">${contentScript}</pre>
            </div>
            
            ${socialSection}
            
            ${visualSection}
            
          </div>
        </div>
        <div class="footer-doc">
          <img src="${window.location.origin}/branding/Branding.png" class="footer-branding" />
          <p>DOCUMENT OFFICIEL • CABINET MEFB • ${new Date().getFullYear()}</p>
        </div>
      </div>
    </body>
  </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  if (isLoading) return <div className="text-center py-20 font-black text-[#175a95] animate-pulse">CHARGEMENT DU BILAN...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPublications.map((pub, index) => {
          const isCapsule = pub.platform === 'Capsule Pédagogique';
          
          let displaySummary = pub.ai_summary || pub.summary || "Synthèse en cours de validation...";
          if (isCapsule) {
            // S'il y a un tag SCRIPT on l'utilise pour le résumé d'affichage
            if (displaySummary.includes('[SCRIPT]')) {
              const m = displaySummary.match(/\[SCRIPT\]([\s\S]*?)(?:\[SOCIAL\]|\[VISUALS\]|$)/);
              if (m) displaySummary = m[1].trim().slice(0, 150) + '...';
            } else if (displaySummary.startsWith('[CONCEPT:')) {
              displaySummary = displaySummary.replace(/^\[CONCEPT:.+?\]\n\n?/, '').slice(0, 150) + '...';
            }
          }

          return (
            <motion.div
              key={pub.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative rounded-[2rem] bg-white border-2 border-slate-100 shadow-xl overflow-hidden flex flex-col h-full"
            >
              <div className="p-6 pb-4 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3">
                  {getPlatformIcon(pub.platform)}
                  <span className="text-[10px] font-black uppercase text-slate-800 tracking-widest">{pub.platform}</span>
                </div>
                <div className="w-7 h-7 bg-[#149308] rounded-full flex items-center justify-center shadow-lg shadow-green-900/20">
                  <span className="text-white text-xs font-black">✓</span>
                </div>
              </div>

              <div className="p-6 pt-2 flex-1 flex flex-col">
                <div className="mb-5">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Responsable Communication</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#175a95] rounded-xl flex items-center justify-center text-white font-black text-sm overflow-hidden shadow-inner shrink-0">
                      {(() => {
                        const name = pub.publisher_name || pub.user_name || 'Agent MEFB';
                        const p = allProfiles?.find(profile => 
                          profile.full_name?.trim().toLowerCase() === name.trim().toLowerCase() || 
                          profile.id === name
                        );
                        if (p?.avatar_url) {
                          return <img src={p.avatar_url} alt={name} className="w-full h-full object-cover" />;
                        }
                        return name[0].toUpperCase();
                      })()}
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 text-base uppercase tracking-tight">
                        {pub.publisher_name || pub.user_name || 'Agent MEFB'}
                      </h4>
                      <p className="text-[9px] font-bold text-[#149308] uppercase tracking-tighter">
                        {pub.user_role || 'Service Com'} &bull; {pub.format}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4 mb-5 flex-1 border border-slate-100">
                  <p className="text-[11px] text-slate-700 leading-relaxed font-medium italic">
                    "{displaySummary}"
                  </p>
                </div>

                <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-50">
                  <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase">
                    <Calendar size={12} />
                    {new Date(pub.published_at).toLocaleDateString('fr-FR')}
                  </div>
                  
                  {isCapsule ? (
                    <button
                      onClick={() => handleViewDetails(pub)}
                      className="px-4 py-2 bg-[#149308] text-white text-[9px] font-black uppercase rounded-xl hover:bg-green-700 transition-all shadow-md active:scale-95 flex items-center gap-1"
                    >
                      Voir les détails
                    </button>
                  ) : (
                    <a
                      href={pub.url} target="_blank" rel="noreferrer"
                      className="px-4 py-2 bg-[#175a95] text-white text-[9px] font-black uppercase rounded-xl hover:bg-[#124a7d] transition-all shadow-md active:scale-95"
                    >
                      Voir la preuve
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {filteredPublications.length === 0 && (
        <div className="text-center py-20 bg-white rounded-[3rem] border-4 border-dashed border-slate-100">
          <p className="text-slate-400 font-black uppercase text-xs tracking-[0.3em]">Aucune activité pour cette période</p>
        </div>
      )}
    </div>
  );
};