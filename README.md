# 🏆 Gestionnaire de Championnats

Application web de gestion de championnats sportifs (tennis de table à l'origine, désormais
multisport : course à pied, cyclisme, natation...).

> 📌 En développement actif — voir [DEVLOG.md](./DEVLOG.md) pour l'historique des sessions
> et l'état le plus récent du code.

## ✨ Fonctionnalités

### 🎾 Mode Championship
- Gestion des joueurs par division
- Génération automatique de matchs (round-robin, système suisse)
- Système de tours
- Saisie des scores en temps réel (navigation clavier Tab/Entrée)

### 🏆 Mode POOL  
- Création de poules de 4 joueurs
- Matchs de poule avec classement
- Phase finale automatique (demi-finales, finale, tour de barrage si besoin)
- Qualification des 2 premiers de chaque poule
- Import de classements de pools avec auto-configuration

### ⏱️ Mode CHRONO
- Gestion d'événements de course (course à pied, cyclisme, natation)
- Chronométrage en temps réel, courses individuelles ou relais (détection auto lap/arrivée)
- **Mode couloirs** (natation) : assignation par série, saisie/arrêt par touche 1-9
- Statuts de participant : Prêt / En course / Terminé / DNS / **DISQ**
- Édition inline (tours, distance, temps) même pendant une course en cours
- Import "Séries natation" façon Excel (séparateur, mapping de colonnes)
- Ajout en masse de participants (y compris format `dossard` + tabulation)
- Bouton "Afficher" : second écran de suivi en temps réel
- Classements par série

### 🌐 Mode Multisport
- Apparaît automatiquement dès qu'une compétition mélange journées Championship et Chrono
- Classement combiné basé sur un barème de position (25/19/17…)
- Détail complet dans [MULTISPORT.md](./MULTISPORT.md)

### 🏢 Clubs
- Club associable à chaque participant, dans tous les modes
- Détail complet dans [CLUBS.md](./CLUBS.md)

### 📊 Classements
- Classement par journée
- Classement général sur toutes les journées (adapté Championship / Chrono / Multisport)
- Détection des noms de joueurs similaires (doublons probables)
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
Le projet utilise une architecture modulaire avec 16 fichiers IIFE dans `src/` (config,
utils, notifications, state, clubs, players, ui, init, matches, pools, chrono, multisport,
ranking, export, export-json, export-print). Le détail complet — rôle et fonctions exposées
de chaque module — est dans [AGENTS.md](./AGENTS.md), pour éviter d'avoir deux listes qui
divergent.

`script.js` n'est plus qu'un résidu legacy (~37 lignes) : la migration vers `src/` est
terminée, ne pas y ajouter de code.

## 📄 Licence

Projet privé - Planté avec ❤️ par Romain, testé avec style par Rachel.

## 🐛 Signaler un bug

En cas de problème :
1. Ouvrir la console développeur (F12)
2. Copier les messages d'erreur
3. Décrire les étapes pour reproduire
