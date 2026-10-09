/**
 * @jest-environment jsdom
 *
 * « ➕ Match » d'une poule (showAddPoolMatchModal, matches.iife.js) : la fin de
 * la fonction lisait une variable inexistante (poolPlayers), d'où une
 * ReferenceError à chaque ouverture, et le 2e joueur n'était jamais
 * présélectionné. Trouvé par l'audit du mode sombre (tests/e2e/darkmode.e2e.js).
 */
const { loadModules, DEFAULT_ORDER } = require('../helpers/loadApp');

beforeAll(() => {
    loadModules(DEFAULT_ORDER);
});

beforeEach(() => {
    championship.days = {
        1: {
            players: { 1: [] },
            matches: { 1: [] },
            pools: { enabled: true, divisions: { 1: { pools: [['Alice', 'Bob', 'BYE1']], matches: [] } } },
        },
    };
});

afterEach(() => {
    const modal = document.getElementById('add-pool-match-modal');
    if (modal) modal.remove();
});

test('s\'ouvre sans erreur et présélectionne un 2e joueur différent du 1er', () => {
    expect(() => window.showAddPoolMatchModal(1, 1, 0)).not.toThrow();
    expect(document.getElementById('add-pool-match-modal')).not.toBeNull();
    expect(document.getElementById('add-match-player1').value).toBe('Alice');
    expect(document.getElementById('add-match-player2').value).toBe('Bob');
});
