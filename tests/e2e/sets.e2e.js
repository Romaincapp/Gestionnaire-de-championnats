// ============================================
// Test de bout en bout des scores en sets (BO3/BO5), piloté par l'interface
// (vrais clics / vraies touches dans un vrai navigateur).
//
//   npm run test:sets                 (navigateur invisible)
//   HEADED=1 npm run test:sets        (fenêtre visible, au ralenti)
//   CHROME_PATH=/chemin/chrome npm run test:sets
//
// Couvre : sélecteur « 🎯 Score », saisie set par set (Entrée → set suivant), set
// incomplet signalé, poule et phase finale en BO5, classement (colonnes sets), forfait,
// feuilles imprimées, import d'un export tennisdetable, journée restée en 2 scores.
// Captures d'écran et rapport : tests/e2e/output-sets/ (non versionné).
// Code de sortie 1 si un contrôle échoue — à lancer avant une compétition en sets.
// ============================================
const { openBrowser } = require('./screens');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.join(__dirname, '..', '..');
const APP = pathToFileURL(path.join(ROOT, 'index.html')).href;
const OUT = path.join(__dirname, 'output-sets');
const HEADED = !!process.env.HEADED;

// ---------------------------------------------------------------
// Journal des contrôles
const log = [];
const problems = [];
function step(msg) { log.push('▶ ' + msg); console.log('▶ ' + msg); }
function ok(msg) { log.push('  ✅ ' + msg); console.log('  ✅ ' + msg); }
function bad(msg) { problems.push(msg); log.push('  ❌ ' + msg); console.log('  ❌ ' + msg); }
function check(cond, msg) { cond ? ok(msg) : bad(msg); }

function launchOptions() {
    const base = { headless: !HEADED, slowMo: HEADED ? 150 : 0 };
    if (process.env.CHROME_PATH) return Object.assign(base, { executablePath: process.env.CHROME_PATH });
    // Environnement Claude Code (Chromium préinstallé)
    if (fs.existsSync('/opt/pw-browsers/chromium')) return Object.assign(base, { executablePath: '/opt/pw-browsers/chromium' });
    // Poste de dev / runners GitHub : Google Chrome installé
    return Object.assign(base, { channel: 'chrome' });
}

const state = (page, fn, arg) => page.evaluate(fn, arg);
let shot = 0;
const snap = (page, name) => page.screenshot({ path: path.join(OUT, String(++shot).padStart(2, '0') + '-' + name + '.png') });

// Saisit un set (deux cases) puis Entrée dans la case du joueur 2
async function typeSet(grid, setIndex, s1, s2) {
    const inputs = grid.locator('input.set-score-input');
    await inputs.nth(setIndex * 2).fill(s1);
    await inputs.nth(setIndex * 2 + 1).fill(s2);
    await inputs.nth(setIndex * 2 + 1).press('Enter');
    await grid.page().waitForTimeout(200);
}

async function popupHtml(context, page, fn) {
    const [popup] = await Promise.all([
        context.waitForEvent('page', { timeout: 5000 }).catch(() => null),
        page.evaluate(fn),
    ]);
    if (!popup) return null;
    await popup.waitForLoadState();
    const html = await popup.content();
    await popup.close();
    return html;
}

const countSetHeaders = html => (html.match(/<th>SET \d<\/th>/g) || []).length;

