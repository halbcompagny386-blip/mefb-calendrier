// src/components/press/PublicationTracker.tsx
import React, { useState } from 'react';
import { Share2, Sparkles, Globe, Video, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useAuth } from '../../hooks/useSupabaseAuth';
import { supabase } from '../../lib/supabaseClient';
import { scrapeAndSummarizeDashboard } from '../../services/pressAiServiceD';

export const PublicationTracker = ({
  onUpdate,
  selectedActivityId,
  showUpdateMessage
}: {
  onUpdate: () => void,
  selectedActivityId?: string,
  showUpdateMessage: (msg: string) => void
}) => {
  const { profile } = useAuth(); // Récupère le profil de la session active (ex: PDG Bah)
  const [url, setUrl] = useState("");
  const [format, setFormat] = useState<'Vidéo 16:9' | 'Vidéo 9:16' | 'Article Texte' | 'Photo'>('Article Texte');
  const [isProcessing, setIsProcessing] = useState(false);

  const detectPlatform = (url: string) => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'YouTube';
    if (url.includes('facebook.com')) return 'Facebook';
    if (url.includes('linkedin.com')) return 'LinkedIn';
    if (url.includes('x.com') || url.includes('twitter.com')) return 'X';
    return 'Site Web';
  };

  const handleTrack = async () => {
    if (!url || isProcessing) return;

    // --- VALIDATION DU FORMAT URL ---
    try { new URL(url); } catch {
      showUpdateMessage("⚠️ Le lien saisi n'est pas une URL valide.");
      return;
    }

    setIsProcessing(true);
    const agentName = profile?.full_name || 'Membre du Service Com';

    try {
      // ─── ÉTAPE 0 : VÉRIFICATION ANTI-DOUBLON (URL + FORMAT) ─────────────────────────
      const { data: existing } = await supabase
        .from('social_publications')
        .select('id, platform, published_at')
        .eq('url', url.trim())
        .eq('format', format)
        .maybeSingle();

      if (existing) {
        const dateStr = existing.published_at
          ? new Date(existing.published_at).toLocaleDateString('fr-FR')
          : '—';
        showUpdateMessage(`⛔ Ce lien est déjà enregistré pour le format "${format}" (${existing.platform || 'Inconnu'} – ${dateStr})`);
        setIsProcessing(false);
        return;
      }

      // ─── ÉTAPE 1 : INSERTION IMMÉDIATE ───────────────────────────────
      const insertData = {
        url: url.trim(),
        platform: detectPlatform(url),
        format,
        publisher_name: agentName,
        ai_summary: 'Analyse IA en cours...',
        published_at: new Date().toISOString()
      };

      const { data: insertedData, error: insertError } = await supabase
        .from('social_publications')
        .insert([insertData])
        .select()
        .single();

      if (insertError) throw insertError;

      // FEEDBACK IMMÉDIAT
      setUrl("");
      setIsProcessing(false);
      onUpdate();
      showUpdateMessage("✅ Publication enregistrée ! Extraction IA en cours...");

      // ─── ÉTAPE 2 : EXTRACTION IA ASYNCHRONE ──────────────────────────
      if (insertedData?.id) {
        try {
          const aiAnalysis = await scrapeAndSummarizeDashboard(url);
          await supabase
            .from('social_publications')
            .update({
              summary: aiAnalysis.aiSummary,
              ai_summary: aiAnalysis.aiSummary
            })
            .eq('id', insertedData.id);

          showUpdateMessage("✨ Résumé IA ajouté au Journal Interne !");
          onUpdate();
        } catch (aiError) {
          console.error("Erreur extraction IA:", aiError);
        }
      }

    } catch (err: any) {
      console.error("Erreur insertion:", err);
      setIsProcessing(false);
      showUpdateMessage("❌ Erreur de synchronisation Supabase");
    }
  };

  return (
    <div className="bg-white p-5 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-100 shadow-2xl animate-in slide-in-from-right duration-500">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-[#175a95] rounded-2xl text-white shadow-lg"><Share2 size={24} /></div>
        <div>
          <h3 className="font-black text-slate-900 uppercase text-sm tracking-tighter">Traçabilité Multicanal</h3>
          <p className="text-[10px] text-[#149308] font-bold uppercase tracking-[0.2em]">Saisie de preuve de publication</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="relative">
          <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="url" value={url} onChange={(e) => setUrl(e.target.value)}
            placeholder="Collez le lien de l'article ici..."
            className="w-full pl-12 pr-4 py-5 bg-slate-50 border-2 border-transparent rounded-2xl text-sm font-bold focus:border-[#175a95] outline-none transition-all"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {['Vidéo 16:9', 'Vidéo 9:16', 'Article Texte', 'Photo'].map((f) => (
            <button
              key={f}
              onClick={() => setFormat(f as any)}
              className={`py-3 rounded-xl border-2 text-[10px] font-black uppercase transition-all ${format === f ? 'bg-[#175a95] border-[#175a95] text-white' : 'bg-white border-slate-100 text-slate-400'
                }`}
            >
              {f}
            </button>
          ))}
        </div>

        <button
          onClick={handleTrack}
          disabled={isProcessing || !url}
          className="w-full py-5 bg-[#149308] text-white rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-green-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
        >
          {isProcessing ? <Loader2 className="animate-spin" /> : <><Sparkles size={18} /> Valider la Publication</>}
        </button>
      </div>
    </div>
  );
};