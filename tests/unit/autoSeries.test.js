/**
 * @jest-environment jsdom
 *
 * « 🏁 Séries automatiques » (ex « 🏊 Séries natation ») : le même générateur sert aussi
 * aux séries d'athlétisme (demande utilisateur). Libellés neutres, et ce qui marche
 * aujourd'hui pour l'athlétisme : une ligne « Nom 200m 25.10 » est placée dans
 * l'épreuve de même distance quand une seule épreuve a cette distance.
 */
const { loadModules, DEFAULT_ORDER } = require('../helpers/loadApp');

beforeAll(() => {
    loadModules(DEFAULT_ORDER);
});

const LINES = ['Luc Leroy 200m 25.10', 'Marc Petit 200m 24.80', 'Lina Martin 400m 1:02.30'];

beforeEach(() => {
    championship.config = { numberOfDivisions: 1, numberOfCourts: 4 };
    championship.days = {
        1: {
            dayType: 'chrono', players: {}, matches: {},
            chronoData: { events: [{ id: 1, name: '200m', series: [] }, { id: 2, name: '400m', series: [] }], series: [], participants: [], nextEventId: 3, nextSerieId: 1, nextParticipantId: 1 },
        },
        2: { dayType: 'championship', matches: { 1: [] }, players: { 1: LINES.map(n => ({ name: n, club: '' })) } },
    };
    document.body.innerHTML = '<div id="chrono-content-1"></div>';
    window.refreshChronoDisplay(1);
});

afterEach(() => {
    const modal = document.getElementById('swimmingImportModal');
    if (modal) modal.remove();
});

test('bouton de la journée Courses : « 🏁 Séries automatiques »', () => {
    const button = document.querySelector('#chrono-content-1 button[onclick="showSwimmingImportModal(1)"]');
    expect(button.textContent.trim()).toBe('🏁 Séries automatiques');
    expect(document.getElementById('chrono-content-1').textContent).not.toMatch(/Séries natation/);
});

test('la fenêtre parle de participants, pas seulement de nageurs', () => {
    window.showSwimmingImportModal(1);
    const text = document.getElementById('swimmingImportModal').textContent.replace(/\s+/g, ' ');
    expect(text).toContain('Séries automatiques');
    expect(text).toContain('Participants par série');
    expect(text).toContain('🏁 Générer les séries');
    expect(text).not.toMatch(/natation|Nageurs/i);
});

test('athlétisme : distances uniques → séries par couloirs, triées au temps', () => {
    window.showSwimmingImportModal(1);
    document.getElementById('swimSourceDay').value = '2';
    document.getElementById('swimTargetDay').value = '1';
    window.confirmSwimmingImport(1);
    const [e200, e400] = championship.days[1].chronoData.events;
    expect(e200.series).toHaveLength(1);
    // Le plus rapide (24.80) au couloir central
    const lanes = Object.fromEntries(e200.series[0].participants.map(p => [p.name, p.laneNumber]));
    expect(lanes['Marc Petit']).toBeLessThan(10);
    expect(e200.series[0].participants[0].name).toBe('Marc Petit');
    expect(e200.series[0].distance).toBe(200);
    expect(e400.series[0].participants.map(p => p.name)).toEqual(['Lina Martin']);
    const toasts = [...document.querySelectorAll('.notification')].map(n => n.textContent);
    expect(toasts.join(' ')).toMatch(/Séries automatiques : 3 participants → 2 séries/);
});
