import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings, Save, Loader2,
  Moon, Sun, BotMessageSquare, Database, Key, Users,
  Wifi, Activity, CheckCircle2, XCircle,
  Zap, Clock, Server, RefreshCw, Info, ChevronRight,
  Bell, Palette, Globe, Eye, EyeOff, AlertTriangle, Power,
  ShieldCheck, Stethoscope, X
} from 'lucide-react';
import { testGroqConnection, testSupabaseConnection, ApiTestResult } from '../../services/apiTester';
import { UserManagement } from '../admin/UserManagement';
import { AuditView } from '../admin/AuditView';
import { supabase } from '../../lib/supabaseClient';

interface ConfigurationProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  aiTone: 'diplomatic' | 'direct' | 'creative';
  setAiTone: (tone: 'diplomatic' | 'direct' | 'creative') => void;
  role: any;
  fullName?: string;
  onMaintenanceChange?: (active: boolean, activatedBy?: string) => void;
  showUpdateMessage?: (message: string) => void;
}

interface ServiceStatus {
  loading: boolean;
  result: ApiTestResult | null;
  lastCheck: Date | null;
}

const defaultStatus: ServiceStatus = { loading: false, result: null, lastCheck: null };

// Clé localStorage pour persistance notifications/langue
const NOTIF_KEY  = 'mefb_notifications';
const LANG_KEY   = 'mefb_language';

const defaultNotifs = {
  validations: true,
  agenda:      true,
  sync:        true,
};

