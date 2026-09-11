# 📚 Documentation Technique - Gestionnaire de Championnats

> ⚠️ Avant de modifier ce fichier, lis `DEVLOG.md` (état courant + dernières sessions) et
> mets-le à jour toi-même en fin de session si tu touches à l'architecture. Voir la section
> [🗓️ Journal de développement](#️-journal-de-développement--protocole-de-session) en bas de ce fichier.

## 🎯 Vue d'ensemble

Application de gestion de championnats sportifs avec 4 modes de fonctionnement, combinables
au sein d'une même compétition (journée par journée) :
- 🎾 **Championship** : Matchs par tours (round-robin, suisse)
- 🏆 **POOL** : Poules + phase finale (extension du mode Championship)
- ⏱️ **CHRONO** : Courses chronométrées (course à pied, cyclisme, natation, y compris mode
  couloirs et statuts Prêt/En course/Terminé/DNS/**DISQ**)
- 🌐 **MULTISPORT** : Journées mixtes Championship/Chrono + classement combiné inter-club
  (barème de points par position). Voir [MULTISPORT.md](./MULTISPORT.md).

Un module transverse **Clubs** permet d'associer un club à chaque participant, dans tous
les modes. Voir [CLUBS.md](./CLUBS.md).

## 📁 Architecture du projet

```
.
├── index.html                 # Point d'entrée principal (UI complète)
├── styles.css                 # Styles globaux
├── script.js                  # Résidu legacy (~37 lignes) — la migration vers src/ est terminée
├── AGENTS.md                  # Cette documentation
├── DEVLOG.md                  # Journal chronologique des sessions/modifs (source de vérité court terme)
├── src/                       # Modules refactorisés (16 fichiers IIFE)
│   ├── config.iife.js         # Configuration (divisions, terrains)
│   ├── utils.iife.js          # Fonctions utilitaires
│   ├── notifications.iife.js  # Système de notifications
│   ├── state.iife.js          # État global et localStorage
│   ├── clubs.iife.js          # Gestion des clubs (transverse à tous les modes)
│   ├── players.iife.js        # Gestion des joueurs
│   ├── ui.iife.js             # UI générale (onglets, journées, sélecteur multisport)
│   ├── init.iife.js           # BYE, modales génériques, event listeners globaux
│   ├── matches.iife.js        # Mode CHAMPIONSHIP
│   ├── pools.iife.js          # Mode POOL + phases finales
│   ├── chrono.iife.js         # Mode CHRONO (courses, couloirs, DISQ...)
│   ├── multisport.iife.js     # Mode MULTISPORT (mix Championship/Chrono, classement combiné)
│   ├── ranking.iife.js        # Classements et statistiques
│   ├── export.iife.js         # Orchestration export PDF/données (legacy, en réduction)
│   ├── export-json.iife.js    # Export/Import JSON (championnat + chrono)
│   └── export-print.iife.js   # Impression des feuilles de match / classements
└── json/                      # Données JSON d'exemple (si besoin)
```

**Tailles indicatives** (voir `DEVLOG.md` pour l'état exact à jour) : les plus gros modules
sont `pools.iife.js` et `chrono.iife.js` (plusieurs milliers de lignes chacun), suivis de
`multisport.iife.js` et `export-print.iife.js`. `script.js` n'est plus qu'un résidu légataire
— **il n'y a plus de migration en cours**, contrairement à ce que laissaient penser d'anciennes
versions de cette documentation.

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
- `confirmAction(message)` - Affiche une confirmation
- `alertMessage(message)` - Affiche une alerte

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
**Rôle** : Gestion des clubs, transverse à tous les modes (Championship, Pool, Chrono,
Multisport). Documentation complète : [CLUBS.md](./CLUBS.md).

**Fonctions exposées** via `window.clubsModule` (extrait) :
- `getClubsList()` - Liste des clubs connus (prédéfinis + clubs personnalisés ajoutés)
- `addClub(name)` - Ajoute un club personnalisé
- Structure joueur étendue de `"Nom"` à `{ name, club }` (migration automatique des anciennes
  données sans club)

### 6. players.iife.js
**Rôle** : Gestion des joueurs

**Fonctions exposées** :
- `addPlayer()` - Ajoute un joueur (depuis l'onglet principal)
- `addPlayerToDay(dayNumber)` - Ajoute un joueur à une journée spécifique
- `removePlayer(dayNumber, division, index)` - Supprime un joueur
- `editPlayer(dayNumber, division, index)` - Modifie un joueur
- `playerHasByeMatch(dayNumber, division, playerName)` - Vérifie si un joueur a un BYE
- `addBulkPlayers()` - Ajoute plusieurs joueurs en bulk
- `copyPlayersFromPreviousDay(dayNumber)` - Copie les joueurs de la veille
- `updatePlayerCount(dayNumber)` - Met à jour le compteur de joueurs
- `closePlayerModal()` - Ferme la modale joueur

### 7. ui.iife.js
**Rôle** : Interface utilisateur générale, y compris le sélecteur de type de journée
(Championship/Chrono/Multisport). La checkbox globale "Mode Chrono" a été **supprimée** :
depuis l'introduction du mode Multisport, le type se choisit **par journée**.

**Fonctions exposées** :
- `switchTab(dayNumber)` - Change d'onglet de journée
- `switchToGeneralRanking()` - Affiche le classement général
- `addNewDay()` - Ajoute une nouvelle journée
- `removeDay(dayNumber)` - Supprime une journée
- `createDayTab(dayNumber)` - Crée un onglet de journée
- `closeModal(modalId)` - Ferme une modale
- `closeImportModal()` - Ferme la modale d'import
- `showImportModal()` - Affiche la modale d'import
- `processImport()` - Traite l'import JSON
- `clearAllData()` - Efface toutes les données
- `toggleDayHub(dayNumber)` - Replie/déplie une section journée
- `toggleGeneralHub()` - Replie/déplie le classement général
- `showAddPlayerModal(dayNumber)` - Affiche la modale d'ajout de joueur
- `closeAddPlayerModal()` - Ferme la modale d'ajout
- `addPlayerFromModal()` - Ajoute un joueur depuis la modale
- `showBulkInput()` - Affiche la modale d'ajout bulk
- `closeBulkModal()` - Ferme la modale bulk

### 8. matches.iife.js (Mode Championship)
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

### 9. pools.iife.js (Mode POOL)
**Rôle** : Gestion des poules et phase finale

**Fonctions exposées** :
- `updatePoolsDisplay(dayNumber)` - Met à jour l'affichage des poules
- `togglePoolSection(dayNumber)` - Affiche/masque la section poule
- `togglePoolMode(dayNumber)` - Active/désactive le mode poule
- `generatePools(dayNumber)` - Génère les poules
- `updatePoolMatchScore(dayNumber, matchId, scoreField, value)` - Met à jour un score
- `handlePoolMatchEnter(event, dayNumber, matchId)` - Gère la touche Entrée
- `generateFinalPhase(dayNumber)` - Génère la phase finale

### 10. chrono.iife.js (Mode CHRONO)
**Rôle** : Gestion des courses avec chronométrage (le plus gros module, plusieurs milliers de lignes)

**Variables exposées** :
- `raceData` - Données du mode chrono

**Fonctions exposées** (liste non exhaustive — voir le fichier pour le détail) :
- `toggleChronoMode()` - Bascule entre mode Championship et Chrono
- `loadChronoData()` - Charge les données chrono
- `showParticipantsManager()` - Gère les participants (nom, dossard, club éditables)
- `showAddEventModal()` / `closeEventModal()` / `saveEvent()` - Épreuves (course, vélo, natation)
- `showAddSerieModal()` / `showAddSerieModalForEvent(eventId)` / `saveSerie()` - Séries
- `startSerie(serieId)` / `continueSerie(serieId)` / `endSerie()` - Cycle de vie d'une série
- `toggleRaceTimer()` - Démarre/pause le chrono général
- `recordLap(bib)` - Enregistre un tour / une arrivée (détection auto relais)
- `displayRaceInterface()` - Interface de course en direct (exposée sur `window` pour les
  appels cross-module, notamment depuis `multisport.iife.js`)
- **Mode couloirs (natation)** : assignation manuelle de couloir par série, saisie/arrêt par
  touche 1-9, édition nom/dossard/club directement depuis la modale couloirs
- **Statuts participant** : `ready` (Prêt) / `running` (En course) / `finished` (Terminé) /
  `DNS` (non-partant) / **`DISQ`** (disqualifié, ajouté en septembre 2026)
- **Édition inline** : modification du nombre de tours / distance / temps pendant qu'une
  course est en cours, sans la stopper ni la terminer par erreur
- `showRaceRanking()` / `showOverallChronoRanking()` - Classements de série / général chrono
- `exportChronoCompetition()` / `importChronoCompetition()` / `printChronoCompetition()`
- **Imports** : import "Séries natation" tolérant (données manquantes, séparateur et mapping
  de colonnes façon Excel)

### 11. multisport.iife.js (Mode MULTISPORT)
**Rôle** : Cohabitation Championship/Chrono au sein d'une même compétition et classement
combiné inter-club. Documentation complète : [MULTISPORT.md](./MULTISPORT.md).

**Points clés** :
- Détection automatique du mode multisport (dès qu'une compétition mélange des journées de
  types différents) ; l'onglet "🌐 Multisport" n'apparaît que dans ce cas
- Classement général basé sur un **barème de position** (25/19/17…, configurable) plutôt que
  sur des points bruts, pour pouvoir comparer des épreuves hétérogènes
- Ajout en masse de participants cochés à une série, y compris au format `dossard + tabulation`
- Bouton "Afficher" pour un second écran de classement/course mis à jour en temps réel
- Dépend de `clubsModule` (voir ci-dessous) pour l'affichage/regroupement par club
- Gestion de la suppression d'une épreuve en mode course (journée multisport)

### 12. init.iife.js
**Rôle** : Initialisation transverse — matchs BYE, modales génériques, câblage des event
listeners globaux au chargement de la page

**Fonctions exposées** (extrait) :
- `addByeMatchForPlayer(...)` - Ajoute un match BYE, avec **choix du score** à la création
- `setByeScorePreset(...)` / `closeByeScoreModal()`

### 13. ranking.iife.js
**Rôle** : Classements et statistiques

**Fonctions exposées** :
- `calculatePlayerStats(playerName, dayNumber, division)` - Calcule les stats d'un joueur
- `updateRankings()` - Met à jour les classements (journée courante)
- `updateRankingsForDay(dayNumber)` - Met à jour les classements d'une journée
- `showRankings(type)` - Affiche le classement par type
- `showRankingsForDay(dayNumber)` - Affiche le classement d'une journée
- `updateGeneralRanking()` - Met à jour le classement général (gère aussi le cas 100% chrono
  et le cas mixte multisport)
- `showGeneralPlayerDetails(playerName)` - Affiche les détails d'un joueur
- Détection de noms de joueurs similaires (score de similitude, transpositions, espaces
  parasites) pour repérer les doublons avant classement

### 14. export.iife.js
**Rôle** : Orchestration export PDF/données restée depuis le refactoring de 2024. La plupart
des exports concrets vivent désormais dans `export-json.iife.js` et `export-print.iife.js` —
préférer y ajouter du code plutôt qu'ici.

### 15. export-json.iife.js
**Rôle** : Export/Import JSON (championnat + compétition chrono/multisport)

**Fonctions exposées** (extrait) :
- `exportChampionship()` / `confirmExportChampionship()`
- `showImportModal()` / `handleFileImport(...)` (exposée sur `window` depuis 2026-08)
- Import de classements de pools + auto-configuration à partir du JSON importé

### 16. export-print.iife.js
**Rôle** : Impression des feuilles de match, récapitulatifs et export PDF des classements

**Fonctions exposées** (extrait) :
- `exportGeneralRankingToPDF()` - Export PDF du classement général (mise en page compacte,
  évite les pages blanches)
- `showPrintOptionsModal(dayNumber)` / `printMatchSheets()` / `printRecapSheets()`

## 🎨 Structure des données

### Championship
```javascript
{
  currentDay: 1,
  config: {
    numberOfDivisions: 3,
    numberOfCourts: 4
  },
  days: {
    1: {
      players: {
        1: ["Joueur 1", "Joueur 2"],
        2: ["Joueur 3", "Joueur 4"],
        3: []
      },
      matches: {
        1: [{
          id: "abc123",
          player1: "Joueur 1",
          player2: "Joueur 2",
          score1: 21,
          score2: 15,
          completed: true,
          winner: "Joueur 1",
          tour: 1,
          division: 1
        }]
      },
      pools: {
        enabled: false,
        divisions: {
          1: {
            pools: [{ name: "Poule A", players: [], index: 0 }],
            matches: [],
            finalPhase: []
          }
        }
      }
    }
  }
}
```

### Mode Chrono (raceData)
```javascript
{
  events: [{
    id: 1,
    name: "Course du 10km",
    date: "2024-01-15",
    createdAt: "..."
  }],
  series: [{
    id: 1,
    name: "Série 1",
    eventId: 1,
    participants: [],
    isRunning: false,
    startTime: null,
    currentTime: 0
  }],
  participants: [],
  currentSerie: null,
  nextEventId: 1,
  nextSerieId: 1,
  nextParticipantId: 1
}
```

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
Les modules peuvent dépendre de fonctions exposées précédemment. Ordre de chargement important
(voir l'ordre des `<script>` dans `index.html`, qui fait foi en cas de doute) :
1. config, utils, notifications
2. state
3. clubs
4. players
5. ui, init, matches, pools, chrono, multisport
6. ranking, export, export-json, export-print

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
- Gestion des matchs → `matches.iife.js` (ou `pools.iife.js`)
- UI générale → `ui.iife.js`
- Export → `export.iife.js`

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

## 🔄 Migration depuis script.js — TERMINÉE

La migration du fichier legacy `script.js` vers les modules `src/*.iife.js` est **terminée**
(le fichier ne fait plus que ~37 lignes). Ne pas réintroduire de logique dans `script.js` :
toute nouvelle fonctionnalité va dans le module approprié (voir la liste ci-dessus), ou dans
un nouveau module `src/xxx.iife.js` si aucun module existant ne convient.

## 🗓️ Journal de développement & protocole de session

**`DEVLOG.md`** (à la racine du repo) est le journal chronologique des sessions de dev — qui
a fait quoi, quand, sur quels fichiers, avec quel commit. C'est la référence pour savoir
"où en est le code" sans avoir à relire tout l'historique git.

**Règle à appliquer par tout agent (Claude ou humain) en fin de session** — voir le détail
complet et le gabarit dans `claude.md` § "Protocole de fin de session" :
1. Ajouter une entrée dans `DEVLOG.md` (date, résumé, fichiers/modules touchés, commit).
2. Mettre à jour `CHANGELOG.md` si le changement est visible pour l'utilisateur final.
3. Mettre à jour **cette page (`AGENTS.md`)** si un module est ajouté/renommé/scindé, ou si
   une fonction exposée sur `window` change de signature.
4. Cocher/mettre à jour `TODO.md` si une tâche listée est terminée ou obsolète.

Ne pas laisser la doc dériver à nouveau : c'est exactement ce qui s'est produit entre
février 2024 et septembre 2026 (voir `DEVLOG.md` pour le constat détaillé).

## 📞 Contact et maintenance

- **Dernière mise à jour de ce fichier** : voir `DEVLOG.md` (entrée la plus récente) et
  l'historique git de `AGENTS.md` — ne pas se fier à une date codée en dur ici, elle sera
  aussi vite obsolète que la précédente.
- **Version** : architecture modulaire (16 modules `src/*.iife.js`)
- **Auteur** : Romain & Rachel

### À faire (TODO)
Voir `TODO.md` pour la liste vivante. Items structurels restants :
- [ ] Ajouter des tests unitaires (aucun test automatisé à ce jour)
- [ ] Documenter les fonctions avec JSDoc
- [ ] Créer un système de build (Vite/Webpack) pour regrouper les modules
- [ ] Ajouter TypeScript pour la type safety
