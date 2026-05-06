// src/services/aiService.ts

/**
 * Génère les questions d'interview dynamiquement basées sur le contenu de l'activité
 * @param activity L'activité sélectionnée avec titre, description, points de discussion
 * @returns Promise<string[]> Un tableau de questions générées par l'IA
 */
export const generateInterviewQuestions = async (activity: any): Promise<string[]> => {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  const url = "https://api.groq.com/openai/v1/chat/completions";

  if (!apiKey) {
    console.error("❌ VITE_GROQ_API_KEY is not configured");
    return [
      "Quel est le résultat clé ou la décision stratégique majeure de cette activité ?",
      "Pouvez-vous nous partager une citation ou un fait marquant pour humaniser le récit ?",
      "Quel impact direct cette action aura-t-elle sur l'économie ou le citoyen guinéen ?"
    ];
  }

  // --- TON ANALYSE CONTEXTUELLE PRÉSERVÉE ET AMÉLIORÉE ---
  const contentAnalysis = `${activity.title || ""} ${activity.description || ""} ${activity.discussion_points || ""}`.toLowerCase();
  let contextualPrompt = "";

  if (contentAnalysis.includes('audience') || contentAnalysis.includes('courtoisie')) {
    contextualPrompt = "C'est une audience. Focus sur les objectifs stratégiques et les engagements protocolaires.";
  } else if (contentAnalysis.includes('atelier') || contentAnalysis.includes('formation')) {
    contextualPrompt = "C'est un atelier. Focus sur les chiffres clés, les solutions validées et l'impact technique.";
  } else if (contentAnalysis.includes('signature') || contentAnalysis.includes('convention')) {
    contextualPrompt = "C'est une signature. Focus sur les montants, les clauses prioritaires et le calendrier d'exécution.";
  } else {
    contextualPrompt = "Focus sur les décisions prises et la vision stratégique du département.";
  }

  // --- PROMPT ALIGNÉ SUR LE DOCUMENT SYSTÈME DU MINISTÈRE ---
  const prompt = `Tu es l'Expert Principal en Communication Digitale du MEFB Guinée.
Ta mission est d'extraire les variables critiques pour générer des contenus prestigieux (Web, Facebook, LinkedIn, X).

CONTEXTE DE L'ACTIVITÉ :
- Titre : ${activity.title || 'Non spécifié'}
- Description : ${activity.description || 'Non spécifié'}
- Responsable : ${activity.responsible || 'Non spécifié'}

INSTRUCTION : ${contextualPrompt}

Génère EXACTEMENT 3 questions stratégiques pour :
1. LE RÉSULTAT CLÉ : Identifier la décision ou l'objectif atteint (Obligatoire selon les directives).
2. L'HUMANISATION : Extraire une citation prestigieuse ou un fait marquant du Ministre ou des acteurs.
3. L'IMPACT : Déterminer l'impact sur l'économie nationale ou le citoyen (Vision Simandou 2040 si pertinent).

IMPORTANT : Retourne UNIQUEMENT les questions, une par ligne, sans numérotation.`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "Tu es un expert en communication ministérielle. Ton ton est institutionnel et tourné vers les résultats." },
          { role: "user", content: prompt }
        ],
        temperature: 0.5
      })
    });

    const data = await response.json();
    const generatedText = data.choices?.[0]?.message?.content?.trim() || "";
    
    const questions = generatedText
      .split('\n')
      .map((q: string) => q.trim())
      .filter((q: string) => q.length > 10)
      .slice(0, 3);

    return questions.length >= 3 ? questions : [
      "Quel est le résultat clé de cette activité ?",
      "Quelle citation forte a été prononcée ?",
      "Quel est l'impact pour l'économie nationale ?"
    ];
  } catch (error) {
    console.error("❌ Erreur génération questions:", error);
    return ["Résultat clé ?", "Citation ?", "Impact ?"];
  }
};

