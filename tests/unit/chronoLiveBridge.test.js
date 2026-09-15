/**
 * @jest-environment jsdom
 *
 * Test d'intégration du pont Chrono par-journée ↔ moteur de course live,
 * le chemin de code le plus exposé par la suppression de ~1271 lignes
 * dans chrono.iife.js (commit 3c7feac) : startChronoRaceForDay() convertit
 * championship.days[n].chronoData vers raceData (ancien format global),
 * puis saveRaceResultsToDay() fait le chemin inverse en fin de course.
 * Voir claude.md "Internal bridge" pour le détail de ce mécanisme.
 */
const { loadModules, DEFAULT_ORDER } = require('../helpers/loadApp');

beforeAll(() => {
    loadModules(DEFAULT_ORDER);
});

beforeEach(() => {
    championship.config = { numberOfDivisions: 1, numberOfCourts: 4 };
    championship.currentDay = 1;
    championship.days = {
        1: {
            dayType: 'chrono',
            players: {},
            matches: {},
            chronoData: {
                events: [],
                series: [{
                    id: 42,
                    name: 'Série test 100m',
                    eventId: null,
                    sportType: 'running',
                    distance: 100,
                    raceType: 'individual',
                    participants: [
                        { id: 1, name: 'Alice', bib: '1', status: 'ready' },
                    ],
                    status: 'pending',
                }],
                participants: [{ id: 1, name: 'Alice', bib: '1' }],
                nextEventId: 1, nextSerieId: 2, nextParticipantId: 2,
            },
        },
    };

    // startChronoRaceForDay() injecte l'interface course dans ce conteneur
    document.body.innerHTML = '<div id="chrono-content-1"></div>';

    // raceData est un objet global persistant entre les tests (chargé une
    // seule fois via loadModules dans beforeAll) : on le remet à zéro pour
    // ne pas laisser fuiter l'état d'un test vers le suivant.
    raceData.events = [];
    raceData.series = [];
    raceData.currentSerie = null;
    raceData.currentDayNumber = null;
    raceData.currentSerieId = null;
    raceData.nextEventId = 1;
    raceData.nextSerieId = 1;
});

test('startChronoRaceForDay bascule la série vers raceData et prépare le conteneur', () => {
    startChronoRaceForDay(1, 42);

    expect(raceData.currentSerie).not.toBeNull();
    expect(raceData.currentSerie.name).toBe('Série test 100m');
    expect(raceData.currentSerie.participants).toHaveLength(1);
    expect(raceData.currentDayNumber).toBe(1);
    expect(raceData.currentSerieId).toBe(42);

    // Le conteneur #raceInterface est créé synchronement (avant le
    // setTimeout qui appelle displayRaceInterface pour le peupler)
    expect(document.getElementById('raceInterface')).not.toBeNull();
});

test('saveRaceResultsToDay recopie les résultats de raceData vers championship.days[n].chronoData', () => {
    startChronoRaceForDay(1, 42);

    // Simule la fin d'une course : le participant a fini
    raceData.currentSerie.participants[0].status = 'finished';
    raceData.currentSerie.participants[0].totalTime = 12345;
    raceData.currentSerie.status = 'completed';

    saveRaceResultsToDay();

    const savedSerie = championship.days[1].chronoData.series[0];
    expect(savedSerie.status).toBe('completed');
    expect(savedSerie.participants[0].status).toBe('finished');
    expect(savedSerie.participants[0].totalTime).toBe(12345);
});

test('saveRaceResultsToDay propage category depuis raceData vers serie.results (feature catégories)', () => {
    // Régression ciblée : serie.participants incluait déjà category, mais
    // serie.results (consommé par showSerieRanking/printChronoCompetition)
    // ne l'incluait pas — la catégorie était perdue entre la fin de course
    // et l'affichage du classement.
    startChronoRaceForDay(1, 42);
    raceData.currentSerie.participants[0].category = 'Solo';
    raceData.currentSerie.participants[0].status = 'finished';
    raceData.currentSerie.participants[0].totalTime = 12345;

    saveRaceResultsToDay();

    const savedSerie = championship.days[1].chronoData.series[0];
    expect(savedSerie.participants[0].category).toBe('Solo');
    expect(savedSerie.results[0].category).toBe('Solo');
});

test('saveRaceResultsToDay reconstruit serie.results pour les participants avec un temps valide', () => {
    startChronoRaceForDay(1, 42);
    raceData.currentSerie.participants[0].status = 'finished';
    raceData.currentSerie.participants[0].totalTime = 12345;

    saveRaceResultsToDay();

    const savedSerie = championship.days[1].chronoData.series[0];
    expect(savedSerie.results).toHaveLength(1);
    expect(savedSerie.results[0].bib).toBe('1');
    expect(savedSerie.results[0].time).toBe(12345);
});

test('saveRaceResultsToDay ignore un participant DNS (pas de résultat)', () => {
    startChronoRaceForDay(1, 42);
    raceData.currentSerie.participants[0].status = 'dns';
    raceData.currentSerie.participants[0].totalTime = 0;

    saveRaceResultsToDay();

    const savedSerie = championship.days[1].chronoData.series[0];
    expect(savedSerie.results).toHaveLength(0);
});

test("ne fait rien si aucune course n'est en cours (pas de crash)", () => {
    expect(() => saveRaceResultsToDay()).not.toThrow();
});
