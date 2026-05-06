-- 📚 AMÉLIORATIONS DU MODULE CAPSULE PÉDAGOGIQUE DU VENDREDI
-- Dernière mise à jour: 28 avril 2026

-- ============================================================================
-- 1️⃣ CRÉER LA TABLE PEDAGOGICAL_CAPSULES (stockage robuste des brouillons/publiés)
-- ============================================================================

CREATE TABLE IF NOT EXISTS pedagogical_capsules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  concept_id UUID NOT NULL REFERENCES pedagogical_vault(id) ON DELETE CASCADE,
  video_script TEXT NOT NULL,
  social_content TEXT NOT NULL,
  visual_suggestions TEXT[] DEFAULT ARRAY[]::TEXT[],
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  
  -- Données de publication
  published_at TIMESTAMP WITH TIME ZONE,
  published_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  published_by_name TEXT,
  
  -- Données de création
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_name TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Relation avec social_publications pour le partage
  social_publication_id UUID REFERENCES social_publications(id) ON DELETE SET NULL,
  
  -- Analytics
  view_count INT DEFAULT 0
);

-- Créer les indexes pour performances optimales (y compris unique partiel pour éviter les doublons de brouillons)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_draft_per_concept ON pedagogical_capsules(concept_id, status) WHERE status = 'draft';
CREATE INDEX IF NOT EXISTS idx_pedagogical_capsules_status ON pedagogical_capsules(status);
CREATE INDEX IF NOT EXISTS idx_pedagogical_capsules_concept_id ON pedagogical_capsules(concept_id);
CREATE INDEX IF NOT EXISTS idx_pedagogical_capsules_published_at ON pedagogical_capsules(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_pedagogical_capsules_created_by ON pedagogical_capsules(created_by);
CREATE INDEX IF NOT EXISTS idx_pedagogical_capsules_updated_at ON pedagogical_capsules(updated_at DESC);

-- ============================================================================
-- 2️⃣ ACTIVER RLS ET CRÉER LES POLICIES
-- ============================================================================

ALTER TABLE pedagogical_capsules ENABLE ROW LEVEL SECURITY;

-- Policy: Lecture publique pour les capsules PUBLIÉES
DROP POLICY IF EXISTS "pedagogical_capsules_read_published" ON pedagogical_capsules;
CREATE POLICY "pedagogical_capsules_read_published" ON pedagogical_capsules 
  FOR SELECT 
  USING (status = 'published' OR auth.role() = 'authenticated');

-- Policy: Les utilisateurs peuvent lire leurs propres brouillons
DROP POLICY IF EXISTS "pedagogical_capsules_read_own_draft" ON pedagogical_capsules;
CREATE POLICY "pedagogical_capsules_read_own_draft" ON pedagogical_capsules 
  FOR SELECT 
  USING (
    status = 'draft' AND 
    (created_by = auth.uid() OR 
     EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('Admin', 'Super_Admin', 'Communication')))
  );

-- Policy: Créer des brouillons (Communication, Admin uniquement)
DROP POLICY IF EXISTS "pedagogical_capsules_create_draft" ON pedagogical_capsules;
CREATE POLICY "pedagogical_capsules_create_draft" ON pedagogical_capsules 
  FOR INSERT 
  WITH CHECK (
    status = 'draft' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('Communication', 'Admin', 'Super_Admin')
    )
  );

-- Policy: Modifier ses propres brouillons
DROP POLICY IF EXISTS "pedagogical_capsules_update_own_draft" ON pedagogical_capsules;
CREATE POLICY "pedagogical_capsules_update_own_draft" ON pedagogical_capsules 
  FOR UPDATE 
  USING (
    status = 'draft' AND 
    (created_by = auth.uid() OR 
     EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('Admin', 'Super_Admin')))
  )
  WITH CHECK (
    status = 'draft' AND 
    (created_by = auth.uid() OR 
     EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('Admin', 'Super_Admin')))
  );