export const generateGroupBriefing = async (activity: any) => {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  const url = "https://api.groq.com/openai/v1/chat/completions";

  // --- LOGIQUE DE BASCULEMENT AUTOMATIQUE ---
  // On compte les responsables (séparés par virgule ou "et")
  const names = activity.responsible.split(/[,|/]| et /).filter((n: string) => n.trim() !== "");
  
  // Si <= 4 personnes, on renvoie une instruction spéciale pour déclencher l'individuel
  if (names.length > 0 && names.length <= 4) {
    return "TRIGGER_INDIVIDUAL_CONVOCATION";
  }

  // Déterminer le type de destinataires
  const isForResponsibles = activity.responsible && activity.responsible.length > 0;
  const isForParticipants = activity.participants && activity.participants.length > 0;
  const destinataires = isForResponsibles ? 'responsables' : 'participants';

  const prompt = `
    Tu es l'Attaché de Cabinet au MEFB Guinée. 
    Rédige un message WhatsApp de convocation collective, TRÈS PROFESSIONNEL, RESPECTUEUX et COURTOIS, destiné aux ${destinataires}.
    
    INFOS :
    - Activité : ${activity.title}
    - Date : ${activity.date}
    - Lieu : ${activity.location || 'Cabinet du Ministère'}
    - Description : ${activity.description || 'À définir'}

    CONSIGNES STRICTES :
    1. COURT et CLAIR (max 4-5 lignes).
    2. PAS DE GRAS (ne jamais utiliser de **).
    3. Ton solennel, respectueux et officiel : "Bonjour à tous, sur instruction de Madame la Cheffe de Cabinet, nous avons l'honneur de vous convier..."
    4. IMPORTANT: Mentionner le VRAI LIEU de l'activité (${activity.location}), pas la DGB sauf si c'est le lieu réel.
    5. Utiliser une formule de politesse pour clôturer : "Nous vous remercions par avance pour votre présence..."
    6. Utilise max 2 émojis (🇬🇳, 🏛️) pour un ton formel mais accueillant.
    7. Formule appropriée pour les ${destinataires}: 
       - Pour responsables: "votre présence en tant que responsable est vivement souhaitée..."
       - Pour participants: "votre présence en tant que participant est vivement souhaitée..."
  `;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3
      })
    });
    const data = await response.json();
    return data.choices[0].message.content.replace(/\*\*/g, ""); // Sécurité anti-gras
  } catch (error) {
    const locationText = activity.location || 'Cabinet du Ministère';
    return `Convocation officielle : ${activity.title} le ${activity.date} au ${locationText}. Merci de votre présence. 🇬🇳`;
  }
};

