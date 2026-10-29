// ============================================
// Mode Poules : aucune action ne doit détruire des poules ou une phase finale en cours
// sans le demander. Chaque scénario repart d'une journée avec poules jouées (D1 et D2)
// et une phase finale entamée, joue une action par l'interface, et compare les données.
//
//   npm run test:pools-safety
//
// Rapport : tests/e2e/output-pools-safety/rapport.txt — code de sortie 1 au moindre défaut.
// ============================================
const { openBrowser } = require('./screens');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.join(__dirname, '..', '..');
const APP = pathToFileURL(path.join(ROOT, 'index.html')).href;
const OUT = path.join(__dirname, 'output-pools-safety');

const log = [];
const problems = [];
function step(msg) { log.push('▶ ' + msg); console.log('▶ ' + msg); }
function ok(msg) { log.push('  ✅ ' + msg); console.log('  ✅ ' + msg); }
function bad(msg) { problems.push(msg); log.push('  ❌ ' + msg); console.log('  ❌ ' + msg); }
function check(cond, msg) { cond ? ok(msg) : bad(msg); }

function launchOptions() {
    const base = { headless: !process.env.HEADED };
    if (process.env.CHROME_PATH) return Object.assign(base, { executablePath: process.env.CHROME_PATH });
    if (fs.existsSync('/opt/pw-browsers/chromium')) return Object.assign(base, { executablePath: '/opt/pw-browsers/chromium' });
    return Object.assign(base, { channel: 'chrome' });
}

// Journée 2 (journée 1 jouée en matchs classiques pour le classement général) :
// poules jouées en D1 et D2, phase finale générée, 1er match du 1er tour joué en D1.
async function setup(page) {
    await page.goto(APP);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForTimeout(300);
    await page.evaluate(() => {
        const names = d => Array.from({ length: 8 }, (_, i) => `J${d}-${String.fromCharCode(65 + i)}`);
        const m = (a, b) => ({ player1: a, player2: b, score1: 11, score2: 5, completed: true, winner: a, court: 1, tour: 1 });
        championship.days[1].players[1] = names(1).map(name => ({ name, club: '' }));
        championship.days[1].matches[1] = [m('J1-A', 'J1-B'), m('J1-C', 'J1-D')];
        saveToLocalStorage();
        addNewDay();
    });
    await page.waitForTimeout(300);
    await page.evaluate(() => {
        const names = d => Array.from({ length: 8 }, (_, i) => `J${d}-${String.fromCharCode(65 + i)}`);
        championship.days[2].players[1] = names(1).map(name => ({ name, club: '' }));
        championship.days[2].players[2] = names(2).map(name => ({ name, club: '' }));
        saveToLocalStorage();
        switchTab(2);
        updatePlayersDisplay(2);
    });
    await page.waitForTimeout(200);
    await page.evaluate(() => togglePoolSection(2));
    await page.locator('#pool-enabled-2').check();
    await page.selectOption('#pool-size-2', '4');
    await page.selectOption('#qualified-per-pool-2', '2');
    await page.selectOption('#matches-per-player-2', '');
    await page.evaluate(() => generatePools(2));
    await dismissAlerts(page);
    await page.evaluate(() => {
        const d = championship.days[2].pools.divisions;
        [1, 2].forEach(div => d[div].matches.forEach(mt => Object.assign(mt, { score1: 11, score2: 4, completed: true, winner: mt.player1 })));
        saveToLocalStorage();
        updatePoolsDisplay(2);
       
    });
    await page.evaluate(() => generateFinalPhase(2));
    await dismissAlerts(page);
    await page.evaluate(() => {
        const rounds = championship.days[2].pools.manualFinalPhase.divisions[1].rounds;
        const first = Object.values(rounds)[0].matches[0];
        Object.assign(first, { score1: 11, score2: 7, completed: true, winner: first.player1 });
        saveToLocalStorage();
        updateManualFinalPhaseDisplay(2);
    });
    await page.waitForTimeout(200);
}

