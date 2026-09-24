/**
 * @jest-environment jsdom
 *
 * La modale "✏️ Modifier le joueur" injectait le nom tel quel dans
 * value="..." et dans le onclick du bouton Sauvegarder : un nom contenant
 * un guillemet cassait l'attribut et permettait d'injecter du HTML/JS.
 */
const { loadModules, DEFAULT_ORDER } = require('../helpers/loadApp');

const TRICKY = 'Ann"onclick="window.__pwned=1';

beforeAll(() => {
    loadModules(DEFAULT_ORDER);
});

beforeEach(() => {
    championship.config = { numberOfDivisions: 1, numberOfCourts: 4 };
    championship.days = {
        1: {
            players: { 1: [{ name: TRICKY, club: '' }, { name: "O'Brien", club: '' }] },
            matches: { 1: [{ player1: TRICKY, player2: "O'Brien", score1: '', score2: '' }] },
        },
    };
    document.body.innerHTML = '<div id="divisions-1"></div>';
    delete window.__pwned;
});

afterEach(() => {
    window.closeEditPlayerModal();
});

test('le nom est affiché tel quel, sans injecter d\'attribut', () => {
    window.editPlayer(1, 1, TRICKY);

    const input = document.getElementById('editPlayerNameInput');
    expect(input.value).toBe(TRICKY);
    expect(input.hasAttribute('onclick')).toBe(false);
    const saveBtn = document.querySelector('#editPlayerModal .btn-primary');
    expect(saveBtn.getAttribute('onclick')).toBe('saveEditedPlayer(1, 1, 0)');
});

test('renommer met aussi à jour les matchs (nom d\'origine relu depuis les données)', () => {
    window.editPlayer(1, 1, TRICKY);
    document.getElementById('editPlayerNameInput').value = 'Ann Martin';
    window.saveEditedPlayer(1, 1, 0);

    expect(championship.days[1].players[1][0].name).toBe('Ann Martin');
    expect(championship.days[1].matches[1][0].player1).toBe('Ann Martin');
    expect(window.__pwned).toBeUndefined();
});
