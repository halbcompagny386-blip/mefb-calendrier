-- 📚 MISE EN PLACE DU MODULE CAPSULE PÉDAGOGIQUE DU VENDREDI

-- Étape 1: Créer la table principale pedagogical_vault
CREATE TABLE IF NOT EXISTS pedagogical_vault (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  concept_name TEXT NOT NULL UNIQUE,
  technical_definition TEXT NOT NULL,
  simplified_explanation TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready')),
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Étape 2: Créer la table de liaison avec social_publications
CREATE TABLE IF NOT EXISTS pedagogical_publications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pedagogical_concept_id UUID NOT NULL REFERENCES pedagogical_vault(id) ON DELETE CASCADE,
  social_publication_id UUID NOT NULL REFERENCES social_publications(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(pedagogical_concept_id, social_publication_id)
);

-- Étape 3: Créer des indexes pour les performances
CREATE INDEX IF NOT EXISTS idx_pedagogical_vault_status ON pedagogical_vault(status);
CREATE INDEX IF NOT EXISTS idx_pedagogical_vault_last_used ON pedagogical_vault(last_used_at);
CREATE INDEX IF NOT EXISTS idx_pedagogical_publications_concept ON pedagogical_publications(pedagogical_concept_id);
CREATE INDEX IF NOT EXISTS idx_pedagogical_publications_publication ON pedagogical_publications(social_publication_id);

-- Étape 4: Insérer quelques concepts pédagogiques de base
INSERT INTO pedagogical_vault (concept_name, technical_definition, simplified_explanation, status) VALUES
('TVA', 'La Taxe sur la Valeur Ajoutée est un impôt indirect sur la consommation qui s''applique à chaque étape de la chaîne de production et de distribution.', 'La TVA est comme une taxe que vous payez quand vous achetez quelque chose. Elle aide le gouvernement à financer les services publics comme les écoles et les hôpitaux.', 'ready'),
('LFR', 'La Loi de Finances Rectificative permet d''ajuster le budget de l''État en cours d''année pour faire face à des imprévus ou corriger des erreurs.', 'C''est comme un budget complémentaire que le gouvernement peut faire pendant l''année si les choses changent, comme des dépenses imprévues ou des recettes supplémentaires.', 'ready'),
('Déficit budgétaire', 'Le déficit budgétaire survient lorsque les dépenses de l''État dépassent ses recettes sur une période donnée.', 'C''est quand le gouvernement dépense plus d''argent qu''il n''en gagne. Comme quand votre budget familial est en rouge à la fin du mois.', 'ready'),
('Dette publique', 'La dette publique représente l''ensemble des emprunts contractés par l''État auprès de créanciers internes ou externes.', 'C''est l''argent que le gouvernement a emprunté et qu''il devra rembourser plus tard, comme un crédit pour la maison mais à l''échelle du pays.', 'ready'),
('Budget général', 'Le budget général de l''État regroupe l''ensemble des recettes et dépenses ordinaires nécessaires au fonctionnement des administrations publiques.', 'C''est le budget principal du gouvernement qui paie pour les salaires des fonctionnaires, l''éducation, la santé, etc. C''est comme le budget quotidien de la maison.', 'ready')
ON CONFLICT (concept_name) DO NOTHING;

-- Étape 5: Créer une fonction RPC pour générer une capsule pédagogique
CREATE OR REPLACE FUNCTION generate_pedagogical_capsule(concept_id UUID)
RETURNS JSON AS $$
DECLARE
  concept_record RECORD;
  result JSON;
BEGIN
  -- Récupérer le concept
  SELECT * INTO concept_record
  FROM pedagogical_vault
  WHERE id = concept_id AND status = 'ready';

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Concept non trouvé ou pas prêt'
    );
  END IF;

  -- Mettre à jour last_used_at
  UPDATE pedagogical_vault
  SET last_used_at = NOW(), updated_at = NOW()
  WHERE id = concept_id;

  -- Retourner les données pour génération IA
  RETURN json_build_object(
    'success', true,
    'concept', json_build_object(
      'id', concept_record.id,
      'name', concept_record.concept_name,
      'technical', concept_record.technical_definition,
      'simplified', concept_record.simplified_explanation
    )
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', 'Erreur lors de la génération: ' || SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Étape 6: Donner les permissions
GRANT ALL ON pedagogical_vault TO authenticated;
GRANT ALL ON pedagogical_publications TO authenticated;
GRANT EXECUTE ON FUNCTION generate_pedagogical_capsule(UUID) TO authenticated;

-- Étape 7: Activer RLS sur les nouvelles tables
ALTER TABLE pedagogical_vault ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedagogical_publications ENABLE ROW LEVEL SECURITY;

-- Étape 8: Créer les policies RLS
CREATE POLICY "pedagogical_vault_read_all" ON pedagogical_vault FOR SELECT USING (true);
CREATE POLICY "pedagogical_vault_write_comm_admin" ON pedagogical_vault FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('Communication', 'Admin', 'Super_Admin')
  )
);

CREATE POLICY "pedagogical_publications_read_all" ON pedagogical_publications FOR SELECT USING (true);
CREATE POLICY "pedagogical_publications_write_comm_admin" ON pedagogical_publications FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('Communication', 'Admin', 'Super_Admin')
  )
);