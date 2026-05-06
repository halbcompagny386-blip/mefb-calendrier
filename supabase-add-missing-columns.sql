-- 🔧 SCRIPT POUR AJOUTER LES COLONNES MANQUANTES À LA TABLE ACTIVITIES

-- Vérifier quelles colonnes existent actuellement
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'activities' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Ajouter la colonne 'category' si elle n'existe pas
ALTER TABLE activities
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Gouvernance';

-- Ajouter la colonne 'type' si elle n'existe pas
ALTER TABLE activities
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'Réunion de cabinet';

-- Vérifier que les colonnes ont été ajoutées
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'activities' AND table_schema = 'public'
ORDER BY column_name;
