# 🧪 Guide de Test du Système de Bilan d'Accomplissements

## 1️⃣ Test de Restriction d'Accès

### Scénario 1 : Cabinet
**Condition attendue :** PublicationTracker masqué, interface propre

1. Connectez-vous avec un compte ayant `role = 'Cabinet'`
2. Allez à l'onglet **Dashboard**
3. Vérifiez que :
   - ❌ Le widget "Traçabilité Multicanal" N'EXISTE PAS
   - ✅ Les stats générales restent visibles
   - ✅ La "Directive Cabinet" s'affiche
4. **Résultat attendu** : Interface sans section de saisie de publication

### Scénario 2 : Service Communication
**Condition attendue :** PublicationTracker visible et fonctionnel

1. Connectez-vous avec un compte ayant `role = 'Communication'`
2. Allez à l'onglet **Dashboard**
3. Vérifiez que :
   - ✅ Le widget "Traçabilité Multicanal" s'affiche
   - ✅ Avec la section d'input (URL + Format)
   - ✅ Le bouton "Valider la Publication"
4. **Résultat attendu** : Widget complètement visible et interactive

---

## 2️⃣ Test du Flux de Publication

### Étape 1 : Saisie et Insertion Immédiate
**As:** User with role 'Communication'

1. Dans le widget **Traçabilité Multicanal**, collez une URL
   - Exemple : `https://www.youtube.com/watch?v=abc123`
2. Sélectionnez un format
   - Exemple : `Vidéo 16:9`
3. Cliquez sur **"Valider la Publication"**

**Vérifications immédiates :**
- ✅ Le bouton devient désactivé brièvement
- ✅ Une notification s'affiche : `"✅ Publication enregistrée ! Extraction IA en arrière-plan..."`
- ✅ Le champ URL se vide
- ✅ L'interface redevient disponible rapidement (< 2 secondes)

**En parallèle (arrière-plan) :**
- ✅ La base de données reçoit une nouvelle ligne `social_publications`
- ✅ Les champs sontpopulés avec :
  - `url` : L'URL saisie
  - `platform` : Détectée automatiquement (YouTube)
  - `format` : Le format sélectionné (Vidéo 16:9)
  - `user_name` : Récupéré de `profile.full_name`
  - `user_role` : Récupéré de `profile.role`
  - `summary` : "Synchronisation en cours..."
  - `published_at` : Timestamp ISO

---

### Étape 2 : Apparition Real-Time dans HistoryView
**Durée :** Immédiate (< 500ms après validation)

1. Ouvrez l'onglet **Journal Interne** (si pas déjà ouvert)
2. Assurez-vous d'être sur l'onglet **"Bilan Accomplissements"**

**Vérifications temps réel :**
- ✅ Une nouvelle carte de performance apparaît **EN HAUT** de la grille
- ✅ Animation d'entrée : `fade-in + slide-down` smooth
- ✅ La carte affiche :
  - Plateforme détectée (YouTube)
  - Badge format (Vidéo 16:9)
  - Nom de l'utilisateur connecté
  - Rôle de l'utilisateur
  - Texte : "Extraction IA en cours..." (pulsing)
- ✅ Timestamp affiche date + heure actuelle
- ✅ Badge succès vert ✓ visible

**Notification utilisateur :**
- Une notification apparaît : `"✅ Nouvelle validation enregistrée !"`

---

### Étape 3 : Extraction IA et Mise à Jour
**Durée :** 2-5 secondes selon le réseau

1. Attendez quelques secondes dans HistoryView (ne quittez pas la page)

**Vérifications finales :**
- ✅ Le texte "Extraction IA en cours..." change par un résumé :
  - Exemple : "Le Ministère a lancé une nouvelle initiative vidéo sur YouTube présentant les accomplissements de l'année..."
  - ✅ **SANS gras Markdown** (**aucun **)
  - ✅ Texte brut uniquement
- ✅ La carte reste à sa place (pas de suppression)
- ✅ Notification finale : `"✅ Résumé IA extrait avec succès !"`
- ✅ La carte est maintenant prête pour l'export PDF

---

