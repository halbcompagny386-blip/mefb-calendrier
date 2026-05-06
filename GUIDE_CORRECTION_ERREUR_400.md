# 🔧 GUIDE DE DIAGNOSTIC - Erreur 400 lors de l'ajout d'activité

## 🎯 Problème Identifié

L'erreur 400 provient de l'envoi de colonnes **JSONB** non sérialisées à Supabase. 

**Avant la correction:**
```javascript
channels: [], // Envoyé comme array JavaScript
comments: [],
interview_questions: [],
history: []
```

**Après la correction:**
```javascript
channels: '[]',              // Envoyé comme string JSON
comments: '[]',
interview_questions: '[]',
history: '[]'
```

---

## ✅ Corrections Appliquées

### 1. **Insertion (App.tsx - ligne 867)**
Les colonnes JSONB sont maintenant sérialisées avec `JSON.stringify()` avant insertion.

### 2. **Récupération (App.tsx - ligne 222)**
Les colonnes JSONB sont désérialisées avec `JSON.parse()` lors du chargement.

### 3. **Mise à jour (App.tsx - ligne 800)**
Les colonnes JSONB sont sérialisées avant update et désérialisées après.

---

## 🧪 Pour Tester la Correction

### Étape 1: Vérifier la structure de la table dans Supabase
1. Allez dans Supabase Dashboard → SQL Editor
2. Exécutez le script: `supabase-diagnostic-activities.sql`
3. Vérifiez que les colonnes `channels`, `comments`, `interview_questions`, `history` existent

### Étape 2: Tester l'ajout d'une activité

1. Ouvrez l'application
2. Naviguez vers le Dashboard
3. Cliquez sur le bouton bleu **"AJOUTER UNE ACTIVITÉ"** dans le menu "DERNIÈRE ACTIVITÉ DU CABINET"
4. Remplissez le formulaire avec:
   - **Titre**: "Test Activity Correction"
   - **Date**: Aujourd'hui ou demain
   - **Description**: "Test de la correction de sérialisation JSONB"
   - **Responsable**: Un nom du cabinet
   - **Participants**: Quelques participants
   - **Lieu**: Un lieu quelconque
   - **Couverture médiatique**: Oui (O)
5. Cliquez sur **"Enregistrer les activités"**

### Étape 3: Vérifier les logs

Regardez la console du navigateur (F12 → Console). Vous devriez voir:

**SUCCÈS:**
```
📤 Tentative d'insertion de 1 activité(s) dans la base de données...
✅ Activités insérées en DB avec succès. ID retournés: [id]
🔄 Rechargement des données depuis Supabase...
✅ Données rechargées avec succès
✅ 1 activité(s) ajoutée(s) avec succès et sauvegardée(s) en base de données !
```

**ERREUR (à corriger):**
```
❌ ERREUR D'INSERTION SUPABASE : {
  message: "...",
  code: "...",
  status: 400,
  details: "...",
  hint: "..."
}
```

---

## 🔍 Si Vous Recevez Toujours une Erreur 400

### Cas 1: "Column does not exist"
**Solution**: Vérifiez que toutes les colonnes existent dans votre table Supabase:
- `title`, `description`, `date`, `responsible`, `participants`, `location`, `media`
- `status`, `workflow`, `created_at`, `category`, `type`, `commContent`
- `channels`, `comments`, `interview_questions`, `history`

**Exécutez dans Supabase:**
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'activities' AND table_schema = 'public' 
ORDER BY column_name;
```

### Cas 2: "Invalid type for column"
**Solution**: Vérifiez les types de colonnes JSONB:
```sql
SELECT column_name, data_type, udt_name 
FROM information_schema.columns 
WHERE table_name = 'activities' 
  AND column_name IN ('channels', 'comments', 'interview_questions', 'history');
```

**Résultat attendu:**
```
column_name           | data_type | udt_name
---------------------|-----------|----------
channels              | text      | (ou jsonb)
comments              | text      | (ou jsonb)
interview_questions   | text      | (ou jsonb)
history               | text      | (ou jsonb)
```

### Cas 3: RLS (Row Level Security) bloque l'insertion
**Solution**: Vérifiez les policies RLS:
```sql
SELECT policyname, permissive, roles, qual, with_check 
FROM pg_policies 
WHERE tablename = 'activities';
```

Si RLS est trop restrictif, créez une policy permissive:
```sql
-- Si aucune policy n'existe
CREATE POLICY "allow_all_activities" ON activities 
  FOR ALL USING (true) WITH CHECK (true);
```

### Cas 4: Énums/Check constraints invalides
**Solution**: Vérifiez les constraints de la table:
```sql
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'activities';
```

Vérifiez les valeurs acceptées pour `status` et `workflow` dans votre base de données.

---

## 📝 Fichiers Modifiés

- **`src/App.tsx`**:
  - Ligne 867: Sérialisation JSONB lors insertion
  - Ligne 222: Désérialisation JSONB lors chargement
  - Ligne 800: Sérialisation/Désérialisation lors update

---

## 📞 Support Supplémentaire

Si l'erreur persiste:
1. Exécutez `supabase-diagnostic-activities.sql` et partagez le résultat
2. Vérifiez les logs Supabase (Dashboard → Logs → Database)
3. Créez une activité de test directement via SQL Supabase pour confirmer que l'insertion fonctionne

