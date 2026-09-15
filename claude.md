# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Gestionnaire de Championnats** - A single-page web application for managing sports competitions. Each **day** (Journée) of the championship independently runs one of two types:
1. **Championship type** (Mode Championnat) - Match-based tournament day for table tennis (divisions, courts, pools/knockout)
2. **Chrono type** (Mode Courses) - Race timing day for running, cycling, swimming events

A third, read-only **Multisport tab** appears automatically whenever the championship contains at least one day of each type (or at least one Chrono day) — it shows a combined ranking across both day types. There is no longer a global mode toggle.

Built with vanilla JavaScript, HTML, and CSS. No build system, no external dependencies. Runs entirely client-side with localStorage persistence. Logic lives in ~16 IIFE modules under `src/` (see "File Structure" below) — `script.js` at the repo root is legacy and now only handles dark mode (37 lines).

## Running the Application

Open `index.html` in a web browser. That's it. All functionality runs client-side.

## Architecture Overview

### Per-Day Type System

Each day's type is chosen independently via a selector in that day's UI, stored as `championship.days[dayNumber].dayType` (`'championship'` or `'chrono'`, default `'championship'` when absent). Changing it shows/hides that day's `championship-section-N` / `chrono-section-N` blocks. Managed by `setDayType(dayNumber, type)` in `multisport.iife.js`.

- **Championship-type day**: division-based player organization (1-6 configurable divisions), court assignment (1-10 courts), multiple match generation algorithms, pool/qualification system with knockout phases, rankings by points/wins/goal average.
- **Chrono-type day**: events → series structure, participant management with bibs (dossards) and categories/clubs, individual/relay/interclub races, live timing with lap recording, per-day ranking + PDF export.
- **Multisport tab**: appears automatically (`updateMultisportTabVisibility()`) once the championship mixes day types, or has any Chrono day. Shows a combined ranking (`calculateMultisportRanking()` / `renderMultisportRanking()` in `multisport.iife.js`) using a position-based point scale across both day types.

### Core Data Structures

Single global `championship` object, keyed by day:
```javascript
{
  currentDay: 1,
  config: {
    numberOfDivisions: 3,  // 1-6 supported
    numberOfCourts: 4       // 1-10 supported
  },
  days: {
    [dayNumber]: {
      dayType: 'championship' | 'chrono',   // per-day type, see above
      players: { [division]: [playerNames] },   // Championship-type day
      matches: { [division]: [matchObjects] },  // Championship-type day
      pools: {                          // Optional, when pool mode enabled
        enabled: boolean,
        divisions: {
          [division]: {
            pools: [[players]],
            matches: [matchObjects],
            finalPhase: [matchObjects]  // Knockout/consolation brackets
          }
        }
      },
      chronoData: {                     // Chrono-type day
        events: [{ id, name, sportType: 'running'|'cycling'|'swimming', distance }],
        series: [
          {
            id, name, eventId, sportType, distance,
            raceType: 'individual'|'relay'|'interclub',
            relayDuration,        // minutes, for relay races
            interclubPoints,      // points scale, for interclub races
            participants: [
              { bib, name, club, category, status: 'ready'|'running'|'finished'|'DNS'|'DISQ',
                time, laps: [], totalDistance, lastLapStartTime }
            ],
            results: [{ bib, name, category, time, totalDistance }], // snapshot post-course, voir note ci-dessous
            status: 'pending'|'running'|'completed',
            startTime, currentTime, isRunning
          }
        ],
        participants: [{ id, name, bib, category, club }],
        nextEventId, nextSerieId, nextParticipantId
      }
    }
  }
}
```
Stored in localStorage as `tennisTableChampionship` (one key for everything — Championship and Chrono data both live inside `championship.days[n]`).

