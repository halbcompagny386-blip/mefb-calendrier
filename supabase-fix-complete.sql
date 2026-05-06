-- ✅ RÉINITIALISATION COMPLÈTE DES RÔLES ET RLS

-- Étape 1: Désactiver temporairement les RLS pour accéder aux données
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Étape 2: Vérifier et corriger les rôles
-- Afficher tous les utilisateurs actuels (sans colonne email qui n'existe pas)
SELECT id, full_name, role FROM profiles ORDER BY full_name;

-- Étape 3: Si des utilisateurs ont "Observer" au lieu de "Guest", corriger cela
UPDATE profiles 
SET role = 'Guest' 
WHERE role ILIKE 'observer' OR role ILIKE 'observateur';

-- Étape 4: S'assurer que vous avez au moins un Super Admin
-- Décommentez et modifiez l'UUID avec votre ID utilisateur
-- UPDATE profiles 
-- SET role = 'Super_Admin' 
-- WHERE id = 'votre-uuid-ici';

-- Étape 5: Réactiver les RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Étape 6: Supprimer les anciennes policies problématiques
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update roles" ON profiles;
DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;

-- Étape 7: Créer les NOUVELLES policies correctes
-- ✅ TOUT LE MONDE peut lire tous les profils
CREATE POLICY "profiles_read_all" 
  ON profiles FOR SELECT 
  USING (true);

-- ✅ Chacun peut modifier SEULEMENT son propre profil
CREATE POLICY "profiles_update_self" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id) 
  WITH CHECK (auth.uid() = id);

-- Étape 8: Supprimer l'ancienne fonction RPC et la recréer
DROP FUNCTION IF EXISTS update_user_role(UUID, TEXT) CASCADE;

-- ✅ Créer la NOUVELLE fonction RPC correcte
CREATE OR REPLACE FUNCTION update_user_role(target_user_id UUID, new_role TEXT)
RETURNS JSON AS $$
DECLARE
  v_caller_role TEXT;
  v_caller_id UUID;
  v_success BOOLEAN;
BEGIN
  -- Récupérer l'ID de l'utilisateur qui appelle
  v_caller_id := auth.uid();
  
  IF v_caller_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Vous devez être connecté'
    );
  END IF;

  -- Récupérer le rôle de l'utilisateur qui appelle
  SELECT role INTO v_caller_role
  FROM profiles
  WHERE id = v_caller_id;

  -- Vérifier que l'utilisateur appelant est Admin ou Super_Admin
  IF v_caller_role NOT IN ('Admin', 'Super_Admin') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Permissions insuffisantes. Seuls les Admin peuvent modifier les rôles.',
      'your_role', v_caller_role
    );
  END IF;

  -- Valider le nouveau rôle
  IF new_role NOT IN ('Guest', 'Communication', 'Cabinet', 'Admin', 'Super_Admin') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Rôle invalide: ' || new_role
    );
  END IF;

  -- Effectuer la mise à jour
  UPDATE profiles
  SET role = new_role, updated_at = NOW()
  WHERE id = target_user_id;

  GET DIAGNOSTICS v_success = ROW_COUNT;

  IF v_success > 0 THEN
    RETURN json_build_object(
      'success', true,
      'message', 'Rôle mis à jour avec succès',
      'user_id', target_user_id,
      'new_role', new_role,
      'updated_at', NOW()::TEXT
    );
  ELSE
    RETURN json_build_object(
      'success', false,
      'error', 'Utilisateur non trouvé'
    );
  END IF;

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', 'Exception: ' || SQLERRM,
    'detail', SQLSTATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Accorder les permissions à la fonction RPC
GRANT EXECUTE ON FUNCTION update_user_role(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_role(UUID, TEXT) TO anon;

-- Étape 9: Vérifier que tout est correct
SELECT 
  (SELECT COUNT(*) FROM profiles) as total_users,
  (SELECT COUNT(*) FROM profiles WHERE role = 'Super_Admin') as super_admins,
  (SELECT COUNT(*) FROM profiles WHERE role = 'Admin') as admins;

-- Afficher les utilisateurs avec leurs rôles
SELECT id, full_name, role, updated_at FROM profiles ORDER BY full_name;
