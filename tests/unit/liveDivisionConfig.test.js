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
