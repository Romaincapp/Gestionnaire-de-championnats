/**
 * @jest-environment jsdom
 *
 * Boutons en cascade (state.iife.js) : un bouton de barre d'actions porte
 * data-day / data-needs et reste masqué tant qu'il n'a pas de sens
 * (🎯 Matchs sans joueur, 🏁 Séries automatiques sans épreuve...).
 * Rafraîchi après chaque saveToLocalStorage().
 */
const { loadModules, DEFAULT_ORDER } = require('../helpers/loadApp');

beforeAll(() => {
    loadModules(DEFAULT_ORDER);
});

beforeEach(() => {
    localStorage.clear();
    if (window.showForfaitButtons) window.toggleForfaitButtons();
    championship.days = {
        1: { dayType: 'championship', players: { 1: [], 2: [] }, matches: { 1: [], 2: [] } },
        2: { dayType: 'chrono', chronoData: { events: [], series: [], participants: [] } },
    };
    document.body.innerHTML = `
        <button id="matchs" data-day="1" data-needs="players">🎯 Matchs</button>
        <button id="poules" data-day="1" data-needs="players|poolsOn">🏊 Poules</button>
        <button id="classements" data-day="1" data-needs="matches">🏆 Classements</button>
        <button id="modifier" data-day="1" data-needs="matches|unlocked">🔓 Modifier les matchs</button>
        <button id="auto" data-day="2" data-needs="events">🏁 Séries automatiques</button>
        <button id="imprimer" data-day="2" data-needs="series">🖨️ Imprimer séries</button>
        <button id="vider" data-day="2" data-needs="content">🗑️ Vider</button>
        <button id="toujours">💾 Exporter</button>`;
});

const shown = () => [...document.querySelectorAll('button')].filter((b) => !b.hidden).map((b) => b.id);

test('journées vides : seuls les boutons sans condition restent', () => {
    window.saveToLocalStorage();
    expect(shown()).toEqual(['toujours']);
});

test('Matchs : joueurs puis matchs font apparaître les boutons, et les retirer les masque', () => {
    championship.days[1].players[2] = [{ name: 'Alice', club: '' }];
    window.saveToLocalStorage();
    expect(shown()).toEqual(['matchs', 'poules', 'toujours']);

    championship.days[1].matches[2] = [{ player1: 'Alice', player2: 'Bruno' }];
    window.saveToLocalStorage();
    expect(shown()).toEqual(['matchs', 'poules', 'classements', 'modifier', 'toujours']);

    championship.days[1] = { dayType: 'championship', players: { 1: [] }, matches: { 1: [] } };
    window.saveToLocalStorage();
    expect(shown()).toEqual(['toujours']);
});

test('matchs de poule ou phase finale comptent ; mode Poules activé garde 🏊 Poules', () => {
    championship.days[1].pools = { enabled: true, divisions: { 1: { pools: [], matches: [{ id: 'm1' }] } } };
    window.saveToLocalStorage();
    expect(shown()).toEqual(['poules', 'classements', 'modifier', 'toujours']);
    championship.days[1].pools = { enabled: false, manualFinalPhase: { divisions: {} } };
    window.saveToLocalStorage();
    expect(shown()).toEqual(['classements', 'modifier', 'toujours']);
});

test('« 🔓 Modifier les matchs » déverrouillé reste visible pour pouvoir reverrouiller', () => {
    window.toggleForfaitButtons();
    expect(shown()).toContain('modifier');
});

test('Courses : participant → Vider ; épreuve → Séries automatiques ; série → Imprimer', () => {
    const cd = championship.days[2].chronoData;
    cd.participants.push({ id: 1, name: 'Zoé' });
    window.saveToLocalStorage();
    expect(shown()).toEqual(['vider', 'toujours']);
    cd.events.push({ id: 1, name: '50m brasse', series: [] });
    window.saveToLocalStorage();
    expect(shown()).toEqual(['auto', 'vider', 'toujours']);
    cd.events[0].series.push({ id: 1, participants: [] });   // série imbriquée (génération natation)
    window.saveToLocalStorage();
    expect(shown()).toEqual(['auto', 'imprimer', 'vider', 'toujours']);
});

test('dayActionAttrs : le HTML généré est masqué d\'emblée (pas de clignotement)', () => {
    expect(window.dayActionAttrs(2, 'events')).toBe('data-day="2" data-needs="events" hidden');
    championship.days[2].chronoData.events.push({ id: 1, name: 'x' });
    expect(window.dayActionAttrs(2, 'events')).toBe('data-day="2" data-needs="events"');
});
