/**
 * @jest-environment jsdom
 *
 * Feuilles pétanque (4 par page A4) : chaque coin est réservé à un tour pour
 * l'impression recto verso puis la découpe :
 *   haut gauche = T1, haut droite = T3, bas gauche = T2, bas droite = T4.
 * Un tour qui n'a plus de match laisse son coin vide sans décaler les autres.
 */
const { loadModules } = require('../helpers/loadApp');

beforeAll(() => {
    loadModules(['config', 'utils', 'notifications', 'state', 'export-print']);
});

const m = (tour, n) => ({ matchId: `T${tour}-M${n}`, tour, player1: 'A', player2: 'B', type: 'Round-Robin' });
const ids = pages => pages.map(page => page.map(x => (x ? x.matchId : null)));

test('coins réservés : T1 HG, T3 HD, T2 BG, T4 BD', () => {
    const matches = [m(1, 1), m(1, 2), m(2, 1), m(2, 2), m(3, 1), m(3, 2), m(4, 1), m(4, 2)];
    expect(ids(buildPetanquePages(matches))).toEqual([
        ['T1-M1', 'T3-M1', 'T2-M1', 'T4-M1'],
        ['T1-M2', 'T3-M2', 'T2-M2', 'T4-M2'],
    ]);
});

test('un tour plus court laisse son coin vide au lieu de décaler les autres', () => {
    const matches = [m(1, 1), m(1, 2), m(2, 1), m(2, 2), m(3, 1), m(4, 1), m(4, 2)];
    expect(ids(buildPetanquePages(matches))).toEqual([
        ['T1-M1', 'T3-M1', 'T2-M1', 'T4-M1'],
        ['T1-M2', null, 'T2-M2', 'T4-M2'],
    ]);
});

test('tour absent (3 tours seulement) : coin bas droite vide sur chaque page', () => {
    const matches = [m(1, 1), m(2, 1), m(3, 1)];
    expect(ids(buildPetanquePages(matches))).toEqual([['T1-M1', 'T3-M1', 'T2-M1', null]]);
});

test('tours 5 à 8 : mêmes coins, et le bloc démarre sur un recto', () => {
    const matches = [m(1, 1), m(2, 1), m(5, 1), m(6, 1), m(7, 1)];
    expect(ids(buildPetanquePages(matches))).toEqual([
        ['T1-M1', null, 'T2-M1', null],
        [null, null, null, null],
        ['T5-M1', 'T7-M1', 'T6-M1', null],
    ]);
});

test('matchs sans tour (poules) remplis dans l\'ordre', () => {
    const matches = [1, 2, 3, 4, 5].map(n => ({ matchId: `P-M${n}`, tour: null }));
    expect(ids(buildPetanquePages(matches))).toEqual([
        ['P-M1', 'P-M2', 'P-M3', 'P-M4'],
        ['P-M5', null, null, null],
    ]);
});

test('le HTML garde 4 emplacements par page, coin vide sans cadre', () => {
    const pages = buildPetanquePages([m(1, 1), m(2, 1), m(3, 1)]);
    const doc = new DOMParser().parseFromString(generatePetanqueSheetHTML(1, pages, 13), 'text/html');
    const cells = [...doc.querySelector('.page').children];
    expect(cells.map(c => c.className)).toEqual(['match-card', 'match-card', 'match-card', 'match-slot-empty']);
    expect(cells[1].textContent).toContain('Tour 3');
    expect(cells[2].textContent).toContain('Tour 2');
});
