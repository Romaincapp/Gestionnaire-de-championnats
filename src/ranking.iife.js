// ============================================
// MODULE RANKING - Classements et statistiques
// ============================================
(function(global) {
    'use strict';

    var championship = global.championship;
    var config = global.config;
    var showNotification = global.showNotification;
    var calculateWinRate = global.calculateWinRate;

    // ============================================
    // CALCUL DES STATISTIQUES
    // ============================================

    // Helper pour extraire le nom du joueur (support ancien format string et nouveau format objet)
    function getPlayerName(player) {
        if (typeof player === 'object' && player !== null) {
            return player.name || '';
        }
        return String(player);
    }
    
    function getPlayerClub(player) {
        if (typeof player === 'object' && player !== null) {
            return player.club || '';
        }
        return '';
    }

    function calculatePlayerStats(player, dayNumber, division) {
        var playerName = getPlayerName(player);
        var playerClub = getPlayerClub(player);
        
        var stats = {
            player: playerName,
            club: playerClub,
            played: 0,
            wins: 0,
            losses: 0,
            pointsFor: 0,
            pointsAgainst: 0,
            points: 0
        };
        
        var dayData = championship.days[dayNumber];
        if (!dayData || !dayData.matches || !dayData.matches[division]) return stats;
        
        dayData.matches[division].forEach(function(match) {
            if (match.player1 !== playerName && match.player2 !== playerName) return;
            if (!match.completed) return;
            
            stats.played++;
            
            if (match.player1 === playerName) {
                stats.pointsFor += match.score1 || 0;
                stats.pointsAgainst += match.score2 || 0;
                if (match.winner === playerName) {
                    stats.wins++;
                    stats.points += 3;
                } else {
                    stats.losses++;
                }
            } else {
                stats.pointsFor += match.score2 || 0;
                stats.pointsAgainst += match.score1 || 0;
                if (match.winner === playerName) {
                    stats.wins++;
                    stats.points += 3;
                } else {
                    stats.losses++;
                }
            }
        });
        
        return stats;
    }

    // ============================================
    // AFFICHAGE DES CLASSEMENTS PAR JOURNEE
    // ============================================

    function updateRankings() {
        var currentDay = championship.currentDay;
        updateRankingsForDay(currentDay);
    }

    function updateRankingsForDay(dayNumber) {
        var container = document.getElementById('rankings-day-' + dayNumber);
        if (!container) return;
        
        var dayData = championship.days[dayNumber];
        if (!dayData || !dayData.players) {
            container.innerHTML = '<p style="text-align: center; color: #7f8c8d;">Aucune donnee</p>';
            return;
        }
        
        var html = '<div class="rankings-container">';
        
        for (var division = 1; division <= config.numberOfDivisions; division++) {
            var players = dayData.players[division] || [];
            if (players.length === 0) continue;
            
            var stats = players.map(function(player) {
                return calculatePlayerStats(player, dayNumber, division);
            });
            
            // Trier par points, puis par victoires
            stats.sort(function(a, b) {
                if (b.points !== a.points) return b.points - a.points;
                if (b.wins !== a.wins) return b.wins - a.wins;
                return (b.pointsFor - b.pointsAgainst) - (a.pointsFor - a.pointsAgainst);
            });
            
            html += '<div class="division-ranking">';
            html += '<h4>Division ' + division + '</h4>';
            html += '<table class="ranking-table">';
            html += '<thead><tr>';
            html += '<th>#</th><th>Joueur</th><th>Club</th><th>J</th><th>V</th><th>D</th><th>Points</th>';
            html += '</tr></thead><tbody>';
            
            stats.forEach(function(stat, index) {
                var rankClass = index < 3 ? 'rank-' + (index + 1) : '';
                var clubBadge = stat.club ? '<span style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; font-size: 10px; padding: 2px 8px; border-radius: 10px;">' + stat.club + '</span>' : '-';
                html += '<tr class="' + rankClass + '">';
                html += '<td>' + (index + 1) + '</td>';
                html += '<td>' + stat.player + '</td>';
                html += '<td>' + clubBadge + '</td>';
                html += '<td>' + stat.played + '</td>';
                html += '<td>' + stat.wins + '</td>';
                html += '<td>' + stat.losses + '</td>';
                html += '<td><strong>' + stat.points + '</strong></td>';
                html += '</tr>';
            });
            
            html += '</tbody></table>';
            html += '</div>';
        }
        
        html += '</div>';
        container.innerHTML = html;
    }

    function showRankings(type) {
        // Afficher le classement par type (points ou winrate)
        var currentDay = championship.currentDay;
        updateRankingsForDay(currentDay);
        
        // Mettre a jour les boutons actifs
        document.querySelectorAll('.toggle-btn').forEach(function(btn) {
            btn.classList.remove('active');
        });
        
        event.target.classList.add('active');
    }

    function showRankingsForDay(dayNumber) {
        updateRankingsForDay(dayNumber);
    }

    // ============================================
    // CLASSEMENT GENERAL
    // ============================================

    function updateGeneralRanking() {
        var container = document.getElementById('general-ranking-content');
        if (!container) return;
        
        var allStats = {};
        
        // Parcourir toutes les journees
        Object.keys(championship.days).forEach(function(dayNumber) {
            var dayData = championship.days[dayNumber];
            if (!dayData || !dayData.players) return;
            
            for (var division = 1; division <= config.numberOfDivisions; division++) {
                var players = dayData.players[division] || [];
                
                players.forEach(function(player) {
                    var playerName = getPlayerName(player);
                    var playerClub = getPlayerClub(player);
                    
                    if (!allStats[playerName]) {
                        allStats[playerName] = {
                            player: playerName,
                            club: playerClub,
                            played: 0,
                            wins: 0,
                            losses: 0,
                            points: 0,
                            daysPlayed: 0
                        };
                    }
                    
                    // Mettre à jour le club si on en trouve un
                    if (playerClub && !allStats[playerName].club) {
                        allStats[playerName].club = playerClub;
                    }
                    
                    var stats = calculatePlayerStats(player, parseInt(dayNumber), division);
                    allStats[playerName].played += stats.played;
                    allStats[playerName].wins += stats.wins;
                    allStats[playerName].losses += stats.losses;
                    allStats[playerName].points += stats.points;
                    if (stats.played > 0) allStats[playerName].daysPlayed++;
                });
            }
        });
        
        var sortedStats = Object.values(allStats).sort(function(a, b) {
            if (b.points !== a.points) return b.points - a.points;
            if (b.wins !== a.wins) return b.wins - a.wins;
            return b.played - a.played;
        });
        
        var html = '<div class="general-ranking">';
        html += '<table class="ranking-table">';
        html += '<thead><tr>';
        html += '<th>#</th><th>Joueur</th><th>Club</th><th>Jours</th><th>J</th><th>V</th><th>D</th><th>Points</th>';
        html += '</tr></thead><tbody>';
        
        sortedStats.forEach(function(stat, index) {
            var rankClass = index < 3 ? 'rank-' + (index + 1) : '';
            var winRate = stat.played > 0 ? Math.round((stat.wins / stat.played) * 100) : 0;
            var clubBadge = stat.club ? '<span style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; font-size: 10px; padding: 2px 8px; border-radius: 10px;">' + stat.club + '</span>' : '-';
            
            html += '<tr class="' + rankClass + '" onclick="showGeneralPlayerDetails(\'' + stat.player + '\')" style="cursor: pointer;">';
            html += '<td>' + (index + 1) + '</td>';
            html += '<td><strong>' + stat.player + '</strong></td>';
            html += '<td>' + clubBadge + '</td>';
            html += '<td>' + stat.daysPlayed + '</td>';
            html += '<td>' + stat.played + '</td>';
            html += '<td>' + stat.wins + ' <small>(' + winRate + '%)</small></td>';
            html += '<td>' + stat.losses + '</td>';
            html += '<td><strong>' + stat.points + '</strong></td>';
            html += '</tr>';
        });
        
        html += '</tbody></table>';
        html += '</div>';
        
        container.innerHTML = html;
    }

    function switchToGeneralRanking() {
        if (typeof global.switchToGeneralRanking === 'function') {
            global.switchToGeneralRanking();
        }
        updateGeneralRanking();
    }

    function showGeneralPlayerDetails(playerName) {
        var html = '<div id="playerModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; ' +
                   'background: rgba(0,0,0,0.5); display: flex; justify-content: center; ' +
                   'align-items: center; z-index: 10000;" onclick="if(event.target===this)closePlayerModal()">' +
                   '<div style="background: white; padding: 30px; border-radius: 10px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto;">' +
                   '<h3>📊 ' + playerName + '</h3>';
        
        // Recuperer tous les matchs du joueur
        var matches = [];
        Object.keys(championship.days).forEach(function(dayNumber) {
            var dayData = championship.days[dayNumber];
            if (!dayData || !dayData.matches) return;
            
            for (var division = 1; division <= config.numberOfDivisions; division++) {
                var divisionMatches = dayData.matches[division] || [];
                divisionMatches.forEach(function(match) {
                    if (match.player1 === playerName || match.player2 === playerName) {
                        matches.push({
                            day: dayNumber,
                            division: division,
                            match: match
                        });
                    }
                });
            }
        });
        
        html += '<p><strong>Total matchs:</strong> ' + matches.length + '</p>';
        
        if (matches.length > 0) {
            html += '<h4>Historique</h4><ul>';
            matches.forEach(function(m) {
                var isWinner = m.match.winner === playerName;
                var result = isWinner ? '✅ Victoire' : (m.match.completed ? '❌ Defaite' : '⏳ En cours');
                var score = m.match.completed ? (' (' + m.match.score1 + '-' + m.match.score2 + ')') : '';
                var opponent = m.match.player1 === playerName ? m.match.player2 : m.match.player1;
                
                html += '<li>Journee ' + m.day + ': vs ' + opponent + ' - ' + result + score + '</li>';
            });
            html += '</ul>';
        }
        
        html += '<div style="display: flex; justify-content: flex-end;">' +
                '<button onclick="closePlayerModal()" class="btn btn-secondary">Fermer</button>' +
                '</div></div></div>';
        
        document.body.insertAdjacentHTML('beforeend', html);
    }

    // ============================================
    // EXPOSITION SUR WINDOW
    // ============================================

    global.calculatePlayerStats = calculatePlayerStats;
    global.updateRankings = updateRankings;
    global.updateRankingsForDay = updateRankingsForDay;
    global.showRankings = showRankings;
    global.showRankingsForDay = showRankingsForDay;
    global.updateGeneralRanking = updateGeneralRanking;
    global.showGeneralPlayerDetails = showGeneralPlayerDetails;

})(window);
