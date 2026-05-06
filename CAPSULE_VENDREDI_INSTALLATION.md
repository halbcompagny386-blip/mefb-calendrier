# 🚀 GUIDE D'INSTALLATION: Améliorations Capsule du Vendredi

## ⚡ Installation en 5 Minutes

### Étape 1: Exécuter le Script SQL (2 min)

```bash
# 1. Ouvrir Supabase Dashboard
#    → https://supabase.com/dashboard

# 2. Aller dans: SQL Editor → Create Query

# 3. Copier le contenu du fichier:
#    supabase-pedagogical-capsules.sql

# 4. Coller dans l'éditeur SQL

# 5. Cliquer "Run" (ou Ctrl+Enter)

# ✅ Vérifier: Pas d'erreurs rouges
```

**Attendu:**
```
✅ Table pedagogical_capsules created
✅ Indexes created
✅ Function publish_pedagogical_capsule created
✅ RLS policies enabled
✅ View pedagogical_stats created
```

### Étape 2: Redéployer l'Application (2 min)

```bash
# Terminal dans le dossier du projet
cd "d:\Mes Projets d'APP\MEFB calendrier éditorial"

# Arrêter le serveur actuel (Ctrl+C si en cours)
# ou tuer le processus npm

# Réinstaller si changements dans package.json
# (normalement pas nécessaire)
npm install

# Redémarrer le serveur
npm run dev

# ✅ Vérifier: Pas d'erreurs TypeScript
```

### Étape 3: Vérifier la Base de Données (1 min)

```bash
# Dans Supabase Dashboard

# 1. Tables → Vérifier "pedagogical_capsules" existe
# 2. SQL Editor → Vérifier functions existent
# 3. Policies → Vérifier RLS est activé

# Quicky test:
SELECT * FROM pedagogical_capsules LIMIT 1;
# Doit retourner: 0 rows (table vide, c'est normal)
```

---

## 🧪 Test de Base: Flux Complet

### Test 1: Générer et Sauvegarder (3 min)

```
1. Ouvrir app → http://localhost:5173/
2. Aller à: "Journal Interne" (sidebar)
3. Cliquer "Capsule du Vendredi" (tab)
4. Observer: Badge "VENDREDI PÉDAGOGIE" (si vendredi)
5. Cliquer "Nouveau Concept"
   - Nom: "Budget Participatif"
   - Technique: "Processus d'allocation des fonds publics..."
   - Simplifié: "Comment les citoyens décident comment utiliser l'argent..."
   - Statut: "Prêt"
6. Cliquer "Ajouter le Concept"
7. Vérifier toast: "✅ Concept ajouté avec succès!"
8. Localiser la carte du concept créé
9. Cliquer le bouton vert "Générer"
10. Attendre 30-60 secondes (avec feedback toast)
11. Voir modale: Script vidéo + Post social + Suggestions visuelles
12. Cliquer "Enregistrer Brouillon"
13. Vérifier toast: "💾 Brouillon sauvegardé avec succès"
14. Aller vérifier en BD:

SELECT * FROM pedagogical_capsules 
WHERE status = 'draft' 
ORDER BY created_at DESC LIMIT 1;

✅ Vérifier: created_by, video_script, social_content présents
```

### Test 2: Publier Capsule (2 min)

```
1. Dans la modale de génération (ou régénérer)
2. Cliquer "Publier"
3. Attendre confirmation
4. Vérifier toast: "🎉 Capsule publiée avec succès!"
5. Vérifier en BD:

SELECT 
  pc.id, pc.status, pc.published_at, pc.published_by_name,
  pv.concept_name
FROM pedagogical_capsules pc
JOIN pedagogical_vault pv ON pc.concept_id = pv.id
WHERE pc.status = 'published'
ORDER BY pc.published_at DESC LIMIT 1;

✅ Vérifier: status = 'published', published_at = NOW()
```

### Test 3: Historique Capsules Publiées (1 min)

```
1. Rester dans "Capsule du Vendredi"
2. Scroller vers bas
3. Voir section "Capsules Publiées"
4. Vérifier la capsule vient de s'afficher
5. Info doit montrer: Concept name, date publication, auteur
```

### Test 4: Gestion d'Erreur (2 min)

```
Simuler perte de connexion:
1. Ouvrir DevTools (F12)
2. Network tab → Throttling → "Offline"
3. Essayer générer une capsule
4. Observer: Toast avec retry (tentative 1, 2, 3)
5. Après 3 tentatives: Erreur claire affichée
6. Pas de "generating" bloqué
7. Rétablir connexion (throttle → Online)
```

### Test 5: Validation Contenu (2 min)

```
Test la validation sans tricher (elle se fera auto):
1. Générer plusieurs capsules
2. Checker console logs (F12 → Console)
3. Voir patterns:
   - "⏳ Génération en parallèle..."
   - "✅ Contenu généré, validation..."
   - "✅ Capsule pédagogique générée"
4. Si erreur validation:
   - "❌ Validation échouée: ..."
5. Vérifier: Post social_content ≤ 280 chars
   Voir dans modale:
   "XX/280 caractères"
```

---

## 🔍 Vérification de Santé Système

### Checklist Post-Installation

