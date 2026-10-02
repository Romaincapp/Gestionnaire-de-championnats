/**
 * @jest-environment jsdom
 *
 * Accordéon de l'écran Courses (vue détaillée, lecture seule) : clic sur une série →
 * ses participants ; clic sur une épreuve → toutes ses séries ; « 📂 Tout déplier » →
 * toutes les séries de la journée. L'état survit aux re-rendus (refreshChronoDisplay).
 */
const { loadModules } = require('../helpers/loadApp');

beforeAll(() => loadModules());

beforeEach(() => {
    document.body.innerHTML = '<div id="chrono-content-1"></div>';
    championship.days = { 1: { dayType: 'chrono', players: {}, matches: {}, chronoData: {
        events: [{ id: 1, name: '50m' }, { id: 2, name: '25m brasse' }],
        series: [
            { id: 1, eventId: 1, name: 'Série 1', participants: [
                { id: 1, name: 'Bruno', bib: 2, laneNumber: 2, status: 'finished', finishTime: 31000 },
                { id: 2, name: 'Alice', bib: 1, laneNumber: 1, status: 'finished', finishTime: 30000 },
                { id: 3, name: 'Chloé', bib: 3, laneNumber: 3, status: 'disq' },
            ], results: [{ name: 'Alice', time: 30000 }, { name: 'Bruno', time: 31000 }] },
            { id: 2, eventId: 2, name: 'Série 1', participants: [{ id: 4, name: 'Zoé', bib: 4 }], results: [] },
            { id: 3, eventId: 2, name: 'Série 2', participants: [], results: [] },
        ],
        participants: [], nextEventId: 3, nextSerieId: 4, nextParticipantId: 5,
    } } };
    // l'état ouvert/fermé est gardé en mémoire d'un test à l'autre : repartir tout fermé
    refreshChronoDisplay(1);
    if (document.getElementById('toggle-all-series-1').textContent.includes('replier')) toggleAllSeriesDetails(1);
});

const shown = () => [1, 2, 3].map((id) => document.getElementById('serie-details-1-' + id).style.display);

test('fermé par défaut, un clic sur la série affiche ses participants dans l\'ordre des couloirs', () => {
    expect(shown()).toEqual(['none', 'none', 'none']);
    toggleSerieDetails(1, 1);
    expect(shown()).toEqual(['block', 'none', 'none']);
    const rows = [...document.querySelectorAll('#serie-details-1-1 tbody tr')].map((tr) => tr.textContent);
    expect(rows[0]).toMatch(/Alice.*1.*30,00s/);
    expect(rows[1]).toMatch(/Bruno.*2.*31,00s/);
    expect(rows[2]).toMatch(/Chloé.*DISQ/);
    toggleSerieDetails(1, 1);
    expect(shown()).toEqual(['none', 'none', 'none']);
});

test('clic sur une épreuve : ouvre toutes ses séries, puis les ferme', () => {
    toggleEventSeriesDetails(1, 2);
    expect(shown()).toEqual(['none', 'block', 'block']);
    expect(document.getElementById('event-chevron-1-2').textContent).toBe('▼');
    toggleEventSeriesDetails(1, 2);
    expect(shown()).toEqual(['none', 'none', 'none']);
});

test('tout déplier / replier, et l\'état survit à un re-rendu', () => {
    toggleAllSeriesDetails(1);
    expect(shown()).toEqual(['block', 'block', 'block']);
    refreshChronoDisplay(1);
    expect(shown()).toEqual(['block', 'block', 'block']);
    expect(document.getElementById('toggle-all-series-1').textContent).toBe('📁 Tout replier');
    toggleAllSeriesDetails(1);
    expect(shown()).toEqual(['none', 'none', 'none']);
    expect(document.getElementById('toggle-all-series-1').textContent).toBe('📂 Tout déplier');
});
