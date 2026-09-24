# 🏆 Gestionnaire de Championnats

Application web de gestion de championnats de tennis de table.

## ✨ Fonctionnalités

### 🎾 Mode Championship
- Gestion des joueurs par division
- Génération automatique de matchs (round-robin)
- Système de tours
- Saisie des scores en temps réel
- Système suisse pour les classements

### 🏆 Mode POOL  
- Création de poules de 4 joueurs
- Matchs de poule avec classement
- Phase finale automatique (demi-finales, finale)
- Qualification des 2 premiers de chaque poule

### ⏱️ Mode CHRONO
- Le type d'une journée (Matchs ou Courses) se choisit indépendamment pour chaque journée
- Gestion d'événements de course (course à pied, vélo, natation)
- Chronométrage en temps réel, mode couloirs (touches 1-9) pour la natation
- Gestion des tours, relais, arrivées, DNS/DISQ
- Classements par série + export PDF

### 🏅 Mode Multisport
- Un onglet "Multisport" apparaît automatiquement dès qu'il y a au moins une journée Courses
- Classement combiné entre journées Matchs et journées Courses (barème de points par position)

### 🏢 Clubs
- Affectation d'un club à chaque joueur/participant
- Badges club dans les listes et classements

### 📊 Classements
- Classement par journée
- Classement général sur toutes les journées
- Export PDF
- Impression des feuilles de match

### 💾 Gestion des données
- Sauvegarde automatique dans le navigateur
- Export/Import JSON
- Gestion de jusqu'à 20 journées
- Plusieurs divisions (1-6)

## 🚀 Démarrage rapide

1. Ouvrir `index.html` dans un navigateur moderne
2. Pas besoin de serveur ! L'application fonctionne en local
3. Les données sont sauvegardées automatiquement

## 🖥️ Compatibilité

- Chrome/Edge (recommandé)
- Firefox
- Safari
- Fonctionne sur mobile et tablette

## 📖 Utilisation

### Ajouter des joueurs
1. Sélectionner la division
2. Entrer le nom du joueur
3. Cliquer sur "Ajouter"

### Générer des matchs
1. Cliquer sur "⚔️ Générer les matchs"
2. Choisir le type : Standard ou Suisse
3. Les matchs sont créés automatiquement par tours

### Saisir les scores
1. Cliquer sur les champs de score
2. Entrer les points
3. Le classement se met à jour automatiquement

### Voir les classements
1. Cliquer sur l'onglet "🏆 Classement Général"
2. Ou utiliser les boutons de classement par journée

## 🛠️ Développement

Voir [AGENTS.md](./AGENTS.md) pour la documentation technique complète, et
[DEVLOG.md](./DEVLOG.md) pour le journal des sessions de développement (quoi, quand,
sur quels fichiers — utile pour reprendre le projet après une pause).

### Architecture
Le projet utilise une architecture modulaire avec des fichiers IIFE :
```
src/
├── config.iife.js       # Configuration
├── utils.iife.js        # Utilitaires
├── state.iife.js        # État global
├── clubs.iife.js        # Gestion des clubs
├── multisport.iife.js   # Sélecteur de type par journée, UI Chrono par journée, classement combiné
├── players.iife.js      # Gestion joueurs
├── ui.iife.js           # Onglets/journées
├── matches.iife.js      # Mode Championship
├── pools.iife.js        # Mode POOL
├── ranking.iife.js      # Classements
├── export-json.iife.js  # Export/Import JSON
├── export-print.iife.js # Impression/PDF
├── chrono.iife.js       # Moteur de chronométrage live
└── init.iife.js         # Bootstrap
```
Voir `AGENTS.md` pour le détail de chaque module et `claude.md` pour
l'architecture de données.

## 📄 Licence

Projet privé - Planté avec ❤️ par Romain, testé avec style par Rachel.

## 🐛 Signaler un bug

En cas de problème :
1. Ouvrir la console développeur (F12)
2. Copier les messages d'erreur
3. Décrire les étapes pour reproduire