(async () => {
    fs.mkdirSync(OUT, { recursive: true });
    fs.readdirSync(OUT).forEach(f => fs.unlinkSync(path.join(OUT, f)));
    const browser = await openBrowser(launchOptions());
    const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
    const page = await context.newPage();
    const jsErrors = [];
    const dialogs = [];
    page.on('pageerror', e => jsErrors.push(e.message));
    page.on('dialog', d => { dialogs.push(d.type() + ': ' + d.message().slice(0, 200)); d.accept(); });
    await page.goto(APP);
    await page.waitForTimeout(800);

    // Données de départ : 4 joueurs en D1, 2 matchs au tour 1
    await state(page, () => {
        const d = championship.days[1];
        d.players[1] = ['Alice', 'Bob', 'Chloé', 'David'];
        d.matches[1] = [
            { player1: 'Alice', player2: 'Bob', tour: 1, court: 1, score1: '', score2: '', completed: false, winner: null },
            { player1: 'Chloé', player2: 'David', tour: 1, court: 2, score1: '', score2: '', completed: false, winner: null },
        ];
        updateMatchesDisplay(1);
    });

    // ---------------------------------------------------------------
    step('1. Sélecteur « 🎯 Score » → Sets · BO3');
    await page.selectOption('#day-scoring-select-1', 'sets-2');
    await page.waitForTimeout(400);
    const scoring = await state(page, () => championship.days[1].scoring);
    check(scoring && scoring.mode === 'sets' && scoring.setsToWin === 2 && scoring.pointsPerSet === 11,
        'J1 en BO3 · 11 pts : ' + JSON.stringify(scoring));
    check(await page.locator('#day-scoring-pps-1').isVisible(), 'sélecteur des points par set affiché');
    const grid0 = page.locator('.match').nth(0).locator('.set-score-grid');
    check(await grid0.locator('input.set-score-input').count() === 6, 'grille de 3 sets × 2 cases dans le match');

    // ---------------------------------------------------------------
    step('2. Match par tours : 11-8 ↵ puis 11-9 ↵');
    await typeSet(grid0, 0, '11', '8');
    const focused = await state(page, () => document.activeElement && document.activeElement.dataset.set);
    check(focused === '1', 'Entrée au set 1 → focus sur le set 2');
    await typeSet(grid0, 1, '11', '9');
    await page.waitForTimeout(1000);
    const m0 = await state(page, () => championship.days[1].matches[1][0]);
    check(m0.completed && m0.winner === 'Alice' && m0.score1 === 2 && m0.score2 === 0, `match terminé 2-0, vainqueur Alice (${m0.score1}-${m0.score2})`);
    check(JSON.stringify(m0.setScores.slice(0, 2)) === JSON.stringify([{ s1: '11', s2: '8' }, { s1: '11', s2: '9' }]), 'détail des sets enregistré');
    check(await grid0.locator('input[data-set="2"]').first().isDisabled(), '3e set grisé (inutile)');
    const summary = await page.locator('.match').nth(0).locator('.collapse-score').textContent().catch(() => '');
    check(summary.trim() === '2-0', 'résumé replié « 2-0 »');
    await snap(page, 'match-bo3');

    // ---------------------------------------------------------------
    step('3. Set incomplet signalé (9-7 en 11 points), sans blocage');
    const grid1 = page.locator('.match').nth(1).locator('.set-score-grid');
    const in1 = grid1.locator('input.set-score-input');
    await in1.nth(0).fill('9');
    await in1.nth(1).fill('7');
    await in1.nth(1).dispatchEvent('input');
    check(await grid1.locator('.set-score-cell').first().evaluate(c => c.classList.contains('set-warning')), 'cellule du set 1 en alerte');
    await in1.nth(0).fill('');
    await in1.nth(1).fill('');
    await in1.nth(1).dispatchEvent('input');

    // ---------------------------------------------------------------
    step('4. Forfait (🔓 Modifier les matchs → F1) en BO3');
    await page.evaluate(() => toggleForfaitButtons());
    await page.waitForTimeout(300);
    await page.locator('.match').nth(1).getByRole('button', { name: 'F1', exact: true }).click();
    await page.waitForTimeout(400);
    const m1 = await state(page, () => championship.days[1].matches[1][1]);
    check(m1.completed && m1.winner === 'David' && m1.score1 === 0 && m1.score2 === 2 && m1.forfaitBy === 'player1',
        `forfait de Chloé : 0-2, vainqueur David (${m1.score1}-${m1.score2})`);
    await page.evaluate(() => toggleForfaitButtons());
    await page.waitForTimeout(300);

    // ---------------------------------------------------------------
    step('5. Classement de la journée : colonnes des sets');
    await page.evaluate(() => updateRankingsForDay(1));
    await page.waitForTimeout(400);
    const heads = await page.locator('#rankingsContent-1 table').first().locator('th').allInnerTexts();
    check(['Sets G/P', 'Diff sets', 'Pts jeu ±'].every(h => heads.includes(h)), 'en-têtes : ' + heads.join(' | '));
    const rows = (await page.locator('#rankingsContent-1 table').first().locator('tbody tr').allInnerTexts()).map(r => r.replace(/\s+/g, ' '));
    // Victoire par forfait = sets à 11-0 (+22 points de jeu) : David passe devant Alice (+5)
    check(/David/.test(rows[0]) && /\+22/.test(rows[0]), 'David 1er (forfait 2-0, +22 points de jeu) — ' + rows[0]);
    check(/Alice/.test(rows[1]) && / 2\/0 /.test(rows[1]) && /\+5/.test(rows[1]), 'Alice 2e : sets 2/0, points de jeu +5 — ' + rows[1]);
    await snap(page, 'classement');

    // ---------------------------------------------------------------
    step('6. Feuilles de match imprimées : une colonne par set');
    const sheetBO3 = await popupHtml(context, page, () => printMatchSheets(1));
    check(sheetBO3 && countSetHeaders(sheetBO3) === 2 * 3, 'BO3 : 3 colonnes SET par feuille (2 feuilles)');
    await page.selectOption('#day-scoring-select-1', 'sets-3');
    await page.waitForTimeout(400);
    const sheetBO5 = await popupHtml(context, page, () => printMatchSheets(1));
    check(sheetBO5 && countSetHeaders(sheetBO5) === 2 * 5, 'BO5 : 5 colonnes SET par feuille');
    const recap = await popupHtml(context, page, () => printRecapSheets(1));
    check(recap && recap.includes('<th style="width: 8%;">Sets</th>') && recap.includes('Sets gagnés (BO5'), 'récapitulatif : colonnes « Sets », mention BO5');

    // ---------------------------------------------------------------
    step('7. Poule en BO5 : 11-5, 5-11, 11-7, 11-9');
    await state(page, () => {
        const d = championship.days[1];
        if (typeof initializePoolSystem === 'function') initializePoolSystem(1);
        d.pools.enabled = true;
        d.pools.divisions[1].pools = [['Alice', 'Bob']];
        d.pools.divisions[1].matches = [{ id: 1, player1: 'Alice', player2: 'Bob', poolIndex: 0, poolName: 'Poule A', division: 1, dayNumber: 1, score1: '', score2: '', completed: false, winner: null, isPoolMatch: true }];
        updatePoolsDisplay(1);
    });
    await page.waitForTimeout(300);
    const pg = page.locator('.pool-match .set-score-grid').first();
    check(await pg.locator('input.set-score-input').count() === 10, 'grille de poule : 5 sets');
    for (const [i, [a, b]] of [['11', '5'], ['5', '11'], ['11', '7'], ['11', '9']].entries()) await typeSet(pg, i, a, b);
    await page.waitForTimeout(800);
    const pm = await state(page, () => championship.days[1].pools.divisions[1].matches[0]);
    check(pm.completed && pm.winner === 'Alice' && pm.score1 === 3 && pm.score2 === 1, `match de poule 3-1, vainqueur Alice (${pm.score1}-${pm.score2})`);

    // ---------------------------------------------------------------
    step('8. Phase finale en BO5 : 3-11, 8-11, 9-11');
    await state(page, () => {
        championship.days[1].pools.manualFinalPhase = {
            enabled: true, currentRound: 'Finale', divisions: {
                1: { qualified: [{ name: 'Alice', seed: 1 }, { name: 'Bob', seed: 2 }], rounds: { Finale: { name: 'Finale', matches: [{ id: 'Finale-1-1', player1: 'Alice', player2: 'Bob', score1: '', score2: '', completed: false, winner: null, roundName: 'Finale', position: 1 }], completed: false, nextRound: null } } },
                2: { qualified: [], rounds: {} }, 3: { qualified: [], rounds: {} },
            },
        };
        updateManualFinalPhaseDisplay(1);
    });
    await page.waitForTimeout(300);
    const fg = page.locator('.manual-match .set-score-grid').first();
    for (const [i, [a, b]] of [['3', '11'], ['8', '11'], ['9', '11']].entries()) await typeSet(fg, i, a, b);
    await page.waitForTimeout(800);
    const fm = await state(page, () => championship.days[1].pools.manualFinalPhase.divisions[1].rounds.Finale.matches[0]);
    check(fm.completed && fm.winner === 'Bob' && fm.score2 === 3, `finale 0-3, vainqueur Bob (${fm.score1}-${fm.score2})`);
    await snap(page, 'poule-finale-bo5');

    // ---------------------------------------------------------------
    step('8 bis. BYE : choix des points de chaque set (11-0 / 11-5 / Libre)');
    const byeOf = name => state(page, n => {
        const m = championship.days[1].matches[1].filter(x => x.isBye && x.player1 === n).pop();
        return m && JSON.parse(JSON.stringify(m));
    }, name);
    await page.evaluate(() => showByeScoreModal(1, 1, 'Chloé'));
    await page.waitForTimeout(300);
    const choices = await page.locator('#byeScoreModal .bye-set-points').allInnerTexts();
    check(choices.map(t => t.trim()).join(' | ') === '11 - 0 | 11 - 5 | Libre', 'choix proposés (BO5 · 11 pts) : ' + choices.join(' | '));
    await snap(page, 'fenetre-bye');
    await page.locator('#byeScoreModal .bye-set-points', { hasText: '11 - 5' }).click();
    await page.locator('#byeScoreModal').getByRole('button', { name: '✅ Valider' }).click();
    await page.waitForTimeout(400);
    const bye1 = await byeOf('Chloé');
    const bye1Sets = (bye1 && bye1.setScores || []).filter(x => x.s1 !== '').map(x => `${x.s1}-${x.s2}`);
    check(bye1 && bye1.score1 === 3 && bye1.winner === 'Chloé' && bye1Sets.join(' ') === '11-5 11-5 11-5', 'BYE 3-0 en 11-5 : ' + bye1Sets.join(' '));
    await page.evaluate(() => closeByeModal()); // la gestion des BYE se rouvre après validation
    await page.evaluate(() => showByeScoreModal(1, 1, 'David'));
    await page.waitForTimeout(300);
    await page.locator('#byeScoreModal .bye-set-points', { hasText: 'Libre' }).click();
    await page.locator('#byeScoreModal').getByRole('button', { name: '✅ Valider' }).click();
    await page.waitForTimeout(400);
    const bye2 = await byeOf('David');
    // La grille affichée ajoute des sets vides (saisie possible ensuite) : aucun ne doit être rempli
    check(bye2 && bye2.score1 === 3 && bye2.winner === 'David' && (bye2.setScores || []).every(x => x.s1 === '' && x.s2 === ''), 'BYE « Libre » : 3-0 sans détail des sets');
    await page.evaluate(() => closeByeModal());

    // ---------------------------------------------------------------
    step('9. Journée restée en 2 scores (J2) : cases historiques, nul permis');
    await page.evaluate(() => addNewDay());
    await page.waitForTimeout(500);
    check(await page.locator('#day-scoring-select-2').inputValue() === 'sets-3', 'J2 reprend le format de J1 (BO5)');
    await page.evaluate(() => switchTab(2));
    await page.waitForTimeout(300);
    await page.selectOption('#day-scoring-select-2', 'simple');
    await page.waitForTimeout(300);
    await state(page, () => {
        const d = championship.days[2];
        d.players[1] = ['Alice', 'Bob'];
        d.matches[1] = [{ player1: 'Alice', player2: 'Bob', tour: 1, court: 1, score1: '', score2: '', completed: false, winner: null }];
        updateMatchesDisplay(2);
    });
    await page.waitForTimeout(300);
    const day2 = page.locator('#day-2');
    check(await day2.locator('.set-score-grid').count() === 0, 'pas de grille de sets en 2 scores');
    const simpleInputs = day2.locator('.match .score-input');
    await simpleInputs.nth(0).fill('3');
    await simpleInputs.nth(0).dispatchEvent('change');
    await simpleInputs.nth(1).fill('3');
    await simpleInputs.nth(1).dispatchEvent('change');
    await simpleInputs.nth(1).press('Enter');
    await page.waitForTimeout(600);
    const d2m = await state(page, () => championship.days[2].matches[1][0]);
    check(d2m.completed && d2m.winner === null, 'match nul 3-3 accepté en 2 scores');

    // ---------------------------------------------------------------
    step('10. Import d\'un export tennisdetable (sets legacy, sans config)');
    const tt = {
        version: '2.0', championship: { currentDay: 1, days: { 1: {
            players: { 1: ['Alice', 'Bob'], 2: [], 3: [] },
            matches: { 1: [{ player1: 'Alice', player2: 'Bob', tour: 1, completed: true, winner: 'Alice',
                sets: [{ player1Score: 11, player2Score: 7 }, { player1Score: 9, player2Score: 11 }, { player1Score: 11, player2Score: 8 }] }], 2: [], 3: [] },
        } } },
    };
    await state(page, data => { window.importedChampionshipData = data; processImport(); }, tt);
    await page.waitForTimeout(800);
    const imp = await state(page, () => ({ scoring: championship.days[1].scoring, m: championship.days[1].matches[1][0], config: championship.config }));
    check(imp.scoring && imp.scoring.mode === 'sets' && imp.scoring.setsToWin === 2, 'journée importée en BO3');
    check(imp.m.score1 === 2 && imp.m.score2 === 1 && imp.m.setScores.length === 3 && imp.m.setScores[1].s2 === '11' && !imp.m.sets,
        'sets repris sans perte (2-1 : 11-7 9-11 11-8)');
    check(!!imp.config && imp.config.numberOfDivisions === 3, 'config par défaut créée (fichier sans config)');
    await page.evaluate(() => addNewDay());
    await page.waitForTimeout(500);
    check(await state(page, () => !!championship.days[2] && championship.days[2].scoring.mode === 'sets'), '« + journée » après import : OK, format hérité');

    // ---------------------------------------------------------------
    step('Bilan');
    check(jsErrors.length === 0, 'aucune erreur JavaScript' + (jsErrors.length ? ' : ' + jsErrors.join(' | ') : ''));
    fs.writeFileSync(path.join(OUT, 'rapport.txt'), log.join('\n') + '\n\nDIALOGUES:\n' + dialogs.join('\n') + '\n\nERREURS JS:\n' + jsErrors.join('\n'));
    console.log(`\n=== ${problems.length} problème(s) ===` + (problems.length ? '\n' + problems.join('\n') : '') + `\nCaptures et rapport : ${path.relative(ROOT, OUT)}/`);
    await browser.close();
    process.exit(problems.length ? 1 : 0);
})().catch(e => { console.error('ÉCHEC DU SCÉNARIO :', e); process.exit(1); });