```bash
# 1. Tables créées ✓
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE 'pedagogical%';

# Attendu: pedagogical_vault, pedagogical_capsules, pedagogical_publications

# 2. Indexes créés ✓
SELECT indexname FROM pg_indexes 
WHERE schemaname = 'public' AND tablename = 'pedagogical_capsules';

# Attendu: 4 indexes (concept, status, published_at, created_by)

# 3. Fonction RPC créée ✓
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' AND routine_name LIKE 'publish_%';

# Attendu: publish_pedagogical_capsule

# 4. RLS Activé ✓
SELECT tablename FROM pg_tables 
WHERE schemaname='public' AND rowsecurity=true;

# Attendu: pedagogical_capsules, pedagogical_vault, pedagogical_publications

# 5. Données de test ✓
SELECT COUNT(*) FROM pedagogical_vault;
# Attendu: ≥ 5 (concepts de base injectés)

SELECT COUNT(*) FROM pedagogical_capsules;
# Attendu: 0+ (dépend des tests faits)
```

---

## 🐛 Dépannage

### Erreur: "Table pedagogical_capsules does not exist"

**Cause:** Script SQL n'a pas été exécuté
**Solution:**
```bash
# 1. Supabase Dashboard → SQL Editor
# 2. Copier supabase-pedagogical-capsules.sql
# 3. Vérifier pas d'erreurs de syntax
# 4. Cliquer "Run"
# 5. Attendre ✅
```

### Erreur: "Permission denied for schema public"

**Cause:** Manque de permissions Supabase
**Solution:**
```bash
# 1. Vérifier login admin Supabase
# 2. Project Settings → Database → Ensure authenticated role
# 3. Re-exécuter le script SQL
```

### Erreur: "Groq API timeout"

**Cause:** Réseau lent ou Groq surchargé
**Solution:**
```
1. Vérifier connexion internet
2. Système retry automatique: attendre 3 tentatives
3. Si toujours erreur: Vérifier VITE_GROQ_API_KEY en .env
4. Groq quota peut être dépassé → Vérifier dashboard Groq
```

### Toast d'alerte ne disparaît pas

**Cause:** Durée alert mal définie
**Solution:**
```
Dans console browser (F12):
1. Inspecter l'alerte
2. Vérifier classe CSS appliquée
3. Rafraîchir page (F5)
4. Déclarer manuellement: setAlert(null) dans console
```

### Capsule publiée n'apparaît pas en historique

**Cause:** Données non synchronisées
**Solution:**
```bash
# 1. Rafraîchir page (F5)
# 2. Vérifier BD:
SELECT * FROM pedagogical_capsules 
WHERE status = 'published' 
ORDER BY published_at DESC LIMIT 5;

# 3. Si données là mais pas en UI:
# - Vérifier permissions RLS
# - Vérifier user role (Communication/Admin)
# - Check browser console pour erreurs fetch
```

---

## 📊 Commandes SQL Utiles

### Reset Données de Test

```sql
-- ⚠️ ATTENTION: Supprime toutes les données

DELETE FROM pedagogical_capsules;
DELETE FROM social_publications 
WHERE platform = 'Capsule Pédagogique';

-- Réinjecter concepts de base
INSERT INTO pedagogical_vault (
  concept_name, technical_definition, simplified_explanation, status
) VALUES
('TVA', 'Taxe sur la Valeur Ajoutée...', 'Taxe lors de l\'achat...', 'ready'),
('Budget Participatif', 'Processus...', 'Comment décider...', 'ready');
```

### Voir Statistiques

```sql
-- Vue pré-créée
SELECT * FROM pedagogical_stats 
ORDER BY published_count DESC;

-- Result:
-- concept_name | published_count | draft_count | total_views
-- TVA          | 3               | 1           | 42
```

### Export Capsules Publiées

```sql
SELECT 
  pv.concept_name,
  pc.video_script,
  pc.social_content,
  pc.published_at::date,
  pc.published_by_name
FROM pedagogical_capsules pc
JOIN pedagogical_vault pv ON pc.concept_id = pv.id
WHERE pc.status = 'published'
ORDER BY pc.published_at DESC;
```

---

## ✅ Checklist Avant Production

- [ ] Script SQL exécuté sans erreurs
- [ ] Tables visibles en Supabase Dashboard
- [ ] Test 1: Générer & Sauvegarder ✓
- [ ] Test 2: Publier ✓
- [ ] Test 3: Historique affiche ✓
- [ ] Test 4: Gestion erreur fonctionne ✓
- [ ] Test 5: Validation appliquée ✓
- [ ] Login avec user Communication → OK
- [ ] Login avec user Admin → OK
- [ ] Login avec user Cabinet → OK (read-only)
- [ ] Console: Aucune erreur TypeScript
- [ ] Console: Logs détaillés apparaissent
- [ ] Toast notifications affichent correctement
- [ ] Performance: Génération < 60s

---

## 📞 Support

Erreur non listée? 

```bash
# 1. Vérifier les logs browser
F12 → Console tab → Rechercher "❌" or "ERROR"

# 2. Vérifier les logs Supabase
Dashboard → Logs → Filter "pedagogical"

# 3. Vérifier la BD directement
SQL Editor → Query test sur pedagogical_* tables

# 4. Redémarrer l'app
npm run dev → Ctrl+C → npm run dev

# 5. Hard reset
Supprimer node_modules, npm install, npm run dev
```

---

**Documentation créée:** 28 avril 2026
**Dernière mise à jour:** 28 avril 2026