**Internal bridge (do not confuse with the above):** when a Chrono-type day's race is actually running, `startChronoRaceForDay()` (`ui.iife.js`) copies that day's `chronoData` into a separate global `raceData` object (legacy shape, `chrono.iife.js`) so the live timing engine (`displayRaceInterface()`, timer, lap recording) can run against it; `saveRaceResultsToDay()` copies the results back into `championship.days[n].chronoData` when the race ends. `raceData` is saved separately as `chronoRaceData` in localStorage but is **not** the source of truth — treat it as scratch space for the running race only. A large legacy standalone Chrono menu that used to read/write `raceData` directly was removed (see issue #65 on GitHub) because it had become unreachable from the UI; only the live-race bridge functions and `printChronoCompetition()` still use `raceData`.

## Key Architecture Patterns

### 1. Mode Separation (CRITICAL)

**Championship and Chrono modes are completely independent.** Never mix data structures.

Note (2026-09): the old global `toggleChronoMode()` / checkbox toggle described
here has been removed — mode is now chosen per day via a type selector
(`setDayType(dayNumber, type)` in `multisport.iife.js`), which shows/hides the
`championship-section-N` / `chrono-section-N` blocks for that specific day.
See issue #65 for the cleanup of the old global Chrono menu.
- Each mode has its own localStorage key (or its own sub-object per day)
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
# Search for hardcoded loops
grep -n "division <= 3" script.js

# Search for hardcoded structures
grep -n "{ 1: \[\], 2: \[\], 3: \[\] }" script.js

# Search for hardcoded validation
grep -n "\[1, 2, 3\]" script.js
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

### Championship Management
- `addNewDay()` - Creates new tournament day with proper structure
- `generateMatches(dayNumber, division, type)` - Types: 'round-robin', 'optimized', 'court', 'swiss'
- `calculatePlayerStats(dayNumber, division, playerName)` - Must include pool/final matches
- `calculateGeneralRanking()` - Aggregates across all days and divisions
- `preFillFromGeneralRanking(dayNumber)` - J2+ only, distributes players by rank

### Pool System
- `togglePoolSection(dayNumber)` - Show/hide pool controls (default hidden)
- `generatePools(dayNumber, division)` - Creates balanced pools from division players
- `generateFinalPhase(dayNumber, division)` - Creates knockout/consolation from qualified players

### Chrono/Timing
- `startChronoRaceForDay(dayNumber, serieId)` (`ui.iife.js`) - Entry point: bridges `championship.days[n].chronoData` into `raceData`, then opens the live race UI. Every event/serie it creates in `raceData` is tagged `dayNumber`, and lookups filter on it too — required so an id reused after "Vider la journée" doesn't resurrect a stale cached entry (see Common Pitfall #11)
- `toggleRaceTimer()` / `recordLap(bib)` / `finishParticipant(bib)` (`chrono.iife.js`, no dayNumber param) - Lower-level engine operating on `raceData.currentSerie`, MUST call `saveChronoToLocalStorage()`. `recordLap`/`finishParticipant` also log an undoable entry to `serie.actionLog` (see below) and `recordLap` plays a confirmation beep (`playLapBeep()`, Web Audio, degrades silently if unavailable)
- `backToSeriesList()` (`chrono.iife.js`) - "⬅️ Retour aux séries" button and end of `endSerie()`: persists progress then repaints the day's series list via `refreshChronoDisplay()`
- `undoRaceAction(actionId)` / `toggleActionHistoryPanel()` / `renderActionHistoryPanel()` (`chrono.iife.js`) - Action history side panel ("🕘 Historique") on the live race screen. Each LAP/FINISH captures a per-participant snapshot *before* the mutation; undoing an older entry cascades (undoes it and everything logged after it, replayed newest-first) so totals stay consistent regardless of interleaving between participants
- `openLiveRaceDisplayWindow()` / `buildLiveRaceDisplayContentHTML()` (`chrono.iife.js`) - "🖥️ Afficher" popup (spectator display), auto-refreshed via `postMessage` round-trip every 3s; also the "Classement Multisport" popup (`openMultisportRankingInNewWindow()` in `ui.iife.js`, 5s) uses the identical pattern
- `saveRaceResultsToDay()` (`ui.iife.js`) - Copies `raceData` results back into `championship.days[n].chronoData` when a race ends
- `mergeSerieData(oldSerie, newData)` - Preserves timing when editing series
- **Categories (Solo/Équipe, multiple categories within one race)**: a participant's `category` field is set at day-pool import (`saveBulkParticipantsForDay`) or when adding to a serie (`bulkAddParticipantsToSerie`, `addParticipantToSerie`, `addExistingParticipantToSerie` — all four propagate it; earlier bugs where some of them silently dropped it are fixed). `assignCategoryRanks(arr)` (`multisport.iife.js`) adds `catRank`/`catTotal`/`hasMultipleCategories` to an already-sorted ranking array; a "Catégorie" column only renders when `hasMultipleCategories` is true (2+ distinct non-empty categories). All three chrono ranking views must call it: `generateRaceRanking()` and `buildLiveRaceDisplayContentHTML()` (`chrono.iife.js`), and `showSerieRanking()` (`multisport.iife.js`) — a view added later without this call will silently show no category column, which happened once already (the "🖥️ Afficher" popup, fixed)

### Rankings
- `calculateMultisportRanking()` / `renderMultisportRanking()` (in `multisport.iife.js`) - Combined ranking across Championship + Chrono days
- `showChronoPdfConfigModal()` - Customizable PDF export (title, columns)
- Note: `showChronoRankingTypeModal()` and its `generateRankingBySport/ByDistance/ByCategory()` cluster (in `chrono.iife.js`) belonged to the removed global Chrono menu — see issue #65

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
4. **❌ Dropping `dayType`/`pools`/`chronoData` when resetting a day** - Rebuilding `championship.days[n]` from scratch (e.g. a "clear day" action) must preserve `dayType` and reset `pools`/`chronoData` to empty structures, not omit them — omitting silently reverts the day to Championship type and destroys pool/chrono data without warning (was a real bug, fixed — see issue #58, `clearDayData()` in `ui.iife.js`)
5. **❌ Forgetting to save** - Call `saveToLocalStorage()` (Championship, including `chronoData` nested in it) or `saveChronoToLocalStorage()` (the separate `raceData` bridge, live race only) after changes
6. **❌ Excessive spacing** - Follow compact design (≤15px padding)
7. **❌ Not preserving existing HTML IDs** - When modifying UI, maintain IDs for event handlers
8. **❌ Assuming a function is dead (or alive) without grepping its exact name across all of `src/` and `index.html`** - this codebase has multiple generations of the same feature coexisting (global vs per-day); a plausible-sounding function name is not evidence either way
9. **❌ Committing without running `npm test`** - see "Automated Tests" above; grep confirms reachability, `npm test` confirms behavior still works
10. **❌ Adding a field to `serie.participants` without also adding it to `serie.results`** - `saveRaceResultsToDay()` (`ui.iife.js`) builds `serie.results` as a separate flattened snapshot consumed by `showSerieRanking`/`printChronoCompetition`/`getSerieRanking`; a field only on `participants` (e.g. `category`) silently disappears from the post-race ranking. This exact bug existed for `category` until it was fixed alongside the multi-category ranking feature (`assignCategoryRanks()` in `multisport.iife.js`) — check both places whenever you add a per-participant field.
11. **❌ Removing an onclick's target function based only on grepping `index.html`** - `tests/unit/htmlOnclickIntegrity.test.js` only scans the *static* HTML in `index.html`. A huge amount of this app's UI is HTML generated as JS template strings inside `src/*.iife.js` (modals, race screens, series cards...) and never appears in `index.html` at all. Deleting a function because it "looks unreachable from index.html" can still break a live `onclick=""` embedded in a template string elsewhere — this happened twice for real (`backToSeriesList()`, `removeParticipantFromSerie()`). `tests/unit/dynamicOnclickIntegrity.test.js` covers this second surface — always let it run (it's part of `npm test`), and when adding a new dynamically-generated `onclick`, don't rely on memory that the target function exists.
12. **❌ Assuming `raceData` (the live-race bridge, `chrono.iife.js`) entries are safe to look up by id alone** - `raceData.events`/`raceData.series` persist for the whole session (and across page reloads via `chronoRaceData` in localStorage), but the ids they're keyed by (`chronoData.nextEventId`/`nextSerieId`) are local to each day and get reset to 1 by `clearDayData()` ("Vider la journée"). Every entry created in `raceData` must be tagged `dayNumber`, and every lookup must filter on it too — otherwise a freshly created event/serie can resurrect an old cached entry's stale progress (real bug, fixed in `startChronoRaceForDay`/`clearDayData`, `ui.iife.js`). Same caution applies to any other bridge/cache object that outlives a single day's data.

## Automated Tests (run before every commit)

```bash
npm test                    # Jest suite (tests/unit/), jsdom environment
npm run check:duplicates    # standalone duplicate-function-definition check
```

`npm test` already includes the duplicate-function check (`noDuplicateFunctions.test.js`), so running `npm test` alone is enough day to day — `check:duplicates` is only useful for its more readable standalone CLI output when triaging a specific file.

**Any code change — bug fix, dead-code removal, refactor — must end with a
green `npm test` before it's considered done.** This is not optional: several
bugs found in this codebase (`clearDayData` losing `dayType`, the
`generateInterclubRanking` duplicate silently breaking the live interclub
ranking) were only caught because a test was written for them, and a
duplicate-function bug has recurred at least four times in this codebase
(`pools.iife.js`, `chrono.iife.js` ×2, `multisport.iife.js`) — `npm test`
catches new occurrences automatically instead of relying on someone noticing.

When you fix a bug, add a regression test for it in `tests/unit/` (see
`clearDayData.test.js` or `interclubRanking.test.js` for the pattern: load
only the modules you need via `tests/helpers/loadApp.js`, reproduce the
broken state, assert the fix). When you delete code you believe is dead,
verify with `npm test` (in particular `htmlOnclickIntegrity.test.js`, which
checks every `onclick="..."` in `index.html` still resolves to a real
function) before and after — a passing suite before deletion that still
passes after is the actual evidence the deletion was safe, not just the grep
that justified it.

See `CONTRIBUTING.md` for how to add new tests and `tests/helpers/loadApp.js`
for how modules are loaded (no ES modules/bundler in this project — the test
harness runs the same `src/*.iife.js` files index.html loads, in the same
order).

## Testing Scenarios (manual, no automation for these yet)

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
1. Add participants with bibs (dossards)
2. Create event (running/cycling/swimming) → Create series
3. Add participants to series
4. Start timer → Record laps (relay) or finish (individual)
5. Test relay auto-detection: bib entry before/after relay duration
6. Edit series while timing data exists → Verify chronos preserved
7. View different ranking types (by sport, distance, category, multi-events)
8. Export PDF with custom title and column selection

## File Structure

```
├── index.html              # Complete UI (~1000 lines after dead-code cleanup)
├── script.js               # Legacy bootstrap — dark mode only (37 lines), NOT the app logic
├── styles.css               # Styling
├── src/                     # All application logic (16 IIFE modules, ~30k lines total)
│   ├── config.iife.js       # Global config (divisions, courts)
│   ├── utils.iife.js        # Pure helper functions
│   ├── notifications.iife.js # Toast notifications
│   ├── state.iife.js        # championship object + localStorage persistence
│   ├── clubs.iife.js        # Club management
│   ├── multisport.iife.js   # Per-day type selector, Multisport combined ranking, per-day Chrono UI (the largest, most-load-bearing module — ~3700 lines)
│   ├── players.iife.js      # Player management (Championship-type days)
│   ├── ui.iife.js           # Tabs/days, addNewDay/removeDay/clearDayData, Chrono↔raceData bridge (startChronoRaceForDay, saveRaceResultsToDay)
│   ├── matches.iife.js      # Match generation & scoring (Championship-type days)
│   ├── pools.iife.js        # Pool system + knockout phases (largest file, ~7200 lines)
│   ├── ranking.iife.js      # Championship rankings/statistics
│   ├── export-json.iife.js  # Championship JSON export/import
│   ├── export-print.iife.js # Print/PDF (match sheets, recaps)
│   ├── chrono.iife.js       # Live race timing engine (raceData, displayRaceInterface, timer/laps) — used as backend by multisport.iife.js's per-day Chrono UI; its old standalone global menu was removed, see issue #65 on GitHub
│   └── init.iife.js         # App bootstrap, loaded last
└── claude.md                 # This file
```
Load order in `index.html` matters (later scripts can override earlier `window.x =` assignments of the same name — this has bitten this codebase before, see the `export.iife.js` removal in issue #64 on GitHub). `multisport.iife.js` loads early (after `clubs.iife.js`) but many of its functions are only called from HTML generated later at runtime, so load order alone doesn't tell you what's reachable — check actual callers.

No build process. ES5/ES6-mixed vanilla JavaScript.

## Development Notes

- **Where the logic actually is**: `src/*.iife.js`, not `script.js` (see File Structure above)
- **This file can drift from reality**: this codebase has repeatedly grown new per-day/Multisport functions alongside old global-mode equivalents without removing the old ones (see issues #64, #65 on GitHub). Before assuming a function is used or dead, grep its exact name across all of `src/` and `index.html` — don't trust a description here or in `AGENTS.md` without checking
- **No transpilation**: Vanilla JavaScript, compatible with older browsers
- **Manual JSON import/export**: Used for data portability between instances
- **Notifications**: Use inline styles (not CSS classes) for guaranteed visibility via `showNotification(message, type)`
- **Console logging**: Extensive console.log for debugging - check browser console
- **Run `npm test` before considering any change done** — see "Automated Tests" above. A change without a green test run is not finished, regardless of how confident the grep/manual check felt.
