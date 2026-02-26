// ============================================
// MODULE IMPRESSION (IIFE)
// ============================================
(function(global) {
    'use strict';

    var championship = global.championship;
    var showNotification = global.showNotification;
    var getNumberOfDivisions = function() { return typeof global.getNumberOfDivisions === 'function' ? global.getNumberOfDivisions() : 3; };
    var getNumberOfCourts = function() { return typeof global.getNumberOfCourts === 'function' ? global.getNumberOfCourts() : 4; };
    var getPlayerName = function(p) { return typeof global.getPlayerName === 'function' ? global.getPlayerName(p) : (p || ''); };

// ======================================
// SYSTÈME D'IMPRESSION DES FEUILLES DE MATCH
// ======================================

// Fonction principale pour imprimer les feuilles de match
function printMatchSheets(dayNumber) {
    if (!dayNumber) dayNumber = championship.currentDay;

    const dayData = championship.days[dayNumber];
    if (!dayData) {
        alert('Aucune donnée trouvée pour cette journée !');
        return;
    }
    
    // Collecter tous les matchs de toutes les divisions
    let allMatches = [];
    let hasMatches = false;
    
    const numDivisions = getNumberOfDivisions();
    for (let division = 1; division <= numDivisions; division++) {
        const divisionMatches = getDivisionMatches(dayData, division, dayNumber);
        if (divisionMatches.length > 0) {
            allMatches.push(...divisionMatches);
            hasMatches = true;
        }
    }
    
    if (!hasMatches) {
        alert('⚠️ Aucun match généré pour cette journée !\n\nVeuillez d\'abord générer les matchs ou les poules.');
        return;
    }
    
    // Grouper les matchs par pages (5 matchs par page A4)
    const matchPages = groupMatchesIntoPages(allMatches, 5);
    
    // Générer le HTML d'impression
    const printHTML = generateMatchSheetHTML(dayNumber, matchPages);
    
    // Ouvrir dans une nouvelle fenêtre pour impression
    openPrintWindow(printHTML, `Feuilles_de_match_J${dayNumber}`);
    
    showNotification(`📋 ${allMatches.length} feuilles de match générées !`, 'success');
}

// Récupérer les matchs d'une division (Round-Robin ou Poules)
function getDivisionMatches(dayData, division, dayNumber) {
    const matches = [];
    
    // Vérifier d'abord le mode poules
    if (dayData.pools && dayData.pools.enabled && dayData.pools.divisions[division].matches.length > 0) {
        // Mode poules
        const poolMatches = dayData.pools.divisions[division].matches;
        poolMatches.forEach((match, index) => {
            matches.push({
                matchId: `J${dayNumber}-D${division}-P${match.poolIndex + 1}-M${index + 1}`,
                division: division,
                player1: match.player1,
                player2: match.player2,
                type: 'Poule',
                poolName: match.poolName || `Poule ${String.fromCharCode(65 + match.poolIndex)}`,
                tour: null,
                dayNumber: dayNumber,
                court: match.court // Préserver le numéro de terrain
            });
        });
    } else if (dayData.matches[division].length > 0) {
        // Mode Round-Robin classique
        const roundRobinMatches = dayData.matches[division];
        roundRobinMatches.forEach((match, index) => {
            matches.push({
                matchId: `J${dayNumber}-D${division}-T${match.tour}-M${index + 1}`,
                division: division,
                player1: match.player1,
                player2: match.player2,
                type: 'Round-Robin',
                tour: match.tour,
                poolName: null,
                dayNumber: dayNumber,
                court: match.court // Préserver le numéro de terrain
            });
        });
    }
    
    return matches;
}

// Grouper les matchs en pages
function groupMatchesIntoPages(matches, matchesPerPage) {
    const pages = [];

    for (let i = 0; i < matches.length; i += matchesPerPage) {
        pages.push(matches.slice(i, i + matchesPerPage));
    }

    return pages;
}

// Réorganiser les matchs pour alterner les tours sur chaque page
// Pour Boccia: sur chaque page de 4 matchs, on veut 1 match de chaque tour (T1, T2, T3, T4)
function reorganizeMatchesByTour(matches) {
    // Grouper les matchs par tour
    const matchesByTour = {};

    matches.forEach(match => {
        const tour = match.tour || 0;
        if (!matchesByTour[tour]) {
            matchesByTour[tour] = [];
        }
        matchesByTour[tour].push(match);
    });

    // Obtenir les tours disponibles triés
    const tours = Object.keys(matchesByTour).map(Number).sort((a, b) => a - b);

    // Si pas de tours ou un seul tour, retourner les matchs tels quels
    if (tours.length <= 1) {
        return matches;
    }

    // Réorganiser en alternant les tours
    const reorganized = [];
    let maxLength = Math.max(...tours.map(t => matchesByTour[t].length));

    for (let i = 0; i < maxLength; i++) {
        tours.forEach(tour => {
            if (matchesByTour[tour][i]) {
                reorganized.push(matchesByTour[tour][i]);
            }
        });
    }

    return reorganized;
}

// Réorganiser les matchs pour pétanque : un match de chaque tour par page (4 matchs par page)
function reorganizeMatchesForPetanque(matches) {
    // Grouper les matchs par tour
    const matchesByTour = {};

    matches.forEach(match => {
        const tour = match.tour || 0;
        if (!matchesByTour[tour]) {
            matchesByTour[tour] = [];
        }
        matchesByTour[tour].push(match);
    });

    // Obtenir les tours disponibles triés
    const tours = Object.keys(matchesByTour).map(Number).sort((a, b) => a - b);

    // Si pas de tours ou un seul tour, retourner les matchs tels quels groupés par 4
    if (tours.length <= 1) {
        return matches;
    }

    // Réorganiser : un match de chaque tour par page
    // On veut : [Match1-Tour1, Match1-Tour2, Match1-Tour3, Match1-Tour4, Match2-Tour1, Match2-Tour2, ...]
    const reorganized = [];
    const maxLength = Math.max(...tours.map(t => matchesByTour[t].length));

    // Pour chaque index de match (1er match, 2ème match, etc.)
    for (let i = 0; i < maxLength; i++) {
        // Ajouter le match numéro i de chaque tour
        tours.forEach(tour => {
            if (matchesByTour[tour][i]) {
                reorganized.push(matchesByTour[tour][i]);
            }
        });
    }

    return reorganized;
}

// Remplacez seulement cette fonction dans votre code existant :

// Générer le HTML complet pour l'impression - VERSION COMPACTE
function generateMatchSheetHTML(dayNumber, matchPages) {
    const currentDate = new Date().toLocaleDateString('fr-FR', {
        year: 'numeric', 
        month: 'long', 
        day: 'numeric'
    });
    
    let htmlContent = `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Feuilles de Match - Journée ${dayNumber}</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                
                body {
                    font-family: Arial, sans-serif;
                    font-size: 10px;
                    line-height: 1.2;
                    color: #000;
                    background: white;
                    padding: 8mm;
                }
                
                .page {
                    width: 100%;
                    page-break-after: always;
                    background: white;
                }
                
                .page:last-child {
                    page-break-after: avoid;
                }
                
                .page-header {
                    text-align: center;
                    margin-bottom: 8mm;
                    padding-bottom: 3mm;
                    border-bottom: 2px solid #000;
                }
                
                .page-title {
                    font-size: 14px;
                    font-weight: bold;
                    margin-bottom: 2mm;
                }
                
                .page-info {
                    font-size: 9px;
                    color: #666;
                }
                
                .match-sheet {
                    border: 1.5px solid #000;
                    margin-bottom: 4mm;
                    padding: 3mm;
                    page-break-inside: avoid;
                    background: white;
                }
                
                .match-header {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 2mm;
                    font-weight: bold;
                    font-size: 11px;
                }
                
                .match-id {
                    background: #f0f0f0;
                    padding: 1mm 2mm;
                    border: 1px solid #666;
                }
                
                .players-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 3mm;
                    font-size: 12px;
                    font-weight: bold;
                }
                
                .player-name {
                    flex: 1;
                    text-align: center;
                    padding: 2mm;
                    border: 1px solid #000;
                    background: #f8f8f8;
                }
                
                .vs-text {
                    padding: 0 3mm;
                    font-size: 10px;
                }
                
                .score-section {
                    margin-bottom: 2mm;
                }
                
                .score-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 9px;
                }
                
                .score-table th {
                    background: #000;
                    color: white;
                    padding: 1.5mm;
                    text-align: center;
                    font-size: 8px;
                    border: 1px solid #000;
                }
                
                .score-table td {
                    padding: 2mm;
                    text-align: center;
                    border: 1px solid #000;
                    height: 8mm;
                }
                
                .player-col {
                    background: #f0f0f0;
                    font-weight: bold;
                    font-size: 9px;
                    width: 25%;
                }
                
                .score-col {
                    width: 15%;
                    background: white;
                }
                
                .total-col {
                    width: 15%;
                    background: #e8e8e8;
                    font-weight: bold;
                }
                
                .result-row {
                    display: flex;
                    justify-content: space-between;
                    font-size: 8px;
                    margin-top: 1mm;
                }
                
                .result-box {
                    flex: 1;
                    margin: 0 1mm;
                }
                
                .result-label {
                    font-weight: bold;
                    margin-bottom: 1mm;
                }
                
                .result-line {
                    border-bottom: 1px solid #000;
                    height: 5mm;
                }
                
                @media print {
                    body {
                        padding: 5mm;
                        background: white !important;
                        -webkit-print-color-adjust: exact;
                        color-adjust: exact;
                    }
                    
                    .page {
                        margin: 0;
                        width: 100%;
                    }
                    
                    .match-sheet {
                        border: 1.5px solid #000 !important;
                        margin-bottom: 3mm;
                    }
                    
                    .score-table th {
                        background: #000 !important;
                        color: white !important;
                        -webkit-print-color-adjust: exact;
                        color-adjust: exact;
                    }
                    
                    .player-col {
                        background: #f0f0f0 !important;
                        -webkit-print-color-adjust: exact;
                        color-adjust: exact;
                    }
                    
                    .total-col {
                        background: #e8e8e8 !important;
                        -webkit-print-color-adjust: exact;
                        color-adjust: exact;
                    }
                }
                
                @page {
                    margin: 8mm;
                    size: A4 portrait;
                }
            </style>
        </head>
        <body>
    `;
    
    // Générer chaque page
    matchPages.forEach((pageMatches, pageIndex) => {
        htmlContent += `
            <div class="page">
                <div class="page-header">
                    <div class="page-title">🏓 FEUILLES DE MATCH - JOURNÉE ${dayNumber}</div>
                    <div class="page-info">${currentDate} • Page ${pageIndex + 1}/${matchPages.length} • ${pageMatches.length} matchs</div>
                </div>
        `;
        
        // Générer chaque match de la page
        pageMatches.forEach(match => {
            htmlContent += generateCompactMatchSheet(match);
        });
        
        htmlContent += `</div>`;
    });
    
    htmlContent += `
        </body>
        </html>
    `;
    
    return htmlContent;
}

// Générer une feuille de match compacte
function generateCompactMatchSheet(match) {
    const divisionName = match.division === 1 ? 'D1🥇' : 
                        match.division === 2 ? 'D2🥈' : 'D3🥉';
    
    const matchInfo = match.type === 'Poule' ? 
        `${match.poolName}` : 
        `Tour ${match.tour}`;
    
    return `
        <div class="match-sheet">
            <div class="match-header">
                <div class="match-id">${match.matchId} • ${divisionName}</div>
                <div>${match.type} • ${matchInfo}</div>
            </div>
            
            <div class="players-row">
                <div class="player-name">${match.player1}</div>
                <div class="vs-text">VS</div>
                <div class="player-name">${match.player2}</div>
            </div>
            
            <div class="score-section">
                <table class="score-table">
                    <thead>
                        <tr>
                            <th>JOUEUR</th>
                            <th>SET 1</th>
                            <th>SET 2</th>
                            <th>SET 3</th>
                            <th>TOTAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td class="player-col">${match.player1}</td>
                            <td class="score-col"></td>
                            <td class="score-col"></td>
                            <td class="score-col"></td>
                            <td class="total-col"></td>
                        </tr>
                        <tr>
                            <td class="player-col">${match.player2}</td>
                            <td class="score-col"></td>
                            <td class="score-col"></td>
                            <td class="score-col"></td>
                            <td class="total-col"></td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <div class="result-row">
                <div class="result-box">
                    <div class="result-label">VAINQUEUR:</div>
                    <div class="result-line"></div>
                </div>
                <div class="result-box">
                    <div class="result-label">ARBITRE:</div>
                    <div class="result-line"></div>
                </div>
            </div>
        </div>
    `;
}

// Générer une feuille de match simple (2 scores uniquement)
function generateSimpleScoreSheet(match) {
    const divisionName = match.division === 1 ? 'D1' :
                        match.division === 2 ? 'D2' :
                        match.division === 3 ? 'D3' :
                        match.division === 4 ? 'D4' :
                        match.division === 5 ? 'D5' : 'D6';

    const matchInfo = match.type === 'Poule' ?
        `${match.poolName}` :
        `Tour ${match.tour}`;

    const courtInfo = match.court ? ` • Terrain ${match.court}` : '';

    return `
        <div class="match-sheet">
            <div class="match-header">
                <div class="match-id">${match.matchId} • ${divisionName}${courtInfo}</div>
                <div>${match.type} • ${matchInfo}</div>
            </div>

            <div class="players-row">
                <div class="player-name">${match.player1}</div>
                <div class="vs-text">VS</div>
                <div class="player-name">${match.player2}</div>
            </div>

            <div class="score-section">
                <table class="score-table simple-score">
                    <thead>
                        <tr>
                            <th>JOUEUR</th>
                            <th>SCORE</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td class="player-col">${match.player1}</td>
                            <td class="score-col large-score"></td>
                        </tr>
                        <tr>
                            <td class="player-col">${match.player2}</td>
                            <td class="score-col large-score"></td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="result-row">
                <div class="result-box">
                    <div class="result-label">VAINQUEUR:</div>
                    <div class="result-line"></div>
                </div>
                <div class="result-box">
                    <div class="result-label">ARBITRE:</div>
                    <div class="result-line"></div>
                </div>
            </div>
        </div>
    `;
}

// Fonction pour imprimer les feuilles 2 scores
function printSimpleScoreSheets(dayNumber) {
    const dayData = championship.days[dayNumber];
    if (!dayData) {
        showNotification('Aucune donnée pour cette journée', 'warning');
        return;
    }

    const numDivisions = championship.config?.numberOfDivisions || 3;
    let allMatches = [];
    let matchCounter = 1;

    // Collecter tous les matchs
    for (let division = 1; division <= numDivisions; division++) {
        // Matchs de poules si activés
        if (dayData.pools?.enabled && dayData.pools.divisions?.[division]?.matches) {
            const poolMatches = dayData.pools.divisions[division].matches;
            poolMatches.forEach(match => {
                if (match.player1 && match.player2 && match.player1 !== 'BYE' && match.player2 !== 'BYE') {
                    allMatches.push({
                        ...match,
                        division,
                        matchId: matchCounter++,
                        type: 'Poule',
                        poolName: match.poolName || `Poule ${match.poolIndex + 1}`
                    });
                }
            });
        }

        // Matchs classiques
        const matches = dayData.matches[division] || [];
        matches.forEach(match => {
            if (match.player1 && match.player2 && match.player1 !== 'BYE' && match.player2 !== 'BYE') {
                allMatches.push({
                    ...match,
                    division,
                    matchId: matchCounter++,
                    type: 'Match',
                    tour: match.tour || 1
                });
            }
        });

        // Phase finale si activée (ancien système)
        if (dayData.pools?.divisions?.[division]?.finalPhase) {
            const finalMatches = dayData.pools.divisions[division].finalPhase;
            finalMatches.forEach(match => {
                if (match.player1 && match.player2 && match.player1 !== 'BYE' && match.player2 !== 'BYE') {
                    allMatches.push({
                        ...match,
                        division,
                        matchId: matchCounter++,
                        type: 'Finale',
                        tour: match.round || 1
                    });
                }
            });
        }

        // Phase finale MANUELLE si activée (nouveau système)
        if (dayData.pools?.manualFinalPhase?.divisions?.[division]?.rounds) {
            const rounds = dayData.pools.manualFinalPhase.divisions[division].rounds;
            Object.entries(rounds).forEach(([roundName, round]) => {
                if (round.matches) {
                    round.matches.forEach(match => {
                        if (match.player1 && match.player2 && match.player1 !== 'BYE' && match.player2 !== 'BYE' && !match.isBye) {
                            allMatches.push({
                                ...match,
                                division,
                                matchId: matchCounter++,
                                type: roundName,
                                tour: roundName
                            });
                        }
                    });
                }
            });
        }
    }

    if (allMatches.length === 0) {
        showNotification('Aucun match à imprimer', 'warning');
        return;
    }

    // Grouper par pages de 5
    const matchPages = [];
    for (let i = 0; i < allMatches.length; i += 5) {
        matchPages.push(allMatches.slice(i, i + 5));
    }

    const printHTML = generateSimpleScoreSheetHTML(dayNumber, matchPages);
    openPrintWindow(printHTML, `Feuilles_2scores_J${dayNumber}`);
    showNotification(`📝 ${allMatches.length} feuilles 2 scores générées !`, 'success');
}

// Générer le HTML complet pour les feuilles 2 scores
function generateSimpleScoreSheetHTML(dayNumber, matchPages) {
    let htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Feuilles 2 Scores - Journée ${dayNumber}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: Arial, sans-serif; }

                @page { size: A4; margin: 5mm; }

                .page {
                    width: 200mm;
                    height: 287mm;
                    padding: 3mm;
                    page-break-after: always;
                    page-break-inside: avoid;
                }
                .page:last-child { page-break-after: avoid; }

                .page-title {
                    text-align: center;
                    font-size: 12px;
                    font-weight: bold;
                    color: #2c3e50;
                    padding: 2mm 0;
                    border-bottom: 2px solid #9b59b6;
                    margin-bottom: 2mm;
                    height: 8mm;
                }

                .matches-container {
                    height: 274mm;
                }

                .match-sheet {
                    border: 2px solid #9b59b6;
                    border-radius: 3px;
                    padding: 2mm 3mm;
                    height: 54mm;
                    margin-bottom: 1mm;
                    background: white;
                    overflow: hidden;
                    page-break-inside: avoid;
                }

                .match-header {
                    display: flex;
                    justify-content: space-between;
                    font-size: 10px;
                    color: #666;
                    padding-bottom: 1mm;
                    border-bottom: 1px dashed #ccc;
                    height: 6mm;
                }

                .match-id {
                    font-weight: bold;
                    color: #9b59b6;
                }

                .players-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    height: 10mm;
                }

                .player-name {
                    font-size: 12px;
                    font-weight: bold;
                    color: #2c3e50;
                    flex: 1;
                    text-align: center;
                }

                .vs-text {
                    font-size: 10px;
                    color: #9b59b6;
                    font-weight: bold;
                    padding: 0 2mm;
                }

                .score-section {
                    height: 26mm;
                    display: flex;
                    align-items: center;
                }

                .score-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 10px;
                }

                .score-table th {
                    background: #9b59b6;
                    color: white;
                    padding: 1.5mm;
                    text-align: center;
                    font-size: 9px;
                    height: 6mm;
                }

                .score-table td {
                    border: 1px solid #ddd;
                    padding: 1.5mm;
                    text-align: center;
                    height: 10mm;
                }

                .player-col {
                    text-align: left !important;
                    font-weight: bold;
                    width: 60%;
                    background: #f8f9fa;
                }

                .score-col {
                    width: 40%;
                    background: white;
                }

                .result-row {
                    display: flex;
                    gap: 3mm;
                    padding-top: 1mm;
                    border-top: 1px dashed #ccc;
                    height: 8mm;
                    align-items: center;
                }

                .result-box {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    gap: 1mm;
                }

                .result-label {
                    font-size: 8px;
                    font-weight: bold;
                    color: #666;
                    white-space: nowrap;
                }

                .result-line {
                    flex: 1;
                    border-bottom: 1px solid #333;
                    min-width: 15mm;
                }

                @media print {
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .page { page-break-inside: avoid; }
                    .match-sheet { page-break-inside: avoid; }
                }
            </style>
        </head>
        <body>
    `;

    matchPages.forEach((pageMatches, pageIndex) => {
        htmlContent += `
            <div class="page">
                <div class="page-title">📝 FEUILLES 2 SCORES - JOURNÉE ${dayNumber}</div>
                <div class="matches-container">
        `;

        pageMatches.forEach(match => {
            htmlContent += generateSimpleScoreSheet(match);
        });

        htmlContent += `
                </div>
            </div>
        `;
    });

    htmlContent += `
        </body>
        </html>
    `;

    return htmlContent;
}

// Exporter les nouvelles fonctions
window.generateMatchSheetHTML = generateMatchSheetHTML;
window.generateCompactMatchSheet = generateCompactMatchSheet;
window.generateSimpleScoreSheet = generateSimpleScoreSheet;
window.printSimpleScoreSheets = printSimpleScoreSheets;
window.generateSimpleScoreSheetHTML = generateSimpleScoreSheetHTML;

// Ouvrir la fenêtre d'impression
function openPrintWindow(htmlContent, filename) {
    const printWindow = window.open('', '_blank', 'width=1000,height=800,scrollbars=yes,resizable=yes');
    
    if (!printWindow) {
        alert('❌ Impossible d\'ouvrir la fenêtre d\'impression.\n\nVeuillez autoriser les pop-ups pour ce site.');
        return;
    }
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Attendre que le contenu soit chargé
    setTimeout(() => {
        printWindow.focus();
        
        const shouldPrint = printWindow.confirm(
            '📋 Feuilles de match générées avec succès !\n\n' +
            '🖨️ Voulez-vous ouvrir la boîte de dialogue d\'impression maintenant ?\n\n' +
            '💡 Conseil : Utilisez le format A4 Portrait pour un résultat optimal.'
        );
        
        if (shouldPrint) {
            printWindow.print();
        }
    }, 1000);
}

// Afficher le modal des options d'impression
function showPrintOptionsModal(dayNumber) {
    const dayData = championship.days[dayNumber];
    if (!dayData) {
        alert('Aucune donnée trouvée pour cette journée !');
        return;
    }

    // Détecter le mode
    const isPoolMode = dayData.pools && dayData.pools.enabled;

    // Créer le modal
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    `;

    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        border-radius: 8px;
        padding: 20px;
        max-width: 500px;
        width: 90%;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    `;

    // Déterminer le label pour le récap
    const recapLabel = isPoolMode ? 'Récap par Pool' : 'Récap par Terrain/Tour';
    const recapIcon = isPoolMode ? '🏊' : '🏟️';

    modalContent.innerHTML = `
        <h2 style="margin: 0 0 15px 0; color: #2c3e50; font-size: 20px; text-align: center;">
            🖨️ Options d'impression
        </h2>
        <p style="margin: 0 0 20px 0; color: #666; font-size: 12px; text-align: center;">
            Journée ${dayNumber}
        </p>
        <div style="display: flex; flex-direction: column; gap: 10px;">
            <button id="print-option-sheets" style="
                padding: 12px;
                background: linear-gradient(135deg, #3498db, #2980b9);
                color: white;
                border: none;
                border-radius: 5px;
                font-size: 14px;
                cursor: pointer;
                text-align: left;
                transition: transform 0.2s;
            " onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                📋 Feuilles de match avec sets (5 par page)
            </button>
            <button id="print-option-simple" style="
                padding: 12px;
                background: linear-gradient(135deg, #9b59b6, #8e44ad);
                color: white;
                border: none;
                border-radius: 5px;
                font-size: 14px;
                cursor: pointer;
                text-align: left;
                transition: transform 0.2s;
            " onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                📝 Feuilles 2 scores (5 par page)
            </button>
            <button id="print-option-boccia" style="
                padding: 12px;
                background: linear-gradient(135deg, #16a085, #1abc9c);
                color: white;
                border: none;
                border-radius: 5px;
                font-size: 14px;
                cursor: pointer;
                text-align: left;
                transition: transform 0.2s;
            " onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                🎾 Feuilles Boccia (4 par page)
            </button>
            <button id="print-option-boccia-blank" style="
                padding: 12px;
                background: linear-gradient(135deg, #8e44ad, #9b59b6);
                color: white;
                border: none;
                border-radius: 5px;
                font-size: 14px;
                cursor: pointer;
                text-align: left;
                transition: transform 0.2s;
            " onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                📄 Feuilles Boccia vierges (4 par page)
            </button>
            <button id="print-option-petanque" style="
                padding: 12px;
                background: linear-gradient(135deg, #27ae60, #2ecc71);
                color: white;
                border: none;
                border-radius: 5px;
                font-size: 14px;
                cursor: pointer;
                text-align: left;
                transition: transform 0.2s;
            " onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                🎯 Feuilles Pétanque (4 par page)
            </button>
            <button id="print-option-recap" style="
                padding: 12px;
                background: linear-gradient(135deg, #f39c12, #e67e22);
                color: white;
                border: none;
                border-radius: 5px;
                font-size: 14px;
                cursor: pointer;
                text-align: left;
                transition: transform 0.2s;
            " onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                ${recapIcon} ${recapLabel}
            </button>
        </div>
        <button id="close-modal" style="
            margin-top: 15px;
            padding: 8px 12px;
            background: #95a5a6;
            color: white;
            border: none;
            border-radius: 5px;
            font-size: 12px;
            cursor: pointer;
            width: 100%;
        ">
            Annuler
        </button>
    `;

    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    // Event listeners
    document.getElementById('print-option-sheets').onclick = () => {
        document.body.removeChild(modal);
        printMatchSheets(dayNumber);
    };

    document.getElementById('print-option-simple').onclick = () => {
        document.body.removeChild(modal);
        printSimpleScoreSheets(dayNumber);
    };

    document.getElementById('print-option-boccia').onclick = () => {
        document.body.removeChild(modal);
        printBocciaMatchSheets(dayNumber);
    };

    document.getElementById('print-option-boccia-blank').onclick = () => {
        document.body.removeChild(modal);
        printBlankBocciaSheets();
    };

    document.getElementById('print-option-petanque').onclick = () => {
        document.body.removeChild(modal);
        printPetanqueMatchSheets(dayNumber);
    };

    document.getElementById('print-option-recap').onclick = () => {
        document.body.removeChild(modal);
        printRecapSheets(dayNumber);
    };

    document.getElementById('close-modal').onclick = () => {
        document.body.removeChild(modal);
    };

    // Fermer au clic sur le fond
    modal.onclick = (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    };
}

// Fonction pour ajouter le bouton à l'interface
function addPrintMatchesButton() {
    // Trouver tous les .control-buttons dans chaque journée
    const allControlButtons = document.querySelectorAll('.control-buttons');

    allControlButtons.forEach(controlButtonsContainer => {
        // Vérifier si les boutons n'existent pas déjà
        if (controlButtonsContainer.querySelector('.print-matches-btn')) {
            return;
        }

        // Trouver le dayNumber à partir du contexte
        const dayContent = controlButtonsContainer.closest('.day-content');
        if (!dayContent) return;

        const dayNumber = parseInt(dayContent.id.replace('day-', ''));
        if (isNaN(dayNumber)) return;

        // Créer le bouton unique Imprimer
        const printButton = document.createElement('button');
        printButton.className = 'btn print-matches-btn';
        printButton.innerHTML = '🖨️ Imprimer';
        printButton.style.background = 'linear-gradient(135deg, #9b59b6, #8e44ad)';
        printButton.style.color = 'white';
        printButton.onclick = () => showPrintOptionsModal(dayNumber);
        printButton.title = 'Options d\'impression (feuilles de match, Boccia, récaps)';

        // Insérer après le bouton "Classements" s'il existe
        const rankingsButton = controlButtonsContainer.querySelector('button[onclick*="updateRankings"]');
        if (rankingsButton) {
            rankingsButton.insertAdjacentElement('afterend', printButton);
        } else {
            // Sinon l'insérer au début
            controlButtonsContainer.insertBefore(printButton, controlButtonsContainer.firstChild);
        }
    });
}

// ===============================================
// FEUILLES DE MATCH BOCCIA (4 par page A4)
// ===============================================

function printBocciaMatchSheets(dayNumber) {
    if (!dayNumber) dayNumber = championship.currentDay;

    const dayData = championship.days[dayNumber];
    if (!dayData) {
        alert('Aucune donnée trouvée pour cette journée !');
        return;
    }

    // Collecter tous les matchs division par division
    // Pour chaque division, réorganiser par tour AVANT de passer à la suivante
    let allMatches = [];
    const numDivisions = getNumberOfDivisions();

    for (let division = 1; division <= numDivisions; division++) {
        const divisionMatches = getDivisionMatches(dayData, division, dayNumber);
        // Réorganiser les matchs de cette division par tour (T1, T2, T3, T4 alternés)
        const reorganizedDivisionMatches = reorganizeMatchesByTour(divisionMatches);
        allMatches.push(...reorganizedDivisionMatches);
    }

    if (allMatches.length === 0) {
        alert('⚠️ Aucun match généré pour cette journée !');
        return;
    }

    // Grouper les matchs par pages (4 matchs par page A4)
    const matchPages = groupMatchesIntoPages(allMatches, 4);

    // Générer le HTML d'impression Boccia
    const printHTML = generateBocciaSheetHTML(dayNumber, matchPages);

    // Ouvrir dans une nouvelle fenêtre pour impression
    openPrintWindow(printHTML, `Feuilles_Boccia_J${dayNumber}`);

    showNotification(`🎾 ${allMatches.length} feuilles de match Boccia générées !`, 'success');
}

function generateBocciaSheetHTML(dayNumber, matchPages) {
    const currentDate = new Date().toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    let htmlContent = `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Feuilles Boccia - Journée ${dayNumber}</title>
            <style>
                @page {
                    size: A4 portrait;
                    margin: 10mm;
                }

                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }

                body {
                    font-family: Arial, sans-serif;
                    font-size: 8px;
                    line-height: 1.1;
                    color: #000;
                    background: white;
                }

                .page {
                    width: 210mm;
                    height: 297mm;
                    page-break-after: always;
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    grid-template-rows: 1fr 1fr;
                    gap: 5mm;
                    padding: 5mm;
                }

                .page:last-child {
                    page-break-after: avoid;
                }

                .match-card {
                    border: 2px solid #000;
                    padding: 3mm;
                    background: white;
                    display: flex;
                    flex-direction: column;
                }

                .match-header {
                    text-align: center;
                    border-bottom: 1.5px solid #000;
                    padding-bottom: 2mm;
                    margin-bottom: 2mm;
                }

                .match-title {
                    font-size: 12px;
                    font-weight: bold;
                    margin-bottom: 1mm;
                }

                .match-info {
                    font-size: 8px;
                    color: #666;
                }

                .match-id {
                    font-size: 9px;
                    font-weight: bold;
                    background: #f0f0f0;
                    padding: 1mm;
                    margin-top: 1mm;
                    border: 1px solid #999;
                }

                .players-section {
                    margin-bottom: 2mm;
                }

                .player-row {
                    display: flex;
                    align-items: center;
                    margin-bottom: 1mm;
                }

                .player-label {
                    font-weight: bold;
                    font-size: 8px;
                    width: 20mm;
                }

                .player-name-box {
                    flex: 1;
                    border: 1px solid #000;
                    padding: 1.5mm;
                    font-size: 10px;
                    font-weight: bold;
                    background: #f8f8f8;
                }

                .score-section {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                }

                .score-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 8px;
                    margin-bottom: 2mm;
                }

                .score-table th {
                    background: #000;
                    color: white;
                    padding: 1.5mm;
                    text-align: center;
                    font-size: 8px;
                    border: 1px solid #000;
                    font-weight: bold;
                }

                .score-table td {
                    padding: 2mm;
                    text-align: center;
                    border: 1px solid #000;
                    min-height: 8mm;
                }

                .manche-header {
                    background: #f0f0f0;
                    font-weight: bold;
                    font-size: 8px;
                    text-align: left;
                    padding-left: 2mm !important;
                    width: 25%;
                }

                .player-score-col {
                    background: white;
                    min-width: 10mm;
                }

                .barrage-col {
                    background: #fff9e6 !important;
                }

                .total-row th {
                    background: #c0392b;
                }

                .total-cell {
                    background: #ffe6e6;
                    font-weight: bold;
                    font-size: 9px;
                }

                .result-section {
                    margin-top: auto;
                    padding-top: 2mm;
                    border-top: 1px dashed #999;
                }

                .result-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 1mm;
                }

                .result-label {
                    font-size: 7px;
                    font-weight: bold;
                    margin-right: 2mm;
                }

                .result-line {
                    flex: 1;
                    border-bottom: 1px solid #000;
                    min-height: 4mm;
                }

                @media print {
                    body {
                        print-color-adjust: exact;
                        -webkit-print-color-adjust: exact;
                    }

                    .page {
                        page-break-inside: avoid;
                    }
                }
            </style>
        </head>
        <body>
    `;

    // Générer chaque page (4 matchs par page)
    matchPages.forEach((pageMatches, pageIndex) => {
        htmlContent += `<div class="page">`;

        // Compléter avec des cartes vides si moins de 4 matchs
        const matchesToDisplay = [...pageMatches];
        while (matchesToDisplay.length < 4) {
            matchesToDisplay.push(null);
        }

        matchesToDisplay.forEach((match, index) => {
            if (match) {
                htmlContent += generateBocciaMatchCard(match, dayNumber);
            } else {
                htmlContent += `<div class="match-card" style="border-style: dashed; opacity: 0.3;"></div>`;
            }
        });

        htmlContent += `</div>`;
    });

    htmlContent += `
        </body>
        </html>
    `;

    return htmlContent;
}

function generateBocciaMatchCard(match, dayNumber) {
    // Afficher le numéro de terrain si disponible (en gras)
    const terrainInfo = match.court ? ` • Terrain <strong>${match.court}</strong>` : '';

    return `
        <div class="match-card">
            <div class="match-header">
                <div class="match-title">🎾 FEUILLE DE MATCH BOCCIA</div>
                <div class="match-info">Journée ${dayNumber} • ${new Date().toLocaleDateString('fr-FR')}${terrainInfo}</div>
                <div class="match-id">${match.matchId} • ${match.type}${match.tour ? ` Tour ${match.tour}` : ''}</div>
            </div>

            <div class="players-section">
                <div class="player-row">
                    <div class="player-label">JOUEUR 1:</div>
                    <div class="player-name-box">${match.player1}</div>
                </div>
                <div class="player-row">
                    <div class="player-label">JOUEUR 2:</div>
                    <div class="player-name-box">${match.player2}</div>
                </div>
            </div>

            <div class="score-section">
                <table class="score-table">
                    <thead>
                        <tr>
                            <th style="width: 28%;">MANCHE</th>
                            <th style="width: 36%;">${match.player1.substring(0, 12)}</th>
                            <th style="width: 36%;">${match.player2.substring(0, 12)}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <th class="manche-header">Manche 1</th>
                            <td class="player-score-col"></td>
                            <td class="player-score-col"></td>
                        </tr>
                        <tr>
                            <th class="manche-header">Manche 2</th>
                            <td class="player-score-col"></td>
                            <td class="player-score-col"></td>
                        </tr>
                        <tr>
                            <th class="manche-header">Manche 3</th>
                            <td class="player-score-col"></td>
                            <td class="player-score-col"></td>
                        </tr>
                        <tr>
                            <th class="manche-header">Manche 4</th>
                            <td class="player-score-col"></td>
                            <td class="player-score-col"></td>
                        </tr>
                        <tr style="background: #fff9e6;">
                            <th class="manche-header" style="background: #f9e79f;">Manche en Or*</th>
                            <td class="player-score-col barrage-col"></td>
                            <td class="player-score-col barrage-col"></td>
                        </tr>
                        <tr class="total-row">
                            <th>TOTAL</th>
                            <td class="total-cell"></td>
                            <td class="total-cell"></td>
                        </tr>
                    </tbody>
                </table>
                <div style="font-size: 6px; color: #666; font-style: italic; margin-top: 1mm;">
                    * Manche en Or uniquement si nécessaire (égalité après 4 manches)
                </div>
            </div>

            <div class="result-section">
                <div class="result-row">
                    <div class="result-label">VAINQUEUR:</div>
                    <div class="result-line"></div>
                </div>
                <div class="result-row">
                    <div class="result-label">ARBITRE:</div>
                    <div class="result-line"></div>
                </div>
                <div class="result-row">
                    <div class="result-label">TERRAIN N°:</div>
                    <div class="result-line" style="max-width: 15mm;"></div>
                    <div class="result-label" style="margin-left: 3mm;">HEURE:</div>
                    <div class="result-line" style="max-width: 15mm;"></div>
                </div>
            </div>
        </div>
    `;
}

// ===============================================
// FEUILLES PÉTANQUE (4 PAR PAGE)
// ===============================================

function printPetanqueMatchSheets(dayNumber) {
    if (!dayNumber) dayNumber = championship.currentDay;

    const dayData = championship.days[dayNumber];
    if (!dayData) {
        alert('Aucune donnée trouvée pour cette journée !');
        return;
    }

    // Demander le nombre de points pour la partie
    const maxPoints = prompt('Jusqu\'à combien de points jouer ? (ex: 11, 13, 15)', '13');
    if (!maxPoints || isNaN(parseInt(maxPoints)) || parseInt(maxPoints) < 1) {
        return;
    }

    const pointsLimit = parseInt(maxPoints);

    // Collecter tous les matchs division par division
    let allMatches = [];
    const numDivisions = getNumberOfDivisions();

    for (let division = 1; division <= numDivisions; division++) {
        const divisionMatches = getDivisionMatches(dayData, division, dayNumber);
        allMatches.push(...divisionMatches);
    }

    if (allMatches.length === 0) {
        alert('⚠️ Aucun match généré pour cette journée !');
        return;
    }

    // Réorganiser les matchs : un match de chaque tour par page
    const reorganizedMatches = reorganizeMatchesForPetanque(allMatches);

    // Grouper les matchs par pages (4 matchs par page)
    const matchPages = groupMatchesIntoPages(reorganizedMatches, 4);

    // Générer le HTML d'impression Pétanque
    const printHTML = generatePetanqueSheetHTML(dayNumber, matchPages, pointsLimit);

    // Ouvrir dans une nouvelle fenêtre pour impression
    openPrintWindow(printHTML, `Feuilles_Petanque_J${dayNumber}`);

    showNotification(`🎯 ${allMatches.length} feuilles de match Pétanque générées (max ${pointsLimit} points) !`, 'success');
}

function generatePetanqueSheetHTML(dayNumber, matchPages, pointsLimit) {
    const currentDate = new Date().toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    let htmlContent = `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Feuilles Pétanque - Journée ${dayNumber}</title>
            <style>
                @page {
                    size: A4 portrait;
                    margin: 10mm;
                }

                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }

                body {
                    font-family: Arial, sans-serif;
                    font-size: 8px;
                    line-height: 1.1;
                    color: #000;
                    background: white;
                }

                .page {
                    width: 210mm;
                    height: 297mm;
                    page-break-after: always;
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    grid-template-rows: 1fr 1fr;
                    gap: 5mm;
                    padding: 5mm;
                }

                .page:last-child {
                    page-break-after: avoid;
                }

                .match-card {
                    border: 2px solid #000;
                    padding: 3mm;
                    background: white;
                    display: flex;
                    flex-direction: column;
                }

                .match-header {
                    text-align: center;
                    border-bottom: 1.5px solid #000;
                    padding-bottom: 2mm;
                    margin-bottom: 2mm;
                }

                .match-title {
                    font-size: 11px;
                    font-weight: bold;
                    margin-bottom: 1mm;
                }

                .match-info {
                    font-size: 8px;
                    color: #666;
                }

                .match-id {
                    font-size: 9px;
                    font-weight: bold;
                    background: #e8f5e9;
                    padding: 1mm;
                    margin-top: 1mm;
                    border: 1px solid #4caf50;
                }

                .players-section {
                    margin-bottom: 2mm;
                }

                .player-row {
                    display: flex;
                    align-items: center;
                    margin-bottom: 1mm;
                }

                .player-label {
                    font-weight: bold;
                    font-size: 8px;
                    width: 22mm;
                }

                .player-name-box {
                    flex: 1;
                    border: 1px solid #000;
                    padding: 1.5mm;
                    font-size: 10px;
                    font-weight: bold;
                    background: #f8f8f8;
                }

                .score-section {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                }

                .score-grid {
                    display: grid;
                    grid-template-columns: repeat(${Math.min(pointsLimit, 7)}, 1fr);
                    gap: 1px;
                    border: 1px solid #000;
                    margin-bottom: 2mm;
                }

                .score-cell {
                    aspect-ratio: 1;
                    border: 1px solid #999;
                    background: white;
                    min-height: 6mm;
                }

                .grid-label {
                    font-size: 7px;
                    font-weight: bold;
                    text-align: center;
                    margin-bottom: 1mm;
                }

                .result-section {
                    margin-top: auto;
                    padding-top: 2mm;
                    border-top: 1px dashed #999;
                }

                .result-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 1mm;
                    align-items: center;
                }

                .result-label {
                    font-size: 7px;
                    font-weight: bold;
                    margin-right: 2mm;
                }

                .result-line {
                    flex: 1;
                    border-bottom: 1px solid #000;
                    min-height: 4mm;
                }

                @media print {
                    body {
                        print-color-adjust: exact;
                        -webkit-print-color-adjust: exact;
                    }

                    .page {
                        page-break-inside: avoid;
                    }
                }
            </style>
        </head>
        <body>
    `;

    // Générer chaque page (4 matchs par page)
    matchPages.forEach((pageMatches, pageIndex) => {
        htmlContent += `<div class="page">`;

        // Compléter avec des cartes vides si moins de 4 matchs
        const matchesToDisplay = [...pageMatches];
        while (matchesToDisplay.length < 4) {
            matchesToDisplay.push(null);
        }

        matchesToDisplay.forEach((match, index) => {
            if (match) {
                htmlContent += generatePetanqueMatchCard(match, dayNumber, pointsLimit);
            } else {
                htmlContent += `<div class="match-card" style="border-style: dashed; opacity: 0.3;"></div>`;
            }
        });

        htmlContent += `</div>`;
    });

    htmlContent += `
        </body>
        </html>
    `;

    return htmlContent;
}

function generatePetanqueMatchCard(match, dayNumber, pointsLimit) {
    // Afficher le numéro de terrain si disponible
    const terrainInfo = match.court ? ` • Terrain <strong>${match.court}</strong>` : '';

    // Générer les cellules de score pour chaque joueur
    const generateScoreRow = (label) => {
        let cells = '';
        for (let i = 0; i < pointsLimit; i++) {
            cells += `<div class="score-cell"></div>`;
        }
        return cells;
    };

    return `
        <div class="match-card">
            <div class="match-header">
                <div class="match-title">🎯 FEUILLE DE MATCH PÉTANQUE</div>
                <div class="match-info">Journée ${dayNumber} • ${new Date().toLocaleDateString('fr-FR')}${terrainInfo}</div>
                <div class="match-id">${match.matchId} • ${match.type}${match.tour ? ` Tour ${match.tour}` : ''}</div>
            </div>

            <div class="players-section">
                <div class="player-row">
                    <div class="player-label">ÉQUIPE 1:</div>
                    <div class="player-name-box">${match.player1}</div>
                </div>
                <div class="player-row">
                    <div class="player-label">ÉQUIPE 2:</div>
                    <div class="player-name-box">${match.player2}</div>
                </div>
            </div>

            <div class="score-section">
                <div class="grid-label">${match.player1} (max ${pointsLimit} pts)</div>
                <div class="score-grid">
                    ${generateScoreRow(match.player1)}
                </div>

                <div class="grid-label">${match.player2} (max ${pointsLimit} pts)</div>
                <div class="score-grid">
                    ${generateScoreRow(match.player2)}
                </div>
            </div>

            <div class="result-section">
                <div class="result-row">
                    <div class="result-label">VAINQUEUR:</div>
                    <div class="result-line"></div>
                </div>
                <div class="result-row">
                    <div class="result-label">SCORE FINAL:</div>
                    <div class="result-line" style="max-width: 20mm;"></div>
                    <div class="result-label" style="margin-left: 2mm;">à</div>
                    <div class="result-line" style="max-width: 20mm;"></div>
                </div>
                <div class="result-row">
                    <div class="result-label">TERRAIN N°:</div>
                    <div class="result-line" style="max-width: 15mm;"></div>
                    <div class="result-label" style="margin-left: 3mm;">HEURE:</div>
                    <div class="result-line" style="max-width: 15mm;"></div>
                </div>
            </div>
        </div>
    `;
}

// ===============================================
// FEUILLES BOCCIA VIERGES (SANS NOMS DE JOUEURS)
// ===============================================

function printBlankBocciaSheets() {
    // Demander le nombre de feuilles à imprimer
    const numSheets = prompt('Combien de feuilles Boccia vierges voulez-vous imprimer ?', '8');
    if (!numSheets || isNaN(parseInt(numSheets)) || parseInt(numSheets) < 1) {
        return;
    }

    const count = parseInt(numSheets);
    const numPages = Math.ceil(count / 4);

    // Générer le HTML d'impression
    const printHTML = generateBlankBocciaHTML(count, numPages);

    // Ouvrir dans une nouvelle fenêtre pour impression
    openPrintWindow(printHTML, `Feuilles_Boccia_Vierges`);

    showNotification(`📄 ${count} feuilles Boccia vierges générées !`, 'success');
}

function generateBlankBocciaHTML(count, numPages) {
    const currentDate = new Date().toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    let htmlContent = `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Feuilles Boccia Vierges</title>
            <style>
                @page {
                    size: A4 portrait;
                    margin: 10mm;
                }

                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }

                body {
                    font-family: Arial, sans-serif;
                    font-size: 8px;
                    line-height: 1.1;
                    color: #000;
                    background: white;
                }

                .page {
                    width: 210mm;
                    height: 297mm;
                    page-break-after: always;
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    grid-template-rows: 1fr 1fr;
                    gap: 5mm;
                    padding: 5mm;
                }

                .page:last-child {
                    page-break-after: avoid;
                }

                .match-card {
                    border: 2px solid #000;
                    padding: 3mm;
                    background: white;
                    display: flex;
                    flex-direction: column;
                }

                .match-header {
                    text-align: center;
                    border-bottom: 1.5px solid #000;
                    padding-bottom: 2mm;
                    margin-bottom: 2mm;
                }

                .match-title {
                    font-size: 12px;
                    font-weight: bold;
                    margin-bottom: 1mm;
                }

                .match-info {
                    font-size: 8px;
                    color: #666;
                }

                .match-id {
                    font-size: 9px;
                    font-weight: bold;
                    background: #f0f0f0;
                    padding: 1mm;
                    margin-top: 1mm;
                    border: 1px solid #999;
                }

                .players-section {
                    margin-bottom: 2mm;
                }

                .player-row {
                    display: flex;
                    align-items: center;
                    margin-bottom: 1mm;
                }

                .player-label {
                    font-weight: bold;
                    font-size: 8px;
                    width: 20mm;
                }

                .player-name-box {
                    flex: 1;
                    border: 1px solid #000;
                    padding: 1.5mm;
                    font-size: 10px;
                    font-weight: bold;
                    background: white;
                    min-height: 6mm;
                }

                .score-section {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                }

                .score-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 8px;
                    margin-bottom: 2mm;
                }

                .score-table th {
                    background: #000;
                    color: white;
                    padding: 1.5mm;
                    text-align: center;
                    font-size: 8px;
                    border: 1px solid #000;
                    font-weight: bold;
                }

                .score-table td {
                    padding: 2mm;
                    text-align: center;
                    border: 1px solid #000;
                    min-height: 8mm;
                }

                .manche-header {
                    background: #f0f0f0;
                    font-weight: bold;
                    font-size: 8px;
                    text-align: left;
                    padding-left: 2mm !important;
                    width: 25%;
                }

                .player-score-col {
                    background: white;
                    min-width: 10mm;
                }

                .barrage-col {
                    background: #fff9e6 !important;
                }

                .total-row th {
                    background: #c0392b;
                }

                .total-cell {
                    background: #ffe6e6;
                    font-weight: bold;
                    font-size: 9px;
                }

                .result-section {
                    margin-top: auto;
                    padding-top: 2mm;
                    border-top: 1px dashed #999;
                }

                .result-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 1mm;
                }

                .result-label {
                    font-size: 7px;
                    font-weight: bold;
                    margin-right: 2mm;
                }

                .result-line {
                    flex: 1;
                    border-bottom: 1px solid #000;
                    min-height: 4mm;
                }

                @media print {
                    body {
                        print-color-adjust: exact;
                        -webkit-print-color-adjust: exact;
                    }

                    .page {
                        page-break-inside: avoid;
                    }
                }
            </style>
        </head>
        <body>
    `;

    // Générer les pages (4 feuilles par page)
    let sheetsGenerated = 0;
    for (let page = 0; page < numPages; page++) {
        htmlContent += `<div class="page">`;

        for (let i = 0; i < 4 && sheetsGenerated < count; i++) {
            sheetsGenerated++;
            htmlContent += generateBlankBocciaCard(sheetsGenerated, currentDate);
        }

        // Compléter avec des cartes vides si dernière page incomplète
        const remaining = 4 - (sheetsGenerated % 4 === 0 ? 4 : sheetsGenerated % 4);
        if (page === numPages - 1 && remaining < 4 && remaining > 0) {
            for (let j = 0; j < remaining; j++) {
                htmlContent += `<div class="match-card" style="border-style: dashed; opacity: 0.3;"></div>`;
            }
        }

        htmlContent += `</div>`;
    }

    htmlContent += `
        </body>
        </html>
    `;

    return htmlContent;
}

function generateBlankBocciaCard(sheetNumber, currentDate) {
    return `
        <div class="match-card">
            <div class="match-header">
                <div class="match-title">🎾 FEUILLE DE MATCH BOCCIA</div>
                <div class="match-info">${currentDate}</div>
                <div class="match-id">Feuille N° ${sheetNumber}</div>
            </div>

            <div class="players-section">
                <div class="player-row">
                    <div class="player-label">JOUEUR 1:</div>
                    <div class="player-name-box"></div>
                </div>
                <div class="player-row">
                    <div class="player-label">JOUEUR 2:</div>
                    <div class="player-name-box"></div>
                </div>
            </div>

            <div class="score-section">
                <table class="score-table">
                    <thead>
                        <tr>
                            <th style="width: 28%;">MANCHE</th>
                            <th style="width: 36%;">Joueur 1</th>
                            <th style="width: 36%;">Joueur 2</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <th class="manche-header">Manche 1</th>
                            <td class="player-score-col"></td>
                            <td class="player-score-col"></td>
                        </tr>
                        <tr>
                            <th class="manche-header">Manche 2</th>
                            <td class="player-score-col"></td>
                            <td class="player-score-col"></td>
                        </tr>
                        <tr>
                            <th class="manche-header">Manche 3</th>
                            <td class="player-score-col"></td>
                            <td class="player-score-col"></td>
                        </tr>
                        <tr>
                            <th class="manche-header">Manche 4</th>
                            <td class="player-score-col"></td>
                            <td class="player-score-col"></td>
                        </tr>
                        <tr style="background: #fff9e6;">
                            <th class="manche-header" style="background: #f9e79f;">Manche en Or*</th>
                            <td class="player-score-col barrage-col"></td>
                            <td class="player-score-col barrage-col"></td>
                        </tr>
                        <tr class="total-row">
                            <th>TOTAL</th>
                            <td class="total-cell"></td>
                            <td class="total-cell"></td>
                        </tr>
                    </tbody>
                </table>
                <div style="font-size: 6px; color: #666; font-style: italic; margin-top: 1mm;">
                    * Manche en Or uniquement si nécessaire (égalité après 4 manches)
                </div>
            </div>

            <div class="result-section">
                <div class="result-row">
                    <div class="result-label">VAINQUEUR:</div>
                    <div class="result-line"></div>
                </div>
                <div class="result-row">
                    <div class="result-label">ARBITRE:</div>
                    <div class="result-line"></div>
                </div>
                <div class="result-row">
                    <div class="result-label">TERRAIN N°:</div>
                    <div class="result-line" style="max-width: 15mm;"></div>
                    <div class="result-label" style="margin-left: 3mm;">HEURE:</div>
                    <div class="result-line" style="max-width: 15mm;"></div>
                </div>
            </div>
        </div>
    `;
}

// ===============================================
// FEUILLES RÉCAPITULATIVES PAR TERRAIN/POOL
// ===============================================

// Fonction principale : détecte le mode et appelle la bonne fonction
function printRecapSheets(dayNumber) {
    if (!dayNumber) dayNumber = championship.currentDay;

    const dayData = championship.days[dayNumber];
    if (!dayData) {
        alert('Aucune donnée trouvée pour cette journée !');
        return;
    }

    // Détecter le mode : Pool ou Terrain
    if (dayData.pools && dayData.pools.enabled) {
        // Mode Pool
        printRecapByPool(dayNumber);
    } else {
        // Mode Terrain (championnat normal)
        printRecapByCourt(dayNumber);
    }
}

// Imprimer une feuille récapitulative par terrain ou par tour
function printRecapByCourt(dayNumber) {
    const dayData = championship.days[dayNumber];
    const numCourts = getNumberOfCourts();

    // Collecter tous les matchs de toutes les divisions
    const matchesByCourt = {};
    const matchesByTour = {};
    let totalMatchesWithCourt = 0;
    let totalMatches = 0;

    // Initialiser les tableaux pour chaque terrain
    for (let court = 1; court <= numCourts; court++) {
        matchesByCourt[court] = [];
    }

    // Collecter les matchs
    const numDivisions = getNumberOfDivisions();
    for (let division = 1; division <= numDivisions; division++) {
        const divisionMatches = getDivisionMatches(dayData, division, dayNumber);

        divisionMatches.forEach(match => {
            totalMatches++;

            if (match.court) {
                matchesByCourt[match.court].push(match);
                totalMatchesWithCourt++;
            }

            // Grouper aussi par tour pour le mode sans terrains
            if (match.tour) {
                const tourKey = `Tour ${match.tour}`;
                if (!matchesByTour[tourKey]) {
                    matchesByTour[tourKey] = [];
                }
                matchesByTour[tourKey].push(match);
            }
        });
    }

    if (totalMatches === 0) {
        alert('⚠️ Aucun match généré pour cette journée !');
        return;
    }

    // Détecter si on doit générer par terrain ou par tour
    if (totalMatchesWithCourt > 0) {
        // Mode avec terrains assignés
        const printHTML = generateRecapByCourtHTML(dayNumber, matchesByCourt, numCourts, true);
        openPrintWindow(printHTML, `Recap_Terrains_J${dayNumber}`);
        showNotification(`🏟️ ${numCourts} feuilles récapitulatives par terrain générées !`, 'success');
    } else {
        // Mode sans terrains : générer par tour
        if (Object.keys(matchesByTour).length === 0) {
            alert('⚠️ Aucun match avec tour trouvé pour cette journée !');
            return;
        }

        const printHTML = generateRecapByTourHTML(dayNumber, matchesByTour);
        openPrintWindow(printHTML, `Recap_Tours_J${dayNumber}`);
        showNotification(`📋 ${Object.keys(matchesByTour).length} feuilles récapitulatives par tour générées !`, 'success');
    }
}

// Imprimer une feuille récapitulative par pool
function printRecapByPool(dayNumber) {
    const dayData = championship.days[dayNumber];

    if (!dayData.pools || !dayData.pools.enabled) {
        alert('⚠️ Le mode pool n\'est pas activé pour cette journée !');
        return;
    }

    // Collecter les matchs par pool
    const matchesByPool = {};
    let totalPools = 0;

    const numDivisions = getNumberOfDivisions();
    for (let division = 1; division <= numDivisions; division++) {
        const divisionPools = dayData.pools.divisions[division];
        if (!divisionPools || !divisionPools.matches) continue;

        divisionPools.matches.forEach(match => {
            const poolKey = `D${division}-${match.poolName}`;

            if (!matchesByPool[poolKey]) {
                matchesByPool[poolKey] = {
                    division: division,
                    poolName: match.poolName,
                    poolIndex: match.poolIndex,
                    matches: []
                };
                totalPools++;
            }

            matchesByPool[poolKey].matches.push({
                matchId: `J${dayNumber}-D${division}-P${match.poolIndex + 1}-M${matchesByPool[poolKey].matches.length + 1}`,
                division: division,
                player1: match.player1,
                player2: match.player2,
                type: 'Poule',
                poolName: match.poolName,
                dayNumber: dayNumber
            });
        });
    }

    if (totalPools === 0) {
        alert('⚠️ Aucun match de pool trouvé pour cette journée !');
        return;
    }

    // Générer le HTML d'impression
    const printHTML = generateRecapByPoolHTML(dayNumber, matchesByPool);

    // Ouvrir dans une nouvelle fenêtre pour impression
    openPrintWindow(printHTML, `Recap_Pools_J${dayNumber}`);

    showNotification(`🏊 ${totalPools} feuilles récapitulatives par pool générées !`, 'success');
}

// Générer le HTML pour les récaps par tour (sans terrains)
function generateRecapByTourHTML(dayNumber, matchesByTour) {
    const currentDate = new Date().toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    let htmlContent = `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Récap Tours - Journée ${dayNumber}</title>
            <style>
                @page {
                    size: A4 portrait;
                    margin: 15mm;
                }

                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }

                body {
                    font-family: Arial, sans-serif;
                    font-size: 14px;
                    line-height: 1.4;
                    color: #000;
                    background: white;
                }

                .page {
                    width: 210mm;
                    min-height: 297mm;
                    page-break-after: always;
                    padding: 10mm;
                }

                .page:last-child {
                    page-break-after: avoid;
                }

                .page-header {
                    text-align: center;
                    border-bottom: 3px solid #2c3e50;
                    padding-bottom: 8px;
                    margin-bottom: 15px;
                }

                .page-title {
                    font-size: 22px;
                    font-weight: bold;
                    color: #2c3e50;
                    margin-bottom: 3px;
                }

                .page-subtitle {
                    font-size: 14px;
                    color: #666;
                }

                .tour-info {
                    background: #3498db;
                    color: white;
                    padding: 8px;
                    margin-bottom: 10px;
                    font-size: 18px;
                    font-weight: bold;
                    text-align: center;
                    border-radius: 3px;
                }

                .matches-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 10px;
                }

                .matches-table th {
                    background: #34495e;
                    color: white;
                    padding: 8px 6px;
                    text-align: left;
                    font-size: 14px;
                    font-weight: bold;
                }

                .matches-table td {
                    padding: 10px 6px;
                    border-bottom: 1px solid #ddd;
                    font-size: 14px;
                }

                .matches-table tr:hover {
                    background: #f5f5f5;
                }

                .tour-separator {
                    border-top: 3px solid #2c3e50 !important;
                }

                .match-id {
                    font-weight: bold;
                    color: #2c3e50;
                    font-size: 12px;
                }

                .player-name {
                    font-weight: 600;
                }

                .score-cell {
                    width: 45px;
                    text-align: center;
                    border: 1px solid #ccc;
                    background: #f9f9f9;
                }

                @media print {
                    body {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                }
            </style>
        </head>
        <body>
    `;

    // Trier les tours (Tour 1, Tour 2, etc.)
    const sortedTours = Object.keys(matchesByTour).sort((a, b) => {
        const numA = parseInt(a.replace('Tour ', ''));
        const numB = parseInt(b.replace('Tour ', ''));
        return numA - numB;
    });

    // Générer une page par tour
    sortedTours.forEach(tourKey => {
        const matches = matchesByTour[tourKey];

        // Trier les matchs par division
        matches.sort((a, b) => {
            if (a.division !== b.division) return a.division - b.division;
            return 0;
        });

        htmlContent += `
            <div class="page">
                <div class="page-header">
                    <div class="page-title">📋 RÉCAPITULATIF ${tourKey.toUpperCase()}</div>
                    <div class="page-subtitle">Journée ${dayNumber} • ${currentDate}</div>
                </div>

                <div class="tour-info">
                    ${tourKey} • ${matches.length} match${matches.length > 1 ? 's' : ''}
                </div>

                <table class="matches-table">
                    <thead>
                        <tr>
                            <th style="width: 12%;">Match</th>
                            <th style="width: 35%;">Joueur 1</th>
                            <th style="width: 8%;">Score</th>
                            <th style="width: 8%;">Score</th>
                            <th style="width: 35%;">Joueur 2</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        let previousDivision = null;

        matches.forEach(match => {
            // Détecter le changement de division
            const separatorClass = (previousDivision !== null && previousDivision !== match.division)
                ? 'tour-separator'
                : '';

            previousDivision = match.division;

            htmlContent += `
                <tr class="${separatorClass}">
                    <td>
                        <div class="match-id">${match.matchId}</div>
                        <div style="font-size: 9px; color: #666;">Division ${match.division}</div>
                    </td>
                    <td class="player-name">${match.player1}</td>
                    <td class="score-cell"></td>
                    <td class="score-cell"></td>
                    <td class="player-name">${match.player2}</td>
                </tr>
            `;
        });

        htmlContent += `
                    </tbody>
                </table>
            </div>
        `;
    });

    htmlContent += `
        </body>
        </html>
    `;

    return htmlContent;
}

