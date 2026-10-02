/**
 * @jest-environment jsdom
 *
 * « ➕ Ajouter à la suite » (appendDaysToChampionship, export-json.iife.js) :
 * les journées d'un fichier sont ajoutées APRÈS celles du championnat ouvert,
 * renumérotées, sans rien remplacer. Cas d'origine : une « Journée 1 » refaite
 * par erreur dans un autre projet doit devenir la Journée 2.
 */
const { loadModules } = require('../helpers/loadApp');

beforeAll(() => {
    loadModules();
});

function championshipDay(names, extra) {
    return Object.assign({
        dayType: 'championship',
        players: { 1: names.map((n) => ({ name: n, club: 'TT Club' })), 2: [], 3: [] },
        matches: { 1: [{ player1: names[0], player2: names[1], score1: 3, score2: 1, completed: true }], 2: [], 3: [] },
    }, extra || {});
}

function chronoDay(serieOverrides) {
    return {
        dayType: 'chrono',
        players: {},
        matches: {},
        chronoData: {
            events: [{ id: 1, name: '100m' }],
            series: [Object.assign({
                id: 1, eventId: 1, name: 'Série 1', status: 'completed',
                participants: [{ id: 1, name: 'Léa Martin', bib: 1, club: 'Nage Club', status: 'finished', finishTime: 70000 }],
                results: [{ bib: 1, name: 'Léa Martin', time: 70000 }],
            }, serieOverrides || {})],
            participants: [{ id: 1, name: 'Léa Martin', bib: 1, club: 'Nage Club' }],
            nextEventId: 2, nextSerieId: 2, nextParticipantId: 2,
        },
    };
}

function exportFile(days, config) {
    return { version: '2.0', championship: { config: config || { numberOfDivisions: 3, numberOfCourts: 4 }, days } };
}

beforeEach(() => {
    window.alert = jest.fn();
    window.confirm = jest.fn(() => true);
    localStorage.clear();
    raceData.events = [];
    raceData.series = [];
    raceData.currentSerie = null;
    raceData.currentDayNumber = null;
    raceData.currentSerieId = null;
    config.numberOfDivisions = 3;
    config.numberOfCourts = 4;
    championship.config = { numberOfDivisions: 3, numberOfCourts: 4 };
    championship.currentDay = 1;
    championship.days = { 1: championshipDay(['Jean Dupont', 'Paul Martin']) };
});

test('une « Journée 1 » d\'un autre projet devient la Journée 2', () => {
    const report = appendDaysToChampionship([
        { name: 'autre.json', data: exportFile({ 1: championshipDay(['Jean Dupont', 'Marc Petit']) }) },
    ]);
    expect(report.added.map((a) => a.dayNumber)).toEqual([2]);
    expect(championship.days[1].players[1][1].name).toBe('Paul Martin'); // J1 intacte
    expect(championship.days[2].players[1].map((p) => p.name)).toEqual(['Jean Dupont', 'Marc Petit']);
    expect(championship.days[2].pools).toBeDefined(); // structure de poules initialisée
});

test('deux fichiers « J1 » ajoutés ensemble deviennent J2 et J3 sans s\'écraser', () => {
    const report = appendDaysToChampionship([
        { name: 'a.json', data: exportFile({ 1: championshipDay(['A Un', 'A Deux']) }) },
        { name: 'b.json', data: exportFile({ 1: chronoDay() }) },
    ]);
    expect(report.added.map((a) => [a.dayNumber, a.dayType])).toEqual([[2, 'championship'], [3, 'chrono']]);
    expect(championship.days[3].chronoData.series[0].results).toHaveLength(1);
});

test('un fichier multi-journées est ajouté en entier, dans l\'ordre, et les journées vides sont ignorées', () => {
    const report = appendDaysToChampionship([{ name: 'saison.json', data: exportFile({
        2: chronoDay(),
        1: championshipDay(['X Un', 'X Deux']),
        3: { dayType: 'championship', players: { 1: [] }, matches: { 1: [] } },
    }) }]);
    expect(report.added.map((a) => [a.dayNumber, a.dayType])).toEqual([[2, 'championship'], [3, 'chrono']]);
    expect(report.skipped).toHaveLength(1);
    expect(championship.days[4]).toBeUndefined();
});

test('projet vierge : la J1 vide est remplacée et la configuration du fichier reprise', () => {
    championship.days = { 1: { dayType: 'championship', players: { 1: [], 2: [], 3: [] }, matches: { 1: [], 2: [], 3: [] } } };
    const report = appendDaysToChampionship([
        { name: 'j1.json', data: exportFile({ 1: championshipDay(['A Un', 'A Deux']) }, { numberOfDivisions: 2, numberOfCourts: 6 }) },
    ]);
    expect(report.added[0].dayNumber).toBe(1);
    expect(championship.config.numberOfDivisions).toBe(2);
    expect(championship.config.numberOfCourts).toBe(6);
    expect(report.warnings.join(' ')).not.toMatch(/divisions/);
});

