// src/services/agendaParser.ts

import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import { EditorialActivity } from '../types';
import GlobalWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = GlobalWorker;

// ─────────────────────────────────────────────
// UTILITAIRES DE NETTOYAGE DU TEXTE EXTRAIT
// ─────────────────────────────────────────────

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

// ─────────────────────────────────────────────
// EXTRACTION DU FICHIER (PDF / DOCX)
// ─────────────────────────────────────────────

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
      // Reconstruction fidèle : on préserve les sauts de ligne via les positions Y
      const items = textContent.items as any[];
      let lastY: number | null = null;
      let lineText = '';
      for (const item of items) {
        const currentY = item.transform?.[5];
        if (lastY !== null && Math.abs(currentY - lastY) > 5) {
          fullText += lineText.trim() + '\n';
          lineText = '';
        }
        lineText += item.str;
        lastY = currentY;
      }
      if (lineText.trim()) fullText += lineText.trim() + '\n';
      fullText += '\n';
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

// ─────────────────────────────────────────────
// CALCUL DE DATE PAR JOUR DE LA SEMAINE
// ─────────────────────────────────────────────

const calculateWeekdayDate = (dayName: string, referenceDate: Date = new Date()): string => {
  const days = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
  const targetDay = days.indexOf(dayName.toLowerCase());

  if (targetDay === -1) return referenceDate.toISOString().split('T')[0];

  const currentDay = referenceDate.getDay();
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;

  const date = new Date(referenceDate);
  date.setDate(date.getDate() + mondayOffset + targetDay);

  return date.toISOString().split('T')[0];
};

// ─────────────────────────────────────────────
// DÉCOUPAGE DU TEXTE PAR BLOC/JOUR
// ─────────────────────────────────────────────

/**
 * Découpe le texte brut en sections par jour de la semaine.
 * Si aucun jour n'est détecté, retourne le texte entier en un seul bloc.
 */
const splitTextByDay = (text: string): string[] => {
  // Regex pour détecter les entêtes de jours (ex: "Lundi", "MARDI", "Mercredi 17 juin", etc.)
  const dayPattern = /(?:^|\n)((?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)[^\n]*)/gi;
  const matches = [...text.matchAll(dayPattern)];

  if (matches.length < 2) {
    // Pas assez de jours détectés → on envoie tout en un seul bloc
    return [text];
  }

  const chunks: string[] = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index! + (matches[i][0].startsWith('\n') ? 1 : 0);
    const end = i + 1 < matches.length ? matches[i + 1].index! : text.length;
    const chunk = text.slice(start, end).trim();
    if (chunk.length > 50) chunks.push(chunk); // Ignorer les blocs vides
  }

  return chunks.length > 0 ? chunks : [text];
};

// ─────────────────────────────────────────────
// APPEL GROQ AVEC RETRY
// ─────────────────────────────────────────────

const MAX_CHUNK_CHARS = 4000; // Limite de sécurité par appel Groq

const callGroqForChunk = async (
  chunkText: string,
  apiKey: string,
  today: string,
  attempt = 1
): Promise<any[]> => {
  const url = "https://api.groq.com/openai/v1/chat/completions";

  const prompt = `
    Tu es un assistant expert en extraction d'agendas institutionnels du MEFB (Ministère de l'Économie et des Finances).
    Analyse le texte suivant et extrais ABSOLUMENT TOUTES les activités présentes dans ce bloc.

    TEXTE À ANALYSER :
    """
    ${chunkText}
    """

    DIRECTIVES CRITIQUES :
    1. Extrais TOUTES les activités, même les plus courtes. Ne supprime aucune.
    2. Pour chaque activité identifiée, inclus le jour de la semaine dans ta réponse.
    3. Identifie l'heure ou la plage horaire (ex: 10h00-10h15) pour chaque activité.
    4. Résous les abréviations : SG → Secrétaire Général, CC → Cheffe de Cabinet, DGIP/DNIP → Investissements Publics, PRG → Présidence, DGB → Budget.
    5. Si une ligne n'a pas de titre clair, utilise le début de la description comme titre.
    6. DATE : Utilise le format YYYY-MM-DD si une date est présente dans le texte, sinon laisse vide.
    7. JOUR_SEMAINE : Inclus le jour exact (lundi, mardi, mercredi, jeudi, vendredi) pour chaque activité.
    8. MEDIA : "O" si couverture médiatique mentionnée, sinon "N".

    FORMAT DE RÉPONSE ATTENDU (TABLEAU JSON UNIQUEMENT) :
    [
      {
        "title": "Nom de l'activité",
        "dayOfWeek": "lundi|mardi|mercredi|jeudi|vendredi",
        "date": "YYYY-MM-DD ou laisser vide si inconnu",
        "time": "Plage horaire (ex: 09h00 - 09h30)",
        "description": "Points de discussion détaillés",
        "responsible": "Responsable principal",
        "participants": "Liste complète des participants",
        "location": "Lieu précis",
        "media": "O ou N",
        "suggestedModel": "Facebook",
        "interview_questions": []
      }
    ]

    ⚠️ OBLIGATION : Retourne UNIQUEMENT le tableau JSON, sans aucun texte avant ou après.
  `;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: "Tu es un extracteur de données JSON. Tu réponds UNIQUEMENT par un tableau JSON valide. Aucun texte avant ou après. Tu dois extraire ABSOLUMENT TOUTES les activités présentes dans le texte."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.05,
      max_tokens: 4096  // ✅ Garantit que la réponse n'est pas tronquée
    })
  });

  if (!response.ok) {
    throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  let textResponse = data.choices?.[0]?.message?.content?.trim() || '';

  // Extraction robuste du JSON (supporte markdown code blocks)
  const jsonMatch = textResponse.match(/```(?:json)?\s*([\s\S]*?)```/) ||
    textResponse.match(/(\[[\s\S]*\])/);

  if (!jsonMatch) {
    if (attempt < 3) {
      console.warn(`⚠️ Tentative ${attempt} : pas de JSON détecté, retry...`);
      await new Promise(r => setTimeout(r, 1000 * attempt));
      return callGroqForChunk(chunkText, apiKey, today, attempt + 1);
    }
    console.error("❌ Aucun tableau JSON trouvé après 3 tentatives pour ce bloc.");
    return [];
  }

  const jsonStr = jsonMatch[1] || jsonMatch[0];

  try {
    return JSON.parse(jsonStr);
  } catch (parseError) {
    if (attempt < 3) {
      console.warn(`⚠️ Tentative ${attempt} : JSON malformé, retry...`);
      await new Promise(r => setTimeout(r, 1000 * attempt));
      return callGroqForChunk(chunkText, apiKey, today, attempt + 1);
    }
    console.error("❌ JSON invalide après 3 tentatives :", parseError);
    return [];
  }
};

