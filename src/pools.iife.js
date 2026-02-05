// ============================================
// MODULE POOLS - Mode Poules + Phase Finale
// ============================================
(function(global) {
    'use strict';

    var championship = global.championship;
    var config = global.config;
    var showNotification = global.showNotification;
    var saveToLocalStorage = global.saveToLocalStorage;
    var generateId = global.generateId;
    var formatProperName = global.formatProperName;

    // ============================================
    // AFFICHAGE DES POOLS
    // ============================================

    function updatePoolsDisplay(dayNumber) {
        var container = document.getElementById('pools-day-' + dayNumber);
        if (!container) return;
        
        var dayData = championship.days[dayNumber];
        if (!dayData || !dayData.pools || !dayData.pools.enabled) {
            container.innerHTML = '<p style="text-align: center; color: #7f8c8d;">Mode poule non active</p>';
            return;
        }
        
        var html = '<div class="pools-container">';
        
        for (var division = 1; division <= config.numberOfDivisions; division++) {
            var poolDiv = dayData.pools.divisions[division];
            if (!poolDiv) continue;
            
            html += '<div class="pool-division">';
            html += '<h4>Division ' + division + '</h4>';
            
            // Afficher les poules
            if (poolDiv.pools && poolDiv.pools.length > 0) {
                html += renderPools(poolDiv.pools, dayNumber, division);
            }
            
            // Afficher les matchs de poule
            if (poolDiv.matches && poolDiv.matches.length > 0) {
                html += '<h5>Matchs de poule</h5>';
                html += renderPoolMatches(poolDiv.matches, dayNumber, division);
            }
            
            // Afficher la phase finale
            if (poolDiv.finalPhase && poolDiv.finalPhase.length > 0) {
                html += '<h5>Phase finale</h5>';
                html += renderFinalPhase(poolDiv.finalPhase, dayNumber, division);
            }
            
            html += '</div>';
        }
        
        html += '</div>';
        container.innerHTML = html;
    }

    function renderPools(pools, dayNumber, division) {
        var html = '<div class="pools-grid">';
        
        pools.forEach(function(pool, poolIndex) {
            html += '<div class="pool-card">';
            html += '<h6>Poule ' + (poolIndex + 1) + '</h6>';
            html += '<ul class="pool-players">';
            
            pool.players.forEach(function(player) {
                html += '<li>' + player + '</li>';
            });
            
            html += '</ul>';
            html += '</div>';
        });
        
        html += '</div>';
        return html;
    }

    function renderPoolMatches(matches, dayNumber, division) {
        var html = '<div class="pool-matches">';
        
        matches.forEach(function(match, index) {
            var score1 = match.score1 || 0;
            var score2 = match.score2 || 0;
            
            html += '<div class="pool-match ' + (match.completed ? 'completed' : 'pending') + '">';
            html += '<div class="set-scores">';
            html += '<span class="player-name-left">' + match.player1 + '</span>';
            html += '<div class="score-center">';
            
            if (!match.completed) {
                html += '<input type="number" class="score-input" placeholder="0" min="0" ';
                html += 'value="' + (match.score1 === null || match.score1 === undefined ? '' : match.score1) + '" ';
                html += 'onchange="updatePoolMatchScore(' + dayNumber + ', \'' + match.id + '\', \'score1\', this.value)">';
                html += '<span class="score-separator">-</span>';
                html += '<input type="number" class="score-input" placeholder="0" min="0" ';
                html += 'value="' + (match.score2 === null || match.score2 === undefined ? '' : match.score2) + '" ';
                html += 'onchange="updatePoolMatchScore(' + dayNumber + ', \'' + match.id + '\', \'score2\', this.value)">';
            } else {
                html += '<span class="score-display">' + score1 + ' - ' + score2 + '</span>';
            }
            
            html += '</div>';
            html += '<span class="player-name-right">' + match.player2 + '</span>';
            html += '</div>';
            
            if (match.completed && match.winner) {
                html += '<div class="match-result">🏆 ' + match.winner + '</div>';
            }
            
            html += '</div>';
        });
        
        html += '</div>';
        return html;
    }

    function renderFinalPhase(matches, dayNumber, division) {
        var html = '<div class="final-phase">';
        
        matches.forEach(function(match, index) {
            html += '<div class="final-match ' + (match.completed ? 'completed' : 'pending') + '">';
            html += '<div class="match-round">' + (match.round || 'Finale') + '</div>';
            html += '<div class="set-scores">';
            html += '<span class="player-name-left">' + (match.player1 || '???') + '</span>';
            html += '<div class="score-center">';
            
            if (!match.completed && match.player1 && match.player2) {
                html += '<input type="number" class="score-input" placeholder="0" min="0" ';
                html += 'onchange="updatePoolMatchScore(' + dayNumber + ', \'' + match.id + '\', \'score1\', this.value)">';
                html += '<span class="score-separator">-</span>';
                html += '<input type="number" class="score-input" placeholder="0" min="0" ';
                html += 'onchange="updatePoolMatchScore(' + dayNumber + ', \'' + match.id + '\', \'score2\', this.value)">';
            } else {
                html += '<span class="score-display">' + (match.score1 || 0) + ' - ' + (match.score2 || 0) + '</span>';
            }
            
            html += '</div>';
            html += '<span class="player-name-right">' + (match.player2 || '???') + '</span>';
            html += '</div>';
            html += '</div>';
        });
        
        html += '</div>';
        return html;
    }

    // ============================================
    // GÉNÉRATION DES POULES
    // ============================================

    function togglePoolSection(dayNumber) {
        var section = document.getElementById('pool-section-' + dayNumber);
        if (section) {
            section.style.display = section.style.display === 'none' ? 'block' : 'none';
        }
    }

    function togglePoolMode(dayNumber) {
        var dayData = championship.days[dayNumber];
        if (!dayData) return;
        
        if (!dayData.pools) {
            dayData.pools = {
                enabled: true,
                divisions: {}
            };
        } else {
            dayData.pools.enabled = !dayData.pools.enabled;
        }
        
        saveToLocalStorage();
        showNotification('Mode poule ' + (dayData.pools.enabled ? 'active' : 'desactive'), 'info');
        
        if (typeof updateMatchesDisplay === 'function') {
            updateMatchesDisplay(dayNumber);
        }
    }

    function generatePools(dayNumber) {
        var dayData = championship.days[dayNumber];
        if (!dayData) {
            showNotification('Erreur: Journee non trouvee', 'error');
            return;
        }
        
        if (!dayData.pools) {
            dayData.pools = {
                enabled: true,
                divisions: {}
            };
        }
        
        for (var division = 1; division <= config.numberOfDivisions; division++) {
            var players = dayData.players[division] || [];
            if (players.length < 2) continue;
            
            // Creer la structure de la division
            if (!dayData.pools.divisions[division]) {
                dayData.pools.divisions[division] = {
                    pools: [],
                    matches: [],
                    finalPhase: []
                };
            }
            
            var poolDiv = dayData.pools.divisions[division];
            
            // Repartir les joueurs en poules de 4
            var poolSize = 4;
            var numPools = Math.ceil(players.length / poolSize);
            poolDiv.pools = [];
            
            for (var i = 0; i < numPools; i++) {
                poolDiv.pools.push({
                    name: 'Poule ' + String.fromCharCode(65 + i),
                    players: [],
                    index: i
                });
            }
            
            // Distribuer les joueurs (serpent)
            var sortedPlayers = players.slice().sort();
            for (var i = 0; i < sortedPlayers.length; i++) {
                var poolIndex = i % numPools;
                if (poolDiv.pools[poolIndex]) {
                    poolDiv.pools[poolIndex].players.push(sortedPlayers[i]);
                }
            }
            
            // Generer les matchs de poule
            poolDiv.matches = [];
            poolDiv.pools.forEach(function(pool) {
                for (var i = 0; i < pool.players.length; i++) {
                    for (var j = i + 1; j < pool.players.length; j++) {
                        poolDiv.matches.push({
                            id: generateId(),
                            player1: pool.players[i],
                            player2: pool.players[j],
                            score1: null,
                            score2: null,
                            completed: false,
                            winner: null,
                            poolIndex: pool.index,
                            poolName: pool.name,
                            division: division
                        });
                    }
                }
            });
        }
        
        saveToLocalStorage();
        updatePoolsDisplay(dayNumber);
        showNotification('Poules generees avec succes !', 'success');
    }

    // ============================================
    // MISE À JOUR DES SCORES POOL
    // ============================================

    function updatePoolMatchScore(dayNumber, matchId, scoreField, value) {
        var dayData = championship.days[dayNumber];
        if (!dayData || !dayData.pools || !dayData.pools.divisions) return;
        
        var score = parseInt(value) || 0;
        var matchFound = false;
        
        for (var division = 1; division <= config.numberOfDivisions; division++) {
            var poolDiv = dayData.pools.divisions[division];
            if (!poolDiv) continue;
            
            // Chercher dans les matchs de poule
            if (poolDiv.matches) {
                poolDiv.matches.forEach(function(match) {
                    if (match.id === matchId) {
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
                        
                        matchFound = true;
                    }
                });
            }
            
            // Chercher dans la phase finale
            if (poolDiv.finalPhase && !matchFound) {
                poolDiv.finalPhase.forEach(function(match) {
                    if (match.id === matchId) {
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
                        
                        matchFound = true;
                    }
                });
            }
        }
        
        if (matchFound) {
            saveToLocalStorage();
            updatePoolsDisplay(dayNumber);
            
            if (typeof updateRankings === 'function') updateRankings();
            if (typeof updateGeneralRanking === 'function') updateGeneralRanking();
        }
    }

    function handlePoolMatchEnter(event, dayNumber, matchId) {
        if (event.key === 'Enter') {
            event.target.blur();
        }
    }

    // ============================================
    // PHASE FINALE
    // ============================================

    function generateFinalPhase(dayNumber) {
        var dayData = championship.days[dayNumber];
        if (!dayData || !dayData.pools || !dayData.pools.divisions) {
            showNotification('Erreur: Donnees de poule non trouvees', 'error');
            return;
        }
        
        for (var division = 1; division <= config.numberOfDivisions; division++) {
            var poolDiv = dayData.pools.divisions[division];
            if (!poolDiv || !poolDiv.pools) continue;
            
            // Calculer le classement de chaque poule
            var qualifiedPlayers = [];
            
            poolDiv.pools.forEach(function(pool) {
                var standings = calculatePoolStandings(poolDiv.matches, pool.index);
                
                // Prendre les 2 premiers de chaque poule
                if (standings.length > 0) qualifiedPlayers.push(standings[0].name);
                if (standings.length > 1) qualifiedPlayers.push(standings[1].name);
            });
            
            // Creer les matchs de phase finale
            poolDiv.finalPhase = [];
            
            // Demi-finales
            for (var i = 0; i < qualifiedPlayers.length - 1; i += 2) {
                poolDiv.finalPhase.push({
                    id: generateId(),
                    player1: qualifiedPlayers[i],
                    player2: qualifiedPlayers[i + 1] || null,
                    score1: null,
                    score2: null,
                    completed: false,
                    winner: null,
                    round: 'Demi-finale',
                    division: division
                });
            }
            
            // Finale (sera creee apres les demis)
            poolDiv.finalPhase.push({
                id: generateId(),
                player1: null,
                player2: null,
                score1: null,
                score2: null,
                completed: false,
                winner: null,
                round: 'Finale',
                division: division
            });
        }
        
        saveToLocalStorage();
        updatePoolsDisplay(dayNumber);
        showNotification('Phase finale generee !', 'success');
    }

    function calculatePoolStandings(matches, poolIndex) {
        var stats = {};
        
        matches.forEach(function(match) {
            if (match.poolIndex !== poolIndex) return;
            if (!match.completed) return;
            
            if (!stats[match.player1]) {
                stats[match.player1] = { name: match.player1, wins: 0, points: 0, played: 0 };
            }
            if (!stats[match.player2]) {
                stats[match.player2] = { name: match.player2, wins: 0, points: 0, played: 0 };
            }
            
            stats[match.player1].played++;
            stats[match.player2].played++;
            
            if (match.winner === match.player1) {
                stats[match.player1].wins++;
                stats[match.player1].points += 3;
            } else if (match.winner === match.player2) {
                stats[match.player2].wins++;
                stats[match.player2].points += 3;
            } else {
                stats[match.player1].points += 1;
                stats[match.player2].points += 1;
            }
        });
        
        var standings = Object.values(stats);
        standings.sort(function(a, b) {
            if (b.points !== a.points) return b.points - a.points;
            return b.wins - a.wins;
        });
        
        return standings;
    }

    // ============================================
    // EXPOSITION SUR WINDOW
    // ============================================

    global.updatePoolsDisplay = updatePoolsDisplay;
    global.togglePoolSection = togglePoolSection;
    global.togglePoolMode = togglePoolMode;
    global.generatePools = generatePools;
    global.updatePoolMatchScore = updatePoolMatchScore;
    global.handlePoolMatchEnter = handlePoolMatchEnter;
    global.generateFinalPhase = generateFinalPhase;

})(window);
