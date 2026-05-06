// src/components/maintenance/MaintenancePage.tsx
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wrench, RefreshCw, Shield, Wifi, Server, Zap } from 'lucide-react';

interface MaintenancePageProps {
  activatedBy?: string;
}

const logs = [
  { time: '00:01', msg: 'Initialisation du processus de mise à jour...', color: 'text-emerald-400' },
  { time: '00:03', msg: 'Vérification de l\'intégrité des données Supabase...', color: 'text-blue-400' },
  { time: '00:07', msg: 'Synchronisation des modules éditoriaux...', color: 'text-amber-400' },
  { time: '00:12', msg: 'Optimisation des vecteurs IA (Groq Llama 3.3)...', color: 'text-purple-400' },
  { time: '00:18', msg: 'Mise à jour des permissions RBAC...', color: 'text-blue-400' },
  { time: '00:22', msg: 'Reconstruction des index de publications...', color: 'text-emerald-400' },
  { time: '00:29', msg: 'Validation de la chaîne cryptographique...', color: 'text-amber-400' },
  { time: '00:35', msg: 'Déploiement du nouveau noyau applicatif...', color: 'text-purple-400' },
  { time: '00:41', msg: 'Tests de régression en cours...', color: 'text-blue-400' },
  { time: '00:48', msg: 'Finalisation — Nettoyage du cache système...', color: 'text-emerald-400' },
];

const indicators = [
  { icon: Server,  label: 'Serveurs',   status: 'Mise à jour' },
  { icon: Shield,  label: 'Sécurité',   status: 'Validée'     },
  { icon: Zap,     label: 'IA Groq',    status: 'En attente'  },
  { icon: Wifi,    label: 'Réseau',     status: 'Stable'      },
];

export const MaintenancePage: React.FC<MaintenancePageProps> = ({ activatedBy }) => {
  const [visibleLogs, setVisibleLogs] = useState<typeof logs>([]);
  const [progress, setProgress]       = useState(0);
  const [dots, setDots]               = useState('');

  // Affichage progressif des logs
  useEffect(() => {
    logs.forEach((log, i) => {
      setTimeout(() => setVisibleLogs(prev => [...prev, log]), i * 1200);
    });
  }, []);

  // Barre de progression
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 92) { clearInterval(interval); return prev; }
        return prev + Math.random() * 3;
      });
    }, 600);
    return () => clearInterval(interval);
  }, []);

  // Points d'animation
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[9999] bg-[#030712] flex items-center justify-center overflow-hidden"
    >
      {/* Fond animé */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Grille */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'linear-gradient(#175a95 1px, transparent 1px), linear-gradient(90deg, #175a95 1px, transparent 1px)', backgroundSize: '40px 40px' }}
        />
        {/* Halos lumineux */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-[#175a95]/10 blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-[#149308]/10 blur-[100px]" />
        {/* Particules */}
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-[#175a95]/40"
            style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }}
            animate={{ y: [0, -30, 0], opacity: [0.2, 0.8, 0.2] }}
            transition={{ duration: 3 + Math.random() * 4, repeat: Infinity, delay: Math.random() * 3 }}
          />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-3xl mx-4">

        {/* ─── BLOC PRINCIPAL ─── */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-950/90 border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl backdrop-blur-xl"
        >
          {/* Bande supérieure tricolore */}
          <div className="h-1 w-full flex">
            <div className="flex-1 bg-[#ce1126]" />
            <div className="flex-1 bg-[#fcd116]" />
            <div className="flex-1 bg-[#009460]" />
          </div>

          <div className="p-8 md:p-12">

            {/* Logo + Titre */}
            <div className="flex flex-col sm:flex-row items-center gap-6 mb-10">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                className="w-20 h-20 rounded-3xl bg-[#175a95]/20 border border-[#175a95]/30 flex items-center justify-center shrink-0"
              >
                <RefreshCw size={36} className="text-[#175a95]" />
              </motion.div>

              <div className="text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                  <span className="px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full text-[9px] font-black uppercase tracking-widest border border-amber-500/30 animate-pulse">
                    ⚡ Mise à jour en cours
                  </span>
                </div>
                <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tighter">
                  Portail Éditorial MEFB
                </h1>
                <p className="text-sm text-slate-400 mt-1">
                  Ministère de l'Économie, des Finances et du Budget
                </p>
              </div>
            </div>

            {/* Message principal */}
            <div className="bg-white/5 border border-white/5 rounded-2xl p-6 mb-8 text-center">
              <Wrench size={28} className="text-amber-400 mx-auto mb-3" />
              <p className="text-white font-bold text-base leading-relaxed">
                Le système est actuellement en cours de mise à jour{dots}
              </p>
              <p className="text-slate-400 text-sm mt-2">
                Votre espace de travail sera disponible dans quelques instants.<br />
                Nous améliorons les performances et la sécurité du portail.
              </p>
              {activatedBy && (
                <p className="text-[10px] text-slate-500 mt-4 uppercase tracking-widest">
                  Maintenance initiée par : <span className="text-[#175a95] font-black">{activatedBy}</span>
                </p>
              )}
            </div>

            {/* Barre de progression */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Progression</span>
                <span className="text-[11px] font-black text-[#175a95]">{Math.round(progress)}%</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-[#175a95] via-[#149308] to-[#175a95] bg-[length:200%_100%]"
                  style={{ width: `${progress}%` }}
                  animate={{ backgroundPosition: ['0% 0%', '200% 0%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                />
              </div>
            </div>

            {/* Indicateurs de services */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              {indicators.map(({ icon: Icon, label, status }, i) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.15 }}
                  className="bg-white/5 border border-white/5 rounded-xl p-3 text-center"
                >
                  <Icon size={16} className="text-[#175a95] mx-auto mb-1.5" />
                  <p className="text-[9px] font-black uppercase text-slate-400">{label}</p>
                  <p className="text-[10px] font-bold text-white mt-1">{status}</p>
                </motion.div>
              ))}
            </div>

            {/* Terminal de logs */}
            <div className="bg-[#030712] border border-white/5 rounded-2xl p-5 font-mono max-h-52 overflow-y-auto">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-[9px] text-slate-600 ml-2 uppercase tracking-widest">system.log</span>
              </div>
              <AnimatePresence>
                {visibleLogs.map((log, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-start gap-3 mb-1.5"
                  >
                    <span className="text-[9px] text-slate-600 shrink-0">[{log.time}]</span>
                    <span className={`text-[10px] ${log.color} leading-relaxed`}>{log.msg}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
              <motion.div
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.8, repeat: Infinity }}
                className="flex items-center gap-1 mt-2"
              >
                <span className="text-[10px] text-slate-500">$</span>
                <span className="w-2 h-4 bg-[#175a95]/60 inline-block" />
              </motion.div>
            </div>
          </div>

          {/* Pied de page */}
          <div className="px-8 py-4 bg-white/[0.02] border-t border-white/5 flex items-center justify-between">
            <p className="text-[9px] text-slate-600 uppercase tracking-widest">République de Guinée — MEFB © 2025</p>
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-1.5 h-1.5 rounded-full bg-amber-500"
              />
              <span className="text-[9px] text-slate-500 uppercase">Maintenance active</span>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};
