/**
 * @jest-environment jsdom
 *
 * Régression pour l'issue #65 : generateInterclubRanking() était définie
 * deux fois dans chrono.iife.js. La version correcte (avec paramètres
 * rankedParticipants/event, utilisée par le chemin live
 * showRaceRanking → generateRaceRanking) était silencieusement écrasée par
 * une seconde version sans paramètres, orpheline (uniquement appelée par
 * l'ancien sélecteur de type de classement, lui-même mort). La seconde
 * définition a été supprimée (avec tout son sous-graphe mort :
 * selectRankingType, createRankingOption, generateRankingBySport/ByType/...,
 * generateOverallChronoRanking) — seule la version correcte survit.
 *
 * generateInterclubRanking() n'est pas exposée sur window (c'est un helper
 * interne à la fermeture de chrono.iife.js) : on la teste via le point
 * d'entrée public showRaceRanking(), le vrai chemin utilisateur (bouton
 * "Voir le classement" pendant/après une course de type interclub).
 */
const { loadModules } = require('../helpers/loadApp');

beforeAll(() => {
    loadModules(['config', 'utils', 'notifications', 'state', 'clubs', 'chrono']);
});

function makeParticipant(id, name, club, finishTime, status = 'finished') {
    return {
        id, name, club, status,
        finishTime, totalTime: finishTime, totalDistance: 0, laps: [],
    };
}

beforeEach(() => {
    document.body.innerHTML = '<div id="raceRankingSection" style="display:none"></div>';
    raceData.participants = [];
});

test('affiche un classement interclub pour une course de type interclub', () => {
    const event = { id: 1, raceType: 'interclub', interclubPoints: [10, 8, 6] };
    raceData.events = [{ ...event, series: [] }];
    raceData.currentSerie = {
        eventId: 1,
        sportType: 'running',
        raceType: 'interclub',
        participants: [
            makeParticipant(1, 'Alice', 'Club A', 1000),
            makeParticipant(2, 'Bob', 'Club B', 1500),
        ],
    };

    showRaceRanking();

    const html = document.getElementById('raceRankingSection').innerHTML;
    expect(html).toContain('Classement Interclub');
});

test('classe le club le plus rapide en premier', () => {
    const event = { id: 1, raceType: 'interclub', interclubPoints: [10, 8, 6] };
    raceData.events = [{ ...event, series: [] }];
    raceData.currentSerie = {
        eventId: 1,
        sportType: 'running',
        raceType: 'interclub',
        participants: [
            makeParticipant(1, 'Alice', 'Club A', 2000), // Club A : 2000ms
            makeParticipant(2, 'Bob', 'Club B', 1000),   // Club B : 1000ms (plus rapide)
        ],
    };

    showRaceRanking();

    const html = document.getElementById('raceRankingSection').innerHTML;
    const posClubB = html.indexOf('Club B');
    const posClubA = html.indexOf('Club A');
    expect(posClubB).toBeGreaterThan(-1);
    expect(posClubA).toBeGreaterThan(-1);
    expect(posClubB).toBeLessThan(posClubA);
});

test("n'affiche pas de classement interclub pour une course individuelle normale", () => {
    const event = { id: 1, raceType: 'individual' };
    raceData.events = [{ ...event, series: [] }];
    raceData.currentSerie = {
        eventId: 1,
        sportType: 'running',
        raceType: 'individual',
        participants: [makeParticipant(1, 'Alice', 'Club A', 1000)],
    };

    showRaceRanking();

    const html = document.getElementById('raceRankingSection').innerHTML;
    expect(html).not.toContain('Classement Interclub');
});
