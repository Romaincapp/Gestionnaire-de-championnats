// ============================================
// MODULE CLASSEMENTS (IIFE)
// ============================================
(function(global) {
    'use strict';

    var championship = global.championship;
    var showNotification = global.showNotification;
    var saveToLocalStorage = function() { if (typeof global.saveToLocalStorage === 'function') global.saveToLocalStorage(); };
    var getNumberOfDivisions = function() { return typeof global.getNumberOfDivisions === 'function' ? global.getNumberOfDivisions() : 3; };
    var getPlayerName = function(p) { return typeof global.getPlayerName === 'function' ? global.getPlayerName(p) : (p || ''); };
    var escapeForOnclick = function(s) { return typeof global.escapeForOnclick === 'function' ? global.escapeForOnclick(s) : s; };
    var getPlayerFinalStageForDay = function(playerName, dayNumber, division) { return typeof global.getPlayerFinalStageForDay === 'function' ? global.getPlayerFinalStageForDay(playerName, dayNumber, division) : null; };
    var getBestPlayerStage = function(playerName, division) { return typeof global.getBestPlayerStage === 'function' ? global.getBestPlayerStage(playerName, division) : null; };

    // STATISTIQUES ET CLASSEMENTS
    function calculatePlayerStats(dayNumber, division, playerName) {
        const dayData = championship.days[dayNumber];
        if (!dayData) return null;

        // Collecter les matchs classiques
        let playerMatches = dayData.matches[division].filter(match =>
            match.player1 === playerName || match.player2 === playerName
        );

        // Ajouter les matchs de poules si le mode poule est activé
        if (dayData.pools && dayData.pools.enabled && dayData.pools.divisions[division]) {
            const poolMatches = dayData.pools.divisions[division].matches || [];
            const playerPoolMatches = poolMatches.filter(match =>
                match.player1 === playerName || match.player2 === playerName
            );
            playerMatches = [...playerMatches, ...playerPoolMatches];
        }

        // Ajouter les matchs de phase finale si présents (ancien système)
        if (dayData.pools && dayData.pools.divisions[division] && dayData.pools.divisions[division].finalPhase) {
            const finalMatches = dayData.pools.divisions[division].finalPhase || [];
            const playerFinalMatches = finalMatches.filter(match =>
                match.player1 === playerName || match.player2 === playerName
            );
            playerMatches = [...playerMatches, ...playerFinalMatches];
        }

        // Ajouter les matchs de phase finale MANUELLE si présents (nouveau système)
        if (dayData.pools && dayData.pools.manualFinalPhase && dayData.pools.manualFinalPhase.divisions[division]) {
            const manualFinalPhase = dayData.pools.manualFinalPhase.divisions[division];
            if (manualFinalPhase.rounds) {
                // Parcourir tous les tours (16èmes, 8èmes, Quarts, Demi-finales, Finale, Petite finale)
                Object.values(manualFinalPhase.rounds).forEach(round => {
                    if (round.matches) {
                        const playerRoundMatches = round.matches.filter(match =>
                            match.player1 === playerName || match.player2 === playerName
                        );
                        playerMatches = [...playerMatches, ...playerRoundMatches];
                    }
                });
            }
        }

        let wins = 0;
        let draws = 0;
        let losses = 0;
        let forfeits = 0;
        let pointsWon = 0;
        let pointsLost = 0;
        let matchesPlayed = 0;

        playerMatches.forEach(match => {
            // Appeler checkMatchCompletion seulement pour les matchs classiques (pas pour les matchs de poules)
            const matchIndex = dayData.matches[division].indexOf(match);
            if (matchIndex !== -1) {
                // C'est un match classique
                checkMatchCompletion(dayNumber, division, matchIndex);
            }
            // Les matchs de poules ont déjà leur statut completed/winner défini

            if (match.completed) {
                matchesPlayed++;
                const isPlayer1 = match.player1 === playerName;

                // Cas forfait
                if (match.forfaitBy) {
                    if (match.forfaitBy === (isPlayer1 ? 'player1' : 'player2')) {
                        forfeits++;  // Ce joueur a déclaré forfait
                    } else {
                        wins++;      // Victoire par forfait adverse
                    }
                }
                // Cas match nul (score1 == score2, winner === null)
                else if (match.winner === null) {
                    draws++;
                }
                // Cas victoire/défaite normale
                else if (match.winner === playerName) {
                    wins++;
                } else {
                    losses++;
                }

                const score1 = parseInt(match.score1) || 0;
                const score2 = parseInt(match.score2) || 0;

                if (isPlayer1) {
                    pointsWon += score1;
                    pointsLost += score2;
                } else {
                    pointsWon += score2;
                    pointsLost += score1;
                }
            }
        });

        const winRate = matchesPlayed > 0 ? Math.round((wins / matchesPlayed) * 100) : 0;
        const totalPoints = wins * 3 + draws * 2 + losses * 1 + forfeits * 0;

        return {
            matchesPlayed,
            wins,
            draws,
            losses,
            forfeits,
            pointsWon,
            pointsLost,
            winRate,
            totalPoints,
            matches: playerMatches
        };
    }

    function showPlayerDetails(dayNumber, division, playerName) {
        const stats = calculatePlayerStats(dayNumber, division, playerName);
        if (!stats) return;
        
        const playerNameTitle = document.getElementById('playerNameTitle');
        if (playerNameTitle) {
            playerNameTitle.textContent = `${playerName} - Division ${division} - Journée ${dayNumber}`;
        }
        
        const playerOverview = document.getElementById('playerOverview');
        if (playerOverview) {
            playerOverview.innerHTML = `
                <div class="overview-card">
                    <div class="overview-number">${stats.matchesPlayed}</div>
                    <div class="overview-label">Matchs joués</div>
                </div>
                <div class="overview-card" style="background: #d4edda;">
                    <div class="overview-number" style="color: #155724;">${stats.wins}</div>
                    <div class="overview-label">Victoires</div>
                </div>
                <div class="overview-card" style="background: #e3f2fd;">
                    <div class="overview-number" style="color: #1565c0;">${stats.draws || 0}</div>
                    <div class="overview-label">Nuls</div>
                </div>
                <div class="overview-card" style="background: #f8d7da;">
                    <div class="overview-number" style="color: #721c24;">${stats.losses}</div>
                    <div class="overview-label">Défaites</div>
                </div>
                <div class="overview-card" style="background: #fff3cd;">
                    <div class="overview-number" style="color: #856404;">${stats.forfeits || 0}</div>
                    <div class="overview-label">Forfaits</div>
                </div>
                <div class="overview-card">
                    <div class="overview-number">${stats.winRate}%</div>
                    <div class="overview-label">% Victoires</div>
                </div>
                <div class="overview-card">
                    <div class="overview-number">${stats.pointsWon}/${stats.pointsLost}</div>
                    <div class="overview-label">PP/PC</div>
                </div>
                <div class="overview-card">
                    <div class="overview-number">${stats.totalPoints}</div>
                    <div class="overview-label">Points</div>
                </div>
            `;
        }
        
        let matchesHtml = '';
        stats.matches.forEach(match => {
            const isPlayer1 = match.player1 === playerName;
            const opponent = isPlayer1 ? match.player2 : match.player1;

            // Déterminer le résultat
            let resultClass = '';
            let resultText = 'En cours';

            if (match.completed) {
                if (match.forfaitBy) {
                    const playerForfait = match.forfaitBy === (isPlayer1 ? 'player1' : 'player2');
                    resultClass = playerForfait ? 'forfait' : 'win';
                    resultText = playerForfait ? 'Forfait' : 'Victoire (forfait adv.)';
                } else if (match.winner === null) {
                    resultClass = 'draw';
                    resultText = 'Match nul';
                } else if (match.winner === playerName) {
                    resultClass = 'win';
                    resultText = 'Victoire';
                } else {
                    resultClass = 'loss';
                    resultText = 'Défaite';
                }
            }

            let setsScore = '';
            if (match.completed) {
                const score1 = parseInt(match.score1) || 0;
                const score2 = parseInt(match.score2) || 0;
                const playerScore = isPlayer1 ? score1 : score2;
                const opponentScore = isPlayer1 ? score2 : score1;
                setsScore = `(${playerScore}-${opponentScore})`;
            }

            const bgColor = resultClass === 'win' ? '#d4edda' :
                           resultClass === 'draw' ? '#e3f2fd' :
                           resultClass === 'loss' ? '#f8d7da' :
                           resultClass === 'forfait' ? '#fff3cd' : '#f8f9fa';

            matchesHtml += `
                <div class="history-match ${resultClass}" style="background: ${bgColor};">
                    <div>
                        <div class="history-opponent">VS ${opponent}</div>
                        <div style="font-size: 12px; color: #7f8c8d;">Tour ${match.tour || '-'}</div>
                    </div>
                    <div class="history-score">
                        ${resultText} ${setsScore}
                    </div>
                </div>
            `;
        });
        
        const playerMatches = document.getElementById('playerMatches');
        if (playerMatches) {
            playerMatches.innerHTML = matchesHtml || '<p style="text-align: center; color: #7f8c8d;">Aucun match joué</p>';
        }
        
        const playerModal = document.getElementById('playerModal');
        if (playerModal) {
            playerModal.style.display = 'block';
        }
    }
    window.showPlayerDetails = showPlayerDetails;

    function closePlayerModal() {
        const playerModal = document.getElementById('playerModal');
        if (playerModal) {
            playerModal.style.display = 'none';
        }
    }
    window.closePlayerModal = closePlayerModal;

    function updateRankings() {
        const targetDay = parseInt(document.getElementById('targetDay').value);
        updateRankingsForDay(targetDay);
    }
    window.updateRankings = updateRankings;
    window.updateStats = updateStats;

    function updateStats(dayNumber) {
        const dayData = championship.days[dayNumber];
        if (!dayData) return;

        const numDivisions = championship.config?.numberOfDivisions || 3;
        let totalPlayers = 0;
        let totalMatches = 0;
        let completedMatches = 0;

        for (let division = 1; division <= numDivisions; division++) {
            totalPlayers += dayData.players[division].length;
            totalMatches += dayData.matches[division].length;
            
            dayData.matches[division].forEach((match, index) => {
                checkMatchCompletion(dayNumber, division, index);
                if (match.completed) completedMatches++;
            });
        }
        
        const statsDiv = document.getElementById(`stats-${dayNumber}`);
        const statsContent = document.getElementById(`statsContent-${dayNumber}`);
        
        if (!statsDiv || !statsContent) return;
        
        if (totalMatches > 0) {
            statsDiv.style.display = 'block';
            const completionRate = Math.round((completedMatches / totalMatches) * 100);
            
            let tourStats = '';
            for (let tour = 1; tour <= 4; tour++) {
                let tourTotal = 0;
                let tourCompleted = 0;

                for (let division = 1; division <= numDivisions; division++) {
                    const tourMatches = dayData.matches[division].filter(m => m.tour === tour);
                    tourTotal += tourMatches.length;
                    tourCompleted += tourMatches.filter(m => m.completed).length;
                }
                
                if (tourTotal > 0) {
                    const tourRate = Math.round((tourCompleted / tourTotal) * 100);
                    tourStats += `
                        <div class="stat-card">
                            <div class="stat-number">${tourRate}%</div>
                            <div>Tour ${tour} (${tourCompleted}/${tourTotal})</div>
                        </div>
                    `;
                }
            }
            
            statsContent.innerHTML = `
                <div class="stat-card">
                    <div class="stat-number">${totalPlayers}</div>
                    <div>Joueurs inscrits</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${totalMatches}</div>
                    <div>Matchs générés</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${completedMatches}</div>
                    <div>Matchs terminés</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${completionRate}%</div>
                    <div>Progression</div>
                </div>
                ${tourStats}
            `;
        } else {
            statsDiv.style.display = 'none';
        }
    }

    function showRankings(type) {
        showRankingsForDay(championship.currentDay, type);
    }
    window.showRankings = showRankings;

    function showRankingsForDay(dayNumber, type) {
        const rankingsSection = document.getElementById(`rankings-${dayNumber}`);
        if (!rankingsSection) return;

        document.querySelectorAll(`#rankings-${dayNumber} .toggle-btn`).forEach(btn => {
            btn.classList.remove('active');
            if ((type === 'points' && btn.textContent.includes('Points')) ||
                (type === 'winrate' && btn.textContent.includes('Victoires'))) {
                btn.classList.add('active');
            }
        });
        updateRankingsForDay(dayNumber, type);
    }
    window.showRankingsForDay = showRankingsForDay;

    function updateRankingsForDay(dayNumber, sortBy = 'points') {
        const dayData = championship.days[dayNumber];
        if (!dayData) return;

        const numDivisions = championship.config?.numberOfDivisions || 3;
        let rankingsHtml = '';
        let hasAnyMatches = false;

        for (let division = 1; division <= numDivisions; division++) {
            // Vérifier les matchs classiques
            const classicMatches = dayData.matches[division] || [];
            if (classicMatches.some(match => {
                checkMatchCompletion(dayNumber, division, classicMatches.indexOf(match));
                return match.completed;
            })) {
                hasAnyMatches = true;
                break;
            }

            // Vérifier les matchs de poules
            if (dayData.pools && dayData.pools.enabled && dayData.pools.divisions[division]) {
                const poolMatches = dayData.pools.divisions[division].matches || [];
                const completedPoolMatches = poolMatches.filter(m => m.completed).length;
                if (poolMatches.some(match => match.completed)) {
                    hasAnyMatches = true;
                    break;
                }
            }

            // Vérifier les matchs de phase finale (ancien système)
            if (dayData.pools && dayData.pools.divisions[division] && dayData.pools.divisions[division].finalPhase) {
                const finalMatches = dayData.pools.divisions[division].finalPhase || [];
                if (finalMatches.some(match => match.completed)) {
                    hasAnyMatches = true;
                    break;
                }
            }

            // Vérifier les matchs de phase finale MANUELLE (nouveau système)
            if (dayData.pools && dayData.pools.manualFinalPhase && dayData.pools.manualFinalPhase.divisions[division]) {
                const manualFinalPhase = dayData.pools.manualFinalPhase.divisions[division];
                if (manualFinalPhase.rounds) {
                    const hasCompletedFinalMatch = Object.values(manualFinalPhase.rounds).some(round =>
                        round.matches && round.matches.some(match => match.completed)
                    );
                    if (hasCompletedFinalMatch) {
                        hasAnyMatches = true;
                        break;
                    }
                }
            }
        }

        if (!hasAnyMatches) {
            alert(`Aucun match terminé dans la Journée ${dayNumber} pour établir un classement !`);
            return;
        }

        // Vérifier si le mode pool est activé pour cette journée
        const isPoolMode = dayData.pools?.enabled;

        for (let division = 1; division <= numDivisions; division++) {
            if (!dayData.players[division] || dayData.players[division].length === 0) continue;

           const playerStats = dayData.players[division]
    .map(p => getPlayerName(p))
    .filter(player => player && player.toUpperCase() !== 'BYE')
    .map(player => {
    const stats = calculatePlayerStats(dayNumber, division, player);
    // Récupérer l'étape finale du joueur pour cette journée
    const stage = getPlayerFinalStageForDay(player, dayNumber, division);
    return {
        name: player,
        ...stats,
        goalAveragePoints: stats.pointsWon - stats.pointsLost,
        // Ajouter les informations d'étape finale
        stageWeight: stage ? stage.stageWeight : 0,
        stageLabel: stage ? stage.stageLabel : '-',
        stagePosition: stage ? stage.position : 999
    };
});

if (sortBy === 'points') {
    // Tri standard par points (avec étape finale en priorité en mode pool)
    playerStats.sort((a, b) => {
        // EN MODE POOL: Prioriser l'étape finale
        if (isPoolMode) {
            if (b.stageWeight !== a.stageWeight) return b.stageWeight - a.stageWeight;
        }

        // 1. Points totaux
        if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;

        // 2. Nombre de victoires
        if (b.wins !== a.wins) return b.wins - a.wins;

        // 3. Différence de points (PP - PC)
        if (b.goalAveragePoints !== a.goalAveragePoints) return b.goalAveragePoints - a.goalAveragePoints;

        // 4. Points Pour
        if (b.pointsWon !== a.pointsWon) return b.pointsWon - a.pointsWon;

        // 5. Ordre alphabétique
        return a.name.localeCompare(b.name);
    });
} else {
    // Tri par % victoires (avec étape finale en priorité en mode pool)
    playerStats.sort((a, b) => {
        // EN MODE POOL: Prioriser l'étape finale
        if (isPoolMode) {
            if (b.stageWeight !== a.stageWeight) return b.stageWeight - a.stageWeight;
        }

        // 1. % de victoires
        if (b.winRate !== a.winRate) return b.winRate - a.winRate;

        // 2. Nombre de matchs joués (favorise qui a joué plus)
        if (b.matchesPlayed !== a.matchesPlayed) return b.matchesPlayed - a.matchesPlayed;

        // 3. Différence de points
        if (b.goalAveragePoints !== a.goalAveragePoints) return b.goalAveragePoints - a.goalAveragePoints;

        // 4. Points Pour
        if (b.pointsWon !== a.pointsWon) return b.pointsWon - a.pointsWon;

        // 5. Ordre alphabétique
        return a.name.localeCompare(b.name);
    });
}
            
           rankingsHtml += `
    <div style="margin-bottom: 30px;">
        <h3 style="color: #2c3e50; margin-bottom: 15px;">
            ${division === 1 ? '🥇' : division === 2 ? '🥈' : '🥉'} Division ${division}
        </h3>
        <table class="ranking-table">
            <thead>
                <tr>
                    <th>Rang</th>
                    <th>Joueur</th>
                    ${isPoolMode ? '<th>Étape</th>' : ''}
                    <th>Points</th>
                    <th>V/N/D/F</th>
                    <th>% Vict.</th>
                    <th>PP/PC</th>
                    <th>Diff</th>
                    <th>Matchs</th>
                </tr>
            </thead>
            <tbody>
`;

playerStats.forEach((player, index) => {
    const rankClass = index === 0 ? 'rank-gold' : index === 1 ? 'rank-silver' : index === 2 ? 'rank-bronze' : '';
    const diffStyle = player.goalAveragePoints > 0 ? 'color: #27ae60; font-weight: bold;' :
                      player.goalAveragePoints < 0 ? 'color: #e74c3c; font-weight: bold;' : '';
    const escapedPlayerName = escapeForOnclick(player.name);

    // Style de la colonne Étape selon le résultat
    let stageStyle = '';
    let stageIcon = '';
    if (player.stageLabel === 'Champion') {
        stageStyle = 'background: linear-gradient(135deg, #ffd700, #ffed4e); color: #856404; font-weight: bold;';
        stageIcon = '🏆 ';
    } else if (player.stageLabel === 'Finaliste') {
        stageStyle = 'background: linear-gradient(135deg, #c0c0c0, #e8e8e8); color: #555; font-weight: bold;';
        stageIcon = '🥈 ';
    } else if (player.stageLabel === '3ème') {
        stageStyle = 'background: linear-gradient(135deg, #cd7f32, #daa520); color: white; font-weight: bold;';
        stageIcon = '🥉 ';
    } else if (player.stageLabel === '4ème') {
        stageStyle = 'background: #f0e68c; color: #666; font-weight: 500;';
    } else if (player.stageLabel === 'Demi') {
        stageStyle = 'background: #e8f5e9; color: #2e7d32;';
    } else if (player.stageLabel === 'Quart') {
        stageStyle = 'background: #e3f2fd; color: #1565c0;';
    } else if (player.stageLabel === '8ème' || player.stageLabel === '16ème') {
        stageStyle = 'background: #fff3e0; color: #ef6c00;';
    } else if (player.stageLabel === 'Pool') {
        stageStyle = 'background: #ffebee; color: #c62828;';
    }

    rankingsHtml += `
        <tr style="cursor: pointer;" onclick="showPlayerDetails(${dayNumber}, ${division}, '${escapedPlayerName}')">
            <td class="rank-position ${rankClass}">${index + 1}</td>
            <td style="font-weight: 600;">${player.name}</td>
            ${isPoolMode ? `<td style="${stageStyle} text-align: center; border-radius: 4px;">${stageIcon}${player.stageLabel}</td>` : ''}
            <td class="stat-value">${player.totalPoints}</td>
            <td>${player.wins}/${player.draws || 0}/${player.losses}/${player.forfeits || 0}</td>
            <td>${player.winRate}%</td>
            <td>${player.pointsWon}/${player.pointsLost}</td>
            <td style="${diffStyle}">${player.goalAveragePoints > 0 ? '+' : ''}${player.goalAveragePoints}</td>
            <td>${player.matchesPlayed}</td>
        </tr>
    `;
});
            
            rankingsHtml += `
                        </tbody>
                    </table>
                </div>
            `;
        }
        
        const rankingsContentEl = document.getElementById(`rankingsContent-${dayNumber}`);
        const rankingsEl = document.getElementById(`rankings-${dayNumber}`);
        
        if (rankingsContentEl && rankingsEl) {
            rankingsContentEl.innerHTML = rankingsHtml;
            rankingsEl.style.display = 'block';
            rankingsEl.scrollIntoView({ behavior: 'smooth' });
        }
    }
    window.updateRankingsForDay = updateRankingsForDay;

    // CLASSEMENT GÉNÉRAL
    function updateGeneralRanking() {
        const generalStats = calculateGeneralStats();
        
        const generalStatsEl = document.getElementById('generalStats');
        if (generalStatsEl) {
            generalStatsEl.innerHTML = `
                <div class="general-stat-card">
                    <div class="general-stat-number">${generalStats.totalDays}</div>
                    <div class="general-stat-label">Journées</div>
                </div>
                <div class="general-stat-card">
                    <div class="general-stat-number">${generalStats.totalPlayers}</div>
                    <div class="general-stat-label">Joueurs uniques</div>
                </div>
                <div class="general-stat-card">
                    <div class="general-stat-number">${generalStats.totalMatches}</div>
                    <div class="general-stat-label">Matchs joués</div>
                </div>
                <div class="general-stat-card">
                    <div class="general-stat-number">${generalStats.completedMatches}</div>
                    <div class="general-stat-label">Matchs terminés</div>
                </div>
            `;
        }
        
        const generalRanking = calculateGeneralRanking();
        
        const generalRankingContent = document.getElementById('generalRankingContent');
        if (!generalRankingContent) return;
        
        if (!generalRanking.hasData) {
            generalRankingContent.innerHTML = `
                <div class="empty-state">
                    Terminez au moins un match dans une journée pour voir le classement général
                </div>
            `;
            return;
        }
        
        let rankingHtml = '';
        const numDivisions = championship.config?.numberOfDivisions || 3;

        // Vérifier si le mode pool est activé pour afficher la colonne Étape
        const isPoolMode = Object.values(championship.days).some(day => day.pools?.enabled);

        for (let division = 1; division <= numDivisions; division++) {
            if (!generalRanking.divisions[division] || generalRanking.divisions[division].length === 0) continue;

            rankingHtml += `
    <div style="margin-bottom: 40px;">
        <h3 style="color: #e67e22; margin-bottom: 20px; font-size: 1.4rem;">
            ${division === 1 ? '🥇' : division === 2 ? '🥈' : '🥉'} Division ${division} - Classement Général
        </h3>
        <table class="ranking-table">
            <thead>
                <tr>
                    <th>Rang</th>
                    <th>Joueur</th>
                    ${isPoolMode ? '<th>Étape</th>' : ''}
                    <th>Points Total</th>
                    <th>Journées</th>
                    <th>V/N/D/F</th>
                    <th>% Vict. Moy.</th>
                    <th>PP/PC</th>
                    <th>Diff</th>
                </tr>
            </thead>
            <tbody>
`;

generalRanking.divisions[division].forEach((player, index) => {
    const rankClass = index === 0 ? 'rank-gold' : index === 1 ? 'rank-silver' : index === 2 ? 'rank-bronze' : '';
    const diffStyle = player.goalAveragePoints > 0 ? 'color: #27ae60; font-weight: bold;' :
                      player.goalAveragePoints < 0 ? 'color: #e74c3c; font-weight: bold;' : '';
    const escapedPlayerName = escapeForOnclick(player.name);

    // Style de la colonne Étape selon le résultat
    let stageStyle = '';
    let stageIcon = '';
    if (player.stageLabel === 'Champion') {
        stageStyle = 'background: linear-gradient(135deg, #ffd700, #ffed4e); color: #856404; font-weight: bold;';
        stageIcon = '🏆 ';
    } else if (player.stageLabel === 'Finaliste') {
        stageStyle = 'background: linear-gradient(135deg, #c0c0c0, #e8e8e8); color: #555; font-weight: bold;';
        stageIcon = '🥈 ';
    } else if (player.stageLabel === '3ème') {
        stageStyle = 'background: linear-gradient(135deg, #cd7f32, #daa520); color: white; font-weight: bold;';
        stageIcon = '🥉 ';
    } else if (player.stageLabel === '4ème') {
        stageStyle = 'background: #f0e68c; color: #666; font-weight: 500;';
    } else if (player.stageLabel === 'Demi') {
        stageStyle = 'background: #e8f5e9; color: #2e7d32;';
    } else if (player.stageLabel === 'Quart') {
        stageStyle = 'background: #e3f2fd; color: #1565c0;';
    } else if (player.stageLabel === '8ème' || player.stageLabel === '16ème') {
        stageStyle = 'background: #fff3e0; color: #ef6c00;';
    } else if (player.stageLabel === 'Pool') {
        stageStyle = 'background: #ffebee; color: #c62828;';
    }

    rankingHtml += `
        <tr style="cursor: pointer;" onclick="showGeneralPlayerDetails('${escapedPlayerName}', ${division})">
            <td class="rank-position ${rankClass}">${index + 1}</td>
            <td style="font-weight: 600;">${player.name}</td>
            ${isPoolMode ? `<td style="${stageStyle} text-align: center; border-radius: 4px;">${stageIcon}${player.stageLabel}</td>` : ''}
            <td class="stat-value">${player.totalPoints}</td>
            <td>${player.daysPlayed}</td>
            <td>${player.totalWins}/${player.totalDraws || 0}/${player.totalLosses}/${player.totalForfaits}</td>
            <td>${player.avgWinRate}%</td>
            <td>${player.totalPointsWon}/${player.totalPointsLost}</td>
            <td style="${diffStyle}">${player.goalAveragePoints > 0 ? '+' : ''}${player.goalAveragePoints}</td>
        </tr>
    `;
});
            
            rankingHtml += `
                        </tbody>
                    </table>
                </div>
            `;
        }
        
        generalRankingContent.innerHTML = rankingHtml;
        showNotification('Classement général mis à jour !', 'success');
    }
    window.updateGeneralRanking = updateGeneralRanking;

    function calculateGeneralStats() {
        let totalPlayers = new Set();
        let totalMatches = 0;
        let completedMatches = 0;
        let totalDays = Object.keys(championship.days).length;

        Object.values(championship.days).forEach(day => {
            Object.values(day.players).forEach(divPlayers => {
                divPlayers.forEach(player => totalPlayers.add(getPlayerName(player)));
            });
            Object.values(day.matches).forEach(divMatches => {
                totalMatches += divMatches.length;
                completedMatches += divMatches.filter(match => match.completed).length;
            });
        });
        
        return {
            totalDays,
            totalPlayers: totalPlayers.size,
            totalMatches,
            completedMatches
        };
    }

    function calculateGeneralRanking() {
        const numDivisions = championship.config?.numberOfDivisions || 3;
        const divisions = {};
        for (let i = 1; i <= numDivisions; i++) {
            divisions[i] = [];
        }

        const generalRanking = {
            hasData: false,
            divisions: divisions
        };

        for (let division = 1; division <= numDivisions; division++) {
            const playersData = {};
            const playerFirstAppearance = {}; // Première journée où chaque joueur apparaît
            const playerLastAppearance = {};  // Dernière journée où chaque joueur apparaît

            // Étape 1: Déterminer la première ET dernière apparition de chaque joueur
            Object.keys(championship.days).forEach(dayNumber => {
                const dayNum = parseInt(dayNumber);
                const dayData = championship.days[dayNum];

                (dayData.players[division] || [])
                    .map(p => getPlayerName(p))
                    .filter(playerName => playerName && playerName.toUpperCase() !== 'BYE')
                    .forEach(playerName => {
                        if (!playerFirstAppearance[playerName] || dayNum < playerFirstAppearance[playerName]) {
                            playerFirstAppearance[playerName] = dayNum;
                        }
                        if (!playerLastAppearance[playerName] || dayNum > playerLastAppearance[playerName]) {
                            playerLastAppearance[playerName] = dayNum;
                        }
                    });
            });

            // Étape 2: Calculer les stats pour chaque joueur
            Object.keys(championship.days).forEach(dayNumber => {
                const dayNum = parseInt(dayNumber);
                const dayData = championship.days[dayNum];

                (dayData.players[division] || [])
                    .map(p => getPlayerName(p))
                    .filter(playerName => playerName && playerName.toUpperCase() !== 'BYE')
                    .forEach(playerName => {
                   if (!playersData[playerName]) {
    playersData[playerName] = {
        name: playerName,
        daysPlayed: 0,
        totalPoints: 0,
        totalWins: 0,
        totalDraws: 0,
        totalLosses: 0,
        totalForfaits: 0,
        totalPointsWon: 0,
        totalPointsLost: 0,
        totalMatchesPlayed: 0,
        winRates: [],
        firstDay: playerFirstAppearance[playerName]
    };

    // Ajouter des forfaits pour les journées manquées AVANT la première apparition
    const allDays = Object.keys(championship.days).map(d => parseInt(d)).sort((a, b) => a - b);
    const missedDays = allDays.filter(d => d < playerFirstAppearance[playerName]);

    missedDays.forEach(() => {
        // 4 forfaits par journée manquée = 0 points, -20 goal average (5 buts encaissés par match)
        playersData[playerName].totalForfaits += 4;
        playersData[playerName].totalPoints += 0; // 4 forfaits × 0 point
        playersData[playerName].totalPointsLost += 20; // 4 forfaits × 5 buts encaissés
        playersData[playerName].totalMatchesPlayed += 4;
        playersData[playerName].winRates.push(0); // 0% de victoire pour une journée forfait
    });
}

const dayStats = calculatePlayerStats(dayNum, division, playerName);
if (dayStats && dayStats.matchesPlayed > 0) {
    playersData[playerName].daysPlayed++;
    playersData[playerName].totalPoints += dayStats.totalPoints;
    playersData[playerName].totalWins += dayStats.wins;
    playersData[playerName].totalDraws += dayStats.draws || 0;
    playersData[playerName].totalLosses += dayStats.losses;
    playersData[playerName].totalForfaits += dayStats.forfeits || 0;  // Forfaits par match
    playersData[playerName].totalPointsWon += dayStats.pointsWon;
    playersData[playerName].totalPointsLost += dayStats.pointsLost;
    playersData[playerName].totalMatchesPlayed += dayStats.matchesPlayed;
    playersData[playerName].winRates.push(dayStats.winRate);

    generalRanking.hasData = true;
}
                });
            });

            // Étape 3: Ajouter les forfaits pour les journées manquées APRÈS la dernière apparition
            const allDays = Object.keys(championship.days).map(d => parseInt(d)).sort((a, b) => a - b);
            Object.keys(playersData).forEach(playerName => {
                const missedDaysAfter = allDays.filter(d => d > playerLastAppearance[playerName]);
                missedDaysAfter.forEach(() => {
                    // 4 forfaits par journée manquée = 0 points, -20 goal average
                    playersData[playerName].totalForfaits += 4;
                    playersData[playerName].totalPoints += 0;
                    playersData[playerName].totalPointsLost += 20;
                    playersData[playerName].totalMatchesPlayed += 4;
                    playersData[playerName].winRates.push(0);
                });
            });

           // Étape 4: Déterminer si on est en mode pool et récupérer les étapes finales
           const isPoolMode = Object.values(championship.days).some(day => day.pools?.enabled);

           const playersArray = Object.values(playersData)
    .filter(player => player.daysPlayed > 0)
    .map(player => {
        // Calculer la meilleure étape finale du joueur sur toutes les journées
        const bestStage = getBestPlayerStage(player.name, division);

        return {
            ...player,
            avgWinRate: player.winRates.length > 0 ?
                Math.round(player.winRates.reduce((a, b) => a + b, 0) / player.winRates.length) : 0,
            goalAveragePoints: player.totalPointsWon - player.totalPointsLost,
            // Ajouter les informations d'étape finale
            stageWeight: bestStage ? bestStage.stageWeight : 0,
            stageLabel: bestStage ? bestStage.stageLabel : '-',
            stagePosition: bestStage ? bestStage.position : 999,
            stageDayNumber: bestStage ? bestStage.dayNumber : null
        };
    })
    .sort((a, b) => {
        // EN MODE POOL: Prioriser l'étape finale
        if (isPoolMode) {
            // 1. Étape finale (stageWeight) - plus c'est élevé, meilleure est la performance
            if (b.stageWeight !== a.stageWeight) return b.stageWeight - a.stageWeight;
        }

        // 2. Points totaux
        if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;

        // 3. Nombre de victoires
        if (b.totalWins !== a.totalWins) return b.totalWins - a.totalWins;

        // 4. Différence de points (PP - PC)
        if (b.goalAveragePoints !== a.goalAveragePoints) return b.goalAveragePoints - a.goalAveragePoints;

        // 5. Points Pour
        if (b.totalPointsWon !== a.totalPointsWon) return b.totalPointsWon - a.totalPointsWon;

        // 6. % victoires moyen
        if (b.avgWinRate !== a.avgWinRate) return b.avgWinRate - a.avgWinRate;

        // 7. Ordre alphabétique
        return a.name.localeCompare(b.name);
    });
            
            generalRanking.divisions[division] = playersArray;
        }
        
        return generalRanking;
    }

    function showGeneralPlayerDetails(playerName, division) {
        const playerHistory = [];

        // Déterminer la première ET dernière journée où le joueur apparaît
        let firstAppearance = null;
        let lastAppearance = null;
        Object.keys(championship.days).forEach(dayNumber => {
            const dayNum = parseInt(dayNumber);
            const dayData = championship.days[dayNum];

            // Vérifier si le joueur existe (en gérant le format objet {name, club})
            const playerExists = dayData.players[division].some(p => {
                const pName = typeof p === 'object' ? p.name : p;
                return pName === playerName;
            });
            if (playerExists) {
                if (firstAppearance === null || dayNum < firstAppearance) {
                    firstAppearance = dayNum;
                }
                if (lastAppearance === null || dayNum > lastAppearance) {
                    lastAppearance = dayNum;
                }
            }
        });

        const allDays = Object.keys(championship.days).map(d => parseInt(d)).sort((a, b) => a - b);

        // Si le joueur n'a été trouvé dans aucune journée, afficher un message d'erreur
        if (firstAppearance === null || lastAppearance === null) {
            alert('Joueur non trouvé dans le championnat');
            return;
        }

        // Ajouter des journées forfait pour les journées manquées AVANT la première apparition
        allDays.forEach(dayNum => {
            if (dayNum < firstAppearance) {
                playerHistory.push({
                    day: dayNum,
                    totalPoints: 0,
                    wins: 0,
                    draws: 0,
                    losses: 0,
                    forfaits: 4,
                    pointsWon: 0,
                    pointsLost: 20,
                    matchesPlayed: 4,
                    winRate: 0,
                    isForfeit: true
                });
            }
        });

        // Ajouter les journées réellement jouées
        Object.keys(championship.days).sort((a, b) => Number(a) - Number(b)).forEach(dayNumber => {
            const dayNum = parseInt(dayNumber);
            const dayData = championship.days[dayNum];

            // Vérifier si le joueur existe (en gérant le format objet {name, club})
            const playerExists = dayData.players[division].some(p => {
                const pName = typeof p === 'object' ? p.name : p;
                return pName === playerName;
            });
            if (playerExists) {
                const dayStats = calculatePlayerStats(dayNum, division, playerName);
                // Inclure même si aucun match terminé, pour voir les matchs à venir
                if (dayStats && (dayStats.matchesPlayed > 0 || dayStats.matches.length > 0)) {
                    playerHistory.push({
                        day: dayNum,
                        ...dayStats,
                        totalMatchesScheduled: dayStats.matches.length,
                        isForfeit: false
                    });
                }
            }
        });

        // Ajouter des journées forfait pour les journées manquées APRÈS la dernière apparition
        allDays.forEach(dayNum => {
            if (dayNum > lastAppearance) {
                playerHistory.push({
                    day: dayNum,
                    totalPoints: 0,
                    wins: 0,
                    draws: 0,
                    losses: 0,
                    forfaits: 4,
                    pointsWon: 0,
                    pointsLost: 20,
                    matchesPlayed: 4,
                    winRate: 0,
                    isForfeit: true
                });
            }
        });

        // Trier par journée
        playerHistory.sort((a, b) => a.day - b.day);

        if (playerHistory.length === 0) {
            alert('Aucun match joué par ce joueur');
            return;
        }

        const totals = playerHistory.reduce((acc, day) => ({
            totalPoints: acc.totalPoints + day.totalPoints,
            totalWins: acc.totalWins + day.wins,
            totalDraws: acc.totalDraws + (day.draws || 0),
            totalLosses: acc.totalLosses + day.losses,
            totalForfaits: acc.totalForfaits + (day.forfaits || 0),
            totalPointsWon: acc.totalPointsWon + day.pointsWon,
            totalPointsLost: acc.totalPointsLost + day.pointsLost,
            totalMatchesPlayed: acc.totalMatchesPlayed + day.matchesPlayed
        }), {
            totalPoints: 0,
            totalWins: 0,
            totalDraws: 0,
            totalLosses: 0,
            totalForfaits: 0,
            totalPointsWon: 0,
            totalPointsLost: 0,
            totalMatchesPlayed: 0
        });

        const avgWinRate = totals.totalMatchesPlayed > 0 ?
            Math.round((totals.totalWins / totals.totalMatchesPlayed) * 100) : 0;
        const diff = totals.totalPointsWon - totals.totalPointsLost;

        const playerNameTitle = document.getElementById('playerNameTitle');
        if (playerNameTitle) {
            playerNameTitle.textContent = `${playerName} - Division ${division} - Vue Générale`;
        }

        const playerOverview = document.getElementById('playerOverview');
        if (playerOverview) {
            playerOverview.innerHTML = `
                <div class="overview-card">
                    <div class="overview-number">${playerHistory.length}</div>
                    <div class="overview-label">Journées jouées</div>
                </div>
                <div class="overview-card">
                    <div class="overview-number">${totals.totalPoints}</div>
                    <div class="overview-label">Points total</div>
                </div>
                <div class="overview-card" style="background: #d4edda;">
                    <div class="overview-number" style="color: #155724;">${totals.totalWins}</div>
                    <div class="overview-label">Victoires</div>
                </div>
                <div class="overview-card" style="background: #e3f2fd;">
                    <div class="overview-number" style="color: #1565c0;">${totals.totalDraws}</div>
                    <div class="overview-label">Nuls</div>
                </div>
                <div class="overview-card" style="background: #f8d7da;">
                    <div class="overview-number" style="color: #721c24;">${totals.totalLosses}</div>
                    <div class="overview-label">Défaites</div>
                </div>
                <div class="overview-card" style="background: #fff3cd;">
                    <div class="overview-number" style="color: #856404;">${totals.totalForfaits}</div>
                    <div class="overview-label">Forfaits</div>
                </div>
                <div class="overview-card">
                    <div class="overview-number">${avgWinRate}%</div>
                    <div class="overview-label">% Victoires</div>
                </div>
                <div class="overview-card">
                    <div class="overview-number">${totals.totalPointsWon}/${totals.totalPointsLost}</div>
                    <div class="overview-label">PP/PC</div>
                </div>
                <div class="overview-card">
                    <div class="overview-number">${diff > 0 ? '+' : ''}${diff}</div>
                    <div class="overview-label">Diff</div>
                </div>
            `;
        }
        
        // Générer un ID unique pour ce modal
        const modalId = 'general-player-details-' + Date.now();
        
        let historyHtml = `
            <h4 style="color: #2c3e50; margin-bottom: 15px;">📈 Performance par journée</h4>
            <style>
                .day-summary { 
                    background: #f8f9fa; 
                    border-radius: 8px; 
                    margin-bottom: 8px; 
                    overflow: hidden;
                    border: 1px solid #e9ecef;
                }
                .day-header { 
                    display: flex; 
                    justify-content: space-between; 
                    align-items: center; 
                    padding: 10px 12px; 
                    cursor: pointer;
                    transition: background 0.2s;
                }
                .day-header:hover { background: #e9ecef; }
                .day-header-left { display: flex; align-items: center; gap: 10px; }
                .day-toggle { 
                    width: 20px; 
                    height: 20px; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center;
                    font-size: 12px;
                    color: #6c757d;
                    transition: transform 0.2s;
                }
                .day-title { font-weight: 600; color: #2c3e50; font-size: 14px; }
                .day-stats { font-size: 12px; color: #6c757d; }
                .day-points { 
                    font-weight: bold; 
                    font-size: 14px; 
                    padding: 4px 10px; 
                    border-radius: 12px;
                }
                .day-points.win { background: #d4edda; color: #155724; }
                .day-points.loss { background: #f8d7da; color: #721c24; }
                .day-points.neutral { background: #e2e3e5; color: #383d41; }
                .day-matches { 
                    display: block; 
                    padding: 0 12px 12px 42px; 
                    border-top: 1px solid #e9ecef;
                }
                .day-matches.collapsed { display: none; }
                .match-detail {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 8px 10px;
                    margin: 4px 0;
                    background: white;
                    border-radius: 6px;
                    font-size: 13px;
                }
                .match-detail.win { border-left: 3px solid #28a745; }
                .match-detail.loss { border-left: 3px solid #dc3545; }
                .match-detail.draw { border-left: 3px solid #6c757d; }
                .match-detail.forfait { border-left: 3px solid #ffc107; }
                .match-detail.pending { border-left: 3px solid #6c757d; opacity: 0.8; }
                .match-opponent { flex: 1; color: #495057; }
                .match-opponent strong { color: #2c3e50; }
                .match-score {
                    font-weight: bold;
                    font-size: 14px;
                    padding: 2px 8px;
                    border-radius: 4px;
                    background: #f8f9fa;
                }
                .match-result-icon { 
                    width: 24px; 
                    text-align: center; 
                    font-size: 14px;
                    margin-right: 6px;
                }
                .forfait-badge {
                    font-size: 10px;
                    padding: 2px 6px;
                    border-radius: 10px;
                    background: #fff3cd;
                    color: #856404;
                    margin-left: 6px;
                }
            </style>
        `;
        
        playerHistory.forEach((dayStats, index) => {
            const dayId = `${modalId}-day-${dayStats.day}`;
            
            if (dayStats.isForfeit) {
                historyHtml += `
                    <div class="day-summary">
                        <div class="day-header" style="background: #fee; opacity: 0.8;">
                            <div class="day-header-left">
                                <span style="color: #e74c3c;">⚠️</span>
                                <span class="day-title">Journée ${dayStats.day}</span>
                                <span class="forfait-badge">FORFAIT</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <span class="day-stats">4 forfaits • -20 buts</span>
                                <span class="day-points loss">0 pts</span>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                const pointsClass = dayStats.totalPoints >= 8 ? 'win' : dayStats.totalPoints >= 4 ? 'neutral' : 'loss';
                const toggleId = `toggle-${dayId}`;
                const matchesId = `matches-${dayId}`;
                
                // Récupérer les matchs détaillés pour cette journée
                const dayData = championship.days[dayStats.day];
                let dayMatches = [];
                
                // Matchs classiques
                if (dayData.matches && dayData.matches[division]) {
                    dayMatches = dayData.matches[division].filter(m => 
                        m.player1 === playerName || m.player2 === playerName
                    );
                }
                
                // Matchs de poules
                if (dayData.pools?.enabled && dayData.pools.divisions?.[division]) {
                    const poolMatches = dayData.pools.divisions[division].matches || [];
                    const playerPoolMatches = poolMatches.filter(m => 
                        m.player1 === playerName || m.player2 === playerName
                    );
                    dayMatches = [...dayMatches, ...playerPoolMatches];
                }
                
                // Matchs de phase finale
                if (dayData.pools?.divisions?.[division]?.finalPhase) {
                    const finalMatches = dayData.pools.divisions[division].finalPhase || [];
                    const playerFinalMatches = finalMatches.filter(m => 
                        m.player1 === playerName || m.player2 === playerName
                    );
                    dayMatches = [...dayMatches, ...playerFinalMatches];
                }
                
                // Matchs de phase finale manuelle
                if (dayData.pools?.manualFinalPhase?.divisions?.[division]) {
                    const manualFinalPhase = dayData.pools.manualFinalPhase.divisions[division];
                    if (manualFinalPhase.rounds) {
                        Object.values(manualFinalPhase.rounds).forEach(round => {
                            if (round.matches) {
                                const playerRoundMatches = round.matches.filter(m => 
                                    m.player1 === playerName || m.player2 === playerName
                                );
                                dayMatches = [...dayMatches, ...playerRoundMatches];
                            }
                        });
                    }
                }
                
                // Générer le HTML des matchs
                let matchesHtml = '';
                if (dayMatches.length > 0) {
                    // Trier les matchs : en cours d'abord, puis terminés
                    const sortedMatches = dayMatches.sort((a, b) => {
                        if (!a.completed && b.completed) return -1;
                        if (a.completed && !b.completed) return 1;
                        return 0;
                    });
                    
                    matchesHtml = sortedMatches.map(match => {
                        const isPlayer1 = match.player1 === playerName;
                        const opponent = isPlayer1 ? match.player2 : match.player1;
                        const playerScore = isPlayer1 ? match.score1 : match.score2;
                        const opponentScore = isPlayer1 ? match.score2 : match.score1;
                        const hasScore = playerScore !== '' && playerScore !== null && playerScore !== undefined;
                        
                        let resultClass = '';
                        let resultIcon = '';
                        let scoreDisplay = '';
                        let statusBadge = '';
                        
                        if (!match.completed) {
                            // Match non terminé - vérifier s'il y a des scores partiels
                            if (hasScore || (opponentScore !== '' && opponentScore !== null && opponentScore !== undefined)) {
                                resultClass = 'pending';
                                resultIcon = '⏳';
                                scoreDisplay = `${playerScore || '-'}-${opponentScore || '-'}`;
                                statusBadge = '<span style="font-size: 10px; color: #f39c12; margin-left: 6px;">en cours</span>';
                            } else {
                                resultClass = 'pending';
                                resultIcon = '📅';
                                scoreDisplay = 'À jouer';
                            }
                        } else if (match.forfaitBy) {
                            const playerForfait = match.forfaitBy === (isPlayer1 ? 'player1' : 'player2');
                            resultClass = 'forfait';
                            resultIcon = playerForfait ? '⚠️' : '🏆';
                            scoreDisplay = playerForfait ? 'Forfait' : `Victoire (forfait)`;
                        } else if (match.winner === null) {
                            resultClass = 'draw';
                            resultIcon = '🤝';
                            scoreDisplay = `${playerScore}-${opponentScore}`;
                        } else if (match.winner === playerName) {
                            resultClass = 'win';
                            resultIcon = '🏆';
                            scoreDisplay = `${playerScore}-${opponentScore}`;
                        } else {
                            resultClass = 'loss';
                            resultIcon = '❌';
                            scoreDisplay = `${playerScore}-${opponentScore}`;
                        }
                        
                        return `
                            <div class="match-detail ${resultClass}">
                                <span class="match-result-icon">${resultIcon}</span>
                                <span class="match-opponent">vs <strong>${opponent}</strong>${statusBadge}</span>
                                <span class="match-score">${scoreDisplay}</span>
                            </div>
                        `;
                    }).join('');
                }
                
                historyHtml += `
                    <div class="day-summary">
                        <div class="day-header" onclick="toggleDayMatches('${toggleId}', '${matchesId}')">
                            <div class="day-header-left">
                                <span class="day-toggle" id="${toggleId}">▼</span>
                                <span class="day-title">Journée ${dayStats.day}</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                ${dayStats.totalMatchesScheduled > dayStats.matchesPlayed ? `<span style="font-size: 11px; padding: 2px 8px; background: #fff3cd; color: #856404; border-radius: 10px;">⏳ ${dayStats.totalMatchesScheduled - dayStats.matchesPlayed} restant${dayStats.totalMatchesScheduled - dayStats.matchesPlayed > 1 ? 's' : ''}</span>` : ''}
                                <span class="day-stats">${dayStats.wins}V/${dayStats.draws || 0}N/${dayStats.losses}D/${dayStats.forfeits || 0}F${dayStats.totalMatchesScheduled > dayStats.matchesPlayed ? ` • ${dayStats.matchesPlayed}/${dayStats.totalMatchesScheduled}` : ` • ${dayStats.matchesPlayed}`}</span>
                                <span class="day-points ${pointsClass}">${dayStats.totalPoints} pts</span>
                            </div>
                        </div>
                        <div class="day-matches" id="${matchesId}">
                            ${matchesHtml || '<div style="padding: 10px; color: #6c757d; font-size: 12px;">Aucun match trouvé</div>'}
                        </div>
                    </div>
                `;
            }
        });
        
        // La fonction toggleDayMatches est définie globalement plus bas
        
        const playerMatches = document.getElementById('playerMatches');
        if (playerMatches) {
            playerMatches.innerHTML = historyHtml;
        }
        
        const playerModal = document.getElementById('playerModal');
        if (playerModal) {
            playerModal.style.display = 'block';
        }
    }
    window.showGeneralPlayerDetails = showGeneralPlayerDetails;

    // Fonction pour toggle l'affichage des matchs d'une journée dans le modal général
    function toggleDayMatches(toggleId, matchesId) {
        const toggle = document.getElementById(toggleId);
        const matches = document.getElementById(matchesId);
        if (toggle && matches) {
            matches.classList.toggle('collapsed');
            toggle.textContent = matches.classList.contains('collapsed') ? '▶' : '▼';
        }
    }
    window.toggleDayMatches = toggleDayMatches;

    function exportGeneralRanking() {
        const generalRanking = calculateGeneralRanking();
        const generalStats = calculateGeneralStats();
        
        const exportData = {
            version: "2.0",
            exportDate: new Date().toISOString(),
            exportType: "general_ranking",
            championshipStats: generalStats,
            rankings: generalRanking.divisions,
            summary: {
                totalDaysInChampionship: Object.keys(championship.days).length,
                rankedDivisions: Object.keys(generalRanking.divisions).filter(div => 
                    generalRanking.divisions[div].length > 0
                ).length
            }
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `classement_general_${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showNotification('Classement général exporté !', 'success');
    }

      
    
   function exportGeneralRankingToPDF() {
    const generalRanking = calculateGeneralRanking();

    const generalStats = calculateGeneralStats();

    if (!generalRanking.hasData) {
        alert('Aucun classement général disponible pour l\'export PDF');
        return;
    }

    // Créer le contenu HTML optimisé pour l'impression
    const currentDate = new Date().toLocaleDateString('fr-FR', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });

    let htmlContent = `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Classement Général - Championnat Sportif</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                
                body {
                    font-family: 'Arial', 'Helvetica', sans-serif;
                    font-size: 12px;
                    line-height: 1.5;
                    color: #2c3e50;
                    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
                    padding: 25px;
                }
                
                .container {
                    background: white;
                    border-radius: 15px;
                    padding: 20px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                    max-width: 1000px;
                    margin: 0 auto;
                }
                
                .header {
                    text-align: center;
                    margin-bottom: 15px;
                    padding: 20px;
                    background: linear-gradient(135deg, #16a085 0%, #1abc9c 100%);
                    color: white;
                    border-radius: 12px;
                    position: relative;
                    overflow: hidden;
                }
                
                .header::before {
                    content: '';
                    position: absolute;
                    top: -50%;
                    right: -50%;
                    width: 200%;
                    height: 200%;
                    background: repeating-linear-gradient(
                        45deg,
                        transparent,
                        transparent 10px,
                        rgba(255,255,255,0.05) 10px,
                        rgba(255,255,255,0.05) 20px
                    );
                }
                
                .header h1 {
                    font-size: 28px;
                    margin-bottom: 12px;
                    text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
                    position: relative;
                    z-index: 1;
                }
                
                .header .date {
                    font-size: 14px;
                    opacity: 0.9;
                    position: relative;
                    z-index: 1;
                }
                
                .stats-section {
                    background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
                    padding: 20px;
                    margin-bottom: 15px;
                    border-radius: 12px;
                    border: 2px solid #f39c12;
                    position: relative;
                }
                
                .stats-title {
                    font-size: 18px;
                    font-weight: bold;
                    color: #e67e22;
                    margin-bottom: 12px;
                    text-align: center;
                    text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
                }
                
                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 12px;
                }
                
                .stat-item {
                    text-align: center;
                    padding: 12px;
                    background: rgba(255,255,255,0.9);
                    border-radius: 10px;
                    border: 2px solid #f39c12;
                    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                    transition: transform 0.3s ease;
                }
                
                .stat-item:hover {
                    transform: translateY(-2px);
                }
                
                .stat-number {
                    font-size: 24px;
                    font-weight: bold;
                    color: #d35400;
                    display: block;
                    text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
                }
                
                .stat-label {
                    font-size: 11px;
                    color: #16a085;
                    margin-top: 8px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                
                .division {
                    margin-bottom: 20px;
                    page-break-inside: avoid;
                    background: white;
                    border-radius: 12px;
                    overflow: hidden;
                    box-shadow: 0 5px 15px rgba(0,0,0,0.1);
                }
                
                .division-title {
                    font-size: 18px;
                    font-weight: bold;
                    color: white;
                    margin-bottom: 0;
                    padding: 12px;
                    text-align: center;
                    text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
                    letter-spacing: 1px;
                }
                
                .division-1 .division-title {
                    background: linear-gradient(135deg, #e74c3c, #c0392b);
                }
                
                .division-2 .division-title {
                    background: linear-gradient(135deg, #f39c12, #e67e22);
                }
                
                .division-3 .division-title {
                    background: linear-gradient(135deg, #27ae60, #229954);
                }

                .division-4 .division-title {
                    background: linear-gradient(135deg, #3498db, #2980b9);
                }

                .division-5 .division-title {
                    background: linear-gradient(135deg, #9b59b6, #8e44ad);
                }

                .division-6 .division-title {
                    background: linear-gradient(135deg, #16a085, #138d75);
                }

                .ranking-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 0;
                    font-size: 12px;
                }
                
                .ranking-table th {
                    background: linear-gradient(135deg, #34495e, #2c3e50);
                    color: white;
                    padding: 10px 8px;
                    text-align: center;
                    font-weight: bold;
                    font-size: 11px;
                    border: 1px solid #2c3e50;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
                }
                
                .ranking-table td {
                    padding: 8px 8px;
                    border: 1px solid #ecf0f1;
                    font-size: 12px;
                    text-align: center;
                }
                
                .ranking-table tr:nth-child(even) {
                    background: linear-gradient(135deg, #f8f9fa, #e9ecef);
                }
                
                .ranking-table tr:hover {
                    background: linear-gradient(135deg, #d1ecf1, #bee5eb);
                    transform: scale(1.01);
                    transition: all 0.2s ease;
                }
                
                .rank-position {
                    font-weight: bold;
                    width: 60px;
                    font-size: 14px;
                }
                
                .rank-gold {
                    background: linear-gradient(135deg, #ffd700, #ffed4e) !important;
                    color: #b8860b !important;
                    font-weight: bold;
                    box-shadow: inset 0 2px 4px rgba(184, 134, 11, 0.3);
                }
                
                .rank-silver {
                    background: linear-gradient(135deg, #c0c0c0, #a8a8a8) !important;
                    color: #666 !important;
                    font-weight: bold;
                    box-shadow: inset 0 2px 4px rgba(102, 102, 102, 0.3);
                }
                
                .rank-bronze {
                    background: linear-gradient(135deg, #cd7f32, #b8722c) !important;
                    color: #8b4513 !important;
                    font-weight: bold;
                    box-shadow: inset 0 2px 4px rgba(139, 69, 19, 0.3);
                }
                
                .player-name {
                    font-weight: 600;
                    color: #2c3e50;
                    text-align: left;
                    padding-left: 15px;
                    font-size: 13px;
                }
                
                .points-total {
                    font-weight: bold;
                    color: #e74c3c;
                    font-size: 14px;
                    text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
                }
                
                .footer {
                    margin-top: 20px;
                    padding: 15px;
                    background: linear-gradient(135deg, #34495e, #2c3e50);
                    color: white;
                    text-align: center;
                    border-radius: 12px;
                    box-shadow: 0 5px 15px rgba(0,0,0,0.2);
                }
                
                .footer p {
                    margin-bottom: 5px;
                    font-size: 11px;
                }

                .footer p:last-child {
                    margin-bottom: 0;
                }

                .footer p:first-child {
                    font-weight: bold;
                    font-size: 13px;
                    color: #3498db;
                    text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
                }
                
                .export-info {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: linear-gradient(135deg, #3498db, #2980b9);
                    color: white;
                    padding: 20px;
                    border-radius: 12px;
                    box-shadow: 0 8px 20px rgba(52, 152, 219, 0.3);
                    z-index: 1000;
                    max-width: 320px;
                    border: 2px solid rgba(255,255,255,0.2);
                }
                
                .export-info h3 {
                    margin-bottom: 15px;
                    font-size: 16px;
                    text-align: center;
                    text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
                }
                
                .export-info p {
                    font-size: 13px;
                    line-height: 1.4;
                    margin-bottom: 10px;
                }
                
                .export-info .shortcut {
                    background: rgba(255,255,255,0.25);
                    padding: 4px 8px;
                    border-radius: 5px;
                    font-weight: bold;
                    border: 1px solid rgba(255,255,255,0.3);
                }
                
                @media print {
                    .export-info {
                        display: none !important;
                    }
                    
                    body {
                        background: white !important;
                        padding: 15px;
                        font-size: 11px;
                    }
                    
                    .container {
                        box-shadow: none !important;
                        border-radius: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                    }
                    
                    .header {
                        background: #2c3e50 !important;
                        color: white !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        border-radius: 0 !important;
                        margin-bottom: 10px;
                        padding: 12px !important;
                    }
                    
                    .header::before {
                        display: none !important;
                    }
                    
                    .stats-section {
                        background: #f8f9fa !important;
                        border: 2px solid #dee2e6 !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        border-radius: 0 !important;
                        margin-bottom: 10px;
                        padding: 12px !important;
                    }
                    
                    .stat-item {
                        background: white !important;
                        border: 1px solid #dee2e6 !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    
                    .division {
                        page-break-inside: avoid;
                        margin-bottom: 12px;
                        box-shadow: none !important;
                        border: 1px solid #dee2e6 !important;
                        border-radius: 0 !important;
                    }
                    
                    .division-title {
                        background: #f8f9fa !important;
                        color: #2c3e50 !important;
                        border: 2px solid #dee2e6 !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        padding: 10px !important;
                        page-break-after: avoid !important;
                    }
                    
                    .division-1 .division-title {
                        background: #f8d7da !important;
                        color: #721c24 !important;
                        border-color: #e74c3c !important;
                    }
                    
                    .division-2 .division-title {
                        background: #fff3cd !important;
                        color: #856404 !important;
                        border-color: #f39c12 !important;
                    }
                    
                    .division-3 .division-title {
                        background: #d1ecf1 !important;
                        color: #155724 !important;
                        border-color: #27ae60 !important;
                    }

                    .division-4 .division-title {
                        background: #d6eaf8 !important;
                        color: #1b4f72 !important;
                        border-color: #3498db !important;
                    }

                    .division-5 .division-title {
                        background: #e8daef !important;
                        color: #4a235a !important;
                        border-color: #9b59b6 !important;
                    }

                    .division-6 .division-title {
                        background: #d0ece7 !important;
                        color: #0e6655 !important;
                        border-color: #16a085 !important;
                    }

                    .ranking-table {
                        page-break-inside: avoid;
                        font-size: 10px;
                    }
                    
                    .ranking-table th {
                        background: #2c3e50 !important;
                        color: white !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    
                    .rank-gold, .rank-silver, .rank-bronze {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    
                    .header h1 {
                        font-size: 22px;
                    }
                    
                    .stats-grid {
                        grid-template-columns: repeat(2, 1fr);
                        gap: 8px;
                    }

                    .stats-title {
                        margin-bottom: 8px !important;
                    }
                    
                    .footer {
                        background: #34495e !important;
                        color: white !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        border-radius: 0 !important;
                        margin-top: 15px;
                        padding: 15px !important;
                    }
                }
                
                @page {
                    margin: 1cm;
                    size: A4 portrait;
                }
            </style>
        </head>
        <body>
            <div class="export-info">
                <h3>📄 Export PDF</h3>
                <p>Pour sauvegarder en PDF :</p>
                <p>• <span class="shortcut">Ctrl+P</span> (ou Cmd+P sur Mac)</p>
                <p>• Choisir "Enregistrer au format PDF"</p>
                <p>• Cliquer sur "Enregistrer"</p>
            </div>
            
            <div class="container">
                <div class="header">
                    <h1>🏆 CLASSEMENT GÉNÉRAL DU CHAMPIONNAT</h1>
                    <div class="date">Généré le ${currentDate}</div>
                </div>
                
                <div class="stats-section">
                    <div class="stats-title">📊 STATISTIQUES DU CHAMPIONNAT</div>
                    <div class="stats-grid">
                        <div class="stat-item">
                            <span class="stat-number">${generalStats.totalDays}</span>
                            <div class="stat-label">Journées disputées</div>
                        </div>
                        <div class="stat-item">
                            <span class="stat-number">${generalStats.totalPlayers}</span>
                            <div class="stat-label">Joueurs uniques</div>
                        </div>
                        <div class="stat-item">
                            <span class="stat-number">${generalStats.totalMatches}</span>
                            <div class="stat-label">Matchs programmés</div>
                        </div>
                        <div class="stat-item">
                            <span class="stat-number">${generalStats.completedMatches}</span>
                            <div class="stat-label">Matchs terminés</div>
                        </div>
                    </div>
                </div>
    `;

    // Ajouter les classements par division
    const numDivisions = championship.config?.numberOfDivisions || 3;
    for (let division = 1; division <= numDivisions; division++) {
        if (generalRanking.divisions[division].length === 0) continue;

        const divisionIcons = ['', '🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣'];
        const divisionIcon = divisionIcons[division] || '📊';
        const divisionName = `${divisionIcon} DIVISION ${division}`;

        htmlContent += `
            <div class="division division-${division}">
                <div class="division-title">${divisionName}</div>
                <table class="ranking-table">
                    <thead>
                        <tr>
                            <th>Rang</th>
                            <th>Joueur</th>
                            <th>Points</th>
                            <th>Journées</th>
                            <th>V/N/D/F</th>
                            <th>% Vict.</th>
                            <th>PP/PC</th>
                            <th>Diff</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        generalRanking.divisions[division].forEach((player, index) => {
            let rankClass = '';
            if (index === 0) rankClass = 'rank-gold';
            else if (index === 1) rankClass = 'rank-silver';
            else if (index === 2) rankClass = 'rank-bronze';

            htmlContent += `
                <tr>
                    <td class="rank-position ${rankClass}">${index + 1}</td>
                    <td class="player-name">${player.name}</td>
                    <td class="points-total">${player.totalPoints}</td>
                    <td style="text-align: center;">${player.daysPlayed}</td>
                    <td style="text-align: center;">${player.totalWins}/${player.totalDraws || 0}/${player.totalLosses}/${player.totalForfaits}</td>
                    <td style="text-align: center;">${player.avgWinRate}%</td>
                    <td style="text-align: center;">${player.totalPointsWon}/${player.totalPointsLost}</td>
                    <td style="text-align: center;">${player.goalAveragePoints > 0 ? '+' : ''}${player.goalAveragePoints}</td>
                </tr>
            `;
        });

        htmlContent += `
                    </tbody>
                </table>
            </div>
        `;
    }

    // Ajouter le pied de page
    htmlContent += `
            <div class="footer">
                <p>Championnat Sportif - Gestion Esenca Sport</p>
                <p>Système de points: Victoire = 3pts, Défaite = 1pt</p>
                <p>Document généré automatiquement le ${currentDate}</p>
            </div>
        </div>
    </body>
    </html>
    `;

    // Ouvrir dans une nouvelle fenêtre
    const newWindow = window.open('', '_blank', 'width=1000,height=800,scrollbars=yes,resizable=yes');
    
    if (!newWindow) {
        alert('Impossible d\'ouvrir une nouvelle fenêtre. Veuillez autoriser les pop-ups pour ce site.');
        return;
    }

    newWindow.document.write(htmlContent);
    newWindow.document.close();
    
    // Attendre que le contenu soit chargé puis proposer l'impression
    setTimeout(() => {
        newWindow.focus();
        
        // Afficher une alerte dans la nouvelle fenêtre
        const alertMessage = "✅ Page d'export créée avec succès !\n\n" +
                            "Pour enregistrer en PDF :\n" +
                            "1. Appuyez sur Ctrl+P (ou Cmd+P sur Mac)\n" +
                            "2. Choisissez 'Enregistrer au format PDF'\n" +
                            "3. Cliquez sur 'Enregistrer'\n\n" +
                            "Voulez-vous ouvrir la boîte de dialogue d'impression maintenant ?";
        
        if (newWindow.confirm(alertMessage)) {
            newWindow.print();
        }
    }, 500);

    showNotification('Page d\'export PDF ouverte dans un nouvel onglet !', 'success');
}

// Assigner la fonction à l'objet window pour qu'elle soit accessible globalement
window.exportGeneralRanking = exportGeneralRanking;
window.exportGeneralRankingToPDF = exportGeneralRankingToPDF;


})(window);
