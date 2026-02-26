// ============================================
// MODULE CONFIGURATION (IIFE)
// ============================================
(function(global) {
    'use strict';

    var DEFAULT_CONFIG = {
        numberOfDivisions: 3,
        numberOfCourts: 4
    };

    var config = { numberOfDivisions: DEFAULT_CONFIG.numberOfDivisions, numberOfCourts: DEFAULT_CONFIG.numberOfCourts };

    function initializeDivisions(numberOfDivisions) {
        var divisions = {};
        for (var i = 1; i <= numberOfDivisions; i++) {
            divisions[i] = [];
        }
        return divisions;
    }

    function updateDivisionConfig() {
        var select = document.getElementById('divisionConfig');
        if (select) {
            config.numberOfDivisions = parseInt(select.value);
        }
        if (typeof global.updateCourtAssignmentInfo === 'function') global.updateCourtAssignmentInfo();
    }

    function updateCourtConfig() {
        var select = document.getElementById('courtConfig');
        if (select) {
            config.numberOfCourts = parseInt(select.value);
        }
        if (typeof global.updateCourtAssignmentInfo === 'function') global.updateCourtAssignmentInfo();
    }

    function getNumberOfDivisions() {
        var championship = global.championship;
        return (championship && championship.config && championship.config.numberOfDivisions) || config.numberOfDivisions || 3;
    }

    function getNumberOfCourts() {
        var championship = global.championship;
        return (championship && championship.config && championship.config.numberOfCourts) || config.numberOfCourts || 4;
    }

    function getCourtsForDivision(division) {
        var numCourts = getNumberOfCourts();
        var numDivisions = getNumberOfDivisions();
        var courtsPerDivision = Math.ceil(numCourts / numDivisions);
        var firstCourt = (division - 1) * courtsPerDivision + 1;
        var lastCourt = Math.min(division * courtsPerDivision, numCourts);
        return {
            first: firstCourt,
            last: lastCourt,
            count: lastCourt - firstCourt + 1
        };
    }

    function applyConfiguration() {
        var newDivisions = config.numberOfDivisions;
        var newCourts = config.numberOfCourts;

        if (!confirm('⚙️ Appliquer la nouvelle configuration ?\n\n' +
            '📊 Divisions: ' + newDivisions + '\n' +
            '🎾 Terrains: ' + newCourts + '\n\n' +
            '⚠️ Attention: Cela peut affecter l\'affichage des joueurs et matchs existants.')) {
            return;
        }

        var championship = global.championship;
        if (championship && championship.days) {
            // Mettre à jour toutes les journées existantes
            Object.keys(championship.days).forEach(function(dayKey) {
                var day = championship.days[dayKey];
                for (var i = 1; i <= newDivisions; i++) {
                    if (!day.players[i]) {
                        day.players[i] = [];
                        day.matches[i] = [];
                    }
                }
            });

            // Sauvegarder la config dans le championnat
            championship.config = {
                numberOfDivisions: newDivisions,
                numberOfCourts: newCourts
            };
        }

        if (typeof global.saveToLocalStorage === 'function') global.saveToLocalStorage();

        // Recharger l'interface
        location.reload();
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
