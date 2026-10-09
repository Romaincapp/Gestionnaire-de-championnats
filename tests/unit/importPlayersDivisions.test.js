/**
 * @jest-environment jsdom
 *
 * « 📥 Reprendre d'une autre journée » (importPlayersFromDay, multisport.iife.js) :
 * de Matchs vers Matchs, chaque joueur doit garder sa division. Avant le
 * correctif, tous les joueurs importés atterrissaient en Division 1.
 */
const { loadModules, DEFAULT_ORDER } = require('../helpers/loadApp');

beforeAll(() => {
    loadModules(DEFAULT_ORDER);
});

const names = (list) => (list || []).map((p) => (typeof p === 'object' ? p.name : p));

beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
    championship.config = { numberOfDivisions: 3, numberOfCourts: 4 };
    championship.days = {
        1: {
            dayType: 'championship',
            players: {
                1: [{ name: 'Alice', club: 'A' }, { name: 'Bruno', club: '' }],
                2: [{ name: 'Chloé', club: 'B' }, 'Denis'],
                3: [{ name: 'Emma', club: 'C' }],
            },
            matches: { 1: [], 2: [], 3: [] },
        },
        2: {
            dayType: 'championship',
            players: { 1: [], 2: [], 3: [] },
            matches: { 1: [], 2: [], 3: [] },
        },
    };
});

test('Matchs → Matchs : chaque joueur garde sa division et son club', () => {
    window.importPlayersFromDay(2, 1);
    const target = championship.days[2].players;
    expect(names(target[1])).toEqual(['Alice', 'Bruno']);
    expect(names(target[2])).toEqual(['Chloé', 'Denis']);
    expect(names(target[3])).toEqual(['Emma']);
    expect(target[2][0]).toEqual({ name: 'Chloé', club: 'B' });
});

test('un joueur déjà inscrit dans une autre division de la journée cible n\'est pas dupliqué', () => {
    championship.days[2].players[3] = [{ name: 'alice', club: 'A' }];
    window.importPlayersFromDay(2, 1);
    const target = championship.days[2].players;
    expect(names(target[1])).toEqual(['Bruno']);
    expect(names(target[3])).toEqual(['alice', 'Emma']);
});

test('Courses → Matchs : en D1 (pas de division connue), sans doublon d\'une autre division', () => {
    championship.days[1] = {
        dayType: 'chrono',
        chronoData: {
            events: [], participants: [],
            series: [{ id: 1, participants: [{ name: 'Zoé', bib: 1 }, { name: 'Yann', bib: 2 }] }],
        },
    };
    championship.days[2].players[2] = [{ name: 'Yann', club: '' }];
    window.importPlayersFromDay(2, 1);
    const target = championship.days[2].players;
    expect(names(target[1])).toEqual(['Zoé']);
    expect(names(target[2])).toEqual(['Yann']);
});
