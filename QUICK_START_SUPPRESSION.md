# ⚡ Quick Start - Suppression d'Utilisateur

## 🎯 En 30 secondes

Une nouvelle **fonctionnalité de suppression d'utilisateur** a été ajoutée pour les **Super_Admin**.

- ✅ **Où ?** Paramètres → Utilisateurs
- ✅ **Quoi ?** Bouton 🗑️ rouge pour chaque utilisateur
- ✅ **Qui ?** Super_Admin uniquement
- ✅ **Quand ?** À partir de maintenant

## 🚀 Déploiement (1 heure)

### ✅ Étape 1 : Créer la RPC

1. Allez sur Supabase Dashboard
2. **SQL Editor** → **New Query**
3. Copiez le fichier `supabase-delete-user-rpc.sql`
4. Exécutez (Ctrl+Enter)
5. ✅ Vous devez voir : `CREATE FUNCTION`

### ✅ Étape 2 : Redéployer l'app

```bash
npm run deploy
```

(Ou votre commande de déploiement personnalisée)

### ✅ Étape 3 : Tester

1. Connectez-vous en Super_Admin
2. Allez dans **Paramètres → Utilisateurs**
3. Cherchez le bouton 🗑️
4. Testez avec un utilisateur test

## 📖 Documentation rapide

| Besoin | Fichier |
|--------|---------|
| **Comment l'utiliser ?** | [GUIDE_SUPPRESSION_UTILISATEUR.md](./GUIDE_SUPPRESSION_UTILISATEUR.md) |
| **Comment l'installer ?** | [INSTALLATION_SUPPRESSION_UTILISATEUR.md](./INSTALLATION_SUPPRESSION_UTILISATEUR.md) |
| **Comment ça marche ?** | [RESUME_TECHNIQUE_SUPPRESSION_UTILISATEUR.md](./RESUME_TECHNIQUE_SUPPRESSION_UTILISATEUR.md) |
| **Code détaillé** | [REFERENCE_CODE_SUPPRESSION_UTILISATEUR.md](./REFERENCE_CODE_SUPPRESSION_UTILISATEUR.md) |
| **Vue d'ensemble** | [SYNTHESE_SUPPRESSION_UTILISATEUR.md](./SYNTHESE_SUPPRESSION_UTILISATEUR.md) |

## ⚠️ Important

- 🔒 **Seul Super_Admin peut supprimer**
- 🚫 **Impossible de se supprimer soi-même**
- 💥 **Irréversible** - Pas d'annulation après suppression
- ✅ **Confirmation obligatoire** - Modal d'avertissement

## 🆘 Problème ?

### "Je ne vois pas le bouton 🗑️"
→ Vérifiez que vous êtes Super_Admin

### "Erreur lors de la suppression"
→ Consultez [INSTALLATION_SUPPRESSION_UTILISATEUR.md](./INSTALLATION_SUPPRESSION_UTILISATEUR.md#-troubleshooting)

### "Je veux plus de détails"
→ Lisez [GUIDE_SUPPRESSION_UTILISATEUR.md](./GUIDE_SUPPRESSION_UTILISATEUR.md)

## 📋 Checklist rapide

- [ ] RPC créée
- [ ] App redéployée
- [ ] Bouton 🗑️ visible
- [ ] Suppression fonctionne
- [ ] Données bien supprimées
- [ ] ✅ Prêt !

---

**C'est prêt à l'emploi !** 🎉

Pour plus de détails, consultez les fichiers de documentation.
