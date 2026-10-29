/**
 * @jest-environment jsdom
 *
 * L'onglet « 🏅 Multisport » ne s'affiche que s'il y a à combiner (journées
 * Matchs ET Courses). Avec des journées Courses seulement, leur classement
 * s'ouvre par « 🏆 Classement », sans second onglet en doublon ni barème
 * « Matchs + Courses ».
 */
const fs = require('fs');
const path = require('path');
const { loadModules, DEFAULT_ORDER } = require('../helpers/loadApp');

const indexHtml = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8');
const TABS_HTML = indexHtml.match(/<div class="tabs" id="tabs">[\s\S]*?<\/div>/)[0];
const MULTI_HTML = indexHtml.match(/<!-- CLASSEMENT MULTISPORT -->[\s\S]*?id="multisportRankingContent">/)[0] + '</div></div></div>';

beforeAll(() => loadModules(DEFAULT_ORDER));

function setDays(types) {
    document.body.innerHTML = TABS_HTML + MULTI_HTML;
    championship.currentDay = 1;
    championship.days = {};
    types.forEach((t, i) => {
        championship.days[i + 1] = { dayType: t, players: {}, matches: {},
            chronoData: { events: [], series: [], participants: [] } };
    });
    window.updateMultisportTabVisibility();
}

test('courses seules : onglet Multisport masqué, « Classement » ouvre le classement des courses', () => {
    setDays(['chrono', 'chrono']);
    expect(document.getElementById('multisportTab').style.display).toBe('none');
    window.switchToGeneralRanking();
    expect(document.getElementById('multisport-ranking').style.display).toBe('block');
    expect(document.getElementById('generalRankingTab').classList.contains('active')).toBe(true);
    expect(document.getElementById('multisport-hub-title').textContent).toBe('🏆 Classement des Courses');
    expect(document.querySelector('#multisport-ranking .multisport-info').style.display).toBe('none');
});

test('matchs + courses : onglet Multisport visible avec le barème combiné', () => {
    setDays(['championship', 'chrono']);
    expect(document.getElementById('multisportTab').style.display).toBe('inline-block');
    window.switchToMultisportRanking();
    expect(document.getElementById('multisportTab').classList.contains('active')).toBe(true);
    expect(document.getElementById('multisport-hub-title').textContent).toContain('Multisport');
    expect(document.querySelector('#multisport-ranking .multisport-info').style.display).toBe('');
});

test('matchs seuls : pas d\'onglet Multisport', () => {
    setDays(['championship']);
    expect(document.getElementById('multisportTab').style.display).toBe('none');
});
