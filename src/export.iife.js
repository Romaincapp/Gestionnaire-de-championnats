// ============================================
// MODULE EXPORT - Export de donnees et PDF
// ============================================
(function(global) {
    'use strict';

    var championship = global.championship;
    var config = global.config;
    var showNotification = global.showNotification;
    var saveToLocalStorage = global.saveToLocalStorage;

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
        
        var html = '<!DOCTYPE html><html><head>';
        html += '<meta charset="UTF-8">';
        html += '<title>Classement General</title>';
        html += '<style>';
        html += 'body { font-family: Arial, sans-serif; margin: 20px; }';
        html += 'h1 { text-align: center; color: #2c3e50; }';
        html += 'table { width: 100%; border-collapse: collapse; margin-top: 20px; }';
        html += 'th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }';
        html += 'th { background: #34495e; color: white; }';
        html += 'tr:nth-child(even) { background: #f8f9fa; }';
        html += '.rank-1 { background: #ffd700 !important; }';
        html += '.rank-2 { background: #c0c0c0 !important; }';
        html += '.rank-3 { background: #cd7f32 !important; }';
        html += '@media print { .no-print { display: none; } }';
        html += '</style></head><body>';
        
        html += '<h1>🏆 Classement General</h1>';
        html += '<p style="text-align: center;">Genere le ' + new Date().toLocaleDateString() + '</p>';
        
        // Recuperer le classement
        var allStats = {};
        Object.keys(championship.days).forEach(function(dayNumber) {
            var dayData = championship.days[dayNumber];
            if (!dayData || !dayData.players) return;
            
            for (var division = 1; division <= config.numberOfDivisions; division++) {
                var players = dayData.players[division] || [];
                players.forEach(function(player) {
                    if (!allStats[player]) {
                        allStats[player] = { player: player, played: 0, wins: 0, points: 0 };
                    }
                    
                    if (dayData.matches && dayData.matches[division]) {
                        dayData.matches[division].forEach(function(match) {
                            if ((match.player1 === player || match.player2 === player) && match.completed) {
                                allStats[player].played++;
                                if (match.winner === player) {
                                    allStats[player].wins++;
                                    allStats[player].points += 3;
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
        
        html += '<table>';
        html += '<thead><tr><th>#</th><th>Joueur</th><th>Matchs</th><th>Victoires</th><th>Points</th></tr></thead>';
        html += '<tbody>';
        
        sortedStats.forEach(function(stat, index) {
            var rankClass = index < 3 ? 'rank-' + (index + 1) : '';
            html += '<tr class="' + rankClass + '">';
            html += '<td>' + (index + 1) + '</td>';
            html += '<td><strong>' + stat.player + '</strong></td>';
            html += '<td>' + stat.played + '</td>';
            html += '<td>' + stat.wins + '</td>';
            html += '<td><strong>' + stat.points + '</strong></td>';
            html += '</tr>';
        });
        
        html += '</tbody></table>';
        html += '<div class="no-print" style="margin-top: 30px; text-align: center;">';
        html += '<button onclick="window.print()" style="padding: 10px 20px; font-size: 16px;">🖨️ Imprimer</button>';
        html += '</div>';
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
