/**
 * @jest-environment jsdom
 *
 * Régression pour l'issue #69 : après avoir supprimé ~935 lignes de code
 * mort autour de printChronoCompetition dans chrono.iife.js
 * (exportChronoRankingToPDF, showChronoPdfConfigModal, generateChronoPDF,
 * generateOverallChronoRanking_OLD, exportOverallChronoRanking,
 * printOverallChronoRanking, confirmExportChronoCompetition,
 * exportOverallChronoRankingToPDF), on vérifie que printChronoCompetition()
 * elle-même — confirmée vivante à l'issue #65, appelée depuis
 * multisport.iife.js — fonctionne toujours, y compris son usage interne de
 * calculateClubRanking() pour les séries de type interclub.
 */
const { loadModules } = require('../helpers/loadApp');

beforeAll(() => {
    loadModules(['config', 'utils', 'notifications', 'state', 'clubs', 'multisport', 'chrono']);
});

function makePrintWindowMock() {
    return {
        document: { write: jest.fn(), close: jest.fn() },
        focus: jest.fn(),
        print: jest.fn(),
    };
}

beforeEach(() => {
    jest.useFakeTimers();
    raceData.events = [];
    raceData.participants = [];

    championship.days = {
        1: {
            dayType: 'chrono',
            chronoData: {
                events: [{
                    id: 1,
                    name: '100m Interclub',
                    raceType: 'interclub',
                    interclubPoints: [10, 8, 6],
                    series: [{
                        id: 1,
                        name: 'Série 1',
                        eventId: 1,
                        status: 'completed',
                        participants: [
                            { id: 1, name: 'Alice', club: 'Club A', status: 'finished', finishTime: 1000 },
                            { id: 2, name: 'Bob', club: 'Club B', status: 'finished', finishTime: 1500 },
                        ],
                    }],
                }],
                participants: [
                    { id: 1, name: 'Alice', club: 'Club A' },
                    { id: 2, name: 'Bob', club: 'Club B' },
                ],
            },
        },
    };
});

afterEach(() => {
    jest.useRealTimers();
});

test("ne plante pas et ouvre bien une fenêtre d'impression", () => {
    const mockWindow = makePrintWindowMock();
    window.open = jest.fn(() => mockWindow);

    expect(() => printChronoCompetition(1)).not.toThrow();

    expect(window.open).toHaveBeenCalled();
    expect(mockWindow.document.write).toHaveBeenCalled();
});

test('inclut le classement interclub par club dans le contenu imprimé (calculateClubRanking)', () => {
    const mockWindow = makePrintWindowMock();
    window.open = jest.fn(() => mockWindow);

    printChronoCompetition(1);

    const printedHtml = mockWindow.document.write.mock.calls[0][0];
    expect(printedHtml).toContain('Alice');
    expect(printedHtml).toContain('Club A');
});

test('affiche une colonne Catégorie avec le rang par catégorie quand 2+ catégories sont présentes (feature catégories)', () => {
    championship.days[1].chronoData.events[0].raceType = 'individual';
    championship.days[1].chronoData.events[0].series[0].participants = [
        { id: 1, name: 'Alice', club: 'Club A', category: 'Solo', status: 'finished', finishTime: 1000, totalDistance: 0, laps: [] },
        { id: 2, name: 'Bob', club: 'Club B', category: 'Équipe', status: 'finished', finishTime: 1500, totalDistance: 0, laps: [] },
        { id: 3, name: 'Carol', club: 'Club A', category: 'Solo', status: 'finished', finishTime: 2000, totalDistance: 0, laps: [] },
    ];

    const mockWindow = makePrintWindowMock();
    window.open = jest.fn(() => mockWindow);

    printChronoCompetition(1);

    const printedHtml = mockWindow.document.write.mock.calls[0][0];
    expect(printedHtml).toContain('Catégorie');
    expect(printedHtml).toContain('Pos. Scratch');
    // Alice : 1ère scratch, 1ère Solo (2 Solo au total)
    expect(printedHtml).toContain('Solo (1e/2)');
    // Carol : 3e scratch, 2e Solo
    expect(printedHtml).toContain('Solo (2e/2)');
});

test("n'affiche pas de colonne Catégorie quand une seule catégorie est présente (non-régression)", () => {
    championship.days[1].chronoData.events[0].raceType = 'individual';
    championship.days[1].chronoData.events[0].series[0].participants = [
        { id: 1, name: 'Alice', club: 'Club A', category: 'Solo', status: 'finished', finishTime: 1000, totalDistance: 0, laps: [] },
        { id: 2, name: 'Bob', club: 'Club B', category: 'Solo', status: 'finished', finishTime: 1500, totalDistance: 0, laps: [] },
    ];

    const mockWindow = makePrintWindowMock();
    window.open = jest.fn(() => mockWindow);

    printChronoCompetition(1);

    const printedHtml = mockWindow.document.write.mock.calls[0][0];
    expect(printedHtml).not.toContain('>Catégorie<');
    expect(printedHtml).not.toContain('Pos. Scratch');
});

test("avertit sans planter si aucune épreuve n'existe pour la journée", () => {
    championship.days = { 2: { dayType: 'championship', players: {}, matches: {} } };
    window.open = jest.fn();

    expect(() => printChronoCompetition(2)).not.toThrow();
    expect(window.open).not.toHaveBeenCalled();
});