export const generateEditorialContent = async (inputText: string, title: string, platform: string) => {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  const url = "https://api.groq.com/openai/v1/chat/completions";

  if (!apiKey) {
    console.error("❌ VITE_GROQ_API_KEY is not configured in .env");
    return "⚠️ Clé API Groq manquante. Vérifiez votre fichier .env";
  }

  let platformInstructions = "";
  const normalizedPlatform = platform.toLowerCase().trim();

  // --- 1. CONFIGURATION DES PLATEFORMES SELON LE GUIDE OFFICIEL ---
  if (normalizedPlatform === "facebook") {
    platformInstructions = `
    FORMAT FACEBOOK (Proximité & Visuel) :
    - Structure : Titre accrocheur avec Emoji (Unicode Bold) | Texte aéré | Call-to-action (Lien vers le site) | Hashtags[cite: 27].
    - Style : Direct, utilisant le "Nous" (le département), engageant, valorisant l'aspect humain[cite: 28].
    - Focus : Le "Quoi" et le "Pourquoi" pour le citoyen moyen[cite: 29].
    - Références obligatoires : @Présidence de la République de Guinée, @Gouvernement de la République de Guinée[cite: 49, 56].
    - Hashtags : #MEFBGuinee #FinancesGN #Simandou2040 #ServirLaGuinee[cite: 56].`;

  } else if (normalizedPlatform === "linkedin") {
    platformInstructions = `
    FORMAT LINKEDIN (Expertise & Réseautage) :
    - Structure : Accroche stratégique (Unicode Bold) | Analyse des enjeux | Remerciements/Tag des partenaires | Hashtags sectoriels[cite: 31].
    - Style : Professionnel, orienté "Bilan" et "Vision stratégique"[cite: 32].
    - Focus : Réformes, gouvernance, partenariats techniques et financiers[cite: 33].
    - Hashtags : #MEFBGuinee #ReformeEconomique #Gouvernance #Simandou2040[cite: 64].`;

  } else if (normalizedPlatform === "x" || normalizedPlatform === "twitter") {
    platformInstructions = `
    FORMAT X (Twitter) (Réactivité & Impact) :
    - Structure : Message court (< 280 caractères) | Emojis ciblés | Hashtags[cite: 35].
    - Style : Concis, percutant, utilisant des verbes d'action[cite: 35].
    - Règle : Une seule phrase factuelle et percutante[cite: 35].`;

  } else if (normalizedPlatform === "site web") {
    platformInstructions = `
    FORMAT SITE WEB OFFICIEL (Format Long & Formel) :
    - Structure : TITRE EN MAJUSCULES | Corps du texte | Conclusion institutionnelle[cite: 23].
    - Style : Journalistique, narratif, utilisant le passé composé ou le présent de narration[cite: 24].
    - Protocole : Utilisation impérative des titres "Son Excellence", "Monsieur le Ministre".
    - Focus : Analyse approfondie du sujet, impact sur l'économie nationale[cite: 25].`;

  } else if (normalizedPlatform === "presse" || normalizedPlatform === "conférence de presse" || normalizedPlatform === "email") {
    platformInstructions = `
    FORMAT CONFÉRENCE DE PRESSE / PRESSE :
    - Structure : Titre accrocheur | Contexte introductif | Déclarations principales | Données chiffrées obligatoires[cite: 43, 69].
    - Style : Journalistique professionnel, informatif et solennel[cite: 69].
    - Données : Mentionner impérativement les pourcentages, montants et horizons temporels[cite: 69].`;

  } else {
    platformInstructions = `FORMAT GÉNÉRAL : Ton institutionnel, prestigieux et tourné vers les résultats[cite: 17].`;
  }

  // --- 2. CONSTRUCTION DU PROMPT SYSTÈME MEFB ---
  const prompt = `
    Tu es l'Expert Principal en Communication Digitale du Ministère de l'Économie, des Finances et du Budget de Guinée.
    
    MISSION : Générer un contenu percutant pour ${platform} à partir de l'activité suivante[cite: 15].
    
    CONTENU SOURCE :
    - Titre/Événement : ${title}
    - Description brute : ${inputText}

    DIRECTIVES CRITIQUES :
    1. RÈGLE D'OR : Ne jamais inventer de faits. Utilise uniquement les variables fournies.
    2. CONTEXTE : Afrique francophone, style soutenu et respect des titres protocolaires.
    3. TON : Institutionnel, prestigieux, dynamique et tourné vers les résultats[cite: 17].
    4. SÉCURITÉ : Si les informations sont insuffisantes pour identifier le "Résultat Clé", demande des précisions avant de générer[cite: 71].
    5. INTERDICTION : Ne jamais mentionner que le texte est généré par une IA.
    6. FORMATAGE : Pas de gras (**), d'astérisques (*) ou de markdown. Texte brut uniquement.

    INSTRUCTIONS SPÉCIFIQUES POUR ${platform.toUpperCase()} :
    ${platformInstructions}

    Génère maintenant le contenu optimisé :
  `;

  // --- 3. EXÉCUTION DE L'APPEL GROQ ---
  try {
    console.log("📤 Appel Groq MEFB - Plateforme:", platform);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${apiKey}`, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "Tu es un expert en communication gouvernementale guinéenne." },
          { role: "user", content: prompt }
        ],
        temperature: 0.3 // Plus bas pour assurer le respect des faits et du ton
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ Erreur API Groq:", data);
      return `Contenu ${platform} généré à partir de ${title}.`;
    }

    const content = data.choices?.[0]?.message?.content?.trim() || "";
    
    // Nettoyage final des résidus de Markdown pour une publication propre
    const cleanedContent = content
      .replace(/\*\*/g, "") // Supprime le gras
      .replace(/\*/g, "")   // Supprime les astérisques
      .trim();

    return cleanedContent;

  } catch (error) {
    console.error("❌ Erreur critique génération IA:", error);
    return `Erreur lors de la génération du contenu pour ${platform}.`;
  }
};

export const generateWebsiteArticleFromInterview = async (activity: any, interviewNotes: string) => {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  const url = "https://api.groq.com/openai/v1/chat/completions";

  if (!apiKey) {
    console.error("❌ VITE_GROQ_API_KEY is not configured");
    return "⚠️ Clé API Groq manquante. Vérifiez votre fichier .env";
  }

  const title = activity.title || 'Article Cabinet';
  const questionBlock = activity.interview_questions && activity.interview_questions.length > 0
    ? activity.interview_questions.map((q: string, i: number) => `${i + 1}. ${q}`).join('\n')
    : '';

  // --- PROMPT FUSIONNÉ : TA LOGIQUE + GUIDE PRESTIGE ---
  const prompt = `Tu es l'Expert Principal en Communication Digitale du MEFB Guinée. 
Ta mission est de produire un article de fond prestigieux pour le SITE WEB OFFICIEL.

CONTEXTE INSTITUTIONNEL :
- ACTIVITÉ : ${activity.title || 'Non spécifié'}
- DATE : ${activity.date || 'Non spécifiée'}
- LIEU : ${activity.location || 'Non précisé'}
- DESCRIPTION : ${activity.description || 'Non précisé'}

RÉFÉRENCES D'INTERVIEW (Questions & Réponses) :
QUESTIONS POSÉES :
${questionBlock}

RÉPONSES DU RÉDACTEUR :
${interviewNotes}

DIRECTIVES DE RÉDACTION OBLIGATOIRES (STYLE MEFB) :
1. TITRE : En MAJUSCULES uniquement, solennel et prestigieux. [cite: 22, 23]
2. STYLE : Journalistique, narratif, utilisant le passé composé ou le présent de narration. [cite: 24]
3. PROTOCOLE : Utilisation impérative des titres comme "Son Excellence" ou "Monsieur le Ministre". 
4. STRUCTURE : 6 à 8 paragraphes fluides intégrant les citations et résultats de manière naturelle. [cite: 22]
5. FOCUS : Analyse approfondie du sujet et impact sur l'économie nationale. 
6. RÈGLE D'OR : Ne jamais inventer de faits. Utilise uniquement les variables fournies. [cite: 20]
7. FORMATAGE : Pas de gras (**), d'astérisques (*) ou d'émojis. Texte brut uniquement. [cite: 16]

ARTICLE DU SITE WEB :`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "Tu es le Rédacteur en Chef institutionnel du MEFB. Ton ton est prestigieux et tourné vers les résultats." },
          { role: "user", content: prompt }
        ],
        temperature: 0.35, // Réduit pour garantir la fidélité aux faits [cite: 20]
        max_tokens: 1500  // Augmenté pour permettre un article long et détaillé [cite: 22]
      })
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() || '';
    
    // Nettoyage final pour une publication immédiate sans Markdown
    return content.replace(/\*\*/g, '').replace(/\*/g, '').trim();
  } catch (error) {
    console.error("❌ Erreur génération article site web:", error);
    return `Article pour le site web généré à partir de l'activité ${title}.`;
  }
};

