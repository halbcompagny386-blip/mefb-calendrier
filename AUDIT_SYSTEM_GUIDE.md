# 🔍 Guide d'Utilisation du Système d'Audit

## Vue d'ensemble
Le nouveau système d'audit permet au super_admin de diagnostiquer rapidement l'état de santé de l'application en testant le front-end, le back-end et la base de données.

## Comment accéder au bouton Audit

### 📍 Localisation
1. **Allez** dans la page **Paramètres** (icône ⚙️ dans la barre latérale gauche)
2. **Sélectionnez** la section **API & Système** (pour les Admin et Super Admin)
3. **Cherchez** le bouton bleu **🔍 Audit Système** dans la section "Administration Système"

### 🎯 Accès
- **Rôle requis**: Super_Admin uniquement
- **Localisation précise**: 
  - Barre latérale gauche
  - Sous le titre "Administration Système"
  - AVANT le bouton "Activer/Désactiver Maintenance"

## 🚀 Fonctionnalités de l'Audit

### Tests Front-End
L'audit vérifie:
- ✅ Stockage local du navigateur (localStorage)
- ✅ Données d'application stockées localement
- ✅ Stockage de session (sessionStorage)
- ✅ Chargement des composants essentiels
- ✅ Connectivité réseau et latence

**Propositions de solution** en cas de problème:
- Vérifiez les paramètres de confidentialité du navigateur
- Videz le cache du navigateur
- Vérifiez la connexion Internet
- Désactivez les extensions du navigateur

### Tests Back-End
L'audit teste:
- 🔗 Connexion à l'API Supabase
- 🤖 Connexion à l'API Groq AI (Llama 3.3)
- 📡 WebSocket Realtime de Supabase

**Propositions de solution** en cas d'erreur:
- Vérifiez les variables d'environnement (.env)
- Vérifiez les clés API (VITE_GROQ_API_KEY, VITE_SUPABASE_URL, etc.)
- Vérifiez les paramètres CORS dans Supabase
- Vérifiez le crédit de l'API Groq
- Redémarrez le serveur de développement

### Tests Base de Données
L'audit contrôle:
- 📊 Accessibilité des tables principales
  - activities, profiles, calendar_events, briefing
  - pedagogical_capsules, press_reviews, contacts
- 👥 Rôles et permissions utilisateur
- 🔧 Fonctions RPC disponibles
- 🔐 État de l'authentification

**Propositions de solution** en cas de problème:
- Exécutez les migrations de base de données
- Vérifiez les permissions d'accès
- Contactez l'administrateur base de données

## 📊 Résultats et Status

### Codes de Status

| Icône | Statut | Signification |
|-------|--------|--------------|
| ✅ | SUCCESS | Fonctionne correctement |
| ⚠️ | WARNING | Fonctionne avec restrictions |
| ❌ | ERROR | Ne fonctionne pas |
| ⏳ | LOADING | Test en cours |

### Status Global du Système

- 🟢 **HEALTHY** (Sain): Tous les tests réussissent
- 🟡 **DEGRADED** (Dégradé): Quelques avertissements
- 🔴 **CRITICAL** (Critique): Erreurs détectées

## 📥 Actions Disponibles

### Dans le rapport d'audit

1. **Réexécuter l'Audit**
   - Bouton "Réexécuter l'Audit"
   - Teste à nouveau tous les services
   - Utile pour vérifier les corrections

2. **Télécharger PDF**
   - Génère un rapport PDF complet
   - Inclut les résumés et détails des tests
   - À archiver pour la trace

3. **Copier le Rapport**
   - Copie le texte complet du rapport
   - À coller dans un ticket/email

4. **Détails Étendus**
   - Cliquez sur une ligne de test
   - Voir les détails complets et les propositions de solution

## 🎯 Scénarios d'Utilisation

### Scenario 1: Diagnostic général
1. Allez dans Paramètres → API & Système
2. Cliquez sur "🔍 Audit Système"
3. Attendez la fin de l'audit (2-5 secondes)
4. Consultez le rapport de santé

### Scenario 2: Troubleshooting rapide
1. Un utilisateur signale un problème
2. Lancez l'audit système
3. Identifiez le composant défaillant
4. Suivez les propositions de solution

### Scenario 3: Vérification avant production
1. Complétez vos modifications
2. Lancez un audit complet
3. Vérifiez que tous les tests passent
4. Téléchargez le rapport pour la trace

## 💡 Conseils & Bonnes Pratiques

✅ **À faire:**
- Lancez un audit après chaque déploiement
- Archivez les rapports PDF pour le suivi
- Consultez l'audit en cas de problème utilisateur

❌ **À éviter:**
- Ne lancez pas d'audit concurrent (attendez la fin)
- Ne supprimez pas les clés API sans test préalable
- Ne modifiez pas les variables d'environnement en production sans test

## 📋 Checklist Rapide

- [ ] Accédez à Paramètres (icône ⚙️)
- [ ] Allez à "API & Système"
- [ ] Cliquez sur "🔍 Audit Système"
- [ ] Attendez la fin du test
- [ ] Consultez les résultats
- [ ] Résolvez tout problème détecté
- [ ] Téléchargez le rapport si nécessaire

---

**Questions?** Consultez les propositions de solution directement dans chaque test.
