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
├── src/                    # Toute la logique applicative (15 modules IIFE, ~30k lignes)
│   ├── config.iife.js      # Configuration (divisions, terrains)
│   ├── utils.iife.js       # Fonctions utilitaires
│   ├── notifications.iife.js # Système de notifications
│   ├── state.iife.js       # État global (championship) et localStorage
│   ├── clubs.iife.js       # Gestion des clubs
│   ├── multisport.iife.js  # Sélecteur de type par journée, UI Chrono par journée, classement combiné (le plus gros module fonctionnellement, ~3700 lignes)
│   ├── players.iife.js     # Gestion des joueurs (journées Championship)
│   ├── ui.iife.js          # Onglets/journées, addNewDay/removeDay/clearDayData, pont Chrono↔raceData
│   ├── matches.iife.js     # Mode CHAMPIONSHIP (matchs par tours)
│   ├── pools.iife.js       # Mode POOL (poules + phase finale) — le plus gros fichier, ~7200 lignes
│   ├── ranking.iife.js     # Classements et statistiques Championship
│   ├── export-json.iife.js # Export/Import JSON du championnat
│   ├── export-print.iife.js # Impression / PDF (feuilles de match, récaps)
│   ├── chrono.iife.js      # Moteur de chronométrage live (raceData, timer, tours) — backend du mode CHRONO par journée, voir section 11
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
- `reportSaveFailure(store, error)` / `reportSaveSuccess(store)` - Échec de
  sauvegarde localStorage (quota plein, navigation privée) : un seul bandeau
  rouge persistant avec bouton « Exporter maintenant », retiré automatiquement
  quand toutes les sauvegardes (`'championship'`, `'chrono'`) réussissent de
  nouveau. Appelées par `saveToLocalStorage()` et `saveChronoToLocalStorage()`

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

### 5. clubs.iife.js
**Rôle** : Gestion des clubs. 6 assignations directes sur `window`, dont un
objet `clubsModule` regroupant 15 méthodes (pas des fonctions séparées) :

**Fonctions directes** :
- `showClubManagementModal()`, `closeClubManagementModal()`, `addNewClubFromModal()`, `removeClubFromModal()`, `handleClubSelectChange(select, inputId)`

**`window.clubsModule` (objet, méthodes)** :
- `getClubsList`, `addClub`, `removeClub`, `generateClubOptions`, `generateClubInputHtml`, `migratePlayerData`, `createPlayerObject`, `getPlayerName`, `getPlayerClub`, `getPlayerFullDisplay`, `getPlayerDisplayName`, `findPlayerByName`, `playerExists`, `getClubsStats`, `getPlayerClubByName`
- `clubsModule.migratePlayerData()` est appelée au démarrage par `init.iife.js` (section 14) pour migrer les anciennes données joueurs (string) vers le format `{name, club}`

### 6. multisport.iife.js
**Rôle** : Sélecteur de type par journée, UI Chrono par journée, classement
combiné Multisport. **97 fonctions exposées** — le plus gros module
fonctionnellement (~3700 lignes), et le plus critique : c'est lui qui décide
quelle UI (Championship/Chrono) s'affiche pour chaque journée et qui pilote
le pont vers `chrono.iife.js` via `ui.iife.js` (voir section 11). Une
fonction (`updateDayTypeUI`) est exposée deux fois de suite sur `window`
(même corps, pas un vrai conflit — juste redondant, contrairement aux
doublons réels de `pools.iife.js`/`chrono.iife.js` mentionnés ailleurs).
Une seconde interface de course live complète (`activeRaces`,
`startRaceForSerie`, `toggleRaceTimerForDay`, `showLiveRanking`...) a été
retirée (jamais atteignable depuis l'UI, son point d'entrée n'était appelé
nulle part) — ne pas chercher `toggleRaceTimerForDay`/`showLiveRanking` ici,
la vraie interface de course vit dans `chrono.iife.js` (section 11).

