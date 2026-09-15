/**
 * @jest-environment jsdom
 *
 * Régression : le bouton 🗑️ ("Retirer") du modal "Gérer les participants"
 * d'une série (ouvert via manageSerieParticipants) appelait
 * removeParticipantFromSerie(serieId, participantId) — une fonction qui
 * n'a jamais existé dans le code (ni sous ce nom, ni sous un autre), et
 * qui en plus n'était pas appelée avec le dayNumber nécessaire pour
 * retrouver la série. Tout clic sur ce bouton plantait (ReferenceError).
 */
const { loadModules, DEFAULT_ORDER } = require('../helpers/loadApp');

beforeAll(() => {
    loadModules(DEFAULT_ORDER);
});

beforeEach(() => {
    championship.config = { numberOfDivisions: 1, numberOfCourts: 4 };
    championship.currentDay = 1;
    championship.days = {
        1: {
            dayType: 'chrono',
            players: {},
            matches: {},
            chronoData: {
                events: [],
                series: [{
                    id: 10,
                    name: 'Série 100m',
                    eventId: null,
                    sportType: 'running',
                    distance: 100,
                    raceType: 'individual',
                    participants: [
                        { id: 1, name: 'Alice', bib: '1', club: 'Club A' },
                        { id: 2, name: 'Bob', bib: '2', club: 'Club B' },
                    ],
                    status: 'pending',
                }],
                participants: [],
                nextEventId: 1, nextSerieId: 2, nextParticipantId: 3,
            },
        },
    };
    document.body.innerHTML = '<div id="chrono-content-1"></div>';
    window.confirm = jest.fn(() => true);
});

test('removeParticipantFromSerie existe et retire bien le participant de la série', () => {
    expect(typeof removeParticipantFromSerie).toBe('function');

    removeParticipantFromSerie(1, 10, 1);

    const serie = championship.days[1].chronoData.series[0];
    expect(serie.participants).toHaveLength(1);
    expect(serie.participants[0].name).toBe('Bob');
});

test('ne plante pas si le participant ou la série est introuvable', () => {
    expect(() => removeParticipantFromSerie(1, 10, 999)).not.toThrow();
    expect(() => removeParticipantFromSerie(1, 999, 1)).not.toThrow();
    expect(() => removeParticipantFromSerie(99, 10, 1)).not.toThrow();
});

test("n'agit pas si l'utilisateur annule la confirmation", () => {
    window.confirm = jest.fn(() => false);

    removeParticipantFromSerie(1, 10, 1);

    const serie = championship.days[1].chronoData.series[0];
    expect(serie.participants).toHaveLength(2);
});
