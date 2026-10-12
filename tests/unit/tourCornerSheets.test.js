/**
 * @jest-environment jsdom
 *
 * Feuilles pétanque et Boccia (4 par page A4) : chaque coin est réservé à un tour pour
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
    expect(ids(buildTourCornerPages(matches))).toEqual([
        ['T1-M1', 'T3-M1', 'T2-M1', 'T4-M1'],
        ['T1-M2', 'T3-M2', 'T2-M2', 'T4-M2'],
    ]);
});

test('un tour plus court laisse son coin vide au lieu de décaler les autres', () => {
    const matches = [m(1, 1), m(1, 2), m(2, 1), m(2, 2), m(3, 1), m(4, 1), m(4, 2)];
    expect(ids(buildTourCornerPages(matches))).toEqual([
        ['T1-M1', 'T3-M1', 'T2-M1', 'T4-M1'],
        ['T1-M2', null, 'T2-M2', 'T4-M2'],
    ]);
});

test('tour absent (3 tours seulement) : coin bas droite vide sur chaque page', () => {
    const matches = [m(1, 1), m(2, 1), m(3, 1)];
    expect(ids(buildTourCornerPages(matches))).toEqual([['T1-M1', 'T3-M1', 'T2-M1', null]]);
});

test('tours 5 à 8 : mêmes coins, et le bloc démarre sur un recto', () => {
    const matches = [m(1, 1), m(2, 1), m(5, 1), m(6, 1), m(7, 1)];
    expect(ids(buildTourCornerPages(matches))).toEqual([
        ['T1-M1', null, 'T2-M1', null],
        [null, null, null, null],
        ['T5-M1', 'T7-M1', 'T6-M1', null],
    ]);
});

test('matchs sans tour (poules) remplis dans l\'ordre', () => {
    const matches = [1, 2, 3, 4, 5].map(n => ({ matchId: `P-M${n}`, tour: null }));
    expect(ids(buildTourCornerPages(matches))).toEqual([
        ['P-M1', 'P-M2', 'P-M3', 'P-M4'],
        ['P-M5', null, null, null],
    ]);
});

test('le HTML garde 4 emplacements par page, coin vide sans cadre', () => {
    const pages = buildTourCornerPages([m(1, 1), m(2, 1), m(3, 1)]);
    const doc = new DOMParser().parseFromString(generatePetanqueSheetHTML(1, pages, 13), 'text/html');
    const cells = [...doc.querySelector('.page').children];
    expect(cells.map(c => c.className)).toEqual(['match-card', 'match-card', 'match-card', 'match-slot-empty']);
    expect(cells[1].textContent).toContain('Tour 3');
    expect(cells[2].textContent).toContain('Tour 2');
});

describe('Boccia', () => {
    const rr = (tour, n) => ({ player1: `A${tour}${n}`, player2: `B${tour}${n}`, tour });

    beforeEach(() => {
        championship.days = {
            1: {
                matches: {
                    1: [rr(1, 1), rr(1, 2), rr(2, 1), rr(2, 2), rr(3, 1), rr(4, 1), rr(4, 2)],
                    2: [rr(1, 1), rr(2, 1), rr(3, 1), rr(4, 1)],
                    3: [],
                },
            },
        };
    });

    test('coins réservés par tour, chaque division commence sur un recto', () => {
        const pages = generateBocciaPages(championship.days[1], 1);
        const tours = pages.map(page => page.map(x => (x ? `D${x.division}T${x.tour}` : null)));
        expect(tours).toEqual([
            ['D1T1', 'D1T3', 'D1T2', 'D1T4'],
            ['D1T1', null, 'D1T2', 'D1T4'],
            ['D2T1', 'D2T3', 'D2T2', 'D2T4'],
        ]);
    });

    test('division 1 sur une seule page : page blanche avant la division 2', () => {
        championship.days[1].matches[1] = [rr(1, 1), rr(2, 1)];
        const pages = generateBocciaPages(championship.days[1], 1);
        expect(pages.map(page => page.filter(Boolean).length)).toEqual([2, 0, 4]);
    });

    test('le HTML Boccia laisse le coin vide sans cadre', () => {
        const pages = generateBocciaPages(championship.days[1], 1);
        const doc = new DOMParser().parseFromString(generateBocciaSheetHTML(1, pages), 'text/html');
        const second = [...doc.querySelectorAll('.page')[1].children];
        expect(second.map(c => c.className)).toEqual(['match-card', 'match-slot-empty', 'match-card', 'match-card']);
    });
});

describe('2 scores', () => {
    const rr = (tour, n) => ({ player1: `A${tour}${n}`, player2: `B${tour}${n}`, tour });

    function printedCorners(day) {
        championship.days = { 1: day };
        championship.config = { numberOfDivisions: 2 };
        let written = '';
        const win = { document: { write: html => { written += html; }, close() {} } };
        const spy = jest.spyOn(window, 'open').mockReturnValue(win);
        jest.useFakeTimers();
        printSimpleScoreSheets(1);
        jest.useRealTimers();
        spy.mockRestore();
        const doc = new DOMParser().parseFromString(written, 'text/html');
        return [...doc.querySelectorAll('.page')].map(page =>
            [...page.querySelector('.matches-container').children].map(c =>
                (c.className === 'match-slot-empty' ? null : c.querySelector('.player-name').textContent)));
    }

    test('coins réservés par tour, division par division sur un recto', () => {
        const pages = printedCorners({
            matches: {
                1: [rr(1, 1), rr(1, 2), rr(2, 1), rr(2, 2), rr(3, 1), rr(4, 1), rr(4, 2)],
                2: [rr(1, 1), rr(2, 1)],
            },
        });
        expect(pages).toEqual([
            ['A11', 'A31', 'A21', 'A41'],
            ['A12', null, 'A22', 'A42'],
            ['A11', null, 'A21', null],
        ]);
    });

    test('poules et phase finale : dans l\'ordre, sans coin réservé', () => {
        const pages = printedCorners({
            matches: { 1: [], 2: [] },
            pools: {
                enabled: true,
                divisions: {
                    1: {
                        matches: [1, 2, 3].map(n => ({ player1: `P${n}`, player2: 'X', poolIndex: 0 })),
                        finalPhase: [{ player1: 'F1', player2: 'Y', round: 1 }, { player1: 'F2', player2: 'Z', round: 2 }],
                    },
                },
            },
        });
        expect(pages).toEqual([
            ['P1', 'P2', 'P3', 'F1'],
            ['F2', null, null, null],
        ]);
    });
});

describe('feuilles de match classiques', () => {
    const rr = (tour, n) => ({ player1: `A${tour}${n}`, player2: `B${tour}${n}`, tour });

    test('coins réservés par tour, division par division sur un recto', () => {
        championship.days = {
            1: {
                matches: {
                    1: [rr(1, 1), rr(1, 2), rr(2, 1), rr(2, 2), rr(3, 1), rr(4, 1), rr(4, 2)],
                    2: [rr(1, 1), rr(2, 1)],
                    3: [],
                },
            },
        };
        let written = '';
        const win = { document: { write: html => { written += html; }, close() {} } };
        const spy = jest.spyOn(window, 'open').mockReturnValue(win);
        jest.useFakeTimers();
        printMatchSheets(1);
        jest.useRealTimers();
        spy.mockRestore();
        const doc = new DOMParser().parseFromString(written, 'text/html');
        const pages = [...doc.querySelectorAll('.page')].map(page =>
            [...page.querySelector('.matches-container').children].map(c =>
                (c.className === 'match-slot-empty' ? null : c.querySelector('.player-name').textContent)));
        expect(pages).toEqual([
            ['A11', 'A31', 'A21', 'A41'],
            ['A12', null, 'A22', 'A42'],
            ['A11', null, 'A21', null],
        ]);
    });
});

describe('Boccia vierges', () => {
    test('chaque page : T1 HG, T3 HD, T2 BG, T4 BD, une page par match de tour', () => {
        const doc = new DOMParser().parseFromString(generateBlankBocciaHTML(2), 'text/html');
        const pages = [...doc.querySelectorAll('.page')].map(page =>
            [...page.children].map(c => c.querySelector('.match-id').textContent.trim()));
        expect(pages).toEqual([
            ['Tour 1 • Match N° 1', 'Tour 3 • Match N° 1', 'Tour 2 • Match N° 1', 'Tour 4 • Match N° 1'],
            ['Tour 1 • Match N° 2', 'Tour 3 • Match N° 2', 'Tour 2 • Match N° 2', 'Tour 4 • Match N° 2'],
        ]);
    });
});
