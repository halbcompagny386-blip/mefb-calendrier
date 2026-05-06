import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ActivityExport {
  title: string;
  date: string;
  description: string;
  responsible: string;
  participants: string;
  location: string;
  media: string;
  suggestedModel: string;
}

export class ExportService {
  static exportToPDF(activities: ActivityExport[], fileName: string = 'agenda') {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const headerY = 10;

    pdf.setFontSize(18);
    pdf.setTextColor(23, 90, 149);
    pdf.text('Agenda des Activités du Cabinet', pageWidth / 2, headerY, { align: 'center' });

    pdf.setFontSize(10);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Généré le: ${new Date().toLocaleDateString('fr-FR')}`, pageWidth / 2, headerY + 8, { align: 'center' });

    const tableData = activities.map(a => [
      a.title, a.date, a.responsible, a.location, a.participants,
      a.media === 'O' ? 'Oui' : 'Non'
    ]);

    autoTable(pdf, {
      head: [['Activité', 'Date', 'Responsable', 'Lieu', 'Participants', 'Couverture Média']],
      body: tableData,
      startY: headerY + 15,
      styles: { fontSize: 9, textColor: [50, 50, 50] as [number,number,number], lineColor: [200, 200, 200] as [number,number,number] },
      headStyles: { fillColor: [23, 90, 149] as [number,number,number], textColor: [255, 255, 255] as [number,number,number], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] as [number,number,number] },
      margin: { top: 10, right: 10, bottom: 10, left: 10 }
    });

    let currentY = (pdf as any).lastAutoTable.finalY + 10;
    const pageHeight = pdf.internal.pageSize.getHeight();

    activities.forEach((a) => {
      if (currentY > pageHeight - 20) { pdf.addPage(); currentY = 15; }
      pdf.setFontSize(12);
      pdf.setTextColor(23, 90, 149);
      pdf.text(a.title, 10, currentY);
      currentY += 8;
      pdf.setFontSize(9);
      pdf.setTextColor(80, 80, 80);
      const lines = pdf.splitTextToSize(`Description: ${a.description}`, pageWidth - 20);
      pdf.text(lines, 10, currentY);
      currentY += lines.length * 5 + 5;
    });

    // pdf.save() est natif à jsPDF et contourne le blocage Chrome sur HTTP
    pdf.save(`${fileName}.pdf`);
  }

  static exportToWord(activities: ActivityExport[], fileName: string = 'agenda') {
    const htmlContent = this.generateHTML(activities);
    // application/msword (.doc) est plus compatible que .docx pour l'export HTML
    const blob = new Blob([htmlContent], { type: 'application/msword' });
    // On utilise FileReader+dataURL au lieu de URL.createObjectURL
    // pour éviter le blocage Chrome "fichier non sécurisé" en HTTP
    this.downloadBlobAsDataUri(blob, `${fileName}.doc`);
  }

  private static downloadBlobAsDataUri(blob: Blob, fileName: string) {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = fileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => document.body.removeChild(link), 200);
    };
    reader.readAsDataURL(blob);
  }

  private static generateHTML(activities: ActivityExport[]): string {
    const today = new Date().toLocaleDateString('fr-FR');
    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Agenda du Cabinet</title>
  <style>
    body { font-family: 'Segoe UI', sans-serif; max-width: 1000px; margin: 0 auto; padding: 40px; color: #333; }
    .header { text-align: center; margin-bottom: 40px; border-bottom: 3px solid #175a95; padding-bottom: 20px; }
    .header h1 { color: #175a95; margin: 0; font-size: 28px; text-transform: uppercase; }
    .header p { color: #666; margin: 10px 0 0 0; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; background: white; }
    th { background-color: #175a95; color: white; padding: 12px; text-align: left; font-size: 11px; text-transform: uppercase; }
    td { padding: 12px; border-bottom: 1px solid #eee; }
    tr:nth-child(even) { background-color: #f9f9f9; }
    .activity-detail { page-break-inside: avoid; background: white; padding: 20px; margin-bottom: 20px; border-left: 4px solid #175a95; }
    .activity-detail h3 { color: #175a95; margin: 0 0 10px 0; font-size: 16px; text-transform: uppercase; }
    .field strong { display: block; color: #175a95; font-size: 11px; text-transform: uppercase; margin-bottom: 4px; }
    .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 11px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Agenda des Activités du Cabinet</h1>
    <p>Généré le: ${today}</p>
  </div>
  <table>
    <thead><tr><th>Activité</th><th>Date</th><th>Responsable</th><th>Lieu</th><th>Participants</th><th>Couverture Média</th></tr></thead>
    <tbody>
      ${activities.map(a => `<tr><td>${a.title}</td><td>${a.date}</td><td>${a.responsible}</td><td>${a.location}</td><td>${a.participants}</td><td>${a.media === 'O' ? 'Oui' : 'Non'}</td></tr>`).join('')}
    </tbody>
  </table>
  <h2 style="color:#175a95;text-transform:uppercase;">Détails des Activités</h2>
  ${activities.map(a => `
  <div class="activity-detail">
    <h3>${a.title}</h3>
    <div class="field"><strong>Date</strong><span>${a.date}</span></div>
    <div class="field"><strong>Lieu</strong><span>${a.location || '—'}</span></div>
    <div class="field"><strong>Responsable</strong><span>${a.responsible || '—'}</span></div>
    <div class="field"><strong>Participants</strong><span>${a.participants || '—'}</span></div>
    <div class="field"><strong>Description</strong><span>${a.description || '—'}</span></div>
    <div class="field"><strong>Couverture Médiatique</strong><span>${a.media === 'O' ? 'Oui' : 'Non'}</span></div>
  </div>`).join('')}
  <div class="footer"><p>Document confidentiel — Propriété du Cabinet</p></div>
</body>
</html>`;
  }
}

export default ExportService;