// Générer le HTML pour les récaps par terrain
function generateRecapByCourtHTML(dayNumber, matchesByCourt, numCourts, byTerrain) {
    const currentDate = new Date().toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    let htmlContent = `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Récap Terrains - Journée ${dayNumber}</title>
            <style>
                @page {
                    size: A4 portrait;
                    margin: 15mm;
                }

                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }

                body {
                    font-family: Arial, sans-serif;
                    font-size: 14px;
                    line-height: 1.4;
                    color: #000;
                    background: white;
                }

                .page {
                    width: 210mm;
                    min-height: 297mm;
                    page-break-after: always;
                    padding: 10mm;
                }

                .page:last-child {
                    page-break-after: avoid;
                }

                .page-header {
                    text-align: center;
                    border-bottom: 3px solid #2c3e50;
                    padding-bottom: 8px;
                    margin-bottom: 15px;
                }

                .page-title {
                    font-size: 22px;
                    font-weight: bold;
                    color: #2c3e50;
                    margin-bottom: 3px;
                }

                .page-subtitle {
                    font-size: 14px;
                    color: #666;
                }

                .court-info {
                    background: #16a085;
                    color: white;
                    padding: 8px;
                    margin-bottom: 10px;
                    font-size: 18px;
                    font-weight: bold;
                    text-align: center;
                    border-radius: 3px;
                }

                .matches-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 10px;
                }

                .matches-table th {
                    background: #34495e;
                    color: white;
                    padding: 8px 6px;
                    text-align: left;
                    font-size: 14px;
                    font-weight: bold;
                }

                .matches-table td {
                    padding: 10px 6px;
                    border-bottom: 1px solid #ddd;
                    font-size: 14px;
                }

                .matches-table tr:hover {
                    background: #f5f5f5;
                }

                .tour-separator {
                    border-top: 3px solid #2c3e50 !important;
                }

                .match-id {
                    font-weight: bold;
                    color: #2c3e50;
                    font-size: 12px;
                }

                .player-name {
                    font-weight: 600;
                }

                .score-cell {
                    width: 45px;
                    text-align: center;
                    border: 1px solid #ccc;
                    background: #f9f9f9;
                }

                .match-count {
                    text-align: center;
                    margin-top: 10px;
                    padding: 8px;
                    background: #ecf0f1;
                    font-weight: bold;
                    color: #2c3e50;
                }

                @media print {
                    body {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                }
            </style>
        </head>
        <body>
    `;

    // Générer une page par terrain
    for (let court = 1; court <= numCourts; court++) {
        const matches = matchesByCourt[court] || [];

        htmlContent += `
            <div class="page">
                <div class="page-header">
                    <div class="page-title">🏟️ RÉCAPITULATIF TERRAIN ${court}</div>
                    <div class="page-subtitle">Journée ${dayNumber} • ${currentDate}</div>
                </div>

                <div class="court-info">
                    TERRAIN N° ${court} • ${matches.length} match${matches.length > 1 ? 's' : ''}
                </div>

                <table class="matches-table">
                    <thead>
                        <tr>
                            <th style="width: 12%;">Match</th>
                            <th style="width: 35%;">Joueur 1</th>
                            <th style="width: 8%;">Score</th>
                            <th style="width: 8%;">Score</th>
                            <th style="width: 35%;">Joueur 2</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        if (matches.length === 0) {
            htmlContent += `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 20px; color: #999;">
                        Aucun match assigné à ce terrain
                    </td>
                </tr>
            `;
        } else {
            // Trier les matchs par division, puis par tour/pool
            matches.sort((a, b) => {
                if (a.division !== b.division) return a.division - b.division;
                if (a.tour !== b.tour) {
                    if (a.tour === null) return 1;
                    if (b.tour === null) return -1;
                    return a.tour - b.tour;
                }
                if (a.poolIndex !== b.poolIndex) {
                    if (a.poolIndex === undefined) return 1;
                    if (b.poolIndex === undefined) return -1;
                    return a.poolIndex - b.poolIndex;
                }
                return 0;
            });

            let previousTourOrPool = null;

            matches.forEach(match => {
                const matchLabel = match.type === 'Poule'
                    ? `${match.poolName}`
                    : `Tour ${match.tour}`;

                // Détecter le changement de tour ou pool
                const currentTourOrPool = match.type === 'Poule'
                    ? `${match.division}-${match.poolName}`
                    : `${match.division}-${match.tour}`;

                const separatorClass = (previousTourOrPool !== null && previousTourOrPool !== currentTourOrPool)
                    ? 'tour-separator'
                    : '';

                previousTourOrPool = currentTourOrPool;

                htmlContent += `
                    <tr class="${separatorClass}">
                        <td>
                            <div class="match-id">${match.matchId}</div>
                            <div style="font-size: 9px; color: #666;">D${match.division} - ${matchLabel}</div>
                        </td>
                        <td class="player-name">${match.player1}</td>
                        <td class="score-cell"></td>
                        <td class="score-cell"></td>
                        <td class="player-name">${match.player2}</td>
                    </tr>
                `;
            });
        }

        htmlContent += `
                    </tbody>
                </table>
            </div>
        `;
    }

    htmlContent += `
        </body>
        </html>
    `;

    return htmlContent;
}

// Générer le HTML pour les récaps par pool
function generateRecapByPoolHTML(dayNumber, matchesByPool) {
    const currentDate = new Date().toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    let htmlContent = `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Récap Pools - Journée ${dayNumber}</title>
            <style>
                @page {
                    size: A4 portrait;
                    margin: 15mm;
                }

                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }

                body {
                    font-family: Arial, sans-serif;
                    font-size: 14px;
                    line-height: 1.4;
                    color: #000;
                    background: white;
                }

                .page {
                    width: 210mm;
                    min-height: 297mm;
                    page-break-after: always;
                    padding: 10mm;
                }

                .page:last-child {
                    page-break-after: avoid;
                }

                .page-header {
                    text-align: center;
                    border-bottom: 3px solid #2c3e50;
                    padding-bottom: 8px;
                    margin-bottom: 15px;
                }

                .page-title {
                    font-size: 22px;
                    font-weight: bold;
                    color: #2c3e50;
                    margin-bottom: 3px;
                }

                .page-subtitle {
                    font-size: 14px;
                    color: #666;
                }

                .pool-info {
                    background: #3498db;
                    color: white;
                    padding: 8px;
                    margin-bottom: 10px;
                    font-size: 18px;
                    font-weight: bold;
                    text-align: center;
                    border-radius: 3px;
                }

                .matches-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 10px;
                }

                .matches-table th {
                    background: #34495e;
                    color: white;
                    padding: 8px 6px;
                    text-align: left;
                    font-size: 14px;
                    font-weight: bold;
                }

                .matches-table td {
                    padding: 10px 6px;
                    border-bottom: 1px solid #ddd;
                    font-size: 14px;
                }

                .matches-table tr:hover {
                    background: #f5f5f5;
                }

                .tour-separator {
                    border-top: 3px solid #2c3e50 !important;
                }

                .match-id {
                    font-weight: bold;
                    color: #2c3e50;
                    font-size: 12px;
                }

                .player-name {
                    font-weight: 600;
                }

                .score-cell {
                    width: 45px;
                    text-align: center;
                    border: 1px solid #ccc;
                    background: #f9f9f9;
                }

                @media print {
                    body {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                }
            </style>
        </head>
        <body>
    `;

    // Générer une page par pool
    Object.keys(matchesByPool).forEach(poolKey => {
        const poolData = matchesByPool[poolKey];
        const matches = poolData.matches;

        htmlContent += `
            <div class="page">
                <div class="page-header">
                    <div class="page-title">🏊 RÉCAPITULATIF ${poolData.poolName.toUpperCase()}</div>
                    <div class="page-subtitle">Division ${poolData.division} • Journée ${dayNumber} • ${currentDate}</div>
                </div>

                <div class="pool-info">
                    ${poolData.poolName} - Division ${poolData.division} • ${matches.length} match${matches.length > 1 ? 's' : ''}
                </div>

                <table class="matches-table">
                    <thead>
                        <tr>
                            <th style="width: 12%;">Match</th>
                            <th style="width: 35%;">Joueur 1</th>
                            <th style="width: 8%;">Score</th>
                            <th style="width: 8%;">Score</th>
                            <th style="width: 35%;">Joueur 2</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        matches.forEach(match => {
            htmlContent += `
                <tr>
                    <td>
                        <div class="match-id">${match.matchId}</div>
                    </td>
                    <td class="player-name">${match.player1}</td>
                    <td class="score-cell"></td>
                    <td class="score-cell"></td>
                    <td class="player-name">${match.player2}</td>
                </tr>
            `;
        });

        htmlContent += `
                    </tbody>
                </table>
            </div>
        `;
    });

    htmlContent += `
        </body>
        </html>
    `;

    return htmlContent;
}

