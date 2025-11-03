# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Gestionnaire de Championnats** - A single-page web application for managing sports competitions with two distinct modes:
1. **Championship Mode** (Mode Championnat) - Multi-day tournament management for table tennis
2. **Chrono Mode** (Mode Chrono) - Race timing system for running, cycling, swimming events

Built with vanilla JavaScript, HTML, and CSS. No build system, no external dependencies. Runs entirely client-side with localStorage persistence.

## Running the Application

Open `index.html` in a web browser. That's it. All functionality runs client-side.

## Architecture Overview

### Dual-Mode System (Mutually Exclusive)

The application operates in one of two modes, toggled via the "Mode Chrono" checkbox:

**Championship Mode** (default):
- Multi-day tournament structure (Journée 1, 2, 3...)
- Division-based player organization (1-6 configurable divisions)
- Court assignment system (1-10 courts)
- Multiple match generation algorithms
- Pool/qualification system with knockout phases
- Rankings by points, wins, goal average

**Chrono Mode**:
- Event-based structure (course, vélo, natation, multisport)
- Series (séries) within events
- Participant management with bibs (dossards) and categories
- Individual races or relay races (relais)
- Live timing with lap recording
- Intelligent ranking types (by sport, distance, category, multi-events)

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
      players: { [division]: [playerNames] },
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
      participants: [
        {
          bib, name, category,
          status: 'ready'|'running'|'finished',
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
  participants: [{ id, name, bib, category }],
  nextEventId, nextSerieId, nextParticipantId
}
```
Stored in localStorage as `chronoRaceData`.

## Key Architecture Patterns

### 1. Mode Separation (CRITICAL)

**Championship and Chrono modes are completely independent.** Never mix data structures.

When mode changes (`toggleChronoMode()`):
- Championship UI elements are hidden (tabs, divisions, courts, apply button)
- Chrono UI section is shown (events, series, timing interface)
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

**Never hardcode division counts.** The application supports 1-6 divisions dynamically.

```javascript
// WRONG
for (let div = 1; div <= 3; div++) { ... }

// CORRECT
const numDivisions = config.numberOfDivisions;
for (let div = 1; div <= numDivisions; div++) { ... }
```

When importing championships, respect `championship.config.numDivisions` from the JSON.

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
- `toggleRaceTimer(serieId)` - Start/pause timer, MUST call `saveChronoToLocalStorage()`
- `quickFinishInput()` - Processes bib entry, handles LAP/FINISH detection
- `recordLap(serie, participant)` - Records intermediate lap time
- `finishParticipant(serie, participant)` - Records final time
- `mergeSerieData(oldSerie, newData)` - Preserves timing when editing series

### Rankings
- `showChronoRankingTypeModal()` - Analyzes completed events, shows relevant ranking types
- `generateRankingBySport/ByDistance/ByCategory()` - Specialized ranking algorithms
- `showChronoPdfConfigModal()` - Customizable PDF export (title, columns)

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
4. **❌ Mixing championship and chrono data** - Completely separate systems
5. **❌ Forgetting to save** - Call `saveToLocalStorage()` or `saveChronoToLocalStorage()` after changes
6. **❌ Excessive spacing** - Follow compact design (≤15px padding)
7. **❌ Not preserving existing HTML IDs** - When modifying UI, maintain IDs for event handlers

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
├── index.html        # Complete UI (7000+ lines)
├── script.js         # All logic (10000+ lines, no modules)
├── styles.css        # Styling
├── testpool.json     # Sample pool mode data (24 players, 3 divisions)
└── CLAUDE.md         # This file
```

No build process. ES5-compatible JavaScript for broad browser support.

## Development Notes

- **File size**: `script.js` is ~10,000 lines - be mindful of context when making changes
- **No transpilation**: Vanilla JavaScript, compatible with older browsers
- **Manual JSON import/export**: Used for data portability between instances
- **Notifications**: Use inline styles (not CSS classes) for guaranteed visibility via `showNotification(message, type)`
- **Console logging**: Extensive console.log for debugging - check browser console
