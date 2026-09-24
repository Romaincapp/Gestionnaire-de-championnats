/**
 * @jest-environment jsdom
 *
 * Arrêt automatique du chrono général à l'arrivée du dernier participant,
 * en mode couloirs (clic sur les couloirs / touches) comme en mode normal.
 * Un participant DNS (non partant) ou DISQ (disqualifié) ne franchira jamais
 * l'arrivée : il ne doit pas empêcher cet arrêt.
 */
const { loadModules, DEFAULT_ORDER } = require('../helpers/loadApp');

beforeAll(() => {
    loadModules(DEFAULT_ORDER);
});

beforeEach(() => {
    jest.useFakeTimers();
    championship.config = { numberOfDivisions: 1, numberOfCourts: 4 };
    championship.days = {
        1: {
            dayType: 'chrono', players: {}, matches: {},
            chronoData: {
                events: [{ id: 1, name: '50m Nage Libre' }],
                series: [], participants: [],
                nextEventId: 2, nextSerieId: 1, nextParticipantId: 1,
            },
        },
    };
    document.body.innerHTML = '<div id="chrono-content-1"></div>';
    raceData.events = [];
    raceData.series = [];
    raceData.currentSerie = null;
    raceData.currentDayNumber = null;
    raceData.currentSerieId = null;
});

afterEach(() => {
    if (raceData.currentSerie && raceData.currentSerie.isRunning) window.toggleRaceTimer();
    raceData.currentSerie = null;
    jest.useRealTimers();
});

function startRace(laneMode) {
    const serie = addChronoSerie(1, 'Série 1', 1, { sportType: 'swimming', laneMode: laneMode });
    ['Alice', 'Bob', 'Chloe'].forEach(n => addChronoParticipant(1, serie.id, n));
    window.startChronoRaceForDay(1, serie.id);
    jest.advanceTimersByTime(150); // displayRaceInterface est différé
    window.toggleRaceTimer();
    jest.advanceTimersByTime(5000);
    return raceData.currentSerie;
}

function clickLane(lane) {
    document.getElementById('lane-' + lane).click();
    jest.advanceTimersByTime(500);
}

function participant(name) {
    return raceData.currentSerie.participants.find(p => p.name === name);
}

describe('mode couloirs', () => {
    test('clic sur tous les couloirs : le chrono général s\'arrête au dernier', () => {
        const serie = startRace(true);
        clickLane(1);
        clickLane(2);
        expect(serie.isRunning).toBe(true);
        clickLane(3);
        expect(serie.isRunning).toBe(false);
        // Le temps général est figé sur l'arrivée du dernier
        const frozen = serie.currentTime;
        jest.advanceTimersByTime(3000);
        expect(serie.currentTime).toBe(frozen);
        expect(frozen).toBe(participant('Chloe').finishTime);
    });

    test('un nageur DNS n\'empêche pas l\'arrêt à l\'arrivée du dernier', () => {
        const serie = startRace(true);
        window.markAsDNS(participant('Bob').bib);
        clickLane(1);
        expect(serie.isRunning).toBe(true);
        clickLane(3);
        expect(serie.isRunning).toBe(false);
    });

    test('disqualifier le dernier nageur encore dans l\'eau arrête le chrono', () => {
        const serie = startRace(true);
        clickLane(1);
        clickLane(2);
        window.markAsDISQ(participant('Chloe').bib);
        expect(serie.isRunning).toBe(false);
    });
});

describe('mode normal', () => {
    test('un participant DNS n\'empêche pas l\'arrêt à l\'arrivée du dernier', () => {
        const serie = startRace(false);
        window.markAsDNS(participant('Bob').bib);
        window.finishParticipant(participant('Alice').bib);
        expect(serie.isRunning).toBe(true);
        window.finishParticipant(participant('Chloe').bib);
        expect(serie.isRunning).toBe(false);
    });

    test('tous DNS/DISQ sauf aucun arrivé : le chrono continue (rien à clôturer)', () => {
        const serie = startRace(false);
        window.markAsDNS(participant('Alice').bib);
        window.markAsDNS(participant('Bob').bib);
        expect(serie.isRunning).toBe(true);
    });
});
