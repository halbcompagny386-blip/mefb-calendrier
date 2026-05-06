-- 🔍 DIAGNOSTIC: Afficher les colonnes actuelles de la table 'activities'

-- 1️⃣ Afficher TOUTES les colonnes de la table activities
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'activities' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2️⃣ Si vous voulez ajouter les colonnes manquantes, exécutez:
-- Remplacez ce commentaire par les commandes ALTER TABLE ci-dessous

-- 🔧 POUR AJOUTER LES COLONNES MANQUANTES:
-- Exécutez ces commandes UNE PAR UNE ou ensemble

ALTER TABLE activities
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Gouvernance';

ALTER TABLE activities
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'Réunion de cabinet';

-- 3️⃣ Vérifier après ajout
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'activities' 
  AND table_schema = 'public'
ORDER BY column_name;
