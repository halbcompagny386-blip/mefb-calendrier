-- 🔍 DIAGNOSTIC COMPLET : Vérifier la structure et les données de la table activities

-- 1️⃣ Vérifier l'existence de la table activities
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name = 'activities'
) as activities_table_exists;

-- 2️⃣ Afficher la structure exacte de la table activities
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default,
  ordinal_position
FROM information_schema.columns
WHERE table_name = 'activities' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3️⃣ Compter le nombre d'activités total
SELECT COUNT(*) as total_activities FROM activities;

-- 4️⃣ Afficher les 10 activités les plus récentes
SELECT 
  id,
  title,
  date,
  responsible,
  participants,
  created_at,
  workflow,
  status
FROM activities
ORDER BY created_at DESC
LIMIT 10;

-- 5️⃣ Vérifier les activités ajoutées dans les 24 dernières heures
SELECT 
  id,
  title,
  date,
  responsible,
  participants,
  location,
  media,
  created_at,
  workflow,
  status
FROM activities
WHERE created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- 6️⃣ Vérifier la structure de la table ministere_contacts
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name = 'ministere_contacts'
) as ministere_contacts_exists;

-- 7️⃣ Afficher les colonnes de ministere_contacts
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'ministere_contacts' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 8️⃣ Compter les contacts disponibles
SELECT COUNT(*) as total_contacts FROM ministere_contacts;

-- 9️⃣ Afficher un échantillon de contacts
SELECT 
  id,
  nom,
  telephone,
  email
FROM ministere_contacts
LIMIT 10;

-- 🔟 Vérifier les RLS sur la table activities
SELECT 
  tablename,
  (SELECT COUNT(*) FROM pg_policies WHERE pg_policies.tablename = pg_tables.tablename) as policies_count
FROM pg_tables
WHERE tablename = 'activities' AND schemaname = 'public';

-- 1️⃣1️⃣ Afficher toutes les policies sur la table activities
SELECT * FROM pg_policies WHERE tablename = 'activities';

-- 1️⃣2️⃣ Vérifier le statut RLS de la table activities
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'activities' AND schemaname = 'public';

-- 1️⃣3️⃣ Essayer d'insérer une activité de test (ATTENTION: Cela va créer une activité)
-- Décommentez cette requête pour tester l'insertion
/*
INSERT INTO activities (
  title,
  description,
  date,
  responsible,
  participants,
  location,
  media,
  status,
  workflow,
  category,
  type,
  commContent,
  channels,
  comments,
  interview_questions,
  history,
  created_at
) VALUES (
  'Test Activité Diagnostic',
  'Activité créée pour tester la persistence en base de données',
  NOW()::DATE,
  'Test Responsable',
  'Test Participant 1, Test Participant 2',
  'Salle de Test',
  'O',
  'À venir',
  'Brouillon',
  'Gouvernance',
  'Réunion de cabinet',
  '',
  '[]',
  '[]',
  '[]',
  '[]'::jsonb,
  NOW()
)
RETURNING *;
*/

-- 1️⃣4️⃣ Vérifier les triggers sur la table activities
SELECT 
  trigger_name,
  event_object_table,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'activities' AND trigger_schema = 'public';
