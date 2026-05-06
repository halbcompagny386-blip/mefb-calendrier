-- ✅ SCRIPT POUR AJOUTER LA COLONNE 'rejection_reason' À LA TABLE 'press_review'

-- 1️⃣ Vérifier la structure actuelle de la table press_review
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'press_review' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2️⃣ Ajouter la colonne 'rejection_reason' si elle n'existe pas
ALTER TABLE press_review
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 3️⃣ Ajouter la colonne 'cabinet_feedback' si elle n'existe pas (par sécurité)
ALTER TABLE press_review
ADD COLUMN IF NOT EXISTS cabinet_feedback TEXT;

-- 4️⃣ Vérifier que les colonnes ont été ajoutées
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'press_review' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5️⃣ Afficher les colonnes finales de la table press_review
SELECT * FROM press_review LIMIT 1;
