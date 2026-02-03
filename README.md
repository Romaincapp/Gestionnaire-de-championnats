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
- Gestion d'événements de course
- Chronométrage en temps réel
- Gestion des tours et des arrivées
- Classements par série

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

Voir [AGENTS.md](./AGENTS.md) pour la documentation technique complète.

### Architecture
Le projet utilise une architecture modulaire avec des fichiers IIFE :
```
src/
├── config.iife.js      # Configuration
├── utils.iife.js       # Utilitaires  
├── state.iife.js       # État global
├── players.iife.js     # Gestion joueurs
├── matches.iife.js     # Mode Championship
├── pools.iife.js       # Mode POOL
├── chrono.iife.js      # Mode CHRONO
├── ranking.iife.js     # Classements
└── export.iife.js      # Export/Print
```

## 📄 Licence

Projet privé - Planté avec ❤️ par Romain, testé avec style par Rachel.

## 🐛 Signaler un bug

En cas de problème :
1. Ouvrir la console développeur (F12)
2. Copier les messages d'erreur
3. Décrire les étapes pour reproduire
