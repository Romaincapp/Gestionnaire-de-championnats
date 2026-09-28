/**
 * @jest-environment jsdom
 *
 * Ajouter / modifier des séries natation sur place, sans risque.
 * Cas réel de l'utilisateur : séries générées par « 🏊 Séries natation », puis, sur
 * place, une série ajoutée via le bouton du haut « 🏃 Série » → série « indépendante »
 * (sans épreuve) : ni imprimée ni classée par épreuve. Le « + Série » de l'épreuve
 * existait, mais une série ajoutée ainsi à une épreuve générée était invisible, et la
 * fenêtre repartait sur « Course à pied, 1000 m, sans couloirs ». Recliquer
 * « Séries natation » effaçait tout (même les séries nagées) sans prévenir.
 */
const { loadModules, DEFAULT_ORDER } = require('../helpers/loadApp');

beforeAll(() => {
    loadModules(DEFAULT_ORDER);
});

const LINES = [
    'Alice Martin 50m libre 31.00', 'Bruno Petit 50m libre 32.00', 'Chloe Durand 50m libre 33.00',
    'David Leroy 50m libre 34.00', 'Emma Roux 50m libre 35.00', 'Farid Nour 50m libre 36.00',
    'Gina Wolf 50m libre 37.00',
];

let confirmSpy;

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
    window.generateSwimmingSeries(1, 2, 5); // 7 nageurs → Série 1 (5) + Série 2 (2)
    window.refreshChronoDisplay(1);
    confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
});

afterEach(() => {
    if (raceData.currentSerie && raceData.currentSerie.isRunning) window.toggleRaceTimer();
    raceData.currentSerie = null;
    confirmSpy.mockRestore();
    document.querySelectorAll('[id^="serieModal-"]').forEach(m => m.remove());
    jest.useRealTimers();
});

const chronoData = () => championship.days[1].chronoData;
const event = () => chronoData().events[0];
const eventCard = () => document.querySelector('.chrono-event-card');
const serieNamesInCard = () => [...eventCard().querySelectorAll('.chrono-serie-card strong')].map(s => s.textContent.replace('🏃', '').trim());

function printedHTML() {
    const written = [];
    const spy = jest.spyOn(window, 'open').mockReturnValue({ document: { write: h => written.push(h), close() {} }, focus() {}, print() {} });
    try {
        window.printChronoCompetition(1);
        jest.runOnlyPendingTimers();
    } finally {
        spy.mockRestore();
    }
    return written.join('');
}

function addSerieFromEventButton() {
    const button = [...eventCard().querySelectorAll('button')].find(b => b.textContent.includes('➕ Série'));
    button.click();
    window.saveSerieForDay(1);
}

