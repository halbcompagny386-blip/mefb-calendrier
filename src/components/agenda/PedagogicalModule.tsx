// src/components/agenda/PedagogicalModule.tsx

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Sparkles, Play, Share2, Image, Plus,
  Clock, CheckCircle, AlertCircle, X, Loader2,
  Calendar, Users, Eye, TrendingUp, Save, Trash2,
  Edit, Download, Copy, Send
} from 'lucide-react';
import { PedagogicalConcept, PedagogicalCapsule } from '../../types';
import {
  getPedagogicalConcepts,
  generatePedagogicalCapsule,
  updateConceptStatus,
  addPedagogicalConcept,
  publishCapsule,
  getPublishedCapsules,
  saveCapsuleDraft,
  getAllCapsules,
  getCapsuleDrafts,
  updateCapsuleDraft,
  deleteCapsuleDraft,
  publishDraftCapsule
} from '../../services/pedagogicalService';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../hooks/useSupabaseAuth';

interface PedagogicalModuleProps {
  userRole?: string;
}

interface UIAlert {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

export const PedagogicalModule: React.FC<PedagogicalModuleProps> = ({ userRole }) => {
  const { profile } = useAuth();
  const [concepts, setConcepts] = useState<PedagogicalConcept[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConcept, setSelectedConcept] = useState<PedagogicalConcept | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatingProgress, setGeneratingProgress] = useState(''); // "script" | "social" | "visual"
  const [publishing, setPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [generatedCapsule, setGeneratedCapsule] = useState<PedagogicalCapsule | null>(null);
  const [publishedCapsules, setPublishedCapsules] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [alert, setAlert] = useState<UIAlert | null>(null);
  const [editingCapsule, setEditingCapsule] = useState<Partial<PedagogicalCapsule> | null>(null);
  const [draftCapsules, setDraftCapsules] = useState<any[]>([]);
  const [showDraftsTab, setShowDraftsTab] = useState(false);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [newConcept, setNewConcept] = useState({
    concept_name: '',
    technical_definition: '',
    simplified_explanation: '',
    status: 'draft' as 'draft' | 'ready'
  });

  // Vérifier si c'est vendredi
  const isFriday = new Date().getDay() === 5; // 0 = dimanche, 5 = vendredi

  // Utility: Afficher une alerte temporaire
  const showAlert = (alert: UIAlert) => {
    setAlert(alert);
    if (alert.duration !== 0) {
      const timeout = setTimeout(() => setAlert(null), alert.duration || 4000);
      return () => clearTimeout(timeout);
    }
  };

  // Charger les concepts
  useEffect(() => {
    loadConcepts();
    loadPublishedCapsules();
    loadDraftCapsules();
  }, []);

  const loadPublishedCapsules = async () => {
    try {
      const data = await getPublishedCapsules();
      setPublishedCapsules(data);
    } catch (error) {
      console.error('Erreur chargement capsules publiées:', error);
    }
  };

  const loadDraftCapsules = async () => {
    try {
      const data = await getCapsuleDrafts();
      setDraftCapsules(data);
    } catch (error) {
      console.error('Erreur chargement brouillons:', error);
    }
  };

  const loadConcepts = async () => {
    try {
      setLoading(true);
      const data = await getPedagogicalConcepts();
      setConcepts(data);
    } catch (error) {
      console.error('Erreur chargement concepts:', error);
      showAlert({
        type: 'error',
        message: '❌ Impossible de charger les concepts pédagogiques'
      });
    } finally {
      setLoading(false);
    }
  };

  // Générer une capsule avec feedback amélioré
  const handleGenerateCapsule = async () => {
    if (!selectedConcept) return;

    try {
      setGenerating(true);
      setGeneratingProgress('script');
      
      showAlert({
        type: 'info',
        message: '🎬 Génération du script vidéo... (30-60 secondes)',
        duration: 0
      });

      const capsule = await generatePedagogicalCapsule(selectedConcept);
      setGeneratedCapsule(capsule);
      
      showAlert({
        type: 'success',
        message: '✅ Capsule générée avec succès! Vous pouvez l\'éditer, la sauvegarder ou la publier.',
        duration: 5000
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error('❌ Erreur génération capsule:', error);
      
      showAlert({
        type: 'error',
        message: `❌ Génération échouée:\n${errorMsg}\n\nVérifiez votre connexion et réessayez.`,
        duration: 8000
      });
    } finally {
      setGenerating(false);
      setGeneratingProgress('');
    }
  };

  // Sauvegarder comme brouillon
  const handleSaveDraft = async () => {
    if (!generatedCapsule || !profile?.id) return;

    try {
      setPublishing(true);
      const draftId = await saveCapsuleDraft(
        generatedCapsule,
        profile.id,
        profile.full_name || profile.role || 'Utilisateur'
      );
      
      showAlert({
        type: 'success',
        message: '💾 Brouillon sauvegardé! Vous pouvez le reprendre plus tard.',
      });
      
      setEditingCapsule(null);
      setGeneratedCapsule(null);
      setShowGenerateModal(false);
      await loadDraftCapsules(); // Recharger la liste
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erreur inconnue';
      showAlert({
        type: 'error',
        message: `❌ Erreur sauvegarde: ${errorMsg}`,
      });
    } finally {
      setPublishing(false);
    }
  };

  // Publier directement une capsule générée
  const handlePublishCapsule = async () => {
    if (!generatedCapsule || !profile?.id) return;

    try {
      setPublishing(true);
      const result = await publishCapsule(
        generatedCapsule,
        profile.full_name || profile.role || 'Utilisateur',
        profile.id
      );
      
      showAlert({
        type: 'success',
        message: '🎉 Capsule publiée avec succès! Elle est maintenant visible dans le Journal Interne.',
      });
      
      setGeneratedCapsule(null);
      setShowGenerateModal(false);
      await loadPublishedCapsules(); // Recharger la liste
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erreur inconnue';
      showAlert({
        type: 'error',
        message: `❌ Erreur publication: ${errorMsg}`,
      });
    } finally {
      setPublishing(false);
    }
  };

  // Publier un brouillon
  const handlePublishDraft = async (draftId: string) => {
    if (!profile?.id) return;

    try {
      setPublishing(true);
      const result = await publishDraftCapsule(
        draftId,
        profile.full_name || profile.role || 'Utilisateur',
        profile.id
      );
      
      showAlert({
        type: 'success',
        message: '🎉 Brouillon publié avec succès!',
      });
      
      await loadDraftCapsules();
      await loadPublishedCapsules();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erreur inconnue';
      showAlert({
        type: 'error',
        message: `❌ Erreur: ${errorMsg}`,
      });
    } finally {
      setPublishing(false);
    }
  };

  // Supprimer un brouillon
  const handleDeleteDraft = async (draftId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce brouillon?')) return;

    try {
      await deleteCapsuleDraft(draftId);
      showAlert({
        type: 'success',
        message: '🗑️ Brouillon supprimé',
      });
      await loadDraftCapsules();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erreur inconnue';
      showAlert({
        type: 'error',
        message: `❌ Erreur suppression: ${errorMsg}`,
      });
    }
  };

  // Ajouter un nouveau concept
  const handleAddConcept = async () => {
    if (!newConcept.concept_name.trim() || !newConcept.technical_definition.trim()) {
      showAlert({
        type: 'warning',
        message: '⚠️ Veuillez remplir au moins le nom et la définition technique.'
      });
      return;
    }

    try {
      await addPedagogicalConcept(newConcept);
      setNewConcept({
        concept_name: '',
        technical_definition: '',
        simplified_explanation: '',
        status: 'draft'
      });
      setShowAddModal(false);
      loadConcepts();
      
      showAlert({
        type: 'success',
        message: '✅ Concept ajouté avec succès!'
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error('Erreur ajout concept:', error);
      showAlert({
        type: 'error',
        message: `❌ Erreur: ${errorMsg}`
      });
    }
  };

  // Changer le statut d'un concept
  const handleStatusChange = async (conceptId: string, status: 'draft' | 'ready') => {
    try {
      await updateConceptStatus(conceptId, status);
      loadConcepts();
    } catch (error) {
      console.error('Erreur mise à jour statut:', error);
    }
  };

  // Calculer si un concept a été utilisé récemment (moins de 4 semaines)
  const isRecentlyUsed = (lastUsedAt?: string) => {
    if (!lastUsedAt) return false;
    const lastUsed = new Date(lastUsedAt);
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    return lastUsed > fourWeeksAgo;
  };

  // Vérifier les permissions
  const canEdit = userRole === 'Communication' || userRole === 'Admin' || userRole === 'Super_Admin' || userRole === 'Cabinet';

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-[#175a95]" />
        <span className="ml-2 text-slate-600">Chargement de la banque pédagogique...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ALERTE SYSTÈME */}
      <AnimatePresence>
        {alert && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 max-w-sm px-6 py-3 rounded-xl shadow-lg z-50 font-medium text-sm flex items-center gap-3 ${
              alert.type === 'success' ? 'bg-emerald-500 text-white' :
              alert.type === 'error' ? 'bg-rose-500 text-white' :
              alert.type === 'warning' ? 'bg-amber-500 text-white' :
              'bg-blue-500 text-white'
            }`}
          >
            {alert.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER AVEC BADGE VENDREDI */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`px-4 py-2 rounded-full text-sm font-black uppercase tracking-widest flex items-center gap-2 ${
            isFriday
              ? 'bg-[#149308] text-white'
              : 'bg-slate-100 text-slate-600'
          }`}>
            <Calendar className="w-4 h-4" />
            {isFriday ? 'VENDREDI PÉDAGOGIE' : 'MODULE PÉDAGOGIQUE'}
          </div>
          <div className="text-sm text-slate-500">
            {concepts.filter(c => c.status === 'ready').length} concepts prêts
          </div>
        </div>

        {canEdit && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-[#175a95] text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nouveau Concept
          </button>
        )}
      </div>

      {/* BANQUE DE CONCEPTS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {concepts.map((concept) => (
          <motion.div
            key={concept.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow"
          >
            {/* HEADER CARTE */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-bold text-slate-800 text-sm">{concept.concept_name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  {concept.status === 'ready' ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                  )}
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    concept.status === 'ready'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {concept.status === 'ready' ? 'Prêt' : 'Brouillon'}
                  </span>
                  {isRecentlyUsed(concept.last_used_at) && (
                    <span title="Utilisé récemment">
                      <Clock className="w-3 h-3 text-slate-400" />
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* CONTENU */}
            <div className="space-y-2 mb-4">
              <p className="text-xs text-slate-600 line-clamp-2">
                <strong>Technique:</strong> {concept.technical_definition}
              </p>
              <p className="text-xs text-slate-500 line-clamp-2">
                <strong>Simple:</strong> {concept.simplified_explanation}
              </p>
            </div>

            {/* ACTIONS */}
            <div className="flex gap-2">
              {canEdit && (
                <button
                  onClick={() => handleStatusChange(
                    concept.id,
                    concept.status === 'ready' ? 'draft' : 'ready'
                  )}
                  className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                    concept.status === 'ready'
                      ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                >
                  {concept.status === 'ready' ? 'Marquer brouillon' : 'Marquer prêt'}
                </button>
              )}

              {concept.status === 'ready' && (
                <button
                  onClick={() => {
                    setSelectedConcept(concept);
                    setShowGenerateModal(true);
                  }}
                  className="px-3 py-1 bg-[#175a95] text-white text-xs rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  Générer
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* MODALE AJOUT CONCEPT */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-800">Nouveau Concept Pédagogique</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-xl"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Nom du Concept *
                  </label>
                  <input
                    type="text"
                    value={newConcept.concept_name}
                    onChange={(e) => setNewConcept(prev => ({ ...prev, concept_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#175a95] focus:border-transparent"
                    placeholder="Ex: TVA, LFR, Déficit budgétaire..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Définition Technique *
                  </label>
                  <textarea
                    value={newConcept.technical_definition}
                    onChange={(e) => setNewConcept(prev => ({ ...prev, technical_definition: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#175a95] focus:border-transparent"
                    placeholder="Définition précise et technique du concept..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Explication Simplifiée
                  </label>
                  <textarea
                    value={newConcept.simplified_explanation}
                    onChange={(e) => setNewConcept(prev => ({ ...prev, simplified_explanation: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#175a95] focus:border-transparent"
                    placeholder="Version accessible pour le grand public..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Statut Initial
                  </label>
                  <select
                    value={newConcept.status}
                    onChange={(e) => setNewConcept(prev => ({ ...prev, status: e.target.value as 'draft' | 'ready' }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#175a95] focus:border-transparent"
                  >
                    <option value="draft">Brouillon</option>
                    <option value="ready">Prêt</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleAddConcept}
                  className="px-4 py-2 bg-[#175a95] text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Ajouter le Concept
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODALE GÉNÉRATION CAPSULE */}
      <AnimatePresence>
        {showGenerateModal && selectedConcept && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Générer la Capsule Pédagogique</h2>
                  <p className="text-sm text-slate-600 mt-1">
                    Concept: <strong>{selectedConcept.concept_name}</strong>
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowGenerateModal(false);
                    setSelectedConcept(null);
                    setGeneratedCapsule(null);
                  }}
                  className="p-2 hover:bg-slate-100 rounded-xl"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {!generatedCapsule ? (
                <div className="text-center py-12">
                  <BookOpen className="w-16 h-16 text-[#175a95] mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-800 mb-2">
                    Générer la capsule pour "{selectedConcept.concept_name}"
                  </h3>
                  <p className="text-slate-600 mb-6">
                    L'IA va créer un script vidéo de 60s, un post réseaux sociaux et des suggestions visuelles.
                  </p>
                  <button
                    onClick={handleGenerateCapsule}
                    disabled={generating}
                    className="px-6 py-3 bg-[#149308] text-white rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Génération en cours...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        Générer la Capsule
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* SCRIPT VIDÉO */}
                  <div className="bg-slate-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Play className="w-5 h-5 text-[#175a95]" />
                      <h3 className="font-semibold text-slate-800">Script Vidéo (60 secondes)</h3>
                    </div>
                    <div className="bg-white p-4 rounded-lg border-l-4 border-[#175a95]">
                      <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans">
                        {generatedCapsule.video_script}
                      </pre>
                    </div>
                  </div>

                  {/* CONTENU RÉSEAUX SOCIAUX */}
                  <div className="bg-slate-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Share2 className="w-5 h-5 text-[#175a95]" />
                      <h3 className="font-semibold text-slate-800">Post Réseaux Sociaux</h3>
                    </div>
                    <div className="bg-white p-4 rounded-lg border-l-4 border-[#175a95]">
                      <p className="text-sm text-slate-700">
                        {generatedCapsule.social_content}
                      </p>
                      <div className="mt-2 text-xs text-slate-500">
                        {generatedCapsule.social_content.length}/280 caractères
                      </div>
                    </div>
                  </div>

                  {/* SUGGESTIONS VISUELLES */}
                  <div className="bg-slate-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Image className="w-5 h-5 text-[#175a95]" />
                      <h3 className="font-semibold text-slate-800">Suggestions Visuelles</h3>
                    </div>
                    <div className="space-y-2">
                      {generatedCapsule.visual_suggestions.map((suggestion, index) => (
                        <div key={index} className="bg-white p-3 rounded-lg border-l-4 border-[#175a95]">
                          <span className="text-sm text-slate-700">{suggestion}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ACTIONS */}
                  <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-200">
                    <button
                      onClick={() => {
                        setGeneratedCapsule(null);
                        setPublishSuccess(false);
                        handleGenerateCapsule();
                      }}
                      className="px-4 py-2 text-[#175a95] hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      Régénérer
                    </button>

                    <button
                      onClick={handleSaveDraft}
                      className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      Enregistrer Brouillon
                    </button>

                    {publishSuccess ? (
                      <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg font-semibold text-sm ml-auto">
                        <CheckCircle className="w-4 h-4" /> Publiée!
                      </div>
                    ) : (
                      <button
                        disabled={publishing}
                        onClick={async () => {
                          if (!generatedCapsule || !profile?.id) return;
                          setPublishing(true);
                          try {
                            await publishCapsule(
                              generatedCapsule,
                              profile?.full_name || profile?.role || 'Rédacteur',
                              profile.id
                            );
                            setPublishSuccess(true);
                            await loadPublishedCapsules();
                            await loadConcepts();
                            
                            showAlert({
                              type: 'success',
                              message: '🎉 Capsule publiée avec succès!'
                            });
                          } catch (err) {
                            const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue';
                            console.error('Erreur publication:', err);
                            showAlert({
                              type: 'error',
                              message: `❌ Publication échouée: ${errorMsg}`
                            });
                          } finally {
                            setPublishing(false);
                          }
                        }}
                        className="px-4 py-2 bg-[#149308] text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60 flex items-center gap-2 ml-auto"
                      >
                        {publishing ? (
                          <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Publication...</>
                        ) : (
                          <><Share2 className="w-4 h-4" /> Publier</>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SECTION CAPSULES PUBLIÉES ── */}
      {publishedCapsules.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-4 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            Capsules Publiées ({publishedCapsules.length})
          </h3>
          <div className="space-y-3">
            {publishedCapsules.map((pub, idx) => (
              <motion.div
                key={pub.id || idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-4 hover:shadow-md transition-shadow"
              >
                {/* Icône */}
                <div className="shrink-0 w-10 h-10 rounded-xl bg-[#175a95]/10 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-[#175a95]" />
                </div>

                {/* Contenu */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs font-black text-[#175a95] uppercase tracking-wider">
                      {pub.concept_name || 'Capsule Pédagogique'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {pub.published_at
                        ? new Date(pub.published_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
                        : ''}
                    </span>
                    {pub.published_by && (
                      <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                        par {pub.published_by}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 line-clamp-2">
                    {pub.summary || pub.ai_summary || '—'}
                  </p>
                </div>

                {/* Badge */}
                <span className="shrink-0 text-[9px] font-black px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 uppercase tracking-wider">
                  Publiée
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};