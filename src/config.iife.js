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
    // de bouton « Appliquer » ni de rechargement de page). Une confirmation
    // n'est demandée que si le changement touche des matchs ou des joueurs
    // existants ; annuler remet le menu à sa valeur.
    function updateDivisionConfig() {
        var select = document.getElementById('divisionConfig');
        if (!select) return;
        changeConfiguration(parseInt(select.value), getNumberOfCourts(), select, getNumberOfDivisions());
    }

    function updateCourtConfig() {
        var select = document.getElementById('courtConfig');
        if (!select) return;
        changeConfiguration(getNumberOfDivisions(), parseInt(select.value), select, getNumberOfCourts());
    }

    function changeConfiguration(newDivisions, newCourts, select, previousValue) {
        var message = configChangeWarning(newDivisions, newCourts);
        if (message && !confirm(message)) {
            select.value = previousValue;
            return false;
        }
        config.numberOfDivisions = newDivisions;
        config.numberOfCourts = newCourts;
        applyConfiguration();
        return true;
    }

    // Texte de confirmation si passer à (newDivisions, newCourts) déplace des
    // matchs déjà générés vers un autre terrain ou masque des divisions qui ont
    // du contenu ; null si rien d'existant n'est touché.
    function configChangeWarning(newDivisions, newCourts) {
        var lines = [];
        var oldDivisions = getNumberOfDivisions();
        var oldCourts = getNumberOfCourts();
        if (newDivisions < oldDivisions) {
            var hidden = divisionsWithContentAbove(newDivisions);
            if (hidden.length) {
                lines.push('• Des joueurs ou matchs existent en division ' + hidden.join(', ') +
                    ' : ils seront masqués, pas supprimés (remettre ' + oldDivisions + ' divisions les fait réapparaître).');
            }
        }
        var moved = countMatchesChangingCourt(newDivisions, newCourts);
        if (moved) {
            lines.push('• ' + moved + ' match' + (moved > 1 ? 's' : '') + ' déjà généré' + (moved > 1 ? 's' : '') +
                ' changer' + (moved > 1 ? 'ont' : 'a') + ' de terrain : les feuilles déjà imprimées ne correspondront plus. ' +
                'Revenir en arrière ne remet pas les anciens terrains.');
        }
        if (!lines.length) return null;
        var target = newDivisions !== oldDivisions
            ? newDivisions + ' division' + (newDivisions > 1 ? 's' : '')
            : newCourts + ' terrain' + (newCourts > 1 ? 's' : '');
        if (newDivisions !== oldDivisions && newCourts !== oldCourts) target += ' et ' + newCourts + ' terrains';
        return '⚙️ Passer à ' + target + ' ?\n\n' + lines.join('\n\n');
    }

    // Matchs par tours (journées Matchs, divisions conservées) dont le terrain
    // enregistré sortirait de la plage de sa division : updateMatchesDisplay
    // les réaffecterait (et l'enregistrerait).
    function countMatchesChangingCourt(newDivisions, newCourts) {
        var championship = global.championship;
        var count = 0;
        if (!championship || !championship.days) return 0;
        Object.keys(championship.days).forEach(function(dayKey) {
            var day = championship.days[dayKey];
            if (!day || day.dayType === 'chrono' || !day.matches) return;
            Object.keys(day.matches).forEach(function(divKey) {
                var div = parseInt(divKey);
                if (div > newDivisions || !Array.isArray(day.matches[divKey])) return;
                var range = getCourtsForDivision(div, newDivisions, newCourts);
                day.matches[divKey].forEach(function(match) {
                    if (match && match.court && (match.court < range.first || match.court > range.last)) count++;
                });
            });
        });
        return count;
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
    function getCourtsForDivision(division, numDivisionsOpt, numCourtsOpt) {
        var numCourts = Math.max(1, numCourtsOpt || getNumberOfCourts());
        var numDivisions = Math.max(1, numDivisionsOpt || getNumberOfDivisions());
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
            // La phase finale vit dans le bloc de sa division, reconstruit ci-dessus :
            // sans ce réaffichage elle disparaissait jusqu'au rechargement de la page
            if (day.pools && day.pools.manualFinalPhase && day.pools.manualFinalPhase.enabled &&
                typeof global.updateManualFinalPhaseDisplay === 'function') global.updateManualFinalPhaseDisplay(dayNumber);
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
    global.configChangeWarning = configChangeWarning;
    global.countMatchesChangingCourt = countMatchesChangingCourt;

})(window);
