# Guide d'Installation - Suppression d'Utilisateur

## 📚 Table des matières

1. [Prérequis](#prérequis)
2. [Déploiement de la RPC](#déploiement-de-la-rpc)
3. [Vérification](#vérification)
4. [Test](#test)
5. [Troubleshooting](#troubleshooting)

## ✅ Prérequis

- ✅ Accès au **tableau de bord Supabase**
- ✅ Rôle **Super_Admin** dans l'application
- ✅ Les modifications du composant `UserManagement.tsx` doivent être déployées
- ✅ Base de données Supabase fonctionnelle

## 🚀 Déploiement de la RPC

### Méthode 1 : Via Supabase SQL Editor (Recommandé)

#### Étape 1 : Ouvrir SQL Editor

1. Connectez-vous à votre [tableau de bord Supabase](https://app.supabase.com)
2. Sélectionnez votre projet
3. Allez dans **SQL Editor** (icône en bas à gauche)
4. Cliquez sur **New Query**

#### Étape 2 : Copier la fonction RPC

1. Ouvrez le fichier : `supabase-delete-user-rpc.sql`
2. Copiez TOUT le contenu
3. Collez dans l'éditeur SQL

#### Étape 3 : Exécuter la requête

1. Cliquez sur **Execute** (ou Ctrl+Entrée)
2. Attendez le message de confirmation : `CREATE FUNCTION`
3. Si une erreur apparaît, consultez la section [Troubleshooting](#troubleshooting)

### Méthode 2 : Via Migrations Supabase CLI

```bash
# Créer une nouvelle migration
supabase migration new create_delete_user_rpc

# Copier le contenu du fichier supabase-delete-user-rpc.sql
# dans le fichier de migration créé

# Appliquer les migrations
supabase db push
```

## 🔍 Vérification

### Vérifier que la RPC est bien créée

Exécutez cette requête dans SQL Editor :

```sql
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_name = 'delete_user_permanent';
```

Vous devez voir une ligne avec :
- `routine_name`: `delete_user_permanent`
- `routine_type`: `FUNCTION`

### Vérifier les permissions RLS

1. Allez dans **Authentication → Policies**
2. Vérifiez que la table `profiles` a ces politiques :
   - ✅ SELECT pour authenticated (pour voir tous les profils)
   - ✅ Fonction RPC accessible aux Super_Admin

#### Ajouter une politique si nécessaire

```sql
-- Permettre aux Super_Admin de lire tous les profils
CREATE POLICY "super_admin_read_all_profiles"
ON profiles FOR SELECT
USING (auth.uid() IN (
  SELECT id FROM profiles WHERE role = 'Super_Admin'
));

-- La RPC gère les permissions de suppression
-- Pas besoin d'ajouter une politique DELETE supplémentaire
```

## 🧪 Test

### Test 1 : Vérifier que la RPC répond

Dans SQL Editor, exécutez :

```sql
-- Appeler la RPC avec un UUID valide
SELECT delete_user_permanent('00000000-0000-0000-0000-000000000000'::uuid);
```

Résultat attendu :
```json
{
  "success": false,
  "error": "Seul un Super_Admin peut supprimer des utilisateurs"
}
```

(C'est normal si vous n'êtes pas Super_Admin en SQL)

### Test 2 : Tester via l'interface

1. Connectez-vous en tant que **Super_Admin**
2. Allez dans **Paramètres → Utilisateurs**
3. Vérifiez que les boutons 🗑️ apparaissent pour les utilisateurs
4. Cliquez sur un bouton 🗑️
5. Vérifiez que le modal de confirmation s'affiche
6. Cliquez sur **Annuler** pour annuler
7. Cliquez à nouveau sur 🗑️ pour un utilisateur test
8. Cliquez sur **Supprimer définitivement**
9. Vérifiez que le message de succès apparaît
10. Vérifiez que l'utilisateur est supprimé de la liste

### Test 3 : Tester les restrictions

**Test que seul Super_Admin peut supprimer :**

1. Connectez-vous avec un compte normal
2. Allez dans **Paramètres → Utilisateurs**
3. Vérifiez que le bouton 🗑️ n'apparaît PAS

**Test qu'un utilisateur ne peut pas se supprimer lui-même :**

1. Connectez-vous en tant que Super_Admin
2. Vérifiez que le bouton 🗑️ n'apparaît PAS pour votre propre compte

## 📊 Vérification post-déploiement

### Vérifier les données

Avant de supprimer un utilisateur test, notez son ID. Après suppression, exécutez :

```sql
-- Vérifier que le profil est supprimé
SELECT * FROM profiles WHERE id = 'user_id_here';

-- Vérifier que les audit logs sont supprimés
SELECT * FROM audit_logs WHERE user_id = 'user_id_here';
```

Les deux requêtes doivent retourner **0 lignes**.

## 🐛 Troubleshooting

### Erreur : "function delete_user_permanent does not exist"

**Cause** : La RPC n'a pas été créée

**Solution** :
1. Vérifiez que vous avez exécuté le script SQL
2. Vérifiez qu'il n'y a pas d'erreur dans la console SQL

### Erreur : "permission denied for function delete_user_permanent"

**Cause** : Les permissions GRANT n'ont pas été appliquées

**Solution** :
1. Exécutez cette commande dans SQL Editor :

```sql
GRANT EXECUTE ON FUNCTION delete_user_permanent(UUID) TO authenticated;
```

### Le bouton 🗑️ n'apparaît pas pour Super_Admin

**Cause** : 
- Vous n'êtes pas logged en tant que Super_Admin
- Le composant n'a pas été mis à jour
- Il y a une erreur JavaScript

**Solution** :
1. Vérifiez votre rôle : `SELECT role FROM profiles WHERE id = auth.uid();`
2. Vérifiez la console du navigateur (F12 → Console)
3. Redéployez le composant `UserManagement.tsx`

### Erreur lors de la suppression : "Utilisateur non trouvé"

**Cause** : L'utilisateur a été supprimé ailleurs ou l'ID est incorrect

**Solution** :
1. Rechargez la page
2. Vérifiez que l'utilisateur existe encore dans la liste

### La suppression ne fonctionne pas silencieusement

**Cause** : Il y a une erreur JavaScript

**Solution** :
1. Ouvrez la console du navigateur (F12 → Console)
2. Cherchez les erreurs rouges
3. Vérifiez les logs Supabase
4. Vérifiez que la RPC existe bien

## ✔️ Checklist de validation

- [ ] Fonction RPC créée avec succès
- [ ] Permissions GRANT appliquées
- [ ] Les Super_Admin voient le bouton 🗑️
- [ ] Les utilisateurs non-Super_Admin ne voient pas le bouton
- [ ] Le modal de confirmation s'affiche
- [ ] L'utilisateur peut annuler
- [ ] La suppression fonctionne correctement
- [ ] Le message de succès s'affiche
- [ ] L'utilisateur supprimé disparaît de la liste
- [ ] Les données sont bien supprimées de la BD

## 📞 Support

Si vous rencontrez des problèmes :

1. Consultez la console du navigateur (F12)
2. Vérifiez les logs Supabase
3. Exécutez les requêtes SQL de vérification
4. Consultez la section [Troubleshooting](#troubleshooting)
5. Contactez votre administrateur système

## 🔗 Fichiers associés

- `supabase-delete-user-rpc.sql` - Script SQL pour créer la RPC
- `src/components/admin/UserManagement.tsx` - Composant modifié
- `GUIDE_SUPPRESSION_UTILISATEUR.md` - Guide d'utilisation
