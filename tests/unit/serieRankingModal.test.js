/**
 * @jest-environment jsdom
 *
 * Bouton 🏆 « Voir le classement » de chaque série (showSerieRanking). Il classait
 * les lignes serie.results au seul temps brut, d'où des erreurs « parfois » :
 * - un nageur DISQ dont l'ancienne ligne de résultat restait était classé (1er !) ;
 * - deux temps égaux au centième recevaient deux rangs différents (1, 2) ;
 * - en relais à durée fixe, le plus rapide gagnait au lieu du plus loin ;
 * - cliquer une autre série alors qu'une fenêtre était ouverte réaffichait l'ancienne ;
 * - points 20/17/… affichés même en natation / Multisport où ce barème ne s'applique pas ;
 * - un nageur retiré de la série y restait classé (sa ligne de résultat restait).
 * Tout passe maintenant par rankSerieResults(), aussi utilisé pour les points par
 * série du classement général (Chrono pur).
 */
const { loadModules } = require('../helpers/loadApp');

beforeAll(() => loadModules());

function setup(serie, extraSeries) {
    championship.config = { numberOfDivisions: 3, numberOfCourts: 4 };
    championship.days = { 1: { dayType: 'chrono', players: {}, matches: {}, chronoData: {
        events: [{ id: 1, name: '50m' }],
        series: [Object.assign({ id: 1, eventId: 1, name: 'Série 1' }, serie)].concat(extraSeries || []),
        participants: [], nextEventId: 2, nextSerieId: 5, nextParticipantId: 9,
    } } };
    document.body.innerHTML = '';
}

function modalRows() {
    return [...document.querySelectorAll('[id^=rankingModal] tbody tr')]
        .map((tr) => [...tr.children].map((td) => td.textContent.trim()).filter(Boolean).join(' | '));
}

afterEach(() => closeRankingModal(1));

const swimSerie = {
    sportType: 'swimming',
    participants: [
        { id: 1, name: 'Alice', club: 'CN A', status: 'finished', finishTime: 30001 },
        { id: 2, name: 'Bruno', club: 'CN B', status: 'finished', finishTime: 30004 },
        { id: 3, name: 'Chloé', club: 'CN B', status: 'disq', finishTime: 29000 },
        { id: 4, name: 'David', club: 'CN A', status: 'dns' },
    ],
    results: [
        { name: 'Alice', time: 30001 }, { name: 'Bruno', time: 30004 },
        { name: 'Chloé', time: 29000 }, { name: 'alice', time: 31000 },
    ],
};

test('DISQ/DNS jamais classés, même avec une ancienne ligne de résultat ; listés sans rang', () => {
    setup(swimSerie);
    showSerieRanking(1, 1);
    const rows = modalRows();
    expect(rows.slice(0, 2).map((r) => r.split(' | ')[1])).toEqual(['Alice', 'Bruno']);
    expect(rows).toContain('DISQ | Chloé | CN B');
    expect(rows).toContain('DNS | David | CN A');
});

test('ex æquo au centième : même rang ; une seule ligne par nageur (nom sans casse)', () => {
    setup(swimSerie);
    showSerieRanking(1, 1);
    const rows = modalRows();
    expect(rows[0]).toBe('1 | Alice | CN A | 30,00s');
    expect(rows[1]).toBe('1 | Bruno | CN B | 30,00s');
    expect(rows).toHaveLength(4);
});

test('natation : pas de colonne Points (barème 20/17 hors sujet)', () => {
    setup(swimSerie);
    showSerieRanking(1, 1);
    expect(document.querySelector('[id^=rankingModal] thead').textContent).not.toMatch(/Points/);
});

test('relais à durée fixe : la distance prime sur le temps ; points du Chrono pur affichés', () => {
    setup({
        raceType: 'relay', sportType: 'running',
        participants: [
            { id: 1, name: 'R1', status: 'finished', totalDistance: 1200, totalTime: 600000 },
            { id: 2, name: 'R2', status: 'finished', totalDistance: 1600, totalTime: 600500 },
        ],
        results: [{ name: 'R1', time: 600000, totalDistance: 1200 }, { name: 'R2', time: 600500, totalDistance: 1600 }],
    });
    showSerieRanking(1, 1);
    expect(modalRows()).toEqual(['1 | R2 | 1,60 km | 10m00,50s | +20', '2 | R1 | 1,20 km | 10m00,00s | +17']);
    // Même ordre pour les points du classement général (Chrono pur)
    const day = getChronoResultsForDay(1);
    expect(day.R2.totalPoints).toBe(20);
    expect(day.R1.totalPoints).toBe(17);
});

test('cliquer une autre série remplace la fenêtre ouverte', () => {
    setup(swimSerie, [{ id: 2, eventId: 1, name: 'Série 2', participants: [{ id: 7, name: 'Zoé', status: 'finished', finishTime: 1000 }], results: [{ name: 'Zoé', time: 1000 }] }]);
    showSerieRanking(1, 1);
    showSerieRanking(1, 2);
    expect(document.querySelectorAll('[id^=rankingModal]')).toHaveLength(1);
    expect(document.querySelector('[id^=rankingModal] h3').textContent).toBe('🏆 Classement - Série 2');
});

test('classement de la série = classement par épreuve pour une épreuve à une série', () => {
    setup(swimSerie);
    const serie = championship.days[1].chronoData.series[0];
    const fromSerie = rankSerieResults(serie).entries.map((e) => [e.rank, e.name]);
    const fromEvent = calculateEventRankings()[0].entries.map((e) => [e.rank, e.name]);
    expect(fromSerie).toEqual(fromEvent);
});

test('retirer un participant de la série retire aussi sa ligne de résultat', () => {
    window.confirm = jest.fn(() => true);
    setup(JSON.parse(JSON.stringify(swimSerie)));
    removeParticipantFromSerie(1, 1, 2);
    showSerieRanking(1, 1);
    expect(modalRows().join('\n')).not.toMatch(/Bruno/);
});
