/**
 * @jest-environment jsdom
 */
// Pendant du test htmlOnclickIntegrity.test.js, mais pour le HTML généré
// dynamiquement DANS src/*.iife.js (chaînes de template avec onclick="...")
// plutôt que le HTML statique de index.html. C'est ce genre de handler qui
// avait laissé passer deux bugs réels non détectés par le test existant :
// - backToSeriesList() (chrono.iife.js) supprimée par erreur lors du
//   nettoyage de l'ancien menu Chrono global, alors qu'un bouton de l'écran
//   de course par-journée l'appelait toujours ("Retour aux séries" cassé),
// - removeParticipantFromSerie() (multisport.iife.js) jamais définie du
//   tout : le bouton 🗑️ du modal "Gérer les participants" d'une série
//   plantait dès le premier clic.
const fs = require('fs');
const path = require('path');
const { loadModules, DEFAULT_ORDER } = require('../helpers/loadApp');

const SRC_DIR = path.join(__dirname, '..', '..', 'src');

beforeAll(() => {
    loadModules([...DEFAULT_ORDER, 'init']);
});

// Fonctions volontairement locales à une fenêtre popup auto-suffisante
// (window.open(...).document.write(html)) : le <script> qui les définit
// vit dans une chaîne de template écrite dans un AUTRE document/fenêtre,
// jamais exécuté dans le document principal — donc jamais sur `window` ici.
// Voir chrono.iife.js / init.iife.js / ui.iife.js : bloc "auto-refresh" des
// fenêtres de classement live.
const POPUP_LOCAL_FUNCTIONS = new Set(['requestRefresh']);

// Mots-clés JS qui ressemblent à un appel de fonction ("if(...)") mais n'en
// sont pas.
const JS_KEYWORDS = new Set(['if', 'for', 'while', 'switch', 'return']);

function extractOnclickFunctionNames(content) {
    const names = new Set();
    const re = /(onclick|onchange|onkeypress|onkeyup|oninput|onsubmit|onblur)="([^"]*)"/g;
    let match;
    while ((match = re.exec(content)) !== null) {
        const body = match[2];
        body.split(';').forEach((stmt) => {
            // Ancré en début d'instruction : exclut les appels de méthode
            // (event.stopPropagation(), this.parentElement.remove(), ...)
            // qui ne sont pas des fonctions globales à vérifier.
            const call = /^\s*([a-zA-Z_$][\w$]*)\s*\(/.exec(stmt);
            if (call && !JS_KEYWORDS.has(call[1])) names.add(call[1]);
        });
    }
    return names;
}

test('tous les onclick générés dynamiquement dans src/*.iife.js référencent une fonction définie', () => {
    const files = fs.readdirSync(SRC_DIR).filter((f) => f.endsWith('.iife.js'));
    const allNames = new Set();
    files.forEach((f) => {
        const content = fs.readFileSync(path.join(SRC_DIR, f), 'utf8');
        extractOnclickFunctionNames(content).forEach((n) => allNames.add(n));
    });

    const names = [...allNames].sort();
    expect(names.length).toBeGreaterThan(50); // sanity check

    const missing = names.filter(
        (name) => !POPUP_LOCAL_FUNCTIONS.has(name) && typeof window[name] !== 'function'
    );

    if (missing.length > 0) {
        throw new Error(
            `${missing.length} fonction(s) référencée(s) par un onclick généré dynamiquement ` +
            `mais introuvable(s) après chargement de tous les modules : ${missing.join(', ')}`
        );
    }
});
