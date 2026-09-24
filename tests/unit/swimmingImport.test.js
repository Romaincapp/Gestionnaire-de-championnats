/**
 * @jest-environment jsdom
 *
 * Import natation (bouton "🏊 Séries natation") : parsing des lignes brutes
 * « nom + épreuve + temps », association aux épreuves, et génération des
 * séries par couloirs via window.generateSwimmingSeries().
 */
const { loadModules, DEFAULT_ORDER } = require('../helpers/loadApp');

beforeAll(() => {
    loadModules(DEFAULT_ORDER);
});

function setupDays(lines, eventNames, opts) {
    opts = opts || {};
    championship.config = { numberOfDivisions: 1, numberOfCourts: 4 };
    championship.days = {
        1: {
            dayType: 'chrono', players: {}, matches: {},
            chronoData: {
                events: eventNames.map((name, i) => ({ id: i + 1, name, series: [] })),
                series: [],
                participants: (opts.existing || []).slice(),
                nextEventId: eventNames.length + 1, nextSerieId: 1, nextParticipantId: 100,
            },
        },
        2: { dayType: 'championship', players: { 1: lines.map(n => ({ name: n, club: '' })) }, matches: { 1: [] } },
    };
}

function importFrom(source, lanes) {
    return window.generateSwimmingSeries(1, source, lanes || 5);
}

function names(eventIndex) {
    return championship.days[1].chronoData.events[eventIndex].series
        .flatMap(s => s.participants.map(p => p.name));
}

// Ordre des couloirs pour 5 nageurs : le plus rapide au centre (couloir 3)
function byLane(eventIndex) {
    const out = {};
    championship.days[1].chronoData.events[eventIndex].series[0].participants
        .forEach(p => { out[p.laneNumber] = p.name; });
    return out;
}

describe('formats de temps', () => {
    test.each([
        ['00:32.50'], ['0:32,50'], ['32.50'], ['32,50'], ["32''50"], ['32"50'],
    ])('« %s » est lu comme 32,50 s et retiré du nom', (time) => {
        setupDays([`Jean Dupont 50m libre ${time}`, 'Eva Roy 50m libre 33.00', 'Luc Roy 50m libre 31.00'],
            ['50m Nage Libre']);
        importFrom(2);
        // 31.00 (Luc) < 32.50 (Jean) < 33.00 (Eva) → couloirs 3, 4, 2
        expect(byLane(0)).toEqual({ 3: 'Luc Roy', 4: 'Jean Dupont', 2: 'Eva Roy' });
    });

    test('M:SS, M\'SS"cc et formats historiques', () => {
        setupDays([
            'A Un 100m dos 1:05.30',
            "B Deux 100m dos 1'04\"00",
            'C Trois 100m dos 1:06',
            'D Quatre 100m dos 0:01:03,000',
            'E Cinq 100m dos 1,07,00',
        ], ['100m Dos']);
        importFrom(2);
        // D 63.0 < B 64.0 < A 65.3 < C 66.0 < E 67.0
        expect(byLane(0)).toEqual({ 3: 'D Quatre', 4: 'B Deux', 2: 'A Un', 5: 'C Trois', 1: 'E Cinq' });
    });

    test('sans temps : placé après les nageurs chronométrés', () => {
        setupDays(['Sans Temps 50m libre', 'Avec Temps 50m libre 40.00'], ['50m Nage Libre']);
        importFrom(2);
        expect(names(0)).toEqual(['Avec Temps', 'Sans Temps']);
    });
});

