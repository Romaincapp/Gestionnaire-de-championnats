/**
 * @jest-environment jsdom
 *
 * Fenêtre « ⏱️ Saisie manuelle des résultats » d'une série.
 * Signalé par l'utilisateur : les participants y apparaissaient dans le mauvais ordre
 * (ordre des temps d'engagement, identifiés par le dossard) alors que la feuille imprimée
 * et les boutons d'arrêt sont dans l'ordre des couloirs. Vérifié en plus : plantage sur
 * une série générée (pas de tableau `results`), temps saisi « à moitié » (statut prêt →
 * « - » sur la feuille), champ vidé ignoré, DNS/DISQ ré-enregistrés, saisie invalide
 * ignorée en silence, cache de course qui écrasait la saisie.
 */
const { loadModules, DEFAULT_ORDER } = require('../helpers/loadApp');

beforeAll(() => {
    loadModules(DEFAULT_ORDER);
});

const LINES = [
    'Alice Martin 50m libre 31.00', 'Bruno Petit 50m libre 32.00', 'Chloe Durand 50m libre 33.00',
    'David Leroy 50m libre 34.00', 'Emma Roux 50m libre 35.00',
];
// Couloirs « le plus rapide au centre » (5 couloirs : 3, 4, 2, 5, 1)
const LANE_ORDER = ['Emma Roux', 'Chloe Durand', 'Alice Martin', 'Bruno Petit', 'David Leroy'];

beforeEach(() => {
    jest.useFakeTimers();
    championship.config = { numberOfDivisions: 1, numberOfCourts: 4 };
    championship.days = {
        1: {
            dayType: 'chrono', players: {}, matches: {},
            chronoData: { events: [{ id: 1, name: '50m Nage Libre', series: [] }], series: [], participants: [], nextEventId: 2, nextSerieId: 1, nextParticipantId: 1 },
        },
        2: { dayType: 'championship', matches: { 1: [] }, players: { 1: LINES.map(n => ({ name: n, club: 'CN Liège' })) } },
    };
    document.body.innerHTML = '<div id="chrono-content-1"></div>';
    raceData.events = [];
    raceData.series = [];
    raceData.currentSerie = null;
    raceData.currentDayNumber = null;
    raceData.currentSerieId = null;
    window.generateSwimmingSeries(1, 2, 5);
    delete championship.days[2];
});

afterEach(() => {
    if (raceData.currentSerie && raceData.currentSerie.isRunning) window.toggleRaceTimer();
    raceData.currentSerie = null;
    window.closeResultsModal(1);
    jest.useRealTimers();
});

const serie = () => championship.days[1].chronoData.events[0].series[0];
const person = (name) => serie().participants.find(p => p.name === name);
const rows = () => [...document.querySelectorAll('#resultsModal-1 tbody tr')];
const inputOf = (name) => rows().find(tr => tr.textContent.includes(name)).querySelector('input');
const toasts = () => [...document.querySelectorAll('.notification')].map(n => n.textContent);

function fillAndSave(values) {
    window.enterSerieResults(1, serie().id);
    Object.keys(values).forEach(name => { inputOf(name).value = values[name]; });
    window.saveSerieResults(1, serie().id);
}

function printed() {
    const written = [];
    const spy = jest.spyOn(window, 'open').mockReturnValue({ document: { write: h => written.push(h), close() {} }, focus() {}, print() {} });
    try { window.printChronoCompetition(1); jest.runOnlyPendingTimers(); } finally { spy.mockRestore(); }
    return new DOMParser().parseFromString(written.join(''), 'text/html');
}

