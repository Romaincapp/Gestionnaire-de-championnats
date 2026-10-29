/**
 * @jest-environment jsdom
 *
 * Phase finale après poules (generateManualFinalPhase, pools.iife.js) :
 * - 6 qualifiés donnaient 3 quarts → 3 vainqueurs → 1 seule demi : un joueur
 *   disparaissait. Un barrage est maintenant créé (startEliminationBracket).
 * - le bouton « Passer aux … » restait sous un tour terminé ; un second clic
 *   régénérait le tour suivant et effaçait ses scores.
 * Trouvé par tests/e2e/pools.e2e.js (npm run test:pools).
 */
const { loadModules, DEFAULT_ORDER } = require('../helpers/loadApp');

beforeAll(() => {
    loadModules(DEFAULT_ORDER);
    window.alert = jest.fn();
    window.showNotification = jest.fn();
});

function pool(names) {
    const matches = [];
    let id = 0;
    for (let i = 0; i < names.length; i++) {
        for (let j = i + 1; j < names.length; j++) {
            matches.push({ id: `p${names[0]}-${id++}`, player1: names[i], player2: names[j], score1: 11, score2: 3,
                completed: true, winner: names[i], poolIndex: null, division: 1, dayNumber: 1, isPoolMatch: true });
        }
    }
    return matches;
}

beforeEach(() => {
    const pools = [['A1', 'A2', 'A3', 'A4'], ['B1', 'B2', 'B3', 'B4'], ['C1', 'C2', 'C3', 'C4']];
    const matches = pools.flatMap((p, i) => pool(p).map(m => Object.assign(m, { poolIndex: i })));
    championship.config = Object.assign({}, championship.config, { numDivisions: 1, numberOfDivisions: 1 });
    championship.days = {
        1: {
            players: { 1: pools.flat().map(name => ({ name, club: '' })) },
            matches: { 1: [] },
            pools: { enabled: true, config: { mode: 'simple' }, divisions: { 1: { pools, matches } } },
        },
    };
    document.body.innerHTML = `<select id="qualified-per-pool-1"><option value="2" selected>2</option></select>
        <div id="day-1"><div id="division1-1-matches"></div></div>`;
});

test('6 qualifiés : barrage, et personne ne disparaît', () => {
    window.generateManualFinalPhase(1);
    const div = championship.days[1].pools.manualFinalPhase.divisions[1];
    expect(div.qualified).toHaveLength(6);
    expect(Object.keys(div.rounds)).toEqual(['Barrage']);
    // 2 matchs de barrage + 2 exemptés = 4 joueurs en demi-finales
    expect(div.rounds.Barrage.matches).toHaveLength(2);
    expect(div.barrageDirectQualifiers).toHaveLength(2);
});

test('« Passer aux … » disparaît une fois le tour suivant généré, et la régénération demande confirmation', () => {
    window.generateManualFinalPhase(1);
    const div = championship.days[1].pools.manualFinalPhase.divisions[1];
    div.rounds.Barrage.matches.forEach(m => Object.assign(m, { score1: 11, score2: 2, completed: true, winner: m.player1 }));
    div.rounds.Barrage.completed = true;
    window.generateNextManualRound(1, 1, 'Barrage');
    const demis = div.rounds['Demi-finales'];
    expect(demis.matches).toHaveLength(2);

    const html = window.generateRoundControlsHTML(1, 1, div.rounds.Barrage, 'Barrage', 2, 2);
    expect(html).not.toContain('generateNextManualRound');
    expect(html).toContain('Demi-finales générés');

    // Résultat saisi en demi, puis un ancien bouton recliqué : refus → scores conservés
    demis.matches[0] = Object.assign(demis.matches[0], { score1: 11, score2: 5, completed: true, winner: demis.matches[0].player1 });
    window.confirm = jest.fn(() => false);
    window.generateNextManualRound(1, 1, 'Barrage');
    expect(window.confirm).toHaveBeenCalled();
    expect(div.rounds['Demi-finales'].matches[0].completed).toBe(true);
});

test('« Regénérer la finale / petite finale » demande confirmation et garde le résultat si refusé', () => {
    window.generateManualFinalPhase(1);
    const div = championship.days[1].pools.manualFinalPhase.divisions[1];
    const win = r => { r.matches.forEach(m => Object.assign(m, { score1: 11, score2: 2, completed: true, winner: m.player1 })); r.completed = true; };
    win(div.rounds.Barrage);
    window.generateNextManualRound(1, 1, 'Barrage');
    win(div.rounds['Demi-finales']);
    window.confirm = jest.fn(() => true);
    window.generateFinale(1, 1);
    window.generatePetiteFinale(1, 1);
    expect(window.confirm).not.toHaveBeenCalled();
    win(div.rounds.Finale);
    win(div.rounds['Petite finale']);

    window.confirm = jest.fn(() => false);
    window.generateFinale(1, 1);
    window.generatePetiteFinale(1, 1);
    expect(window.confirm).toHaveBeenCalledTimes(2);
    expect(div.rounds.Finale.matches[0].completed).toBe(true);
    expect(div.rounds['Petite finale'].matches[0].completed).toBe(true);

    window.confirm = jest.fn(() => true);
    window.generateFinale(1, 1);
    expect(div.rounds.Finale.matches[0].completed).toBe(false);
});
