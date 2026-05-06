import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, LayoutDashboard, FileText, 
  History, Archive, Settings, LogOut, Newspaper, Users, Loader2
} from 'lucide-react';
import { UserRole } from '../../hooks/useSupabaseAuth';
import { EditorialActivity, WorkflowStatus } from '../../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  activities: EditorialActivity[];
  profile: { full_name?: string; role?: UserRole; avatar_url?: string } | null;
  loading: boolean;
  signOut: () => void;
  onProfileClick: () => void;
}

export const Sidebar = ({ 
  activeTab, setActiveTab, isMobileMenuOpen, setIsMobileMenuOpen, activities, profile, loading, signOut, onProfileClick
}: SidebarProps) => {
  const [isSigningOut, setIsSigningOut] = useState(false);
  
  // On récupère le rôle et on le met en minuscule pour éviter les erreurs de frappe (Admin vs admin)
  const rawRole = profile?.role || 'Guest';
  const role = rawRole.toLowerCase();

  // Gestion de la déconnexion avec état de chargement
  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
    } finally {
      setIsSigningOut(false);
    }
  };

  // --- LOGIQUE D'ACCÈS GRANULAIRE PAR RÔLE ---
  const getAccessibleMenuItems = () => {
    const allItems = [
      { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard, allowedRoles: ['super_admin', 'admin', 'cabinet', 'communication', 'guest'] },
      { id: 'review', label: 'Revue de Presse', icon: Newspaper, allowedRoles: ['super_admin', 'admin', 'cabinet', 'communication', 'guest'] },
      { id: 'calendar', label: 'Calendrier Mensuel', icon: CalendarIcon, allowedRoles: ['super_admin', 'admin', 'cabinet', 'communication', 'guest'] },
      { id: 'contacts', label: 'Annuaire', icon: Users, allowedRoles: ['super_admin', 'admin'] },
      { id: 'templates', label: 'Modèles de Comm.', icon: FileText, allowedRoles: ['super_admin', 'admin', 'communication'] },
      { id: 'history', label: 'Journal Interne', icon: History, allowedRoles: ['super_admin', 'admin', 'cabinet', 'communication'] },
      { id: 'archive', label: 'Archives', icon: Archive, allowedRoles: ['super_admin', 'admin', 'cabinet', 'communication'] },
      { id: 'configuration', label: 'Paramètres', icon: Settings, allowedRoles: ['super_admin'] },
    ];

    // Super_Admin voir tout
    if (role === 'super_admin') return allItems;

    // Filtrer par rôle
    return allItems.filter(item => item.allowedRoles.includes(role));
  };

  const menuItems = getAccessibleMenuItems();

  return (
    <aside className={`fixed inset-y-0 left-0 z-50 w-72 h-screen bg-gradient-to-b from-[#1a237e] to-[#0d1245] text-white shadow-2xl transform transition-transform lg:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex flex-col h-full relative">
        {/* LOGO MEFB */}
        <div className="p-6 border-b border-white/10 bg-white/5 relative z-10 text-center">
          <div className="w-16 h-16 bg-white p-1 mx-auto rounded-2xl shadow-xl ring-2 ring-white/10 flex items-center justify-center mb-3">
            <img src="/branding/logo.png" alt="MEFB" className="w-full h-full object-contain" />
          </div>
          <h1 className="font-black text-[10px] leading-tight uppercase text-white mb-1.5">
            Ministère de l'Économie,<br/>des Finances et du Budget
          </h1>
          <p className="text-[8px] text-emerald-400 font-black uppercase tracking-widest">République de Guinée</p>
        </div>

        {/* NAVIGATION FILTRÉE */}
        <nav className="flex-1 p-6 space-y-2 overflow-y-auto relative z-10">
          {menuItems.map((item) => (
            <button 
              key={item.id}
              onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }} 
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group ${
                activeTab === item.id 
                ? 'bg-[#149308] text-white shadow-lg' 
                : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <item.icon size={20} className={activeTab === item.id ? 'text-white' : 'text-emerald-400 group-hover:text-emerald-300'} />
              <span className="text-[11px] font-black uppercase tracking-widest">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* PROFIL ACTIF AVEC RÔLE */}
        <div className="p-2 mt-auto border-t border-white/10 bg-black/20 relative z-10">
          <button 
            onClick={onProfileClick}
            className="w-full text-left relative group p-2 rounded-2xl overflow-hidden bg-white/5 border border-white/5 transition-all hover:bg-white/10 flex items-center gap-2.5"
          >
            {/* AVATAR DU PROFIL */}
            <div className="shrink-0 w-7 h-7 rounded-full border-2 border-white/20 overflow-hidden bg-[#175a95] flex items-center justify-center shadow-lg relative z-10">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-black text-[9px] uppercase">{(profile?.full_name || 'U').charAt(0)}</span>
              )}
            </div>

            {/* TEXTE DE SESSION */}
            <div className="relative z-10 flex-1 min-w-0 drop-shadow-md">
              <p className="text-[7.5px] text-emerald-400 font-black uppercase tracking-[0.2em] mb-0.5">
                Session Active
              </p>
              <p className="text-[10px] font-black text-white uppercase truncate">
                {loading ? 'Chargement...' : profile?.full_name || 'Invité'}
              </p>
              <p className="text-[7.5px] text-white/60 font-bold uppercase tracking-wider truncate">
                {loading ? '...' : profile?.role || 'Invité'}
              </p>
            </div>
          </button>
          
          {/* BOUTON DÉCONNEXION — Pro & Dynamique */}
          <button 
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="w-full mt-2.5 mb-2.5 px-4 py-2.5 flex items-center justify-center gap-2 rounded-xl font-bold text-[9px] uppercase tracking-[0.2em] transition-all duration-300 group relative overflow-hidden
              bg-gradient-to-r from-rose-500/10 to-red-500/10 border border-rose-500/30
              hover:from-rose-500/20 hover:to-red-500/20 hover:border-rose-500/50 hover:shadow-lg hover:shadow-rose-500/20
              active:scale-95
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-rose-400/0 via-rose-400/10 to-rose-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative flex items-center justify-center gap-2 text-rose-400 group-hover:text-rose-300 transition-colors">
              {isSigningOut ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Déconnexion...</span>
                </>
              ) : (
                <>
                  <LogOut size={14} className="group-hover:translate-x-0.5 transition-transform" />
                  <span>Déconnexion</span>
                </>
              )}
            </div>
          </button>

          {/* LOGO SIMANDOU DEDICATED BLOCK */}
          <div className="pt-1.5 border-t border-white/10 flex justify-center items-center">
            <img 
              src="/branding/simandou.png" 
              alt="Simandou 2040" 
              className="w-[75%] max-w-[150px] h-auto opacity-100 transition-all duration-300 pointer-events-none drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]" 
            />
          </div>
        </div>
      </div> {/* Fin de flex-col */}
    </aside>
  );
};