// ─────────────────────────────────────────────
// FONCTION PRINCIPALE D'ANALYSE AVEC CHUNKING
// ─────────────────────────────────────────────

/**
 * Analyse le texte via Groq avec chunking par jour pour éviter les pertes liées aux token limits.
 * Si le texte est court, un seul appel est effectué (comportement d'origine).
 * Si le texte est long, il est découpé par jour et chaque bloc est envoyé séparément.
 */
export const structuredAgendaWithAI = async (rawText: string): Promise<Partial<EditorialActivity>[]> => {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  const today = new Date().toISOString().split('T')[0];

  if (!apiKey) {
    console.error("❌ VITE_GROQ_API_KEY non définie.");
    return [];
  }

  // ── Étape 1 : Découper le texte par blocs/jours ──
  const chunks = splitTextByDay(rawText);
  console.log(`📋 Agenda découpé en ${chunks.length} bloc(s) pour traitement.`);

  // ── Étape 2 : Si un seul bloc long → le redécouper par taille ──
  const finalChunks: string[] = [];
  for (const chunk of chunks) {
    if (chunk.length > MAX_CHUNK_CHARS) {
      // Découper par paragraphes si un bloc est encore trop long
      const subChunks: string[] = [];
      let current = '';
      for (const line of chunk.split('\n')) {
        if ((current + line).length > MAX_CHUNK_CHARS && current.length > 0) {
          subChunks.push(current.trim());
          current = '';
        }
        current += line + '\n';
      }
      if (current.trim().length > 0) subChunks.push(current.trim());
      finalChunks.push(...subChunks);
    } else {
      finalChunks.push(chunk);
    }
  }

  console.log(`🚀 Envoi de ${finalChunks.length} appel(s) Groq en séquentiel...`);

  // ── Étape 3 : Appels Groq séquentiels (évite le rate-limit) ──
  const allRawActivities: any[] = [];
  for (let i = 0; i < finalChunks.length; i++) {
    console.log(`  → Traitement bloc ${i + 1}/${finalChunks.length}...`);
    try {
      const results = await callGroqForChunk(finalChunks[i], apiKey, today);
      console.log(`  ✅ Bloc ${i + 1} : ${results.length} activité(s) extraite(s)`);
      allRawActivities.push(...results);
    } catch (err) {
      console.error(`  ❌ Erreur sur le bloc ${i + 1} :`, err);
      // On continue avec les autres blocs même en cas d'erreur
    }
    // Pause entre les appels pour respecter le rate-limit Groq (évite l'erreur 429)
    if (i < finalChunks.length - 1) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  console.log(`📊 Total brut extrait : ${allRawActivities.length} activité(s)`);

  if (allRawActivities.length === 0) {
    return [];
  }

  // ── Étape 4 : Post-traitement — calcul des dates manquantes + déduplification ──
  const seen = new Set<string>();
  const processedActivities = allRawActivities
    .map((activity: any) => {
      // Calcul de la date si manquante
      if (!activity.date || activity.date.trim() === '') {
        if (activity.dayOfWeek) {
          activity.date = calculateWeekdayDate(activity.dayOfWeek);
        } else {
          activity.date = today;
        }
      }
      return activity;
    })
    .filter((activity: any) => {
      // Déduplification par titre + date (évite les doublons entre blocs)
      const key = `${(activity.title || '').toLowerCase().trim()}__${activity.date}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  console.log(`✅ Après déduplification : ${processedActivities.length} activité(s) unique(s)`);

  return processedActivities;
};