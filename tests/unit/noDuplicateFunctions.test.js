/**
 * Intègre scripts/check-duplicate-functions.js à la suite Jest pour que
 * `npm test` seul détecte les fonctions redéfinies silencieusement dans
 * src/*.iife.js (voir issues #65, #66). Les wrappers intentionnels connus
 * (checkPoolsCompletion, initializePoolsForDay dans pools.iife.js) sont
 * explicitement whitelistés pour ne pas faire échouer la suite — un
 * nouveau wrapper détecté doit être ajouté ici après vérification manuelle,
 * pas juste "corrigé" en aveugle.
 */
const fs = require('fs');
const path = require('path');
const { findDuplicates, SRC_DIR } = require('../../scripts/check-duplicate-functions');

const KNOWN_INTENTIONAL_WRAPPERS = new Set([
    'pools.iife.js::checkPoolsCompletion',
    'pools.iife.js::initializePoolsForDay',
]);

const files = fs.readdirSync(SRC_DIR).filter((f) => f.endsWith('.iife.js'));

describe('Pas de fonction redéfinie silencieusement (hors wrappers connus)', () => {
    files.forEach((file) => {
        test(file, () => {
            const filePath = path.join(SRC_DIR, file);
            const duplicates = findDuplicates(filePath);

            const unexpected = duplicates.filter(
                (d) => !d.isWrapper && !KNOWN_INTENTIONAL_WRAPPERS.has(`${file}::${d.name}`)
            );

            if (unexpected.length > 0) {
                const details = unexpected
                    .map((d) => `${d.name} (${d.occurrences.map((o) => `L${o.line}`).join(', ')})`)
                    .join('; ');
                throw new Error(
                    `Fonction(s) redéfinie(s) sans capture de l'original dans ${file} : ${details}. ` +
                    `La seconde définition écrase silencieusement la première — voir issue #65.`
                );
            }
        });
    });
});
