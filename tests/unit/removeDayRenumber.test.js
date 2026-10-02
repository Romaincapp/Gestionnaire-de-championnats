/**
 * @jest-environment jsdom
 *
 * Supprimer une journée renumérote les suivantes (demande utilisateur) : avec J1…J5,
 * supprimer J2 puis J3 donnait « J1, J4, J5 ». Maintenant la suite reste continue et
 * tout ce qui porte un numéro de journée suit : données, matchs de poule, cache des
 * courses (raceData), état replié des hubs, séries ouvertes de l'accordéon.
 */
const fs = require('fs');
const path = require('path');
const { loadModules } = require('../helpers/loadApp');

const BODY = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8')
    .replace(/^[\s\S]*<body[^>]*>/, '').replace(/<\/body>[\s\S]*$/, '').replace(/<script[\s\S]*?<\/script>/g, '');

beforeAll(() => loadModules());

const div = () => ({ 1: [], 2: [], 3: [] });
function matchDay(name) {
    return { dayType: 'championship', players: { 1: [{ name, club: '' }], 2: [], 3: [] }, matches: div() };
}
function chronoDay(name) {
    return { dayType: 'chrono', players: div(), matches: div(), chronoData: {
        events: [{ id: 1, name: '50m' }],
        series: [{ id: 1, eventId: 1, name: 'Série 1', participants: [{ id: 1, name, bib: 1 }], results: [] }],
        participants: [{ id: 1, name, bib: 1 }], nextEventId: 2, nextSerieId: 2, nextParticipantId: 2,
    } };
}

beforeEach(() => {
    jest.useFakeTimers();
    document.body.innerHTML = BODY;
    localStorage.clear();
    window.confirm = jest.fn(() => true);
    window.alert = jest.fn();
    raceData.events = []; raceData.series = []; raceData.currentSerie = null; raceData.currentDayNumber = null;
    championship.config = { numberOfDivisions: 3, numberOfCourts: 4 };
    championship.days = { 1: matchDay('Un'), 2: matchDay('Deux'), 3: matchDay('Trois'), 4: chronoDay('Quatre'), 5: matchDay('Cinq') };
    // structure de poules créée par l'application pour chaque journée
    Object.keys(championship.days).forEach((k) => initializePoolSystem(Number(k)));
    championship.days[5].pools.divisions[1] = { pools: [['Cinq']], matches: [{ id: 1, dayNumber: 5, player1: 'Cinq', player2: 'X' }] };
    initializeAllDaysContent();
    updateTabsDisplay();
    jest.runAllTimers();
});

afterEach(() => jest.useRealTimers());

const who = () => Object.keys(championship.days).map((k) => {
    const d = championship.days[k];
    return k + ':' + (d.dayType === 'chrono' ? d.chronoData.participants[0].name : d.players[1][0].name);
});
const tabs = () => [...document.querySelectorAll('#tabs .tab[data-day]')].map((t) => t.dataset.day);

test('supprimer J2 puis J3 garde une suite continue (pas « J1, J4, J5 »)', () => {
    removeDay(2);
    expect(who()).toEqual(['1:Un', '2:Trois', '3:Quatre', '4:Cinq']);
    removeDay(3);
    expect(who()).toEqual(['1:Un', '2:Trois', '3:Cinq']);
    jest.runAllTimers();
    expect(tabs()).toEqual(['1', '2', '3']);
    // un contenu par journée, aux bons numéros
    expect([...document.querySelectorAll('.tab-content[id^="day-"]')].map((e) => e.id).sort())
        .toEqual(['day-1', 'day-2', 'day-3']);
    expect(document.getElementById('day-3').textContent).toContain('Journée 3');
});

test('la journée affichée devient celle qui a pris la place de la supprimée', () => {
    removeDay(2);
    expect(championship.currentDay).toBe(2);
    removeDay(Math.max(...Object.keys(championship.days).map(Number)));
    expect(championship.currentDay).toBe(3);
});

test('les numéros internes suivent : matchs de poule, cache des courses, état replié', () => {
    raceData.events = [{ id: 1, dayNumber: 2, name: 'supprimée' }, { id: 1, dayNumber: 4, name: 'J4' }];
    raceData.series = [{ id: 1, dayNumber: 4, participants: [] }];
    localStorage.setItem('collapseState', JSON.stringify({ 2: true, 5: true, general: true }));

    removeDay(2);

    expect(championship.days[4].pools.divisions[1].matches[0].dayNumber).toBe(4);
    expect(raceData.events.map((e) => [e.name, e.dayNumber])).toEqual([['J4', 3]]);
    expect(raceData.series[0].dayNumber).toBe(3);
    expect(JSON.parse(localStorage.getItem('collapseState'))).toEqual({ 4: true, general: true });
});

test('séries ouvertes de l\'accordéon : suivent le nouveau numéro', () => {
    toggleSerieDetails(4, 1);
    removeDay(2);
    jest.runAllTimers();
    expect(document.getElementById('serie-details-3-1').style.display).toBe('block');
});

test('refusé pendant une course sur une journée concernée ; autorisé si la course est avant', () => {
    raceData.currentSerie = { id: 1, isRunning: true };
    raceData.currentDayNumber = 4;
    removeDay(2);
    expect(window.alert).toHaveBeenCalled();
    expect(Object.keys(championship.days)).toHaveLength(5);

    raceData.currentDayNumber = 1;
    removeDay(2);
    expect(Object.keys(championship.days)).toHaveLength(4);
    raceData.currentSerie = null;
});

test('la confirmation annonce la renumérotation, sauf pour la dernière journée', () => {
    removeDay(2);
    expect(window.confirm.mock.calls[0][0]).toMatch(/renumérotées \(Journée 3 → Journée 2, etc\.\)/);
    removeDay(4);
    expect(window.confirm.mock.calls[1][0]).not.toMatch(/renumérotées/);
});
