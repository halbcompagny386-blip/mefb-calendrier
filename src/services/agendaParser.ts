// src/services/agendaParser.ts

import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import { EditorialActivity } from '../types';
import GlobalWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = GlobalWorker;

const normalizeAgendaText = (raw: string) => {
  return raw
    .replace(/\u00A0/g, ' ')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
};

const extractTextFromHtml = (html: string) => {
  if (!html) return '';
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const tableRows = Array.from(doc.querySelectorAll('table tr'));

  const tableText = tableRows.map(row => {
    const cells = Array.from(row.querySelectorAll('th, td'))
      .map(cell => cell.textContent?.trim().replace(/\s+/g, ' ') || '');
    return cells.join(' | ');
  }).join('\n');

  const paragraphs = Array.from(doc.body.querySelectorAll('p, li, div'))
    .map(node => node.textContent?.trim().replace(/\s+/g, ' ') || '')
    .filter(text => text.length > 0)
    .join('\n');

  return normalizeAgendaText([tableText, paragraphs].filter(Boolean).join('\n\n'));
};

export const parseAgendaFile = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();

  if (file.type === 'application/pdf') {
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      useWorkerFetch: false,
      isEvalSupported: false
    });

    const pdf = await loadingTask.promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n';
    }

    return normalizeAgendaText(fullText);
  }

  const result = await mammoth.convertToHtml({ arrayBuffer });
  const html = result.value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n');

  return extractTextFromHtml(html);
};

/**
 * Analyse le texte via Groq avec une logique d'extraction enrichie
 */
export const structuredAgendaWithAI = async (rawText: string): Promise<Partial<EditorialActivity>[]> => {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  const url = "https://api.groq.com/openai/v1/chat/completions";
  const today = new Date().toISOString().split('T')[0]; 

  const prompt = `
    Tu es un assistant expert en extraction d'agendas institutionnels du MEFB (Ministère de l'Économie et des Finances).
    Analyse le texte suivant et extrais TOUTES les activités prévues dans un format JSON strict.

    TEXTE À ANALYSER : "${rawText}"

    DIRECTIVES :
    1. Identifie l'heure ou la plage horaire (ex: 10h00-10h15) pour chaque activité.
    2. Résous les abréviations : SG -> Secrétaire Général, CC -> Cheffe de Cabinet, DGIP/DNIP -> Investissements Publics, PRG -> Présidence, DGB -> Budget.
    3. Si une ligne n'a pas de titre clair, utilise le début de la description comme titre.
    4. DATE : Utilise la date trouvée dans le document. Sinon, utilise ${today}. Format YYYY-MM-DD.
    5. MEDIA : "O" si couverture médiatique mentionnée, sinon "N".

    FORMAT DE RÉPONSE ATTENDU (TABLEAU JSON UNIQUEMENT) :
    [
      {
        "title": "Nom de l'activité",
        "date": "YYYY-MM-DD",
        "time": "Plage horaire (ex: 09h00 - 09h30)",
        "description": "Points de discussion détaillés",
        "responsible": "Responsable principal",
        "participants": "Liste complète des participants",
        "location": "Lieu précis",
        "media": "O" ou "N",
        "suggestedModel": "Facebook",
        "interview_questions": []
      }
    ]
  `;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "Tu es un extracteur de données qui ne répond QUE par un tableau JSON. Pas de texte avant, pas de texte après." },
          { role: "user", content: prompt }
        ],
        temperature: 0.1
        // Suppression de response_format: { type: "json_object" } pour permettre le format tableau []
      })
    });

    const data = await response.json();
    let textResponse = data.choices[0].message.content.trim();
    
    // Nettoyage de sécurité pour extraire uniquement le contenu entre les crochets [ ]
    const jsonMatch = textResponse.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error("Aucun tableau JSON trouvé dans la réponse Groq");
      return [];
    }

    return JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error("Erreur Groq lors du parsing agenda:", e);
    return [];
  }
};