describe('ordre et identification', () => {
    test('colonne « Couloir », lignes dans l\'ordre du bassin (comme la feuille imprimée)', () => {
        window.enterSerieResults(1, serie().id);
        const headers = [...document.querySelectorAll('#resultsModal-1 thead th')].map(th => th.textContent.trim());
        expect(headers[0]).toBe('Couloir');
        expect(rows().map(tr => tr.cells[0].textContent.trim())).toEqual(['1', '2', '3', '4', '5']);
        expect(rows().map(tr => LANE_ORDER.find(n => tr.textContent.includes(n)))).toEqual(LANE_ORDER);
        expect(document.getElementById('resultsModal-1').textContent).toMatch(/DNS.*DISQ/);
    });

    test('hors mode couloirs : colonne « Dossard », ordre de la série', () => {
        serie().laneMode = false;
        window.enterSerieResults(1, serie().id);
        const headers = [...document.querySelectorAll('#resultsModal-1 thead th')].map(th => th.textContent.trim());
        expect(headers[0]).toBe('Dossard');
    });
});

describe('enregistrement', () => {
    test('série générée (sans tableau results) : pas d\'erreur, arrivées complètes', () => {
        expect(serie().results).toBeUndefined();
        person('Emma Roux').club = 'CN Liège';
        expect(() => fillAndSave({ 'Emma Roux': '35.10', 'Chloe Durand': '33.20', 'Alice Martin': '31.05', 'Bruno Petit': '32.40', 'David Leroy': '34.00' })).not.toThrow();
        expect(serie().results).toHaveLength(5);
        const emma = person('Emma Roux');
        expect(emma).toMatchObject({ status: 'finished', totalTime: 35100, finishTime: 35100, totalDistance: 50 });
        expect(serie().results.find(r => r.name === 'Emma Roux')).toMatchObject({ time: 35100, club: 'CN Liège' });
        expect(serie().status).toBe('completed');
        expect(document.getElementById('resultsModal-1')).toBeNull();
    });

    test('feuille imprimée : temps et « Terminé » pour un temps saisi à la main', () => {
        fillAndSave({ 'Emma Roux': '35.10' });
        const doc = printed();
        const row = [...doc.querySelectorAll('tbody tr')].find(tr => tr.textContent.includes('Emma Roux'));
        expect(row.textContent).toContain('00:35.10');
        expect(row.textContent).toContain('Terminé');
    });

    test('champ vidé : le temps est retiré', () => {
        fillAndSave({ 'Emma Roux': '35.10', 'Alice Martin': '31.05' });
        fillAndSave({ 'Emma Roux': '' });
        expect(person('Emma Roux')).toMatchObject({ status: 'ready', totalTime: 0, finishTime: null });
        expect(serie().results.map(r => r.name)).toEqual(['Alice Martin']);
        expect(toasts().join(' ')).toMatch(/1 temps effacé/);
    });

    test('formats de temps : « 1\'02"35 », « 1:02.35 », « 1:02:35 », « 62,35 »', () => {
        fillAndSave({ 'Emma Roux': '1\'02"35', 'Chloe Durand': '1:02.35', 'Alice Martin': '1:02:35', 'Bruno Petit': '62,35' });
        expect(person('Emma Roux').totalTime).toBe(62350);
        expect(person('Chloe Durand').totalTime).toBe(62350);
        expect(person('Alice Martin').totalTime).toBe(3755000);
        expect(person('Bruno Petit').totalTime).toBe(62350);
    });

    test('saisie invalide : rien n\'est enregistré, le champ est signalé', () => {
        window.enterSerieResults(1, serie().id);
        inputOf('Emma Roux').value = '35.10';
        inputOf('Chloe Durand').value = 'abc';
        window.saveSerieResults(1, serie().id);
        expect(person('Emma Roux').status).toBe('ready');
        expect(serie().results || []).toHaveLength(0);
        expect(document.getElementById('resultsModal-1')).not.toBeNull();
        expect(inputOf('Chloe Durand').style.borderColor).not.toBe('');
    });
});

