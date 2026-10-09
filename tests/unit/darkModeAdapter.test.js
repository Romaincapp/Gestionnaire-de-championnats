/**
 * @jest-environment jsdom
 *
 * Mode sombre (src/darkmode.iife.js) : les fonds clairs et les textes foncés
 * écrits en dur dans les styles inline générés par JS sont repérés et marqués
 * (data-dm-bg / data-dm-fg / data-dm-bd), traduits en couleurs sombres par
 * styles.css. L'audit complet, sur tous les écrans et fenêtres, est
 * tests/e2e/darkmode.e2e.js (vrai navigateur).
 */
const { loadModules } = require('../helpers/loadApp');

let rules;
beforeAll(() => {
    loadModules(['darkmode']);
    rules = window.darkModeColorRules;
});

afterEach(() => {
    document.body.className = '';
    document.body.innerHTML = '';
});

const c = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
};
const DARK = c('#2a2a3d');

describe('règles de couleur', () => {
    test.each([
        ['#ffffff', 'w'], ['#f8f9fa', 'n'], ['#d4edda', 'g'], ['#fff3cd', 'y'],
        ['#f8d7da', 'r'], ['#e3f2fd', 'b'], ['#f3e5f5', 'p'], ['#ffe0b2', 'o'],
    ])('fond clair %s → surface sombre « %s »', (hex, bucket) => {
        expect(rules.bgBucket(c(hex))).toBe(bucket);
    });

    test.each(['#27ae60', '#3498db', '#e67e22', '#ffd700', '#2c3e50'])(
        'fond coloré ou déjà sombre %s : inchangé', (hex) => {
            expect(rules.bgBucket(c(hex))).toBeNull();
        });

    test('fond blanc translucide léger (en-tête) : inchangé', () => {
        expect(rules.bgBucket({ r: 255, g: 255, b: 255, a: 0.2 })).toBeNull();
    });

    test.each([
        ['#333333', 'n'], ['#2c3e50', 'n'], ['#7f8c8d', 'm'], ['#155724', 'g'],
        ['#721c24', 'r'], ['#0c5460', 'b'], ['#856404', 'y'],
    ])('texte foncé %s sur fond sombre → texte clair « %s »', (hex, bucket) => {
        expect(rules.fgBucket(c(hex), DARK)).toBe(bucket);
    });

    test('texte déjà lisible sur fond sombre : inchangé', () => {
        expect(rules.fgBucket(c('#e0e0e0'), DARK)).toBeNull();
        expect(rules.fgBucket(c('#e67e22'), DARK)).toBeNull();
    });

    test('texte blanc sur bouton coloré : choix de charte, inchangé', () => {
        expect(rules.fgBucket(c('#ffffff'), c('#27ae60'))).toBeNull();
    });

    test('texte clair forcé sur une ligne restée dorée → texte sombre', () => {
        expect(rules.fgBucket(c('#e0e0e0'), c('#ffd700'))).toBe('k');
    });
});

describe('marquage du DOM', () => {
    const flush = () => new Promise((r) => setTimeout(r, 0));

    test('en mode sombre, une fenêtre générée avec styles inline clairs est marquée', async () => {
        document.body.classList.add('dark-mode');
        await flush();
        document.body.insertAdjacentHTML('beforeend', `
            <div id="modal" style="background: white; border: 1px solid #ddd;">
                <h3 id="title" style="color: #2c3e50;">Titre</h3>
                <span id="hint" style="color: #7f8c8d;">aide</span>
                <button id="ok" style="background: #27ae60; color: white;">OK</button>
            </div>`);
        await flush();
        expect(document.getElementById('modal').getAttribute('data-dm-bg')).toBe('w');
        expect(document.getElementById('modal').getAttribute('data-dm-bd')).toBe('trbl');
        expect(document.getElementById('title').getAttribute('data-dm-fg')).toBe('n');
        expect(document.getElementById('hint').getAttribute('data-dm-fg')).toBe('m');
        expect(document.getElementById('ok').hasAttribute('data-dm-bg')).toBe(false);
        expect(document.getElementById('ok').hasAttribute('data-dm-fg')).toBe(false);
        // le style inline n'est jamais modifié
        expect(document.getElementById('modal').getAttribute('style')).toBe('background: white; border: 1px solid #ddd;');
    });

    test('un style modifié après coup (survol, onmouseover) est retraité', async () => {
        document.body.classList.add('dark-mode');
        document.body.innerHTML = '<div id="row" style="background: #2a2a3d;">x</div>';
        await flush();
        const row = document.getElementById('row');
        expect(row.hasAttribute('data-dm-bg')).toBe(false);
        row.style.background = '#f8f9fa';
        await flush();
        expect(row.getAttribute('data-dm-bg')).toBe('n');
    });

    test('en mode clair rien n\'est marqué, et repasser en clair retire les marques', async () => {
        document.body.innerHTML = '<div id="box" style="background: white;">x</div>';
        await flush();
        expect(document.getElementById('box').hasAttribute('data-dm-bg')).toBe(false);
        document.body.classList.add('dark-mode');
        await flush();
        expect(document.getElementById('box').getAttribute('data-dm-bg')).toBe('w');
        document.body.classList.remove('dark-mode');
        await flush();
        expect(document.querySelectorAll('[data-dm-bg],[data-dm-fg],[data-dm-bd]').length).toBe(0);
    });
});

test('texte blanc sur badge bleu foncé : jamais assombri', () => {
    expect(window.darkModeColorRules.fgBucket(c('#ffffff'), c('#2980b9'))).toBeNull();
});
