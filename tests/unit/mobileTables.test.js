/**
 * @jest-environment jsdom
 *
 * Téléphone (src/mobile.iife.js) : un tableau plus large que sa place reçoit
 * la classe « table-scroll-x » (défilement horizontal, styles.css) au lieu
 * d'avoir ses dernières colonnes coupées. Les tableaux qui tiennent, et tous
 * les tableaux sur ordinateur, ne sont pas touchés. Le vrai rendu est vérifié
 * par npm run test:darkmode:mobile (contrôle « débordement »).
 */
const { loadModules } = require('../helpers/loadApp');

let narrow = true;
beforeAll(() => {
    window.matchMedia = (q) => ({ matches: narrow && q.includes('max-width'), media: q, addListener() {}, removeListener() {} });
    loadModules(['mobile']);
});

const rect = (left, right) => () => ({ left, right, width: right - left, top: 0, bottom: 10, height: 10 });

function setup() {
    document.body.innerHTML = `
        <div id="box" style="padding: 0">
            <table id="wide"><tr><td>Rang</td><td>Temps</td></tr></table>
            <table id="fits"><tr><td>1</td></tr></table>
            <table id="hidden" style="display: none"><tr><td>x</td></tr></table>
        </div>`;
    document.getElementById('box').getBoundingClientRect = rect(0, 350);
    document.getElementById('wide').getBoundingClientRect = rect(0, 520);
    document.getElementById('fits').getBoundingClientRect = rect(0, 300);
    document.getElementById('hidden').getBoundingClientRect = rect(0, 0);
    Object.defineProperty(document.documentElement, 'clientWidth', { value: 390, configurable: true });
}

test('sur téléphone, seul le tableau trop large devient défilable', () => {
    narrow = true;
    setup();
    window.fitTablesToScreen();
    expect(document.getElementById('wide').classList.contains('table-scroll-x')).toBe(true);
    expect(document.getElementById('fits').classList.contains('table-scroll-x')).toBe(false);
    expect(document.getElementById('hidden').classList.contains('table-scroll-x')).toBe(false);
});

test('sur ordinateur, aucun tableau n\'est touché (et une marque d\'avant rotation est retirée)', () => {
    narrow = false;
    setup();
    document.getElementById('wide').classList.add('table-scroll-x');
    window.fitTablesToScreen();
    expect(document.querySelectorAll('table.table-scroll-x').length).toBe(0);
});
