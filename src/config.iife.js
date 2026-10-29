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

    // Les menus Divisions / Terrains s'appliquent dès qu'on les change (plus
    // de bouton « Appliquer » ni de rechargement de page).
    function updateDivisionConfig() {
        var select = document.getElementById('divisionConfig');
        if (!select) return;
        var newDivisions = parseInt(select.value);
        var oldDivisions = getNumberOfDivisions();
        if (newDivisions < oldDivisions) {
            var hidden = divisionsWithContentAbove(newDivisions);
            if (hidden.length && !confirm('⚙️ Passer à ' + newDivisions + ' division' + (newDivisions > 1 ? 's' : '') + ' ?\n\n' +
                'Des joueurs ou matchs existent en division ' + hidden.join(', ') + ' : ils seront masqués, pas supprimés ' +
                '(remettre ' + oldDivisions + ' divisions les fait réapparaître).')) {
                select.value = oldDivisions;
                return;
            }
        }
        config.numberOfDivisions = newDivisions;
        config.numberOfCourts = getNumberOfCourts();
        applyConfiguration();
    }

    function updateCourtConfig() {
        var select = document.getElementById('courtConfig');
        if (!select) return;
        config.numberOfCourts = parseInt(select.value);
        config.numberOfDivisions = getNumberOfDivisions();
        applyConfiguration();
    }

    // Divisions au-delà de `max` qui ont des joueurs ou des matchs (toutes journées)
    function divisionsWithContentAbove(max) {
        var championship = global.championship;
        var found = {};
        if (championship && championship.days) {
            Object.keys(championship.days).forEach(function(dayKey) {
                var day = championship.days[dayKey] || {};
                [day.players || {}, day.matches || {}].forEach(function(byDiv) {
                    Object.keys(byDiv).forEach(function(div) {
                        if (parseInt(div) > max && byDiv[div] && byDiv[div].length) found[div] = true;
                    });
                });
            });
        }
        return Object.keys(found).map(Number).sort(function(x, y) { return x - y; });
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

    // Enregistre la configuration (config.numberOfDivisions / numberOfCourts)
    // dans le championnat et réaffiche les journées Matchs sur place.
    function applyConfiguration() {
        var newDivisions = config.numberOfDivisions;
        var newCourts = config.numberOfCourts;
        var championship = global.championship;
        if (!championship) return;
        if (!championship.days) championship.days = {};

        Object.keys(championship.days).forEach(function(dayKey) {
            var day = championship.days[dayKey];
            if (!day.players) day.players = {};
            if (!day.matches) day.matches = {};
            for (var i = 1; i <= newDivisions; i++) {
                if (!day.players[i]) day.players[i] = [];
                if (!day.matches[i]) day.matches[i] = [];
            }
        });
        championship.config = Object.assign({}, championship.config, {
            numberOfDivisions: newDivisions,
            numberOfCourts: newCourts
        });

        if (typeof global.saveToLocalStorage === 'function') global.saveToLocalStorage();

        // Menus de division des fenêtres + pastilles « D1 : Terrains 1-2 »
        if (typeof global.initializeDivisionSelects === 'function') global.initializeDivisionSelects();
        else if (typeof global.updateCourtAssignmentInfo === 'function') global.updateCourtAssignmentInfo();

        // Journées Matchs seulement : une course en cours n'est pas redessinée
        Object.keys(championship.days).forEach(function(dayKey) {
            var dayNumber = Number(dayKey);
            var day = championship.days[dayKey];
            if (day.dayType === 'chrono') return;
            if (typeof global.initializeDivisionsDisplay === 'function') global.initializeDivisionsDisplay(dayNumber);
            if (typeof global.updatePlayersDisplay === 'function') global.updatePlayersDisplay(dayNumber);
            if (typeof global.updateMatchesDisplay === 'function') global.updateMatchesDisplay(dayNumber);
            if (day.pools && day.pools.enabled && typeof global.updatePoolsDisplay === 'function') global.updatePoolsDisplay(dayNumber);
            if (typeof global.updateStats === 'function') global.updateStats(dayNumber);
        });
        if (typeof global.updateGeneralRanking === 'function') global.updateGeneralRanking();
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
