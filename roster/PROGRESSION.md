# 📋 Progression du projet Guild Roster

## ✅ Ce qui a été fait (03/01/2026)

### 1. Fonctionnalités de base
- ✅ Site de roster pour guilde WoW "Les Sages de Pandarie"
- ✅ Formulaire d'inscription (classe, spé, rôle)
- ✅ Auto-détection du rôle selon la spé
- ✅ Couleurs de classes WoW officielles
- ✅ Design dark fantasy / WoW themed

### 2. Améliorations ajoutées
- ✅ Système de flex (rôle secondaire)
- ✅ Système de notes (ilvl, expérience)
- ✅ Validation anti-doublon (pseudo)
- ✅ Export CSV et Discord
- ✅ Responsive design optimisé mobile

### 3. Firebase intégré
- ✅ Firestore pour base de données temps réel
- ✅ Firebase Authentication (Google OAuth)
- ✅ Synchronisation en temps réel entre tous les utilisateurs
- ✅ Mode admin sécurisé (collection `admins`)

### 4. Configuration Firebase
- **Projet** : `guild-roster-67da7`
- **Collections** :
  - `roster` : données des joueurs inscrits
  - `admins` : emails des admins autorisés
- **Admin principal** : `shani.khazmodan@gmail.com`

### 5. Règles de sécurité Firestore
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /roster/{document} {
      allow read: if true;
      allow create: if true;
      allow update, delete: if request.auth != null &&
        exists(/databases/$(database)/documents/admins/$(request.auth.token.email));
    }

    match /admins/{email} {
      allow read: if request.auth != null;
      allow write: if false;
    }
  }
}
```

### 6. Déploiement
- ✅ GitHub : https://github.com/shani-gaming/guild-roster
- ✅ GitHub Pages : https://shani-gaming.github.io/guild-roster/
- ✅ SSH configuré pour les push

---

## 🚀 Prochaine étape : Intégration Battle.net

### Objectif
Permettre aux joueurs d'importer automatiquement leur personnage WoW via Battle.net OAuth.

### Fonctionnalités prévues
1. Bouton "Importer depuis Battle.net" dans le formulaire
2. Connexion OAuth avec Battle.net
3. Récupération automatique :
   - Nom du personnage
   - Classe
   - Spécialisation
   - Item level (ilvl)
   - Serveur
4. Pré-remplissage du formulaire

### Pré-requis techniques
- Firebase Functions (pour le backend OAuth)
- Application Blizzard Developer Portal
- API Blizzard WoW Profile

### Étapes à suivre
1. Créer une application sur https://develop.battle.net/
2. Configurer Firebase Functions
3. Implémenter l'OAuth flow
4. Connecter l'API WoW Profile
5. Modifier le formulaire d'inscription

---

## 📝 Notes importantes

### Pour ajouter un admin
1. Aller dans Firestore → Collection `admins`
2. Créer un document avec l'ID = email exact
3. Pas besoin de champs, juste l'ID suffit

### Pour débugger
- Console navigateur (F12) affiche les logs d'authentification
- Firestore Console pour voir les données en temps réel

### Stack technique
- Frontend : HTML/CSS/JS vanilla (single file)
- Backend : Firebase (Firestore + Auth)
- Hosting : GitHub Pages
- Fonts : Cinzel + Crimson Text

---

## 🔗 Liens utiles

- Firebase Console : https://console.firebase.google.com/project/guild-roster-67da7
- GitHub Repo : https://github.com/shani-gaming/guild-roster
- Site live : https://shani-gaming.github.io/guild-roster/
- Blizzard Dev Portal : https://develop.battle.net/

---

**Dernière mise à jour** : 03/01/2026 - Système d'admin fonctionnel ✅
