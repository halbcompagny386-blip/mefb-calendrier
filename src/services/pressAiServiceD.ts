// src/services/pressAiServiceD.ts

export const scrapeAndSummarizeDashboard = async (url: string) => {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  const apiUrl = "https://api.groq.com/openai/v1/chat/completions";

  // Détection rapide du canal pour orienter l'IA
  const domain = new URL(url).hostname.replace('www.', '');
  let channelHint = "Site Web Officiel";
  if (domain.includes('facebook.com')) channelHint = "Facebook";
  if (domain.includes('linkedin.com')) channelHint = "LinkedIn";
  if (domain.includes('youtube.com') || domain.includes('youtu.be')) channelHint = "YouTube";

  const prompt = `
    Tu es l'Expert en Communication du Ministère (MEFB) de Guinée.
    Analyse cette preuve de publication officielle : ${url}
    
    MISSION :
    1. Détecte la plateforme précise (Facebook, LinkedIn, X, YouTube, ou Web).
    2. Rédige un RÉSUMÉ INSTITUTIONNEL de 2-3 phrases maximum.
    3. Ton : Solennel, factuel, axé sur l'action publique.
    
    CONSIGNE STRICTE : 
    - Ne commence JAMAIS par "Voici un résumé" ou "Cet article traite de". 
    - Rédige directement les faits (ex: "Le Ministère a lancé ce jour...").
    - Aucun symbole de gras Markdown (**), texte brut uniquement.
    - Réponds uniquement au format JSON.

    {
      "platform": "${channelHint}",
      "summary": "",
      "mediaType": ""
    }
  `;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);
    
    return {
      detectedChannel: result.platform || channelHint,
      aiSummary: result.summary,
      mediaType: url.includes('video') || url.includes('youtu') ? 'video' : 'article'
    };
  } catch (error) {
    console.error("Erreur d'analyse Dashboard:", error);
    // Fallback si l'IA échoue
    return {
      detectedChannel: channelHint,
      aiSummary: "Publication officielle confirmée sur les canaux du Ministère.",
      mediaType: 'article'
    };
  }
};