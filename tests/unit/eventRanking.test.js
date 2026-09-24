/**
 * @jest-environment jsdom
 *
 * Natation : classement PAR ÉPREUVE à la place du classement général.
 * Toutes les séries d'une même épreuve (ex. les 7 séries du 50m brasse) sont
 * regroupées et classées au temps — on ne compare que ce qui est comparable.
 * Le classement général « distance & temps » (pensé pour la course à pied)
 * n'a pas de sens entre des épreuves de natation différentes.
 */
const { loadModules, DEFAULT_ORDER } = require('../helpers/loadApp');

beforeAll(() => {
    loadModules(DEFAULT_ORDER);
});

function part(name, club, status, finishTime) {
    return { id: name, name, club, bib: name, status, finishTime: finishTime || null, totalTime: finishTime || 0, laneNumber: 1 };
}
function res(name, club, time) {
    return { name, club, bib: name, time };
}
function serie(id, name, participants, sportType) {
    return {
        id, name, sportType: sportType || 'swimming', laneMode: sportType ? false : true,
        participants,
        results: participants.filter(p => p.status === 'finished').map(p => res(p.name, p.club, p.finishTime)),
    };
}

function swimmingDay() {
    return {
        dayType: 'chrono', players: {}, matches: {},
        chronoData: {
            events: [
                { id: 1, name: '50m brasse', series: [
                    serie(1, 'Série 1', [
                        part('Alice', 'Boulaie', 'finished', 40120),
                        part('Bob', 'Apris', 'finished', 38500),
                        part('Chloé', 'Boulaie', 'dns'),
                    ]),
                    serie(2, 'Série 2', [
                        part('Dan', 'Jalon', 'finished', 36900),
                        part('Eva', 'Apris', 'finished', 38504), // ex æquo au centième avec Bob (38,50)
                        part('Fred', 'Jalon', 'disq', 35000),    // disqualifié après arrivée
                    ]),
                ] },
                { id: 2, name: '25m dos', series: [
                    serie(3, 'Série 1', [part('Gina', 'Apris', 'finished', 21000)]),
                ] },
            ],
            series: [], participants: [],
        },
    };
}

beforeEach(() => {
    document.body.innerHTML = '<div id="multisportRankingContent"></div>';
    championship.config = { numberOfDivisions: 1, numberOfCourts: 4 };
    championship.days = { 1: swimmingDay() };
});

describe('calculateEventRankings', () => {
    test('regroupe les séries d\'une même épreuve et classe au temps', () => {
        const events = window.calculateEventRankings();
        expect(events.map(e => e.eventName)).toEqual(['50m brasse', '25m dos']);
        const brasse = events[0];
        expect(brasse.entries.map(e => e.name)).toEqual(['Dan', 'Bob', 'Eva', 'Alice']);
        expect(brasse.entries.map(e => e.serieName)).toEqual(['Série 2', 'Série 1', 'Série 2', 'Série 1']);
        expect(brasse.entries[0].club).toBe('Jalon');
    });

    test('ex æquo au centième : même rang, le suivant saute', () => {
        const ranks = window.calculateEventRankings()[0].entries.map(e => e.name + ':' + e.rank);
        expect(ranks).toEqual(['Dan:1', 'Bob:2', 'Eva:2', 'Alice:4']);
    });

    test('DNS et DISQ ne sont pas classés mais listés à part', () => {
        const brasse = window.calculateEventRankings()[0];
        expect(brasse.entries.map(e => e.name)).not.toContain('Fred');
        expect(brasse.outOfRace.map(o => o.name + ':' + o.status).sort()).toEqual(['Chloé:dns', 'Fred:disq']);
    });

    test('un résultat ancien d\'un nageur DISQ (avant le correctif) reste exclu', () => {
        const s2 = championship.days[1].chronoData.events[0].series[1];
        s2.results.push(res('Fred', 'Jalon', 35000));
        expect(window.calculateEventRankings()[0].entries.map(e => e.name)).not.toContain('Fred');
    });

    test('une série « à plat » rattachée à l\'épreuve par eventId est incluse', () => {
        championship.days[1].chronoData.series.push(
            Object.assign(serie(9, 'Série manuelle', [part('Hugo', 'Apris', 'finished', 20500)]), { eventId: 2 }));
        expect(window.calculateEventRankings()[1].entries.map(e => e.name)).toEqual(['Hugo', 'Gina']);
    });
});

describe('affichage', () => {
    test('journée 100 % natation : classement par épreuve, pas de classement général', () => {
        const html = window.renderMultisportRanking();
        expect(html).toContain('Classement par épreuve');
        expect(html).toContain('50m brasse');
        expect(html).toContain('25m dos');
        expect(html).not.toContain('Classement Général des Courses');
        expect(html).toContain('38,50s'); // centièmes
        expect(html).toContain('DISQ');
    });

    test('impression / export HTML : un tableau par épreuve', () => {
        const doc = window.buildMultisportRankingDoc(false);
        expect(doc).toContain('Résultats par épreuve');
        expect((doc.match(/<table/g) || []).length).toBe(2);
        expect(doc).not.toContain('Classement Général des Courses');
    });

    test('second écran « Afficher » : classement par épreuve aussi', () => {
        const html = window.buildMultisportRankingContentHTML();
        expect(html).toContain('50m brasse');
        expect(html).toContain('Dan');
        expect(html).not.toContain('⏱️ Courses');
    });

    test('onglet : en-tête « Matchs + Courses » et barème masqués pour la natation', () => {
        const fs = require('fs');
        const path = require('path');
        const indexHtml = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8');
        document.body.innerHTML = indexHtml.match(/<div class="tab-content multisport-content" id="multisport-ranking"[\s\S]*?<div id="multisportRankingContent">/)[0] + '</div></div></div>';
        window.updateMultisportRanking();
        expect(document.getElementById('multisport-hub-title').textContent).toContain('natation par épreuve');
        expect(document.querySelector('#multisport-ranking .multisport-info').style.display).toBe('none');
        expect(document.getElementById('multisportRankingContent').innerHTML).toContain('Classement par épreuve');

        // Retour à une compétition de course à pied : en-tête d'origine
        championship.days[1].chronoData.events.forEach(e => e.series.forEach(s => { s.sportType = 'running'; s.laneMode = false; }));
        window.updateMultisportRanking();
        expect(document.getElementById('multisport-hub-title').textContent).toContain('Matchs + Courses');
        expect(document.querySelector('#multisport-ranking .multisport-info').style.display).toBe('');
    });

    test('course à pied : classement général inchangé', () => {
        championship.days[1].chronoData.events[0].series.forEach(s => { s.sportType = 'running'; s.laneMode = false; });
        championship.days[1].chronoData.events[1].series.forEach(s => { s.sportType = 'running'; s.laneMode = false; });
        const html = window.renderMultisportRanking();
        expect(html).toContain('Classement Général des Courses');
        expect(html).not.toContain('Classement par épreuve');
    });
});
