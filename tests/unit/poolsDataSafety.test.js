/**
 * @jest-environment jsdom
 *
 * Mode Poules : rien ne détruit des poules ou une phase finale en cours sans le demander.
 * - le nombre de divisions vient du menu Divisions (config.numberOfDivisions), plus de
 *   l'ancienne clé config.numDivisions restée à 3 : la division 4 recevait jamais de poules ;
 * - décocher « Activer le mode Poules » vidait toutes les poules sans confirmation ;
 * - regénérer une phase finale laissait les anciens tours (demies, finale, champion).
 * Scénarios complets en navigateur : npm run test:pools-safety.
 */
const { loadModules, DEFAULT_ORDER } = require('../helpers/loadApp');

beforeAll(() => {
    loadModules(DEFAULT_ORDER);
    window.alert = jest.fn();
    window.showNotification = jest.fn();
});

beforeEach(() => {
    championship.config = { numberOfDivisions: 4, numDivisions: 3, numberOfCourts: 4 };
    championship.days = {
        1: {
            dayType: 'championship',
            players: { 1: [], 2: [], 3: [], 4: [] },
            matches: { 1: [], 2: [], 3: [], 4: [] },
            pools: {
                enabled: true,
                divisions: { 1: { pools: [['A', 'B', 'C', 'D']], matches: [{ id: 'm1', player1: 'A', player2: 'B', completed: true, winner: 'A', poolIndex: 0 }] }, 2: { pools: [], matches: [] }, 3: { pools: [], matches: [] } },
                manualFinalPhase: {
                    enabled: true, currentRound: 'Finale',
                    divisions: { 1: { qualified: [], rounds: { 'Demi-finales': { matches: [{ id: 'd', completed: true, winner: 'A' }] }, Finale: { matches: [{ id: 'f', completed: true, winner: 'A' }] } } } },
                },
            },
        },
    };
    document.body.innerHTML = `<div id="day-1"><input type="checkbox" id="pool-enabled-1" checked>
        <div id="pool-config-1"></div><div id="pool-info-1"></div></div>`;
});

test('les divisions ajoutées au menu Divisions existent pour les poules et la phase finale', () => {
    window.initializePoolSystem(1);
    window.initializeManualFinalPhase(1);
    const p = championship.days[1].pools;
    expect(p.divisions[4]).toEqual({ pools: [], matches: [] });
    expect(p.manualFinalPhase.divisions[4].rounds).toEqual({});
    expect(p.divisions[1].matches).toHaveLength(1);
});

test('décocher « Activer » : confirmation, et les données sont gardées', () => {
    const box = document.getElementById('pool-enabled-1');
    box.checked = false;
    window.confirm = jest.fn(() => false);
    window.togglePoolMode(1);
    expect(window.confirm).toHaveBeenCalled();
    expect(box.checked).toBe(true);
    expect(championship.days[1].pools.enabled).toBe(true);

    box.checked = false;
    window.confirm = jest.fn(() => true);
    window.togglePoolMode(1);
    expect(championship.days[1].pools.enabled).toBe(false);
    expect(championship.days[1].pools.divisions[1].pools).toHaveLength(1);
    expect(Object.keys(championship.days[1].pools.manualFinalPhase.divisions[1].rounds)).toHaveLength(2);
});

test('remplacer une phase finale demande confirmation ; un nouveau tableau efface les anciens tours', () => {
    window.confirm = jest.fn(() => false);
    expect(window.confirmReplaceFinalPhase(1, 'Test')).toBe(false);
    expect(window.confirm.mock.calls[0][0]).toMatch(/existe déjà.*2 matchs joués/s);

    window.startEliminationBracket(1, 1, ['P1', 'P2', 'P3', 'P4'].map((name, i) => ({ name, seed: i + 1 })));
    const rounds = championship.days[1].pools.manualFinalPhase.divisions[1].rounds;
    expect(Object.keys(rounds)).toEqual(['Demi-finales']);
    expect(rounds['Demi-finales'].matches.every(m => !m.completed)).toBe(true);
});
