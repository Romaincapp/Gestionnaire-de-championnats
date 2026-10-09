// ============================================
// Audit du mode sombre dans un vrai navigateur.
//
//   npm run test:darkmode            (navigateur invisible)
//   HEADED=1 npm run test:darkmode   (fenêtre visible)
//   npm run test:darkmode:mobile     (même audit sur un téléphone)
//
// Charge des données réelles (jsondetest/ : journée Matchs en poules, journée
// natation avec résultats, journée Matchs « classique » avec scores), active le
// mode sombre puis ouvre un à un les écrans, onglets, classements et fenêtres
// (statiques et créées dynamiquement). Sur chaque écran, mesure dans le DOM :
//   - le contraste texte / fond réellement affiché (WCAG, seuil 3:1) ;
//   - les champs (input/select/textarea) restés clairs ;
//   - les grands panneaux à fond clair (> 0.75 de luminance) qui « éblouissent ».
// Les fenêtres d'impression / nouvel onglet (window.open) ne sont pas
// concernées : elles restent volontairement claires pour le papier.
// Captures et rapport : tests/e2e/output-darkmode/. Code de sortie 1 si un
// écran présente un défaut.
// ============================================
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.join(__dirname, '..', '..');
const APP = pathToFileURL(path.join(ROOT, 'index.html')).href;
// --mobile : téléphone (390×844, tactile, user-agent mobile) → les règles
// @media (max-width: 768px) et les mises en page mobiles sont auditées.
const MOBILE = process.argv.includes('--mobile') || !!process.env.MOBILE;
const OUT = path.join(__dirname, MOBILE ? 'output-darkmode-mobile' : 'output-darkmode');
const CONTEXT = MOBILE
    ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
        userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36' }
    : { viewport: { width: 1400, height: 1000 } };
const HEADED = !!process.env.HEADED;
const load = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'jsondetest', f), 'utf8'));

function launchOptions() {
    const base = { headless: !HEADED };
    if (process.env.CHROME_PATH) return Object.assign(base, { executablePath: process.env.CHROME_PATH });
    if (fs.existsSync('/opt/pw-browsers/chromium')) return Object.assign(base, { executablePath: '/opt/pw-browsers/chromium' });
    return Object.assign(base, { channel: 'chrome' });
}

