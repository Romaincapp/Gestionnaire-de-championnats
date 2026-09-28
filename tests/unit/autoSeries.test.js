/**
 * @jest-environment jsdom
 *
 * « 🏁 Séries automatiques » (ex « 🏊 Séries natation ») : le même générateur sert aussi
 * aux séries d'athlétisme (demande utilisateur). Libellés neutres, et ce qui marche
 * aujourd'hui pour l'athlétisme : une ligne « Nom 200m 25.10 » est placée dans
 * l'épreuve de même distance quand une seule épreuve a cette distance.
 */
const { loadModules, DEFAULT_ORDER } = require('../helpers/loadApp');

beforeAll(() => {
    loadModules(DEFAULT_ORDER);
});

const LINES = ['Luc Leroy 200m 25.10', 'Marc Petit 200m 24.80', 'Lina Martin 400m 1:02.30'];

beforeEach(() => {
    championship.config = { numberOfDivisions: 1, numberOfCourts: 4 };
    championship.days = {
        1: {
            dayType: 'chrono', players: {}, matches: {},
            chronoData: { events: [{ id: 1, name: '200m', series: [] }, { id: 2, name: '400m', series: [] }], series: [], participants: [], nextEventId: 3, nextSerieId: 1, nextParticipantId: 1 },
        },
        2: { dayType: 'championship', matches: { 1: [] }, players: { 1: LINES.map(n => ({ name: n, club: '' })) } },
    };
    document.body.innerHTML = '<div id="chrono-content-1"></div>';
    window.refreshChronoDisplay(1);
});

afterEach(() => {
    const modal = document.getElementById('swimmingImportModal');
    if (modal) modal.remove();
});

test('bouton de la journée Courses : « 🏁 Séries automatiques »', () => {
    const button = document.querySelector('#chrono-content-1 button[onclick="showSwimmingImportModal(1)"]');
    expect(button.textContent.trim()).toBe('🏁 Séries automatiques');
    expect(document.getElementById('chrono-content-1').textContent).not.toMatch(/Séries natation/);
});

test('la fenêtre parle de participants, pas seulement de nageurs', () => {
    window.showSwimmingImportModal(1);
    const text = document.getElementById('swimmingImportModal').textContent.replace(/\s+/g, ' ');
    expect(text).toContain('Séries automatiques');
    expect(text).toContain('Participants par série');
    expect(text).toContain('🏁 Générer les séries');
    expect(text).not.toMatch(/natation|Nageurs/i);
});

test('athlétisme : distances uniques → séries par couloirs, triées au temps', () => {
    window.showSwimmingImportModal(1);
    document.getElementById('swimSourceDay').value = '2';
    document.getElementById('swimTargetDay').value = '1';
    window.confirmSwimmingImport(1);
    const [e200, e400] = championship.days[1].chronoData.events;
    expect(e200.series).toHaveLength(1);
    // Le plus rapide (24.80) au couloir central
    const lanes = Object.fromEntries(e200.series[0].participants.map(p => [p.name, p.laneNumber]));
    expect(lanes['Marc Petit']).toBeLessThan(10);
    expect(e200.series[0].participants[0].name).toBe('Marc Petit');
    expect(e200.series[0].distance).toBe(200);
    expect(e400.series[0].participants.map(p => p.name)).toEqual(['Lina Martin']);
    const toasts = [...document.querySelectorAll('.notification')].map(n => n.textContent);
    expect(toasts.join(' ')).toMatch(/Séries automatiques : 3 participants → 2 séries/);
});

// ------------------------------------------------------------------------------------
// Limites levées : épreuves de même distance départagées par les mots de l'épreuve,
// et séries d'athlétisme marquées « course » (plus « natation »).
// ------------------------------------------------------------------------------------
function generate(events, lines) {
    championship.days = {
        1: {
            dayType: 'chrono', players: {}, matches: {},
            chronoData: { events: events.map((name, i) => ({ id: i + 1, name, series: [] })), series: [], participants: [], nextEventId: events.length + 1, nextSerieId: 1, nextParticipantId: 1 },
        },
        2: { dayType: 'championship', matches: { 1: [] }, players: { 1: lines.map(n => ({ name: n, club: '' })) } },
    };
    window.generateSwimmingSeries(1, 2, 8);
    // Liste source (journée Matchs) retirée : compétition 100 % Courses
    delete championship.days[2];
    const byEvent = {};
    championship.days[1].chronoData.events.forEach(e => {
        byEvent[e.name] = (e.series || []).flatMap(s => s.participants.map(p => p.name));
    });
    return byEvent;
}