test('une journée vide en fin de championnat (créée par « + ») est réutilisée', () => {
    championship.days[2] = { dayType: 'championship', players: { 1: [] }, matches: { 1: [] } };
    const report = appendDaysToChampionship([{ name: 'j.json', data: exportFile({ 1: chronoDay() }) }]);
    expect(report.added[0].dayNumber).toBe(2);
    expect(championship.days[2].dayType).toBe('chrono');
});

test('Matchs : divisions augmentées si la journée importée en utilise plus, jamais réduites', () => {
    const day = championshipDay(['A Un', 'A Deux']);
    day.players[4] = [{ name: 'D Quatre' }];
    day.matches[4] = [];
    championship.days[1].pools = { enabled: false, divisions: { 1: { pools: [], matches: [] }, 2: { pools: [], matches: [] }, 3: { pools: [], matches: [] } } };
    const report = appendDaysToChampionship([{ name: 'j.json', data: exportFile({ 1: day }, { numberOfDivisions: 4, numberOfCourts: 2 }) }]);
    expect(championship.config.numberOfDivisions).toBe(4);
    expect(config.numberOfDivisions).toBe(4);
    expect(championship.days[1].players[4]).toEqual([]); // structure complétée sur les journées existantes
    expect(championship.days[1].pools.divisions[4]).toEqual({ pools: [], matches: [] });
    expect(championship.days[2].pools.divisions[4]).toEqual({ pools: [], matches: [] });
    expect(report.warnings.join(' ')).toMatch(/divisions passé de 3 à 4/);
    expect(report.warnings.join(' ')).toMatch(/2 terrain/); // terrains différents : signalé, pas modifié
    expect(championship.config.numberOfCourts).toBe(4);

    const report2 = appendDaysToChampionship([{ name: 'k.json', data: exportFile({ 1: championshipDay(['B Un', 'B Deux']) }, { numberOfDivisions: 1 }) }]);
    expect(report2.added[0].dayNumber).toBe(3);
    expect(championship.config.numberOfDivisions).toBe(4);
});

test('Matchs : les matchs de poule pointent vers le nouveau numéro de journée', () => {
    const day = championshipDay(['A Un', 'A Deux'], {
        pools: { enabled: true, divisions: { 1: { pools: [['A Un', 'A Deux']], matches: [{ id: 1, dayNumber: 1, player1: 'A Un', player2: 'A Deux' }] } } },
    });
    appendDaysToChampionship([{ name: 'j.json', data: exportFile({ 1: day }) }]);
    expect(championship.days[2].pools.divisions[1].matches[0].dayNumber).toBe(2);
});

test('Courses : une série exportée chrono en marche est mise en pause sur son temps figé', () => {
    appendDaysToChampionship([{ name: 'j.json', data: exportFile({ 1: chronoDay({ isRunning: true, status: 'running', startTime: 1000, currentTime: 42000 }) }) }]);
    const serie = championship.days[2].chronoData.series[0];
    expect(serie.isRunning).toBe(false);
    expect(serie.currentTime).toBe(42000);
});

test('Courses : un vieux cache de course au même numéro de journée est purgé', () => {
    raceData.events = [{ id: 1, dayNumber: 2, name: 'ancien' }, { id: 1, dayNumber: 1, name: 'J1' }];
    raceData.series = [{ id: 1, dayNumber: 2, participants: [{ name: 'Fantôme' }] }];
    appendDaysToChampionship([{ name: 'j.json', data: exportFile({ 1: chronoDay() }) }]);
    expect(raceData.series).toHaveLength(0);
    expect(raceData.events.map((e) => e.dayNumber)).toEqual([1]);
});

test('Courses : refusé pendant qu\'une course tourne, rien n\'est modifié', () => {
    raceData.currentSerie = { id: 1, dayNumber: 1, name: 'Série 1', isRunning: true };
    const before = JSON.stringify(championship.days);
    const report = appendDaysToChampionship([{ name: 'j.json', data: exportFile({ 1: chronoDay() }) }]);
    expect(report.added).toHaveLength(0);
    expect(report.errors[0]).toMatch(/course est en cours/);
    expect(JSON.stringify(championship.days)).toBe(before);
});

test('Matchs + Courses : noms écrits différemment signalés, clubs ajoutés, classement combiné mentionné', () => {
    const day = chronoDay();
    day.chronoData.participants[0].name = 'jean dupont';
    day.chronoData.series[0].participants[0].name = 'jean dupont';
    const report = appendDaysToChampionship([{ name: 'j.json', data: exportFile({ 1: day }) }]);
    const w = report.warnings.join(' ');
    expect(w).toMatch(/« jean dupont » \/ « Jean Dupont »/);
    expect(w).toMatch(/Multisport/);
    expect(clubsModule.getClubsList()).toContain('Nage Club');
});

test('fichier illisible ou vide : erreur, championnat inchangé', () => {
    const before = JSON.stringify(championship.days);
    const report = appendDaysToChampionship([{ name: 'vide.json', data: {} }]);
    expect(report.added).toHaveLength(0);
    expect(report.errors).toHaveLength(1);
    expect(JSON.stringify(championship.days)).toBe(before);
});
