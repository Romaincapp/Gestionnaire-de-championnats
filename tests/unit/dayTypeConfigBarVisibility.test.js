/**
 * @jest-environment jsdom
 *
 * La barre globale "Divisions / Terrains" (en tête de page, #championshipConfigBar,
 * incluant son sous-titre d'attribution des terrains #courtAssignmentInfo) ne
 * concerne que le mode Championship. Avant ce fix, elle restait affichée
 * même quand la journée active était en mode Chrono — et un premier
 * correctif qui ne masquait que ses enfants directs (divisionConfigContainer/
 * courtConfigContainer/applyConfigBtn) laissait le sous-titre
 * #courtAssignmentInfo visible car il n'était pas couvert. On masque
 * maintenant le conteneur entier en un seul bloc.
 * updateDayTypeUI() (appelée au changement de type ET au changement
 * d'onglet via switchTab) doit la masquer/afficher selon le type de la
 * journée actuellement affichée.
 */
const { loadModules } = require('../helpers/loadApp');

beforeAll(() => {
    loadModules(['config', 'utils', 'notifications', 'state', 'clubs', 'multisport', 'players', 'ui']);
});

beforeEach(() => {
    document.body.innerHTML = `
        <div id="championshipConfigBar">
            <div id="divisionConfigContainer"></div>
            <div id="courtConfigContainer"></div>
            <button id="applyConfigBtn"></button>
            <div id="courtAssignmentInfo">Terrain 1: Division 1, Division 2...</div>
        </div>
        <div class="tab" data-day="1"></div>
        <div class="tab" data-day="2"></div>
        <div class="tab-content" id="day-1"></div>
        <div class="tab-content" id="day-2"></div>
    `;
    championship.config = { numberOfDivisions: 3, numberOfCourts: 4 };
    championship.currentDay = 1;
    championship.days = {
        1: { dayType: 'championship', players: {}, matches: {} },
        2: { dayType: 'chrono', players: {}, matches: {}, chronoData: { events: [], series: [], participants: [], nextEventId: 1, nextSerieId: 1, nextParticipantId: 1 } },
    };
});

test('la barre Divisions/Terrains (et son sous-titre) est visible sur une journée Championship', () => {
    updateDayTypeUI(1);
    expect(document.getElementById('championshipConfigBar').style.display).toBe('block');
});

test('la barre Divisions/Terrains (et son sous-titre #courtAssignmentInfo) est masquée sur une journée Chrono', () => {
    championship.currentDay = 2;
    updateDayTypeUI(2);
    expect(document.getElementById('championshipConfigBar').style.display).toBe('none');
    // #courtAssignmentInfo est un enfant de championshipConfigBar : masqué
    // avec son parent, pas besoin de le cibler séparément — mais on vérifie
    // explicitement qu'il n'est pas resté visible via un display propre à lui.
    expect(document.getElementById('courtAssignmentInfo').style.display).not.toBe('block');
});

test('changer de type de journée via setDayType met à jour la barre immédiatement', () => {
    championship.currentDay = 1;
    updateDayTypeUI(1); // état initial : championship -> visible
    expect(document.getElementById('championshipConfigBar').style.display).toBe('block');

    setDayType(1, 'chrono');
    expect(document.getElementById('championshipConfigBar').style.display).toBe('none');
});

test('changer d\'onglet (switchTab) met à jour la barre sans changer le type', () => {
    // Journée 1 (championship) active au départ
    updateDayTypeUI(1);
    expect(document.getElementById('championshipConfigBar').style.display).toBe('block');

    // Navigation vers la journée 2 (chrono) : la barre doit se masquer
    switchTab(2);
    expect(document.getElementById('championshipConfigBar').style.display).toBe('none');

    // Retour vers la journée 1 (championship) : la barre doit réapparaître
    switchTab(1);
    expect(document.getElementById('championshipConfigBar').style.display).toBe('block');
});

test("ne modifie pas la barre pour une journée qui n'est pas celle actuellement affichée", () => {
    championship.currentDay = 1;
    updateDayTypeUI(1);
    const before = document.getElementById('championshipConfigBar').style.display;

    // updateDayTypeUI(2) est appelée en arrière-plan (ex: setDayType sur un
    // autre onglet) alors que currentDay est toujours 1 : ne doit rien changer
    updateDayTypeUI(2);
    expect(document.getElementById('championshipConfigBar').style.display).toBe(before);
});
