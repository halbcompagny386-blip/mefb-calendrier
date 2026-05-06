// src/components/press/PublicationSidebar.tsx
import React from 'react';
import { X, ExternalLink, User, MessageSquareText, Clock, Calendar } from 'lucide-react';

export const PublicationSidebar = ({ pub, isOpen, onClose, allProfiles }: any) => {
  if (!isOpen || !pub) return null;

  // Fonction pour formater la date proprement
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      day: date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }),
      time: date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const formatted = formatDate(pub.published_at);

  return (
    <div className="fixed inset-y-0 right-0 w-[400px] bg-white shadow-2xl z-[100] flex flex-col animate-in slide-in-from-right duration-300">
      <div className="p-8 border-b flex justify-between items-center bg-slate-50">
        <h3 className="font-black text-[#175a95] uppercase text-sm">Détails de Publication</h3>
        <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-all"><X /></button>
      </div>

      <div className="p-8 space-y-6 flex-1 overflow-y-auto">
        {/* Liste des contributeurs */}
        <div className="space-y-3">
          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 border-b border-slate-100 pb-2">
            Équipe de production ({(pub.contributors || [pub]).length})
          </h4>
          {(pub.contributors || [pub]).map((contributor: any, idx: number) => {
            const name = contributor.publisher_name || contributor.user_name || 'Agent MEFB';
            const p = allProfiles?.find((profile: any) => 
               profile.full_name?.trim().toLowerCase() === name.trim().toLowerCase() || 
               profile.id === name
            );
            const avatarUrl = p?.avatar_url;

            return (
            <div key={contributor.id || idx} className="flex items-center gap-4 p-4 bg-blue-50 rounded-2xl border border-blue-100">
              <div className="w-12 h-12 bg-[#175a95] rounded-full flex items-center justify-center text-white shadow-inner shrink-0 overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
                ) : (
                  <User size={20} />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-[10px] font-black text-[#175a95] uppercase tracking-tighter">Contribution</p>
                  {contributor.format && (
                    <span className="px-2 py-0.5 bg-[#149308]/20 text-[#149308] text-[9px] font-black uppercase rounded-full tracking-widest border border-[#149308]/30">
                      {contributor.format}
                    </span>
                  )}
                </div>
                <p className="text-sm font-black text-slate-800 uppercase">{contributor.publisher_name}</p>
              </div>
            </div>
            );
          })}
        </div>

        {/* NOUVEAU : Horodatage Officiel */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
            <Calendar size={16} className="text-slate-400" />
            <div>
              <p className="text-[8px] font-bold text-slate-400 uppercase">Date</p>
              <p className="text-[10px] font-black text-slate-700">{formatted.day}</p>
            </div>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
            <Clock size={16} className="text-slate-400" />
            <div>
              <p className="text-[8px] font-bold text-slate-400 uppercase">Heure</p>
              <p className="text-[10px] font-black text-slate-700">{formatted.time}</p>
            </div>
          </div>
        </div>

        {/* Détails IA */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-emerald-600">
            <MessageSquareText size={18} />
            <span className="text-[10px] font-black uppercase tracking-widest">Résumé Institutionnel (IA)</span>
          </div>
          <div className="relative">
            <p className="text-xs leading-relaxed italic text-slate-600 bg-emerald-50/30 p-6 rounded-[2rem] border border-emerald-100 shadow-sm">
              "{pub.ai_summary}"
            </p>
            <div className="absolute -top-2 -left-2 bg-emerald-500 text-white p-1 rounded-full shadow-md">
                <MessageSquareText size={10} />
            </div>
          </div>
        </div>

        {/* Lien direct */}
        <a 
          href={pub.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-3 w-full py-5 bg-[#175a95] text-white rounded-2xl font-black text-xs uppercase shadow-xl shadow-blue-900/20 hover:bg-[#124a7c] transition-all group"
        >
          Voir la publication originale 
          <ExternalLink size={16} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
        </a>
      </div>
      
      <div className="p-4 bg-slate-50 border-t text-center">
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">Certification Portail MEFB 2026</p>
      </div>
    </div>
  );
};