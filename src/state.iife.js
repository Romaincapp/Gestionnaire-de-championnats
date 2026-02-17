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
        config: { ...DEFAULT_CONFIG },
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
        } catch (error) {
            console.warn("Erreur sauvegarde:", error);
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
                    championship.config = { ...DEFAULT_CONFIG };
                } else {
                    championship.config = { ...DEFAULT_CONFIG, ...championship.config };
                }
                return true;
            }
        } catch (error) {
            console.warn("Erreur chargement:", error);
        }
        return false;
    }

    function toggleForfaitButtons() {
        showForfaitButtons = !showForfaitButtons;

        document.querySelectorAll('[id^="forfait-toggle-btn-"]').forEach(function(btn) {
            btn.style.background = showForfaitButtons ? '#e74c3c' : '#95a5a6';
            btn.innerHTML = showForfaitButtons ? '⚠️ Actions ON' : '⚠️ Actions OFF';
        });

        return showForfaitButtons;
    }

    // Exposer sur window
    global.championship = championship;
    global.importedChampionshipData = importedChampionshipData;
    global.showForfaitButtons = showForfaitButtons;
    global.saveToLocalStorage = saveToLocalStorage;
    global.loadFromLocalStorage = loadFromLocalStorage;
    global.toggleForfaitButtons = toggleForfaitButtons;

})(window);
