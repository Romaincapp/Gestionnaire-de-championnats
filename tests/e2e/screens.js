// ============================================
// Données et écrans partagés par les audits en vrai navigateur
// (darkmode.e2e.js, a11y.e2e.js) : charge des données réelles anonymisées
// (tests/fixtures/ : journée Matchs en poules, journée natation avec
// résultats, journée Matchs « classique » avec scores), puis décrit la liste
// des écrans, onglets et fenêtres à ouvrir un à un.
// ============================================
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.join(__dirname, '..', '..');
const APP = pathToFileURL(path.join(ROOT, 'index.html')).href;
const HEADED = !!process.env.HEADED;
const load = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'tests', 'fixtures', f), 'utf8'));

function launchOptions() {
    const base = { headless: !HEADED };
    if (process.env.CHROME_PATH) return Object.assign(base, { executablePath: process.env.CHROME_PATH });
    if (fs.existsSync('/opt/pw-browsers/chromium')) return Object.assign(base, { executablePath: '/opt/pw-browsers/chromium' });
    return Object.assign(base, { channel: 'chrome' });
}

// Navigateur des tests : la session persistante si CDP_URL est défini (voir
// scripts/dev-browser.sh : un seul Chromium qui reste ouvert entre les tests, chaque
// test y ouvre son propre contexte, fermé à la fin), sinon un Chromium lancé pour le test.
async function openBrowser(options) {
    const { chromium } = require('playwright-core');
    if (process.env.CDP_URL) return chromium.connectOverCDP(process.env.CDP_URL);
    return chromium.launch(options || launchOptions());
}

// Charge les trois journées de test dans la page (déjà ouverte sur APP).
async function prepareApp(page) {

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
}

// Identifiants réels (série, épreuve, joueurs...) utilisés par les écrans.
async function readInfo(page) {
    return page.evaluate(() => {
        const cd = championship.days[2].chronoData;
        const series = cd.events.flatMap(e => e.series || []);
        const p1 = Object.values(championship.days[1].players).flat()[0];
        const m3 = Object.values(championship.days[3].players).flat()[0];
        return { serie: series[0].id, serie2: series[5].id, event: cd.events[0].id, participant: cd.participants[0] && cd.participants[0].id,
            poolPlayer: typeof p1 === 'string' ? p1 : p1.name, player3: typeof m3 === 'string' ? m3 : m3.name,
            swimmer: series[1].participants[2].name };
    });

}

// Liste [nom, fonction qui ouvre l'écran] ; chaque écran part d'une page rechargée.
function buildScreens(page, info) {
    // Un message alert() s'ouvre dans l'app (appAlert) : on le ferme comme le navigateur de test
    // acceptait la boîte native, pour auditer l'écran derrière ; l'écran « message » l'audite lui-même.
    const closeMessages = () => page.evaluate(() => document.querySelectorAll('.app-alert button').forEach(b => b.click()));
    const call = (code) => async () => { await page.evaluate(code); await page.waitForTimeout(600); await closeMessages(); };
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
        ['modal-renommer-joueur', call(`switchTab(3); toggleForfaitButtons(); editMatchPlayerName(3, 1, 0, 'player1', 'Nouveau Nom')`)],
        ['menu-generation-matchs', call('switchTab(3); showMatchGenerationModal(3)')],
        ['menu-ajout-joueurs', call('switchTab(3); toggleAddPlayerMenu(3)')],
        ['menu-import', call('switchTab(3); toggleImportMenu(3, null, "championship")')],
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
        ['message', async () => {
            await page.evaluate(`alert('🏁 Séries automatiques\\n\\nCréez d\\'abord une épreuve, puis relancez.')`);
            await page.waitForTimeout(400);
        }],
    ];
    return screens;
}

module.exports = { openBrowser, ROOT, APP, launchOptions, prepareApp, readInfo, buildScreens };
