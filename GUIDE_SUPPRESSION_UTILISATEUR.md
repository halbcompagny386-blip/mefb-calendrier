# Guide de Suppression d'Utilisateur - Super Admin

## 📋 Vue d'ensemble

Cette nouvelle fonctionnalité permet aux **Super Admin** de supprimer définitivement n'importe quel utilisateur du système directement depuis l'interface de gestion des paramètres.

## 🔐 Sécurité

### Restrictions

- ✅ **Seul les Super_Admin** peuvent supprimer des utilisateurs
- ✅ **Un utilisateur ne peut pas se supprimer lui-même**
- ✅ La suppression est **irréversible**
- ✅ Un **modal de confirmation** s'affiche avant toute suppression
- ✅ Les données associées (audit logs) sont automatiquement supprimées

## 🚀 Installation/Déploiement

### Étape 1 : Déployer la fonction RPC

1. Ouvrez votre **tableau de bord Supabase**
2. Allez dans **SQL Editor**
3. Créez une **nouvelle requête**
4. Copiez le contenu du fichier `supabase-delete-user-rpc.sql`
5. Exécutez la requête

Vous devriez voir le message : `CREATE FUNCTION`

### Étape 2 : Vérifier les permissions RLS

Assurez-vous que les politiques RLS autorisent les Super_Admin à :
- Lire tous les profils utilisateurs
- Supprimer les profils (via la RPC)

## 👤 Utilisation

### Accès à la fonctionnalité

1. Connectez-vous en tant que **Super_Admin**
2. Allez dans **Paramètres → Utilisateurs**
3. La page affiche la liste de tous les utilisateurs

### Supprimer un utilisateur

1. Localisez l'utilisateur à supprimer dans la liste
2. Cliquez sur le bouton 🗑️ **Trash** (rouge) à côté de son rôle
3. Un modal de confirmation s'affiche avec :
   - Le nom de l'utilisateur
   - Un avertissement mentionnant l'irréversibilité
   - Deux boutons : "Annuler" et "Supprimer définitivement"
4. Cliquez sur **"Supprimer définitivement"** pour confirmer
5. Une barre de chargement apparaît pendant la suppression
6. Un message de succès confirme la suppression

## 📊 Que se passe-t-il lors de la suppression ?

### Données supprimées

✅ **Profil utilisateur** (table `profiles`)
- ID
- Nom complet
- Email
- Rôle
- Toutes les métadonnées

✅ **Audit logs** (table `audit_logs`)
- Tous les logs liés à cet utilisateur

✅ **Compte Auth** (géré par Supabase Auth)
- Le compte auth Supabase associé

### Données conservées

Selon votre configuration, certaines données peuvent être conservées :
- Les documents créés par l'utilisateur (si pas de contrainte FK)
- Les commentaires de l'utilisateur (si pas de suppression en cascade)

## 🎨 Interface utilisateur

### Avant suppression

```
┌─────────────────────────────────────────────┐
│  Utilisateur: DAOUDA BAH                    │
│  Email: daouda@mefb.gov.gu                  │
│  [Sélect: Service Communication] [🗑️]       │
└─────────────────────────────────────────────┘
```

### Modal de confirmation

```
┌──────────────────────────────────────────────┐
│                   ⚠️                         │
│  Supprimer l'utilisateur ?                  │
│  Êtes-vous sûr de vouloir supprimer         │
│  DAOUDA BAH définitivement ?                │
│                                             │
│  ⚠️ Cette action est irréversible.          │
│  Tous les données associées seront          │
│  supprimées du système.                     │
│                                             │
│  [Annuler]  [Supprimer définitivement]      │
└──────────────────────────────────────────────┘
```

## 📝 Logs et traçabilité

### Avant suppression

L'utilisateur apparaît dans `audit_logs` avec ses actions

### Après suppression

- Les audit logs de l'utilisateur sont supprimés
- Un log système note la suppression (optionnel - à ajouter)
- L'utilisateur est supprimé de `profiles`

## 🔧 Dépannage

### Le bouton 🗑️ n'apparaît pas

**Cause** : Vous n'êtes pas connecté en tant que Super_Admin

**Solution** : Connectez-vous avec un compte Super_Admin

### "Erreur: Seul un Super_Admin peut supprimer"

**Cause** : Votre rôle ne sont pas Super_Admin ou la RPC n'est pas déployée

**Solution** : 
1. Vérifiez votre rôle dans la table `profiles`
2. Vérifiez que la fonction RPC est bien créée

### "Utilisateur non trouvé"

**Cause** : L'utilisateur a déjà été supprimé

**Solution** : Rechargez la page

### La suppression ne fonctionne pas

**Cause** : Problème de permissions RLS ou de la RPC

**Solution** :
1. Vérifiez la console (F12) pour les erreurs
2. Vérifiez que la RPC est bien créée dans Supabase
3. Vérifiez les permissions RLS sur la table `profiles`

## 📋 Checklist de déploiement

- [ ] Fonction RPC `delete_user_permanent` créée
- [ ] Permissions RLS vérifiées
- [ ] Les Super_Admin peuvent voir le bouton 🗑️
- [ ] Modal de confirmation s'affiche
- [ ] Suppression fonctionne correctement
- [ ] Message de confirmation s'affiche
- [ ] Liste des utilisateurs se met à jour
- [ ] Utilisateur supprimé ne réapparaît plus

## 🔒 Bonnes pratiques

1. **Avant de supprimer un utilisateur** :
   - Vérifiez qu'il n'a pas de tâches en cours
   - Assignez ses responsabilités à quelqu'un d'autre
   - Informez les parties prenantes

2. **Après suppression** :
   - Vérifiez que l'utilisateur ne peut plus se connecter
   - Confirmez que les données sont correctement supprimées
   - Documentez la suppression

## 📞 Support

Pour toute question ou problème, veuillez :
1. Consulter la console des erreurs (F12)
2. Vérifier les logs Supabase
3. Contacter l'administrateur système
