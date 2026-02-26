// ============================================
// MODULE INIT - BYE, MODALES, EVENT LISTENERS (IIFE)
// ============================================
(function(global) {
    'use strict';

    var championship = global.championship;
    var showNotification = global.showNotification;
    var saveToLocalStorage = function() { if (typeof global.saveToLocalStorage === 'function') global.saveToLocalStorage(); };
    var getNumberOfDivisions = function() { return typeof global.getNumberOfDivisions === 'function' ? global.getNumberOfDivisions() : 3; };
    var getPlayerName = function(p) { return typeof global.getPlayerName === 'function' ? global.getPlayerName(p) : (p || ''); };
    var escapeForOnclick = function(s) { return typeof global.escapeForOnclick === 'function' ? global.escapeForOnclick(s) : s; };

    // ======================================
    // GESTION DES MATCHS BYE MANUELS
    // ======================================

    function addByeMatchForPlayer(dayNumber, division, playerName) {
        const dayData = championship.days[dayNumber];
        if (!dayData) return;

        // Créer un match BYE (victoire automatique)
        const byeMatch = {
            player1: playerName,
            player2: "BYE",
            tour: 4, // Mettre au tour 4 par défaut
            score1: 5,
            score2: 0,
            completed: true,
            winner: playerName,
            isBye: true
        };

        dayData.matches[division].push(byeMatch);

        updateMatchesDisplay(dayNumber);
        updatePlayersDisplay(dayNumber); // Mettre à jour l'affichage des joueurs pour refléter le BYE
        updateStats(dayNumber);
        saveToLocalStorage();

        showNotification(`Match BYE ajouté pour ${playerName} en D${division}`, 'success');
    }
    window.addByeMatchForPlayer = addByeMatchForPlayer;

    // ========== MODAL GÉNÉRATION DE MATCHS ==========
    let currentMatchGenerationDay = 1;

    function showMatchGenerationModal(dayNumber) {
        currentMatchGenerationDay = dayNumber;
        document.getElementById('matchGenerationModal').style.display = 'block';
    }
    window.showMatchGenerationModal = showMatchGenerationModal;

    function closeMatchGenerationModal() {
        document.getElementById('matchGenerationModal').style.display = 'none';
    }
    window.closeMatchGenerationModal = closeMatchGenerationModal;

    function selectMatchGenerationType(type) {
        closeMatchGenerationModal();
        const day = currentMatchGenerationDay;
        switch(type) {
            case 'round-robin':
                generateMatchesForDay(day);
                break;
            case 'optimized':
                generateMatchesOptimized4to10(day);
                break;
            case 'court':
                generateMatchesByCourtOptimized(day);
                break;
            case 'swiss':
                generateMatchesSwissSystem(day);
                break;
        }
    }
    window.selectMatchGenerationType = selectMatchGenerationType;

    // ========== AFFICHAGE CLASSEMENT NOUVELLE FENÊTRE ==========
    let rankingWindow = null;
    let rankingWindowTarget = null;

    function openRankingInNewWindow(dayOrGeneral) {
        rankingWindowTarget = dayOrGeneral;
        refreshRankingWindow(dayOrGeneral);
    }
    window.openRankingInNewWindow = openRankingInNewWindow;

    function refreshRankingWindow(dayOrGeneral) {
        const isGeneral = dayOrGeneral === 'general';
        const title = isGeneral ? 'Classement Général' : `Classement Journée ${dayOrGeneral}`;

        // Récupérer le contenu du classement
        let rankingContent = '';
        if (isGeneral) {
            const container = document.getElementById('generalRankingContent');
            rankingContent = container ? container.innerHTML : '<p>Aucun classement disponible</p>';
        } else {
            const container = document.getElementById(`rankingsContent-${dayOrGeneral}`);
            rankingContent = container ? container.innerHTML : '<p>Aucun classement disponible</p>';
        }

        // Générer la page HTML complète
        const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🏆 ${title}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            min-height: 100vh;
            padding: 20px;
            color: #fff;
        }
        .header {
            text-align: center;
            padding: 20px;
            background: linear-gradient(135deg, #f39c12, #e67e22);
            border-radius: 15px;
            margin-bottom: 20px;
            box-shadow: 0 10px 30px rgba(243, 156, 18, 0.3);
        }
        .header h1 {
            font-size: 2em;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        .header .update-time {
            font-size: 0.9em;
            opacity: 0.9;
            margin-top: 5px;
        }
        .content {
            background: rgba(255,255,255,0.95);
            border-radius: 15px;
            padding: 20px;
            color: #2c3e50;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        }
        .ranking-table, table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
        }
        .ranking-table th, table th {
            background: linear-gradient(135deg, #3498db, #2980b9);
            color: white;
            padding: 12px 8px;
            text-align: center;
            font-size: 14px;
        }
        .ranking-table td, table td {
            padding: 10px 8px;
            text-align: center;
            border-bottom: 1px solid #eee;
            font-size: 14px;
        }
        .ranking-table tr:nth-child(even), table tr:nth-child(even) {
            background: #f8f9fa;
        }
        .ranking-table tr:hover, table tr:hover {
            background: #e3f2fd;
        }
        /* Podium styles */
        tr:nth-child(2) td:first-child { color: #FFD700; font-weight: bold; }
        tr:nth-child(3) td:first-child { color: #C0C0C0; font-weight: bold; }
        tr:nth-child(4) td:first-child { color: #CD7F32; font-weight: bold; }
        .division-ranking, .ranking-division {
            margin-bottom: 25px;
            background: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        .division-ranking h3, .ranking-division h3, h3 {
            background: linear-gradient(135deg, #2c3e50, #34495e);
            color: white;
            padding: 12px 15px;
            margin: 0;
            font-size: 16px;
        }
        .refresh-btn {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: linear-gradient(135deg, #27ae60, #2ecc71);
            color: white;
            border: none;
            padding: 15px 25px;
            border-radius: 50px;
            font-size: 16px;
            cursor: pointer;
            box-shadow: 0 5px 20px rgba(39, 174, 96, 0.4);
            transition: transform 0.2s;
        }
        .refresh-btn:hover {
            transform: scale(1.05);
        }
        .auto-refresh {
            position: fixed;
            bottom: 20px;
            left: 20px;
            background: rgba(255,255,255,0.9);
            padding: 10px 15px;
            border-radius: 25px;
            color: #2c3e50;
            font-size: 13px;
            box-shadow: 0 3px 10px rgba(0,0,0,0.2);
        }
        .refreshing {
            animation: pulse 1s ease-in-out;
        }
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🏆 ${title}</h1>
        <div class="update-time" id="updateTime">Mis à jour : ${new Date().toLocaleTimeString('fr-FR')}</div>
    </div>
    <div class="content" id="rankingContent">
        ${rankingContent}
    </div>
    <div class="auto-refresh">
        <label>
            <input type="checkbox" id="autoRefresh" checked> Auto-refresh (30s)
        </label>
    </div>
    <button class="refresh-btn" onclick="requestRefresh()">
        🔄 Rafraîchir
    </button>
    <script>
        let autoRefreshInterval;
        const checkbox = document.getElementById('autoRefresh');

        function requestRefresh() {
            if (window.opener && !window.opener.closed) {
                document.body.classList.add('refreshing');
                window.opener.postMessage({action: 'refreshRanking', target: '${dayOrGeneral}'}, '*');
            }
        }

        function startAutoRefresh() {
            autoRefreshInterval = setInterval(() => {
                requestRefresh();
            }, 30000);
        }

        function stopAutoRefresh() {
            clearInterval(autoRefreshInterval);
        }

        checkbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                startAutoRefresh();
            } else {
                stopAutoRefresh();
            }
        });

        // Écouter les mises à jour depuis la fenêtre parente
        window.addEventListener('message', (event) => {
            if (event.data && event.data.action === 'updateContent') {
                document.getElementById('rankingContent').innerHTML = event.data.content;
                document.getElementById('updateTime').textContent = 'Mis à jour : ' + new Date().toLocaleTimeString('fr-FR');
                document.body.classList.remove('refreshing');
            }
        });

        startAutoRefresh();
    </script>
</body>
</html>`;

        // Ouvrir ou réutiliser la fenêtre
        if (rankingWindow && !rankingWindow.closed) {
            rankingWindow.document.open();
            rankingWindow.document.write(html);
            rankingWindow.document.close();
            rankingWindow.focus();
        } else {
            rankingWindow = window.open('', 'RankingDisplay', 'width=800,height=600,menubar=no,toolbar=no,location=no,status=no');
            if (rankingWindow) {
                rankingWindow.document.write(html);
                rankingWindow.document.close();
            }
        }

        if (!rankingWindowTarget) {
            showNotification('Classement ouvert dans une nouvelle fenêtre', 'success');
        }
    }

    // Écouter les messages de la fenêtre de classement
    window.addEventListener('message', (event) => {
        if (event.data && event.data.action === 'refreshRanking') {
            const target = event.data.target;

            // Mettre à jour les données
            if (target === 'general') {
                updateGeneralRanking();
            } else {
                updateRankingsForDay(parseInt(target));
            }

            // Attendre que les données soient mises à jour puis renvoyer le contenu
            setTimeout(() => {
                if (rankingWindow && !rankingWindow.closed) {
                    let content = '';
                    if (target === 'general') {
                        const container = document.getElementById('generalRankingContent');
                        content = container ? container.innerHTML : '';
                    } else {
                        const container = document.getElementById(`rankingsContent-${target}`);
                        content = container ? container.innerHTML : '';
                    }
                    rankingWindow.postMessage({action: 'updateContent', content: content}, '*');
                }
            }, 300);
        }
    });

// ========== CLASSEMENT COMPLET DE JOURNÉE (POOLS + FINALES) ==========
let currentCompleteDayRanking = 1;

function showCompleteDayRanking(dayNumber) {
    const dayData = championship.days[dayNumber];
    if (!dayData) {
        alert('Journée non trouvée');
        return;
    }

    // Vérifier si le mode pool est activé
    if (!dayData.pools?.enabled) {
        alert('⚠️ Le mode Pool doit être activé pour voir le classement complet.\n\nCe classement détaillé affiche les résultats des poules et de la phase finale.');
        return;
    }

    currentCompleteDayRanking = dayNumber;

    let html = '';
    const numDivisions = championship.config?.numberOfDivisions || 3;

    for (let division = 1; division <= numDivisions; division++) {
        const divisionData = dayData.pools.divisions[division];
        if (!divisionData) continue;

        const pools = divisionData.pools || [];
        const poolMatches = divisionData.matches || [];
        const finalMatches = divisionData.finalPhase || [];

        if (pools.length === 0) continue;

        // Calculer les classements de poules
        const poolRankings = calculatePoolRankings(pools, poolMatches, dayNumber, division);

        // Calculer les positions finales du bracket
        const finalPositions = calculateFinalPositions(finalMatches);

        // Générer le HTML pour cette division
        html += generateCompleteDivisionHTML(dayNumber, division, pools, poolRankings, poolMatches, finalMatches, finalPositions);
    }

    if (!html) {
        html = '<p style="text-align: center; color: #7f8c8d; padding: 20px;">Aucune poule n\'a été générée pour cette journée.</p>';
    }

    document.getElementById('completeDayRankingTitle').textContent = `📊 Classement Complet - Journée ${dayNumber}`;
    document.getElementById('completeDayRankingContent').innerHTML = html;
    document.getElementById('completeDayRankingModal').style.display = 'block';
}
window.showCompleteDayRanking = showCompleteDayRanking;

function closeCompleteDayRankingModal() {
    document.getElementById('completeDayRankingModal').style.display = 'none';
}
window.closeCompleteDayRankingModal = closeCompleteDayRankingModal;

function calculatePoolRankings(pools, poolMatches, dayNumber, division) {
    const poolRankings = [];

    pools.forEach((poolPlayers, poolIndex) => {
        const poolName = String.fromCharCode(65 + poolIndex); // A, B, C...
        const rankings = [];

        poolPlayers.forEach(rawPlayer => {
            const player = getPlayerName(rawPlayer);
            if (!player || player.toUpperCase() === 'BYE') return;

            // Calculer les stats de ce joueur dans cette poule uniquement
            const playerPoolMatches = poolMatches.filter(m =>
                m.poolIndex === poolIndex &&
                (m.player1 === player || m.player2 === player)
            );

            let wins = 0, draws = 0, losses = 0, forfeits = 0, pointsWon = 0, pointsLost = 0;

            playerPoolMatches.forEach(match => {
                if (match.completed) {
                    const isPlayer1 = match.player1 === player;
                    const score1 = parseInt(match.score1) || 0;
                    const score2 = parseInt(match.score2) || 0;

                    if (match.forfaitBy) {
                        if (match.forfaitBy === (isPlayer1 ? 'player1' : 'player2')) {
                            forfeits++;
                        } else {
                            wins++;
                        }
                    } else if (match.winner === null) {
                        draws++;
                    } else if (match.winner === player) {
                        wins++;
                    } else {
                        losses++;
                    }

                    if (isPlayer1) {
                        pointsWon += score1;
                        pointsLost += score2;
                    } else {
                        pointsWon += score2;
                        pointsLost += score1;
                    }
                }
            });

            rankings.push({
                name: player,
                wins,
                draws,
                losses,
                forfeits,
                points: wins * 3 + draws * 2 + losses * 1,
                pointsWon,
                pointsLost,
                goalAverage: pointsWon - pointsLost,
                matchesPlayed: wins + draws + losses + forfeits
            });
        });

        // Trier par points, puis goal average, puis points marqués
        rankings.sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.goalAverage !== a.goalAverage) return b.goalAverage - a.goalAverage;
            if (b.pointsWon !== a.pointsWon) return b.pointsWon - a.pointsWon;
            return a.name.localeCompare(b.name);
        });

        poolRankings.push({
            poolName,
            poolIndex,
            rankings
        });
    });

    return poolRankings;
}

function calculateFinalPositions(finalMatches) {
    const positions = {};

    if (!finalMatches || finalMatches.length === 0) {
        return positions;
    }

    // Identifier les types de matchs
    const finale = finalMatches.find(m => m.round === 'Finale' || m.matchType === 'finale');
    const demis = finalMatches.filter(m => m.round === 'Demi-finale' || m.matchType === 'demi');
    const quarts = finalMatches.filter(m => m.round === 'Quart de finale' || m.matchType === 'quart');
    const petiteFinale = finalMatches.find(m => m.round === 'Petite finale' || m.matchType === 'petite-finale');

    // Position 1 : Vainqueur de la finale
    if (finale && finale.completed && finale.winner) {
        positions[finale.winner] = { position: 1, label: 'Vainqueur', badge: '🥇' };
        // Position 2 : Perdant de la finale
        const perdantFinale = finale.player1 === finale.winner ? finale.player2 : finale.player1;
        if (perdantFinale) {
            positions[perdantFinale] = { position: 2, label: 'Finaliste', badge: '🥈' };
        }
    }

    // Petite finale pour 3ème/4ème place
    if (petiteFinale && petiteFinale.completed && petiteFinale.winner) {
        positions[petiteFinale.winner] = { position: 3, label: '3ème', badge: '🥉' };
        const perdantPetiteFinale = petiteFinale.player1 === petiteFinale.winner ? petiteFinale.player2 : petiteFinale.player1;
        if (perdantPetiteFinale) {
            positions[perdantPetiteFinale] = { position: 4, label: '4ème', badge: '🥉' };
        }
    } else if (demis.length > 0) {
        // Si pas de petite finale, les perdants des demis sont 3-4
        let pos = 3;
        demis.forEach(match => {
            if (match.completed && match.winner) {
                const perdant = match.player1 === match.winner ? match.player2 : match.player1;
                if (perdant && !positions[perdant]) {
                    positions[perdant] = { position: pos, label: pos === 3 ? '3ème' : '4ème', badge: '🥉' };
                    pos++;
                }
            }
        });
    }

    // Perdants des quarts = 5-8
    if (quarts.length > 0) {
        let pos = 5;
        quarts.forEach(match => {
            if (match.completed && match.winner) {
                const perdant = match.player1 === match.winner ? match.player2 : match.player1;
                if (perdant && !positions[perdant]) {
                    positions[perdant] = { position: pos, label: `${pos}ème`, badge: '' };
                    pos++;
                }
            }
        });
    }

    return positions;
}

function generateCompleteDivisionHTML(dayNumber, division, pools, poolRankings, poolMatches, finalMatches, finalPositions) {
    const divIcon = division === 1 ? '🥇' : division === 2 ? '🥈' : '🥉';

    // Déterminer les qualifiés par poule
    const dayData = championship.days[dayNumber];
    const config = dayData.pools?.config?.divisions?.[division];
    const qualifiedPerPool = config?.qualifiedPerPool || config?.topPerPool || 2;
    const bestRunnerUps = config?.bestRunnerUps || 0;

    let html = `
        <div style="background: white; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); overflow: hidden;">
            <div style="background: linear-gradient(135deg, #2c3e50, #34495e); color: white; padding: 12px 15px;">
                <h3 style="margin: 0; font-size: 16px;">${divIcon} Division ${division}</h3>
            </div>

            <!-- Phase Poules -->
            <div style="padding: 15px; background: #f8f9fa; border-bottom: 1px solid #eee;">
                <h4 style="margin: 0 0 12px 0; color: #2c3e50; font-size: 14px;">📋 Phase Poules</h4>
                <div style="display: flex; flex-wrap: wrap; gap: 15px;">
    `;

    // Générer le classement de chaque poule
    poolRankings.forEach(pool => {
        html += `
            <div style="flex: 1; min-width: 180px; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                <div style="background: linear-gradient(135deg, #3498db, #2980b9); color: white; padding: 8px 12px; font-weight: 600; font-size: 13px;">
                    Poule ${pool.poolName}
                </div>
                <div style="padding: 8px;">
        `;

        pool.rankings.forEach((player, idx) => {
            const isQualified = idx < qualifiedPerPool;
            const bgColor = isQualified ? '#e8f5e9' : 'transparent';
            const checkMark = isQualified ? ' ✓' : '';

            html += `
                <div style="display: flex; justify-content: space-between; padding: 6px 8px; background: ${bgColor}; border-radius: 4px; margin-bottom: 4px; font-size: 12px;">
                    <span style="font-weight: ${isQualified ? '600' : '400'};">${idx + 1}. ${player.name}${checkMark}</span>
                    <span style="color: #7f8c8d;">${player.points}pts (${player.wins}V/${player.draws || 0}N/${player.losses}D/${player.forfeits || 0}F)</span>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;
    });

    html += `
                </div>
            </div>
    `;

    // Phase Finale (si des matchs existent)
    if (finalMatches && finalMatches.length > 0) {
        html += `
            <div style="padding: 15px; background: #fff3cd; border-bottom: 1px solid #eee;">
                <h4 style="margin: 0 0 12px 0; color: #856404; font-size: 14px;">🎯 Phase Finale</h4>
                <div style="display: flex; flex-wrap: wrap; gap: 10px; justify-content: center;">
        `;

        // Grouper les matchs par round
        const matchesByRound = {};
        finalMatches.forEach(match => {
            const round = match.round || match.matchType || 'Match';
            if (!matchesByRound[round]) matchesByRound[round] = [];
            matchesByRound[round].push(match);
        });

        // Ordre d'affichage des rounds
        const roundOrder = ['Quart de finale', 'quart', 'Demi-finale', 'demi', 'Petite finale', 'petite-finale', 'Finale', 'finale'];
        const sortedRounds = Object.keys(matchesByRound).sort((a, b) => {
            const idxA = roundOrder.indexOf(a);
            const idxB = roundOrder.indexOf(b);
            return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
        });

        sortedRounds.forEach(round => {
            const matches = matchesByRound[round];
            const roundLabel = round.charAt(0).toUpperCase() + round.slice(1);

            html += `
                <div style="background: white; border-radius: 8px; padding: 10px; min-width: 150px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                    <div style="font-weight: 600; font-size: 11px; color: #856404; margin-bottom: 8px; text-align: center;">${roundLabel}</div>
            `;

            matches.forEach(match => {
                const isComplete = match.completed;
                const winner = match.winner;

                html += `
                    <div style="background: ${isComplete ? '#f8f9fa' : '#fff'}; padding: 6px; border-radius: 4px; margin-bottom: 4px; font-size: 11px; border: 1px solid ${isComplete ? '#dee2e6' : '#ffc107'};">
                        <div style="display: flex; justify-content: space-between; ${winner === match.player1 ? 'font-weight: 600;' : ''}">
                            <span>${match.player1 || '?'}</span>
                            <span>${match.score1 || '-'}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; ${winner === match.player2 ? 'font-weight: 600;' : ''}">
                            <span>${match.player2 || '?'}</span>
                            <span>${match.score2 || '-'}</span>
                        </div>
                    </div>
                `;
            });

            html += `</div>`;
        });

        html += `
                </div>
            </div>
        `;
    }

    // Classement Final Combiné
    html += `
        <div style="padding: 15px; background: #d4edda;">
            <h4 style="margin: 0 0 12px 0; color: #155724; font-size: 14px;">🏅 Classement Final</h4>
    `;

    // Construire le classement final
    const allPlayers = [];
    const processedPlayers = new Set();

    // D'abord les joueurs avec position finale (du bracket)
    Object.entries(finalPositions)
        .sort((a, b) => a[1].position - b[1].position)
        .forEach(([playerName, posData]) => {
            if (!processedPlayers.has(playerName)) {
                const stats = calculatePlayerStats(dayNumber, division, playerName);
                allPlayers.push({
                    name: playerName,
                    ...posData,
                    ...stats,
                    hasFinalPosition: true
                });
                processedPlayers.add(playerName);
            }
        });

    // Ensuite les autres joueurs triés par stats
    poolRankings.forEach(pool => {
        pool.rankings.forEach(player => {
            if (!processedPlayers.has(player.name)) {
                const stats = calculatePlayerStats(dayNumber, division, player.name);
                allPlayers.push({
                    name: player.name,
                    position: 99,
                    label: '',
                    badge: '',
                    ...stats,
                    hasFinalPosition: false
                });
                processedPlayers.add(player.name);
            }
        });
    });

    // Trier les joueurs sans position finale par leurs stats
    const playersWithPos = allPlayers.filter(p => p.hasFinalPosition);
    const playersWithoutPos = allPlayers.filter(p => !p.hasFinalPosition)
        .sort((a, b) => {
            if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
            if (b.wins !== a.wins) return b.wins - a.wins;
            const gaA = (a.pointsWon || 0) - (a.pointsLost || 0);
            const gaB = (b.pointsWon || 0) - (b.pointsLost || 0);
            if (gaB !== gaA) return gaB - gaA;
            return a.name.localeCompare(b.name);
        });

    // Assigner les positions finales
    let nextPosition = playersWithPos.length > 0 ?
        Math.max(...playersWithPos.map(p => p.position)) + 1 : 1;

    playersWithoutPos.forEach(player => {
        player.position = nextPosition++;
        player.label = `${player.position}${player.position === 1 ? 'er' : 'ème'}`;
    });

    const finalRanking = [...playersWithPos, ...playersWithoutPos];

    // Générer le tableau
    html += `
        <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; font-size: 12px;">
            <thead>
                <tr style="background: linear-gradient(135deg, #155724, #1e7e34); color: white;">
                    <th style="padding: 8px; text-align: center; width: 50px;">Pos</th>
                    <th style="padding: 8px; text-align: left;">Joueur</th>
                    <th style="padding: 8px; text-align: center;">Pts</th>
                    <th style="padding: 8px; text-align: center;">V/N/D/F</th>
                    <th style="padding: 8px; text-align: center;">PP/PC</th>
                    <th style="padding: 8px; text-align: center;">Diff</th>
                </tr>
            </thead>
            <tbody>
    `;

    finalRanking.forEach((player, idx) => {
        const bgColor = player.position === 1 ? '#fff9c4' :
                       player.position === 2 ? '#f5f5f5' :
                       player.position <= 4 ? '#ffecb3' : 'white';
        const badge = player.badge || '';
        const ga = (player.pointsWon || 0) - (player.pointsLost || 0);
        const gaDisplay = ga >= 0 ? `+${ga}` : ga;

        html += `
            <tr style="background: ${bgColor}; border-bottom: 1px solid #eee;">
                <td style="padding: 8px; text-align: center; font-weight: 600;">${badge} ${player.position}</td>
                <td style="padding: 8px; font-weight: ${player.position <= 4 ? '600' : '400'};">
                    ${player.name}
                    ${player.label && player.position <= 4 ? `<span style="font-size: 10px; color: #666; margin-left: 5px;">(${player.label})</span>` : ''}
                </td>
                <td style="padding: 8px; text-align: center;">${player.totalPoints || 0}</td>
                <td style="padding: 8px; text-align: center;">${player.wins || 0}/${player.draws || 0}/${player.losses || 0}/${player.forfeits || 0}</td>
                <td style="padding: 8px; text-align: center;">${player.pointsWon || 0}/${player.pointsLost || 0}</td>
                <td style="padding: 8px; text-align: center; color: ${ga >= 0 ? '#27ae60' : '#e74c3c'};">${gaDisplay}</td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
        </div>
        </div>
    `;

    return html;
}

function openCompleteRankingInNewWindow() {
    const content = document.getElementById('completeDayRankingContent').innerHTML;
    const title = document.getElementById('completeDayRankingTitle').textContent;

    const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            min-height: 100vh;
            padding: 20px;
            color: #fff;
        }
        .header {
            text-align: center;
            padding: 20px;
            background: linear-gradient(135deg, #27ae60, #2ecc71);
            border-radius: 15px;
            margin-bottom: 20px;
            box-shadow: 0 10px 30px rgba(39, 174, 96, 0.3);
        }
        .header h1 {
            font-size: 1.8em;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        .content {
            background: rgba(255,255,255,0.95);
            border-radius: 15px;
            padding: 20px;
            color: #2c3e50;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${title}</h1>
    </div>
    <div class="content">
        ${content}
    </div>
</body>
</html>`;

    const newWindow = window.open('', 'CompleteRankingDisplay', 'width=1000,height=800,menubar=no,toolbar=no,location=no,status=no');
    if (newWindow) {
        newWindow.document.write(html);
        newWindow.document.close();
    }
}
window.openCompleteRankingInNewWindow = openCompleteRankingInNewWindow;

function showByeManagementModal(dayNumber) {
        const dayData = championship.days[dayNumber];
        if (!dayData) return;

        const numDivisions = championship.config?.numberOfDivisions || 3;
        // Analyser qui a besoin de matchs BYE
        let playersNeedingBye = [];

        for (let division = 1; division <= numDivisions; division++) {
            const players = dayData.players[division] || [];

            players.forEach(player => {
                // Normaliser le nom du joueur (peut être un objet {name, club} ou une chaîne)
                const playerName = getPlayerName(player);

                // Collecter TOUS les matchs du joueur (réguliers + poules + phase finale)
                let allMatches = [];

                // Matchs réguliers
                const regularMatches = (dayData.matches[division] || []).filter(m =>
                    m.player1 === playerName || m.player2 === playerName
                );
                allMatches.push(...regularMatches);

                // Matchs de poules
                if (dayData.pools?.enabled && dayData.pools.divisions?.[division]) {
                    const poolMatches = (dayData.pools.divisions[division].matches || []).filter(m =>
                        m.player1 === playerName || m.player2 === playerName
                    );
                    allMatches.push(...poolMatches);

                    // Matchs de phase finale
                    const finalMatches = (dayData.pools.divisions[division].finalPhase || []).filter(m =>
                        m.player1 === playerName || m.player2 === playerName
                    );
                    allMatches.push(...finalMatches);
                }

                const matchCount = allMatches.length;

                if (matchCount < 4) {
                    playersNeedingBye.push({
                        name: playerName,
                        division: division,
                        currentMatches: matchCount,
                        missingMatches: 4 - matchCount,
                        hasBye: playerHasByeMatch(dayNumber, division, playerName)
                    });
                }
            });
        }
        
        if (playersNeedingBye.length === 0) {
            alert('✅ Tous les joueurs ont 4 matchs !\n\nAucun match BYE nécessaire.');
            return;
        }
        
        // Créer le contenu du modal
        let modalHTML = `
            <div style="max-height: 400px; overflow-y: auto;">
                <p style="margin-bottom: 15px; color: #e67e22; font-weight: bold;">
                    ⚠️ ${playersNeedingBye.length} joueur(s) ont moins de 4 matchs
                </p>
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #34495e; color: white;">
                            <th style="padding: 10px; text-align: left;">Joueur</th>
                            <th style="padding: 10px; text-align: center;">Div</th>
                            <th style="padding: 10px; text-align: center;">Matchs</th>
                            <th style="padding: 10px; text-align: center;">Manquants</th>
                            <th style="padding: 10px; text-align: center;">Action</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        playersNeedingBye.forEach((player, index) => {
            const escapedPlayerName = escapeForOnclick(player.name);
            // Style conditionnel : fond orange si le joueur a déjà un BYE
            const rowStyle = player.hasBye
                ? 'background: linear-gradient(135deg, #f39c12, #e67e22); color: white;'
                : (index % 2 === 0 ? 'background: #f8f9fa;' : '');

            modalHTML += `
                <tr style="border-bottom: 1px solid #ddd; ${rowStyle}">
                    <td style="padding: 10px; font-weight: bold;">
                        ${player.hasBye ? '🎯 ' : ''}${player.name}${player.hasBye ? ' (a déjà un BYE)' : ''}
                    </td>
                    <td style="padding: 10px; text-align: center;">D${player.division}</td>
                    <td style="padding: 10px; text-align: center;">${player.currentMatches}/4</td>
                    <td style="padding: 10px; text-align: center; ${player.hasBye ? 'color: white;' : 'color: #e74c3c;'} font-weight: bold;">
                        ${player.missingMatches}
                    </td>
                    <td style="padding: 10px; text-align: center;">
                        <button onclick="addByeMatchForPlayer(${dayNumber}, ${player.division}, '${escapedPlayerName}'); setTimeout(() => showByeManagementModal(${dayNumber}), 200);"
                                style="
                            background: linear-gradient(135deg, #27ae60, #2ecc71);
                            color: white;
                            border: none;
                            padding: 8px 15px;
                            border-radius: 6px;
                            cursor: pointer;
                            font-weight: bold;
                        ">
                            + BYE
                        </button>
                    </td>
                </tr>
            `;
        });
        
        modalHTML += `
                    </tbody>
                </table>
                
                <div style="
                    margin-top: 20px;
                    padding: 15px;
                    background: #d5f4e6;
                    border-radius: 8px;
                    border-left: 4px solid #27ae60;
                ">
                    <strong>💡 Explication :</strong><br>
                    Un match BYE donne automatiquement 5 points (victoire) + forfait au joueur.<br>
                    Cela compense l'absence de 4ème adversaire avec un nombre impair de joueurs.<br>
                    <strong style="color: #f39c12;">🎯 Les lignes oranges</strong> indiquent les joueurs ayant déjà au moins un match BYE.
                </div>
            </div>
        `;
        
        // Afficher dans un modal custom
        const existingModal = document.getElementById('byeManagementModal');
        if (existingModal) existingModal.remove();
        
        const modal = document.createElement('div');
        modal.id = 'byeManagementModal';
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 800px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="margin: 0; color: #2c3e50;">
                        🎯 Gestion des Matchs BYE - Journée ${dayNumber}
                    </h3>
                    <button onclick="closeByeModal()" class="close-modal">×</button>
                </div>
                ${modalHTML}
                <div class="modal-buttons" style="margin-top: 20px;">
                    <button onclick="addByeToAll(${dayNumber}); setTimeout(() => showByeManagementModal(${dayNumber}), 200);" class="btn btn-success">
                        ✅ Ajouter BYE à TOUS
                    </button>
                    <button onclick="closeByeModal()" class="btn" style="background: #95a5a6;">
                        Fermer
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Fermer en cliquant en dehors
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeByeModal();
            }
        });
    }
    window.showByeManagementModal = showByeManagementModal;

    function closeByeModal() {
        const modal = document.getElementById('byeManagementModal');
        if (modal) modal.remove();
    }
    window.closeByeModal = closeByeModal;

    function addByeToAll(dayNumber) {
        const dayData = championship.days[dayNumber];
        if (!dayData) return;

        const numDivisions = championship.config?.numberOfDivisions || 3;
        let addedCount = 0;

        for (let division = 1; division <= numDivisions; division++) {
            const players = dayData.players[division] || [];

            players.forEach(player => {
                // Normaliser le nom du joueur (peut être un objet {name, club} ou une chaîne)
                const playerName = getPlayerName(player);

                // Collecter TOUS les matchs du joueur (réguliers + poules + phase finale)
                let allMatches = [];

                // Matchs réguliers
                const regularMatches = (dayData.matches[division] || []).filter(m =>
                    m.player1 === playerName || m.player2 === playerName
                );
                allMatches.push(...regularMatches);

                // Matchs de poules
                if (dayData.pools?.enabled && dayData.pools.divisions?.[division]) {
                    const poolMatches = (dayData.pools.divisions[division].matches || []).filter(m =>
                        m.player1 === playerName || m.player2 === playerName
                    );
                    allMatches.push(...poolMatches);

                    // Matchs de phase finale
                    const finalMatches = (dayData.pools.divisions[division].finalPhase || []).filter(m =>
                        m.player1 === playerName || m.player2 === playerName
                    );
                    allMatches.push(...finalMatches);
                }

                const matchCount = allMatches.length;
                const missingMatches = 4 - matchCount;

                for (let i = 0; i < missingMatches; i++) {
                    addByeMatchForPlayer(dayNumber, division, playerName);
                    addedCount++;
                }
            });
        }

        showNotification(`${addedCount} matchs BYE ajoutés automatiquement !`, 'success');
    }
    window.addByeToAll = addByeToAll;
    // ÉVÉNEMENTS
    function setupEventListeners() {
        const fileInput = document.getElementById('fileInput');
        if (fileInput) fileInput.addEventListener('change', handleFileImport);
        
        const importFileInput = document.getElementById('importFileInput');
        if (importFileInput) importFileInput.addEventListener('change', handleChampionshipImport);
        
        ['bulkModal', 'importModal'].forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.addEventListener('click', function(event) {
                    if (event.target === this) {
                        this.style.display = 'none';
                    }
                });
            }
        });
        
        const playerModal = document.getElementById('playerModal');
        if (playerModal) {
            playerModal.addEventListener('click', function(event) {
                if (event.target === this) {
                    closePlayerModal();
                }
            });
        }
        
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape') {
                closeBulkModal();
                closePlayerModal();
                closeImportModal();
            }
        });
        
        const playerNameInput = document.getElementById('playerName');
        if (playerNameInput) {
            playerNameInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    addPlayer();
                }
            });
        }
    }