// ---------------------------------------------------------------
// Audit exécuté dans la page : renvoie la liste des défauts visibles.
function auditInPage() {
    function parse(c) {
        const m = c && c.match(/rgba?\(([^)]+)\)/);
        if (!m) return null;
        const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
        return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
    }
    function lum(c) {
        const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
        return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
    }
    function ratio(a, b) { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
    function over(top, bottom) {
        const a = top.a;
        return { r: top.r * a + bottom.r * (1 - a), g: top.g * a + bottom.g * (1 - a), b: top.b * a + bottom.b * (1 - a), a: 1 };
    }
    // Couleur propre d'un élément : background-color, sinon la moyenne des
    // couleurs de son dégradé éventuel.
    function ownBg(el) {
        const cs = getComputedStyle(el);
        const img = cs.backgroundImage;
        if (img && img.includes('gradient')) {
            const stops = (img.match(/rgba?\([^)]+\)/g) || []).map(parse).filter(Boolean);
            if (stops.length) {
                const n = stops.length;
                return { r: stops.reduce((t, s) => t + s.r, 0) / n, g: stops.reduce((t, s) => t + s.g, 0) / n,
                    b: stops.reduce((t, s) => t + s.b, 0) / n, a: stops.reduce((t, s) => t + s.a, 0) / n };
            }
        }
        const c = parse(cs.backgroundColor);
        return c && c.a > 0 ? c : null;
    }
    function effectiveBg(el) {
        const layers = [];
        for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
            const c = ownBg(e);
            if (c) { layers.push(c); if (c.a >= 0.99) break; }
        }
        let base = { r: 26, g: 26, b: 46, a: 1 };
        for (let i = layers.length - 1; i >= 0; i--) base = over(layers[i], base);
        return base;
    }
    function visible(el) {
        if (!el.getClientRects().length) return false;
        for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
            const cs = getComputedStyle(e);
            if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) < 0.15) return false;
        }
        return true;
    }
    function describe(el) {
        const id = el.id ? '#' + el.id : '';
        const cls = typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
        const st = (el.getAttribute('style') || '').replace(/\s+/g, ' ').slice(0, 90);
        return el.tagName.toLowerCase() + id + cls + (st ? ' [style="' + st + '"]' : '');
    }
    const hex = (c) => '#' + [c.r, c.g, c.b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');

    // Racine : la fenêtre au premier plan si elle existe, sinon la page.
    const overlays = [...document.querySelectorAll('body *')].filter(e => {
        const cs = getComputedStyle(e);
        return (cs.position === 'fixed') && visible(e) && e.getBoundingClientRect().width > 250 && e.getBoundingClientRect().height > 150 && !e.classList.contains('notification');
    });
    const root = overlays.length ? overlays[overlays.length - 1] : document.body;

    const issues = [];
    const textCandidates = [];
    const seen = new Set();
    const push = (kind, el, msg) => {
        const key = kind + describe(el) + msg;
        if (seen.has(key)) return;
        seen.add(key);
        issues.push({ kind, el: describe(el), msg });
    };
    const all = [root, ...root.querySelectorAll('*')];
    for (const el of all) {
        if (['SCRIPT', 'STYLE', 'OPTION', 'BR', 'svg', 'path'].includes(el.tagName)) continue;
        if (el.closest('.notification, .app-search-bar, .dark-mode-toggle')) continue;
        if (!visible(el)) continue;
        const cs = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        // 1) Champs
        if (['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)) {
            // Contrôles natifs (calendrier, cases à cocher, liste déroulante du
            // téléphone) dessinés par le système : clairs sans color-scheme: dark.
            if (el.type !== 'hidden' && !/dark/.test(cs.colorScheme)) push('contrôle natif clair', el, 'color-scheme: ' + cs.colorScheme);
            if (['checkbox', 'radio', 'range', 'color', 'file', 'hidden', 'button', 'submit'].includes(el.type)) continue;
            const bg = effectiveBg(el), fg = parse(cs.color);
            if (lum(bg) > 0.6) push('champ clair', el, 'fond ' + hex(bg));
            else if (fg && ratio(over(fg, bg), bg) < 3) push('champ illisible', el, hex(fg) + ' sur ' + hex(bg));
            continue;
        }
        // 2) Grands panneaux clairs
        const own = ownBg(el);
        if (own && own.a > 0.6 && rect.width * rect.height > 6000) {
            const b = effectiveBg(el);
            if (lum(b) > 0.75) push('panneau clair', el, 'fond ' + hex(b) + ' ' + Math.round(rect.width) + 'x' + Math.round(rect.height));
        }
        // 3) Texte
        const text = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim();
        if (!text || !/[A-Za-zÀ-ÿ0-9]/.test(text)) continue;
        const fg = parse(cs.color);
        if (!fg || fg.a === 0) continue;
        const bg = effectiveBg(el);
        const r = ratio(over(fg, bg), bg);
        if (r < 3) textCandidates.push({ el, r, msg: '« ' + text.slice(0, 40) + ' » ' + hex(fg) + ' sur ' + hex(bg) + ' (' + r.toFixed(2) + ':1)' });
    }
    // Un texte déjà peu contrasté en mode clair (ex. blanc sur bouton vert) est un
    // choix de charte, pas un défaut du mode sombre : on ne garde que les textes
    // que le mode sombre rend moins lisibles qu'en mode clair.
    document.body.classList.remove('dark-mode');
    const lightRatios = textCandidates.map(c => {
        const fg = parse(getComputedStyle(c.el).color), bg = effectiveBg(c.el);
        return fg ? ratio(over(fg, bg), bg) : 21;
    });
    document.body.classList.add('dark-mode');
    textCandidates.forEach((c, k) => { if (c.r < lightRatios[k] - 0.1) push('texte peu lisible', c.el, c.msg + ' — mode clair ' + lightRatios[k].toFixed(2) + ':1'); });
    return issues;
}

// ---------------------------------------------------------------
async function main() {
    fs.mkdirSync(OUT, { recursive: true });
    fs.readdirSync(OUT).forEach(f => fs.unlinkSync(path.join(OUT, f)));
    const browser = await chromium.launch(launchOptions());
    const context = await browser.newContext(CONTEXT);
    const page = await context.newPage();
    const jsErrors = [];
    page.on('pageerror', e => jsErrors.push(e.message));
    page.on('dialog', d => d.accept(d.type() === 'prompt' ? d.defaultValue() : undefined));
    // window.open (impression, nouvel onglet) : fenêtres claires volontairement, ignorées.
    await page.addInitScript(() => { window.open = () => null; });
    await page.goto(APP);
    await page.waitForTimeout(600);

    // --- Données : J1 poules, J2 natation (avec résultats), J3 matchs classiques
    const pool = load('MODE POOL TEST.json');
    const swim = load('natation test 2 - CLEAN.json');
    const swimDay = { championship: { config: swim.championship.config, days: { 1: swim.championship.days[2] } } };
    await page.evaluate(([a, b]) => {
        appendDaysToChampionship([{ name: 'pool.json', data: a }, { name: 'natation.json', data: b }]);
    }, [pool, swimDay]);
    await page.evaluate(() => {
        // Résultats saisis pour les 3 premières séries de la natation, avec un DNS / DISQ
        const cd = championship.days[2].chronoData;
        const series = cd.events.flatMap(e => e.series || []).slice(0, 3);
        series.forEach((s, si) => {
            s.results = [];
            s.participants.forEach((p, i) => {
                if (i === 0 && si === 0) { p.status = 'dns'; return; }
                if (i === 1 && si === 0) { p.status = 'disq'; return; }
                p.status = 'finished';
                p.finishTime = 30000 + i * 1530 + si * 100;
                s.results.push({ bib: p.bib, name: p.name, club: p.club, category: p.category, time: p.finishTime, totalDistance: s.distance });
            });
            s.status = 'completed';
        });
        // J3 : matchs classiques avec quelques scores
        addNewDay();
        const d = championship.days[3];
        d.dayType = 'championship';
        const pl = Object.values(championship.days[1].players).flat().slice(0, 6).map(p => typeof p === 'string' ? p : p.name);
        d.players[1] = pl;
        saveToLocalStorage();
    });
    await page.reload();
    await page.waitForTimeout(800);
    await page.evaluate(() => {
        generateMatchesForDay(3);
        const ms = championship.days[3].matches[1] || [];
        ms.slice(0, Math.ceil(ms.length / 2)).forEach((m, i) => {
            m.score1 = i % 3 ? 11 : 7; m.score2 = i % 3 ? 7 : 11; m.completed = true;
            if (m.sets) m.sets.forEach(s => { s.score1 = m.score1; s.score2 = m.score2; });
        });
        saveToLocalStorage();
    });

    // --- Mode sombre via le vrai interrupteur
    await page.reload();
    await page.waitForTimeout(800);
    await page.locator('.dark-mode-toggle').click();
    await page.waitForTimeout(200);
    if (!(await page.evaluate(() => document.body.classList.contains('dark-mode')))) throw new Error('mode sombre non activé');

    const info = await page.evaluate(() => {
        const cd = championship.days[2].chronoData;
        const series = cd.events.flatMap(e => e.series || []);
        const p1 = Object.values(championship.days[1].players).flat()[0];
        const m3 = Object.values(championship.days[3].players).flat()[0];
        return { serie: series[0].id, serie2: series[5].id, event: cd.events[0].id, participant: cd.participants[0] && cd.participants[0].id,
            poolPlayer: typeof p1 === 'string' ? p1 : p1.name, player3: typeof m3 === 'string' ? m3 : m3.name,
            swimmer: series[1].participants[2].name };
    });

    const call = (code) => async () => { await page.evaluate(code); await page.waitForTimeout(600); };
    const click = (sel) => async () => { await page.locator(sel).filter({ visible: true }).first().click(); await page.waitForTimeout(350); };
    const screens = [
        ['accueil-j1-poules', call('switchTab(1)')],
        ['j1-poules-phase-finale', call('switchTab(1); try { generateFinalPhase(1) } catch(e) {}')],
        ['j2-natation-courses', call('switchTab(2)')],
        ['j2-series-depliees', call('switchTab(2); toggleAllSeriesDetails(2)')],
        ['j3-matchs', call('switchTab(3)')],
        ['j3-classement-journee', call('switchTab(3); showRankingsForDay && showRankingsForDay(3)')],
        ['classement-general', call('switchToGeneralRanking()')],
        ['classement-multisport', call('switchToMultisportRanking()')],
        ['modal-ajout-joueurs', call('switchTab(3); showAddPlayerModal(3)')],
        ['modal-ajout-joueurs-sections', call(`switchTab(3); showAddPlayerModal(3); toggleAddPlayerSection('single', true)`)],
        ['modal-ajout-joueurs-clubs', call(`switchTab(3); showAddPlayerModal(3); toggleAddPlayerSection('clubs', true)`)],
        ['modal-saisie-multiple', call(`switchTab(3); document.getElementById('bulkModal').style.display = 'block'`)],
        ['modal-modifier-joueur', call(`switchTab(3); showEditPlayerModal(3, 1, 0, ${JSON.stringify(info.player3)}, '')`)],
        ['modal-import', call('showImportModal()')],
        ['modal-generation-matchs', call('switchTab(3); showMatchGenerationModal(3)')],
        ['modal-bye', call('switchTab(3); showByeManagementModal(3)')],
        ['modal-bye-score', call(`switchTab(3); showByeScoreModal(3, 1, ${JSON.stringify(info.player3)})`)],
        ['modal-impression', call('switchTab(3); showPrintOptionsModal(3)')],
        ['modal-detail-joueur', call(`switchTab(3); showPlayerDetails(3, 1, ${JSON.stringify(info.player3)})`)],
        ['modal-detail-joueur-general', call(`switchToGeneralRanking(); showGeneralPlayerDetails(${JSON.stringify(info.player3)}, 1)`)],
        ['modal-classement-complet', call('switchTab(3); showCompleteDayRanking(3)')],
        ['modal-verif-noms', call('showNameCheckModal()')],
        ['modal-poules-resume-joueur', call(`switchTab(1); showPlayerPoolSummary(1, 1, ${JSON.stringify(info.poolPlayer)})`)],
        ['modal-poules-moduler', call('switchTab(1); showModulatePoolsModal(1)')],
        ['modal-poules-import-classements', call('switchTab(1); showImportPoolRankingsModal(1)')],
        ['modal-poules-ajout-match', call('switchTab(1); showAddPoolMatchModal(1, 1, 0)')],
        ['modal-poules-prerempli', call(`switchTab(1); var m=document.getElementById('poolPreFillStrategyModal'); if (m) m.style.display='block'`)],
        ['modal-chrono-epreuve', call('switchTab(2); showAddEventModalForDay(2)')],
        ['modal-chrono-modifier-epreuve', call(`switchTab(2); editEventForDay(2, ${JSON.stringify(info.event)})`)],
        ['modal-chrono-serie', call(`switchTab(2); showAddSerieModalForDayAndEvent(2, ${JSON.stringify(info.event)})`)],
        ['modal-chrono-participants-manuel', call('switchTab(2); showAddParticipantManualModal(2)')],
        ['modal-chrono-modifier-participant', call(`switchTab(2); editParticipantInfo(2, ${JSON.stringify(info.participant)})`)],
        ['modal-chrono-gerer-participants', call(`switchTab(2); manageSerieParticipants(2, ${JSON.stringify(info.serie)})`)],
        ['modal-chrono-saisie-resultats', call(`switchTab(2); enterSerieResults(2, ${JSON.stringify(info.serie2)})`)],
        ['modal-chrono-classement-serie', call(`switchTab(2); showSerieRanking(2, ${JSON.stringify(info.serie)})`)],
        ['modal-chrono-ajout-serie-participant', call(`switchTab(2); showAddToSerieModal(2, ${JSON.stringify(info.participant)})`)],
        ['modal-chrono-ajout-masse', call('switchTab(2); showBulkAddToSerieModal(2)')],
        ['modal-chrono-import-joueurs', call('switchTab(2); showImportPlayersModal(2)')],
        ['modal-chrono-series-auto', call('switchTab(2); showSwimmingImportModal && showSwimmingImportModal(2)')],
        ['modal-chrono-detail-nageur', call(`switchToMultisportRanking(); showPlayerChronoDetail(encodeURIComponent(${JSON.stringify(info.swimmer)}))`)],
        ['modal-harmonisation-noms', call('switchToMultisportRanking(); showNameHarmonizationModal()')],
        ['modal-import-multi-journees', call('showMultiDayImportModal && showMultiDayImportModal()')],
        ['course-live', call(`switchTab(2); startChronoRaceForDay(2, ${JSON.stringify(info.serie2)})`)],
        ['course-live-chrono-lance', async () => {
            await page.evaluate(`switchTab(2); startChronoRaceForDay(2, ${JSON.stringify(info.serie2)})`);
            await page.waitForTimeout(300);
            await page.evaluate('toggleRaceTimer()');
            await page.waitForTimeout(400);
            await page.evaluate('var p = raceData.currentSerie.participants; finishLane(p[0].laneNumber); markAsDNS(p[1].bib)');
            await page.waitForTimeout(300);
        }],
        ['course-live-historique', async () => {
            await page.evaluate(`switchTab(2); startChronoRaceForDay(2, ${JSON.stringify(info.serie2)})`);
            await page.waitForTimeout(300);
            await page.evaluate('toggleActionHistoryPanel(); showRaceRanking()');
            await page.waitForTimeout(300);
        }],
        ['recherche', call(`switchTab(3); openAppSearch(); onAppSearchInput(${JSON.stringify(info.player3.slice(0, 4))})`)],
        ['notification', call(`showNotification('Test de notification', 'success')`)],
    ];

    const report = [];
    let total = 0;
    let i = 0;
    for (const [name, run] of screens) {
        await page.reload();
        await page.waitForTimeout(500);
        let issues;
        try {
            await run();
            issues = await page.evaluate(auditInPage);
        } catch (e) {
            report.push(`## ${name}\n  ⚠️ écran non ouvert : ${e.message.split('\n')[0]}`);
            console.log(`⚠️  ${name} : ${e.message.split('\n')[0]}`);
            continue;
        }
        await page.screenshot({ path: path.join(OUT, String(++i).padStart(2, '0') + '-' + name + '.png'), fullPage: false });
        total += issues.length;
        console.log(`${issues.length ? '❌' : '✅'} ${name} : ${issues.length} défaut(s)`);
        report.push(`## ${name} (${issues.length})`);
        issues.slice(0, 60).forEach(x => report.push(`  - [${x.kind}] ${x.msg}\n      ${x.el}`));
    }
    // Les données de test chargées ne doivent pas rester dans le navigateur
    await browser.close();
    report.unshift(`Audit mode sombre — ${total} défaut(s)` + (jsErrors.length ? `\nErreurs JS : ${[...new Set(jsErrors)].join(' | ')}` : ''));
    fs.writeFileSync(path.join(OUT, 'rapport.txt'), report.join('\n') + '\n');
    console.log(`\nTotal : ${total} défaut(s). Rapport : ${path.relative(ROOT, path.join(OUT, 'rapport.txt'))}`);
    if (jsErrors.length) console.log('Erreurs JS :', [...new Set(jsErrors)].slice(0, 5));
    process.exit(total ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(2); });
