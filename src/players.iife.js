// ============================================
// MODULE JOUEURS (IIFE)
// ============================================
(function(global) {
    'use strict';

    var championship = global.championship;
    var showNotification = global.showNotification;
    var formatProperName = global.formatProperName;
    var saveToLocalStorage = function() { if (typeof global.saveToLocalStorage === 'function') global.saveToLocalStorage(); };
    var getNumberOfDivisions = function() { return typeof global.getNumberOfDivisions === 'function' ? global.getNumberOfDivisions() : 3; };
    var getPlayerName = function(p) { return typeof global.getPlayerName === 'function' ? global.getPlayerName(p) : (p || ''); };
    var escapeForOnclick = function(s) { return typeof global.escapeForOnclick === 'function' ? global.escapeForOnclick(s) : s; };
    var initializeDivisions = function(n) { return typeof global.initializeDivisions === 'function' ? global.initializeDivisions(n) : {}; };

    // FONCTIONS DE BASE
    function addPlayer() {
        const name = formatProperName(document.getElementById('playerName').value);
        const division = parseInt(document.getElementById('playerDivision').value);
        const targetDay = 1; // Toujours ajouter à la journée 1 depuis le formulaire de J1

        if (!name || name === '') {
            showNotification('Veuillez entrer un nom de joueur', 'warning');
            return;
        }

        if (!championship.days[targetDay]) {
            const numDivisions = championship.config?.numberOfDivisions || 3;
            const players = {};
            const matches = {};
            for (let div = 1; div <= numDivisions; div++) {
                players[div] = [];
                matches[div] = [];
            }
            championship.days[targetDay] = {
                players: players,
                matches: matches
            };
        }

        if (championship.days[targetDay].players[division].includes(name)) {
            showNotification(`${name} est déjà inscrit en D${division}`, 'warning');
            return;
        }

        championship.days[targetDay].players[division].push(name);
        saveToLocalStorage();
        showNotification(`${name} ajouté à D${division}`, 'success');

        updatePlayersDisplay(targetDay);
        document.getElementById('playerName').value = '';
    }
    window.addPlayer = addPlayer;

    // Fonction pour ajouter un joueur directement depuis une journée spécifique
    function addPlayerToDay(dayNumber) {
        const name = formatProperName(document.getElementById(`playerName-${dayNumber}`).value);
        const division = parseInt(document.getElementById(`playerDivision-${dayNumber}`).value);

        if (!name || name === '') {
            showNotification('Veuillez entrer un nom de joueur', 'warning');
            return;
        }

        if (!championship.days[dayNumber]) {
            const numDivisions = championship.config?.numberOfDivisions || 3;
            const players = {};
            const matches = {};
            for (let div = 1; div <= numDivisions; div++) {
                players[div] = [];
                matches[div] = [];
            }
            championship.days[dayNumber] = {
                players: players,
                matches: matches
            };
        }

        if (championship.days[dayNumber].players[division].includes(name)) {
            showNotification(`${name} est déjà inscrit en D${division} - J${dayNumber}`, 'warning');
            return;
        }

        championship.days[dayNumber].players[division].push(name);
        saveToLocalStorage();
        showNotification(`${name} ajouté à D${division} - J${dayNumber}`, 'success');

        updatePlayersDisplay(dayNumber);
        document.getElementById(`playerName-${dayNumber}`).value = '';
    }
    window.addPlayerToDay = addPlayerToDay;

    // Fonction pour ouvrir le modal bulk depuis une journée spécifique
    function showBulkInputForDay(dayNumber) {
        const division = document.getElementById(`bulkDivision-${dayNumber}`).value;
        document.getElementById('selectedDivision').textContent = `Division ${division} - Journée ${dayNumber}`;
        document.getElementById('bulkModal').style.display = 'block';
        document.getElementById('bulkText').focus();

        document.getElementById('bulkModal').dataset.dayNumber = dayNumber;
        document.getElementById('bulkModal').dataset.division = division;
    }
    window.showBulkInputForDay = showBulkInputForDay;

    // Fonction pour gérer l'import de fichier depuis une journée spécifique
    function handleFileInputForDay(dayNumber, event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        const fileExtension = file.name.split('.').pop().toLowerCase();

        reader.onload = function(e) {
            try {
                let players = [];

                if (fileExtension === 'csv') {
                    const csvData = e.target.result;
                    const lines = csvData.split('\n').filter(line => line.trim());

                    lines.forEach(line => {
                        const parts = line.split(/[,;]/);
                        const name = formatProperName(parts[0]?.trim());
                        const division = parseInt(parts[1]?.trim()) || 1;
                        if (name) {
                            players.push({ name, division });
                        }
                    });
                } else if (['xlsx', 'xls'].includes(fileExtension)) {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

                    jsonData.forEach(row => {
                        const name = formatProperName(row[0]?.toString()?.trim());
                        const division = parseInt(row[1]) || 1;
                        if (name) {
                            players.push({ name, division });
                        }
                    });
                }

                if (players.length === 0) {
                    showNotification('Aucun joueur trouvé dans le fichier', 'warning');
                    return;
                }

                // Créer la journée si elle n'existe pas
                if (!championship.days[dayNumber]) {
                    const numDivisions = championship.config?.numberOfDivisions || 3;
                    const playersObj = {};
                    const matches = {};
                    for (let div = 1; div <= numDivisions; div++) {
                        playersObj[div] = [];
                        matches[div] = [];
                    }
                    championship.days[dayNumber] = {
                        players: playersObj,
                        matches: matches
                    };
                }

                const numDivisions = championship.config?.numberOfDivisions || 3;
                let added = 0;
                let skipped = 0;

                players.forEach(player => {
                    const div = Math.min(Math.max(player.division, 1), numDivisions);
                    if (!championship.days[dayNumber].players[div].includes(player.name)) {
                        championship.days[dayNumber].players[div].push(player.name);
                        added++;
                    } else {
                        skipped++;
                    }
                });

                saveToLocalStorage();
                updatePlayersDisplay(dayNumber);
                showNotification(`${added} joueur(s) importé(s) dans J${dayNumber}${skipped > 0 ? `, ${skipped} doublon(s) ignoré(s)` : ''}`, 'success');

            } catch (error) {
                console.error('Erreur lors de l\'import:', error);
                showNotification('Erreur lors de la lecture du fichier', 'error');
            }
        };

        if (fileExtension === 'csv') {
            reader.readAsText(file);
        } else {
            reader.readAsArrayBuffer(file);
        }

        // Réinitialiser l'input file pour permettre de réimporter le même fichier
        event.target.value = '';
    }
    window.handleFileInputForDay = handleFileInputForDay;

    // Variable globale pour stocker la journée cible du modal
    let addPlayerModalDayNumber = 1;

    // Fonction pour ouvrir le modal d'ajout de joueurs
    function showAddPlayerModal(dayNumber) {
        addPlayerModalDayNumber = dayNumber;
        const modal = document.getElementById('addPlayerModal');
        const dayLabel = document.getElementById('addPlayerDayLabel');

        dayLabel.textContent = `- Journée ${dayNumber}`;

        // Initialiser les sélecteurs de division
        const numDivisions = championship.config?.numberOfDivisions || 3;
        ['addPlayerDivision', 'modalBulkDivision'].forEach(selectId => {
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

        // Initialiser le sélecteur de clubs
        const clubSelect = document.getElementById('addPlayerClub');
        if (clubSelect && typeof clubsModule !== 'undefined' && clubsModule.generateClubOptions) {
            clubSelect.innerHTML = clubsModule.generateClubOptions();
        }
        
        // Cacher le champ de club personnalisé
        const clubCustom = document.getElementById('addPlayerClubCustom');
        if (clubCustom) {
            clubCustom.style.display = 'none';
            clubCustom.value = '';
        }

        modal.style.display = 'block';
        document.getElementById('addPlayerName').focus();
    }
    window.showAddPlayerModal = showAddPlayerModal;

    // Fermer le modal
    function closeAddPlayerModal() {
        document.getElementById('addPlayerModal').style.display = 'none';
        document.getElementById('addPlayerName').value = '';
    }
    window.closeAddPlayerModal = closeAddPlayerModal;

    // Ajouter un joueur depuis le modal
    function addPlayerFromModal() {
        const name = formatProperName(document.getElementById('addPlayerName').value);
        const division = parseInt(document.getElementById('addPlayerDivision').value);
        const dayNumber = addPlayerModalDayNumber;
        
        // Récupérer le club
        let club = '';
        const clubSelect = document.getElementById('addPlayerClub');
        const clubCustom = document.getElementById('addPlayerClubCustom');
        
        if (clubSelect) {
            if (clubSelect.value === '__custom__' && clubCustom && clubCustom.value.trim()) {
                club = clubCustom.value.trim();
                // Ajouter le nouveau club à la liste
                if (typeof clubsModule !== 'undefined' && clubsModule.addClub) {
                    clubsModule.addClub(club);
                }
            } else if (clubSelect.value && clubSelect.value !== '__custom__') {
                club = clubSelect.value;
            }
        }

        if (!name || name === '') {
            showNotification('Veuillez entrer un nom de joueur', 'warning');
            return;
        }

        if (!championship.days[dayNumber]) {
            const numDivisions = championship.config?.numberOfDivisions || 3;
            const players = {};
            const matches = {};
            for (let div = 1; div <= numDivisions; div++) {
                players[div] = [];
                matches[div] = [];
            }
            championship.days[dayNumber] = { players, matches };
        }

        // Vérifier si le joueur existe déjà (en utilisant la fonction du module clubs si disponible)
        let playerExists = false;
        if (typeof clubsModule !== 'undefined' && clubsModule.playerExists) {
            playerExists = clubsModule.playerExists(dayNumber, division, name);
        } else {
            playerExists = championship.days[dayNumber].players[division].some(p => {
                const pName = typeof p === 'object' ? p.name : p;
                return pName.toLowerCase() === name.toLowerCase();
            });
        }
        
        if (playerExists) {
            showNotification(`${name} est déjà inscrit en D${division}`, 'warning');
            return;
        }

        // Créer l'objet joueur avec club
        const playerObj = { name, club };
        championship.days[dayNumber].players[division].push(playerObj);
        
        saveToLocalStorage();
        showNotification(`${name}${club ? ' (' + club + ')' : ''} ajouté à D${division}`, 'success');
        updatePlayersDisplay(dayNumber);

        document.getElementById('addPlayerName').value = '';
        document.getElementById('addPlayerName').focus();
    }
    window.addPlayerFromModal = addPlayerFromModal;

    // Ouvrir le bulk modal depuis le modal d'ajout
    function showBulkFromModal() {
        const division = document.getElementById('modalBulkDivision').value;
        document.getElementById('selectedDivision').textContent = `Division ${division} - Journée ${addPlayerModalDayNumber}`;
        document.getElementById('bulkModal').style.display = 'block';
        document.getElementById('bulkText').focus();

        document.getElementById('bulkModal').dataset.dayNumber = addPlayerModalDayNumber;
        document.getElementById('bulkModal').dataset.division = division;
        
        // Initialiser le sélecteur de clubs
        const clubSelect = document.getElementById('bulkClubSelect');
        if (clubSelect && typeof clubsModule !== 'undefined' && clubsModule.generateClubOptions) {
            clubSelect.innerHTML = '<option value="">-- Aucun --</option>' + 
                clubsModule.generateClubOptions().replace('<option value="">-- Sélectionner un club --</option>', '');
        }
        
        // Cacher le champ personnalisé
        const clubCustom = document.getElementById('bulkClubCustom');
        if (clubCustom) {
            clubCustom.style.display = 'none';
            clubCustom.value = '';
        }
        
        // Configurer le changement de sélection
        if (clubSelect) {
            clubSelect.onchange = function() {
                if (this.value === '__custom__' && clubCustom) {
                    clubCustom.style.display = 'block';
                    clubCustom.focus();
                } else if (clubCustom) {
                    clubCustom.style.display = 'none';
                    clubCustom.value = '';
                }
            };
        }
    }
    window.showBulkFromModal = showBulkFromModal;

    // Import fichier depuis le modal
    function handleModalFileInput(event) {
        handleFileInputForDay(addPlayerModalDayNumber, event);
    }
    window.handleModalFileInput = handleModalFileInput;

    function showBulkInput() {
        const division = document.getElementById('bulkDivision').value;
        const targetDay = 1; // Toujours ajouter à la journée 1 depuis le formulaire de J1
        document.getElementById('selectedDivision').textContent = `Division ${division}`;
        document.getElementById('bulkModal').style.display = 'block';
        document.getElementById('bulkText').focus();

        document.getElementById('bulkModal').dataset.dayNumber = targetDay;
        document.getElementById('bulkModal').dataset.division = division;
        
        // Initialiser le sélecteur de clubs
        const clubSelect = document.getElementById('bulkClubSelect');
        if (clubSelect && typeof clubsModule !== 'undefined' && clubsModule.generateClubOptions) {
            clubSelect.innerHTML = '<option value="">-- Aucun --</option>' + 
                clubsModule.generateClubOptions().replace('<option value="">-- Sélectionner un club --</option>', '');
        }
        
        // Cacher le champ personnalisé
        const clubCustom = document.getElementById('bulkClubCustom');
        if (clubCustom) {
            clubCustom.style.display = 'none';
            clubCustom.value = '';
        }
        
        // Configurer le changement de sélection
        if (clubSelect) {
            clubSelect.onchange = function() {
                if (this.value === '__custom__' && clubCustom) {
                    clubCustom.style.display = 'block';
                    clubCustom.focus();
                } else if (clubCustom) {
                    clubCustom.style.display = 'none';
                    clubCustom.value = '';
                }
            };
        }
    }
    window.showBulkInput = showBulkInput;

    function closeBulkModal() {
        document.getElementById('bulkModal').style.display = 'none';
        document.getElementById('bulkText').value = '';
        
        // Réinitialiser le sélecteur de clubs
        const clubSelect = document.getElementById('bulkClubSelect');
        const clubCustom = document.getElementById('bulkClubCustom');
        if (clubSelect) clubSelect.value = '';
        if (clubCustom) {
            clubCustom.style.display = 'none';
            clubCustom.value = '';
        }
    }
    window.closeBulkModal = closeBulkModal;

    function addBulkPlayers() {
        const text = document.getElementById('bulkText').value.trim();
        const modal = document.getElementById('bulkModal');
        const dayNumber = parseInt(modal.dataset.dayNumber) || parseInt(document.getElementById('bulkTargetDay')?.value || 1);
        const division = parseInt(modal.dataset.division) || parseInt(document.getElementById('bulkDivision')?.value || 1);
        
        // Récupérer le club sélectionné
        let club = '';
        const clubSelect = document.getElementById('bulkClubSelect');
        const clubCustom = document.getElementById('bulkClubCustom');
        
        if (clubSelect) {
            if (clubSelect.value === '__custom__' && clubCustom && clubCustom.value.trim()) {
                club = clubCustom.value.trim();
                if (typeof clubsModule !== 'undefined' && clubsModule.addClub) {
                    clubsModule.addClub(club);
                }
            } else if (clubSelect.value && clubSelect.value !== '__custom__') {
                club = clubSelect.value;
            }
        }
        
        if (!text) {
            alert('Veuillez entrer au moins un nom de joueur');
            return;
        }

        const names = text.split('\n')
                         .map(name => formatProperName(name))
                         .filter(name => name.length > 0);
        
        let added = 0;
        let duplicates = [];
        
        if (!championship.days[dayNumber]) {
            const numDivisions = championship.config?.numberOfDivisions || 3;
            const players = {};
            const matches = {};
            for (let div = 1; div <= numDivisions; div++) {
                players[div] = [];
                matches[div] = [];
            }
            championship.days[dayNumber] = {
                players: players,
                matches: matches
            };
        }
        
        names.forEach(name => {
            // Vérifier si le joueur existe déjà (en comparant les noms)
            const exists = championship.days[dayNumber].players[division].some(p => {
                const pName = typeof p === 'object' ? p.name : p;
                return pName.toLowerCase() === name.toLowerCase();
            });
            
            if (!exists) {
                // Créer l'objet joueur avec club
                const playerObj = club ? { name, club } : { name, club: '' };
                championship.days[dayNumber].players[division].push(playerObj);
                added++;
            } else {
                duplicates.push(name);
            }
        });
        
        updatePlayersDisplay(dayNumber);
        updateDaySelectors();
        saveToLocalStorage();
        
        let message = `✅ ${added} joueurs${club ? ' (' + club + ')' : ''} ajoutés à la Division ${division} - Journée ${dayNumber} !`;
        if (duplicates.length > 0) {
            message += `\n\n⚠️ Joueurs déjà présents (ignorés): ${duplicates.join(', ')}`;
        }
        
        alert(message);
        closeBulkModal();
    }
    window.addBulkPlayers = addBulkPlayers;

    // Fonction pour vérifier si un joueur a au moins un match BYE
    function playerHasByeMatch(dayNumber, division, playerName) {
        const dayData = championship.days[dayNumber];
        if (!dayData) return false;

        // Helper pour vérifier si un joueur est un BYE (nom exact 'BYE' ou commence par 'BYE')
        const isByePlayer = (name) => name === 'BYE' || (typeof name === 'string' && name.startsWith('BYE'));

        // Vérifier dans les matchs classiques
        const regularMatches = dayData.matches[division] || [];
        const hasByeInRegular = regularMatches.some(match =>
            (match.player1 === playerName && isByePlayer(match.player2)) ||
            (match.player2 === playerName && isByePlayer(match.player1))
        );

        if (hasByeInRegular) return true;

        // Vérifier dans les matchs de poules
        if (dayData.pools?.enabled && dayData.pools.divisions[division]) {
            const poolMatches = dayData.pools.divisions[division].matches || [];
            const hasByeInPools = poolMatches.some(match =>
                (match.player1 === playerName && isByePlayer(match.player2)) ||
                (match.player2 === playerName && isByePlayer(match.player1))
            );

            if (hasByeInPools) return true;
        }

        // Vérifier dans la phase finale
        if (dayData.pools?.divisions[division]?.finalPhase) {
            const finalMatches = dayData.pools.divisions[division].finalPhase || [];
            const hasByeInFinal = finalMatches.some(match =>
                (match.player1 === playerName && isByePlayer(match.player2)) ||
                (match.player2 === playerName && isByePlayer(match.player1))
            );

            if (hasByeInFinal) return true;
        }

        return false;
    }
    window.playerHasByeMatch = playerHasByeMatch;

    function updatePlayersDisplay(dayNumber) {
        if (!championship.days[dayNumber]) return;

        const numDivisions = championship.config?.numberOfDivisions || 3;
        for (let division = 1; division <= numDivisions; division++) {
            const container = document.getElementById(`division${dayNumber}-${division}-players`);
            if (!container) continue;

            const players = championship.days[dayNumber].players[division];

            if (players.length === 0) {
                container.innerHTML = '<div class="empty-state">Aucun joueur</div>';
            } else {
                container.innerHTML = players.map(player => {
                    // Extraire le nom et le club
                    let playerName, playerClub;
                    if (typeof player === 'object' && player !== null) {
                        playerName = player.name || '';
                        playerClub = player.club || '';
                    } else {
                        playerName = String(player);
                        playerClub = '';
                    }
                    
                    // Échapper les caractères spéciaux pour les attributs onclick
                    const escapedPlayer = escapeForOnclick(playerName);

                    // Vérifier si le joueur a un match BYE
                    const hasBye = playerHasByeMatch(dayNumber, division, playerName);
                    const byeClass = hasBye ? ' player-has-bye' : '';
                    
                    // Afficher le club s'il existe
                    const clubBadge = playerClub ? `<span style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; font-size: 10px; padding: 2px 6px; border-radius: 10px; margin-left: 6px;">${playerClub}</span>` : '';

                    return `<div class="player-tag${byeClass}" onclick="showPlayerDetails(${dayNumber}, ${division}, '${escapedPlayer}')">
                        ${playerName}${clubBadge}
                        <div class="player-actions">
                            <button class="edit-player" onclick="event.stopPropagation(); editPlayer(${dayNumber}, ${division}, '${escapedPlayer}')" title="Modifier">✏️</button>
                            <button class="remove-player" onclick="event.stopPropagation(); removePlayer(${dayNumber}, ${division}, '${escapedPlayer}')" title="Supprimer">×</button>
                        </div>
                    </div>`;
                }).join('');
            }

            // Mettre à jour le compteur de joueurs dynamiquement
            updatePlayerCount(dayNumber, division);
        }
    }
    window.updatePlayersDisplay = updatePlayersDisplay;

    function removePlayer(dayNumber, division, playerName) {
        // Trouver le joueur pour obtenir son nom d'affichage
        let displayName = playerName;
        const players = championship.days[dayNumber].players[division];
        const playerObj = players.find(p => {
            const pName = typeof p === 'object' ? p.name : p;
            return pName.toLowerCase() === playerName.toLowerCase();
        });
        if (playerObj && typeof playerObj === 'object' && playerObj.club) {
            displayName = `${playerObj.name} (${playerObj.club})`;
        }
        
        // Demander confirmation avant suppression
        if (!confirm(`Êtes-vous sûr de vouloir supprimer ${displayName} ?`)) {
            return; // Annuler la suppression
        }

        championship.days[dayNumber].players[division] = players.filter(p => {
            const pName = typeof p === 'object' ? p.name : p;
            return pName.toLowerCase() !== playerName.toLowerCase();
        });
        championship.days[dayNumber].matches[division] = championship.days[dayNumber].matches[division].filter(match =>
            match.player1 !== playerName && match.player2 !== playerName
        );
        updatePlayersDisplay(dayNumber);
        updateMatchesDisplay(dayNumber);
        updateStats(dayNumber);
        saveToLocalStorage();
        showNotification(`${displayName} supprimé`, 'warning');
    }
    window.removePlayer = removePlayer;

    function editPlayer(dayNumber, division, oldPlayerName) {
        // Trouver le joueur dans la liste
        const players = championship.days[dayNumber].players[division];
        const playerIndex = players.findIndex(p => {
            const pName = typeof p === 'object' ? p.name : p;
            return pName.toLowerCase() === oldPlayerName.toLowerCase();
        });
        
        if (playerIndex === -1) return;
        
        const currentPlayer = players[playerIndex];
        const currentName = typeof currentPlayer === 'object' ? currentPlayer.name : currentPlayer;
        const currentClub = typeof currentPlayer === 'object' ? (currentPlayer.club || '') : '';
        
        // Utiliser un modal personnalisé au lieu de prompt pour permettre l'édition du club
        showEditPlayerModal(dayNumber, division, playerIndex, currentName, currentClub);
    }
    
    function showEditPlayerModal(dayNumber, division, playerIndex, currentName, currentClub) {
        // Supprimer le modal existant s'il y en a un
        const existingModal = document.getElementById('editPlayerModal');
        if (existingModal) existingModal.remove();
        
        var modal = document.createElement('div');
        modal.id = 'editPlayerModal';
        modal.innerHTML = 
            '<div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; ' +
            'background: rgba(0,0,0,0.5); display: flex; justify-content: center; ' +
            'align-items: center; z-index: 10000;" onclick="if(event.target===this)closeEditPlayerModal()">' +
            '<div style="background: white; padding: 30px; border-radius: 10px; max-width: 400px; width: 90%;">' +
            '<h3>✏️ Modifier le joueur</h3>' +
            '<div style="margin: 15px 0;">' +
            '<label>Nom :</label>' +
            '<input type="text" id="editPlayerNameInput" value="' + currentName + '" style="width: 100%; padding: 10px; margin-top: 5px; border-radius: 6px; border: 1px solid #ddd;">' +
            '</div>' +
            '<div style="margin: 15px 0;">' +
            '<label>Club :</label>' +
            '<select id="editPlayerClubSelect" style="width: 100%; padding: 10px; margin-top: 5px; border-radius: 6px; border: 1px solid #ddd;">' +
            generateClubOptionsForEdit(currentClub) +
            '</select>' +
            '<input type="text" id="editPlayerClubCustom" value="" style="width: 100%; padding: 10px; margin-top: 5px; border-radius: 6px; border: 1px solid #ddd; display: none;" placeholder="Nouveau club...">' +
            '</div>' +
            '<div style="display: flex; gap: 10px; justify-content: flex-end;">' +
            '<button onclick="closeEditPlayerModal()" class="btn btn-secondary">Annuler</button>' +
            '<button onclick="saveEditedPlayer(' + dayNumber + ', ' + division + ', ' + playerIndex + ', \'' + currentName.replace(/'/g, "\\'") + '\')" class="btn btn-primary">Sauvegarder</button>' +
            '</div></div></div>';
        
        document.body.appendChild(modal);
        
        // Configurer le changement de sélection de club
        var clubSelect = document.getElementById('editPlayerClubSelect');
        var clubCustom = document.getElementById('editPlayerClubCustom');
        if (clubSelect && clubCustom) {
            clubSelect.onchange = function() {
                if (this.value === '__custom__') {
                    clubCustom.style.display = 'block';
                    clubCustom.focus();
                } else {
                    clubCustom.style.display = 'none';
                    clubCustom.value = '';
                }
            };
        }
    }
    
    function generateClubOptionsForEdit(selectedClub) {
        var clubs = (typeof clubsModule !== 'undefined' && clubsModule.getClubsList) ? 
            clubsModule.getClubsList() : ['Club A', 'Club B', 'Club C'];
        var html = '<option value="">-- Aucun club --</option>';
        clubs.forEach(function(club) {
            var selected = club === selectedClub ? ' selected' : '';
            html += '<option value="' + club.replace(/"/g, '&quot;') + '"' + selected + '>' + club + '</option>';
        });
        html += '<option value="__custom__">+ Ajouter un nouveau club...</option>';
        return html;
    }
    
    function closeEditPlayerModal() {
        var modal = document.getElementById('editPlayerModal');
        if (modal) modal.remove();
    }
    
    function saveEditedPlayer(dayNumber, division, playerIndex, oldPlayerName) {
        var nameInput = document.getElementById('editPlayerNameInput');
        var clubSelect = document.getElementById('editPlayerClubSelect');
        var clubCustom = document.getElementById('editPlayerClubCustom');
        
        if (!nameInput) return;
        
        var newName = formatProperName(nameInput.value);
        if (!newName) {
            showNotification('Veuillez entrer un nom', 'warning');
            return;
        }
        
        // Récupérer le club
        var newClub = '';
        if (clubSelect) {
            if (clubSelect.value === '__custom__' && clubCustom && clubCustom.value.trim()) {
                newClub = clubCustom.value.trim();
                if (typeof clubsModule !== 'undefined' && clubsModule.addClub) {
                    clubsModule.addClub(newClub);
                }
            } else if (clubSelect.value && clubSelect.value !== '__custom__') {
                newClub = clubSelect.value;
            }
        }
        
        // Vérifier si le nom a changé et s'il existe déjà
        if (newName.toLowerCase() !== oldPlayerName.toLowerCase()) {
            var exists = championship.days[dayNumber].players[division].some((p, idx) => {
                if (idx === playerIndex) return false;
                var pName = typeof p === 'object' ? p.name : p;
                return pName.toLowerCase() === newName.toLowerCase();
            });
            
            if (exists) {
                showNotification('Ce nom existe déjà dans la division', 'warning');
                return;
            }
        }
        
        // Mettre à jour le joueur
        championship.days[dayNumber].players[division][playerIndex] = {
            name: newName,
            club: newClub
        };
        
        // Mettre à jour les matchs si le nom a changé
        if (newName !== oldPlayerName) {
            championship.days[dayNumber].matches[division].forEach(match => {
                if (match.player1 === oldPlayerName) match.player1 = newName;
                if (match.player2 === oldPlayerName) match.player2 = newName;
                if (match.winner === oldPlayerName) match.winner = newName;
            });
            
            // Mettre à jour dans les poules si activé
            if (championship.days[dayNumber].pools?.enabled && championship.days[dayNumber].pools.divisions[division]) {
                const poolMatches = championship.days[dayNumber].pools.divisions[division].matches || [];
                poolMatches.forEach(match => {
                    if (match.player1 === oldPlayerName) match.player1 = newName;
                    if (match.player2 === oldPlayerName) match.player2 = newName;
                    if (match.winner === oldPlayerName) match.winner = newName;
                });
                
                const pools = championship.days[dayNumber].pools.divisions[division].pools || [];
                pools.forEach(pool => {
                    const idx = pool.indexOf(oldPlayerName);
                    if (idx !== -1) pool[idx] = newName;
                });
                
                const finalPhase = championship.days[dayNumber].pools.divisions[division].finalPhase || [];
                finalPhase.forEach(match => {
                    if (match.player1 === oldPlayerName) match.player1 = newName;
                    if (match.player2 === oldPlayerName) match.player2 = newName;
                    if (match.winner === oldPlayerName) match.winner = newName;
                });
            }
        }
        
        closeEditPlayerModal();
        saveToLocalStorage();
        updatePlayersDisplay(dayNumber);
        updateMatchesDisplay(dayNumber);
        
        var msg = newClub ? 
            `"${newName}" (${newClub}) mis à jour` : 
            `"${newName}" mis à jour`;
        showNotification(msg, 'success');
    }
    window.editPlayer = editPlayer;
    window.showEditPlayerModal = showEditPlayerModal;
    window.closeEditPlayerModal = closeEditPlayerModal;
    window.saveEditedPlayer = saveEditedPlayer;


})(window);
