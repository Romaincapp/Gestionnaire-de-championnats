/**
 * @jest-environment jsdom
 *
 * « 🎯 Matchs » ouvre un menu déroulant sous le bouton (plus de fenêtre) :
 * choix du type, fermeture par Échap / clic extérieur / second clic.
 */
const { loadModules, DEFAULT_ORDER } = require('../helpers/loadApp');

beforeAll(() => {
    loadModules([...DEFAULT_ORDER, 'init']);
});

beforeEach(() => {
    window.closeMatchGenerationModal(false);
    document.body.innerHTML = `
        <button id="btn" onclick="showMatchGenerationModal(2, this)" data-match-gen-day="2" aria-haspopup="menu" aria-expanded="false">🎯 Matchs ▾</button>
        <p id="ailleurs">ailleurs</p>`;
    window.generateMatchesForDay = jest.fn();
    window.generateMatchesOptimized4to10 = jest.fn();
    window.generateMatchesByCourtOptimized = jest.fn();
    window.generateMatchesSwissSystem = jest.fn();
});

const menu = () => document.getElementById('matchGenerationMenu');
const btn = () => document.getElementById('btn');
const flush = () => new Promise((r) => setTimeout(r, 0));

test('le bouton ouvre un menu avec les 4 types, focus sur le premier', () => {
    btn().click();
    expect(menu().hidden).toBe(false);
    expect(menu().getAttribute('role')).toBe('menu');
    const items = menu().querySelectorAll('[role="menuitem"]');
    expect([...items].map((b) => b.dataset.type)).toEqual(['round-robin', 'optimized', 'court', 'swiss']);
    expect(document.activeElement).toBe(items[0]);
    expect(btn().getAttribute('aria-expanded')).toBe('true');
    expect(document.getElementById('matchGenerationModal')).toBeNull();
});

test.each([
    ['round-robin', 'generateMatchesForDay'],
    ['optimized', 'generateMatchesOptimized4to10'],
    ['court', 'generateMatchesByCourtOptimized'],
    ['swiss', 'generateMatchesSwissSystem'],
])('choisir %s génère pour la bonne journée et ferme le menu', (type, fn) => {
    btn().click();
    menu().querySelector(`[data-type="${type}"]`).click();
    expect(window[fn]).toHaveBeenCalledWith(2);
    expect(menu().hidden).toBe(true);
    expect(btn().getAttribute('aria-expanded')).toBe('false');
});

test('flèches pour naviguer, Échap ferme et rend le focus au bouton', () => {
    btn().click();
    const items = menu().querySelectorAll('[role="menuitem"]');
    const key = (k) => document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
    key('ArrowDown');
    expect(document.activeElement).toBe(items[1]);
    key('ArrowUp'); key('ArrowUp');
    expect(document.activeElement).toBe(items[3]);
    key('Escape');
    expect(menu().hidden).toBe(true);
    expect(document.activeElement).toBe(btn());
});

test('un clic ailleurs ou un second clic sur le bouton ferme le menu', async () => {
    btn().click();
    await flush();
    document.getElementById('ailleurs').dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(menu().hidden).toBe(true);
    btn().click();
    expect(menu().hidden).toBe(false);
    btn().click();
    expect(menu().hidden).toBe(true);
});

test('appel sans bouton (ancienne signature) retrouve le bouton de la journée', () => {
    window.showMatchGenerationModal(2);
    expect(menu().hidden).toBe(false);
    expect(btn().getAttribute('aria-expanded')).toBe('true');
});
