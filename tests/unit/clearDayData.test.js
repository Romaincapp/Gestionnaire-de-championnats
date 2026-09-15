/**
 * @jest-environment jsdom
 *
 * Régression : clearDayData() (bouton "Vider la journée") reconstruisait
 * l'objet jour avec seulement {players, matches}, ce qui effaçait
 * silencieusement dayType (une journée Chrono repassait en Championship
 * sans prévenir) et détruisait pools/chronoData sans même les compter
 * dans la confirmation. Corrigé le 2026-09 (commit 49e5c50).
 */
const { loadModules } = require('../helpers/loadApp');

beforeAll(() => {
    loadModules([
        'config', 'utils', 'notifications', 'state', 'clubs', 'multisport',
        'players', 'ui', 'matches', 'pools', 'ranking', 'chrono',
    ]);
});

beforeEach(() => {
    // window.confirm doit renvoyer true pour que clearDayData procède
    window.confirm = jest.fn(() => true);
    window.alert = jest.fn();

    // raceData est un objet global persistant entre les tests (chargé une seule
    // fois via loadModules dans beforeAll) : on le remet à zéro pour ne pas
    // laisser fuiter l'état d'un test vers le suivant.
    raceData.events = [];
    raceData.series = [];
    raceData.currentSerie = null;
    raceData.currentDayNumber = null;
    raceData.currentSerieId = null;
    raceData.nextEventId = 1;
    raceData.nextSerieId = 1;

    championship.config = { numberOfDivisions: 2, numberOfCourts: 4 };
    championship.currentDay = 1;
    championship.days = {
        1: {
            dayType: 'chrono',
            players: { 1: ['Jean Dupont'], 2: [] },
            matches: { 1: [{ id: 'm1', player1: 'Jean Dupont', player2: 'Paul Martin' }], 2: [] },
            pools: {
                enabled: true,
                divisions: { 1: { pools: [['Jean Dupont']], matches: [{ id: 'p1' }], finalPhase: [] } },
            },
            chronoData: {
                events: [{ id: 1, name: '100m' }],
                series: [],
                participants: [{ id: 1, name: 'Jean Dupont', bib: 1 }],
                nextEventId: 2, nextSerieId: 1, nextParticipantId: 2,
            },
        },
    };
});

test('conserve dayType après le vidage (ne repasse pas en championship)', () => {
    clearDayData(1);
    expect(championship.days[1].dayType).toBe('chrono');
});

test('vide bien players et matches', () => {
    clearDayData(1);
    expect(championship.days[1].players[1]).toEqual([]);
    expect(championship.days[1].matches[1]).toEqual([]);
});

test('réinitialise pools à une structure vide plutôt que de le supprimer', () => {
    clearDayData(1);
    expect(championship.days[1].pools).toBeDefined();
    expect(championship.days[1].pools.enabled).toBe(false);
    expect(championship.days[1].pools.divisions[1].matches).toEqual([]);
});

test('réinitialise chronoData à une structure vide plutôt que de le supprimer', () => {
    clearDayData(1);
    expect(championship.days[1].chronoData).toBeDefined();
    expect(championship.days[1].chronoData.events).toEqual([]);
    expect(championship.days[1].chronoData.participants).toEqual([]);
});

test('le message de confirmation mentionne les matchs de poule et participants chrono', () => {
    clearDayData(1);
    const confirmMsg = window.confirm.mock.calls[0][0];
    expect(confirmMsg).toMatch(/match\(s\) de poule/);
    expect(confirmMsg).toMatch(/participant\(s\) chrono/);
});

test("n'agit pas si l'utilisateur annule la confirmation", () => {
    window.confirm = jest.fn(() => false);
    clearDayData(1);
    expect(championship.days[1].players[1]).toEqual(['Jean Dupont']);
    expect(championship.days[1].dayType).toBe('chrono');
});

test(
    "purge le cache du moteur de course live (raceData) pour la journée : " +
    'une course redémarrée après un vidage ne récupère pas les anciens temps ' +
    '(régression rapportée : compteurs d\'id remis à 1 par clearDayData, mais ' +
    'raceData/localStorage jamais purgé, donc un id réutilisé retombait sur ' +
    "l'ancienne entrée en cache avec sa progression)",
    () => {
        document.body.innerHTML = '<div id="chrono-content-1"></div>';
        // Série rattachée à une épreuve (eventId réel) : c'est ce cas, le plus
        // courant, qui reproduit la collision — l'id de l'épreuve est un
        // compteur LOCAL à la journée (chronoData.nextEventId), remis à 1 par
        // clearDayData, alors que raceData.events (le cache) ne l'était pas.
        championship.days[1].chronoData.events = [{ id: 1, name: 'Épreuve 100m' }];
        championship.days[1].chronoData.series = [{
            id: 1, name: 'Série 100m', eventId: 1, sportType: 'running',
            distance: 100, raceType: 'individual',
            participants: [{ id: 1, name: 'Jean Dupont', bib: 1, status: 'ready' }],
            status: 'pending',
        }];

        startChronoRaceForDay(1, 1);
        raceData.currentSerie.participants[0].totalTime = 45000;
        raceData.currentSerie.participants[0].laps = [{ lapNumber: 1, time: 45000, timestamp: 45000 }];
        raceData.currentSerie.isRunning = true;

        clearDayData(1); // compteurs nextEventId/nextSerieId remis à 1

        // Nouvelle épreuve + série créées après le vidage : reprennent le même
        // id local (1) que celles d'avant le vidage.
        championship.days[1].chronoData.events = [{ id: 1, name: 'Nouvelle épreuve' }];
        championship.days[1].chronoData.series = [{
            id: 1, name: 'Nouvelle série', eventId: 1, sportType: 'running',
            distance: 100, raceType: 'individual',
            participants: [{ id: 2, name: 'Paul Martin', bib: 1, status: 'ready' }],
            status: 'pending',
        }];

        startChronoRaceForDay(1, 1);

        expect(raceData.currentSerie.participants[0].totalTime).toBe(0);
        expect(raceData.currentSerie.participants[0].laps).toHaveLength(0);
        expect(raceData.currentSerie.isRunning).toBe(false);
    }
);
