/**
 * @jest-environment jsdom
 *
 * Régression : la catégorie d'un participant (feature "catégories multiples
 * au sein d'une même course", ex: Solo/Équipe) était correctement saisie et
 * sauvegardée à l'import en masse pour la journée (saveBulkParticipantsForDay)
 * et dans le formulaire d'ajout en masse à une série (bulkAddParticipantsToSerie),
 * mais se perdait silencieusement sur deux autres chemins tout aussi courants
 * pour ajouter des participants à une série :
 *
 * 1. addExistingParticipantToSerie (bouton qui ajoute un participant déjà
 *    présent dans le pool de la journée à une série) : appelait
 *    addChronoParticipant(...) sans transmettre ni club ni category.
 * 2. addParticipantToSerie (formulaire "+" du modal "Gérer les participants"
 *    d'une série, pour un ajout direct sans passer par le pool du jour) :
 *    n'avait tout simplement aucun champ Catégorie.
 *
 * Résultat rapporté par l'utilisateur : après avoir ajouté des coureurs
 * "Solo" et "Équipe", aucune trace de la catégorie dans la série, la course,
 * ni les classements — parce que ces participants avaient perdu leur
 * catégorie en entrant dans la série.
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
                    participants: [],
                    status: 'pending',
                }],
                participants: [
                    { id: 1, name: 'Alice', bib: '1', club: 'Club A', category: 'Solo' },
                ],
                nextEventId: 1, nextSerieId: 2, nextParticipantId: 2,
            },
        },
    };
    document.body.innerHTML = '<div id="chrono-content-1"></div>';
});

test('addExistingParticipantToSerie conserve la catégorie (et le club) du participant du jour', () => {
    addExistingParticipantToSerie(1, 1, 10);

    const serie = championship.days[1].chronoData.series[0];
    expect(serie.participants).toHaveLength(1);
    expect(serie.participants[0].name).toBe('Alice');
    expect(serie.participants[0].category).toBe('Solo');
    expect(serie.participants[0].club).toBe('Club A');
});

test('addParticipantToSerie sauvegarde la catégorie saisie dans le formulaire "+"', () => {
    document.body.innerHTML +=
        '<input id="participantName-1-10" value="Bob">' +
        '<input id="participantBib-1-10" value="2">' +
        '<input id="participantCategory-1-10" value="Équipe">' +
        '<div id="participantsList-1-10"></div>';

    addParticipantToSerie(1, 10);

    const serie = championship.days[1].chronoData.series[0];
    expect(serie.participants).toHaveLength(1);
    expect(serie.participants[0].name).toBe('Bob');
    expect(serie.participants[0].category).toBe('Équipe');
});

test('addParticipantToSerie fonctionne toujours sans catégorie saisie (champ optionnel)', () => {
    document.body.innerHTML +=
        '<input id="participantName-1-10" value="Carol">' +
        '<input id="participantBib-1-10" value="3">' +
        '<div id="participantsList-1-10"></div>';

    expect(() => addParticipantToSerie(1, 10)).not.toThrow();

    const serie = championship.days[1].chronoData.series[0];
    expect(serie.participants[0].category).toBe('');
});
