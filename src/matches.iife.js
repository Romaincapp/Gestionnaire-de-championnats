// ============================================
// MODULE MATCHES - Mode Championship (par tours)
// ============================================
(function(global) {
    'use strict';

    var championship = global.championship;
    var config = global.config;
    var showNotification = global.showNotification;
    var saveToLocalStorage = global.saveToLocalStorage;
    var generateId = global.generateId;

    // ============================================
    // AFFICHAGE DES MATCHS
    // ============================================

    function updateMatchesDisplay(dayNumber) {
        var container = document.getElementById('matches-day-' + dayNumber);
        if (!container) return;
        
        var dayData = championship.days[dayNumber];
        if (!dayData || !dayData.matches) {
            container.innerHTML = '<p style="text-align: center; color: #7f8c8d;">Aucun match pour cette journée</p>';
            return;
        }
        
        var html = '';
        
        for (var division = 1; division <= config.numberOfDivisions; division++) {
            var divisionMatches = dayData.matches[division] || [];
            var divisionPlayers = dayData.players[division] || [];
            
            if (divisionMatches.length === 0 && divisionPlayers.length === 0) continue;
            
            html += '<div class="division-section">';
            html += '<h4>Division ' + division + '</h4>';
            
            if (divisionMatches.length === 0) {
                html += '<p style="color: #7f8c8d;">Aucun match généré</p>';
            } else {
                html += renderDivisionMatches(divisionMatches, dayNumber, division);
            }
            
            html += '</div>';
        }
        
        container.innerHTML = html || '<p style="text-align: center; color: #7f8c8d;">Aucun match pour cette journée</p>';
    }

    function renderDivisionMatches(matches, dayNumber, division) {
        var html = '<div class="matches-container">';
        
        // Grouper par tour
        var matchesByTour = {};
        matches.forEach(function(match, index) {
            var tour = match.tour || 1;
            if (!matchesByTour[tour]) matchesByTour[tour] = [];
            matchesByTour[tour].push({ match: match, index: index });
        });
        
        // Afficher chaque tour
        var tours = Object.keys(matchesByTour).sort(function(a, b) { return parseInt(a) - parseInt(b); });
        tours.forEach(function(tour) {
            var tourMatches = matchesByTour[tour];
            var completedCount = tourMatches.filter(function(tm) { return tm.match.completed; }).length;
            
            html += '<div class="tour-section">';
            html += '<div class="tour-header" onclick="toggleTour(' + dayNumber + ', ' + division + ', ' + tour + ')">';
            html += '<span class="tour-title">Tour ' + tour + '</span>';
            html += '<span class="tour-progress">' + completedCount + '/' + tourMatches.length + ' termines</span>';
            html += '</div>';
            html += '<div class="tour-matches active" id="tour-' + dayNumber + '-' + division + '-' + tour + '">';
            
            tourMatches.forEach(function(tm) {
                html += renderMatchHTML(tm.match, dayNumber, division, tm.index);
            });
            
            html += '</div></div>';
        });
        
        html += '</div>';
        return html;
    }

    function renderMatchHTML(match, dayNumber, division, matchIndex) {
        var score1 = match.score1 || 0;
        var score2 = match.score2 || 0;
        
        var html = '<div class="match ' + (match.completed ? 'completed' : 'pending') + '">';
        
        // Header avec noms et scores
        html += '<div class="set-scores">';
        html += '<span class="player-name-left">' + match.player1 + '</span>';
        html += '<div class="score-center">';
        
        if (!match.completed) {
            html += '<input type="number" class="score-input" placeholder="0" min="0" ';
            html += 'value="' + (match.score1 === null || match.score1 === undefined ? '' : match.score1) + '" ';
            html += 'onchange="updateMatchScore(' + dayNumber + ', ' + division + ', ' + matchIndex + ', \'score1\', this.value)">';
            html += '<span class="score-separator">-</span>';
            html += '<input type="number" class="score-input" placeholder="0" min="0" ';
            html += 'value="' + (match.score2 === null || match.score2 === undefined ? '' : match.score2) + '" ';
            html += 'onchange="updateMatchScore(' + dayNumber + ', ' + division + ', ' + matchIndex + ', \'score2\', this.value)">';
        } else {
            html += '<span class="score-display">' + score1 + ' - ' + score2 + '</span>';
        }
        
        html += '</div>';
        html += '<span class="player-name-right">' + match.player2 + '</span>';
        html += '</div>';
        
        // Résultat
        if (match.completed && match.winner) {
            html += '<div class="match-result">🏆 ' + match.winner;
            if (match.forfaitBy) html += ' (forfait)';
            html += '</div>';
        }
        
        html += '</div>';
        return html;
    }

    // ============================================
    // GÉNÉRATION DES MATCHS
    // ============================================

    function showMatchGenerationModal(dayNumber) {
        if (document.getElementById('matchGenerationModal')) return;
        
        var modal = document.createElement('div');
        modal.id = 'matchGenerationModal';
        modal.innerHTML = 
            '<div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; ' +
            'background: rgba(0,0,0,0.5); display: flex; justify-content: center; ' +
            'align-items: center; z-index: 10000;" onclick="if(event.target===this)closeMatchGenerationModal()">' +
            '<div style="background: white; padding: 30px; border-radius: 10px; max-width: 500px; width: 90%;">' +
            '<h3>⚔️ Generer les matchs</h3>' +
            '<div style="display: flex; flex-direction: column; gap: 10px; margin: 20px 0;">' +
            '<button onclick="generateMatchesForDay(' + dayNumber + ')" class="btn btn-primary" style="padding: 15px;">' +
            '🎾 Standard (round-robin)</button>' +
            '<button onclick="generateMatchesSwissSystem(' + dayNumber + ')" class="btn btn-secondary" style="padding: 15px;">' +
            '🏆 Systeme Suisse</button>' +
            '</div>' +
            '<div style="display: flex; justify-content: flex-end;">' +
            '<button onclick="closeMatchGenerationModal()" class="btn btn-secondary">Annuler</button>' +
            '</div></div></div>';
        
        document.body.appendChild(modal);
    }

    function closeMatchGenerationModal() {
        var modal = document.getElementById('matchGenerationModal');
        if (modal) modal.remove();
    }

    function generateMatchesForDay(dayNumber) {
        var dayData = championship.days[dayNumber];
        if (!dayData) {
            showNotification('Erreur: Journee non trouvee', 'error');
            return;
        }
        
        var matchesGenerated = 0;
        
        for (var division = 1; division <= config.numberOfDivisions; division++) {
            var players = dayData.players[division];
            if (!players || players.length < 2) continue;
            
            dayData.matches[division] = [];
            
            for (var i = 0; i < players.length; i++) {
                for (var j = i + 1; j < players.length; j++) {
                    dayData.matches[division].push({
                        id: generateId(),
                        player1: players[i],
                        player2: players[j],
                        score1: null,
                        score2: null,
                        completed: false,
                        winner: null,
                        tour: 1,
                        division: division
                    });
                    matchesGenerated++;
                }
            }
            
            organizeMatchesInTours(dayData.matches[division]);
        }
        
        saveToLocalStorage();
        closeMatchGenerationModal();
        updateMatchesDisplay(dayNumber);
        showNotification(matchesGenerated + ' match(s) genere(s) !', 'success');
    }

    function organizeMatchesInTours(matches) {
        if (!matches || matches.length === 0) return;
        
        var playersInTour = {};
        var currentTour = 1;
        var matchesAssigned = 0;
        var maxIterations = matches.length * 3;
        var iterations = 0;
        
        while (matchesAssigned < matches.length && iterations < maxIterations) {
            iterations++;
            var assignedInThisIteration = 0;
            
            for (var i = 0; i < matches.length; i++) {
                var match = matches[i];
                if (match.tour && match.tour !== currentTour) continue;
                if (match.tour) continue;
                
                if (!playersInTour[match.player1] && !playersInTour[match.player2]) {
                    match.tour = currentTour;
                    playersInTour[match.player1] = true;
                    playersInTour[match.player2] = true;
                    matchesAssigned++;
                    assignedInThisIteration++;
                }
            }
            
            if (assignedInThisIteration === 0 || Object.keys(playersInTour).length > 0) {
                currentTour++;
                playersInTour = {};
            }
        }
        
        for (var i = 0; i < matches.length; i++) {
            if (!matches[i].tour) matches[i].tour = currentTour;
        }
    }

    // ============================================
    // MISE À JOUR DES SCORES
    // ============================================

    function updateMatchScore(dayNumber, division, matchIndex, scoreField, value) {
        var dayData = championship.days[dayNumber];
        if (!dayData || !dayData.matches[division]) return;
        
        var match = dayData.matches[division][matchIndex];
        if (!match) return;
        
        var score = parseInt(value) || 0;
        match[scoreField] = score;
        
        if (match.score1 !== null && match.score2 !== null) {
            if (match.score1 > match.score2) {
                match.winner = match.player1;
                match.completed = true;
            } else if (match.score2 > match.score1) {
                match.winner = match.player2;
                match.completed = true;
            }
        }
        
        saveToLocalStorage();
        updateMatchesDisplay(dayNumber);
        
        if (typeof updateRankings === 'function') updateRankings();
        if (typeof updateGeneralRanking === 'function') updateGeneralRanking();
    }

    function handleEnterKey(event, dayNumber, division, matchIndex) {
        if (event.key === 'Enter') {
            event.target.blur();
        }
    }

    // ============================================
    // GESTION UI
    // ============================================

    function toggleTour(dayNumber, division, tour) {
        var tourElement = document.getElementById('tour-' + dayNumber + '-' + division + '-' + tour);
        if (tourElement) {
            var isHidden = tourElement.style.display === 'none';
            tourElement.style.display = isHidden ? 'block' : 'none';
        }
    }

    function toggleMatchCollapse(element) {
        if (element) element.classList.toggle('collapsed');
    }

    function deleteMatch(dayNumber, division, matchIndex) {
        if (!global.showForfaitButtons) {
            showNotification('Activez d\'abord le mode Actions', 'warning');
            return;
        }
        
        var dayData = championship.days[dayNumber];
        if (!dayData || !dayData.matches[division]) return;
        
        var match = dayData.matches[division][matchIndex];
        if (!match) return;
        
        if (!confirm('Supprimer le match ?')) return;
        
        dayData.matches[division].splice(matchIndex, 1);
        saveToLocalStorage();
        updateMatchesDisplay(dayNumber);
        showNotification('Match supprime', 'info');
    }

    // ============================================
    // SYSTÈME SUISSE
    // ============================================

    function generateMatchesSwissSystem(dayNumber) {
        var dayData = championship.days[dayNumber];
        if (!dayData) {
            showNotification('Erreur: Journee non trouvee', 'error');
            return;
        }
        
        var playerStats = calculatePlayerStatsForSwiss(dayNumber);
        var allPlayers = [];
        
        for (var division = 1; division <= config.numberOfDivisions; division++) {
            var players = dayData.players[division] || [];
            players.forEach(function(player) {
                allPlayers.push({
                    name: player,
                    division: division,
                    points: playerStats[player] || 0
                });
            });
        }
        
        allPlayers.sort(function(a, b) { return b.points - a.points; });
        
        for (var division = 1; division <= config.numberOfDivisions; division++) {
            dayData.matches[division] = [];
        }
        
        var matchesGenerated = 0;
        for (var i = 0; i < allPlayers.length - 1; i += 2) {
            var p1 = allPlayers[i];
            var p2 = allPlayers[i + 1];
            var div = Math.max(p1.division, p2.division);
            
            dayData.matches[div].push({
                id: generateId(),
                player1: p1.name,
                player2: p2.name,
                score1: null,
                score2: null,
                completed: false,
                winner: null,
                tour: 1,
                division: div,
                swiss: true
            });
            matchesGenerated++;
        }
        
        if (allPlayers.length % 2 === 1) {
            showNotification(allPlayers[allPlayers.length - 1].name + ' a un BYE', 'info');
        }
        
        saveToLocalStorage();
        closeMatchGenerationModal();
        updateMatchesDisplay(dayNumber);
        showNotification(matchesGenerated + ' match(s) suisse genere(s) !', 'success');
    }

    function calculatePlayerStatsForSwiss(dayNumber) {
        var stats = {};
        
        for (var day = 1; day < dayNumber; day++) {
            var dayData = championship.days[day];
            if (!dayData || !dayData.matches) continue;
            
            for (var division = 1; division <= config.numberOfDivisions; division++) {
                var matches = dayData.matches[division] || [];
                matches.forEach(function(match) {
                    if (!match.completed) return;
                    
                    if (!stats[match.player1]) stats[match.player1] = 0;
                    if (!stats[match.player2]) stats[match.player2] = 0;
                    
                    if (match.winner === match.player1) {
                        stats[match.player1] += 3;
                    } else if (match.winner === match.player2) {
                        stats[match.player2] += 3;
                    } else if (match.score1 === match.score2) {
                        stats[match.player1] += 1;
                        stats[match.player2] += 1;
                    }
                });
            }
        }
        
        return stats;
    }

    // ============================================
    // EXPOSITION SUR WINDOW
    // ============================================

    global.updateMatchesDisplay = updateMatchesDisplay;
    global.showMatchGenerationModal = showMatchGenerationModal;
    global.closeMatchGenerationModal = closeMatchGenerationModal;
    global.generateMatchesForDay = generateMatchesForDay;
    global.generateMatchesSwissSystem = generateMatchesSwissSystem;
    global.updateMatchScore = updateMatchScore;
    global.handleEnterKey = handleEnterKey;
    global.toggleTour = toggleTour;
    global.toggleMatchCollapse = toggleMatchCollapse;
    global.deleteMatch = deleteMatch;
    global.organizeMatchesInTours = organizeMatchesInTours;

})(window);
