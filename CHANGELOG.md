# 📝 Changelog

Toutes les modifications notables de ce projet seront documentées ici.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/).

> ⚠️ Ce fichier est resté figé à la version 2.0.0 (2024-02-02) pendant environ deux ans et
> demi alors que le développement continuait activement. Les sections ci-dessous entre
> 2.1.0 et 2.5.0 ont été reconstituées en 2026-09 à partir de l'historique git pour combler
> le trou — voir `DEVLOG.md` pour le détail de cette remise à niveau et le protocole qui
> évite que ça se reproduise (mettre à jour ce fichier à chaque session qui change un
> comportement visible pour l'utilisateur).

## [Unreleased]

### 🛡️ Fiabilité
- **Échec de sauvegarde signalé** : si le navigateur ne peut plus enregistrer (stockage
  plein, navigation privée), un bandeau rouge persistant l'annonce avec un bouton
  « 💾 Exporter maintenant ». Il disparaît dès que la sauvegarde refonctionne. Avant, l'échec
  n'était visible que dans la console : on croyait ses données enregistrées.
- **Tests automatiques sur GitHub** : la suite de tests (`npm test`) tourne sur chaque PR et
  chaque push vers `main` (`.github/workflows/tests.yml`).

### 🎉 Ajouts
- **Mode couloirs** : les arrivées (clic sur un couloir ou touches 1-9 / 0) apparaissent
  dans l'historique 🕘 et peuvent être annulées, comme en mode normal. Le couloir redevient
  rouge et cliquable, et le nageur repart en course.
- Annuler l'arrivée qui avait arrêté le chrono général (dernier arrivé, ex. mauvais clic)
  **relance le chrono sans perdre le temps écoulé** entre-temps, dans les deux modes.

### 🐛 Corrections
- Mode couloirs : le bouton FIN du tableau met aussi à jour le gros bouton du couloir.
- **Mode couloirs** : au lancement d'une course (▶️ Course), les nageurs pouvaient ne plus
  être dans les couloirs attribués — si la série avait déjà été ouverte une fois puis
  modifiée (modale 🏊, 👥, nouvelle génération « Séries natation »), ou si la journée
  Courses avait été vidée (🗑️ Vider) puis remplie à nouveau, la course reprenait l'ancienne
  composition en cache, avec parfois des nageurs « fantômes » et d'anciens temps. La série
  de la journée fait désormais foi pour qui court et dans quel couloir.
- Le bouton 🗑️ Vider d'une journée Courses purge aussi le cache de course live (comme
  « Vider la journée » depuis la 2.5.0).
- **Arrêt automatique du chrono général** : un participant DNS ou DISQ n'empêche plus
  l'arrêt du chrono à l'arrivée du dernier participant encore en course (mode couloirs et
  mode normal). Marquer DNS/DISQ le dernier participant en course arrête aussi le chrono.

## [2.5.0] - 2026-09-15 → 2026-09-24 (fiabilisation Chrono, tests automatisés)

### 🎉 Ajouts
- Historique des actions de course (LAP/FINISH) annulable, avec bip sonore
- Catégories multiples au sein d'une même course Chrono (Solo/Équipe…), colonne Catégorie
  dans la fenêtre « Afficher »
- Tests automatisés Jest (`npm test`) et contrôle des fonctions redéfinies
  (`npm run check:duplicates`)

### 🐛 Corrections
- Import natation, mode couloirs et ajout de joueurs
- Cache de course live (raceData) non purgé par « Vider la journée »
- Bouton « Retour aux séries » cassé pendant une course Chrono
- Barre Divisions/Terrains qui ne réapparaissait pas (J1, double bascule) ; barre globale
  et sous-titre des terrains masqués sur une journée Chrono
- Classement interclub en live

### 🔧 Changements techniques
- Suppression de l'ancien système global événements/séries et du module mort
  `export.iife.js` (15 modules dans `src/`)
