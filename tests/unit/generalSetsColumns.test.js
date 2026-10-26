/**
 * @jest-environment jsdom
 *
 * Classement général : colonnes de sets comme le classement de journée
 * (Sets G/P, Diff sets, Pts jeu ±), et Sets G/P en plus quand des journées
 * en 2 scores et en sets se mélangent.
 */
const { loadModules, DEFAULT_ORDER } = require('../helpers/loadApp');

beforeAll(() => {
    loadModules([...DEFAULT_ORDER, 'init']);
});

const setsMatch = (p1, p2, sets) => ({
    player1: p1, player2: p2, tour: 1, court: 1,
    setScores: sets.map(([s1, s2]) => ({ s1, s2 })), score1: '', score2: '', completed: false, winner: null,
});

function setup(day2Scoring) {
    document.body.innerHTML = '<div id="generalStats"></div><div id="generalRankingContent"></div>';
    championship.config = { numberOfDivisions: 1, numberOfCourts: 1 };
    const scoring = { mode: 'sets', setsToWin: 2, pointsPerSet: 11 };
    championship.days = {
        1: { scoring, players: { 1: ['Alice', 'Bob'] }, matches: { 1: [setsMatch('Alice', 'Bob', [[11, 5], [9, 11], [11, 7]])] } },
        2: { scoring: day2Scoring, players: { 1: ['Alice', 'Bob'] },
             matches: { 1: [day2Scoring.mode === 'sets'
                 ? setsMatch('Alice', 'Bob', [[11, 3], [11, 4]])
                 : { player1: 'Alice', player2: 'Bob', tour: 1, court: 1, score1: '7', score2: '4', completed: false, winner: null }] } },
    };
    [1, 2].forEach(d => championship.days[d].matches[1].forEach(m => applyMatchResult(m, getDayScoring(d))));
}

const headers = () => [...document.querySelectorAll('#generalRankingContent th')].map(t => t.textContent.trim());
const aliceRow = () => [...document.querySelectorAll('#generalRankingContent tbody tr')]
    .find(r => r.textContent.includes('Alice')).querySelectorAll('td');

test('toutes les journées en sets : Sets G/P, Diff sets, Pts jeu ±', () => {
    setup({ mode: 'sets', setsToWin: 2, pointsPerSet: 11 });
    expect(generalSetsMode()).toBe('all');
    updateGeneralRanking();
    expect(headers()).toEqual(expect.arrayContaining(['Sets G/P', 'Diff sets', 'Pts jeu ±']));
    const cells = [...aliceRow()].map(td => td.textContent.trim());
    expect(cells).toContain('4/1');   // 2-1 puis 2-0
    expect(cells[cells.length - 1]).toBe('+23'); // 31-23 (+8) puis 22-7 (+15)
});

test('journées mélangées : PP/PC gardé, Sets G/P ajouté (journées en sets seulement)', () => {
    setup({ mode: 'simple' });
    expect(generalSetsMode()).toBe('mixed');
    updateGeneralRanking();
    expect(headers()).toEqual(expect.arrayContaining(['PP/PC', 'Diff', 'Sets G/P', 'Pts jeu ±']));
    const cells = [...aliceRow()].map(td => td.textContent.trim());
    expect(cells).toContain('2/1');
});

test('aucune journée en sets : pas de colonne de sets', () => {
    setup({ mode: 'simple' });
    championship.days[1] = { scoring: { mode: 'simple' }, players: { 1: ['Alice', 'Bob'] }, matches: { 1: [] } };
    expect(generalSetsMode()).toBe('none');
    updateGeneralRanking();
    expect(headers()).not.toContain('Sets G/P');
});
