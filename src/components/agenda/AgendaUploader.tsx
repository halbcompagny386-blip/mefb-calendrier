import React, { useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { parseAgendaFile, structuredAgendaWithAI } from '../../services/agendaParser';
import { supabase } from '../../lib/supabaseClient';
import { notificationService } from '../../services/notificationService';

interface Props {
  onImportComplete: (activities: any[]) => void;
}

export const AgendaUploader = ({ onImportComplete }: Props) => {
  const [loading, setLoading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const text = await parseAgendaFile(file);
      const newActivities = await structuredAgendaWithAI(text);
      const today = new Date().toISOString().split('T')[0];

      if (!newActivities || newActivities.length === 0) {
        notificationService.warning("L'IA n'a détecté aucune activité.");
        return;
      }

      // 1. On prépare les données pour Supabase
      const finalized = newActivities.map((act: any, index: number) => ({
        ...act,
        date: act.date || act.Date || act["Date"] || today,
        title: act.title || act.Activités || "Activité sans titre",
        description: act.description || act["Points de discussion"] || act.description || "Détails non disponibles",
        responsible: act.responsible || act.Responsable || "-",
        participants: act.participants || act.Participants || "Non spécifiés",
        location: act.location || act.Lieu || "À préciser",
        media: act.media || act["Couverture médiatique"] || act["Couverture médiatique "] || "N",
        interview_questions: JSON.stringify(act.interview_questions || []), // ✅ Sérialiser en JSON string
        
        // --- AJOUTS CRUCIAUX POUR LE DASHBOARD ---
        created_at: new Date().toISOString(), // Pour que le tri fonctionne
        status: "À venir",
        workflow: "Brouillon",
        commContent: "",
        channels: JSON.stringify([]), // ✅ Sérialiser en JSON string
        comments: JSON.stringify([]), // ✅ Sérialiser en JSON string
        history: JSON.stringify([{
          id: `h-import-${Date.now()}-${index}`,
          timestamp: new Date().toISOString(),
          user: "Système",
          action: "Importation",
          details: "Importé via Groq AI"
        }]) // ✅ Sérialiser en JSON string
      }));

      // 2. ENREGISTREMENT RÉEL DANS SUPABASE
      const { data, error } = await supabase
        .from('activities')
        .insert(finalized)
        .select(); // ✅ Récupérer les données insérées avec les IDs générés

      if (error) throw error;

      // 3. On prévient l'application de rafraîchir l'affichage
      // Note: data contient les données sérialisées, donc loadAllData va les désérialiser correctement
      onImportComplete(data || finalized);
      
    } catch (err) {
      console.error("Erreur Upload Supabase:", err);
      notificationService.error("Erreur lors de l'enregistrement de l'agenda dans la base de données.");
    } finally {
      setLoading(false);
      if (e.target) e.target.value = '';
    }
  };

  return (
    <div className="bg-indigo-50/50 border-2 border-dashed border-indigo-200 rounded-3xl p-8 transition-all hover:bg-indigo-50 group">
      <label className="flex flex-col items-center cursor-pointer">
        {loading ? (
          <div className="flex flex-col items-center">
            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
            <span className="text-indigo-600 font-medium animate-pulse">Analyse Groq en cours...</span>
          </div>
        ) : (
          <>
            <Upload className="w-12 h-12 text-indigo-400 group-hover:text-indigo-600 mb-4 transition-colors" />
            <h3 className="text-sm font-bold text-slate-800">Importer un agenda institutionnel</h3>
            <p className="text-xs text-slate-500 mt-1">Glissez-déposez un fichier .docx ou .pdf d'agenda gouvernemental ou administratif</p>
          </>
        )}
        <input type="file" 
        className="hidden" 
        accept=".docx,.pdf"
        onChange={handleUpload} 
        disabled={loading} />
      </label>
    </div>
  );
};