/**
 * @jest-environment jsdom
 *
 * Mode sombre (src/darkmode.iife.js) : un libellé vide au moment du rendu, rempli
 * ensuite par textContent (ex. « - Journée 3 » de la fenêtre « Ajouter des
 * joueurs », #addPlayerDayLabel), doit lui aussi être éclairci s'il devient
 * illisible sur fond sombre. Avant : seul l'ajout d'éléments était suivi, le
 * texte inséré restait gris foncé sur fond sombre (2,7:1).
 */
const { loadModules } = require('../helpers/loadApp');

const tick = () => new Promise((r) => setTimeout(r, 0));

beforeAll(async () => {
    document.body.classList.add('dark-mode');
    loadModules(['darkmode']);
    await tick();
});

test('un texte ajouté après coup dans un élément vide reçoit sa couleur de mode sombre', async () => {
    const box = document.createElement('div');
    box.style.background = '#1e1e2e';
    box.innerHTML = '<span id="late" style="font-size: 14px; color: #54637a;"></span>';
    document.body.appendChild(box);
    await tick();
    const span = document.getElementById('late');
    expect(span.hasAttribute('data-dm-fg')).toBe(false);    // vide : rien à juger

    span.textContent = '- Journée 3';
    await tick();
    expect(span.getAttribute('data-dm-fg')).toBe('m');      // gris → gris clair lisible
});
