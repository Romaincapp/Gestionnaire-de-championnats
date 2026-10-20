/**
 * @jest-environment jsdom
 *
 * Journée en mode sets : fin de match sans nul, statistiques (sets + points de jeu),
 * départage du classement et reprise d'un export tennisdetable (`sets` legacy).
 */
const { loadModules } = require('../helpers/loadApp');

beforeAll(() => {
    loadModules([
        'config', 'utils', 'notifications', 'state', 'clubs', 'multisport',
        'players', 'ui', 'scoring', 'matches', 'pools', 'ranking',
    ]);
});

const BO3 = { mode: 'sets', setsToWin: 2, pointsPerSet: 11 };

function m(player1, player2, sets) {
    return {
        player1, player2, tour: 1, score1: '', score2: '', completed: false, winner: null,
        setScores: sets.map(([s1, s2]) => ({ s1, s2 })),
    };
}

beforeEach(() => {
    championship.config = { numberOfDivisions: 1, numberOfCourts: 1 };
});

test('checkMatchCompletion en mode sets : sets gagnés et pas de match nul', () => {
    championship.days = {
        1: {
            scoring: BO3,
            players: { 1: ['Alice', 'Bob'] },
            matches: { 1: [m('Alice', 'Bob', [['11', '8'], ['9', '11'], ['', '']])] },
        },
    };
    checkMatchCompletion(1, 1, 0);
    expect(championship.days[1].matches[1][0]).toMatchObject({ score1: 1, score2: 1, completed: false, winner: null });

    championship.days[1].matches[1][0].setScores[2] = { s1: '7', s2: '11' };
    checkMatchCompletion(1, 1, 0);
    expect(championship.days[1].matches[1][0]).toMatchObject({ score1: 1, score2: 2, completed: true, winner: 'Bob' });
});

test('checkMatchCompletion en mode 2 scores : inchangé (nul permis, setScores ignoré)', () => {
    championship.days = {
        1: {
            players: { 1: ['Alice', 'Bob'] },
            matches: { 1: [{ player1: 'Alice', player2: 'Bob', score1: '3', score2: '3' }] },
        },
    };
    checkMatchCompletion(1, 1, 0);
    expect(championship.days[1].matches[1][0]).toMatchObject({ completed: true, winner: null });
});

test('calculatePlayerStats : sets en PP/PC, points de jeu à part', () => {
    championship.days = {
        1: {
            scoring: BO3,
            players: { 1: ['Alice', 'Bob'] },
            matches: { 1: [m('Alice', 'Bob', [['11', '8'], ['9', '11'], ['11', '5']])] },
        },
    };
    const stats = calculatePlayerStats(1, 1, 'Bob');
    expect(stats).toMatchObject({ wins: 0, losses: 1, pointsWon: 1, pointsLost: 2, gamePointsWon: 24, gamePointsLost: 31 });
});

test('départage : à points, victoires et sets égaux, la différence de points de jeu décide', () => {
    // Triangle A>B, B>C, C>A, tous 2-1 en sets : seuls les points de jeu départagent
    championship.days = {
        1: {
            scoring: BO3,
            players: { 1: ['Ana', 'Ben', 'Cid'] },
            matches: {
                1: [
                    m('Ana', 'Ben', [['11', '9'], ['5', '11'], ['11', '9']]),   // Ana 27-29
                    m('Ben', 'Cid', [['11', '2'], ['3', '11'], ['11', '2']]),   // Ben 25-15
                    m('Cid', 'Ana', [['11', '9'], ['9', '11'], ['11', '9']]),   // Cid 31-29
                ],
            },
        },
    };
    const order = getMatchsDayDivisionOrder(1, 1).map(r => r.name);
    const stats = order.map(n => calculatePlayerStats(1, 1, n));
    stats.forEach(s => expect(s).toMatchObject({ totalPoints: 4, wins: 1 }));
    expect(stats.map(s => s.pointsWon - s.pointsLost)).toEqual([0, 0, 0]);
    // Points de jeu : Ben 54-42 (+12), Ana 56-60 (-4), Cid 46-54 (-8)
    expect(order).toEqual(['Ben', 'Ana', 'Cid']);
});

test('normalizeDayScoring reprend une journée tennisdetable (sets legacy) en BO3', () => {
    const day = {
        players: { 1: ['Alice', 'Bob'] },
        matches: {
            1: [{
                player1: 'Alice', player2: 'Bob', tour: 1, completed: true, winner: 'Alice',
                sets: [{ player1Score: 11, player2Score: 7 }, { player1Score: 11, player2Score: 4 }, { player1Score: '', player2Score: '' }],
            }],
        },
    };
    expect(normalizeDayScoring(day)).toBe(true);
    expect(day.scoring).toEqual(BO3);
    const match = day.matches[1][0];
    expect(match.sets).toBeUndefined();
    expect(match).toMatchObject({ score1: 2, score2: 0 });
    expect(match.setScores).toEqual([{ s1: '11', s2: '7' }, { s1: '11', s2: '4' }, { s1: '', s2: '' }]);
});

test('normalizeDayScoring : défaut du fichier appliqué, journée chrono ignorée', () => {
    const plain = { players: {}, matches: { 1: [] } };
    expect(normalizeDayScoring(plain, { mode: 'sets', setsToWin: 3 })).toBe(false);
    expect(plain.scoring).toEqual({ mode: 'sets', setsToWin: 3, pointsPerSet: null });

    const chrono = { dayType: 'chrono', players: {}, matches: {} };
    normalizeDayScoring(chrono, BO3);
    expect(chrono.scoring).toBeUndefined();
});

test('BYE de poule en mode sets : victoire setsToWin-0 au lieu du 0-0 historique', () => {
    championship.days = { 1: { scoring: BO3, players: { 1: [] }, matches: { 1: [] } } };
    expect(byeFieldsForDay(1, 0, 2)).toEqual({
        score1: 0, score2: 2,
        setScores: [{ s1: 0, s2: 11 }, { s1: 0, s2: 11 }, { s1: '', s2: '' }],
    });
    championship.days[1].scoring = { mode: 'simple' };
    expect(byeFieldsForDay(1, 5)).toEqual({ score1: 5, score2: 0 });
});
