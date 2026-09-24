/**
 * @jest-environment jsdom
 *
 * Problèmes révélés par le test de bout en bout d'une journée natation
 * (150 nageurs réels, 8 épreuves créées via « 🎯 Épreuve ») :
 * - distance : une épreuve créée à la main n'a qu'un nom (« 50m brasse ») ;
 *   les séries générées avaient distance 0, remplacée au lancement par un repli
 *   à 1000 m → « Distance : 1000m » et « 1,00 km » par nageur sur un 50 m ;
 * - DISQ : un nageur disqualifié APRÈS son arrivée (virage illégal...) gardait
 *   son temps dans serie.results → classé (classement de série, Multisport, points) ;
 * - club : serie.results ne portait pas le club et le classement Multisport
 *   passait un club vide pour les journées Courses → colonne Club à « - ».
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
                // Épreuves telles que créées via « 🎯 Épreuve » : un nom, pas de distance
                events: [{ id: 1, name: '50m brasse' }, { id: 2, name: '25m dos' }],
                series: [], participants: [],
                nextEventId: 3, nextSerieId: 1, nextParticipantId: 1,
            },
        },
        2: {
            dayType: 'championship', matches: { 1: [] },
            players: { 1: [
                'Boulaie Robin Christophe 50 M Brasse 0:00:40',
                'Marthe Et Marie Hans Yohan 50 M Brasse 0:00:35',
                'Carpe Mosane Durand Paul 50 M Brasse 0:00:45',
                'Boulaie Petit Anne 25 M Dos 0:00:30',
            ].map(n => ({ name: n, club: '' })) },
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

function brasseSerie() {
    return championship.days[1].chronoData.events[0].series[0];
}

function runRace(serie, finishOrderLanes) {
    window.startChronoRaceForDay(1, serie.id);
    jest.advanceTimersByTime(150);
    window.toggleRaceTimer();
    finishOrderLanes.forEach(lane => {
        jest.advanceTimersByTime(1000);
        window.finishLane(lane);
    });
}

describe('distance des séries générées', () => {
    test('déduite du nom de l\'épreuve (50m brasse → 50 m, 25m dos → 25 m)', () => {
        window.generateSwimmingSeries(1, 2, 5);
        const events = championship.days[1].chronoData.events;
        expect(events[0].series[0].distance).toBe(50);
        expect(events[1].series[0].distance).toBe(25);
    });

    test('la course affiche 50 m, pas le repli à 1000 m, et compte 50 m par nageur', () => {
        window.generateSwimmingSeries(1, 2, 5);
        const serie = brasseSerie();
        runRace(serie, [serie.participants[0].laneNumber]);
        expect(raceData.currentSerie.distance).toBe(50);
        expect(document.getElementById('raceInterface').textContent).toContain('Distance: 50m');
        const first = raceData.currentSerie.participants.find(p => p.status === 'finished');
        expect(first.totalDistance).toBe(50);
    });
});

describe('nageur disqualifié après son arrivée', () => {
    test('exclu des résultats, du classement de série et du classement Multisport', () => {
        window.generateSwimmingSeries(1, 2, 5);
        const serie = brasseSerie();
        const lanes = serie.participants.map(p => p.laneNumber);
        runRace(serie, lanes); // tous arrivés
        const hans = raceData.currentSerie.participants.find(p => p.name === 'Hans Yohan');
        window.markAsDISQ(hans.bib); // virage illégal constaté après l'arrivée
        window.backToSeriesList();

        const results = brasseSerie().results.map(r => r.name);
        expect(results).not.toContain('Hans Yohan');
        expect(results).toHaveLength(2);

        const day = window.getChronoResultsForDay(1);
        expect(day['Hans Yohan']).toBeUndefined();
        const ranking = window.calculateMultisportRanking();
        expect(ranking['Hans Yohan']).toBeUndefined();
    });

    test('annuler la disqualification le remet dans les résultats', () => {
        window.generateSwimmingSeries(1, 2, 5);
        const serie = brasseSerie();
        runRace(serie, serie.participants.map(p => p.laneNumber));
        const hans = raceData.currentSerie.participants.find(p => p.name === 'Hans Yohan');
        window.markAsDISQ(hans.bib);
        window.cancelDISQ(hans.bib);
        window.backToSeriesList();
        expect(brasseSerie().results.map(r => r.name)).toContain('Hans Yohan');
    });
});

describe('club dans les résultats et le classement', () => {
    test('serie.results et le classement Multisport portent le club du nageur', () => {
        window.generateSwimmingSeries(1, 2, 5);
        const serie = brasseSerie();
        runRace(serie, serie.participants.map(p => p.laneNumber));
        window.backToSeriesList();

        const robin = brasseSerie().results.find(r => r.name === 'Robin Christophe');
        expect(robin.club).toBe('Boulaie');

        const ranking = window.calculateMultisportRanking();
        expect(ranking['Robin Christophe'].club).toBe('Boulaie');
        expect(ranking['Hans Yohan'].club).toBe('Marthe Et Marie');
    });
});