// ===============================================
// EXPORT EXPLICITE VERS WINDOW - TRÈS IMPORTANT
// ===============================================
window.printMatchSheets = printMatchSheets;
window.printBocciaMatchSheets = printBocciaMatchSheets;
window.printRecapSheets = printRecapSheets;
window.printRecapByCourt = printRecapByCourt;
window.printRecapByPool = printRecapByPool;
window.generateRecapByCourtHTML = generateRecapByCourtHTML;
window.generateRecapByTourHTML = generateRecapByTourHTML;
window.generateRecapByPoolHTML = generateRecapByPoolHTML;
window.showPrintOptionsModal = showPrintOptionsModal;
window.addPrintMatchesButton = addPrintMatchesButton;
window.getDivisionMatches = getDivisionMatches;
window.groupMatchesIntoPages = groupMatchesIntoPages;
window.reorganizeMatchesByTour = reorganizeMatchesByTour;
window.generateMatchSheetHTML = generateMatchSheetHTML;
window.generateCompactMatchSheet = generateCompactMatchSheet;
window.generateBocciaSheetHTML = generateBocciaSheetHTML;
window.generateBocciaMatchCard = generateBocciaMatchCard;
window.openPrintWindow = openPrintWindow;

// Ajouter automatiquement les boutons au chargement et lors de la création de nouvelles journées
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(addPrintMatchesButton, 1000);
});

// Hook pour les nouvelles journées
const originalCreateDayContent = window.createDayContent;
if (originalCreateDayContent) {
    window.createDayContent = function(dayNumber) {
        const result = originalCreateDayContent(dayNumber);
        setTimeout(() => {
            addPrintMatchesButton();
        }, 200);
        return result;
    };
}

// Ajouter immédiatement si le DOM est déjà chargé
if (document.readyState === 'loading') {
    // DOM pas encore chargé
} else {
    // DOM déjà chargé
    setTimeout(addPrintMatchesButton, 500);
}

})(window);
