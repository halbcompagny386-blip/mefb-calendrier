# ✅ CHECKLIST DE VALIDATION - Correction Erreur 400

## 🔍 Avant de Tester

### Étape 1: Vérifier la structure Supabase
- [ ] Ouvrez Supabase Dashboard
- [ ] Allez à SQL Editor
- [ ] Exécutez le contenu de `supabase-diagnostic-activities.sql`
- [ ] Notez les types de colonnes pour `channels`, `comments`, `interview_questions`, `history`

### Étape 2: Vérifier le build du code
```bash
cd "d:\Mes Projets d'APP\MEFB calendrier éditorial"
npm run build  # ou pnpm build ou yarn build
```
- [ ] La compilation se termine sans erreurs
- [ ] Aucun avertissement TypeScript critique

---

## 🧪 Tests Fonctionnels

### Test 1: Ajouter une activité via formulaire ⭐ PRINCIPAL

**Étapes:**
1. [ ] Ouvrez l'application dans le navigateur
2. [ ] Connectez-vous avec vos identifiants
3. [ ] Naviguez vers l'onglet "Dashboard"
4. [ ] Cliquez sur le bouton bleu **"AJOUTER UNE ACTIVITÉ"** dans le menu "DERNIÈRE ACTIVITÉ DU CABINET"
5. [ ] Remplissez le formulaire avec:
   - [ ] **Titre**: "Réunion de coordination budgétaire"
   - [ ] **Date**: Aujourd'hui ou demain
   - [ ] **Lieu**: "Salle des conférences"
   - [ ] **Responsable**: "Directrice du Budget"
   - [ ] **Participants**: "Directeur général, Chef de cabinet, Expert comptable"
   - [ ] **Description**: "Discussion sur la révision du budget Q2 2026"
   - [ ] **Couverture médiatique**: "Oui (O)"
6. [ ] Cliquez sur **"Enregistrer les activités"**

**Vérifications:**
- [ ] ✅ Message de succès apparaît: "✅ 1 activité(s) ajoutée(s) avec succès..."
- [ ] ✅ L'activité apparaît immédiatement dans le dashboard (optimistic update)
- [ ] ✅ Pas d'erreur 400 dans la console du navigateur (F12 → Console)
- [ ] ✅ Actualisez la page (F5) → l'activité est toujours présente
- [ ] ✅ Vérifiez dans Supabase Dashboard → Table `activities` → l'activité y est

**Logs Expected dans la Console:**
```
📤 Tentative d'insertion de 1 activité(s) dans la base de données...
🔍 Premier enregistrement à insérer: {
  "title": "Réunion de coordination budgétaire",
  "description": "Discussion sur la révision du budget Q2 2026",
  ...
  "channels": "[]",
  "comments": "[]",
  "interview_questions": "[]",
  "history": "[...]"
}
✅ Activités insérées en DB avec succès. ID retournés: [uuid]
🔄 Rechargement des données depuis Supabase...
✅ Données rechargées avec succès
✅ 1 activité(s) ajoutée(s) avec succès et sauvegardée(s) en base de données !
```

---

### Test 2: Ajouter plusieurs activités d'un coup

**Étapes:**
1. [ ] Cliquez à nouveau sur **"AJOUTER UNE ACTIVITÉ"**
2. [ ] Remplissez une première activité
3. [ ] Cliquez sur **"+ Ajouter une activité"** (en bas du formulaire)
4. [ ] Remplissez une deuxième activité
5. [ ] Cliquez sur **"Enregistrer les activités"**

**Vérifications:**
- [ ] ✅ Message: "✅ 2 activité(s) ajoutée(s)..."
- [ ] ✅ Les deux activités apparaissent dans le dashboard
- [ ] ✅ Aucune erreur 400

---

### Test 3: Importer un agenda

**Étapes:**
1. [ ] Cliquez sur le bouton d'upload (icône de fichier)
2. [ ] Sélectionnez un fichier d'agenda (Excel, Word, PDF, etc.)
3. [ ] Attendez que l'IA Groq analyse le fichier

**Vérifications:**
- [ ] ✅ Les activités s'importent sans erreur 400
- [ ] ✅ Les activités importées apparaissent dans le dashboard
- [ ] ✅ Actualisez la page → les activités importées persistent

---

### Test 4: Éditer une activité

**Étapes:**
1. [ ] Cliquez sur une activité existante
2. [ ] Cliquez sur **"Éditer"** ou ouvrez la sidebar d'édition
3. [ ] Modifiez le titre ou la description
4. [ ] Sauvegardez les modifications

**Vérifications:**
- [ ] ✅ Les modifications sont sauvegardées sans erreur 400
- [ ] ✅ Actualisez la page → les modifications persistent
- [ ] ✅ Tous les utilisateurs voient les modifications

---

### Test 5: Accessibilité Multi-utilisateurs

**Étapes:**
1. [ ] Utilisateur A ajoute une activité
2. [ ] Utilisateur B actualise la page
3. [ ] Utilisateur B voit l'activité ajoutée par Utilisateur A

