# 📚 Documentation Technique - Gestionnaire de Championnats

## 🎯 Vue d'ensemble

Application de gestion de championnats de tennis de table. Chaque **journée**
choisit indépendamment un type (`championship` ou `chrono`, voir `claude.md`
pour le détail de cette architecture par-journée) :
- 🎾 **Championship** : Matchs par tours (round-robin, suisse) + 🏆 **POOL** : Poules + phase finale
- ⏱️ **CHRONO** : Courses avec chronométrage
- 🏅 **Multisport** : onglet combiné qui apparaît automatiquement dès qu'il y a au moins une journée Chrono — classement combiné entre journées Matchs et Courses

Ce fichier documente les modules `src/` un par un. **Attention** : les listes
de fonctions ci-dessous sont indicatives, pas exhaustives — certains modules
(`pools.iife.js`, `multisport.iife.js`) exposent 60+ fonctions et le code
évolue plus vite que cette doc. Avant de supposer qu'une fonction existe,
n'existe pas, ou est dans tel fichier, **grep son nom exact dans tout `src/`**
plutôt que de faire confiance à cette liste (voir issues #64/#65 sur GitHub
pour un exemple de dérive doc/code qui a causé de faux diagnostics).

## 📁 Architecture du projet

```
.
├── index.html              # Point d'entrée principal
├── styles.css              # Styles globaux
├── script.js               # Legacy — dark mode uniquement (37 lignes), PAS la logique de l'app
├── AGENTS.md               # Cette documentation
├── claude.md                # Guide d'architecture pour agents IA (structure de données, patterns critiques)
├── src/                    # Toute la logique applicative (16 modules IIFE, ~30k lignes)
│   ├── config.iife.js      # Configuration (divisions, terrains)
│   ├── utils.iife.js       # Fonctions utilitaires
│   ├── notifications.iife.js # Système de notifications
│   ├── state.iife.js       # État global (championship) et localStorage
│   ├── clubs.iife.js       # Gestion des clubs
│   ├── multisport.iife.js  # Sélecteur de type par journée, UI Chrono par journée, classement combiné (le plus gros module fonctionnellement, ~4000 lignes)
│   ├── players.iife.js     # Gestion des joueurs (journées Championship)
│   ├── ui.iife.js          # Onglets/journées, addNewDay/removeDay/clearDayData, pont Chrono↔raceData
│   ├── matches.iife.js     # Mode CHAMPIONSHIP (matchs par tours)
│   ├── pools.iife.js       # Mode POOL (poules + phase finale) — le plus gros fichier, ~7200 lignes
│   ├── ranking.iife.js     # Classements et statistiques Championship
│   ├── export-json.iife.js # Export/Import JSON du championnat
│   ├── export-print.iife.js # Impression / PDF (feuilles de match, récaps)
│   ├── chrono.iife.js      # Moteur de chronométrage live (raceData, timer, tours) — backend du mode CHRONO par journée, voir section 9
│   └── init.iife.js        # Bootstrap de l'application, chargé en dernier
└── json/                   # Données JSON d'exemple (si besoin)
```
Ordre de chargement dans `index.html` : config, utils, notifications, state,
clubs, multisport, players, ui, matches, pools, ranking, export-json,
export-print, chrono, init. Un script chargé plus tard peut écraser un
`window.x =` du même nom défini plus tôt — c'est ce qui rendait
`export.iife.js` (supprimé, issue #64) mort : ses fonctions étaient
écrasées par `export-json.iife.js`/`export-print.iife.js` chargés après.

## 🔧 Modules détaillés

### 1. config.iife.js
**Rôle** : Configuration globale de l'application

**Fonctions exposées** :
- `config` (objet global) - Configuration active
- `DEFAULT_CONFIG` - Configuration par défaut
- `initializeDivisions(n)` - Initialise les divisions
- `updateDivisionConfig()` - Met à jour le nombre de divisions
- `updateCourtConfig()` - Met à jour le nombre de terrains
- `getNumberOfDivisions()` - Retourne le nombre de divisions
- `getNumberOfCourts()` - Retourne le nombre de terrains
- `getCourtsForDivision(div)` - Retourne les terrains d'une division
- `applyConfiguration()` - Applique la configuration

### 2. utils.iife.js
**Rôle** : Fonctions utilitaires pures

**Fonctions exposées** :
- `formatProperName(name)` - Formate un nom (Nom Prénom)
- `hasReverseMatchInDay(matches, p1, p2)` - Vérifie si un match existe déjà
- `generateId()` - Génère un ID unique
- `formatTime(ms)` - Formate un temps en mm:ss.ms
- `calculateWinRate(wins, total)` - Calcule le % de victoires
- `shuffleArray(array)` - Mélange un tableau
- `isNewerVersion(newData, currentData)` - Compare les versions

### 3. notifications.iife.js
**Rôle** : Système de notifications toast

**Fonctions exposées** :
- `showNotification(message, type)` - Affiche une notification
  - `type` : 'info' | 'success' | 'warning' | 'error'
- (seule fonction réellement exposée sur `window` dans ce module actuellement)

### 4. state.iife.js
**Rôle** : Gestion de l'état global et persistance

**Variables exposées** :
- `championship` (objet global) - Données du championnat
- `importedChampionshipData` - Données importées temporairement
- `showForfaitButtons` - État des boutons de forfait

**Fonctions exposées** :
- `saveToLocalStorage()` - Sauvegarde dans le localStorage
- `loadFromLocalStorage()` - Charge depuis le localStorage
- `toggleForfaitButtons()` - Bascule l'affichage des boutons forfait

### 5. players.iife.js
**Rôle** : Gestion des joueurs (journées Championship). ~19 fonctions exposées,
dont notamment :
- `addPlayer()`, `addPlayerToDay(dayNumber)`, `removePlayer(dayNumber, division, index)`, `editPlayer(dayNumber, division, index)`, `playerHasByeMatch(dayNumber, division, playerName)`, `addBulkPlayers()`
- `showAddPlayerModal(dayNumber)`, `closeAddPlayerModal()`, `addPlayerFromModal()`, `showBulkInput()`, `closeBulkModal()`, `showEditPlayerModal()`, `saveEditedPlayer()`, `updatePlayersDisplay()`

**Correction** : `copyPlayersFromPreviousDay()` et `updatePlayerCount()` sont
en réalité dans `ui.iife.js`, pas ici (attribution corrigée le 2026-09,
vérifiée par grep). `closePlayerModal()` est en réalité dans `ranking.iife.js`.

### 6. ui.iife.js
**Rôle** : Onglets/journées, pont Chrono↔raceData. ~23 fonctions exposées,
dont notamment :
- `addNewDay()`, `removeDay(dayNumber)`, `clearDayData(dayNumber)`, `switchTab(dayNumber)`, `switchToGeneralRanking()`, `updateDaySelectors()`, `updateTabsDisplay()`
- `copyPlayersFromPreviousDay(dayNumber)`, `updatePlayerCount(dayNumber)`, `quickCopyFromDay(...)`, `generateQuickCopyButtons(dayNumber)`
- `handleDayTypeChange(dayNumber, type)`, `initializeDayTypeSelectorForDay1()` - intégration avec le sélecteur de type par journée (`multisport.iife.js`)
- `startChronoRaceForDay(dayNumber, serieId)`, `saveRaceResultsToDay()` - pont vers le moteur de course (`chrono.iife.js`), voir `claude.md`
- `updateMultisportRanking()`, `openMultisportRankingInNewWindow()`, `exportMultisportRanking()`, `toggleMultisportHub()`, `switchToMultisportRanking()`

**Correction** : `createDayTab`, `closeModal`, `closeImportModal`,
`showImportModal`, `processImport`, `clearAllData`, `toggleDayHub`,
`toggleGeneralHub`, `showAddPlayerModal`, `closeAddPlayerModal`,
`addPlayerFromModal`, `showBulkInput`, `closeBulkModal` ne sont **pas**
exposées depuis ce fichier (elles ont bougé vers `players.iife.js`,
`pools.iife.js` ou `export-json.iife.js` au fil du temps — vérifié par grep
le 2026-09).

### 7. matches.iife.js (Mode Championship)
**Rôle** : Gestion des matchs par tours

**Fonctions exposées** :
- `updateMatchesDisplay(dayNumber)` - Met à jour l'affichage des matchs
- `showMatchGenerationModal(dayNumber)` - Affiche la modale de génération
- `closeMatchGenerationModal()` - Ferme la modale
- `generateMatchesForDay(dayNumber)` - Génère les matchs (round-robin)
- `generateMatchesSwissSystem(dayNumber)` - Génère les matchs (système suisse)
- `updateMatchScore(dayNumber, division, matchIndex, scoreField, value)` - Met à jour un score
- `handleEnterKey(event, dayNumber, division, matchIndex)` - Gère la touche Entrée
- `toggleTour(dayNumber, division, tour)` - Replie/déplie un tour
- `toggleMatchCollapse(element)` - Replie/déplie un match
- `deleteMatch(dayNumber, division, matchIndex)` - Supprime un match
- `organizeMatchesInTours(matches)` - Organise les matchs en tours

### 8. pools.iife.js (Mode POOL)
**Rôle** : Gestion des poules et phase finale. ~62 fonctions exposées —
de loin le plus gros module (~7200 lignes). **Attention** : 16 d'entre elles
(ex. `generateFinalPhase`, `generatePools`, `updatePoolsDisplay`,
`togglePoolMode`, `handlePoolMatchEnter`...) sont définies **deux fois** dans
ce même fichier — la seconde définition écrase silencieusement la première
en JS. Même piège que `generateInterclubRanking` trouvé dans
`chrono.iife.js` (voir issue #65). Avant de modifier une de ces fonctions,
vérifier avec `grep -n "^function nomDeLaFonction\|^window.nomDeLaFonction ="
src/pools.iife.js` laquelle des deux définitions est réellement active
(la dernière du fichier).

Un sous-ensemble représentatif :
- `updatePoolsDisplay(dayNumber)`, `togglePoolSection(dayNumber)`, `togglePoolMode(dayNumber)`, `generatePools(dayNumber)`, `updatePoolMatchScore(dayNumber, matchId, scoreField, value)`, `handlePoolMatchEnter(event, dayNumber, matchId)`, `generateFinalPhase(dayNumber)`
- `toggleDayHub(dayNumber)`, `toggleGeneralHub()` - ces deux fonctions vivent ici, pas dans `ui.iife.js`
- Phase finale manuelle : `initializeManualFinalPhase`, `generateManualFinalPhase`, `generateNextManualRound`, `resetManualFinalPhase`, `exportManualFinalResults`
- Répartition/pré-remplissage : `preFillFromGeneralRanking`, `applyPreFillStrategy`, `applyPoolRedistribution`, `previewPoolRedistribution`
- Pour la liste complète, `grep "^\s*(global|window)\.[a-zA-Z_]* =" src/pools.iife.js`

### 9. chrono.iife.js (Moteur de course, utilisé par le mode CHRONO par journée)
**Rôle** : Moteur de chronométrage live (timer, tours, saisie rapide) utilisé
comme backend par le mode Chrono par journée du module `multisport.iife.js`.
L'ancien menu global "tout-en-un" (`#chronoModeSection`, ses écrans de gestion
d'épreuves/séries/classements et son export/import dédié) a été retiré en
2026-09 car inatteignable depuis l'UI — voir issue #65. `raceData` sert
toujours de format de pont interne entre le stockage par jour
(`championship.days[n].chronoData`) et ce moteur.

**Variables exposées** :
- `raceData` - Format de pont interne utilisé par le moteur de course live

**Fonctions exposées (toujours utilisées)** :
- `startSerie(serieId)` - Démarre une série
- `continueSerie(serieId)` - Reprend une série
- `toggleRaceTimer()` - Démarre/pause le chrono
- `recordLap(bib)` - Enregistre un tour
- `endSerie()` - Termine une série
- `showRaceRanking()` - Affiche le classement de la course
- `printChronoCompetition(dayNumber)` - Imprime les séries d'une journée
  (appelée depuis `multisport.iife.js`)
- `displayRaceInterface(serie)` - Affiche l'interface de course live (appelée
  via `startChronoRaceForDay()` dans `ui.iife.js`)

### 10. ranking.iife.js
**Rôle** : Classements et statistiques Championship

**Fonctions exposées** :
- `calculatePlayerStats(playerName, dayNumber, division)`, `updateRankings()`, `updateRankingsForDay(dayNumber)`, `showRankings(type)`, `showRankingsForDay(dayNumber)`, `updateGeneralRanking()`, `showGeneralPlayerDetails(playerName)`
- `closePlayerModal()` - vit ici, pas dans `players.iife.js` (voir section 5)
- `showPlayerDetails()`, `exportGeneralRanking()`, `exportGeneralRankingToPDF()`, `showNameCheckModal()`, `applyNameCheckMerge()`, `toggleDayMatches()`, `updateStats()`

### 11. export-json.iife.js et export-print.iife.js
**Rôle** : Export/Import JSON et impression/PDF. `export.iife.js` (l'ancien
fichier documenté ici) a été supprimé (issue #64 sur GitHub, 2026-09) : ses
5 fonctions étaient entièrement écrasées par ces deux modules-ci, chargés
après lui — c'était du code mort.

**export-json.iife.js** (fonctions clés) :
- `exportChampionship()`, `confirmExportChampionship()` - Export JSON (avec choix du nom de fichier)
- `showImportModal()`, `processImport()`, `handleChampionshipImport(event)` - Import JSON (remplace tout le championnat)
- `clearAllData()` - Efface tout (championnat + chrono + localStorage)
- `showMultiDayImportModal()` - Import multi-fichiers (un par journée)

**export-print.iife.js** (fonctions clés) :
- `showPrintOptionsModal(dayNumber)`, `printMatchSheets(dayNumber)`, `printRecapSheets(dayNumber)` - gère mode Pool vs Terrain

## 🎨 Structure des données

**Voir `claude.md` pour la structure de données faisant foi** (section "Core
Data Structures"), tenue à jour en 2026-09 avec vérification directe du code.
Résumé : un seul objet `championship`, chaque journée a un `dayType`
(`'championship'` ou `'chrono'`), et les données Chrono d'une journée vivent
dans `championship.days[n].chronoData` — pas dans un objet `raceData` séparé
(celui-ci n'est qu'un pont interne utilisé pendant qu'une course tourne,
voir section 9 ci-dessus). Dupliquer cette structure ici créait exactement
le genre de divergence doc/code qui a causé de faux diagnostics cette
session (issues #64, #65) — ne pas la reproduire ici, une seule source de
vérité dans `claude.md`.

## 📝 Conventions de code

### Format des modules
Tous les modules utilisent le format **IIFE** (Immediately Invoked Function Expression) :

```javascript
(function(global) {
    'use strict';
    
    // Code du module
    
    // Exposition sur window
    global.nomFonction = nomFonction;
})(window);
```

### Dépendances entre modules
Les modules peuvent dépendre de fonctions exposées précédemment. Ordre de
chargement réel (voir `<script>` dans `index.html`) :
1. config, utils, notifications
2. state, clubs
3. multisport, players, ui
4. matches, pools, ranking
5. export-json, export-print, chrono
6. init (bootstrap, chargé en dernier)

Un module chargé plus tard écrase silencieusement un `window.x =` du même
nom défini par un module plus tôt — vérifier l'ordre réel avant de supposer
qu'une fonction "gagne".

### Nommage
- **Fonctions** : camelCase (`generateMatchesForDay`)
- **Variables globales** : exposées sur `window`
- **Modules** : suffixe `.iife.js`

## 🐛 Debugging

### Vérifier que les modules sont chargés
```javascript
// Dans la console du navigateur
console.log(window.championship); // Doit afficher l'objet
console.log(typeof generateMatchesForDay); // Doit afficher "function"
```

### Localiser une fonction
```javascript
// Rechercher dans quel module est définie une fonction
console.log(generateMatchesForDay.toString().split('\n')[0]);
```

### Nettoyer le localStorage
```javascript
// En cas de problème de données corrompues
localStorage.removeItem('tennisTableChampionship');
localStorage.removeItem('chronoRaceData');
location.reload();
```

## 🚀 Guide d'ajout d'une fonctionnalité

### Étape 1 : Identifier le module
- Gestion des joueurs → `players.iife.js`
- Gestion des matchs → `matches.iife.js` (ou `pools.iife.js` pour le mode Poules)
- Onglets/journées, sauvegarde/chargement d'une journée → `ui.iife.js`
- Sélecteur de type par journée, UI Chrono par journée, classement Multisport → `multisport.iife.js`
- Export/Import JSON → `export-json.iife.js` ; Impression/PDF → `export-print.iife.js`
- Moteur de chronométrage live (timer, tours) → `chrono.iife.js`

### Étape 2 : Créer la fonction
```javascript
function maNouvelleFonction(param1, param2) {
    // Code ici
    // Accès aux données globales via window.championship
    showNotification('Succès !', 'success');
}
```

### Étape 3 : L'exposer
```javascript
global.maNouvelleFonction = maNouvelleFonction;
```

### Étape 4 : Tester
- Vérifier dans la console que `window.maNouvelleFonction` existe
- Tester l'appel direct dans la console
- Tester via l'interface (onclick)

## 🔄 Migration depuis script.js

Pour migrer une fonction du fichier legacy vers un module :

1. **Copier** la fonction dans le module approprié
2. **Adapter** les dépendances (utiliser `global.` pour accéder aux fonctions d'autres modules)
3. **L'exposer** sur `global`
4. **Commenter** la fonction dans `script.js`
5. **Tester** que tout fonctionne
6. **Supprimer** la fonction de `script.js` quand c'est stable

## 📞 Contact et maintenance

- **Dernière mise à jour** : 2026-09-15 (audit complet contre le code réel)
- **Version** : 2.0+ (modulaire, migration de script.js terminée)
- **Auteur** : Romain & Rachel

### Suivi des tâches
Le suivi se fait via les
[GitHub Issues](https://github.com/Romaincapp/Gestionnaire-de-championnats/issues)
du repo, pas dans ce fichier (voir aussi `TODO.md`, qui ne fait plus que
pointer vers les Issues).
