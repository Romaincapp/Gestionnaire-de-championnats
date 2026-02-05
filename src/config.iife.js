// ============================================
// MODULE CONFIGURATION (IIFE)
// ============================================
(function(global) {
    'use strict';

    const DEFAULT_CONFIG = {
        numberOfDivisions: 3,
        numberOfCourts: 4
    };

    let config = { ...DEFAULT_CONFIG };

    function initializeDivisions(numberOfDivisions) {
        const divisions = {};
        for (let i = 1; i <= numberOfDivisions; i++) {
            divisions[i] = [];
        }
        return divisions;
    }

    function updateDivisionConfig() {
        const select = document.getElementById('divisionConfig');
        if (select) {
            config.numberOfDivisions = parseInt(select.value);
        }
    }

    function updateCourtConfig() {
        const select = document.getElementById('courtConfig');
        if (select) {
            config.numberOfCourts = parseInt(select.value);
        }
    }

    function getNumberOfDivisions() {
        return config.numberOfDivisions;
    }

    function getNumberOfCourts() {
        return config.numberOfCourts;
    }

    function getCourtsForDivision(division) {
        const numCourts = config.numberOfCourts;
        const numDivisions = config.numberOfDivisions;
        const courtsPerDivision = Math.ceil(numCourts / numDivisions);
        const firstCourt = (division - 1) * courtsPerDivision + 1;
        const lastCourt = Math.min(division * courtsPerDivision, numCourts);
        return { first: firstCourt, last: lastCourt, count: lastCourt - firstCourt + 1 };
    }

    function applyConfiguration() {
        const newDivisions = parseInt(document.getElementById('divisionConfig').value);
        const newCourts = parseInt(document.getElementById('courtConfig').value);
        
        if (!confirm(`⚙️ Appliquer la nouvelle configuration ?\n\n` +
            `📊 Divisions: ${newDivisions}\n` +
            `🎾 Terrains: ${newCourts}\n\n` +
            `⚠️ Attention: Cela peut affecter l'affichage des joueurs et matchs existants.`)) {
            return;
        }
        
        config.numberOfDivisions = newDivisions;
        config.numberOfCourts = newCourts;
        
        if (global.championship && global.championship.days) {
            Object.keys(global.championship.days).forEach(dayKey => {
                const day = global.championship.days[dayKey];
                for (let i = 1; i <= newDivisions; i++) {
                    if (!day.players[i]) day.players[i] = [];
                    if (!day.matches[i]) day.matches[i] = [];
                }
                Object.keys(day.players).forEach(div => {
                    if (parseInt(div) > newDivisions) {
                        delete day.players[div];
                        delete day.matches[div];
                    }
                });
            });
            global.championship.config = { ...config };
        }
        
        if (typeof saveToLocalStorage === 'function') saveToLocalStorage();
        if (typeof showNotification === 'function') showNotification('Configuration appliquée avec succès !', 'success');
        if (typeof updateMatchesDisplay === 'function') updateMatchesDisplay(global.championship?.currentDay || 1);
    }

    // Exposer sur window
    global.DEFAULT_CONFIG = DEFAULT_CONFIG;
    global.config = config;
    global.initializeDivisions = initializeDivisions;
    global.updateDivisionConfig = updateDivisionConfig;
    global.updateCourtConfig = updateCourtConfig;
    global.getNumberOfDivisions = getNumberOfDivisions;
    global.getNumberOfCourts = getNumberOfCourts;
    global.getCourtsForDivision = getCourtsForDivision;
    global.applyConfiguration = applyConfiguration;

})(window);
