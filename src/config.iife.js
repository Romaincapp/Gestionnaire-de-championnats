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

    // Répartit les terrains entre divisions : chaque division a au moins un
    // terrain, les premières divisions reçoivent le surplus (4 terrains / 3
    // divisions → 1-2, 3, 4). Moins de terrains que de divisions : les
    // divisions se partagent les terrains à tour de rôle (1 terrain → toutes
    // sur le terrain 1), au lieu de plages impossibles comme « Terrains 2-1 ».
    function getCourtsForDivision(division) {
        var numCourts = Math.max(1, getNumberOfCourts());
        var numDivisions = Math.max(1, getNumberOfDivisions());
        if (numCourts < numDivisions) {
            var shared = ((division - 1) % numCourts) + 1;
            return { first: shared, last: shared, count: 1 };
        }
        var base = Math.floor(numCourts / numDivisions);
        var extra = numCourts % numDivisions;
        var firstCourt = (division - 1) * base + Math.min(division - 1, extra) + 1;
        var count = base + (division <= extra ? 1 : 0);
        return {
            first: firstCourt,
            last: firstCourt + count - 1,
            count: count
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
