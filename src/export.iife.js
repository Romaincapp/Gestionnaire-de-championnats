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
    // Note: La fonction exportGeneralRankingToPDF est définie dans ranking.iife.js
    // pour utiliser le même format que l'affichage à l'écran.

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
    // Note: exportGeneralRankingToPDF est défini dans ranking.iife.js
    global.showPrintOptionsModal = showPrintOptionsModal;
    global.printMatchSheets = printMatchSheets;
    global.printRecapSheets = printRecapSheets;

})(window);
