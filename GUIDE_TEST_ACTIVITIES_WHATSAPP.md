# 📋 GUIDE DE TEST - Persistence d'Activités et WhatsApp Integration

## 🎯 Objectif
Vérifier que:
1. Les activités ajoutées via le bouton "AJOUTER UNE ACTIVITÉ" sont sauvegardées en base de données
2. Les activités persistent après actualisation de page
3. L'intégration WhatsApp fonctionne correctement pour envoyer des convocations

---

## ✅ Test #1: Persistence des Activités (AJOUTER UNE ACTIVITÉ)

### Étapes:
1. Accédez au Dashboard (section "DERNIÈRE ACTIVITÉ DU CABINET")
2. Cliquez sur le bouton bleu "AJOUTER UNE ACTIVITÉ"
3. Remplissez le formulaire avec:
   - **Titre**: "Réunion de Test - [Date du jour]"
   - **Date**: Date d'aujourd'hui ou demain
   - **Lieu**: "Salle de Réunion"
   - **Responsable**: Entrez un nom de l'annuaire (ex: "Chef de Cabinet")
   - **Participants**: Plusieurs noms séparés par des virgules
   - **Description**: "Activité de test pour vérifier la persistence"
   - **Couverture médiatique**: "O" (Oui)

4. Cliquez sur "Ajouter une activité"
5. Attendez la notification "✅ Activité(s) ajoutée(s) avec succès!"

### Vérification:
- ✅ L'activité apparaît immédiatement dans le tableau
- ✅ Ouvrez la console (F12) et vérifiez les logs:
  ```
  📤 Tentative d'insertion de...
  ✅ Activités insérées en DB avec succès
  🔄 Rechargement des données depuis Supabase...
  ```

### Test de Persistence:
1. **Actualisation de page** (F5):
   - ✅ L'activité devrait toujours être visible
   - ❌ Si elle disparaît: Il y a un problème de persistance

2. **Changement d'onglet** (passer à "Calendrier" puis revenir à "Tableau de bord"):
   - ✅ L'activité doit rester affichée
   - ❌ Si elle disparaît: Le problème vient de la synchronisation

3. **Fermeture et réouverture de l'application**:
   - ✅ L'activité doit réapparaître
   - ❌ Si elle disparaît: Problème de persistance en base de données

---

## 📱 Test #2: Intégration WhatsApp

### Prérequis:
- WhatsApp Web doit être accessible
- Les noms des responsables/participants doivent correspondre à ceux de l'annuaire
- Les contacts doivent avoir des numéros de téléphone valides

### Étapes:
1. Dans le Dashboard, localisez votre activité de test
2. Cliquez sur l'**icône verte de convocation WhatsApp** (symbole qui ressemble à une bulle de conversation)

### Vérification de la Console:
Ouvrez la console (F12) et vérifiez les logs:
```
🔍 Noms extraits pour WhatsApp: ["Chef de Cabinet", "Directeur General"]
✅ Contacts chargés depuis Supabase: 25 contacts
📋 Total contacts disponibles (DB + Local): 30
✅ Contact trouvé pour: Chef de Cabinet -> Chef de Cabinet (Nom Complet)
📱 Ouverture WhatsApp pour: Chef de Cabinet - Numéro: +224XXXXXXXXX
```

### Comportement Attendu:
1. **Si contacts trouvés**: 
   - ✅ WhatsApp Web s'ouvre avec le message prérempli
   - ✅ Vous devez sélectionner manuellement le contact/groupe
   - ✅ Message contient l'information de l'activité

2. **Si contacts NON trouvés**:
   - ⚠️ Message d'erreur: "Contacts introuvables: [nom]"
   - 💡 **Vérification**: 
     - Allez dans l'onglet "Contacts" de l'app
     - Cherchez le nom exact du contact
     - Assurez-vous que le téléphone est renseigné

### Dépannage Console:
- **❌ "Contact non trouvé"**: Le nom ne correspond pas exactement à l'annuaire
  - Solution: Utilisez les noms tels qu'ils apparaissent dans l'onglet "Contacts"
  
- **❌ "Aucune personne à convoquer"**: Les champs Responsable et Participants sont vides
  - Solution: Remplissez ces champs avec au moins un nom

- **❌ "Pas de destination (téléphone)"**: Le contact est trouvé mais sans numéro
  - Solution: Mettez à jour l'annuaire avec un numéro de téléphone valide

---

## 📧 Test #3: Intégration Email (Bonus)

### Étapes:
1. Dans l'activité de test, cliquez sur l'**icône bleue d'email** (en bas à droite des activités)
2. Gmail doit s'ouvrir automatiquement avec:
   - Destinataire: Email du contact
   - Objet: "Convocation Officielle: [Titre de l'activité]"
   - Corps: Message généré par IA

### Vérification:
- ✅ Gmail s'ouvre avec tous les champs pré-remplis
- ✅ Le message contient les détails de l'activité
- ✅ Vous pouvez envoyer directement

---

## 🐛 Debug - Vérifier la Base de Données

Si les tests échouent, exécutez le script SQL suivant:

```sql
-- Afficher les 10 activités les plus récentes
SELECT 
  id,
  title,
  date,
  responsible,
  participants,
  created_at,
  workflow,
  status
FROM activities
ORDER BY created_at DESC
LIMIT 10;

-- Vérifier les contacts disponibles
SELECT COUNT(*) as total_contacts 
FROM ministere_contacts;

-- Afficher un contact d'exemple
SELECT * FROM ministere_contacts LIMIT 5;
```

Consultez: `supabase-verify-activities-table.sql` pour une liste complète des diagnostics.

---

## 🚀 Résumé des Changements Code

### Fichiers Modifiés:
1. **src/components/agenda/DashboardView.tsx**
   - Changement: `table: 'editorial_activities'` → `table: 'activities'`
   - Raison: Synchronisation avec le reste de l'application

2. **src/App.tsx** (handleAddAgendaActivities)
   - Ajout: Logging détaillé lors de l'insertion
   - Amélioration: Messages d'erreur plus clairs
   - Vérification: Données retournées de Supabase

3. **src/components/agenda/DashboardView.tsx** (handleSendFlashBriefing)
   - Ajout: Logging détaillé du processus de matching de contacts
   - Amélioration: Messages d'erreur explicites
   - Meilleure gestion des cas limites

### Fichiers Créés:
- `supabase-verify-activities-table.sql`: Script de diagnostic complet

---

## 📞 Support

Si vous rencontrez des problèmes:
1. Ouvrez la console (F12) et vérifiez les logs
2. Vérifiez que les contacts existent dans l'onglet "Contacts"
3. Assurez-vous que les numéros de téléphone sont au format: +224XXXXXXXXX
4. Exécutez le script SQL de diagnostic pour vérifier la base de données
