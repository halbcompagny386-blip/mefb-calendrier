// src/services/apiTester.ts
// Teste les connexions aux APIs utilisées par l'application MEFB

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export interface ApiTestResult {
  success: boolean;
  message: string;
  latencyMs?: number;
  model?: string;
  details?: string;
}

/** Teste la connexion à l'API Groq (Llama 3.3) */
export const testGroqConnection = async (): Promise<ApiTestResult> => {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;

  if (!apiKey || !apiKey.trim()) {
    return {
      success: false,
      message: 'Clé API Groq introuvable.',
      details: 'Vérifiez que VITE_GROQ_API_KEY est définie dans votre fichier .env'
    };
  }

  const start = performance.now();

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: 'Réponds uniquement "OK".' }],
        max_tokens: 5,
        temperature: 0
      })
    });

    const latencyMs = Math.round(performance.now() - start);

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return {
        success: false,
        message: `Erreur HTTP ${response.status}`,
        latencyMs,
        details: err?.error?.message || response.statusText
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    const model = data.model || 'llama-3.3-70b-versatile';

    if (content) {
      return {
        success: true,
        message: `Connexion Groq établie avec succès`,
        latencyMs,
        model,
        details: `Réponse du modèle : "${content}" — Tokens utilisés : ${data.usage?.total_tokens ?? '?'}`
      };
    }

    return { success: false, message: 'Réponse vide de Groq.', latencyMs };

  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - start);
    return {
      success: false,
      message: 'Impossible de joindre Groq.',
      latencyMs,
      details: err?.message || 'Erreur réseau ou CORS'
    };
  }
};

/** Rétrocompatibilité — utilise Groq désormais */
export const testLlamaConnection = testGroqConnection;

/** Teste la connexion à Supabase */
export const testSupabaseConnection = async (): Promise<ApiTestResult> => {
  const url  = import.meta.env.VITE_SUPABASE_URL;
  const key  = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return {
      success: false,
      message: 'Variables Supabase manquantes.',
      details: 'Vérifiez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans .env'
    };
  }

  const start = performance.now();

  try {
    // Requête légère sur la table activities (limit 1)
    const response = await fetch(`${url}/rest/v1/activities?select=id&limit=1`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      }
    });

    const latencyMs = Math.round(performance.now() - start);

    if (response.ok) {
      return {
        success: true,
        message: 'Connexion Supabase établie',
        latencyMs,
        details: `URL : ${url}`
      };
    }

    return {
      success: false,
      message: `Erreur Supabase HTTP ${response.status}`,
      latencyMs,
      details: response.statusText
    };
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - start);
    return {
      success: false,
      message: 'Impossible de joindre Supabase.',
      latencyMs,
      details: err?.message
    };
  }
};