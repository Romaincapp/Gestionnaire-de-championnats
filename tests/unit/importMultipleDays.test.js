/**
 * @jest-environment jsdom
 *
 * « 📂 Importer plusieurs journées » (remplace le championnat) : un fichier
 * contenant plusieurs journées gardait ses numéros d'origine pendant qu'un
 * fichier d'une journée prenait le numéro de sa place dans la liste — deux
 * journées pouvaient tomber sur le même numéro et l'une écrasait l'autre.
 * Il repose maintenant sur appendDaysToChampionship appliqué à un championnat vidé.
 */
const fs = require('fs');
const path = require('path');
const { loadModules } = require('../helpers/loadApp');

const BODY = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8')
    .replace(/^[\s\S]*<body[^>]*>/, '').replace(/<\/body>[\s\S]*$/, '').replace(/<script[\s\S]*?<\/script>/g, '');

beforeAll(() => loadModules());

function day(name, type) {
    if (type === 'chrono') {
        return { dayType: 'chrono', players: {}, matches: {}, chronoData: {
            events: [{ id: 1, name: '100m' }],
            series: [{ id: 1, eventId: 1, name: 'Série 1', participants: [{ id: 1, name, bib: 1 }], results: [] }],
            participants: [{ id: 1, name, bib: 1 }], nextEventId: 2, nextSerieId: 2, nextParticipantId: 2,
        } };
    }
    return { dayType: 'championship', players: { 1: [{ name, club: '' }], 2: [], 3: [] }, matches: { 1: [], 2: [], 3: [] } };
}

function file(name, days) {
    return new File([JSON.stringify({ version: '2.0', championship: { config: { numberOfDivisions: 3, numberOfCourts: 4 }, days } })], name, { type: 'application/json' });
}

function run(files) {
    const event = { target: { files, value: 'x' } };
    return importMultipleDayFiles(event);
}

beforeEach(() => {
    window.alert = jest.fn();
    window.confirm = jest.fn(() => true);
    document.body.innerHTML = BODY;
    raceData.currentSerie = null;
    championship.config = { numberOfDivisions: 3, numberOfCourts: 4 };
    championship.days = { 1: day('Ancien', 'championship'), 2: day('Ancien 2', 'championship') };
});

test('fichier multi-journées + fichier « J1 » : J1, J2, J3 sans écrasement', async () => {
    await run([
        file('01-saison.json', { 1: day('S1'), 2: day('S2', 'chrono') }),
        file('02-autre.json', { 1: day('Autre') }),
    ]);
    const names = Object.keys(championship.days).map((k) => {
        const d = championship.days[k];
        return k + ':' + (d.dayType === 'chrono' ? d.chronoData.participants[0].name : d.players[1][0].name);
    });
    expect(names).toEqual(['1:S1', '2:S2', '3:Autre']);
});

test('remplace le championnat ouvert', async () => {
    await run([file('a.json', { 1: day('Nouveau') })]);
    expect(Object.keys(championship.days)).toEqual(['1']);
    expect(championship.days[1].players[1][0].name).toBe('Nouveau');
});

test('aucun fichier importable : le championnat ouvert est conservé', async () => {
    await run([new File(['pas du json'], 'casse.json')]);
    expect(championship.days[2].players[1][0].name).toBe('Ancien 2');
    expect(window.alert.mock.calls[0][0]).toMatch(/Aucun fichier/);
});

test('course en cours : refusé, championnat conservé', async () => {
    raceData.currentSerie = { id: 1, dayNumber: 1, isRunning: true, name: 'Série 1' };
    await run([file('a.json', { 1: day('Nouveau') })]);
    expect(championship.days[1].players[1][0].name).toBe('Ancien');
    raceData.currentSerie = null;
});
