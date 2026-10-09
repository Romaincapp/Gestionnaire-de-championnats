// ============================================
// MODULE ÉTAT GLOBAL (IIFE)
// ============================================
(function(global) {
    'use strict';

    var DEFAULT_CONFIG = global.DEFAULT_CONFIG || { numberOfDivisions: 3, numberOfCourts: 4 };
    var initializeDivisions = global.initializeDivisions || function(n) {
        var divisions = {};
        for (var i = 1; i <= n; i++) divisions[i] = [];
        return divisions;
    };

    // État global
    var championship = {
        currentDay: 1,
        config: { numberOfDivisions: DEFAULT_CONFIG.numberOfDivisions, numberOfCourts: DEFAULT_CONFIG.numberOfCourts },
        days: {
            1: {
                players: initializeDivisions(DEFAULT_CONFIG.numberOfDivisions),
                matches: initializeDivisions(DEFAULT_CONFIG.numberOfDivisions)
            }
        }
    };

    var importedChampionshipData = null;
    var showForfaitButtons = false;

    function saveToLocalStorage() {
        try {
            // Toujours utiliser global.championship pour être sûr d'avoir la bonne référence
            localStorage.setItem('tennisTableChampionship', JSON.stringify(global.championship));
            if (global.reportSaveSuccess) global.reportSaveSuccess('championship');
        } catch (error) {
            console.warn("Erreur sauvegarde:", error);
            // Sans ça, l'échec est invisible : l'utilisateur croit ses données enregistrées
            if (global.reportSaveFailure) global.reportSaveFailure('championship', error);
        }
    }

    function loadFromLocalStorage() {
        try {
            var saved = localStorage.getItem('tennisTableChampionship');
            if (saved) {
                var loaded = JSON.parse(saved);
                // IMPORTANT: Modifier l'objet EN PLACE pour préserver les références
                // Ne JAMAIS faire championship = {...} qui casse les références des autres modules
                Object.keys(championship).forEach(function(key) { delete championship[key]; });
                Object.assign(championship, loaded);
                // S'assurer que la config a les valeurs par défaut
                if (!championship.config) {
                    championship.config = { numberOfDivisions: DEFAULT_CONFIG.numberOfDivisions, numberOfCourts: DEFAULT_CONFIG.numberOfCourts };
                } else {
                    championship.config.numberOfDivisions = championship.config.numberOfDivisions || DEFAULT_CONFIG.numberOfDivisions;
                    championship.config.numberOfCourts = championship.config.numberOfCourts || DEFAULT_CONFIG.numberOfCourts;
                }
                // Synchroniser le config global
                if (global.config) {
                    global.config.numberOfDivisions = championship.config.numberOfDivisions;
                    global.config.numberOfCourts = championship.config.numberOfCourts;
                }
                return true;
            }
        } catch (error) {
            console.warn("Erreur chargement:", error);
        }
        return false;
    }

    // Bouton « 🔓 Modifier les matchs » / « 🔒 Verrouiller » des journées Matchs
    // (anciennement « ⚠️ Actions ON/OFF ») : déverrouillé, chaque match montre ×
    // (supprimer), ses noms de joueurs modifiables et F1/F2 (forfait).
    var FORFAIT_TOGGLE_TITLE = 'Supprimer un match, corriger le nom d\'un joueur dans un match, déclarer un forfait';
    function forfaitToggleButtonState(unlocked) {
        return unlocked
            ? { label: '🔒 Verrouiller', background: '#e74c3c', title: 'Masquer à nouveau suppression, noms modifiables et forfaits' }
            : { label: '🔓 Modifier les matchs', background: '#64748b', title: FORFAIT_TOGGLE_TITLE };
    }

    function toggleForfaitButtons() {
        showForfaitButtons = !showForfaitButtons;
        global.showForfaitButtons = showForfaitButtons;

        // Mettre à jour tous les boutons toggle (pour toutes les journées)
        var state = forfaitToggleButtonState(showForfaitButtons);
        document.querySelectorAll('[id^="forfait-toggle-btn-"]').forEach(function(btn) {
            btn.style.background = state.background;
            btn.innerHTML = state.label;
            btn.title = state.title;
        });

        var currentDay = championship.currentDay;

        // Au verrouillage : vérifier que tous les joueurs présents dans
        // les matchs figurent bien au listing (rattrape les joueurs saisis directement
        // dans un match), même sans édition explicite.
        var reconciled = 0;
        if (!showForfaitButtons && typeof global.reconcilePlayersFromMatches === 'function') {
            reconciled = global.reconcilePlayersFromMatches();
        }

        // Rafraîchir l'affichage des matchs
        if (typeof global.updateMatchesDisplay === 'function') global.updateMatchesDisplay(currentDay);
        if (championship.days[currentDay] && championship.days[currentDay].pools && championship.days[currentDay].pools.enabled) {
            if (typeof global.updatePoolsDisplay === 'function') global.updatePoolsDisplay(currentDay);
        }
        if (championship.days[currentDay] && championship.days[currentDay].pools && championship.days[currentDay].pools.manualFinalPhase) {
            if (typeof global.updateManualFinalPhaseDisplay === 'function') global.updateManualFinalPhaseDisplay(currentDay);
        }

        if (typeof global.showNotification === 'function') {
            global.showNotification(
                showForfaitButtons ? 'Matchs déverrouillés : suppression (×), noms modifiables et forfaits (F1/F2)' : 'Matchs verrouillés',
                showForfaitButtons ? 'warning' : 'info'
            );
            if (reconciled > 0) {
                global.showNotification(
                    `${reconciled} joueur(s) présent(s) dans les matchs ajouté(s) au listing`,
                    'success'
                );
            }
        }
    }

    // Exposer sur window
    global.championship = championship;
    global.importedChampionshipData = importedChampionshipData;
    global.showForfaitButtons = showForfaitButtons;
    global.saveToLocalStorage = saveToLocalStorage;
    global.loadFromLocalStorage = loadFromLocalStorage;
    global.toggleForfaitButtons = toggleForfaitButtons;
    global.forfaitToggleButtonState = forfaitToggleButtonState;

})(window);
