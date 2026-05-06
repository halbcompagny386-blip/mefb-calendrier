-- 📚 AMÉLIORATION: TABLE PÉDAGOGIQUE CAPSULES
-- Crée une table dédiée pour stocker les capsules générées (brouillons et publiées)

-- Étape 1: Créer la table pedagogical_capsules
CREATE TABLE IF NOT EXISTS pedagogical_capsules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  concept_id UUID NOT NULL REFERENCES pedagogical_vault(id) ON DELETE CASCADE,
  video_script TEXT NOT NULL,
  social_content TEXT NOT NULL,
  visual_suggestions JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published', 'archived')),
  published_at TIMESTAMP WITH TIME ZONE,
  published_by UUID REFERENCES profiles(id),
  published_by_name TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_by_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  view_count INTEGER DEFAULT 0,
  engagement_notes TEXT
);

-- Étape 2: Créer les indexes pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_pedagogical_capsules_concept ON pedagogical_capsules(concept_id);
CREATE INDEX IF NOT EXISTS idx_pedagogical_capsules_status ON pedagogical_capsules(status);
CREATE INDEX IF NOT EXISTS idx_pedagogical_capsules_published_at ON pedagogical_capsules(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_pedagogical_capsules_created_by ON pedagogical_capsules(created_by);

-- Étape 3: Ajouter colonne social_publication_id si elle n'existe pas (pour liaison avec social_publications)
ALTER TABLE pedagogical_capsules 
ADD COLUMN IF NOT EXISTS social_publication_id UUID REFERENCES social_publications(id) ON DELETE SET NULL;

-- Étape 4: Créer une fonction pour publier une capsule
CREATE OR REPLACE FUNCTION publish_pedagogical_capsule(
  p_capsule_id UUID,
  p_publisher_id UUID,
  p_publisher_name TEXT
)
RETURNS JSON AS $$
DECLARE
  capsule_record RECORD;
  publication_record RECORD;
  result JSON;
BEGIN
  -- Récupérer la capsule
  SELECT * INTO capsule_record
  FROM pedagogical_capsules
  WHERE id = p_capsule_id AND status IN ('draft', 'review');

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Capsule non trouvée ou déjà publiée'
    );
  END IF;

  -- Créer/mettre à jour la publication sociale
  INSERT INTO social_publications (
    platform, 
    format, 
    publisher_name, 
    ai_summary, 
    published_at, 
    url,
    created_at
  ) VALUES (
    'Capsule Pédagogique',
    'Capsule Vidéo',
    p_publisher_name,
    format(
      '[CONCEPT: %s]\n[SCRIPT]\n%s\n[SOCIAL]\n%s\n[VISUALS]\n%s',
      capsule_record.concept_id::text,
      capsule_record.video_script,
      capsule_record.social_content,
      array_to_string(array_agg(elem->>0), E'\n')
    ),
    NOW(),
    'https://mefb.gov.gn/pedagogie/capsule/' || p_capsule_id,
    NOW()
  )
  RETURNING * INTO publication_record;

  -- Mettre à jour la capsule
  UPDATE pedagogical_capsules
  SET 
    status = 'published',
    published_at = NOW(),
    published_by = p_publisher_id,
    published_by_name = p_publisher_name,
    social_publication_id = publication_record.id,
    updated_at = NOW()
  WHERE id = p_capsule_id;

  -- Mettre à jour last_used_at du concept
  UPDATE pedagogical_vault
  SET last_used_at = NOW(), updated_at = NOW()
  WHERE id = capsule_record.concept_id;

  RETURN json_build_object(
    'success', true,
    'capsule_id', p_capsule_id,
    'publication_id', publication_record.id,
    'published_at', NOW()
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', 'Erreur lors de la publication: ' || SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Étape 5: Activer RLS et créer les policies
ALTER TABLE pedagogical_capsules ENABLE ROW LEVEL SECURITY;

-- Tous peuvent lire les capsules publiées
CREATE POLICY "pedagogical_capsules_read_published" ON pedagogical_capsules 
FOR SELECT USING (status = 'published' OR status = 'archived');

-- Les auteurs peuvent lire leurs brouillons
CREATE POLICY "pedagogical_capsules_read_own_draft" ON pedagogical_capsules 
FOR SELECT USING (created_by = auth.uid() AND status IN ('draft', 'review'));

-- Communication/Admin peuvent lire tous les brouillons
CREATE POLICY "pedagogical_capsules_read_draft_admin" ON pedagogical_capsules 
FOR SELECT USING (
  status IN ('draft', 'review')
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('Communication', 'Admin', 'Super_Admin')
  )
);

-- Créateurs et admins peuvent insérer
CREATE POLICY "pedagogical_capsules_insert" ON pedagogical_capsules 
FOR INSERT WITH CHECK (
  created_by = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('Communication', 'Admin', 'Super_Admin')
  )
);

-- Admins peuvent mettre à jour le statut/publication
CREATE POLICY "pedagogical_capsules_update_status" ON pedagogical_capsules 
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('Communication', 'Admin', 'Super_Admin')
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('Communication', 'Admin', 'Super_Admin')
  )
);

-- Étape 6: Donner les permissions
GRANT SELECT, INSERT, UPDATE ON pedagogical_capsules TO authenticated;
GRANT EXECUTE ON FUNCTION publish_pedagogical_capsule(UUID, UUID, TEXT) TO authenticated;

-- Étape 7: Créer des vues utiles pour les statistiques
CREATE OR REPLACE VIEW pedagogical_stats AS
SELECT 
  pv.id AS concept_id,
  pv.concept_name,
  COUNT(CASE WHEN pc.status = 'published' THEN 1 END) AS published_count,
  COUNT(CASE WHEN pc.status = 'draft' THEN 1 END) AS draft_count,
  MAX(pc.published_at) AS last_published_at,
  pv.last_used_at,
  COALESCE(SUM(pc.view_count), 0) AS total_views
FROM pedagogical_vault pv
LEFT JOIN pedagogical_capsules pc ON pv.id = pc.concept_id
GROUP BY pv.id, pv.concept_name, pv.last_used_at;

GRANT SELECT ON pedagogical_stats TO authenticated;

-- Étape 8: Ajouter trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_pedagogical_capsules_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_pedagogical_capsules_timestamp ON pedagogical_capsules;
CREATE TRIGGER trigger_update_pedagogical_capsules_timestamp
BEFORE UPDATE ON pedagogical_capsules
FOR EACH ROW
EXECUTE FUNCTION update_pedagogical_capsules_timestamp();

-- 📌 Notes d'exécution:
-- 1. Exécuter ce script dans Supabase SQL Editor
-- 2. Vérifier que les tables pedagogical_vault et social_publications existent
-- 3. Vérifier que la table profiles existe et a une colonne 'role'
-- 4. Après: migrer les capsules existantes depuis social_publications (script separate)
