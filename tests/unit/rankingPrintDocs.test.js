/**
 * @jest-environment jsdom
 *
 * Documents de classement imprimables : plus de cartes de statistiques (journées /
 * matchs en texte dans l'en-tête), règles d'impression communes (tableau qui
 * continue sur la page suivante au lieu d'un grand blanc), et l'export HTML du
 * général qui plantait (calculateGeneralStats non exposée).
 */
const { loadModules, DEFAULT_ORDER } = require('../helpers/loadApp');

beforeAll(() => {
    loadModules([...DEFAULT_ORDER, 'init']);
});

beforeEach(() => {
    document.body.innerHTML = '<div id="generalStats"></div><div id="generalRankingContent"></div>';
    championship.config = { numberOfDivisions: 1, numberOfCourts: 1 };
    championship.days = {
        1: { players: { 1: ['Alice', 'Bob', 'Chloé'] }, matches: { 1: [
            { player1: 'Alice', player2: 'Bob', tour: 1, court: 1, score1: '7', score2: '4', completed: true, winner: 'Alice' },
            { player1: 'Bob', player2: 'Chloé', tour: 2, court: 1, score1: '', score2: '', completed: false, winner: null },
        ] } },
    };
    window.lastCalculatedGeneralRanking = null;
    window.alert = jest.fn();
    window.confirm = jest.fn(() => false);
});

function captureWindow(fn) {
    let html = '';
    const original = window.open;
    window.open = () => ({ document: { write: h => { html += h; }, open() {}, close() {} }, focus() {}, print() {}, confirm: () => false, closed: false });
    try { fn(); } finally { window.open = original; }
    return html;
}

test('résumé : journées et matchs en texte', () => {
    expect(championshipSummaryText({ totalDays: 1, totalMatches: 151, completedMatches: 151 })).toBe('1 journée · 151 matchs');
    expect(championshipSummaryText({ totalDays: 2, totalMatches: 10, completedMatches: 4 })).toBe('2 journées · 10 matchs dont 4 terminés');
});

test('règles d\'impression : tableaux sécables, en-tête répété, contrôles masqués', () => {
    const css = rankingPrintCSS();
    expect(css).toMatch(/thead \{ display: table-header-group/);
    expect(css).toMatch(/\.division[^{]*\{\s*break-inside: auto !important/);
    expect(css).toMatch(/print-color-adjust: exact/);
    // Pas de format imposé : Portrait / Paysage au choix dans la fenêtre d'impression
    expect(css).not.toMatch(/[^-]size:/);
    expect(css).toMatch(/@media print and \(orientation: portrait\)/);
});

test('export PDF du général : pas de cartes, résumé dans l\'en-tête', () => {
    jest.useFakeTimers();
    const html = captureWindow(() => exportGeneralRankingToPDF());
    jest.runAllTimers();
    jest.useRealTimers();
    expect(html).not.toMatch(/stat-item|stats-section|STATISTIQUES DU CHAMPIONNAT/);
    expect(html).toContain('1 journée · 2 matchs dont 1 terminé');
    expect(html).toContain('table-header-group');
});

test('export HTML du général : fonctionne, sans cartes', () => {
    let html = '';
    const OriginalBlob = window.Blob;
    window.Blob = function(parts) { html = parts.join(''); return new OriginalBlob(parts); };
    URL.createObjectURL = URL.createObjectURL || (() => 'blob:x');
    URL.revokeObjectURL = URL.revokeObjectURL || (() => {});
    try { exportGeneralRankingToHTML(); } finally { window.Blob = OriginalBlob; }
    expect(window.alert).not.toHaveBeenCalled();
    expect(html).not.toMatch(/stat-card|STATISTIQUES DU CHAMPIONNAT/);
    expect(html).toContain('1 journée · 2 matchs dont 1 terminé');
    expect(html).toContain('Alice');
    expect(html).not.toMatch(/size: A4/);
});

test('fenêtre de classement : règles d\'impression incluses', () => {
    updateGeneralRanking();
    const html = captureWindow(() => openRankingInNewWindow('general'));
    expect(html).toContain('table-header-group');
});

test('onglet Classement général : statistiques en simple texte, sans cartes', () => {
    updateGeneralRanking();
    const el = document.getElementById('generalStats');
    expect(el.textContent).toBe('1 journée · 2 matchs dont 1 terminé');
    expect(el.querySelector('.general-stat-card')).toBeNull();
});
