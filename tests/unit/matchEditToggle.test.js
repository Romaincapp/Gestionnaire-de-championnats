/**
 * @jest-environment jsdom
 *
 * Bouton des journées Matchs « 🔓 Modifier les matchs » / « 🔒 Verrouiller »
 * (anciennement « ⚠️ Actions ON/OFF », toggleForfaitButtons dans state.iife.js) :
 * déverrouillé, chaque match montre × (supprimer), les noms modifiables et F1/F2.
 */
const { loadModules, DEFAULT_ORDER } = require('../helpers/loadApp');

beforeAll(() => {
    loadModules(DEFAULT_ORDER);
});

beforeEach(() => {
    if (window.showForfaitButtons) window.toggleForfaitButtons();
    championship.currentDay = 1;
    championship.days = { 1: { dayType: 'championship', players: { 1: [] }, matches: { 1: [] } } };
    document.body.innerHTML = `
        <button id="forfait-toggle-btn-1">🔓 Modifier les matchs</button>
        <button id="forfait-toggle-btn-2">🔓 Modifier les matchs</button>`;
});

const label = (n) => document.getElementById('forfait-toggle-btn-' + n).textContent.trim();

test('déverrouiller puis verrouiller : libellé de tous les boutons et affichage des actions', () => {
    window.toggleForfaitButtons();
    expect(window.showForfaitButtons).toBe(true);
    expect(label(1)).toBe('🔒 Verrouiller');
    expect(label(2)).toBe('🔒 Verrouiller');

    window.toggleForfaitButtons();
    expect(window.showForfaitButtons).toBe(false);
    expect(label(1)).toBe('🔓 Modifier les matchs');
    expect(document.getElementById('forfait-toggle-btn-1').title).toMatch(/Supprimer un match.*forfait/);
});

test('plus aucun « Actions ON/OFF »', () => {
    window.toggleForfaitButtons();
    window.toggleForfaitButtons();
    expect(document.body.textContent).not.toMatch(/Actions (ON|OFF)/);
});

test('une journée créée pendant le déverrouillage affiche directement « 🔒 Verrouiller »', () => {
    window.toggleForfaitButtons();
    expect(window.forfaitToggleButtonState(window.showForfaitButtons).label).toBe('🔒 Verrouiller');
    expect(window.forfaitToggleButtonState(false).label).toBe('🔓 Modifier les matchs');
});
