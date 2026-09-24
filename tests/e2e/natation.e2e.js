// ============================================
// Test de bout en bout d'une journée natation, piloté par l'interface
// (vrais clics / vraies touches dans un vrai navigateur).
//
//   npm run test:e2e                  (navigateur invisible)
//   HEADED=1 npm run test:e2e         (fenêtre visible, au ralenti)
//   CHROME_PATH=/chemin/chrome npm run test:e2e
//
// Données : les 150 lignes réelles de jsondetest/natation test 2.json
// (« Club Nom Prénom 25 M Brasse 0:00:35 »).
// Captures d'écran et rapport : tests/e2e/output/ (non versionné).
// Code de sortie 1 si un contrôle échoue — à lancer avant chaque compétition.
// Voir DEVLOG.md (2026-09-24) : ce scénario a révélé 4 bugs réels.
// ============================================
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.join(__dirname, '..', '..');
const APP = pathToFileURL(path.join(ROOT, 'index.html')).href;
const OUT = path.join(__dirname, 'output');
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'jsondetest', 'natation test 2.json'), 'utf8'));
const LINES = Object.values(DATA.championship.days['1'].players)
    .flat().map(p => (typeof p === 'string' ? p : p.name));
const EVENTS = ['50m brasse', '50m dos', '50m libre', '50m assisté', '25m brasse', '25m dos', '25m libre', '25m assisté'];
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

async function btn(page, name) {
    await page.getByRole('button', { name, exact: true }).filter({ visible: true }).first().click();
    await page.waitForTimeout(250);
}
const state = (page, fn, arg) => page.evaluate(fn, arg);
const visibleText = async (page) => (await page.locator('body').innerText()).replace(/\s+/g, ' ');
let shot = 0;
const snap = (page, name) => page.screenshot({ path: path.join(OUT, String(++shot).padStart(2, '0') + '-' + name + '.png') });

async function openFresh(browser) {
    const context = await browser.newContext({ viewport: { width: 1400, height: 1000 }, acceptDownloads: true });
    const page = await context.newPage();
    const jsErrors = [];
    const dialogs = [];
    page.on('pageerror', e => jsErrors.push(e.message));
    page.on('dialog', d => { dialogs.push(d.type() + ': ' + d.message().slice(0, 200)); d.accept(); });
    await page.goto(APP);
    await page.waitForTimeout(800);
    return { context, page, jsErrors, dialogs };
}