- Documentation `claude.md`/`AGENTS.md` réalignée sur le code

## [2.4.0] - 2026-09 (statuts course & saisie en masse)

### 🎉 Ajouts
- Statut **DISQ** (disqualifié) pour un participant en mode course
- Bouton "Afficher" : second écran de suivi de course/classement multisport mis à jour en
  temps réel
- Ajout en masse de participants cochés à une série (mode Courses), avec support du format
  `dossard + tabulation`
- Choix du score lors de la création d'un match BYE
- Suppression d'une épreuve directement en mode course (journée multisport)

### 🐛 Corrections
- Édition inline (tours/distance/temps) qui pouvait terminer ou bloquer une course en cours
- Collisions de noms entre les modules multisport et chrono (boutons "Ajouter" / ✏️ épreuve)
- Fermeture intempestive des modales d'ajout de série au clic extérieur

## [2.3.0] - 2026-08 (mode couloirs & imports natation)

### 🎉 Ajouts
- **Mode couloirs** pour la natation : assignation manuelle par série, saisie/arrêt par
  touche 1-9, sélection directe dans les "Participants disponibles" de la journée
- Édition du club/nom/dossard des nageurs depuis la modale couloirs et depuis
  "Gérer les participants"
- Import "Séries natation" façon Excel (choix du séparateur, mapping de colonnes),
  rendu tolérant aux données manquantes
- Barème de position (25/19/17…) pour le classement Multisport, avec exports alignés
  dessus

### 🔧 Changements techniques
- Le chrono général s'arrête désormais automatiquement quand le dernier couloir est stoppé
- `refactor(multisport)` : suppression d'un double appel à `getChronoResultsForDay`
- Uniformisation des libellés Matchs/Courses, exposition de `handleFileImport` sur `window`

## [2.2.0] - 2026-06 → 2026-07 (fiabilisation Pool & élimination directe)

### 🐛 Corrections
- Attribution des scores de pools à la mauvaise division
- Navigation clavier qui sautait un match d'une autre division (IDs non uniques)
- Tour de barrage au lieu d'un tour saturé de BYE en phase à élimination directe
- Croisement correct des classements importés (+ vocabulaire) en phase finale
- Affichage dynamique du nombre de tours (au lieu d'une borne en dur à 4)
- Réassignation des terrains hors plage de division à l'affichage

### 🎉 Ajouts
- Détection de noms de joueurs similaires (score de similitude, transpositions, espaces
  parasites) pour repérer les doublons avant classement
- Export PDF du classement général, avec mise en page compacte (évite les pages blanches)
- Import de classements de pools avec auto-configuration à partir du JSON importé

## [2.1.0] - 2026-06 (Clubs & édition Chrono)

### 🎉 Ajouts majeurs
- **Module Clubs** (`clubs.iife.js`) : club associé à chaque participant, dans tous les
  modes — voir `CLUBS.md`
- **Module Multisport** (`multisport.iife.js`) : journées mixtes Championship/Chrono avec
  classement combiné — voir `MULTISPORT.md`
- Édition inline (nom, dossard, club) des participants en mode Chrono, depuis la liste par
  journée et depuis "Gérer les participants"
- Classement Chrono par distance et temps (sans système de points), avec temps affiché en
  heures lisibles et détail cliquable par participant

### 🐛 Corrections
- Onglet course vide dû à un doublon d'id (`#raceInterface`)
- Propagation du club aux participants des séries et du tableau de course
- Classement combiné affiché même quand toutes les journées sont en mode Chrono
- `ReferenceError 'sorted'` qui cassait la fiche participant

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

La migration de `script.js` vers les modules et le nettoyage du code legacy annoncés ici
pour la 2.1.0 sont **terminés** (voir `AGENTS.md`). Pour la liste vivante des tâches et idées
restantes (tests, TypeScript, bundler, PWA...), voir **`TODO.md`** — ne pas dupliquer cette
liste ici pour éviter que les deux fichiers divergent à nouveau.
