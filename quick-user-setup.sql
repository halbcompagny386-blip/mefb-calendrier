-- 🚀 SCRIPT RAPIDE POUR CRÉER L'UTILISATEUR NUVATECH
-- À exécuter dans Supabase SQL Editor

-- ⚠️ IMPORTANT: Créez d'abord l'utilisateur via l'interface Supabase:
-- 1. Authentication > Users > Add user
-- 2. Email: nuvatechsolution.gn@gmail.com
-- 3. Password: Test123456!
-- 4. ✅ Auto-confirm user (IMPORTANT!)
-- 5. User metadata: {"full_name": "Nuvatech Solutions"}

-- Ensuite, exécutez ce script pour créer le profil:

-- Créer le profil Super_Admin
INSERT INTO profiles (id, full_name, role)
SELECT
  id,
  'Nuvatech Solutions',
  'Super_Admin'
FROM auth.users
WHERE email = 'nuvatechsolution.gn@gmail.com'
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role;

-- Vérifier la création
SELECT
  u.email,
  u.email_confirmed_at,
  p.full_name,
  p.role
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE u.email = 'nuvatechsolution.gn@gmail.com';

-- 📋 COMPTES DE TEST DISPONIBLES:
-- Super_Admin: nuvatechsolution.gn@gmail.com / Test123456!
-- Admin: admin@mefb.gn / Admin123456!
-- Communication: communication@mefb.gn / Comm123456!
-- Cabinet: cabinet@mefb.gn / Cabinet123456!
-- Guest: guest@mefb.gn / Guest123456!