export const ConfigurationView = ({
  theme, toggleTheme, aiTone, setAiTone, role, fullName,
  onMaintenanceChange, showUpdateMessage
}: ConfigurationProps) => {
  const [showUserAdmin,   setShowUserAdmin]   = useState(false);
  const [showAudit,       setShowAudit]       = useState(false);
  const [groqStatus,      setGroqStatus]      = useState<ServiceStatus>(defaultStatus);
  const [supaStatus,      setSupaStatus]      = useState<ServiceStatus>(defaultStatus);
  const [showGroqKey,     setShowGroqKey]     = useState(false);
  const [saveFlash,       setSaveFlash]       = useState(false);
  const [activeSection,   setActiveSection]   = useState<'general' | 'editorial' | 'api' | 'users'>('general');
  const [maintenanceOn,   setMaintenanceOn]   = useState(false);
  const [maintLoading,    setMaintLoading]    = useState(false);
  const [confirmMaint,    setConfirmMaint]    = useState(false);

  // ── Langue (persistée dans localStorage) ──
  const [language, setLanguage] = useState<'fr' | 'en'>(
    () => (localStorage.getItem(LANG_KEY) as 'fr' | 'en') || 'fr'
  );

  // ── Notifications (persistées dans localStorage) ──
  const [notifs, setNotifs] = useState(() => {
    try { return JSON.parse(localStorage.getItem(NOTIF_KEY) || '{}'); }
    catch { return defaultNotifs; }
  });

  useEffect(() => { localStorage.setItem(LANG_KEY, language); }, [language]);
  useEffect(() => { localStorage.setItem(NOTIF_KEY, JSON.stringify(notifs)); }, [notifs]);

  const toggleNotif = (key: keyof typeof defaultNotifs) =>
    setNotifs((prev: typeof defaultNotifs) => ({ ...prev, [key]: !prev[key] }));

  // ── RBAC ──
  const normalizedRole     = role?.toString().trim().toLowerCase();
  const isAdmin            = ['admin', 'super_admin', 'super-admin'].includes(normalizedRole);
  const isSuperAdmin       = ['super_admin', 'super-admin'].includes(normalizedRole);
  const isCommunication    = ['communication', 'service communication'].includes(normalizedRole);
  const showEditorialPanel = isCommunication || isAdmin;

  // ── Clés env ──
  const groqKey   = import.meta.env.VITE_GROQ_API_KEY   || '';
  const supaUrl   = import.meta.env.VITE_SUPABASE_URL   || '';
  const maskedKey = groqKey
    ? (showGroqKey ? groqKey : groqKey.slice(0, 8) + '••••••••••••••' + groqKey.slice(-4))
    : 'Non configurée';

  // ── Tests API ──
  const runGroqTest = async () => {
    setGroqStatus(prev => ({ ...prev, loading: true, result: null }));
    const result = await testGroqConnection();
    setGroqStatus({ loading: false, result, lastCheck: new Date() });
  };

  const runSupabaseTest = async () => {
    setSupaStatus(prev => ({ ...prev, loading: true, result: null }));
    const result = await testSupabaseConnection();
    setSupaStatus({ loading: false, result, lastCheck: new Date() });
  };

  const runAllTests = async () => {
    await Promise.all([runGroqTest(), runSupabaseTest()]);
  };

  // ── Mode maintenance via Supabase Realtime broadcast ──
  const broadcastMaintenance = useCallback(async (active: boolean) => {
    setMaintLoading(true);
    try {
      const channel = supabase.channel('app-control');
      await channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.send({
            type: 'broadcast',
            event: 'maintenance',
            payload: { active, activatedBy: fullName || role }
          });
          supabase.removeChannel(channel);
          setMaintenanceOn(active);
          onMaintenanceChange?.(active, fullName || role);
          setConfirmMaint(false);
        }
      });
    } finally {
      setMaintLoading(false);
    }
  }, [fullName, role, onMaintenanceChange]);

  const handleSave = () => {
    setSaveFlash(true);
    if (showUpdateMessage) showUpdateMessage('✅ Paramètres systèmes mis à jour avec succès');
    setTimeout(() => setSaveFlash(false), 2800);
  };

  // ── Sous-composant badge statut ──
  const StatusBadge = ({ result, loading }: { result: ApiTestResult | null; loading: boolean }) => {
    if (loading) return (
      <span className="flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-600 rounded-full text-[9px] font-black uppercase">
        <Loader2 size={10} className="animate-spin" /> Test...
      </span>
    );
    if (!result) return (
      <span className="px-2 py-1 bg-slate-100 dark:bg-white/10 text-slate-400 rounded-full text-[9px] font-black uppercase">Non testé</span>
    );
    return result.success
      ? <span className="flex items-center gap-1 px-2 py-1 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-full text-[9px] font-black uppercase"><CheckCircle2 size={10} /> OK</span>
      : <span className="flex items-center gap-1 px-2 py-1 bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 rounded-full text-[9px] font-black uppercase"><XCircle size={10} /> Erreur</span>;
  };

  const navItems = [
    { id: 'general',   label: 'Général',       icon: Palette,          visible: true },
    { id: 'editorial', label: 'Éditorial',     icon: BotMessageSquare, visible: showEditorialPanel },
    { id: 'api',       label: 'API & Système', icon: Server,           visible: isAdmin },
    { id: 'users',     label: 'Utilisateurs',  icon: Users,            visible: isAdmin },
  ].filter(n => n.visible);

  return (
    <div className="max-w-5xl mx-auto pb-24 animate-in fade-in duration-500">

      {/* ─── HERO HEADER ─── */}
      <div className="relative bg-gradient-to-br from-[#0f3d6b] via-[#175a95] to-[#1e88e5] p-8 rounded-[2.5rem] mb-8 overflow-hidden shadow-2xl shadow-blue-900/40">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -right-20 -top-20 w-64 h-64 rounded-full bg-white/5" />
          <div className="absolute right-20 bottom-0 w-40 h-40 rounded-full bg-[#149308]/10" />
        </div>
        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur border border-white/10">
              <Settings className="text-white" size={28} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Paramètres du Système</h3>
              <p className="text-[11px] text-blue-200 font-bold uppercase tracking-wider mt-1">
                Portail Éditorial MEFB — <span className="text-emerald-300">{role}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {[
              { label: 'Groq AI', result: groqStatus.result, loading: groqStatus.loading },
              { label: 'Supabase', result: supaStatus.result, loading: supaStatus.loading },
            ].map(({ label, result, loading }) => (
              <div key={label} className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/10 rounded-2xl backdrop-blur">
                <StatusBadge result={result} loading={loading} />
                <span className="text-[9px] text-white/60 uppercase font-bold">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">

        {/* ─── NAVIGATION ─── */}
        <nav className="space-y-2">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id as any)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all text-left ${
                activeSection === id
                  ? 'bg-[#175a95] text-white shadow-lg shadow-blue-900/20'
                  : 'bg-white dark:bg-[#161e2d] text-slate-400 hover:text-[#175a95] hover:bg-blue-50 dark:hover:bg-white/5 border border-slate-100 dark:border-white/5'
              }`}
            >
              <Icon size={15} />
              {label}
              {activeSection === id && <ChevronRight size={12} className="ml-auto" />}
            </button>
          ))}

          {/* ── BOUTON MAINTENANCE (Super Admin uniquement) ── */}
          {isSuperAdmin && (
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/5">
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-3 px-2">Administration Système</p>
              
          {/* ── BOUTON AUDIT ── */}
              <button
                onClick={() => setShowAudit(true)}
                className="w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl text-[10px] sm:text-[11px] font-black uppercase tracking-wider transition-all text-left mb-2 bg-white dark:bg-[#161e2d] text-blue-600 dark:text-blue-400 border-2 border-blue-200 dark:border-blue-500/20 hover:bg-blue-50 dark:hover:bg-blue-500/10 shadow-sm"
              >
                <Stethoscope size={14} className="sm:w-[15px] sm:h-[15px] shrink-0" />
                <span className="truncate">Audit Système</span>
              </button>

              {/* Bouton Maintenance */}
              <button
                onClick={() => setConfirmMaint(true)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all text-left border-2 ${
                  maintenanceOn
                    ? 'bg-rose-600 text-white border-rose-700 shadow-lg shadow-rose-900/30 animate-pulse'
                    : 'bg-white dark:bg-[#161e2d] text-rose-500 border-rose-200 dark:border-rose-500/20 hover:bg-rose-50 dark:hover:bg-rose-500/10'
                }`}
              >
                <Power size={15} />
                {maintenanceOn ? 'Désactiver' : 'Activer'} Maintenance
                {maintenanceOn && (
                  <span className="ml-auto w-2 h-2 rounded-full bg-white animate-ping" />
                )}
              </button>
            </div>
          )}
        </nav>

        {/* ─── PANNEAUX ─── */}
        <div className="space-y-6">

          {/* ══ GÉNÉRAL ══ */}
          {activeSection === 'general' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Apparence & Interface</h4>

              {/* Mode sombre */}
              <div className="bg-white dark:bg-[#161e2d] p-6 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${theme === 'dark' ? 'bg-slate-800' : 'bg-amber-50'}`}>
                      {theme === 'light' ? <Sun className="text-amber-500" size={20} /> : <Moon className="text-blue-400" size={20} />}
                    </div>
                    <div>
                      <p className="font-black text-xs uppercase tracking-wide dark:text-white">Mode {theme === 'dark' ? 'Sombre' : 'Clair'}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Interface adaptée au Ministère</p>
                    </div>
                  </div>
                  <button
                    onClick={toggleTheme}
                    className={`w-14 h-7 rounded-full transition-all relative ${theme === 'dark' ? 'bg-[#149308]' : 'bg-slate-200'}`}
                  >
                    <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all ${theme === 'dark' ? 'left-8' : 'left-1'}`} />
                  </button>
                </div>
              </div>

              {/* ── Langue & Région ── RÉEL et INTERACTIF */}
              <div className="bg-white dark:bg-[#161e2d] p-6 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <Globe size={16} className="text-[#175a95]" />
                  <p className="font-black text-xs uppercase tracking-wide dark:text-white">Langue & Région</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { key: 'fr', label: 'Français (FR)' },
                    { key: 'en', label: 'English (EN)' },
                  ] as const).map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setLanguage(key)}
                      className={`py-3 rounded-xl text-[10px] font-black uppercase border-2 transition-all ${
                        language === key
                          ? 'bg-[#175a95] text-white border-[#175a95] shadow-lg shadow-blue-900/20'
                          : 'bg-slate-50 dark:bg-white/5 text-slate-400 border-slate-100 dark:border-white/10 hover:border-[#175a95]/40 hover:text-[#175a95]'
                      }`}
                    >
                      {label}
                      {language === key && (
                        <span className="ml-2 text-[8px] opacity-80">✓ Actif</span>
                      )}
                    </button>
                  ))}
                </div>
                <div className="mt-3 p-3 bg-slate-50 dark:bg-white/5 rounded-xl">
                  <p className="text-[9px] text-slate-400 leading-relaxed">
                    <span className="font-bold text-slate-500 dark:text-slate-300">Langue sélectionnée :</span> {language === 'fr' ? 'Français — Format JJ/MM/AAAA — Fuseau GMT+0 (Conakry)' : 'English — Format MM/DD/YYYY — Timezone GMT+0 (Conakry)'}
                  </p>
                  {language === 'en' && (
                    <p className="text-[9px] text-amber-500 mt-1">⚠ Note : L'interface principale reste en français (langue officielle du Ministère)</p>
                  )}
                </div>
              </div>

              {/* ── Notifications ── RÉELLES et INTERACTIVES */}
              <div className="bg-white dark:bg-[#161e2d] p-6 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <Bell size={16} className="text-[#175a95]" />
                    <p className="font-black text-xs uppercase tracking-wide dark:text-white">Notifications</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase ${
                    Object.values(notifs).some(Boolean)
                      ? 'bg-emerald-100 text-emerald-600'
                      : 'bg-slate-100 text-slate-400'
                  }`}>
                    {Object.values(notifs).filter(Boolean).length}/{Object.keys(notifs).length} actives
                  </span>
                </div>
                <div className="space-y-1">
                  {([
                    { key: 'validations', label: 'Validations Cabinet',    desc: 'Alerte quand un dossier est traité par le Cabinet', icon: ShieldCheck },
                    { key: 'agenda',      label: 'Rappels Agenda',          desc: 'Activités prévues dans les 48h',                    icon: Clock },
                    { key: 'sync',        label: 'Synchronisation temps réel', desc: 'Mise à jour automatique Supabase en arrière-plan', icon: Wifi },
                  ] as const).map(({ key, label, desc, icon: Icon }) => (
                    <div
                      key={key}
                      className={`flex items-center justify-between p-4 rounded-xl transition-all cursor-pointer ${
                        notifs[key]
                          ? 'bg-emerald-50/60 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/10'
                          : 'bg-slate-50 dark:bg-white/5 border border-transparent'
                      }`}
                      onClick={() => toggleNotif(key)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${notifs[key] ? 'bg-emerald-100 dark:bg-emerald-500/20' : 'bg-slate-100 dark:bg-white/10'}`}>
                          <Icon size={15} className={notifs[key] ? 'text-emerald-600' : 'text-slate-400'} />
                        </div>
                        <div>
                          <p className={`text-[11px] font-bold ${notifs[key] ? 'dark:text-white text-slate-700' : 'text-slate-400'}`}>{label}</p>
                          <p className="text-[9px] text-slate-400">{desc}</p>
                        </div>
                      </div>
                      <div
                        className={`w-10 h-5 rounded-full transition-all relative ml-4 shrink-0 ${notifs[key] ? 'bg-[#149308]' : 'bg-slate-200 dark:bg-white/10'}`}
                      >
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${notifs[key] ? 'left-5' : 'left-0.5'}`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══ ÉDITORIAL ══ */}
          {activeSection === 'editorial' && showEditorialPanel && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Ligne Éditoriale & IA</h4>

              <div className="bg-white dark:bg-[#161e2d] p-6 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm">
                <div className="flex items-center gap-3 mb-5">
                  <BotMessageSquare size={16} className="text-[#175a95]" />
                  <p className="font-black text-xs uppercase tracking-wide dark:text-white">Tonalité des contenus IA</p>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {([
                    { key: 'diplomatic', label: 'Officiel', desc: 'Ton solennel, langage administratif. Adapté aux communiqués et rapports du Cabinet.' },
                    { key: 'direct',     label: 'Direct',   desc: 'Ton clair et percutant. Adapté aux réseaux sociaux et communiqués rapides.' },
                  ] as const).map(({ key, label, desc }) => (
                    <button
                      key={key}
                      onClick={() => setAiTone(key)}
                      className={`p-4 rounded-2xl text-left border-2 transition-all ${
                        aiTone === key
                          ? 'bg-[#175a95]/5 border-[#175a95] shadow-md'
                          : 'bg-slate-50 dark:bg-white/5 border-transparent hover:border-slate-200 dark:hover:border-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p className={`text-[11px] font-black uppercase tracking-wide ${aiTone === key ? 'text-[#175a95]' : 'text-slate-600 dark:text-slate-300'}`}>{label}</p>
                        {aiTone === key && <CheckCircle2 size={14} className="text-[#175a95]" />}
                      </div>
                      <p className="text-[10px] text-slate-400 leading-relaxed">{desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white dark:bg-[#161e2d] p-6 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <Zap size={16} className="text-amber-500" />
                  <p className="font-black text-xs uppercase tracking-wide dark:text-white">Modèle IA actif</p>
                </div>
                <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
                  <div className="w-8 h-8 bg-[#175a95]/10 rounded-lg flex items-center justify-center"><Zap size={14} className="text-[#175a95]" /></div>
                  <div className="flex-1">
                    <p className="text-[11px] font-black dark:text-white">llama-3.3-70b-versatile</p>
                    <p className="text-[9px] text-slate-400">Groq API — 70B paramètres — Ultra rapide</p>
                  </div>
                  <StatusBadge result={groqStatus.result} loading={groqStatus.loading} />
                </div>
              </div>
            </div>
          )}

          {/* ══ API & SYSTÈME ══ */}
          {activeSection === 'api' && isAdmin && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Diagnostic des Services</h4>
                <button
                  onClick={runAllTests}
                  disabled={groqStatus.loading || supaStatus.loading}
                  className="flex items-center gap-2 px-4 py-2 bg-[#175a95] text-white rounded-xl text-[9px] font-black uppercase hover:bg-blue-800 transition-all disabled:opacity-50"
                >
                  <RefreshCw size={12} className={groqStatus.loading || supaStatus.loading ? 'animate-spin' : ''} />
                  Tout tester
                </button>
              </div>

              {/* GROQ */}
              <div className="bg-white dark:bg-[#161e2d] rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-50 dark:bg-purple-500/10 rounded-xl flex items-center justify-center">
                        <Zap size={18} className="text-purple-600" />
                      </div>
                      <div>
                        <p className="font-black text-xs uppercase tracking-wide dark:text-white">Groq AI (Llama 3.3)</p>
                        <p className="text-[9px] text-slate-400">Génération de contenus éditoriaux</p>
                      </div>
                    </div>
                    <StatusBadge result={groqStatus.result} loading={groqStatus.loading} />
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-white/5 rounded-xl mb-4">
                    <Key size={12} className="text-slate-400 flex-shrink-0" />
                    <code className="text-[10px] font-mono text-slate-600 dark:text-slate-300 flex-1 truncate">{maskedKey}</code>
                    <button onClick={() => setShowGroqKey(v => !v)} className="text-slate-300 hover:text-[#175a95] transition-colors">
                      {showGroqKey ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {groqStatus.result && (
                    <div className={`p-4 rounded-xl mb-4 ${groqStatus.result.success ? 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100' : 'bg-rose-50 dark:bg-rose-500/10 border border-rose-100'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        {groqStatus.result.success ? <CheckCircle2 size={14} className="text-emerald-600" /> : <XCircle size={14} className="text-rose-600" />}
                        <p className={`text-[11px] font-black ${groqStatus.result.success ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                          {groqStatus.result.message}
                        </p>
                      </div>
                      {groqStatus.result.details && <p className="text-[10px] text-slate-500 mt-1">{groqStatus.result.details}</p>}
                      <div className="flex items-center gap-3 mt-2">
                        {groqStatus.result.latencyMs != null && (
                          <span className="flex items-center gap-1 text-[9px] font-bold text-slate-400"><Clock size={10} /> {groqStatus.result.latencyMs} ms</span>
                        )}
                        {groqStatus.result.model && (
                          <span className="flex items-center gap-1 text-[9px] font-bold text-slate-400"><Activity size={10} /> {groqStatus.result.model}</span>
                        )}
                        {groqStatus.lastCheck && (
                          <span className="text-[9px] text-slate-300">{groqStatus.lastCheck.toLocaleTimeString('fr-FR')}</span>
                        )}
                      </div>
                    </div>
                  )}
                  <button onClick={runGroqTest} disabled={groqStatus.loading}
                    className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-[10px] font-black uppercase transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    {groqStatus.loading ? <><Loader2 size={14} className="animate-spin" /> Test...</> : <><Wifi size={14} /> Tester Groq</>}
                  </button>
                </div>
              </div>

              {/* SUPABASE */}
              <div className="bg-white dark:bg-[#161e2d] rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl flex items-center justify-center">
                        <Database size={18} className="text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-black text-xs uppercase tracking-wide dark:text-white">Supabase (Base de données)</p>
                        <p className="text-[9px] text-slate-400">Stockage agenda, publications, utilisateurs</p>
                      </div>
                    </div>
                    <StatusBadge result={supaStatus.result} loading={supaStatus.loading} />
                  </div>
                  {supaStatus.result && (
                    <div className={`p-4 rounded-xl mb-4 ${supaStatus.result.success ? 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100' : 'bg-rose-50 dark:bg-rose-500/10 border border-rose-100'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        {supaStatus.result.success ? <CheckCircle2 size={14} className="text-emerald-600" /> : <XCircle size={14} className="text-rose-600" />}
                        <p className={`text-[11px] font-black ${supaStatus.result.success ? 'text-emerald-700' : 'text-rose-700'}`}>{supaStatus.result.message}</p>
                      </div>
                      {supaStatus.result.details && <p className="text-[10px] text-slate-500 mt-1">{supaStatus.result.details}</p>}
                      {supaStatus.result.latencyMs != null && <span className="flex items-center gap-1 text-[9px] font-bold text-slate-400 mt-2"><Clock size={10} /> {supaStatus.result.latencyMs} ms</span>}
                    </div>
                  )}
                  <button onClick={runSupabaseTest} disabled={supaStatus.loading}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    {supaStatus.loading ? <><Loader2 size={14} className="animate-spin" /> Test...</> : <><Server size={14} /> Tester Supabase</>}
                  </button>
                </div>
              </div>

              {/* Variables env */}
              <div className="bg-slate-50 dark:bg-white/5 p-5 rounded-2xl border border-slate-100 dark:border-white/5">
                <div className="flex items-center gap-2 mb-3">
                  <Info size={13} className="text-slate-400" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Variables d'environnement</p>
                </div>
                <div className="space-y-2">
                  {[
                    { key: 'VITE_GROQ_API_KEY',     val: groqKey ? '✅ Configurée' : '❌ Manquante' },
                    { key: 'VITE_SUPABASE_URL',      val: supaUrl ? '✅ Configurée' : '❌ Manquante' },
                    { key: 'VITE_SUPABASE_ANON_KEY', val: import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ Configurée' : '❌ Manquante' },
                  ].map(({ key, val }) => (
                    <div key={key} className="flex items-center justify-between">
                      <code className="text-[9px] font-mono text-slate-500">{key}</code>
                      <span className={`text-[9px] font-bold ${val.startsWith('✅') ? 'text-emerald-600' : 'text-rose-500'}`}>{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══ UTILISATEURS ══ */}
          {activeSection === 'users' && isAdmin && (
            <div className="animate-in fade-in duration-300">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Gestion des Accès</h4>
              <UserManagement />
            </div>
          )}
        </div>
      </div>

      {/* ─── BOUTON SAVE FIXE ─── */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={handleSave}
          className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-xs uppercase shadow-2xl transition-all active:scale-95 ${
            saveFlash
              ? 'bg-[#149308] text-white scale-105 shadow-green-900/40'
              : 'bg-[#1A237E] hover:bg-indigo-900 text-white shadow-indigo-900/40 hover:scale-105'
          }`}
        >
          {saveFlash
            ? <><CheckCircle2 size={18} /> Sauvegardé !</>
            : <><Save size={18} /> Enregistrer</>
          }
        </button>
      </div>

      {/* ─── MODAL CONFIRMATION MAINTENANCE ─── */}
      {confirmMaint && (
        <div className="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0f172a] rounded-3xl p-8 max-w-md w-full border border-rose-200 dark:border-rose-500/20 shadow-2xl animate-in zoom-in duration-200">
            <div className="w-16 h-16 bg-rose-100 dark:bg-rose-500/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <AlertTriangle size={32} className="text-rose-600" />
            </div>
            <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight text-center">
              {maintenanceOn ? 'Désactiver la maintenance ?' : 'Activer le mode maintenance ?'}
            </h3>
            <p className="text-sm text-slate-500 mt-3 text-center leading-relaxed">
              {maintenanceOn
                ? 'Tous les utilisateurs retrouveront l\'accès à l\'application immédiatement.'
                : 'TOUS les utilisateurs verront une page de maintenance. Seul vous (Super Admin) pourrez continuer à utiliser l\'application.'
              }
            </p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setConfirmMaint(false)}
                className="flex-1 py-3 bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase hover:bg-slate-200 transition-all"
              >
                Annuler
              </button>
              <button
                onClick={() => broadcastMaintenance(!maintenanceOn)}
                disabled={maintLoading}
                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 ${
                  maintenanceOn
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-rose-600 hover:bg-rose-700 text-white'
                }`}
              >
                {maintLoading
                  ? <><Loader2 size={14} className="animate-spin" /> En cours...</>
                  : <><Power size={14} /> {maintenanceOn ? 'Désactiver' : 'Confirmer'}</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL AUDIT ─── */}
      {showAudit && (
        <div className="fixed inset-0 lg:inset-y-0 lg:left-72 z-[300] bg-white dark:bg-slate-900 overflow-auto">
          <div className="absolute top-4 right-4 z-10">
            <button
              onClick={() => setShowAudit(false)}
              className="w-10 sm:w-12 h-10 sm:h-12 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 transition-all shadow-lg"
            >
              <X size={20} className="sm:w-[24px] sm:h-[24px] text-slate-600 dark:text-slate-300" />
            </button>
          </div>
          <AuditView onClose={() => setShowAudit(false)} />
        </div>
      )}

    </div>
  );
};