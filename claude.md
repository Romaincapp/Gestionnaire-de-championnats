# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> ⚠️ **Read `DEVLOG.md` first** (most recent entries) before starting work — it tells you
> what the last sessions actually changed, on which files, and whether any of the guidance
> below is currently being reworked. This file, `AGENTS.md`, `README.md`, `TODO.md` and
> `CHANGELOG.md` drifted badly out of sync with the code for ~2.5 years (Feb 2024 → Sep 2026)
> before being restored — see the "Protocole de fin de session" below for how we keep that
> from happening again. Do not skip it.

## Project Overview

**Gestionnaire de Championnats** - A single-page web application for managing sports
competitions, with modes that can be **combined day by day** within the same competition:
1. **Championship Mode** (Mode Championnat) - Multi-day tournament management (table tennis by default), with an optional **Pool** sub-mode (poules + phase finale)
2. **Chrono Mode** (Mode Chrono) - Race timing system for running, cycling, swimming events, including lane ("couloirs") mode and participant statuses Ready/Running/Finished/DNS/**DISQ**
3. **Multisport Mode** - Appears automatically once a competition mixes Championship and Chrono days; combines rankings across heterogeneous events using a position-based points scale. See `MULTISPORT.md`.

A transverse **Clubs** module (`clubs.iife.js`) attaches a club to any participant in any mode. See `CLUBS.md`.

Built with vanilla JavaScript (ES5-compatible), HTML, and CSS. No build system, no external
dependencies. Runs entirely client-side with localStorage persistence.

## Running the Application

Open `index.html` in a web browser. That's it. All functionality runs client-side.

## File Structure (current, not the pre-refactor one)

```
├── index.html            # Complete UI, loads styles.css then every src/*.iife.js in order, then script.js
├── script.js             # Legacy residue (~37 lines) — the migration to src/ modules is DONE, don't add logic here
├── styles.css             # Styling
├── src/                   # 16 IIFE modules — see AGENTS.md for the full map of each module's exposed functions
│   ├── config.iife.js, utils.iife.js, notifications.iife.js, state.iife.js
│   ├── clubs.iife.js              # transverse: club per participant, all modes
│   ├── players.iife.js, ui.iife.js, init.iife.js
│   ├── matches.iife.js            # Championship mode
│   ├── pools.iife.js              # Pool mode + final phase
│   ├── chrono.iife.js             # Chrono mode (biggest module)
│   ├── multisport.iife.js         # Multisport mode (mixed days, combined ranking)
│   ├── ranking.iife.js
│   └── export.iife.js, export-json.iife.js, export-print.iife.js
├── AGENTS.md              # Technical doc: full module-by-module function map
├── DEVLOG.md              # Chronological session log — read this to know current state
├── CHANGELOG.md, TODO.md, README.md, CLUBS.md, MULTISPORT.md, CONTRIBUTING.md
└── CLAUDE.md              # This file
```

No build process. ES5-compatible JavaScript for broad browser support (`var`, no
arrow functions/classes in `src/`, per `CONTRIBUTING.md`).

**Do not trust a hardcoded line count or module count anywhere in prose** (including
older text you might find in git history) — check `wc -l src/*.iife.js` or `DEVLOG.md`
for the current, real numbers instead of restating stale ones.

## Architecture Overview

### Mode Selection Is Per-Day, Not a Global Toggle

There used to be a global "Mode Chrono" checkbox. **It has been removed.** Each day
(`Journée`) now has its own type selector (Championship / Chrono), and the app auto-detects
"Multisport" the moment a competition contains days of more than one type — there is no
manual multisport toggle either. If you find code or docs referring to a global chrono
checkbox, that code path is dead; don't extend it, and flag/remove it.

**Championship days**:
- Division-based player organization (1-6 configurable divisions)
- Court assignment system (1-10 courts)
- Multiple match generation algorithms
- Optional Pool/qualification system with knockout phases
- Rankings by points, wins, goal average

**Chrono days**:
- Event-based structure (course, vélo, natation)
- Series (séries) within events, optionally with a "couloirs" (lanes) layout for swimming
- Participant management with bibs (dossards), category, and club
- Individual races or relay races (relais)
- Live timing with lap recording; a second-screen "Afficher" view can follow a race in real time
- Participant statuses: `ready` / `running` / `finished` / `DNS` / `DISQ`
- Inline editing of laps/distance/time **while a race is running**, without ending it
- Intelligent ranking types (by sport, distance, category, multi-events)

**Multisport** (`multisport.iife.js`): once a competition has both day types, an extra tab
appears with a combined ranking driven by a position-based points scale (25/19/17…) instead
of raw points, so heterogeneous events can be compared. See `MULTISPORT.md` for the full
model and UI flow.

### Core Data Structures

**Championship Mode** - Global `championship` object:
```javascript
{
  currentDay: 1,
  config: {
    numberOfDivisions: 3,  // 1-6 supported
    numberOfCourts: 4       // 1-10 supported
  },
  days: {
    [dayNumber]: {
      type: 'championship' | 'chrono',   // per-day type, see "Mode Selection" above
      players: { [division]: [{ name, club }] },   // club field added by clubs.iife.js
      matches: { [division]: [matchObjects] },
      pools: {                          // Optional, when pool mode enabled
        enabled: boolean,
        divisions: {
          [division]: {
            pools: [[players]],
            matches: [matchObjects],
            finalPhase: [matchObjects]  // Knockout/consolation brackets
          }
        }
      }
    }
  }
}
```
Stored in localStorage as `tennisTableChampionship`.

**Chrono Mode** - Global `raceData` object:
```javascript
{
  events: [
    { id, name, sportType: 'running'|'cycling'|'swimming'|'multisport', distance }
  ],
  series: [
    {
      id, name, eventId,
      sportType, distance, raceType: 'individual'|'relay',
      relayDuration,  // in minutes for relay races
      lanes: {},      // optional, swimming "couloirs" mode: lane number -> participant
      participants: [
        {
          bib, name, category, club,
          status: 'ready'|'running'|'finished'|'DNS'|'DISQ',
          time,            // total time in ms
          laps: [],        // lap history with timestamps
          totalDistance,
          lastLapStartTime
        }
      ],
      status: 'pending'|'running'|'completed',
      startTime, currentTime, isRunning, timerInterval
    }
  ],
  participants: [{ id, name, bib, category, club }],
  nextEventId, nextSerieId, nextParticipantId
}
```
Stored in localStorage as `chronoRaceData`.

## Key Architecture Patterns

### 1. Mode Separation (CRITICAL)

**Championship and Chrono data structures are independent** even though a single competition
can now mix days of both types (Multisport). Never merge their data structures directly —
`multisport.iife.js` reads from both `championship` and `raceData` to build a combined view,
but each mode still owns and saves its own data.

- Each mode has its own localStorage key
- Each mode has its own save functions

### 2. Match Collection Pattern (CRITICAL)

When calculating statistics or rankings, ALWAYS collect matches from ALL sources:

```javascript
// Collect regular matches
let playerMatches = dayData.matches[division].filter(...);

// ADD pool matches
if (dayData.pools?.enabled && dayData.pools.divisions[division]) {
    const poolMatches = dayData.pools.divisions[division].matches || [];
    playerMatches = [...playerMatches, ...poolMatches.filter(...)];
}

// ADD final phase matches
if (dayData.pools?.divisions[division]?.finalPhase) {
    const finalMatches = dayData.pools.divisions[division].finalPhase || [];
    playerMatches = [...playerMatches, ...finalMatches.filter(...)];
}
```

**Failing to include pool/final matches will produce incorrect rankings.**

### 3. Dynamic Division Support (CRITICAL)

**NEVER hardcode division counts.** The application supports 1-6 divisions dynamically configured by the user. Hardcoding division counts is the #1 most common bug in this codebase and breaks core functionality.

#### Why This Matters

When divisions are hardcoded to 3:
- Users with 4-6 divisions lose data and functionality
- Users with 1-2 divisions get errors accessing non-existent data
- Stats calculations ignore divisions beyond 3
- Rankings are incomplete and incorrect
- Exports miss data from divisions 4-6
- UI collapse/expand functionality breaks
- Import/export creates corrupted data structures

#### The Correct Pattern

**For loops iterating over divisions:**

```javascript
// ❌ WRONG - Hardcoded to 3 divisions
for (let division = 1; division <= 3; division++) {
    processData(dayData.players[division]);
}

// ✅ CORRECT - Dynamic division count
const numDivisions = championship.config?.numberOfDivisions || 3;
for (let division = 1; division <= numDivisions; division++) {
    processData(dayData.players[division]);
}
```

**Data structure initialization:**

```javascript
// ❌ WRONG - Hardcoded structure
championship.days[dayNumber] = {
    players: { 1: [], 2: [], 3: [] },
    matches: { 1: [], 2: [], 3: [] }
};

// ✅ CORRECT - Dynamic structure
const numDivisions = championship.config?.numberOfDivisions || 3;
const players = {};
const matches = {};
for (let div = 1; div <= numDivisions; div++) {
    players[div] = [];
    matches[div] = [];
}
championship.days[dayNumber] = {
    players: players,
    matches: matches
};
```

**Division validation in imports:**

```javascript
// ❌ WRONG - Hardcoded validation
if (name && [1, 2, 3].includes(division)) {
    // process player
}

// ✅ CORRECT - Dynamic validation
const numDivisions = championship.config?.numberOfDivisions || 3;
if (name && division >= 1 && division <= numDivisions) {
    // process player
}
```

#### Common Locations Where This Bug Occurs

Always check these function types:
1. **Statistics calculations** - `updateStats()`, `showStats()`, `calculatePlayerStats()`
2. **Ranking generation** - `updateRankings()`, `calculateGeneralRanking()`, `showRankings()`
3. **Data initialization** - `addNewDay()`, `emptyDay()`, `createChampionship()`
4. **Import/Export** - `importPlayers()`, `exportRanking()`, `exportToPDF()`, `exportToHTML()`
5. **Pool/Final phase** - `generatePools()`, `showManualFinalPhaseModal()`, `resetFinalPhase()`
6. **BYE management** - `detectByePlayers()`, `addByeToAll()`
7. **Day operations** - `clearDayData()`, `copyPlayers()`, `preFillFromGeneralRanking()`
8. **Display functions** - Any function that renders division-specific UI

#### Debugging Hardcoded Divisions

To find hardcoded divisions in the codebase:

```bash
# Search across the actual modules (not the empty legacy script.js)
grep -rn "division <= 3" src/
grep -rn "{ 1: \[\], 2: \[\], 3: \[\] }" src/
grep -rn "\[1, 2, 3\]" src/
```

#### Configuration Access Patterns

The division count is stored in `championship.config.numberOfDivisions`:

```javascript
// ✅ Preferred - with fallback
const numDivisions = championship.config?.numberOfDivisions || 3;

// ✅ Alternative - explicit check
const numDivisions = championship.config && championship.config.numberOfDivisions
    ? championship.config.numberOfDivisions
    : 3;

// ⚠️ Acceptable - but no fallback (risky if config is undefined)
const numDivisions = championship.config.numberOfDivisions;
```

Always use optional chaining (`?.`) and provide a sensible fallback (typically `3`).

#### When Importing Championships

When importing championship JSON data, ALWAYS respect the imported `numberOfDivisions`:

```javascript
// ✅ CORRECT
const importedData = JSON.parse(jsonString);
if (importedData.config?.numberOfDivisions) {
    championship.config.numberOfDivisions = importedData.config.numberOfDivisions;
}
// Now all subsequent operations use the correct count
```

#### Testing for This Bug

To verify a function handles divisions correctly:
1. Configure championship with 6 divisions
2. Add players to divisions 4, 5, 6
3. Run the function
4. Verify divisions 4-6 are processed (check stats, rankings, exports)
5. Repeat with 1 division to ensure no errors accessing undefined divisions 2-3

#### Historical Context

This bug affected 15+ functions in a January 2025 audit, causing:
- Export PDF/HTML buttons to fail
- Division 2 collapse/expand to break in match preview
- Stats to ignore divisions 4-6
- Rankings to be incomplete
- Data corruption on import for 4-6 division championships

**Always assume division count is dynamic. Never assume 3.**

### 4. Data Merging for Edits

When editing series/events with existing timing data, use `mergeSerieData()`:

```javascript
function mergeSerieData(oldSerie, newData) {
    // If serie has timing data (running/completed), preserve it
    if (oldSerie && (oldSerie.status === 'running' || oldSerie.status === 'completed')) {
        return {
            ...oldSerie,              // Keep all existing data
            name: newData.name,       // Update metadata only
            participants: newData.participants,
            eventId: newData.eventId
        };
    }
    return { ...newData };
}
```

**Never overwrite** `status`, `startTime`, `currentTime`, `participants[].time`, `participants[].laps`.
This also applies to the inline lap/distance/time editing added in Sept 2026: it must patch
the running serie in place, not go through a code path that treats the serie as freshly created.

### 5. Relay Auto-Detection (Smart Feature)

In relay races, when user enters a bib number without "L" prefix:
- If `currentTime < relayDuration` → automatically record as LAP
- If `currentTime >= relayDuration` → automatically record as FINISH
- User can override by prefixing with "L" to force LAP

This eliminates the need to type "L" for every lap during a 60-minute relay.

### 6. Keyboard-First Navigation

Match score inputs support rapid keyboard entry:
- **Tab**: Move to next field (score1 → score2 → next match score1)
- **Enter**: Complete current match + auto-jump to next match + save

Implemented in `handlePoolMatchEnter()` and `handleManualMatchEnter()`. Uses `setTimeout(100)` to allow DOM refresh before focusing next input.

## Important Functions by Feature

See `AGENTS.md` for the exhaustive module-by-module map of exposed `window` functions. Highlights:

### Championship Management
- `addNewDay()` - Creates new tournament day with proper structure
- `generateMatches(dayNumber, division, type)` - Types: 'round-robin', 'optimized', 'court', 'swiss'
- `calculatePlayerStats(dayNumber, division, playerName)` - Must include pool/final matches
- `calculateGeneralRanking()` - Aggregates across all days and divisions (handles pure-championship, pure-chrono, and mixed/multisport competitions)
- `preFillFromGeneralRanking(dayNumber)` - J2+ only, distributes players by rank

### Pool System
- `togglePoolSection(dayNumber)` - Show/hide pool controls (default hidden)
- `generatePools(dayNumber, division)` - Creates balanced pools from division players
- `generateFinalPhase(dayNumber, division)` - Creates knockout/consolation from qualified players (with a barrage round instead of a BYE-saturated round when needed)

### Chrono/Timing
- `toggleRaceTimer(serieId)` - Start/pause timer, MUST call `saveChronoToLocalStorage()`
- `quickFinishInput()` - Processes bib entry, handles LAP/FINISH detection
- `recordLap(serie, participant)` - Records intermediate lap time
- `finishParticipant(serie, participant)` - Records final time
- `mergeSerieData(oldSerie, newData)` - Preserves timing when editing series
- `displayRaceInterface()` - Live race screen; also the "Afficher" second-screen entry point

### Clubs (transverse)
- `window.clubsModule.getClubsList()` / `addClub(name)` - see `CLUBS.md`

### Multisport
- Combined ranking with position-based points scale — see `MULTISPORT.md`
- Bulk-add checked participants to a serie, incl. `bib<TAB>` pasted lists

### Rankings
- `showChronoRankingTypeModal()` - Analyzes completed events, shows relevant ranking types
- `generateRankingBySport/ByDistance/ByCategory()` - Specialized ranking algorithms
- `showChronoPdfConfigModal()` - Customizable PDF export (title, columns)
- Similar-name detection (similarity score, transpositions, stray spaces) to catch duplicate players before ranking

### Persistence
- `saveToLocalStorage()` - Championship → `tennisTableChampionship`
- `saveChronoToLocalStorage()` - Chrono → `chronoRaceData`
- Auto-called after every data modification

## UI/UX Design Principles

### Compact Design Philosophy
- **Max padding**: 15px
- **Font sizes**: 12-14px (not larger)
- **Button padding**: 8px 12px
- **Modal max-height**: 85-90vh with `overflow-y: auto`
- **Sticky buttons**: Use `position: sticky; bottom: 0` in modals to keep action buttons visible
- **Hidden by default**: Advanced features (pools) behind toggle buttons

### Color Palette (Consistent)
- **Turquoise**: `#16a085`, `#1abc9c` - Chrono mode features
- **Blue**: `#3498db`, `#2980b9` - Primary actions
- **Orange**: `#f39c12`, `#e67e22` - Secondary actions
- **Green**: `#27ae60`, `#2ecc71` - Success/validation
- **Red**: `#e74c3c`, `#c0392b` - Delete/danger
- **Gray**: `#2c3e50`, `#34495e` - Headers

**Avoid purple/pink** (removed during color harmonization).

### HTML Generation Consistency
Multi-day content uses `generateDayContentHTML(dayNumber)` to ensure:
- Identical styling across J1, J2, J3... (padding, font-size, max-width: 800px)
- Compact button text: "Copier joueurs J2" → "Copier J2"
- `flex-wrap: wrap` on button containers to prevent overflow

## Common Pitfalls (MUST AVOID)

1. **❌ Hardcoding division counts** - Always use `config.numberOfDivisions`
2. **❌ Forgetting pool/final matches in rankings** - Use the Match Collection Pattern
3. **❌ Overwriting timing data when editing series** - Use `mergeSerieData()`
4. **❌ Mixing championship and chrono data structures** - They stay separate even in Multisport competitions; only read across them, never merge in place
5. **❌ Forgetting to save** - Call `saveToLocalStorage()` or `saveChronoToLocalStorage()` after changes
6. **❌ Excessive spacing** - Follow compact design (≤15px padding)
7. **❌ Not preserving existing HTML IDs** - When modifying UI, maintain IDs for event handlers
8. **❌ Writing new logic into `script.js`** - The migration is done; add new code to the relevant `src/*.iife.js` module (or a new one)
9. **❌ Referring to the removed global "Mode Chrono" checkbox** - selection is per-day now
10. **❌ Finishing a session without updating the docs** - see the protocol right below; this is exactly how this file went stale for 2.5 years

## Testing Scenarios

**Championship Mode:**
1. Configure 4 divisions, add players across divisions
2. Generate matches using each algorithm (Round-Robin, Optimized, Court, Swiss)
3. Complete matches via keyboard (Tab/Enter workflow)
4. Enable pool mode → Generate pools → Complete pool matches
5. Generate final phase → Complete knockout matches
6. View rankings (by day, general) - verify pool matches are counted
7. Create J2 → Use "Pré-remplir depuis Classement Général"
8. Export/Import championship JSON

**Chrono Mode:**
1. Add participants with bibs (dossards) and clubs
2. Create event (running/cycling/swimming) → Create series
3. Add participants to series (individually, in bulk, or via bib+tab paste)
4. Start timer → Record laps (relay) or finish (individual); for swimming, try lane ("couloirs") mode with keys 1-9
5. Test relay auto-detection: bib entry before/after relay duration
6. Edit series while timing data exists → Verify chronos preserved
7. Edit laps/distance/time inline **while the race is running** → verify it does not end the race
8. Set a participant to DISQ → verify it's excluded/flagged correctly in rankings
9. View different ranking types (by sport, distance, category, multi-events)
10. Export PDF with custom title and column selection

**Multisport:**
1. Create a competition with at least one Championship day and one Chrono day
2. Verify the "🌐 Multisport" tab appears automatically
3. Bulk-add checked participants to a serie, and via bib+tab paste
4. Open the "Afficher" second-screen view and verify it updates live
5. Verify the combined ranking uses the position-based points scale

## Development Notes

- **No transpilation**: Vanilla JavaScript, compatible with older browsers
- **Manual JSON import/export**: Used for data portability between instances
- **Notifications**: Use inline styles (not CSS classes) for guaranteed visibility via `showNotification(message, type)`
- **Console logging**: Extensive console.log for debugging - check browser console

## Protocole de fin de session (obligatoire pour tout agent, Claude ou humain)

Ce projet est développé en solo/à quelques mains sur de longues périodes entre deux sessions.
Sans ce protocole, la doc dérive silencieusement du code — c'est précisément ce qui s'est
passé entre 2024-02-02 et 2026-09, où `CHANGELOG.md`/`TODO.md`/`AGENTS.md` décrivaient encore
l'état du tout début du refactoring pendant que 50+ commits changeaient l'appli en profondeur.

**Avant de considérer une session terminée** (fin de tâche, fin de debug, fin de feature —
peu importe la taille du changement dès qu'un commit est fait) :

1. **Ajouter une entrée à `DEVLOG.md`** (créer le fichier s'il n'existe pas encore — modèle
   en tête de ce fichier). Une entrée minimale contient : la date, un résumé en une ou deux
   phrases de ce qui a été fait/débogué, les fichiers ou modules touchés, et le hash ou la
   référence du/des commit(s). C'est la trace que le prochain dev (ou agent) doit pouvoir lire
   en priorité pour savoir où en est le projet sans relire tout l'historique git.
2. **Mettre à jour `CHANGELOG.md`** si le changement est visible pour l'utilisateur final
   (nouvelle fonctionnalité, correction de bug, changement de comportement). Ajouter l'entrée
   sous une section `[Unreleased]` ou une nouvelle version mineure, en haut du fichier.
3. **Mettre à jour `AGENTS.md`** si un module est ajouté, renommé, scindé, ou si des fonctions
   exposées sur `window` changent.
4. **Mettre à jour `TODO.md`** : cocher les tâches terminées, retirer celles devenues
   obsolètes, ajouter les nouvelles.
5. **Mettre à jour ce fichier (`CLAUDE.md`)** si le changement touche un pattern décrit
   ci-dessus (structures de données, pièges connus, mode de sélection des journées, etc.).

Ces mises à jour de documentation doivent être **incluses dans le(s) même(s) commit(s)** que
le changement de code, pas laissées "pour plus tard" — c'est justement le "plus tard" qui n'a
jamais eu lieu la dernière fois.
