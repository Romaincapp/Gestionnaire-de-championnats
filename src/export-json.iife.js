// ============================================
// MODULE EXPORT/IMPORT JSON (IIFE)
// ============================================
(function(global) {
    'use strict';

    var championship = global.championship;
    var showNotification = global.showNotification;
    var saveToLocalStorage = function() { if (typeof global.saveToLocalStorage === 'function') global.saveToLocalStorage(); };
    var getNumberOfDivisions = function() { return typeof global.getNumberOfDivisions === 'function' ? global.getNumberOfDivisions() : 3; };
    var getPlayerName = function(p) { return typeof global.getPlayerName === 'function' ? global.getPlayerName(p) : (p || ''); };
    var initializeDivisions = function(n) { return typeof global.initializeDivisions === 'function' ? global.initializeDivisions(n) : {}; };

    // EXPORT / IMPORT
    function exportChampionship() {
        // Afficher une modale pour choisir le nom du fichier
        const defaultName = `championnat_${new Date().toISOString().slice(0,10)}`;

        const modal = document.createElement('div');
        modal.id = 'exportChampionshipModal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 10000;';

        modal.innerHTML = `
            <div style="background: white; padding: 20px; border-radius: 8px; max-width: 400px; width: 90%;">
                <h3 style="margin: 0 0 15px 0; color: #2c3e50; font-size: 16px;">Exporter le championnat</h3>
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-size: 13px; color: #555;">Nom du fichier :</label>
                    <input type="text" id="exportFileName" value="${defaultName}"
                           style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px; box-sizing: border-box;">
                    <span style="font-size: 11px; color: #888;">.json</span>
                </div>
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button onclick="document.getElementById('exportChampionshipModal').remove()"
                            style="padding: 8px 15px; border: 1px solid #ddd; background: #f5f5f5; border-radius: 4px; cursor: pointer; font-size: 13px;">
                        Annuler
                    </button>
                    <button onclick="confirmExportChampionship()"
                            style="padding: 8px 15px; border: none; background: #3498db; color: white; border-radius: 4px; cursor: pointer; font-size: 13px;">
                        Exporter
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Focus sur le champ de saisie et sélectionner le texte
        const input = document.getElementById('exportFileName');
        input.focus();
        input.select();

        // Permettre l'export avec Entrée
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                confirmExportChampionship();
            }
        });
    }
    window.exportChampionship = exportChampionship;

    function confirmExportChampionship() {
        const input = document.getElementById('exportFileName');
        let fileName = input.value.trim();

        if (!fileName) {
            fileName = `championnat_${new Date().toISOString().slice(0,10)}`;
        }

        // Retirer l'extension .json si l'utilisateur l'a ajoutée
        fileName = fileName.replace(/\.json$/i, '');

        const championshipData = {
            version: "2.0",
            exportDate: new Date().toISOString(),
            championshipName: fileName,
            championship: championship,
            stats: calculateChampionshipStats()
        };

        const dataStr = JSON.stringify(championshipData, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});

        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `${fileName}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Fermer la modale
        document.getElementById('exportChampionshipModal').remove();

        showNotification('Championnat exporté avec succès !', 'success');
    }
    window.confirmExportChampionship = confirmExportChampionship;

    function calculateChampionshipStats() {
        let totalPlayers = new Set();
        let totalMatches = 0;
        let totalDays = Object.keys(championship.days).length;

        Object.values(championship.days).forEach(day => {
            Object.values(day.players).forEach(divPlayers => {
                divPlayers.forEach(player => totalPlayers.add(getPlayerName(player)));
            });

            // Compter les matchs réguliers
            Object.values(day.matches).forEach(divMatches => {
                totalMatches += divMatches.length;
            });

            // Compter les matchs de poule si présents
            if (day.pools && day.pools.enabled && day.pools.divisions) {
                Object.values(day.pools.divisions).forEach(divPool => {
                    if (divPool.matches) {
                        totalMatches += divPool.matches.length;
                    }
                    // Compter les matchs de phase finale
                    if (divPool.finalPhase) {
                        totalMatches += divPool.finalPhase.length;
                    }
                });
            }
        });

        return {
            totalPlayers: totalPlayers.size,
            totalMatches,
            totalDays,
            uniquePlayersList: Array.from(totalPlayers)
        };
    }

    function showImportModal() {
        const modal = document.getElementById('importModal');
        if (modal) {
            modal.style.display = 'block';
            const fileInput = document.getElementById('importFileInput');
            if (fileInput) fileInput.value = '';
        }
    }
    window.showImportModal = showImportModal;

    function closeImportModal() {
        const modal = document.getElementById('importModal');
        if (modal) {
            modal.style.display = 'none';
            const fileInput = document.getElementById('importFileInput');
            if (fileInput) fileInput.value = '';
            // Ne pas réinitialiser importedChampionshipData ici pour permettre à l'utilisateur de cliquer sur "Importer" plus tard
            // global.importedChampionshipData = null;
        }
    }
    window.closeImportModal = closeImportModal;

    function handleChampionshipImport(event) {
        console.log('handleChampionshipImport appelé', event);
        const file = event.target.files[0];
        console.log('Fichier sélectionné:', file);
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            console.log('Fichier lu avec succès');
            try {
                const data = JSON.parse(e.target.result);
                console.log('JSON parsé:', data);
                
                if (data.championship) {
                    global.importedChampionshipData = data;
                } else if (data.players && data.matches) {
                    global.importedChampionshipData = {
                        version: "2.0",
                        exportDate: data.timestamp || new Date().toISOString(),
                        championship: {
                            currentDay: 1,
                            days: {
                                1: {
                                    players: data.players,
                                    matches: data.matches
                                }
                            }
                        }
                    };
                } else {
                    throw new Error('Format de fichier non reconnu');
                }
                
                const importDate = new Date(global.importedChampionshipData.exportDate).toLocaleString('fr-FR');
                const stats = global.importedChampionshipData.stats || calculateStatsFromData(global.importedChampionshipData.championship);
                
                const confirmMsg = `Confirmer l'import du championnat ?\n\n` +
                                 `📅 Exporté le : ${importDate}\n` +
                                 `🏆 Journées : ${stats.totalDays || Object.keys(global.importedChampionshipData.championship.days).length}\n` +
                                 `👥 Joueurs : ${stats.totalPlayers || 'Non calculé'}\n` +
                                 `🎯 Matchs : ${stats.totalMatches || 'Non calculé'}\n\n` +
                                 `⚠️ Cette action remplacera complètement le championnat actuel`;
                
                if (confirm(confirmMsg)) {
                    processImport();
                }
                // Ne pas fermer la modale si l'utilisateur clique sur Annuler, 
                // pour lui permetre de recliquer sur "Importer"
                
            } catch (error) {
                alert('Erreur lors de la lecture du fichier :\n' + error.message + '\n\nVérifiez que le fichier est un export valide.');
            }
        };
        
        reader.readAsText(file);
    }
    window.handleChampionshipImport = handleChampionshipImport;

    function calculateStatsFromData(championshipData) {
        let totalPlayers = new Set();
        let totalMatches = 0;
        
        Object.values(championshipData.days).forEach(day => {
            Object.values(day.players).forEach(divPlayers => {
                divPlayers.forEach(player => totalPlayers.add(getPlayerName(player)));
            });
            Object.values(day.matches).forEach(divMatches => {
                totalMatches += divMatches.length;
            });
        });
        
        return {
            totalPlayers: totalPlayers.size,
            totalMatches,
            totalDays: Object.keys(championshipData.days).length
        };
    }

    function processImport() {
        if (!global.importedChampionshipData) {
            alert('Aucun fichier sélectionné');
            return;
        }

        try {
            // IMPORTANT: Ne pas remplacer la référence, mais copier les propriétés
            // dans l'objet existant pour que window.championship et tous les modules IIFE
            // voient les nouvelles données
            var importedData = global.importedChampionshipData.championship;
            Object.keys(championship).forEach(function(key) { delete championship[key]; });
            Object.assign(championship, importedData);

            if (!championship.days) {
                championship.days = {};
            }
            if (!championship.currentDay) {
                championship.currentDay = 1;
            }

            // Appliquer la configuration (numberOfDivisions, numberOfCourts)
            if (championship.config) {
                // Normaliser les noms de propriétés (anciens exports utilisaient numDivisions, nouveaux utilisent numberOfDivisions)
                if (championship.config.numberOfDivisions) {
                    championship.config.numDivisions = championship.config.numberOfDivisions;
                }
                if (championship.config.numberOfCourts) {
                    championship.config.numCourts = championship.config.numberOfCourts;
                }

                if (championship.config.numDivisions || championship.config.numberOfDivisions) {
                    const numDivSelect = document.getElementById('numDivisions');
                    const value = championship.config.numDivisions || championship.config.numberOfDivisions;
                    if (numDivSelect) numDivSelect.value = value;
                }
                if (championship.config.numCourts || championship.config.numberOfCourts) {
                    const numCourtsSelect = document.getElementById('numCourts');
                    const value = championship.config.numCourts || championship.config.numberOfCourts;
                    if (numCourtsSelect) numCourtsSelect.value = value;
                }
            }

            // Utiliser le nombre de divisions de la configuration importée (supporter les deux noms)
            const numDivisions = championship.config?.numberOfDivisions || championship.config?.numDivisions || 3;

            Object.keys(championship.days).forEach(dayNumber => {
                const day = championship.days[dayNumber];

                // Initialiser les structures si manquantes
                if (!day.players) {
                    day.players = {};
                    for (let div = 1; div <= numDivisions; div++) {
                        day.players[div] = [];
                    }
                }
                if (!day.matches) {
                    day.matches = {};
                    for (let div = 1; div <= numDivisions; div++) {
                        day.matches[div] = [];
                    }
                }

                // Vérifier que toutes les divisions existent
                for (let division = 1; division <= numDivisions; division++) {
                    if (!Array.isArray(day.players[division])) day.players[division] = [];
                    if (!Array.isArray(day.matches[division])) day.matches[division] = [];

                    // Reformater les noms de joueurs en "Nom Propre"
                    day.players[division] = day.players[division].map(name => formatProperName(name));

                    // Reformater les noms dans les matchs
                    day.matches[division].forEach(match => {
                        if (match.player1) match.player1 = formatProperName(match.player1);
                        if (match.player2) match.player2 = formatProperName(match.player2);
                        if (match.winner) match.winner = formatProperName(match.winner);
                    });
                }

                // Reformater les noms dans les poules si elles existent
                if (day.pools && day.pools.divisions) {
                    Object.keys(day.pools.divisions).forEach(div => {
                        const poolDiv = day.pools.divisions[div];

                        // Reformater les joueurs dans les poules
                        if (poolDiv.pools) {
                            poolDiv.pools = poolDiv.pools.map(pool =>
                                pool.map(name => formatProperName(name))
                            );
                        }

                        // Reformater les matchs de poules
                        if (poolDiv.matches) {
                            poolDiv.matches.forEach(match => {
                                if (match.player1) match.player1 = formatProperName(match.player1);
                                if (match.player2) match.player2 = formatProperName(match.player2);
                                if (match.winner) match.winner = formatProperName(match.winner);
                            });
                        }

                        // Reformater les phases finales
                        if (poolDiv.finalPhase) {
                            poolDiv.finalPhase.forEach(match => {
                                if (match.player1) match.player1 = formatProperName(match.player1);
                                if (match.player2) match.player2 = formatProperName(match.player2);
                                if (match.winner) match.winner = formatProperName(match.winner);
                            });
                        }
                    });
                }

                // Reformater les phases finales manuelles si elles existent
                if (day.pools && day.pools.manualFinalPhase) {
                    // Reformater les matchs
                    if (day.pools.manualFinalPhase.matches) {
                        Object.keys(day.pools.manualFinalPhase.matches).forEach(div => {
                            const matches = day.pools.manualFinalPhase.matches[div];
                            if (matches) {
                                matches.forEach(match => {
                                    if (match.player1) match.player1 = formatProperName(match.player1);
                                    if (match.player2) match.player2 = formatProperName(match.player2);
                                    if (match.winner) match.winner = formatProperName(match.winner);
                                });
                            }
                        });
                    }

                    // Reformater les joueurs qualifiés
                    if (day.pools.manualFinalPhase.divisions) {
                        Object.keys(day.pools.manualFinalPhase.divisions).forEach(div => {
                            const divData = day.pools.manualFinalPhase.divisions[div];
                            if (divData && divData.qualified) {
                                divData.qualified = divData.qualified.map(q => {
                                    if (typeof q === 'string') {
                                        return formatProperName(q);
                                    } else if (q && q.name) {
                                        q.name = formatProperName(q.name);
                                    }
                                    return q;
                                });
                            }
                        });
                    }
                }
            });

            updateTabsDisplay();
            updateDaySelectors();
            initializeAllDaysContent();

            // Toujours afficher J1 après import (peu importe le currentDay de l'export)
            switchTab(1);

            // Initialiser le sélecteur de type pour J1
            initializeDayTypeSelectorForDay1();

            // Rafraîchir l'affichage des phases finales pour toutes les journées
            Object.keys(championship.days).forEach(dayNumber => {
                const dayData = championship.days[dayNumber];
                if (dayData.pools && dayData.pools.enabled) {
                    // Rafraîchir l'affichage des poules
                    if (typeof updatePoolsDisplay === 'function') {
                        updatePoolsDisplay(parseInt(dayNumber));
                    }
                    // Rafraîchir l'affichage des phases finales si elles existent
                    if (dayData.pools.manualFinalPhase && dayData.pools.manualFinalPhase.enabled) {
                        if (typeof updateManualFinalPhaseDisplay === 'function') {
                            updateManualFinalPhaseDisplay(parseInt(dayNumber));
                        }
                    }
                    // Vérifier l'état des poules pour activer le bouton phase finale
                    if (typeof checkPoolsCompletion === 'function') {
                        checkPoolsCompletion(parseInt(dayNumber));
                    }
                }
            });

            saveToLocalStorage();

            // Réinitialiser les données importées après un import réussi
            global.importedChampionshipData = null;

            closeImportModal();
            showNotification('Championnat importé avec succès !', 'success');

            // Forcer l'affichage de J1 après toutes les opérations
            switchTab(1);

        } catch (error) {
            alert('Erreur lors de l\'import : ' + error.message);
        }
    }
    window.processImport = processImport;

    /**
     * Cherche des joueurs/participants dans n'importe quelle structure de données
     */
    function findPlayersInData(data, depth = 0) {
        if (depth > 5) return []; // Limite de récursion
        
        const players = [];
        
        if (Array.isArray(data)) {
            // C'est un tableau, chercher des objets avec 'name' ou 'nom'
            for (const item of data) {
                if (typeof item === 'string' && item.length > 0 && item.length < 100) {
                    players.push({ name: item });
                } else if (item && typeof item === 'object') {
                    if (item.name || item.nom) {
                        players.push({
                            name: item.name || item.nom,
                            club: item.club || ''
                        });
                    } else {
                        // Récursion
                        const nested = findPlayersInData(item, depth + 1);
                        players.push(...nested);
                    }
                }
            }
        } else if (data && typeof data === 'object') {
            // C'est un objet, parcourir ses propriétés
            for (const key of Object.keys(data)) {
                const value = data[key];
                if (key === 'name' || key === 'nom') {
                    if (typeof value === 'string' && value.length > 0) {
                        players.push({ name: value });
                    }
                } else if (Array.isArray(value) && value.length > 0) {
                    const nested = findPlayersInData(value, depth + 1);
                    players.push(...nested);
                }
            }
        }
        
        return players;
    }

    /**
     * Importe plusieurs fichiers JSON (un par journée)
     * Chaque fichier devient une journée séparée (J1, J2, J3...)
     */
    function importMultipleDayFiles(event) {
        const files = Array.from(event.target.files);
        if (!files || files.length === 0) return;
        
        // Trier les fichiers par nom pour un ordre cohérent
        files.sort((a, b) => a.name.localeCompare(b.name));
        
        let processedCount = 0;
        let importedDays = [];
        let errors = [];
        
        // Vider le championnat actuel pour repartir à zéro
        if (!confirm(`Vous allez importer ${files.length} fichier(s) comme journées séparées.\n\nCela créera J1, J2, J3... à partir de chaque fichier.\n\nLe championnat actuel sera remplacé. Continuer ?`)) {
            event.target.value = '';
            return;
        }
        
        // Réinitialiser le championnat (en gardant la même référence pour les autres modules)
        championship.currentDay = 1;
        championship.config = { ...config };
        championship.days = {};
        
        const numDivisions = config.numberOfDivisions || 3;
        
        // Traiter chaque fichier
        const processFile = (file, dayIndex) => {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = function(e) {
                    try {
                        const data = JSON.parse(e.target.result);
                        const dayNumber = dayIndex + 1;
                        
                        // Extraire les données de la journée avec détection automatique du format
                        let dayData = null;
                        let detectedType = 'unknown';
                        
                        // Détection format 1: Export complet championnat (avec chronoData ou days)
                        if (data.championship && data.championship.days) {
                            const days = Object.values(data.championship.days);
                            if (days.length > 0) {
                                dayData = JSON.parse(JSON.stringify(days[0]));
                                detectedType = dayData.dayType || 'championship';
                            }
                        }
                        // Détection format 2: Days direct (sans wrapper championship)
                        else if (data.days && Object.keys(data.days).length > 0) {
                            const days = Object.values(data.days);
                            dayData = JSON.parse(JSON.stringify(days[0]));
                            detectedType = dayData.dayType || 'championship';
                        }
                        // Détection format 3: Ancien format championship (players + matches direct)
                        else if (data.players && data.matches) {
                            dayData = {
                                players: data.players,
                                matches: data.matches,
                                dayType: 'championship'
                            };
                            detectedType = 'championship';
                        }
                        // Détection format 4: Chrono direct (events/series au niveau root)
                        // OU export depuis l'ancien système chrono global (raceData)
                        else if (data.events || data.series || data.raceData || data.participants || (data.championship && data.championship.raceData)) {
                            // Si c'est un export de l'ancien système chrono global
                            const raceData = data.raceData || (data.championship && data.championship.raceData) || data;
                            
                            dayData = {
                                dayType: 'chrono',
                                chronoData: {
                                    events: raceData.events || data.events || [],
                                    series: raceData.series || data.series || [],
                                    participants: raceData.participants || data.participants || [],
                                    nextEventId: raceData.nextEventId || data.nextEventId || 1,
                                    nextSerieId: raceData.nextSerieId || data.nextSerieId || 1,
                                    nextParticipantId: raceData.nextParticipantId || data.nextParticipantId || 1
                                },
                                players: {},
                                matches: {}
                            };
                            detectedType = 'chrono';
                            console.log(`Jour ${dayNumber}: Format chrono détecté (events: ${dayData.chronoData.events.length}, series: ${dayData.chronoData.series.length})`);
                        }
                        // Détection format 5: Chrono avec chronoData imbriqué
                        else if (data.chronoData || data.dayType === 'chrono') {
                            dayData = {
                                dayType: 'chrono',
                                chronoData: data.chronoData || {
                                    events: [],
                                    series: [],
                                    participants: [],
                                    nextEventId: 1,
                                    nextSerieId: 1,
                                    nextParticipantId: 1
                                },
                                players: {},
                                matches: {}
                            };
                            detectedType = 'chrono';
                        }
                        
                        if (!dayData) {
                            // Dernier essai: chercher n'importe quelle structure avec des données
                            if (Object.keys(data).length > 0) {
                                // Essayer de trouver des joueurs/participants n'importe où
                                const foundPlayers = findPlayersInData(data);
                                if (foundPlayers.length > 0) {
                                    dayData = {
                                        dayType: 'championship',
                                        players: { 1: foundPlayers },
                                        matches: { 1: [] }
                                    };
                                    detectedType = 'championship (auto-detect)';
                                }
                            }
                        }
                        
                        if (!dayData) {
                            errors.push(`${file.name}: Format non reconnu (types trouvés: ${Object.keys(data).join(', ')})`);
                            resolve();
                            return;
                        }
                        
                        // S'assurer que les structures existent et sont complètes
                        if (!dayData.players) dayData.players = {};
                        if (!dayData.matches) dayData.matches = {};
                        if (!dayData.dayType) dayData.dayType = 'championship';
                        
                        // Pour le mode chrono, s'assurer que chronoData existe
                        if (dayData.dayType === 'chrono' && !dayData.chronoData) {
                            dayData.chronoData = {
                                events: [],
                                series: [],
                                participants: [],
                                nextEventId: 1,
                                nextSerieId: 1,
                                nextParticipantId: 1
                            };
                        }
                        
                        // Initialiser TOUTES les divisions (même si players/matches existe mais est vide)
                        for (let div = 1; div <= numDivisions; div++) {
                            if (!dayData.players[div] || !Array.isArray(dayData.players[div])) {
                                dayData.players[div] = [];
                            }
                            if (!dayData.matches[div] || !Array.isArray(dayData.matches[div])) {
                                dayData.matches[div] = [];
                            }
                        }
                        
                        console.log(`Jour ${dayNumber} importé: type=${dayData.dayType}, chronoData=`, dayData.chronoData);
                        
                        // Ajouter au championnat
                        championship.days[dayNumber] = dayData;
                        const typeLabel = detectedType === 'chrono' ? '⏱️' : '🏆';
                        importedDays.push(`J${dayNumber} ${typeLabel} (${file.name})`);
                        processedCount++;
                        
                    } catch (error) {
                        errors.push(`${file.name}: ${error.message}`);
                    }
                    resolve();
                };
                reader.readAsText(file);
            });
        };
        
        // Traiter tous les fichiers en séquence
        Promise.all(files.map((file, index) => processFile(file, index)))
            .then(() => {
                if (processedCount > 0) {
                    // Mettre à jour l'interface
                    updateTabsDisplay();
                    updateDaySelectors();
                    initializeAllDaysContent();
                    
                    // IMPORTANT : Mettre à jour le type d'UI pour chaque journée importée
                    Object.keys(championship.days).forEach(dayNum => {
                        const dayData = championship.days[dayNum];
                        if (dayData && typeof updateDayTypeUI === 'function') {
                            updateDayTypeUI(parseInt(dayNum));
                        }
                    });
                    
                    switchTab(1);

                    // Initialiser le sélecteur de type pour J1
                    initializeDayTypeSelectorForDay1();

                    saveToLocalStorage();

                    // Fermer la modale d'import multi-journées
                    closeMultiDayImportModal();

                    let msg = `${processedCount} journée(s) importée(s) :\n${importedDays.join('\n')}`;
                    if (errors.length > 0) {
                        msg += `\n\nErreurs (${errors.length}):\n${errors.join('\n')}`;
                    }
                    alert(msg);
                    showNotification(`${processedCount} journée(s) importée(s) avec succès !`, 'success');

                    // Forcer l'affichage de J1 après fermeture de l'alert
                    // (au cas où des opérations DOM asynchrones auraient modifié l'état)
                    switchTab(1);
                } else {
                    alert('Aucun fichier n\'a pu être importé.\n\nErreurs:\n' + errors.join('\n'));
                }

                // Vider l'input
                event.target.value = '';
            });
    }
    window.importMultipleDayFiles = importMultipleDayFiles;

    /**
     * Affiche la modal d'import multi-fichiers
     */
    function showMultiDayImportModal() {
        // Créer la modal si elle n'existe pas
        let modal = document.getElementById('multiDayImportModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'multiDayImportModal';
            modal.innerHTML = `
                <div id="multiDayImportModalContent" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                    background: rgba(0,0,0,0.5); display: flex; justify-content: center; 
                    align-items: center; z-index: 10000;" onclick="if(event.target===this)closeMultiDayImportModal()">
                    <div style="background: white; padding: 30px; border-radius: 10px; max-width: 500px; width: 90%;">
                        <h3>📥 Importer plusieurs journées</h3>
                        <p style="color: #7f8c8d; font-size: 13px; margin: 10px 0;">
                            Sélectionnez plusieurs fichiers JSON (un par journée).<br>
                            Chaque fichier deviendra une journée (J1, J2, J3...).
                        </p>
                        <div style="margin: 20px 0; padding: 20px; background: #f8f9fa; border-radius: 8px; text-align: center;">
                            <input type="file" id="multiDayImportInput" accept=".json" multiple 
                                onchange="importMultipleDayFiles(event)"
                                style="display: none;">
                            <button onclick="document.getElementById('multiDayImportInput').click()" 
                                style="padding: 12px 24px; background: #3498db; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">
                                📁 Sélectionner les fichiers JSON
                            </button>
                            <p style="margin-top: 10px; font-size: 12px; color: #7f8c8d;">
                                Astuce : nommez vos fichiers dans l'ordre<br>
                                (01-jour1.json, 02-jour2.json, 03-jour3.json...)
                            </p>
                        </div>
                        <div style="display: flex; gap: 10px; justify-content: flex-end;">
                            <button onclick="closeMultiDayImportModal()" class="btn btn-secondary">Fermer</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        
        modal.style.display = 'block';
    }
    window.showMultiDayImportModal = showMultiDayImportModal;

    function closeMultiDayImportModal() {
        const modal = document.getElementById('multiDayImportModal');
        if (modal) modal.style.display = 'none';
    }
    window.closeMultiDayImportModal = closeMultiDayImportModal;

    function clearAllData() {
        const stats = calculateChampionshipStats();

        // Compter aussi les données du mode chrono si disponibles
        let chronoInfo = '';
        if (typeof raceData !== 'undefined' && raceData.events) {
            const chronoEvents = raceData.events.length;
            const chronoParticipants = raceData.participants.length;
            if (chronoEvents > 0 || chronoParticipants > 0) {
                chronoInfo = `\n🏃 MODE CHRONO :\n` +
                            `• ${chronoEvents} épreuve(s)\n` +
                            `• ${chronoParticipants} participant(s)\n`;
            }
        }

        const confirmMsg = `⚠️ ATTENTION ⚠️\n\n` +
                          `Cette action va SUPPRIMER DÉFINITIVEMENT :\n\n` +
                          `🏓 MODE CHAMPIONNAT :\n` +
                          `• ${stats.totalDays} journée(s)\n` +
                          `• ${stats.totalPlayers} joueur(s) unique(s)\n` +
                          `• ${stats.totalMatches} match(s)\n` +
                          `• Tous les scores et classements\n` +
                          chronoInfo +
                          `\n• Toutes les données en cache (localStorage)\n\n` +
                          `Cette action est IRRÉVERSIBLE !\n\n` +
                          `Êtes-vous vraiment sûr ?`;

        if (confirm(confirmMsg)) {
            const doubleConfirm = confirm('Dernière confirmation :\n\nSupprimer TOUT (championnat + mode chrono) ET vider le cache ?');

            if (doubleConfirm) {
                // Réinitialiser les données en mémoire du championnat
                const resetData = {
                    currentDay: 1,
                    config: { ...config },
                    days: {
                        1: {
                            players: initializeDivisions(config.numberOfDivisions),
                            matches: initializeDivisions(config.numberOfDivisions)
                        }
                    }
                };
                // Vider et réassigner window.championship pour préserver les références
                Object.keys(window.championship).forEach(key => delete window.championship[key]);
                Object.assign(window.championship, resetData);
                championship = window.championship;

                // Réinitialiser les données en mémoire du mode chrono
                if (typeof raceData !== 'undefined') {
                    raceData.events = [];
                    raceData.participants = [];
                    raceData.currentEvent = null;
                    raceData.editingEventId = null;
                    raceData.nextEventId = 1;
                    raceData.series = [];
                    raceData.currentSerie = null;
                    raceData.editingSerieId = null;
                    raceData.nextSerieId = 1;
                    raceData.nextParticipantId = 1;

                    // Réinitialiser l'affichage du mode chrono si actif
                    const chronoSection = document.getElementById('chronoModeSection');
                    if (chronoSection && chronoSection.style.display !== 'none') {
                        const eventsList = document.getElementById('eventsList');
                        const noEventsMessage = document.getElementById('noEventsMessage');
                        if (eventsList) eventsList.innerHTML = '';
                        if (noEventsMessage) noEventsMessage.style.display = 'block';

                        const participantsList = document.getElementById('participantsList');
                        if (participantsList) participantsList.innerHTML = '<p style="text-align: center; color: #7f8c8d; padding: 20px;">Aucun participant ajouté.</p>';

                        const overallChronoRanking = document.getElementById('overallChronoRanking');
                        if (overallChronoRanking) overallChronoRanking.style.display = 'none';
                    }
                }
                
                // NETTOYER COMPLÈTEMENT LE LOCALSTORAGE
                try {
                    // Supprimer la clé principale du championnat
                    localStorage.removeItem('tennisTableChampionship');

                    // Supprimer les données du mode chrono
                    localStorage.removeItem('chronoRaceData');

                    // Supprimer toutes les clés liées au tennis de table (au cas où)
                    const keysToRemove = [];
                    for (let i = 0; i < localStorage.length; i++) {
                        const key = localStorage.key(i);
                        if (key && (key.includes('tennis') || key.includes('championship') || key.includes('tournoi') || key.includes('chrono') || key.includes('race'))) {
                            keysToRemove.push(key);
                        }
                    }
                    keysToRemove.forEach(key => localStorage.removeItem(key));
                } catch (error) {
                    console.warn("⚠️ Erreur lors du nettoyage du localStorage:", error);
                }
                
                // Forcer le rechargement de l'interface
                try {
                    // Supprimer tous les onglets existants (sauf J1 et général)
                    const tabsContainer = document.getElementById('tabs');
                    if (tabsContainer) {
                        const tabsToRemove = tabsContainer.querySelectorAll('.tab:not(.general-ranking):not(.add-day-btn)');
                        tabsToRemove.forEach(tab => {
                            if (tab.dataset.day && parseInt(tab.dataset.day) > 1) {
                                tab.remove();
                            }
                        });
                    }
                    
                    // Supprimer tout le contenu des journées > 1
                    document.querySelectorAll('[id^="day-"]').forEach(dayContent => {
                        const dayId = dayContent.id.replace('day-', '');
                        if (parseInt(dayId) > 1) {
                            dayContent.remove();
                        }
                    });
                    
                } catch (error) {
                    console.warn("⚠️ Erreur lors du nettoyage de l'interface:", error);
                }
                
                // Réinitialiser complètement l'affichage
                updateTabsDisplay();
                updateDaySelectors();
                initializeDivisionsDisplay(1);
                updatePlayersDisplay(1);
                updateMatchesDisplay(1);
                updateStats(1);
                switchTab(1);
                
                // Cacher les classements
                const rankingsEl = document.getElementById('rankings-1');
                if (rankingsEl) rankingsEl.style.display = 'none';

                showNotification('Tout réinitialisé : Championnat + Mode Chrono - Cache vidé !', 'success');

                // Option pour recharger la page complètement
                setTimeout(() => {
                    if (confirm('Voulez-vous recharger la page pour une remise à zéro complète ?')) {
                        location.reload();
                    }
                }, 2000);
            }
        }
    }
    window.clearAllData = clearAllData;


})(window);
