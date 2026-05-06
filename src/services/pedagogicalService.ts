import { PedagogicalConcept, PedagogicalCapsule } from '../types';

/** Génère un UUID v4 compatible avec tous les contextes (HTTP et HTTPS) */
const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback manuel pour les contextes non-sécurisés (HTTP local, IP réseau)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Effectue un appel API avec retry automatique et timeouts robustes
 * @param prompt Le prompt à envoyer à l'IA
 * @param maxTokens Nombre maximum de tokens
 * @param temperature Température du modèle (créativité)
 * @param maxRetries Nombre maximum de tentatives
 * @returns Le contenu généré
 */
const makeRequestWithRetry = async (
  prompt: string,
  maxTokens: number,
  temperature: number,
  maxRetries: number = 3
): Promise<string> => {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  const url = "https://api.groq.com/openai/v1/chat/completions";
  const MODEL = "llama-3.3-70b-versatile";

  if (!apiKey) {
    throw new Error("VITE_GROQ_API_KEY non configurée");
  }

  let lastError: Error | null = null;
  const TIMEOUT_MS = 50000; // 50 secondes par tentative
  const BASE_BACKOFF_MS = 1000; // 1 seconde d'attente initiale

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📡 Appel API (tentative ${attempt}/${maxRetries})...`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: MODEL,
            messages: [{ role: "user", content: prompt }],
            temperature,
            max_tokens: maxTokens,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorBody = await response.text();
          const errorMsg = `Erreur API Groq (${response.status}): ${errorBody}`;
          
          // Retry sur erreurs temporaires (429, 500, 503)
          if ([429, 500, 503].includes(response.status) && attempt < maxRetries) {
            const delayMs = Math.min(BASE_BACKOFF_MS * Math.pow(2, attempt - 1), 15000);
            const retryMsg = `⏳ Tentative ${attempt} échouée (${response.status}), nouvelle tentative dans ${(delayMs / 1000).toFixed(1)}s...`;
            console.log(retryMsg);
            await new Promise(resolve => setTimeout(resolve, delayMs));
            continue;
          }

          throw new Error(errorMsg);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content?.trim();

        if (!content) {
          throw new Error('Réponse vide de l\'API Groq');
        }

        if (attempt > 1) {
          console.log(`✅ Succès à la tentative ${attempt}`);
        }
        return content;

      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }

    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          lastError = new Error(`Timeout API (${TIMEOUT_MS / 1000}s)`);
        } else {
          lastError = error;
        }
      } else {
        lastError = new Error(String(error));
      }

      if (attempt < maxRetries) {
        console.log(`⚠️ Tentative ${attempt} échouée: ${lastError.message}`);
      }
    }
  }

  const finalError = lastError || new Error('Échec de la génération après plusieurs tentatives');
  console.error(`❌ Tous les appels ont échoué: ${finalError.message}`);
  throw finalError;
};
interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

const validateGeneratedContent = (
  videoScript: string,
  socialContent: string,
  visualSuggestions: string[]
): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validations du script vidéo
  if (!videoScript || videoScript.trim().length === 0) {
    errors.push('Le script vidéo est vide');
  } else if (videoScript.length < 50) {
    errors.push('Le script vidéo est trop court (minimum 50 caractères)');
  } else if (videoScript.length > 1000) {
    warnings.push('Le script vidéo est très long (peut dépasser 60 secondes)');
  } else {
    // Vérifier si le script n'est pas du charabia ou une erreur IA
    const wordCount = videoScript.split(/\s+/).length;
    if (wordCount < 15) {
      errors.push('Le script vidéo contient très peu de mots (risque de contenu invalide)');
    }
  }

  // Validations du contenu réseaux sociaux
  if (!socialContent || socialContent.trim().length === 0) {
    errors.push('Le contenu réseaux sociaux est vide');
  } else if (socialContent.length > 280) {
    errors.push(`Le post est trop long: ${socialContent.length}/280 caractères`);
  } else if (socialContent.length < 20) {
    errors.push('Le post est trop court (minimum 20 caractères)');
  } else if (!socialContent.includes('#')) {
    warnings.push('Le post devrait contenir au moins un hashtag');
  }

  // Validations des suggestions visuelles
  if (!Array.isArray(visualSuggestions)) {
    errors.push('Les suggestions visuelles ne sont pas un tableau');
  } else if (visualSuggestions.length === 0) {
    errors.push('Aucune suggestion visuelle générée');
  } else if (visualSuggestions.length > 5) {
    warnings.push('Plus de 5 suggestions visuelles (réduire à 3)');
  } else {
    const invalidSuggestions = visualSuggestions.filter(
      (s) => !s || s.trim().length < 10
    );
    if (invalidSuggestions.length > 0) {
      errors.push(`${invalidSuggestions.length} suggestion(s) visuelle(s) invalide(s) (minimum 10 caractères)`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

/**
 * Génère une capsule pédagogique complète (script vidéo + contenu RS + suggestions visuelles)
 * @param concept Le concept pédagogique sélectionné
 * @returns Promise<PedagogicalCapsule> La capsule générée avec validations
 */
export const generatePedagogicalCapsule = async (concept: PedagogicalConcept): Promise<PedagogicalCapsule> => {
  console.log(`🎬 Génération capsule pour: "${concept.concept_name}"`);

  // Prompts d'IA
  const videoPrompt = `Tu es un pédagogue expert au Ministère de l'Économie et des Finances de Guinée.
Tu dois créer un SCRIPT VIDÉO de 60 secondes maximum pour vulgariser le concept budgétaire/fiscal suivant.

CONCEPT À VULGARISER :
- Nom : ${concept.concept_name}
- Définition technique : ${concept.technical_definition}
- Explication simplifiée : ${concept.simplified_explanation}

INSTRUCTIONS pour le SCRIPT VIDÉO :
1. Durée maximale : 60 secondes (environ 150 mots)
2. Structure :
   - Introduction accrocheuse (10s) : Une question ou situation concrète
   - 3 points clés simplifiés (30s) : Expliquer simplement avec analogies
   - Appel à l'action (10s) : Encourager à suivre pour plus d'infos
3. Style : Ton institutionnel mais proche du peuple, rythme varié, langage accessible
4. Éviter le jargon technique lourd

FORMAT de réponse : Seulement le script vidéo, rien d'autre.`;

  const socialPrompt = `Tu es un community manager au Ministère de l'Économie et des Finances de Guinée.
Tu dois créer un POST RÉSEAUX SOCIAUX pour accompagner la capsule vidéo pédagogique.

CONCEPT : ${concept.concept_name}
EXPLICATION : ${concept.simplified_explanation}

INSTRUCTIONS pour le POST RS :
1. Maximum 280 caractères (format Twitter/X)
2. Inclure : Hashtag #PedagogieMEFB, émojis appropriés, appel à engagement
3. Style : "Skill Humanizer" - pas de jargon lourd, rythme varié, ton institutionnel mais proche
4. Terminer par une question pour engager la communauté

FORMAT de réponse : Seulement le texte du post, rien d'autre.`;

  const visualPrompt = `Tu es un designer graphique spécialisé dans la communication institutionnelle.
Pour le concept "${concept.concept_name}", propose 3 idées d'infographies simples pour illustrer la capsule pédagogique.

CONCEPT DÉTAIL : ${concept.technical_definition}
EXPLICATION SIMPLE : ${concept.simplified_explanation}

INSTRUCTIONS :
1. Idées simples et compréhensibles
2. Utiliser les codes visuels du Ministère (bleu #175a95, blanc, gris ardoise)
3. Format adapté aux réseaux sociaux
4. Maximum 3 idées, chacune en une phrase descriptive

FORMAT de réponse : Liste numérotée de 3 idées, rien d'autre.`;

  try {
    console.log('⏳ Génération en parallèle (script, social, visuels)...');
    
    // Génération en parallèle des 3 contenus avec retry
    const [videoScript, socialContent, visualText] = await Promise.all([
      makeRequestWithRetry(videoPrompt, 400, 0.7),
      makeRequestWithRetry(socialPrompt, 200, 0.8),
      makeRequestWithRetry(visualPrompt, 200, 0.6),
    ]);

    console.log('✅ Contenu généré, validation en cours...');

    // Parser les suggestions visuelles
    let visualSuggestions = visualText
      .split('\n')
      .filter((line: string) => line.trim().match(/^\d+\./))
      .map((line: string) => line.replace(/^\d+\.\s*/, '').trim())
      .filter((line: string) => line.length > 5)
      .slice(0, 3);

    // Fallback si le parsing échoue
    if (visualSuggestions.length < 2) {
      console.log('⚠️ Suggestions visuelles insuffisantes, fallback activé');
      visualSuggestions = [
        'Infographie comparative avec éléments visuels du concept',
        'Diagramme illustrant les principes clés',
        'Frise chronologique ou cycle explicatif'
      ];
    }

    // Valider le contenu généré
    const validation = validateGeneratedContent(
      videoScript,
      socialContent,
      visualSuggestions
    );

    if (!validation.isValid) {
      console.error('❌ Validation échouée:', validation.errors);
      throw new Error(`Contenu invalide: ${validation.errors.join(', ')}`);
    }

    if (validation.warnings.length > 0) {
      console.warn('⚠️ Avertissements:', validation.warnings);
    }

    // Créer la capsule validée
    const capsule: PedagogicalCapsule = {
      id: generateUUID(),
      concept,
      video_script: videoScript.trim(),
      social_content: socialContent.trim(),
      visual_suggestions: visualSuggestions,
      generated_at: new Date().toISOString(),
    };

    console.log('✅ Capsule pédagogique générée avec succès');
    return capsule;

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ Erreur génération capsule:', errorMsg);
    throw new Error(`Erreur lors de la génération de la capsule: ${errorMsg}`);
  }
};

