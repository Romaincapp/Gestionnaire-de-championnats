/**
 * @jest-environment jsdom
 *
 * Les menus « Divisions » / « Terrains » s'appliquent dès qu'on les change
 * (le bouton « ✅ Appliquer », qui rechargeait la page, est supprimé).
 * Réduire le nombre de divisions masque les divisions en trop sans
 * supprimer leurs joueurs, après confirmation si elles ont du contenu.
 */
const { loadModules, DEFAULT_ORDER } = require('../helpers/loadApp');

// init : updateCourtAssignmentInfo / initializeDivisionSelects
beforeAll(() => loadModules([...DEFAULT_ORDER, 'init']));

function setup(numDivisions, players) {
    document.body.innerHTML = `
        <select id="divisionConfig">${[1,2,3,4,5,6].map(n => `<option value="${n}">${n}</option>`).join('')}</select>
        <select id="courtConfig">${[1,2,3,4,5,6,8,10].map(n => `<option value="${n}">${n}</option>`).join('')}</select>
        <div id="courtAssignmentInfo"></div>
        <div id="divisions-1"></div>`;
    championship.config = { numberOfDivisions: numDivisions, numberOfCourts: 4 };
    championship.currentDay = 1;
    championship.days = { 1: { dayType: 'championship', players, matches: {} } };
    document.getElementById('divisionConfig').value = numDivisions;
    document.getElementById('courtConfig').value = 4;
}

test('passer de 2 à 3 divisions : appliqué et affiché tout de suite', () => {
    setup(2, { 1: [], 2: [] });
    const sel = document.getElementById('divisionConfig');
    sel.value = '3';
    window.updateDivisionConfig();
    expect(championship.config.numberOfDivisions).toBe(3);
    expect(championship.config.numberOfCourts).toBe(4);
    expect(championship.days[1].players[3]).toEqual([]);
    expect(document.querySelectorAll('#divisions-1 .division').length).toBe(3);
    expect(document.getElementById('courtAssignmentInfo').textContent).toContain('D3');
});

test('changer les terrains garde le nombre de divisions du championnat', () => {
    setup(2, { 1: [], 2: [] });
    document.getElementById('courtConfig').value = '6';
    window.updateCourtConfig();
    expect(championship.config).toMatchObject({ numberOfDivisions: 2, numberOfCourts: 6 });
    expect(document.getElementById('courtAssignmentInfo').textContent).toContain('Terrains 4-6');
});

test('réduire avec des joueurs dans la division retirée : annuler remet le menu', () => {
    setup(3, { 1: [], 2: [], 3: [{ name: 'Alice', club: '' }] });
    window.confirm = jest.fn(() => false);
    const sel = document.getElementById('divisionConfig');
    sel.value = '2';
    window.updateDivisionConfig();
    expect(window.confirm).toHaveBeenCalled();
    expect(sel.value).toBe('3');
    expect(championship.config.numberOfDivisions).toBe(3);
});

test('réduire après confirmation : division masquée, joueurs conservés', () => {
    setup(3, { 1: [], 2: [], 3: [{ name: 'Alice', club: '' }] });
    window.confirm = jest.fn(() => true);
    document.getElementById('divisionConfig').value = '2';
    window.updateDivisionConfig();
    expect(championship.config.numberOfDivisions).toBe(2);
    expect(championship.days[1].players[3]).toHaveLength(1);
    expect(document.querySelectorAll('#divisions-1 .division').length).toBe(2);
});

