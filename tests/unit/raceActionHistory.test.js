/**
 * @jest-environment jsdom
 *
 * Historique des actions de course (LAP/FINISH) avec annulation, ajouté à
 * la demande de l'utilisateur : chaque LAP/FINISH enregistré pendant une
 * course alimente raceData.currentSerie.actionLog, affiché dans un panneau
 * latéral (#raceActionHistoryPanel) où chaque action peut être annulée
 * (undoRaceAction) pour revenir exactement à l'état du participant juste
 * avant cette action.
 */
const { loadModules, DEFAULT_ORDER } = require('../helpers/loadApp');

beforeAll(() => {
    loadModules(DEFAULT_ORDER);
});

function makeParticipant(bib, name) {
    return {
        id: bib,
        name,
        bib,
        club: '',
        status: 'running',
        totalTime: 0,
        totalDistance: 0,
        laps: [],
        bestLap: null,
        lastLapStartTime: 0,
        finishTime: null,
    };
}

beforeEach(() => {
    document.body.innerHTML = '<div id="raceInterface"></div>';
    raceData.currentSerie = {
        id: 1,
        name: 'Série test',
        distance: 100,
        raceType: 'individual',
        isRunning: true,
        currentTime: 0,
        participants: [makeParticipant('1', 'Alice'), makeParticipant('2', 'Bob')],
        actionLog: [],
    };
    // recordLap/finishParticipant lisent des éléments DOM optionnels (ligne du participant) :
    // absent ici, ces fonctions doivent quand même fonctionner sans planter.
});

test("recordLap ajoute une entrée dans l'historique de la série", () => {
    raceData.currentSerie.currentTime = 5000;
    recordLap('1');

    const log = raceData.currentSerie.actionLog;
    expect(log).toHaveLength(1);
    expect(log[0].bib).toBe('1');
    expect(log[0].participantName).toBe('Alice');

    const alice = raceData.currentSerie.participants[0];
    expect(alice.laps).toHaveLength(1);
    expect(alice.totalTime).toBe(5000);
    expect(alice.totalDistance).toBe(100);
});

test("undoRaceAction annule un LAP et restaure exactement l'état d'avant", () => {
    raceData.currentSerie.currentTime = 5000;
    recordLap('1');
    const actionId = raceData.currentSerie.actionLog[0].id;

    undoRaceAction(actionId);

    const alice = raceData.currentSerie.participants[0];
    expect(alice.laps).toHaveLength(0);
    expect(alice.totalTime).toBe(0);
    expect(alice.totalDistance).toBe(0);
    expect(raceData.currentSerie.actionLog).toHaveLength(0);
});

test('undoRaceAction sur une action ancienne annule aussi les actions plus récentes (cascade)', () => {
    raceData.currentSerie.currentTime = 3000;
    recordLap('1'); // Tour 1 : 3000ms
    raceData.currentSerie.currentTime = 7000;
    recordLap('1'); // Tour 2 : 4000ms de plus

    const alice = raceData.currentSerie.participants[0];
    expect(alice.laps).toHaveLength(2);
    expect(alice.totalTime).toBe(7000);

    const firstActionId = raceData.currentSerie.actionLog[0].id;
    undoRaceAction(firstActionId);

    // Retour à l'état d'avant le tout premier tour : aucun tour, temps à 0
    expect(alice.laps).toHaveLength(0);
    expect(alice.totalTime).toBe(0);
    expect(raceData.currentSerie.actionLog).toHaveLength(0);
});

test("finishParticipant enregistre une action annulable qui remet le participant en course", () => {
    raceData.currentSerie.currentTime = 12000;
    finishParticipant('2');

    const bob = raceData.currentSerie.participants[1];
    expect(bob.status).toBe('finished');
    expect(raceData.currentSerie.actionLog).toHaveLength(1);

    const actionId = raceData.currentSerie.actionLog[0].id;
    undoRaceAction(actionId);

    expect(bob.status).toBe('running');
    expect(bob.finishTime).toBeNull();
});

test("l'annulation d'une action d'un participant n'affecte pas les tours d'un autre participant", () => {
    raceData.currentSerie.currentTime = 2000;
    recordLap('1');
    raceData.currentSerie.currentTime = 4000;
    recordLap('2');

    const aliceActionId = raceData.currentSerie.actionLog[0].id;
    undoRaceAction(aliceActionId);

    const alice = raceData.currentSerie.participants[0];
    const bob = raceData.currentSerie.participants[1];
    expect(alice.laps).toHaveLength(0);
    // Le tour de Bob a été enregistré APRÈS celui d'Alice : la cascade doit
    // aussi l'annuler pour rester cohérente (retour à l'état avant l'action choisie).
    expect(bob.laps).toHaveLength(0);
});

test('renderActionHistoryPanel met à jour le badge de comptage et le contenu du panneau', () => {
    document.body.innerHTML =
        '<div id="raceInterface"></div>' +
        '<span id="raceHistoryBadge"></span>' +
        '<div id="raceActionHistoryPanel"></div>';

    raceData.currentSerie.currentTime = 1000;
    recordLap('1');

    expect(document.getElementById('raceHistoryBadge').textContent).toBe('1');
    expect(document.getElementById('raceActionHistoryPanel').innerHTML).toContain('Alice');
    expect(document.getElementById('raceActionHistoryPanel').innerHTML).toContain('Annuler');
});

test('undoRaceAction ne plante pas pour un id inconnu ou sans série en cours', () => {
    expect(() => undoRaceAction(999999)).not.toThrow();

    raceData.currentSerie = null;
    expect(() => undoRaceAction(1)).not.toThrow();
});

describe('bip sonore de confirmation (playLapBeep)', () => {
    let oscillator;
    let gainNode;
    let fakeAudioCtx;

    beforeEach(() => {
        oscillator = { connect: jest.fn(), start: jest.fn(), stop: jest.fn(), type: null, frequency: { value: 0 } };
        gainNode = { connect: jest.fn(), gain: { setValueAtTime: jest.fn(), exponentialRampToValueAtTime: jest.fn() } };
        fakeAudioCtx = {
            state: 'running',
            currentTime: 0,
            createOscillator: jest.fn(() => oscillator),
            createGain: jest.fn(() => gainNode),
            destination: {},
            resume: jest.fn(),
        };
        window.AudioContext = jest.fn(() => fakeAudioCtx);
    });

    afterEach(() => {
        delete window.AudioContext;
    });

    test('recordLap déclenche un bip sonore lors d\'un LAP réel', () => {
        raceData.currentSerie.currentTime = 1000;
        recordLap('1');

        expect(fakeAudioCtx.createOscillator).toHaveBeenCalled();
        expect(oscillator.start).toHaveBeenCalled();
    });

    test("ne plante pas si l'API Web Audio n'est pas disponible", () => {
        delete window.AudioContext;
        raceData.currentSerie.currentTime = 1000;
        expect(() => recordLap('1')).not.toThrow();
    });
});
