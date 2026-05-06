import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Plus, Trash2, Calendar, MapPin, Users, FileText, Download, FileJson, Clock } from 'lucide-react';
import { notificationService } from '@/services/notificationService';
import { ExportService, ActivityExport } from '@/services/exportService';

export interface AddAgendaActivityInput {
  title: string;
  date: string;
  time: string;
  description: string;
  responsible: string;
  participants: string;
  location: string;
  media: 'O' | 'N';
  suggestedModel: string;
}

interface AddAgendaActivitiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (activities: AddAgendaActivityInput[]) => void;
  defaultDate?: string;
  agendaHint?: string;
}

const createEmptyRow = (defaultDate = '') => ({
  rowId: `row-${Math.random().toString(36).slice(2, 10)}`,
  title: '',
  date: defaultDate,
  time: '',
  description: '',
  responsible: '',
  participants: '',
  location: '',
  media: 'N' as 'O' | 'N',
  suggestedModel: 'Facebook'
});

export const AddAgendaActivitiesModal = ({
  isOpen,
  onClose,
  onAdd,
  defaultDate,
  agendaHint
}: AddAgendaActivitiesModalProps) => {
  const [rows, setRows] = useState(Array.from({ length: 1 }, () => createEmptyRow(defaultDate || '')));
  const [currentFormIndex, setCurrentFormIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setRows([createEmptyRow(defaultDate || '')]);
      setCurrentFormIndex(0);
    }
  }, [isOpen, defaultDate]);

  const updateRow = (rowId: string, field: keyof AddAgendaActivityInput, value: string) => {
    setRows(prev => prev.map(row => row.rowId === rowId ? { ...row, [field]: value } : row));
  };

  const addRow = () => {
    setRows(prev => [...prev, createEmptyRow(defaultDate || '')]);
    setCurrentFormIndex(rows.length); // Passer au nouveau formulaire
  };
  
  const removeRow = (rowId: string) => setRows(prev => prev.filter(row => row.rowId !== rowId));
  
  const goToPreviousForm = () => {
    if (currentFormIndex > 0) setCurrentFormIndex(currentFormIndex - 1);
  };
  
  const goToNextForm = () => {
    if (currentFormIndex < rows.length - 1) setCurrentFormIndex(currentFormIndex + 1);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const validRows = rows
      .map(({ rowId, ...activity }) => activity)
      .filter(activity => activity.title.trim() || activity.description.trim());

    if (validRows.length === 0) {
      notificationService.warning('Veuillez ajouter au moins une activité avec un titre ou une description.');
      return;
    }

    onAdd(validRows.map(activity => ({
      ...activity,
      date: activity.date || defaultDate || new Date().toISOString().split('T')[0],
      media: activity.media || 'N',
      suggestedModel: activity.suggestedModel || 'Facebook'
    })));
    onClose();
  };

  const handleExportPDF = () => {
    const validRows = rows
      .map(({ rowId, ...activity }) => activity)
      .filter(activity => activity.title.trim() || activity.description.trim());

    if (validRows.length === 0) {
      notificationService.warning('Veuillez ajouter au moins une activité avant d\'exporter.');
      return;
    }

    const exportData: ActivityExport[] = validRows.map(activity => ({
      ...activity,
      date: activity.date || defaultDate || new Date().toISOString().split('T')[0],
      time: activity.time || '',
      media: activity.media || 'N',
      suggestedModel: activity.suggestedModel || 'Facebook'
    }));

    try {
      ExportService.exportToPDF(exportData, 'agenda-activities');
      notificationService.success('Agenda exporté en PDF avec succès!');
    } catch (error) {
      notificationService.error('Erreur lors de l\'export PDF');
      console.error(error);
    }
  };

  const handleExportWord = () => {
    const validRows = rows
      .map(({ rowId, ...activity }) => activity)
      .filter(activity => activity.title.trim() || activity.description.trim());

    if (validRows.length === 0) {
      notificationService.warning('Veuillez ajouter au moins une activité avant d\'exporter.');
      return;
    }

    const exportData: ActivityExport[] = validRows.map(activity => ({
      ...activity,
      date: activity.date || defaultDate || new Date().toISOString().split('T')[0],
      time: activity.time || '',
      media: activity.media || 'N',
      suggestedModel: activity.suggestedModel || 'Facebook'
    }));

    try {
      ExportService.exportToWord(exportData, 'agenda-activities');
      notificationService.success('Agenda exporté en Word avec succès!');
    } catch (error) {
      notificationService.error('Erreur lors de l\'export Word');
      console.error(error);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white w-full max-w-7xl rounded-[2rem] shadow-2xl border border-slate-200 flex flex-col"
          style={{ maxHeight: '95vh' }}
        >
          <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-50">
            <div>
              <h3 className="text-2xl font-black text-[#175a95] uppercase tracking-tight">Ajouter des activités du Cabinet</h3>
              <p className="text-sm text-slate-600 mt-2">Ajoutez une ou plusieurs activités complémentaires au dernier agenda chargé.</p>
              {agendaHint && <p className="text-[12px] text-slate-500 mt-2">{agendaHint}</p>}
              {defaultDate && (
                <p className="text-[12px] text-slate-500 mt-2">Date proposée : <span className="font-bold text-slate-700">{defaultDate}</span></p>
              )}
            </div>
            <button onClick={onClose} className="p-3 rounded-full bg-white border border-slate-200 text-slate-500 hover:text-slate-900 transition-colors">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            {/* Zone scrollable */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* En-tête du carrousel */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-slate-50 rounded-2xl border border-blue-100">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-600">Formulaire</span>
                <span className="text-lg font-black text-[#175a95]">{currentFormIndex + 1}</span>
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-600">sur {rows.length}</span>
              </div>
              <div className="w-48 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#175a95] to-blue-600 transition-all duration-300"
                  style={{ width: `${rows.length > 0 ? ((currentFormIndex + 1) / rows.length) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Carrousel de formulaires */}
            <AnimatePresence mode="wait">
  <motion.div
    key={rows[currentFormIndex]?.rowId}
    initial={{ opacity: 0, x: 50 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -50 }}
    transition={{ duration: 0.3 }}
    className="p-5 bg-slate-50 rounded-[2rem] border border-slate-200"
  >
    {/* EN-TÊTE DE SECTION */}
    <div className="flex items-center justify-between gap-4 mb-6">
      <div className="flex items-center gap-3 text-slate-700 font-bold uppercase tracking-[0.2em] text-[11px]">
        <FileText size={18} />
        <span>Activité {currentFormIndex + 1}</span>
      </div>
      {rows.length > 1 && (
        <button 
          type="button" 
          onClick={() => {
            removeRow(rows[currentFormIndex].rowId);
            if (currentFormIndex > 0) setCurrentFormIndex(currentFormIndex - 1);
          }} 
          className="text-rose-600 hover:text-rose-800 transition-colors flex items-center gap-2 text-[11px] font-black uppercase tracking-wider"
        >
          <Trash2 size={16} /> Supprimer
        </button>
      )}
    </div>

    {/* BLOC 1 : IDENTITÉ DE L'ACTIVITÉ */}
    <div className="grid grid-cols-1 gap-4 mb-6">
      <label className="space-y-2">
        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Titre de l'activité</span>
        <input
          type="text"
          value={rows[currentFormIndex].title}
          onChange={(e) => updateRow(rows[currentFormIndex].rowId, 'title', e.target.value)}
          placeholder="Ex: Réunion de Cabinet, Audience, Tournée..."
          className="w-full p-4 rounded-2xl border border-slate-200 bg-white outline-none focus:border-[#175a95] font-bold text-slate-700"
        />
      </label>
    </div>

    {/* BLOC 2 : CONTEXTE TEMPOREL ET LIEU (LIGNE CRUCIALE) */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <label className="space-y-2">
        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Date</span>
        <div className="relative">
          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="date"
            value={rows[currentFormIndex].date}
            onChange={(e) => updateRow(rows[currentFormIndex].rowId, 'date', e.target.value)}
            className="w-full pl-12 p-4 rounded-2xl border border-slate-200 bg-white outline-none focus:border-[#175a95]"
          />
        </div>
      </label>

      <label className="space-y-2">
        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Heure / Horaire</span>
        <div className="relative">
          <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            value={rows[currentFormIndex].time}
            onChange={(e) => updateRow(rows[currentFormIndex].rowId, 'time', e.target.value)}
            placeholder="Ex: 08h30 - 09h00"
            className="w-full pl-12 p-4 rounded-2xl border border-slate-200 bg-white outline-none focus:border-[#175a95]"
          />
        </div>
      </label>

      <label className="space-y-2">
        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Lieu</span>
        <div className="relative">
          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            value={rows[currentFormIndex].location}
            onChange={(e) => updateRow(rows[currentFormIndex].rowId, 'location', e.target.value)}
            placeholder="Salle, bureau, site..."
            className="w-full pl-12 p-4 rounded-2xl border border-slate-200 bg-white outline-none focus:border-[#175a95]"
          />
        </div>
      </label>
    </div>

    {/* BLOC 3 : ACTEURS ET EXÉCUTION */}
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6">
      <label className="space-y-2">
        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Responsable</span>
        <input
          type="text"
          value={rows[currentFormIndex].responsible}
          onChange={(e) => updateRow(rows[currentFormIndex].rowId, 'responsible', e.target.value)}
          placeholder="Responsable principal"
          className="w-full p-4 rounded-2xl border border-slate-200 bg-white outline-none focus:border-[#175a95]"
        />
      </label>
      <label className="space-y-2">
        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Participants</span>
        <div className="relative">
          <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            value={rows[currentFormIndex].participants}
            onChange={(e) => updateRow(rows[currentFormIndex].rowId, 'participants', e.target.value)}
            placeholder="Participants séparés par des virgules"
            className="w-full pl-12 p-4 rounded-2xl border border-slate-200 bg-white outline-none focus:border-[#175a95]"
          />
        </div>
      </label>
    </div>

    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <label className="space-y-2 xl:col-span-2">
        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Description / Points de discussion</span>
        <textarea
          rows={3}
          value={rows[currentFormIndex].description}
          onChange={(e) => updateRow(rows[currentFormIndex].rowId, 'description', e.target.value)}
          placeholder="Saisissez les points clés de la discussion..."
          className="w-full p-4 rounded-2xl border border-slate-200 bg-white outline-none focus:border-[#175a95] resize-none"
        />
      </label>
      <label className="space-y-2">
        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Couverture médiatique</span>
        <select
          value={rows[currentFormIndex].media}
          onChange={(e) => updateRow(rows[currentFormIndex].rowId, 'media', e.target.value as 'O' | 'N')}
          className="w-full p-4 rounded-2xl border border-slate-200 bg-white outline-none focus:border-[#175a95] appearance-none font-bold text-[#175a95]"
        >
          <option value="N">NON (N)</option>
          <option value="O">OUI (O)</option>
        </select>
      </label>
    </div>
  </motion.div>
</AnimatePresence>

            </div>
            {/* Navigation + boutons — FIXÉS EN BAS, toujours visibles */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 space-y-3">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-blue-50 rounded-2xl border border-blue-100">
              <button 
                type="button" 
                onClick={goToPreviousForm}
                disabled={currentFormIndex === 0}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-300 text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 uppercase tracking-[0.2em] text-[11px] font-black hover:bg-slate-400 transition-all"
              >
                ← Formulaire Précédent
              </button>
              <span className="text-sm font-bold text-slate-700">
                {rows.length === 1 ? 'Ajouter une nouvelle activité pour continuer' : `${rows.length - currentFormIndex - 1} formulaire(s) suivant(s)`}
              </span>
              <button 
                type="button" 
                onClick={goToNextForm}
                disabled={currentFormIndex === rows.length - 1}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-300 text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 uppercase tracking-[0.2em] text-[11px] font-black hover:bg-slate-400 transition-all"
              >
                Formulaire Suivant →
              </button>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <button type="button" onClick={addRow} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#175a95] text-white px-6 py-4 uppercase tracking-[0.2em] text-[11px] font-black hover:bg-blue-800 transition-all">
                <Plus size={16} /> Ajouter une activité
              </button>
              <div className="flex flex-col md:flex-row items-center justify-center gap-3">
                <button type="button" onClick={handleExportPDF} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-600 text-white px-6 py-4 uppercase tracking-[0.2em] text-[11px] font-black hover:bg-rose-700 transition-all">
                  <Download size={16} /> Exporter PDF
                </button>
                <button type="button" onClick={handleExportWord} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 text-white px-6 py-4 uppercase tracking-[0.2em] text-[11px] font-black hover:bg-blue-700 transition-all">
                  <FileJson size={16} /> Exporter Word
                </button>
                <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-white px-8 py-4 uppercase tracking-[0.2em] text-[11px] font-black hover:bg-emerald-700 transition-all">
                  Enregistrer les activités
                </button>
              </div>
            </div>
            </div>{/* fin footer fixe */}
          </form>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