describe('épreuves de même distance', () => {
    test('« 100m » et « 100m haies » : chaque ligne va dans la bonne épreuve, sans « Haies » dans le nom', () => {
        const r = generate(['100m', '100m haies', '200m'],
            ['Jean Dupont 100m 12.45', 'Emma Roux 100m haies 15.20', 'Paul Martin 100m 11.90', 'Luc Leroy 200m 25.10']);
        expect(r['100m']).toEqual(['Paul Martin', 'Jean Dupont']); // au temps
        expect(r['100m haies']).toEqual(['Emma Roux']);
        expect(r['200m']).toEqual(['Luc Leroy']);
    });

    test('catégories dans le nom de l\'épreuve (« 100m Benjamins » / « 100m Minimes »)', () => {
        const r = generate(['100m Benjamins', '100m Minimes'],
            ['Léo Blanc 100m minimes 13.10', 'Zoé Noir 100m Benjamins 14.00', 'Tom Vert 100m 12.00']);
        expect(r['100m Minimes']).toEqual(['Léo Blanc']);
        expect(r['100m Benjamins']).toEqual(['Zoé Noir']);
        // Sans précision et sans épreuve « 100m » simple : ambigu, non placé
        expect([...r['100m Minimes'], ...r['100m Benjamins']]).not.toContain('Tom Vert');
    });

    test('natation : « 20m libre » et « 20m brasse » départagés par la nage (fonctionnait déjà)', () => {
        const r = generate(['20m libre', '20m brasse'], ['Ana Lima 20m libre 0:20.00', 'Bob Kent 20m brasse 0:25.00', 'Cid Moro 20m Libre 0:19.50']);
        expect(r['20m libre']).toEqual(['Cid Moro', 'Ana Lima']);
        expect(r['20m brasse']).toEqual(['Bob Kent']);
    });

    test('natation inchangée : « 50m » sans nage reste ambigu entre 50m libre et 50m dos', () => {
        const r = generate(['50m libre', '50m dos'], ['Ana Lima 50m 30.00', 'Bob Kent 50m libre 31.00']);
        expect(r['50m libre']).toEqual(['Bob Kent']);
        expect(r['50m dos']).toEqual([]);
    });
});

describe('type de sport des séries générées', () => {
    test('athlétisme → « course », natation → « natation » ; classement par épreuve dans les deux cas', () => {
        generate(['200m', '50m brasse'], ['Luc Leroy 200m 25.10', 'Ana Lima 50m brasse 40.00']);
        const [e200, eBrasse] = championship.days[1].chronoData.events;
        expect(e200.series[0].sportType).toBe('running');
        expect(e200.series[0].laneMode).toBe(true);
        expect(eBrasse.series[0].sportType).toBe('swimming');
        expect(window.isSwimmingOnlyCompetition()).toBe(true); // = classement par épreuve
    });

    test('titre du classement : neutre dès qu\'il y a de l\'athlétisme, « natation » sinon', () => {
        generate(['200m'], ['Luc Leroy 200m 25.10']);
        expect(window.eventRankingTitle()).toBe('🏁 Résultats par épreuve');
        generate(['50m brasse'], ['Ana Lima 50m brasse 40.00']);
        expect(window.eventRankingTitle()).toBe('🏊 Résultats natation par épreuve');
    });

    test('« ➕ Série » sur une épreuve d\'athlétisme générée : course à pied, 200 m, couloirs', () => {
        generate(['200m'], ['Luc Leroy 200m 25.10']);
        document.body.innerHTML = '';
        window.showAddSerieModalForDayAndEvent(1, 1);
        expect(document.getElementById('serieSportType-1').value).toBe('running');
        expect(document.getElementById('serieDistance-1').value).toBe('200');
        expect(document.getElementById('serieLaneMode-1').checked).toBe(true);
        document.getElementById('serieModal-1').remove();
    });
});