(async () => {
    fs.mkdirSync(OUT, { recursive: true });
    fs.readdirSync(OUT).forEach(f => fs.unlinkSync(path.join(OUT, f)));
    const browser = await chromium.launch(launchOptions());
    const { context, page, jsErrors, dialogs } = await openFresh(browser);

    const serieOf = (id) => state(page, (sid) => {
        for (const e of championship.days[1].chronoData.events) {
            const s = (e.series || []).find(x => x.id === sid);
            if (s) return JSON.parse(JSON.stringify(s));
        }
        return null;
    }, id);
    const race = () => state(page, () => {
        const s = raceData.currentSerie;
        return s && { running: s.isRunning, time: s.currentTime, ps: s.participants.map(p => ({ lane: p.laneNumber, name: p.name, bib: p.bib, status: p.status, finish: p.finishTime })) };
    });
    const byLane = (r, lane) => r.ps.find(p => p.lane === lane);
    const laneBox = (lane) => page.locator('#lane-' + lane);

    // ---------------------------------------------------------------
    step('1. Journée 1 → mode Courses (sélecteur)');
    await page.selectOption('#day-type-select-1', 'chrono');
    await page.waitForTimeout(500);
    check(await state(page, () => championship.days[1].dayType === 'chrono'), 'J1 en mode Courses');

    step(`2. Ajouter les ${LINES.length} nageurs (➕ Ajouter, collage des lignes brutes)`);
    await btn(page, '➕ Ajouter');
    await page.fill('#bulk-participants-1', LINES.join('\n'));
    await btn(page, '💾 Ajouter');
    const nPart = await state(page, () => championship.days[1].chronoData.participants.length);
    check(nPart === LINES.length, `participants disponibles : ${nPart}/${LINES.length}`);

    step('3. Créer les 8 épreuves (🎯 Épreuve)');
    for (const name of EVENTS) {
        await btn(page, '🎯 Épreuve');
        await page.fill('#eventName-1', name);
        await btn(page, 'Sauvegarder');
    }
    const evNames = await state(page, () => championship.days[1].chronoData.events.map(e => e.name));
    check(JSON.stringify(evNames) === JSON.stringify(EVENTS), 'épreuves créées : ' + evNames.join(', '));

    step('4. 🏊 Séries natation : aperçu puis génération (5 couloirs)');
    await btn(page, '🏊 Séries natation');
    await page.selectOption('#swimSourceDay', '1');
    await page.selectOption('#swimTargetDay', '1');
    await page.selectOption('#swimLanesPerSerie', '5');
    await btn(page, '👁️ Aperçu');
    const preview = (await page.textContent('#swimPreviewContent')).replace(/\s+/g, ' ');
    const nonParsed = preview.match(/Non parsées :(.*?)(⚠️|$)/);
    ok('aperçu : ' + preview.slice(0, 70) + '…' + (nonParsed ? ' | non parsées : ' + nonParsed[1].trim() : ''));
    await snap(page, 'apercu-import');
    await btn(page, '🏊 Générer séries');
    await page.waitForTimeout(500);
    const gen = await state(page, () => {
        const cd = championship.days[1].chronoData;
        const series = cd.events.flatMap(e => (e.series || []).map(s => ({ ev: e.name, id: s.id, name: s.name, n: s.participants.length, distance: s.distance, lanes: s.participants.map(p => p.laneNumber) })));
        return { series, placed: series.reduce((t, s) => t + s.n, 0) };
    });
    ok(`${gen.series.length} séries générées, ${gen.placed}/${LINES.length} nageurs placés (1 ligne sans distance dans les données)`);
    check(gen.series.every(s => new Set(s.lanes).size === s.lanes.length && s.lanes.every(Boolean)), 'chaque nageur a un couloir distinct dans sa série');
    check(gen.series.every(s => s.distance === parseInt(s.ev, 10)), 'distance de chaque série = distance de l\'épreuve (25 / 50 m)');
    await snap(page, 'series-generees');

    const brasse50 = gen.series.filter(s => s.ev === '50m brasse');
    const serieA = brasse50[0];
    const serieB = brasse50[1];

    // ---------------------------------------------------------------
    step(`5. 👥 « ${serieA.ev} / ${serieA.name} » : couloirs affichés = couloirs générés`);
    await page.click(`button[onclick="manageSerieParticipants(1, ${serieA.id})"]`);
    await page.waitForTimeout(300);
    const modalText = (await page.locator('[id^="participantsModal"]').first().textContent()).replace(/\s+/g, ' ');
    const sA = await serieOf(serieA.id);
    check(sA.participants.every(p => modalText.includes('Couloir ' + p.laneNumber)), 'badges « Couloir N » présents pour les ' + sA.participants.length + ' nageurs');
    await btn(page, 'Fermer');

    // ---------------------------------------------------------------
    step(`6. Course 1 (${serieA.name}) : clics sur les couloirs, mauvais clic annulé, DNS`);
    await page.click(`button[onclick="startChronoRaceForDay(1, ${serieA.id})"]`);
    await page.waitForTimeout(400);
    let r = await race();
    check(JSON.stringify(r.ps.map(p => p.lane + ':' + p.name).sort()) === JSON.stringify(sA.participants.map(p => p.laneNumber + ':' + p.name).sort()),
        'la course reprend exactement les nageurs et couloirs de la série');
    check((await page.locator('#raceInterface').innerText()).includes('Distance: 50m'), 'écran de course : « Distance: 50m »');
    // Avant le départ : le tableau montre le COULOIR (pas le dossard), dans l'ordre du bassin
    const firstCol = await page.locator('#participantsTableBody tr').evaluateAll(trs => trs.map(tr => tr.cells[0].textContent.trim()));
    const header0 = (await page.locator('#raceInterface thead th').first().textContent()).trim();
    check(header0 === 'Couloir' && JSON.stringify(firstCol) === JSON.stringify(sA.participants.map(p => String(p.laneNumber)).sort()),
        'avant le départ : colonne « Couloir » triée dans l\'ordre du bassin (' + firstCol.join(', ') + ')');
    await page.click('#startStopBtn');
    await page.waitForTimeout(1200);
    check((await page.locator('[id^="lane-"]').count()) === sA.participants.length, 'un bouton par couloir');
    // Gros boutons : « COULOIR » + numéro + nom, pas de dossard pris pour un couloir
    const buttonsOk = await page.locator('[id^="lane-"]').evaluateAll((els, parts) => els.every(el => {
        const lane = el.id.replace('lane-', '');
        const p = parts.find(x => String(x.laneNumber) === lane);
        const divs = [...el.querySelectorAll('div')].map(d => d.textContent.trim());
        return /couloir/i.test(el.textContent) && divs.includes(lane) && divs.includes(p.name)
            && (String(p.bib) === lane || !divs.includes(String(p.bib)));
    }), sA.participants);
    check(buttonsOk, 'gros boutons : légende « Couloir », bon numéro et bon nageur, sans dossard ambigu');
    await snap(page, 'boutons-couloirs');
    const order = sA.participants.map(p => p.laneNumber);
    await laneBox(order[0]).click(); await page.waitForTimeout(400);
    await laneBox(order[1]).click(); await page.waitForTimeout(400);
    const wrong = order[order.length - 1];
    await laneBox(wrong).click(); await page.waitForTimeout(300);
    await page.click('button:has-text("Historique")');
    await page.locator('#raceActionHistoryPanel button:has-text("Annuler")').first().click();
    await page.waitForTimeout(300);
    r = await race();
    check(byLane(r, wrong).status === 'running', `mauvais clic sur le couloir ${wrong} annulé : nageur de nouveau en course`);
    await page.evaluate(() => toggleActionHistoryPanel());
    const dnsLane = order[2];
    await page.locator(`#participant-${byLane(r, dnsLane).bib} button:has-text("DNS")`).click();
    await page.waitForTimeout(300);
    for (const lane of order.slice(3)) { await page.waitForTimeout(500); await laneBox(lane).click(); }
    await page.waitForTimeout(300);
    r = await race();
    check(byLane(r, dnsLane).status === 'dns', `couloir ${dnsLane} marqué DNS`);
    check(!r.running, 'chrono général arrêté automatiquement à la dernière arrivée (malgré le DNS)');
    await snap(page, 'course1-terminee');
    await btn(page, '🏁 Terminer la Série');
    await page.waitForTimeout(400);
    const sA2 = await serieOf(serieA.id);
    check(sA2.status === 'completed' && (sA2.results || []).length === 4, 'série 1 terminée, 4 résultats (DNS exclu)');

    // ---------------------------------------------------------------
    const sB = await serieOf(serieB.id);
    step(`7. Course 2 (${serieB.name}) : clavier, second écran, rechargement en pleine course, DISQ après arrivée`);
    await page.click(`button[onclick="startChronoRaceForDay(1, ${serieB.id})"]`);
    await page.waitForTimeout(400);
    await page.click('#startStopBtn');
    await page.waitForTimeout(1000);
    const orderB = sB.participants.map(p => p.laneNumber);
    await page.keyboard.press(String(orderB[0] % 10)); await page.waitForTimeout(400);
    await page.keyboard.press(String(orderB[1] % 10)); await page.waitForTimeout(300);
    r = await race();
    check(byLane(r, orderB[0]).status === 'finished' && byLane(r, orderB[1]).status === 'finished', 'touches clavier : arrivées enregistrées');
    const beforeReload = { time: r.time, first: byLane(r, orderB[0]).finish };

    const [racePopup] = await Promise.all([context.waitForEvent('page'), btn(page, '🖥️ Afficher')]);
    await racePopup.waitForTimeout(800);
    const racePopupText = (await racePopup.textContent('body')).replace(/\s+/g, ' ');
    check(sB.participants.every(p => racePopupText.includes(p.name)), '🖥️ Afficher (course) : tous les nageurs visibles sur le second écran');
    await racePopup.close();

    await page.reload();
    await page.waitForTimeout(1500);
    await page.click(`button[onclick="startChronoRaceForDay(1, ${serieB.id})"]`);
    await page.waitForTimeout(1200);
    r = await race();
    check(byLane(r, orderB[0]).finish === beforeReload.first, 'après rechargement : arrivées déjà saisies conservées');
    const t1 = r.time; await page.waitForTimeout(1000); const t2 = (await race()).time;
    check(r.running && t2 > t1 && t1 >= beforeReload.time, 'après rechargement : le chrono tourne toujours, sans repartir de zéro');
    for (const lane of orderB.slice(2)) { await page.keyboard.press(String(lane % 10)); await page.waitForTimeout(300); }
    r = await race();
    check(r.ps.every(p => p.status === 'finished') && !r.running, 'course 2 : tous arrivés, chrono arrêté au dernier');
    const winnerB = r.ps.slice().sort((a, b) => a.finish - b.finish)[0];
    await page.locator(`#participant-${winnerB.bib} button[title="Éditer le temps"]`).click();
    await page.waitForTimeout(300);
    await page.click('#editTimeModal button[onclick*="disqualifyFromEditTimeModal"]');
    await page.waitForTimeout(300);
    check((await race()).ps.find(p => p.bib === winnerB.bib).status === 'disq', `vainqueur (${winnerB.name}) disqualifié après son arrivée via ✏️ → Disqualifier`);
    await btn(page, '🏁 Terminer la Série');
    await page.waitForTimeout(400);

    // ---------------------------------------------------------------
    step('8. 🏆 Classement de la série 1');
    await page.click(`button[onclick="showSerieRanking(1, ${serieA.id})"]`);
    await page.waitForTimeout(400);
    const finishedA = sA2.participants.filter(p => p.status === 'finished').sort((a, b) => a.finishTime - b.finishTime).map(p => p.name);
    const rankText = await visibleText(page);
    const pos = finishedA.map(n => rankText.indexOf(n));
    check(pos.every(p => p >= 0) && pos.every((p, i) => i === 0 || p > pos[i - 1]), 'classement de série dans l\'ordre des temps : ' + finishedA.join(' > '));
    await page.evaluate(() => typeof closeRankingModal === 'function' && closeRankingModal(1));

    // ---------------------------------------------------------------
    step('9. Classement par épreuve (onglets 🏅 Multisport et 🏆 Classement)');
    // Attendu : les séries 1 et 2 du 50m brasse regroupées, classées au temps, DISQ/DNS non classés
    const expected = await state(page, (ids) => {
        const evt = championship.days[1].chronoData.events.find(e => e.name === '50m brasse');
        const rows = [];
        evt.series.filter(s => ids.includes(s.id)).forEach(s => s.participants.forEach(p => {
            if (p.status === 'finished') rows.push({ name: p.name, time: p.finishTime, serie: s.name });
        }));
        return rows.sort((a, b) => a.time - b.time);
    }, [serieA.id, serieB.id]);
    for (const tab of ['🏅 Multisport', '🏆 Classement']) {
        await page.getByText(tab, { exact: true }).filter({ visible: true }).first().click();
        await page.waitForTimeout(700);
        const txt = await visibleText(page);
        check(txt.includes('Classement par épreuve') && !txt.includes('Classement Général des Courses'), `${tab} : classement par épreuve, sans classement général`);
        if (tab.includes('Multi')) {
            const card = page.locator('.event-ranking', { hasText: '50m brasse' }).filter({ visible: true }).first();
            const rows = await card.locator('tbody tr').allInnerTexts();
            const ranked = rows.map(t => t.split('\t')).filter(c => /^\D*\d+$/.test(c[0].trim())).map(c => c[1].trim());
            check(JSON.stringify(ranked) === JSON.stringify(expected.map(e => e.name)),
                '50m brasse : séries 1 et 2 regroupées et classées au temps (' + ranked.length + ' nageurs)');
            const disqRow = rows.map(t => t.split('\t')).find(c => c[1] && c[1].trim() === winnerB.name);
            check(!!disqRow && disqRow[0].trim() === 'DISQ', `${winnerB.name} listé « DISQ », non classé`);
            check(/\d,\d\ds/.test(rows.join(' ')), 'temps affichés au centième');
            check(/Marthe Et Marie|Boulaie|Carpe Mosane|Apris/.test(rows.join(' ')), 'clubs affichés');
            check(!txt.includes('barème commun'), 'encadré « barème Matchs + Courses » masqué');
            await snap(page, 'classement-par-epreuve');

            const [live] = await Promise.all([context.waitForEvent('page'), btn(page, '📺 Afficher')]);
            await live.waitForTimeout(800);
            const liveText = (await live.locator('body').innerText()).replace(/\s+/g, ' ');
            check(liveText.includes('50m brasse') && liveText.includes(expected[0].name), '📺 Afficher : classement par épreuve sur le second écran');
            await live.screenshot({ path: path.join(OUT, 'second-ecran-classement.png') });
            await live.close();

            const [printWin] = await Promise.all([context.waitForEvent('page'), btn(page, '🖨️ Imprimer')]);
            await printWin.waitForTimeout(800);
            const printText = (await printWin.locator('body').innerText()).replace(/\s+/g, ' ');
            check(printText.includes('Résultats par épreuve') && printText.includes('50m brasse'), '🖨️ Imprimer : résultats par épreuve');
            await printWin.close();
        }
    }
    await page.getByText('Journée 1', { exact: true }).first().click();
    await page.waitForTimeout(500);

    // ---------------------------------------------------------------
    step('10. 💾 Exporter la journée, puis 📥 Importer dans un navigateur vierge');
    const [download] = await Promise.all([page.waitForEvent('download'), btn(page, '💾 Exporter')]);
    const file = path.join(OUT, 'export-J1.json');
    await download.saveAs(file);
    ok('fichier exporté : ' + download.suggestedFilename() + ' (' + Math.round(fs.statSync(file).size / 1024) + ' Ko)');
    const snapshotOf = (p) => p.evaluate(() => championship.days[1].chronoData.events.map(e => ({
        name: e.name,
        series: (e.series || []).map(s => ({ name: s.name, status: s.status, lanes: s.participants.map(x => x.laneNumber + ':' + x.name + ':' + x.status).join('|'), results: (s.results || []).map(x => x.name + '@' + x.time).join('|') })),
    })));
    const orig = await snapshotOf(page);
    const fresh = await openFresh(browser);
    await fresh.page.selectOption('#day-type-select-1', 'chrono');
    await fresh.page.waitForTimeout(400);
    const [chooser] = await Promise.all([fresh.page.waitForEvent('filechooser'), fresh.page.getByRole('button', { name: '📥 Importer', exact: true }).first().click()]);
    await chooser.setFiles(file);
    await fresh.page.waitForTimeout(1200);
    check(JSON.stringify(await snapshotOf(fresh.page)) === JSON.stringify(orig), 'réimport : épreuves, séries, couloirs, statuts et résultats identiques');
    check(fresh.jsErrors.length === 0, 'réimport : aucune erreur JavaScript' + (fresh.jsErrors.length ? ' : ' + fresh.jsErrors.join(' | ') : ''));
    await fresh.context.close();

    // ---------------------------------------------------------------
    step('11. 🖨️ Imprimer séries');
    const [printPopup] = await Promise.all([context.waitForEvent('page', { timeout: 5000 }).catch(() => null), btn(page, '🖨️ Imprimer séries')]);
    check(!!printPopup, 'fenêtre d\'impression des séries ouverte');
    if (printPopup) {
        await printPopup.waitForTimeout(500);
        const sheet = await printPopup.locator('body').innerText();
        check(sheet.includes('Couloir') && !sheet.includes('undefined'), 'feuille imprimée : colonne Couloir, aucun « undefined »');
        // Mêmes couloirs que les boutons d'arrêt (qui lisent la série de la journée, cf. étape 6)
        const dayLanes = await page.evaluate(() => {
            const cd = championship.days[1].chronoData;
            return cd.events.flatMap(e => getEventSeries(cd, e))
                .map(s => ({ name: s.name, laneMode: !!s.laneMode, lanes: s.participants.map(p => p.laneNumber + ':' + p.name).sort() }));
        });
        const printedLanes = await printPopup.locator('.serie').evaluateAll(blocks => blocks.map(b => {
            const heads = [...b.querySelectorAll('th')].map(th => th.textContent.trim());
            const lc = heads.indexOf('Couloir'), nc = heads.indexOf('Nom');
            return { name: b.querySelector('h3').textContent, lanes: [...b.querySelectorAll('tbody tr')].map(tr => tr.cells[lc].textContent.trim() + ':' + tr.cells[nc].textContent.trim()).sort() };
        }));
        // Comparaison série par série, dans l'ordre (plusieurs épreuves ont une « Série 1 »)
        const laneSeries = dayLanes.filter(s => s.laneMode);
        const mismatches = dayLanes.map((s, i) => ({ s, printed: printedLanes[i] })).filter(({ s, printed }) => s.laneMode
            && (!printed || !printed.name.startsWith(s.name + ' - ') || JSON.stringify(printed.lanes) !== JSON.stringify(s.lanes)));
        check(printedLanes.length === dayLanes.length && laneSeries.length > 0 && mismatches.length === 0,
            `feuille imprimée : couloirs identiques à ceux des boutons d'arrêt (${laneSeries.length} séries)`
            + (mismatches.length ? ' — écarts : ' + mismatches.slice(0, 3).map(m => m.s.name + ' ' + JSON.stringify(m.s.lanes) + ' ≠ ' + JSON.stringify(m.printed && m.printed.lanes)).join(' ; ') : ''));
        await printPopup.close();
    }

    // ---------------------------------------------------------------
    step('Bilan');
    check(jsErrors.length === 0, 'aucune erreur JavaScript' + (jsErrors.length ? ' : ' + jsErrors.join(' | ') : ''));
    fs.writeFileSync(path.join(OUT, 'rapport.txt'), log.join('\n') + '\n\nDIALOGUES:\n' + dialogs.join('\n') + '\n\nERREURS JS:\n' + jsErrors.join('\n'));
    console.log(`\n=== ${problems.length} problème(s) ===` + (problems.length ? '\n' + problems.join('\n') : '') + `\nCaptures et rapport : ${path.relative(ROOT, OUT)}/`);
    await browser.close();
    process.exit(problems.length ? 1 : 0);
})().catch(e => { console.error('ÉCHEC DU SCÉNARIO :', e); process.exit(1); });