export const generateMonthlySummary = async (activities: any[]): Promise<string> => {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  const url = "https://api.groq.com/openai/v1/chat/completions";

  if (!apiKey) {
    console.error("❌ VITE_GROQ_API_KEY is not configured");
    return "Aucune synthèse disponible. Clé API manquante.";
  }

  const activityCount = activities.length;
  const summaryLines = activities
    .slice(0, 8)
    .map((activity: any) => `- ${activity.title || 'Activité'} (${activity.date || 'date inconnue'}) : ${activity.description ? activity.description.substring(0, 120) : 'Aucune description disponible'}`)
    .join("\n");

  const prompt = `
    Tu es le service de synthèse du Ministère de l'Économie, des Finances et du Budget de la République de Guinée.
    Rédige une synthèse administrative de haute administration en français, en 5 lignes maximum.
    Ne pas utiliser de gras, pas d'astérisques, pas de markdown.
    Ton : formel, institutionnel, guinéen.

    CONTEXTE :
    - Nombre d'activités validées : ${activityCount}
    - Période : période courante
    - Données des activités :
    ${summaryLines}

    CONSIGNES :
    - Résume l'impact, l'état d'avancement et les priorités.
    - Préserve le ton du MEFB, sans emphase graphique.
    - Reste synthétique, 5 lignes maximum.
  `;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3
      })
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() || '';
    const cleanedContent = content.replace(/\*\*/g, "").replace(/\*/g, "").trim();
    return cleanedContent;
  } catch (error) {
    console.error("❌ Erreur génération synthèse mensuelle IA:", error);
    return "La synthèse automatique n'a pu être générée pour le moment.";
  }
};

export const generatePressSummary = async (inputText: string, title: string) => {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  const url = "https://api.groq.com/openai/v1/chat/completions";

  if (!apiKey) {
    console.error("❌ VITE_GROQ_API_KEY is not configured in .env");
    return "⚠️ Clé API Groq manquante. Vérifiez votre fichier .env";
  }

  const prompt = `
    Tu es l'assistant de synthèse du Ministère de l'Économie, des Finances et du Budget de Guinée.
    Résume l'article suivant en français pour permettre à une ministre de comprendre rapidement l'essentiel.

    TITRE : ${title}
    TEXTE : ${inputText}

    CONSIGNES :
    - Fournis un résumé clair en 3 paragraphes maximum.
    - Donne le contexte, les points clés et l'impact principal.
    - Utilise un ton formel, institutionnel et synthétique.
    - N'utilise pas de markdown, d'emoji ou de balisage.
    - Ne mentionne jamais que le texte est généré par une IA.
  `;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3
      })
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() || '';
    const cleanedContent = content.replace(/\*\*/g, "").replace(/\*/g, "").trim();
    return cleanedContent;
  } catch (error) {
    console.error("❌ Erreur génération résumé IA:", error);
    return "Impossible de générer le résumé IA pour le moment.";
  }
};