function exportGeneralRankingToHTML() {
    const generalRanking = calculateGeneralRanking();

    const generalStats = calculateGeneralStats();

    if (!generalRanking.hasData) {
        alert('Aucun classement général disponible pour l\'export HTML');
        return;
    }

    // Créer le contenu HTML
    let htmlContent = `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Classement Général du Championnat</title>
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    background: linear-gradient(135deg, #0a64da 0%, #2020c7 100%);
                    min-height: 100vh;
                    padding: 20px;
                }
                .container {
                    max-width: 1400px;
                    margin: 0 auto;
                    background: white;
                    border-radius: 15px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                    overflow: hidden;
                }
                .header {
                    background: linear-gradient(135deg, #2c3e50, #34495e);
                    color: white;
                    padding: 25px;
                    text-align: center;
                }
                .header h1 {
                    font-size: 2.5rem;
                    margin-bottom: 10px;
                }
                .section {
                    margin-bottom: 40px;
                    background: #f8f9fa;
                    border-radius: 12px;
                    padding: 25px;
                    border-left: 5px solid #3498db;
                }
                .section h2 {
                    color: #2c3e50;
                    margin-bottom: 20px;
                    font-size: 1.5rem;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .stats {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 20px;
                    margin-bottom: 30px;
                }
                .stat-card {
                    background: white;
                    padding: 20px;
                    border-radius: 12px;
                    text-align: center;
                    border-left: 4px solid #f39c12;
                    box-shadow: 0 3px 10px rgba(0,0,0,0.1);
                }
                .stat-number {
                    font-size: 2.5rem;
                    font-weight: bold;
                    color: #f39c12;
                    margin-bottom: 5px;
                }
                .stat-label {
                    color: #7f8c8d;
                    font-weight: 500;
                }
                .division {
                    background: white;
                    border-radius: 12px;
                    padding: 25px;
                    box-shadow: 0 5px 15px rgba(0,0,0,0.1);
                    border-top: 4px solid;
                    margin-bottom: 20px;
                }
                .division-1 { border-top-color: #e74c3c; }
                .division-2 { border-top-color: #f39c12; }
                .division-3 { border-top-color: #27ae60; }
                .division h3 {
                    margin-bottom: 20px;
                    font-size: 1.3rem;
                    text-align: center;
                }
                .ranking-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 15px;
                }
                .ranking-table th, .ranking-table td {
                    padding: 12px;
                    text-align: left;
                    border-bottom: 1px solid #ecf0f1;
                }
                .ranking-table th {
                    background: #f8f9fa;
                    font-weight: 600;
                    color: #2c3e50;
                }
                .ranking-table tr:hover {
                    background: #f8f9fa;
                }
                .rank-position {
                    font-weight: bold;
                    color: #3498db;
                    width: 50px;
                }
                .rank-gold { color: #f39c12; }
                .rank-silver { color: #95a5a6; }
                .rank-bronze { color: #e67e22; }
                .footer {
                    text-align: center;
                    padding: 20px;
                    color: #7f8c8d;
                    font-size: 14px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🏆 CLASSEMENT GÉNÉRAL DU CHAMPIONNAT</h1>
                    <p>Généré le ${new Date().toLocaleDateString('fr-FR', {
                        year: 'numeric', month: 'long', day: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                    })}</p>
                </div>
                <div class="section">
                    <h2>📊 STATISTIQUES DU CHAMPIONNAT</h2>
                    <div class="stats">
                        <div class="stat-card">
                            <div class="stat-number">${generalStats.totalDays}</div>
                            <div class="stat-label">Journées disputées</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">${generalStats.totalPlayers}</div>
                            <div class="stat-label">Joueurs uniques</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">${generalStats.totalMatches}</div>
                            <div class="stat-label">Matchs programmés</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">${generalStats.completedMatches}</div>
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
        htmlContent += `
            <div class="division division-${division}">
                <h3>${divisionIcon} DIVISION ${division}</h3>
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
            const rankClass = index < 3 ? `rank-${index === 0 ? 'gold' : index === 1 ? 'silver' : 'bronze'}` : '';
            htmlContent += `
                <tr>
                    <td class="rank-position ${rankClass}">${index + 1}</td>
                    <td>${player.name}</td>
                    <td>${player.totalPoints}</td>
                    <td>${player.daysPlayed}</td>
                    <td>${player.totalWins}/${player.totalDraws || 0}/${player.totalLosses}/${player.totalForfaits}</td>
                    <td>${player.avgWinRate}%</td>
                    <td>${player.totalPointsWon}/${player.totalPointsLost}</td>
                    <td>${player.goalAveragePoints > 0 ? '+' : ''}${player.goalAveragePoints}</td>
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
                    <p>Système de points: Victoire = 3pts, Nul = 2pts, Défaite = 1pt, Forfait = 0pt</p>
                </div>
            </div>
        </body>
        </html>
    `;

    // Créer un blob et une URL pour le téléchargement
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    // Créer un lien de téléchargement
    const a = document.createElement('a');
    a.href = url;
    a.download = `Classement_General_${new Date().toISOString().slice(0,10)}.html`;
    document.body.appendChild(a);
    a.click();

    // Nettoyer
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showNotification('Classement général exporté en HTML !', 'success');
}