/**
 * Récupère tous les concepts pédagogiques
 * @returns Promise<PedagogicalConcept[]> Liste des concepts
 */
export const getPedagogicalConcepts = async (): Promise<PedagogicalConcept[]> => {
  const { supabase } = await import('../lib/supabaseClient');

  const { data, error } = await supabase
    .from('pedagogical_vault')
    .select('*')
    .order('last_used_at', { ascending: false, nullsFirst: true });

  if (error) {
    console.error('Erreur récupération concepts pédagogiques:', error);
    throw error;
  }

  return data || [];
};

/**
 * Met à jour le statut d'un concept
 * @param conceptId ID du concept
 * @param status Nouveau statut
 */
export const updateConceptStatus = async (conceptId: string, status: 'draft' | 'ready'): Promise<void> => {
  const { supabase } = await import('../lib/supabaseClient');

  const { error } = await supabase
    .from('pedagogical_vault')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', conceptId);

  if (error) {
    console.error('Erreur mise à jour statut concept:', error);
    throw error;
  }
};

/**
 * Ajoute un nouveau concept pédagogique
 * @param concept Données du concept
 * @returns Promise<PedagogicalConcept> Le concept créé
 */
export const addPedagogicalConcept = async (concept: Omit<PedagogicalConcept, 'id' | 'created_at' | 'updated_at'>): Promise<PedagogicalConcept> => {
  const { supabase } = await import('../lib/supabaseClient');

  const { data, error } = await supabase
    .from('pedagogical_vault')
    .insert([{
      ...concept,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }])
    .select()
    .single();

  if (error) {
    console.error('Erreur ajout concept pédagogique:', error);
    throw error;
  }

  return data;
};