/**
 * Génère un article éditorial institutionnel complet à partir d'une publication sociale validée.
 * Utilisé pour alimenter le Bulletin Stratégique et les autres magazines de production.
 * @param publication - La publication sociale avec son résumé IA, plateforme, auteur
 * @param theme - Le thème du magazine (standard=bleu, success=vert, urgent=rouge)
 * @returns L'article complet avec titre, analyse, impact et perspectives
 */
export const generateMagazineArticleFromPublication = async (
  publication: {
    url: string;
    platform: string;
    format: string;
    user_name: string;
    user_role: string;
    summary: string;
    ai_summary?: string;
    published_at: string;
  },
  theme: 'standard' | 'success' | 'urgent' = 'standard'
): Promise<{ title: string; content: string; meta: string; isStrategic: boolean }> => {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  const apiUrl = "https://api.groq.com/openai/v1/chat/completions";

  const rawContent = publication.ai_summary || publication.summary || '';
  const pubDate = new Date(publication.published_at).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  // --- ÉTAPE 1 : FILTRE DE PERTINENCE STRATÉGIQUE ---
  // On ignore les contenus trop courts ou purement techniques (ex: tests, synchronisations)
  const nonStrategicKeywords = ['test', 'synchro', 'mise à jour', 'image simple', 'partage de lien'];
  const isTooShort = rawContent.length < 50;
  const containsNonStrategic = nonStrategicKeywords.some(word => rawContent.toLowerCase().includes(word));

  if (isTooShort || containsNonStrategic) {
    return {
      title: "Contenu non stratégique",
      content: "Cette publication ne contient pas d'éléments d'analyse suffisants pour le Bulletin Stratégique du Cabinet.",
      meta: `${pubDate} · ${publication.platform}`,
      isStrategic: false
    };
  }

  // --- ÉTAPE 2 : PROMPTS DE HAUTE ADMINISTRATION (FUSIONNÉS AVEC TON CODE) ---
  const prompts: Record<string, string> = {
    standard: `Tu es le Conseiller Stratégique au Cabinet du MEFB Guinée.
    MISSION : Transformer cette publication en une NOTE D'ANALYSE pour le Bulletin Stratégique.
    CONTENU : ${rawContent}
    
    FORMAT STRICT :
    LIGNE 1 : Titre stratégique (MAJUSCULES, ton d'autorité, vision Simandou 2040 si pertinent).
    LIGNE 3 : Un paragraphe continu (130-160 mots). Style administratif de haute administration. 
    Focus : Enjeux systémiques, réformes engagées et signal envoyé aux partenaires.
    
    RÈGLE D'OR : Pas de gras, pas d'astérisques, pas d'émojis. Texte brut uniquement.`,

    success: `Tu es le Responsable du Bilan des Réformes du MEFB.
    MISSION : Rédiger une FICHE DE RÉUSSITE pour le Cabinet.
    CONTENU : ${rawContent}
    
    FORMAT STRICT :
    LIGNE 1 : Titre célébrant un résultat concret (MAJUSCULES, commence par RÉALISATION ou SUCCÈS).
    LIGNE 3 : Un paragraphe continu (130-160 mots). 
    Focus : Impacts positifs pour le citoyen, données chiffrées et alignement avec la vision gouvernementale.
    
    RÈGLE D'OR : Pas de gras, pas d'astérisques. Prestige et résultats uniquement.`,

    urgent: `Tu es le Conseiller en Gestion des Risques du Cabinet.
    MISSION : Rédiger une NOTE DE VIGILANCE pour le Ministre.
    CONTENU : ${rawContent}
    
    FORMAT STRICT :
    LIGNE 1 : Titre d'alerte factuel (MAJUSCULES, commence par POINT DE VIGILANCE).
    LIGNE 3 : Un paragraphe continu (130-160 mots).
    Focus : Identification du risque, implications budgétaires et recommandation actionnable.
    
    RÈGLE D'OR : Ton direct, factuel, sans alarmisme. Pas de gras.`
  };

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "Tu es un haut cadre de l'administration guinéenne, expert en rédaction de notes de cabinet." },
          { role: "user", content: prompts[theme] }
        ],
        temperature: 0.35 // Bas pour maintenir la rigueur administrative
      })
    });

    const data = await response.json();
    const rawOutput = data.choices?.[0]?.message?.content?.trim() || '';
    
    // Nettoyage rigoureux du Markdown et des labels inutiles
    const cleaned = rawOutput
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/^(LIGNE\s*\d+\s*:?\s*)/gmi, '')
      .trim();

    const lines = cleaned.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 3);
    const title = lines[0]?.toUpperCase() || `NOTE STRATÉGIQUE — ${publication.platform}`;
    const body = lines.slice(1).join(' ').trim();

    return {
      title,
      content: body,
      meta: `${pubDate} · ${publication.platform} · ${publication.user_name || 'Cabinet MEFB'}`,
      isStrategic: true
    };
  } catch (error) {
    console.error("❌ Erreur Magazine:", error);
    return {
      title: "ANALYSE INDISPONIBLE",
      content: "Une erreur technique a empêché la génération de l'analyse stratégique.",
      meta: pubDate,
      isStrategic: false
    };
  }
};
/**
 * Humanise et corrige un article généré par l'IA
 * Applique les 4 règles : nettoyage IA, correction orthographique, style institutionnel, rhythm & soul
 * @param inputText Le texte brut à humaniser
 * @returns Promise<string> Le texte humanisé et corrigé
 */
