/**
 * @jest-environment jsdom
 *
 * Régression : clearDayData() (bouton "Vider la journée") reconstruisait
 * l'objet jour avec seulement {players, matches}, ce qui effaçait
 * silencieusement dayType (une journée Chrono repassait en Championship
 * sans prévenir) et détruisait pools/chronoData sans même les compter
 * dans la confirmation. Corrigé le 2026-09 (commit 49e5c50).
 */
const { loadModules } = require('../helpers/loadApp');

beforeAll(() => {
    loadModules([
        'config', 'utils', 'notifications', 'state', 'clubs', 'multisport',
        'players', 'ui', 'matches', 'pools', 'ranking',
    ]);
});

beforeEach(() => {
    // window.confirm doit renvoyer true pour que clearDayData procède
    window.confirm = jest.fn(() => true);
    window.alert = jest.fn();

    championship.config = { numberOfDivisions: 2, numberOfCourts: 4 };
    championship.currentDay = 1;
    championship.days = {
        1: {
            dayType: 'chrono',
            players: { 1: ['Jean Dupont'], 2: [] },
            matches: { 1: [{ id: 'm1', player1: 'Jean Dupont', player2: 'Paul Martin' }], 2: [] },
            pools: {
                enabled: true,
                divisions: { 1: { pools: [['Jean Dupont']], matches: [{ id: 'p1' }], finalPhase: [] } },
            },
            chronoData: {
                events: [{ id: 1, name: '100m' }],
                series: [],
                participants: [{ id: 1, name: 'Jean Dupont', bib: 1 }],
                nextEventId: 2, nextSerieId: 1, nextParticipantId: 2,
            },
        },
    };
});

test('conserve dayType après le vidage (ne repasse pas en championship)', () => {
    clearDayData(1);
    expect(championship.days[1].dayType).toBe('chrono');
});

test('vide bien players et matches', () => {
    clearDayData(1);
    expect(championship.days[1].players[1]).toEqual([]);
    expect(championship.days[1].matches[1]).toEqual([]);
});

test('réinitialise pools à une structure vide plutôt que de le supprimer', () => {
    clearDayData(1);
    expect(championship.days[1].pools).toBeDefined();
    expect(championship.days[1].pools.enabled).toBe(false);
    expect(championship.days[1].pools.divisions[1].matches).toEqual([]);
});

test('réinitialise chronoData à une structure vide plutôt que de le supprimer', () => {
    clearDayData(1);
    expect(championship.days[1].chronoData).toBeDefined();
    expect(championship.days[1].chronoData.events).toEqual([]);
    expect(championship.days[1].chronoData.participants).toEqual([]);
});

test('le message de confirmation mentionne les matchs de poule et participants chrono', () => {
    clearDayData(1);
    const confirmMsg = window.confirm.mock.calls[0][0];
    expect(confirmMsg).toMatch(/match\(s\) de poule/);
    expect(confirmMsg).toMatch(/participant\(s\) chrono/);
});

test("n'agit pas si l'utilisateur annule la confirmation", () => {
    window.confirm = jest.fn(() => false);
    clearDayData(1);
    expect(championship.days[1].players[1]).toEqual(['Jean Dupont']);
    expect(championship.days[1].dayType).toBe('chrono');
});
