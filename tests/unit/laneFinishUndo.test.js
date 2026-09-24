/**
 * @jest-environment jsdom
 *
 * Arrivées en mode couloirs (clic sur un couloir / touches 1-9, 0) annulables
 * depuis l'historique 🕘, comme les arrivées du mode normal (#77).
 * Cas critique : un clic par erreur sur le DERNIER couloir arrête le chrono
 * général (arrêt automatique) ; l'annuler doit relancer ce chrono sans perdre
 * le temps écoulé pendant l'arrêt — le nageur, lui, n'a jamais cessé de nager.
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
    jest.advanceTimersByTime(10000);
    return raceData.currentSerie;
}

function clickLane(lane) {
    document.getElementById('lane-' + lane).click();
}

function press(key) {
    document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
}

function byLane(lane) {
    return raceData.currentSerie.participants.find(p => p.laneNumber === lane);
}

function lastAction() {
    const log = raceData.currentSerie.actionLog;
    return log[log.length - 1];
}

describe('mode couloirs', () => {
    test('une arrivée par clic sur un couloir est inscrite dans l\'historique', () => {
        startRace(true);
        clickLane(2);
        expect(raceData.currentSerie.actionLog).toHaveLength(1);
        expect(lastAction().participantName).toBe('Bob');
        expect(lastAction().label).toContain('couloir 2');
    });

    test('une arrivée au clavier est aussi inscrite', () => {
        startRace(true);
        press('3');
        expect(lastAction().participantName).toBe('Chloe');
    });

    test('annuler remet le nageur en course et le couloir redevient cliquable', () => {
        startRace(true);
        clickLane(2);
        expect(byLane(2).status).toBe('finished');
        expect(document.getElementById('lane-2').textContent).toContain('✅');

        window.undoRaceAction(lastAction().id);

        const bob = byLane(2);
        expect(bob.status).toBe('running');
        expect(bob.finishTime).toBeNull();
        expect(bob.laps).toEqual([]);
        expect(document.getElementById('lane-2').textContent).not.toContain('✅');

        // Le vrai passage de Bob, plus tard
        jest.advanceTimersByTime(4000);
        press('2');
        expect(byLane(2).status).toBe('finished');
        expect(byLane(2).finishTime).toBeGreaterThanOrEqual(14000);
    });

    test('mauvais clic sur le dernier couloir : annuler relance le chrono sans perdre de temps', () => {
        const serie = startRace(true);
        clickLane(1);
        clickLane(2);
        clickLane(3); // erreur : Chloe nage encore
        expect(serie.isRunning).toBe(false);
        const stoppedAt = serie.currentTime;

        jest.advanceTimersByTime(3000); // le temps de s'en rendre compte
        window.undoRaceAction(lastAction().id);

        expect(serie.isRunning).toBe(true);
        expect(byLane(3).status).toBe('running');
        jest.advanceTimersByTime(200);
        // Le chrono général a continué pendant l'arrêt
        expect(serie.currentTime).toBeGreaterThanOrEqual(stoppedAt + 3000);
        // Les couloirs sont de nouveau affichés et la touche fonctionne
        expect(document.getElementById('lane-3')).not.toBeNull();
        press('3');
        expect(byLane(3).finishTime).toBeGreaterThanOrEqual(stoppedAt + 3000);
        expect(serie.isRunning).toBe(false);
    });

    test('annuler une arrivée ne relance pas une série déjà terminée', () => {
        const serie = startRace(true);
        clickLane(1);
        clickLane(2);
        clickLane(3);
        const actionId = lastAction().id;
        serie.status = 'completed';
        window.undoRaceAction(actionId);
        expect(serie.isRunning).toBe(false);
    });

    test('annuler une arrivée intermédiaire ne touche pas au chrono en cours', () => {
        const serie = startRace(true);
        clickLane(1);
        const startTime = serie.startTime;
        window.undoRaceAction(lastAction().id);
        expect(serie.isRunning).toBe(true);
        expect(serie.startTime).toBe(startTime);
    });

    test('le panneau d\'historique reste ouvert après une annulation', () => {
        startRace(true);
        clickLane(1);
        window.toggleActionHistoryPanel();
        window.undoRaceAction(lastAction().id);
        expect(document.getElementById('raceActionHistoryPanel').style.display).toBe('block');
    });

    test('bouton FIN du tableau en mode couloirs : le couloir passe aussi au vert', () => {
        startRace(true);
        window.finishParticipant(byLane(1).bib);
        expect(document.getElementById('lane-1').textContent).toContain('✅');
    });
});

describe('mode normal', () => {
    test('annuler la dernière arrivée (qui a arrêté le chrono) le relance sans perte', () => {
        const serie = startRace(false);
        ['Alice', 'Bob', 'Chloe'].forEach(n =>
            window.finishParticipant(serie.participants.find(p => p.name === n).bib));
        expect(serie.isRunning).toBe(false);
        const stoppedAt = serie.currentTime;

        jest.advanceTimersByTime(2000);
        window.undoRaceAction(lastAction().id);
        jest.advanceTimersByTime(200);

        expect(serie.isRunning).toBe(true);
        expect(serie.currentTime).toBeGreaterThanOrEqual(stoppedAt + 2000);
    });
});