describe('protection d\'une journée en cours (matchs déjà générés)', () => {
    function withMatches() {
        setup(2, { 1: [], 2: [] });
        // 4 terrains / 2 divisions : D1 = 1-2, D2 = 3-4
        championship.days[1].matches = {
            1: [{ player1: 'A', player2: 'B', court: 1, tour: 1 }, { player1: 'C', player2: 'D', court: 2, tour: 1 }],
            2: [{ player1: 'E', player2: 'F', court: 3, tour: 1, score1: 11, score2: 5, completed: true },
                { player1: 'G', player2: 'H', court: 4, tour: 1 }],
        };
    }

    test('passer à 2 terrains : confirmation, annuler ne change rien (terrains ni menu)', () => {
        withMatches();
        window.confirm = jest.fn(() => false);
        const sel = document.getElementById('courtConfig');
        sel.value = '2';
        window.updateCourtConfig();
        expect(window.confirm).toHaveBeenCalledTimes(1);
        expect(window.confirm.mock.calls[0][0]).toContain('3 matchs déjà générés changeront de terrain');
        expect(sel.value).toBe('4');
        expect(championship.config.numberOfCourts).toBe(4);
        expect(championship.days[1].matches[2].map(m => m.court)).toEqual([3, 4]);
    });

    test('confirmer applique, scores conservés', () => {
        withMatches();
        window.confirm = jest.fn(() => true);
        document.getElementById('courtConfig').value = '2';
        window.updateCourtConfig();
        expect(championship.config.numberOfCourts).toBe(2);
        expect(championship.days[1].matches[2][0]).toMatchObject({ score1: 11, score2: 5, completed: true });
    });

    test('ajouter des terrains sans déplacer de match : pas de question', () => {
        withMatches();
        window.confirm = jest.fn(() => true);
        // 8 terrains / 2 divisions : D1 = 1-4, D2 = 5-8 → les matchs de D2 (3, 4) bougent
        expect(window.countMatchesChangingCourt(2, 8)).toBe(2);
        // 5 terrains : D1 = 1-3, D2 = 4-5 → seul le match sur le terrain 3 bouge
        expect(window.countMatchesChangingCourt(2, 5)).toBe(1);
        // Ajouter une division change les plages aussi
        expect(window.configChangeWarning(3, 4)).toContain('changer');
        // Même configuration : rien
        expect(window.configChangeWarning(2, 4)).toBeNull();
    });

    test('début de journée sans matchs : changement immédiat, sans question', () => {
        setup(2, { 1: [{ name: 'A' }], 2: [] });
        window.confirm = jest.fn(() => true);
        document.getElementById('courtConfig').value = '2';
        window.updateCourtConfig();
        expect(window.confirm).not.toHaveBeenCalled();
        expect(championship.config.numberOfCourts).toBe(2);
    });
});

// Retirer une division (ex. D2 oubliée) pendant la phase finale de D1 : le bloc de
// chaque division est reconstruit, et la phase finale qui s'y trouve disparaissait
// de l'écran jusqu'au rechargement de la page.
test('changer le nombre de divisions garde la phase finale affichée', () => {
    setup(2, { 1: [{ name: 'A' }, { name: 'B' }], 2: [] });
    const finale = { id: 'Finale-1-1', player1: 'A', player2: 'B', score1: '', score2: '', completed: false, winner: null, roundName: 'Finale', position: 1 };
    championship.days[1].pools = {
        enabled: true, config: { mode: 'direct' },
        divisions: { 1: { pools: [], matches: [] }, 2: { pools: [], matches: [] } },
        manualFinalPhase: {
            enabled: true, currentRound: 'Finale',
            divisions: {
                1: { qualified: [{ name: 'A', seed: 1 }, { name: 'B', seed: 2 }], rounds: { Finale: { name: 'Finale', matches: [finale], completed: false } } },
                2: { qualified: [], rounds: {} },
            },
        },
    };
    window.applyConfiguration();
    expect(document.querySelectorAll('#division1-1-matches .manual-final-phase-container')).toHaveLength(1);

    window.confirm = jest.fn(() => true);
    document.getElementById('divisionConfig').value = '1';
    window.updateDivisionConfig();
    expect(championship.config.numberOfDivisions).toBe(1);
    expect(document.querySelectorAll('#division1-1-matches .manual-final-phase-container')).toHaveLength(1);
    expect(document.getElementById('division1-1-matches').textContent).toContain('Finale');
});