-- Policy: Supprimer ses propres brouillons
DROP POLICY IF EXISTS "pedagogical_capsules_delete_own_draft" ON pedagogical_capsules;
CREATE POLICY "pedagogical_capsules_delete_own_draft" ON pedagogical_capsules 
  FOR DELETE 
  USING (
    status = 'draft' AND 
    (created_by = auth.uid() OR 
     EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('Admin', 'Super_Admin')))
  );

-- Policy: Publier un brouillon (passer de draft à published)
DROP POLICY IF EXISTS "pedagogical_capsules_publish" ON pedagogical_capsules;
CREATE POLICY "pedagogical_capsules_publish" ON pedagogical_capsules 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('Communication', 'Admin', 'Super_Admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('Communication', 'Admin', 'Super_Admin')
    )
  );

-- ============================================================================
-- 3️⃣ AJOUTER LES COLONNES MANQUANTES À PEDAGOGICAL_VAULT
-- ============================================================================

-- Ajouter colonne pour tracking du créateur (si pas déjà présent)
ALTER TABLE pedagogical_vault ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE pedagogical_vault ADD COLUMN IF NOT EXISTS created_by_name TEXT;

-- Renforcer les policies existantes sur pedagogical_vault
DROP POLICY IF EXISTS "pedagogical_vault_write_comm_admin" ON pedagogical_vault;

CREATE POLICY "pedagogical_vault_write_comm_admin" ON pedagogical_vault 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('Communication', 'Admin', 'Super_Admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('Communication', 'Admin', 'Super_Admin')
    )
  );

-- ============================================================================
-- 4️⃣ CRÉER LES FONCTIONS RPC POUR OPÉRATIONS CRITIQUES
-- ============================================================================

-- Fonction pour publier un brouillon avec validation complète
CREATE OR REPLACE FUNCTION publish_pedagogical_draft(
  p_draft_id UUID,
  p_user_id UUID,
  p_user_name TEXT
)
RETURNS JSON AS $$
DECLARE
  v_draft RECORD;
  v_pub_id UUID;
  v_result JSON;
BEGIN
  -- Vérifier que l'utilisateur a les permissions
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = p_user_id AND role IN ('Communication', 'Admin', 'Super_Admin')
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Permissions insuffisantes'
    );
  END IF;

  -- Récupérer le brouillon
  SELECT * INTO v_draft FROM pedagogical_capsules 
  WHERE id = p_draft_id AND status = 'draft';

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Brouillon non trouvé'
    );
  END IF;

  -- Créer la publication
  INSERT INTO social_publications (
    platform, format, user_name, user_role, summary, ai_summary,
    published_at, url, created_at
  ) VALUES (
    'Capsule Pédagogique',
    'Capsule Vidéo',
    p_user_name,
    'Communication',
    v_draft.social_content,
    json_build_object(
      'video_script', v_draft.video_script,
      'social_content', v_draft.social_content,
      'visual_suggestions', v_draft.visual_suggestions
    )::text,
    NOW(),
    'https://mefb.gov.gn/pedagogie/capsule/' || v_draft.concept_id,
    NOW()
  )
  RETURNING id INTO v_pub_id;

  -- Mettre à jour le brouillon en publication
  UPDATE pedagogical_capsules
  SET status = 'published',
      published_at = NOW(),
      published_by = p_user_id,
      published_by_name = p_user_name,
      social_publication_id = v_pub_id,
      updated_at = NOW()
  WHERE id = p_draft_id;

  -- Mettre à jour last_used_at du concept
  UPDATE pedagogical_vault
  SET last_used_at = NOW(), updated_at = NOW()
  WHERE id = v_draft.concept_id;

  v_result := json_build_object(
    'success', true,
    'draft_id', p_draft_id,
    'publication_id', v_pub_id,
    'message', 'Brouillon publié avec succès'
  );

  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', 'Erreur base de données: ' || SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION publish_pedagogical_draft(UUID, UUID, TEXT) TO authenticated;

