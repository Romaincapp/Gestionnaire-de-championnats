/**
 * @jest-environment jsdom
 *
 * Barre de recherche 🔍 (src/search.iife.js) : recherche insensible à la casse et
 * aux accents, limitée à ce qui est affiché, sans jamais modifier le DOM de l'app
 * (les vues sont reconstruites par innerHTML, voir l'en-tête du module).
 */
const { loadModules } = require('../helpers/loadApp');

beforeAll(() => {
    loadModules(['search']);
});

function setupDom(html) {
    document.body.innerHTML = `
        <div id="appSearchBar" style="display: none;">
            <input id="appSearchInput"><span id="appSearchCount"></span>
            <span>Hélène dans la barre</span>
        </div>
        <div class="content">${html}</div>`;
}

afterEach(() => {
    window.closeAppSearch();
});

test('trouve sans tenir compte de la casse ni des accents', () => {
    setupDom('<div>Hélène DUPONT</div><div>helene martin</div><div>Paul</div>');
    const ranges = window.findAppSearchMatches(document.body, 'HELENE');
    expect(ranges.map((r) => r.toString())).toEqual(['Hélène', 'helene']);
});

test('une requête accentuée trouve aussi le texte sans accent', () => {
    setupDom('<div>Equipe Lyon</div><div>Équipe Paris</div>');
    const ranges = window.findAppSearchMatches(document.body, 'équipe');
    expect(ranges.map((r) => r.toString())).toEqual(['Equipe', 'Équipe']);
});

test('ignore les éléments cachés, la barre elle-même et les champs de saisie', () => {
    setupDom(`
        <div class="tab-content" style="display: block;">Alice (visible)</div>
        <div class="tab-content" style="display: none;"><p>Alice (journée cachée)</p></div>
        <input value="Alice">
        <textarea>Alice</textarea>`);
    const ranges = window.findAppSearchMatches(document.body, 'alice');
    expect(ranges).toHaveLength(1);
    expect(ranges[0].startContainer.nodeValue).toBe('Alice (visible)');
    expect(window.findAppSearchMatches(document.body, 'barre')).toHaveLength(0);
});

test('plusieurs occurrences dans un même texte et requête vide', () => {
    setupDom('<div>Club A vs Club B</div>');
    expect(window.findAppSearchMatches(document.body, 'club')).toHaveLength(2);
    expect(window.findAppSearchMatches(document.body, '   ')).toHaveLength(0);
});

test('suivant/précédent bouclent et le compteur suit', () => {
    setupDom('<div>Bob</div><div>Bobby</div><div>Bobette</div>');
    window.openAppSearch();
    window.onAppSearchInput('bob');
    const count = document.getElementById('appSearchCount');
    expect(window.getAppSearchState()).toMatchObject({ count: 3, index: 0 });
    expect(count.textContent).toBe('1 / 3');

    window.appSearchPrev();
    expect(window.getAppSearchState().index).toBe(2);
    window.appSearchNext();
    expect(window.getAppSearchState().index).toBe(0);

    window.onAppSearchInput('zzz');
    expect(count.textContent).toBe('Aucun résultat');
});

test('ne modifie pas le DOM de la page (pas de <mark>)', () => {
    setupDom('<div id="zone"><span onclick="x()">Durand</span> <b>Durand</b></div>');
    const before = document.getElementById('zone').innerHTML;
    window.openAppSearch();
    window.onAppSearchInput('durand');
    expect(window.getAppSearchState().count).toBe(2);
    expect(document.getElementById('zone').innerHTML).toBe(before);
});

test('relance la recherche après un re-rendu innerHTML', async () => {
    jest.useFakeTimers();
    try {
        setupDom('<div id="zone">Martin</div>');
        window.openAppSearch();
        window.onAppSearchInput('martin');
        expect(window.getAppSearchState().count).toBe(1);

        document.getElementById('zone').innerHTML = '<p>Martin</p><p>Martine</p>';
        await Promise.resolve(); // laisse le MutationObserver notifier
        jest.advanceTimersByTime(250);
        expect(window.getAppSearchState().count).toBe(2);
    } finally {
        jest.useRealTimers();
    }
});

test('Échap ferme la barre', () => {
    setupDom('<div>Test</div>');
    window.openAppSearch();
    const bar = document.getElementById('appSearchBar');
    expect(bar.style.display).toBe('flex');
    window.onAppSearchKeydown(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(bar.style.display).toBe('none');
});
