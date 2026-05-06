// src/services/briefingService.ts

export const generateBriefingMessage = async (activity: any): Promise<{ content: string; isStrategic: boolean }> => {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  const apiUrl = "https://api.groq.com/openai/v1/chat/completions";

  // 1. FILTRE DE PERTINENCE : On ne génère pas de convocation IA pour des tâches mineures
  const isStrategic = !!(activity.title && activity.description && activity.description.length > 30);
  
  const dateStr = activity.date || "la date prévue";
  const timeStr = activity.time || "";
  const typeStr = activity.title || "Réunion officielle";
  const descStr = activity.description || "Discussion des points à l'ordre du jour";
  const locStr = activity.location || "Ministère de l'Économie, des Finances et du Budget";

  const fallbackMessage = `Bonjour,\n\nVous êtes convié à l'activité suivante :\nObjet : ${typeStr}\nDate : ${dateStr} ${timeStr ? 'à ' + timeStr : ''}\nLieu : ${locStr}\n\nMerci de confirmer votre présence.\nCordialement,\nLe Cabinet.`;

  if (!isStrategic) {
    return { content: fallbackMessage, isStrategic: false };
  }

  const prompt = `
    Tu es l'Expert en Communication du Cabinet du MEFB Guinée. 
    Rédige une convocation OFFICIELLE et PRESTIGIEUSE.
    
    DONNÉES :
    - ACTIVITÉ : ${typeStr}
    - DATE/HEURE : ${dateStr} ${timeStr ? 'à ' + timeStr : ''}
    - LIEU : ${locStr}
    - ORDRE DU JOUR : ${descStr}

    DIRECTIVES DE HAUTE ADMINISTRATION :
    1. TON : Institutionnel, solennel, reflétant l'autorité du Ministère.
    2. PROTOCOLE : Utilise un langage soutenu (ex: "Monsieur le Ministre vous convie" ou "Le Cabinet a l'honneur de vous inviter").
    3. RÈGLE D'OR : Ne jamais inventer de faits. Utilise uniquement les données fournies.
    4. SIGNATURE : Termine par "Cordialement,\nLe Cabinet."
    5. INTERDICTION : Aucun emoji, aucun gras (**), aucune fantaisie.

    FORMAT ATTENDU :
    Bonjour (ou Monsieur/Madame),
    
    Le Cabinet du Ministère de l'Économie, des Finances et du Budget a l'honneur de vous convier à la rencontre suivante :
    
    Objet : [Titre]
    Date et Heure : [Date/Heure]
    Lieu : [Lieu]
    Note : [Description/Ordre du jour]
    
    Nous vous prions de bien vouloir confirmer votre présence par retour de courrier.
    
    Cordialement,
    Le Cabinet.
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
        messages: [
          { role: "system", content: "Tu es un rédacteur de cabinet ministériel guinéen. Ton style est administratif et prestigieux." },
          { role: "user", content: prompt }
        ],
        temperature: 0.2
      })
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.replace(/\*\*/g, '').replace(/\*/g, '').trim() || fallbackMessage;

    return { content, isStrategic: true };
  } catch (error) {
    console.error("Erreur Briefing IA:", error);
    return { content: fallbackMessage, isStrategic: false };
  }
};