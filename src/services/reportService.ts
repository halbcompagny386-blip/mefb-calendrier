// src/services/reportService.ts
import { jsPDF } from 'jspdf'; // Correction : import nommé
import autoTable from 'jspdf-autotable';

export const generateMonthlyReport = async (activities: any[], publications: any[], summary?: string) => {
  const doc = new jsPDF(); // Correction : ajout de 'new'
  const month = "AVRIL 2026";

  // En-tête Institutionnel
  doc.setFontSize(18);
  doc.setTextColor(23, 90, 149); // Bleu MEFB
  doc.text("RAPPORT DE PERFORMANCE MÉDIA", 105, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text(`Période : ${month} | Cabinet MEFB Guinée`, 105, 30, { align: 'center' });

  // Statistiques Globales
  const stats = [
    ["Activités Totales", activities.length],
    ["Publications IA", publications.length],
    ["Taux de Validation", activities.length > 0 
      ? `${((activities.filter(a => a.workflow === 'Validé').length / activities.length) * 100).toFixed(0)}%`
      : "0%"]
  ];

  autoTable(doc, {
    startY: 40,
    head: [['Indicateur', 'Valeur']],
    body: stats,
    theme: 'striped',
    headStyles: { fillColor: [23, 90, 149] } // Correction : 'fillColor' au lieu de 'fillStyle'
  });

  // Détails des Publications (Traçabilité)
  const pubData = publications.map(p => [
    p.title || "Sans titre",
    p.platform || "N/A",
    p.published_at ? new Date(p.published_at).toLocaleDateString('fr-FR') : "N/A",
    p.url || "Lien non renseigné"
  ]);

  const finalY = (doc as any).lastAutoTable.finalY || 70;

  if (summary) {
    doc.setFontSize(14);
    doc.setTextColor(23, 90, 149);
    doc.text("Synthèse exécutive", 14, finalY + 15);
    doc.setFontSize(10);
    doc.setTextColor(51);
    doc.text(summary, 14, finalY + 24);
  }

  doc.text("Détails de la Traçabilité Multicanal", 14, finalY + 60);

  autoTable(doc, {
    startY: finalY + 70,
    head: [['Sujet', 'Canal', 'Date', 'Lien Preuve']],
    body: pubData,
    styles: { fontSize: 8 }
  });

  doc.save(`Rapport_Performance_MEFB_${month.replace(' ', '_')}.pdf`);
};