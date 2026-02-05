# 📝 Changelog

Toutes les modifications notables de ce projet seront documentées ici.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/).

## [2.0.0] - 2024-02-02

### 🎉 Ajouts majeurs
- **Refactoring complet** : Passage d'un fichier monolithique (922KB) à une architecture modulaire
- **12 modules IIFE** créés dans `src/` pour une meilleure maintenabilité
- **Documentation technique** complète dans `AGENTS.md`

### 📁 Structure modulaire
- `config.iife.js` - Configuration globale
- `utils.iife.js` - Fonctions utilitaires
- `notifications.iife.js` - Système de notifications
- `state.iife.js` - État global et persistance
- `players.iife.js` - Gestion des joueurs
- `ui.iife.js` - Interface utilisateur générale
- `matches.iife.js` - Mode Championship (matchs par tours)
- `pools.iife.js` - Mode POOL (poules + phase finale)
- `chrono.iife.js` - Mode CHRONO (courses avec chronométrage)
- `ranking.iife.js` - Classements et statistiques
- `export.iife.js` - Export PDF et données

### 🔧 Changements techniques
- Séparation des 3 modes UI : Championship, POOL, CHRONO
- Exposition des fonctions sur `window` pour compatibilité HTML
- Conservation du fichier `script.js` legacy pour la transition
- Création de backups (`script.js.backup`, `script-legacy.js`)

### 📝 Documentation
- Création de `AGENTS.md` - Documentation développeur complète
- Création de `README.md` - Documentation utilisateur
- Création de `CONTRIBUTING.md` - Guide de contribution
- Création de `CHANGELOG.md` - Ce fichier

---

## [1.x.x] - Avant 2024-02-02

### Fonctionnalités historiques
- Gestion des joueurs par division
- Génération de matchs (round-robin, système suisse)
- Mode poules avec phase finale
- Mode chrono pour courses
- Classements jour et général
- Export/Import JSON
- Impression des feuilles de match
- Gestion de 20 journées
- 1 à 6 divisions

---

## 🚀 Prochaines versions

### [2.1.0] - Planned
- [ ] Migration complète de `script.js` vers les modules
- [ ] Nettoyage du code legacy
- [ ] Tests unitaires de base

### [2.2.0] - Planned  
- [ ] Optimisation des performances
- [ ] Amélioration de l'accessibilité
- [ ] Corrections de bugs divers

### [3.0.0] - Planned
- [ ] Migration vers ES6+ avec bundler (Vite/Webpack)
- [ ] Utilisation de TypeScript
- [ ] Tests complets avec Jest
- [ ] PWA (Progressive Web App)