async function dismissAlerts(page) {
    for (let i = 0; i < 5; i++) {
        const a = page.locator('.app-alert').last();
        if (!(await a.count()) || !(await a.isVisible())) return;
        log.push('    ℹ️ message : ' + (await a.innerText()).replace(/\s+/g, ' ').slice(0, 160));
        await a.getByRole('button', { name: /OK/ }).click();
        await page.waitForTimeout(80);
    }
}

// Divisions 1 à 3 seulement : passer à 4 divisions ajoute une division 4 vide, sans rien perdre
const snapshot = page => page.evaluate(() => {
    const p = championship.days[2].pools;
    const pick = o => o && Object.fromEntries([1, 2, 3].map(d => [d, o[d]]));
    const fp = p.manualFinalPhase;
    return JSON.stringify({ divisions: pick(p.divisions), final: fp && { enabled: fp.enabled, currentRound: fp.currentRound, divisions: pick(fp.divisions) }, enabled: p.enabled });
});
const summary = page => page.evaluate(() => {
    const p = championship.days[2].pools;
    const fp = p.manualFinalPhase;
    return {
        enabled: p.enabled,
        pools: Object.fromEntries(Object.entries(p.divisions || {}).map(([d, v]) => [d, (v.pools || []).length])),
        poolMatches: Object.fromEntries(Object.entries(p.divisions || {}).map(([d, v]) => [d, (v.matches || []).filter(m => m.completed).length])),
        finalRounds: fp ? Object.fromEntries(Object.entries(fp.divisions || {}).map(([d, v]) => [d, Object.keys(v.rounds || {}).join('+')])) : null,
        finalPlayed: fp ? Object.values(fp.divisions || {}).flatMap(v => Object.values(v.rounds || {})).flatMap(r => r.matches).filter(m => m.completed).length : 0,
    };
});

async function scenario(browser, name, { confirm = false }, fn) {
    step(name);
    const context = await browser.newContext({ viewport: { width: 1300, height: 900 } });
    const page = await context.newPage();
    const errors = [];
    const dialogs = [];
    page.on('pageerror', e => errors.push(e.message + (process.env.STACK ? ' @ ' + (e.stack || '').split('\n').slice(1, 4).join(' ') : '')));
    page.on('dialog', d => { dialogs.push(d.message().replace(/\s+/g, ' ').slice(0, 140)); confirm ? d.accept() : d.dismiss(); });
    try {
        await setup(page);
        const before = await snapshot(page);
        const beforeSummary = await summary(page);
        const setupErrors = errors.splice(0);
        if (setupErrors.length) bad('erreur JS pendant la préparation : ' + setupErrors.join(' | '));
        dialogs.length = 0;
        await fn(page, { before, beforeSummary, errors, dialogs });
        await dismissAlerts(page);
        if (dialogs.length) log.push('    ℹ️ confirm : ' + dialogs.join(' || '));
        check(errors.length === 0, 'aucune erreur JS' + (errors.length ? ' : ' + [...new Set(errors)].join(' | ') : ''));
    } catch (e) {
        bad('scénario interrompu : ' + e.message.split('\n')[0]);
    }
    await context.close();
}

async function setDivisions(page, n) {
    await page.selectOption('#divisionConfig', String(n));
    await page.waitForTimeout(300);
    await dismissAlerts(page);
}

