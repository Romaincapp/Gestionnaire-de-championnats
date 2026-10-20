/**
 * @jest-environment jsdom
 *
 * Module scoring : format de score par journée (2 scores / sets best-of N).
 */
const { loadModules } = require('../helpers/loadApp');

beforeAll(() => {
    loadModules(['config', 'utils', 'notifications', 'state', 'scoring']);
});

const BO3 = { mode: 'sets', setsToWin: 2, pointsPerSet: 11 };
const BO5 = { mode: 'sets', setsToWin: 3, pointsPerSet: 11 };

function match(sets, extra = {}) {
    return {
        player1: 'Alice', player2: 'Bob', score1: '', score2: '',
        setScores: sets.map(([s1, s2]) => ({ s1, s2 })), ...extra,
    };
}

describe('getDayScoring', () => {
    beforeEach(() => {
        championship.config = { numberOfDivisions: 1, numberOfCourts: 1 };
        championship.days = { 1: {}, 2: { scoring: BO5 } };
    });

    test('simple par défaut quand rien n\'est configuré', () => {
        expect(getDayScoring(1)).toEqual({ mode: 'simple' });
        expect(isSetsMode(1)).toBe(false);
    });

    test('le format de la journée prime sur le défaut championnat', () => {
        championship.config.defaultScoring = BO3;
        expect(getDayScoring(1)).toEqual(BO3);
        expect(getDayScoring(2)).toEqual(BO5);
    });

    test('normalise les valeurs saisies', () => {
        expect(normalizeScoring({ mode: 'sets', setsToWin: '3', pointsPerSet: '' }))
            .toEqual({ mode: 'sets', setsToWin: 3, pointsPerSet: null });
    });
});

describe('computeMatchResult — mode sets', () => {
    test('BO3 gagné 2-1 avec points de jeu', () => {
        const r = computeMatchResult(match([['11', '8'], ['9', '11'], ['11', '5']]), BO3);
        expect(r).toMatchObject({ score1: 2, score2: 1, completed: true, winner: 'Alice', gamePoints1: 31, gamePoints2: 24 });
    });

    test('BO3 en cours après un set', () => {
        const r = computeMatchResult(match([['11', '8'], ['', ''], ['', '']]), BO3);
        expect(r).toMatchObject({ score1: 1, score2: 0, completed: false, winner: null });
    });

    test('BO5 gagné 3-0, le set saisi en trop est ignoré', () => {
        const r = computeMatchResult(match([['5', '11'], ['8', '11'], ['9', '11'], ['11', '0'], ['', '']]), BO5);
        expect(r).toMatchObject({ score1: 0, score2: 3, completed: true, winner: 'Bob' });
    });

    test('un set à égalité ne compte pour personne', () => {
        const r = computeMatchResult(match([['10', '10'], ['11', '5'], ['', '']]), BO3);
        expect(r).toMatchObject({ score1: 1, score2: 0, completed: false });
    });

    test('sans détail, les sets gagnés saisis directement sont utilisés, sans nul', () => {
        expect(computeMatchResult({ player1: 'A', player2: 'B', score1: '2', score2: '0' }, BO3))
            .toMatchObject({ completed: true, winner: 'A' });
        expect(computeMatchResult({ player1: 'A', player2: 'B', score1: '1', score2: '1' }, BO3))
            .toMatchObject({ completed: false, winner: null });
    });
});

describe('computeMatchResult — mode simple (comportement historique)', () => {
    test('victoire, nul et match vide', () => {
        const m = (s1, s2) => ({ player1: 'A', player2: 'B', score1: s1, score2: s2 });
        expect(computeMatchResult(m('21', '15'), SCORING_SIMPLE)).toMatchObject({ completed: true, winner: 'A' });
        expect(computeMatchResult(m('3', '3'), SCORING_SIMPLE)).toMatchObject({ completed: true, winner: null });
        expect(computeMatchResult(m('', '3'), SCORING_SIMPLE)).toMatchObject({ completed: false, winner: null });
    });

    test('un setScores résiduel est ignoré en mode simple', () => {
        const m = match([['11', '0'], ['11', '0'], ['', '']], { score1: '1', score2: '4' });
        expect(computeMatchResult(m, SCORING_SIMPLE)).toMatchObject({ winner: 'Bob' });
    });
});

test('applyMatchResult écrit score1/score2 = sets gagnés', () => {
    const m = match([['11', '8'], ['11', '9'], ['', '']]);
    applyMatchResult(m, BO3);
    expect(m).toMatchObject({ score1: 2, score2: 0, completed: true, winner: 'Alice' });
});

describe('BYE et forfait', () => {
    test('mode simple : valeurs historiques', () => {
        expect(byeResult(SCORING_SIMPLE)).toMatchObject({ score1: 5, score2: 0 });
        expect(byeResult(SCORING_SIMPLE, 3)).toMatchObject({ score1: 3, score2: 0 });
        expect(forfeitResult(SCORING_SIMPLE, 'player1')).toEqual({ score1: 0, score2: 5 });
    });

    test('mode sets : setsToWin-0 avec sets à pointsPerSet-0', () => {
        const r = forfeitResult(BO3, 'player1');
        expect(r).toMatchObject({ score1: 0, score2: 2 });
        expect(r.setScores).toEqual([{ s1: 0, s2: 11 }, { s1: 0, s2: 11 }, { s1: '', s2: '' }]);
        const m = { player1: 'A', player2: 'B' };
        assignResult(m, r);
        expect(applyMatchResult(m, BO3)).toMatchObject({ winner: 'B', score2: 2 });
    });

    test('mode sets sans points par set : détail vide, sets gagnés seulement', () => {
        const r = byeResult({ mode: 'sets', setsToWin: 3 });
        expect(r.score1).toBe(3);
        expect(hasSetDetail({ setScores: r.setScores })).toBe(false);
    });
});

