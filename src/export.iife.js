// ============================================
// MODULE EXPORT - Export de donnees et PDF
// ============================================
(function(global) {
    'use strict';

    var championship = global.championship;
    var config = global.config;
    var showNotification = global.showNotification;
    var saveToLocalStorage = global.saveToLocalStorage;
    var getPlayerName = global.getPlayerName;

    // ============================================
    // EXPORT CHAMPIONNAT (JSON)
    // ============================================

    function exportChampionship() {
        var data = {
            version: '2.0',
            exportedAt: new Date().toISOString(),
            config: championship.config,
            days: championship.days
        };
        
        var json = JSON.stringify(data, null, 2);
        var blob = new Blob([json], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        
        var a = document.createElement('a');
        a.href = url;
        a.download = 'championnat-' + new Date().toISOString().split('T')[0] + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
        showNotification('Championnat exporte !', 'success');
    }

    function confirmExportChampionship() {
        if (confirm('Exporter toutes les donnees du championnat ?')) {
            exportChampionship();
        }
    }

    // ============================================
    // CLASSEMENT GENERAL EN PDF
    // ============================================

    function exportGeneralRankingToPDF() {
        var printWindow = window.open('', '_blank');
        if (!printWindow) {
            showNotification('Veuillez autoriser les popups', 'error');
            return;
        }
        
        // Recuperer le classement
        var allStats = {};
        Object.keys(championship.days).forEach(function(dayNumber) {
            var dayData = championship.days[dayNumber];
            if (!dayData || !dayData.players) return;
            
            for (var division = 1; division <= config.numberOfDivisions; division++) {
                var players = dayData.players[division] || [];
                players.forEach(function(player) {
                    var playerName = getPlayerName(player);
                    if (!playerName) return;
                    
                    if (!allStats[playerName]) {
                        allStats[playerName] = { player: playerName, played: 0, wins: 0, points: 0 };
                    }
                    
                    if (dayData.matches && dayData.matches[division]) {
                        dayData.matches[division].forEach(function(match) {
                            if ((match.player1 === playerName || match.player2 === playerName) && match.completed) {
                                allStats[playerName].played++;
                                if (match.winner === playerName) {
                                    allStats[playerName].wins++;
                                    allStats[playerName].points += 3;
                                }
                            }
                        });
                    }
                });
            }
        });
        
        var sortedStats = Object.values(allStats).sort(function(a, b) {
            return b.points - a.points || b.wins - a.wins;
        });
        
        var totalPlayers = sortedStats.length;
        var totalMatches = sortedStats.reduce(function(sum, s) { return sum + s.played; }, 0);
        
        var html = '<!DOCTYPE html><html><head>';
        html += '<meta charset="UTF-8">';
        html += '<title>Classement General</title>';
        html += '<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">';
        html += '<style>';
        html += '* { box-sizing: border-box; }';
        html += 'body { font-family: "Poppins", Arial, sans-serif; margin: 0; padding: 40px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; }';
        html += '.container { max-width: 900px; margin: 0 auto; background: white; border-radius: 20px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); overflow: hidden; }';
        html += '.header { background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); color: white; padding: 40px; text-align: center; position: relative; }';
        html += '.header::after { content: ""; position: absolute; bottom: -20px; left: 0; right: 0; height: 40px; background: white; border-radius: 50% 50% 0 0; }';
        html += '.header h1 { margin: 0; font-size: 2.5em; font-weight: 700; text-shadow: 2px 2px 4px rgba(0,0,0,0.2); }';
        html += '.header .trophy { font-size: 3em; margin-bottom: 10px; display: block; }';
        html += '.header .date { opacity: 0.9; margin-top: 10px; font-size: 1.1em; }';
        html += '.stats-bar { display: flex; justify-content: center; gap: 40px; padding: 20px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }';
        html += '.stat-item { text-align: center; }';
        html += '.stat-value { font-size: 1.8em; font-weight: 700; color: #2a5298; }';
        html += '.stat-label { font-size: 0.9em; color: #64748b; text-transform: uppercase; letter-spacing: 1px; }';
        html += '.content { padding: 30px; }';
        html += 'table { width: 100%; border-collapse: separate; border-spacing: 0; }';
        html += 'th { background: linear-gradient(135deg, #34495e 0%, #2c3e50 100%); color: white; padding: 16px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; font-size: 0.85em; }';
        html += 'th:first-child { border-radius: 10px 0 0 0; }';
        html += 'th:last-child { border-radius: 0 10px 0 0; }';
        html += 'td { padding: 16px; border-bottom: 1px solid #e2e8f0; }';
        html += 'tr:hover { background: #f1f5f9; transform: scale(1.01); transition: all 0.2s ease; }';
        html += 'tr:last-child td:first-child { border-radius: 0 0 0 10px; }';
        html += 'tr:last-child td:last-child { border-radius: 0 0 10px 0; }';
        html += '.rank { font-weight: 700; font-size: 1.2em; width: 60px; text-align: center; }';
        html += '.rank-1 { background: linear-gradient(135deg, #ffd700 0%, #ffed4a 100%) !important; }';
        html += '.rank-1 .rank { color: #b8860b; font-size: 1.5em; }';
        html += '.rank-2 { background: linear-gradient(135deg, #c0c0c0 0%, #e8e8e8 100%) !important; }';
        html += '.rank-2 .rank { color: #808080; font-size: 1.4em; }';
        html += '.rank-3 { background: linear-gradient(135deg, #cd7f32 0%, #daa520 100%) !important; }';
        html += '.rank-3 .rank { color: #8b4513; font-size: 1.3em; }';
        html += '.player-name { font-weight: 600; color: #1e293b; font-size: 1.05em; }';
        html += '.stat-number { text-align: center; font-weight: 600; color: #475569; }';
        html += '.points { text-align: center; font-weight: 700; color: #2a5298; font-size: 1.2em; }';
        html += '.win-rate { font-size: 0.85em; color: #64748b; font-weight: 500; }';
        html += '.empty-state { text-align: center; padding: 60px 20px; color: #94a3b8; }';
        html += '.empty-state-icon { font-size: 4em; margin-bottom: 20px; }';
        html += '.btn-print { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 15px 40px; font-size: 1.1em; font-weight: 600; border-radius: 50px; cursor: pointer; box-shadow: 0 10px 25px -5px rgba(102, 126, 234, 0.4); transition: all 0.3s ease; }';
        html += '.btn-print:hover { transform: translateY(-2px); box-shadow: 0 15px 30px -5px rgba(102, 126, 234, 0.5); }';
        html += '.footer { text-align: center; padding: 20px; color: #94a3b8; font-size: 0.9em; }';
        html += '@media print { body { background: white; padding: 0; } .container { box-shadow: none; border-radius: 0; } .no-print { display: none !important; } .header { -webkit-print-color-adjust: exact; print-color-adjust: exact; } th { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .rank-1, .rank-2, .rank-3 { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }';
        html += '</style></head><body>';
        
        html += '<div class="container">';
        
        // Header
        html += '<div class="header">';
        html += '<span class="trophy">🏆</span>';
        html += '<h1>Classement Général</h1>';
        html += '<div class="date">Généré le ' + new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) + '</div>';
        html += '</div>';
        
        // Stats bar
        if (totalPlayers > 0) {
            html += '<div class="stats-bar">';
            html += '<div class="stat-item"><div class="stat-value">' + totalPlayers + '</div><div class="stat-label">Joueurs</div></div>';
            html += '<div class="stat-item"><div class="stat-value">' + totalMatches + '</div><div class="stat-label">Matchs joués</div></div>';
            html += '<div class="stat-item"><div class="stat-value">' + Object.keys(championship.days).length + '</div><div class="stat-label">Journées</div></div>';
            html += '</div>';
        }
        
        html += '<div class="content">';
        
        if (sortedStats.length === 0) {
            html += '<div class="empty-state">';
            html += '<div class="empty-state-icon">📊</div>';
            html += '<h3>Aucune donnée disponible</h3>';
            html += '<p>Commencez par ajouter des joueurs et des matchs pour voir le classement.</p>';
            html += '</div>';
        } else {
            html += '<table>';
            html += '<thead><tr><th>Rang</th><th>Joueur</th><th style="text-align:center">Matchs</th><th style="text-align:center">Victoires</th><th style="text-align:center">Points</th></tr></thead>';
            html += '<tbody>';
            
            sortedStats.forEach(function(stat, index) {
                var rankClass = index < 3 ? 'rank-' + (index + 1) : '';
                var winRate = stat.played > 0 ? Math.round((stat.wins / stat.played) * 100) : 0;
                var rankIcon = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : (index + 1);
                
                html += '<tr class="' + rankClass + '">';
                html += '<td class="rank">' + rankIcon + '</td>';
                html += '<td class="player-name">' + stat.player + '</td>';
                html += '<td class="stat-number">' + stat.played + '</td>';
                html += '<td class="stat-number">' + stat.wins + ' <span class="win-rate">(' + winRate + '%)</span></td>';
                html += '<td class="points">' + stat.points + '</td>';
                html += '</tr>';
            });
            
            html += '</tbody></table>';
        }
        
        html += '</div>'; // content
        
        html += '<div class="footer no-print">';
        html += '<button class="btn-print" onclick="window.print()">🖨️ Imprimer le classement</button>';
        html += '</div>';
        
        html += '</div>'; // container
        html += '</body></html>';
        
        printWindow.document.write(html);
        printWindow.document.close();
    }

    // ============================================
    // OPTIONS D'IMPRESSION
    // ============================================

    function showPrintOptionsModal(dayNumber) {
        if (document.getElementById('printOptionsModal')) return;
        
        var modal = document.createElement('div');
        modal.id = 'printOptionsModal';
        modal.innerHTML = 
            '<div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; ' +
            'background: rgba(0,0,0,0.5); display: flex; justify-content: center; ' +
            'align-items: center; z-index: 10000;" onclick="if(event.target===this)closeModal(\'printOptionsModal\')">' +
            '<div style="background: white; padding: 30px; border-radius: 10px; max-width: 400px; width: 90%;">' +
            '<h3>🖨️ Options d\'impression</h3>' +
            '<div style="display: flex; flex-direction: column; gap: 10px; margin: 20px 0;">' +
            '<button onclick="printMatchSheets()" class="btn btn-primary" style="padding: 15px;">' +
            '📄 Feuilles de match</button>' +
            '<button onclick="printRecapSheets()" class="btn btn-secondary" style="padding: 15px;">' +
            '📊 Recapitulatifs</button>' +
            '<button onclick="window.print()" class="btn btn-secondary" style="padding: 15px;">' +
            '🖨️ Page actuelle</button>' +
            '</div>' +
            '<div style="display: flex; justify-content: flex-end;">' +
            '<button onclick="closeModal(\'printOptionsModal\')" class="btn btn-secondary">Fermer</button>' +
            '</div></div></div>';
        
        document.body.appendChild(modal);
    }

    function printMatchSheets() {
        var dayNumber = championship.currentDay;
        var dayData = championship.days[dayNumber];
        if (!dayData) {
            showNotification('Aucune donnee a imprimer', 'error');
            return;
        }
        
        var printWindow = window.open('', '_blank');
        if (!printWindow) {
            showNotification('Veuillez autoriser les popups', 'error');
            return;
        }
        
        var html = '<!DOCTYPE html><html><head>';
        html += '<meta charset="UTF-8">';
        html += '<title>Feuilles de Match</title>';
        html += '<style>';
        html += 'body { font-family: Arial, sans-serif; margin: 10px; }';
        html += '.match-sheet { border: 2px solid #333; padding: 20px; margin-bottom: 20px; page-break-inside: avoid; }';
        html += '.match-title { text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 15px; }';
        html += '.players { display: flex; justify-content: space-between; font-size: 20px; margin: 20px 0; }';
        html += '.score-box { border: 2px solid #333; width: 60px; height: 40px; display: inline-block; }';
        html += '@media print { .match-sheet { page-break-inside: avoid; } }';
        html += '</style></head><body>';
        
        for (var division = 1; division <= config.numberOfDivisions; division++) {
            var matches = dayData.matches[division] || [];
            
            matches.forEach(function(match, index) {
                html += '<div class="match-sheet">';
                html += '<div class="match-title">Journee ' + dayNumber + ' - Division ' + division + ' - Match ' + (index + 1) + '</div>';
                html += '<div class="players">';
                html += '<div>' + match.player1 + '</div>';
                html += '<div>VS</div>';
                html += '<div>' + match.player2 + '</div>';
                html += '</div>';
                html += '<div style="text-align: center; margin-top: 30px;">';
                html += 'Score: <span class="score-box"></span> - <span class="score-box"></span>';
                html += '</div>';
                html += '<div style="margin-top: 30px; text-align: center;">';
                html += 'Signature gagnant: ___________________';
                html += '</div>';
                html += '</div>';
            });
        }
        
        html += '</body></html>';
        
        printWindow.document.write(html);
        printWindow.document.close();
    }

    function printRecapSheets() {
        showNotification('Recapitulatifs - A implementer', 'info');
    }

    // ============================================
    // EXPOSITION SUR WINDOW
    // ============================================

    global.exportChampionship = exportChampionship;
    global.confirmExportChampionship = confirmExportChampionship;
    global.exportGeneralRankingToPDF = exportGeneralRankingToPDF;
    global.showPrintOptionsModal = showPrintOptionsModal;
    global.printMatchSheets = printMatchSheets;
    global.printRecapSheets = printRecapSheets;

})(window);
