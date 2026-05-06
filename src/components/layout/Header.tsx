import React from 'react';
import { Menu, Plus, Sparkles, Bell } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setIsMobileMenuOpen: (open: boolean) => void;
  onAddActivity: () => void;
  onGoToTemplates: () => void;
  pendingValidationCount: number;  // articles en attente (pour Cabinet)
  onOpenValidation: () => void;
  userRole?: string;               // rôle utilisé pour le RBAC
  userName?: string;
  loading?: boolean;
  commNotifCount?: number;         // articles validés/rejetés (pour Communication)
  onOpenCommNotif?: () => void;
  className?: string;
}

export const Header = ({
  activeTab,
  setIsMobileMenuOpen,
  onAddActivity,
  onGoToTemplates,
  pendingValidationCount,
  onOpenValidation,
  userRole,
  userName,
  loading = false,
  commNotifCount = 0,
  onOpenCommNotif,
  className
}: HeaderProps) => {

  const normalizedRole = userRole?.toString().trim().toLowerCase();
  const isCabinet = normalizedRole === 'cabinet' || normalizedRole === 'admin' || normalizedRole === 'super_admin' || normalizedRole === 'pdg admin' || normalizedRole === 'super-admin';
  const isCommMode = activeTab === 'dashboard' || activeTab === 'templates';

  // Pages où le bouton "NOUVELLE ENTRÉE" doit être masqué
  const hideAddButton = activeTab === 'contacts' || activeTab === 'press' || activeTab === 'review' || activeTab === 'history' || activeTab === 'calendar' || activeTab === 'archive' || activeTab === 'configuration' || activeTab === 'templates';

  const titles: Record<string, string> = {
    dashboard: "Vue d'ensemble",
    calendar: "Calendrier Éditorial",
    templates: "Centre de Production IA",
    history: "Journal Interne",
    archive: "Archives",
    configuration: "Paramètres",
    review: "Revue de Presse",
    press: "Revue de Presse",
    contacts: "Annuaire du Cabinet"
  };

  const displayRole = loading 
    ? 'Chargement...' 
    : (normalizedRole === 'guest' ? 'Observateur' : userRole) || 'Utilisateur';
  const displayName = loading ? 'Chargement...' : (userName || (normalizedRole === 'guest' ? 'Observateur' : 'Utilisateur'));

  return (
    <header className="h-16 md:h-20 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 shrink-0 sticky top-0 z-30">
      <div className="flex items-center gap-2 md:gap-4">
        <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2.5 hover:bg-slate-100 rounded-xl transition-colors">
          <Menu className="w-5 h-5 text-slate-600" />
        </button>
        <h2 className="text-sm md:text-lg font-black text-slate-800 tracking-tight truncate max-w-[120px] sm:max-w-[200px] md:max-w-none">
          {titles[activeTab] || activeTab}
        </h2>
      </div>

      <div className="flex items-center gap-3 md:gap-6">

        {/* NOTIFICATION CABINET — Déclare à valider (visible uniquement pour Cabinet) */}
        {isCabinet && pendingValidationCount > 0 && (
          <button
            onClick={onOpenValidation}
            title={`${pendingValidationCount} dossier(s) en attente de validation`}
            className="relative p-2.5 bg-emerald-50 text-[#149308] rounded-xl hover:bg-emerald-100 transition-all group"
          >
            <Bell size={20} className="group-hover:rotate-12 transition-transform animate-pulse" />
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#149308] text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white">
              {pendingValidationCount}
            </span>
          </button>
        )}

        {/* NOTIFICATION COMMUNICATION — Dossiers validés ou rejetés (visible pour Communication) */}
        {!isCabinet && commNotifCount > 0 && (
          <button
            onClick={onOpenCommNotif}
            title={`${commNotifCount} dossier(s) traité(s) par le Cabinet`}
            className="relative p-2.5 bg-blue-50 text-[#175a95] rounded-xl hover:bg-blue-100 transition-all group"
          >
            <Bell size={20} className="group-hover:rotate-12 transition-transform animate-pulse" />
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#175a95] text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white">
              {commNotifCount}
            </span>
          </button>
        )}

        {/* BOUTON D'ACTION — masqué sur Annuaire et Revue de Presse */}
        {!hideAddButton && (
          <button
            onClick={isCommMode ? onGoToTemplates : onAddActivity}
            className={`px-3 md:px-5 py-2 md:py-2.5 rounded-xl md:rounded-2xl text-xs md:text-sm font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg active:scale-95 border-b-4 ${isCommMode
              ? 'bg-[#149308] hover:bg-green-700 text-white border-green-900 shadow-green-100'
              : 'bg-[#1A237E] hover:bg-indigo-900 text-white border-indigo-900 shadow-indigo-100'
              }`}
          >
            {isCommMode ? (
              <><Sparkles size={16} strokeWidth={3} /><span className="hidden sm:inline">Nouvelle Production</span></>
            ) : (
              <><Plus size={16} strokeWidth={3} /><span className="hidden sm:inline">Nouvelle Entrée</span></>
            )}
          </button>
        )}

        <div className="hidden md:flex flex-col items-end text-right text-slate-600">
          <span className="text-xs font-black text-slate-800 uppercase tracking-[0.16em] leading-none">
            {displayName}
          </span>
          <span className="mt-1 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-600">
            {displayRole}
          </span>
        </div>
      </div>
    </header>
  );
};
