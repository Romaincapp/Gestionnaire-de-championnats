/**
 * Script Node.js pour générer un JSON propre de natation
 * avec séries pré-configurées par couloirs (5 nageurs, plus rapide au milieu)
 *
 * Usage: node generate-clean-json.js "natation test 2.json"
 */

const fs = require('fs');
const path = require('path');

// === CONFIGURATION ===
const LANES_PER_SERIE = 5;
const LANE_ORDER = { 3: [2,3,1], 4: [2,3,1,4], 5: [3,4,2,5,1], 6: [3,4,2,5,1,6], 7: [4,5,3,6,2,7,1], 8: [4,5,3,6,2,7,1,8] };

// Clubs connus (triés par longueur décroissante)
const KNOWN_CLUBS = [
    'Cordée Sport Ifa Bouge', 'Cordee Sports', 'Aquaphile Saja', 'Carpe Mosane',
    'Gai Séjour', 'Marthe Et Marie', 'Sra Goélands', 'SRA Goélands',
    'Batoulu', 'Boulaie', 'Trucket', 'Renards', 'Apris', 'Jalon'
].sort((a, b) => b.length - a.length);

// === PARSING ===
function parseSwimmingTime(text) {
    if (!text) return { timeMs: 0, timeStr: '' };
    text = text.replace(/:\s+/g, ':');

    const patterns = [
        { r: /(\d{1,2}):(\d{1,2}):(\d{2})[,.](\d{1,3})/, fn: m => {
            const [, h, min, sec, frac] = m.map(Number);
            const fracMs = m[4].length === 3 ? frac : m[4].length === 2 ? frac * 10 : frac * 100;
            if (h === 0) return min * 60000 + sec * 1000 + fracMs;
            return h * 60000 + min * 1000 + sec * 10;
        }},
        { r: /(\d{1,2}):(\d{1,2}):(\d{2})/, fn: m => {
            const [, a, b, c] = m.map(Number);
            if (a === 0) return b * 60000 + c * 1000;
            const asHMS = a * 3600 + b * 60 + c;
            if (asHMS > 300) return a * 60000 + b * 1000 + c * 10;
            return asHMS * 1000;
        }},
        { r: /(\d{1,2}):(\d{2})[,.](\d{1,2})/, fn: m => {
            const min = +m[1], sec = +m[2], frac = m[3];
            const fracMs = frac.length === 1 ? +frac * 100 : +frac * 10;
            return min * 60000 + sec * 1000 + fracMs;
        }},
        { r: /(\d{1,2})\.(\d{2})\.(\d{2})/, fn: m => (+m[1]) * 60000 + (+m[2]) * 1000 + (+m[3]) * 10 },
        { r: /(\d{1,2}),(\d{2}),(\d{2})/, fn: m => (+m[1]) * 60000 + (+m[2]) * 1000 + (+m[3]) * 10 }
    ];

    for (const { r, fn } of patterns) {
        const match = text.match(r);
        if (match) return { timeMs: fn(match), timeStr: match[0] };
    }
    return { timeMs: 0, timeStr: '' };
}

