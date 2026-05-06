import React, { useState } from 'react';
import { Globe, Facebook, Youtube, Share2, Linkedin, Twitter, ChevronLeft, ChevronRight } from 'lucide-react';

export const CalendarView = ({ 
  activities = [], 
  publications = [], 
  onActivityClick, 
  onPubClick, 
  selectedDate = null,
  currentUserId = null,
  userWhoClickedActivityId = null,
  currentUserRole = null,
  clickedActivityUserRole = null
}: any) => {
  const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  
  // État pour la navigation entre les mois
  const today = new Date();
  const [displayedDate, setDisplayedDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  
  // Calcul du mois et année affichés
  const displayedYear = displayedDate.getFullYear();
  const displayedMonth = displayedDate.getMonth(); // 0-11
  const currentDay = today.getDate();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  // Obtenir le 1er jour du mois affiché
  const firstDayOfMonth = new Date(displayedYear, displayedMonth, 1);
  const dayOfWeek = firstDayOfMonth.getDay();
  const startingDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convertir en indice français (lun=0, dim=6)
  
  // Obtenir le nombre de jours du mois affiché
  const daysInMonth = new Date(displayedYear, displayedMonth + 1, 0).getDate();
  
  // Formater le nom du mois
  const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const monthName = `${monthNames[displayedMonth]} ${displayedYear}`;

  // Navigation mois précédent
  const goToPreviousMonth = () => {
    setDisplayedDate(new Date(displayedYear, displayedMonth - 1, 1));
  };

  // Navigation mois suivant
  const goToNextMonth = () => {
    setDisplayedDate(new Date(displayedYear, displayedMonth + 1, 1));
  };

  // Extraire le jour de la date sélectionnée (format: YYYY-MM-DD)
  const selectedDayNumber = selectedDate ? parseInt(selectedDate.split('-')[2]) : null;

  // --- ICÔNES AGRANDIES ET EN COULEUR ---
  const renderPlatformIcon = (platform: string) => {
    const p = platform?.toLowerCase() || '';
    if (p.includes('facebook')) return <Facebook size={18} className="text-[#1877F2]" />;
    if (p.includes('youtube')) return <Youtube size={18} className="text-[#FF0000]" />;
    if (p.includes('linkedin')) return <Linkedin size={18} className="text-[#0A66C2]" />;
    if (p.includes('twitter') || p === 'x') return <Twitter size={18} className="text-[#1DA1F2]" />;
    return <Globe size={18} className="text-slate-500" />;
  };

  return (
  <div className="space-y-4 animate-in fade-in duration-700">
    
    {/* 1. BANDEAU D'INSTRUCTION (Option 1 adaptée) */}
    <div className="bg-blue-50/40 border border-blue-100 rounded-[2rem] p-4 flex items-center justify-between shadow-sm backdrop-blur-sm">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-[#175a95] text-white rounded-2xl shadow-lg shadow-blue-900/20">
          <Share2 size={18} className="animate-pulse" />
        </div>
        <div>
          <h3 className="text-[10px] font-black text-[#175a95] uppercase tracking-widest mb-0.5">
            Pilotage Multicanal
          </h3>
          <p className="text-[11px] text-slate-500 font-bold italic leading-tight">
            Cliquez sur les logos (Facebook, YouTube, etc.) pour consulter les preuves de publication et les résumés IA.
          </p>
        </div>
      </div>
      <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-blue-100 shadow-sm">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="text-[9px] font-black text-slate-400 uppercase">Système Interactif</span>
      </div>
    </div>

    {/* 2. GRILLE DU CALENDRIER */}
    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
      
      {/* HEADER DU MOIS */}
      <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
        <button
          onClick={goToPreviousMonth}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          title="Mois précédent"
        >
          <ChevronLeft size={20} className="text-[#175a95]" />
        </button>
        <h2 className="text-xs font-black uppercase text-[#175a95] tracking-[0.3em]">{monthName}</h2>
        <button
          onClick={goToNextMonth}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          title="Mois suivant"
        >
          <ChevronRight size={20} className="text-[#175a95]" />
        </button>
      </div>

      {/* JOURS DE LA SEMAINE */}
      <div className="grid grid-cols-7 border-b border-slate-50 bg-slate-50/30">
        {days.map(day => (
          <div key={day} className="p-2 text-center text-[9px] font-black text-slate-400 uppercase">{day}</div>
        ))}
      </div>

      {/* GRILLE DES JOURS */}
      <div className="grid grid-cols-7 divide-x divide-y divide-slate-50">
        {Array.from({ length: 35 }).map((_, i) => {
          const dayNumber = i - startingDayIndex + 1;
          const isCurrentMonth = dayNumber > 0 && dayNumber <= daysInMonth;
          const dateString = `${displayedYear}-${(displayedMonth + 1).toString().padStart(2, '0')}-${dayNumber.toString().padStart(2, '0')}`;

          const dayActivities = isCurrentMonth 
            ? activities.filter((a: any) => a.date === dateString) 
            : [];

          const dayPubs = isCurrentMonth 
            ? publications.filter((p: any) => p.published_at?.includes(dateString)) 
            : [];

          const groupedPubsMap = new Map();
          dayPubs.forEach((p: any) => {
            if (!groupedPubsMap.has(p.url)) {
              groupedPubsMap.set(p.url, { ...p, contributors: [p] });
            } else {
              groupedPubsMap.get(p.url).contributors.push(p);
            }
          });
          const groupedPubs = Array.from(groupedPubsMap.values());

          // Vérifier si c'est aujourd'hui (uniquement si nous affichons le mois courant)
          const isToday = dayNumber === currentDay && displayedMonth === currentMonth && displayedYear === currentYear;
          const isSelectedDay = selectedDayNumber === dayNumber;
          
          // 🔒 L'animation n'est visible que pour l'utilisateur Cabinet qui a cliqué sur l'activité
          const shouldShowAnimation = isSelectedDay && 
            currentUserId === userWhoClickedActivityId && 
            currentUserRole === 'cabinet' && 
            clickedActivityUserRole === 'cabinet';

          return (
            <div key={i} className={`p-2 transition-all min-h-[100px] flex flex-col ${isCurrentMonth ? 'bg-white' : 'bg-slate-50/5'} ${
              shouldShowAnimation ? 'ring-2 ring-[#175a95] ring-inset shadow-lg shadow-blue-300/40 scale-105 bg-blue-50' : ''
            }`}>
              {isCurrentMonth && (
                <>
                  <span className={`text-[10px] font-black mb-1 w-5 h-5 flex items-center justify-center rounded-full transition-all ${
                    shouldShowAnimation
                      ? 'bg-[#175a95] text-white shadow-lg scale-125 animate-pulse'
                      : isToday
                      ? 'bg-[#175a95] text-white shadow-md'
                      : groupedPubs.length > 0
                      ? 'bg-[#149308] text-white shadow-sm'
                      : 'text-slate-300'
                  }`}>
                    {dayNumber.toString().padStart(2, '0')}
                  </span>

                  {/* Zone Icônes Réseaux Sociaux (Ton code adapté) */}
                  <div className="mt-auto flex flex-wrap gap-2 justify-center p-1 border-t border-slate-50">
                    {groupedPubs.map((pub: any, pIdx: number) => (
                      <button 
                        key={pIdx} 
                        onClick={(e) => { e.stopPropagation(); onPubClick(pub); }}
                        className="p-1 hover:scale-125 transition-transform cursor-pointer"
                        title={`${pub.platform} (${pub.contributors?.length} contributeur${pub.contributors?.length > 1 ? 's' : ''})`}
                      >
                        {renderPlatformIcon(pub.platform)}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  </div>
);
};