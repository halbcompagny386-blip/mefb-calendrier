/*
  SCRIPT DE CREATION DU COMPTE ADMIN
  1) Créez l'utilisateur dans Supabase Authentication :
     - Email : admin@mefb.gn
     - Password : Admin123456!
     - Auto-confirm user : coché
  2) Ensuite exécutez uniquement le SQL ci-dessous.
*/

INSERT INTO profiles (id, full_name, role)
SELECT
  id,
  'Administrateur MEFB',
  'Admin'
FROM auth.users
WHERE email = 'admin@mefb.gn'
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role;

-- Vérification
SELECT
  u.email,
  u.email_confirmed_at,
  p.full_name,
  p.role
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE u.email = 'admin@mefb.gn';
