-- SUPABASE SQL : supprimer l'utilisateur et son profil
-- Exécutez ceci dans Supabase SQL Editor.

BEGIN;

DELETE FROM profiles
WHERE id = '9e4c96eb-6483-48df-b42c-2503ea00b957';

DELETE FROM auth.users
WHERE id = '9e4c96eb-6483-48df-b42c-2503ea00b957';

COMMIT;

-- Vérification
SELECT id, email FROM auth.users WHERE id = '9e4c96eb-6483-48df-b42c-2503ea00b957';
SELECT id, full_name, role FROM profiles WHERE id = '9e4c96eb-6483-48df-b42c-2503ea00b957';
