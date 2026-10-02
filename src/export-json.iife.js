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
    var formatProperName = function(name) { return typeof global.formatProperName === 'function' ? global.formatProperName(name) : (name || ''); };

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
                
                // Appliquer automatiquement la configuration détectée depuis le JSON
                autoImportWithConfig();
                
            } catch (error) {
                alert('Erreur lors de la lecture du fichier :\n' + error.message + '\n\nVérifiez que le fichier est un export valide.');
            }
        };
        
        reader.readAsText(file);
    }

    /**
     * Analyse le JSON importé pour détecter le nombre de divisions et terrains nécessaires
     */
    function analyzeImportConfig() {
        const data = global.importedChampionshipData;
        if (!data || !data.championship) return null;

        const champ = data.championship;
        
        // Détecter le nombre de divisions
        let maxDivision = 0;
        let maxCourt = 0;
        
        // Vérifier dans la config
        if (champ.config) {
            maxDivision = Math.max(maxDivision, 
                champ.config.numberOfDivisions || 
                champ.config.numDivisions || 0
            );
            maxCourt = Math.max(maxCourt,
                champ.config.numberOfCourts ||
                champ.config.numCourts || 0
            );
        }
        
        // Vérifier dans les données des journées
        if (champ.days) {
            Object.values(champ.days).forEach(day => {
                if (day.players) {
                    const divisions = Object.keys(day.players).map(Number).filter(n => !isNaN(n));
                    maxDivision = Math.max(maxDivision, ...divisions);
                }
                if (day.matches) {
                    const divisions = Object.keys(day.matches).map(Number).filter(n => !isNaN(n));
                    maxDivision = Math.max(maxDivision, ...divisions);
                }
                // Vérifier aussi les poules
                if (day.pools && day.pools.divisions) {
                    const divisions = Object.keys(day.pools.divisions).map(Number).filter(n => !isNaN(n));
                    maxDivision = Math.max(maxDivision, ...divisions);
                }
            });
        }
        
        // Détecter le nombre de terrains depuis les matchs si pas trouvé dans config
        if (maxCourt === 0 && champ.days) {
            Object.values(champ.days).forEach(day => {
                if (day.matches) {
                    Object.values(day.matches).forEach(divMatches => {
                        divMatches.forEach(match => {
                            if (match.court) {
                                maxCourt = Math.max(maxCourt, match.court);
                            }
                        });
                    });
                }
            });
        }
        
        // Valeurs par défaut si non détectées
        if (maxDivision === 0) maxDivision = 3;
        if (maxCourt === 0) maxCourt = 4;
        
        return {
            divisions: maxDivision,
            courts: maxCourt
        };
    }

    /**
     * Applique automatiquement la configuration détectée depuis le JSON importé
     * puis lance l'import sans intervention de l'utilisateur
     */
    function autoImportWithConfig() {
        const detected = analyzeImportConfig();
        const numDivisions = detected.divisions;
        const numCourts = detected.courts;

        // Injecter la config dans les données importées
        if (!global.importedChampionshipData.championship.config) {
            global.importedChampionshipData.championship.config = {};
        }
        global.importedChampionshipData.championship.config.numberOfDivisions = numDivisions;
        global.importedChampionshipData.championship.config.numDivisions = numDivisions;
        global.importedChampionshipData.championship.config.numberOfCourts = numCourts;
        global.importedChampionshipData.championship.config.numCourts = numCourts;

        // Mettre à jour les sélecteurs HTML en ajoutant l'option si elle manque
        function setSelectValue(id, value) {
            const select = document.getElementById(id);
            if (!select) return;
            const strVal = String(value);
            if (!Array.from(select.options).some(o => o.value === strVal)) {
                const opt = document.createElement('option');
                opt.value = strVal;
                opt.textContent = strVal;
                select.appendChild(opt);
            }
            select.value = strVal;
        }

        setSelectValue('divisionConfig', numDivisions);
        setSelectValue('courtConfig', numCourts);

        processImport();
    }

    /**
     * Affiche une modale pour configurer divisions et terrains avant l'import
     */
    function showImportConfigModal() {
        const config = analyzeImportConfig();
        const importDate = new Date(global.importedChampionshipData.exportDate).toLocaleString('fr-FR');
        const stats = global.importedChampionshipData.stats || calculateStatsFromData(global.importedChampionshipData.championship);
        
        // Créer la modale
        let modal = document.getElementById('importConfigModal');
        if (modal) modal.remove();
        
        modal = document.createElement('div');
        modal.id = 'importConfigModal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 10001;';
        
        modal.innerHTML = `
            <div style="background: white; padding: 25px; border-radius: 10px; max-width: 450px; width: 90%; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
                <h3 style="margin: 0 0 15px 0; color: #2c3e50; font-size: 18px;">📥 Configuration de l'import</h3>
                
                <div style="background: #f8f9fa; padding: 12px; border-radius: 8px; margin-bottom: 15px; font-size: 13px; color: #555;">
                    <div style="margin-bottom: 5px;"><strong>📅 Exporté le :</strong> ${importDate}</div>
                    <div style="margin-bottom: 5px;"><strong>🏆 Journées :</strong> ${stats.totalDays || Object.keys(global.importedChampionshipData.championship.days).length}</div>
                    <div style="margin-bottom: 5px;"><strong>👥 Joueurs :</strong> ${stats.totalPlayers || 'Non calculé'}</div>
                    <div><strong>🎯 Matchs :</strong> ${stats.totalMatches || 'Non calculé'}</div>
                </div>
                
                <p style="font-size: 13px; color: #666; margin-bottom: 15px;">
                    Configurez le nombre de divisions et de terrains avant d'importer :
                </p>
                
                <div style="display: flex; gap: 15px; margin-bottom: 20px;">
                    <div style="flex: 1;">
                        <label style="display: block; margin-bottom: 5px; font-size: 13px; font-weight: 600; color: #333;">⚙️ Divisions</label>
                        <select id="importConfigDivisions" style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 6px; font-size: 14px; cursor: pointer;">
                            <option value="1" ${config.divisions === 1 ? 'selected' : ''}>1</option>
                            <option value="2" ${config.divisions === 2 ? 'selected' : ''}>2</option>
                            <option value="3" ${config.divisions === 3 ? 'selected' : ''}>3</option>
                            <option value="4" ${config.divisions === 4 ? 'selected' : ''}>4</option>
                            <option value="5" ${config.divisions === 5 ? 'selected' : ''}>5</option>
                            <option value="6" ${config.divisions === 6 ? 'selected' : ''}>6</option>
                        </select>
                    </div>
                    <div style="flex: 1;">
                        <label style="display: block; margin-bottom: 5px; font-size: 13px; font-weight: 600; color: #333;">🎾 Terrains</label>
                        <select id="importConfigCourts" style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 6px; font-size: 14px; cursor: pointer;">
                            <option value="1" ${config.courts === 1 ? 'selected' : ''}>1</option>
                            <option value="2" ${config.courts === 2 ? 'selected' : ''}>2</option>
                            <option value="3" ${config.courts === 3 ? 'selected' : ''}>3</option>
                            <option value="4" ${config.courts === 4 ? 'selected' : ''}>4</option>
                            <option value="5" ${config.courts === 5 ? 'selected' : ''}>5</option>
                            <option value="6" ${config.courts === 6 ? 'selected' : ''}>6</option>
                            <option value="8" ${config.courts === 8 ? 'selected' : ''}>8</option>
                            <option value="10" ${config.courts === 10 ? 'selected' : ''}>10</option>
                        </select>
                    </div>
                </div>
                
                <div style="background: #fff3cd; padding: 10px; border-radius: 6px; margin-bottom: 15px; font-size: 12px; color: #856404;">
                    💡 <strong>Conseil :</strong> Ces valeurs ont été détectées automatiquement depuis le fichier. Modifiez-les si nécessaire.
                </div>
                
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button onclick="closeImportConfigModal()" style="padding: 10px 20px; border: 1px solid #ddd; background: #f5f5f5; border-radius: 6px; cursor: pointer; font-size: 13px;">
                        Annuler
                    </button>
                    <button onclick="applyImportConfig()" style="padding: 10px 20px; border: none; background: #27ae60; color: white; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600;">
                        ✅ Importer
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    window.showImportConfigModal = showImportConfigModal;

    function closeImportConfigModal() {
        const modal = document.getElementById('importConfigModal');
        if (modal) {
            modal.remove();
        }
        // Réinitialiser les données importées
        global.importedChampionshipData = null;
    }
    window.closeImportConfigModal = closeImportConfigModal;

    function applyImportConfig() {
        const divisionsSelect = document.getElementById('importConfigDivisions');
        const courtsSelect = document.getElementById('importConfigCourts');
        
        if (!divisionsSelect || !courtsSelect) return;
        
        const numDivisions = parseInt(divisionsSelect.value);
        const numCourts = parseInt(courtsSelect.value);
        
        // Mettre à jour la configuration dans les données importées
        if (!global.importedChampionshipData.championship.config) {
            global.importedChampionshipData.championship.config = {};
        }
        global.importedChampionshipData.championship.config.numberOfDivisions = numDivisions;
        global.importedChampionshipData.championship.config.numDivisions = numDivisions;
        global.importedChampionshipData.championship.config.numberOfCourts = numCourts;
        global.importedChampionshipData.championship.config.numCourts = numCourts;
        
        // Mettre à jour les sélecteurs HTML pour correspondre
        const divisionConfig = document.getElementById('divisionConfig');
        const courtConfig = document.getElementById('courtConfig');
        
        if (divisionConfig) divisionConfig.value = numDivisions;
        if (courtConfig) courtConfig.value = numCourts;
        
        // Fermer la modale de configuration
        const modal = document.getElementById('importConfigModal');
        if (modal) modal.remove();
        
        // Lancer l'import
        processImport();
    }
    window.applyImportConfig = applyImportConfig;
    window.handleChampionshipImport = handleChampionshipImport;

    /**
     * Applique la configuration des divisions et terrains après l'import
     * Version sans rechargement de page pour l'import
     */
    function applyImportConfiguration() {
        const newDivisions = championship.config?.numberOfDivisions || championship.config?.numDivisions || 3;
        const newCourts = championship.config?.numberOfCourts || championship.config?.numCourts || 4;
        
        // Mettre à jour la configuration globale
        if (typeof global.config !== 'undefined') {
            global.config.numberOfDivisions = newDivisions;
            global.config.numberOfCourts = newCourts;
        }
        
        // S'assurer que toutes les journées ont les bonnes structures
        if (championship && championship.days) {
            Object.keys(championship.days).forEach(function(dayKey) {
                const day = championship.days[dayKey];
                
                // Initialiser les structures si manquantes
                if (!day.players) day.players = {};
                if (!day.matches) day.matches = {};
                
                // Créer toutes les divisions nécessaires
                for (let i = 1; i <= newDivisions; i++) {
                    if (!day.players[i]) {
                        day.players[i] = [];
                    }
                    if (!day.matches[i]) {
                        day.matches[i] = [];
                    }
                }
                
                // Supprimer les divisions excédentaires (au-delà de newDivisions)
                Object.keys(day.players).forEach(function(divKey) {
                    const divNum = parseInt(divKey);
                    if (divNum > newDivisions) {
                        delete day.players[divKey];
                        delete day.matches[divKey];
                    }
                });
            });
        }
        
        // Mettre à jour l'affichage de l'attribution des terrains si la fonction existe
        if (typeof global.updateCourtAssignmentInfo === 'function') {
            global.updateCourtAssignmentInfo();
        }
        
        console.log(`Configuration appliquée: ${newDivisions} divisions, ${newCourts} terrains`);
    }

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

                // Mettre à jour les sélecteurs HTML avec les bons IDs (divisionConfig et courtConfig)
                if (championship.config.numDivisions || championship.config.numberOfDivisions) {
                    const value = championship.config.numDivisions || championship.config.numberOfDivisions;
                    const divisionConfig = document.getElementById('divisionConfig');
                    if (divisionConfig) divisionConfig.value = value;
                }
                if (championship.config.numCourts || championship.config.numberOfCourts) {
                    const value = championship.config.numCourts || championship.config.numberOfCourts;
                    const courtConfig = document.getElementById('courtConfig');
                    if (courtConfig) courtConfig.value = value;
                }
                
                // Mettre à jour aussi la configuration globale
                if (typeof global.config !== 'undefined') {
                    global.config.numberOfDivisions = championship.config.numberOfDivisions || championship.config.numDivisions || 3;
                    global.config.numberOfCourts = championship.config.numberOfCourts || championship.config.numCourts || 4;
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

            // Appliquer la configuration des divisions sans recharger la page
            applyImportConfiguration();
            
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
            const _divs = championship.config?.numberOfDivisions || championship.config?.numDivisions || '?';
            const _courts = championship.config?.numberOfCourts || championship.config?.numCourts || '?';
            const _days = Object.keys(championship.days || {}).length;
            showNotification(
                `✅ Import réussi — ${_days} journée${_days > 1 ? 's' : ''}, ${_divs} division${_divs > 1 ? 's' : ''}, ${_courts} terrain${_courts > 1 ? 's' : ''}`,
                'success'
            );

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
                            const allDays = data.championship.days;
                            const dayKeys = Object.keys(allDays);

                            if (dayKeys.length > 1) {
                                // Multi-journées: importer TOUTES les journées
                                // Importer la config si présente
                                if (data.championship.config) {
                                    championship.config = { ...championship.config, ...data.championship.config };
                                }

                                dayKeys.forEach(function(dk) {
                                    var importedDay = JSON.parse(JSON.stringify(allDays[dk]));
                                    var dn = parseInt(dk);

                                    // S'assurer que les structures existent
                                    if (!importedDay.players) importedDay.players = {};
                                    if (!importedDay.matches) importedDay.matches = {};
                                    if (!importedDay.dayType) importedDay.dayType = 'championship';

                                    // Initialiser les divisions
                                    for (var div = 1; div <= numDivisions; div++) {
                                        if (!importedDay.players[div] || !Array.isArray(importedDay.players[div])) {
                                            importedDay.players[div] = [];
                                        }
                                        if (!importedDay.matches[div] || !Array.isArray(importedDay.matches[div])) {
                                            importedDay.matches[div] = [];
                                        }
                                    }

                                    // Assurer que les journées existent
                                    while (Object.keys(championship.days).length < dn) {
                                        var newDayNum = Object.keys(championship.days).length + 1;
                                        if (!championship.days[newDayNum]) {
                                            championship.days[newDayNum] = { players: {}, matches: {}, dayType: 'championship' };
                                            for (var d = 1; d <= numDivisions; d++) {
                                                championship.days[newDayNum].players[d] = [];
                                                championship.days[newDayNum].matches[d] = [];
                                            }
                                        }
                                    }

                                    championship.days[dn] = importedDay;
                                    var typeLabel = importedDay.dayType === 'chrono' ? '⏱️' : '🏆';
                                    importedDays.push('J' + dn + ' ' + typeLabel + ' (' + file.name + ')');
                                    console.log('Jour ' + dn + ' importé: type=' + importedDay.dayType, importedDay.chronoData ? 'events=' + importedDay.chronoData.events.length : '');
                                });

                                processedCount++;
                                resolve();
                                return;
                            }

                            // Une seule journée
                            const days = Object.values(allDays);
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

    // ============================================
    // AJOUTER À LA SUITE : importe les journées d'un ou plusieurs fichiers
    // APRÈS celles du championnat ouvert, sans rien remplacer.
    // Cas d'usage : une « Journée 1 » faite par erreur dans un autre projet
    // devient la Journée 2 de celui-ci. Les numéros sont toujours recalculés
    // (jamais repris du fichier), donc deux fichiers « J1 » ne s'écrasent pas.
    // ============================================

    function emptyChronoData() {
        return { events: [], series: [], participants: [], nextEventId: 1, nextSerieId: 1, nextParticipantId: 1 };
    }

    /**
     * Extrait la liste des journées d'un fichier JSON, quel que soit son format
     * (export complet, days direct, ancien format players/matches, chrono brut).
     * Les journées sont rendues dans l'ordre de leur numéro d'origine.
     * @returns {{days: Object[], config: Object|null}}
     */
    function extractDaysFromImportData(data) {
        if (!data || typeof data !== 'object') return { days: [], config: null };
        var sortedValues = function(obj) {
            return Object.keys(obj).sort(function(a, b) { return Number(a) - Number(b); }).map(function(k) { return obj[k]; });
        };

        if (data.championship && data.championship.days && Object.keys(data.championship.days).length > 0) {
            return { days: sortedValues(data.championship.days), config: data.championship.config || null };
        }
        if (data.days && Object.keys(data.days).length > 0) {
            return { days: sortedValues(data.days), config: data.config || null };
        }
        if (data.players && data.matches) {
            return { days: [{ dayType: 'championship', players: data.players, matches: data.matches }], config: data.config || null };
        }
        if (data.events || data.series || data.raceData || data.participants || (data.championship && data.championship.raceData)) {
            var rd = data.raceData || (data.championship && data.championship.raceData) || data;
            return { days: [{
                dayType: 'chrono',
                players: {},
                matches: {},
                chronoData: {
                    events: rd.events || [],
                    series: rd.series || [],
                    participants: rd.participants || [],
                    nextEventId: rd.nextEventId || 1,
                    nextSerieId: rd.nextSerieId || 1,
                    nextParticipantId: rd.nextParticipantId || 1
                }
            }], config: null };
        }
        if (data.chronoData || data.dayType === 'chrono') {
            return { days: [{ dayType: 'chrono', players: {}, matches: {}, chronoData: data.chronoData || emptyChronoData() }], config: null };
        }
        var found = findPlayersInData(data);
        if (found.length > 0) {
            return { days: [{ dayType: 'championship', players: { 1: found }, matches: { 1: [] } }], config: null };
        }
        return { days: [], config: null };
    }

    function hasItems(obj) {
        if (!obj || typeof obj !== 'object') return false;
        return Object.keys(obj).some(function(k) { return Array.isArray(obj[k]) && obj[k].length > 0; });
    }

    /** Vrai si la journée ne contient rien (ni joueur, ni match, ni poule, ni épreuve/série/participant chrono). */
    function isDayEmpty(day) {
        if (!day) return true;
        if (hasItems(day.players) || hasItems(day.matches)) return false;
        var pools = day.pools && day.pools.divisions;
        if (pools && Object.keys(pools).some(function(k) {
            var d = pools[k] || {};
            return (d.pools && d.pools.length) || (d.matches && d.matches.length);
        })) return false;
        var cd = day.chronoData;
        if (cd && ((cd.events && cd.events.length) || (cd.series && cd.series.length) || (cd.participants && cd.participants.length))) return false;
        return true;
    }

    /** Plus haut numéro de division qui contient réellement des données dans la journée. */
    function highestUsedDivision(day) {
        var max = 0;
        var scan = function(obj, test) {
            if (!obj || typeof obj !== 'object') return;
            Object.keys(obj).forEach(function(k) {
                var n = parseInt(k, 10);
                if (n > max && test(obj[k])) max = n;
            });
        };
        var nonEmptyArray = function(v) { return Array.isArray(v) && v.length > 0; };
        scan(day.players, nonEmptyArray);
        scan(day.matches, nonEmptyArray);
        if (day.pools) {
            scan(day.pools.divisions, function(d) { return d && ((d.pools && d.pools.length) || (d.matches && d.matches.length)); });
        }
        return max;
    }

    /**
     * Les matchs de poule (et quelques autres objets) mémorisent le numéro de
     * leur journée : on le remplace par le nouveau numéro pour que rien ne
     * pointe vers la journée d'origine du fichier.
     */
    function renumberDayReferences(value, newDayNumber, depth) {
        if (!value || typeof value !== 'object' || depth > 12) return;
        if (Array.isArray(value)) {
            value.forEach(function(v) { renumberDayReferences(v, newDayNumber, depth + 1); });
            return;
        }
        Object.keys(value).forEach(function(k) {
            if (k === 'dayNumber' && typeof value[k] === 'number') value[k] = newDayNumber;
            else renumberDayReferences(value[k], newDayNumber, depth + 1);
        });
    }

    /**
     * Une série exportée pendant que son chrono tournait garde isRunning=true et
     * l'heure de départ d'origine : relancée telle quelle, elle afficherait des
     * heures de course. On la met en pause sur le temps figé du fichier.
     * @returns {string[]} noms des séries mises en pause
     */
    function pauseRunningSeries(chronoData) {
        var paused = [];
        if (!chronoData) return paused;
        var visit = function(serie) {
            if (serie && serie.isRunning) {
                serie.isRunning = false;
                delete serie.timerInterval;
                paused.push(serie.name || ('Série ' + serie.id));
            }
        };
        (chronoData.series || []).forEach(visit);
        (chronoData.events || []).forEach(function(evt) { (evt.series || []).forEach(visit); });
        return paused;
    }

    function normalizeName(name) {
        return String(name || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
    }

    /** Noms (joueurs Matchs + participants Courses) d'une journée, avec leur club. */
    function collectDayPeople(day) {
        var people = [];
        var add = function(p) {
            var name = typeof p === 'string' ? p : (p && p.name);
            if (name) people.push({ name: name, club: (p && typeof p === 'object' && p.club) || '' });
        };
        if (day.players) Object.keys(day.players).forEach(function(k) { (Array.isArray(day.players[k]) ? day.players[k] : []).forEach(add); });
        var cd = day.chronoData;
        if (cd) {
            (cd.participants || []).forEach(add);
            (cd.series || []).forEach(function(s) { (s.participants || []).forEach(add); });
            (cd.events || []).forEach(function(e) { (e.series || []).forEach(function(s) { (s.participants || []).forEach(add); }); });
        }
        return people;
    }

    function setDivisionCount(n) {
        championship.config = championship.config || {};
        championship.config.numberOfDivisions = n;
        championship.config.numDivisions = n;
        if (global.config) global.config.numberOfDivisions = n;
        var select = document.getElementById('divisionConfig');
        if (select) select.value = n;
    }

    function setCourtCount(n) {
        championship.config = championship.config || {};
        championship.config.numberOfCourts = n;
        championship.config.numCourts = n;
        if (global.config) global.config.numberOfCourts = n;
        var select = document.getElementById('courtConfig');
        if (select) select.value = n;
    }

    /** Toutes les journées ont un tableau joueurs/matchs (et une entrée de poules) pour chaque division. */
    function ensureDivisionStructures(numDivisions) {
        Object.keys(championship.days).forEach(function(k) {
            var day = championship.days[k];
            if (!day.players) day.players = {};
            if (!day.matches) day.matches = {};
            for (var div = 1; div <= numDivisions; div++) {
                if (!Array.isArray(day.players[div])) day.players[div] = [];
                if (!Array.isArray(day.matches[div])) day.matches[div] = [];
                if (day.pools && day.pools.divisions && !day.pools.divisions[div]) {
                    day.pools.divisions[div] = { pools: [], matches: [] };
                }
            }
        });
    }

    /**
     * Cœur (sans fichiers ni DOM d'affichage) : ajoute les journées des sources
     * données après le contenu du championnat ouvert.
     * @param {{name: string, data: Object}[]} sources fichiers déjà lus et parsés, dans l'ordre voulu
     * @returns {{added: Object[], skipped: string[], errors: string[], warnings: string[]}}
     */
    function appendDaysToChampionship(sources) {
        var report = { added: [], skipped: [], errors: [], warnings: [] };

        // Une course qui tourne vit dans raceData et son écran serait redessiné
        // par le rafraîchissement d'après import : on refuse plutôt que de risquer
        // de perdre des temps.
        var live = global.raceData && global.raceData.currentSerie;
        if (live && (live.isRunning || live.status === 'running')) {
            report.errors.push('Une course est en cours (' + (live.name || 'série') + ') : terminez-la ou mettez-la en pause avant d\'ajouter des journées.');
            return report;
        }

        // 1. Lire toutes les journées à ajouter
        var incoming = [];
        var fileConfig = null;
        (sources || []).forEach(function(src) {
            var extracted = extractDaysFromImportData(src.data);
            if (extracted.days.length === 0) {
                report.errors.push(src.name + ' : format non reconnu ou aucune journée');
                return;
            }
            if (!fileConfig && extracted.config) fileConfig = extracted.config;
            extracted.days.forEach(function(day, i) {
                var label = src.name + (extracted.days.length > 1 ? ' (journée ' + (i + 1) + ' du fichier)' : '');
                if (isDayEmpty(day)) {
                    report.skipped.push(label + ' : journée vide');
                    return;
                }
                incoming.push({ day: JSON.parse(JSON.stringify(day)), label: label });
            });
        });
        if (incoming.length === 0) return report;

        // 2. Où commencer : juste après la dernière journée qui contient des
        // données. Les journées vides en fin de liste (créées par « + » sans être
        // remplies, ou la J1 vierge d'un nouveau projet) sont réutilisées.
        var existing = Object.keys(championship.days).map(Number).sort(function(a, b) { return a - b; });
        var lastFilled = 0;
        existing.forEach(function(n) { if (!isDayEmpty(championship.days[n])) lastFilled = n; });
        var projectWasEmpty = lastFilled === 0;
        existing.forEach(function(n) {
            if (n > lastFilled) {
                delete championship.days[n];
                if (n !== 1) {
                    var content = document.getElementById('day-' + n);
                    if (content) content.remove();
                }
            }
        });

        // 3. Divisions/terrains. Projet vide : on reprend la configuration du
        // fichier. Sinon on ne réduit jamais (on cacherait des joueurs existants) :
        // on n'augmente le nombre de divisions que si une journée importée en
        // utilise davantage, et on signale une différence de terrains.
        var currentDivisions = getNumberOfDivisions();
        var currentCourts = (championship.config && (championship.config.numberOfCourts || championship.config.numCourts)) ||
            (global.config && global.config.numberOfCourts) || 4;
        var fileDivisions = fileConfig && (fileConfig.numberOfDivisions || fileConfig.numDivisions);
        var fileCourts = fileConfig && (fileConfig.numberOfCourts || fileConfig.numCourts);
        var neededDivisions = projectWasEmpty && fileDivisions ? fileDivisions : currentDivisions;
        incoming.forEach(function(item) { neededDivisions = Math.max(neededDivisions, highestUsedDivision(item.day)); });
        if (neededDivisions !== currentDivisions) {
            setDivisionCount(neededDivisions);
            if (!projectWasEmpty) {
                report.warnings.push('Nombre de divisions passé de ' + currentDivisions + ' à ' + neededDivisions +
                    ' (une journée importée utilise la division ' + neededDivisions + ').');
            }
        }
        if (fileCourts && fileCourts !== currentCourts) {
            if (projectWasEmpty) {
                setCourtCount(fileCourts);
            } else {
                report.warnings.push('Le fichier utilisait ' + fileCourts + ' terrain(s), ce championnat en a ' + currentCourts +
                    ' : la configuration actuelle est conservée (à ajuster si besoin).');
            }
        }

        // Noms déjà connus, pour repérer les variantes d'écriture qui couperaient
        // un joueur en deux lignes dans les classements généraux (comparaison exacte).
        var knownNames = {};
        Object.keys(championship.days).forEach(function(k) {
            collectDayPeople(championship.days[k]).forEach(function(p) { knownNames[normalizeName(p.name)] = p.name; });
        });
        var nameVariants = {};
        var clubs = {};

        // 4. Ajouter les journées une à une, numérotées à la suite
        var nextNumber = lastFilled + 1;
        incoming.forEach(function(item) {
            var day = item.day;
            var dayNumber = nextNumber++;

            if (day.dayType !== 'chrono') day.dayType = 'championship';
            if (!day.players) day.players = {};
            if (!day.matches) day.matches = {};
            if (!day.chronoData) day.chronoData = emptyChronoData();

            renumberDayReferences(day, dayNumber, 0);
            var paused = pauseRunningSeries(day.chronoData);
            if (paused.length) {
                report.warnings.push('J' + dayNumber + ' : série(s) exportée(s) chrono en marche, mises en pause : ' + paused.join(', ') + '. Vérifiez leurs temps.');
            }

            // Le cache du moteur de course est rangé par numéro de journée : une
            // ancienne entrée pour ce numéro (journée supprimée puis recréée)
            // ressortirait au prochain « ▶️ Course » avec d'autres nageurs.
            if (typeof global.purgeRaceCacheForDay === 'function') global.purgeRaceCacheForDay(dayNumber);

            championship.days[dayNumber] = day;
            if (typeof global.initializePoolSystem === 'function') global.initializePoolSystem(dayNumber);

            collectDayPeople(day).forEach(function(p) {
                var key = normalizeName(p.name);
                if (knownNames[key] && knownNames[key] !== p.name) nameVariants[p.name] = knownNames[key];
                if (p.club) clubs[p.club] = true;
            });

            report.added.push({ dayNumber: dayNumber, dayType: day.dayType, label: item.label });
        });

        ensureDivisionStructures(getNumberOfDivisions());

        if (global.clubsModule && typeof global.clubsModule.addClub === 'function') {
            Object.keys(clubs).forEach(function(c) { global.clubsModule.addClub(c); });
        }

        var variants = Object.keys(nameVariants);
        if (variants.length) {
            report.warnings.push(variants.length + ' nom(s) écrit(s) différemment d\'un nom déjà présent (' +
                variants.slice(0, 5).map(function(v) { return '« ' + v + ' » / « ' + nameVariants[v] + ' »'; }).join(', ') +
                (variants.length > 5 ? '…' : '') + ') : ils compteraient comme deux personnes dans les classements. ' +
                'Utilisez la vérification des noms du classement général pour les fusionner.');
        }

        // Une journée Courses ajoutée fait apparaître l'onglet Multisport : les
        // points d'une journée Matchs et ceux d'une journée Courses s'additionnent
        // par nom dans ce classement combiné.
        var types = {};
        Object.keys(championship.days).forEach(function(k) { types[championship.days[k].dayType || 'championship'] = true; });
        if (types.chrono && types.championship && report.added.length) {
            report.warnings.push('Le championnat mélange journées Matchs et Courses : le classement combiné (onglet 🏅 Multisport) additionne les points par nom.');
        }

        return report;
    }
    window.extractDaysFromImportData = extractDaysFromImportData;
    window.appendDaysToChampionship = appendDaysToChampionship;

    /**
     * Bouton « ➕ Ajouter à la suite » : lit les fichiers choisis (triés par nom),
     * ajoute leurs journées après celles du championnat ouvert, puis rafraîchit l'UI.
     */
    function appendDaysFromFiles(event) {
        var input = event.target;
        var files = Array.from(input.files || []);
        if (files.length === 0) return;
        files.sort(function(a, b) { return a.name.localeCompare(b.name, undefined, { numeric: true }); });

        var readFile = function(file) {
            return new Promise(function(resolve) {
                var reader = new FileReader();
                reader.onload = function(e) {
                    try {
                        resolve({ name: file.name, data: JSON.parse(e.target.result) });
                    } catch (err) {
                        resolve({ name: file.name, error: err.message });
                    }
                };
                reader.onerror = function() { resolve({ name: file.name, error: 'lecture impossible' }); };
                reader.readAsText(file);
            });
        };

        return Promise.all(files.map(readFile)).then(function(results) {
            input.value = '';
            var parseErrors = results.filter(function(r) { return r.error; }).map(function(r) { return r.name + ' : ' + r.error; });
            var sources = results.filter(function(r) { return !r.error; });

            saveToLocalStorage();
            var report = appendDaysToChampionship(sources);
            report.errors = parseErrors.concat(report.errors);

            if (report.added.length === 0) {
                alert('Aucune journée ajoutée.' +
                    (report.errors.length ? '\n\nErreurs :\n' + report.errors.join('\n') : '') +
                    (report.skipped.length ? '\n\nIgnoré :\n' + report.skipped.join('\n') : ''));
                return report;
            }

            updateTabsDisplay();
            updateDaySelectors();
            initializeAllDaysContent();
            Object.keys(championship.days).forEach(function(k) {
                if (typeof global.updateDayTypeUI === 'function') global.updateDayTypeUI(parseInt(k, 10));
            });
            if (typeof global.initializeDayTypeSelectorForDay1 === 'function') global.initializeDayTypeSelectorForDay1();
            if (typeof global.updateMultisportTabVisibility === 'function') global.updateMultisportTabVisibility();
            if (typeof global.updateCourtAssignmentInfo === 'function') global.updateCourtAssignmentInfo();
            saveToLocalStorage();
            closeImportModal();

            var first = report.added[0].dayNumber;
            switchTab(first);

            var msg = report.added.length + ' journée(s) ajoutée(s) :\n' + report.added.map(function(a) {
                return 'J' + a.dayNumber + ' ' + (a.dayType === 'chrono' ? '⏱️ Courses' : '🏆 Matchs') + ' ← ' + a.label;
            }).join('\n');
            if (report.warnings.length) msg += '\n\n⚠️ À vérifier :\n- ' + report.warnings.join('\n- ');
            if (report.skipped.length) msg += '\n\nIgnoré :\n' + report.skipped.join('\n');
            if (report.errors.length) msg += '\n\nErreurs :\n' + report.errors.join('\n');
            alert(msg);
            showNotification(report.added.length + ' journée(s) ajoutée(s) à la suite', 'success');
            return report;
        });
    }
    window.appendDaysFromFiles = appendDaysFromFiles;

    function openAppendDaysPicker() {
        var input = document.getElementById('appendDaysInput');
        if (input) input.click();
    }
    window.openAppendDaysPicker = openAppendDaysPicker;

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
