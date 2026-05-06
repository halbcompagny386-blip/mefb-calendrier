# 🚀 GUIDE DE DÉPLOIEMENT RAPIDE - AMÉLIORATIONS CAPSULE DU VENDREDI

**Durée totale:** ~20 minutes  
**Pré-requis:** Accès Supabase + Git

---

## 📋 CHECKLIST PRÉ-DÉPLOIEMENT

- [ ] Sauvegarder la branche actuelle: `git checkout -b backup-before-ped-improvements`
- [ ] Créer une branche pour les modifications: `git checkout -b feat/ped-module-improvements`
- [ ] Vérifier Supabase en ligne
- [ ] Vérifier VITE_GROQ_API_KEY configurée
- [ ] Nettoyer cache local: `npm run clean` (si existe)

---

## 🔧 PHASE 1: MISE À JOUR BASE DE DONNÉES (5 min)

### Étape 1.1: Créer la structure de table

```sql
-- Aller dans Supabase Console → SQL Editor
-- Coller le contenu complet de: supabase-pedagogical-improvements.sql
-- Exécuter le script complet

-- Vérifier la création:
SELECT * FROM pedagogical_capsules LIMIT 1;  -- Ne doit pas retourner d'erreur
```

### Étape 1.2: Vérifier les indexes

```sql
SELECT indexname FROM pg_indexes 
WHERE tablename = 'pedagogical_capsules'
ORDER BY indexname;
```

**Résultat attendu:** Au moins 5 indexes

### Étape 1.3: Vérifier les RLS policies

```sql
SELECT policyname, permissive, cmd 
FROM pg_policies 
WHERE tablename = 'pedagogical_capsules'
ORDER BY policyname;
```

**Résultat attendu:** 6 policies (read_published, read_own_draft, create_draft, etc.)

### Étape 1.4: Tester la fonction RPC

```sql
-- Ne pas exécuter directement, juste vérifier sa présence:
SELECT proname FROM pg_proc 
WHERE proname = 'publish_pedagogical_draft';

-- Résultat: 1 ligne = OK
```

---

## 📦 PHASE 2: MISE À JOUR SERVICES (3 min)

### Étape 2.1: Mettre à jour le fichier

```bash
# Copier le contenu amélioré de pedagogicalService.ts
# Path: src/services/pedagogicalService.ts

# Vérifier la syntaxe:
npm run build -- --noEmit

# Devrait compiler sans erreur
```

### Étape 2.2: Vérifier les imports

```bash
# Vérifier que tous les imports existent:
grep -n "^import\|^export" src/services/pedagogicalService.ts

# Vérifier les nouvelles fonctions:
grep "export const" src/services/pedagogicalService.ts
```

**Nouvelles fonctions attendues:**
- `generatePedagogicalCapsule`
- `getPedagogicalConcepts`
- `saveCapsuleDraft` ✅ NOUVEAU
- `getCapsuleDrafts` ✅ NOUVEAU
- `updateCapsuleDraft` ✅ NOUVEAU
- `deleteCapsuleDraft` ✅ NOUVEAU
- `publishDraftCapsule` ✅ NOUVEAU
- `publishCapsule`

---

## 🎨 PHASE 3: MISE À JOUR COMPOSANTS (2 min)

### Étape 3.1: Mettre à jour le composant

```bash
# Copier le contenu amélioré de PedagogicalModule.tsx
# Path: src/components/agenda/PedagogicalModule.tsx

# Vérifier les imports nouveaux:
grep "Edit\|Download\|Copy\|Send" src/components/agenda/PedagogicalModule.tsx

# Devrait trouver: ✅
```

### Étape 3.2: Vérifier les nouveaux hooks

```bash
# Vérifier l'utilisation des nouvelles fonctions:
grep "getCapsuleDrafts\|updateCapsuleDraft\|deleteCapsuleDraft" \
  src/components/agenda/PedagogicalModule.tsx

# Devrait trouver: ✅
```

### Étape 3.3: Compiler et vérifier

```bash
npm run build

# Doit compiler sans erreur ni warning
```

---

## 🧪 PHASE 4: TESTS (10 min)

### Test 4.1: Charger les concepts

```
1. Ouvrir l'app
2. Aller à Journal Interne → Capsule du Vendredi
3. Vérifier: Banque de Concepts affichée ✅
```

**Résultat attendu:**
- Liste de concepts (TVA, LFR, Déficit budgétaire, etc.)
- Badge "VENDREDI PÉDAGOGIE" visible
- Bouton "+ Nouveau Concept" visible pour Admin/Communication

### Test 4.2: Générer une capsule

```
1. Cliquer sur un concept "Prêt" (status = ready)
2. Cliquer "Générer"
3. Attendre 30-60 secondes
```

**Résultat attendu:**
- ⏳ Message "Génération du script vidéo... (30-60 secondes)"
- ✅ Après ~60s: "Capsule générée avec succès!"
- Modal affiche: Script | Post Social | Visuels

### Test 4.3: Sauvegarder comme brouillon

```
1. Une fois capsule générée
2. Cliquer "Sauvegarder en Brouillon"
3. Attendre réponse
```

**Résultat attendu:**
- ✅ Toast: "💾 Brouillon sauvegardé!"
- Modal se ferme
- Nouvelle tab "Brouillons" affiche la capsule
- Statut: "draft"

### Test 4.4: Éditer le brouillon

```
1. Aller au tab "Brouillons"
2. Cliquer "Éditer" sur le brouillon
3. Modifier le texte du post social
4. Cliquer "Mettre à jour"
```

**Résultat attendu:**
- ✅ Toast: "Brouillon mis à jour"
- Modifications visibles immédiatement
- Pas d'erreur en console

### Test 4.5: Publier depuis brouillon

