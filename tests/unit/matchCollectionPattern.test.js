/**
 * @jest-environment jsdom
 *
 * Régression pour le "Match Collection Pattern" documenté dans claude.md
 * comme piège #1 le plus fréquent du codebase : calculatePlayerStats()
 * DOIT inclure les matchs de poule et de phase finale, pas seulement les
 * matchs classiques par tours — sinon les classements sont incomplets.
 */
const { loadModules } = require('../helpers/loadApp');

beforeAll(() => {
    loadModules([
        'config', 'utils', 'notifications', 'state', 'clubs', 'multisport',
        'players', 'ui', 'matches', 'pools', 'ranking',
    ]);
});

beforeEach(() => {
    championship.config = { numberOfDivisions: 1, numberOfCourts: 4 };
});

test('calculatePlayerStats compte un match classique complété', () => {
    championship.days = {
        1: {
            players: { 1: ['Alice', 'Bob'] },
            matches: { 1: [{ id: 'm1', player1: 'Alice', player2: 'Bob', score1: '21', score2: '15' }] },
        },
    };

    const stats = calculatePlayerStats(1, 1, 'Alice');
    expect(stats.matchesPlayed).toBe(1);
    expect(stats.wins).toBe(1);
});

test('calculatePlayerStats inclut les matchs de poule (pas seulement les matchs classiques)', () => {
    championship.days = {
        1: {
            players: { 1: ['Alice', 'Bob'] },
            matches: { 1: [] }, // aucun match classique
            pools: {
                enabled: true,
                divisions: {
                    1: {
                        pools: [['Alice', 'Bob']],
                        matches: [{
                            id: 'p1', player1: 'Alice', player2: 'Bob',
                            score1: 21, score2: 10, completed: true, winner: 'Alice',
                        }],
                        finalPhase: [],
                    },
                },
            },
        },
    };

    const stats = calculatePlayerStats(1, 1, 'Alice');
    // Si le pattern de collecte oublie les matchs de poule, ce test échoue avec matchesPlayed=0
    expect(stats.matchesPlayed).toBe(1);
    expect(stats.wins).toBe(1);
    expect(stats.pointsWon).toBe(21);
});

test('calculatePlayerStats inclut les matchs de phase finale (ancien système)', () => {
    championship.days = {
        1: {
            players: { 1: ['Alice', 'Bob'] },
            matches: { 1: [] },
            pools: {
                enabled: true,
                divisions: {
                    1: {
                        pools: [['Alice', 'Bob']],
                        matches: [],
                        finalPhase: [{
                            id: 'f1', player1: 'Alice', player2: 'Bob',
                            score1: 21, score2: 18, completed: true, winner: 'Alice',
                        }],
                    },
                },
            },
        },
    };

    const stats = calculatePlayerStats(1, 1, 'Alice');
    expect(stats.matchesPlayed).toBe(1);
    expect(stats.wins).toBe(1);
});

test('calculatePlayerStats additionne matchs classiques ET matchs de poule pour le même joueur', () => {
    championship.days = {
        1: {
            players: { 1: ['Alice', 'Bob', 'Carol'] },
            matches: { 1: [{ id: 'm1', player1: 'Alice', player2: 'Carol', score1: '21', score2: '19' }] },
            pools: {
                enabled: true,
                divisions: {
                    1: {
                        pools: [['Alice', 'Bob']],
                        matches: [{
                            id: 'p1', player1: 'Alice', player2: 'Bob',
                            score1: 21, score2: 10, completed: true, winner: 'Alice',
                        }],
                        finalPhase: [],
                    },
                },
            },
        },
    };

    const stats = calculatePlayerStats(1, 1, 'Alice');
    expect(stats.matchesPlayed).toBe(2);
    expect(stats.wins).toBe(2);
});