-- ============================================================================
-- 5️⃣ CRÉER LA TABLE D'AUDIT (optionnel mais recommandé)
-- ============================================================================

CREATE TABLE IF NOT EXISTS pedagogical_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  capsule_id UUID,
  concept_id UUID,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_capsule ON pedagogical_audit_log(capsule_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON pedagogical_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON pedagogical_audit_log(created_at DESC);

-- Trigger pour logger les actions sur pedagogical_capsules
CREATE OR REPLACE FUNCTION log_pedagogical_action()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO pedagogical_audit_log (
    action,
    capsule_id,
    concept_id,
    user_id,
    user_name,
    details
  ) VALUES (
    TG_OP,
    NEW.id,
    NEW.concept_id,
    NEW.created_by,
    NEW.created_by_name,
    jsonb_build_object(
      'status', NEW.status,
      'has_video', (NEW.video_script IS NOT NULL),
      'has_social', (NEW.social_content IS NOT NULL),
      'visuals_count', array_length(NEW.visual_suggestions, 1)
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pedagogical_audit_trigger ON pedagogical_capsules;
CREATE TRIGGER pedagogical_audit_trigger
AFTER INSERT OR UPDATE ON pedagogical_capsules
FOR EACH ROW
EXECUTE FUNCTION log_pedagogical_action();

-- ============================================================================
-- 6️⃣ ACCORDER LES PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON pedagogical_capsules TO authenticated;
GRANT INSERT ON pedagogical_audit_log TO authenticated;

-- ============================================================================
-- 7️⃣ CRÉER DES VUES UTILES
-- ============================================================================

-- Vue pour statistiques des capsules
CREATE OR REPLACE VIEW v_pedagogical_stats AS
SELECT
  COUNT(CASE WHEN status = 'published' THEN 1 END) as published_count,
  COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_count,
  COUNT(*) as total_count,
  COUNT(DISTINCT concept_id) as unique_concepts,
  MAX(published_at) as last_published,
  SUM(view_count) as total_views
FROM pedagogical_capsules;

GRANT SELECT ON v_pedagogical_stats TO authenticated;

-- Vue pour les capsules avec infos du concept
CREATE OR REPLACE VIEW v_pedagogical_capsules_detailed AS
SELECT
  pc.id,
  pc.concept_id,
  pv.concept_name,
  pv.technical_definition,
  pv.simplified_explanation,
  pc.status,
  pc.video_script,
  pc.social_content,
  pc.visual_suggestions,
  pc.published_at,
  pc.published_by_name,
  pc.created_by_name,
  pc.created_at,
  pc.view_count,
  (SELECT COUNT(*) FROM pedagogical_audit_log WHERE capsule_id = pc.id) as action_count
FROM pedagogical_capsules pc
JOIN pedagogical_vault pv ON pc.concept_id = pv.id;

GRANT SELECT ON v_pedagogical_capsules_detailed TO authenticated;

-- ============================================================================
-- 8️⃣ INSTRUCTIONS DE DÉPLOIEMENT
-- ============================================================================
/*
1. Exécuter ce script en tant qu'administrateur Supabase
2. Vérifier que les tables ont été créées avec `\dt` dans psql
3. Vérifier les RLS avec `\d+ pedagogical_capsules` dans psql
4. Tester les opérations CRUD depuis l'application
5. Monitorer pedagogical_audit_log pour les erreurs/anomalies

-- Commandes utiles de monitoring:
SELECT COUNT(*) as total_drafts FROM pedagogical_capsules WHERE status = 'draft';
SELECT COUNT(*) as total_published FROM pedagogical_capsules WHERE status = 'published';
SELECT * FROM pedagogical_audit_log ORDER BY created_at DESC LIMIT 20;
SELECT * FROM v_pedagogical_stats;
*/
