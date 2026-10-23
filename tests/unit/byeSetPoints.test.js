/**
 * @jest-environment jsdom
 *
 * Fenêtre « 🎯 Score du match BYE » en mode sets : choix des points de chaque set
 * (11-0, 11-5 ou libre). Le BYE reste modifiable ensuite comme un match normal.
 */
const { loadModules, DEFAULT_ORDER } = require('../helpers/loadApp');

beforeAll(() => {
    loadModules([...DEFAULT_ORDER, 'init']);
});

beforeEach(() => {
    document.body.innerHTML = '';
    championship.config = { numberOfDivisions: 1, numberOfCourts: 1 };
    championship.days = {
        1: {
            scoring: { mode: 'sets', setsToWin: 2, pointsPerSet: 11 },
            players: { 1: ['Alice', 'Bob'] },
            matches: { 1: [] },
        },
    };
});

const bye = () => championship.days[1].matches[1].find(m => m.isBye);
const setsOf = m => (m.setScores || []).filter(x => x.s1 !== '').map(x => `${x.s1}-${x.s2}`);

test('la fenêtre propose 11-0 (par défaut), 11-5 et Libre', () => {
    showByeScoreModal(1, 1, 'Alice');
    const buttons = [...document.querySelectorAll('#byeScoreModal .bye-set-points')];
    expect(buttons.map(b => b.textContent.trim())).toEqual(['11 - 0', '11 - 5', 'Libre']);
    expect(buttons.map(b => b.getAttribute('aria-pressed'))).toEqual(['true', 'false', 'false']);
    setByeSetPointsPreset('5');
    expect(buttons.map(b => b.getAttribute('aria-pressed'))).toEqual(['false', 'true', 'false']);
    closeByeScoreModal();
});

test('11-5 : sets 11-5 11-5, comptés dans les points de jeu', () => {
    showByeScoreModal(1, 1, 'Alice');
    setByeSetPointsPreset('5');
    confirmByeScore(1, 1, 'Alice');
    expect(bye()).toMatchObject({ score1: 2, score2: 0, winner: 'Alice', completed: true });
    expect(setsOf(bye())).toEqual(['11-5', '11-5']);
    expect(calculatePlayerStats(1, 1, 'Alice')).toMatchObject({ gamePointsWon: 22, gamePointsLost: 10 });
});

test('2-1 en 11-5 : détail cohérent avec le score choisi', () => {
    showByeScoreModal(1, 1, 'Alice');
    setByeScorePreset(2, 1);
    setByeSetPointsPreset('5');
    confirmByeScore(1, 1, 'Alice');
    expect(setsOf(bye())).toEqual(['11-5', '5-11', '11-5']);
});

test('Libre : sets gagnés seulement, aucun point de jeu', () => {
    showByeScoreModal(1, 1, 'Alice');
    setByeSetPointsPreset('');
    confirmByeScore(1, 1, 'Alice');
    expect(bye()).toMatchObject({ score1: 2, score2: 0, winner: 'Alice' });
    expect(bye().setScores).toBeUndefined();
    expect(calculatePlayerStats(1, 1, 'Alice')).toMatchObject({ gamePointsWon: 0, gamePointsLost: 0 });
});

test('sans points par set ou en 2 scores : pas de choix proposé', () => {
    championship.days[1].scoring = { mode: 'sets', setsToWin: 2, pointsPerSet: null };
    showByeScoreModal(1, 1, 'Alice');
    expect(document.querySelector('#byeScoreModal .bye-set-points')).toBeNull();
    closeByeScoreModal();
    championship.days[1].scoring = { mode: 'simple' };
    showByeScoreModal(1, 1, 'Alice');
    expect(document.querySelector('#byeScoreModal .bye-set-points')).toBeNull();
    expect(document.getElementById('byeScorePlayer').value).toBe('5');
    closeByeScoreModal();
});