describe('nom et nage', () => {
    test('un nom contenant une nage ne la remplace pas', () => {
        setupDays([
            'Georges Brassens 50m dos 40.00',
            'Pedro Dos Santos 50m brasse 48.00',
            'Anna Libretti 50m dos 41.00',
        ], ['50m Dos', '50m Brasse']);
        importFrom(2);
        expect(names(0)).toEqual(['Georges Brassens', 'Anna Libretti']);
        expect(names(1)).toEqual(['Pedro Dos Santos']);
    });

    test('séparateurs, nage répétée et capitalisation composée', () => {
        setupDays([
            'Dupont Jean - 50m Libre - 00:32.50',
            'MARIE-CLAIRE LEFÈVRE 50m libre libre 33.00',
            "chloé d'alembert 50m libre 34.00",
        ], ['50m Nage Libre']);
        importFrom(2);
        expect(names(0)).toEqual(['Dupont Jean', 'Marie-Claire Lefèvre', "Chloé D'Alembert"]);
    });
});

describe('association aux épreuves', () => {
    test.each([['50m Nage Libre'], ['50 mètres nage libre'], ['50 NL'], ['Nage libre 50']])(
        'l\'épreuve « %s » reçoit les nageurs de 50m libre', (evName) => {
            setupDays(['Jean Dupont 50m crawl 32.50'], [evName]);
            const r = importFrom(2);
            expect(r.totalSeries).toBe(1);
            expect(names(0)).toEqual(['Jean Dupont']);
        });

    test('un 50m ne va pas dans une épreuve de 150m', () => {
        setupDays(['Jean Dupont 50m libre 32.50'], ['150m Nage Libre', '50m Nage Libre']);
        importFrom(2);
        expect(names(0)).toEqual([]);
        expect(names(1)).toEqual(['Jean Dupont']);
    });

    test('aucune correspondance : rien n\'est modifié', () => {
        const existing = [{ id: 1, name: 'Participant Existant', bib: 7 }];
        setupDays(['Jean Dupont 50m libre 32.50'], ['100m Dos'], { existing });
        championship.days[1].chronoData.events[0].series = [{ id: 9, name: 'Ancienne', participants: [] }];

        const r = importFrom(2);

        expect(r.totalSeries).toBe(0);
        expect(r.unmatched).toHaveLength(1);
        expect(championship.days[1].chronoData.events[0].series.map(s => s.name)).toEqual(['Ancienne']);
        expect(championship.days[1].chronoData.participants.map(p => p.name)).toEqual(['Participant Existant']);
    });
});

describe('participants de la journée', () => {
    test('les participants existants sont conservés et les dossards continuent', () => {
        setupDays(['Jean Dupont 50m libre 32.50'], ['50m Nage Libre'],
            { existing: [{ id: 1, name: 'Participant Existant', bib: 7 }] });
        importFrom(2);
        expect(championship.days[1].chronoData.participants.map(p => p.name + '#' + p.bib))
            .toEqual(['Participant Existant#7', 'Jean Dupont#8']);
    });

    test('la journée Courses peut être sa propre source, et un réimport ne duplique rien', () => {
        setupDays([], ['50m Nage Libre'], {
            existing: [
                { id: 1, name: 'Jean Dupont 50m libre 32.50', bib: 1 },
                { id: 2, name: 'Eva Roy 50m libre 30.90', bib: 2 },
                { id: 3, name: 'Coach Martin', bib: 3 },
            ],
        });

        importFrom(1);
        importFrom(1, 6);

        const cd = championship.days[1].chronoData;
        expect(cd.participants.map(p => p.name).sort()).toEqual(['Coach Martin', 'Eva Roy', 'Jean Dupont']);
        expect(cd.events[0].series).toHaveLength(1);
        expect(cd.events[0].series[0].participants.map(p => p.name)).toEqual(['Eva Roy', 'Jean Dupont']);
    });

    test('une ligne sans épreuve correspondante reste dans les participants', () => {
        setupDays([], ['50m Nage Libre'], {
            existing: [
                { id: 1, name: 'Jean Dupont 50m libre 32.50', bib: 1 },
                { id: 2, name: 'Eva Roy 100m dos 1:10.00', bib: 2 },
            ],
        });

        const r = importFrom(1);

        expect(r.unmatched).toHaveLength(1);
        expect(championship.days[1].chronoData.participants.map(p => p.name).sort())
            .toEqual(['Eva Roy 100m dos 1:10.00', 'Jean Dupont']);
    });
});
