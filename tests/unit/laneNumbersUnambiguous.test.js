/**
 * @jest-environment jsdom
 *
 * Mode couloirs : le couloir doit être écrit sans ambiguïté partout.
 * Signalé par l'utilisateur : avant le départ, le tableau de course montrait
 * le DOSSARD en gros (« #5 ») sans aucun couloir ; au départ, le gros bouton
 * affichait le vrai couloir (« 1 ») ET ce dossard en petit (« 5 »). Deux
 * chiffres sans légende → « le bouton 1 pour le nageur qui est au couloir 5 ».
 * À la génération natation, dossards = ordre des temps (1..5) et couloirs =
 * le plus rapide au centre (3, 4, 2, 5, 1) : le 5e a le dossard 5 au couloir 1.
 */
const { loadModules, DEFAULT_ORDER } = require('../helpers/loadApp');

beforeAll(() => {
    loadModules(DEFAULT_ORDER);
});

const LINES = [
    'Alice Martin 50m libre 31.00', 'Bruno Petit 50m libre 32.00', 'Chloe Durand 50m libre 33.00',
    'David Leroy 50m libre 34.00', 'Emma Roux 50m libre 35.00',
];

beforeEach(() => {
    jest.useFakeTimers();
    championship.config = { numberOfDivisions: 1, numberOfCourts: 4 };
    championship.days = {
        1: {
            dayType: 'chrono', players: {}, matches: {},
            chronoData: { events: [{ id: 1, name: '50m Nage Libre', series: [] }], series: [], participants: [], nextEventId: 2, nextSerieId: 1, nextParticipantId: 1 },
        },
        2: { dayType: 'championship', matches: { 1: [] }, players: { 1: LINES.map(n => ({ name: n, club: '' })) } },
    };
    document.body.innerHTML = '<div id="chrono-content-1"></div>';
    raceData.events = [];
    raceData.series = [];
    raceData.currentSerie = null;
    raceData.currentDayNumber = null;
    raceData.currentSerieId = null;
    window.generateSwimmingSeries(1, 2, 5);
});

afterEach(() => {
    if (raceData.currentSerie && raceData.currentSerie.isRunning) window.toggleRaceTimer();
    raceData.currentSerie = null;
    jest.useRealTimers();
});

function serie() { return championship.days[1].chronoData.events[0].series[0]; }
function emma() { return serie().participants.find(p => p.name === 'Emma Roux'); }

function openRace(start) {
    window.startChronoRaceForDay(1, serie().id);
    jest.advanceTimersByTime(150);
    if (start) { window.toggleRaceTimer(); jest.advanceTimersByTime(1000); }
}

test('cas de l\'utilisateur : Emma a le dossard 5 et le couloir 1', () => {
    expect(emma().bib).toBe(5);
    expect(emma().laneNumber).toBe(1);
});

describe('tableau de course (avant et pendant la course)', () => {
    test('colonne « Couloir » au lieu de « Dossard », lignes triées par couloir', () => {
        openRace(false);
        const headers = [...document.querySelectorAll('#raceInterface thead th')].map(th => th.textContent.trim());
        expect(headers[0]).toBe('Couloir');
        expect(headers).not.toContain('Dossard');
        const firstCells = [...document.querySelectorAll('#participantsTableBody tr')].map(tr => tr.cells[0].textContent.trim());
        expect(firstCells).toEqual(['1', '2', '3', '4', '5']);
        const emmaRow = [...document.querySelectorAll('#participantsTableBody tr')].find(tr => tr.textContent.includes('Emma Roux'));
        expect(emmaRow.cells[0].textContent.trim()).toBe('1');
        expect(emmaRow.textContent).not.toContain('#5');
    });

    test('après une arrivée, la ligne mise à jour garde le couloir', () => {
        openRace(true);
        window.finishLane(1);
        const row = document.getElementById('participant-' + emma().bib);
        expect(row.cells[0].textContent.trim()).toBe('1');
        expect(row.textContent).not.toContain('#5');
    });

    test('l\'édition en ligne (✏️) vise toujours les bonnes cellules', () => {
        openRace(true);
        window.editParticipantRowInline(String(emma().bib));
        const row = document.getElementById('participant-' + emma().bib);
        expect(row.cells[3].querySelector('#edit-laps-' + emma().bib)).not.toBeNull();
        expect(row.cells[4].querySelector('#edit-dist-' + emma().bib)).not.toBeNull();
        expect(row.cells[5].querySelector('#edit-time-' + emma().bib)).not.toBeNull();
    });
});

describe('gros boutons de couloir', () => {
    function laneButton(lane) { return document.getElementById('lane-' + lane); }
    function texts(el) { return [...el.querySelectorAll('div')].map(d => d.textContent.trim()); }

    test('légende « Couloir » + grand numéro + nom, sans dossard nu', () => {
        openRace(true);
        const t = texts(laneButton(1));
        expect(laneButton(1).textContent).toMatch(/couloir/i);
        expect(t).toContain('1');
        expect(t).toContain('Emma Roux');
        expect(t).not.toContain('5'); // le dossard ne s'affiche plus comme un 2e chiffre
    });

    test('après l\'arrivée, le bouton garde la même présentation', () => {
        openRace(true);
        window.finishLane(1);
        const t = texts(laneButton(1));
        expect(laneButton(1).textContent).toMatch(/couloir/i);
        expect(t).toContain('1');
        expect(t).toContain('Emma Roux');
        expect(t).not.toContain('5');
        expect(laneButton(1).textContent).toContain('✅');
    });
});

