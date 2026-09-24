/**
 * @jest-environment jsdom
 *
 * Reproduction : séries générées par « 🏊 Séries natation », puis « ▶️ Course ».
 * Les nageurs doivent rester dans les couloirs attribués à la génération
 * (le plus rapide au centre) une fois la course lancée.
 */
const { loadModules, DEFAULT_ORDER } = require('../helpers/loadApp');

beforeAll(() => {
    loadModules(DEFAULT_ORDER);
});

const LINES_NL = [
    'Alice Un 50m libre 35.00', 'Bob Deux 50m libre 31.00',
    'Chloe Trois 50m libre 33.00', 'Dan Quatre 50m libre 32.00',
    'Eva Cinq 50m libre 34.00', 'Fred Six 50m libre 36.00', 'Gina Sept 50m libre 37.00',
];
const LINES_DOS = ['Hugo Huit 50m dos 40.00', 'Ines Neuf 50m dos 39.00', 'Jules Dix 50m dos 41.00'];

function setup(opts) {
    opts = opts || {};
    const lines = opts.lines || LINES_NL.slice(0, 5);
    championship.config = { numberOfDivisions: 1, numberOfCourts: 4 };
    championship.days = {
        1: {
            dayType: 'chrono', players: {}, matches: {},
            chronoData: {
                events: (opts.events || ['50m Nage Libre']).map((n, i) => ({ id: i + 1, name: n, series: [] })),
                series: [],
                participants: opts.sourceIsChronoDay
                    ? lines.map((n, i) => ({ id: i + 1, name: n, bib: i + 1, club: '' }))
                    : [],
                nextEventId: 3, nextSerieId: 1,
                nextParticipantId: opts.sourceIsChronoDay ? lines.length + 1 : 1,
            },
        },
        2: {
            dayType: 'championship', matches: { 1: [] },
            players: { 1: lines.map(n => ({ name: n, club: '' })) },
        },
    };
    document.body.innerHTML = '<div id="chrono-content-1"></div>';
    raceData.events = [];
    raceData.series = [];
    raceData.currentSerie = null;
    raceData.currentDayNumber = null;
    raceData.currentSerieId = null;
}

beforeEach(() => {
    jest.useFakeTimers();
    setup();
});

afterEach(() => {
    if (raceData.currentSerie && raceData.currentSerie.isRunning) window.toggleRaceTimer();
    raceData.currentSerie = null;
    jest.useRealTimers();
});

function lanesOf(participants) {
    const out = {};
    participants.forEach(p => { out[p.laneNumber] = p.name; });
    return out;
}

function series(eventIndex) {
    return championship.days[1].chronoData.events[eventIndex || 0].series;
}

function startRace(serieId) {
    window.startChronoRaceForDay(1, serieId);
    jest.advanceTimersByTime(150); // displayRaceInterface est différé
    window.toggleRaceTimer();
    jest.advanceTimersByTime(1000);
}

function laneButtons() {
    const out = {};
    document.querySelectorAll('[id^="lane-"]').forEach(el => {
        out[el.id.replace('lane-', '')] = el.querySelector('.lane-name').textContent.trim();
    });
    return out;
}

function expectRaceMatches(serie) {
    const generated = lanesOf(serie.participants);
    startRace(serie.id);
    expect(lanesOf(raceData.currentSerie.participants)).toEqual(generated);
    expect(laneButtons()).toEqual(generated);
    window.toggleRaceTimer();
    window.backToSeriesList();
}

test('cas simple : une épreuve, une série', () => {
    window.generateSwimmingSeries(1, 2, 5);
    expect(lanesOf(series()[0].participants))
        .toEqual({ 3: 'Bob Deux', 4: 'Dan Quatre', 2: 'Chloe Trois', 5: 'Eva Cinq', 1: 'Alice Un' });
    expectRaceMatches(series()[0]);
});

test('deux épreuves, plusieurs séries : chaque série garde ses couloirs', () => {
    setup({ lines: LINES_NL.concat(LINES_DOS), events: ['50m Nage Libre', '50m Dos'] });
    window.generateSwimmingSeries(1, 2, 5);
    [series(0)[0], series(0)[1], series(1)[0]].forEach(expectRaceMatches);
});

test('joueurs ajoutés dans la journée Courses elle-même (source = J1)', () => {
    setup({ sourceIsChronoDay: true });
    window.generateSwimmingSeries(1, 1, 5);
    expectRaceMatches(series()[0]);
});

test('relancer deux fois la même série', () => {
    window.generateSwimmingSeries(1, 2, 5);
    expectRaceMatches(series()[0]);
    expectRaceMatches(series()[0]);
});