export const humanizeAndCorrectContent = async (inputText: string): Promise<string> => {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  const url = "https://api.groq.com/openai/v1/chat/completions";

  if (!apiKey) {
    console.error("❌ VITE_GROQ_API_KEY is not configured");
    return inputText;
  }

  const prompt = `Tu es un expert en communication institutionnelle au Ministère de l'Économie, des Finances et du Budget de Guinée. Tu dois humaniser et corriger un article généré par l'IA selon ces règles strictes :

ARTICLE À TRAITER :
${inputText}

RÈGLES D'HUMANISATION & CORRECTION :

1️⃣ NETTOYAGE IA :
- Supprimer les termes de remplissage : "En conclusion", "Il est important de noter", "De ce fait", "Ainsi", "Par ailleurs"
- Éliminer les métaphores pompeuses : "testament de", "moment pivot", "carrefour stratégique", "tournant majeur"
- Retirer les structures en listes boldées répétitives
- Supprimer les formules creuses comme "Sans nul doute", "Incontestablement", "Force est de constater"

2️⃣ CORRECTION ORTHOGRAPHIQUE :
- Identifier et corriger TOUTES les coquilles et fautes de frappe
- Vérifier l'accord des adjectifs et participes
- Corriger les erreurs de conjugaison
- Vérifier la ponctuation (tirets, virgules, points-virgules)

3️⃣ STYLE INSTITUTIONNEL :
- Utiliser des verbes d'état simples : "est", "a", "demeure" plutôt que "sert de", "représente un", "constitue une"
- Préférer l'actif au passif : "Le Ministère a pris" plutôt que "Il a été pris par le Ministère"
- Utiliser un ton direct et assertif, sans hésitation
- Éviter les diminutifs et les formules trop familières

4️⃣ RHYTHM & SOUL (Rendre le texte "humain") :
- Varier la longueur des phrases : mélanger des phrases courtes percutantes et des périodes plus développées
- Ajouter des connecteurs naturels : "Cependant", "Néanmoins", "Par contre" plutôt que de juxtaposer les phrases
- Injecter de la vie dans le langage : utiliser des verbes forts ("impulser", "galvaniser", "catalyser" au lieu de "promouvoir", "favoriser")
- Rendre le texte comme s'il avait été écrit par un haut fonctionnaire expérimenté du Cabinet, pas une machine

RÉSULTAT ATTENDU :
Retourne UNIQUEMENT le texte humanisé et corrigé, sans explications, sans métadonnées, sans marquage de correction. Le texte doit être prêt pour publication.`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.5,
        max_tokens: 2000
      })
    });

    const data = await response.json();
    
    if (data.choices?.[0]?.message?.content) {
      return data.choices[0].message.content.trim();
    }
    
    return inputText;
  } catch (error) {
    console.error("❌ Erreur lors de l'humanisation:", error);
    return inputText;
  }
};
