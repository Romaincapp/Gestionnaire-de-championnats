/**
 * @jest-environment jsdom
 *
 * « 📋 Depuis les classements » (showImportPoolRankingsModal, pools.iife.js) :
 * « ↺ Reprendre un classement existant… » propose le classement des autres
 * journées (par division, même ordre que 🏆 Classements) et le classement général.
 */
const { loadModules, DEFAULT_ORDER } = require('../helpers/loadApp');

beforeAll(() => {
    loadModules(DEFAULT_ORDER);
});

const match = (p1, p2, s1, s2) => ({ player1: p1, player2: p2, score1: s1, score2: s2, completed: true, winner: s1 > s2 ? p1 : p2, court: 1, tour: 1 });

beforeEach(() => {
    championship.config = Object.assign({}, championship.config, { numberOfDivisions: 1 });
    championship.days = {
        1: {
            dayType: 'championship',
            players: { 1: ['Alice', 'Bob', 'Chloé', 'Absent'].map(name => ({ name, club: '' })) },
            // Chloé bat tout le monde, Alice bat Bob ; « Absent » n'a pas joué
            matches: { 1: [match('Chloé', 'Alice', 11, 5), match('Chloé', 'Bob', 11, 3), match('Alice', 'Bob', 11, 9)] },
            pools: { enabled: false, divisions: { 1: { pools: [], matches: [] } } },
        },
        2: { dayType: 'chrono', players: {}, matches: {}, chronoData: {} },
        3: { dayType: 'championship', players: { 1: [] }, matches: { 1: [] }, pools: { enabled: true, divisions: { 1: { pools: [], matches: [] } } } },
    };
    document.body.innerHTML = '';
});

afterEach(() => {
    const m = document.getElementById('importPoolRankingsModal');
    if (m) m.remove();
});

test('sources : J1 (joueurs ayant joué, dans l\'ordre du classement) et classement général ; ni la journée courante ni une journée Courses', () => {
    const sources = window.getImportRankingSources(3);
    const day1 = sources.find(s => s.key === 'day:1:1');
    expect(day1).toBeDefined();
    expect(day1.names).toEqual(['Chloé', 'Alice', 'Bob']);
    expect(sources.some(s => s.key.startsWith('general:'))).toBe(true);
    expect(sources.some(s => s.key.startsWith('day:2:') || s.key.startsWith('day:3:'))).toBe(false);
});

test('le menu « Reprendre » remplit la zone du classement choisi et garde la saisie au changement de nombre', () => {
    window.showImportPoolRankingsModal(3);
    const selects = document.querySelectorAll('#poolInputsContainer select');
    expect(selects).toHaveLength(2);
    expect(Array.from(selects[1].options).map(o => o.value)).toContain('day:1:1');

    window.fillPoolInputFromSource(3, 1, 'day:1:1');
    expect(document.getElementById('poolInput_1').value).toBe('Chloé\nAlice\nBob');

    document.getElementById('numPoolsInput').value = '3';
    window.renderPoolInputs(3);
    expect(document.getElementById('poolInput_1').value).toBe('Chloé\nAlice\nBob');
    expect(document.getElementById('poolInput_2').value).toBe('');
});

test('remplacer une saisie existante demande confirmation', () => {
    window.showImportPoolRankingsModal(3);
    const t = document.getElementById('poolInput_0');
    t.value = 'Zoé';
    window.confirm = jest.fn(() => false);
    window.fillPoolInputFromSource(3, 0, 'day:1:1');
    expect(window.confirm).toHaveBeenCalled();
    expect(t.value).toBe('Zoé');
});
