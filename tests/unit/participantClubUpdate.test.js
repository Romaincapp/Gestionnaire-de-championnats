/**
 * @jest-environment jsdom
 *
 * Changer le club (ou le nom) d'un participant depuis « Participants disponibles » doit
 * se répercuter partout : séries, résultats déjà enregistrés, cache de course, et donc
 * classements (le classement lit le club du résultat en priorité).
 *
 * Après « 🏁 Séries automatiques », la liste compte une ligne PAR INSCRIPTION : un
 * nageur inscrit dans deux épreuves y figure deux fois, sous le même nom et avec le même
 * id que dans sa série. Constat de départ :
 * - ✏️ refusait ce nageur (« Un participant porte déjà ce nom ») ;
 * - « 🏷️ Affecter aux cochés » ne corrigeait pas les résultats : le classement gardait
 *   l'ancien club.
 */
const { loadModules, DEFAULT_ORDER } = require('../helpers/loadApp');

beforeAll(() => {
    loadModules(DEFAULT_ORDER);
});

function entry(id, name, bib, club) {
    return { id, name, bib, club, category: '', totalTime: null, laps: 0, swimImport: true, swimRaw: name + ' ligne brute' };
}
function swimmer(id, name, bib, club, lane, finishTime) {
    return {
        id, name, bib, club, category: '', laneNumber: lane, laps: [], totalDistance: 0, bestLap: null, lastLapStartTime: 0,
        status: finishTime ? 'finished' : 'ready', totalTime: finishTime || 0, finishTime: finishTime || null,
    };
}

// Comme après « Séries automatiques » : Anne Martin nage le 50m brasse ET le 50m dos
// (deux lignes dans la liste, ids 1 et 3, dossards 1 et 3). Le 50m brasse est nagé.
beforeEach(() => {
    document.body.innerHTML = '<div id="chrono-content-1"></div>';
    championship.config = { numberOfDivisions: 1, numberOfCourts: 4 };
    championship.days = {
        1: {
            dayType: 'chrono', players: {}, matches: {},
            chronoData: {
                participants: [
                    entry(1, 'Anne Martin', 1, 'Apris'),
                    entry(2, 'Bob Durand', 2, 'Boulaie'),
                    entry(3, 'Anne Martin', 3, 'Apris'),
                    entry(4, 'Chloé Petit', 4, 'Jalon'),
                ],
                events: [
                    { id: 1, name: '50m brasse', laneMode: true, series: [{
                        id: 1, name: 'Série 1', eventId: 1, sportType: 'swimming', laneMode: true, status: 'completed',
                        participants: [swimmer(1, 'Anne Martin', 1, 'Apris', 3, 30000), swimmer(2, 'Bob Durand', 2, 'Boulaie', 2, 31000)],
                        results: [
                            { name: 'Anne Martin', bib: 1, club: 'Apris', category: '', time: 30000 },
                            { name: 'Bob Durand', bib: 2, club: 'Boulaie', category: '', time: 31000 },
                        ],
                    }] },
                    { id: 2, name: '50m dos', laneMode: true, series: [{
                        id: 2, name: 'Série 1', eventId: 2, sportType: 'swimming', laneMode: true, status: 'pending',
                        participants: [swimmer(3, 'Anne Martin', 3, 'Apris', 3), swimmer(4, 'Chloé Petit', 4, 'Jalon', 2)],
                    }] },
                ],
                series: [], nextEventId: 3, nextSerieId: 3, nextParticipantId: 5,
            },
        },
    };
    // Cache de course : série 1 de la J1 (Bob, id 2) et une série d'une AUTRE journée où
    // l'id 2 désigne un autre nageur
    raceData.events = [];
    raceData.series = [
        { id: 1, dayNumber: 1, eventId: 1, participants: [{ id: 2, name: 'Bob Durand', club: 'Boulaie', bib: 2 }] },
        { id: 1, dayNumber: 2, eventId: 1, participants: [{ id: 2, name: 'Zoé Autre', club: 'Lointain', bib: 2 }] },
    ];
    raceData.currentSerie = raceData.series[0];
    raceData.currentDayNumber = 1;
    window.refreshChronoDisplay(1);
});

const cd = () => championship.days[1].chronoData;
const brasse = () => cd().events[0].series[0];
const dos = () => cd().events[1].series[0];
const lastNotification = () => {
    const all = document.querySelectorAll('.notification');
    return all.length ? all[all.length - 1].textContent : '';
};
const rankedClub = (name) => window.calculateEventRankings()[0].entries.find(e => e.name === name).club;
const clubTotals = () => window.calculateClubEventRanking(window.calculateEventRankings()).map(c => [c.club, c.total]);