function parseSwimmingEntry(rawName) {
    let text = rawName
        .replace(/\.\s+/g, ' ')
        .replace(/\s+\.\s+/g, ' ')
        .replace(/\.([A-Za-z\u00C0-\u017F])/g, ' $1')
        .replace(/([a-z\u00e9\u00e8\u00ea])(\d)/gi, '$1 $2')  // "Brasse0:01" → "Brasse 0:01"
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\.\s*$/, '');

    // Traiter "(bord)" comme nage assistée
    if (/\(bord\)/i.test(text) && !/(brasse|dos|libre|assist)/i.test(text)) {
        text = text.replace(/\(bord\)/i, 'Assisté');
    }

    const strokeRegex = /(brasse|dos|libre|assist[e\u00e9\u00e8]\w*|asssit[e\u00e9\u00e8]\w*)/i;
    const strokeMatch = text.match(strokeRegex);
    if (!strokeMatch) return null;

    let stroke = strokeMatch[1].toLowerCase();
    if (stroke.match(/^ass/)) stroke = 'assisté';

    const distRegex = /\b(\d+)\s*(?:m[e\u00e8]tres?|m)\b/i;
    const distMatch = text.match(distRegex);
    if (!distMatch) return null;

    const distance = parseInt(distMatch[1]);
    if (distance !== 25 && distance !== 50) return null;

    const timeResult = parseSwimmingTime(text);

    let remaining = text;
    if (timeResult.timeStr) remaining = remaining.replace(timeResult.timeStr, ' ');
    remaining = remaining.replace(new RegExp(strokeMatch[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), ' ');
    remaining = remaining.replace(/(brasse|dos|libre|assist[e\u00e9\u00e8]\w*|asssit[e\u00e9\u00e8]\w*)/gi, ' ');
    remaining = remaining.replace(distRegex, ' ');
    remaining = remaining.replace(/\(bord\)/gi, ' ').replace(/\bLent\b/i, ' ');
    // Retirer résidus numériques orphelins
    remaining = remaining.replace(/\b\d{1,2}:\s*\d{1,2}[,.:]\s*\d{1,3}\b/g, ' ');
    remaining = remaining.replace(/\b\d{1,2}[:.]\d{2}[:.]\d{2}\b/g, ' ');
    remaining = remaining.replace(/\b\d{1,2}:\d{2}\b/g, ' ');
    remaining = remaining.replace(/[.,]+\s*/g, ' ').replace(/\s+/g, ' ').trim();

    let club = '', swimmerName = remaining;
    for (const c of KNOWN_CLUBS) {
        const escaped = c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const clubRegex = new RegExp('^' + escaped + '\\s*', 'i');
        if (clubRegex.test(remaining)) {
            club = c;
            swimmerName = remaining.replace(clubRegex, '').trim();
            break;
        }
    }

    swimmerName = swimmerName.replace(/^\s*[.,]\s*/, '').replace(/\s*[.,]\s*$/, '').trim();
    if (swimmerName) {
        swimmerName = swimmerName.split(' ').map(w => w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : '').join(' ');
    }

    return { club, swimmerName, distance, stroke, timeMs: timeResult.timeMs, rawName };
}

function matchEntryToEvent(entry, events) {
    for (const evt of events) {
        const evtName = evt.name.toLowerCase().replace(/\s+/g, ' ');
        const hasDistance = evtName.includes(entry.distance + 'm') || evtName.includes(entry.distance + ' m');
        if (!hasDistance) continue;
        const normalizedStroke = entry.stroke === 'assisté' ? 'assist' : entry.stroke;
        if (evtName.includes(normalizedStroke)) return evt;
    }
    return null;
}

function formatMs(ms) {
    if (!ms) return '?';
    const totalSec = ms / 1000;
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return min > 0 ? `${min}:${sec < 10 ? '0' : ''}${sec.toFixed(2)}` : `${sec.toFixed(2)}s`;
}

// === MAIN ===
const inputFile = process.argv[2] || 'natation test 2.json';
const inputPath = path.resolve(__dirname, inputFile);

console.log(`\nLecture de: ${inputPath}\n`);
const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

// Récupérer les joueurs de J1 et les épreuves de J2
const j1 = data.championship.days['1'];
const j2 = data.championship.days['2'];

const sourcePlayers = [];
for (const div in j1.players) {
    if (j1.players[div]) sourcePlayers.push(...j1.players[div]);
}

const events = j2.chronoData.events;
console.log(`${sourcePlayers.length} entrées brutes trouvées dans J1`);
console.log(`${events.length} épreuves configurées dans J2:\n  ${events.map(e => e.name).join(', ')}\n`);

// Parser toutes les entrées
const parsed = [], errors = [];
for (const p of sourcePlayers) {
    const entry = parseSwimmingEntry(p.name);
    if (entry) parsed.push(entry);
    else errors.push(p.name);
}
console.log(`✅ ${parsed.length} entrées parsées, ❌ ${errors.length} erreurs\n`);