test('second écran 🖥️ Afficher : colonne Couloir au lieu du dossard', () => {
    openRace(true);
    const html = window.buildLiveRaceDisplayContentHTML().body;
    expect(html).toContain('>Couloir<');
    expect(html).not.toContain('>Dossard<');
    expect(html).not.toContain('#5');
});

test('feuille « Imprimer séries » : colonne Couloir, triée par couloir avant la course', () => {
    const written = [];
    const spy = jest.spyOn(window, 'open').mockReturnValue({ document: { write: h => written.push(h), close() {} }, focus() {}, print() {} });
    try {
        window.printChronoCompetition(1);
        jest.runOnlyPendingTimers();
    } finally {
        spy.mockRestore();
    }
    const doc = new DOMParser().parseFromString(written.join(''), 'text/html');
    const table = doc.querySelector('table');
    const headers = [...table.querySelectorAll('th')].map(th => th.textContent.trim());
    expect(headers).toContain('Couloir');
    expect(headers).not.toContain('Dossard');
    const laneCol = headers.indexOf('Couloir');
    const names = [...table.querySelectorAll('tbody tr')].map(tr => tr.cells[laneCol].textContent.trim() + ':' + tr.textContent.match(/Alice Martin|Bruno Petit|Chloe Durand|David Leroy|Emma Roux/)[0]);
    expect(names).toEqual(['1:Emma Roux', '2:Chloe Durand', '3:Alice Martin', '4:Bruno Petit', '5:David Leroy']);
});

test('feuille « Imprimer séries » : ni « undefined » ni couleurs de médaille avant la course', () => {
    const written = [];
    const spy = jest.spyOn(window, 'open').mockReturnValue({ document: { write: h => written.push(h), close() {} }, focus() {}, print() {} });
    try {
        window.printChronoCompetition(1);
        jest.runOnlyPendingTimers();
    } finally {
        spy.mockRestore();
    }
    const html = written.join('');
    expect(html).not.toContain('undefined');
    expect(html).toContain('Distance: 50m');
    const doc = new DOMParser().parseFromString(html, 'text/html');
    expect(doc.querySelectorAll('tbody tr.medal-1, tbody tr.medal-2, tbody tr.medal-3')).toHaveLength(0);
});

describe('feuille imprimée = boutons d\'arrêt (mêmes couloirs)', () => {
    function printDoc() {
        const written = [];
        const spy = jest.spyOn(window, 'open').mockReturnValue({ document: { write: h => written.push(h), close() {} }, focus() {}, print() {} });
        try {
            window.printChronoCompetition(1);
            jest.runOnlyPendingTimers();
        } finally {
            spy.mockRestore();
        }
        return new DOMParser().parseFromString(written.join(''), 'text/html');
    }
    function printedLanes(doc, serieName) {
        const block = [...doc.querySelectorAll('.serie')].find(el => el.querySelector('h3').textContent.includes(serieName));
        const headers = [...block.querySelectorAll('th')].map(th => th.textContent.trim());
        const laneCol = headers.indexOf('Couloir');
        const nameCol = headers.indexOf('Nom');
        const lanes = {};
        block.querySelectorAll('tbody tr').forEach(tr => {
            lanes[tr.cells[nameCol].textContent.trim()] = tr.cells[laneCol].textContent.trim();
        });
        return lanes;
    }

    test('série ancienne sans couloir : l\'impression attribue les couloirs que la course utilisera', () => {
        // Série créée avant l'attribution automatique : deux nageurs sans couloir
        serie().participants.find(p => p.name === 'David Leroy').laneNumber = null;
        emma().laneNumber = null;

        const lanes = printedLanes(printDoc(), serie().name);
        expect(lanes['David Leroy']).toBe('1');
        expect(lanes['Emma Roux']).toBe('5');
        // Attribution enregistrée dans la journée, pas seulement sur la feuille
        expect(emma().laneNumber).toBe(5);

        openRace(true);
        Object.keys(lanes).forEach(name => {
            const button = document.getElementById('lane-' + lanes[name]);
            expect(button.querySelector('.lane-name').textContent).toBe(name);
        });
    });

    test('une série créée via ➕ Série (hors génération natation) est imprimée avec ses couloirs', () => {
        const manual = window.addChronoSerie(1, 'Série manuelle', 1, { sportType: 'swimming', distance: 50, laneMode: true });
        window.addChronoParticipant(1, manual.id, 'Zoe Blanc', 42);
        window.addChronoParticipant(1, manual.id, 'Yann Morel', 43);

        const doc = printDoc();
        expect(doc.body.textContent).toContain('Série manuelle');
        expect(printedLanes(doc, 'Série manuelle')).toEqual({ 'Zoe Blanc': '1', 'Yann Morel': '2' });
    });
});
