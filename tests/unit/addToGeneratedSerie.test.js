/**
 * @jest-environment jsdom
 *
 * « + » des Participants disponibles vers les séries générées par « 🏊 Séries natation ».
 * Signalé par l'utilisateur : le « + » ne proposait que les séries créées à la main
 * (chronoData.series) ; les séries générées (event.series) n'y figuraient jamais, et
 * après une simple génération le « + » était remplacé par « Créez une série ».
 * Piège à éviter : le dossard par défaut (nombre de participants + 1) retombe sur un
 * dossard déjà pris dans une série générée (dossards continus : Série 2 = 6..10).
 */
const { loadModules, DEFAULT_ORDER } = require('../helpers/loadApp');

beforeAll(() => {
    loadModules(DEFAULT_ORDER);
});

const NAMES = ['Alice Martin', 'Bruno Petit', 'Chloe Durand', 'David Leroy', 'Emma Roux', 'Farid Nour',
    'Gina Wolf', 'Hugo Lambert', 'Ines Garcia', 'Jules Robin', 'Karim Saidi', 'Lea Morel'];
const LINES = NAMES.map((n, i) => n + ' 50m libre ' + (31 + i) + '.00');

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
    // 12 nageurs, 5 couloirs → Série 1 (dossards 1-5), Série 2 (6-10), Série 3 (11-12)
    window.generateSwimmingSeries(1, 2, 5);
    // Un retardataire, ajouté sur place aux Participants disponibles
    cd().participants.push({ id: cd().nextParticipantId++, name: 'Zoe Late', club: 'CN Liège', bib: 13 });
    window.refreshChronoDisplay(1);
    confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
});

afterEach(() => {
    if (raceData.currentSerie && raceData.currentSerie.isRunning) window.toggleRaceTimer();
    raceData.currentSerie = null;
    confirmSpy.mockRestore();
    document.querySelectorAll('[id^="addToSerieModal-"], [id^="bulkAddToSerieModal-"]').forEach(m => m.remove());
    jest.useRealTimers();
});

const cd = () => championship.days[1].chronoData;
const serie = (n) => cd().events[0].series[n - 1];
const pool = (name) => cd().participants.find(p => p.name === name);
const inSerie = (s, name) => s.participants.find(p => p.name === name);
const bibsUnique = (s) => new Set(s.participants.map(p => p.bib)).size === s.participants.length;

test('données de départ : Série 2 = dossards 6 à 10, couloirs 1 à 5', () => {
    expect(serie(2).participants.map(p => p.bib).sort((a, b) => a - b)).toEqual([6, 7, 8, 9, 10]);
    expect(serie(3).participants.map(p => p.laneNumber).sort()).toEqual([3, 4]);
});

describe('Participants disponibles', () => {
    test('après une génération natation seule : « + » et « ➕ Ajouter à une série » présents', () => {
        const zoeRow = document.getElementById('participant-row-1-' + pool('Zoe Late').id);
        expect(zoeRow.querySelector('button[onclick^="showAddToSerieModal"]')).not.toBeNull();
        expect(zoeRow.textContent).not.toContain('Créez une série');
        expect(document.querySelector('button[onclick="showBulkAddToSerieModal(1)"]')).not.toBeNull();
    });

    test('la fenêtre « + » liste les séries générées, groupées par épreuve, avec le couloir proposé', () => {
        window.showAddToSerieModal(1, pool('Zoe Late').id);
        const modal = document.getElementById('addToSerieModal-1');
        const text = modal.textContent.replace(/\s+/g, ' ');
        expect(text).toContain('50m Nage Libre');
        ['Série 1', 'Série 2', 'Série 3'].forEach(n => expect(text).toContain(n));
        const option = modal.querySelector('[data-serie-id="' + serie(3).id + '"]');
        expect(option.textContent).toContain('→ couloir 1');
        expect(modal.querySelector('[data-serie-id="' + serie(2).id + '"]').textContent).toContain('→ couloir 6');
    });
});

describe('ajout à une série générée', () => {
    test('dossard unique (celui du participant) et couloir libre', () => {
        window.addExistingParticipantToSerie(1, pool('Zoe Late').id, serie(2).id);
        const zoe = inSerie(serie(2), 'Zoe Late');
        expect(zoe).toMatchObject({ bib: 13, laneNumber: 6, club: 'CN Liège' });
        expect(bibsUnique(serie(2))).toBe(true);
    });

    test('sans dossard fourni : plus grand dossard de la série + 1 (pas « nombre + 1 », déjà pris)', () => {
        const added = window.addChronoParticipant(1, serie(2).id, 'Yann Morel', null);
        expect(added.bib).toBe(11);
        expect(bibsUnique(serie(2))).toBe(true);
    });

    test('le nageur ajouté a son bouton de couloir en course et figure sur la feuille imprimée', () => {
        window.addExistingParticipantToSerie(1, pool('Zoe Late').id, serie(3).id);
        expect(inSerie(serie(3), 'Zoe Late').laneNumber).toBe(1);

        const written = [];
        const spy = jest.spyOn(window, 'open').mockReturnValue({ document: { write: h => written.push(h), close() {} }, focus() {}, print() {} });
        try { window.printChronoCompetition(1); jest.runOnlyPendingTimers(); } finally { spy.mockRestore(); }
        expect(written.join('')).toContain('Zoe Late');

        window.startChronoRaceForDay(1, serie(3).id);
        jest.advanceTimersByTime(150);
        window.toggleRaceTimer(); // les gros boutons de couloir apparaissent au départ
        jest.advanceTimersByTime(2000);
        expect(document.querySelector('#lane-1 .lane-name').textContent).toBe('Zoe Late');
        window.finishLane(1);
        expect(raceData.currentSerie.participants.find(p => p.name === 'Zoe Late').status).toBe('finished');
    });

    test('déjà dans la série cible : rien n\'est ajouté', () => {
        window.addExistingParticipantToSerie(1, pool('Alice Martin').id, serie(1).id);
        expect(serie(1).participants.filter(p => p.name === 'Alice Martin')).toHaveLength(1);
    });
});