// Grouper par épreuve
const eventGroups = {};
events.forEach(evt => { eventGroups[evt.id] = []; });
const unmatched = [];
parsed.forEach(entry => {
    const evt = matchEntryToEvent(entry, events);
    if (evt) eventGroups[evt.id].push(entry);
    else unmatched.push(entry);
});

if (unmatched.length > 0) {
    console.log(`⚠️  ${unmatched.length} sans épreuve:`);
    unmatched.forEach(e => console.log(`  • ${e.swimmerName} (${e.distance}m ${e.stroke})`));
    console.log();
}

// Générer les séries
const laneOrder = LANE_ORDER[LANES_PER_SERIE];
let nextSerieId = 1, nextParticipantId = 1, bibCounter = 1;
const allParticipants = [];

events.forEach(evt => {
    const entries = eventGroups[evt.id] || [];
    if (entries.length === 0) {
        console.log(`⚠️  ${evt.name}: aucun nageur`);
        return;
    }

    const withTime = entries.filter(e => e.timeMs > 0).sort((a, b) => a.timeMs - b.timeMs);
    const withoutTime = entries.filter(e => e.timeMs <= 0);
    const sorted = [...withTime, ...withoutTime];
    const nbSeries = Math.ceil(sorted.length / LANES_PER_SERIE);

    console.log(`🎯 ${evt.name}: ${sorted.length} nageurs → ${nbSeries} série(s)`);

    // Activer le mode couloir sur l'épreuve
    evt.laneMode = true;
    evt.series = [];
    for (let i = 0; i < sorted.length; i += LANES_PER_SERIE) {
        const batch = sorted.slice(i, i + LANES_PER_SERIE);
        const serieNum = Math.floor(i / LANES_PER_SERIE) + 1;

        const participants = batch.map((entry, idx) => {
            const pid = nextParticipantId++;
            const bib = bibCounter++;
            const lane = laneOrder[idx] || (idx + 1);

            allParticipants.push({
                id: pid, name: entry.swimmerName, bib, club: entry.club, category: '', totalTime: null, laps: 0
            });

            console.log(`   Série ${serieNum} C${lane}: ${entry.swimmerName} (${entry.club}) ${formatMs(entry.timeMs)}`);

            return {
                id: pid, bib, name: entry.swimmerName, category: '', club: entry.club,
                laps: [], status: 'ready', totalTime: 0, totalDistance: 0,
                bestLap: null, finishTime: null, lastLapStartTime: 0, laneNumber: lane
            };
        });

        evt.series.push({
            id: nextSerieId++, name: 'Série ' + serieNum, eventId: evt.id,
            sportType: evt.sportType || 'swimming', distance: evt.distance || 0,
            raceType: evt.raceType || 'individual', relayDuration: null,
            participants, status: 'pending', startTime: null,
            isRunning: false, timerInterval: null, currentTime: 0, laneMode: true
        });
    }
    console.log();
});

// Mettre à jour J2
j2.chronoData.participants = allParticipants;
j2.chronoData.nextSerieId = nextSerieId;
j2.chronoData.nextParticipantId = nextParticipantId;

// Exporter le JSON propre
const outputFile = inputFile.replace('.json', ' - CLEAN.json');
const outputPath = path.resolve(__dirname, outputFile);

const cleanData = {
    version: data.version,
    exportDate: new Date().toISOString(),
    championshipName: data.championshipName + ' (séries générées)',
    championship: data.championship
};

fs.writeFileSync(outputPath, JSON.stringify(cleanData, null, 2), 'utf8');
console.log(`\n✅ JSON propre généré: ${outputFile}`);
console.log(`   ${allParticipants.length} participants, ${nextSerieId - 1} séries créées`);

if (errors.length > 0) {
    console.log(`\n❌ Entrées non parsées:`);
    errors.forEach(e => console.log(`  • ${e}`));
}
