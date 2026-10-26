/**
 * @jest-environment jsdom
 *
 * Liste des joueurs en tableau (façon « data table ») : colonne de sélection,
 * « tout sélectionner » (filtre respecté), filtre sans accents, menu « ⋯ » par
 * ligne, suppression groupée (une confirmation, matchs retirés).
 */
const { loadModules, DEFAULT_ORDER } = require('../helpers/loadApp');

beforeAll(() => {
    loadModules([...DEFAULT_ORDER, 'init']);
});

beforeEach(() => {
    document.body.innerHTML = '<span id="player-count-1-1"></span><div id="division1-1-players"></div><div id="division1-1-matches"></div>';
    championship.config = { numberOfDivisions: 1, numberOfCourts: 1 };
    championship.days = {
        1: {
            players: { 1: [{ name: 'Alice', club: 'Boulaie' }, { name: "O'Neil", club: '' }, { name: 'Élodie', club: 'Jalon' }] },
            matches: { 1: [
                { player1: 'Alice', player2: "O'Neil", tour: 1, court: 1, score1: '', score2: '', completed: false },
                { player1: 'Alice', player2: 'Élodie', tour: 2, court: 1, score1: '', score2: '', completed: false },
            ] },
        },
    };
    window.confirm = jest.fn(() => true);
    updatePlayersDisplay(1);
});

const wrap = () => document.querySelector('#division1-1-players .player-table-wrap');
const rows = () => Array.from(wrap().querySelectorAll('tbody tr'));
const check = (i, value = true) => {
    const cb = rows()[i].querySelector('.pt-select input');
    cb.checked = value;
    onPlayerRowSelect(cb);
};

test('un tableau : sélection, joueur, club, menu « ⋯ » par ligne', () => {
    expect(document.querySelector('.player-tag')).toBeNull();
    expect(Array.from(wrap().querySelectorAll('thead th')).map(th => th.textContent.trim())).toEqual(['', 'Joueur', 'Club', 'Actions']);
    expect(rows().map(tr => tr.dataset.name)).toEqual(['Alice', "O'Neil", 'Élodie']);
    expect(rows()[0].querySelector('.pt-club').textContent).toBe('Boulaie');
    expect(rows()[1].querySelector('.pt-menu-btn').getAttribute('aria-label')).toBe("Actions pour O'Neil");
    expect(wrap().querySelector('.pt-footer').textContent).toBe('0 sur 3 sélectionné');
    expect(wrap().querySelector('.pt-bulk-delete').hidden).toBe(true);
});

test('sélection : compteur, case d\'en-tête indéterminée puis cochée, bouton groupé', () => {
    check(0);
    const head = wrap().querySelector('thead .pt-select input');
    expect(head.indeterminate).toBe(true);
    expect(wrap().querySelector('.pt-footer').textContent).toBe('1 sur 3 sélectionné');
    expect(wrap().querySelector('.pt-bulk-delete').hidden).toBe(false);
    head.checked = true;
    togglePlayerSelectAll(head);
    expect(rows().every(tr => tr.classList.contains('pt-selected'))).toBe(true);
    expect(head.indeterminate).toBe(false);
    expect(wrap().querySelector('.pt-footer').textContent).toBe('3 sur 3 sélectionnés');
});

test('filtre sans accents ; « tout sélectionner » ne coche que les lignes visibles', () => {
    const input = wrap().querySelector('.pt-filter');
    input.value = 'elod';
    filterPlayerTable(input);
    expect(rows().filter(tr => !tr.hidden).map(tr => tr.dataset.name)).toEqual(['Élodie']);
    const head = wrap().querySelector('thead .pt-select input');
    head.checked = true;
    togglePlayerSelectAll(head);
    expect(rows().filter(tr => tr.querySelector('.pt-select input').checked).map(tr => tr.dataset.name)).toEqual(['Élodie']);
});

test('suppression de la sélection : une confirmation, joueurs et matchs retirés', () => {
    check(1);
    check(2);
    removeSelectedPlayers(wrap().querySelector('.pt-bulk-delete'));
    expect(window.confirm).toHaveBeenCalledTimes(1);
    expect(window.confirm.mock.calls[0][0]).toMatch(/ces 2 joueurs/);
    expect(championship.days[1].players[1].map(p => p.name)).toEqual(['Alice']);
    expect(championship.days[1].matches[1]).toEqual([]);
    expect(rows().map(tr => tr.dataset.name)).toEqual(['Alice']);
});

test('suppression annulée : rien ne change', () => {
    window.confirm = jest.fn(() => false);
    expect(removePlayers(1, 1, ['Alice'])).toBe(false);
    expect(championship.days[1].players[1]).toHaveLength(3);
});

test('menu « ⋯ » : Modifier, Détails, Supprimer', () => {
    const btn = rows()[1].querySelector('.pt-menu-btn');
    btn.click();
    const items = Array.from(document.querySelectorAll('#playerRowMenu [role="menuitem"] .am-label')).map(e => e.textContent);
    expect(items).toEqual(['Modifier', 'Détails', 'Supprimer']);
    expect(btn.getAttribute('aria-expanded')).toBe('true');
    closeActionMenu(false);
});
