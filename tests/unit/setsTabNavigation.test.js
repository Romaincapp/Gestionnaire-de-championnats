/**
 * @jest-environment jsdom
 *
 * Mode sets (BO3/BO5), matchs par tours : Tab doit passer à la case suivante de la
 * grille. Avant, handleEnterKey lisait les 2 premières cases (set 1) comme score1/score2,
 * bloquait Tab (preventDefault) et validait le match avec ces faux scores.
 */
const { loadModules, DEFAULT_ORDER } = require('../helpers/loadApp');

beforeAll(() => {
    loadModules([...DEFAULT_ORDER, 'init']);
});

const BO3 = { mode: 'sets', setsToWin: 2, pointsPerSet: 11 };

beforeEach(() => {
    document.body.innerHTML = `
        <div id="generalStats"></div><div id="generalRankingContent"></div>
        <div id="division1-1-matches"></div><div id="division1-1-players"></div><span id="player-count-1-1"></span>
        <div id="rankings-1" style="display:none"><div id="rankingsContent-1"></div></div>
        <div id="stats-1" style="display:none"><div id="statsContent-1"></div></div>`;
    Element.prototype.scrollIntoView = function() {};
    championship.config = { numberOfDivisions: 1, numberOfCourts: 1 };
    championship.days = {
        1: {
            scoring: BO3, players: { 1: ['Alice', 'Bob'] },
            matches: { 1: [{ player1: 'Alice', player2: 'Bob', tour: 1, court: 1, score1: '', score2: '', completed: false, winner: null }] },
        },
    };
    updateMatchesDisplay(1);
});

const inputs = () => [...document.querySelectorAll('#division1-1-matches .set-score-input')];
const tab = (el, shiftKey = false) => {
    const e = new KeyboardEvent('keydown', { key: 'Tab', shiftKey, bubbles: true, cancelable: true });
    el.dispatchEvent(e);
    return e;
};

test('Tab dans un set en cours : navigation libre, match ni validé ni faussé', () => {
    const [a1, b1] = inputs();
    a1.value = '11';
    expect(tab(a1).defaultPrevented).toBe(false);
    b1.value = '2';
    expect(tab(b1).defaultPrevented).toBe(false);   // avant : Tab bloqué ici
    const m = championship.days[1].matches[1][0];
    expect(m.completed).toBe(false);
    expect(m.setScores[0]).toEqual({ s1: '11', s2: '2' });
    expect(m.score1).toBe(1);   // sets gagnés, pas « 11 »
    expect(m.score2).toBe(0);
});

test('Tab en quittant le dernier set utile : le match est validé', () => {
    const cells = inputs();
    [['11', '2'], ['11', '5']].forEach(([a, b], i) => { cells[2 * i].value = a; cells[2 * i + 1].value = b; });
    tab(cells[3]);
    const m = championship.days[1].matches[1][0];
    expect(m.completed).toBe(true);
    expect(m.winner).toBe('Alice');
    expect([m.score1, m.score2]).toEqual([2, 0]);
});
