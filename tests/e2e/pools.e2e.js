// ============================================
// Test de bout en bout du mode Poules, piloté par l'interface (vrais clics).
//
//   npm run test:pools                (navigateur invisible)
//   HEADED=1 npm run test:pools       (fenêtre visible, au ralenti)
//
// Couvre : panneau « 🏊 Poules » (ouverture, activation, mode Simple / Avancé),
// génération des poules, saisie de tous les scores de poule au clavier, bouton
// Phase finale activé, génération de la phase finale et des tours suivants
// jusqu'au champion, classement de la journée, rechargement (restauration).
// Captures et rapport : tests/e2e/output-pools/ (non versionné). Code de sortie 1
// si un contrôle échoue.
// ============================================
const { openBrowser } = require('./screens');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.join(__dirname, '..', '..');
const APP = pathToFileURL(path.join(ROOT, 'index.html')).href;
const OUT = path.join(__dirname, 'output-pools');
const HEADED = !!process.env.HEADED;

let dialogsRef = [];
const log = [];
const problems = [];
function step(msg) { log.push('▶ ' + msg); console.log('▶ ' + msg); }
function ok(msg) { log.push('  ✅ ' + msg); console.log('  ✅ ' + msg); }
function bad(msg) { problems.push(msg); log.push('  ❌ ' + msg); console.log('  ❌ ' + msg); }
function check(cond, msg) { cond ? ok(msg) : bad(msg); }

function launchOptions() {
    const base = { headless: !HEADED, slowMo: HEADED ? 100 : 0 };
    if (process.env.CHROME_PATH) return Object.assign(base, { executablePath: process.env.CHROME_PATH });
    if (fs.existsSync('/opt/pw-browsers/chromium')) return Object.assign(base, { executablePath: '/opt/pw-browsers/chromium' });
    return Object.assign(base, { channel: 'chrome' });
}

const state = (page, fn, arg) => page.evaluate(fn, arg);
let shot = 0;
const snap = (page, name) => page.screenshot({ path: path.join(OUT, String(++shot).padStart(2, '0') + '-' + name + '.png'), fullPage: true });

// Ferme les fenêtres appAlert (remplaçantes de window.alert) en notant leur texte
async function dismissAlerts(page, dialogs) {
    for (let i = 0; i < 5; i++) {
        const a = page.locator('.app-alert').last();
        if (!(await a.count()) || !(await a.isVisible())) return;
        dialogs.push('appAlert: ' + (await a.innerText()).replace(/\s+/g, ' ').slice(0, 200));
        await a.getByRole('button', { name: /OK/ }).click();
        await page.waitForTimeout(100);
    }
}

const PLAYERS = ['Alice Martin', 'Bruno Petit', 'Chloé Durand', 'David Leroy', 'Emma Moreau', 'Félix Simon',
    'Gaëlle Laurent', 'Hugo Michel', 'Inès Garcia', 'Jules David', 'Karim Bertrand', 'Léa Roux'];

// Remplit les cases de score de poule encore vides (le joueur 1 gagne 11-x)
async function fillPoolScores(page) {
    let filled = 0;
    for (let guard = 0; guard < 200; guard++) {
        const ids = await state(page, () => championship.days[1].pools.divisions[1].matches
            .filter(m => !m.completed && !m.isByeMatch).map(m => m.id));
        if (!ids.length) break;
        const id = ids[0];
        const inputs = page.locator(`input[onchange*="updatePoolMatchScore(1, '${id}',"]`);
        const n = await inputs.count();
        if (n < 2) { bad('cases de score introuvables pour le match de poule ' + id); return filled; }
        await inputs.nth(0).fill('11');
        await inputs.nth(0).dispatchEvent('change');
        await inputs.nth(1).fill(String(3 + (filled % 7)));
        await inputs.nth(1).dispatchEvent('change');
        await inputs.nth(1).press('Enter');
        await page.waitForTimeout(80);
        await dismissAlerts(page, dialogsRef);
        filled++;
    }
    return filled;
}

