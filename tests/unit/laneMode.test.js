/**
 * @jest-environment jsdom
 *
 * Mode couloirs (natation) : gros boutons par couloir + touches 1-9 / 0.
 * - laneModeKeyHandler n'était jamais déclaré : en 'use strict', le premier
 *   démarrage d'une course en mode couloirs levait une ReferenceError et le
 *   raccourci clavier ne fonctionnait jamais.
 * - Les séries créées à la main avec "Mode couloirs" n'attribuaient aucun
 *   couloir : le panneau des couloirs restait vide.
 * - Le couloir 10 (proposé par l'import natation) était refusé par finishLane.
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
    // Mettre en pause retire l'écouteur clavier entre deux tests
    if (raceData.currentSerie && raceData.currentSerie.isRunning) window.toggleRaceTimer();
    jest.useRealTimers();
});

function startRace(serieId) {
    window.startChronoRaceForDay(1, serieId);
    jest.advanceTimersByTime(150); // displayRaceInterface est différé
    window.toggleRaceTimer();
    jest.advanceTimersByTime(1000);
}

function press(key) {
    document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
}

function status(lane) {
    return raceData.currentSerie.participants.find(p => p.laneNumber === lane).status;
}

test('série manuelle en mode couloirs : couloirs attribués à l\'ajout', () => {
    const serie = addChronoSerie(1, 'Série 1', 1, { sportType: 'swimming', laneMode: true });
    ['Alice', 'Bob', 'Chloe'].forEach(n => addChronoParticipant(1, serie.id, n));
    expect(serie.participants.map(p => p.laneNumber)).toEqual([1, 2, 3]);

    const plain = addChronoSerie(1, 'Série 2', 1, {});
    addChronoParticipant(1, plain.id, 'Dan');
    expect(plain.participants[0].laneNumber).toBeNull();
});

test('les boutons de couloirs s\'affichent et les touches arrêtent le bon nageur', () => {
    const serie = addChronoSerie(1, 'Série 1', 1, { sportType: 'swimming', laneMode: true });
    ['Alice', 'Bob', 'Chloe'].forEach(n => addChronoParticipant(1, serie.id, n));

    expect(() => startRace(serie.id)).not.toThrow();
    expect([...document.querySelectorAll('[id^="lane-"]')].map(e => e.id))
        .toEqual(['lane-1', 'lane-2', 'lane-3']);

    press('2');
    expect(status(2)).toBe('finished');
    expect(status(1)).toBe('running');
});

test('série en mode couloirs créée avant le correctif : couloirs complétés au départ', () => {
    const serie = addChronoSerie(1, 'Série 1', 1, { sportType: 'swimming', laneMode: true });
    serie.participants.push({ id: 50, name: 'Ancien', bib: 1, status: 'ready', laneNumber: null });

    startRace(serie.id);
    press('1');
    expect(status(1)).toBe('finished');
});

test('couloir 10 : clic et touche 0', () => {
    const serie = addChronoSerie(1, 'Série 1', 1, { sportType: 'swimming', laneMode: true });
    for (let i = 1; i <= 10; i++) addChronoParticipant(1, serie.id, 'Nageur ' + i);

    startRace(serie.id);
    press('0');
    expect(status(10)).toBe('finished');

    window.finishLane(9);
    expect(status(9)).toBe('finished');
});
