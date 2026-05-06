-- 🔍 DIAGNOSTIC COMPLET DE LA TABLE ACTIVITIES

-- 1️⃣ Vérifier l'existence de la table activities
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name = 'activities'
) as activities_table_exists;

-- 2️⃣ Afficher la structure EXACTE de la table activities (colonnes, types, nullable, défauts)
SELECT 
  column_name, 
  data_type,
  udt_name,
  is_nullable,
  column_default,
  ordinal_position
FROM information_schema.columns
WHERE table_name = 'activities' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3️⃣ Afficher les contraintes et indexes
SELECT 
  constraint_name,
  constraint_type,
  table_name
FROM information_schema.table_constraints
WHERE table_name = 'activities' AND table_schema = 'public';

-- 4️⃣ Compter le nombre d'activités actuellement dans la table
SELECT COUNT(*) as total_activities FROM activities;

-- 5️⃣ Vérifier si RLS est activée sur la table
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'activities' AND schemaname = 'public';

-- 6️⃣ Afficher toutes les policies RLS sur la table activities
SELECT 
  policyname,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'activities';

-- 7️⃣ Afficher les 3 dernières activités insérées (pour vérifier les types de colonnes)
SELECT 
  id,
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
FROM activities
ORDER BY created_at DESC
LIMIT 3;

-- 8️⃣ Vérifier les types de colonnes JSONB (afficher les types réels)
SELECT 
  column_name,
  data_type,
  udt_name,
  character_maximum_length
FROM information_schema.columns
WHERE table_name = 'activities' 
  AND table_schema = 'public'
  AND column_name IN ('channels', 'comments', 'interview_questions', 'history');

-- 9️⃣ Tester une insertion simple pour voir si elle fonctionne
-- Décommentez cette partie pour tester (ATTENTION: elle va créer une activité)
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
  created_at,
  category,
  type,
  commContent,
  channels,
  comments,
  interview_questions,
  history
) VALUES (
  'Test Activity',
  'This is a test activity',
  '2026-04-24',
  'Test User',
  'Test Participant',
  'Test Location',
  'O',
  'À venir',
  'Brouillon',
  NOW(),
  'Gouvernance',
  'Réunion de cabinet',
  '',
  '[]',
  '[]',
  '[]',
  '[]'
)
RETURNING *;
*/

-- 🔟 Afficher les grants (permissions) sur la table
SELECT 
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.role_table_grants
WHERE table_name = 'activities' AND table_schema = 'public';
