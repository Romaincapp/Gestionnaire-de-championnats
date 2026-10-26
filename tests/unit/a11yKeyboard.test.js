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

test('un × de ligne de tableau (retirer la ligne) n\'est pas pris pour la fermeture', async () => {
    window.removeRow = jest.fn();
    window.closeGrid = jest.fn();
    overlay('<div><h3>Grille</h3><table><tbody><tr><td><input></td><td><button onclick="removeRow()">×</button></td></tr></tbody></table><button onclick="closeGrid()">Annuler</button></div>');
    await tick();
    key(document.body, 'Escape');
    expect(window.removeRow).not.toHaveBeenCalled();
    expect(window.closeGrid).toHaveBeenCalledTimes(1);
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

test('Échap ne clique jamais « ↩️ Annuler » (annulation d\'une action) ; ✖️ (avec sélecteur de variante) ferme', async () => {
    window.undo = jest.fn();
    window.closeZ = jest.fn();
    overlay('<div><div><button onclick="undo()">↩️ Annuler</button></div><h4>Historique</h4><button onclick="closeZ()" title="Fermer">✖️</button></div>');
    await tick();
    key(document.body, 'Escape');
    expect(window.undo).not.toHaveBeenCalled();
    expect(window.closeZ).toHaveBeenCalledTimes(1);
});

test('le panneau de l\'historique de course n\'est pas une fenêtre, même sur très petit écran', async () => {
    const panel = overlay('<div><button onclick="undo()">↩️ Annuler</button></div>', 'id="raceActionHistoryPanel"');
    await tick();
    expect(window.getOpenDialogs()).not.toContain(panel);
    expect(panel.hasAttribute('role')).toBe(false);
});

test('Tab dans la barre de recherche n\'est pas ramené dans la fenêtre ouverte', async () => {
    overlay('<div><input id="in-dlg"><button>Fermer</button></div>');
    const bar = document.createElement('div');
    bar.id = 'appSearchBar';
    bar.innerHTML = '<input id="q2"><button id="next">↓</button>';
    document.body.appendChild(bar);
    await tick();
    document.getElementById('q2').focus();
    const e = key(document.activeElement, 'Tab');
    expect(e.defaultPrevented).toBe(false);
});

test('chaque case de score porte le nom de son joueur et de son adversaire', async () => {
    const host = document.createElement('div');
    host.innerHTML = `
        <div class="match"><div class="set-scores">
            <span class="player-name-left">Gai Séjour 1</span>
            <div class="score-center">
                <input type="number" class="score-input" placeholder="0" onchange="updateMatchScore(1, 1, 0, 'score1', this.value)">
                <input type="number" class="score-input" placeholder="0" onchange="updateMatchScore(1, 1, 0, 'score2', this.value)">
            </div>
            <span class="player-name-right">Les Aquaphiles 2</span>
        </div></div>
        <div class="score-container">
            <input type="text" value="Équipe A" onchange="editPoolMatchPlayerName(1, 1, 'm1', 'player1', this.value)">
            <div class="score-center"><input type="number" onchange="updatePoolMatchScore(1, 'm1', 'score1', this.value, 1)"></div>
            <input type="text" value="Équipe B" onchange="editPoolMatchPlayerName(1, 1, 'm1', 'player2', this.value)">
        </div>`;
    document.body.appendChild(host);
    await tick();
    const [s1, s2] = host.querySelectorAll('.score-input');
    expect(s1.getAttribute('aria-label')).toBe('Score de Gai Séjour 1 contre Les Aquaphiles 2');
    expect(s2.getAttribute('aria-label')).toBe('Score de Les Aquaphiles 2 contre Gai Séjour 1');
    // mode « Modifier les matchs » : noms lus dans les champs, champs de nom nommés
    const pool = host.querySelector('.score-container');
    expect(pool.querySelector('input[type="number"]').getAttribute('aria-label')).toBe('Score de Équipe A contre Équipe B');
    expect(pool.querySelector('input[type="text"]').getAttribute('aria-label')).toBe('Nom du joueur 1 du match');
});

test('autres champs : libellé voisin relié, en-tête de colonne, placeholder parlant ; jamais « 0 »', async () => {
    const host = document.createElement('div');
    host.innerHTML = `
        <div><label>Nombre de divisions :</label><input type="number" id="divs"></div>
        <div><strong>Distance :</strong><input type="number" id="dist-x"></div>
        <table><thead><tr><th>Couloir</th><th>Nageur</th><th>Temps</th></tr></thead>
            <tbody><tr><td>3</td><td>Lucie Vandamme</td><td><input type="text" class="t"></td></tr></tbody></table>
        <input type="text" class="ph" placeholder="Nom du participant">
        <input type="number" class="zero" placeholder="0">
        <label>Déjà relié <input type="text" class="wrapped"></label>`;
    document.body.appendChild(host);
    await tick();
    expect(document.getElementById('divs').labels[0].textContent).toBe('Nombre de divisions :');
    expect(document.getElementById('dist-x').getAttribute('aria-label')).toBe('Distance');
    expect(host.querySelector('.t').getAttribute('aria-label')).toBe('Temps – Lucie Vandamme');
    expect(host.querySelector('.ph').getAttribute('aria-label')).toBe('Nom du participant');
    expect(host.querySelector('.zero').hasAttribute('aria-label')).toBe(false);
    expect(host.querySelector('.wrapped').hasAttribute('aria-label')).toBe(false);   // déjà nommé par son <label>
});

test('un bloc voisin avec boutons ou un placeholder d\'exemple ne servent pas de nom', async () => {
    const host = document.createElement('div');
    host.innerHTML = `
        <div><div>👥 Participants disponibles (149)<button>➕ Ajouter</button></div><input type="text" class="a"></div>
        <textarea class="b" placeholder="Joueur 1
Joueur 2"></textarea>
        <input type="text" class="c" placeholder="ex: Solo, Équipe...">`;
    document.body.appendChild(host);
    await tick();
    expect(host.querySelector('.a').hasAttribute('aria-label')).toBe(false);
    expect(host.querySelector('.b').getAttribute('aria-label')).toBe('Liste, une entrée par ligne (ex. Joueur 1)');
    expect(host.querySelector('.c').hasAttribute('aria-label')).toBe(false);
});

test('« réduire les animations » : un défilement en douceur demandé en JS devient instantané', () => {
    const calls = [];
    const original = function(arg, extra) { calls.push([this, arg, extra]); };
    const wrapped = window.a11yRules.withoutSmooth(original);
    const target = {};
    window.matchMedia = (q) => ({ matches: q.includes('reduce'), media: q, addListener() {}, removeListener() {} });
    wrapped.call(target, { behavior: 'smooth', block: 'start' }, 'x');
    expect(calls[0]).toEqual([target, { behavior: 'auto', block: 'start' }, 'x']);
    wrapped.call(target, true);                                   // forme booléenne : intacte
    expect(calls[1][1]).toBe(true);
    window.matchMedia = (q) => ({ matches: false, media: q, addListener() {}, removeListener() {} });
    wrapped.call(target, { behavior: 'smooth' });                 // réglage absent : intact
    expect(calls[2][1]).toEqual({ behavior: 'smooth' });
    delete window.matchMedia;
});
