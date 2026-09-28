/**
 * @jest-environment jsdom
 *
 * Points par épreuve et classement des clubs (demande utilisateur) :
 * - barème Multisport 25-19-17-15-12-10-8-6-4-2 (0 au-delà du 10e) ;
 * - un club ne marque qu'une fois par épreuve, avec son meilleur classé, et les
 *   meilleurs de chaque club sont RECLASSÉS entre clubs (1er et 2e du club A, 3e du
 *   club B → A 25, B 19) ;
 * - tableau des clubs : une colonne par épreuve (points gagnés) et un total.
 */
const { loadModules, DEFAULT_ORDER } = require('../helpers/loadApp');

beforeAll(() => {
    loadModules(DEFAULT_ORDER);
});

// entries : [nom, club, temps en secondes]
function serieOf(id, entries) {
    const participants = entries.map(([name, club, t]) => ({
        id: name, name, club, bib: name, status: 'finished', finishTime: Math.round(t * 1000), totalTime: Math.round(t * 1000), laneNumber: 1,
    }));
    return {
        id, name: 'Série 1', sportType: 'swimming', laneMode: true, participants,
        results: participants.map(p => ({ name: p.name, club: p.club, bib: p.bib, time: p.finishTime })),
    };
}
function setEvents(events) {
    championship.config = { numberOfDivisions: 1, numberOfCourts: 4 };
    championship.days = {
        1: {
            dayType: 'chrono', players: {}, matches: {},
            chronoData: {
                events: events.map(([name, entries], i) => ({ id: i + 1, name, series: [serieOf(i + 1, entries)] })),
                series: [], participants: [],
            },
        },
    };
}
const points = (evt) => Object.fromEntries(evt.entries.map(e => [e.name, e.clubPoints]));

describe('points par épreuve', () => {
    test('cas de l\'utilisateur : 1er et 2e du club A, 3e du club B → A 25, B 19 ; sans club : pas de points', () => {
        setEvents([['50m libre', [
            ['Xavier Solo', '', 29.00],
            ['Anne A', 'Club A', 30.00], ['Alex A', 'Club A', 31.00],
            ['Bea B', 'Club B', 32.00], ['Cid C', 'Club C', 33.00],
        ]]]);
        const evt = window.calculateEventRankings()[0];
        expect(points(evt)).toEqual({ 'Xavier Solo': null, 'Anne A': 25, 'Alex A': null, 'Bea B': 19, 'Cid C': 17 });
        expect(evt.entries.map(e => e.rank)).toEqual([1, 2, 3, 4, 5]); // classement individuel inchangé
    });

    test('ex æquo au centième entre deux clubs : mêmes points, le club suivant est 3e', () => {
        setEvents([['50m libre', [['Anne A', 'Club A', 30.001], ['Bea B', 'Club B', 30.004], ['Cid C', 'Club C', 31.00]]]]);
        expect(points(window.calculateEventRankings()[0])).toEqual({ 'Anne A': 25, 'Bea B': 25, 'Cid C': 17 });
    });

    test('au-delà du 10e club : 0 point', () => {
        const entries = Array.from({ length: 11 }, (_, i) => ['Nageur ' + i, 'Club ' + i, 30 + i]);
        setEvents([['50m libre', entries]]);
        const p = points(window.calculateEventRankings()[0]);
        expect(p['Nageur 9']).toBe(2);
        expect(p['Nageur 10']).toBe(0);
    });

    // Cas réel (export utilisateur 2026-09) : club renommé avec « 🏷️ Affecter aux cochés »
    // avant la PR #92, qui ne corrigeait pas les résultats déjà enregistrés. Le
    // participant de la série fait foi (comme au classement général des courses).
    test('club renommé après la course : le club du participant de la série fait foi', () => {
        setEvents([['50m libre', [['Anne A', 'Aquaphiles', 30], ['Bea B', 'Club B', 31], ['Alex A', 'Aquaphiles', 32]]]]);
        const s = championship.days[1].chronoData.events[0].series[0];
        s.results[0].club = 'Les Aquaphiles';
        s.results[2].club = 'Les Aquaphiles';
        const events = window.calculateEventRankings();
        expect(events[0].entries.map(e => e.club)).toEqual(['Aquaphiles', 'Club B', 'Aquaphiles']);
        expect(points(events[0])).toEqual({ 'Anne A': 25, 'Bea B': 19, 'Alex A': null });
        expect(window.calculateClubEventRanking(events).map(c => [c.club, c.total])).toEqual([['Aquaphiles', 25], ['Club B', 19]]);
    });

    test('résultat sans participant correspondant : son propre club (repli)', () => {
        setEvents([['50m libre', [['Anne A', 'Club A', 30]]]]);
        const s = championship.days[1].chronoData.events[0].series[0];
        s.results.push({ name: 'Hors Liste', club: 'Club Z', bib: 9, time: 31000 });
        expect(window.calculateEventRankings()[0].entries.find(e => e.name === 'Hors Liste').club).toBe('Club Z');
    });

    test('clubs regroupés sans tenir compte des majuscules ni des espaces', () => {
        setEvents([['50m libre', [['Anne', 'CN Liège', 30], ['Paul', ' cn  liège ', 31], ['Bea', 'Club B', 32]]]]);
        expect(points(window.calculateEventRankings()[0])).toEqual({ Anne: 25, Paul: null, Bea: 19 });
    });
});