window.exportGeneralRanking = exportGeneralRanking;
window.exportGeneralRankingToPDF = exportGeneralRankingToPDF;
window.exportGeneralRankingToHTML = exportGeneralRankingToHTML;
    // INITIALISATION AU CHARGEMENT
    // Afficher l'attribution des terrains par division
    function updateCourtAssignmentInfo() {
        const infoDiv = document.getElementById('courtAssignmentInfo');
        if (!infoDiv) return;

        const numDivisions = getNumberOfDivisions();
        const medals = ['🥇', '🥈', '🥉', '🏅', '🎖️', '⭐'];

        let html = '<div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">';

        for (let div = 1; div <= numDivisions; div++) {
            const courts = getCourtsForDivision(div);
            const medal = medals[div - 1] || '📊';

            let courtText = '';
            if (courts.first === courts.last) {
                courtText = `Terrain ${courts.first}`;
            } else {
                courtText = `Terrains ${courts.first}-${courts.last}`;
            }

            html += `
                <div style="padding: 5px 15px; background: white; border-radius: 5px; color: #16a085; font-weight: bold;">
                    ${medal} Division ${div}: ${courtText}
                </div>
            `;
        }

        html += '</div>';
        infoDiv.innerHTML = html;
    }
    window.updateCourtAssignmentInfo = updateCourtAssignmentInfo;

    // Fonction pour initialiser les selects de division dynamiquement
    function initializeDivisionSelects() {
        const numDivisions = getNumberOfDivisions();

        // Sélecteurs statiques de J1
        const staticSelects = ['playerDivision', 'bulkDivision'];

        staticSelects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                select.innerHTML = '';
                for (let i = 1; i <= numDivisions; i++) {
                    const option = document.createElement('option');
                    option.value = i;
                    option.textContent = `Division ${i}`;
                    select.appendChild(option);
                }
            }
        });

        // Sélecteurs dynamiques pour les journées J2+
        if (championship && championship.days) {
            Object.keys(championship.days).forEach(dayNum => {
                const dayNumber = parseInt(dayNum);
                if (dayNumber > 1) {
                    const dynamicSelects = [`playerDivision-${dayNumber}`, `bulkDivision-${dayNumber}`];
                    dynamicSelects.forEach(selectId => {
                        const select = document.getElementById(selectId);
                        if (select) {
                            select.innerHTML = '';
                            for (let i = 1; i <= numDivisions; i++) {
                                const option = document.createElement('option');
                                option.value = i;
                                option.textContent = `Division ${i}`;
                                select.appendChild(option);
                            }
                        }
                    });
                }
            });
        }

        // Mettre à jour les selects de configuration
        const divisionConfig = document.getElementById('divisionConfig');
        const courtConfig = document.getElementById('courtConfig');
        if (divisionConfig && championship.config) {
            divisionConfig.value = championship.config.numberOfDivisions || 3;
        }
        if (courtConfig && championship.config) {
            courtConfig.value = championship.config.numberOfCourts || 4;
        }

        // Afficher l'attribution des terrains
        updateCourtAssignmentInfo();
    }
    window.initializeDivisionSelects = initializeDivisionSelects;

    document.addEventListener('DOMContentLoaded', function() {
        // Charger les données sauvegardées d'abord
        if (loadFromLocalStorage()) {
            // Puis migrer les données multisport (après chargement pour ne pas être écrasé)
            if (typeof initMultisport === 'function') {
                initMultisport();
            }
            
            // Migrer les données joueurs vers le format avec club si nécessaire
            if (typeof clubsModule !== 'undefined' && clubsModule.migratePlayerData) {
                clubsModule.migratePlayerData();
            }
            
            // Mettre à jour la visibilité de l'onglet multisport
            if (typeof updateMultisportTabVisibility === 'function') {
                updateMultisportTabVisibility();
            }
            
            // Initialiser le sélecteur de type pour la J1 (HTML statique)
            initializeDayTypeSelectorForDay1();
            initializeDivisionSelects();
            updateTabsDisplay();
            updateDaySelectors();
            initializeAllDaysContent();
            restoreCollapseState();
            switchTab(championship.currentDay);
            
            // Générer les boutons de copie rapide pour toutes les journées
            setTimeout(() => {
                Object.keys(championship.days).forEach(dayNum => {
                    generateQuickCopyButtons(parseInt(dayNum));
                });
            }, 100);
        } else {
            // Pas de données sauvegardées - initialiser la structure par défaut
            if (typeof initMultisport === 'function') {
                initMultisport();
            }
            initializeDivisionSelects();
            initializeDivisionsDisplay(1);
            updatePlayersDisplay(1);
            initializePoolsForDay(1);
            restoreCollapseState();
        }
        
        // Initialiser le sélecteur de type pour J1 (toujours faire cela)
        initializeDayTypeSelectorForDay1();

        setupEventListeners();

        // Protection du mode chrono contre les rafraîchissements
        setupChronoProtection();

        // Charger et restaurer les données chrono (y compris les chronos en cours)
        loadChronoFromLocalStorage();
        restoreRunningTimers();
    });

})(window);
