-- ✅ SCRIPT POUR AJOUTER LA COLONNE MANQUANTE 'cabinet_feedback' À LA TABLE 'press_review'

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

-- 2️⃣ Ajouter la colonne 'cabinet_feedback' si elle n'existe pas
ALTER TABLE press_review
ADD COLUMN IF NOT EXISTS cabinet_feedback TEXT;

-- 3️⃣ Vérifier que la colonne a été ajoutée
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'press_review' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4️⃣ Afficher les colonnes finales de la table press_review
SELECT * FROM press_review LIMIT 1;