describe('DNS / DISQ tapés dans le champ', () => {
    test('« dns » et « DSQ » : statut posé, retirés des résultats, listés sans rang', () => {
        fillAndSave({ 'Emma Roux': '35.10', 'Chloe Durand': 'dns', 'David Leroy': 'DSQ' });
        expect(person('Chloe Durand').status).toBe('dns');
        expect(person('David Leroy').status).toBe('disq');
        expect(serie().results.map(r => r.name)).toEqual(['Emma Roux']);
        const ranking = window.calculateEventRankings()[0];
        expect(ranking.entries.map(e => e.name)).toEqual(['Emma Roux']);
        expect(ranking.outOfRace.map(o => o.name + ':' + o.status).sort()).toEqual(['Chloe Durand:dns', 'David Leroy:disq']);
    });

    test('un DISQ existant est pré-rempli « DISQ » et n\'est pas ré-enregistré avec son ancien temps', () => {
        Object.assign(person('David Leroy'), { status: 'disq', totalTime: 34000, finishTime: 34000 });
        serie().results = [];
        window.enterSerieResults(1, serie().id);
        expect(inputOf('David Leroy').value).toBe('DISQ');
        window.saveSerieResults(1, serie().id);
        expect(serie().results.map(r => r.name)).not.toContain('David Leroy');
        expect(person('David Leroy').status).toBe('disq');
    });

    test('un temps tapé pour un DNS en fait une arrivée', () => {
        person('Chloe Durand').status = 'dns';
        window.enterSerieResults(1, serie().id);
        expect(inputOf('Chloe Durand').value).toBe('DNS');
        inputOf('Chloe Durand').value = '33.20';
        window.saveSerieResults(1, serie().id);
        expect(person('Chloe Durand')).toMatchObject({ status: 'finished', totalTime: 33200 });
    });
});

describe('cache de course', () => {
    test('série déjà ouverte en live : la réouverture montre les temps saisis, « Terminer » les garde', () => {
        window.startChronoRaceForDay(1, serie().id);
        jest.advanceTimersByTime(150);
        window.backToSeriesList();
        fillAndSave({ 'Emma Roux': '35.10' });

        window.startChronoRaceForDay(1, serie().id);
        jest.advanceTimersByTime(150);
        const cachedEmma = raceData.currentSerie.participants.find(p => p.name === 'Emma Roux');
        expect(cachedEmma).toMatchObject({ status: 'finished', totalTime: 35100 });
        window.saveRaceResultsToDay();
        expect(serie().results.find(r => r.name === 'Emma Roux').time).toBe(35100);
    });

    test('refusée pendant la course de cette série', () => {
        window.startChronoRaceForDay(1, serie().id);
        jest.advanceTimersByTime(150);
        window.toggleRaceTimer();
        window.enterSerieResults(1, serie().id);
        expect(document.getElementById('resultsModal-1')).toBeNull();
    });
});

describe('série terminée avec des DNS / DISQ (signalé par l\'utilisateur)', () => {
    const card = () => document.querySelector('#chrono-content-1 .chrono-serie-card');
    const isGreen = (el) => /#27ae60|rgb\(39, 174, 96\)/.test(el.style.borderLeft || el.getAttribute('style'));

    test('temps + DNS + DISQ : série terminée, carte verte « 5/5 »', () => {
        fillAndSave({ 'Emma Roux': '35.10', 'Chloe Durand': 'DNS', 'Alice Martin': '31.05', 'Bruno Petit': 'DISQ', 'David Leroy': '34.00' });
        expect(serie().status).toBe('completed');
        expect(card().textContent).toMatch(/5\/5/);
        expect(card().textContent).toMatch(/1 DNS/);
        expect(card().textContent).toMatch(/1 DISQ/);
        expect(isGreen(card())).toBe(true);
    });

    test('tout le monde DNS ou DISQ : série terminée aussi', () => {
        fillAndSave({ 'Emma Roux': 'DNS', 'Chloe Durand': 'DNS', 'Alice Martin': 'DISQ', 'Bruno Petit': 'DNS', 'David Leroy': 'DNS' });
        expect(serie().status).toBe('completed');
        expect(isGreen(card())).toBe(true);
    });

    test('série incomplète : pas terminée, carte bleue « 4/5 »', () => {
        fillAndSave({ 'Emma Roux': '35.10', 'Chloe Durand': 'DNS', 'Alice Martin': '31.05', 'Bruno Petit': '32.40' });
        expect(serie().status).not.toBe('completed');
        expect(card().textContent).toMatch(/4\/5/);
        expect(isGreen(card())).toBe(false);
    });
});
