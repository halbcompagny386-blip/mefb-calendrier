// src/utils/csvExport.ts
import { HistoryEntry } from '../types';

export const exportHistoryToCSV = (entries: (HistoryEntry & { activityType?: string })[]) => {
  // En-têtes adaptés au Ministère
  const headers = ["Date", "Heure", "Utilisateur", "Action", "Activite", "Details"];
  
  const rows = entries.map(entry => {
    const dateObj = new Date(entry.timestamp);
    return [
      dateObj.toLocaleDateString('fr-FR'),
      dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      entry.user,
      entry.action,
      entry.activityType || "N/A",
      // Nettoyage pour éviter de casser les colonnes Excel
      `"${(entry.details || "").replace(/"/g, '""').replace(/\n/g, ' ')}"` 
    ];
  });

  const csvContent = [
    headers.join(";"),
    ...rows.map(e => e.join(";"))
  ].join("\n");

  // Encodage spécial pour que Excel affiche bien les accents guinéens (UTF-8 BOM)
  const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  
  const dateLabel = new Date().toISOString().split('T')[0];
  link.setAttribute("href", url);
  link.setAttribute("download", `Journal_Activites_MEFB_${dateLabel}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};