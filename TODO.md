# ✅ Suivi des tâches

Le suivi détaillé des tâches se fait désormais via les
[GitHub Issues](https://github.com/Romaincapp/Gestionnaire-de-championnats/issues)
du repo (labels, statut, assignation) plutôt que dans ce fichier, qui dérivait
trop facilement (dernière version markdown à jour au 2024-02-02).

## Backlog actuel (issues #49-#63)

- [#49](https://github.com/Romaincapp/Gestionnaire-de-championnats/issues/49) Finaliser le refactoring : dark mode + doc AGENTS.md
- [#50](https://github.com/Romaincapp/Gestionnaire-de-championnats/issues/50) Vérifier export/import et sauvegarde automatique
- [#51](https://github.com/Romaincapp/Gestionnaire-de-championnats/issues/51) Améliorations UI/UX
- [#52](https://github.com/Romaincapp/Gestionnaire-de-championnats/issues/52) Fonctionnalités générales : backup auto, undo, stats avancées
- [#53](https://github.com/Romaincapp/Gestionnaire-de-championnats/issues/53) Documentation technique : JSDoc, schémas de données, cas limites
- [#54](https://github.com/Romaincapp/Gestionnaire-de-championnats/issues/54) Mode Multisport : tests restants
- [#55](https://github.com/Romaincapp/Gestionnaire-de-championnats/issues/55) Qualité de code : ESLint, tests unitaires et d'intégration
- [#56](https://github.com/Romaincapp/Gestionnaire-de-championnats/issues/56) Performance : optimiser boucles, cache, lazy loading
- [#57](https://github.com/Romaincapp/Gestionnaire-de-championnats/issues/57) Modernisation : ES6+, bundler, TypeScript, PWA
- [#58](https://github.com/Romaincapp/Gestionnaire-de-championnats/issues/58) Vérifier bugs connus (données/sync/noms spéciaux)
- [#59](https://github.com/Romaincapp/Gestionnaire-de-championnats/issues/59) Idées features : Championship (pénalités, 5 sets, abandons)
- [#60](https://github.com/Romaincapp/Gestionnaire-de-championnats/issues/60) Idées features : POOL (taille poules, qualifiés, classement détaillé)
- [#61](https://github.com/Romaincapp/Gestionnaire-de-championnats/issues/61) Idées features : CHRONO (relais, catégories d'âge, classement club)
- [#62](https://github.com/Romaincapp/Gestionnaire-de-championnats/issues/62) Idées features : Général (login multi-utilisateur, cloud, app mobile)
- [#63](https://github.com/Romaincapp/Gestionnaire-de-championnats/issues/63) Tests systématiques : fonctionnels, navigateurs, gros volumes

## Déjà fait (historique)

### Refactoring modulaire (v2.0.0)
- [x] Passage de `script.js` monolithique à 16 modules `src/*.iife.js`
- [x] Migration complète des fonctions legacy (script.js ne fait plus que 37 lignes, dark mode)
- [x] Audit onclick HTML ↔ fonctions `window.xxx` : aucune fonction manquante

### Gestion des Clubs
- [x] Module `clubs.iife.js`, structure `{name, club}`, sélecteur, badges, classements, import en masse, doc `CLUBS.md`

### Mode Multisport
- [x] Module `multisport.iife.js`, sélecteur de type de journée, classement combiné, détection automatique, doc `MULTISPORT.md`
- [x] Interface de course live, mode couloirs (natation), saisie rapide par dossard, statuts, édition manuelle, relance

---

*Dernière mise à jour : 2026-09-15*
