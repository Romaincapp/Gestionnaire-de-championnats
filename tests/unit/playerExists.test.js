/**
 * @jest-environment jsdom
 *
 * clubsModule.playerExists() comparait le résultat de Array.find() à null,
 * alors que find() renvoie undefined quand rien ne correspond : la fonction
 * répondait toujours "existe", et addPlayerFromModal() refusait tout ajout
 * ("X est déjà inscrit en D1").
 */
const { loadModules, DEFAULT_ORDER } = require('../helpers/loadApp');

beforeAll(() => {
    loadModules(DEFAULT_ORDER);
});

beforeEach(() => {
    championship.config = { numberOfDivisions: 1, numberOfCourts: 4 };
    championship.days = {
        1: { players: { 1: [{ name: 'Alice Dupont', club: '' }] }, matches: { 1: [] } },
    };
});

test('un joueur absent n\'existe pas (division vide ou autre nom)', () => {
    championship.days[1].players[1] = [];
    expect(clubsModule.playerExists(1, 1, 'Bob Martin')).toBe(false);

    championship.days[1].players[1] = [{ name: 'Alice Dupont', club: '' }];
    expect(clubsModule.playerExists(1, 1, 'Bob Martin')).toBe(false);
});

test('un joueur présent existe, sans tenir compte de la casse', () => {
    expect(clubsModule.playerExists(1, 1, 'Alice Dupont')).toBe(true);
    expect(clubsModule.playerExists(1, 1, 'alice dupont')).toBe(true);
});

test('journée ou division inconnue : n\'existe pas', () => {
    expect(clubsModule.playerExists(9, 1, 'Alice Dupont')).toBe(false);
    expect(clubsModule.playerExists(1, 5, 'Alice Dupont')).toBe(false);
});
