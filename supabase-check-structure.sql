-- 🔍 DIAGNOSTIC: Vérifier la structure réelle de la table profiles

-- 1️⃣ Afficher toutes les colonnes de la table profiles
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2️⃣ Afficher les données actuelles (avec les colonnes qui existent)
SELECT * FROM profiles LIMIT 5;

-- 3️⃣ Vérifier la structure de la table auth.users (si email est là)
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'users' AND table_schema = 'auth'
ORDER BY ordinal_position;
