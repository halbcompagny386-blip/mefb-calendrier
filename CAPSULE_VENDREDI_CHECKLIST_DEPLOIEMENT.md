# ✅ CHECKLIST DÉPLOIEMENT: Capsule du Vendredi

## 📋 Avant Déploiement

### Vérifications Techniques

- [ ] Script SQL a été copié dans `supabase-pedagogical-capsules.sql`
- [ ] TypeScript compile sans erreurs: `npm run build` (pas d'erreurs)
- [ ] Aucune console error: `npm run dev` → F12 Console (aucun ❌)
- [ ] Variables d'env présentes: `VITE_GROQ_API_KEY` dans `.env.local`
- [ ] Supabase credentials valides: Tester connexion
- [ ] BD accessible: Supabase Dashboard se charge

### État des Fichiers

- [ ] `src/services/pedagogicalService.ts` modifié (validation + retry)
- [ ] `src/components/agenda/PedagogicalModule.tsx` modifié (UX alerts)
- [ ] `supabase-pedagogical-capsules.sql` créé et prêt
- [ ] Aucun fichier en conflit (git status)
- [ ] `.gitignore` ne bloque pas les fichiers nécessaires

---

## 📊 Installation BD (Étape 1)

### Exécution Script SQL

- [ ] Ouvrir Supabase Dashboard
- [ ] Aller à: SQL Editor
- [ ] Créer nouvelle query
- [ ] Copier-coller `supabase-pedagogical-capsules.sql`
- [ ] **Vérifier:** Pas d'erreur en rouge
- [ ] Cliquer "Run"
- [ ] Attendre: ✅ (1-2 minutes)
- [ ] Vérifier les logs: "pedagogical_capsules created"

### Vérification BD Post-Installation

```sql
-- Tester dans SQL Editor

-- ✅ Table créée
SELECT COUNT(*) FROM pedagogical_capsules;
-- Résultat attendu: 0

-- ✅ Concepts de base injectés
SELECT COUNT(*) FROM pedagogical_vault WHERE status = 'ready';
-- Résultat attendu: ≥ 5

-- ✅ Fonction RPC créée
SELECT COUNT(*) FROM information_schema.routines 
WHERE routine_name = 'publish_pedagogical_capsule';
-- Résultat attendu: 1

-- ✅ RLS activé
SELECT COUNT(*) FROM pg_tables 
WHERE schemaname='public' AND tablename='pedagogical_capsules' AND rowsecurity=true;
-- Résultat attendu: 1
```

- [ ] Tous les tests SQL passent
- [ ] Pas d'erreur "permission denied"
- [ ] Pas d'erreur "constraint violation"

---

## 🚀 Redéploiement App (Étape 2)

### Build & Test

```bash
# Terminal
npm run build
```

- [ ] Pas d'erreur TypeScript
- [ ] Fichier `dist/` créé
- [ ] Taille reasonnable (< 5MB)

```bash
# Terminal
npm run dev
```

- [ ] App démarre sans erreur
- [ ] Page accessible: http://localhost:5173
- [ ] F12 Console: Aucune erreur (aucun ❌)

---

## 🧪 Tests Fonctionnels (Étape 3)

### Test 1: Navigation

- [ ] Ouvrir app
- [ ] Cliquer "Journal Interne" (sidebar)
- [ ] Voir 3 tabs: Bilan | Réalisations | **Capsule du Vendredi**
- [ ] Cliquer "Capsule du Vendredi"
- [ ] Badge affiche: "VENDREDI PÉDAGOGIE" (si vendredi) ou "MODULE PÉDAGOGIQUE"

### Test 2: Créer Concept

- [ ] Cliquer "Nouveau Concept"
- [ ] Remplir:
  - Nom: "Budget Participatif"
  - Technique: "Processus d'allocation des ressources publiques par participation citoyenne"
  - Simplifié: "Comment les citoyens décident comment utiliser l'argent public"
  - Statut: "Prêt"
- [ ] Cliquer "Ajouter le Concept"
- [ ] Vérifier toast: "✅ Concept ajouté avec succès!"
- [ ] Voir la nouvelle carte du concept

### Test 3: Générer Capsule

- [ ] Trouver concept créé
- [ ] Cliquer bouton vert "Générer"
- [ ] Vérifier toast: "🎬 Génération du script vidéo..." (info)
- [ ] Attendre 30-60 secondes
- [ ] Voir modale avec 3 sections:
  - [ ] Script Vidéo (texte long)
  - [ ] Post Réseaux Sociaux (texte court)
  - [ ] Suggestions Visuelles (3 items)

### Test 4: Sauvegarder Brouillon ⭐ NOUVEAU

- [ ] Dans la modale de capsule
- [ ] Cliquer "Enregistrer Brouillon"
- [ ] Vérifier toast: "💾 Brouillon sauvegardé avec succès"
- [ ] Fermer modale
- [ ] Vérifier en BD:

```sql
SELECT id, status, created_by_name 
FROM pedagogical_capsules 
WHERE status = 'draft' 
ORDER BY created_at DESC 
LIMIT 1;
```

- [ ] Résultat: 1 ligne avec status='draft'

### Test 5: Publier Capsule

- [ ] Générer une nouvelle capsule
- [ ] Dans la modale, cliquer "Publier"
- [ ] Vérifier toast: "🎉 Capsule publiée avec succès!"
- [ ] Vérifier en BD:

```sql
SELECT id, status, published_at, published_by_name 
FROM pedagogical_capsules 
WHERE status = 'published' 
ORDER BY published_at DESC 
LIMIT 1;
```

- [ ] Résultat: 1 ligne avec status='published', published_at=NOW(), published_by_name rempli

### Test 6: Historique Affichage

- [ ] Rester dans "Capsule du Vendredi"
- [ ] Scroller vers bas
- [ ] Voir section "Capsules Publiées (X)"
- [ ] La capsule publiée doit apparaître avec:
  - [ ] Nom du concept
  - [ ] Date publication
  - [ ] Auteur
  - [ ] Badge "Publiée"

### Test 7: Gestion d'Erreur

**Simulation 1: Offline**
- [ ] F12 → Network → Throttling → Offline
- [ ] Essayer générer capsule
- [ ] Observer: Tentative 1 échoue → retry 2 → retry 3
- [ ] Après 3 retries: Toast d'erreur claire
- [ ] Pas de "generating" bloqué
- [ ] Rétablir Online

**Simulation 2: Timeout**
- [ ] (Normal, arrive parfois) Si génération dépasse 45s:
- [ ] Toast d'erreur: "❌ Erreur: Timeout API (45s)"
- [ ] Bouton "Régénérer" reste actif

### Test 8: Validation Contenu

- [ ] Générer plusieurs capsules
- [ ] Vérifier en console (F12 → Console):
  - [ ] Logs: "✅ Contenu généré, validation en cours..."
  - [ ] Logs: "✅ Capsule pédagogique générée avec succès"
- [ ] Checker dans modale:
  - [ ] Post social_content: "XX/280 caractères"
  - [ ] Doit être ≤ 280 caractères
  - [ ] Suggestions visuelles: 3 items visibles

### Test 9: Permissions RLS

**Login Communication:**
- [ ] Voir brouillons propres
- [ ] Voir tous les publiés
- [ ] Pouvoir générer/publier

**Login Admin:**
- [ ] Voir tous les brouillons
- [ ] Voir tous les publiés
- [ ] Pouvoir modifier statuts

**Login Cabinet:**
- [ ] Voir seulement les publiés
- [ ] Pas de boutons génération
- [ ] Lecture seule

---

## 📊 Tests de Charge (Optionnel)

### Performance

- [ ] Générer 5 capsules d'affilée: < 5 minutes
- [ ] Publier 5 capsules: < 30 secondes
- [ ] Historique charge: < 1 seconde
- [ ] Console: Aucune erreur Memory leak

### Concurrence

- [ ] 2 tabs ouvertes → générer simultanément
- [ ] Résultat: Aucun conflit BD
- [ ] Les deux capsules sauvegardées correctement

---

## 🔍 Vérification Finale

### Frontend

- [ ] [ ] Pas d'erreur TypeScript: `npm run build`
- [ ] [ ] Pas d'erreur console: F12
- [ ] [ ] Toast notifications affichent correctement
- [ ] [ ] Animations smooth (Framer Motion)
- [ ] [ ] Responsive: Desktop + Tablet + Mobile

### Backend/BD

- [ ] [ ] Supabase logs: Aucune erreur
- [ ] [ ] RLS policies: Fonctionnent correctement
- [ ] [ ] Fonction RPC: Appelable
- [ ] [ ] Indexes: Présents (query performance)

### Sécurité

- [ ] [ ] Pas de données sensibles en logs
- [ ] [ ] RLS bloque utilisateurs non-autorisés
- [ ] [ ] Password/API keys ne sont pas exposés
- [ ] [ ] CORS headers corrects

### Documentation

- [ ] [ ] CAPSULE_VENDREDI_RESUME.md écrit
- [ ] [ ] CAPSULE_VENDREDI_INSTALLATION.md écrit
- [ ] [ ] CAPSULE_VENDREDI_AMELIORATIONS.md écrit
- [ ] [ ] Tous les cas d'erreur documentés

---

## 🎯 Déploiement Production

### Pre-Flight Checklist

```
STATUS GLOBAL: ✅ GO/NO-GO

Frontend:       ✅ GO
Backend:        ✅ GO
Database:       ✅ GO
Documentation:  ✅ GO
Tests:          ✅ GO

DECISION: ✅ GREEN LIGHT - DEPLOY
```

### Déploiement

- [ ] Commit tous les changements: `git add . && git commit -m "feat: Améliorations Capsule du Vendredi"`
- [ ] Push vers main: `git push origin main`
- [ ] CI/CD pipeline démarre
- [ ] Attendre: Tests automatiques passent
- [ ] Vérifier: App accessible en production
- [ ] Test rapide: Générer une capsule en prod

### Post-Déploiement

- [ ] Monitorer les logs (Supabase)
- [ ] Vérifier pas d'erreur utilisateurs
- [ ] Notifier team Communication

---

## 📞 Rollback Procedure

Si problème critique:

```bash
# 1. Arrêter l'app
git revert <commit-hash>

# 2. Redéployer version précédente
git push origin main

# 3. Restaurer BD (backup pris avant déploiement)
# → Supabase Dashboard → Backups → Restore

# 4. Notifier team: "Version stable rétablie"
```

---

## ✅ Sign-Off

| Rôle | Nom | Date | Signature |
|------|-----|------|-----------|
| Dev | | | |
| QA | | | |
| Product | | | |
| Operations | | | |

---

**Cette checklist doit être complétée avant tout déploiement en production.**

Dernière mise à jour: **28 avril 2026**