```
1. Tab "Brouillons"
2. Cliquer "Publier" sur le brouillon
3. Confirmer si demandé
```

**Résultat attendu:**
- ✅ Toast: "🎉 Brouillon publié avec succès!"
- Brouillon disparaît de la liste
- Capsule apparaît dans "Historique Publications"

### Test 4.6: Supprimer un brouillon

```
1. Tab "Brouillons"
2. Générer une nouvelle capsule
3. Cliquer "Supprimer"
4. Confirmer suppression
```

**Résultat attendu:**
- ✅ Toast: "🗑️ Brouillon supprimé"
- Le brouillon disparaît de la liste
- Aucune erreur en console

### Test 4.7: Vérifier RLS

```bash
# Dans psql ou SQL Editor Supabase:
SELECT COUNT(*) FROM pedagogical_capsules WHERE status = 'draft';
-- Doit retourner 0 ou le nombre attendu

SELECT COUNT(*) FROM pedagogical_capsules WHERE status = 'published';
-- Doit retourner >= 1 (capsule testée)
```

### Test 4.8: Vérifier Audit Log

```bash
# Dans Supabase SQL Editor:
SELECT * FROM pedagogical_audit_log 
ORDER BY created_at DESC LIMIT 5;

-- Doit montrer les 5 dernières actions (INSERT, UPDATE, etc.)
```

---

## ✅ PHASE 5: VÉRIFICATIONS FINALES (2 min)

### Checklist Finale

- [ ] Tous les tests passent
- [ ] Aucun warning en console
- [ ] Aucun erreur en Supabase logs
- [ ] Audit trail enregistre les actions
- [ ] Brouillons sauvegardés correctement
- [ ] RLS policies bloquent les accès non autorisés

---

## 🚀 PHASE 6: DÉPLOIEMENT EN PROD (2 min)

### Étape 6.1: Commiter les changements

```bash
git add .
git commit -m "feat: improve pedagogical module with draft system, retry logic, and RLS"
```

### Étape 6.2: Push vers main

```bash
git push origin feat/ped-module-improvements
# Créer une Pull Request
# Faire valider par équipe lead
# Merger vers main

# OU directement (si confiance):
git checkout main
git pull
git merge feat/ped-module-improvements
git push origin main
```

### Étape 6.3: Déployer

```bash
# Via Vercel/Netlify (auto-deploy sur main)
# OU manuel:
npm run build
# Déployer le dossier dist/ vers production
```

### Étape 6.4: Vérifier en prod

```
1. Aller sur le site prod
2. Tester le cycle complet (générer → sauvegarder → publier)
3. Vérifier aucune erreur 500
4. Monitorer les logs Supabase pendant 30 min
```

---

## 🔍 TROUBLESHOOTING

### Problème: "VITE_GROQ_API_KEY not configured"

**Solution:**
```bash
# Vérifier .env.local ou .env
cat .env.local | grep GROQ

# Si absent, l'ajouter:
VITE_GROQ_API_KEY=gsk_xxxxxxxxxxxxx
```

### Problème: "Table pedagogical_capsules does not exist"

**Solution:**
```bash
# Re-exécuter supabase-pedagogical-improvements.sql entièrement
# Vérifier dans Supabase: Tables → pedagogical_capsules
```

### Problème: "RLS policy ... violated"

**Solution:**
```bash
# Vérifier que l'user est authentifié et a le bon rôle
# Vérifier profiles.role IN ('Communication', 'Admin', 'Super_Admin')

# Test direct:
SELECT id, role FROM profiles WHERE id = auth.uid();
```

### Problème: "Timeout API (50s)"

**Solution:**
```
1. Vérifier la connexion internet
2. Vérifier Groq API status (groq.com/status)
3. Si problème persiste, augmenter TIMEOUT_MS dans makeRequestWithRetry
4. Max 3 tentatives avec backoff exponentiel
```

---

## 📊 MONITORING POST-DÉPLOIEMENT

### Metrics à Vérifier

```sql
-- Capsules générées
SELECT COUNT(*) as total_generated FROM pedagogical_capsules;

-- Brouillons actuels
SELECT COUNT(*) as drafts_in_progress 
FROM pedagogical_capsules WHERE status = 'draft';

-- Taux de publication
SELECT 
  COUNT(CASE WHEN status = 'published' THEN 1 END) as published,
  COUNT(CASE WHEN status = 'draft' THEN 1 END) as drafts,
  ROUND(100.0 * COUNT(CASE WHEN status = 'published' THEN 1 END) / COUNT(*), 1) as publish_rate_percent
FROM pedagogical_capsules;

-- Utilisateurs actifs
SELECT created_by_name, COUNT(*) as capsules_created
FROM pedagogical_capsules
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY created_by_name
ORDER BY capsules_created DESC;

-- Erreurs dans audit log
SELECT * FROM pedagogical_audit_log
WHERE action = 'ERROR'
ORDER BY created_at DESC LIMIT 10;
```

---

## 📞 SUPPORT

Si problèmes lors du déploiement:

1. **Vérifier les logs:** `Supabase → Logs → API logs` ou `Browser DevTools → Console`
2. **Vérifier la BD:** `Supabase → SQL Editor` et exécuter les vérifications ci-dessus
3. **Reroller si critique:** `git revert <commit-hash>`

---

## ✨ SUCCÈS!

Une fois tous les tests passés et déployé, vous avez:

✅ Module "Capsule du Vendredi" **PRODUCTION READY**  
✅ Gestion d'erreurs **ROBUSTE**  
✅ Brouillons **ÉDITABLES**  
✅ Sécurité **RENFORCÉE** avec RLS  
✅ Audit trail **COMPLET**  
✅ Performance **OPTIMISÉE**  

🎉 **Déploiement Réussi!**