describe('classement des clubs', () => {
    beforeEach(() => {
        setEvents([
            ['50m libre', [['Anne A', 'Club A', 30], ['Bea B', 'Club B', 31], ['Cid C', 'Club C', 32], ['Alex A', 'Club A', 33]]],
            ['100m libre', [['Ben B', 'Club B', 60], ['Cyd C', 'Club C', 61]]],
        ]);
    });

    test('une colonne par épreuve, total, ordre', () => {
        const events = window.calculateEventRankings();
        const clubs = window.calculateClubEventRanking(events);
        expect(clubs.map(c => [c.rank, c.club, c.perEvent, c.total])).toEqual([
            [1, 'Club B', [19, 25], 44],
            [2, 'Club C', [17, 19], 36],
            [3, 'Club A', [25, null], 25], // absent du 100m : null (« – »)
        ]);
    });

    test('départage à total égal : le plus de 25 points, puis même rang si tout est égal', () => {
        // D : 25 + 4 (9e club) = 29 ; E : 19 + 10 (6e club) = 29 → D devant (un 25)
        const fillers = ['F', 'G', 'H', 'I', 'J'].map((c, i) => ['Nageur ' + c, 'Club ' + c, 50 + i]);
        setEvents([
            ['50m libre', [['Dan D', 'Club D', 30], ['Eva E', 'Club E', 31]]],
            ['100m libre', [...fillers, ['Eva E', 'Club E', 56], ['Nageur K', 'Club K', 57], ['Nageur L', 'Club L', 58], ['Dan D', 'Club D', 59]]],
        ]);
        const clubs = window.calculateClubEventRanking(window.calculateEventRankings());
        const d = clubs.find(c => c.club === 'Club D'), e = clubs.find(c => c.club === 'Club E');
        expect([d.total, e.total]).toEqual([29, 29]);
        expect(clubs.indexOf(d)).toBeLessThan(clubs.indexOf(e));
        expect(d.rank).toBeLessThan(e.rank);

        setEvents([
            ['50m libre', [['Dan D', 'Club D', 30], ['Eva E', 'Club E', 31]]],
            ['100m libre', [['Eva E', 'Club E', 60], ['Dan D', 'Club D', 61]]],
        ]);
        const tied = window.calculateClubEventRanking(window.calculateEventRankings());
        expect(tied.map(c => c.rank)).toEqual([1, 1]);
    });

    test('HTML : tableau des clubs (colonne par épreuve + Total) et colonne Points dans les épreuves', () => {
        document.body.innerHTML = '<div id="out"></div>';
        document.getElementById('out').innerHTML = window.buildEventRankingsHTML();
        const clubTable = document.querySelector('.club-ranking table');
        expect(clubTable).not.toBeNull();
        const headers = [...clubTable.querySelectorAll('thead th')].map(th => th.textContent.trim());
        expect(headers).toEqual(['Rang', 'Club', '50m libre', '100m libre', 'Total']);
        const firstRow = [...clubTable.querySelectorAll('tbody tr')[0].cells].map(td => td.textContent.trim());
        expect(firstRow).toEqual(['1', 'Club B', '19', '25', '44']);
        const lastRow = [...clubTable.querySelectorAll('tbody tr')[2].cells].map(td => td.textContent.trim());
        expect(lastRow).toEqual(['3', 'Club A', '25', '–', '25']);

        const eventTable = document.querySelector('.event-ranking table');
        expect([...eventTable.querySelectorAll('thead th')].map(th => th.textContent.trim())).toContain('Points');
        const alexRow = [...eventTable.querySelectorAll('tbody tr')].find(tr => tr.textContent.includes('Alex A'));
        expect(alexRow.cells[alexRow.cells.length - 1].textContent.trim()).toBe('–');
    });

    test('export JSON : classement des clubs joint aux épreuves', () => {
        const OrigBlob = global.Blob;
        let written = '';
        global.Blob = function(parts, opts) { written = parts.join(''); return new OrigBlob(parts, opts); };
        const origCreate = URL.createObjectURL, origRevoke = URL.revokeObjectURL;
        URL.createObjectURL = () => 'blob:test';
        URL.revokeObjectURL = () => {};
        const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
        try {
            window.exportMultisportRanking();
        } finally {
            global.Blob = OrigBlob;
            URL.createObjectURL = origCreate;
            URL.revokeObjectURL = origRevoke;
            clickSpy.mockRestore();
        }
        const data = JSON.parse(written);
        expect(data.type).toBe('classement-par-epreuve');
        expect(data.clubs.map(c => [c.club, c.total])).toEqual([['Club B', 44], ['Club C', 36], ['Club A', 25]]);
        expect(data.events[0].entries.find(e => e.name === 'Anne A').clubPoints).toBe(25);
    });
});