(async () => {
    fs.mkdirSync(OUT, { recursive: true });
    const browser = await openBrowser(launchOptions());

    await scenario(browser, 'Divisions 3 → 2 → 3 : poules et phase finale intactes', { confirm: true }, async (page, { before }) => {
        await setDivisions(page, 2);
        await page.evaluate(() => { updatePoolsDisplay(2); });
        await setDivisions(page, 3);
        check(await snapshot(page) === before, 'données identiques après aller-retour');
        check(await page.locator('#division2-1-matches .pool-card').count() === 2, 'poules D1 toujours affichées');
    });

    await scenario(browser, 'Divisions 3 → 4 : existant intact, poules et phase finale possibles en D4', { confirm: true }, async (page, { before }) => {
        page.removeAllListeners('dialog');
        page.on('dialog', d => (/existent déjà/.test(d.message()) ? d.dismiss() : d.accept()));
        await setDivisions(page, 4);
        check(await snapshot(page) === before, 'données intactes après passage à 4');
        await page.evaluate(() => {
            championship.days[2].players[4] = ['K1', 'K2', 'K3', 'K4', 'K5', 'K6', 'K7', 'K8'].map(name => ({ name, club: '' }));
            saveToLocalStorage(); updatePlayersDisplay(2);
        });
        await page.evaluate(() => generatePools(2));
        await dismissAlerts(page);
        const d4 = await page.evaluate(() => (championship.days[2].pools.divisions[4] || { pools: [] }).pools.length);
        check(d4 === 2, `poules générées en D4 (${d4})`);
        const kept = await page.evaluate(() => championship.days[2].pools.divisions[1].matches.filter(m => m.completed).length);
        check(kept === 12, `« seulement D4 » : résultats de poule D1 gardés (${kept}/12)`);
        // Poules D4 jouées → « Phase finale » : refuser « toutes les divisions », accepter « seulement D4 »
        await page.evaluate(() => {
            championship.days[2].pools.divisions[4].matches.forEach(mt => Object.assign(mt, { score1: 11, score2: 4, completed: true, winner: mt.player1 }));
            saveToLocalStorage(); updatePoolsDisplay(2);
        });
        page.removeAllListeners('dialog');
        page.on('dialog', d => (/existe déjà|existent déjà/.test(d.message()) ? d.dismiss() : d.accept()));
        const finalD1Before = await page.evaluate(() => JSON.stringify(championship.days[2].pools.manualFinalPhase.divisions[1]));
        await page.evaluate(() => generateFinalPhase(2));
        await dismissAlerts(page);
        const fp = await page.evaluate(() => ({
            d1: JSON.stringify(championship.days[2].pools.manualFinalPhase.divisions[1]),
            d4: Object.keys(championship.days[2].pools.manualFinalPhase.divisions[4].rounds || {}),
        }));
        check(fp.d1 === finalD1Before, 'phase finale D1 intacte');
        check(fp.d4.length > 0, 'phase finale créée en D4 : ' + fp.d4.join('+'));
        // Saisie d'un score de phase finale D1 avec 4 divisions
        await page.evaluate(() => {
            const r = Object.values(championship.days[2].pools.manualFinalPhase.divisions[1].rounds)[0];
            const m = r.matches.find(x => !x.completed && !x.isBye);
            if (m) updateManualMatchScore(m.id, 'score1', '11', 2);
        });
    });

    await scenario(browser, 'Divisions 3 → 1 : rien ne casse, D2 masquée puis retrouvée', { confirm: true }, async (page, { before }) => {
        await setDivisions(page, 1);
        await page.evaluate(() => { updatePoolsDisplay(2); updateManualFinalPhaseDisplay(2); });
        await setDivisions(page, 3);
        check(await snapshot(page) === before, 'données identiques après 3 → 1 → 3');
    });

    await scenario(browser, 'Décocher « Activer le mode Poules » puis refuser', { confirm: false }, async (page, { before, dialogs }) => {
        await page.locator('#pool-enabled-2').click();
        await page.waitForTimeout(200);
        check(dialogs.length > 0, 'une confirmation est demandée');
        check(await snapshot(page) === before, 'poules et phase finale intactes');
        check(await page.locator('#pool-enabled-2').isChecked(), 'case restée cochée');
    });

    await scenario(browser, 'Décocher puis recocher « Activer » (en acceptant) : données retrouvées', { confirm: true }, async (page, { beforeSummary }) => {
        await page.locator('#pool-enabled-2').uncheck();
        await page.waitForTimeout(150);
        await page.locator('#pool-enabled-2').check();
        await page.waitForTimeout(150);
        const s = await summary(page);
        check(JSON.stringify(s.pools) === JSON.stringify(beforeSummary.pools), `poules retrouvées (${JSON.stringify(s.pools)})`);
    });

    await scenario(browser, '« Générer les poules » à nouveau puis refuser', { confirm: false }, async (page, { before, dialogs }) => {
        await page.evaluate(() => generatePools(2));
        check(dialogs.length > 0, 'une confirmation est demandée');
        check(await snapshot(page) === before, 'poules et phase finale intactes');
    });

    await scenario(browser, 'Phase finale regénérée (acceptée) : plus aucun ancien tour', { confirm: true }, async (page) => {
        // Pousser D1 jusqu'aux demies, puis regénérer
        await page.evaluate(() => {
            const div = championship.days[2].pools.manualFinalPhase.divisions[1];
            Object.values(div.rounds).forEach(r => { r.matches.forEach(m => Object.assign(m, { score1: 11, score2: 3, completed: true, winner: m.player1 })); r.completed = true; });
            generateNextManualRound(2, 1, Object.keys(div.rounds)[0]);
        });
        await dismissAlerts(page);
        const roundsBefore = await page.evaluate(() => Object.keys(championship.days[2].pools.manualFinalPhase.divisions[1].rounds));
        await page.evaluate(() => generateFinalPhase(2));
        await dismissAlerts(page);
        const after = await page.evaluate(() => {
            const r = championship.days[2].pools.manualFinalPhase.divisions[1].rounds;
            return { names: Object.keys(r), played: Object.values(r).flatMap(x => x.matches).filter(m => m.completed && !m.isBye).length };
        });
        check(after.names.length === 1 && after.played === 0, `un seul premier tour, vierge (avant : ${roundsBefore.join('+')} ; après : ${after.names.join('+')}, ${after.played} joué)`);
    });

    await scenario(browser, '« Phase finale » à nouveau (après rechargement) puis refuser', { confirm: false }, async (page, { before, dialogs }) => {
        await page.reload();
        await page.waitForTimeout(800);
        await page.evaluate(() => switchTab(2));
        await page.evaluate(() => generateFinalPhase(2));
        await page.waitForTimeout(200);
        check(await snapshot(page) === before, 'phase finale intacte' + (dialogs.length ? '' : ' (aucune confirmation demandée)'));
    });

    await scenario(browser, '« Élimination directe » puis refuser', { confirm: false }, async (page, { before }) => {
        await page.evaluate(() => generateDirectFinalPhase(2));
        check(await snapshot(page) === before, 'données intactes');
    });

    await scenario(browser, '« Élimination directe » acceptée : la confirmation prévient que la phase finale en cours sera remplacée', { confirm: true }, async (page, { dialogs }) => {
        await page.evaluate(() => generateDirectFinalPhase(2));
        check(dialogs.some(d => /remplac|effac|existe/i.test(d)), 'le message parle de la phase finale existante : ' + (dialogs[0] || '(aucun)'));
    });

    await scenario(browser, '« Depuis les classements » appliqué puis refuser', { confirm: false }, async (page, { before, dialogs }) => {
        await page.evaluate(() => showImportPoolRankingsModal(2));
        await page.locator('#poolInput_0').fill('X1\nX2\nX3\nX4');
        await page.evaluate(() => applyImportPoolRankings(2));
        await page.waitForTimeout(200);
        check(dialogs.length > 0, 'une confirmation est demandée');
        check(await snapshot(page) === before, 'données intactes');
    });

    await scenario(browser, '« Finale de saison » puis refuser', { confirm: false }, async (page, { before }) => {
        await page.evaluate(() => generateSeasonFinalPhase(2));
        await page.waitForTimeout(200);
        check(await snapshot(page) === before, 'données intactes');
    });

    await scenario(browser, '« 🎯 Matchs ▾ » Round-Robin sur une journée en mode Poules', { confirm: false }, async (page, { before }) => {
        await page.evaluate(() => generateMatchesForDay(2));
        await page.waitForTimeout(200);
        check(await snapshot(page) === before, 'poules et phase finale intactes');
    });

    await scenario(browser, 'Passer la journée en Courses puis revenir en Matchs', { confirm: true }, async (page, { before }) => {
        await page.selectOption('#day-type-select-2', 'chrono');
        await page.waitForTimeout(300);
        await dismissAlerts(page);
        await page.selectOption('#day-type-select-2', 'championship');
        await page.waitForTimeout(300);
        await dismissAlerts(page);
        check(await snapshot(page) === before, 'données intactes');
    });

    await scenario(browser, 'Ajouter puis supprimer une autre journée : poules de J2 intactes', { confirm: true }, async (page, { before }) => {
        await page.evaluate(() => addNewDay());
        await page.waitForTimeout(200);
        await page.evaluate(() => removeDay(3));
        await page.waitForTimeout(300);
        await dismissAlerts(page);
        check(await snapshot(page) === before, 'données identiques');
    });

    await scenario(browser, '« Finale de saison » acceptée : confirmation de remplacement avant la question du nombre', { confirm: false }, async (page, { before, dialogs }) => {
        await page.evaluate(() => generateSeasonFinalPhase(2));
        await page.waitForTimeout(200);
        check(dialogs.length > 0 && /existe déjà/.test(dialogs[0]), 'première question = phase finale existante : ' + (dialogs[0] || '(aucune)'));
        check(await snapshot(page) === before, 'données intactes');
    });

    await scenario(browser, 'Phase finale « Depuis les classements » puis divisions 3 → 1 → 4 → 2 : tableau intact et jouable', { confirm: true }, async (page) => {
        await page.evaluate(() => showImportPoolRankingsModal(2));
        await page.locator('#poolInput_0').fill('R1\nR2\nR3\nR4\nR5');
        await page.locator('#poolInput_1').fill('S1\nS2\nS3\nS4\nS5');
        await page.evaluate(() => applyImportPoolRankings(2));
        await dismissAlerts(page);
        const ref = await page.evaluate(() => JSON.stringify(championship.days[2].pools.manualFinalPhase.divisions[1]));
        check(JSON.parse(ref).qualified.length === 10, '10 joueurs dans le tableau');
        for (const n of [1, 4, 2]) {
            await setDivisions(page, n);
            await page.evaluate(() => { updatePoolsDisplay(2); updateManualFinalPhaseDisplay(2); });
        }
        check(await page.evaluate(() => JSON.stringify(championship.days[2].pools.manualFinalPhase.divisions[1])) === ref, 'tableau D1 identique');
        check(await page.locator('#division2-1-matches .fp-round').count() > 0, 'tableau affiché');
        // Jouer un match du tableau avec 2 divisions
        const done = await page.evaluate(() => {
            const r = Object.values(championship.days[2].pools.manualFinalPhase.divisions[1].rounds)[0];
            const m = r.matches.find(x => !x.isBye);
            updateManualMatchScore(m.id, 'score1', '11', 2);
            updateManualMatchScore(m.id, 'score2', '6', 2);
            return m.score1 === '11' && m.score2 === '6';
        });
        check(done, 'score saisi dans le tableau après les changements');
    });

    await scenario(browser, 'Rechargement : tout est restauré', { confirm: true }, async (page, { before }) => {
        await page.reload();
        await page.waitForTimeout(800);
        check(await snapshot(page) === before, 'données identiques après rechargement');
    });

    fs.writeFileSync(path.join(OUT, 'rapport.txt'), log.join('\n') + '\n');
    await browser.close();
    console.log(problems.length ? `\n❌ ${problems.length} problème(s)` : '\n✅ Aucune perte de données');
    process.exit(problems.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
