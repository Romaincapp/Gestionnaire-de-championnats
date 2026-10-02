/**
 * @jest-environment jsdom
 *
 * « 🏁 Séries automatiques » ne sert qu'aux journées Courses : le bouton n'apparaît
 * plus dans la barre d'actions d'une journée Matchs (championnat), seulement dans
 * celle de l'écran Courses.
 */
const fs = require('fs');
const path = require('path');
const { loadModules } = require('../helpers/loadApp');

const BODY = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8')
    .replace(/^[\s\S]*<body[^>]*>/, '').replace(/<\/body>[\s\S]*$/, '').replace(/<script[\s\S]*?<\/script>/g, '');

beforeAll(() => loadModules());

test('absent de l\'écran Matchs, présent dans l\'écran Courses', () => {
    jest.useFakeTimers();
    document.body.innerHTML = BODY;
    championship.config = { numberOfDivisions: 3, numberOfCourts: 4 };
    const div = () => ({ 1: [], 2: [], 3: [] });
    championship.days = {
        1: { dayType: 'championship', players: div(), matches: div() },
        2: { dayType: 'championship', players: div(), matches: div() },
        3: { dayType: 'chrono', players: div(), matches: div(), chronoData: { events: [], series: [], participants: [], nextEventId: 1, nextSerieId: 1, nextParticipantId: 1 } },
    };
    initializeAllDaysContent();
    jest.runAllTimers();

    const buttons = (day) => [...document.querySelectorAll(`#day-${day} button[onclick^="showSwimmingImportModal"]`)];
    expect(buttons(1)).toHaveLength(0);
    expect(buttons(2)).toHaveLength(0);
    // Journée Courses : le bouton est dans la barre d'actions chrono
    expect(document.querySelectorAll('#chrono-content-3 button[onclick="showSwimmingImportModal(3)"]')).toHaveLength(1);
    expect(document.querySelectorAll('#championship-section-3 button[onclick^="showSwimmingImportModal"]')).toHaveLength(0);
    jest.useRealTimers();
});
