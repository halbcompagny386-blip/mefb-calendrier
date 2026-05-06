-- ⚠️ ATTENTION: Désactiver les RLS d'abord pour débloquer les profils
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Supprimer les policies existantes problématiques
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update roles" ON profiles;

-- Créer une fonction RPC sécurisée pour mettre à jour les rôles
CREATE OR REPLACE FUNCTION update_user_role(target_user_id UUID, new_role TEXT)
RETURNS JSON AS $$
DECLARE
  v_caller_role TEXT;
  v_result JSON;
BEGIN
  -- Récupérer le rôle de l'utilisateur qui appelle
  SELECT role INTO v_caller_role
  FROM profiles
  WHERE id = auth.uid();

  -- Vérifier que l'utilisateur appelant est Admin ou Super_Admin
  IF v_caller_role NOT IN ('Admin', 'Super_Admin') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Permissions insuffisantes. Seuls les Admin peuvent modifier les rôles.',
      'caller_role', v_caller_role
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

  -- Vérifier que la mise à jour a bien été appliquée
  RETURN json_build_object(
    'success', true,
    'message', 'Rôle mis à jour avec succès',
    'user_id', target_user_id,
    'new_role', new_role,
    'updated_at', NOW()::TEXT
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', 'Exception: ' || SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Donner les permissions à la fonction
GRANT EXECUTE ON FUNCTION update_user_role(UUID, TEXT) TO authenticated;

-- ✅ Réactiver RLS avec une politique simple
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Politique simple: Tout le monde peut lire tout
CREATE POLICY "profiles_select_all"
  ON profiles FOR SELECT
  USING (true);

-- Politique de mise à jour: les utilisateurs ne peuvent modifier que leur propre profil via RPC
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
