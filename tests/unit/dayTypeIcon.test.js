/**
 * @jest-environment jsdom
 *
 * L'émoji devant « Mode: » suit le type de journée (🎾 Matchs, ⏱️ Courses).
 * Avant, la J1 (HTML statique) gardait 🎾 en mode Courses, et un changement
 * de type sur une autre journée ne mettait pas l'émoji à jour.
 */
const { loadModules } = require('../helpers/loadApp');

beforeAll(() => {
    loadModules(['config', 'utils', 'notifications', 'state', 'clubs', 'multisport', 'players', 'ui']);
});

beforeEach(() => {
    document.body.innerHTML = `
        <div id="championshipConfigBar"></div>
        <div class="tab" data-day="1"></div>
        <div class="tab-content" id="day-1">
            <div class="day-type-selector" id="day-type-selector-1">
                <span><span id="day-type-icon-1">🎾</span> Mode:</span>
                <select id="day-type-select-1"><option value="championship">M</option><option value="chrono">C</option></select>
                <span id="day-type-label-1">Championnat</span>
            </div>
            <div id="championship-section-1"></div>
            <div id="chrono-section-1"></div>
        </div>
    `;
    championship.currentDay = 1;
    championship.days = { 1: { dayType: 'championship', players: {}, matches: {} } };
});

const icon = () => document.getElementById('day-type-icon-1').textContent;

test('passer en Courses puis en Matchs change l\'émoji', () => {
    handleDayTypeChange(1, 'chrono');
    expect(icon()).toBe('⏱️');
    handleDayTypeChange(1, 'championship');
    expect(icon()).toBe('🎾');
});

test('au chargement, une J1 en Courses affiche ⏱️', () => {
    championship.days[1].dayType = 'chrono';
    initializeDayTypeSelectorForDay1();
    expect(icon()).toBe('⏱️');
});

