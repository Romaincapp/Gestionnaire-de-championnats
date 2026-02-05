# 📚 Documentation Technique - Gestionnaire de Championnats

## 🎯 Vue d'ensemble

Application de gestion de championnats de tennis de table avec 3 modes de fonctionnement :
- 🎾 **Championship** : Matchs par tours (round-robin, suisse)
- 🏆 **POOL** : Poules + phase finale
- ⏱️ **CHRONO** : Courses avec chronométrage

## 📁 Architecture du projet

```
.
├── index.html              # Point d'entrée principal
├── styles.css              # Styles globaux
├── script.js               # Fichier legacy (fonctions restantes à migrer)
├── AGENTS.md               # Cette documentation
├── src/                    # Modules refactorisés
│   ├── config.iife.js      # Configuration (divisions, terrains)
│   ├── utils.iife.js       # Fonctions utilitaires
│   ├── notifications.iife.js # Système de notifications
│   ├── state.iife.js       # État global et localStorage
│   ├── players.iife.js     # Gestion des joueurs
│   ├── ui.iife.js          # UI générale (onglets, modales)
│   ├── matches.iife.js     # Mode CHAMPIONSHIP
│   ├── pools.iife.js       # Mode POOL
│   ├── chrono.iife.js      # Mode CHRONO
│   ├── ranking.iife.js     # Classements et statistiques
│   └── export.iife.js      # Export PDF et données
└── json/                   # Données JSON (si besoin)
```

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

### 5. players.iife.js
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

### 6. ui.iife.js
**Rôle** : Interface utilisateur générale

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
**Rôle** : Gestion des poules et phase finale

**Fonctions exposées** :
- `updatePoolsDisplay(dayNumber)` - Met à jour l'affichage des poules
- `togglePoolSection(dayNumber)` - Affiche/masque la section poule
- `togglePoolMode(dayNumber)` - Active/désactive le mode poule
- `generatePools(dayNumber)` - Génère les poules
- `updatePoolMatchScore(dayNumber, matchId, scoreField, value)` - Met à jour un score
- `handlePoolMatchEnter(event, dayNumber, matchId)` - Gère la touche Entrée
- `generateFinalPhase(dayNumber)` - Génère la phase finale

### 9. chrono.iife.js (Mode CHRONO)
**Rôle** : Gestion des courses avec chronométrage

**Variables exposées** :
- `raceData` - Données du mode chrono

**Fonctions exposées** :
- `toggleChronoMode()` - Bascule entre mode Championship et Chrono
- `loadChronoData()` - Charge les données chrono
- `showParticipantsManager()` - Gère les participants
- `showAddEventModal()` - Affiche la modale d'événement
- `closeEventModal()` - Ferme la modale
- `saveEvent()` - Sauvegarde un événement
- `showAddSerieModal()` - Affiche la modale de série
- `showAddSerieModalForEvent(eventId)` - Affiche la modale pour un événement
- `closeSerieModal()` - Ferme la modale
- `saveSerie()` - Sauvegarde une série
- `startSerie(serieId)` - Démarre une série
- `continueSerie(serieId)` - Reprend une série
- `toggleRaceTimer()` - Démarre/pause le chrono
- `recordLap(bib)` - Enregistre un tour
- `endSerie()` - Termine une série
- `backToSeriesList()` - Retour à la liste des séries
- `showRaceRanking()` - Affiche le classement de la course
- `showOverallChronoRanking()` - Affiche le classement général chrono
- `exportChronoCompetition()` - Exporte les données chrono
- `importChronoCompetition()` - Importe les données chrono
- `printChronoCompetition()` - Imprime les données chrono

### 10. ranking.iife.js
**Rôle** : Classements et statistiques

**Fonctions exposées** :
- `calculatePlayerStats(playerName, dayNumber, division)` - Calcule les stats d'un joueur
- `updateRankings()` - Met à jour les classements (journée courante)
- `updateRankingsForDay(dayNumber)` - Met à jour les classements d'une journée
- `showRankings(type)` - Affiche le classement par type
- `showRankingsForDay(dayNumber)` - Affiche le classement d'une journée
- `updateGeneralRanking()` - Met à jour le classement général
- `showGeneralPlayerDetails(playerName)` - Affiche les détails d'un joueur

### 11. export.iife.js
**Rôle** : Export de données et impression

**Fonctions exposées** :
- `exportChampionship()` - Exporte le championnat en JSON
- `confirmExportChampionship()` - Confirme et exporte
- `exportGeneralRankingToPDF()` - Exporte le classement en PDF
- `showPrintOptionsModal(dayNumber)` - Affiche les options d'impression
- `printMatchSheets()` - Imprime les feuilles de match
- `printRecapSheets()` - Imprime les récapitulatifs

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
Les modules peuvent dépendre de fonctions exposées précédemment. Ordre de chargement important :
1. config, utils, notifications
2. state
3. players
4. ui, matches, pools, chrono
5. ranking, export

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

## 🔄 Migration depuis script.js

Pour migrer une fonction du fichier legacy vers un module :

1. **Copier** la fonction dans le module approprié
2. **Adapter** les dépendances (utiliser `global.` pour accéder aux fonctions d'autres modules)
3. **L'exposer** sur `global`
4. **Commenter** la fonction dans `script.js`
5. **Tester** que tout fonctionne
6. **Supprimer** la fonction de `script.js` quand c'est stable

## 📞 Contact et maintenance

- **Dernière mise à jour** : 2024-02-02
- **Version** : 2.0 (modulaire)
- **Auteur** : Romain & Rachel

### À faire (TODO)
- [ ] Migrer toutes les fonctions restantes de `script.js`
- [ ] Ajouter des tests unitaires
- [ ] Documenter les fonctions avec JSDoc
- [ ] Créer un système de build (Vite/Webpack) pour regrouper les modules
- [ ] Ajouter TypeScript pour la type safety