describe('bouton « ➕ Série » de l\'épreuve', () => {
    test('visible dans l\'en-tête de l\'épreuve, avant la liste des séries', () => {
        const button = [...eventCard().querySelectorAll('button')].find(b => b.textContent.includes('➕ Série'));
        expect(button).toBeDefined();
        const firstSerie = eventCard().querySelector('.chrono-serie-card');
        // DOCUMENT_POSITION_FOLLOWING : la 1re série vient après le bouton
        expect(button.compareDocumentPosition(firstSerie) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    test('la fenêtre est pré-remplie depuis les séries de l\'épreuve (natation, 50 m, couloirs, « Série 3 »)', () => {
        window.showAddSerieModalForDayAndEvent(1, 1);
        expect(document.getElementById('serieName-1').value).toBe('Série 3');
        expect(document.getElementById('serieSportType-1').value).toBe('swimming');
        expect(document.getElementById('serieDistance-1').value).toBe('50');
        expect(document.getElementById('serieLaneMode-1').checked).toBe(true);
        expect(document.getElementById('serieModal-1').textContent).toContain('50m Nage Libre');
    });

    test('épreuve sans série : pré-rempli depuis le nom de l\'épreuve', () => {
        chronoData().events.push({ id: 2, name: '100m Brasse', series: [] });
        window.showAddSerieModalForDayAndEvent(1, 2);
        expect(document.getElementById('serieName-1').value).toBe('Série 1');
        expect(document.getElementById('serieSportType-1').value).toBe('swimming');
        expect(document.getElementById('serieDistance-1').value).toBe('100');
        expect(document.getElementById('serieLaneMode-1').checked).toBe(true);
    });

    test('épreuve de course à pied : réglages par défaut inchangés', () => {
        chronoData().events.push({ id: 2, name: 'Cross 5 km', series: [] });
        window.showAddSerieModalForDayAndEvent(1, 2);
        expect(document.getElementById('serieSportType-1').value).toBe('running');
        expect(document.getElementById('serieLaneMode-1').checked).toBe(false);
    });

    test('la série ajoutée apparaît sous l\'épreuve générée, et sur la feuille imprimée', () => {
        addSerieFromEventButton();
        expect(serieNamesInCard()).toEqual(['Série 1', 'Série 2', 'Série 3']);
        const added = window.getEventSeries(chronoData(), event()).find(s => s.name === 'Série 3');
        expect(added).toMatchObject({ eventId: 1, sportType: 'swimming', distance: 50, laneMode: true });
        expect(printedHTML()).toContain('Série 3');
    });

    test('le bouton du haut « 🏃 Série » (série sans épreuve) a disparu de la barre d\'actions', () => {
        const toolbarButtons = [...document.querySelectorAll('#chrono-content-1 button')].map(b => b.getAttribute('onclick'));
        expect(toolbarButtons).not.toContain('showAddSerieModalForDay(1)');
    });
});

describe('séries indépendantes (créées avec l\'ancien bouton du haut)', () => {
    let orphan;
    beforeEach(() => {
        orphan = window.addChronoSerie(1, 'Série sur place', null, { sportType: 'swimming', laneMode: true, distance: 50 });
        window.refreshChronoDisplay(1);
    });

    test('proposent « 📎 Rattacher à une épreuve »', () => {
        const select = document.getElementById('attachSerie-1-' + orphan.id);
        expect(select).not.toBeNull();
        expect([...select.options].map(o => o.textContent)).toContain('50m Nage Libre');
    });

    test('une fois rattachée : sous l\'épreuve, imprimée, plus « indépendante »', () => {
        expect(printedHTML()).not.toContain('Série sur place');
        window.attachSerieToEvent(1, orphan.id, 1);
        expect(orphan.eventId).toBe(1);
        expect(serieNamesInCard()).toContain('Série sur place');
        expect(document.querySelector('.chrono-orphan-series')).toBeNull();
        expect(printedHTML()).toContain('Série sur place');
    });
});

describe('🗑️ supprimer une série', () => {
    test('série générée (dans l\'épreuve)', () => {
        const serie2 = event().series[1];
        window.deleteSerieForDay(1, serie2.id);
        expect(event().series.map(s => s.name)).toEqual(['Série 1']);
        expect(serieNamesInCard()).toEqual(['Série 1']);
    });

    test('série ajoutée sur place (à plat)', () => {
        addSerieFromEventButton();
        const added = chronoData().series.find(s => s.name === 'Série 3');
        window.deleteSerieForDay(1, added.id);
        expect(chronoData().series.find(s => s.id === added.id)).toBeUndefined();
        expect(serieNamesInCard()).toEqual(['Série 1', 'Série 2']);
    });

    test('annuler la confirmation ne supprime rien ; les temps perdus sont annoncés', () => {
        const serie1 = event().series[0];
        serie1.results = [{ name: 'Alice Martin', time: 31000 }, { name: 'Bruno Petit', time: 32000 }];
        confirmSpy.mockReturnValue(false);
        window.deleteSerieForDay(1, serie1.id);
        expect(confirmSpy.mock.calls[0][0]).toMatch(/2 temps/);
        expect(event().series).toHaveLength(2);
    });

    test('refusée pendant la course de cette série', () => {
        const serie1 = event().series[0];
        window.startChronoRaceForDay(1, serie1.id);
        jest.advanceTimersByTime(150);
        window.toggleRaceTimer();
        window.deleteSerieForDay(1, serie1.id);
        expect(confirmSpy).not.toHaveBeenCalled();
        expect(event().series).toHaveLength(2);
    });
});

test('supprimer l\'épreuve annonce aussi ses séries générées', () => {
    confirmSpy.mockReturnValue(false);
    window.deleteEventForDay(1, 1);
    expect(confirmSpy.mock.calls[0][0]).toContain('2 série(s)');
});

describe('« 🏊 Séries natation » quand des séries existent déjà', () => {
    function regenerateViaModal() {
        window.showSwimmingImportModal(1);
        document.getElementById('swimSourceDay').value = '2';
        document.getElementById('swimTargetDay').value = '1';
        window.confirmSwimmingImport(1);
    }

    beforeEach(() => {
        // Série 1 déjà nagée
        event().series[0].status = 'completed';
        event().series[0].results = [{ name: 'Alice Martin', time: 31000 }];
        addSerieFromEventButton(); // Série 3 ajoutée sur place
    });

    afterEach(() => {
        const modal = document.getElementById('swimmingImportModal');
        if (modal) modal.remove();
    });

    test('la fenêtre prévient avant même de cliquer', () => {
        window.showSwimmingImportModal(1);
        const text = document.getElementById('swimmingImportModal').textContent;
        expect(text).toMatch(/3 séries existantes/);
        expect(text).toMatch(/1 déjà disputée/);
        expect(text).toContain('➕ Série');
    });

    test('confirmation avec les bons comptes ; Annuler ne touche à rien', () => {
        const before = event().series.slice();
        confirmSpy.mockReturnValue(false);
        regenerateViaModal();
        expect(confirmSpy).toHaveBeenCalledTimes(1);
        expect(confirmSpy.mock.calls[0][0]).toMatch(/3 séries existantes/);
        expect(confirmSpy.mock.calls[0][0]).toMatch(/1 déjà disputée/);
        expect(event().series).toEqual(before);
        expect(event().series[0].results).toHaveLength(1);
        expect(chronoData().series.some(s => s.name === 'Série 3')).toBe(true);
    });

    test('confirmer régénère et retire aussi la série ajoutée sur place (comme annoncé)', () => {
        regenerateViaModal();
        expect(event().series.map(s => s.name)).toEqual(['Série 1', 'Série 2']);
        expect(event().series[0].results || []).toHaveLength(0);
        expect(chronoData().series.filter(s => s.eventId === 1)).toHaveLength(0);
    });
});

test('première génération (aucune série) : pas de confirmation', () => {
    championship.days[1].chronoData = { events: [{ id: 1, name: '50m Nage Libre', series: [] }], series: [], participants: [], nextEventId: 2, nextSerieId: 1, nextParticipantId: 1 };
    window.showSwimmingImportModal(1);
    document.getElementById('swimSourceDay').value = '2';
    document.getElementById('swimTargetDay').value = '1';
    window.confirmSwimmingImport(1);
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(event().series).toHaveLength(2);
});

test('dernière série natation sans distance : distance lue dans le nom de l\'épreuve', () => {
    event().series.forEach(s => { s.distance = 0; });
    window.showAddSerieModalForDayAndEvent(1, 1);
    expect(document.getElementById('serieDistance-1').value).toBe('50');
});