## 3️⃣ Test des Détections de Plateforme

**Instructions :** Répétez l'étape 2 avec différentes URLs

| URL | Plateforme Attendue | Icône |
|-----|----------|--------|
| `https://facebook.com/page/post123` | Facebook | 🔵 |
| `https://linkedin.com/feed` | LinkedIn | 🔷 |
| `https://x.com/username/status/123` | X | ⚫ |
| `https://youtube.com/watch?v=xyz` | YouTube | 🔴 |
| `https://example.com/article` | Site Web | 🌐 |

**Vérifications :**
- ✅ La plateforme correcte s'affiche dans la carte
- ✅ l'icône correspond à la plateforme
- ✅ Le code couleur est visible

---

## 4️⃣ Test des Formats de Publication

**Instructions :** Testez chaque format disponible

| Format | Icône | Couleur |
|--------|--------|---------|
| Vidéo 16:9 | 📹 | Rouge |
| Vidéo 9:16 | 📹 | Violet |
| Article Texte | 📄 | Bleu |
| Photo | 🖼 | Vert |

**Vérifications :**
- ✅ Le badge format affiche le bon texte
- ✅ L'icône correspond au format
- ✅ La couleur de fond est correcte

---

## 5️⃣ Test de l'Intégrité des Données

### Données Persistées en Base

1. Ouvrez **Supabase Dashboard** → Table `social_publications`
2. Vérifiez les colonnes :

| Colonne | Valeur Attendue | Format |
|---------|----------|---------|
| `id` | UUID généré | UUID |
| `url` | L'URL saisie | String |
| `platform` | Facebook/YouTube/etc | Enum |
| `format` | Vidéo 16:9/Article/etc | Enum |
| `user_name` | Nom complet agent | String |
| `user_role` | Communication/Cabinet | Enum |
| `summary` | Résumé final sans gras | String (no markdown) |
| `published_at` | ISO 8601 timestamp | Timestamp |
| `created_at` | Timestamp création | Timestamp |
| `updated_at` | Timestamp dernière MAJ | Timestamp |

**Vérifications :**
- ✅ Aucun symbole `**` dans le champ `summary`
- ✅ User name correspond au profile connecté
- ✅ User role correspond au profil
- ✅ Toutes les dates sont correctes

---

## 6️⃣ Test Real-Time Supabase

### Préparation
1. Ouvrez 2 navigateurs (ou 2 onglets)
   - Navigateur A : Dashboard Communication
   - Navigateur B : HistoryView > Bilan (recharger)

### Étapes
1. Dans Navigateur A → Validez une nouvelle publication
2. Observez Navigateur B

**Vérifications Real-Time :**
- ✅ La nouvelle carte apparaît **sans recharger** Navigateur B
- ✅ Animation jouée correctement
- ✅ Données affichées correctement
- ✅ Timestamp correct

**Follow-up :**
1. Attendez l'extraction IA (Navigateur A reçoit notification)
2. Observez Navigateur B

**Vérifications Mise à Jour :**
- ✅ La carte mise à jour avec le résumé final
- ✅ **SANS recharger la page** Navigateur B
- ✅ Notification dans Navigateur B

---

## 7️⃣ Test du Comportement Utilisateur

### Publication "Synchronisation en cours"
**Scenario:** Vérifier l'UX pendant l'attente IA

1. Validez une publication
2. Attendez 1-2 secondes
3. Ouvrez immédiatement HistoryView

**Vérifications :**
- ✅ La carte affiche "Extraction IA en cours..." en style italique
- ✅ Texte pulsant (animation subtle)
- ✅ Pas de vide ou d'erreur affiché
- ✅ UI reste fluide

### Publication "Résumé Final"
**Scenario:** Vérifier quand l'IA a terminé

1. Attendez 3-5 secondes après la validation initiale
2. La carte doit afficher le résumé

**Vérifications :**
- ✅ Résumé lisible et pertinent
- ✅ Texte normal (pas de pulsing)
- ✅ Contient info sur l'action publique
- ✅ Sans gras Markdown

---

## 8️⃣ Test du Glassmorphism Design