test('régénérer les séries après avoir lancé une course', () => {
    window.generateSwimmingSeries(1, 2, 5);
    expectRaceMatches(series()[0]);
    championship.days[2].players[1].push({ name: 'Zoe Zed 50m libre 30.00', club: '' });
    window.generateSwimmingSeries(1, 2, 5);
    expectRaceMatches(series()[0]);
});

test('série déjà ouverte une fois, puis couloirs modifiés dans la modale 🏊', () => {
    setup({ lines: LINES_NL });
    window.generateSwimmingSeries(1, 2, 5);
    const s1 = series()[0];
    // Ouvrir la course une première fois (sans démarrer) crée l'entrée en cache
    window.startChronoRaceForDay(1, s1.id);
    jest.advanceTimersByTime(150);
    window.backToSeriesList();

    // Échange : Fred (série 2) prend le couloir 1 à la place d'Alice
    const pool = championship.days[1].chronoData.participants;
    const fred = pool.find(p => p.name === 'Fred Six');
    window.assignSerieLanes(1, s1.id);
    document.getElementById('laneSel-1-1').value = String(fred.id);
    window.saveSerieLanes(1, s1.id);
    expect(lanesOf(s1.participants)[1]).toBe('Fred Six');

    expectRaceMatches(s1);
});

test('id de série réutilisé (ex. championnat réimporté) : pas de nageurs fantômes du cache', () => {
    window.generateSwimmingSeries(1, 2, 5);
    startRace(series()[0].id);
    window.finishLane(3); // Bob termine : progression présente dans le cache
    window.toggleRaceTimer();
    window.backToSeriesList();

    // Même journée, mêmes compteurs d'id, autres nageurs (import JSON, nouveau championnat...)
    setup({ lines: ['Kim Onze 50m libre 30.00', 'Leo Douze 50m libre 31.00', 'Max Treize 50m libre 32.00'] });
    raceData.series = JSON.parse(localStorage.getItem('chronoRaceData')).series;
    raceData.events = JSON.parse(localStorage.getItem('chronoRaceData')).events;
    window.generateSwimmingSeries(1, 2, 5);
    expectRaceMatches(series()[0]);
    // Personne n'hérite du temps de Bob (ancien occupant du même id)
    expect(raceData.series.find(s => s.id === series()[0].id).participants
        .some(p => p.status === 'finished')).toBe(false);
});

test('bouton 🗑️ Vider (mode Courses) puis mêmes nageurs réimportés : ni anciens temps ni anciens couloirs', () => {
    window.generateSwimmingSeries(1, 2, 5);
    startRace(series()[0].id);
    window.finishLane(3); // Bob termine
    window.toggleRaceTimer();
    window.backToSeriesList();

    // Vider la journée Courses (compteurs d'id remis à 1), recréer l'épreuve,
    // réimporter exactement la même liste
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    window.clearChronoDataForDay(1);
    confirmSpy.mockRestore();
    expect(raceData.series.filter(s => s.dayNumber === 1)).toEqual([]);
    championship.days[1].chronoData.events.push({ id: 1, name: '50m Nage Libre', series: [] });
    championship.days[1].chronoData.nextEventId = 2;
    window.generateSwimmingSeries(1, 2, 5);

    window.startChronoRaceForDay(1, series()[0].id);
    jest.advanceTimersByTime(150);
    expect(lanesOf(raceData.currentSerie.participants)).toEqual(lanesOf(series()[0].participants));
    expect(raceData.currentSerie.currentTime).toBe(0);
    expect(raceData.currentSerie.participants.every(p => p.status === 'ready')).toBe(true);
});

test('reprise d\'une course en cours (sans "Retour") : la progression du cache est conservée', () => {
    window.generateSwimmingSeries(1, 2, 5);
    const s1 = series()[0];
    startRace(s1.id);
    window.finishLane(3);
    const bobTime = raceData.currentSerie.participants.find(p => p.laneNumber === 3).finishTime;
    // Navigateur fermé en pleine course : la série du jour n'a jamais reçu les temps
    window.toggleRaceTimer();
    raceData.currentSerie = null;

    window.startChronoRaceForDay(1, s1.id);
    jest.advanceTimersByTime(150);
    const bob = raceData.currentSerie.participants.find(p => p.laneNumber === 3);
    expect(bob.name).toBe('Bob Deux');
    expect(bob.status).toBe('finished');
    expect(bob.finishTime).toBe(bobTime);
    expect(raceData.currentSerie.currentTime).toBeGreaterThan(0);
});

test('modale 🏊 ouverte puis enregistrée sans rien changer', () => {
    window.generateSwimmingSeries(1, 2, 5);
    const before = lanesOf(series()[0].participants);
    window.assignSerieLanes(1, series()[0].id);
    window.saveSerieLanes(1, series()[0].id);
    expect(lanesOf(series()[0].participants)).toEqual(before);
    expectRaceMatches(series()[0]);
});
