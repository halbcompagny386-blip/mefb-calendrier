// src/services/pressAiService.ts

export const analyzePressUrl = async (url: string) => {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  const apiUrl = "https://api.groq.com/openai/v1/chat/completions";

  const prompt = `
    Tu es l'analyste média du Ministère de l'Économie, des Finances et du Budget (MEFB) de Guinée.
    Analyse l'article à l'URL suivante : ${url}

    MISSION :
    Donne-moi un objet JSON contenant :
    1. "title": Le titre exact de l'article.
    2. "source": Le nom du média (ex: Guineenews, VisionGuinee, Jeune Afrique).
    3. "summary": Un résumé stratégique de 3-4 phrases en français de haut niveau pour Mme la Ministre.
    4. "sentiment": Choisis obligatoirement entre "positive", "neutral", ou "negative" selon l'impact pour le Ministère.
    5. "category": Choisis obligatoirement entre "Economie", "Budget", "Politique", ou "International".

    REPONDS UNIQUEMENT AU FORMAT JSON :
    {
      "title": "",
      "source": "",
      "summary": "",
      "sentiment": "",
      "category": ""
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
        temperature: 0.1, // Bas pour être très précis sur le format JSON
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
  } catch (error) {
    console.error("Erreur d'analyse presse:", error);
    throw error;
  }
};