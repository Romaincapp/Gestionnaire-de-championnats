/**
 * @jest-environment jsdom
 *
 * L'icône du libellé « Mode: » suit le type de la journée : ⏱️ en Courses,
 * 🎾 en Matchs. Elle restait 🎾 après avoir choisi « Courses » dans le menu.
 */
const fs = require('fs');
const path = require('path');
const { loadModules, DEFAULT_ORDER } = require('../helpers/loadApp');

const indexHtml = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8');
const SELECTOR_HTML = indexHtml.match(/<div class="day-type-selector" id="day-type-selector-1"[\s\S]*?<\/select>/)[0] + '</div>';

beforeAll(() => loadModules(DEFAULT_ORDER));

beforeEach(() => {
    document.body.innerHTML = SELECTOR_HTML;
    championship.currentDay = 1;
    championship.days = { 1: { dayType: 'championship', players: {}, matches: {} } };
});

const icon = () => document.getElementById('day-type-icon-1').textContent;

test('passer en Courses puis revenir en Matchs met l\'icône à jour', () => {
    expect(icon()).toBe('🎾 Mode:');
    window.handleDayTypeChange(1, 'chrono');
    expect(icon()).toBe('⏱️ Mode:');
    window.handleDayTypeChange(1, 'championship');
    expect(icon()).toBe('🎾 Mode:');
});

test('J1 enregistrée en Courses : icône ⏱️ au chargement', () => {
    championship.days[1].dayType = 'chrono';
    window.initializeDayTypeSelectorForDay1();
    expect(icon()).toBe('⏱️ Mode:');
});

