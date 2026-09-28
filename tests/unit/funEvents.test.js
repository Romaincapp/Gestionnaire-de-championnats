/**
 * @jest-environment jsdom
 *
 * Épreuves « fun » (demande utilisateur) : case à cocher à la création et à l'édition
 * d'une épreuve. Une épreuve fun garde son tableau de résultats (temps, rangs) mais
 * n'entre pas dans le classement des clubs : pas de colonne « Points », pas de colonne
 * dans le tableau des clubs, rien dans le total.
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

beforeEach(() => {
    document.body.innerHTML = '<div id="out"></div>';
    championship.config = { numberOfDivisions: 1, numberOfCourts: 4 };
    championship.days = {
        1: {
            dayType: 'chrono', players: {}, matches: {},
            chronoData: {
                events: [
                    { id: 1, name: '50m libre', series: [serieOf(1, [['Anne A', 'Club A', 30], ['Bea B', 'Club B', 31]])] },
                    { id: 2, name: 'Relais déguisé', fun: true, series: [serieOf(2, [['Bob B', 'Club B', 40], ['Alex A', 'Club A', 41]])] },
                ],
                series: [], participants: [], nextEventId: 3, nextSerieId: 3,
            },
        },
    };
});

const funEvent = () => championship.days[1].chronoData.events[1];

describe('classement', () => {
    test('épreuve fun : classée au temps, mais sans points', () => {
        const [libre, fun] = window.calculateEventRankings();
        expect(libre.fun).toBe(false);
        expect(fun.fun).toBe(true);
        expect(fun.entries.map(e => e.name + ':' + e.rank)).toEqual(['Bob B:1', 'Alex A:2']);
        expect(fun.entries.map(e => e.clubPoints)).toEqual([null, null]);
        expect(libre.entries.map(e => e.clubPoints)).toEqual([25, 19]);
    });

    test('classement des clubs : l\'épreuve fun ne compte pas', () => {
        const clubs = window.calculateClubEventRanking(window.calculateEventRankings());
        expect(clubs.map(c => [c.club, c.total])).toEqual([['Club A', 25], ['Club B', 19]]);
        // Sans la case, le relais compterait : Club B 19 + 25 = 44, Club A 25 + 19 = 44
        delete funEvent().fun;
        const all = window.calculateClubEventRanking(window.calculateEventRankings());
        expect(all.map(c => [c.club, c.total, c.rank])).toEqual([['Club A', 44, 1], ['Club B', 44, 1]]);
    });

    test('HTML : pas de colonne dans le tableau des clubs, tableau de l\'épreuve sans Points', () => {
        document.getElementById('out').innerHTML = window.buildEventRankingsHTML();
        const clubHeaders = [...document.querySelectorAll('.club-ranking thead th')].map(th => th.textContent.trim());
        expect(clubHeaders).toEqual(['Rang', 'Club', '50m libre', 'Total']);

        const tables = document.querySelectorAll('.event-ranking');
        expect(tables).toHaveLength(2);
        const heads = t => [...t.querySelectorAll('thead th')].map(th => th.textContent.trim());
        expect(heads(tables[0])).toContain('Points');
        expect(heads(tables[1])).not.toContain('Points');
        expect(tables[1].textContent).toContain('Bob B');
        expect(tables[1].querySelector('.fun-event-badge')).not.toBeNull();
        expect(tables[1].textContent).toContain('hors classement des clubs');
        tables[1].querySelectorAll('tbody tr').forEach(tr => expect(tr.cells).toHaveLength(5));
    });

    test('toutes les épreuves fun : pas de tableau des clubs', () => {
        championship.days[1].chronoData.events[0].fun = true;
        document.getElementById('out').innerHTML = window.buildEventRankingsHTML();
        expect(document.querySelector('.club-ranking')).toBeNull();
        expect(document.querySelectorAll('.event-ranking')).toHaveLength(2);
    });
});

describe('case à cocher', () => {
    test('création : les épreuves saisies d\'un coup sont toutes fun', () => {
        window.showAddEventModalForDay(1);
        document.getElementById('eventName-1').value = 'Course en sac\nRelais bouée';
        document.getElementById('eventFun-1').checked = true;
        window.saveEventForDay(1);
        const created = championship.days[1].chronoData.events.slice(2);
        expect(created.map(e => [e.name, e.fun])).toEqual([['Course en sac', true], ['Relais bouée', true]]);
    });

    test('création sans la case : épreuve normale', () => {
        window.showAddEventModalForDay(1);
        document.getElementById('eventName-1').value = '100m dos';
        window.saveEventForDay(1);
        expect(championship.days[1].chronoData.events[2].fun).toBeUndefined();
    });

    test('édition : la case reflète l\'épreuve, et se coche / décoche', () => {
        window.editEventForDay(1, 2);
        const cb = document.getElementById('editEventFun-1-2');
        expect(cb.checked).toBe(true);
        cb.checked = false;
        window.saveEditedEvent(1, 2);
        expect(funEvent().fun).toBeUndefined();

        window.editEventForDay(1, 1);
        document.getElementById('editEventFun-1-1').checked = true;
        window.saveEditedEvent(1, 1);
        expect(championship.days[1].chronoData.events[0].fun).toBe(true);
    });

    test('carte de l\'épreuve dans la journée : badge 🎉 Fun sur la seule épreuve fun', () => {
        document.body.innerHTML = '<div id="chrono-content-1"></div>';
        window.refreshChronoDisplay(1);
        const cards = [...document.querySelectorAll('.chrono-event-card')];
        const badgeOf = name => cards.find(c => c.textContent.includes(name)).querySelector('.fun-event-badge');
        expect(badgeOf('Relais déguisé')).not.toBeNull();
        expect(badgeOf('50m libre')).toBeNull();
    });
});