**Vérifications:**
- [ ] ✅ Les activités sont partagées entre utilisateurs
- [ ] ✅ Les modifications d'un utilisateur sont immédiatement visibles aux autres

---

## 📊 Vérifications en Base de Données

### Dans Supabase Dashboard

**Étape 1: Vérifier les données insérées**
1. [ ] Allez dans SQL Editor
2. [ ] Exécutez:
```sql
SELECT id, title, date, channels, comments, interview_questions, history
FROM activities
ORDER BY created_at DESC
LIMIT 5;
```
3. [ ] Vérifiez que les colonnes JSONB contiennent du JSON valide:
   - [ ] `channels` contient: `"[]"` ou `[]`
   - [ ] `comments` contient: `"[]"` ou `[]`
   - [ ] `interview_questions` contient: `"[]"` ou `[]`
   - [ ] `history` contient du JSON valide avec timestamps et actions

**Étape 2: Vérifier la structure**
1. [ ] Exécutez:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'activities' AND table_schema = 'public'
ORDER BY ordinal_position;
```
2. [ ] Vérifiez que toutes les colonnes requises existent:
   - [ ] title (TEXT)
   - [ ] description (TEXT)
   - [ ] date (DATE)
   - [ ] responsible (TEXT)
   - [ ] participants (TEXT)
   - [ ] location (TEXT)
   - [ ] media (TEXT)
   - [ ] status (TEXT)
   - [ ] workflow (TEXT)
   - [ ] created_at (TIMESTAMP)
   - [ ] category (TEXT)
   - [ ] type (TEXT)
   - [ ] commContent (TEXT)
   - [ ] channels (TEXT ou JSONB)
   - [ ] comments (TEXT ou JSONB)
   - [ ] interview_questions (TEXT ou JSONB)
   - [ ] history (TEXT ou JSONB)

---

## 🐛 Troubleshooting

### ❌ Si vous voyez toujours l'erreur 400

**Étape 1: Vérifier les logs Supabase**
1. [ ] Allez dans Supabase Dashboard → Logs
2. [ ] Cherchez les erreurs de la table `activities`
3. [ ] Notez le message d'erreur complet

**Étape 2: Vérifier les constantes CHECK**
```sql
SELECT constraint_name, constraint_definition
FROM information_schema.check_constraints
WHERE table_name = 'activities';
```
- [ ] Vérifiez que les valeurs envoyées (status, workflow, media) sont dans les CHECK constraints

**Étape 3: Vérifier les RLS policies**
```sql
SELECT policyname, permissive
FROM pg_policies
WHERE tablename = 'activities';
```
- [ ] Si une policy restrictive existe, créez une permissive:
```sql
DROP POLICY IF EXISTS "activities_all" ON activities;
CREATE POLICY "activities_all" ON activities
  FOR ALL USING (true) WITH CHECK (true);
```

**Étape 4: Tester une insertion directe**
```sql
INSERT INTO activities (title, date, responsible, participants, location, media, status, workflow, category, type, description, commContent, created_at, channels, comments, interview_questions, history)
VALUES (
  'Test Direct SQL',
  '2026-04-24',
  'Test',
  'Test',
  'Test',
  'N',
  'À venir',
  'Brouillon',
  'Gouvernance',
  'Réunion de cabinet',
  'Test description',
  '',
  NOW(),
  '[]',
  '[]',
  '[]',
  '[]'
) RETURNING *;
```
- [ ] Si cela fonctionne, le problème vient du client
- [ ] Si cela échoue, le problème vient du schéma

---

## 📝 Fichiers Modifiés

- [ ] ✅ `src/App.tsx` - Sérialisation/Désérialisation des colonnes JSONB
- [ ] ✅ `src/components/agenda/AgendaUploader.tsx` - Sérialisation JSONB lors import

## 📚 Documentation Créée

- [ ] ✅ `CORRECTION_ERREUR_400_RESUME.md` - Résumé des corrections
- [ ] ✅ `GUIDE_CORRECTION_ERREUR_400.md` - Guide détaillé de diagnostic
- [ ] ✅ `supabase-diagnostic-activities.sql` - Script SQL de diagnostic

---

## ✅ Validation Finale

Tous les points suivants doivent être cochés pour valider la correction:

- [ ] Aucune erreur 400 lors de l'ajout d'activité
- [ ] Les activités ajoutées persistent après actualisation
- [ ] Les activités ajoutées sont visibles pour tous les utilisateurs
- [ ] Les colonnes JSONB contiennent du JSON valide en base de données
- [ ] L'importation d'agenda fonctionne sans erreur 400
- [ ] L'édition d'activités fonctionne sans erreur
- [ ] Tous les logs montrent "✅" et pas "❌"

**Statut**: ⏳ En attente de test  
**Date de vérification**: 

---

## 📞 Support Supplémentaire

Si vous rencontrez d'autres problèmes:

1. Capturez une capture d'écran de l'erreur
2. Ouvrez la console du navigateur (F12 → Console tab)
3. Copiez tous les messages d'erreur
4. Exécutez `supabase-diagnostic-activities.sql` et partagez le résultat
5. Vérifiez les logs Supabase Dashboard → Logs