/**
 * Sauvegarde une capsule comme brouillon (NEW: utilise table pedagogical_capsules)
 */
export const saveCapsuleDraft = async (
  capsule: PedagogicalCapsule,
  userId: string,
  userName: string
): Promise<string> => {
  const { supabase } = await import('../lib/supabaseClient');

  const { data, error } = await supabase
    .from('pedagogical_capsules')
    .insert([{
      concept_id: capsule.concept.id,
      video_script: capsule.video_script,
      social_content: capsule.social_content,
      visual_suggestions: capsule.visual_suggestions,
      status: 'draft',
      created_by: userId,
      created_by_name: userName,
    }])
    .select('id')
    .single();

  if (error) {
    console.error('❌ Erreur sauvegarde brouillon:', error);
    throw error;
  }

  console.log('✅ Capsule brouillon sauvegardée:', data.id);
  return data.id;
};

/**
 * Publie une capsule pédagogique (NEW: utilise table pedagogical_capsules)
 */
export const publishCapsule = async (
  capsule: PedagogicalCapsule,
  publishedBy: string,
  userId?: string
): Promise<{ capsuleId: string; publicationId: string }> => {
  const { supabase } = await import('../lib/supabaseClient');

  const now = new Date().toISOString();

  try {
    console.log(`📤 Publication capsule: "${capsule.concept.concept_name}"`);

    // 1. Créer/mettre à jour publication dans social_publications
    const serializedData = `[CONCEPT: ${capsule.concept.concept_name}]
[SCRIPT]
${capsule.video_script}
[SOCIAL]
${capsule.social_content}
[VISUALS]
${capsule.visual_suggestions.join('\\n')}`;

    const { data: pubData, error: pubError } = await supabase
      .from('social_publications')
      .insert([{
        platform: 'Capsule Pédagogique',
        format: 'Capsule Vidéo',
        publisher_name: publishedBy,
        ai_summary: serializedData,
        summary: capsule.social_content, // Résumé court
        published_at: now,
        url: `https://mefb.gov.gn/pedagogie/capsule/${capsule.concept.id}`,
        created_at: now,
      }])
      .select('id')
      .single();

    if (pubError) {
      console.error('❌ Erreur social_publications:', pubError);
      throw pubError;
    }

    // 2. Insérer/mettre à jour dans pedagogical_capsules
    const { data: capsuleData, error: capsuleError } = await supabase
      .from('pedagogical_capsules')
      .upsert([{
        concept_id: capsule.concept.id,
        video_script: capsule.video_script,
        social_content: capsule.social_content,
        visual_suggestions: capsule.visual_suggestions,
        status: 'published',
        published_at: now,
        published_by: userId,
        published_by_name: publishedBy,
        social_publication_id: pubData.id,
      }], 
      {
        onConflict: 'concept_id,status',
      })
      .select('id')
      .single();

    if (capsuleError) {
      console.error('❌ Erreur pedagogical_capsules:', capsuleError);
      throw capsuleError;
    }

    // 3. Mettre à jour last_used_at du concept
    const { error: vaultError } = await supabase
      .from('pedagogical_vault')
      .update({ last_used_at: now, updated_at: now })
      .eq('id', capsule.concept.id);

    if (vaultError) {
      console.error('⚠️ Avertissement mise à jour vault:', vaultError);
    }

    console.log('✅ Capsule publiée avec succès');
    return {
      capsuleId: capsuleData.id,
      publicationId: pubData.id,
    };

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ Erreur publication:', errorMsg);
    throw new Error(`Erreur lors de la publication: ${errorMsg}`);
  }
};

