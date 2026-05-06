-- 🔍 DIAGNOSTIC SUPABASE
-- Exécutez ce script pour vérifier l'état de la table profiles et des RLS

-- 1️⃣ Vérifier que les RLS sont activées
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'profiles' AND schemaname = 'public';

-- 2️⃣ Lister les policies actuelles
SELECT 
  pol.polname as policy_name,
  pol.polcmd as command,
  rel.relname as table_name
FROM pg_policy pol
JOIN pg_class rel ON pol.polrelid = rel.oid
WHERE rel.relname = 'profiles'
ORDER BY pol.polname;

-- 3️⃣ Vérifier l'existence de la fonction RPC
SELECT 
  p.proname,
  pg_catalog.pg_get_functiondef(p.oid) as function_def
FROM pg_catalog.pg_proc p
WHERE p.proname = 'update_user_role'
  AND p.pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 4️⃣ Vérifier les données de la table profiles
SELECT 
  id,
  role,
  full_name,
  email,
  updated_at
FROM profiles
LIMIT 10;

-- 5️⃣ Vérifier les permissions sur la fonction RPC
SELECT 
  grantor,
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.role_routine_grants
WHERE routine_name = 'update_user_role';

-- Si vous voyez des problèmes, vous devez nettoyer et réinstaller les policies
-- Décommentez la section ci-dessous pour NETTOYER COMPLÈTEMENT (attention!)

/*
-- ⚠️ NETTOYAGE COMPLET - À utiliser uniquement si les policies sont cassées!

-- Désactiver les RLS
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Supprimer toutes les policies
DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;

-- Vérifier qu'il n'y a pas d'autres policies
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update roles" ON profiles;

-- Vérifier la table
SELECT COUNT(*) as total_users FROM profiles;
SELECT DISTINCT role FROM profiles ORDER BY role;

-- Réactiver les RLS proprement
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Créer les policies correctes
CREATE POLICY "profiles_select_all"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Recréer la fonction RPC
CREATE OR REPLACE FUNCTION update_user_role(target_user_id UUID, new_role TEXT)
RETURNS JSON AS $$
DECLARE
  v_caller_role TEXT;
BEGIN
  SELECT role INTO v_caller_role
  FROM profiles
  WHERE id = auth.uid();

  IF v_caller_role NOT IN ('Admin', 'Super_Admin') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Seuls les Admin peuvent modifier les rôles.'
    );
  END IF;

  IF new_role NOT IN ('Guest', 'Communication', 'Cabinet', 'Admin', 'Super_Admin') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Rôle invalide'
    );
  END IF;

  UPDATE profiles
  SET role = new_role, updated_at = NOW()
  WHERE id = target_user_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Rôle mis à jour',
    'new_role', new_role
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION update_user_role(UUID, TEXT) TO authenticated;
*/
