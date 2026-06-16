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
      // Reconstruction fidèle avec préservation des sauts de ligne
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
// EXTRACTION DU JSON DEPUIS LA RÉPONSE GROQ
// ─────────────────────────────────────────────

const extractJsonFromResponse = (text: string): any[] | null => {
  // Tente d'extraire un tableau JSON (supporte les blocs markdown ```json...```)
  const patterns = [
    /```json\s*([\s\S]*?)```/i,
    /```\s*([\s\S]*?)```/i,
    /(\[[\s\S]*\])/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      try {
        const parsed = JSON.parse(match[1] || match[0]);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // continuer avec le pattern suivant
      }
    }
  }
  return null;
};

// ─────────────────────────────────────────────
// APPEL GROQ UNIQUE AVEC BACKOFF EXPONENTIEL
// Stratégie : 1 seul appel pour tout l'agenda.
// En cas de 429 (rate limit), on attend et on réessaie.
// ─────────────────────────────────────────────

// Délais d'attente progressifs en cas de 429 : 15s, 30s, 60s
const RETRY_DELAYS_MS = [15000, 30000, 60000];

const callGroqWithBackoff = async (
  fullText: string,
  apiKey: string,
  today: string
): Promise<any[]> => {
  const url = "https://api.groq.com/openai/v1/chat/completions";

  const prompt = `
Tu es un assistant expert en extraction d'agendas institutionnels du MEFB (Ministère de l'Économie et des Finances de Guinée).
Analyse INTÉGRALEMENT le texte suivant et extrais ABSOLUMENT TOUTES les activités de TOUS les jours (Lundi à Vendredi).

TEXTE COMPLET DE L'AGENDA :
"""
${fullText}
"""

RÈGLES STRICTES :
1. Extrais TOUTES les activités sans exception, même les plus courtes.
2. Détecte CHAQUE jour de la semaine (Lundi, Mardi, Mercredi, Jeudi, Vendredi).
3. Associe chaque activité à son jour et sa date correcte.
4. Identifie l'heure ou la plage horaire (ex: 10h00 - 11h00).
5. Résous les abréviations : SG → Secrétaire Général, CC → Cheffe de Cabinet, DGB → Direction Générale du Budget, PRG → Présidence, DGIP → Investissements Publics.
6. MEDIA : "O" si couverture médiatique mentionnée, sinon "N".
7. DATE : Format YYYY-MM-DD si une date explicite existe dans le texte, sinon laisser vide (le système calculera automatiquement).

RÉPONSE ATTENDUE : Uniquement un tableau JSON valide, sans texte avant ni après.

[
  {
    "title": "Titre de l'activité",
    "dayOfWeek": "lundi|mardi|mercredi|jeudi|vendredi",
    "date": "YYYY-MM-DD ou vide",
    "time": "09h00 - 10h00",
    "description": "Description détaillée",
    "responsible": "Responsable",
    "participants": "Liste des participants",
    "location": "Lieu",
    "media": "O ou N",
    "suggestedModel": "Facebook",
    "interview_questions": []
  }
]
`;

  let lastError: any = null;

  // Tentative initiale + jusqu'à 3 retries avec backoff exponentiel
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    if (attempt > 0) {
      const waitMs = RETRY_DELAYS_MS[attempt - 1];
      console.warn(`⏳ Rate limit Groq (429) — Attente de ${waitMs / 1000}s avant la tentative ${attempt + 1}...`);
      await new Promise(r => setTimeout(r, waitMs));
    }

    try {
      console.log(`🚀 Appel Groq — tentative ${attempt + 1}/${RETRY_DELAYS_MS.length + 1}...`);

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
              content: "Tu es un extracteur de données JSON strict. Tu réponds UNIQUEMENT par un tableau JSON valide. Zéro texte avant ou après les crochets. Tu dois extraire ABSOLUMENT TOUTES les activités présentes dans le texte fourni."
            },
            { role: "user", content: prompt }
          ],
          temperature: 0.05,
          max_tokens: 8192  // Large pour capturer toutes les activités d'une semaine complète
        })
      });

      // 429 = Rate limit → on retry avec backoff
      if (response.status === 429) {
        // Lire le header Retry-After si disponible
        const retryAfter = response.headers.get('Retry-After');
        if (retryAfter) {
          const waitSec = parseInt(retryAfter, 10);
          if (!isNaN(waitSec) && waitSec > 0) {
            console.warn(`⏳ Groq demande d'attendre ${waitSec}s (Retry-After header)...`);
            await new Promise(r => setTimeout(r, waitSec * 1000 + 1000));
            attempt--; // Ne pas compter comme un retry de notre part
            continue;
          }
        }
        lastError = new Error('429 Too Many Requests');
        continue; // → next retry avec le délai défini
      }

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Groq API error ${response.status}: ${errorBody}`);
      }

      const data = await response.json();
      const textResponse = data.choices?.[0]?.message?.content?.trim() || '';

      console.log(`✅ Réponse Groq reçue (${textResponse.length} caractères)`);

      const activities = extractJsonFromResponse(textResponse);

      if (!activities || activities.length === 0) {
        console.error("❌ Aucun tableau JSON trouvé dans la réponse Groq.");
        return [];
      }

      console.log(`📊 ${activities.length} activité(s) extraite(s) depuis l'agenda.`);
      return activities;

    } catch (err: any) {
      lastError = err;
      // Si ce n'est pas une erreur réseau transitoire, on arrête les retries
      if (!err.message?.includes('429') && !err.message?.includes('fetch')) {
        console.error("❌ Erreur non-récupérable Groq :", err);
        break;
      }
    }
  }

  console.error("❌ Échec après toutes les tentatives Groq :", lastError);
  return [];
};

// ─────────────────────────────────────────────
// FONCTION PRINCIPALE D'ANALYSE
// ─────────────────────────────────────────────

/**
 * Analyse le texte de l'agenda via un seul appel Groq optimisé.
 * Gère automatiquement les erreurs 429 avec un backoff exponentiel (15s → 30s → 60s).
 */
export const structuredAgendaWithAI = async (rawText: string): Promise<Partial<EditorialActivity>[]> => {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  const today = new Date().toISOString().split('T')[0];

  if (!apiKey) {
    console.error("❌ VITE_GROQ_API_KEY non définie dans les variables d'environnement.");
    return [];
  }

  console.log(`📋 Texte extrait : ${rawText.length} caractères — envoi à Groq en un seul appel optimisé.`);

  // ── Appel unique avec retry automatique ──
  const rawActivities = await callGroqWithBackoff(rawText, apiKey, today);

  if (rawActivities.length === 0) {
    return [];
  }

  // ── Post-traitement : calcul des dates manquantes + déduplification ──
  const seen = new Set<string>();

  const processedActivities = rawActivities
    .map((activity: any) => {
      // Calcul automatique de la date si elle est absente ou vide
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
      // Ignorer les entrées sans titre
      if (!activity.title || activity.title.trim() === '') return false;
      // Déduplifier par titre + date
      const key = `${(activity.title || '').toLowerCase().trim()}__${activity.date}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  console.log(`✅ ${processedActivities.length} activité(s) unique(s) prêtes pour Supabase.`);

  return processedActivities;
};