describe('nageur déjà dans une autre série de l\'épreuve → déplacement', () => {
    test('la fenêtre le signale sur les autres séries de l\'épreuve', () => {
        window.showAddToSerieModal(1, pool('Alice Martin').id);
        const modal = document.getElementById('addToSerieModal-1');
        expect(modal.querySelector('[data-serie-id="' + serie(1).id + '"]').textContent).toContain('Déjà présent');
        expect(modal.querySelector('[data-serie-id="' + serie(3).id + '"]').textContent).toContain('déjà en Série 1');
    });

    test('confirmé : retiré de Série 1, ajouté en Série 3 avec le même dossard', () => {
        window.addExistingParticipantToSerie(1, pool('Alice Martin').id, serie(3).id);
        expect(confirmSpy.mock.calls[0][0]).toMatch(/Déplacer.*Alice Martin.*Série 1.*Série 3/s);
        expect(inSerie(serie(1), 'Alice Martin')).toBeUndefined();
        expect(inSerie(serie(3), 'Alice Martin')).toMatchObject({ bib: 1, laneNumber: 1 });
    });

    test('annulé : rien ne bouge', () => {
        confirmSpy.mockReturnValue(false);
        window.addExistingParticipantToSerie(1, pool('Alice Martin').id, serie(3).id);
        expect(inSerie(serie(1), 'Alice Martin')).toBeDefined();
        expect(inSerie(serie(3), 'Alice Martin')).toBeUndefined();
    });

    test('refusé s\'il a déjà nagé dans son ancienne série', () => {
        inSerie(serie(1), 'Alice Martin').status = 'finished';
        window.addExistingParticipantToSerie(1, pool('Alice Martin').id, serie(3).id);
        expect(confirmSpy).not.toHaveBeenCalled();
        expect(inSerie(serie(1), 'Alice Martin')).toBeDefined();
        expect(inSerie(serie(3), 'Alice Martin')).toBeUndefined();
    });

    test('un nageur DNS (pas parti) peut être déplacé', () => {
        inSerie(serie(1), 'Alice Martin').status = 'dns';
        window.addExistingParticipantToSerie(1, pool('Alice Martin').id, serie(3).id);
        expect(inSerie(serie(1), 'Alice Martin')).toBeUndefined();
        expect(inSerie(serie(3), 'Alice Martin')).toBeDefined();
    });
});

describe('« ➕ Ajouter à une série » (cochés)', () => {
    function check(...names) {
        names.forEach(n => {
            document.querySelector('.participant-check-1[value="' + pool(n).id + '"]').checked = true;
        });
    }

    test('la fenêtre liste les séries générées', () => {
        check('Zoe Late');
        window.showBulkAddToSerieModal(1);
        const modal = document.getElementById('bulkAddToSerieModal-1');
        expect(modal.querySelector('[data-serie-id="' + serie(3).id + '"]')).not.toBeNull();
    });

    test('ajoute les nouveaux et déplace (une seule confirmation) ceux déjà dans l\'épreuve', () => {
        check('Zoe Late', 'Alice Martin');
        window.bulkAddParticipantsToSerie(1, serie(3).id);
        expect(confirmSpy).toHaveBeenCalledTimes(1);
        expect(confirmSpy.mock.calls[0][0]).toContain('Alice Martin');
        expect(inSerie(serie(3), 'Zoe Late')).toBeDefined();
        expect(inSerie(serie(3), 'Alice Martin')).toBeDefined();
        expect(inSerie(serie(1), 'Alice Martin')).toBeUndefined();
        expect(bibsUnique(serie(3))).toBe(true);
        expect(new Set(serie(3).participants.map(p => p.laneNumber)).size).toBe(serie(3).participants.length);
    });

    test('ceux qui ont déjà nagé ne sont pas déplacés', () => {
        inSerie(serie(1), 'Alice Martin').status = 'finished';
        check('Zoe Late', 'Alice Martin');
        window.bulkAddParticipantsToSerie(1, serie(3).id);
        expect(inSerie(serie(3), 'Zoe Late')).toBeDefined();
        expect(inSerie(serie(3), 'Alice Martin')).toBeUndefined();
        expect(inSerie(serie(1), 'Alice Martin')).toBeDefined();
    });
});
