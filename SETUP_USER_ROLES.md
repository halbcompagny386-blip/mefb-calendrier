# Configuration Supabase - Mise à jour des rôles utilisateur

## 🔧 Étapes d'implémentation

### Étape 1: DÉBLOQUER les profils (si bloqué)
Si vous êtes bloqué avec "Observateur" partout après la première exécution:

1. Allez sur [https://app.supabase.com](https://app.supabase.com)
2. Sélectionnez votre projet
3. Allez dans **SQL Editor** > **New Query**
4. **Exécutez ce correctif immédiatement:**

```sql
-- Désactiver temporairement les RLS pour accéder à la base
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Vérifier les données
SELECT id, full_name, role, email FROM profiles LIMIT 10;
```

5. Cliquez sur **Run**

### Étape 2: Réexécuter le script complet
1. Copiez-collez le **contenu complet** du fichier `supabase-rpc-setup.sql`
2. Cliquez sur **Run**

Ce script:
- ✅ Nettoie les anciennes policies problématiques
- ✅ Désactive puis réactive les RLS correctement
- ✅ Crée la fonction RPC sécurisée
- ✅ Autorise tout le monde à lire les profils
- ✅ Limite les mises à jour à la fonction RPC avec vérification Admin

### Étape 3: Vérifier l'accès
Testez dans la console Supabase:

```javascript
// Devrait retourner tous les profils
const { data, error } = await supabase
  .from('profiles')
  .select('*');
console.log(data); // Liste complète

// Tester la RPC
const { data: result, error: rpcError } = await supabase.rpc('update_user_role', {
  target_user_id: 'uuid-de-lutilisateur',
  new_role: 'Admin'
});
console.log(result);
```

## 🛡️ Sécurité
- ✅ La fonction RPC vérifie que l'utilisateur appelant est **Admin** ou **Super_Admin**
- ✅ Seules les permissions Admin/Super_Admin peuvent modifier les rôles
- ✅ Les modifications sont enregistrées dans `updated_at`
- ✅ Tous les rôles sont validés avant modification
- ✅ Tout le monde peut **lire** les profils (nécessaire pour le formulaire)
- ✅ La mise à jour passe **obligatoirement par la RPC**

## 📋 Rôles valides
- `Guest` - Observateur
- `Communication` - Service Communication
- `Cabinet` - Cabinet
- `Admin` - Administrateur
- `Super_Admin` - Super Administrateur

## ✅ Vérification des mises à jour
Après une mise à jour:
1. ✅ Notification toast affiche le succès ou l'erreur
2. ✅ La liste se rafraîchit automatiquement
3. ✅ Le profil actif se met à jour en temps réel
4. ✅ Supabase enregistre le timestamp de modification

## 🐛 Dépannage

### Problème: "Rôle Observer partout"
**Solution:** Exécutez d'abord le correctif de déblocage (Étape 1), puis réexécutez le script complet.

### Problème: "Permission denied"
**Solution:** Vérifiez que vous êtes connecté avec un compte Admin. Si vous n'êtes pas Admin, demandez à un Super_Admin de changer votre rôle via la fonction RPC.

### Problème: "Function update_user_role not found"
**Solution:** La fonction RPC n'a pas été créée. Réexécutez le script complet du SQL.
