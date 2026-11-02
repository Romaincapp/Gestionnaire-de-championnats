/**
 * @jest-environment jsdom
 *
 * Format de score « Score unique » (bowling…) : une case par joueur, pas de matchs.
 * Le plus haut gagne (ex æquo au même rang), le classement général additionne les
 * scores des journées, une journée manquée compte 0 (pas de forfaits).
 */
const { loadModules, DEFAULT_ORDER } = require('../helpers/loadApp');

beforeAll(() => {
    loadModules([...DEFAULT_ORDER, 'init']);
});

const SINGLE = { mode: 'single' };

function setup() {
    document.body.innerHTML = `
        <div id="generalStats"></div><div id="generalRankingContent"></div>
        <div id="division1-1-matches"></div><div id="division1-1-players"></div><span id="player-count-1-1"></span>
        <div id="rankings-1" style="display:none"><div id="rankingsContent-1"></div></div>
        <div id="stats-1" style="display:none"><div id="statsContent-1"></div></div>`;
    Element.prototype.scrollIntoView = function() {};
    championship.config = { numberOfDivisions: 1, numberOfCourts: 1 };
    championship.days = {
        1: { scoring: SINGLE, players: { 1: ['Alice', { name: 'Bob', club: 'X' }, 'Chloé'] }, matches: { 1: [] } },
        2: { scoring: SINGLE, players: { 1: ['Alice', 'Bob'] }, matches: { 1: [] } },
    };
}

beforeEach(setup);

test('normalizeScoring garde le mode single et le libellé', () => {
    expect(normalizeScoring({ mode: 'single' })).toEqual({ mode: 'single' });
    expect(isSingleScoreMode(1)).toBe(true);
    expect(scoringLabel(SINGLE)).toBe('Score unique');
    expect(renderDayScoringControl(1)).toContain('value="single" selected');
});

test('liste des joueurs avec une case chacun, Entrée passe au suivant', () => {
    updateMatchesDisplay(1);
    const inputs = document.querySelectorAll('#division1-1-matches .single-score-input');
    expect(inputs).toHaveLength(3);
    expect(document.querySelector('#division1-1-matches .match')).toBeNull();

    inputs[0].value = '187';
    inputs[0].focus();
    inputs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(championship.days[1].singleScores[1].Alice).toBe(187);
    expect(document.activeElement).toBe(inputs[1]);
    expect(document.querySelector('.single-score-progress').textContent).toBe('1/3 saisis');
});

test('classement de journée : le plus haut d\'abord, ex æquo au même rang', () => {
    setSingleScore(1, 1, 'Alice', '150');
    setSingleScore(1, 1, 'Bob', '210');
    setSingleScore(1, 1, 'Chloé', '150');
    expect(singleScoreRanking(1, 1).map(r => [r.name, r.rank])).toEqual([['Bob', 1], ['Alice', 2], ['Chloé', 2]]);

    updateRankingsForDay(1);
    const rows = [...document.querySelectorAll('#rankingsContent-1 tbody tr')].map(tr => [...tr.cells].map(td => td.textContent.trim()));
    expect(rows).toEqual([['1', 'Bob', '210'], ['2', 'Alice', '150'], ['2', 'Chloé', '150']]);
});

test('une case vidée retire le score', () => {
    setSingleScore(1, 1, 'Alice', '150');
    setSingleScore(1, 1, 'Alice', '');
    expect(getSingleScore(1, 1, 'Alice')).toBeNull();
});

test('classement général : somme des scores, journée manquée = 0 sans forfait', () => {
    setSingleScore(1, 1, 'Alice', 150);
    setSingleScore(1, 1, 'Bob', 200);
    setSingleScore(1, 1, 'Chloé', 190);
    setSingleScore(2, 1, 'Alice', 180);
    setSingleScore(2, 1, 'Bob', 100);
    const ranking = calculateGeneralRanking().divisions[1];
    expect(ranking.map(p => [p.name, p.totalPoints, p.totalForfaits])).toEqual([
        ['Alice', 330, 0], ['Bob', 300, 0], ['Chloé', 190, 0],
    ]);

    updateGeneralRanking();
    const headers = [...document.querySelectorAll('#generalRankingContent th')].map(t => t.textContent.trim());
    expect(headers).toEqual(['Rang', 'Joueur', 'Score total', 'Journées', 'Moyenne']);
    const alice = [...document.querySelectorAll('#generalRankingContent tbody tr')][0];
    expect([...alice.cells].map(td => td.textContent.trim())).toEqual(['1', 'Alice', '330', '2', '165']);
});

test('renommer un joueur garde son score', () => {
    setSingleScore(1, 1, 'Alice', 150);
    renameSingleScore(championship.days[1], 'Alice', 'Alice Martin');
    expect(getSingleScore(1, 1, 'Alice Martin')).toBe(150);
    expect(getSingleScore(1, 1, 'Alice')).toBeNull();
});

test('boutons propres aux matchs masqués, 🏆 Classements dès le premier score', () => {
    document.body.innerHTML += `
        <button id="gen" data-day="1" data-needs="players" data-match-only>Matchs</button>
        <button id="rank" data-day="1" data-needs="matches">Classements</button>`;
    refreshDayActionButtons();
    expect(document.getElementById('gen').hidden).toBe(true);
    expect(document.getElementById('rank').hidden).toBe(true);
    setSingleScore(1, 1, 'Alice', 150);
    refreshDayActionButtons();
    expect(document.getElementById('rank').hidden).toBe(false);
});

test('passer en score unique garde les matchs existants (masqués) après confirmation', () => {
    championship.days[1] = {
        scoring: { mode: 'simple' }, players: { 1: ['Alice', 'Bob'] },
        matches: { 1: [{ player1: 'Alice', player2: 'Bob', tour: 1, court: 1, score1: '5', score2: '3', completed: true, winner: 'Alice' }] },
    };
    window.confirm = jest.fn(() => true);
    expect(setDayScoring(1, SINGLE)).toBe(true);
    expect(window.confirm).toHaveBeenCalled();
    expect(championship.days[1].matches[1]).toHaveLength(1);
    expect(calculatePlayerStats(1, 1, 'Alice').totalPoints).toBe(0); // le match ne compte plus
});
