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
 * 2. l'ajout direct d'un nom dans une série (aujourd'hui la fenêtre
 *    « ✏️ Éditer la série ») n'avait tout simplement aucun champ Catégorie.
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

// Fenêtre « ✏️ Éditer la série » : ajout d'un nouveau nom (hors liste du jour)
function addInEditor(name, category) {
    editChronoSerie(1, 10);
    document.getElementById('se-add-1').value = name;
    addSerieEditorRow(1, 10);
    const row = [...document.querySelectorAll('#se-table-1 tbody tr')].pop();
    if (category !== undefined) row.querySelector('.se-cat').value = category;
    saveChronoSerieEditor(1, 10);
}

test('Éditer la série : un nouveau nom ajouté garde la catégorie saisie', () => {
    addInEditor('Bob', 'Équipe');

    const serie = championship.days[1].chronoData.series[0];
    expect(serie.participants).toHaveLength(1);
    expect(serie.participants[0].name).toBe('Bob');
    expect(serie.participants[0].category).toBe('Équipe');
});

test('Éditer la série : ajout sans catégorie (champ optionnel)', () => {
    expect(() => addInEditor('Carol')).not.toThrow();

    const serie = championship.days[1].chronoData.series[0];
    expect(serie.participants[0].category).toBe('');
});

test('Éditer la série : un participant du jour ajouté garde sa catégorie et son club', () => {
    addInEditor('Alice');

    const serie = championship.days[1].chronoData.series[0];
    expect(serie.participants[0].category).toBe('Solo');
    expect(serie.participants[0].club).toBe('Club A');
});
