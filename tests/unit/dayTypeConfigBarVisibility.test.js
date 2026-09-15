/**
 * @jest-environment jsdom
 *
 * La barre globale "Divisions / Terrains" (en tête de page) ne concerne
 * que le mode Championship. Avant ce fix, elle restait affichée même
 * quand la journée active était en mode Chrono. updateDayTypeUI() (appelée
 * au changement de type ET au changement d'onglet via switchTab) doit la
 * masquer/afficher selon le type de la journée actuellement affichée.
 */
const { loadModules } = require('../helpers/loadApp');

beforeAll(() => {
    loadModules(['config', 'utils', 'notifications', 'state', 'clubs', 'multisport', 'players', 'ui']);
});

beforeEach(() => {
    document.body.innerHTML = `
        <div id="divisionConfigContainer"></div>
        <div id="courtConfigContainer"></div>
        <button id="applyConfigBtn"></button>
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

test('la barre Divisions/Terrains est visible sur une journée Championship', () => {
    updateDayTypeUI(1);
    expect(document.getElementById('divisionConfigContainer').style.display).toBe('flex');
    expect(document.getElementById('courtConfigContainer').style.display).toBe('flex');
    expect(document.getElementById('applyConfigBtn').style.display).toBe('inline-block');
});

test('la barre Divisions/Terrains est masquée sur une journée Chrono', () => {
    championship.currentDay = 2;
    updateDayTypeUI(2);
    expect(document.getElementById('divisionConfigContainer').style.display).toBe('none');
    expect(document.getElementById('courtConfigContainer').style.display).toBe('none');
    expect(document.getElementById('applyConfigBtn').style.display).toBe('none');
});

test('changer de type de journée via setDayType met à jour la barre immédiatement', () => {
    championship.currentDay = 1;
    updateDayTypeUI(1); // état initial : championship -> visible
    expect(document.getElementById('divisionConfigContainer').style.display).toBe('flex');

    setDayType(1, 'chrono');
    expect(document.getElementById('divisionConfigContainer').style.display).toBe('none');
});

test('changer d\'onglet (switchTab) met à jour la barre sans changer le type', () => {
    // Journée 1 (championship) active au départ
    updateDayTypeUI(1);
    expect(document.getElementById('divisionConfigContainer').style.display).toBe('flex');

    // Navigation vers la journée 2 (chrono) : la barre doit se masquer
    switchTab(2);
    expect(document.getElementById('divisionConfigContainer').style.display).toBe('none');

    // Retour vers la journée 1 (championship) : la barre doit réapparaître
    switchTab(1);
    expect(document.getElementById('divisionConfigContainer').style.display).toBe('flex');
});

test("ne modifie pas la barre pour une journée qui n'est pas celle actuellement affichée", () => {
    championship.currentDay = 1;
    updateDayTypeUI(1);
    const before = document.getElementById('divisionConfigContainer').style.display;

    // updateDayTypeUI(2) est appelée en arrière-plan (ex: setDayType sur un
    // autre onglet) alors que currentDay est toujours 1 : ne doit rien changer
    updateDayTypeUI(2);
    expect(document.getElementById('divisionConfigContainer').style.display).toBe(before);
});