/**
 * Récupère les capsules brouillons et publiées (utilise table pedagogical_capsules)
 */
export const getAllCapsules = async (): Promise<any[]> => {
  const { supabase } = await import('../lib/supabaseClient');

  const { data, error } = await supabase
    .from('pedagogical_capsules')
    .select(
      `
      id,
      concept_id,
      video_script,
      social_content,
      visual_suggestions,
      status,
      published_at,
      published_by_name,
      created_by_name,
      created_at,
      view_count,
      pedagogical_vault(concept_name, technical_definition, simplified_explanation)
      `
    )
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Erreur récupération capsules:', error);
    return [];
  }

  return (data || []).map((capsule: any) => ({
    concept_name: capsule.pedagogical_vault?.[0]?.concept_name || 'Concept inconnu',
    ...capsule,
  }));
};

/**
 * Récupère uniquement les capsules publiées (pour l'historique)
 */
export const getPublishedCapsules = async (): Promise<any[]> => {
  const { supabase } = await import('../lib/supabaseClient');

  const { data, error } = await supabase
    .from('pedagogical_capsules')
    .select(
      `
      id,
      concept_id,
      video_script,
      social_content,
      visual_suggestions,
      published_at,
      published_by_name,
      created_by_name,
      view_count,
      pedagogical_vault(concept_name)
      `
    )
    .eq('status', 'published')
    .order('published_at', { ascending: false });

  if (error) {
    console.error('❌ Erreur récupération capsules publiées:', error);
    return [];
  }

  return (data || []).map((capsule: any) => ({
    concept_name: capsule.pedagogical_vault?.[0]?.concept_name || 'Concept inconnu',
    summary: capsule.social_content,
    published_by: capsule.published_by_name,
    view_count: capsule.view_count || 0,
    ...capsule,
  }));
};

/**
 * Récupère les brouillons de capsules (NEW: pour l'interface d'édition)
 */