test('formatScoreDetail', () => {
    expect(formatScoreDetail(match([['11', '8'], ['9', '11'], ['11', '5']], { score1: 2, score2: 1 })))
        .toBe('2-1 (11-8 9-11 11-5)');
    expect(formatScoreDetail({ score1: '21', score2: '15' })).toBe('21-15');
    expect(formatScoreDetail({ score1: '', score2: '' })).toBe('---');
});

test('setValidationWarnings (non bloquant)', () => {
    expect(setValidationWarnings({ s1: '11', s2: '8' }, BO3)).toEqual([]);
    expect(setValidationWarnings({ s1: '12', s2: '10' }, BO3)).toEqual([]);
    expect(setValidationWarnings({ s1: '9', s2: '7' }, BO3)).toHaveLength(1);
    expect(setValidationWarnings({ s1: '15', s2: '10' }, BO3)).toHaveLength(1);
    expect(setValidationWarnings({ s1: '5', s2: '5' }, BO3)).toHaveLength(1);
});

test('ensureSetScores complète sans perdre de saisie', () => {
    const m = { setScores: [{ s1: '11', s2: '3' }] };
    ensureSetScores(m, BO5);
    expect(m.setScores).toHaveLength(5);
    ensureSetScores(m, BO3);
    expect(m.setScores).toHaveLength(3);
    expect(m.setScores[0]).toEqual({ s1: '11', s2: '3' });
});

test('compareRankingStats : points > victoires > diff sets > diff points de jeu', () => {
    const base = { totalPoints: 9, wins: 3, pointsWon: 6, pointsLost: 2 };
    const a = { ...base, name: 'A', gamePointsWon: 80, gamePointsLost: 60 };
    const b = { ...base, name: 'B', gamePointsWon: 90, gamePointsLost: 60 };
    const c = { ...base, name: 'C', pointsLost: 1 };
    expect([a, b, c].sort(compareRankingStats).map(x => x.name)).toEqual(['C', 'B', 'A']);
});

describe('migrateLegacySets (format tennisdetable)', () => {
    test('convertit sans perte et recalcule les sets gagnés', () => {
        const m = {
            player1: 'A', player2: 'B',
            sets: [{ player1Score: 11, player2Score: 7 }, { player1Score: '8', player2Score: '11' }, { player1Score: '11', player2Score: '9' }],
        };
        expect(migrateLegacySets(m)).toBe(true);
        expect(m.sets).toBeUndefined();
        expect(m.setScores[0]).toEqual({ s1: '11', s2: '7' });
        expect(m).toMatchObject({ score1: 2, score2: 1 });
    });

    test('match vide : scores vides', () => {
        const m = { sets: [{ player1Score: '', player2Score: '' }] };
        migrateLegacySets(m);
        expect(m).toMatchObject({ score1: '', score2: '' });
    });

    test('ne touche pas un match sans ancien format', () => {
        const m = { score1: '3', score2: '1' };
        expect(migrateLegacySets(m)).toBe(false);
        expect(m).toEqual({ score1: '3', score2: '1' });
    });
});

describe('buildSetScores (points des sets d\'un BYE : 11-0, 11-5, libre)', () => {
    const sets = r => r && r.filter(x => x.s1 !== '').map(x => `${x.s1}-${x.s2}`);

    test('victoire nette 2-0 en 11-0 et en 11-5', () => {
        expect(sets(buildSetScores(BO3, 2, 0, 0))).toEqual(['11-0', '11-0']);
        expect(sets(buildSetScores(BO3, 2, 0, 5))).toEqual(['11-5', '11-5']);
    });

    test('2-1 : sets alternés, le set décisif en dernier', () => {
        expect(sets(buildSetScores(BO3, 2, 1, 5))).toEqual(['11-5', '5-11', '11-5']);
        expect(sets(buildSetScores(BO3, 1, 2, 5))).toEqual(['5-11', '11-5', '5-11']);
        expect(sets(buildSetScores(BO5, 3, 0, 0))).toEqual(['11-0', '11-0', '11-0']);
    });

    test('le détail redonne bien le même score en sets', () => {
        const m = { player1: 'A', player2: 'BYE', setScores: buildSetScores(BO5, 3, 2, 5) };
        expect(computeMatchResult(m, BO5)).toMatchObject({ score1: 3, score2: 2, winner: 'A', gamePoints1: 43, gamePoints2: 37 });
    });

    test('libre ou sans points par set : pas de détail', () => {
        expect(buildSetScores(BO3, 2, 0, null)).toBeNull();
        expect(buildSetScores({ mode: 'sets', setsToWin: 2 }, 2, 0, 0)).toBeNull();
        expect(buildSetScores(SCORING_SIMPLE, 5, 0, 0)).toBeNull();
    });
});