function editWithPencil(id, fields) {
    window.editParticipantInfo(1, id);
    Object.entries(fields).forEach(([k, v]) => { document.getElementById('edit-p' + k + '-1-' + id).value = v; });
    window.saveParticipantInfo(1, id);
}
function assignClub(ids, club) {
    window.refreshChronoDisplay(1);
    document.getElementById('assign-club-input-1').value = club;
    ids.forEach(id => { document.querySelector('.participant-check-1[value="' + id + '"]').checked = true; });
    window.assignClubToSelected(1);
}

describe('✏️ nageur inscrit dans plusieurs épreuves', () => {
    test('changer le club : accepté, et suivi partout (liste, séries, résultats, classements)', () => {
        editWithPencil(1, { club: 'Carpe Mosane' });
        expect(lastNotification()).not.toContain('porte déjà ce nom');
        expect(cd().participants.filter(p => p.name === 'Anne Martin').map(p => p.club)).toEqual(['Carpe Mosane', 'Carpe Mosane']);
        expect(brasse().participants[0].club).toBe('Carpe Mosane');
        expect(dos().participants[0].club).toBe('Carpe Mosane');
        expect(brasse().results[0].club).toBe('Carpe Mosane');
        expect(rankedClub('Anne Martin')).toBe('Carpe Mosane');
        expect(clubTotals()).toEqual([['Carpe Mosane', 25], ['Boulaie', 19]]);
    });

    test('changer le club ne réécrit pas les dossards de ses autres inscriptions', () => {
        editWithPencil(1, { club: 'Carpe Mosane' });
        expect(cd().participants.find(p => p.id === 3).club).toBe('Carpe Mosane');
        expect(cd().participants.find(p => p.id === 3).bib).toBe(3);
        expect(dos().participants[0].bib).toBe(3);
        expect(brasse().participants[0].bib).toBe(1);
    });

    test('renommer : toutes ses inscriptions suivent', () => {
        editWithPencil(3, { name: 'Anne Martin-Dupont' });
        expect(cd().participants.filter(p => p.name === 'Anne Martin-Dupont')).toHaveLength(2);
        expect(brasse().participants[0].name).toBe('Anne Martin-Dupont');
        expect(brasse().results[0].name).toBe('Anne Martin-Dupont');
        expect(dos().participants[0].name).toBe('Anne Martin-Dupont');
    });

    test('renommer vers le nom d\'un AUTRE nageur : toujours refusé', () => {
        editWithPencil(2, { name: 'Anne Martin' });
        expect(lastNotification()).toContain('porte déjà ce nom');
        expect(cd().participants.find(p => p.id === 2).name).toBe('Bob Durand');
        expect(brasse().participants[1].name).toBe('Bob Durand');
    });

    test('cache de course : mis à jour pour cette journée seulement', () => {
        editWithPencil(2, { club: 'Club Neuf' });
        expect(raceData.series[0].participants[0].club).toBe('Club Neuf');
        // J2 : même id 2, autre nageur → intact
        expect(raceData.series[1].participants[0]).toMatchObject({ name: 'Zoé Autre', club: 'Lointain' });
    });
});

describe('🏷️ Affecter aux cochés après une course', () => {
    test('les résultats déjà enregistrés prennent le nouveau club : classements à jour', () => {
        assignClub([2], 'Club Neuf');
        expect(cd().participants.find(p => p.id === 2).club).toBe('Club Neuf');
        expect(brasse().participants[1].club).toBe('Club Neuf');
        expect(brasse().results[1].club).toBe('Club Neuf');
        expect(rankedClub('Bob Durand')).toBe('Club Neuf');
        expect(clubTotals()).toEqual([['Apris', 25], ['Club Neuf', 19]]);
    });

    test('nageur inscrit dans 2 épreuves : ses 2 lignes, ses 2 séries et son résultat', () => {
        assignClub([1], 'Carpe Mosane');
        expect(cd().participants.filter(p => p.name === 'Anne Martin').map(p => p.club)).toEqual(['Carpe Mosane', 'Carpe Mosane']);
        expect(dos().participants[0].club).toBe('Carpe Mosane');
        expect(brasse().results[0].club).toBe('Carpe Mosane');
    });

    test('club vidé : plus de club au classement, pas de points', () => {
        assignClub([1], '');
        expect(brasse().results[0].club).toBe('');
        const anne = window.calculateEventRankings()[0].entries.find(e => e.name === 'Anne Martin');
        expect(anne.club).toBe('');
        expect(anne.clubPoints).toBeNull();
        expect(clubTotals()).toEqual([['Boulaie', 25]]);
    });

    test('cache de course de la journée mis à jour (club vidé compris), autre journée intacte', () => {
        assignClub([2], '');
        expect(raceData.series[0].participants[0].club).toBe('');
        expect(raceData.series[1].participants[0]).toMatchObject({ name: 'Zoé Autre', club: 'Lointain' });
    });
});
