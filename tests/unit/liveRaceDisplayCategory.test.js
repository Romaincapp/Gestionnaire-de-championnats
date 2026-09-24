/**
 * @jest-environment jsdom
 *
 * La fenêtre "🖥️ Afficher" (openLiveRaceDisplayWindow / buildLiveRaceDisplayContentHTML)
 * est le seul des 3 affichages de classement chrono (avec generateRaceRanking et
 * showSerieRanking/printChronoCompetition) à ne pas avoir été mis à jour par la
 * feature catégories (Solo/Équipe) : pas de colonne Catégorie ni de rang par
 * catégorie, alors même que les deux autres l'ont. Signalé par l'utilisateur.
 */
const { loadModules, DEFAULT_ORDER } = require('../helpers/loadApp');

beforeAll(() => {
    loadModules(DEFAULT_ORDER);
});

function makeParticipant(overrides) {
    return Object.assign({
        id: 1, name: 'Alice', bib: '1', club: 'Club A', category: '',
        status: 'finished', totalTime: 1000, finishTime: 1000,
        totalDistance: 100, laps: [], bestLap: null,
    }, overrides);
}

beforeEach(() => {
    raceData.currentSerie = {
        id: 1, name: 'Série test', distance: 100, raceType: 'individual',
        currentTime: 5000, participants: [],
    };
});

test("n'affiche pas de colonne Catégorie quand une seule catégorie est présente (non-régression)", () => {
    raceData.currentSerie.participants = [
        makeParticipant({ id: 1, name: 'Alice', bib: '1', category: 'Solo' }),
        makeParticipant({ id: 2, name: 'Bob', bib: '2', category: 'Solo', totalTime: 1500, finishTime: 1500 }),
    ];

    const { body } = buildLiveRaceDisplayContentHTML();
    expect(body).not.toContain('>Catégorie<');
});

test('affiche une colonne Catégorie avec le rang par catégorie quand 2+ catégories sont présentes', () => {
    raceData.currentSerie.participants = [
        makeParticipant({ id: 1, name: 'Alice', bib: '1', category: 'Solo', totalTime: 1000, finishTime: 1000 }),
        makeParticipant({ id: 2, name: 'Bob', bib: '2', category: 'Équipe', totalTime: 1500, finishTime: 1500 }),
        makeParticipant({ id: 3, name: 'Carol', bib: '3', category: 'Solo', totalTime: 2000, finishTime: 2000 }),
    ];

    const { body } = buildLiveRaceDisplayContentHTML();
    expect(body).toContain('>Catégorie<');
    // Alice : 1ère scratch, 1ère Solo (2 Solo au total)
    expect(body).toContain('Solo (1e/2)');
    // Carol : 3e scratch, 2e Solo
    expect(body).toContain('Solo (2e/2)');
    expect(body).toContain('Équipe (1e/1)');
});

test("n'affiche pas de course en cours sans planter (pas de régression sur le cas vide)", () => {
    raceData.currentSerie = null;
    const { title, body } = buildLiveRaceDisplayContentHTML();
    expect(title).toBe('Aucune course en cours');
    expect(body).toContain('Aucune course en cours');
});
