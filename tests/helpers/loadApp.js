// ============================================
// Charge les modules src/*.iife.js dans l'environnement de test (jsdom),
// exactement comme index.html le fait via des balises <script> classiques
// (pas de modules ES/CommonJS dans ce projet — voir claude.md).
// ============================================
const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..', '..', 'src');

// Ordre réel de chargement dans index.html (voir AGENTS.md "Dépendances entre modules").
// init.iife.js est volontairement exclu de l'ordre par défaut : il enregistre un
// listener DOMContentLoaded qui bootstrap toute l'appli (charge le localStorage,
// migre les données...), ce qui est hors du périmètre des tests unitaires ciblés.
// Le charger explicitement si un test en a besoin.
const DEFAULT_ORDER = [
    'config', 'utils', 'notifications', 'state', 'clubs', 'multisport',
    'players', 'ui', 'matches', 'pools', 'ranking',
    'export-json', 'export-print', 'chrono',
];

/**
 * Charge les modules donnés (par défaut : tous sauf init) dans l'ordre,
 * en exécutant leur code source tel quel dans le scope global du test
 * (jsdom fournit `window`/`document` comme globals). Chaque module
 * s'expose ensuite sur `window.x` / `global.x`, accessible directement
 * dans les tests.
 */
function loadModules(names = DEFAULT_ORDER) {
    names.forEach((name) => {
        const filePath = path.join(SRC_DIR, `${name}.iife.js`);
        const code = fs.readFileSync(filePath, 'utf8');
        // eval indirect : exécute dans le scope global (pas le scope local de
        // cette fonction), comme le ferait une vraie balise <script>.
        // eslint-disable-next-line no-eval
        (0, eval)(code);
    });
}

module.exports = { loadModules, SRC_DIR, DEFAULT_ORDER };
