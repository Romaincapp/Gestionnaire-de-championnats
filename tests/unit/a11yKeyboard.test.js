/**
 * @jest-environment jsdom
 *
 * Clavier et lecteurs d'écran (src/a11y.iife.js) : toute fenêtre affichée
 * (.modal de index.html ou calque plein écran créé en JS) devient un
 * role="dialog" titré, reçoit le focus, garde Tab à l'intérieur, se ferme à
 * Échap par SON bouton (×, Fermer, Annuler) ou son fond cliquable, et rend le
 * focus à l'élément d'origine. Les éléments cliquables non natifs (div, h2,
 * tr... avec onclick) sont atteignables au Tab et activés par Entrée/Espace.
 * Le comportement réel sur les ~30 fenêtres de l'app est vérifié par
 * npm run test:a11y.
 */
const { loadModules } = require('../helpers/loadApp');

beforeAll(() => loadModules(['a11y']));

const tick = () => new Promise((r) => setTimeout(r, 0));
const full = () => ({ left: 0, top: 0, right: 1024, bottom: 768, width: 1024, height: 768 });
const key = (target, k, opts = {}) => {
    const e = new KeyboardEvent('keydown', Object.assign({ key: k, bubbles: true, cancelable: true }, opts));
    target.dispatchEvent(e);
    return e;
};

// Calque plein écran tel que les modules le créent (style inline, ajouté au body).
function overlay(html, attrs = '') {
    const wrap = document.createElement('div');
    wrap.innerHTML = `<div class="ovl" ${attrs} style="position: fixed; top: 0; left: 0; width: 100%; height: 100%;">${html}</div>`;
    const el = wrap.firstElementChild;
    el.getBoundingClientRect = full;
    document.body.appendChild(el);
    return el;
}

beforeEach(async () => {
    document.body.innerHTML = '<button id="opener">Ouvrir</button>';
    await tick();
    while (window.getOpenDialogs().length) { window.getOpenDialogs()[0].remove(); await tick(); }
});

test('une fenêtre créée en JS devient un dialog titré et reçoit le focus sur son premier champ', async () => {
    document.getElementById('opener').focus();
    const dlg = overlay('<div><h3>Ajouter une épreuve</h3><input id="f"><button>Annuler</button></div>');
    await tick();
    expect(dlg.getAttribute('role')).toBe('dialog');
    expect(dlg.getAttribute('aria-modal')).toBe('true');
    const title = document.getElementById(dlg.getAttribute('aria-labelledby'));
    expect(title.textContent).toBe('Ajouter une épreuve');
    expect(document.activeElement.id).toBe('f');
});

test('Échap clique le bouton Annuler de la fenêtre puis rend le focus au bouton d\'origine', async () => {
    const opener = document.getElementById('opener');
    opener.focus();
    window.closeIt = jest.fn(() => document.querySelector('.ovl').remove());
    overlay('<div><h3>T</h3><input><button onclick="closeIt()">❌ Annuler</button><button>Sauvegarder</button></div>');
    await tick();
    const e = key(document.activeElement, 'Escape');
    expect(window.closeIt).toHaveBeenCalledTimes(1);
    expect(e.defaultPrevented).toBe(true);
    await tick();
    expect(document.querySelector('.ovl')).toBeNull();
    expect(document.activeElement).toBe(opener);
});

test('le × est préféré à Annuler ; un fond « event.target === this » sert de repli', async () => {
    window.byCross = jest.fn();
    window.byCancel = jest.fn();
    overlay('<div><button onclick="byCross()">×</button><button onclick="byCancel()">Annuler</button></div>');
    await tick();
    key(document.body, 'Escape');
    expect(window.byCross).toHaveBeenCalled();
    expect(window.byCancel).not.toHaveBeenCalled();

    window.getOpenDialogs()[0].remove();
    await tick();
    window.closeBackdrop = jest.fn();
    overlay('<div><p>Détail</p></div>', 'onclick="if(event.target===this)closeBackdrop()"');
    await tick();
    key(document.body, 'Escape');
    expect(window.closeBackdrop).toHaveBeenCalledTimes(1);
});