(async () => {
    fs.mkdirSync(OUT, { recursive: true });
    fs.readdirSync(OUT).forEach(f => fs.unlinkSync(path.join(OUT, f)));
    const browser = await openBrowser(launchOptions());
    const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
    const page = await context.newPage();
    const jsErrors = [];
    const dialogs = [];
    dialogsRef = dialogs;
    page.on('pageerror', e => jsErrors.push(e.message));
    page.on('dialog', d => { dialogs.push(d.type() + ': ' + d.message().slice(0, 200)); d.accept(); });
    await page.goto(APP);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForTimeout(400);

    step('Ajout de 12 joueurs en division 1 (fenêtre « Ajouter des joueurs »)');
    await page.evaluate(() => showAddPlayerModal(1));
    await page.waitForTimeout(200);
    await page.evaluate(() => setAddPlayerMode && setAddPlayerMode('list'));
    await page.locator('#addPlayerNames').fill(PLAYERS.join('\n'));
    await page.evaluate(() => addPlayerFromModal());
    await page.evaluate(() => closeAddPlayerModal());
    const nPlayers = await state(page, () => (championship.days[1].players[1] || []).length);
    check(nPlayers === 12, `12 joueurs dans la division 1 (${nPlayers})`);

    step('Panneau Poules');
    const poolBtn = page.locator('#show-pool-btn-1');
    check(await poolBtn.isVisible(), 'bouton « 🏊 Poules » visible');
    await poolBtn.click();
    const panel = page.locator('#pool-toggle-1');
    check(await panel.isVisible(), 'panneau ouvert');
    check(await panel.evaluate(el => el.classList.contains('pool-panel')), 'panneau au nouveau style (.pool-panel)');
    await page.locator('#pool-enabled-1').check();
    await page.waitForTimeout(200);
    check(await page.locator('#pool-config-1').isVisible(), 'configuration affichée après activation');
    check(await state(page, () => championship.days[1].pools.enabled === true), 'pools.enabled enregistré');
    await snap(page, 'panneau-simple');

    step('Mode Avancé puis retour au mode Simple');
    await page.locator('.pool-segmented label').nth(1).click();
    check(await page.locator('#advanced-config-1').isVisible() && !(await page.locator('#simple-config-1').isVisible()), 'champs avancés affichés');
    await snap(page, 'panneau-avance');
    await page.locator('.pool-segmented label').nth(0).click();
    check(await page.locator('#simple-config-1').isVisible(), 'champs simples affichés');

    step('Génération des poules (4 joueurs, 2 qualifiés, tous contre tous)');
    await page.selectOption('#pool-size-1', '4');
    await page.selectOption('#qualified-per-pool-1', '2');
    await page.selectOption('#matches-per-player-1', '');
    check(await page.locator('#final-phase-btn-1').isDisabled(), 'Phase finale désactivée avant les poules');
    await page.getByRole('button', { name: /Générer les poules/ }).click();
    await page.waitForTimeout(400);
    const pools = await state(page, () => championship.days[1].pools.divisions[1].pools);
    check(pools.length === 3 && pools.every(p => p.length === 4), `3 poules de 4 (${pools.map(p => p.length).join(', ')})`);
    const nMatches = await state(page, () => championship.days[1].pools.divisions[1].matches.length);
    check(nMatches === 18, `18 matchs de poule (${nMatches})`);
    check(await page.locator('#division1-1-matches .pool-card').count() === 3, '3 cartes de poule affichées');
    await snap(page, 'poules-generees');

    step('Saisie de tous les scores de poule');
    const filled = await fillPoolScores(page);
    const done = await state(page, () => championship.days[1].pools.divisions[1].matches.every(m => m.completed));
    check(done, `tous les matchs de poule terminés (${filled} saisis)`);
    check(await page.locator('#division1-1-matches .pool-card-done').count() === 3, 'cartes de poule marquées terminées');
    check(await page.locator('.pool-qualif-banner').count() > 0, 'bandeau de qualification affiché');
    check(!(await page.locator('#final-phase-btn-1').isDisabled()), 'Phase finale activée');
    await snap(page, 'poules-terminees');

    await dismissAlerts(page, dialogs);
    step('Phase finale');
    await page.locator('#final-phase-btn-1').click();
    await page.waitForTimeout(600);
    const fp = await state(page, () => {
        const f = championship.days[1].pools.manualFinalPhase;
        return f && f.enabled && f.divisions[1] ? { rounds: Object.keys(f.divisions[1].rounds || {}), q: (f.divisions[1].qualified || []).length } : null;
    });
    check(!!fp, 'phase finale créée' + (fp ? ` (${fp.q} qualifiés, tours : ${fp.rounds.join(', ')})` : ''));
    await dismissAlerts(page, dialogs);
    await snap(page, 'phase-finale');

    step('Jouer la phase finale jusqu\'au champion');
    for (let r = 0; r < 8; r++) {
        const pending = await state(page, () => {
            const d = championship.days[1].pools.manualFinalPhase.divisions[1];
            const out = [];
            Object.entries(d.rounds || {}).forEach(([name, round]) => (round.matches || []).forEach(m => {
                if (!m.completed && m.player1 && m.player2 && m.status !== 'bye' && !m.isBye) out.push({ id: m.id, round: name });
            }));
            return { out, champion: (() => { const f = championship.days[1].pools.manualFinalPhase.divisions[1].rounds.Finale; return f && f.completed && f.matches[0] && f.matches[0].completed ? f.matches[0].winner : null; })() };
        });
        log.push('  ℹ️ tour ' + r + ' : ' + JSON.stringify(pending));
        if (pending.champion) break;
        if (!pending.out.length) {
            // Après les demi-finales : petite finale puis finale (boutons dédiés)
            let clicked = false;
            for (const sel of ['button[onclick^="generatePetiteFinale(1, 1)"]', 'button[onclick^="generateFinale(1, 1)"]']) {
                const b = page.locator(sel).first();
                if (await b.count()) { await b.click(); await page.waitForTimeout(300); await dismissAlerts(page, dialogs); clicked = true; }
            }
            if (!clicked) break;
            continue;
        }
        for (const m of pending.out) {
            const inputs = page.locator(`input[onchange*="updateManualMatchScore('${m.id}',"]`);
            if (await inputs.count() < 2) {
                await state(page, ({ id }) => {
                    const d = championship.days[1].pools.manualFinalPhase.divisions[1];
                    Object.values(d.rounds).forEach(round => round.matches.forEach(x => { if (x.id === id) x._noInput = true; }));
                }, m);
                bad(`cases de score introuvables pour le match final ${m.id} (${m.round})`);
                continue;
            }
            await inputs.nth(0).fill('11'); await inputs.nth(0).dispatchEvent('change');
            await inputs.nth(1).fill('6'); await inputs.nth(1).dispatchEvent('change');
            await inputs.nth(1).press('Enter');
            if (process.env.DEBUG_POOLS) log.push('  ℹ️ ' + m.id + ' inputs=' + await inputs.count() + ' ' + JSON.stringify(await state(page, id => { const r = Object.values(championship.days[1].pools.manualFinalPhase.divisions[1].rounds).flatMap(x => x.matches).find(x => x.id === id); return r; }, m.id)));
            await page.waitForTimeout(150);
            await dismissAlerts(page, dialogs);
        }
        const next = page.locator('button[onclick^="generateNextManualRound(1, 1,"]').first();
        if (await next.count()) { await next.click().catch(() => {}); await page.waitForTimeout(400); await dismissAlerts(page, dialogs); }
    }
    log.push('  ℹ️ phase finale : ' + JSON.stringify(await state(page, () => Object.entries(championship.days[1].pools.manualFinalPhase.divisions[1].rounds).map(([k, r]) => [k, r.completed, r.matches.map(m => [m.player1, m.player2, m.completed, m.winner, m.status])]))));
    const champ = await state(page, () => (() => { const f = championship.days[1].pools.manualFinalPhase.divisions[1].rounds.Finale; return f && f.completed && f.matches[0] && f.matches[0].completed ? f.matches[0].winner : null; })());
    check(!!champ, 'champion désigné' + (champ ? ` (${typeof champ === 'string' ? champ : champ.name})` : ''));
    await snap(page, 'champion');

    step('Classement de la journée');
    await page.evaluate(() => updateRankingsForDay(1));
    await page.waitForTimeout(300);
    const rankText = await page.locator('#rankings-1, [id^="rankings"]').first().innerText().catch(() => '');
    check(PLAYERS.some(p => rankText.includes(p)), 'classement affiché avec les joueurs');

    step('Rechargement : restauration');
    await page.reload();
    await page.waitForTimeout(800);
    await page.evaluate(() => switchTab && switchTab(1));
    check(await page.locator('#pool-enabled-1').isChecked(), 'case « Activer » restée cochée');
    check(await page.locator('#division1-1-matches .pool-card').count() === 3, 'poules réaffichées');
    check(await state(page, () => !!(() => { const f = championship.days[1].pools.manualFinalPhase.divisions[1].rounds.Finale; return f && f.completed && f.matches[0] && f.matches[0].completed ? f.matches[0].winner : null; })()), 'champion conservé');
    check(await page.getByText(/champion/i).count() > 0, 'champion affiché après rechargement');
    await snap(page, 'apres-rechargement');

    step('Erreurs JavaScript');
    check(jsErrors.length === 0, 'aucune erreur JS' + (jsErrors.length ? ' : ' + jsErrors.join(' | ') : ''));
    if (dialogs.length) log.push('  ℹ️ boîtes : ' + dialogs.join(' || '));

    fs.writeFileSync(path.join(OUT, 'rapport.txt'), log.join('\n') + '\n');
    await browser.close();
    console.log(problems.length ? `\n❌ ${problems.length} problème(s)` : '\n✅ Mode Poules OK');
    process.exit(problems.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
