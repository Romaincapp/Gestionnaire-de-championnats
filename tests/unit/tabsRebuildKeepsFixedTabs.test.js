/**
 * @jest-environment jsdom
 *
 * updateTabsDisplay() reconstruit les onglets de journée (au chargement de la
 * page avec des données sauvegardées, après « + » / addNewDay, après un import
 * JSON). Elle supprimait tous les `.tab` sauf « 🏆 Classement » — donc aussi
 * l'onglet « 🏅 Multisport », jamais recréé : le classement combiné devenait
 * inaccessible dès qu'on rouvrait l'app ou ajoutait une journée.
 */
const fs = require('fs');
const path = require('path');
const { loadModules, DEFAULT_ORDER } = require('../helpers/loadApp');

// Barre d'onglets réelle, extraite d'index.html
const indexHtml = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8');
const TABS_HTML = indexHtml.match(/<div class="tabs" id="tabs">[\s\S]*?<\/div>/)[0];

beforeAll(() => {
    loadModules(DEFAULT_ORDER);
});

beforeEach(() => {
    document.body.innerHTML = TABS_HTML;
    championship.config = { numberOfDivisions: 1, numberOfCourts: 4 };
    championship.currentDay = 1;
    championship.days = {
        1: { dayType: 'chrono', players: {}, matches: {} },
        2: { dayType: 'championship', players: {}, matches: {} },
    };
});

function dayTabs() {
    return [...document.querySelectorAll('#tabs .tab[data-day]')].map(t => t.dataset.day);
}

test('la reconstruction garde les onglets fixes 🏆 Classement et 🏅 Multisport', () => {
    expect(document.getElementById('multisportTab')).not.toBeNull();
    window.updateTabsDisplay();
    expect(document.getElementById('multisportTab')).not.toBeNull();
    expect(document.getElementById('generalRankingTab')).not.toBeNull();
});

test('les onglets de journée sont reconstruits sans doublon, avant le bouton +', () => {
    window.updateTabsDisplay();
    window.updateTabsDisplay();
    expect(dayTabs()).toEqual(['1', '2']);
    const tabs = document.getElementById('tabs');
    const plus = tabs.querySelector('.add-day-btn');
    tabs.querySelectorAll('.tab[data-day]').forEach(t => {
        expect(t.compareDocumentPosition(plus) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
});

test('ordre de démarrage réel : visibilité puis reconstruction → Multisport toujours visible', () => {
    // init.iife.js : updateMultisportTabVisibility() puis updateTabsDisplay()
    window.updateMultisportTabVisibility();
    window.updateTabsDisplay();
    const tab = document.getElementById('multisportTab');
    expect(tab).not.toBeNull();
    expect(tab.style.display).toBe('inline-block');
});
