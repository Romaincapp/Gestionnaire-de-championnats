/**
 * @jest-environment jsdom
 *
 * Régression pour les suppressions de code mort de cette session (commits
 * 448731c, 3c7feac) : vérifie qu'aucun onclick="..." de index.html ne
 * pointe vers une fonction qui n'existe plus après avoir chargé TOUS les
 * modules (y compris chrono.iife.js, dont ~1271 lignes ont été retirées).
 *
 * C'est l'automatisation de l'audit manuel fait en tout début de session
 * (73 handlers onclick vérifiés à la main un par un) — pour que ce genre
 * de vérification ne dépende plus de la mémoire de qui a fait le ménage.
 */
const fs = require('fs');
const path = require('path');
const { loadModules, DEFAULT_ORDER } = require('../helpers/loadApp');

const INDEX_HTML = fs.readFileSync(
    path.join(__dirname, '..', '..', 'index.html'),
    'utf8'
);

beforeAll(() => {
    // On charge tout, y compris init.iife.js (qui contient de nombreux
    // handlers onclick : gestion BYE, fenêtres de classement...). init
    // enregistre un DOMContentLoaded mais ne l'exécute pas tout seul dans
    // ce test (jsdom ne déclenche pas l'événement sans un vrai chargement
    // de document) — donc pas de bootstrap complet déclenché, juste les
    // fonctions exposées sur window.
    loadModules([...DEFAULT_ORDER, 'init']);
});

function extractOnclickFunctionNames(html) {
    const names = new Set();
    // Capture le premier identifiant appelé dans chaque onclick="...(...)"
    const re = /onclick="([^"]*)"/g;
    let match;
    while ((match = re.exec(html)) !== null) {
        const body = match[1];
        // Un onclick peut contenir plusieurs appels séparés par ';'
        body.split(';').forEach((stmt) => {
            const call = /([a-zA-Z_$][\w$]*)\s*\(/.exec(stmt.trim());
            if (call) names.add(call[1]);
        });
    }
    return [...names].sort();
}

test('tous les handlers onclick de index.html référencent une fonction définie', () => {
    const names = extractOnclickFunctionNames(INDEX_HTML);
    expect(names.length).toBeGreaterThan(30); // sanity check : on a bien extrait quelque chose

    const missing = names.filter((name) => typeof window[name] !== 'function');

    if (missing.length > 0) {
        throw new Error(
            `${missing.length} fonction(s) référencée(s) par un onclick mais introuvable(s) ` +
            `après chargement de tous les modules : ${missing.join(', ')}`
        );
    }
});

test('les fonctions supprimées cette session (ancien menu Chrono global) ne sont plus exposées', () => {
    // Confirme que la suppression a bien eu lieu (pas de résidu accidentel)
    const removed = [
        'toggleChronoMode', 'showParticipantsManager', 'showAddEventModal',
        'saveEvent', 'showAddSerieModal', 'saveSerie',
        'showOverallChronoRanking', 'showChronoRankingTypeModal',
        'generateRankingByNationality', 'generateRankingByClub',
        'hideChronoRanking', 'displayEmptyRanking', 'displayRanking',
        'displayRankingByTime', 'displayRankingByCategories',
        'displayRankingByEvents', 'exportChronoCompetition', 'importChronoCompetition',
        // Issue #69 (audit PDF/classement chrono)
        'exportChronoRankingToPDF', 'showChronoPdfConfigModal', 'closeChronoPdfConfigModal',
        'confirmChronoPdfExport', 'generateChronoPDF', 'exportOverallChronoRanking',
        'printOverallChronoRanking', 'confirmExportChronoCompetition', 'exportOverallChronoRankingToPDF',
        // Cluster gestionnaire de participants (ancien système global événements/séries)
        'closeParticipantsManager', 'addParticipantToChrono', 'editParticipant',
        'closeEditParticipantModal', 'saveParticipantEdit', 'deleteParticipant',
        'showBulkParticipantsModal', 'updateBulkImportFormat', 'closeBulkParticipantsModal',
        'previewBulkParticipants', 'saveBulkParticipants', 'closeEventModal',
        'updateEventRelayOptions', 'editEvent', 'deleteEvent', 'showAddSerieModalForEvent',
        'updateSerieFromEvent', 'autoAssignLane', 'updateLaneModeVisibility',
        'toggleLaneSelectors', 'updateSerieRelayOptions', 'closeSerieModal',
        'editSerie', 'deleteSerie', 'viewSerieResults', 'updateRelayOptions',
    ];
    removed.forEach((name) => {
        expect(window[name]).toBeUndefined();
    });
});

test('les fonctions du pont Chrono par-journée (vivantes) sont toujours exposées', () => {
    // Confirme que ce qui devait SURVIVRE au nettoyage a bien survécu
    const alive = [
        'startChronoRaceForDay', 'saveRaceResultsToDay', // ui.iife.js
        'printChronoCompetition', 'displayRaceInterface', // chrono.iife.js
        'toggleRaceTimer', 'recordLap', 'endSerie', 'backToSeriesList',
    ];
    alive.forEach((name) => {
        expect(typeof window[name]).toBe('function');
    });
});

test("startSerie/continueSerie (ancien système global de séries) sont bien supprimées", () => {
    // Correction : classées à tort comme "vivantes" lors du premier passage sur
    // l'issue #65 (doc AGENTS.md non vérifiée à l'époque). Un grep exhaustif
    // ultérieur (issue #69 / cluster gestionnaire de participants) a montré
    // qu'elles n'avaient de callers que dans displaySeriesList/displayEventsList,
    // elles-mêmes jamais appelées depuis l'extérieur — donc mortes. Le vrai
    // point d'entrée live est startChronoRaceForDay(dayNumber, serieId) dans
    // ui.iife.js, pas ces fonctions-ci.
    expect(window.startSerie).toBeUndefined();
    expect(window.continueSerie).toBeUndefined();
});

test('export.iife.js supprimé : ses fonctions sont exposées par export-json/export-print, pas de trou', () => {
    const alive = [
        'exportChampionship', 'confirmExportChampionship', // export-json.iife.js
        'showPrintOptionsModal', 'printMatchSheets', 'printRecapSheets', // export-print.iife.js
    ];
    alive.forEach((name) => {
        expect(typeof window[name]).toBe('function');
    });
});

test("index.html ne référence plus les éléments supprimés (#chronoModeSection, #eventModal, #serieModal)", () => {
    expect(INDEX_HTML).not.toMatch(/id="chronoModeSection"/);
    expect(INDEX_HTML).not.toMatch(/id="eventModal"/);
    expect(INDEX_HTML).not.toMatch(/id="serieModal"/);
});
