#!/usr/bin/env node
// ============================================
// Détecte les fonctions définies plusieurs fois dans un même fichier src/*.iife.js
// ============================================
// En JS, une redéclaration de `function nom() {}` ou `window.nom = function() {}`
// écrase silencieusement la précédente : seule la dernière compte à l'exécution,
// et la première devient du code mort qui donne une fausse idée du comportement
// réel si on la lit sans vérifier. Ce script a été écrit après avoir trouvé ce
// bug trois fois à la main (pools.iife.js, chrono.iife.js, issues #65 et #66).
//
// Ne remonte QUE les vraies redéfinitions (un nouveau corps de fonction sous le
// même nom) — pas les ré-expositions inoffensives du type `window.x = x;` qui
// référencent une fonction déjà définie ailleurs sans en redéfinir le corps.
//
// Usage : node scripts/check-duplicate-functions.js
// Sortie non-zéro si au moins une redéfinition est trouvée (utilisable en CI /
// hook pre-commit).

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..', 'src');

// Pattern A : déclaration classique `function nom(...) {`
const DECL_RE = /^function\s+([A-Za-z_$][\w$]*)\s*\(/;
// Pattern B : assignation avec un NOUVEAU corps `window.nom = function(...) {`
// ou `global.nom = function(...) {` — mais pas `window.nom = nom;` (référence bare)
const ASSIGN_FN_RE = /^\s*(?:window|global)\.([A-Za-z_$][\w$]*)\s*=\s*function\s*\(/;

// Heuristique "wrapper intentionnel" : le pattern
//   const originalX = window.x;  (ou global.x, ou juste `x`)
//   if (originalX) { window.x = function(...) { originalX(...); ... } }
// est utilisé volontairement dans ce codebase (ex. checkPoolsCompletion,
// initializePoolsForDay dans pools.iife.js) pour étendre une fonction sans
// perdre son comportement d'origine. Ce n'est PAS le même bug qu'une
// redéfinition qui écrase tout sans rien appeler (ex. generateInterclubRanking
// dans chrono.iife.js, issue #65). On cherche une capture `original<Name>`
// dans les ~15 lignes qui précèdent la dernière définition.
function looksLikeIntentionalWrapper(lines, name, lastDefLine) {
    const start = Math.max(0, lastDefLine - 16);
    const window_ = lines.slice(start, lastDefLine - 1).join('\n');
    const captureRe = new RegExp(`original${name}\\s*=\\s*(window|global)\\.${name}\\b`, 'i');
    return captureRe.test(window_);
}

function findDuplicates(filePath) {
    const lines = fs.readFileSync(filePath, 'utf8').split('\n');
    const definitions = new Map(); // name -> [{line, kind}]

    lines.forEach((line, idx) => {
        let m = DECL_RE.exec(line);
        let kind = 'function';
        if (!m) {
            m = ASSIGN_FN_RE.exec(line);
            kind = 'window.x = function';
        }
        if (m) {
            const name = m[1];
            if (!definitions.has(name)) definitions.set(name, []);
            definitions.get(name).push({ line: idx + 1, kind });
        }
    });

    const duplicates = [];
    for (const [name, occurrences] of definitions.entries()) {
        if (occurrences.length > 1) {
            const lastLine = occurrences[occurrences.length - 1].line;
            const isWrapper = looksLikeIntentionalWrapper(lines, name, lastLine);
            duplicates.push({ name, occurrences, isWrapper });
        }
    }
    return duplicates;
}

function main() {
    const files = fs.readdirSync(SRC_DIR).filter(f => f.endsWith('.iife.js'));
    let realBugs = 0;
    let wrappers = 0;

    files.forEach(file => {
        const filePath = path.join(SRC_DIR, file);
        const duplicates = findDuplicates(filePath);
        if (duplicates.length > 0) {
            console.log(`\n${file} :`);
            duplicates.forEach(({ name, occurrences, isWrapper }) => {
                const where = occurrences.map(o => `L${o.line} (${o.kind})`).join(', ');
                if (isWrapper) {
                    console.log(`   🟡 ${name}: ${where} → wrapper intentionnel probable (capture "original${name}"), à vérifier mais pas forcément un bug`);
                    wrappers++;
                } else {
                    console.log(`   ❌ ${name}: ${where} → seule la dernière définition (L${occurrences[occurrences.length - 1].line}) est réellement active, la première est du code mort`);
                    realBugs++;
                }
            });
        }
    });

    if (realBugs === 0 && wrappers === 0) {
        console.log(`✅ Aucune fonction redéfinie dans les ${files.length} modules src/*.iife.js`);
        process.exit(0);
    } else {
        console.log(`\n${realBugs} redéfinition(s) probablement réelle(s), ${wrappers} wrapper(s) probablement intentionnel(s) à vérifier au cas par cas.`);
        process.exit(realBugs > 0 ? 1 : 0);
    }
}

main();
