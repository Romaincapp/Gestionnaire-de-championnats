// ============================================
// MODULE GESTION DES JOUEURS (IIFE)
// ============================================
(function(global) {
    'use strict';

    var config = global.config || { numberOfDivisions: 3, numberOfCourts: 4 };
    var championship = global.championship;
    var initializeDivisions = global.initializeDivisions;
    var formatProperName = global.formatProperName;
    var showNotification = global.showNotification;
    var saveToLocalStorage = global.saveToLocalStorage;

    function addPlayer() {
        var input = document.getElementById('playerName');
        var divisionSelect = document.getElementById('playerDivision');
        
        if (!input || !divisionSelect) return;
        
        var name = input.value.trim();
        var division = parseInt(divisionSelect.value);
        
        if (!name) {
            showNotification('Veuillez entrer un nom de joueur', 'warning');
            return;
        }
        
        var formattedName = formatProperName(name);
        var currentDay = championship.currentDay;
        
        if (!championship.days[currentDay]) {
            championship.days[currentDay] = {
                players: initializeDivisions(config.numberOfDivisions),
                matches: initializeDivisions(config.numberOfDivisions)
            };
        }
        
        if (championship.days[currentDay].players[division].includes(formattedName)) {
            showNotification('Ce joueur existe déjà dans cette division', 'warning');
            return;
        }
        
        championship.days[currentDay].players[division].push(formattedName);
        saveToLocalStorage();
        input.value = '';
        
        if (typeof updatePlayersDisplay === 'function') updatePlayersDisplay(currentDay);
        if (typeof updateMatchesDisplay === 'function') updateMatchesDisplay(currentDay);
        if (typeof updatePlayerCount === 'function') updatePlayerCount(currentDay);
        
        showNotification(formattedName + ' ajouté à la Division ' + division, 'success');
    }

    function addPlayerToDay(dayNumber) {
        var input = document.getElementById('player-name-day-' + dayNumber);
        var divisionSelect = document.getElementById('player-division-day-' + dayNumber);
        
        if (!input || !divisionSelect) return;
        
        var name = input.value.trim();
        var division = parseInt(divisionSelect.value);
        
        if (!name) {
            showNotification('Veuillez entrer un nom de joueur', 'warning');
            return;
        }
        
        var formattedName = formatProperName(name);
        
        if (!championship.days[dayNumber]) {
            championship.days[dayNumber] = {
                players: initializeDivisions(config.numberOfDivisions),
                matches: initializeDivisions(config.numberOfDivisions)
            };
        }
        
        if (championship.days[dayNumber].players[division].includes(formattedName)) {
            showNotification('Ce joueur existe déjà dans cette division', 'warning');
            return;
        }
        
        championship.days[dayNumber].players[division].push(formattedName);
        saveToLocalStorage();
        input.value = '';
        
        if (typeof updatePlayersDisplay === 'function') updatePlayersDisplay(dayNumber);
        if (typeof updateMatchesDisplay === 'function') updateMatchesDisplay(dayNumber);
        if (typeof updatePlayerCount === 'function') updatePlayerCount(dayNumber);
        
        showNotification(formattedName + ' ajouté à la Division ' + division, 'success');
    }

    function removePlayer(dayNumber, division, index) {
        if (!championship.days[dayNumber]) return;
        
        var players = championship.days[dayNumber].players[division];
        if (!players || !players[index]) return;
        
        var playerName = players[index];
        
        if (!confirm('Êtes-vous sûr de vouloir supprimer ' + playerName + ' ?')) {
            return;
        }
        
        players.splice(index, 1);
        
        if (championship.days[dayNumber].matches[division]) {
            championship.days[dayNumber].matches[division] = 
                championship.days[dayNumber].matches[division].filter(
                    function(match) { return match.player1 !== playerName && match.player2 !== playerName; }
                );
        }
        
        saveToLocalStorage();
        
        if (typeof updatePlayersDisplay === 'function') updatePlayersDisplay(dayNumber);
        if (typeof updateMatchesDisplay === 'function') updateMatchesDisplay(dayNumber);
        if (typeof updatePlayerCount === 'function') updatePlayerCount(dayNumber);
        if (typeof updateRankings === 'function') updateRankings();
        
        showNotification(playerName + ' a été supprimé', 'info');
    }

    function editPlayer(dayNumber, division, index) {
        if (!championship.days[dayNumber]) return;
        
        var players = championship.days[dayNumber].players[division];
        if (!players || !players[index]) return;
        
        var oldName = players[index];
        var newName = prompt('Modifier le nom de ' + oldName + ':', oldName);
        
        if (!newName || newName.trim() === '' || newName.trim() === oldName) {
            return;
        }
        
        var formattedNewName = formatProperName(newName.trim());
        
        if (players.includes(formattedNewName)) {
            showNotification('Ce nom existe déjà', 'error');
            return;
        }
        
        if (championship.days[dayNumber].matches[division]) {
            championship.days[dayNumber].matches[division].forEach(function(match) {
                if (match.player1 === oldName) match.player1 = formattedNewName;
                if (match.player2 === oldName) match.player2 = formattedNewName;
                if (match.winner === oldName) match.winner = formattedNewName;
                if (match.forfaitBy === oldName) match.forfaitBy = formattedNewName;
            });
        }
        
        players[index] = formattedNewName;
        saveToLocalStorage();
        
        if (typeof updatePlayersDisplay === 'function') updatePlayersDisplay(dayNumber);
        if (typeof updateMatchesDisplay === 'function') updateMatchesDisplay(dayNumber);
        if (typeof updateRankings === 'function') updateRankings();
        
        showNotification('Joueur renommé en ' + formattedNewName, 'success');
    }

    function playerHasByeMatch(dayNumber, division, playerName) {
        var dayData = championship.days[dayNumber];
        if (!dayData) return false;
        
        // Helper pour vérifier si un nom est un BYE
        var isByePlayer = function(name) { return name === 'BYE' || (typeof name === 'string' && name.startsWith('BYE')); };
        
        var regularMatches = dayData.matches[division] || [];
        var hasByeInRegular = regularMatches.some(function(match) {
            return (match.player1 === playerName && isByePlayer(match.player2)) ||
                   (match.player2 === playerName && isByePlayer(match.player1));
        });
        
        if (hasByeInRegular) return true;
        
        if (dayData.pools && dayData.pools.enabled && dayData.pools.divisions[division]) {
            var poolMatches = dayData.pools.divisions[division].matches || [];
            var hasByeInPools = poolMatches.some(function(match) {
                return (match.player1 === playerName && isByePlayer(match.player2)) ||
                       (match.player2 === playerName && isByePlayer(match.player1));
            });
            if (hasByeInPools) return true;
        }
        
        return false;
    }

    function addBulkPlayers() {
        var textarea = document.getElementById('bulkPlayers');
        var divisionSelect = document.getElementById('bulkDivision');
        
        if (!textarea || !divisionSelect) return;
        
        var rawText = textarea.value;
        var division = parseInt(divisionSelect.value);
        var dayNumber = championship.currentDay;
        
        var names = rawText
            .split(/[\n,;]/)
            .map(function(n) { return n.trim(); })
            .filter(function(n) { return n.length > 0; })
            .map(formatProperName);
        
        if (names.length === 0) {
            showNotification('Aucun nom valide trouvé', 'warning');
            return;
        }
        
        if (!championship.days[dayNumber]) {
            championship.days[dayNumber] = {
                players: initializeDivisions(config.numberOfDivisions),
                matches: initializeDivisions(config.numberOfDivisions)
            };
        }
        
        var existingPlayers = championship.days[dayNumber].players[division];
        var addedCount = 0;
        var duplicateCount = 0;
        
        names.forEach(function(name) {
            if (!existingPlayers.includes(name)) {
                existingPlayers.push(name);
                addedCount++;
            } else {
                duplicateCount++;
            }
        });
        
        saveToLocalStorage();
        textarea.value = '';
        
        if (typeof closeBulkModal === 'function') closeBulkModal();
        if (typeof updatePlayersDisplay === 'function') updatePlayersDisplay(dayNumber);
        if (typeof updateMatchesDisplay === 'function') updateMatchesDisplay(dayNumber);
        if (typeof updatePlayerCount === 'function') updatePlayerCount(dayNumber);
        
        var message = addedCount + ' joueur(s) ajouté(s)';
        if (duplicateCount > 0) {
            message += ' (' + duplicateCount + ' doublon(s) ignoré(s))';
        }
        showNotification(message, 'success');
    }

    function copyPlayersFromPreviousDay(dayNumber) {
        if (dayNumber <= 1) {
            showNotification('Pas de journée précédente', 'warning');
            return;
        }
        
        var previousDay = dayNumber - 1;
        var prevDayData = championship.days[previousDay];
        
        if (!prevDayData || !prevDayData.players) {
            showNotification('Aucune donnée pour la journée précédente', 'warning');
            return;
        }
        
        if (!confirm('Copier les joueurs de la Journée ' + previousDay + ' vers la Journée ' + dayNumber + ' ?')) {
            return;
        }
        
        if (!championship.days[dayNumber]) {
            championship.days[dayNumber] = {
                players: initializeDivisions(config.numberOfDivisions),
                matches: initializeDivisions(config.numberOfDivisions)
            };
        }
        
        Object.keys(prevDayData.players).forEach(function(division) {
            var divNum = parseInt(division);
            championship.days[dayNumber].players[divNum] = [...prevDayData.players[division]];
        });
        
        saveToLocalStorage();
        
        if (typeof updatePlayersDisplay === 'function') updatePlayersDisplay(dayNumber);
        if (typeof updatePlayerCount === 'function') updatePlayerCount(dayNumber);
        
        showNotification('Joueurs de la Journée ' + previousDay + ' copiés avec succès', 'success');
    }

    function updatePlayerCount(dayNumber) {
        var dayData = championship.days[dayNumber];
        if (!dayData || !dayData.players) return;
        
        var totalPlayers = 0;
        Object.values(dayData.players).forEach(function(divisionPlayers) {
            totalPlayers += divisionPlayers.length;
        });
        
        var countElements = document.querySelectorAll('[id^="player-count-day-' + dayNumber + '"]');
        countElements.forEach(function(el) {
            el.textContent = totalPlayers + ' joueur(s)';
        });
    }

    function closePlayerModal() {
        var modal = document.getElementById('playerModal');
        if (modal) modal.remove();
    }

    // Exposer sur window
    global.addPlayer = addPlayer;
    global.addPlayerToDay = addPlayerToDay;
    global.removePlayer = removePlayer;
    global.editPlayer = editPlayer;
    global.playerHasByeMatch = playerHasByeMatch;
    global.addBulkPlayers = addBulkPlayers;
    global.copyPlayersFromPreviousDay = copyPlayersFromPreviousDay;
    global.updatePlayerCount = updatePlayerCount;
    global.closePlayerModal = closePlayerModal;

})(window);