test('une .modal masquée puis affichée est prise en charge, et le focus revient à la fermeture', async () => {
    document.body.innerHTML += '<div id="m" class="modal" style="display: none; position: fixed"><div class="modal-content"><h3>Import</h3><button onclick="document.getElementById(\'m\').style.display=\'none\'">Annuler</button></div></div>';
    const opener = document.getElementById('opener');
    opener.focus();
    const m = document.getElementById('m');
    m.style.display = 'block';
    await tick();
    expect(m.getAttribute('role')).toBe('dialog');
    // pas de champ : le panneau reçoit le focus (tabindex -1)
    expect(document.activeElement).toBe(m.querySelector('.modal-content'));
    key(document.activeElement, 'Escape');
    await tick();
    expect(m.style.display).toBe('none');
    expect(window.getOpenDialogs()).toHaveLength(0);
    expect(document.activeElement).toBe(opener);
});

test('fenêtres empilées : Échap ne ferme que celle du dessus', async () => {
    window.closeA = jest.fn();
    window.closeB = jest.fn(() => document.getElementById('b').remove());
    overlay('<div><input id="a-in"><button onclick="closeA()">Fermer</button></div>', 'id="a"');
    await tick();
    overlay('<div><input id="b-in"><button onclick="closeB()">Fermer</button></div>', 'id="b"');
    await tick();
    expect(document.activeElement.id).toBe('b-in');
    key(document.activeElement, 'Escape');
    await tick();
    expect(window.closeB).toHaveBeenCalledTimes(1);
    expect(window.closeA).not.toHaveBeenCalled();
    // le focus retourne dans la fenêtre restée ouverte
    expect(document.getElementById('a').contains(document.activeElement)).toBe(true);
});

test('Tab reste dans la fenêtre (boucle du dernier au premier et inversement)', async () => {
    overlay('<div><input id="first"><button id="mid">Annuler</button><button id="last">OK</button></div>');
    await tick();
    document.getElementById('last').focus();
    let e = key(document.activeElement, 'Tab');
    expect(e.defaultPrevented).toBe(true);
    expect(document.activeElement.id).toBe('first');
    e = key(document.activeElement, 'Tab', { shiftKey: true });
    expect(e.defaultPrevented).toBe(true);
    expect(document.activeElement.id).toBe('last');
    document.getElementById('first').focus();
    e = key(document.activeElement, 'Tab');
    expect(e.defaultPrevented).toBe(false);   // le navigateur passe au suivant
});

test('les éléments cliquables non natifs deviennent atteignables et activables au clavier', async () => {
    window.toggled = jest.fn();
    window.rowClicked = jest.fn();
    window.closeX = jest.fn();
    const host = document.createElement('div');
    host.innerHTML = `
        <h2 id="hub" onclick="toggled()">Journée 1</h2>
        <table><tbody><tr id="row" onclick="rowClicked()"><td>Joueur</td></tr></tbody></table>
        <span id="stop" onclick="event.stopPropagation()">x</span>
        <div id="bg" onclick="if(event.target===this)closeX()"></div>
        <button id="btn" onclick="toggled()">Bouton</button>`;
    document.body.appendChild(host);
    await tick();
    const hub = document.getElementById('hub');
    expect(hub.getAttribute('tabindex')).toBe('0');
    expect(hub.getAttribute('role')).toBe('button');
    const row = document.getElementById('row');
    expect(row.getAttribute('tabindex')).toBe('0');
    expect(row.hasAttribute('role')).toBe(false);          // la ligne reste une ligne de tableau
    expect(document.getElementById('stop').hasAttribute('tabindex')).toBe(false);
    expect(document.getElementById('bg').hasAttribute('tabindex')).toBe(false);
    expect(document.getElementById('btn').hasAttribute('role')).toBe(false);

    hub.focus();
    expect(key(hub, 'Enter').defaultPrevented).toBe(true);
    expect(key(hub, ' ').defaultPrevented).toBe(true);     // Espace ne fait pas défiler la page
    expect(window.toggled).toHaveBeenCalledTimes(2);
    key(row, 'Enter');
    expect(window.rowClicked).toHaveBeenCalledTimes(1);
});

test('Échap dans la barre de recherche ne ferme pas la fenêtre ouverte', async () => {
    window.closeY = jest.fn();
    overlay('<div><button onclick="closeY()">Fermer</button></div>');
    const bar = document.createElement('div');
    bar.id = 'appSearchBar';
    bar.innerHTML = '<input id="q">';
    document.body.appendChild(bar);
    await tick();
    key(document.getElementById('q'), 'Escape');
    expect(window.closeY).not.toHaveBeenCalled();
});