Un sous-ensemble représentatif :
- `setDayType(dayNumber, type)`, `getDayType(dayNumber)`, `isMultisportMode()`, `hasChronoDays()`, `hasChampionshipDays()`, `updateMultisportTabVisibility()`
- `showAddEventModalForDay(dayNumber)`, `saveEventForDay(dayNumber)`, `showAddSerieModalForDay(dayNumber)`, `saveSerieForDay(dayNumber)` - équivalents par-journée des fonctions globales supprimées de `chrono.iife.js` (voir issue #65)
- `manageSerieParticipants(dayNumber, serieId)`, `addParticipantToSerie(dayNumber, serieId)`, `addExistingParticipantToSerie(dayNumber, participantId, serieId)`, `removeParticipantFromSerie(dayNumber, serieId, participantId)` - gestion des participants d'une série (modal "👥 Gérer les participants") ; tous propagent désormais `category` (voir feature Catégories ci-dessous)
- `assignCategoryRanks(arr)`, `buildCategoryDatalist(dayNumber)`, `getSerieRanking(serie)` - feature "catégories multiples" (ex: Solo/Équipe) : `assignCategoryRanks` ajoute `catRank`/`catTotal`/`hasMultipleCategories` à un classement déjà trié ; utilisée par les 3 vues de classement chrono (`generateRaceRanking` et `buildLiveRaceDisplayContentHTML` dans `chrono.iife.js`, `showSerieRanking` ici)
- `calculateMultisportRanking()`, `renderMultisportRanking()`, `buildMultisportRankingDoc(autoPrint)`, `exportMultisportRankingToHTML()`, `showSerieRanking(dayNumber, serieId)` - classement combiné (voir "Rankings" plus bas dans `claude.md`)
- `isSwimmingOnlyCompetition()`, `calculateEventRankings()`, `buildEventRankingsHTML()` - **natation** : pas de classement général ; toutes les séries d'une même épreuve regroupées et classées au temps (centièmes, ex æquo au centième, DNS/DISQ listés sans rang). Utilisé par l'onglet, l'impression/export HTML, le second écran « 📺 Afficher » (`buildMultisportRankingContentHTML`, `ui.iife.js`) et l'export JSON
- `exportChronoDataForDay(dayNumber)`, `importChronoDataForDay(dayNumber)` - export/import par-journée des données chrono
- `showAddParticipantManualModal(dayNumber)`, `saveBulkParticipantsForDay(dayNumber)`, `showImportPlayersModal(dayNumber)`, `importPlayersFromDay(target, source)`
- Pour la liste complète, `grep "^\s*(global|window)\.[a-zA-Z_]* =" src/multisport.iife.js`

### 7. players.iife.js
**Rôle** : Gestion des joueurs (journées Championship). ~19 fonctions exposées,
dont notamment :
- `addPlayer()`, `addPlayerToDay(dayNumber)`, `removePlayer(dayNumber, division, index)`, `editPlayer(dayNumber, division, index)`, `playerHasByeMatch(dayNumber, division, playerName)`, `addBulkPlayers()`
- `showAddPlayerModal(dayNumber)`, `closeAddPlayerModal()`, `addPlayerFromModal()`, `showBulkInput()`, `closeBulkModal()`, `showEditPlayerModal()`, `saveEditedPlayer()`, `updatePlayersDisplay()`

**Correction** : `copyPlayersFromPreviousDay()` et `updatePlayerCount()` sont
en réalité dans `ui.iife.js`, pas ici (attribution corrigée le 2026-09,
vérifiée par grep). `closePlayerModal()` est en réalité dans `ranking.iife.js`.

### 8. ui.iife.js
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

### 9. matches.iife.js (Mode Championship)
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

### 10. pools.iife.js (Mode POOL)
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

### 11. chrono.iife.js (Moteur de course, utilisé par le mode CHRONO par journée)
**Rôle** : Moteur de chronométrage live (timer, tours, saisie rapide, historique
d'actions annulable, bip sonore) utilisé comme backend par le mode Chrono par
journée du module `multisport.iife.js`. L'ancien menu global "tout-en-un"
(`#chronoModeSection`, ses écrans de gestion d'épreuves/séries/classements et
son export/import dédié) a été retiré en 2026-09 car inatteignable depuis
l'UI — voir issue #65. `raceData` sert toujours de format de pont interne
entre le stockage par jour (`championship.days[n].chronoData`) et ce moteur ;
`startSerie()`/`continueSerie()` évoqués dans une ancienne version de cette
doc n'existent plus (confirmé par grep, aucune trace nulle part) — retirés
lors du même nettoyage.

**Variables exposées** :
- `raceData` - Format de pont interne utilisé par le moteur de course live.
  Chaque event/série qui y est créé porte un champ `dayNumber` (depuis le
  correctif du cache non purgé par "Vider la journée") : les recherches par
  id doivent toujours filtrer aussi sur `dayNumber`, sinon un id réutilisé
  après un vidage de journée retombe sur une ancienne entrée du cache.

**Fonctions exposées** :
- `toggleRaceTimer()` - Démarre/pause le chrono
- `recordLap(bib)` / `finishParticipant(bib)` / `finishLane(laneNumber)` -
  Enregistrent un tour / une arrivée (mode normal / mode couloirs) ; alimentent
  aussi l'historique d'actions annulable (`serie.actionLog`) via
  `logRaceAction()` (non exposée) et déclenchent `playLapBeep()` sur un LAP réel
- `undoRaceAction(actionId)` - Annule une action de l'historique (et, en
  cascade, toutes celles enregistrées après elle) via un système de
  snapshots avant/après par participant. Si l'arrivée annulée avait arrêté
  automatiquement le chrono général (dernier arrivé), le chrono repart depuis
  l'instant de départ d'origine : le temps écoulé pendant l'arrêt est rattrapé
- `toggleActionHistoryPanel()` / `renderActionHistoryPanel()` - Panneau
  latéral "🕘 Historique" de l'écran de course
- `playLapBeep()` - Bip sonore (Web Audio, pas de fichier) à chaque LAP
- `restartParticipant(bib)`, `markAsDNS(bib)`, `markAsDISQ(bib)`,
  `cancelDNS(bib)`, `cancelDISQ(bib)` - Corrections de statut pendant/après
  la course
- `backToSeriesList()` - Retour à la liste des séries du jour (bouton
  "⬅️ Retour aux séries" et fin de `endSerie()`) ; persiste la progression
  en cours puis régénère la liste via `refreshChronoDisplay()`
  (`multisport.iife.js`)
- `endSerie()` - Termine une série
- `showRaceRanking()` - Affiche/masque le classement de la course en cours
  (dans l'écran de course lui-même)
- `openLiveRaceDisplayWindow()` / `buildLiveRaceDisplayContentHTML()` -
  Fenêtre "🖥️ Afficher" (classement live destiné à être projeté), avec
  auto-refresh par `postMessage` toutes les 3s ; inclut la colonne
  Catégorie quand 2+ catégories sont présentes (même logique que
  `generateRaceRanking()` et `showSerieRanking()`)
- `printChronoCompetition(dayNumber)` - Imprime les séries d'une journée
  (appelée depuis `multisport.iife.js`)
- `displayRaceInterface(serie)` - Affiche l'interface de course live (appelée
  via `startChronoRaceForDay()` dans `ui.iife.js`)

### 12. ranking.iife.js
**Rôle** : Classements et statistiques Championship

**Fonctions exposées** :
- `calculatePlayerStats(dayNumber, division, playerName)`, `updateRankings()`, `updateRankingsForDay(dayNumber)`, `showRankings(type)`, `showRankingsForDay(dayNumber)`, `updateGeneralRanking()`, `showGeneralPlayerDetails(playerName)`
- `closePlayerModal()` - vit ici, pas dans `players.iife.js` (voir section 7)
- `showPlayerDetails()`, `exportGeneralRanking()`, `exportGeneralRankingToPDF()`, `showNameCheckModal()`, `applyNameCheckMerge()`, `toggleDayMatches()`, `updateStats()`

### 13. export-json.iife.js et export-print.iife.js
**Rôle** : Export/Import JSON et impression/PDF. `export.iife.js` (l'ancien
fichier documenté ici) a été supprimé (issue #64 sur GitHub, 2026-09) : ses
5 fonctions étaient entièrement écrasées par ces deux modules-ci, chargés
après lui — c'était du code mort.

**export-json.iife.js** (14 fonctions/variables exposées, liste complète) :
- `exportChampionship()`, `confirmExportChampionship()` - Export JSON (avec choix du nom de fichier)
- `showImportModal()`, `closeImportModal()`, `showImportConfigModal()`, `closeImportConfigModal()`, `applyImportConfig()` - Import JSON, configuration divisions/terrains avant import
- `handleChampionshipImport(event)`, `processImport()` - Traitement du fichier importé (remplace tout le championnat)
- `importMultipleDayFiles()`, `showMultiDayImportModal()`, `closeMultiDayImportModal()` - Import multi-fichiers (un par journée)
- `clearAllData()` - Efface tout (championnat + chrono + localStorage)
- `importedChampionshipData` (variable, réassignée à 3 endroits différents du fichier - normal, pas un bug)

**export-print.iife.js** (22 fonctions exposées). `generateMatchSheetHTML` et
`generateCompactMatchSheet` apparaissent deux fois dans les assignations
`window.x =` mais n'ont qu'**une seule** définition chacune (juste exposées
deux fois par redondance) — contrairement aux vrais doublons de
`pools.iife.js`/`chrono.iife.js`, ce n'est pas un bug fonctionnel.
- `showPrintOptionsModal(dayNumber)`, `printMatchSheets(dayNumber)`, `printRecapSheets(dayNumber)` - gère mode Pool vs Terrain
- `printBocciaMatchSheets()`, `generateBocciaSheetHTML()`, `generateBocciaMatchCard()` - feuilles spécifiques au mode Boccia
- `printSimpleScoreSheets()`, `generateSimpleScoreSheetHTML()` - feuilles de score simplifiées
- `printRecapByCourt()`, `printRecapByPool()` - récapitulatifs

### 14. init.iife.js
**Rôle** : Deux choses distinctes dans ce fichier, malgré son nom :
1. **Bootstrap réel** : un handler `DOMContentLoaded` qui orchestre le
   démarrage — `loadFromLocalStorage()` → `initMultisport()` →
   `clubsModule.migratePlayerData()` → `updateMultisportTabVisibility()` →
   initialisation des sélecteurs/onglets → `setupChronoProtection()` →
   `loadChronoFromLocalStorage()` + `restoreRunningTimers()` (restaure un
   chrono en cours après un rechargement de page)
2. **20 fonctions UI diverses** qui n'avaient pas de module dédié : gestion
   des BYE (`addByeMatchForPlayer`, `showByeScoreModal`, `confirmByeScore`,
   `showByeManagementModal`, `addByeToAll`...), modale de génération de
   matchs (`showMatchGenerationModal`, `selectMatchGenerationType`),
   fenêtres de classement (`openRankingInNewWindow`,
   `showCompleteDayRanking`, `openCompleteRankingInNewWindow`,
   `exportGeneralRankingToHTML`)

Le nom "init" ne reflète donc que la moitié du contenu réel du fichier.

## 🎨 Structure des données

**Voir `claude.md` pour la structure de données faisant foi** (section "Core
Data Structures"), tenue à jour en 2026-09 avec vérification directe du code.
Résumé : un seul objet `championship`, chaque journée a un `dayType`
(`'championship'` ou `'chrono'`), et les données Chrono d'une journée vivent
dans `championship.days[n].chronoData` — pas dans un objet `raceData` séparé
(celui-ci n'est qu'un pont interne utilisé pendant qu'une course tourne,
voir section 11 ci-dessus). Dupliquer cette structure ici créait exactement
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

## 🧪 Tests automatisés

**`npm test` doit tourner (et être vert) avant de considérer une modification terminée** — correction de bug, suppression de code mort, refactoring, tout y passe. Ce n'est pas optionnel : plusieurs bugs de ce repo (`clearDayData` qui perdait `dayType`, le doublon `generateInterclubRanking` qui cassait silencieusement le classement interclub) n'ont été détectés que parce qu'un test existait ou a été écrit pour eux.

```bash
npm test                    # Suite Jest (tests/unit/), 180+ tests
npm run check:duplicates    # Détection de doublons en CLI seule (déjà incluse dans npm test)
npm run test:e2e            # Journée natation complète dans un vrai navigateur (HEADED=1 pour regarder)
```

La CI (`.github/workflows/tests.yml`) lance `npm ci` + `npm test` sur chaque PR et
chaque push vers `main` : un check rouge est une vraie régression.

`npm run test:e2e` (`tests/e2e/natation.e2e.js`) rejoue par de vrais clics une journée
natation complète avec les 150 lignes réelles de `jsondetest/natation test 2.json`. Il n'est
pas lancé en CI (il faut un navigateur) : à lancer avant chaque compétition et après toute
modification du flux Courses/natation/classements. Captures et rapport dans
`tests/e2e/output/`.

Quand tu corriges un bug, ajoute un test de non-régression dans `tests/unit/` (voir `clearDayData.test.js` ou `interclubRanking.test.js`). Quand tu supprimes du code que tu penses mort, lance `npm test` avant ET après — une suite verte avant qui reste verte après est la vraie preuve que la suppression est sûre, pas juste le grep qui l'a justifiée. Voir `CONTRIBUTING.md` et `tests/helpers/loadApp.js` pour le détail.

## 🐛 Debugging

### Détecter les fonctions redéfinies (doublons silencieux)
```bash
npm run check:duplicates
# ou directement : node scripts/check-duplicate-functions.js
```
Repère les `function nom() {}` ou `window.nom = function() {}` déclarés deux
fois dans le même fichier `src/*.iife.js` — la seconde définition écrase la
première sans erreur ni avertissement. Distingue les vrais bugs (écrasement
silencieux, ex. `generateInterclubRanking` dans `chrono.iife.js`, issue #65)
des wrappers intentionnels qui capturent et appellent l'original (pattern
`originalX = window.x; window.x = function() { originalX(...); ... }`,
utilisé volontairement dans `pools.iife.js`).

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

## 🗓️ Journal de développement & protocole de session

**`DEVLOG.md`** (racine du repo) est le journal chronologique des sessions de dev — qui a
fait quoi, quand, sur quels fichiers, avec quel commit. C'est la référence pour savoir
"où en est le code" sans relire tout l'historique git.

**En fin de session** (Claude ou humain), dans le même commit que le code — détail complet
dans `claude.md` § "Protocole de fin de session" :
1. Ajouter une entrée dans `DEVLOG.md` (date, résumé, fichiers touchés, commit).
2. Mettre à jour `CHANGELOG.md` si le changement est visible pour l'utilisateur final.
3. Mettre à jour **cette page** si un module est ajouté/renommé/scindé, ou si une fonction
   exposée sur `window` change.
4. `npm test` vert (voir "🧪 Tests automatisés").

Un workflow CI non bloquant (`.github/workflows/devlog-reminder.yml`) commente toute PR qui
modifie `src/`, `index.html` ou `script.js` sans toucher `DEVLOG.md`.

## 📞 Contact et maintenance

- **Dernière mise à jour** : 2026-09-15 (audit complet contre le code réel) — pour les
  évolutions suivantes, voir `DEVLOG.md`
- **Version** : 2.0+ (modulaire, migration de script.js terminée)
- **Auteur** : Romain & Rachel

### Suivi des tâches
Le suivi se fait via les
[GitHub Issues](https://github.com/Romaincapp/Gestionnaire-de-championnats/issues)
du repo, pas dans ce fichier (voir aussi `TODO.md`, qui ne fait plus que
pointer vers les Issues).