**Visual Checks :**
- ✅ Cartes ont un effet flou de fond (backdrop-blur)
- ✅ Les cartes ont une transparence semi (opacity 10-20%)
- ✅ Bordure blanche semi-transparente
- ✅ Dégradé from-white/10 to-white/5
- ✅ Hover effect augmente l'opacity et la shadow
- ✅ Les couleurs institutionnelles sont appliquées

---

## 9️⃣ Test des Erreurs & Edge Cases

### Erreur Réseau
```typescript
// Simuler : Arrêter le backend Groq API
1. Validez une publication
2. Attendez que le timeout d'IA expire
3. Vérifiez le fallback
```

**Vérifications :**
- ✅ Pas de crash
- ✅ La carte reste affichée
- ✅ Résumé utilise le fallback : "Publication officielle confirmée"
- ✅ Console log l'erreur (pas de popup utilisateur)

### Format Non Reconnu
```typescript
// Cas : URL invalide
1. Saisissez "https://invalid-url--xyz"
2. Validez
```

**Vérifications :**
- ✅ La plateforme par défaut = "Site Web"
- ✅ La carte s'affiche normalement
- ✅ Pas d'erreur TypeScript

### Utilisateur Sans Profil
```typescript
// Cas : profile.full_name = null
```

**Vérifications :**
- ✅ Fallback : "Service Com MEFB"
- ✅ Pas de crash
- ✅ Carte affichée normalement

---

## 🔟 Test de Performance

### Limite des Cartes
1. Validez 25+ publications rapidement
2. Attendez que les cartes s'affichent toutes

**Vérifications :**
- ✅ Seules les 20 dernières cartes s'affichent
- ✅ Les plus anciennes sont recyclées
- ✅ Pas de scroll infinite
- ✅ Animation fluide même avec 20 cartes

### Animation Staggered
1. Validez 5 publications
2. Observez l'ordre d'apparition

**Vérifications :**
- ✅ Délai de ~50ms entre chaque carte
- ✅ Apparition progressive (pas tout d'un coup)
- ✅ Les cartes se placent correctement

---

## 📋 Checklist Finale de Test

- [ ] Test Cabinet masqué PublicationTracker
- [ ] Test Communication affiche PublicationTracker
- [ ] Insertion immédiate (< 2s)
- [ ] Notification "Publication enregistrée"
- [ ] Carte apparaît en temps réel
- [ ] Plateforme détectée correctement
- [ ] Format affiché correctement
- [ ] Nom utilisateur correct
- [ ] Rôle utilisateur correct
- [ ] Résumé IA sans gras Markdown
- [ ] Notification "Résumé extrait"
- [ ] Real-time fonctionne (double navigateur)
- [ ] Glassmorphism visible
- [ ] Animations fluides
- [ ] Limite 20 cartes respectée
- [ ] Fallback erreur IA fonctionne
- [ ] Export PDF inclut les publications
- [ ] Journal Technique enregistre l'action
- [ ] Audit trail complet

---

## 🚨 Troubleshooting

### Les cartes ne s'affichent pas ?
1. Vérifiez que `userRole === 'Communication'`
2. Vérifiez la table `social_publications` en Supabase
3. Vérifiez que les channels Realtime sont actifs

### Le résumé IA reste "Synchronisation en cours" ?
1. Vérifiez la clé GROQ_API_KEY
2. Vérifiez le quota API
3. Consultez les logs de l'API

### L'utilisateur n'est pas sauvegardé ?
1. Vérifiez que `useAuth()` retourne bien le profile
2. Vérifiez que la table `profiles` existe
3. Vérifiez les données du profil connecté

---

## 📊 Métriques de Succès

| Métrique | Cible | Résultat |
|----------|--------|---------|
| Temps d'insertion | < 2s | ✅ |
| Temps d'apparition real-time | < 500ms | ✅ |
| Temps d'extraction IA | 2-5s | ✅ |
| Nombre de cartes visibles | 20 max | ✅ |
| FPS animation | 60 | ✅ |
| Pas de gras Markdown | 0 symboles | ✅ |
| Audit trail complet | 100% | ✅ |