export const getCapsuleDrafts = async (): Promise<any[]> => {
  const { supabase } = await import('../lib/supabaseClient');

  const { data, error } = await supabase
    .from('pedagogical_capsules')
    .select(
      `
      id,
      concept_id,
      video_script,
      social_content,
      visual_suggestions,
      status,
      created_at,
      created_by_name,
      updated_at,
      pedagogical_vault(concept_name, technical_definition, simplified_explanation)
      `
    )
    .eq('status', 'draft')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('❌ Erreur récupération brouillons:', error);
    return [];
  }

  return (data || []).map((capsule: any) => ({
    concept_name: capsule.pedagogical_vault?.[0]?.concept_name || 'Concept inconnu',
    concept: capsule.pedagogical_vault?.[0],
    ...capsule,
  }));
};

/**
 * Met à jour un brouillon de capsule (NEW: édition)
 */
export const updateCapsuleDraft = async (
  capsuleId: string,
  updates: {
    video_script?: string;
    social_content?: string;
    visual_suggestions?: string[];
  }
): Promise<void> => {
  const { supabase } = await import('../lib/supabaseClient');

  // Valider le contenu avant mise à jour
  if (updates.video_script !== undefined || updates.social_content !== undefined || updates.visual_suggestions !== undefined) {
    const validation = validateGeneratedContent(
      updates.video_script || '',
      updates.social_content || '',
      updates.visual_suggestions || []
    );

    if (!validation.isValid) {
      throw new Error(`Validation échouée: ${validation.errors.join(', ')}`);
    }
  }

  const { error } = await supabase
    .from('pedagogical_capsules')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', capsuleId)
    .eq('status', 'draft');

  if (error) {
    console.error('❌ Erreur mise à jour brouillon:', error);
    throw error;
  }

  console.log('✅ Brouillon mis à jour');
};

/**
 * Supprime un brouillon de capsule (NEW: suppression)
 */
export const deleteCapsuleDraft = async (capsuleId: string): Promise<void> => {
  const { supabase } = await import('../lib/supabaseClient');

  const { error } = await supabase
    .from('pedagogical_capsules')
    .delete()
    .eq('id', capsuleId)
    .eq('status', 'draft');

  if (error) {
    console.error('❌ Erreur suppression brouillon:', error);
    throw error;
  }

  console.log('✅ Brouillon supprimé');
};

/**
 * Convertit un brouillon en publication (NEW: publication depuis brouillon)
 */
export const publishDraftCapsule = async (
  capsuleId: string,
  publishedBy: string,
  userId: string
): Promise<{ capsuleId: string; publicationId: string }> => {
  const { supabase } = await import('../lib/supabaseClient');

  try {
    // 1. Récupérer le brouillon
    const { data: draftData, error: fetchError } = await supabase
      .from('pedagogical_capsules')
      .select('*')
      .eq('id', capsuleId)
      .eq('status', 'draft')
      .single();

    if (fetchError || !draftData) {
      throw new Error('Brouillon non trouvé ou déjà publié');
    }

    // 2. Créer publication dans social_publications
    const now = new Date().toISOString();
    const serializedData = `[DRAFT → PUBLICATION]
[VIDEO_SCRIPT]
${draftData.video_script}
[SOCIAL_CONTENT]
${draftData.social_content}
[VISUAL_SUGGESTIONS]
${(draftData.visual_suggestions || []).join('\n')}`;

    const { data: pubData, error: pubError } = await supabase
      .from('social_publications')
      .insert([{
        platform: 'Capsule Pédagogique',
        format: 'Capsule Vidéo',
        user_name: publishedBy,
        user_role: 'Communication',
        summary: draftData.social_content,
        ai_summary: serializedData,
        published_at: now,
        url: `https://mefb.gov.gn/pedagogie/capsule/draft/${capsuleId}`,
        created_at: now,
      }])
      .select('id')
      .single();

    if (pubError) {
      throw pubError;
    }

    // 3. Mettre à jour le brouillon en publication
    const { error: updateError } = await supabase
      .from('pedagogical_capsules')
      .update({
        status: 'published',
        published_at: now,
        published_by: userId,
        published_by_name: publishedBy,
        social_publication_id: pubData.id,
      })
      .eq('id', capsuleId);

    if (updateError) {
      throw updateError;
    }

    console.log('✅ Brouillon publié avec succès');
    return {
      capsuleId,
      publicationId: pubData.id,
    };

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ Erreur publication brouillon:', errorMsg);
    throw new Error(`Erreur lors de la publication: ${errorMsg}`);
  }
};