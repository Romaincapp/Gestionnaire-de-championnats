console.log("Script démarré");

try {
    // CONFIGURATION GLOBALE
    let config = {
        numberOfDivisions: 3,
        numberOfCourts: 4
    };
    window.config = config;

    // Fonction pour initialiser les divisions dynamiquement
    function initializeDivisions(numberOfDivisions) {
        const divisions = {};
        for (let i = 1; i <= numberOfDivisions; i++) {
            divisions[i] = [];
        }
        return divisions;
    }

    // STRUCTURE DE DONNÉES CHAMPIONNAT
    let championship = {
        currentDay: 1,
        config: { ...config }, // Sauvegarder la config dans le championnat
        days: {
            1: {
                players: initializeDivisions(config.numberOfDivisions),
                matches: initializeDivisions(config.numberOfDivisions)
            }
        }
    };

    console.log("Variables globales créées");
    window.championship = championship; // Rendre accessible globalement

    let importedChampionshipData = null;

    // FONCTION SHOWNOTIFICATION (DÉFINIE AVANT TOUT)
    function showNotification(message, type = 'info') {
        console.log(`[NOTIFICATION ${type.toUpperCase()}] ${message}`);
        
        if (typeof document === 'undefined') {
            return;
        }

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        // Style de base
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.right = '20px';
        notification.style.padding = '15px';
        notification.style.borderRadius = '5px';
        notification.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
        notification.style.zIndex = '10000';
        notification.style.transition = 'all 0.3s ease';

        // Styles par type
        switch(type) {
            case 'success':
                notification.style.backgroundColor = '#4CAF50';
                notification.style.color = 'white';
                break;
            case 'warning':
                notification.style.backgroundColor = '#FFC107';
                notification.style.color = 'black';
                break;
            case 'error':
                notification.style.backgroundColor = '#F44336';
                notification.style.color = 'white';
                break;
            default:
                notification.style.backgroundColor = '#2196F3';
                notification.style.color = 'white';
        }

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(-20px)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, 3000);
    }
    window.showNotification = showNotification;
    console.log("showNotification définie");

    // SAUVEGARDE LOCAL STORAGE
    function saveToLocalStorage() {
        try {
            localStorage.setItem('tennisTableChampionship', JSON.stringify(championship));
            console.log("Données sauvegardées");
        } catch (error) {
            console.warn("Erreur sauvegarde:", error);
        }
    }

    // SAUVEGARDE DONNÉES CHRONO
    function saveChronoToLocalStorage() {
        try {
            localStorage.setItem('chronoRaceData', JSON.stringify(raceData));
            console.log("Données chrono sauvegardées");
        } catch (error) {
            console.warn("Erreur sauvegarde chrono:", error);
        }
    }
    window.saveChronoToLocalStorage = saveChronoToLocalStorage;

    function loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem('tennisTableChampionship');
            if (saved) {
                championship = JSON.parse(saved);
                // Charger la config sauvegardée ou utiliser les valeurs par défaut
                if (championship.config) {
                    config.numberOfDivisions = championship.config.numberOfDivisions || 3;
                    config.numberOfCourts = championship.config.numberOfCourts || 4;
                }
                console.log("Données chargées depuis localStorage");
                return true;
            }
        } catch (error) {
            console.warn("Erreur chargement:", error);
        }
        return false;
    }

    // CHARGEMENT DONNÉES CHRONO
    function loadChronoFromLocalStorage() {
        try {
            const saved = localStorage.getItem('chronoRaceData');
            if (saved) {
                const loadedData = JSON.parse(saved);
                // Fusionner les données chargées avec la structure par défaut
                raceData.events = loadedData.events || [];
                raceData.participants = loadedData.participants || [];
                raceData.nextEventId = loadedData.nextEventId || 1;
                raceData.nextSerieId = loadedData.nextSerieId || 1;
                raceData.nextParticipantId = loadedData.nextParticipantId || 1;
                console.log("Données chrono chargées depuis localStorage");
                return true;
            }
        } catch (error) {
            console.warn("Erreur chargement chrono:", error);
        }
        return false;
    }
    window.loadChronoFromLocalStorage = loadChronoFromLocalStorage;

    // GESTION DE LA CONFIGURATION
    function updateDivisionConfig() {
        const select = document.getElementById('divisionConfig');
        config.numberOfDivisions = parseInt(select.value);
        updateCourtAssignmentInfo();
    }
    window.updateDivisionConfig = updateDivisionConfig;

    function updateCourtConfig() {
        const select = document.getElementById('courtConfig');
        config.numberOfCourts = parseInt(select.value);
        updateCourtAssignmentInfo();
    }
    window.updateCourtConfig = updateCourtConfig;

    function applyConfiguration() {
        const newDivisions = config.numberOfDivisions;
        const newCourts = config.numberOfCourts;

        if (!confirm(`⚙️ Appliquer la nouvelle configuration ?\n\n` +
            `📊 Divisions: ${newDivisions}\n` +
            `🎾 Terrains: ${newCourts}\n\n` +
            `⚠️ Attention: Cela peut affecter l'affichage des joueurs et matchs existants.`)) {
            return;
        }

        // Mettre à jour toutes les journées existantes
        Object.keys(championship.days).forEach(dayKey => {
            const day = championship.days[dayKey];

            // Ajouter les nouvelles divisions si nécessaire
            for (let i = 1; i <= newDivisions; i++) {
                if (!day.players[i]) {
                    day.players[i] = [];
                    day.matches[i] = [];
                }
            }
        });

        // Sauvegarder la config dans le championnat
        championship.config = {
            numberOfDivisions: newDivisions,
            numberOfCourts: newCourts
        };

        saveToLocalStorage();

        // Recharger l'interface
        location.reload();
    }
    window.applyConfiguration = applyConfiguration;

    function getNumberOfDivisions() {
        return championship.config?.numberOfDivisions || config.numberOfDivisions || 3;
    }
    window.getNumberOfDivisions = getNumberOfDivisions;

    function getNumberOfCourts() {
        return championship.config?.numberOfCourts || config.numberOfCourts || 4;
    }
    window.getNumberOfCourts = getNumberOfCourts;

    // Calculer la plage de terrains pour une division donnée
    function getCourtsForDivision(division) {
        const numCourts = getNumberOfCourts();
        const numDivisions = getNumberOfDivisions();

        // Calculer combien de terrains par division
        const courtsPerDivision = Math.ceil(numCourts / numDivisions);

        // Calculer le premier et dernier terrain pour cette division
        const firstCourt = (division - 1) * courtsPerDivision + 1;
        const lastCourt = Math.min(division * courtsPerDivision, numCourts);

        return {
            first: firstCourt,
            last: lastCourt,
            count: lastCourt - firstCourt + 1
        };
    }
    window.getCourtsForDivision = getCourtsForDivision;

    // FONCTIONS DE BASE
    function addPlayer() {
        console.log("addPlayer appelée");
        const name = document.getElementById('playerName').value.trim();
        const division = parseInt(document.getElementById('playerDivision').value);
        const targetDay = parseInt(document.getElementById('targetDay').value);

        if (!name || name === '') {
            showNotification('Veuillez entrer un nom de joueur', 'warning');
            return;
        }

        if (!championship.days[targetDay]) {
            championship.days[targetDay] = {
                players: { 1: [], 2: [], 3: [] },
                matches: { 1: [], 2: [], 3: [] }
            };
        }

        if (championship.days[targetDay].players[division].includes(name)) {
            showNotification(`${name} est déjà inscrit en D${division} - J${targetDay}`, 'warning');
            return;
        }

        championship.days[targetDay].players[division].push(name);
        saveToLocalStorage();
        showNotification(`${name} ajouté à D${division} - J${targetDay}`, 'success');

        updatePlayersDisplay(targetDay);
        document.getElementById('playerName').value = '';
    }
    window.addPlayer = addPlayer;

    function showBulkInput() {
        console.log("showBulkInput appelée");
        const division = document.getElementById('bulkDivision').value;
        const targetDay = document.getElementById('bulkTargetDay').value;
        document.getElementById('selectedDivision').textContent = `Division ${division} - Journée ${targetDay}`;
        document.getElementById('bulkModal').style.display = 'block';
        document.getElementById('bulkText').focus();
        
        document.getElementById('bulkModal').dataset.dayNumber = targetDay;
        document.getElementById('bulkModal').dataset.division = division;
    }
    window.showBulkInput = showBulkInput;

    function closeBulkModal() {
        document.getElementById('bulkModal').style.display = 'none';
        document.getElementById('bulkText').value = '';
    }
    window.closeBulkModal = closeBulkModal;

    function addBulkPlayers() {
        console.log("addBulkPlayers appelée");
        const text = document.getElementById('bulkText').value.trim();
        const modal = document.getElementById('bulkModal');
        const dayNumber = parseInt(modal.dataset.dayNumber) || parseInt(document.getElementById('bulkTargetDay').value);
        const division = parseInt(modal.dataset.division) || parseInt(document.getElementById('bulkDivision').value);
        
        if (!text) {
            alert('Veuillez entrer au moins un nom de joueur');
            return;
        }
        
        const names = text.split('\n')
                         .map(name => name.trim())
                         .filter(name => name.length > 0);
        
        let added = 0;
        let duplicates = [];
        
        if (!championship.days[dayNumber]) {
            championship.days[dayNumber] = {
                players: { 1: [], 2: [], 3: [] },
                matches: { 1: [], 2: [], 3: [] }
            };
        }
        
        names.forEach(name => {
            if (!championship.days[dayNumber].players[division].includes(name)) {
                championship.days[dayNumber].players[division].push(name);
                added++;
            } else {
                duplicates.push(name);
            }
        });
        
        updatePlayersDisplay(dayNumber);
        updateDaySelectors();
        saveToLocalStorage();
        
        let message = `✅ ${added} joueurs ajoutés à la Division ${division} - Journée ${dayNumber} !`;
        if (duplicates.length > 0) {
            message += `\n\n⚠️ Joueurs déjà présents (ignorés): ${duplicates.join(', ')}`;
        }
        
        alert(message);
        closeBulkModal();
    }
    window.addBulkPlayers = addBulkPlayers;

    function updatePlayersDisplay(dayNumber) {
        console.log("updatePlayersDisplay appelée pour journée", dayNumber);
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
                    // Échapper seulement les apostrophes (pas les guillemets doubles car la chaîne JS est entre guillemets simples)
                    const escapedPlayer = player.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                    return `<div class="player-tag" onclick="showPlayerDetails(${dayNumber}, ${division}, '${escapedPlayer}')">
                        ${player}
                        <div class="player-actions">
                            <button class="edit-player" onclick="event.stopPropagation(); editPlayer(${dayNumber}, ${division}, '${escapedPlayer}')" title="Modifier">✏️</button>
                            <button class="remove-player" onclick="event.stopPropagation(); removePlayer(${dayNumber}, ${division}, '${escapedPlayer}')" title="Supprimer">×</button>
                        </div>
                    </div>`;
                }).join('');
            }
        }
    }
    window.updatePlayersDisplay = updatePlayersDisplay;

    function removePlayer(dayNumber, division, playerName) {
        console.log("removePlayer appelée");

        // Demander confirmation avant suppression
        if (!confirm(`Êtes-vous sûr de vouloir supprimer ${playerName} ?`)) {
            return; // Annuler la suppression
        }

        championship.days[dayNumber].players[division] = championship.days[dayNumber].players[division].filter(p => p !== playerName);
        championship.days[dayNumber].matches[division] = championship.days[dayNumber].matches[division].filter(match =>
            match.player1 !== playerName && match.player2 !== playerName
        );
        updatePlayersDisplay(dayNumber);
        updateMatchesDisplay(dayNumber);
        updateStats(dayNumber);
        saveToLocalStorage();
        showNotification(`${playerName} supprimé`, 'warning');
    }
    window.removePlayer = removePlayer;

    function editPlayer(dayNumber, division, oldPlayerName) {
        console.log("editPlayer appelée");

        const newName = prompt(`Modifier le nom du joueur:\n\nNom actuel: ${oldPlayerName}`, oldPlayerName);

        if (!newName || newName.trim() === '') {
            return; // Annulé
        }

        const trimmedNewName = newName.trim();

        // Si le nom n'a pas changé
        if (trimmedNewName === oldPlayerName) {
            return;
        }

        // Vérifier si le nouveau nom existe déjà dans la division
        if (championship.days[dayNumber].players[division].includes(trimmedNewName)) {
            showNotification(`Le nom "${trimmedNewName}" existe déjà dans D${division} - J${dayNumber}`, 'warning');
            return;
        }

        // Remplacer le nom dans le tableau des joueurs
        const playerIndex = championship.days[dayNumber].players[division].indexOf(oldPlayerName);
        if (playerIndex !== -1) {
            championship.days[dayNumber].players[division][playerIndex] = trimmedNewName;
        }

        // Mettre à jour le nom dans tous les matchs classiques
        championship.days[dayNumber].matches[division].forEach(match => {
            if (match.player1 === oldPlayerName) match.player1 = trimmedNewName;
            if (match.player2 === oldPlayerName) match.player2 = trimmedNewName;
            if (match.winner === oldPlayerName) match.winner = trimmedNewName;
        });

        // Mettre à jour dans les matchs de poules si activé
        if (championship.days[dayNumber].pools?.enabled && championship.days[dayNumber].pools.divisions[division]) {
            const poolMatches = championship.days[dayNumber].pools.divisions[division].matches || [];
            poolMatches.forEach(match => {
                if (match.player1 === oldPlayerName) match.player1 = trimmedNewName;
                if (match.player2 === oldPlayerName) match.player2 = trimmedNewName;
                if (match.winner === oldPlayerName) match.winner = trimmedNewName;
            });

            // Mettre à jour dans les pools
            const pools = championship.days[dayNumber].pools.divisions[division].pools || [];
            pools.forEach(pool => {
                const idx = pool.indexOf(oldPlayerName);
                if (idx !== -1) pool[idx] = trimmedNewName;
            });

            // Mettre à jour dans la phase finale
            const finalPhase = championship.days[dayNumber].pools.divisions[division].finalPhase || [];
            finalPhase.forEach(match => {
                if (match.player1 === oldPlayerName) match.player1 = trimmedNewName;
                if (match.player2 === oldPlayerName) match.player2 = trimmedNewName;
                if (match.winner === oldPlayerName) match.winner = trimmedNewName;
            });
        }

        // Rafraîchir l'affichage
        updatePlayersDisplay(dayNumber);
        updateMatchesDisplay(dayNumber);
        updateStats(dayNumber);
        saveToLocalStorage();

        showNotification(`"${oldPlayerName}" renommé en "${trimmedNewName}"`, 'success');
    }
    window.editPlayer = editPlayer;

    // GESTION DES ONGLETS ET JOURNÉES
    function addNewDay() {
        const existingDays = Object.keys(championship.days).map(Number);
        const newDayNumber = Math.max(...existingDays) + 1;
        const numDivisions = championship.config.numDivisions || 3;

        // Créer la structure dynamique pour le nombre de divisions configuré
        const players = {};
        const matches = {};
        for (let div = 1; div <= numDivisions; div++) {
            players[div] = [];
            matches[div] = [];
        }

        championship.days[newDayNumber] = {
            players: players,
            matches: matches
        };

        // Initialiser le système de poules pour cette nouvelle journée
        initializePoolSystem(newDayNumber);

        createDayTab(newDayNumber);
        createDayContent(newDayNumber);

        // IMPORTANT : Initialiser l'interface du mode poules après avoir créé le contenu
        if (typeof initializePoolsForDay === 'function') {
            initializePoolsForDay(newDayNumber);
        }

        updateDaySelectors();
        updateTabsDisplay();
        switchTab(newDayNumber);
        saveToLocalStorage();

        showNotification(`Journée ${newDayNumber} créée !`, 'success');
    }
    window.addNewDay = addNewDay;

    function updateDaySelectors() {
        const dayNumbers = Object.keys(championship.days).sort((a, b) => Number(a) - Number(b));
        
        const selectors = ['targetDay', 'fileTargetDay', 'bulkTargetDay'];
        
        selectors.forEach(selectorId => {
            const selector = document.getElementById(selectorId);
            if (selector) {
                const currentValue = selector.value;
                selector.innerHTML = '';
                
                dayNumbers.forEach(dayNum => {
                    const option = document.createElement('option');
                    option.value = dayNum;
                    option.textContent = `→ Journée ${dayNum}`;
                    selector.appendChild(option);
                });
                
                if (dayNumbers.includes(currentValue)) {
                    selector.value = currentValue;
                } else {
                    selector.value = Math.max(...dayNumbers.map(Number)).toString();
                }
            }
        });
    }

    function createDayTab(dayNumber) {
        const tabsContainer = document.getElementById('tabs');
        const addButton = tabsContainer.querySelector('.add-day-btn');
        
        const newTab = document.createElement('button');
        newTab.className = 'tab';
        newTab.onclick = () => switchTab(dayNumber);
        newTab.dataset.day = dayNumber;
        
        if (dayNumber === 1) {
            newTab.innerHTML = `Journée ${dayNumber} <span style="font-size: 10px; opacity: 0.7;">(Hub Central)</span>`;
        } else {
            newTab.innerHTML = `
                Journée ${dayNumber}
                <button class="remove-day" onclick="event.stopPropagation(); removeDay(${dayNumber})" title="Supprimer">×</button>
            `;
        }
        
        tabsContainer.insertBefore(newTab, addButton);
    }

    function createDayContent(dayNumber) {
        // Vérifier si le contenu de la journée existe déjà
        const existingDayContent = document.getElementById(`day-${dayNumber}`);
        if (existingDayContent) {
            // Si le contenu existe déjà, le mettre à jour plutôt que de le recréer
            existingDayContent.innerHTML = generateDayContentHTML(dayNumber).replace(/<div class="section">|<\/div>\s*<div class="divisions"|<\/div>\s*<div class="rankings-section"|<\/div>\s*<div class="stats"/g, '');
            // Extraire juste le contenu de la section
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = generateDayContentHTML(dayNumber);
            existingDayContent.innerHTML = tempDiv.innerHTML;
            initializeDivisionsDisplay(dayNumber);
            return;
        }

        const content = document.querySelector('.content');
        const generalRanking = document.getElementById('general-ranking');

        const dayContent = document.createElement('div');
        dayContent.className = 'tab-content day-content';
        dayContent.id = `day-${dayNumber}`;
        dayContent.innerHTML = generateDayContentHTML(dayNumber);

        content.insertBefore(dayContent, generalRanking);
        initializeDivisionsDisplay(dayNumber);
    }

    function generateDayContentHTML(dayNumber) {
        return `
            <div class="section">
                <h2>👥 Joueurs Journée ${dayNumber}</h2>

                <div style="text-align: center; margin-bottom: 20px;">
                    <p style="color: #7f8c8d; font-style: italic;">
                        Utilisez la <strong>Journée 1 (Hub Central)</strong> pour ajouter des joueurs à cette journée
                    </p>
                    <button class="btn" onclick="switchTab(1)" style="margin: 10px;">
                        ← Retour au Hub Central
                    </button>
                </div>

                <div style="background: linear-gradient(135deg, #f8f9fa, #e9ecef); border-radius: 8px; padding: 15px; margin: 15px auto; max-width: 800px; border: 2px solid #dee2e6;">
                    <h3 style="color: #2c3e50; margin: 0 0 12px 0; font-size: 16px; text-align: center;">🎯 Génération de Matchs</h3>

                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 10px;">
                        <button class="btn" onclick="generateMatchesForDay(${dayNumber})" style="background: linear-gradient(135deg, #3498db, #2980b9); padding: 8px 10px; font-size: 12px;">
                            🔄 Round-Robin
                        </button>
                        <button class="btn" onclick="generateMatchesOptimized4to10(${dayNumber})" style="background: linear-gradient(135deg, #e67e22, #d35400); padding: 8px 10px; font-size: 12px;">
                            🎲 Optimisé 4-10
                        </button>
                        <button class="btn" onclick="generateMatchesByCourtOptimized(${dayNumber})" style="background: linear-gradient(135deg, #16a085, #1abc9c); padding: 8px 10px; font-size: 12px;">
                            🎾 Par Terrain
                        </button>
                        <button class="btn" onclick="generateMatchesSwissSystem(${dayNumber})" style="background: linear-gradient(135deg, #16a085, #1abc9c); padding: 8px 10px; font-size: 12px;">
                            🏆 Swiss System
                        </button>
                    </div>

                    <div style="padding: 6px 10px; background: rgba(255,255,255,0.7); border-radius: 5px; font-size: 10px; color: #6c757d; line-height: 1.4; text-align: center;">
                        <strong>Round-Robin:</strong> Tous vs tous • <strong>Optimisé:</strong> 4-10 joueurs • <strong>Terrain:</strong> 4-10/terrain • <strong>Swiss:</strong> Par niveau
                    </div>
                </div>

                <div class="control-buttons" style="gap: 8px; flex-wrap: wrap; margin-top: 15px;">
                    <button class="btn btn-success" onclick="updateRankingsForDay(${dayNumber})" style="padding: 8px 12px; font-size: 13px;">
                        🏆 Classements J${dayNumber}
                    </button>
                    <button class="btn" onclick="showByeManagementModal(${dayNumber})" style="background: linear-gradient(135deg, #16a085, #1abc9c); padding: 8px 12px; font-size: 13px;">
                        🎯 Gérer BYE
                    </button>
                    <button class="btn" onclick="copyPlayersFromPreviousDay(${dayNumber})" style="padding: 8px 12px; font-size: 13px;">
                        👥 Copier J${dayNumber-1}
                    </button>
                    <button class="btn btn-warning" onclick="clearDayData(${dayNumber})" style="padding: 8px 12px; font-size: 13px;">
                        🗑️ Vider J${dayNumber}
                    </button>
                </div>
            </div>
            
            <div class="divisions" id="divisions-${dayNumber}">
            </div>
            
            <div class="rankings-section" id="rankings-${dayNumber}" style="display: none;">
                <div class="rankings-header">
                    <div class="rankings-title">🏆 Classements Journée ${dayNumber}</div>
                    <div class="rankings-toggle">
                        <button class="toggle-btn active" onclick="showRankingsForDay(${dayNumber}, 'points')">Par Points</button>
                        <button class="toggle-btn" onclick="showRankingsForDay(${dayNumber}, 'winrate')">Par % Victoires</button>
                    </div>
                </div>
                <div id="rankingsContent-${dayNumber}"></div>
            </div>
            
            <div class="stats" id="stats-${dayNumber}" style="display: none;">
                <h3>📊 Statistiques Journée ${dayNumber}</h3>
                <div class="stats-grid" id="statsContent-${dayNumber}"></div>
            </div>
        `;
    }

    function removeDay(dayNumber) {
        if (dayNumber === 1) {
            alert('⚠️ Impossible de supprimer la Journée 1 !\n\nLa Journée 1 est le Hub Central pour la gestion des joueurs.\nElle ne peut pas être supprimée.');
            return;
        }
        
        if (Object.keys(championship.days).length <= 1) {
            alert('Vous ne pouvez pas supprimer la dernière journée !');
            return;
        }
        
        if (confirm(`Supprimer définitivement la Journée ${dayNumber} ?\n\nTous les joueurs, matchs et scores seront perdus !`)) {
            delete championship.days[dayNumber];
            
            const tab = document.querySelector(`[data-day="${dayNumber}"]`);
            if (tab) tab.remove();
            
            const dayContent = document.getElementById(`day-${dayNumber}`);
            if (dayContent) dayContent.remove();
            
            const remainingDays = Object.keys(championship.days).map(Number);
            switchTab(Math.min(...remainingDays));
            
            updateDaySelectors();
            saveToLocalStorage();
            showNotification(`Journée ${dayNumber} supprimée`, 'warning');
        }
    }
    window.removeDay = removeDay;

    function switchTab(dayNumber) {
        championship.currentDay = dayNumber;

        console.log(`[switchTab] Passage à la journée ${dayNumber}`);

        // Retirer la classe active de tous les contenus de journées
        const allTabContents = document.querySelectorAll('.tab-content');
        console.log(`[switchTab] ${allTabContents.length} .tab-content trouvés`);
        allTabContents.forEach(content => {
            console.log(`[switchTab] Retrait de active sur ${content.id}`);
            content.classList.remove('active');
            // Force le masquage pour être sûr (y compris general-ranking)
            if (content.id !== `day-${dayNumber}`) {
                content.style.display = 'none';
            }
        });

        // Retirer la classe active de tous les onglets
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });

        // Ajouter la classe active à l'onglet et au contenu ciblés
        const targetTab = document.querySelector(`[data-day="${dayNumber}"]`);
        const targetContent = document.getElementById(`day-${dayNumber}`);

        console.log(`[switchTab] Onglet trouvé:`, targetTab ? 'OUI' : 'NON');
        console.log(`[switchTab] Contenu trouvé:`, targetContent ? 'OUI' : 'NON');

        if (targetTab) targetTab.classList.add('active');
        if (targetContent) {
            targetContent.classList.add('active');
            targetContent.style.display = 'block'; // Force l'affichage
            console.log(`[switchTab] Classe active ajoutée à ${targetContent.id}`);
        }
    }
    window.switchTab = switchTab;

    function switchToGeneralRanking() {
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
            // Force le masquage de tous les contenus sauf general-ranking
            if (content.id !== 'general-ranking') {
                content.style.display = 'none';
            }
        });

        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });

        const generalTab = document.querySelector('[data-tab="general"]');
        const generalContent = document.getElementById('general-ranking');

        if (generalTab) generalTab.classList.add('active');
        if (generalContent) {
            generalContent.classList.add('active');
            generalContent.style.display = 'block'; // Force l'affichage
        }

        updateGeneralRanking();
    }
    window.switchToGeneralRanking = switchToGeneralRanking;

    function updateTabsDisplay() {
        const tabsContainer = document.getElementById('tabs');
        if (!tabsContainer) return;
        
        const existingTabs = tabsContainer.querySelectorAll('.tab:not(.general-ranking)');
        
        existingTabs.forEach(tab => {
            if (!tab.classList.contains('add-day-btn')) {
                tab.remove();
            }
        });
        
        const addButton = tabsContainer.querySelector('.add-day-btn');
        const generalTab = tabsContainer.querySelector('.general-ranking');
        
        Object.keys(championship.days).sort((a, b) => Number(a) - Number(b)).forEach(dayNumber => {
            const tab = document.createElement('button');
            tab.className = 'tab';
            if (Number(dayNumber) === championship.currentDay) {
                tab.classList.add('active');
            }
            tab.onclick = () => switchTab(Number(dayNumber));
            tab.dataset.day = dayNumber;
            
            if (Number(dayNumber) === 1) {
                tab.innerHTML = `Journée ${dayNumber}`;
            } else {
                tab.innerHTML = `
                    Journée ${dayNumber}
                    <button class="remove-day" onclick="event.stopPropagation(); removeDay(${dayNumber})" title="Supprimer">×</button>
                `;
            }
            
            tabsContainer.insertBefore(tab, addButton);
        });
    }

    function initializeAllDaysContent() {
        Object.keys(championship.days).forEach(dayNumber => {
            const dayNum = Number(dayNumber);
            if (dayNum > 1) {
                // Forcer la recréation/mise à jour du contenu pour toutes les journées supplémentaires
                createDayContent(dayNum);
            }
            initializeDivisionsDisplay(dayNum);
            updatePlayersDisplay(dayNum);
            updateMatchesDisplay(dayNum);
            updateStats(dayNum);
            //nouveau pour les pools
            initializePoolsForDay(dayNum);
        });

        // IMPORTANT: Forcer la mise à jour du contenu HTML pour les journées existantes
        // Cela garantit que les boutons optimisés apparaissent même après un chargement depuis localStorage
        console.log('✅ Initialisation des journées terminée');
    }

    // GÉNÉRATION DES MATCHS
    function generateMatchesForDay(dayNumber) {
        if (!dayNumber) {
            dayNumber = championship.currentDay;
        }
        
        const dayData = championship.days[dayNumber];
        if (!dayData) return;

        // NOUVEAU: Vérifier si le mode poules est activé
        if (dayData.pools && dayData.pools.enabled) {
        alert('⚠️ Mode Poules activé !\n\nUtilisez les boutons "Générer les Poules" dans la section bleue ci-dessus.');
        return;
        }
        
        let reportDetails = {
            totalNewMatches: 0,
            totalRematches: 0,
            divisions: {}
        };
        
        const numDivisions = getNumberOfDivisions();

        for (let division = 1; division <= numDivisions; division++) {
            const divisionPlayers = [...(dayData.players[division] || [])];

            if (divisionPlayers.length < 2) {
                if (divisionPlayers.length === 1) {
                    alert(`Journée ${dayNumber} - Division ${division}: Il faut au moins 2 joueurs pour générer des matchs`);
                }
                continue;
            }

            dayData.matches[division] = [];
            
            const matchHistory = new Map();
            
            for (let i = 0; i < divisionPlayers.length; i++) {
                for (let j = i + 1; j < divisionPlayers.length; j++) {
                    const key = [divisionPlayers[i], divisionPlayers[j]].sort().join('|vs|');
                    matchHistory.set(key, 0);
                }
            }
            
            Object.keys(championship.days).forEach(day => {
                const dayNum = parseInt(day);
                
                if (dayNum !== dayNumber && 
                    championship.days[dayNum] && 
                    championship.days[dayNum].matches[division]) {
                    
                    championship.days[dayNum].matches[division].forEach(match => {
                        if (divisionPlayers.includes(match.player1) && 
                            divisionPlayers.includes(match.player2)) {
                            
                            const key = [match.player1, match.player2].sort().join('|vs|');
                            const currentCount = matchHistory.get(key) || 0;
                            matchHistory.set(key, currentCount + 1);
                        }
                    });
                }
            });
            
            const possibleMatches = [];
            for (let i = 0; i < divisionPlayers.length; i++) {
                for (let j = i + 1; j < divisionPlayers.length; j++) {
                    const player1 = divisionPlayers[i];
                    const player2 = divisionPlayers[j];
                    const key = [player1, player2].sort().join('|vs|');
                    const timesPlayed = matchHistory.get(key) || 0;
                    
                    possibleMatches.push({
                        player1: player1,
                        player2: player2,
                        timesPlayed: timesPlayed,
                        priority: timesPlayed === 0 ? 0 : timesPlayed + 10,
                        key: key,
                        randomOrder: Math.random()
                    });
                }
            }
            
            possibleMatches.sort((a, b) => {
                if (a.priority !== b.priority) return a.priority - b.priority;
                return a.randomOrder - b.randomOrder;
            });
            
            const playersMatchCount = new Map();
            divisionPlayers.forEach(p => playersMatchCount.set(p, 0));
            
            const targetMatchesPerPlayer = 4;
            const matchesByTour = { 1: [], 2: [], 3: [], 4: [] };
            const usedMatches = new Set();
            
            for (let tour = 1; tour <= 4; tour++) {
                const playersInThisTour = new Set();
                
                for (const matchPair of possibleMatches) {
                    if (usedMatches.has(matchPair.key)) continue;
                    
                    if (!playersInThisTour.has(matchPair.player1) && 
                        !playersInThisTour.has(matchPair.player2)) {
                        
                        const p1Count = playersMatchCount.get(matchPair.player1) || 0;
                        const p2Count = playersMatchCount.get(matchPair.player2) || 0;
                        
                        if (p1Count < targetMatchesPerPlayer && p2Count < targetMatchesPerPlayer) {
                            
                            const matchData = {
                                player1: matchPair.player1,
                                player2: matchPair.player2,
                                tour: tour,
                                score1: '',
                                score2: '',
                                completed: false,
                                winner: null,
                                timesPlayedBefore: matchPair.timesPlayed,
                                isRematch: matchPair.timesPlayed > 0
                            };
                            
                            matchesByTour[tour].push(matchData);
                            playersInThisTour.add(matchPair.player1);
                            playersInThisTour.add(matchPair.player2);
                            playersMatchCount.set(matchPair.player1, p1Count + 1);
                            playersMatchCount.set(matchPair.player2, p2Count + 1);
                            usedMatches.add(matchPair.key);
                            
                            if (matchPair.timesPlayed === 0) {
                                reportDetails.totalNewMatches++;
                            } else {
                                reportDetails.totalRematches++;
                            }
                        }
                    }
                    
                    if (matchesByTour[tour].length >= Math.ceil(divisionPlayers.length / 2)) {
                        break;
                    }
                }
            }
            
            for (let tour = 1; tour <= 4; tour++) {
                dayData.matches[division].push(...matchesByTour[tour]);
            }
            
            reportDetails.divisions[division] = {
                players: divisionPlayers.length,
                newMatches: dayData.matches[division].filter(m => !m.isRematch).length,
                rematches: dayData.matches[division].filter(m => m.isRematch).length,
                total: dayData.matches[division].length
            };
        }
        
        updateMatchesDisplay(dayNumber);
        updateStats(dayNumber);
        saveToLocalStorage();
        
        let summary = `✅ Matchs générés pour la Journée ${dayNumber} !\n\n`;

        for (let division = 1; division <= numDivisions; division++) {
            if (reportDetails.divisions[division]) {
                const divStats = reportDetails.divisions[division];
                summary += `Division ${division}: ${divStats.players} joueurs\n`;
                summary += `  → ${divStats.newMatches} matchs INÉDITS`;
                if (divStats.rematches > 0) {
                    summary += ` + ${divStats.rematches} revanches`;
                }
                summary += ` = ${divStats.total} matchs total\n`;
            }
        }
        
        summary += `\n📊 Résumé global :\n`;
        summary += `• ${reportDetails.totalNewMatches} nouveaux matchs\n`;
        if (reportDetails.totalRematches > 0) {
            summary += `• ${reportDetails.totalRematches} revanches (minimisées)\n`;
        }
        summary += `\n💡 L'algorithme a priorisé les matchs jamais joués !`;
        
        alert(summary);
    }
    window.generateMatchesForDay = generateMatchesForDay;

    // GÉNÉRATION OPTIMISÉE POUR 4-10 JOUEURS (4 TOURS)
    function generateMatchesOptimized4to10(dayNumber) {
        if (!dayNumber) {
            dayNumber = championship.currentDay;
        }

        const dayData = championship.days[dayNumber];
        if (!dayData) return;

        if (dayData.pools && dayData.pools.enabled) {
            alert('⚠️ Mode Poules activé !\n\nUtilisez les boutons "Générer les Poules" dans la section bleue ci-dessus.');
            return;
        }

        let reportDetails = {
            totalNewMatches: 0,
            divisions: {}
        };

        const numDivisions = getNumberOfDivisions();

        for (let division = 1; division <= numDivisions; division++) {
            const divisionPlayers = [...(dayData.players[division] || [])];
            const numPlayers = divisionPlayers.length;

            if (numPlayers < 4) {
                if (numPlayers > 0) {
                    alert(`Journée ${dayNumber} - Division ${division}: Il faut au moins 4 joueurs pour cette génération optimisée`);
                }
                continue;
            }

            if (numPlayers > 10) {
                alert(`Journée ${dayNumber} - Division ${division}: Cette génération est optimisée pour 4 à 10 joueurs. Vous avez ${numPlayers} joueurs.`);
                continue;
            }

            dayData.matches[division] = [];

            // Schémas prédéfinis pour chaque nombre de joueurs (selon vos spécifications)
            const schemas = {
                4: [
                    [[0,1], [0,2], [1,3]],       // Tour 1: aller - a-b, a-c, b-d
                    [[0,3], [3,2], [1,2]],       // Tour 2: aller suite - a-d, d-c, b-c
                    [[0,1], [2,3]]               // Tour 3: retour - a-b, c-d
                ],
                5: [
                    [[0,1], [2,4], [3,4]],       // Tour 1: a-b, c-e, d-e
                    [[0,2], [1,3], [0,3]],       // Tour 2: a-c, b-d, a-d
                    [[1,4], [3,2]],              // Tour 3: b-e, d-c
                    [[0,4], [1,2]]               // Tour 4: a-e, b-c
                ],
                6: [
                    [[0,1], [2,3], [4,5]],    // Tour 1
                    [[0,2], [1,4], [3,5]],    // Tour 2
                    [[0,3], [1,5], [4,2]],    // Tour 3
                    [[0,5], [1,2], [4,3]]     // Tour 4
                ],
                7: [
                    [[0,1], [2,3], [4,5]],       // Tour 1: a-b, c-d, e-f
                    [[6,5], [0,2], [4,6]],       // Tour 2: g-f, a-c, e-g
                    [[0,3], [1,3], [1,4], [2,5]], // Tour 3: a-d, b-d, b-e, c-f
                    [[6,3], [2,6], [0,4], [1,5]]  // Tour 4: g-d, c-g, a-e, b-f
                ],
                8: [
                    [[0,1], [2,3], [4,5], [6,7]], // Tour 1
                    [[0,3], [1,2], [4,7], [5,6]], // Tour 2
                    [[0,2], [1,3], [4,6], [5,7]], // Tour 3
                    [[0,4], [2,6], [1,5], [3,7]]  // Tour 4
                ],
                9: [
                    [[0,1], [2,3], [4,5], [6,7]], // Tour 1 (i=8 BYE)
                    [[0,2], [1,3], [4,6], [5,8]], // Tour 2 (h=7 BYE)
                    [[0,3], [1,2], [4,7], [6,8]], // Tour 3 (f=5 BYE)
                    [[0,5], [1,6], [2,7], [3,8]]  // Tour 4 (e=4 BYE)
                ],
                10: [
                    [[0,1], [2,3], [4,5], [6,7], [8,9]], // Tour 1
                    [[0,2], [1,3], [4,6], [5,8], [7,9]], // Tour 2
                    [[0,3], [1,2], [4,7], [5,9], [6,8]], // Tour 3
                    [[0,5], [1,6], [2,7], [3,8], [4,9]]  // Tour 4
                ]
            };

            const schema = schemas[numPlayers];
            if (!schema) {
                alert(`Aucun schéma prédéfini pour ${numPlayers} joueurs`);
                continue;
            }

            // Générer les matchs selon le schéma
            // D'abord identifier les joueurs qui ont un BYE (pour 9 joueurs)
            const byePlayers = [];
            if (numPlayers === 9) {
                const byeMap = [8, 7, 5, 4]; // Indices des joueurs qui ont BYE à chaque tour
                byeMap.forEach((playerIdx, tourIdx) => {
                    if (!byePlayers[tourIdx]) byePlayers[tourIdx] = [];
                    byePlayers[tourIdx].push(divisionPlayers[playerIdx]);
                });
            }

            schema.forEach((tour, tourIndex) => {
                tour.forEach(([idx1, idx2]) => {
                    if (idx1 < divisionPlayers.length && idx2 < divisionPlayers.length) {
                        const matchData = {
                            player1: divisionPlayers[idx1],
                            player2: divisionPlayers[idx2],
                            tour: tourIndex + 1,
                            score1: '',
                            score2: '',
                            completed: false,
                            winner: null,
                            timesPlayedBefore: 0,
                            isRematch: false
                        };

                        dayData.matches[division].push(matchData);
                        reportDetails.totalNewMatches++;
                    }
                });

                // Ajouter les BYE pour ce tour (si applicable)
                if (byePlayers[tourIndex] && byePlayers[tourIndex].length > 0) {
                    byePlayers[tourIndex].forEach(player => {
                        const byeMatch = {
                            player1: player,
                            player2: 'BYE',
                            tour: tourIndex + 1,
                            score1: '',
                            score2: '',
                            completed: true,
                            winner: player,
                            isBye: true
                        };
                        dayData.matches[division].push(byeMatch);
                    });
                }
            });

            reportDetails.divisions[division] = {
                players: numPlayers,
                matches: dayData.matches[division].length,
                tours: 4
            };
        }

        updateMatchesDisplay(dayNumber);
        updateStats(dayNumber);
        saveToLocalStorage();

        let summary = `✅ Matchs générés (Optimisation 4-10 joueurs) !\n\n`;

        for (let division = 1; division <= numDivisions; division++) {
            if (reportDetails.divisions[division]) {
                const divStats = reportDetails.divisions[division];
                summary += `Division ${division}: ${divStats.players} joueurs\n`;
                summary += `  → ${divStats.matches} matchs en ${divStats.tours} tours\n`;
            }
        }

        summary += `\n📊 Total: ${reportDetails.totalNewMatches} matchs générés`;
        alert(summary);
    }
    window.generateMatchesOptimized4to10 = generateMatchesOptimized4to10;

    // GÉNÉRATION PAR TERRAIN (4-10 JOUEURS PAR TERRAIN)
    function generateMatchesByCourtOptimized(dayNumber) {
        if (!dayNumber) {
            dayNumber = championship.currentDay;
        }

        const dayData = championship.days[dayNumber];
        if (!dayData) return;

        if (dayData.pools && dayData.pools.enabled) {
            alert('⚠️ Mode Poules activé !\n\nUtilisez les boutons "Générer les Poules" dans la section bleue ci-dessus.');
            return;
        }

        let reportDetails = {
            totalMatches: 0,
            divisions: {}
        };

        const numDivisions = getNumberOfDivisions();

        // Schémas prédéfinis pour chaque nombre de joueurs
        const schemas = {
            4: [
                [[0,1], [0,2], [1,3]],
                [[0,3], [3,2], [1,2]],
                [[0,1], [2,3]]
            ],
            5: [
                [[0,1], [2,4], [3,4]],
                [[0,2], [1,3], [0,3]],
                [[1,4], [3,2]],
                [[0,4], [1,2]]
            ],
            6: [
                [[0,1], [2,3], [4,5]],
                [[0,2], [1,4], [3,5]],
                [[0,3], [1,5], [4,2]],
                [[0,5], [1,2], [4,3]]
            ],
            7: [
                [[0,1], [2,3], [4,5]],
                [[6,5], [0,2], [4,6]],
                [[0,3], [1,3], [1,4], [2,5]],
                [[6,3], [2,6], [0,4], [1,5]]
            ],
            8: [
                [[0,1], [2,3], [4,5], [6,7]],
                [[0,3], [1,2], [4,7], [5,6]],
                [[0,2], [1,3], [4,6], [5,7]],
                [[0,4], [2,6], [1,5], [3,7]]
            ],
            9: [
                [[0,1], [2,3], [4,5], [6,7]],
                [[0,2], [1,3], [4,6], [5,8]],
                [[0,3], [1,2], [4,7], [6,8]],
                [[0,5], [1,6], [2,7], [3,8]]
            ],
            10: [
                [[0,1], [2,3], [4,5], [6,7], [8,9]],
                [[0,2], [1,3], [4,6], [5,8], [7,9]],
                [[0,3], [1,2], [4,7], [5,9], [6,8]],
                [[0,5], [1,6], [2,7], [3,8], [4,9]]
            ]
        };

        for (let division = 1; division <= numDivisions; division++) {
            const divisionPlayers = [...(dayData.players[division] || [])];
            const numPlayers = divisionPlayers.length;

            if (numPlayers < 4) {
                if (numPlayers > 0) {
                    alert(`Division ${division}: Il faut au moins 4 joueurs pour cette génération`);
                }
                continue;
            }

            // Obtenir les terrains de cette division
            const divisionCourts = getCourtsForDivision(division);
            const numCourts = divisionCourts.count;

            // Calculer combien de joueurs par terrain (idéalement entre 4 et 10)
            const playersPerCourt = Math.floor(numPlayers / numCourts);

            if (playersPerCourt < 4) {
                alert(`Division ${division}: Pas assez de joueurs pour les ${numCourts} terrains.\n\n` +
                      `Vous avez ${numPlayers} joueurs, il faut au moins ${numCourts * 4} joueurs (4 par terrain).\n\n` +
                      `Options:\n` +
                      `- Réduire le nombre de terrains\n` +
                      `- Ajouter plus de joueurs\n` +
                      `- Utiliser une autre méthode de génération`);
                continue;
            }

            if (playersPerCourt > 10) {
                alert(`Division ${division}: Trop de joueurs par terrain.\n\n` +
                      `Avec ${numPlayers} joueurs sur ${numCourts} terrains = ${playersPerCourt} joueurs/terrain.\n\n` +
                      `Maximum: 10 joueurs par terrain.\n\n` +
                      `Options:\n` +
                      `- Augmenter le nombre de terrains\n` +
                      `- Utiliser une autre méthode de génération`);
                continue;
            }

            dayData.matches[division] = [];

            // Mélanger les joueurs pour une répartition équitable
            const shuffledPlayers = [...divisionPlayers].sort(() => Math.random() - 0.5);

            // Répartir les joueurs sur les terrains
            const courtAssignments = [];
            const remainingPlayers = numPlayers % numCourts; // Joueurs en surplus
            let currentPlayerIndex = 0;

            for (let courtIdx = 0; courtIdx < numCourts; courtIdx++) {
                // Les premiers terrains reçoivent un joueur supplémentaire si nécessaire
                const playersForThisCourt = playersPerCourt + (courtIdx < remainingPlayers ? 1 : 0);

                const courtPlayers = shuffledPlayers.slice(currentPlayerIndex, currentPlayerIndex + playersForThisCourt);
                const actualCourtNumber = divisionCourts.first + courtIdx;

                courtAssignments.push({
                    court: actualCourtNumber,
                    players: courtPlayers,
                    numPlayers: courtPlayers.length
                });

                currentPlayerIndex += playersForThisCourt;
            }

            // Vérification : tous les joueurs doivent être assignés
            const totalAssigned = courtAssignments.reduce((sum, ca) => sum + ca.numPlayers, 0);
            if (totalAssigned !== numPlayers) {
                console.error(`⚠️ Erreur: ${totalAssigned}/${numPlayers} joueurs assignés`);
                alert(`Erreur de répartition dans Division ${division}: seulement ${totalAssigned}/${numPlayers} joueurs assignés!`);
                continue;
            }

            // Générer les matchs pour chaque terrain
            let totalMatchesGenerated = 0;

            courtAssignments.forEach(courtAssignment => {
                const { court, players, numPlayers: courtNumPlayers } = courtAssignment;

                // Vérifier si on a un schéma pour ce nombre de joueurs
                const schema = schemas[courtNumPlayers];
                if (!schema) {
                    console.warn(`Pas de schéma pour ${courtNumPlayers} joueurs sur terrain ${court}`);
                    return;
                }

                // Générer les matchs selon le schéma
                const byePlayers = [];
                if (courtNumPlayers === 9) {
                    const byeMap = [8, 7, 5, 4];
                    byeMap.forEach((playerIdx, tourIdx) => {
                        if (!byePlayers[tourIdx]) byePlayers[tourIdx] = [];
                        byePlayers[tourIdx].push(players[playerIdx]);
                    });
                }

                schema.forEach((tour, tourIndex) => {
                    tour.forEach(([idx1, idx2]) => {
                        if (idx1 < players.length && idx2 < players.length) {
                            const matchData = {
                                player1: players[idx1],
                                player2: players[idx2],
                                tour: tourIndex + 1,
                                court: court,
                                score1: '',
                                score2: '',
                                completed: false,
                                winner: null,
                                timesPlayedBefore: 0,
                                isRematch: false
                            };

                            dayData.matches[division].push(matchData);
                            totalMatchesGenerated++;
                        }
                    });

                    // Ajouter les BYE pour ce tour (si applicable)
                    if (byePlayers[tourIndex] && byePlayers[tourIndex].length > 0) {
                        byePlayers[tourIndex].forEach(player => {
                            const byeMatch = {
                                player1: player,
                                player2: 'BYE',
                                tour: tourIndex + 1,
                                court: court,
                                score1: '',
                                score2: '',
                                completed: true,
                                winner: player,
                                isBye: true
                            };
                            dayData.matches[division].push(byeMatch);
                        });
                    }
                });
            });

            reportDetails.divisions[division] = {
                players: numPlayers,
                courts: numCourts,
                playersPerCourt: playersPerCourt,
                matches: totalMatchesGenerated,
                courtAssignments: courtAssignments
            };

            reportDetails.totalMatches += totalMatchesGenerated;
        }

        updateMatchesDisplay(dayNumber);
        updateStats(dayNumber);
        saveToLocalStorage();

        let summary = `✅ Matchs générés par terrain (4-10 joueurs/terrain) !\n\n`;

        for (let division = 1; division <= numDivisions; division++) {
            if (reportDetails.divisions[division]) {
                const divStats = reportDetails.divisions[division];

                // Vérifier que tous les joueurs sont bien assignés
                const totalPlayersAssigned = divStats.courtAssignments.reduce((sum, ca) => sum + ca.numPlayers, 0);
                const allPlayersAssigned = totalPlayersAssigned === divStats.players;

                summary += `Division ${division}:\n`;
                summary += `  👥 ${divStats.players} joueurs ${allPlayersAssigned ? '✓ TOUS' : '⚠️ ATTENTION'} répartis sur ${divStats.courts} terrains\n`;
                summary += `  ⚔️ ${divStats.matches} matchs générés\n\n`;

                divStats.courtAssignments.forEach(ca => {
                    summary += `  • Terrain ${ca.court}: ${ca.numPlayers} joueurs (${ca.players.slice(0, 3).join(', ')}${ca.players.length > 3 ? '...' : ''})\n`;
                });
                summary += '\n';
            }
        }

        summary += `📊 Total: ${reportDetails.totalMatches} matchs générés\n`;
        summary += `✅ Tous les joueurs ont été assignés à un terrain !`;
        alert(summary);
    }
    window.generateMatchesByCourtOptimized = generateMatchesByCourtOptimized;

    // SYSTÈME SWISS SYSTEM
    function generateMatchesSwissSystem(dayNumber) {
        if (!dayNumber) {
            dayNumber = championship.currentDay;
        }

        const dayData = championship.days[dayNumber];
        if (!dayData) return;

        if (dayData.pools && dayData.pools.enabled) {
            alert('⚠️ Mode Poules activé !');
            return;
        }

        // Vérifier si des matchs existent déjà pour ce jour
        const numDivisions = getNumberOfDivisions();
        let hasExistingMatches = false;
        for (let division = 1; division <= numDivisions; division++) {
            if (dayData.matches[division] && dayData.matches[division].length > 0) {
                hasExistingMatches = true;
                break;
            }
        }

        if (!hasExistingMatches) {
            alert('⚠️ Swiss System nécessite un classement existant.\n\nPour la première journée, utilisez la génération Round-Robin classique.');
            return;
        }

        let reportDetails = {
            totalMatches: 0,
            divisions: {}
        };

        for (let division = 1; division <= numDivisions; division++) {
            const divisionPlayers = [...(dayData.players[division] || [])];

            if (divisionPlayers.length < 2) {
                continue;
            }

            // Calculer le classement actuel des joueurs
            const playerStats = new Map();
            divisionPlayers.forEach(player => {
                playerStats.set(player, {
                    name: player,
                    points: 0,
                    wins: 0,
                    losses: 0,
                    played: 0,
                    opponents: new Set()
                });
            });

            // Analyser tous les matchs précédents
            Object.keys(championship.days).forEach(day => {
                const dayNum = parseInt(day);
                if (championship.days[dayNum] && championship.days[dayNum].matches[division]) {
                    championship.days[dayNum].matches[division].forEach(match => {
                        if (match.completed && divisionPlayers.includes(match.player1) && divisionPlayers.includes(match.player2)) {
                            const p1Stats = playerStats.get(match.player1);
                            const p2Stats = playerStats.get(match.player2);

                            if (p1Stats && p2Stats) {
                                p1Stats.played++;
                                p2Stats.played++;
                                p1Stats.opponents.add(match.player2);
                                p2Stats.opponents.add(match.player1);

                                if (match.winner === match.player1) {
                                    p1Stats.wins++;
                                    p1Stats.points += 3;
                                    p2Stats.losses++;
                                } else if (match.winner === match.player2) {
                                    p2Stats.wins++;
                                    p2Stats.points += 3;
                                    p1Stats.losses++;
                                } else {
                                    // Match nul
                                    p1Stats.points += 1;
                                    p2Stats.points += 1;
                                }
                            }
                        }
                    });
                }
            });

            // Trier les joueurs par points (système Swiss)
            const sortedPlayers = Array.from(playerStats.values()).sort((a, b) => {
                if (b.points !== a.points) return b.points - a.points;
                if (b.wins !== a.wins) return b.wins - a.wins;
                return a.played - b.played;
            });

            // Générer les paires selon le système Swiss (joueurs de niveau similaire)
            const matches = [];
            const paired = new Set();

            for (let i = 0; i < sortedPlayers.length; i++) {
                if (paired.has(sortedPlayers[i].name)) continue;

                // Chercher le meilleur adversaire disponible
                let opponent = null;
                for (let j = i + 1; j < sortedPlayers.length; j++) {
                    if (paired.has(sortedPlayers[j].name)) continue;

                    // Préférer un adversaire qu'on n'a jamais affronté
                    if (!sortedPlayers[i].opponents.has(sortedPlayers[j].name)) {
                        opponent = sortedPlayers[j];
                        break;
                    }
                }

                // Si tous les adversaires ont déjà été affrontés, prendre le premier disponible
                if (!opponent) {
                    for (let j = i + 1; j < sortedPlayers.length; j++) {
                        if (!paired.has(sortedPlayers[j].name)) {
                            opponent = sortedPlayers[j];
                            break;
                        }
                    }
                }

                if (opponent) {
                    matches.push({
                        player1: sortedPlayers[i].name,
                        player2: opponent.name,
                        tour: 1,
                        score1: '',
                        score2: '',
                        completed: false,
                        winner: null,
                        p1Points: sortedPlayers[i].points,
                        p2Points: opponent.points
                    });
                    paired.add(sortedPlayers[i].name);
                    paired.add(opponent.name);
                }
            }

            dayData.matches[division] = matches;
            reportDetails.totalMatches += matches.length;
            reportDetails.divisions[division] = {
                players: divisionPlayers.length,
                matches: matches.length
            };
        }

        updateMatchesDisplay(dayNumber);
        updateStats(dayNumber);
        saveToLocalStorage();

        let summary = `✅ Matchs générés (Swiss System) !\n\n`;
        summary += `Les joueurs sont appariés selon leur classement actuel.\n\n`;

        for (let division = 1; division <= numDivisions; division++) {
            if (reportDetails.divisions[division]) {
                const divStats = reportDetails.divisions[division];
                summary += `Division ${division}: ${divStats.matches} matchs\n`;
            }
        }

        alert(summary);
    }
    window.generateMatchesSwissSystem = generateMatchesSwissSystem;

    // AFFICHAGE DES MATCHS
    function updateMatchesDisplay(dayNumber) {
        const dayData = championship.days[dayNumber];
        if (!dayData) return;

        const numDivisions = getNumberOfDivisions();
        const numCourts = getNumberOfCourts();

        for (let division = 1; division <= numDivisions; division++) {
            const container = document.getElementById(`division${dayNumber}-${division}-matches`);
            if (!container) continue;

            if (!dayData.matches[division] || dayData.matches[division].length === 0) {
                container.innerHTML = '';
                continue;
            }

            const matchsByTour = {};
            dayData.matches[division].forEach(match => {
                if (!matchsByTour[match.tour]) {
                    matchsByTour[match.tour] = [];
                }
                matchsByTour[match.tour].push(match);
            });

            let html = '';

            for (let tour = 1; tour <= 4; tour++) {
                if (matchsByTour[tour] && matchsByTour[tour].length > 0) {
                    const tourMatches = matchsByTour[tour];
                    const completedMatches = tourMatches.filter(m => m.completed).length;
                    const totalMatches = tourMatches.length;

                    html += `
                        <div class="tour-section">
                            <div class="tour-header" onclick="toggleTour(${dayNumber}, ${division}, ${tour})">
                                <div class="tour-title">🎯 Tour ${tour}</div>
                                <div class="tour-progress" id="progress-d${dayNumber}-div${division}-t${tour}">${completedMatches}/${totalMatches} terminés</div>
                            </div>
                            <div class="tour-matches" id="tour${dayNumber}-${division}-${tour}">
                    `;

                    // Obtenir la plage de terrains pour cette division
                    const divisionCourts = getCourtsForDivision(division);

                    // Organiser les matchs par terrain
                    const matchesByCourt = {};
                    tourMatches.forEach((match, idx) => {
                        // Assigner automatiquement un terrain si pas déjà fait
                        if (!match.court) {
                            // Calculer le numéro de terrain relatif (0 à count-1)
                            const relativeCourtIndex = idx % divisionCourts.count;
                            // Convertir en numéro de terrain absolu
                            match.court = divisionCourts.first + relativeCourtIndex;
                        }
                        if (!matchesByCourt[match.court]) {
                            matchesByCourt[match.court] = [];
                        }
                        matchesByCourt[match.court].push(match);
                    });

                    // Afficher par terrain (uniquement les terrains de cette division)
                    for (let court = divisionCourts.first; court <= divisionCourts.last; court++) {
                        const courtMatches = matchesByCourt[court] || [];
                        if (courtMatches.length === 0) continue;

                        html += `
                            <div style="margin-bottom: 15px; padding: 10px; background: linear-gradient(135deg, #f8f9fa, #e9ecef); border-radius: 8px; border-left: 4px solid #3498db;">
                                <div style="font-weight: bold; color: #2c3e50; margin-bottom: 10px; font-size: 16px;">
                                    🎾 Terrain ${court}
                                </div>
                        `;

                        courtMatches.forEach((match, matchIndex) => {
                        const globalIndex = dayData.matches[division].indexOf(match);
                        const matchStatus = match.completed ? 'completed' : 'pending';
                        const statusClass = match.completed ? 'status-completed' : 'status-pending';
                        const statusText = match.completed ? 'Terminé' : 'En cours';
                        
                        const score1 = match.score1 || 0;
                        const score2 = match.score2 || 0;
                        const collapsedSummary = match.completed ? `${match.player1} <span class="collapse-score">${score1}-${score2}</span> ${match.player2}` : '';

                        html += `
                            <div class="match ${matchStatus}" data-match-id="d${dayNumber}-div${division}-m${globalIndex}">
                                ${match.completed || collapsedSummary ? `<div class="match-header" onclick="toggleMatchCollapse(this.parentElement)" style="cursor: pointer;">
                                    ${match.completed ? `<div class="player-names">${collapsedSummary}</div>` : ''}
                                    ${match.completed ? `<div class="match-status ${statusClass}">${statusText}</div>` : ''}
                                </div>` : ''}
                                <div class="sets-container">
                                    <div class="set">
                                        <div class="set-scores" style="display: flex; gap: 8px; justify-content: center; align-items: center;">
                                            <span style="font-size: 11px; color: #2c3e50; font-weight: 600;">${match.player1}</span>
                                            <input type="number" class="score-input"
                                                   placeholder="0" min="0"
                                                   value="${match.score1 || ''}"
                                                   onchange="updateMatchScore(${dayNumber}, ${division}, ${globalIndex}, 'score1', this.value)"
                                                   onkeydown="handleEnterKey(event, ${dayNumber}, ${division}, ${globalIndex})">
                                            <span class="score-separator">-</span>
                                            <input type="number" class="score-input"
                                                   placeholder="0" min="0"
                                                   value="${match.score2 || ''}"
                                                   onchange="updateMatchScore(${dayNumber}, ${division}, ${globalIndex}, 'score2', this.value)"
                                                   onkeydown="handleEnterKey(event, ${dayNumber}, ${division}, ${globalIndex})">
                                            <span style="font-size: 11px; color: #2c3e50; font-weight: 600;">${match.player2}</span>
                                        </div>
                                    </div>
                                </div>
                        `;

                        if (match.completed && match.winner) {
                            html += `
                                <div class="match-result result-completed">
                                    🏆 ${match.winner} remporte le match (${score1}-${score2})
                                </div>
                            `;
                        }

                        html += `
                            </div>
                        `;
                        });

                        html += `
                            </div>
                        `;
                    }

                    html += `
                            </div>
                        </div>
                    `;
                }
            }

            container.innerHTML = html;
            
            setTimeout(() => {
                for (let div = 1; div <= numDivisions; div++) {
                    const firstTour = document.getElementById(`tour${dayNumber}-${div}-1`);
                    if (firstTour) {
                        firstTour.classList.add('active');
                    }
                }
            }, 100);
        }
    }

    function toggleTour(dayNumber, division, tour) {
        const tourElement = document.getElementById(`tour${dayNumber}-${division}-${tour}`);
        if (tourElement) {
            tourElement.classList.toggle('active');
        }
    }
    window.toggleTour = toggleTour;

    function togglePlayersList(dayNumber, division) {
        const container = document.getElementById(`players-list-container-${dayNumber}-${division}`);
        const toggleIcon = document.getElementById(`players-list-toggle-${dayNumber}-${division}`);
        if (container) {
            container.classList.toggle('active');
            if (toggleIcon) {
                toggleIcon.textContent = container.classList.contains('active') ? '▼' : '▶';
            }
        }
    }
    window.togglePlayersList = togglePlayersList;

    function toggleMatchCollapse(matchElement) {
        if (!matchElement) return;
        matchElement.classList.toggle('collapsed');
    }
    window.toggleMatchCollapse = toggleMatchCollapse;

    function updateSetScore(dayNumber, division, matchIndex, setIndex, scoreField, value) {
        championship.days[dayNumber].matches[division][matchIndex].sets[setIndex][scoreField] = value;
        saveToLocalStorage();
    }
    window.updateSetScore = updateSetScore;

    function updateMatchScore(dayNumber, division, matchIndex, scoreField, value) {
        championship.days[dayNumber].matches[division][matchIndex][scoreField] = value;
        saveToLocalStorage();
    }
    window.updateMatchScore = updateMatchScore;

    function handleEnterKey(event, dayNumber, division, matchIndex) {
        const match = championship.days[dayNumber].matches[division][matchIndex];
        const shouldValidate = event.key === 'Enter' ||
                               (event.key === 'Tab' && match.score1 !== undefined && match.score1 !== '' &&
                                match.score2 !== undefined && match.score2 !== '');

        if (shouldValidate) {
            if (event.key === 'Tab' && (match.score1 === undefined || match.score1 === '' ||
                                         match.score2 === undefined || match.score2 === '')) {
                return; // Laisser Tab naviguer normalement si scores incomplets
            }

            if (event.key === 'Tab') {
                event.preventDefault(); // Empêcher navigation Tab si on valide
            }

            const wasCompleted = match.completed;

            checkMatchCompletion(dayNumber, division, matchIndex);

            const isNowCompleted = championship.days[dayNumber].matches[division][matchIndex].completed;

            updateSingleMatchDisplay(dayNumber, division, matchIndex);
            saveToLocalStorage();

            const matchElement = document.querySelector(`[data-match-id="d${dayNumber}-div${division}-m${matchIndex}"]`);
            if (matchElement) {
                matchElement.style.transform = 'scale(1.02)';
                matchElement.style.boxShadow = '0 5px 20px rgba(27, 164, 60, 0.4)';
                matchElement.style.transition = 'all 0.3s ease';

                setTimeout(() => {
                    matchElement.style.transform = '';
                    matchElement.style.boxShadow = '';
                }, 400);
            }

            if (!wasCompleted && isNowCompleted) {
                setTimeout(() => {
                    if (matchElement) {
                        matchElement.style.background = '#d5f4e6';
                        matchElement.style.borderColor = '#27ae60';
                    }
                }, 200);

                showNotification(`Match terminé: ${championship.days[dayNumber].matches[division][matchIndex].winner} gagne!`, 'success');

                // Auto-collapse le match terminé après un délai
                setTimeout(() => {
                    if (matchElement && !matchElement.classList.contains('collapsed')) {
                        toggleMatchCollapse(matchElement);
                    }
                }, 800);
            }
        }
    }
    window.handleEnterKey = handleEnterKey;

    function updateSingleMatchDisplay(dayNumber, division, matchIndex) {
        const match = championship.days[dayNumber].matches[division][matchIndex];
        const matchElement = document.querySelector(`[data-match-id="d${dayNumber}-div${division}-m${matchIndex}"]`);

        if (!matchElement) return;

        const score1 = match.score1 || 0;
        const score2 = match.score2 || 0;

        if (match.completed) {
            matchElement.classList.add('completed');

            // Créer ou mettre à jour le header
            let matchHeader = matchElement.querySelector('.match-header');
            if (!matchHeader) {
                matchHeader = document.createElement('div');
                matchHeader.className = 'match-header';
                // Insérer le header au début de matchElement, avant sets-container
                const setsContainer = matchElement.querySelector('.sets-container');
                matchElement.insertBefore(matchHeader, setsContainer);
            }

            // Ajouter onclick sur le header pour toggle collapse
            if (!matchHeader.hasAttribute('onclick')) {
                matchHeader.setAttribute('onclick', 'toggleMatchCollapse(this.parentElement)');
                matchHeader.style.cursor = 'pointer';
            }

            // Créer ou mettre à jour player-names
            let playerNamesElement = matchHeader.querySelector('.player-names');
            if (!playerNamesElement) {
                playerNamesElement = document.createElement('div');
                playerNamesElement.className = 'player-names';
                matchHeader.appendChild(playerNamesElement);
            }
            // Mettre à jour le contenu avec le format collapsed
            playerNamesElement.innerHTML = `${match.player1} <span class="collapse-score">${score1}-${score2}</span> ${match.player2}`;

            // Créer ou mettre à jour le badge de statut
            let statusElement = matchHeader.querySelector('.match-status');
            if (!statusElement) {
                statusElement = document.createElement('div');
                statusElement.className = 'match-status status-completed';
                matchHeader.appendChild(statusElement);
            } else {
                statusElement.className = 'match-status status-completed';
            }
            statusElement.textContent = 'Terminé';

            // Gérer le résultat - créer s'il n'existe pas
            if (match.winner) {
                let resultElement = matchElement.querySelector('.match-result');
                if (!resultElement) {
                    resultElement = document.createElement('div');
                    resultElement.className = 'match-result result-completed';
                    matchElement.appendChild(resultElement);
                } else {
                    resultElement.className = 'match-result result-completed';
                }
                resultElement.textContent = `🏆 ${match.winner} remporte le match (${score1}-${score2})`;
            }
        } else {
            // Match non terminé - supprimer header et résultat s'ils existent
            matchElement.classList.remove('completed');

            const matchHeader = matchElement.querySelector('.match-header');
            if (matchHeader) {
                matchHeader.remove();
            }

            const resultElement = matchElement.querySelector('.match-result');
            if (resultElement) {
                resultElement.remove();
            }
        }
        
        // Plus besoin de désactiver des sets car il n'y a plus que 2 scores
        
        updateTourProgress(dayNumber, division, match.tour);
    }

    function updateTourProgress(dayNumber, division, tour) {
        const progressElement = document.getElementById(`progress-d${dayNumber}-div${division}-t${tour}`);
        if (!progressElement) return;
        
        const tourMatches = championship.days[dayNumber].matches[division].filter(m => m.tour === tour);
        const completedMatches = tourMatches.filter(m => m.completed).length;
        const totalMatches = tourMatches.length;
        
        progressElement.textContent = `${completedMatches}/${totalMatches} terminés`;
        
        progressElement.style.background = 'rgba(46, 204, 113, 0.3)';
        setTimeout(() => {
            progressElement.style.background = 'rgba(255,255,255,0.2)';
        }, 500);
    }

    function checkMatchCompletion(dayNumber, division, matchIndex) {
        const match = championship.days[dayNumber].matches[division][matchIndex];

        // Si l'ancien format avec sets existe, le convertir
        if (match.sets && !match.hasOwnProperty('score1')) {
            let player1Sets = 0;
            let player2Sets = 0;
            match.sets.forEach((set) => {
                if (set.player1Score !== '' && set.player2Score !== '') {
                    const score1 = parseInt(set.player1Score);
                    const score2 = parseInt(set.player2Score);
                    if (score1 > score2) player1Sets++;
                    else if (score2 > score1) player2Sets++;
                }
            });
            match.score1 = player1Sets;
            match.score2 = player2Sets;
            delete match.sets;
        }

        match.completed = false;
        match.winner = null;

        if (match.score1 !== '' && match.score2 !== '') {
            const score1 = parseInt(match.score1);
            const score2 = parseInt(match.score2);

            if (score1 > score2) {
                match.completed = true;
                match.winner = match.player1;
            } else if (score2 > score1) {
                match.completed = true;
                match.winner = match.player2;
            } else {
                // En cas d'égalité, le match est terminé mais sans vainqueur
                match.completed = true;
                match.winner = null;
            }
        }
    }

    // GESTION DES FICHIERS
    function handleFileImport(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        // Vérifier si XLSX est disponible
        if (typeof XLSX === 'undefined') {
            alert('La bibliothèque XLSX n\'est pas chargée. Seuls les fichiers CSV sont supportés pour le moment.');
            
            // Traiter seulement les CSV
            if (!file.name.endsWith('.csv')) {
                alert('Veuillez utiliser un fichier CSV (.csv) pour l\'instant.');
                return;
            }
            
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const text = e.target.result;
                    const data = parseCSV(text);
                    const targetDay = parseInt(document.getElementById('fileTargetDay').value);
                    importPlayersFromData(data, targetDay);
                } catch (error) {
                    alert('Erreur lors de la lecture du fichier : ' + error.message);
                }
            };
            reader.readAsText(file);
            return;
        }
        
        const targetDay = parseInt(document.getElementById('fileTargetDay').value);
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                let data;
                
                if (file.name.endsWith('.csv')) {
                    const text = e.target.result;
                    data = parseCSV(text);
                } else {
                    const workbook = XLSX.read(e.target.result, { type: 'binary' });
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
                }
                
                importPlayersFromData(data, targetDay);
                
            } catch (error) {
                alert('Erreur lors de la lecture du fichier : ' + error.message);
            }
        };
        
        if (file.name.endsWith('.csv')) {
            reader.readAsText(file);
        } else {
            reader.readAsBinaryString(file);
        }
    }

    function parseCSV(text) {
        const lines = text.split('\n');
        return lines.map(line => {
            return line.split(/[,;]/).map(cell => cell.trim().replace(/^"(.*)"$/, '$1'));
        }).filter(row => row[0] && row[0].trim());
    }

    function importPlayersFromData(data, dayNumber) {
        let imported = 0;
        let errors = [];
        
        data.forEach((row, index) => {
            if (row.length >= 2) {
                const name = String(row[0]).trim();
                const division = parseInt(row[1]);
                
                if (name && [1, 2, 3].includes(division)) {
                    if (!championship.days[dayNumber]) {
                        championship.days[dayNumber] = {
                            players: { 1: [], 2: [], 3: [] },
                            matches: { 1: [], 2: [], 3: [] }
                        };
                    }
                    if (!championship.days[dayNumber].players[division].includes(name)) {
                        championship.days[dayNumber].players[division].push(name);
                        imported++;
                    }
                } else {
                    errors.push(`Ligne ${index + 1}: "${row[0]}" division "${row[1]}" invalide`);
                }
            }
        });
        
        updatePlayersDisplay(dayNumber);
        updateDaySelectors();
        saveToLocalStorage();
        
        let message = `✅ ${imported} joueurs importés vers la Journée ${dayNumber} !`;
        if (errors.length > 0 && errors.length < 5) {
            message += '\n\n⚠️ Erreurs:\n' + errors.slice(0, 5).join('\n');
        } else if (errors.length >= 5) {
            message += `\n\n⚠️ ${errors.length} erreurs détectées. Vérifiez le format.`;
        }
        
        alert(message);
        document.getElementById('fileInput').value = '';
    }

    function copyPlayersFromPreviousDay(dayNumber) {
        const previousDay = dayNumber - 1;
        
        if (!championship.days[previousDay]) {
            alert(`Aucune journée ${previousDay} trouvée`);
            return;
        }
        
        const prevPlayers = championship.days[previousDay].players;
        let totalPlayers = 0;
        
        for (let division = 1; division <= 3; division++) {
            totalPlayers += prevPlayers[division].length;
        }
        
        if (totalPlayers === 0) {
            alert(`Aucun joueur à copier depuis la Journée ${previousDay}`);
            return;
        }
        
        const confirmMsg = `Copier les joueurs de la Journée ${previousDay} vers la Journée ${dayNumber} ?\n\n` +
                          `Division 1: ${prevPlayers[1].length} joueurs\n` +
                          `Division 2: ${prevPlayers[2].length} joueurs\n` +
                          `Division 3: ${prevPlayers[3].length} joueurs\n\n` +
                          `Total: ${totalPlayers} joueurs`;
        
        if (confirm(confirmMsg)) {
            for (let division = 1; division <= 3; division++) {
                championship.days[dayNumber].players[division] = [...prevPlayers[division]];
            }
            
            updatePlayersDisplay(dayNumber);
            saveToLocalStorage();
            
            showNotification(`${totalPlayers} joueurs copiés de J${previousDay} vers J${dayNumber}`, 'success');
        }
    }
    window.copyPlayersFromPreviousDay = copyPlayersFromPreviousDay;

    function clearDayData(dayNumber) {
        const dayData = championship.days[dayNumber];
        if (!dayData) return;
        
        let totalPlayers = 0;
        let totalMatches = 0;
        
        for (let division = 1; division <= 3; division++) {
            totalPlayers += dayData.players[division].length;
            totalMatches += dayData.matches[division].length;
        }
        
        if (totalPlayers === 0 && totalMatches === 0) {
            alert(`La Journée ${dayNumber} est déjà vide`);
            return;
        }
        
        const confirmMsg = `Vider complètement la Journée ${dayNumber} ?\n\n` +
                          `Cela supprimera :\n` +
                          `• ${totalPlayers} joueurs\n` +
                          `• ${totalMatches} matchs\n` +
                          `• Tous les scores\n\n` +
                          `Cette action est irréversible !`;
        
        if (confirm(confirmMsg)) {
            championship.days[dayNumber] = {
                players: { 1: [], 2: [], 3: [] },
                matches: { 1: [], 2: [], 3: [] }
            };
            
            updatePlayersDisplay(dayNumber);
            updateMatchesDisplay(dayNumber);
            updateStats(dayNumber);
            const rankingsEl = document.getElementById(`rankings-${dayNumber}`);
            if (rankingsEl) rankingsEl.style.display = 'none';
            
            saveToLocalStorage();
            showNotification(`Journée ${dayNumber} vidée`, 'warning');
        }
    }
    window.clearDayData = clearDayData;

    function initializeDivisionsDisplay(dayNumber = 1) {
        const divisionsContainer = document.getElementById(`divisions-${dayNumber}`);
        if (!divisionsContainer) return;

        const numDivisions = getNumberOfDivisions();
        const medals = ['🥇', '🥈', '🥉', '🏅', '🎖️', '⭐'];

        let html = '';
        for (let i = 1; i <= numDivisions; i++) {
            const medal = medals[i - 1] || '📊';
            const playersCount = championship.days[dayNumber]?.players[i]?.length || 0;
            html += `
                <div class="division division-${i}">
                    <h3>${medal} Division ${i} <span style="font-size: 14px; color: #7f8c8d; font-weight: normal;">(${playersCount} joueur${playersCount !== 1 ? 's' : ''})</span></h3>
                    <div class="players-list-header" onclick="togglePlayersList(${dayNumber}, ${i})" style="
                        padding: 8px 12px;
                        background: linear-gradient(135deg, #ecf0f1, #d5dbdb);
                        border-radius: 6px;
                        margin-bottom: 10px;
                        cursor: pointer;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        transition: all 0.3s ease;
                    ">
                        <span style="font-weight: 600; color: #2c3e50; font-size: 13px;">👥 Liste des joueurs</span>
                        <span id="players-list-toggle-${dayNumber}-${i}" style="font-size: 12px; color: #7f8c8d;">▼</span>
                    </div>
                    <div class="players-list-container active" id="players-list-container-${dayNumber}-${i}" style="transition: all 0.3s ease;">
                        <div class="players-list" id="division${dayNumber}-${i}-players">
                            <div class="empty-state">Aucun joueur</div>
                        </div>
                    </div>
                    <div class="matches-container" id="division${dayNumber}-${i}-matches"></div>
                </div>
            `;
        }

        divisionsContainer.innerHTML = html;
    }

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

        // Ajouter les matchs de phase finale si présents
        if (dayData.pools && dayData.pools.divisions[division] && dayData.pools.divisions[division].finalPhase) {
            const finalMatches = dayData.pools.divisions[division].finalPhase || [];
            const playerFinalMatches = finalMatches.filter(match =>
                match.player1 === playerName || match.player2 === playerName
            );
            playerMatches = [...playerMatches, ...playerFinalMatches];
        }

        let wins = 0;
        let losses = 0;
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

                if (match.winner === playerName) {
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
        const totalPoints = wins * 3 + losses * 1;

        return {
            matchesPlayed,
            wins,
            losses,
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
                <div class="overview-card">
                    <div class="overview-number">${stats.wins}</div>
                    <div class="overview-label">Victoires</div>
                </div>
                <div class="overview-card">
                    <div class="overview-number">${stats.winRate}%</div>
                    <div class="overview-label">% Victoires</div>
                </div>
                <div class="overview-card">
                    <div class="overview-number">${stats.pointsWon}/${stats.pointsLost}</div>
                    <div class="overview-label">Points Pour/Contre</div>
                </div>
                <div class="overview-card">
                    <div class="overview-number">${stats.pointsWon - stats.pointsLost > 0 ? '+' : ''}${stats.pointsWon - stats.pointsLost}</div>
                    <div class="overview-label">Différence</div>
                </div>
                <div class="overview-card">
                    <div class="overview-number">${stats.totalPoints}</div>
                    <div class="overview-label">Points journée</div>
                </div>
            `;
        }
        
        let matchesHtml = '';
        stats.matches.forEach(match => {
            const isPlayer1 = match.player1 === playerName;
            const opponent = isPlayer1 ? match.player2 : match.player1;
            const resultClass = match.completed ? (match.winner === playerName ? 'win' : 'loss') : '';
            const resultText = match.completed ? (match.winner === playerName ? 'Victoire' : 'Défaite') : 'En cours';
            
            let setsScore = '';
            if (match.completed) {
                const score1 = parseInt(match.score1) || 0;
                const score2 = parseInt(match.score2) || 0;
                const playerScore = isPlayer1 ? score1 : score2;
                const opponentScore = isPlayer1 ? score2 : score1;
                setsScore = `(${playerScore}-${opponentScore})`;
            }
            
            matchesHtml += `
                <div class="history-match ${resultClass}">
                    <div>
                        <div class="history-opponent">VS ${opponent}</div>
                        <div style="font-size: 12px; color: #7f8c8d;">Tour ${match.tour}</div>
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

    function updateStats(dayNumber) {
        const dayData = championship.days[dayNumber];
        if (!dayData) return;
        
        let totalPlayers = 0;
        let totalMatches = 0;
        let completedMatches = 0;
        
        for (let division = 1; division <= 3; division++) {
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
                
                for (let division = 1; division <= 3; division++) {
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
        
        document.querySelectorAll(`#rankings-${dayNumber} .toggle-btn`).forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
        updateRankingsForDay(dayNumber, type);
    }
    window.showRankingsForDay = showRankingsForDay;

    function updateRankingsForDay(dayNumber, sortBy = 'points') {
        const dayData = championship.days[dayNumber];
        if (!dayData) return;

        console.log(`[updateRankingsForDay] Journée ${dayNumber}, sortBy: ${sortBy}`);

        let rankingsHtml = '';
        let hasAnyMatches = false;

        for (let division = 1; division <= 3; division++) {
            // Vérifier les matchs classiques
            const classicMatches = dayData.matches[division] || [];
            console.log(`[Division ${division}] Matchs classiques:`, classicMatches.length);
            if (classicMatches.some(match => {
                checkMatchCompletion(dayNumber, division, classicMatches.indexOf(match));
                return match.completed;
            })) {
                hasAnyMatches = true;
                console.log(`[Division ${division}] Matchs classiques terminés trouvés`);
                break;
            }

            // Vérifier les matchs de poules
            if (dayData.pools && dayData.pools.enabled && dayData.pools.divisions[division]) {
                const poolMatches = dayData.pools.divisions[division].matches || [];
                console.log(`[Division ${division}] Matchs de poules:`, poolMatches.length);
                const completedPoolMatches = poolMatches.filter(m => m.completed).length;
                console.log(`[Division ${division}] Matchs de poules terminés:`, completedPoolMatches);
                if (poolMatches.some(match => match.completed)) {
                    hasAnyMatches = true;
                    console.log(`[Division ${division}] Matchs de poules terminés trouvés`);
                    break;
                }
            }

            // Vérifier les matchs de phase finale
            if (dayData.pools && dayData.pools.divisions[division] && dayData.pools.divisions[division].finalPhase) {
                const finalMatches = dayData.pools.divisions[division].finalPhase || [];
                console.log(`[Division ${division}] Matchs de phase finale:`, finalMatches.length);
                if (finalMatches.some(match => match.completed)) {
                    hasAnyMatches = true;
                    console.log(`[Division ${division}] Matchs de phase finale terminés trouvés`);
                    break;
                }
            }
        }

        console.log(`[updateRankingsForDay] hasAnyMatches:`, hasAnyMatches);

        if (!hasAnyMatches) {
            alert(`Aucun match terminé dans la Journée ${dayNumber} pour établir un classement !`);
            return;
        }
        
        for (let division = 1; division <= 3; division++) {
            if (dayData.players[division].length === 0) continue;
            
           const playerStats = dayData.players[division].map(player => {
    const stats = calculatePlayerStats(dayNumber, division, player);
    return {
        name: player,
        ...stats,
        goalAveragePoints: stats.pointsWon - stats.pointsLost
    };
});

if (sortBy === 'points') {
    // Tri standard par points
    playerStats.sort((a, b) => {
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
    // Tri par % victoires
    playerStats.sort((a, b) => {
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
                    <th>Points</th>
                    <th>V/D</th>
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
    const escapedPlayerName = player.name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

    rankingsHtml += `
        <tr style="cursor: pointer;" onclick="showPlayerDetails(${dayNumber}, ${division}, '${escapedPlayerName}')">
            <td class="rank-position ${rankClass}">${index + 1}</td>
            <td style="font-weight: 600;">${player.name}</td>
            <td class="stat-value">${player.totalPoints}</td>
            <td>${player.wins}/${player.losses}</td>
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
        
        for (let division = 1; division <= 3; division++) {
            if (generalRanking.divisions[division].length === 0) continue;
            
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
                    <th>Points Total</th>
                    <th>Journées</th>
                    <th>V/D Global</th>
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
    const escapedPlayerName = player.name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

    rankingHtml += `
        <tr style="cursor: pointer;" onclick="showGeneralPlayerDetails('${escapedPlayerName}', ${division})">
            <td class="rank-position ${rankClass}">${index + 1}</td>
            <td style="font-weight: 600;">${player.name}</td>
            <td class="stat-value">${player.totalPoints}</td>
            <td>${player.daysPlayed}</td>
            <td>${player.totalWins}/${player.totalLosses}</td>
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
                divPlayers.forEach(player => totalPlayers.add(player));
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
        const generalRanking = {
            hasData: false,
            divisions: { 1: [], 2: [], 3: [] }
        };

        for (let division = 1; division <= 3; division++) {
            const playersData = {};
            const playerFirstAppearance = {}; // Première journée où chaque joueur apparaît

            // Étape 1: Déterminer la première apparition de chaque joueur
            Object.keys(championship.days).forEach(dayNumber => {
                const dayNum = parseInt(dayNumber);
                const dayData = championship.days[dayNum];

                dayData.players[division].forEach(playerName => {
                    if (!playerFirstAppearance[playerName] || dayNum < playerFirstAppearance[playerName]) {
                        playerFirstAppearance[playerName] = dayNum;
                    }
                });
            });

            // Étape 2: Calculer les stats pour chaque joueur
            Object.keys(championship.days).forEach(dayNumber => {
                const dayNum = parseInt(dayNumber);
                const dayData = championship.days[dayNum];

                dayData.players[division].forEach(playerName => {
                   if (!playersData[playerName]) {
    playersData[playerName] = {
        name: playerName,
        daysPlayed: 0,
        totalPoints: 0,
        totalWins: 0,
        totalLosses: 0,
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
        // 4 forfaits par journée manquée = 4 défaites (4 points)
        playersData[playerName].totalLosses += 4;
        playersData[playerName].totalPoints += 4; // 4 défaites × 1 point
        playersData[playerName].totalMatchesPlayed += 4;
        playersData[playerName].winRates.push(0); // 0% de victoire pour une journée forfait
    });
}

const dayStats = calculatePlayerStats(dayNum, division, playerName);
if (dayStats && dayStats.matchesPlayed > 0) {
    playersData[playerName].daysPlayed++;
    playersData[playerName].totalPoints += dayStats.totalPoints;
    playersData[playerName].totalWins += dayStats.wins;
    playersData[playerName].totalLosses += dayStats.losses;
    playersData[playerName].totalPointsWon += dayStats.pointsWon;
    playersData[playerName].totalPointsLost += dayStats.pointsLost;
    playersData[playerName].totalMatchesPlayed += dayStats.matchesPlayed;
    playersData[playerName].winRates.push(dayStats.winRate);

    generalRanking.hasData = true;
}
                });
            });
            
           const playersArray = Object.values(playersData)
    .filter(player => player.daysPlayed > 0)
    .map(player => ({
        ...player,
        avgWinRate: player.winRates.length > 0 ?
            Math.round(player.winRates.reduce((a, b) => a + b, 0) / player.winRates.length) : 0,
        goalAveragePoints: player.totalPointsWon - player.totalPointsLost
    }))
    .sort((a, b) => {
        // 1. Points totaux
        if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;

        // 2. Nombre de victoires
        if (b.totalWins !== a.totalWins) return b.totalWins - a.totalWins;

        // 3. Différence de points (PP - PC)
        if (b.goalAveragePoints !== a.goalAveragePoints) return b.goalAveragePoints - a.goalAveragePoints;

        // 4. Points Pour
        if (b.totalPointsWon !== a.totalPointsWon) return b.totalPointsWon - a.totalPointsWon;

        // 5. % victoires moyen
        if (b.avgWinRate !== a.avgWinRate) return b.avgWinRate - a.avgWinRate;

        // 6. Ordre alphabétique
        return a.name.localeCompare(b.name);
    });
            
            generalRanking.divisions[division] = playersArray;
        }
        
        return generalRanking;
    }

    function showGeneralPlayerDetails(playerName, division) {
        const playerHistory = [];

        // Déterminer la première journée où le joueur apparaît
        let firstAppearance = null;
        Object.keys(championship.days).forEach(dayNumber => {
            const dayNum = parseInt(dayNumber);
            const dayData = championship.days[dayNum];

            if (dayData.players[division].includes(playerName)) {
                if (firstAppearance === null || dayNum < firstAppearance) {
                    firstAppearance = dayNum;
                }
            }
        });

        const allDays = Object.keys(championship.days).map(d => parseInt(d)).sort((a, b) => a - b);

        // Ajouter des journées forfait pour les journées manquées avant la première apparition
        allDays.forEach(dayNum => {
            if (dayNum < firstAppearance) {
                playerHistory.push({
                    day: dayNum,
                    totalPoints: 4,
                    wins: 0,
                    losses: 4,
                    pointsWon: 0,
                    pointsLost: 0,
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

            if (dayData.players[division].includes(playerName)) {
                const dayStats = calculatePlayerStats(dayNum, division, playerName);
                if (dayStats && dayStats.matchesPlayed > 0) {
                    playerHistory.push({
                        day: dayNum,
                        ...dayStats,
                        isForfeit: false
                    });
                }
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
            totalLosses: acc.totalLosses + day.losses,
            totalPointsWon: acc.totalPointsWon + day.pointsWon,
            totalPointsLost: acc.totalPointsLost + day.pointsLost,
            totalMatchesPlayed: acc.totalMatchesPlayed + day.matchesPlayed
        }), {
            totalPoints: 0,
            totalWins: 0,
            totalLosses: 0,
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
                <div class="overview-card">
                    <div class="overview-number">${totals.totalWins}/${totals.totalLosses}</div>
                    <div class="overview-label">V/D Global</div>
                </div>
                <div class="overview-card">
                    <div class="overview-number">${avgWinRate}%</div>
                    <div class="overview-label">% Victoires</div>
                </div>
                <div class="overview-card">
                    <div class="overview-number">${totals.totalPointsWon}/${totals.totalPointsLost}</div>
                    <div class="overview-label">Points Pour/Contre</div>
                </div>
                <div class="overview-card">
                    <div class="overview-number">${diff > 0 ? '+' : ''}${diff}</div>
                    <div class="overview-label">Différence</div>
                </div>
            `;
        }
        
        let historyHtml = '<h4 style="color: #2c3e50; margin-bottom: 15px;">📈 Performance par journée</h4>';
        playerHistory.forEach(dayStats => {
            if (dayStats.isForfeit) {
                // Affichage spécial pour les journées forfaitées
                historyHtml += `
                    <div class="history-match" style="background: #fee; border-left: 4px solid #e74c3c; opacity: 0.7;">
                        <div>
                            <div class="history-opponent">Journée ${dayStats.day} ⚠️ FORFAIT</div>
                            <div style="font-size: 12px; color: #c0392b;">
                                Équipe absente - 4 défaites automatiques
                            </div>
                        </div>
                        <div class="history-score">
                            <div style="font-weight: bold; color: #e74c3c;">${dayStats.totalPoints} pts</div>
                            <div style="font-size: 12px;">0V/4D</div>
                        </div>
                    </div>
                `;
            } else {
                const performanceClass = dayStats.winRate >= 60 ? 'win' : dayStats.winRate >= 40 ? '' : 'loss';

                historyHtml += `
                    <div class="history-match ${performanceClass}">
                        <div>
                            <div class="history-opponent">Journée ${dayStats.day}</div>
                            <div style="font-size: 12px; color: #7f8c8d;">
                                ${dayStats.wins}V/${dayStats.losses}D - ${dayStats.matchesPlayed} matchs
                            </div>
                        </div>
                        <div class="history-score">
                            <div style="font-weight: bold;">${dayStats.totalPoints} pts</div>
                            <div style="font-size: 12px;">${dayStats.winRate}% vict.</div>
                        </div>
                    </div>
                `;
            }
        });
        
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
    console.log("Début de la fonction exportGeneralRankingToPDF");

    const generalRanking = calculateGeneralRanking();
    console.log("Classement général calculé:", generalRanking);

    const generalStats = calculateGeneralStats();
    console.log("Statistiques générales calculées:", generalStats);

    if (!generalRanking.hasData) {
        console.log("Aucun classement général disponible pour l'export PDF");
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
    for (let division = 1; division <= 3; division++) {
        if (generalRanking.divisions[division].length === 0) continue;

        const divisionIcon = division === 1 ? '🥇' : division === 2 ? '🥈' : '🥉';
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
                            <th>V/D</th>
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
                    <td style="text-align: center;">${player.totalWins}/${player.totalLosses}</td>
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

    console.log("Page d'export PDF créée avec succès");
    showNotification('Page d\'export PDF ouverte dans un nouvel onglet !', 'success');
}

// Assigner la fonction à l'objet window pour qu'elle soit accessible globalement
window.exportGeneralRankingToPDF = exportGeneralRankingToPDF;

    // EXPORT / IMPORT
    function exportChampionship() {
        const championshipData = {
            version: "2.0",
            exportDate: new Date().toISOString(),
            championshipName: `Championnat_${new Date().toISOString().slice(0,10)}`,
            championship: championship,
            stats: calculateChampionshipStats()
        };

        const dataStr = JSON.stringify(championshipData, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `championnat_${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showNotification('Championnat exporté avec succès !', 'success');
    }
    window.exportChampionship = exportChampionship;

    function calculateChampionshipStats() {
        let totalPlayers = new Set();
        let totalMatches = 0;
        let totalDays = Object.keys(championship.days).length;
        
        Object.values(championship.days).forEach(day => {
            Object.values(day.players).forEach(divPlayers => {
                divPlayers.forEach(player => totalPlayers.add(player));
            });
            Object.values(day.matches).forEach(divMatches => {
                totalMatches += divMatches.length;
            });
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
            importedChampionshipData = null;
        }
    }
    window.closeImportModal = closeImportModal;

    function handleChampionshipImport(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                
                if (data.championship) {
                    importedChampionshipData = data;
                } else if (data.players && data.matches) {
                    importedChampionshipData = {
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
                
                const importDate = new Date(importedChampionshipData.exportDate).toLocaleString('fr-FR');
                const stats = importedChampionshipData.stats || calculateStatsFromData(importedChampionshipData.championship);
                
                const confirmMsg = `Confirmer l'import du championnat ?\n\n` +
                                 `📅 Exporté le : ${importDate}\n` +
                                 `🏆 Journées : ${stats.totalDays || Object.keys(importedChampionshipData.championship.days).length}\n` +
                                 `👥 Joueurs : ${stats.totalPlayers || 'Non calculé'}\n` +
                                 `🎯 Matchs : ${stats.totalMatches || 'Non calculé'}\n\n` +
                                 `⚠️ Cette action remplacera complètement le championnat actuel`;
                
                if (confirm(confirmMsg)) {
                    processImport();
                } else {
                    closeImportModal();
                }
                
            } catch (error) {
                alert('Erreur lors de la lecture du fichier :\n' + error.message + '\n\nVérifiez que le fichier est un export valide.');
            }
        };
        
        reader.readAsText(file);
    }

    function calculateStatsFromData(championshipData) {
        let totalPlayers = new Set();
        let totalMatches = 0;
        
        Object.values(championshipData.days).forEach(day => {
            Object.values(day.players).forEach(divPlayers => {
                divPlayers.forEach(player => totalPlayers.add(player));
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
        if (!importedChampionshipData) {
            alert('Aucun fichier sélectionné');
            return;
        }

        try {
            championship = importedChampionshipData.championship;

            if (!championship.days) {
                championship.days = {};
            }
            if (!championship.currentDay) {
                championship.currentDay = 1;
            }

            // Appliquer la configuration (numDivisions, numCourts)
            if (championship.config) {
                if (championship.config.numDivisions) {
                    const numDivSelect = document.getElementById('numDivisions');
                    if (numDivSelect) numDivSelect.value = championship.config.numDivisions;
                }
                if (championship.config.numCourts) {
                    const numCourtsSelect = document.getElementById('numCourts');
                    if (numCourtsSelect) numCourtsSelect.value = championship.config.numCourts;
                }
            }

            // Utiliser le nombre de divisions de la configuration importée
            const numDivisions = championship.config?.numDivisions || 3;

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
                }
            });

            updateTabsDisplay();
            updateDaySelectors();
            initializeAllDaysContent();
            switchTab(championship.currentDay);

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

            closeImportModal();
            showNotification('Championnat importé avec succès !', 'success');

        } catch (error) {
            alert('Erreur lors de l\'import : ' + error.message);
        }
    }
    window.processImport = processImport;

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
                championship = {
                    currentDay: 1,
                    config: { ...config },
                    days: {
                        1: {
                            players: initializeDivisions(config.numberOfDivisions),
                            matches: initializeDivisions(config.numberOfDivisions)
                        }
                    }
                };

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

                    console.log("✅ LocalStorage complètement nettoyé (championnat + mode chrono)");
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

    window.clearAllData = clearAllData;

    // ======================================
    // GESTION DES MATCHS BYE MANUELS
    // ======================================

    function addByeMatchForPlayer(dayNumber, division, playerName) {
        console.log(`Ajout d'un match BYE pour ${playerName} en D${division}-J${dayNumber}`);
        
        const dayData = championship.days[dayNumber];
        if (!dayData) return;
        
        // Créer un match BYE (victoire automatique)
        const byeMatch = {
            player1: playerName,
            player2: "BYE",
            tour: 4, // Mettre au tour 4 par défaut
            score1: 3,
            score2: 0,
            completed: true,
            winner: playerName,
            isBye: true
        };
        
        dayData.matches[division].push(byeMatch);
        
        updateMatchesDisplay(dayNumber);
        updateStats(dayNumber);
        saveToLocalStorage();
        
        showNotification(`Match BYE ajouté pour ${playerName} en D${division}`, 'success');
    }
    window.addByeMatchForPlayer = addByeMatchForPlayer;

    function showByeManagementModal(dayNumber) {
        console.log(`Affichage modal gestion BYE pour J${dayNumber}`);
        
        const dayData = championship.days[dayNumber];
        if (!dayData) return;
        
        // Analyser qui a besoin de matchs BYE
        let playersNeedingBye = [];
        
        for (let division = 1; division <= 3; division++) {
            const players = dayData.players[division];
            
            players.forEach(player => {
                const playerMatches = dayData.matches[division].filter(m => 
                    m.player1 === player || m.player2 === player
                );
                
                const matchCount = playerMatches.length;
                
                if (matchCount < 4) {
                    playersNeedingBye.push({
                        name: player,
                        division: division,
                        currentMatches: matchCount,
                        missingMatches: 4 - matchCount
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
            const escapedPlayerName = player.name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
            modalHTML += `
                <tr style="border-bottom: 1px solid #ddd; ${index % 2 === 0 ? 'background: #f8f9fa;' : ''}">
                    <td style="padding: 10px; font-weight: bold;">${player.name}</td>
                    <td style="padding: 10px; text-align: center;">D${player.division}</td>
                    <td style="padding: 10px; text-align: center;">${player.currentMatches}/4</td>
                    <td style="padding: 10px; text-align: center; color: #e74c3c; font-weight: bold;">
                        ${player.missingMatches}
                    </td>
                    <td style="padding: 10px; text-align: center;">
                        <button onclick="addByeMatchForPlayer(${dayNumber}, ${player.division}, '${escapedPlayerName}'); closeByeModal();" 
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
                    Un match BYE donne automatiquement 3 points (victoire) + 2 sets gagnés au joueur.<br>
                    Cela compense l'absence de 4ème adversaire avec un nombre impair de joueurs.
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
                    <button onclick="addByeToAll(${dayNumber}); closeByeModal();" class="btn btn-success">
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
        console.log(`Ajout de BYE à tous les joueurs manquants pour J${dayNumber}`);
        
        const dayData = championship.days[dayNumber];
        if (!dayData) return;
        
        let addedCount = 0;
        
        for (let division = 1; division <= 3; division++) {
            const players = dayData.players[division];
            
            players.forEach(player => {
                const playerMatches = dayData.matches[division].filter(m => 
                    m.player1 === player || m.player2 === player
                );
                
                const matchCount = playerMatches.length;
                const missingMatches = 4 - matchCount;
                
                for (let i = 0; i < missingMatches; i++) {
                    addByeMatchForPlayer(dayNumber, division, player);
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
    console.log("Début de la fonction exportGeneralRankingToHTML");

    const generalRanking = calculateGeneralRanking();
    console.log("Classement général calculé:", generalRanking);

    const generalStats = calculateGeneralStats();
    console.log("Statistiques générales calculées:", generalStats);

    if (!generalRanking.hasData) {
        console.log("Aucun classement général disponible pour l'export HTML");
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
    for (let division = 1; division <= 3; division++) {
        if (generalRanking.divisions[division].length === 0) continue;

        const divisionIcon = division === 1 ? '🥇' : division === 2 ? '🥈' : '🥉';
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
                            <th>V/D</th>
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
                    <td>${player.totalWins}/${player.totalLosses}</td>
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
                    <p>Système de points: Victoire = 3pts, Défaite = 1pt</p>
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
    console.log("Fin de la fonction exportGeneralRankingToHTML");
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
        const selects = ['playerDivision', 'bulkDivision'];

        selects.forEach(selectId => {
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
        console.log("DOM chargé, début initialisation");

        // Charger les données sauvegardées
        if (loadFromLocalStorage()) {
            initializeDivisionSelects();
            updateTabsDisplay();
            updateDaySelectors();
            initializeAllDaysContent();
            switchTab(championship.currentDay);
        } else {
            initializeDivisionSelects();
            initializeDivisionsDisplay(1);
            updatePlayersDisplay(1);
            initializePoolsForDay(1);
        }

        setupEventListeners();
        console.log("Initialisation terminée");
    });

    // ======================================
// SYSTÈME DE POULES OPTIONNEL - EXTENSION SÉCURISÉE
// ======================================

// Extension de la structure de données (non-breaking)
function initializePoolSystem(dayNumber) {
    const dayData = championship.days[dayNumber];
    const numDivisions = championship.config.numDivisions || 3;

    // Ajouter la structure poules si elle n'existe pas
    if (!dayData.pools) {
        const divisions = {};
        for (let div = 1; div <= numDivisions; div++) {
            divisions[div] = { pools: [], matches: [] };
        }

        dayData.pools = {
            enabled: false,
            divisions: divisions
        };
    }

    // Garantir la compatibilité avec l'ancien système
    if (!dayData.matches) {
        const matches = {};
        for (let div = 1; div <= numDivisions; div++) {
            matches[div] = [];
        }
        dayData.matches = matches;
    }
}

// ======================================
// INTERFACE UTILISATEUR - ACTIVATION POULES
// ======================================

function addPoolToggleToInterface(dayNumber) {
    const section = document.querySelector(`#day-${dayNumber} .section`);
    if (!section) return;

    // Chercher la div qui contient les boutons de type de génération
    const generationTypeDiv = section.querySelector('div[style*="background: linear-gradient(135deg, #f8f9fa, #e9ecef)"]');
    if (!generationTypeDiv) return;

    const poolToggleHTML = `
        <!-- Bouton Mode Poules (masqué par défaut) -->
        <div style="text-align: center; margin: 15px auto; max-width: 800px;">
            <button class="btn" onclick="togglePoolSection(${dayNumber})" id="show-pool-btn-${dayNumber}" style="
                background: linear-gradient(135deg, #f39c12, #e67e22);
                color: white;
                padding: 8px 15px;
                font-size: 13px;
            ">
                🏊 Mode Poules Avancé
            </button>
        </div>

        <div class="pool-toggle-section" id="pool-toggle-${dayNumber}" style="
            background: linear-gradient(135deg, #fff8e1, #ffe082);
            border: 2px solid #f39c12;
            border-radius: 8px;
            padding: 15px;
            margin: 15px auto;
            max-width: 800px;
            display: none;
        ">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <h3 style="color: #e67e22; margin: 0; font-size: 16px;">
                    🏊 Mode Poules de Qualification
                </h3>
                <button onclick="togglePoolSection(${dayNumber})" style="
                    background: none;
                    border: none;
                    font-size: 24px;
                    cursor: pointer;
                    color: #e67e22;
                    padding: 0;
                    line-height: 1;
                ">×</button>
            </div>

            <p style="color: #856404; margin-bottom: 12px; font-size: 12px;">
                Créez des groupes, puis organisez des phases finales avec les meilleurs
            </p>

            <div class="toggle-container" style="margin-bottom: 12px; text-align: center;">
                <label class="toggle-switch" style="display: inline-flex; align-items: center; gap: 8px; cursor: pointer;">
                    <input type="checkbox" id="pool-enabled-${dayNumber}" onchange="togglePoolMode(${dayNumber})" style="
                        width: 18px; height: 18px; cursor: pointer; accent-color: #f39c12;
                    ">
                    <span style="font-weight: bold; color: #e67e22; font-size: 13px;">✓ Activer le mode Poules</span>
                </label>
            </div>

            <div id="pool-config-${dayNumber}" class="pool-config" style="display: none;">
                ${dayNumber > 1 ? `
                    <div style="background: rgba(52, 152, 219, 0.1); padding: 10px; border-radius: 6px; margin-bottom: 12px; border: 2px solid #3498db;">
                        <button class="btn" onclick="preFillFromGeneralRanking(${dayNumber})" style="
                            background: linear-gradient(135deg, #3498db, #2980b9);
                            color: white;
                            padding: 8px 12px;
                            font-size: 12px;
                            width: 100%;
                        ">
                            ⭐ Pré-remplir depuis le Classement Général
                        </button>
                        <p style="margin: 8px 0 0 0; font-size: 11px; color: #2c3e50; text-align: center;">
                            Les meilleurs joueurs du classement général seront répartis équitablement
                        </p>
                    </div>
                ` : ''}

                <div style="display: flex; gap: 10px; justify-content: center; align-items: center; flex-wrap: wrap; margin-bottom: 12px;">
                    <label style="display: flex; align-items: center; gap: 6px; font-size: 12px;">
                        <span style="font-weight: 600; color: #2c3e50;">Taille:</span>
                        <select id="pool-size-${dayNumber}" style="padding: 6px 8px; border: 2px solid #3498db; border-radius: 5px; font-size: 12px;">
                            <option value="4">4 joueurs/poule</option>
                            <option value="5">5 joueurs/poule</option>
                            <option value="6">6 joueurs/poule</option>
                        </select>
                    </label>

                    <label style="display: flex; align-items: center; gap: 6px; font-size: 12px;">
                        <span style="font-weight: 600; color: #2c3e50;">Qualifiés:</span>
                        <select id="qualified-per-pool-${dayNumber}" style="padding: 6px 8px; border: 2px solid #3498db; border-radius: 5px; font-size: 12px;">
                            <option value="2">2 premiers</option>
                            <option value="3">3 premiers</option>
                        </select>
                    </label>
                </div>

                <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
                    <button class="btn" onclick="generatePools(${dayNumber})" style="
                        background: linear-gradient(135deg, #27ae60, #2ecc71);
                        color: white;
                        padding: 8px 15px;
                        font-size: 12px;
                    ">
                        🎯 Générer Poules
                    </button>

                    <button class="btn" onclick="generateFinalPhase(${dayNumber})" style="
                        background: linear-gradient(135deg, #f39c12, #e67e22);
                        color: white;
                        padding: 8px 15px;
                        font-size: 12px;
                    " disabled id="final-phase-btn-${dayNumber}">
                        🏆 Phase Finale
                    </button>
                </div>
            </div>

            <div class="pool-info" style="
                background: rgba(255, 255, 255, 0.8);
                padding: 10px;
                border-radius: 6px;
                margin-top: 10px;
                font-size: 11px;
                color: #2c3e50;
                display: none;
            " id="pool-info-${dayNumber}">
                <strong>ℹ️ Comment ça marche :</strong><br>
                1. Les joueurs sont répartis en poules équilibrées<br>
                2. Chaque poule joue en round-robin<br>
                3. Les meilleurs se qualifient pour les phases finales<br>
                4. Tableaux à élimination directe pour désigner les champions
            </div>
        </div>
    `;

    generationTypeDiv.insertAdjacentHTML('afterend', poolToggleHTML);
}

// ======================================
// FONCTIONS DE GESTION DES POULES
// ======================================

// Toggle l'affichage de la section mode poules
function togglePoolSection(dayNumber) {
    const poolSection = document.getElementById(`pool-toggle-${dayNumber}`);
    const toggleBtn = document.getElementById(`show-pool-btn-${dayNumber}`);

    if (poolSection && toggleBtn) {
        if (poolSection.style.display === 'none') {
            poolSection.style.display = 'block';
            toggleBtn.textContent = '🏊 Masquer Mode Poules';
        } else {
            poolSection.style.display = 'none';
            toggleBtn.textContent = '🏊 Mode Poules Avancé';
        }
    }
}

function togglePoolMode(dayNumber) {
    const checkbox = document.getElementById(`pool-enabled-${dayNumber}`);
    const config = document.getElementById(`pool-config-${dayNumber}`);
    const info = document.getElementById(`pool-info-${dayNumber}`);
    const generateButton = document.querySelector(`#day-${dayNumber} button[onclick*="generateMatchesForDay"]`);
    
    initializePoolSystem(dayNumber);
    
    if (checkbox.checked) {
        // Activer mode poules
        championship.days[dayNumber].pools.enabled = true;
        config.style.display = 'block';
        info.style.display = 'block';
        
        // Désactiver l'ancien bouton
        if (generateButton) {
            generateButton.style.opacity = '0.5';
            generateButton.style.pointerEvents = 'none';
            generateButton.innerHTML = '⚠️ Mode Poules Activé - Utilisez les boutons ci-dessus';
        }
        
        showNotification('Mode Poules activé ! Utilisez "Générer les Poules" ci-dessus', 'info');
    } else {
        // Désactiver mode poules - Revenir au mode classique
        championship.days[dayNumber].pools.enabled = false;
        config.style.display = 'none';
        info.style.display = 'none';
        
        // Réactiver l'ancien bouton
        if (generateButton) {
            generateButton.style.opacity = '1';
            generateButton.style.pointerEvents = 'auto';
            generateButton.innerHTML = '🎯 Générer les Matchs (Round-Robin)';
        }
        
        // Nettoyer les poules existantes mais préserver les matchs round-robin classiques
        championship.days[dayNumber].pools.divisions = {
            1: { pools: [], matches: [] },
            2: { pools: [], matches: [] },
            3: { pools: [], matches: [] }
        };
        
        showNotification('Mode Poules désactivé - Retour au mode classique', 'warning');
    }
    
    saveToLocalStorage();
}

// Variable globale pour stocker le contexte du pré-remplissage
let preFillContext = null;

// Ouvrir le modal de sélection de stratégie
function preFillFromGeneralRanking(dayNumber) {
    if (dayNumber < 2) {
        showNotification('❌ Cette fonctionnalité n\'est disponible qu\'à partir de la Journée 2', 'error');
        return;
    }

    const dayData = championship.days[dayNumber];
    if (!dayData) {
        showNotification('❌ Journée introuvable', 'error');
        return;
    }

    // Récupérer le classement général (qui inclut maintenant les matchs de poules)
    const rankingData = calculateGeneralRanking();

    if (!rankingData || !rankingData.hasData) {
        showNotification('❌ Aucun classement disponible. Jouez d\'abord la Journée 1.', 'error');
        return;
    }

    // Stocker le contexte pour l'utiliser après la sélection de la stratégie
    preFillContext = {
        dayNumber: dayNumber,
        dayData: dayData,
        rankingData: rankingData,
        mode: null // 'reorganize' ou 'prefill'
    };

    // Ouvrir le modal de sélection de stratégie (étape 1 : choix du mode)
    const modal = document.getElementById('poolPreFillStrategyModal');
    if (modal) modal.style.display = 'block';

    // Afficher l'étape 1 (choix du mode)
    document.getElementById('preFillModeSelection').style.display = 'block';
    document.getElementById('preFillStrategySelection').style.display = 'none';
}

// Fermer le modal de stratégie
function closePoolPreFillStrategyModal() {
    const modal = document.getElementById('poolPreFillStrategyModal');
    if (modal) modal.style.display = 'none';
    preFillContext = null;

    // Réinitialiser l'affichage
    document.getElementById('preFillModeSelection').style.display = 'block';
    document.getElementById('preFillStrategySelection').style.display = 'none';
}

// Retour à la sélection du mode
function backToModeSelection() {
    document.getElementById('preFillModeSelection').style.display = 'block';
    document.getElementById('preFillStrategySelection').style.display = 'none';
}

// Sélectionner le mode (reorganize ou prefill)
function selectPreFillMode(mode) {
    if (!preFillContext) {
        showNotification('❌ Erreur : contexte de pré-remplissage non trouvé', 'error');
        return;
    }

    // Stocker le mode choisi
    preFillContext.mode = mode;

    // Passer à l'étape 2 : choix de la stratégie
    document.getElementById('preFillModeSelection').style.display = 'none';
    document.getElementById('preFillStrategySelection').style.display = 'block';
}

// Appliquer la stratégie sélectionnée
function applyPreFillStrategy(strategy) {
    if (!preFillContext) {
        showNotification('❌ Erreur : contexte de pré-remplissage non trouvé', 'error');
        return;
    }

    const { dayNumber, dayData, rankingData, mode } = preFillContext;
    const numDivisions = championship.config.numDivisions || 3;

    let sourceData = null;

    // MODE 1 : Réorganiser les joueurs existants de la journée PRÉCÉDENTE
    if (mode === 'reorganize') {
        // Récupérer TOUS les joueurs de la journée précédente
        const previousDayNumber = dayNumber - 1;
        const previousDayData = championship.days[previousDayNumber];

        if (!previousDayData) {
            showNotification('❌ Aucune journée précédente trouvée.', 'error');
            closePoolPreFillStrategyModal();
            return;
        }

        const existingPlayers = [];
        for (let div = 1; div <= numDivisions; div++) {
            if (previousDayData.players[div] && previousDayData.players[div].length > 0) {
                previousDayData.players[div].forEach(playerName => {
                    existingPlayers.push(playerName);
                });
            }
        }

        if (existingPlayers.length === 0) {
            showNotification('❌ Aucun joueur dans la journée précédente. Utilisez le mode "Pré-remplir depuis le classement".', 'error');
            closePoolPreFillStrategyModal();
            return;
        }

        // Vider les divisions de la journée actuelle avant de les remplir
        for (let div = 1; div <= numDivisions; div++) {
            dayData.players[div] = [];
        }

        // Créer un classement local basé sur le général pour ces joueurs
        sourceData = {
            type: 'reorganize',
            players: existingPlayers,
            rankingData: rankingData
        };

    // MODE 2 : Pré-remplir depuis le classement général
    } else if (mode === 'prefill') {
        sourceData = {
            type: 'prefill',
            rankingData: rankingData
        };
    }

    // Créer un tableau avec tous les joueurs classés (toutes divisions confondues)
    const allPlayers = [];

    if (sourceData.type === 'reorganize') {
        // Utiliser uniquement les joueurs existants
        for (let div = 1; div <= numDivisions; div++) {
            if (rankingData.divisions[div] && rankingData.divisions[div].length > 0) {
                rankingData.divisions[div].forEach(player => {
                    // Ne garder que les joueurs qui étaient dans la journée
                    if (sourceData.players.includes(player.name)) {
                        allPlayers.push({
                            name: player.name,
                            currentDivision: div, // Sauvegarde de la division actuelle
                            totalPoints: player.totalPoints,
                            totalWins: player.totalWins,
                            goalAveragePoints: player.goalAveragePoints,
                            totalPointsWon: player.totalPointsWon,
                            avgWinRate: player.avgWinRate
                        });
                    }
                });
            }
        }
    } else {
        // Utiliser tous les joueurs du classement
        for (let div = 1; div <= numDivisions; div++) {
            if (rankingData.divisions[div] && rankingData.divisions[div].length > 0) {
                rankingData.divisions[div].forEach(player => {
                    allPlayers.push({
                        name: player.name,
                        currentDivision: div,
                        totalPoints: player.totalPoints,
                        totalWins: player.totalWins,
                        goalAveragePoints: player.goalAveragePoints,
                        totalPointsWon: player.totalPointsWon,
                        avgWinRate: player.avgWinRate
                    });
                });
            }
        }
    }

    // Trier tous les joueurs ensemble (inter-divisions)
    allPlayers.sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
        if (b.totalWins !== a.totalWins) return b.totalWins - a.totalWins;
        if (b.goalAveragePoints !== a.goalAveragePoints) return b.goalAveragePoints - a.goalAveragePoints;
        if (b.totalPointsWon !== a.totalPointsWon) return b.totalPointsWon - a.totalPointsWon;
        if (b.avgWinRate !== a.avgWinRate) return b.avgWinRate - a.avgWinRate;
        return a.name.localeCompare(b.name);
    });

    if (allPlayers.length === 0) {
        showNotification('❌ Aucun joueur trouvé dans le classement.', 'error');
        closePoolPreFillStrategyModal();
        return;
    }

    let addedCount = 0;

    // Regrouper les joueurs par division actuelle
    const playersByDivision = {};
    for (let div = 1; div <= numDivisions; div++) {
        playersByDivision[div] = allPlayers.filter(p => p.currentDivision === div);
    }

    // Appliquer la stratégie sélectionnée
    if (strategy === 'by-level') {
        // Stratégie PAR NIVEAU : Les joueurs restent dans leur division
        // Ils sont simplement triés du meilleur au moins bon au sein de chaque division

        for (let div = 1; div <= numDivisions; div++) {
            if (playersByDivision[div] && playersByDivision[div].length > 0) {
                // Les joueurs sont déjà triés dans allPlayers
                playersByDivision[div].forEach(player => {
                    const playerName = player.name;

                    if (!dayData.players[div]) {
                        dayData.players[div] = [];
                    }

                    if (!dayData.players[div].includes(playerName)) {
                        dayData.players[div].push(playerName);
                        addedCount++;
                    }
                });
            }
        }

    } else if (strategy === 'snake') {
        // Stratégie SERPENT : Les joueurs restent dans leur division
        // Ordre serpent : 1er, dernier, 2e, avant-dernier, 3e, etc.
        // Équilibre les poules en mélangeant forts et faibles

        for (let div = 1; div <= numDivisions; div++) {
            if (playersByDivision[div] && playersByDivision[div].length > 0) {
                const players = [...playersByDivision[div]];
                const snakeOrder = [];

                let leftIndex = 0;
                let rightIndex = players.length - 1;
                let pickFromLeft = true;

                while (leftIndex <= rightIndex) {
                    if (pickFromLeft) {
                        snakeOrder.push(players[leftIndex]);
                        leftIndex++;
                    } else {
                        snakeOrder.push(players[rightIndex]);
                        rightIndex--;
                    }
                    pickFromLeft = !pickFromLeft;
                }

                // Ajouter les joueurs dans l'ordre serpent
                snakeOrder.forEach(player => {
                    const playerName = player.name;

                    if (!dayData.players[div]) {
                        dayData.players[div] = [];
                    }

                    if (!dayData.players[div].includes(playerName)) {
                        dayData.players[div].push(playerName);
                        addedCount++;
                    }
                });
            }
        }

    } else if (strategy === 'balanced') {
        // Stratégie MIXTE ÉQUILIBRÉ : Les joueurs restent dans leur division
        // Dans chaque division : diviser en 3 tiers (forts/moyens/faibles)
        // Puis alterner : 1 fort, 1 moyen, 1 faible, 1 fort, 1 moyen, 1 faible...

        for (let div = 1; div <= numDivisions; div++) {
            if (playersByDivision[div] && playersByDivision[div].length > 0) {
                const players = [...playersByDivision[div]];
                const tierSize = Math.ceil(players.length / 3);

                const topTier = players.slice(0, tierSize);
                const midTier = players.slice(tierSize, tierSize * 2);
                const lowTier = players.slice(tierSize * 2);

                const balancedOrder = [];
                const maxLength = Math.max(topTier.length, midTier.length, lowTier.length);

                // Alterner entre les 3 tiers
                for (let i = 0; i < maxLength; i++) {
                    if (i < topTier.length) balancedOrder.push(topTier[i]);
                    if (i < midTier.length) balancedOrder.push(midTier[i]);
                    if (i < lowTier.length) balancedOrder.push(lowTier[i]);
                }

                // Ajouter les joueurs dans l'ordre équilibré
                balancedOrder.forEach(player => {
                    const playerName = player.name;

                    if (!dayData.players[div]) {
                        dayData.players[div] = [];
                    }

                    if (!dayData.players[div].includes(playerName)) {
                        dayData.players[div].push(playerName);
                        addedCount++;
                    }
                });
            }
        }

    } else if (strategy === 'rebalance') {
        // Stratégie ÉQUILIBRER : Promotions/Relégations entre divisions
        // Les meilleurs de chaque division montent, les derniers descendent

        // Demander combien de joueurs faire monter/descendre
        const numToPromote = parseInt(prompt('Combien de joueurs faire monter/descendre entre chaque division ?', '2'));

        if (isNaN(numToPromote) || numToPromote <= 0) {
            showNotification('❌ Nombre invalide. Opération annulée.', 'error');
            closePoolPreFillStrategyModal();
            return;
        }

        // Pour chaque division, récupérer le classement actuel
        const divisionRankings = {};
        for (let div = 1; div <= numDivisions; div++) {
            if (playersByDivision[div] && playersByDivision[div].length > 0) {
                // Copier le classement de la division
                divisionRankings[div] = [...playersByDivision[div]];
            } else {
                divisionRankings[div] = [];
            }
        }

        // Créer les nouvelles compositions de divisions
        const newDivisions = {};
        for (let div = 1; div <= numDivisions; div++) {
            newDivisions[div] = [];
        }

        // Traiter chaque division
        for (let div = 1; div <= numDivisions; div++) {
            const currentDivisionPlayers = divisionRankings[div];

            if (currentDivisionPlayers.length === 0) continue;

            // Division 1 : Garder tous sauf les derniers (qui descendent en D2)
            if (div === 1) {
                const toKeep = currentDivisionPlayers.slice(0, -numToPromote);
                toKeep.forEach(p => newDivisions[1].push(p.name));

                // Les derniers descendent en D2
                if (numDivisions > 1) {
                    const toRelegate = currentDivisionPlayers.slice(-numToPromote);
                    toRelegate.forEach(p => newDivisions[2].push(p.name));
                }
            }
            // Division intermédiaire : Les meilleurs montent, les derniers descendent, le reste reste
            else if (div > 1 && div < numDivisions) {
                // Les meilleurs montent
                const toPromoteUp = currentDivisionPlayers.slice(0, numToPromote);
                toPromoteUp.forEach(p => newDivisions[div - 1].push(p.name));

                // Les derniers descendent
                const toRelegate = currentDivisionPlayers.slice(-numToPromote);
                toRelegate.forEach(p => newDivisions[div + 1].push(p.name));

                // Le reste reste dans la division
                const toKeep = currentDivisionPlayers.slice(numToPromote, -numToPromote);
                toKeep.forEach(p => newDivisions[div].push(p.name));
            }
            // Dernière division : Les meilleurs montent, les autres restent
            else if (div === numDivisions) {
                // Les meilleurs montent
                const toPromoteUp = currentDivisionPlayers.slice(0, numToPromote);
                toPromoteUp.forEach(p => newDivisions[div - 1].push(p.name));

                // Le reste reste dans la division
                const toKeep = currentDivisionPlayers.slice(numToPromote);
                toKeep.forEach(p => newDivisions[div].push(p.name));
            }
        }

        // Appliquer les nouvelles divisions
        for (let div = 1; div <= numDivisions; div++) {
            if (!dayData.players[div]) {
                dayData.players[div] = [];
            }

            newDivisions[div].forEach(playerName => {
                if (!dayData.players[div].includes(playerName)) {
                    dayData.players[div].push(playerName);
                    addedCount++;
                }
            });
        }
    }

    // Mettre à jour l'affichage des joueurs pour toutes les divisions
    initializeDivisionsDisplay(dayNumber);
    saveToLocalStorage();

    // Fermer le modal
    closePoolPreFillStrategyModal();

    const strategyNames = {
        'by-level': 'Par Niveau',
        'snake': 'Serpent',
        'balanced': 'Mixte Équilibré',
        'rebalance': 'Équilibrer les Divisions'
    };

    const modeText = mode === 'reorganize'
        ? `${addedCount} joueur(s) réorganisé(s)`
        : `${addedCount} joueur(s) ajouté(s)`;

    // GÉNÉRER AUTOMATIQUEMENT LES POULES (si le mode poules est activé)
    if (dayData.pools && dayData.pools.enabled) {
        generatePools(dayNumber);

        showNotification(
            `✅ ${modeText} - Stratégie: ${strategyNames[strategy]}\n` +
            `🎯 Poules générées automatiquement !`,
            'success',
            5000
        );
    } else {
        showNotification(
            `✅ ${modeText} - Stratégie: ${strategyNames[strategy]}\n` +
            `💡 Mode poules non activé. Activez-le pour générer les matchs.`,
            'success',
            5000
        );
    }
}

function generatePools(dayNumber) {
    const dayData = championship.days[dayNumber];
    if (!dayData.pools.enabled) return;

    const poolSize = parseInt(document.getElementById(`pool-size-${dayNumber}`).value);
    const numDivisions = championship.config.numDivisions || 3;
    let totalMatches = 0;

    for (let division = 1; division <= numDivisions; division++) {
        const players = [...dayData.players[division]];
        if (players.length < 4) {
            if (players.length > 0) {
                alert(`Division ${division}: Il faut au moins 4 joueurs pour créer des poules (${players.length} actuellement)`);
            }
            continue;
        }

        // Calculer le nombre optimal et avertir si nécessaire
        const optimalCounts = calculateOptimalPlayerCounts(poolSize);
        const isOptimal = optimalCounts.includes(players.length);

        if (!isOptimal) {
            const nearest = optimalCounts.reduce((prev, curr) =>
                Math.abs(curr - players.length) < Math.abs(prev - players.length) ? curr : prev
            );
            const needsBye = players.length % poolSize !== 0;

            if (needsBye) {
                const numByes = poolSize - (players.length % poolSize);
                const confirmed = confirm(
                    `⚠️ Division ${division}: ${players.length} joueur(s)\n\n` +
                    `📊 Nombre optimal pour des poules de ${poolSize}: ${optimalCounts.join(', ')}\n` +
                    `💡 Le plus proche: ${nearest} joueurs\n\n` +
                    `🎯 Solution: ${numByes} joueur(s) BYE seront ajoutés automatiquement\n` +
                    `Les joueurs BYE ne jouent pas (repos garanti).\n\n` +
                    `Voulez-vous continuer ?`
                );

                if (!confirmed) {
                    continue;
                }
            }
        }

        // Mélanger les joueurs pour équilibrer les poules
        const shuffledPlayers = shuffleArray([...players]);
        const pools = createBalancedPoolsWithBye(shuffledPlayers, poolSize);
        
        // Sauvegarder les poules
        dayData.pools.divisions[division].pools = pools;
        
        // Générer les matchs de poules
        const poolMatches = generatePoolMatches(pools, division, dayNumber);
        dayData.pools.divisions[division].matches = poolMatches;
        totalMatches += poolMatches.length;
        
        console.log(`Division ${division}: ${pools.length} poules créées avec ${poolMatches.length} matchs`);
    }
    
    // Mettre à jour l'affichage
    updatePoolsDisplay(dayNumber);
    saveToLocalStorage();
    
    // Activer le bouton phase finale quand toutes les poules sont terminées
    checkPoolsCompletion(dayNumber);
    
    alert(`Poules générées avec succès !\n${totalMatches} matchs de poules créés.\n\nTerminez les poules pour débloquer la phase finale.`);
}

// Calculer les nombres optimaux de joueurs pour une taille de poule donnée
function calculateOptimalPlayerCounts(poolSize) {
    const optimal = [];
    for (let numPools = 2; numPools <= 10; numPools++) {
        optimal.push(numPools * poolSize);
    }
    return optimal;
}

// Créer des poules équilibrées avec gestion automatique des BYEs
function createBalancedPoolsWithBye(players, maxPoolSize) {
    const totalPlayers = players.length;
    const remainder = totalPlayers % maxPoolSize;

    // Si le nombre de joueurs est un multiple parfait de maxPoolSize, pas de BYE
    if (remainder === 0) {
        return createBalancedPools(players, maxPoolSize);
    }

    // Sinon, ajouter des joueurs BYE pour compléter
    const numByes = maxPoolSize - remainder;
    const playersWithBye = [...players];

    for (let i = 1; i <= numByes; i++) {
        playersWithBye.push(`BYE ${i}`);
    }

    return createBalancedPools(playersWithBye, maxPoolSize);
}

function createBalancedPools(players, maxPoolSize) {
    const numPools = Math.ceil(players.length / maxPoolSize);
    const pools = Array.from({ length: numPools }, () => []);

    // Répartition équilibrée (serpent)
    players.forEach((player, index) => {
        const poolIndex = Math.floor(index / maxPoolSize);
        if (poolIndex < numPools) {
            pools[poolIndex].push(player);
        } else {
            // Si il reste des joueurs, les répartir dans les poules existantes
            const targetPool = index % numPools;
            pools[targetPool].push(player);
        }
    });

    // Filtrer les poules vides
    return pools.filter(pool => pool.length > 0);
}

function generatePoolMatches(pools, division, dayNumber) {
    const allMatches = [];
    let matchId = 0;

    pools.forEach((pool, poolIndex) => {
        for (let i = 0; i < pool.length; i++) {
            for (let j = i + 1; j < pool.length; j++) {
                const player1 = pool[i];
                const player2 = pool[j];

                // Ne pas créer de match si l'un des joueurs est BYE
                const isBye1 = player1.startsWith('BYE');
                const isBye2 = player2.startsWith('BYE');

                if (isBye1 || isBye2) {
                    // Match automatiquement gagné par le joueur non-BYE
                    if (!isBye1 && isBye2) {
                        // player1 gagne automatiquement
                        allMatches.push({
                            id: matchId++,
                            player1: player1,
                            player2: player2,
                            poolIndex: poolIndex,
                            poolName: `Poule ${String.fromCharCode(65 + poolIndex)}`,
                            division: division,
                            dayNumber: dayNumber,
                            score1: '0',
                            score2: '0',
                            completed: true,
                            winner: player1,
                            isPoolMatch: true,
                            isByeMatch: true
                        });
                    } else if (isBye1 && !isBye2) {
                        // player2 gagne automatiquement
                        allMatches.push({
                            id: matchId++,
                            player1: player1,
                            player2: player2,
                            poolIndex: poolIndex,
                            poolName: `Poule ${String.fromCharCode(65 + poolIndex)}`,
                            division: division,
                            dayNumber: dayNumber,
                            score1: '0',
                            score2: '0',
                            completed: true,
                            winner: player2,
                            isPoolMatch: true,
                            isByeMatch: true
                        });
                    }
                    // Si les deux sont BYE, on ne crée pas de match du tout
                } else {
                    // Match normal
                    allMatches.push({
                        id: matchId++,
                        player1: player1,
                        player2: player2,
                        poolIndex: poolIndex,
                        poolName: `Poule ${String.fromCharCode(65 + poolIndex)}`,
                        division: division,
                        dayNumber: dayNumber,
                        score1: '',
                        score2: '',
                        completed: false,
                        winner: null,
                        isPoolMatch: true,
                        isByeMatch: false
                    });
                }
            }
        }
    });

    return allMatches;
}

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// ======================================
// AFFICHAGE DES POULES
// ======================================

function updatePoolsDisplay(dayNumber) {
    const dayData = championship.days[dayNumber];
    if (!dayData.pools.enabled) return;

    const numDivisions = championship.config.numDivisions || 3;

    for (let division = 1; division <= numDivisions; division++) {
        const container = document.getElementById(`division${dayNumber}-${division}-matches`);
        if (!container) continue;
        
        const pools = dayData.pools.divisions[division].pools;
        const matches = dayData.pools.divisions[division].matches;
        
        if (pools.length === 0) {
            container.innerHTML = '<div class="empty-state">Aucune poule générée</div>';
            continue;
        }
        
        let html = '<div class="pools-container">';
        
        pools.forEach((pool, poolIndex) => {
            const poolName = `Poule ${String.fromCharCode(65 + poolIndex)}`;
            const poolMatches = matches.filter(m => m.poolIndex === poolIndex);
            const completedMatches = poolMatches.filter(m => m.completed).length;
            
            html += `
                <div class="pool-section" style="
                    background: white;
                    border: 2px solid #3498db;
                    border-radius: 12px;
                    padding: 20px;
                    margin-bottom: 20px;
                ">
                    <div class="pool-header" style="
                        background: linear-gradient(135deg, #3498db, #2980b9);
                        color: white;
                        padding: 15px;
                        border-radius: 8px;
                        margin-bottom: 15px;
                        text-align: center;
                    ">
                        <h4 style="margin: 0; font-size: 1.2rem;">${poolName}</h4>
                        <div style="font-size: 14px; margin-top: 5px;">
                            ${completedMatches}/${poolMatches.length} matchs terminés
                        </div>
                    </div>
                    
                    <div class="pool-players" style="
                        display: flex;
                        flex-wrap: wrap;
                        gap: 10px;
                        justify-content: center;
                        margin-bottom: 15px;
                        padding: 15px;
                        background: #f8f9fa;
                        border-radius: 8px;
                    ">
                        ${pool.map(player => 
                            `<span class="pool-player-tag" style="
                                background: linear-gradient(135deg, #27ae60, #2ecc71);
                                color: white;
                                padding: 8px 15px;
                                border-radius: 20px;
                                font-weight: 500;
                                font-size: 14px;
                            ">${player}</span>`
                        ).join('')}
                    </div>
                    
                    <div class="pool-matches">
                        ${poolMatches.map(match => generatePoolMatchHTML(match, dayNumber)).join('')}
                    </div>
                    
                    ${completedMatches === poolMatches.length ? 
                        `<div class="pool-ranking" style="margin-top: 15px;">
                            ${generatePoolRankingHTML(pool, poolMatches, poolIndex)}
                        </div>` : ''}
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
    }
}

function generatePoolMatchHTML(match, dayNumber) {
    // Gérer les matchs BYE différemment
    if (match.isByeMatch) {
        const realPlayer = match.winner;
        const byePlayer = match.player1 === realPlayer ? match.player2 : match.player1;

        return `
            <div class="pool-match bye-match" style="
                background: linear-gradient(135deg, #fff3cd, #fffaeb);
                border: 2px dashed #ffc107;
                border-radius: 8px;
                padding: 15px;
                margin-bottom: 10px;
            ">
                <div class="match-header" style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 10px;
                ">
                    <div class="player-names" style="font-weight: 600; color: #856404;">
                        🎯 ${realPlayer} VS ${byePlayer}
                    </div>
                    <div class="match-status" style="
                        font-size: 12px;
                        padding: 4px 8px;
                        border-radius: 12px;
                        font-weight: bold;
                        background: #ffc107;
                        color: white;
                    ">BYE - Repos</div>
                </div>

                <div style="text-align: center; padding: 10px; background: rgba(255, 193, 7, 0.1); border-radius: 6px;">
                    <strong style="color: #856404;">✅ ${realPlayer} qualifié(e) automatiquement</strong>
                    <div style="font-size: 12px; color: #6c757d; margin-top: 5px;">
                        Match non joué - Victoire par forfait
                    </div>
                </div>
            </div>
        `;
    }

    // Match normal
    const matchStatus = match.completed ? 'completed' : 'pending';
    const statusClass = match.completed ? 'status-completed' : 'status-pending';
    const statusText = match.completed ? 'Terminé' : 'En cours';
    const score1 = match.score1 || 0;
    const score2 = match.score2 || 0;
    const collapsedSummary = match.completed ? `${match.player1} <span class="collapse-score">${score1}-${score2}</span> ${match.player2}` : '';

    return `
        <div class="pool-match ${matchStatus}" style="
            background: ${match.completed ? '#d5f4e6' : '#fff'};
            border: 2px solid ${match.completed ? '#27ae60' : '#ecf0f1'};
            border-radius: 8px;
            padding: 10px;
            margin-bottom: 6px;
        ">
            ${match.completed ? `<div class="match-header" onclick="toggleMatchCollapse(this.parentElement)" style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
                cursor: pointer;
            ">
                <div class="player-names" style="font-weight: 600; color: #2c3e50; font-size: 14px;">
                    ${collapsedSummary}
                </div>
                <div class="match-status ${statusClass}" style="
                    font-size: 12px;
                    padding: 4px 8px;
                    border-radius: 12px;
                    font-weight: bold;
                    background: #a8e6cf;
                    color: #00b894;
                ">${statusText}</div>
            </div>` : ''}
            
            <div class="score-container" style="
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 8px;
                margin-bottom: 10px;
                padding: 10px;
                background: #f8f9fa;
                border: 1px solid #ddd;
                border-radius: 6px;
            ">
                <span style="font-size: 11px; color: #2c3e50; font-weight: 600;">${match.player1}</span>
                <input type="number"
                       value="${match.score1 || ''}"
                       placeholder="0"
                       onchange="updatePoolMatchScore(${dayNumber}, '${match.id}', 'score1', this.value)"
                       onkeydown="handlePoolMatchEnter(event, ${dayNumber}, '${match.id}')"
                       style="width: 50px; height: 40px; text-align: center; padding: 6px; font-weight: bold; font-size: 16px; border: 2px solid #007bff; border-radius: 6px;">
                <span style="font-weight: bold; color: #7f8c8d; font-size: 18px;">-</span>
                <input type="number"
                       value="${match.score2 || ''}"
                       placeholder="0"
                       onchange="updatePoolMatchScore(${dayNumber}, '${match.id}', 'score2', this.value)"
                       onkeydown="handlePoolMatchEnter(event, ${dayNumber}, '${match.id}')"
                       style="width: 50px; height: 40px; text-align: center; padding: 6px; font-weight: bold; font-size: 16px; border: 2px solid #007bff; border-radius: 6px;">
                <span style="font-size: 11px; color: #2c3e50; font-weight: 600;">${match.player2}</span>
            </div>

            ${match.completed && match.winner ? `
            <div class="match-result" style="
                text-align: center;
                font-weight: bold;
                padding: 6px;
                border-radius: 6px;
                font-size: 13px;
                background: #a8e6cf;
                color: #00b894;
            ">
                🏆 ${match.winner} remporte le match (${score1}-${score2})
            </div>` : ''}
        </div>
    `;
}

// ======================================
// GESTION DES SCORES DE POULES
// ======================================

function updatePoolMatchScore(dayNumber, matchId, scoreField, value) {
    const dayData = championship.days[dayNumber];
    const numDivisions = championship.config.numDivisions || 3;

    for (let division = 1; division <= numDivisions; division++) {
        const match = dayData.pools.divisions[division].matches.find(m => m.id == matchId);
        if (match) {
            match[scoreField] = value;
            checkPoolMatchCompletion(dayNumber, matchId);
            updatePoolsDisplay(dayNumber);
            checkPoolsCompletion(dayNumber);
            saveToLocalStorage();
            break;
        }
    }
}

function handlePoolMatchEnter(event, dayNumber, matchId) {
    const dayData = championship.days[dayNumber];
    const numDivisions = championship.config.numDivisions || 3;
    let match = null;

    // Trouver le match
    for (let division = 1; division <= numDivisions; division++) {
        match = dayData.pools.divisions[division].matches.find(m => m.id == matchId);
        if (match) break;
    }

    // Vérifier si on doit valider
    const shouldValidate = event.key === 'Enter' ||
                          (event.key === 'Tab' && match && match.score1 !== undefined && match.score1 !== '' &&
                           match.score2 !== undefined && match.score2 !== '');

    if (shouldValidate) {
        if (event.key === 'Tab' && (!match || match.score1 === undefined || match.score1 === '' ||
                                     match.score2 === undefined || match.score2 === '')) {
            return; // Laisser Tab naviguer normalement si scores incomplets
        }

        event.preventDefault();

        let wasCompleted = false;
        let matchElement = null;

        // Récupérer l'état du match
        for (let division = 1; division <= numDivisions; division++) {
            const m = dayData.pools.divisions[division].matches.find(m => m.id == matchId);
            if (m) {
                wasCompleted = m.completed;
                matchElement = event.target.closest('.pool-match');
                break;
            }
        }

        // Compléter le match
        checkPoolMatchCompletion(dayNumber, matchId);
        updatePoolsDisplay(dayNumber);
        checkPoolsCompletion(dayNumber);
        saveToLocalStorage();

        // Auto-collapse si le match vient d'être complété
        if (!wasCompleted && matchElement) {
            setTimeout(() => {
                // Re-trouver l'élément après updatePoolsDisplay qui régénère le HTML
                const allPoolMatches = document.querySelectorAll('.pool-match.completed');
                allPoolMatches.forEach(pm => {
                    if (pm && !pm.classList.contains('collapsed') && pm.hasAttribute('onclick')) {
                        // Vérifier si c'est bien notre match en comparant les joueurs
                        const playerNames = pm.querySelector('.player-names');
                        if (playerNames && matchElement) {
                            const oldPlayerNames = matchElement.querySelector('.player-names');
                            if (oldPlayerNames && playerNames.textContent.includes(oldPlayerNames.textContent.split('VS')[0].trim())) {
                                toggleMatchCollapse(pm);
                            }
                        }
                    }
                });
            }, 800);
        }

        // Passer au match suivant
        setTimeout(() => {
            const currentInput = event.target;
            // Trouver tous les inputs de score dans les poules
            const allInputs = Array.from(document.querySelectorAll('.pool-match input[type="number"]'));
            const currentIndex = allInputs.indexOf(currentInput);

            if (currentIndex !== -1 && currentIndex < allInputs.length - 1) {
                // Passer au prochain input
                // Si on est sur score2, on passe au score1 du match suivant (sauter un input)
                const nextIndex = currentIndex % 2 === 1 ? currentIndex + 1 : currentIndex + 2;
                if (nextIndex < allInputs.length) {
                    allInputs[nextIndex].focus();
                    allInputs[nextIndex].select();
                }
            }
        }, 100); // Petit délai pour laisser le DOM se rafraîchir
    }
}

function checkPoolMatchCompletion(dayNumber, matchId) {
    const dayData = championship.days[dayNumber];
    const numDivisions = championship.config.numDivisions || 3;

    for (let division = 1; division <= numDivisions; division++) {
        const match = dayData.pools.divisions[division].matches.find(m => m.id == matchId);
        if (match) {
            const wasCompleted = match.completed;

            if (match.score1 !== '' && match.score2 !== '') {
                const score1 = parseInt(match.score1);
                const score2 = parseInt(match.score2);

                if (score1 > score2) {
                    match.completed = true;
                    match.winner = match.player1;
                } else if (score2 > score1) {
                    match.completed = true;
                    match.winner = match.player2;
                } else {
                    match.completed = true;
                    match.winner = null;
                }
            } else {
                // Si l'un des scores est vide, remettre le match en attente
                match.completed = false;
                match.winner = null;
            }

            // Notification du changement d'état
            if (!wasCompleted && match.completed) {
                showNotification(`🏆 ${match.winner || 'Match nul'} remporte le match !`, 'success');
            } else if (wasCompleted && !match.completed) {
                showNotification(`⏸️ Match remis en attente`, 'info');
            }

            break;
        }
    }
}

function checkPoolsCompletion(dayNumber) {
    const dayData = championship.days[dayNumber];
    const numDivisions = championship.config.numDivisions || 3;
    const finalButton = document.getElementById(`final-phase-btn-${dayNumber}`);

    let allPoolsCompleted = true;

    for (let division = 1; division <= numDivisions; division++) {
        const matches = dayData.pools.divisions[division].matches;
        if (matches.length > 0 && !matches.every(match => match.completed)) {
            allPoolsCompleted = false;
            break;
        }
    }

    if (finalButton) {
        finalButton.disabled = !allPoolsCompleted;
        finalButton.style.opacity = allPoolsCompleted ? '1' : '0.5';
    }

    return allPoolsCompleted;
}

// ======================================
// CLASSEMENT DES POULES
// ======================================

function generatePoolRankingHTML(pool, poolMatches, poolIndex) {
    const playerStats = pool.map(player => {
        let wins = 0, losses = 0, pointsWon = 0, pointsLost = 0;

        poolMatches.forEach(match => {
            if (!match.completed) return;

            const isPlayer1 = match.player1 === player;
            const isPlayer2 = match.player2 === player;

            if (isPlayer1 || isPlayer2) {
                if (match.winner === player) wins++;
                else losses++;

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

        return {
            name: player,
            wins,
            losses,
            pointsWon,
            pointsLost,
            diff: pointsWon - pointsLost,
            points: wins * 3 + losses * 1
        };
    });

    // Trier par points puis par différence puis par points Pour
    playerStats.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.diff !== a.diff) return b.diff - a.diff;
        return b.pointsWon - a.pointsWon;
    });
    
    return `
        <div style="
            background: linear-gradient(135deg, #f8f9fa, #e9ecef);
            border: 2px solid #28a745;
            border-radius: 8px;
            padding: 15px;
        ">
            <h5 style="text-align: center; color: #28a745; margin-bottom: 15px;">
                📊 Classement ${String.fromCharCode(65 + poolIndex)}
            </h5>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <thead>
                    <tr style="background: #28a745; color: white;">
                        <th style="padding: 8px; text-align: left;">Rang</th>
                        <th style="padding: 8px; text-align: left;">Joueur</th>
                        <th style="padding: 8px; text-align: center;">Pts</th>
                        <th style="padding: 8px; text-align: center;">V/D</th>
                        <th style="padding: 8px; text-align: center;">PP/PC</th>
                        <th style="padding: 8px; text-align: center;">Diff</th>
                    </tr>
                </thead>
                <tbody>
                    ${playerStats.map((player, index) => `
                        <tr style="
                            background: ${index < 2 ? '#d4edda' : 'white'};
                            border-bottom: 1px solid #dee2e6;
                        ">
                            <td style="padding: 8px; font-weight: bold; color: ${index < 2 ? '#155724' : '#333'};">
                                ${index + 1}${index < 2 ? ' 🎯' : ''}
                            </td>
                            <td style="padding: 8px; font-weight: 600;">${player.name}</td>
                            <td style="padding: 8px; text-align: center; font-weight: bold;">${player.points}</td>
                            <td style="padding: 8px; text-align: center;">${player.wins}/${player.losses}</td>
                            <td style="padding: 8px; text-align: center;">${player.pointsWon}/${player.pointsLost}</td>
                            <td style="padding: 8px; text-align: center;">${player.diff > 0 ? '+' : ''}${player.diff}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// ======================================
// INTÉGRATION AVEC LE SYSTÈME EXISTANT
// ======================================

// Modifier la fonction de génération des matchs pour détecter le mode poules
function generateMatchesForDayWithPoolSupport(dayNumber) {
    if (!dayNumber) dayNumber = championship.currentDay;
    
    const dayData = championship.days[dayNumber];
    if (!dayData) return;
    
    // Vérifier si le mode poules est activé
    if (dayData.pools && dayData.pools.enabled) {
        alert('⚠️ Mode Poules activé !\n\nUtilisez les boutons "Générer les Poules" dans la section bleue ci-dessus.');
        return;
    }
    
    // Continuer avec la génération classique
    generateMatchesForDay(dayNumber);
}

// Hook d'initialisation pour chaque journée
function initializePoolsForDay(dayNumber) {
    // Ajouter l'interface poules si elle n'existe pas
    const existingToggle = document.getElementById(`pool-toggle-${dayNumber}`);
    if (!existingToggle) {
        addPoolToggleToInterface(dayNumber);
    }
    
    // Initialiser la structure de données
    initializePoolSystem(dayNumber);
    
    // Vérifier l'état du toggle si les poules sont activées
    const dayData = championship.days[dayNumber];
    if (dayData.pools && dayData.pools.enabled) {
        const checkbox = document.getElementById(`pool-enabled-${dayNumber}`);
        if (checkbox) {
            checkbox.checked = true;
            togglePoolMode(dayNumber); // Appliquer l'état
            updatePoolsDisplay(dayNumber);
        }
    }
}

// Export des fonctions principales
window.initializePoolsForDay = initializePoolsForDay;
window.togglePoolMode = togglePoolMode;
window.generatePools = generatePools;
window.updatePoolMatchScore = updatePoolMatchScore;
window.handlePoolMatchEnter = handlePoolMatchEnter;
window.generateFinalPhase = function(dayNumber) {
    // Appeler la vraie fonction de génération des phases finales manuelles
    generateManualFinalPhase(dayNumber);
};

console.log("✅ Système de poules optionnel chargé avec succès !");

// ======================================
// SYSTÈME DE PHASES FINALES MANUELLES - SYNTAXE CORRIGÉE
// ======================================

// Extension de la structure pour les phases finales manuelles
function initializeManualFinalPhase(dayNumber) {
    const dayData = championship.days[dayNumber];
    const numDivisions = championship.config.numDivisions || 3;

    if (dayData.pools && !dayData.pools.manualFinalPhase) {
        const divisions = {};

        // Créer dynamiquement les divisions selon la configuration
        for (let div = 1; div <= numDivisions; div++) {
            divisions[div] = {
                qualified: [],
                rounds: {},
                champion: null,
                runnerUp: null,
                third: null,
                fourth: null
            };
        }

        dayData.pools.manualFinalPhase = {
            enabled: false,
            currentRound: null,
            divisions: divisions
        };
    }
}

// ======================================
// FONCTION MANQUANTE - getQualifiedPlayersFromPools
// ======================================

function getQualifiedPlayersFromPools(pools, matches, qualifiedPerPool) {
    const allQualified = [];
    
    pools.forEach((pool, poolIndex) => {
        // Calculer le classement de cette poule
        const playerStats = pool.map(player => {
            let wins = 0, losses = 0, pointsWon = 0, pointsLost = 0;

            const poolMatches = matches.filter(m => m.poolIndex === poolIndex && m.completed);

            poolMatches.forEach(match => {
                const isPlayer1 = match.player1 === player;
                const isPlayer2 = match.player2 === player;

                if (isPlayer1 || isPlayer2) {
                    if (match.winner === player) wins++;
                    else losses++;

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

            return {
                name: player,
                wins, losses, pointsWon, pointsLost,
                diff: pointsWon - pointsLost,
                points: wins * 3 + losses * 1,
                poolIndex: poolIndex,
                poolName: String.fromCharCode(65 + poolIndex)
            };
        });

        // Trier et prendre les N premiers
        playerStats.sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.diff !== a.diff) return b.diff - a.diff;
            return b.pointsWon - a.pointsWon;
        });
        
        const qualified = playerStats.slice(0, qualifiedPerPool);
        qualified.forEach(player => {
            player.seed = allQualified.length + 1; // Seed global
        });
        
        allQualified.push(...qualified);
    });
    
    return allQualified;
}

// Fonction principale pour générer les phases finales manuelles
function generateManualFinalPhase(dayNumber) {
    console.log("🏆 Génération phase finale MANUELLE pour journée", dayNumber);
    
    const dayData = championship.days[dayNumber];
    if (!dayData.pools || !dayData.pools.enabled) {
        alert('Les phases finales ne sont disponibles qu\'en mode Poules !');
        return;
    }
    
    // Vérifier que toutes les poules sont terminées
    if (!checkPoolsCompletion(dayNumber)) {
        alert('⚠️ Terminez d\'abord toutes les poules avant de générer la phase finale !');
        return;
    }
    
    initializeManualFinalPhase(dayNumber);
    
    const qualifiedPerPool = parseInt(document.getElementById(`qualified-per-pool-${dayNumber}`).value);
    const numDivisions = championship.config.numDivisions || 3;
    let totalQualified = 0;

    // Qualifier les joueurs de chaque division
    for (let division = 1; division <= numDivisions; division++) {
        const pools = dayData.pools.divisions[division].pools;
        const matches = dayData.pools.divisions[division].matches;
        
        if (pools.length === 0) continue;
        
        const qualified = getQualifiedPlayersFromPools(pools, matches, qualifiedPerPool);
        dayData.pools.manualFinalPhase.divisions[division].qualified = qualified;
        totalQualified += qualified.length;
        
        // Déterminer le premier tour selon le nombre de qualifiés
        const firstRoundName = determineFirstRound(qualified.length);
        if (firstRoundName && qualified.length >= 4) {
            generateFirstRound(dayNumber, division, qualified, firstRoundName);
        }
    }
    
    dayData.pools.manualFinalPhase.enabled = true;
    
    // Mettre à jour l'affichage
    updateManualFinalPhaseDisplay(dayNumber);
    saveToLocalStorage();
    
    alert(`🏆 Phase finale initialisée !\n\n${totalQualified} joueurs qualifiés au total.\n\nVous pouvez maintenant gérer les tours un par un !`);
}

function determineFirstRound(numPlayers) {
    if (numPlayers >= 16) return "16èmes";
    if (numPlayers >= 8) return "8èmes";
    if (numPlayers >= 4) return "Quarts";
    return null;
}

function generateFirstRound(dayNumber, division, qualified, roundName) {
    const dayData = championship.days[dayNumber];
    const rounds = dayData.pools.manualFinalPhase.divisions[division].rounds;
    
    console.log(`🎯 Génération ${roundName} pour Division ${division} avec ${qualified.length} joueurs`);
    
    // Créer le tableau équilibré
    const seededPlayers = organizeSeeds(qualified);
    const matches = [];
    
    for (let i = 0; i < seededPlayers.length; i += 2) {
        const player1 = seededPlayers[i];
        const player2 = seededPlayers[i + 1] || { name: 'BYE', isBye: true };
        
        const matchData = {
            id: `${roundName}-${division}-${Math.floor(i/2) + 1}`,
            player1: player1.name,
            player2: player2.name,
            player1Seed: player1.seed,
            player2Seed: player2.seed || null,
            score1: player2.isBye ? 3 : '',
            score2: player2.isBye ? 0 : '',
            completed: player2.isBye || false,
            winner: player2.isBye ? player1.name : null,
            roundName: roundName,
            position: Math.floor(i/2) + 1,
            isBye: player2.isBye || false
        };
        
        matches.push(matchData);
    }
    
    rounds[roundName] = {
        name: roundName,
        matches: matches,
        completed: false,
        nextRound: getNextRoundName(roundName)
    };
    
    // Marquer comme tour actuel
    dayData.pools.manualFinalPhase.currentRound = roundName;
    
    console.log(`✅ ${roundName} créé avec ${matches.length} matchs`);
}

function getNextRoundName(currentRound) {
    const sequence = ["16èmes", "8èmes", "Quarts", "Demi-finales", "Finale"];
    const currentIndex = sequence.indexOf(currentRound);
    return currentIndex >= 0 && currentIndex < sequence.length - 1 ? sequence[currentIndex + 1] : null;
}

function organizeSeeds(qualified) {
    return qualified.sort((a, b) => a.seed - b.seed);
}

// ======================================
// AFFICHAGE DES PHASES FINALES MANUELLES
// ======================================

function updateManualFinalPhaseDisplay(dayNumber) {
    const dayData = championship.days[dayNumber];
    if (!dayData.pools || !dayData.pools.manualFinalPhase || !dayData.pools.manualFinalPhase.enabled) {
        return;
    }

    const numDivisions = championship.config.numDivisions || 3;

    for (let division = 1; division <= numDivisions; division++) {
        const container = document.getElementById(`division${dayNumber}-${division}-matches`);
        if (!container) continue;
        
        const finalPhase = dayData.pools.manualFinalPhase.divisions[division];
        
        if (finalPhase.qualified.length === 0) continue;
        
        let html = generateManualFinalPhaseHTML(dayNumber, division, finalPhase);
        
        // Ajouter après les poules
        const poolsContainer = container.querySelector('.pools-container');
        if (poolsContainer) {
            // Supprimer ancien affichage phase finale
            const existingFinal = container.querySelector('.manual-final-phase-container');
            if (existingFinal) existingFinal.remove();
            
            poolsContainer.insertAdjacentHTML('afterend', html);
        }
    }
}

function generateManualFinalPhaseHTML(dayNumber, division, finalPhase) {
    const currentRound = championship.days[dayNumber].pools.manualFinalPhase.currentRound;
    const rounds = finalPhase.rounds;
    
    let html = `
        <div class="manual-final-phase-container" style="margin-top: 30px;">
            <div class="final-phase-header" style="
                background: linear-gradient(135deg, #16a085, #1abc9c);
                color: white;
                padding: 25px;
                border-radius: 15px;
                text-align: center;
                margin-bottom: 25px;
                box-shadow: 0 5px 15px rgba(142, 68, 173, 0.3);
            ">
                <h3 style="margin: 0 0 10px 0; font-size: 1.5rem;">
                    🏆 PHASE FINALE MANUELLE - Division ${division}
                </h3>
                <div style="font-size: 16px; opacity: 0.9;">
                    ${finalPhase.qualified.length} joueurs qualifiés
                </div>
                ${currentRound ? `
                    <div style="
                        background: rgba(255,255,255,0.2);
                        padding: 10px 20px;
                        border-radius: 20px;
                        margin-top: 15px;
                        display: inline-block;
                    ">
                        <strong>🎯 Tour actuel : ${currentRound}</strong>
                    </div>
                ` : ''}
            </div>
            
            <div class="qualified-players" style="
                background: linear-gradient(135deg, #e8f5e8, #d4edda);
                border: 2px solid #28a745;
                border-radius: 12px;
                padding: 20px;
                margin-bottom: 25px;
            ">
                <h4 style="color: #155724; margin-bottom: 15px; text-align: center;">
                    ✨ Joueurs Qualifiés des Poules
                </h4>
                <div style="display: flex; flex-wrap: wrap; gap: 10px; justify-content: center;">
                    ${finalPhase.qualified.map(player => `
                        <span style="
                            background: linear-gradient(135deg, #28a745, #20c997);
                            color: white;
                            padding: 8px 15px;
                            border-radius: 20px;
                            font-size: 14px;
                            font-weight: 600;
                            box-shadow: 0 3px 8px rgba(40, 167, 69, 0.3);
                        ">
                            #${player.seed} ${player.name} (${player.poolName})
                        </span>
                    `).join('')}
                </div>
            </div>
    `;
    
    // Afficher les tours
    if (Object.keys(rounds).length > 0) {
        html += generateRoundsHTML(dayNumber, division, rounds, currentRound);
    }
    
    // Afficher le podium si terminé
    const champion = getChampionFromFinalPhase(finalPhase);
    if (champion) {
        html += generatePodiumHTML(finalPhase);
    }
    
    html += '</div>';
    
    return html;
}

function generateRoundsHTML(dayNumber, division, rounds, currentRound) {
    let html = '';
    
    const roundOrder = ["16èmes", "8èmes", "Quarts", "Demi-finales", "Petite finale", "Finale"];
    
    for (const roundName of roundOrder) {
        if (!rounds[roundName]) continue;
        
        const round = rounds[roundName];
        const isCurrentRound = roundName === currentRound;
        const isCompleted = round.completed;
        const completedMatches = round.matches.filter(m => m.completed).length;
        const totalMatches = round.matches.length;
        
        html += `
            <div class="manual-round" style="
                background: ${isCurrentRound ? 'linear-gradient(135deg, #fff3cd, #ffeaa7)' : 'white'};
                border: 3px solid ${isCurrentRound ? '#ffc107' : isCompleted ? '#28a745' : '#6c757d'};
                border-radius: 15px;
                padding: 25px;
                margin-bottom: 25px;
                ${isCurrentRound ? 'box-shadow: 0 5px 20px rgba(255, 193, 7, 0.3);' : ''}
            ">
                <div class="round-header" style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                ">
                    <h4 style="
                        margin: 0;
                        color: ${isCurrentRound ? '#856404' : isCompleted ? '#155724' : '#495057'};
                        font-size: 1.3rem;
                    ">
                        ${getRoundIcon(roundName)} ${roundName}
                    </h4>
                    <div style="
                        background: ${isCompleted ? '#d4edda' : isCurrentRound ? '#fff3cd' : '#f8f9fa'};
                        color: ${isCompleted ? '#155724' : isCurrentRound ? '#856404' : '#6c757d'};
                        padding: 8px 15px;
                        border-radius: 20px;
                        font-weight: bold;
                        font-size: 14px;
                    ">
                        ${completedMatches}/${totalMatches} terminés
                        ${isCompleted ? ' ✅' : isCurrentRound ? ' ⚡' : ' ⏳'}
                    </div>
                </div>
                
                <div class="round-matches" style="
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    gap: 15px;
                    margin-bottom: 20px;
                ">
                    ${round.matches.map(match => generateManualMatchHTML(dayNumber, division, match, roundName)).join('')}
                </div>
                
                ${generateRoundControlsHTML(dayNumber, division, round, roundName, completedMatches, totalMatches)}
            </div>
        `;
    }
    
    return html;
}

function getRoundIcon(roundName) {
    const icons = {
        "16èmes": "🎯",
        "8èmes": "🔥", 
        "Quarts": "⚡",
        "Demi-finales": "🚀",
        "Petite finale": "🥉",
        "Finale": "🏆"
    };
    return icons[roundName] || "🎲";
}

function generateManualMatchHTML(dayNumber, division, match, roundName) {
    const isCompleted = match.completed;
    const isActive = !match.isBye;
    const score1 = match.score1 || 0;
    const score2 = match.score2 || 0;
    const scoreDisplay = isCompleted && !match.isBye ? `<span class="collapse-score">${score1}-${score2}</span>` : '';
    return `
        <div class="manual-match" style="
            background: ${isCompleted ? '#d5f4e6' : isActive ? 'white' : '#f8f9fa'};
            border: 2px solid ${isCompleted ? '#28a745' : isActive ? '#007bff' : '#6c757d'};
            border-radius: 10px;
            padding: 10px;
            ${match.isBye ? 'opacity: 0.7;' : ''}
        ">
            <div class="match-header" ${isCompleted && !match.isBye ? `onclick="toggleMatchCollapse(this.parentElement)"` : ''} style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
                ${isCompleted && !match.isBye ? 'cursor: pointer;' : ''}
            ">
                <div class="match-title" style="
                    font-size: 13px;
                    color: #6c757d;
                    font-weight: bold;
                ">
                    Match ${match.position}${scoreDisplay}
                </div>
                ${isCompleted || match.isBye ? `<div class="match-status" style="
                    font-size: 12px;
                    padding: 4px 10px;
                    border-radius: 15px;
                    font-weight: bold;
                    background: ${isCompleted ? '#d4edda' : '#e2e3e5'};
                    color: ${isCompleted ? '#155724' : '#6c757d'};
                ">
                    ${isCompleted ? 'Terminé ✅' : 'Qualifié ⚡'}
                </div>` : ''}
            </div>
            
            <div class="players" style="
                font-weight: bold;
                color: #2c3e50;
                margin-bottom: ${match.isBye ? '0' : '15px'};
                font-size: 15px;
                text-align: center;
                ${!match.isBye ? 'display: none;' : ''}
            ">
                ${match.player1Seed ? `#${match.player1Seed}` : ''} ${match.player1}
                ${!match.isBye ? ` VS ${match.player2Seed ? `#${match.player2Seed}` : ''} ${match.player2}` : ''}
            </div>
            
            ${match.isBye ? `
                <div style="
                    text-align: center;
                    color: #28a745;
                    font-style: italic;
                    padding: 10px;
                ">
                    Qualifié automatiquement
                </div>
            ` : `
                <div class="score-container" style="
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 12px;
                    padding: 12px;
                    background: #f8f9fa;
                    border: 1px solid #dee2e6;
                    border-radius: 6px;
                ">
                    <span style="font-size: 11px; color: #2c3e50; font-weight: 600;">${match.player1}</span>
                    <input type="number"
                           value="${match.score1 || ''}"
                           placeholder="0"
                           onchange="updateManualMatchScore('${match.id}', 'score1', this.value, ${dayNumber})"
                           onkeydown="handleManualMatchEnter(event, '${match.id}', ${dayNumber})"
                           style="width: 45px; height: 40px; text-align: center; border: 2px solid #007bff; border-radius: 4px; font-size: 16px; font-weight: bold;">
                    <span style="color: #6c757d; font-weight: bold; font-size: 18px;">-</span>
                    <input type="number"
                           value="${match.score2 || ''}"
                           placeholder="0"
                           onchange="updateManualMatchScore('${match.id}', 'score2', this.value, ${dayNumber})"
                           onkeydown="handleManualMatchEnter(event, '${match.id}', ${dayNumber})"
                           style="width: 45px; height: 40px; text-align: center; border: 2px solid #007bff; border-radius: 4px; font-size: 16px; font-weight: bold;">
                    <span style="font-size: 11px; color: #2c3e50; font-weight: 600;">${match.player2}</span>
                </div>
                
                <div class="match-result" style="
                    text-align: center;
                    padding: 6px;
                    border-radius: 6px;
                    font-weight: bold;
                    background: ${isCompleted ? '#d4edda' : '#fff3cd'};
                    color: ${isCompleted ? '#155724' : '#856404'};
                    font-size: 13px;
                ">
                    ${isCompleted && match.winner ? `🏆 ${match.winner} gagne (${score1}-${score2})` : 'En attente des scores'}
                </div>
            `}
        </div>
    `;
}

function generateRoundControlsHTML(dayNumber, division, round, roundName, completedMatches, totalMatches) {
    const allCompleted = completedMatches === totalMatches && totalMatches > 0;
    
    if (!allCompleted && roundName !== "Finale" && roundName !== "Petite finale") {
        return `
            <div style="
                text-align: center;
                padding: 15px;
                background: #f8f9fa;
                border-radius: 8px;
                color: #6c757d;
                font-style: italic;
            ">
                Terminez tous les matchs pour passer au tour suivant
            </div>
        `;
    }
    
    if (allCompleted && (roundName === "Finale" || roundName === "Petite finale")) {
        return `
            <div style="
                text-align: center;
                padding: 20px;
                background: linear-gradient(135deg, #28a745, #20c997);
                color: white;
                border-radius: 10px;
                font-weight: bold;
            ">
                🎉 ${roundName} terminée ! Consultez le podium ci-dessous.
            </div>
        `;
    }
    
    // Cas spécial pour les demi-finales
    if (allCompleted && roundName === "Demi-finales") {
        return `
            <div style="
                text-align: center;
                padding: 20px;
                background: linear-gradient(135deg, #ffc107, #ffca2c);
                border-radius: 10px;
            ">
                <div style="color: #856404; font-weight: bold; margin-bottom: 15px; font-size: 16px;">
                    ✅ Demi-finales terminées !
                </div>
                <div style="display: flex; gap: 15px; justify-content: center; margin-top: 15px;">
                    <button class="btn" onclick="generatePetiteFinale(${dayNumber}, ${division})" 
                            style="
                        background: linear-gradient(135deg, #fd7e14, #e55a00);
                        color: white;
                        border: none;
                        padding: 12px 20px;
                        border-radius: 8px;
                        font-weight: bold;
                        cursor: pointer;
                    ">
                        🥉 Petite Finale
                    </button>
                    <button class="btn" onclick="generateFinale(${dayNumber}, ${division})" 
                            style="
                        background: linear-gradient(135deg, #dc3545, #c82333);
                        color: white;
                        border: none;
                        padding: 12px 20px;
                        border-radius: 8px;
                        font-weight: bold;
                        cursor: pointer;
                    ">
                        🏆 Grande Finale
                    </button>
                </div>
            </div>
        `;
    }
    
    // Pour les autres tours terminés
    if (allCompleted) {
        const nextRound = round.nextRound;
        if (nextRound) {
            return `
                <div style="
                    text-align: center;
                    padding: 20px;
                    background: linear-gradient(135deg, #ffc107, #ffca2c);
                    border-radius: 10px;
                ">
                    <div style="color: #856404; font-weight: bold; margin-bottom: 15px; font-size: 16px;">
                        ✅ Tous les matchs sont terminés !
                    </div>
                    <div style="margin-bottom: 15px; color: #6c5f00;">
                        Qualifiés : ${getQualifiedFromRound(round).join(', ')}
                    </div>
                    <button class="btn" onclick="generateNextManualRound(${dayNumber}, ${division}, '${roundName}')" 
                            style="
                        background: linear-gradient(135deg, #28a745, #20c997);
                        color: white;
                        border: none;
                        padding: 12px 25px;
                        border-radius: 8px;
                        font-size: 16px;
                        font-weight: bold;
                        cursor: pointer;
                        box-shadow: 0 3px 10px rgba(40, 167, 69, 0.3);
                    ">
                        🚀 Passer aux ${nextRound}
                    </button>
                </div>
            `;
        }
    }
    
    return '';
}

function getQualifiedFromRound(round) {
    return round.matches.filter(m => m.completed && m.winner).map(m => m.winner);
}

// ======================================
// FONCTIONS DE GESTION DES MATCHS
// ======================================

function updateManualMatchScore(matchId, scoreField, value, dayNumber) {
    console.log(`📝 Score manuel: ${matchId} - ${scoreField} = ${value}`);

    const dayData = championship.days[dayNumber];
    const numDivisions = championship.config.numDivisions || 3;
    let matchFound = false;

    // Chercher dans toutes les divisions et tous les tours
    for (let division = 1; division <= numDivisions; division++) {
        const rounds = dayData.pools.manualFinalPhase.divisions[division].rounds;

        for (const roundName in rounds) {
            const round = rounds[roundName];
            const match = round.matches.find(m => m.id === matchId);

            if (match && !match.isBye) {
                match[scoreField] = value;
                checkManualMatchCompletion(match);
                matchFound = true;

                // Vérifier si le tour est terminé
                checkRoundCompletion(dayNumber, division, roundName);

                // IMPORTANT : Rafraîchir l'affichage pour montrer les boutons
                updateManualFinalPhaseDisplay(dayNumber);

                saveToLocalStorage();
                break;
            }
        }
        if (matchFound) break;
    }

    if (!matchFound) {
        console.error(`❌ Match ${matchId} non trouvé`);
    }
}

function handleManualMatchEnter(event, matchId, dayNumber) {
    const dayData = championship.days[dayNumber];
    const numDivisions = championship.config.numDivisions || 3;
    let match = null;

    // Trouver le match
    for (let division = 1; division <= numDivisions; division++) {
        const rounds = dayData.pools.manualFinalPhase.divisions[division].rounds;
        for (const roundName in rounds) {
            match = rounds[roundName].matches.find(m => m.id === matchId);
            if (match) break;
        }
        if (match) break;
    }

    // Vérifier si on doit valider
    const shouldValidate = event.key === 'Enter' ||
                          (event.key === 'Tab' && match && match.score1 !== undefined && match.score1 !== '' &&
                           match.score2 !== undefined && match.score2 !== '');

    if (shouldValidate) {
        if (event.key === 'Tab' && (!match || match.score1 === undefined || match.score1 === '' ||
                                     match.score2 === undefined || match.score2 === '')) {
            return; // Laisser Tab naviguer normalement si scores incomplets
        }

        event.preventDefault();
        console.log(`⌨️ ${event.key} sur match ${matchId}`);

        let wasCompleted = false;
        let matchElement = event.target.closest('.manual-match');

        // Récupérer l'état du match
        for (let division = 1; division <= numDivisions; division++) {
            const rounds = dayData.pools.manualFinalPhase.divisions[division].rounds;
            for (const roundName in rounds) {
                const m = rounds[roundName].matches.find(m => m.id === matchId);
                if (m) {
                    wasCompleted = m.completed;
                    break;
                }
            }
        }

        // Rafraîchir l'affichage
        updateManualFinalPhaseDisplay(dayNumber);

        // Auto-collapse si le match vient d'être complété
        if (!wasCompleted && matchElement) {
            setTimeout(() => {
                // Re-trouver les matchs complétés après updateManualFinalPhaseDisplay
                const allManualMatches = document.querySelectorAll('.manual-match');
                allManualMatches.forEach(mm => {
                    if (mm && mm.hasAttribute('onclick')) {
                        const inputs = mm.querySelectorAll('input[type="number"]');
                        if (inputs.length > 0) {
                            const onchangeAttr = inputs[0].getAttribute('onchange');
                            if (onchangeAttr && onchangeAttr.includes(matchId)) {
                                if (!mm.classList.contains('collapsed')) {
                                    toggleMatchCollapse(mm);
                                }
                            }
                        }
                    }
                });
            }, 800);
        }

        // Passer au match suivant
        setTimeout(() => {
            const currentInput = event.target;
            // Trouver tous les inputs de score dans les phases finales
            const allInputs = Array.from(document.querySelectorAll('.manual-final-phase-content input[type="number"]'));
            const currentIndex = allInputs.indexOf(currentInput);

            if (currentIndex !== -1 && currentIndex < allInputs.length - 1) {
                // Passer au prochain input
                // Si on est sur score2, on passe au score1 du match suivant (sauter un input)
                const nextIndex = currentIndex % 2 === 1 ? currentIndex + 1 : currentIndex + 2;
                if (nextIndex < allInputs.length) {
                    allInputs[nextIndex].focus();
                    allInputs[nextIndex].select();
                }
            }
        }, 100); // Petit délai pour laisser le DOM se rafraîchir
    }
}

function checkManualMatchCompletion(match) {
    if (match.isBye) return;

    const wasCompleted = match.completed;

    if (match.score1 !== '' && match.score2 !== '') {
        const score1 = parseInt(match.score1);
        const score2 = parseInt(match.score2);

        if (score1 > score2) {
            match.completed = true;
            match.winner = match.player1;
        } else if (score2 > score1) {
            match.completed = true;
            match.winner = match.player2;
        } else {
            match.completed = true;
            match.winner = null;
        }
    } else {
        // Si l'un des scores est vide, remettre le match en attente
        match.completed = false;
        match.winner = null;
    }

    if (!wasCompleted && match.completed) {
        console.log(`🏆 Match ${match.id} terminé: ${match.winner} gagne`);
        showNotification(`🏆 ${match.winner || 'Match nul'} remporte le match !`, 'success');
    } else if (wasCompleted && !match.completed) {
        console.log(`⏸️ Match ${match.id} remis en attente`);
        showNotification(`⏸️ Match remis en attente`, 'info');
    }
}

function checkRoundCompletion(dayNumber, division, roundName) {
    const round = championship.days[dayNumber].pools.manualFinalPhase.divisions[division].rounds[roundName];
    if (!round) return;
    
    const completedMatches = round.matches.filter(m => m.completed).length;
    const totalMatches = round.matches.length;
    
    const wasCompleted = round.completed;
    round.completed = (completedMatches === totalMatches && totalMatches > 0);
    
    if (!wasCompleted && round.completed) {
        console.log(`✅ ${roundName} terminé en Division ${division}`);
        showNotification(`✅ ${roundName} terminé ! Vous pouvez passer au tour suivant.`, 'info');
        
        // Mettre à jour l'affichage
        setTimeout(() => {
            updateManualFinalPhaseDisplay(dayNumber);
        }, 500);
    }
}

// ======================================
// GÉNÉRATION DES TOURS SUIVANTS
// ======================================

function generateNextManualRound(dayNumber, division, currentRoundName) {
    console.log(`🚀 Génération tour suivant après ${currentRoundName}`);
    
    const dayData = championship.days[dayNumber];
    const currentRound = dayData.pools.manualFinalPhase.divisions[division].rounds[currentRoundName];
    
    if (!currentRound.completed) {
        alert('⚠️ Terminez d\'abord tous les matchs du tour actuel !');
        return;
    }
    
    const nextRoundName = currentRound.nextRound;
    if (!nextRoundName) {
        console.log('Pas de tour suivant défini');
        return;
    }
    
    // Récupérer les gagnants
    const winners = currentRound.matches
        .filter(match => match.completed && match.winner)
        .map(match => ({
            name: match.winner,
            seed: match.winner === match.player1 ? match.player1Seed : match.player2Seed
        }));
    
    if (winners.length < 2) {
        alert('❌ Pas assez de gagnants pour créer le tour suivant !');
        return;
    }
    
    // Créer le tour suivant
    createManualRound(dayNumber, division, nextRoundName, winners);
    
    // Mettre à jour le tour actuel
    dayData.pools.manualFinalPhase.currentRound = nextRoundName;
    
    updateManualFinalPhaseDisplay(dayNumber);
    saveToLocalStorage();
    
    showNotification(`🎯 ${nextRoundName} générés ! ${winners.length} joueurs qualifiés.`, 'success');
}

function createManualRound(dayNumber, division, roundName, players) {
    const dayData = championship.days[dayNumber];
    const rounds = dayData.pools.manualFinalPhase.divisions[division].rounds;
    
    const matches = [];
    
    for (let i = 0; i < players.length; i += 2) {
        const player1 = players[i];
        const player2 = players[i + 1];
        
        if (player1 && player2) {
            const matchData = {
                id: `${roundName}-${division}-${Math.floor(i/2) + 1}`,
                player1: player1.name,
                player2: player2.name,
                player1Seed: player1.seed,
                player2Seed: player2.seed,
                score1: '',
                score2: '',
                completed: false,
                winner: null,
                roundName: roundName,
                position: Math.floor(i/2) + 1,
                isBye: false
            };
            
            matches.push(matchData);
        }
    }
    
    rounds[roundName] = {
        name: roundName,
        matches: matches,
        completed: false,
        nextRound: getNextRoundName(roundName)
    };
    
    console.log(`✅ ${roundName} créé avec ${matches.length} matchs`);
}

// ======================================
// GESTION FINALE ET PETITE FINALE
// ======================================

function generateFinale(dayNumber, division) {
    console.log(`🏆 Génération de la GRANDE FINALE - Division ${division}`);
    
    const dayData = championship.days[dayNumber];
    const demiFinales = dayData.pools.manualFinalPhase.divisions[division].rounds["Demi-finales"];
    
    if (!demiFinales || !demiFinales.completed) {
        alert('⚠️ Les demi-finales doivent être terminées !');
        return;
    }
    
    // Récupérer les gagnants des demi-finales
    const finalistes = demiFinales.matches
        .filter(match => match.completed && match.winner)
        .map(match => ({
            name: match.winner,
            seed: match.winner === match.player1 ? match.player1Seed : match.player2Seed
        }));
    
    if (finalistes.length !== 2) {
        alert(`❌ Il faut exactement 2 finalistes ! (${finalistes.length} trouvés)`);
        return;
    }
    
    createManualRound(dayNumber, division, "Finale", finalistes);
    
    // Marquer la finale comme tour actuel
    dayData.pools.manualFinalPhase.currentRound = "Finale";
    
    updateManualFinalPhaseDisplay(dayNumber);
    saveToLocalStorage();
    
    showNotification(`🏆 GRANDE FINALE créée ! ${finalistes[0].name} vs ${finalistes[1].name}`, 'success');
}

function generatePetiteFinale(dayNumber, division) {
    console.log(`🥉 Génération de la PETITE FINALE - Division ${division}`);
    
    const dayData = championship.days[dayNumber];
    const demiFinales = dayData.pools.manualFinalPhase.divisions[division].rounds["Demi-finales"];
    
    if (!demiFinales || !demiFinales.completed) {
        alert('⚠️ Les demi-finales doivent être terminées !');
        return;
    }
    
    // Récupérer les perdants des demi-finales
    const perdants = demiFinales.matches
        .filter(match => match.completed && match.winner)
        .map(match => ({
            name: match.winner === match.player1 ? match.player2 : match.player1,
            seed: match.winner === match.player1 ? match.player2Seed : match.player1Seed
        }));
    
    if (perdants.length !== 2) {
        alert(`❌ Il faut exactement 2 perdants de demi-finale ! (${perdants.length} trouvés)`);
        return;
    }
    
    createManualRound(dayNumber, division, "Petite finale", perdants);
    
    updateManualFinalPhaseDisplay(dayNumber);
    saveToLocalStorage();
    
    showNotification(`🥉 PETITE FINALE créée ! ${perdants[0].name} vs ${perdants[1].name}`, 'info');
}

// ======================================
// PODIUM ET CLASSEMENT FINAL
// ======================================

function generatePodiumHTML(finalPhase) {
    const finale = finalPhase.rounds["Finale"];
    const petiteFinale = finalPhase.rounds["Petite finale"];
    
    if (!finale || !finale.completed) {
        return '';
    }
    
    const finaleMatch = finale.matches[0];
    if (!finaleMatch || !finaleMatch.completed) {
        return '';
    }
    
    const champion = finaleMatch.winner;
    const finaliste = finaleMatch.winner === finaleMatch.player1 ? finaleMatch.player2 : finaleMatch.player1;
    
    let troisieme = null;
    let quatrieme = null;
    
    if (petiteFinale && petiteFinale.completed && petiteFinale.matches[0] && petiteFinale.matches[0].completed) {
        const petiteFinaleMatch = petiteFinale.matches[0];
        troisieme = petiteFinaleMatch.winner;
        quatrieme = petiteFinaleMatch.winner === petiteFinaleMatch.player1 ? 
            petiteFinaleMatch.player2 : petiteFinaleMatch.player1;
    }
    
    return `
        <div class="podium-container" style="
            background: linear-gradient(135deg, #ffd700, #ffed4e);
            border: 3px solid #f39c12;
            border-radius: 20px;
            padding: 30px;
            margin-top: 30px;
            text-align: center;
            box-shadow: 0 10px 30px rgba(243, 156, 18, 0.3);
        ">
            <h3 style="
                color: #b8860b;
                margin: 0 0 25px 0;
                font-size: 1.8rem;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
            ">
                🏆 PODIUM FINAL
            </h3>
            
            <div class="podium" style="
                display: flex;
                justify-content: center;
                align-items: end;
                gap: 20px;
                margin: 25px 0;
            ">
                ${troisieme ? `
                    <div class="podium-place" style="
                        background: linear-gradient(135deg, #cd7f32, #b8722c);
                        color: white;
                        padding: 20px 15px;
                        border-radius: 15px;
                        min-width: 120px;
                        height: 100px;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        box-shadow: 0 5px 15px rgba(205, 127, 50, 0.4);
                    ">
                        <div style="font-size: 2rem; margin-bottom: 5px;">🥉</div>
                        <div style="font-weight: bold; font-size: 16px;">${troisieme}</div>
                        <div style="font-size: 12px; opacity: 0.9;">3ème place</div>
                    </div>
                ` : ''}
                
                <div class="podium-place" style="
                    background: linear-gradient(135deg, #ffd700, #ffed4e);
                    color: #b8860b;
                    padding: 25px 20px;
                    border-radius: 15px;
                    min-width: 140px;
                    height: 140px;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    box-shadow: 0 8px 25px rgba(255, 215, 0, 0.5);
                    transform: scale(1.1);
                ">
                    <div style="font-size: 3rem; margin-bottom: 8px;">🏆</div>
                    <div style="font-weight: bold; font-size: 18px; text-shadow: 1px 1px 2px rgba(0,0,0,0.3);">
                        ${champion}
                    </div>
                    <div style="font-size: 14px; font-weight: bold;">CHAMPION</div>
                </div>
                
                <div class="podium-place" style="
                    background: linear-gradient(135deg, #c0c0c0, #a8a8a8);
                    color: white;
                    padding: 20px 15px;
                    border-radius: 15px;
                    min-width: 120px;
                    height: 120px;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    box-shadow: 0 5px 15px rgba(192, 192, 192, 0.4);
                ">
                    <div style="font-size: 2.5rem; margin-bottom: 5px;">🥈</div>
                    <div style="font-weight: bold; font-size: 16px;">${finaliste}</div>
                    <div style="font-size: 12px; opacity: 0.9;">Finaliste</div>
                </div>
            </div>
            
            ${quatrieme ? `
                <div style="
                    background: rgba(255, 255, 255, 0.8);
                    padding: 10px 20px;
                    border-radius: 10px;
                    margin-top: 15px;
                    color: #6c757d;
                ">
                    <strong>4ème place :</strong> ${quatrieme}
                </div>
            ` : ''}
            
            <div style="
                margin-top: 20px;
                font-size: 14px;
                color: #856404;
                font-style: italic;
            ">
                🎉 Félicitations à tous les participants ! 🎉
            </div>
        </div>
    `;
}

// ======================================
// FONCTIONS D'EXPORT ET UTILITAIRES
// ======================================

function exportManualFinalResults(dayNumber) {
    const dayData = championship.days[dayNumber];
    if (!dayData.pools || !dayData.pools.manualFinalPhase || !dayData.pools.manualFinalPhase.enabled) {
        alert('Aucune phase finale manuelle à exporter !');
        return;
    }
    
    const exportData = {
        version: "2.0",
        exportDate: new Date().toISOString(),
        exportType: "manual_final_phase_results",
        dayNumber: dayNumber,
        results: {}
    };
    
    for (let division = 1; division <= 3; division++) {
        const finalPhase = dayData.pools.manualFinalPhase.divisions[division];
        
        if (Object.keys(finalPhase.rounds).length > 0) {
            exportData.results[division] = {
                qualified: finalPhase.qualified,
                rounds: finalPhase.rounds,
                champion: getChampionFromFinalPhase(finalPhase),
                podium: getPodiumFromFinalPhase(finalPhase)
            };
        }
    }
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `resultats_phase_finale_manuelle_J${dayNumber}_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification(`Résultats phase finale manuelle J${dayNumber} exportés !`, 'success');
}

function getChampionFromFinalPhase(finalPhase) {
    const finale = finalPhase.rounds["Finale"];
    if (finale && finale.completed && finale.matches[0] && finale.matches[0].completed) {
        return finale.matches[0].winner;
    }
    return null;
}

function getPodiumFromFinalPhase(finalPhase) {
    const finale = finalPhase.rounds["Finale"];
    const petiteFinale = finalPhase.rounds["Petite finale"];
    
    if (!finale || !finale.completed || !finale.matches[0] || !finale.matches[0].completed) {
        return null;
    }
    
    const finaleMatch = finale.matches[0];
    const podium = {
        champion: finaleMatch.winner,
        finaliste: finaleMatch.winner === finaleMatch.player1 ? finaleMatch.player2 : finaleMatch.player1,
        troisieme: null,
        quatrieme: null
    };
    
    if (petiteFinale && petiteFinale.completed && petiteFinale.matches[0] && petiteFinale.matches[0].completed) {
        const petiteFinaleMatch = petiteFinale.matches[0];
        podium.troisieme = petiteFinaleMatch.winner;
        podium.quatrieme = petiteFinaleMatch.winner === petiteFinaleMatch.player1 ? 
            petiteFinaleMatch.player2 : petiteFinaleMatch.player1;
    }
    
    return podium;
}

function resetManualFinalPhase(dayNumber) {
    if (!confirm('⚠️ Supprimer toute la phase finale manuelle ?\n\nCela supprimera tous les matchs et résultats, mais conservera les poules.')) {
        return;
    }
    
    const dayData = championship.days[dayNumber];
    if (dayData.pools && dayData.pools.manualFinalPhase) {
        dayData.pools.manualFinalPhase.enabled = false;
        dayData.pools.manualFinalPhase.currentRound = null;
        
        for (let division = 1; division <= 3; division++) {
            dayData.pools.manualFinalPhase.divisions[division] = {
                qualified: [],
                rounds: {},
                champion: null,
                runnerUp: null,
                third: null,
                fourth: null
            };
        }
    }
    
    // Supprimer l'affichage
    for (let division = 1; division <= 3; division++) {
        const container = document.getElementById(`division${dayNumber}-${division}-matches`);
        if (container) {
            const finalPhaseContainer = container.querySelector('.manual-final-phase-container');
            if (finalPhaseContainer) {
                finalPhaseContainer.remove();
            }
        }
    }
    
    saveToLocalStorage();
    showNotification('Phase finale manuelle réinitialisée', 'warning');
}

// ======================================
// INTÉGRATION AVEC LE SYSTÈME EXISTANT
// ======================================

// Remplacer la fonction generateFinalPhase existante
window.generateFinalPhase = generateManualFinalPhase;
window.updateManualMatchScore = updateManualMatchScore;
window.handleManualMatchEnter = handleManualMatchEnter;
window.generateNextManualRound = generateNextManualRound;
window.generateFinale = generateFinale;
window.generatePetiteFinale = generatePetiteFinale;
window.exportManualFinalResults = exportManualFinalResults;
window.resetManualFinalPhase = resetManualFinalPhase;

// Améliorer le bouton phase finale
const originalCheckPoolsCompletion = window.checkPoolsCompletion;
if (originalCheckPoolsCompletion) {
    window.checkPoolsCompletion = function(dayNumber) {
        const result = originalCheckPoolsCompletion(dayNumber);
        
        const finalButton = document.getElementById(`final-phase-btn-${dayNumber}`);
        if (finalButton && result) {
            const dayData = championship.days[dayNumber];
            if (dayData.pools && dayData.pools.manualFinalPhase && dayData.pools.manualFinalPhase.enabled) {
                finalButton.innerHTML = '🔄 Gérer Phase Finale';
                finalButton.style.background = 'linear-gradient(135deg, #16a085, #1abc9c)';
                finalButton.onclick = () => updateManualFinalPhaseDisplay(dayNumber);
            } else {
                finalButton.innerHTML = '🏆 Phase Finale Manuelle';
                finalButton.style.background = 'linear-gradient(135deg, #f39c12, #e67e22)';
            }
        }
        
        return result;
    };
}

// Hook pour l'initialisation
const originalInitializePoolsForDay = window.initializePoolsForDay;
if (originalInitializePoolsForDay) {
    window.initializePoolsForDay = function(dayNumber) {
        originalInitializePoolsForDay(dayNumber);
        
        // Initialiser les phases finales manuelles si elles existent
        const dayData = championship.days[dayNumber];
        if (dayData.pools && dayData.pools.manualFinalPhase && dayData.pools.manualFinalPhase.enabled) {
            initializeManualFinalPhase(dayNumber);
            updateManualFinalPhaseDisplay(dayNumber);
        }
    };
}

console.log("✅ Système de phases finales MANUELLES chargé avec succès !");
console.log("🎮 Fonctions disponibles :");
console.log("  - generateFinalPhase() : Initialiser les phases finales");
console.log("  - exportManualFinalResults() : Exporter les résultats"); 
console.log("  - resetManualFinalPhase() : Réinitialiser");
console.log("🏆 Contrôle total : Vous décidez quand passer au tour suivant !");

// ======================================
// CORRECTIF - SUPPRESSION SPINNERS ET AGRANDISSEMENT CHAMPS
// ======================================

// Ajouter ce CSS pour supprimer les spinners et agrandir les champs
function addScoreInputStyles() {
    // Vérifier si le style n'existe pas déjà
    if (document.getElementById('score-input-styles')) {
        return;
    }
    
    const style = document.createElement('style');
    style.id = 'score-input-styles';
    style.textContent = `
        /* Supprimer les spinners des inputs number */
        input[type="number"]::-webkit-outer-spin-button,
        input[type="number"]::-webkit-inner-spin-button {
            -webkit-appearance: none !important;
            margin: 0 !important;
        }
        
        input[type="number"] {
            -moz-appearance: textfield !important;
        }
        
        /* Agrandir les champs de score dans les phases finales */
        .manual-match input[type="number"] {
            width: 45px !important;
            height: 35px !important;
            font-size: 15px !important;
            font-weight: bold !important;
            text-align: center !important;
            padding: 8px 4px !important;
            border: 2px solid #007bff !important;
            border-radius: 6px !important;
            background: white !important;
        }
        
        .manual-match input[type="number"]:focus {
            border-color: #0056b3 !important;
            box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.25) !important;
            outline: none !important;
        }
        
        /* Améliorer aussi la lisibilité du séparateur */
        .manual-match .sets span {
            font-size: 16px !important;
            font-weight: bold !important;
            color: #495057 !important;
            margin: 0 2px !important;
        }
        
        /* Espacement des sets */
        .manual-match .sets > div {
            padding: 10px 8px !important;
        }
    `;
    
    document.head.appendChild(style);
    console.log("✅ Styles des champs de score améliorés - Spinners supprimés, champs agrandis");
}

// Fonction pour mettre à jour le HTML de génération des matchs avec de plus gros champs
function generateManualMatchHTMLImproved(dayNumber, division, match, roundName) {
    const isCompleted = match.completed;
    const isActive = !match.isBye;
    
    return `
        <div class="manual-match" style="
            background: ${isCompleted ? '#d5f4e6' : isActive ? 'white' : '#f8f9fa'};
            border: 2px solid ${isCompleted ? '#28a745' : isActive ? '#007bff' : '#6c757d'};
            border-radius: 10px;
            padding: 15px;
            ${match.isBye ? 'opacity: 0.7;' : ''}
        ">
            <div class="match-header" style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
            ">
                <div class="match-title" style="
                    font-size: 13px;
                    color: #6c757d;
                    font-weight: bold;
                ">
                    Match ${match.position}
                </div>
                <div class="match-status" style="
                    font-size: 12px;
                    padding: 4px 10px;
                    border-radius: 15px;
                    font-weight: bold;
                    background: ${isCompleted ? '#d4edda' : isActive ? '#cce5ff' : '#e2e3e5'};
                    color: ${isCompleted ? '#155724' : isActive ? '#004085' : '#6c757d'};
                ">
                    ${isCompleted ? 'Terminé ✅' : match.isBye ? 'Qualifié ⚡' : 'En cours 🎯'}
                </div>
            </div>
            
            <div class="players" style="
                font-weight: bold;
                color: #2c3e50;
                margin-bottom: ${match.isBye ? '0' : '18px'};
                font-size: 16px;
                text-align: center;
            ">
                ${match.player1Seed ? `#${match.player1Seed}` : ''} ${match.player1}
                ${!match.isBye ? ` VS ${match.player2Seed ? `#${match.player2Seed}` : ''} ${match.player2}` : ''}
            </div>
            
            ${match.isBye ? `
                <div style="
                    text-align: center;
                    color: #28a745;
                    font-style: italic;
                    padding: 10px;
                ">
                    Qualifié automatiquement
                </div>
            ` : `
                <div class="score-container" style="
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    gap: 15px;
                    margin-bottom: 15px;
                    padding: 15px;
                    background: #f8f9fa;
                    border: 1px solid #dee2e6;
                    border-radius: 8px;
                ">
                    <div style="text-align: center;">
                        <div style="font-size: 12px; color: #6c757d; margin-bottom: 5px; font-weight: bold;">
                            ${match.player1}
                        </div>
                        <input type="number"
                               value="${match.score1 || ''}"
                               placeholder="0"
                               min="0"
                               max="30"
                               onchange="updateManualMatchScore('${match.id}', 'score1', this.value, ${dayNumber})"
                               onkeydown="handleManualMatchEnter(event, '${match.id}', ${dayNumber})"
                               style="
                                   width: 55px;
                                   height: 45px;
                                   text-align: center;
                                   border: 2px solid #007bff;
                                   border-radius: 8px;
                                   font-size: 18px;
                                   font-weight: bold;
                                   background: white;
                                   padding: 8px 4px;
                               ">
                    </div>
                    <span style="color: #495057; font-weight: bold; font-size: 20px;">-</span>
                    <div style="text-align: center;">
                        <div style="font-size: 12px; color: #6c757d; margin-bottom: 5px; font-weight: bold;">
                            ${match.player2}
                        </div>
                        <input type="number"
                               value="${match.score2 || ''}"
                               placeholder="0"
                               min="0"
                               max="30"
                               onchange="updateManualMatchScore('${match.id}', 'score2', this.value, ${dayNumber})"
                               onkeydown="handleManualMatchEnter(event, '${match.id}', ${dayNumber})"
                               style="
                                   width: 55px;
                                   height: 45px;
                                   text-align: center;
                                   border: 2px solid #007bff;
                                   border-radius: 8px;
                                   font-size: 18px;
                                   font-weight: bold;
                                   background: white;
                                   padding: 8px 4px;
                               ">
                    </div>
                </div>
                
                <div class="match-result" style="
                    text-align: center;
                    padding: 10px;
                    border-radius: 6px;
                    font-weight: bold;
                    background: ${isCompleted ? '#d4edda' : '#fff3cd'};
                    color: ${isCompleted ? '#155724' : '#856404'};
                    font-size: 14px;
                ">
                    ${isCompleted && match.winner ? `🏆 ${match.winner} gagne` : 'En attente des scores'}
                </div>
            `}
        </div>
    `;
}

// Remplacer la fonction existante
window.generateManualMatchHTML = generateManualMatchHTMLImproved;

// Appliquer les styles au chargement
addScoreInputStyles();

console.log("✅ Champs de score améliorés - Plus grands, sans spinners, meilleure UX !");

    // ======================================
// FONCTION MANQUANTE - getQualifiedPlayersFromPools
// ======================================

function getQualifiedPlayersFromPools(pools, matches, qualifiedPerPool) {
    const allQualified = [];
    
    pools.forEach((pool, poolIndex) => {
        // Calculer le classement de cette poule
        const playerStats = pool.map(player => {
            let wins = 0, losses = 0, pointsWon = 0, pointsLost = 0;

            const poolMatches = matches.filter(m => m.poolIndex === poolIndex && m.completed);

            poolMatches.forEach(match => {
                const isPlayer1 = match.player1 === player;
                const isPlayer2 = match.player2 === player;

                if (isPlayer1 || isPlayer2) {
                    if (match.winner === player) wins++;
                    else losses++;

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

            return {
                name: player,
                wins, losses, pointsWon, pointsLost,
                diff: pointsWon - pointsLost,
                points: wins * 3 + losses * 1,
                poolIndex: poolIndex,
                poolName: String.fromCharCode(65 + poolIndex)
            };
        });

        // Trier et prendre les N premiers
        playerStats.sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.diff !== a.diff) return b.diff - a.diff;
            return b.pointsWon - a.pointsWon;
        });
        
        const qualified = playerStats.slice(0, qualifiedPerPool);
        qualified.forEach(player => {
            player.seed = allQualified.length + 1; // Seed global
        });
        
        allQualified.push(...qualified);
    });
    
    return allQualified;
}

// ======================================
// SYSTÈME D'IMPRESSION DES FEUILLES DE MATCH
// ======================================

// Fonction principale pour imprimer les feuilles de match
function printMatchSheets(dayNumber) {
    if (!dayNumber) dayNumber = championship.currentDay;
    
    console.log(`📋 Génération des feuilles de match pour la Journée ${dayNumber}`);
    
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
                dayNumber: dayNumber
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
                dayNumber: dayNumber
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

// Exporter les nouvelles fonctions
window.generateMatchSheetHTML = generateMatchSheetHTML;
window.generateCompactMatchSheet = generateCompactMatchSheet;

console.log('✅ Version compacte installée - 5 matchs par page optimisés !');



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

        // Créer le bouton d'impression Boccia
        const bocciaButton = document.createElement('button');
        bocciaButton.className = 'btn print-boccia-btn';
        bocciaButton.innerHTML = '🎾 Imprimer Boccia';
        bocciaButton.style.background = 'linear-gradient(135deg, #16a085, #1abc9c)';
        bocciaButton.style.color = 'white';
        bocciaButton.onclick = () => printBocciaMatchSheets(dayNumber);
        bocciaButton.title = 'Imprimer les feuilles de match Boccia (4 par page, 4 manches + manche en or)';

        // Insérer après le bouton "Classements" s'il existe
        const rankingsButton = controlButtonsContainer.querySelector('button[onclick*="updateRankings"]');
        if (rankingsButton) {
            rankingsButton.insertAdjacentElement('afterend', bocciaButton);
        } else {
            // Sinon l'insérer au début
            controlButtonsContainer.insertBefore(bocciaButton, controlButtonsContainer.firstChild);
        }
    });
}

// ===============================================
// FEUILLES DE MATCH BOCCIA (4 par page A4)
// ===============================================

function printBocciaMatchSheets(dayNumber) {
    if (!dayNumber) dayNumber = championship.currentDay;

    console.log(`🎾 Génération des feuilles de match Boccia pour la Journée ${dayNumber}`);

    const dayData = championship.days[dayNumber];
    if (!dayData) {
        alert('Aucune donnée trouvée pour cette journée !');
        return;
    }

    // Collecter tous les matchs
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
    // Afficher le numéro de terrain si disponible
    const terrainInfo = match.court ? ` • Terrain ${match.court}` : '';

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
// EXPORT EXPLICITE VERS WINDOW - TRÈS IMPORTANT
// ===============================================
window.printMatchSheets = printMatchSheets;
window.printBocciaMatchSheets = printBocciaMatchSheets;
window.addPrintMatchesButton = addPrintMatchesButton;
window.getDivisionMatches = getDivisionMatches;
window.groupMatchesIntoPages = groupMatchesIntoPages;
window.generateMatchSheetHTML = generateMatchSheetHTML;
window.generateCompactMatchSheet = generateCompactMatchSheet;
window.generateBocciaSheetHTML = generateBocciaSheetHTML;
window.generateBocciaMatchCard = generateBocciaMatchCard;
window.openPrintWindow = openPrintWindow;

console.log('✅ Système d\'impression des feuilles de match installé !');
console.log('✅ Système Boccia installé !');
console.log('📋 Fonctions exportées vers window:', Object.keys(window).filter(k => k.includes('print')));

// Ajouter automatiquement les boutons au chargement et lors de la création de nouvelles journées
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔄 DOM chargé - Ajout des boutons d\'impression...');
    setTimeout(addPrintMatchesButton, 1000);
});

// Hook pour les nouvelles journées
const originalCreateDayContent = window.createDayContent;
if (originalCreateDayContent) {
    window.createDayContent = function(dayNumber) {
        const result = originalCreateDayContent(dayNumber);
        setTimeout(() => {
            console.log(`🔄 Journée ${dayNumber} créée - Ajout bouton impression...`);
            addPrintMatchesButton();
        }, 200);
        return result;
    };
    console.log('🎣 Hook createDayContent installé');
}

// Ajouter immédiatement si le DOM est déjà chargé
if (document.readyState === 'loading') {
    // DOM pas encore chargé
    console.log('⏳ DOM en cours de chargement...');
} else {
    // DOM déjà chargé
    console.log('✅ DOM déjà chargé - Ajout immédiat des boutons...');
    setTimeout(addPrintMatchesButton, 500);
}
    console.log("=== SCRIPT CHARGÉ AVEC SUCCÈS ===");
    
    // ============================================
    // MODE CHRONO - GESTION DE COURSES MULTIPLES
    // ============================================

    let raceData = {
        events: [], // Liste de toutes les épreuves (ex: 400m Dames)
        currentEvent: null, // Épreuve actuellement affichée
        editingEventId: null, // ID de l'épreuve en cours d'édition
        nextEventId: 1,
        series: [], // Liste de toutes les séries (DEPRECATED - sera migré vers events[].series)
        currentSerie: null, // Série en cours d'exécution
        editingSerieId: null, // ID de la série en cours d'édition
        nextSerieId: 1,
        participants: [], // Liste des participants du mode chrono (athlètes ou équipes)
        nextParticipantId: 1,
        customFields: [], // Colonnes personnalisées (âge, nationalité, club, etc.)
        nextCustomFieldId: 1
    };

    window.raceData = raceData;

    // Toggle Mode Chrono
    window.toggleChronoMode = function() {
        const checkbox = document.getElementById('chronoModeCheckbox');
        const chronoSection = document.getElementById('chronoModeSection');
        const dayContent = document.querySelector('.day-content.active');
        const divisionConfigContainer = document.getElementById('divisionConfigContainer');
        const courtConfigContainer = document.getElementById('courtConfigContainer');
        const courtAssignmentInfo = document.getElementById('courtAssignmentInfo');
        const applyConfigBtn = document.getElementById('applyConfigBtn');
        const tabsContainer = document.getElementById('tabsContainer');

        if (checkbox.checked) {
            // MODE CHRONO ACTIVÉ
            // Charger les données chrono depuis localStorage au premier affichage
            loadChronoFromLocalStorage();
            chronoSection.style.display = 'block';
            if (dayContent) dayContent.style.display = 'none';

            // Masquer les options Divisions et Terrains (non pertinentes en mode chrono)
            if (divisionConfigContainer) divisionConfigContainer.style.display = 'none';
            if (courtConfigContainer) courtConfigContainer.style.display = 'none';
            if (courtAssignmentInfo) courtAssignmentInfo.style.display = 'none';
            if (applyConfigBtn) applyConfigBtn.style.display = 'none';

            // Masquer les onglets J1 et Classement Général
            if (tabsContainer) tabsContainer.style.display = 'none';

            displayEventsList();
            displayParticipantsList();
        } else {
            // MODE CHAMPIONNAT
            chronoSection.style.display = 'none';
            if (dayContent) dayContent.style.display = 'block';

            // Réafficher les options Divisions et Terrains
            if (divisionConfigContainer) divisionConfigContainer.style.display = 'flex';
            if (courtConfigContainer) courtConfigContainer.style.display = 'flex';
            if (courtAssignmentInfo) courtAssignmentInfo.style.display = 'block';
            if (applyConfigBtn) applyConfigBtn.style.display = 'block';

            // Réafficher les onglets
            if (tabsContainer) tabsContainer.style.display = 'block';
        }
    };

    // Afficher la liste des séries
    function displaySeriesList() {
        const seriesList = document.getElementById('seriesList');
        const noSeriesMessage = document.getElementById('noSeriesMessage');

        if (raceData.series.length === 0) {
            seriesList.style.display = 'none';
            noSeriesMessage.style.display = 'block';
            return;
        }

        seriesList.style.display = 'grid';
        noSeriesMessage.style.display = 'none';

        const sportEmoji = {
            running: '🏃',
            cycling: '🚴',
            swimming: '🏊'
        };

        seriesList.innerHTML = raceData.series.map(serie => {
            const statusColor = serie.status === 'completed' ? '#27ae60' :
                               serie.status === 'running' ? '#3498db' : '#95a5a6';
            const statusText = serie.status === 'completed' ? '✅ Terminée' :
                              serie.status === 'running' ? '▶️ En cours' : '⏸️ En attente';

            return `
                <div style="border: 2px solid ${statusColor}; border-radius: 10px; padding: 15px; background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.1); transition: all 0.3s ease;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                        <div>
                            <h4 style="margin: 0 0 5px 0; color: #2c3e50;">
                                ${sportEmoji[serie.sportType]} ${serie.name}
                            </h4>
                            <div style="display: flex; gap: 15px; flex-wrap: wrap; font-size: 13px; color: #7f8c8d;">
                                <span>📏 ${serie.distance}m</span>
                                <span>👥 ${serie.participants.length} participants</span>
                                ${serie.raceType === 'relay' ? `<span>⏰ ${serie.relayDuration} min</span>` : ''}
                            </div>
                        </div>
                        <span style="background: ${statusColor}; color: white; padding: 5px 10px; border-radius: 5px; font-size: 12px; white-space: nowrap;">
                            ${statusText}
                        </span>
                    </div>

                    <div style="display: flex; gap: 10px; margin-top: 15px; flex-wrap: wrap;">
                        ${serie.status === 'pending' ? `
                            <button class="btn btn-success" onclick="startSerie(${serie.id})" style="flex: 1; min-width: 120px;">
                                ▶️ Lancer
                            </button>
                            <button class="btn" onclick="editSerie(${serie.id})" style="background: #3498db; flex: 1; min-width: 120px;">
                                ✏️ Modifier
                            </button>
                            <button class="btn btn-danger" onclick="deleteSerie(${serie.id})" style="flex: 1; min-width: 120px;">
                                🗑️ Supprimer
                            </button>
                        ` : serie.status === 'running' ? `
                            <button class="btn" onclick="continueSerie(${serie.id})" style="background: #3498db; flex: 1;">
                                📊 Gérer
                            </button>
                        ` : `
                            <button class="btn" onclick="viewSerieResults(${serie.id})" style="background: #27ae60; flex: 1;">
                                🏆 Résultats
                            </button>
                            <button class="btn" onclick="editSerie(${serie.id})" style="background: #3498db; flex: 1; min-width: 120px;">
                                ✏️ Modifier
                            </button>
                            <button class="btn btn-danger" onclick="deleteSerie(${serie.id})" style="flex: 1; min-width: 120px;">
                                🗑️ Supprimer
                            </button>
                        `}
                    </div>
                </div>
            `;
        }).join('');
    }

    // Gestion des participants du mode chrono
    window.showParticipantsManager = function() {
        displayParticipantsList();
        document.getElementById('participantsManagerModal').style.display = 'block';
    };

    window.closeParticipantsManager = function() {
        document.getElementById('participantsManagerModal').style.display = 'none';
    };

    window.addParticipantToChrono = function() {
        const name = document.getElementById('participantName').value.trim();
        const category = document.getElementById('participantCategory').value.trim();
        const bib = document.getElementById('participantBib').value.trim();
        const age = document.getElementById('participantAge').value.trim();
        const nationality = document.getElementById('participantNationality').value.trim();
        const club = document.getElementById('participantClub').value.trim();

        if (!name) {
            showNotification('Veuillez entrer un nom ou une équipe', 'warning');
            return;
        }

        if (!category) {
            showNotification('Veuillez entrer une catégorie', 'warning');
            return;
        }

        if (!bib) {
            showNotification('Veuillez entrer un dossard', 'warning');
            return;
        }

        // Vérifier si le dossard existe déjà
        const existingBib = raceData.participants.find(p => p.bib === bib);
        if (existingBib) {
            showNotification('Ce numéro de dossard est déjà utilisé', 'error');
            return;
        }

        const participant = {
            id: raceData.nextParticipantId++,
            name: name,
            category: category,
            bib: bib,
            age: age || null,
            nationality: nationality || null,
            club: club || null
        };

        raceData.participants.push(participant);

        // Réinitialiser le formulaire
        document.getElementById('participantName').value = '';
        document.getElementById('participantCategory').value = '';
        document.getElementById('participantBib').value = '';
        document.getElementById('participantAge').value = '';
        document.getElementById('participantNationality').value = '';
        document.getElementById('participantClub').value = '';

        displayParticipantsList();
        saveChronoToLocalStorage();
        showNotification('Participant ajouté avec succès', 'success');
    };

    function displayParticipantsList() {
        const participantsList = document.getElementById('participantsList');

        if (raceData.participants.length === 0) {
            participantsList.innerHTML = '<p style="color: #7f8c8d; text-align: center; padding: 20px;">Aucun participant ajouté.</p>';
            return;
        }

        // Trier par dossard
        const sortedParticipants = [...raceData.participants].sort((a, b) => {
            const bibA = parseInt(a.bib) || a.bib;
            const bibB = parseInt(b.bib) || b.bib;
            if (typeof bibA === 'number' && typeof bibB === 'number') {
                return bibA - bibB;
            }
            return String(a.bib).localeCompare(String(b.bib));
        });

        participantsList.innerHTML = `
            <div style="display: grid; gap: 10px;">
                ${sortedParticipants.map(participant => {
                    // Construire les infos supplémentaires
                    const extraInfo = [];
                    if (participant.age) extraInfo.push(`🎂 ${participant.age} ans`);
                    if (participant.nationality) extraInfo.push(`🌍 ${participant.nationality}`);
                    if (participant.club) extraInfo.push(`🏅 ${participant.club}`);

                    return `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; background: #f8f9fa; border-radius: 8px; border: 2px solid #ddd; transition: all 0.3s;">
                        <div style="display: flex; gap: 20px; align-items: center; flex: 1;">
                            <div style="background: linear-gradient(135deg, #16a085, #1abc9c); color: white; padding: 10px 15px; border-radius: 8px; font-weight: bold; min-width: 60px; text-align: center;">
                                ${participant.bib}
                            </div>
                            <div style="flex: 1;">
                                <div style="font-weight: bold; font-size: 16px; color: #2c3e50; margin-bottom: 5px;">
                                    🏃 ${participant.name}
                                </div>
                                <div style="font-size: 14px; color: #7f8c8d; margin-bottom: 3px;">
                                    📋 ${participant.category}
                                </div>
                                ${extraInfo.length > 0 ? `
                                    <div style="font-size: 13px; color: #95a5a6; margin-top: 5px;">
                                        ${extraInfo.join(' • ')}
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                        <div style="display: flex; gap: 10px;">
                            <button class="btn" onclick="editParticipant(${participant.id})" style="background: #3498db; padding: 8px 15px;">
                                ✏️ Éditer
                            </button>
                            <button class="btn btn-danger" onclick="deleteParticipant(${participant.id})" style="padding: 8px 15px;">
                                🗑️
                            </button>
                        </div>
                    </div>
                `}).join('')}
            </div>
        `;
    }

    window.editParticipant = function(id) {
        const participant = raceData.participants.find(p => p.id === id);
        if (!participant) return;

        raceData.editingParticipantId = id;
        document.getElementById('editParticipantName').value = participant.name;
        document.getElementById('editParticipantCategory').value = participant.category;
        document.getElementById('editParticipantBib').value = participant.bib;
        document.getElementById('editParticipantAge').value = participant.age || '';
        document.getElementById('editParticipantNationality').value = participant.nationality || '';
        document.getElementById('editParticipantClub').value = participant.club || '';

        document.getElementById('editParticipantModal').style.display = 'block';
    };

    window.closeEditParticipantModal = function() {
        document.getElementById('editParticipantModal').style.display = 'none';
        raceData.editingParticipantId = null;
    };

    window.saveParticipantEdit = function() {
        const name = document.getElementById('editParticipantName').value.trim();
        const category = document.getElementById('editParticipantCategory').value.trim();
        const bib = document.getElementById('editParticipantBib').value.trim();
        const age = document.getElementById('editParticipantAge').value.trim();
        const nationality = document.getElementById('editParticipantNationality').value.trim();
        const club = document.getElementById('editParticipantClub').value.trim();

        if (!name || !category || !bib) {
            showNotification('Les champs Nom, Catégorie et Dossard sont obligatoires', 'warning');
            return;
        }

        const participant = raceData.participants.find(p => p.id === raceData.editingParticipantId);
        if (!participant) return;

        // Vérifier si le dossard existe déjà (sauf pour le participant actuel)
        const existingBib = raceData.participants.find(p => p.bib === bib && p.id !== raceData.editingParticipantId);
        if (existingBib) {
            showNotification('Ce numéro de dossard est déjà utilisé', 'error');
            return;
        }

        participant.name = name;
        participant.category = category;
        participant.bib = bib;
        participant.age = age || null;
        participant.nationality = nationality || null;
        participant.club = club || null;

        displayParticipantsList();
        closeEditParticipantModal();
        saveChronoToLocalStorage();
        showNotification('Participant modifié avec succès', 'success');
    };

    window.deleteParticipant = function(id) {
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce participant ?')) {
            return;
        }

        const index = raceData.participants.findIndex(p => p.id === id);
        if (index !== -1) {
            raceData.participants.splice(index, 1);
            displayParticipantsList();
            saveChronoToLocalStorage();
            showNotification('Participant supprimé', 'success');
        }
    };

    // Ajout en masse de participants
    let bulkParticipantsData = [];

    window.showBulkParticipantsModal = function() {
        document.getElementById('bulkParticipantsText').value = '';
        document.getElementById('bulkParticipantsPreview').style.display = 'none';
        bulkParticipantsData = [];
        updateBulkImportFormat(); // Mettre à jour le format selon les colonnes sélectionnées
        document.getElementById('bulkParticipantsModal').style.display = 'block';
    };

    // Mettre à jour le format d'import selon les colonnes sélectionnées
    window.updateBulkImportFormat = function() {
        const hasAge = document.getElementById('bulkCol_age').checked;
        const hasNationality = document.getElementById('bulkCol_nationality').checked;
        const hasClub = document.getElementById('bulkCol_club').checked;

        // Construire les colonnes
        const columns = ['Dossard', 'Nom', 'Catégorie'];
        const exampleTab = ['42', 'Jean Dupont', 'Senior'];
        const exampleCSV = ['42', 'Jean Dupont', 'Senior'];

        if (hasAge) {
            columns.push('Âge');
            exampleTab.push('28');
            exampleCSV.push('28');
        }
        if (hasNationality) {
            columns.push('Nationalité');
            exampleTab.push('France');
            exampleCSV.push('France');
        }
        if (hasClub) {
            columns.push('Club');
            exampleTab.push('AC Paris');
            exampleCSV.push('AC Paris');
        }

        // Générer le HTML du format
        const formatHTML = `
            <div style="margin-bottom: 5px;"><strong>Format 1 (avec tabulations) :</strong> ${columns.join(' &nbsp;&nbsp;&nbsp; ')}</div>
            <div style="margin-bottom: 5px;">Exemple: ${exampleTab.join(' &nbsp;&nbsp;&nbsp; ')}</div>
            <div style="margin: 10px 0;"><strong>Format 2 (avec virgules) :</strong> ${columns.join(',')}</div>
            <div>Exemple: ${exampleCSV.join(',')}</div>
        `;

        document.getElementById('bulkFormatExample').innerHTML = formatHTML;

        // Mettre à jour le placeholder du textarea
        const placeholderTab = `${exampleTab.join('\t')}\n43\tMarie Martin\tU18${hasAge ? '\t25' : ''}${hasNationality ? '\tBelgique' : ''}${hasClub ? '\tRC Liège' : ''}`;
        const placeholderCSV = `${exampleCSV.join(',')}\n43,Marie Martin,U18${hasAge ? ',25' : ''}${hasNationality ? ',Belgique' : ''}${hasClub ? ',RC Liège' : ''}`;

        document.getElementById('bulkParticipantsText').placeholder =
            `Exemple avec tabulations:\n${placeholderTab}\n\nou avec virgules:\n${placeholderCSV}`;
    };

    window.closeBulkParticipantsModal = function() {
        document.getElementById('bulkParticipantsModal').style.display = 'none';
        bulkParticipantsData = [];
    };

    window.previewBulkParticipants = function() {
        const text = document.getElementById('bulkParticipantsText').value.trim();

        if (!text) {
            showNotification('Veuillez coller des données', 'warning');
            return;
        }

        // Récupérer les colonnes sélectionnées
        const hasAge = document.getElementById('bulkCol_age').checked;
        const hasNationality = document.getElementById('bulkCol_nationality').checked;
        const hasClub = document.getElementById('bulkCol_club').checked;

        const expectedColumns = 3 + (hasAge ? 1 : 0) + (hasNationality ? 1 : 0) + (hasClub ? 1 : 0);

        const lines = text.split('\n').filter(line => line.trim());
        bulkParticipantsData = [];
        const errors = [];

        lines.forEach((line, index) => {
            const lineNum = index + 1;
            let parts;

            // Détecter le format (tabulation ou virgule)
            if (line.includes('\t')) {
                parts = line.split('\t').map(p => p.trim());
            } else if (line.includes(',')) {
                parts = line.split(',').map(p => p.trim());
            } else {
                // Essayer de split par espaces multiples
                parts = line.split(/\s{2,}/).map(p => p.trim());
            }

            // Filtrer les parties vides à la fin
            while (parts.length > 0 && !parts[parts.length - 1]) {
                parts.pop();
            }

            if (parts.length < 3) {
                errors.push(`Ligne ${lineNum}: format invalide (minimum 3 colonnes: dossard, nom, catégorie)`);
                return;
            }

            const [bib, name, category, ...extraFields] = parts;

            if (!bib || !name || !category) {
                errors.push(`Ligne ${lineNum}: colonnes obligatoires vides`);
                return;
            }

            // Vérifier si le dossard existe déjà
            const existingBib = raceData.participants.find(p => p.bib === bib);
            const duplicateBib = bulkParticipantsData.find(p => p.bib === bib);

            if (existingBib) {
                errors.push(`Ligne ${lineNum}: dossard ${bib} déjà utilisé`);
                return;
            }

            if (duplicateBib) {
                errors.push(`Ligne ${lineNum}: dossard ${bib} dupliqué dans l'import`);
                return;
            }

            // Construire l'objet participant avec les champs supplémentaires
            const participant = {
                bib: bib,
                name: name,
                category: category,
                age: null,
                nationality: null,
                club: null
            };

            // Parser les champs supplémentaires dans l'ordre
            let fieldIndex = 0;
            if (hasAge && extraFields[fieldIndex]) {
                participant.age = extraFields[fieldIndex];
                fieldIndex++;
            }
            if (hasNationality && extraFields[fieldIndex]) {
                participant.nationality = extraFields[fieldIndex];
                fieldIndex++;
            }
            if (hasClub && extraFields[fieldIndex]) {
                participant.club = extraFields[fieldIndex];
                fieldIndex++;
            }

            bulkParticipantsData.push(participant);
        });

        // Afficher l'aperçu
        const previewContent = document.getElementById('bulkParticipantsPreviewContent');
        const previewCount = document.getElementById('bulkPreviewCount');

        if (bulkParticipantsData.length === 0) {
            previewContent.innerHTML = '<p style="color: #e74c3c; font-weight: bold;">❌ Aucun participant valide trouvé</p>';
        } else {
            previewContent.innerHTML = `
                <div style="display: grid; gap: 8px;">
                    ${bulkParticipantsData.map((p, i) => {
                        const extraInfo = [];
                        if (p.age) extraInfo.push(`🎂 ${p.age} ans`);
                        if (p.nationality) extraInfo.push(`🌍 ${p.nationality}`);
                        if (p.club) extraInfo.push(`🏅 ${p.club}`);

                        return `
                        <div style="display: flex; gap: 15px; padding: 10px; background: white; border-radius: 5px; border: 2px solid #27ae60;">
                            <div style="background: linear-gradient(135deg, #16a085, #1abc9c); color: white; padding: 5px 10px; border-radius: 5px; font-weight: bold; min-width: 50px; text-align: center;">
                                ${p.bib}
                            </div>
                            <div style="flex: 1;">
                                <div style="font-weight: bold;">${p.name}</div>
                                <div style="font-size: 12px; color: #7f8c8d;">${p.category}</div>
                                ${extraInfo.length > 0 ? `<div style="font-size: 11px; color: #95a5a6; margin-top: 3px;">${extraInfo.join(' • ')}</div>` : ''}
                            </div>
                        </div>
                    `}).join('')}
                </div>
            `;
        }

        if (errors.length > 0) {
            previewContent.innerHTML += `
                <div style="margin-top: 15px; padding: 10px; background: #ffe6e6; border-radius: 5px; border: 2px solid #e74c3c;">
                    <h5 style="color: #e74c3c; margin: 0 0 10px 0;">⚠️ Erreurs détectées (${errors.length}) :</h5>
                    ${errors.map(err => `<div style="font-size: 12px; color: #c0392b; margin: 3px 0;">• ${err}</div>`).join('')}
                </div>
            `;
        }

        previewCount.textContent = bulkParticipantsData.length;
        document.getElementById('bulkParticipantsPreview').style.display = 'block';

        if (bulkParticipantsData.length > 0) {
            showNotification(`${bulkParticipantsData.length} participant(s) prêt(s) à être ajouté(s)`, 'success');
        }
    };

    window.saveBulkParticipants = function() {
        if (bulkParticipantsData.length === 0) {
            showNotification('Veuillez d\'abord prévisualiser les données', 'warning');
            return;
        }

        let addedCount = 0;
        bulkParticipantsData.forEach(participant => {
            raceData.participants.push({
                id: raceData.nextParticipantId++,
                name: participant.name,
                category: participant.category,
                bib: participant.bib,
                age: participant.age || null,
                nationality: participant.nationality || null,
                club: participant.club || null
            });
            addedCount++;
        });

        displayParticipantsList();
        closeBulkParticipantsModal();
        saveChronoToLocalStorage();
        showNotification(`${addedCount} participant(s) ajouté(s) avec succès`, 'success');
    };

    // ============================================
    // GESTION DES ÉPREUVES
    // ============================================

    window.showAddEventModal = function() {
        raceData.editingEventId = null;
        document.getElementById('eventModalTitle').textContent = '🏅 Nouvelle Épreuve';

        // Réinitialiser le formulaire
        document.getElementById('eventName').value = '';
        document.getElementById('eventSportType').value = 'running';
        document.getElementById('eventDistance').value = '400';
        document.getElementById('eventRaceType').value = 'individual';
        document.getElementById('eventRelayDuration').value = '60';
        document.getElementById('eventRelayDurationSection').style.display = 'none';

        document.getElementById('eventModal').style.display = 'block';
    };

    window.closeEventModal = function() {
        document.getElementById('eventModal').style.display = 'none';
        raceData.editingEventId = null;
    };

    window.updateEventRelayOptions = function() {
        const raceType = document.getElementById('eventRaceType').value;
        const relaySection = document.getElementById('eventRelayDurationSection');

        if (raceType === 'relay') {
            relaySection.style.display = 'block';
        } else {
            relaySection.style.display = 'none';
        }
    };

    window.saveEvent = function() {
        const name = document.getElementById('eventName').value.trim();
        const sportType = document.getElementById('eventSportType').value;
        const distance = parseInt(document.getElementById('eventDistance').value);
        const raceType = document.getElementById('eventRaceType').value;
        const relayDuration = raceType === 'relay' ? parseInt(document.getElementById('eventRelayDuration').value) : null;

        if (!name) {
            showNotification('Veuillez entrer un nom pour l\'épreuve', 'warning');
            return;
        }

        if (!distance || distance <= 0) {
            showNotification('Veuillez entrer une distance valide', 'warning');
            return;
        }

        const eventData = {
            id: raceData.editingEventId || raceData.nextEventId++,
            name,
            sportType,
            distance,
            raceType,
            relayDuration,
            series: [] // Chaque épreuve contient plusieurs séries
        };

        if (raceData.editingEventId !== null) {
            // Modification
            const index = raceData.events.findIndex(e => e.id === raceData.editingEventId);
            if (index !== -1) {
                // Garder les séries existantes
                eventData.series = raceData.events[index].series;
                raceData.events[index] = eventData;
                showNotification('Épreuve modifiée avec succès', 'success');
            }
        } else {
            // Nouvelle épreuve
            raceData.events.push(eventData);
            showNotification('Épreuve créée avec succès', 'success');
        }

        closeEventModal();
        displayEventsList();
        saveChronoToLocalStorage();
    };

    window.editEvent = function(eventId) {
        const event = raceData.events.find(e => e.id === eventId);
        if (!event) return;

        raceData.editingEventId = eventId;
        document.getElementById('eventModalTitle').textContent = '✏️ Modifier l\'Épreuve';

        document.getElementById('eventName').value = event.name;
        document.getElementById('eventSportType').value = event.sportType;
        document.getElementById('eventDistance').value = event.distance;
        document.getElementById('eventRaceType').value = event.raceType;

        if (event.raceType === 'relay') {
            document.getElementById('eventRelayDuration').value = event.relayDuration;
            document.getElementById('eventRelayDurationSection').style.display = 'block';
        } else {
            document.getElementById('eventRelayDurationSection').style.display = 'none';
        }

        document.getElementById('eventModal').style.display = 'block';
    };

    window.deleteEvent = function(eventId) {
        const event = raceData.events.find(e => e.id === eventId);
        if (!event) return;

        const seriesCount = event.series.length;
        const confirmMessage = seriesCount > 0
            ? `Êtes-vous sûr de vouloir supprimer "${event.name}" et ses ${seriesCount} série(s) ?`
            : `Êtes-vous sûr de vouloir supprimer "${event.name}" ?`;

        if (!confirm(confirmMessage)) {
            return;
        }

        const index = raceData.events.findIndex(e => e.id === eventId);
        if (index !== -1) {
            raceData.events.splice(index, 1);
            displayEventsList();
            saveChronoToLocalStorage();
            showNotification('Épreuve supprimée', 'success');
        }
    };

    function displayEventsList() {
        const eventsList = document.getElementById('eventsList');
        const noEventsMessage = document.getElementById('noEventsMessage');

        if (raceData.events.length === 0) {
            eventsList.style.display = 'none';
            noEventsMessage.style.display = 'block';
            return;
        }

        eventsList.style.display = 'grid';
        noEventsMessage.style.display = 'none';

        const sportEmoji = {
            running: '🏃',
            cycling: '🚴',
            swimming: '🏊'
        };

        eventsList.innerHTML = raceData.events.map(event => {
            const totalParticipants = event.series.reduce((sum, s) => sum + s.participants.length, 0);
            const completedSeries = event.series.filter(s => s.status === 'completed').length;

            return `
                <div style="border: 3px solid #e67e22; border-radius: 12px; padding: 20px; background: linear-gradient(135deg, #fff5f0, #ffffff); box-shadow: 0 4px 12px rgba(230, 126, 34, 0.2);">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                        <div style="flex: 1;">
                            <h3 style="margin: 0 0 10px 0; color: #e67e22; font-size: 22px;">
                                🏅 ${event.name}
                            </h3>
                            <div style="display: flex; gap: 20px; flex-wrap: wrap; font-size: 14px; color: #7f8c8d;">
                                <span>${sportEmoji[event.sportType]} ${event.distance}m</span>
                                <span>📊 ${event.series.length} série(s)</span>
                                <span>👥 ${totalParticipants} participants au total</span>
                                ${completedSeries > 0 ? `<span style="color: #27ae60;">✅ ${completedSeries} terminée(s)</span>` : ''}
                            </div>
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <button class="btn" onclick="showAddSerieModalForEvent(${event.id})" style="background: #27ae60; color: white; padding: 8px 15px;">
                                ➕ Série
                            </button>
                            <button class="btn" onclick="editEvent(${event.id})" style="background: #3498db; padding: 8px 15px;">
                                ✏️
                            </button>
                            <button class="btn btn-danger" onclick="deleteEvent(${event.id})" style="padding: 8px 15px;">
                                🗑️
                            </button>
                        </div>
                    </div>

                    ${event.series.length > 0 ? `
                        <div style="margin-top: 15px; padding-top: 15px; border-top: 2px solid #f39c12;">
                            <h4 style="margin: 0 0 10px 0; color: #2c3e50; font-size: 16px;">Séries de cette épreuve:</h4>
                            <div style="display: grid; gap: 10px;">
                                ${event.series.map(serie => {
                                    const statusColor = serie.status === 'completed' ? '#27ae60' :
                                                       serie.status === 'running' ? '#3498db' : '#95a5a6';
                                    const statusText = serie.status === 'completed' ? '✅ Terminée' :
                                                      serie.status === 'running' ? '▶️ En cours' : '⏸️ En attente';

                                    return `
                                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: white; border-radius: 8px; border-left: 4px solid ${statusColor};">
                                            <div style="flex: 1;">
                                                <span style="font-weight: bold; color: #2c3e50;">${serie.name}</span>
                                                <span style="margin-left: 15px; font-size: 13px; color: #7f8c8d;">
                                                    👥 ${serie.participants.length} participants
                                                </span>
                                                <span style="margin-left: 10px; background: ${statusColor}; color: white; padding: 3px 8px; border-radius: 4px; font-size: 11px;">
                                                    ${statusText}
                                                </span>
                                            </div>
                                            <div style="display: flex; gap: 5px;">
                                                ${serie.status === 'pending' ? `
                                                    <button class="btn btn-success" onclick="startSerie(${serie.id})" style="padding: 6px 12px; font-size: 13px;">
                                                        ▶️ Lancer
                                                    </button>
                                                    <button class="btn" onclick="editSerie(${serie.id})" style="background: #3498db; padding: 6px 12px; font-size: 13px;">
                                                        ✏️
                                                    </button>
                                                    <button class="btn btn-danger" onclick="deleteSerie(${serie.id})" style="padding: 6px 12px; font-size: 13px;">
                                                        🗑️
                                                    </button>
                                                ` : serie.status === 'running' ? `
                                                    <button class="btn" onclick="continueSerie(${serie.id})" style="background: #3498db; padding: 6px 12px; font-size: 13px;">
                                                        📊 Gérer
                                                    </button>
                                                ` : `
                                                    <button class="btn" onclick="viewSerieResults(${serie.id})" style="background: #27ae60; padding: 6px 12px; font-size: 13px;">
                                                        🏆 Résultats
                                                    </button>
                                                    <button class="btn" onclick="editSerie(${serie.id})" style="background: #3498db; padding: 6px 12px; font-size: 13px;">
                                                        ✏️
                                                    </button>
                                                    <button class="btn btn-danger" onclick="deleteSerie(${serie.id})" style="padding: 6px 12px; font-size: 13px;">
                                                        🗑️
                                                    </button>
                                                `}
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    ` : `
                        <div style="margin-top: 10px; padding: 15px; background: #f8f9fa; border-radius: 8px; text-align: center; color: #7f8c8d; font-size: 13px;">
                            Aucune série créée pour cette épreuve. Cliquez sur "➕ Série" pour en ajouter une.
                        </div>
                    `}
                </div>
            `;
        }).join('');
    }

    // ============================================
    // GESTION DES SÉRIES
    // ============================================

    // Afficher la modale d'ajout de série pour une épreuve spécifique
    window.showAddSerieModalForEvent = function(eventId) {
        raceData.currentEventId = eventId;
        showAddSerieModal();

        // Pré-sélectionner l'épreuve
        document.getElementById('serieEventId').value = eventId;
        updateSerieFromEvent();
    };

    // Afficher la modale d'ajout de série
    window.showAddSerieModal = function() {
        raceData.editingSerieId = null;
        raceData.currentEventId = null;
        document.getElementById('serieModalTitle').textContent = 'Nouvelle Série';

        // Réinitialiser le formulaire
        document.getElementById('serieName').value = '';

        // Charger la liste des épreuves dans le select
        loadEventsListInSelect();

        // Charger la liste des participants
        loadParticipantsList();

        document.getElementById('serieModal').style.display = 'block';
    };

    function loadEventsListInSelect() {
        const selectElement = document.getElementById('serieEventId');

        if (raceData.events.length === 0) {
            selectElement.innerHTML = '<option value="">Aucune épreuve disponible - Créez-en une d\'abord</option>';
            return;
        }

        selectElement.innerHTML = '<option value="">-- Sélectionnez une épreuve --</option>' +
            raceData.events.map(event => `<option value="${event.id}">${event.name} (${event.distance}m)</option>`).join('');
    }

    window.updateSerieFromEvent = function() {
        const eventId = parseInt(document.getElementById('serieEventId').value);
        if (!eventId) return;

        const event = raceData.events.find(e => e.id === eventId);
        if (!event) return;

        // Suggérer un nom de série basé sur le nombre de séries existantes
        const serieNumber = event.series.length + 1;
        document.getElementById('serieName').value = `Série ${serieNumber}`;
    };

    // Charger la liste des participants avec checkboxes
    function loadParticipantsList(selectedParticipants = []) {
        const participantsCheckboxList = document.getElementById('participantsCheckboxList');

        // Utiliser les participants du mode chrono
        if (raceData.participants.length === 0) {
            participantsCheckboxList.innerHTML = '<p style="color: #7f8c8d; text-align: center;">Aucun participant disponible. Cliquez sur "Ajouter des participants" pour en créer.</p>';
            return;
        }

        // Trier par dossard
        const sortedParticipants = [...raceData.participants].sort((a, b) => {
            const bibA = parseInt(a.bib) || a.bib;
            const bibB = parseInt(b.bib) || b.bib;
            if (typeof bibA === 'number' && typeof bibB === 'number') {
                return bibA - bibB;
            }
            return String(a.bib).localeCompare(String(b.bib));
        });

        participantsCheckboxList.innerHTML = sortedParticipants.map(participant => {
            const isChecked = selectedParticipants.some(p => p.id === participant.id);
            return `
                <label style="display: flex; align-items: center; gap: 10px; padding: 8px; cursor: pointer; border-radius: 5px; transition: background 0.2s; hover:background: #f0f0f0;">
                    <input type="checkbox"
                           class="participant-checkbox"
                           data-id="${participant.id}"
                           data-name="${participant.name}"
                           data-category="${participant.category}"
                           data-bib="${participant.bib}"
                           ${isChecked ? 'checked' : ''}
                           style="width: 18px; height: 18px; cursor: pointer;">
                    <div style="background: linear-gradient(135deg, #16a085, #1abc9c); color: white; padding: 4px 8px; border-radius: 5px; font-weight: bold; min-width: 45px; text-align: center; font-size: 12px;">
                        ${participant.bib}
                    </div>
                    <span style="font-weight: bold;">${participant.name}</span>
                    <span style="font-size: 12px; color: #7f8c8d;">(${participant.category})</span>
                </label>
            `;
        }).join('');
    }

    // Mise à jour options relais dans modal série
    window.updateSerieRelayOptions = function() {
        const raceType = document.getElementById('serieRaceType').value;
        const relaySection = document.getElementById('serieRelayDurationSection');

        if (raceType === 'relay') {
            relaySection.style.display = 'block';
        } else {
            relaySection.style.display = 'none';
        }
    };

    // Fermer modal série
    window.closeSerieModal = function() {
        document.getElementById('serieModal').style.display = 'none';
        raceData.editingSerieId = null;
    };

    // Sauvegarder une série
    window.saveSerie = function() {
        const name = document.getElementById('serieName').value.trim();
        const eventId = parseInt(document.getElementById('serieEventId').value);

        if (!name) {
            showNotification('Veuillez entrer un nom pour la série', 'warning');
            return;
        }

        if (!eventId) {
            showNotification('Veuillez sélectionner une épreuve', 'warning');
            return;
        }

        const event = raceData.events.find(e => e.id === eventId);
        if (!event) {
            showNotification('Épreuve introuvable', 'error');
            return;
        }

        // Récupérer les participants sélectionnés
        const checkboxes = document.querySelectorAll('.participant-checkbox:checked');

        // Si on édite une série existante, récupérer les données actuelles des participants
        let existingSerieParticipants = [];
        if (raceData.editingSerieId !== null) {
            const result = findSerieById(raceData.editingSerieId);
            if (result && result.serie) {
                existingSerieParticipants = result.serie.participants;
            }
        }

        const participants = Array.from(checkboxes).map(cb => {
            const participantId = parseInt(cb.dataset.id);

            // Chercher si ce participant existait déjà dans la série
            const existingParticipant = existingSerieParticipants.find(p => p.id === participantId);

            if (existingParticipant) {
                // Conserver toutes les données existantes du participant
                return {
                    ...existingParticipant,
                    // Mettre à jour les infos de base au cas où elles auraient changé
                    bib: cb.dataset.bib,
                    name: cb.dataset.name,
                    category: cb.dataset.category
                };
            } else {
                // Nouveau participant : créer avec des données vides
                return {
                    id: participantId,
                    bib: cb.dataset.bib,
                    name: cb.dataset.name,
                    category: cb.dataset.category,
                    laps: [],
                    status: 'ready',
                    totalTime: 0,
                    totalDistance: 0,
                    bestLap: null,
                    finishTime: null,
                    lastLapStartTime: 0
                };
            }
        });

        if (participants.length === 0) {
            showNotification('Sélectionnez au moins un participant', 'warning');
            return;
        }

        // Fonction helper pour fusionner les données sans perdre les chronos
        function mergeSerieData(oldSerie, newData) {
            // Si la série a déjà des données chronométrées (running ou completed), les préserver
            if (oldSerie && (oldSerie.status === 'running' || oldSerie.status === 'completed')) {
                return {
                    ...oldSerie,  // Conserver toutes les données existantes
                    name: newData.name,  // Mettre à jour le nom
                    participants: newData.participants,  // Mettre à jour les participants (déjà fusionnés ci-dessus)
                    eventId: newData.eventId,  // Mettre à jour l'épreuve parente si changée
                    // Ne PAS écraser: status, startTime, isRunning, currentTime, timerInterval
                };
            }
            // Si la série n'a pas encore de chronos (status: pending), on peut tout remplacer
            return { ...newData };
        }

        const serieData = {
            name,
            eventId,  // Lier la série à l'épreuve
            sportType: event.sportType,
            distance: event.distance,
            raceType: event.raceType,
            relayDuration: event.relayDuration,
            participants,
            status: 'pending',
            startTime: null,
            isRunning: false,
            timerInterval: null,
            currentTime: 0
        };

        if (raceData.editingSerieId !== null) {
            // Modification
            // Trouver la série dans toutes les épreuves
            let found = false;
            raceData.events.forEach(evt => {
                const index = evt.series.findIndex(s => s.id === raceData.editingSerieId);
                if (index !== -1) {
                    const oldSerie = evt.series[index];
                    serieData.id = raceData.editingSerieId;

                    // Fusionner intelligemment pour préserver les chronos
                    const mergedSerie = mergeSerieData(oldSerie, serieData);

                    // Si l'épreuve a changé, déplacer la série
                    if (evt.id !== eventId) {
                        evt.series.splice(index, 1);
                        event.series.push(mergedSerie);
                    } else {
                        evt.series[index] = mergedSerie;
                    }
                    found = true;
                }
            });
            if (found) {
                showNotification('Série modifiée avec succès (chronos préservés)', 'success');
            }
        } else {
            // Nouvelle série
            serieData.id = raceData.nextSerieId++;
            event.series.push(serieData);
            showNotification('Série créée avec succès', 'success');
        }

        closeSerieModal();
        displayEventsList();
        saveChronoToLocalStorage();
    };

    // Fonction utilitaire pour trouver une série dans toutes les épreuves
    function findSerieById(serieId) {
        for (const event of raceData.events) {
            const serie = event.series.find(s => s.id === serieId);
            if (serie) {
                return { serie, event };
            }
        }
        return null;
    }

    // Éditer une série
    window.editSerie = function(serieId) {
        const result = findSerieById(serieId);
        if (!result) return;

        const { serie, event } = result;

        // Avertissement si la série est terminée
        if (serie.status === 'completed') {
            if (!confirm('✅ Cette série est terminée.\n\n✨ NOUVEAU: Les temps chronométrés seront PRÉSERVÉS !\n\n📝 Vous pouvez:\n- Modifier le nom de la série\n- Ajouter de nouveaux participants (initialisés sans chrono)\n- Retirer des participants (leurs chronos restent archivés)\n\n⏱️ Les participants conservés gardent leurs temps et tours enregistrés.\n\nVoulez-vous continuer ?')) {
                return;
            }
        }

        // Avertissement si la série est en cours
        if (serie.status === 'running') {
            if (!confirm('⚠️ Cette série est en cours d\'exécution.\n\n✨ Les temps chronométrés seront préservés.\n\n⚠️ Attention: Ajouter/retirer des participants pendant une course peut affecter le déroulement.\n\nVoulez-vous continuer ?')) {
                return;
            }
        }

        raceData.editingSerieId = serieId;
        document.getElementById('serieModalTitle').textContent = serie.status === 'completed' ? '✏️ Modifier la Série (Terminée)' : 'Modifier la Série';

        // Charger la liste des épreuves
        loadEventsListInSelect();

        // Pré-sélectionner l'épreuve
        document.getElementById('serieEventId').value = event.id;
        document.getElementById('serieName').value = serie.name;

        loadParticipantsList(serie.participants);

        document.getElementById('serieModal').style.display = 'block';
    };

    // Supprimer une série
    window.deleteSerie = function(serieId) {
        if (!confirm('Voulez-vous vraiment supprimer cette série?')) return;

        raceData.events.forEach(event => {
            const index = event.series.findIndex(s => s.id === serieId);
            if (index !== -1) {
                event.series.splice(index, 1);
                showNotification('Série supprimée', 'info');
                displayEventsList();
                saveChronoToLocalStorage();
            }
        });
    };

    // Démarrer une série
    window.startSerie = function(serieId) {
        const result = findSerieById(serieId);
        if (!result) return;

        const { serie, event } = result;
        raceData.currentSerie = serie;
        serie.status = 'running';

        displayRaceInterface(serie);
        displayEventsList();
        saveChronoToLocalStorage();
    };

    // Continuer une série en cours
    window.continueSerie = function(serieId) {
        const result = findSerieById(serieId);
        if (!result) return;

        const { serie } = result;
        if (!serie) return;

        raceData.currentSerie = serie;
        displayRaceInterface(serie);
    };

    // Voir les résultats d'une série terminée
    window.viewSerieResults = function(serieId) {
        const result = findSerieById(serieId);
        if (!result) return;

        const { serie } = result;
        raceData.currentSerie = serie;
        displayRaceInterface(serie);
        showRaceRanking();
    };

    // Adapter les anciennes fonctions pour la série courante
    // Mise à jour options relais
    window.updateRelayOptions = function() {
        const raceType = document.getElementById('raceType').value;
        const relaySection = document.getElementById('relayDurationSection');

        if (raceType === 'relay') {
            relaySection.style.display = 'block';
        } else {
            relaySection.style.display = 'none';
        }
    };

    // Afficher l'interface de course pour une série
    function displayRaceInterface(serie) {
        if (!serie) serie = raceData.currentSerie;
        if (!serie) return;

        const raceInterface = document.getElementById('raceInterface');
        const eventsList = document.getElementById('eventsList').parentElement;

        eventsList.style.display = 'none';
        raceInterface.style.display = 'block';

        const sportEmoji = {
            running: '🏃',
            cycling: '🚴',
            swimming: '🏊'
        };

        let html = `
            <div style="background: white; padding: 20px; border-radius: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 15px;">
                    <div>
                        <h3 style="margin: 0;">
                            ${sportEmoji[serie.sportType]} ${serie.name}
                        </h3>
                        <p style="color: #7f8c8d; margin: 5px 0 0 0;">
                            Distance: ${serie.distance}m | ${serie.raceType === 'relay' ? `Relais ${serie.relayDuration} min` : 'Course individuelle'}
                        </p>
                    </div>
                    <div style="text-align: right;">
                        <div id="mainChronoDisplay" style="font-size: 48px; font-weight: bold; color: #2c3e50; font-family: monospace;">
                            ${formatTime(serie.currentTime || 0)}
                        </div>
                        <button id="startStopBtn" class="btn ${serie.isRunning ? 'btn-warning' : 'btn-success'}" onclick="toggleRaceTimer()" style="font-size: 18px; padding: 12px 30px;">
                            ${serie.isRunning ? '⏸️ Pause' : '▶️ Démarrer'}
                        </button>
                    </div>
                </div>

                <!-- Saisie rapide dossard (visible uniquement si course lancée) -->
                ${serie.isRunning ? `
                    <div style="background: linear-gradient(135deg, #16a085, #1abc9c); padding: 15px; border-radius: 10px; margin-bottom: 20px;">
                        <div style="display: flex; align-items: center; gap: 15px; flex-wrap: wrap;">
                            <label style="color: white; font-weight: bold; font-size: 16px;">⚡ Saisie Rapide:</label>
                            <input
                                type="text"
                                id="quickFinishInput"
                                placeholder="Dossard + Enter (ou L+Dossard pour LAP)"
                                style="padding: 12px; border-radius: 8px; border: 3px solid white; font-size: 18px; font-weight: bold; width: 350px; text-align: center;"
                                onkeypress="if(event.key === 'Enter') quickAction()"
                            >
                            <div style="color: white; font-size: 13px; line-height: 1.5;">
                                ${serie.raceType === 'relay' ? `
                                    <div style="margin-bottom: 8px; background: rgba(255,255,255,0.2); padding: 8px; border-radius: 5px;">
                                        <strong>🤖 MODE RELAIS - DÉTECTION AUTOMATIQUE</strong>
                                    </div>
                                    <div>⏱️ <strong>Dossard + Enter</strong> = LAP (si temps &lt; ${serie.relayDuration} min)</div>
                                    <div>🏁 <strong>Dossard + Enter</strong> = FINISH (si temps ≥ ${serie.relayDuration} min)</div>
                                    <div style="margin-top: 5px; opacity: 0.8; font-size: 11px;">💡 Plus besoin de taper "L" !</div>
                                ` : `
                                    <div>✅ <strong>Dossard + Enter</strong> = FINISH</div>
                                    <div>⏱️ <strong>L + Dossard + Enter</strong> = LAP</div>
                                `}
                            </div>
                        </div>
                    </div>
                ` : ''}

                <div style="margin-bottom: 20px;">
                    <button class="btn" onclick="backToSeriesList()" style="background: #95a5a6; margin-right: 10px;">
                        ⬅️ Retour aux séries
                    </button>
                    <button class="btn" onclick="showRaceRanking()" style="background: linear-gradient(135deg, #16a085, #1abc9c); margin-right: 10px;">
                        🏆 Voir Classement
                    </button>
                    <button class="btn btn-danger" onclick="endSerie()">
                        🏁 Terminer la Série
                    </button>
                </div>

                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; background: white;">
                        <thead>
                            <tr style="background: linear-gradient(135deg, #16a085, #1abc9c); color: white;">
                                <th style="padding: 12px; text-align: center;">Dossard</th>
                                <th style="padding: 12px; text-align: left;">Participant</th>
                                <th style="padding: 12px; text-align: center;">Tours</th>
                                <th style="padding: 12px; text-align: center;">Distance</th>
                                <th style="padding: 12px; text-align: center;">Temps Total</th>
                                <th style="padding: 12px; text-align: center;">Meilleur Tour</th>
                                <th style="padding: 12px; text-align: center;">Statut</th>
                                <th style="padding: 12px; text-align: center;">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="participantsTableBody">
                            ${generateParticipantsRows(serie)}
                        </tbody>
                    </table>
                </div>

                <div id="raceRankingSection" style="display: none; margin-top: 30px;">
                    <!-- Classement sera affiché ici -->
                </div>
            </div>
        `;

        raceInterface.innerHTML = html;
    }

    // Retour à la liste des épreuves
    window.backToSeriesList = function() {
        const raceInterface = document.getElementById('raceInterface');
        const eventsList = document.getElementById('eventsList').parentElement;

        raceInterface.style.display = 'none';
        eventsList.style.display = 'block';

        displayEventsList();
    };

    // Terminer la série
    window.endSerie = function() {
        if (!raceData.currentSerie) return;

        if (!confirm('Voulez-vous vraiment terminer cette série? Elle ne pourra plus être modifiée.')) return;

        if (raceData.currentSerie.isRunning) {
            clearInterval(raceData.currentSerie.timerInterval);
        }

        raceData.currentSerie.status = 'completed';
        raceData.currentSerie.isRunning = false;

        saveChronoToLocalStorage();
        showNotification('Série terminée!', 'success');
        backToSeriesList();
    };

    // Générer les lignes de participants
    function generateParticipantsRows(serie) {
        if (!serie) serie = raceData.currentSerie;
        if (!serie) return '';

        return serie.participants.map(p => {
            const statusColor = {
                ready: '#95a5a6',
                running: '#3498db',
                finished: '#27ae60'
            };

            const statusText = {
                ready: '⏸️ Prêt',
                running: '▶️ En course',
                finished: '🏁 Terminé'
            };

            return `
                <tr id="participant-${p.bib}" style="border-bottom: 1px solid #ecf0f1;">
                    <td style="padding: 12px; text-align: center; font-weight: bold; font-size: 20px; color: ${statusColor[p.status]};">
                        #${p.bib}
                    </td>
                    <td style="padding: 12px;">
                        <div style="font-weight: bold;">${p.name}</div>
                        <div style="font-size: 12px; color: #7f8c8d;">${p.category || 'Division ' + (p.division || '-')}</div>
                    </td>
                    <td style="padding: 12px; text-align: center; font-weight: bold; font-size: 18px;">
                        ${p.laps.length}
                    </td>
                    <td style="padding: 12px; text-align: center; font-weight: bold;">
                        ${(p.totalDistance / 1000).toFixed(2)} km
                    </td>
                    <td id="time-${p.bib}" style="padding: 12px; text-align: center; font-family: monospace; font-weight: bold;">
                        ${formatTime(p.totalTime)}
                    </td>
                    <td style="padding: 12px; text-align: center; font-family: monospace;">
                        ${p.bestLap ? formatTime(p.bestLap) : '-'}
                    </td>
                    <td style="padding: 12px; text-align: center;">
                        <span style="background: ${statusColor[p.status]}; color: white; padding: 5px 10px; border-radius: 5px; font-size: 12px;">
                            ${statusText[p.status]}
                        </span>
                    </td>
                    <td style="padding: 12px; text-align: center;">
                        ${p.status !== 'finished' ? `
                            <button class="btn" onclick="recordLap('${p.bib}')" style="background: #3498db; margin-right: 5px; padding: 8px 15px;">
                                ⏱️ LAP
                            </button>
                            <button class="btn btn-success" onclick="finishParticipant('${p.bib}')" style="padding: 8px 15px;">
                                🏁 FINISH
                            </button>
                        ` : `
                            <div style="display: flex; gap: 5px; justify-content: center; flex-wrap: wrap;">
                                <span style="color: #27ae60; font-weight: bold; padding: 8px; white-space: nowrap;">✅ Terminé</span>
                                <button class="btn" onclick="editParticipantTime('${p.bib}')" style="background: #f39c12; padding: 6px 12px; font-size: 13px;">
                                    ✏️ Éditer
                                </button>
                                <button class="btn" onclick="restartParticipant('${p.bib}')" style="background: #e74c3c; color: white; padding: 6px 12px; font-size: 13px;">
                                    🔄 Relancer
                                </button>
                            </div>
                        `}
                    </td>
                </tr>
            `;
        }).join('');
    }

    // Démarrer/Arrêter le chrono
    window.toggleRaceTimer = function() {
        const serie = raceData.currentSerie;
        if (!serie) return;

        const btn = document.getElementById('startStopBtn');

        if (!serie.isRunning) {
            // Démarrer
            serie.isRunning = true;
            serie.startTime = Date.now() - (serie.currentTime || 0);

            // Démarrer tous les participants automatiquement s'ils sont en statut 'ready'
            const currentTime = serie.currentTime;
            serie.participants.forEach(p => {
                if (p.status === 'ready') {
                    p.status = 'running';
                    p.lastLapStartTime = currentTime;
                }
            });

            serie.timerInterval = setInterval(() => {
                serie.currentTime = Date.now() - serie.startTime;
                updateMainChronoDisplay();
                updateParticipantsTimes();
            }, 100);

            btn.textContent = '⏸️ Pause';
            btn.className = 'btn btn-warning';
            showNotification('Course démarrée! Tous les participants sont lancés!', 'success');

            // Rafraîchir l'affichage de tous les participants
            displayRaceInterface(serie);

            // Focus automatique sur le champ de saisie rapide
            setTimeout(() => {
                const quickInput = document.getElementById('quickFinishInput');
                if (quickInput) quickInput.focus();
            }, 100);

            // Sauvegarder l'état dans le localStorage
            saveChronoToLocalStorage();
        } else {
            // Pause
            serie.isRunning = false;
            clearInterval(serie.timerInterval);

            btn.textContent = '▶️ Reprendre';
            btn.className = 'btn btn-success';
            showNotification('Course en pause', 'warning');

            // Sauvegarder l'état dans le localStorage
            saveChronoToLocalStorage();
        }
    };

    // Mettre à jour l'affichage du chrono principal
    function updateMainChronoDisplay() {
        const serie = raceData.currentSerie;
        if (!serie) return;

        const display = document.getElementById('mainChronoDisplay');
        if (display) {
            display.textContent = formatTime(serie.currentTime || 0);
        }
    }

    // Mettre à jour les temps des participants en cours
    function updateParticipantsTimes() {
        const serie = raceData.currentSerie;
        if (!serie) return;

        serie.participants.forEach(p => {
            if (p.status === 'running') {
                const timeDisplay = document.getElementById(`time-${p.bib}`);
                if (timeDisplay) {
                    timeDisplay.textContent = formatTime(serie.currentTime - p.lastLapStartTime + p.totalTime);
                }
            }
        });
    }

    // Enregistrer un tour
    window.recordLap = function(bib) {
        const serie = raceData.currentSerie;
        if (!serie) return;

        if (!serie.isRunning) {
            showNotification('Démarrez la course d\'abord!', 'warning');
            return;
        }

        // Comparer en string pour supporter les dossards alphanumériques
        const participant = serie.participants.find(p => String(p.bib) === String(bib));
        if (!participant) return;

        const currentTime = serie.currentTime;

        if (participant.status === 'ready') {
            // Si le participant n'est pas encore démarré (cas rare), le démarrer
            participant.status = 'running';
            participant.lastLapStartTime = currentTime;
            showNotification(`${participant.name} démarré!`, 'info');
        } else if (participant.status === 'running') {
            // Enregistrer le tour : calculer le temps depuis le dernier LAP (ou depuis le départ)
            const lapTime = currentTime - participant.lastLapStartTime;

            participant.laps.push({
                lapNumber: participant.laps.length + 1,
                time: lapTime,
                timestamp: currentTime
            });

            participant.totalTime += lapTime;
            participant.totalDistance += serie.distance;

            // Meilleur tour
            if (!participant.bestLap || lapTime < participant.bestLap) {
                participant.bestLap = lapTime;
            }

            // Réinitialiser le chrono pour le prochain tour
            participant.lastLapStartTime = currentTime;

            showNotification(`${participant.name} - Tour ${participant.laps.length}: ${formatTime(lapTime)}`, 'info');
        }

        // Rafraîchir l'affichage
        updateParticipantRow(participant);
        saveChronoToLocalStorage();
    };

    // Terminer un participant
    window.finishParticipant = function(bib) {
        const serie = raceData.currentSerie;
        if (!serie) return;

        if (!serie.isRunning) {
            showNotification('Démarrez la course d\'abord!', 'warning');
            return;
        }

        // Comparer en string pour supporter les dossards alphanumériques
        const participant = serie.participants.find(p => String(p.bib) === String(bib));
        if (!participant || participant.status === 'finished') return;

        // Enregistrer le dernier tour si en cours
        if (participant.status === 'running') {
            const lapTime = serie.currentTime - participant.lastLapStartTime;

            participant.laps.push({
                lapNumber: participant.laps.length + 1,
                time: lapTime,
                timestamp: serie.currentTime
            });

            participant.totalTime += lapTime;
            participant.totalDistance += serie.distance;

            if (!participant.bestLap || lapTime < participant.bestLap) {
                participant.bestLap = lapTime;
            }
        }

        participant.status = 'finished';
        participant.finishTime = serie.currentTime;

        showNotification(`${participant.name} a terminé! 🏁`, 'success');

        // Rafraîchir l'affichage
        updateParticipantRow(participant);
        saveChronoToLocalStorage();

        // Vérifier si tous ont terminé
        const allFinished = serie.participants.every(p => p.status === 'finished');
        if (allFinished) {
            toggleRaceTimer(); // Arrêter le chrono
            saveChronoToLocalStorage();
            showNotification('Tous les participants ont terminé! 🎉', 'success');
        }
    };

    // Relancer un participant (annuler son finish)
    window.restartParticipant = function(bib) {
        const serie = raceData.currentSerie;
        if (!serie) return;

        const participant = serie.participants.find(p => String(p.bib) === String(bib));
        if (!participant) return;

        if (!confirm(`Voulez-vous vraiment relancer ${participant.name} ?\n\nCela annulera son temps actuel et le remettra en course.`)) {
            return;
        }

        // Remettre le participant en course
        participant.status = 'running';
        participant.finishTime = null;
        participant.lastLapStartTime = serie.currentTime;

        showNotification(`${participant.name} a été relancé! 🔄`, 'info');
        updateParticipantRow(participant);
    };

    // Éditer le temps d'un participant
    let editingParticipantBib = null;

    window.editParticipantTime = function(bib) {
        const serie = raceData.currentSerie;
        if (!serie) return;

        const participant = serie.participants.find(p => String(p.bib) === String(bib));
        if (!participant) return;

        editingParticipantBib = bib;

        // Afficher les infos du participant
        document.getElementById('editTimeParticipantName').textContent = participant.name;
        document.getElementById('editTimeParticipantBib').textContent = `#${participant.bib}`;
        document.getElementById('editTimeCurrentTime').textContent = formatTime(participant.totalTime);
        document.getElementById('editTimeCurrentLaps').textContent = participant.laps.length;
        document.getElementById('editTimeDistancePerLap').textContent = `${(serie.distance / 1000).toFixed(2)} km`;

        // Remplir le nombre de tours actuel
        document.getElementById('editTimeLaps').value = participant.laps.length;

        // Convertir le temps actuel en heures/minutes/secondes/centièmes
        const totalMs = participant.totalTime;
        const hours = Math.floor(totalMs / 3600000);
        const minutes = Math.floor((totalMs % 3600000) / 60000);
        const seconds = Math.floor((totalMs % 60000) / 1000);
        const centiseconds = Math.floor((totalMs % 1000) / 10);

        document.getElementById('editTimeHours').value = hours;
        document.getElementById('editTimeMinutes').value = minutes;
        document.getElementById('editTimeSeconds').value = seconds;
        document.getElementById('editTimeCentiseconds').value = centiseconds;

        updateTimePreview();

        // Ajouter les listeners pour la prévisualisation en temps réel
        ['editTimeHours', 'editTimeMinutes', 'editTimeSeconds', 'editTimeCentiseconds'].forEach(id => {
            document.getElementById(id).addEventListener('input', updateTimePreview);
        });

        // Ajouter listener pour le nombre de tours
        document.getElementById('editTimeLaps').addEventListener('input', updateDistancePreview);
        updateDistancePreview();

        document.getElementById('editTimeModal').style.display = 'block';
    };

    function updateTimePreview() {
        const hours = parseInt(document.getElementById('editTimeHours').value) || 0;
        const minutes = parseInt(document.getElementById('editTimeMinutes').value) || 0;
        const seconds = parseInt(document.getElementById('editTimeSeconds').value) || 0;
        const centiseconds = parseInt(document.getElementById('editTimeCentiseconds').value) || 0;

        const totalMs = (hours * 3600000) + (minutes * 60000) + (seconds * 1000) + (centiseconds * 10);
        document.getElementById('editTimePreview').textContent = formatTime(totalMs);
    }

    function updateDistancePreview() {
        const serie = raceData.currentSerie;
        if (!serie) return;

        const laps = parseInt(document.getElementById('editTimeLaps').value) || 0;
        const totalDistance = (laps * serie.distance) / 1000;
        document.getElementById('editTimeTotalDistance').textContent = `${totalDistance.toFixed(2)} km`;
    }

    window.closeEditTimeModal = function() {
        document.getElementById('editTimeModal').style.display = 'none';
        editingParticipantBib = null;
    };

    window.saveEditedTime = function() {
        if (!editingParticipantBib) return;

        const serie = raceData.currentSerie;
        if (!serie) return;

        const participant = serie.participants.find(p => String(p.bib) === String(editingParticipantBib));
        if (!participant) return;

        const hours = parseInt(document.getElementById('editTimeHours').value) || 0;
        const minutes = parseInt(document.getElementById('editTimeMinutes').value) || 0;
        const seconds = parseInt(document.getElementById('editTimeSeconds').value) || 0;
        const centiseconds = parseInt(document.getElementById('editTimeCentiseconds').value) || 0;
        const newLaps = parseInt(document.getElementById('editTimeLaps').value) || 0;

        const newTotalTime = (hours * 3600000) + (minutes * 60000) + (seconds * 1000) + (centiseconds * 10);

        if (newTotalTime <= 0) {
            showNotification('Le temps doit être supérieur à 0', 'error');
            return;
        }

        // Sauvegarder les anciennes valeurs pour l'historique
        const oldTime = participant.totalTime;
        const oldLaps = participant.laps.length;
        const oldDistance = participant.totalDistance;

        // Mettre à jour le temps
        participant.totalTime = newTotalTime;
        participant.finishTime = newTotalTime; // Mettre à jour aussi le finish time

        // Mettre à jour le nombre de tours et la distance
        const newDistance = newLaps * serie.distance;
        participant.totalDistance = newDistance;

        // Recréer les tours avec le nouveau nombre
        if (newLaps > 0) {
            const avgLapTime = newTotalTime / newLaps;
            participant.laps = [];

            for (let i = 0; i < newLaps; i++) {
                participant.laps.push({
                    lapNumber: i + 1,
                    time: avgLapTime,
                    timestamp: avgLapTime * (i + 1)
                });
            }

            // Recalculer le meilleur tour
            participant.bestLap = avgLapTime;
        } else {
            participant.laps = [];
            participant.bestLap = null;
        }

        // Message de notification détaillé
        let message = `Modifications enregistrées:\n`;
        if (oldTime !== newTotalTime) {
            message += `Temps: ${formatTime(oldTime)} → ${formatTime(newTotalTime)}\n`;
        }
        if (oldLaps !== newLaps) {
            message += `Tours: ${oldLaps} → ${newLaps}\n`;
        }
        if (oldDistance !== newDistance) {
            message += `Distance: ${(oldDistance / 1000).toFixed(2)} km → ${(newDistance / 1000).toFixed(2)} km`;
        }

        showNotification(message.trim(), 'success');
        updateParticipantRow(participant);
        closeEditTimeModal();
        saveChronoToLocalStorage();
    };

    // Saisie rapide pour LAP ou FINISH via dossard
    window.quickAction = function() {
        const input = document.getElementById('quickFinishInput');
        if (!input) return;

        const value = input.value.trim().toUpperCase();

        if (!value) {
            input.value = '';
            input.focus();
            return;
        }

        let isLap = false;
        let bibNumber;

        // Vérifier si c'est un LAP (commence par L)
        if (value.startsWith('L')) {
            isLap = true;
            bibNumber = value.substring(1).trim();
        } else {
            bibNumber = value.trim();
        }

        if (!bibNumber) {
            showNotification('Format invalide. Utilisez: Dossard ou L+Dossard', 'warning');
            input.value = '';
            input.focus();
            return;
        }

        const serie = raceData.currentSerie;
        if (!serie) return;

        // Comparer en string pour supporter les dossards alphanumériques
        const participant = serie.participants.find(p => String(p.bib).toUpperCase() === bibNumber.toUpperCase());

        if (!participant) {
            showNotification(`Dossard #${bibNumber} introuvable`, 'error');
            input.value = '';
            input.focus();
            return;
        }

        if (participant.status === 'finished') {
            showNotification(`${participant.name} (#${bibNumber}) a déjà terminé`, 'warning');
            input.value = '';
            input.focus();
            return;
        }

        // LOGIQUE AUTOMATIQUE POUR LES RELAIS
        // Si c'est un relais ET que l'utilisateur n'a pas tapé "L", on détecte automatiquement
        if (serie.raceType === 'relay' && !value.startsWith('L')) {
            const relayDurationMs = serie.relayDuration * 60 * 1000; // Durée du relais en millisecondes
            const currentTime = serie.currentTime;

            // Si le temps actuel est inférieur à la durée du relais → c'est un LAP
            // Si le temps actuel est >= à la durée du relais → c'est un FINISH
            if (currentTime < relayDurationMs) {
                isLap = true;
                showNotification(`⏱️ Détection auto: LAP pour ${participant.name}`, 'info');
            } else {
                isLap = false;
                showNotification(`🏁 Détection auto: FINISH pour ${participant.name}`, 'info');
            }
        }

        // Exécuter l'action
        if (isLap) {
            recordLap(participant.bib);
        } else {
            finishParticipant(participant.bib);
        }

        // Réinitialiser et refocus sur l'input pour saisie suivante
        input.value = '';
        input.focus();
    };

    // Mettre à jour une ligne de participant
    function updateParticipantRow(participant) {
        const row = document.getElementById(`participant-${participant.bib}`);
        if (!row) return;

        const serie = raceData.currentSerie;
        if (!serie) return;

        const statusColor = {
            ready: '#95a5a6',
            running: '#3498db',
            finished: '#27ae60'
        };

        const statusText = {
            ready: '⏸️ Prêt',
            running: '▶️ En course',
            finished: '🏁 Terminé'
        };

        // Reconstruire la ligne complète du participant
        row.innerHTML = `
            <td style="padding: 12px; text-align: center; font-weight: bold; font-size: 20px; color: ${statusColor[participant.status]};">
                #${participant.bib}
            </td>
            <td style="padding: 12px;">
                <div style="font-weight: bold;">${participant.name}</div>
                <div style="font-size: 12px; color: #7f8c8d;">${participant.category || 'Division ' + (participant.division || '-')}</div>
            </td>
            <td style="padding: 12px; text-align: center; font-weight: bold; font-size: 18px;">
                ${participant.laps.length}
            </td>
            <td style="padding: 12px; text-align: center; font-weight: bold;">
                ${(participant.totalDistance / 1000).toFixed(2)} km
            </td>
            <td id="time-${participant.bib}" style="padding: 12px; text-align: center; font-family: monospace; font-weight: bold;">
                ${formatTime(participant.totalTime)}
            </td>
            <td style="padding: 12px; text-align: center; font-family: monospace;">
                ${participant.bestLap ? formatTime(participant.bestLap) : '-'}
            </td>
            <td style="padding: 12px; text-align: center;">
                <span style="background: ${statusColor[participant.status]}; color: white; padding: 5px 10px; border-radius: 5px; font-size: 12px;">
                    ${statusText[participant.status]}
                </span>
            </td>
            <td style="padding: 12px; text-align: center;">
                ${participant.status !== 'finished' ? `
                    <button class="btn" onclick="recordLap('${participant.bib}')" style="background: #3498db; margin-right: 5px; padding: 8px 15px;">
                        ⏱️ LAP
                    </button>
                    <button class="btn btn-success" onclick="finishParticipant('${participant.bib}')" style="padding: 8px 15px;">
                        🏁 FINISH
                    </button>
                ` : `
                    <div style="display: flex; gap: 5px; justify-content: center; flex-wrap: wrap;">
                        <span style="color: #27ae60; font-weight: bold; padding: 8px; white-space: nowrap;">✅ Terminé</span>
                        <button class="btn" onclick="editParticipantTime('${participant.bib}')" style="background: #f39c12; padding: 6px 12px; font-size: 13px;">
                            ✏️ Éditer
                        </button>
                        <button class="btn" onclick="restartParticipant('${participant.bib}')" style="background: #e74c3c; color: white; padding: 6px 12px; font-size: 13px;">
                            🔄 Relancer
                        </button>
                    </div>
                `}
            </td>
        `;
    }

    // Afficher le classement
    window.showRaceRanking = function() {
        const rankingSection = document.getElementById('raceRankingSection');

        if (rankingSection.style.display === 'none') {
            rankingSection.style.display = 'block';
            generateRaceRanking();
        } else {
            rankingSection.style.display = 'none';
        }
    };

    // Générer le classement
    function generateRaceRanking() {
        const serie = raceData.currentSerie;
        if (!serie) return;

        const rankingSection = document.getElementById('raceRankingSection');

        // Trier les participants
        const ranked = [...serie.participants].sort((a, b) => {
            // Les terminés d'abord
            if (a.status === 'finished' && b.status !== 'finished') return -1;
            if (b.status === 'finished' && a.status !== 'finished') return 1;

            // Pour les courses relais (durée limitée), trier par distance puis temps
            // Pour les courses individuelles (distance fixe), trier par temps
            if (serie.raceType === 'relay') {
                // Course relais : priorité à la distance (plus c'est grand, mieux c'est)
                if (a.totalDistance !== b.totalDistance) {
                    return b.totalDistance - a.totalDistance;
                }
                return a.totalTime - b.totalTime; // En cas d'égalité, temps le plus court
            } else {
                // Course individuelle : priorité au temps (le plus rapide gagne)
                // Mais si distances différentes, priorité à la distance quand même
                if (a.totalDistance !== b.totalDistance) {
                    return b.totalDistance - a.totalDistance;
                }
                return a.totalTime - b.totalTime;
            }
        });

        const medals = ['🥇', '🥈', '🥉'];

        let html = `
            <div style="background: linear-gradient(135deg, #16a085 0%, #1abc9c 100%); padding: 20px; border-radius: 10px;">
                <h3 style="color: white; text-align: center; margin-bottom: 20px;">🏆 Classement Général</h3>
                <div style="background: white; border-radius: 10px; padding: 20px;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #f8f9fa; border-bottom: 2px solid #dee2e6;">
                                <th style="padding: 12px; text-align: center;">Pos.</th>
                                <th style="padding: 12px; text-align: center;">Dossard</th>
                                <th style="padding: 12px; text-align: left;">Participant</th>
                                <th style="padding: 12px; text-align: center;">Tours</th>
                                <th style="padding: 12px; text-align: center;">Distance Totale</th>
                                <th style="padding: 12px; text-align: center;">Temps Total</th>
                                <th style="padding: 12px; text-align: center;">Meilleur Tour</th>
                                <th style="padding: 12px; text-align: center;">Statut</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${ranked.map((p, index) => {
                                const position = index + 1;
                                const medal = position <= 3 ? medals[position - 1] : position;
                                const rowBg = position <= 3 ? 'background: linear-gradient(135deg, #fff9e6, #ffe9b3);' : '';

                                return `
                                    <tr style="${rowBg} border-bottom: 1px solid #ecf0f1;">
                                        <td style="padding: 12px; text-align: center; font-size: 24px; font-weight: bold;">
                                            ${medal}
                                        </td>
                                        <td style="padding: 12px; text-align: center; font-weight: bold; font-size: 20px; color: #3498db;">
                                            #${p.bib}
                                        </td>
                                        <td style="padding: 12px;">
                                            <div style="font-weight: bold; font-size: 16px;">${p.name}</div>
                                            <div style="font-size: 12px; color: #7f8c8d;">Division ${p.division}</div>
                                        </td>
                                        <td style="padding: 12px; text-align: center; font-weight: bold; font-size: 18px;">
                                            ${p.laps.length}
                                        </td>
                                        <td style="padding: 12px; text-align: center; font-weight: bold; font-size: 16px;">
                                            ${(p.totalDistance / 1000).toFixed(2)} km
                                        </td>
                                        <td style="padding: 12px; text-align: center; font-family: monospace; font-weight: bold; font-size: 16px;">
                                            ${p.status === 'finished' ? formatTime(p.finishTime) : formatTime(p.totalTime)}
                                        </td>
                                        <td style="padding: 12px; text-align: center; font-family: monospace; font-size: 14px;">
                                            ${p.bestLap ? formatTime(p.bestLap) : '-'}
                                        </td>
                                        <td style="padding: 12px; text-align: center;">
                                            ${p.status === 'finished' ?
                                                '<span style="color: #27ae60; font-weight: bold;">✅ Terminé</span>' :
                                                '<span style="color: #e67e22; font-weight: bold;">⏳ En cours</span>'
                                            }
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>

                    <div style="margin-top: 30px; display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">
                        <div style="background: linear-gradient(135deg, #16a085, #1abc9c); color: white; padding: 15px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 14px; opacity: 0.9;">Participants Totaux</div>
                            <div style="font-size: 32px; font-weight: bold;">${serie.participants.length}</div>
                        </div>
                        <div style="background: linear-gradient(135deg, #16a085, #1abc9c); color: white; padding: 15px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 14px; opacity: 0.9;">Terminés</div>
                            <div style="font-size: 32px; font-weight: bold;">
                                ${serie.participants.filter(p => p.status === 'finished').length}
                            </div>
                        </div>
                        <div style="background: linear-gradient(135deg, #fa709a, #fee140); color: white; padding: 15px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 14px; opacity: 0.9;">Distance Totale</div>
                            <div style="font-size: 32px; font-weight: bold;">
                                ${(serie.participants.reduce((sum, p) => sum + p.totalDistance, 0) / 1000).toFixed(2)} km
                            </div>
                        </div>
                        <div style="background: linear-gradient(135deg, #30cfd0, #330867); color: white; padding: 15px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 14px; opacity: 0.9;">Tours Totaux</div>
                            <div style="font-size: 32px; font-weight: bold;">
                                ${serie.participants.reduce((sum, p) => sum + p.laps.length, 0)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        rankingSection.innerHTML = html;
    }

    // Afficher le classement général de toutes les séries avec sélection intelligente
    window.showOverallChronoRanking = function() {
        // Vérifier s'il y a des séries terminées
        const completedSeriesCount = raceData.events.reduce((count, event) =>
            count + event.series.filter(s => s.status === 'completed').length, 0);

        if (completedSeriesCount === 0) {
            showNotification('Aucune série terminée. Terminez au moins une série pour voir le classement.', 'warning');
            return;
        }

        // Ouvrir le modal de sélection du type de classement
        showChronoRankingTypeModal();
    };

    // Afficher le modal de sélection du type de classement
    function showChronoRankingTypeModal() {
        const modal = document.getElementById('chronoRankingTypeModal');
        const optionsContainer = document.getElementById('rankingTypeOptions');

        // Analyser les épreuves pour proposer les options pertinentes
        const analysis = analyzeCompletedEvents();

        // Générer les options de classement
        let optionsHTML = '';

        // Option 1: Classement Global (toujours disponible)
        optionsHTML += createRankingOption(
            '🌍 Classement Global',
            'Tous les participants, toutes épreuves confondues',
            'global',
            '#16a085',
            `${analysis.totalParticipants} participants • ${analysis.totalSeries} séries`
        );

        // Option 2: Par Sport (si plusieurs sports)
        if (analysis.sports.length > 1) {
            const sportIcons = { running: '🏃', cycling: '🚴', swimming: '🏊', multisport: '🏅' };
            analysis.sports.forEach(sport => {
                optionsHTML += createRankingOption(
                    `${sportIcons[sport] || '🏃'} Classement ${sport === 'running' ? 'Course' : sport === 'cycling' ? 'Vélo' : sport === 'swimming' ? 'Natation' : 'Multisport'}`,
                    `Uniquement les épreuves de ${sport === 'running' ? 'course' : sport === 'cycling' ? 'vélo' : sport === 'swimming' ? 'natation' : 'multisport'}`,
                    `sport-${sport}`,
                    sport === 'running' ? '#e67e22' : sport === 'cycling' ? '#3498db' : sport === 'swimming' ? '#1abc9c' : '#16a085',
                    `${analysis.sportCounts[sport]} série(s)`
                );
            });
        }

        // Option 3: Par Type (Individuel vs Relais)
        if (analysis.hasIndividual && analysis.hasRelay) {
            optionsHTML += createRankingOption(
                '👤 Classement Individuel',
                'Uniquement les épreuves individuelles',
                'type-individual',
                '#27ae60',
                `${analysis.individualCount} série(s)`
            );
            optionsHTML += createRankingOption(
                '👥 Classement Relais',
                'Uniquement les épreuves en relais',
                'type-relay',
                '#e74c3c',
                `${analysis.relayCount} série(s)`
            );
        }

        // Option 4: Multi-épreuves (même participants dans plusieurs épreuves)
        if (analysis.hasMultiEvents) {
            optionsHTML += createRankingOption(
                '🎯 Classement Multi-Épreuves',
                'Participants ayant effectué plusieurs épreuves (cumul des performances)',
                'multi-events',
                '#16a085',
                `${analysis.multiEventsParticipants} participant(s) concerné(s)`
            );
        }

        // Option 5: Par Distance (si plusieurs épreuves avec même distance)
        if (analysis.commonDistances.length > 0) {
            analysis.commonDistances.forEach(distance => {
                optionsHTML += createRankingOption(
                    `📏 Classement ${distance}m`,
                    `Toutes les épreuves de ${distance}m (meilleur temps)`,
                    `distance-${distance}`,
                    '#16a085',
                    `${analysis.distanceCounts[distance]} série(s)`
                );
            });
        }

        // Option 6: Par Catégorie (si plusieurs catégories détectées)
        if (analysis.categories.length > 1) {
            optionsHTML += createRankingOption(
                '📋 Classements par Catégorie',
                'Classements séparés pour chaque catégorie',
                'by-category',
                '#f39c12',
                `${analysis.categories.length} catégorie(s)`
            );
        }

        // Option 7: Par Nationalité (si plusieurs nationalités détectées)
        if (analysis.nationalities.length > 1) {
            optionsHTML += createRankingOption(
                '🌍 Classements par Nationalité',
                'Classements séparés pour chaque nationalité',
                'by-nationality',
                '#3498db',
                `${analysis.nationalities.length} nationalité(s)`
            );
        }

        // Option 8: Par Club (si plusieurs clubs détectés)
        if (analysis.clubs.length > 1) {
            optionsHTML += createRankingOption(
                '🏅 Classements par Club',
                'Classements séparés pour chaque club',
                'by-club',
                '#27ae60',
                `${analysis.clubs.length} club(s)`
            );
        }

        optionsContainer.innerHTML = optionsHTML;
        modal.style.display = 'block';
    }

    // Créer une option de classement
    function createRankingOption(title, description, type, color, info) {
        return `
            <div onclick="selectRankingType('${type}')"
                 style="background: linear-gradient(135deg, ${color}, ${adjustColor(color, -20)});
                        color: white;
                        padding: 20px;
                        border-radius: 10px;
                        cursor: pointer;
                        transition: transform 0.2s, box-shadow 0.2s;
                        border: 3px solid transparent;"
                 onmouseover="this.style.transform='scale(1.03)'; this.style.boxShadow='0 8px 20px rgba(0,0,0,0.3)'; this.style.borderColor='white';"
                 onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none'; this.style.borderColor='transparent';">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                    <h4 style="margin: 0; font-size: 18px;">${title}</h4>
                    <span style="background: rgba(255,255,255,0.3); padding: 4px 10px; border-radius: 15px; font-size: 12px; font-weight: bold;">
                        ${info}
                    </span>
                </div>
                <p style="margin: 0; font-size: 14px; opacity: 0.95;">${description}</p>
            </div>
        `;
    }

    // Fonction helper pour ajuster la couleur
    function adjustColor(color, amount) {
        const clamp = (num) => Math.min(255, Math.max(0, num));
        const num = parseInt(color.replace('#', ''), 16);
        const r = clamp((num >> 16) + amount);
        const g = clamp(((num >> 8) & 0x00FF) + amount);
        const b = clamp((num & 0x0000FF) + amount);
        return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
    }

    // Analyser les épreuves terminées pour proposer des options pertinentes
    function analyzeCompletedEvents() {
        const analysis = {
            totalParticipants: 0,
            totalSeries: 0,
            sports: new Set(),
            sportCounts: {},
            hasIndividual: false,
            hasRelay: false,
            individualCount: 0,
            relayCount: 0,
            commonDistances: [],
            distanceCounts: {},
            hasMultiEvents: false,
            multiEventsParticipants: 0,
            categories: new Set(),
            nationalities: new Set(),
            clubs: new Set(),
            participantBibMap: {} // Pour détecter les participants multi-épreuves
        };

        raceData.events.forEach(event => {
            event.series.forEach(serie => {
                if (serie.status === 'completed') {
                    analysis.totalSeries++;

                    // Analyser le sport
                    const sport = serie.sportType || event.sportType || 'running';
                    analysis.sports.add(sport);
                    analysis.sportCounts[sport] = (analysis.sportCounts[sport] || 0) + 1;

                    // Analyser le type (individuel/relais)
                    const raceType = serie.raceType || event.raceType || 'individual';
                    if (raceType === 'individual') {
                        analysis.hasIndividual = true;
                        analysis.individualCount++;
                    } else {
                        analysis.hasRelay = true;
                        analysis.relayCount++;
                    }

                    // Analyser les distances
                    const distance = serie.distance || event.distance || 0;
                    if (distance > 0) {
                        analysis.distanceCounts[distance] = (analysis.distanceCounts[distance] || 0) + 1;
                    }

                    // Analyser les participants et catégories
                    serie.participants.forEach(participant => {
                        if (participant.status === 'finished') {
                            // Catégories
                            if (participant.category) {
                                analysis.categories.add(participant.category);
                            }

                            // Nationalités
                            if (participant.nationality) {
                                analysis.nationalities.add(participant.nationality);
                            }

                            // Clubs
                            if (participant.club) {
                                analysis.clubs.add(participant.club);
                            }

                            // Multi-épreuves
                            const bib = participant.bib;
                            if (!analysis.participantBibMap[bib]) {
                                analysis.participantBibMap[bib] = {
                                    name: participant.name,
                                    count: 0
                                };
                            }
                            analysis.participantBibMap[bib].count++;
                        }
                    });
                }
            });
        });

        // Détecter les distances communes (au moins 2 séries)
        analysis.commonDistances = Object.keys(analysis.distanceCounts)
            .filter(d => analysis.distanceCounts[d] >= 2)
            .map(d => parseInt(d))
            .sort((a, b) => a - b);

        // Détecter les participants multi-épreuves
        const multiEventsParticipants = Object.values(analysis.participantBibMap)
            .filter(p => p.count > 1);
        analysis.hasMultiEvents = multiEventsParticipants.length > 0;
        analysis.multiEventsParticipants = multiEventsParticipants.length;

        // Compter les participants uniques
        analysis.totalParticipants = Object.keys(analysis.participantBibMap).length;

        // Convertir Sets en Arrays
        analysis.sports = Array.from(analysis.sports);
        analysis.categories = Array.from(analysis.categories);

        return analysis;
    }

    // Fermer le modal de sélection
    window.closeChronoRankingTypeModal = function() {
        document.getElementById('chronoRankingTypeModal').style.display = 'none';
    };

    // Sélectionner un type de classement et le générer
    window.selectRankingType = function(type) {
        closeChronoRankingTypeModal();

        const rankingSection = document.getElementById('overallChronoRanking');
        const eventsList = document.getElementById('eventsList');

        // Masquer la liste des épreuves et afficher le classement
        if (eventsList && eventsList.parentElement) {
            eventsList.parentElement.style.display = 'none';
        }

        if (rankingSection) {
            rankingSection.style.display = 'block';
        }

        // Générer le classement selon le type sélectionné
        if (type === 'global') {
            generateOverallChronoRanking();
        } else if (type.startsWith('sport-')) {
            const sport = type.replace('sport-', '');
            generateRankingBySport(sport);
        } else if (type.startsWith('type-')) {
            const raceType = type.replace('type-', '');
            generateRankingByType(raceType);
        } else if (type === 'multi-events') {
            generateMultiEventsRanking();
        } else if (type.startsWith('distance-')) {
            const distance = parseInt(type.replace('distance-', ''));
            generateRankingByDistance(distance);
        } else if (type === 'by-category') {
            generateRankingByCategory();
        } else if (type === 'by-nationality') {
            generateRankingByNationality();
        } else if (type === 'by-club') {
            generateRankingByClub();
        }
    };

    // ========================================
    // FONCTIONS DE CLASSEMENT SPÉCIALISÉES
    // ========================================

    // Classement par sport
    function generateRankingBySport(sport) {
        const sportNames = { running: 'Course', cycling: 'Vélo', swimming: 'Natation', multisport: 'Multisport' };
        const sportIcons = { running: '🏃', cycling: '🚴', swimming: '🏊', multisport: '🏅' };

        generateFilteredRanking(
            (event, serie) => (serie.sportType || event.sportType || 'running') === sport,
            `${sportIcons[sport]} Classement ${sportNames[sport]}`,
            sport
        );
    }

    // Classement par type (individuel/relais)
    function generateRankingByType(raceType) {
        const typeNames = { individual: 'Individuel', relay: 'Relais' };
        const typeIcons = { individual: '👤', relay: '👥' };

        generateFilteredRanking(
            (event, serie) => (serie.raceType || event.raceType || 'individual') === raceType,
            `${typeIcons[raceType]} Classement ${typeNames[raceType]}`,
            raceType
        );
    }

    // Classement Multi-Épreuves (participants avec plusieurs épreuves)
    function generateMultiEventsRanking() {
        const allParticipants = [];
        const participantMap = {};

        // Collecter tous les participants et leurs performances
        raceData.events.forEach(event => {
            event.series.forEach(serie => {
                if (serie.status === 'completed') {
                    serie.participants.forEach(participant => {
                        if (participant.status === 'finished') {
                            const bib = participant.bib;

                            if (!participantMap[bib]) {
                                participantMap[bib] = {
                                    name: participant.name,
                                    bib: participant.bib,
                                    category: participant.category,
                                    series: [],
                                    totalDistance: 0,
                                    totalTime: 0,
                                    totalLaps: 0,
                                    eventsCount: 0
                                };
                            }

                            participantMap[bib].series.push({
                                eventName: event.name,
                                serieName: serie.name,
                                sportType: serie.sportType || event.sportType,
                                distance: participant.totalDistance,
                                time: participant.finishTime || participant.totalTime,
                                laps: participant.laps.length
                            });
                            participantMap[bib].totalDistance += participant.totalDistance;
                            participantMap[bib].totalTime += (participant.finishTime || participant.totalTime);
                            participantMap[bib].totalLaps += participant.laps.length;
                            participantMap[bib].eventsCount++;
                        }
                    });
                }
            });
        });

        // Ne garder que ceux avec plusieurs épreuves
        Object.values(participantMap).forEach(p => {
            if (p.eventsCount > 1) {
                allParticipants.push(p);
            }
        });

        if (allParticipants.length === 0) {
            displayEmptyRanking('🎯 Classement Multi-Épreuves', 'Aucun participant n\'a effectué plusieurs épreuves.');
            return;
        }

        // Trier par distance totale puis temps
        const ranked = allParticipants.sort((a, b) => {
            if (a.totalDistance !== b.totalDistance) {
                return b.totalDistance - a.totalDistance;
            }
            return a.totalTime - b.totalTime;
        });

        displayRanking(ranked, '🎯 Classement Multi-Épreuves', 'multi-events');
    }

    // Classement par distance fixe
    function generateRankingByDistance(targetDistance) {
        const allParticipants = [];

        raceData.events.forEach(event => {
            event.series.forEach(serie => {
                if (serie.status === 'completed') {
                    const distance = serie.distance || event.distance || 0;

                    // Filtrer uniquement les séries avec la distance cible
                    if (distance === targetDistance) {
                        serie.participants.forEach(participant => {
                            if (participant.status === 'finished') {
                                allParticipants.push({
                                    name: participant.name,
                                    bib: participant.bib,
                                    category: participant.category,
                                    eventName: event.name,
                                    serieName: serie.name,
                                    time: participant.finishTime || participant.totalTime,
                                    distance: participant.totalDistance,
                                    laps: participant.laps.length,
                                    sportType: serie.sportType || event.sportType
                                });
                            }
                        });
                    }
                }
            });
        });

        if (allParticipants.length === 0) {
            displayEmptyRanking(`📏 Classement ${targetDistance}m`, `Aucune épreuve de ${targetDistance}m terminée.`);
            return;
        }

        // Trier par meilleur temps
        const ranked = allParticipants.sort((a, b) => a.time - b.time);

        displayRankingByTime(ranked, `📏 Classement ${targetDistance}m`, targetDistance);
    }

    // Classement par catégorie
    function generateRankingByCategory() {
        const categoriesMap = {};

        raceData.events.forEach(event => {
            event.series.forEach(serie => {
                if (serie.status === 'completed') {
                    serie.participants.forEach(participant => {
                        if (participant.status === 'finished') {
                            const category = participant.category || 'Non catégorisé';

                            if (!categoriesMap[category]) {
                                categoriesMap[category] = [];
                            }

                            categoriesMap[category].push({
                                name: participant.name,
                                bib: participant.bib,
                                category: participant.category,
                                eventName: event.name,
                                serieName: serie.name,
                                totalDistance: participant.totalDistance,
                                totalTime: participant.finishTime || participant.totalTime,
                                totalLaps: participant.laps.length
                            });
                        }
                    });
                }
            });
        });

        displayRankingByCategories(categoriesMap, '📋 Classements par Catégorie');
    }

    // Classement par nationalité
    function generateRankingByNationality() {
        const nationalitiesMap = {};

        raceData.events.forEach(event => {
            event.series.forEach(serie => {
                if (serie.status === 'completed') {
                    serie.participants.forEach(participant => {
                        if (participant.status === 'finished') {
                            const nationality = participant.nationality || 'Non renseignée';

                            if (!nationalitiesMap[nationality]) {
                                nationalitiesMap[nationality] = [];
                            }

                            nationalitiesMap[nationality].push({
                                name: participant.name,
                                bib: participant.bib,
                                category: participant.category,
                                nationality: participant.nationality,
                                club: participant.club,
                                age: participant.age,
                                eventName: event.name,
                                serieName: serie.name,
                                totalDistance: participant.totalDistance,
                                totalTime: participant.finishTime || participant.totalTime,
                                totalLaps: participant.laps.length
                            });
                        }
                    });
                }
            });
        });

        displayRankingByCategories(nationalitiesMap, '🌍 Classements par Nationalité');
    }

    // Classement par club
    function generateRankingByClub() {
        const clubsMap = {};

        raceData.events.forEach(event => {
            event.series.forEach(serie => {
                if (serie.status === 'completed') {
                    serie.participants.forEach(participant => {
                        if (participant.status === 'finished') {
                            const club = participant.club || 'Sans club';

                            if (!clubsMap[club]) {
                                clubsMap[club] = [];
                            }

                            clubsMap[club].push({
                                name: participant.name,
                                bib: participant.bib,
                                category: participant.category,
                                nationality: participant.nationality,
                                club: participant.club,
                                age: participant.age,
                                eventName: event.name,
                                serieName: serie.name,
                                totalDistance: participant.totalDistance,
                                totalTime: participant.finishTime || participant.totalTime,
                                totalLaps: participant.laps.length
                            });
                        }
                    });
                }
            });
        });

        displayRankingByCategories(clubsMap, '🏅 Classements par Club');
    }

    // Fonction générique pour générer un classement filtré
    function generateFilteredRanking(filterFunc, title, type) {
        const allParticipants = [];

        raceData.events.forEach(event => {
            event.series.forEach(serie => {
                if (serie.status === 'completed' && filterFunc(event, serie)) {
                    serie.participants.forEach(participant => {
                        if (participant.status === 'finished') {
                            const existingIndex = allParticipants.findIndex(p => p.bib === participant.bib);

                            if (existingIndex !== -1) {
                                allParticipants[existingIndex].series.push({
                                    eventName: event.name,
                                    serieName: serie.name,
                                    distance: participant.totalDistance,
                                    time: participant.finishTime || participant.totalTime,
                                    laps: participant.laps.length
                                });
                                allParticipants[existingIndex].totalDistance += participant.totalDistance;
                                allParticipants[existingIndex].totalTime += (participant.finishTime || participant.totalTime);
                                allParticipants[existingIndex].totalLaps += participant.laps.length;
                            } else {
                                allParticipants.push({
                                    name: participant.name,
                                    bib: participant.bib,
                                    category: participant.category,
                                    series: [{
                                        eventName: event.name,
                                        serieName: serie.name,
                                        distance: participant.totalDistance,
                                        time: participant.finishTime || participant.totalTime,
                                        laps: participant.laps.length
                                    }],
                                    totalDistance: participant.totalDistance,
                                    totalTime: participant.finishTime || participant.totalTime,
                                    totalLaps: participant.laps.length
                                });
                            }
                        }
                    });
                }
            });
        });

        if (allParticipants.length === 0) {
            displayEmptyRanking(title, 'Aucune série terminée pour ce type.');
            return;
        }

        // Trier par distance puis temps
        const ranked = allParticipants.sort((a, b) => {
            if (a.totalDistance !== b.totalDistance) {
                return b.totalDistance - a.totalDistance;
            }
            return a.totalTime - b.totalTime;
        });

        displayRanking(ranked, title, type);
    }

    // Fonction pour fermer le classement et retourner aux séries
    window.hideChronoRanking = function() {
        const rankingSection = document.getElementById('overallChronoRanking');
        const eventsList = document.getElementById('eventsList');

        // Masquer le classement
        if (rankingSection) {
            rankingSection.style.display = 'none';
        }

        // Afficher la liste des épreuves
        if (eventsList && eventsList.parentElement) {
            eventsList.parentElement.style.display = 'block';
        }
    };

    // Afficher un classement vide
    function displayEmptyRanking(title, message) {
        const rankingSection = document.getElementById('overallChronoRanking');
        rankingSection.innerHTML = `
            <div style="background: white; padding: 40px; border-radius: 10px; text-align: center;">
                <h3 style="color: #2c3e50; margin-bottom: 20px;">${title}</h3>
                <p style="color: #7f8c8d; margin-bottom: 30px;">${message}</p>
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button class="btn" onclick="hideChronoRanking()" style="background: #95a5a6;">
                        ⬅️ Retour aux séries
                    </button>
                    <button class="btn" onclick="showOverallChronoRanking()" style="background: #16a085;">
                        🔄 Choisir un type de classement
                    </button>
                </div>
            </div>
        `;
    }

    // Afficher un classement standard
    function displayRanking(ranked, title, type) {
        const rankingSection = document.getElementById('overallChronoRanking');
        const medals = ['🥇', '🥈', '🥉'];

        // Calculer les places par catégorie
        const categoryRankings = {};
        ranked.forEach((participant, index) => {
            const category = participant.category || 'Non catégorisé';
            if (!categoryRankings[category]) {
                categoryRankings[category] = [];
            }
            categoryRankings[category].push({ ...participant, scratchPosition: index + 1 });
        });

        // Assigner les places par catégorie
        Object.keys(categoryRankings).forEach(category => {
            categoryRankings[category].forEach((p, idx) => {
                const participantInRanked = ranked.find(rp => rp.bib === p.bib);
                if (participantInRanked) {
                    participantInRanked.categoryPosition = idx + 1;
                }
            });
        });

        // Stocker les données pour l'export PDF
        lastChronoRankingData = {
            title: title,
            type: type,
            participants: ranked,
            categoriesMap: null
        };

        rankingSection.innerHTML = `
            <div style="background: white; padding: 20px; border-radius: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;">
                    <h3 style="margin: 0; color: #2c3e50;">${title}</h3>
                    <div style="display: flex; gap: 10px;">
                        <button class="btn" onclick="hideChronoRanking()" style="background: #95a5a6;">
                            ⬅️ Retour aux séries
                        </button>
                        <button class="btn" onclick="showOverallChronoRanking()" style="background: #16a085;">
                            🔄 Changer de type
                        </button>
                        <button class="btn" onclick="exportChronoRankingToPDF()" style="background: linear-gradient(135deg, #e74c3c, #c0392b); color: white;">
                            📄 Export PDF
                        </button>
                    </div>
                </div>

                <div style="background: linear-gradient(135deg, #16a085, #1abc9c); color: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
                    <div style="font-size: 14px; opacity: 0.9;">Participants</div>
                    <div style="font-size: 28px; font-weight: bold;">${ranked.length}</div>
                </div>

                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: linear-gradient(135deg, #16a085, #1abc9c); color: white;">
                                <th style="padding: 15px; text-align: center;">Pos. Scratch</th>
                                <th style="padding: 15px; text-align: left;">Participant</th>
                                <th style="padding: 15px; text-align: center;">Dossard</th>
                                <th style="padding: 15px; text-align: center;">Catégorie</th>
                                <th style="padding: 15px; text-align: center;">Pos. Cat.</th>
                                <th style="padding: 15px; text-align: center;">Séries</th>
                                <th style="padding: 15px; text-align: center;">Distance</th>
                                <th style="padding: 15px; text-align: center;">Temps</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${ranked.map((participant, index) => {
                                const position = index + 1;
                                const medal = position <= 3 ? medals[position - 1] : position;
                                const catMedal = participant.categoryPosition <= 3 ? medals[participant.categoryPosition - 1] : participant.categoryPosition;
                                const rowBg = position <= 3 ? 'background: linear-gradient(135deg, #fff9e6, #ffe9b3);' :
                                              index % 2 === 0 ? 'background: #f8f9fa;' : '';

                                return `
                                    <tr style="${rowBg}">
                                        <td style="padding: 15px; text-align: center; font-size: 20px; font-weight: bold;">
                                            ${medal}
                                        </td>
                                        <td style="padding: 15px;">
                                            <div style="font-weight: bold; color: #2c3e50;">${participant.name}</div>
                                        </td>
                                        <td style="padding: 15px; text-align: center;">
                                            <span style="background: #3498db; color: white; padding: 5px 10px; border-radius: 5px; font-weight: bold;">
                                                ${participant.bib}
                                            </span>
                                        </td>
                                        <td style="padding: 15px; text-align: center; color: #7f8c8d;">
                                            ${participant.category || '-'}
                                        </td>
                                        <td style="padding: 15px; text-align: center; font-size: 18px; font-weight: bold; color: #f39c12;">
                                            ${catMedal}
                                        </td>
                                        <td style="padding: 15px; text-align: center; font-weight: bold; color: #e67e22;">
                                            ${participant.series ? participant.series.length : 1}
                                        </td>
                                        <td style="padding: 15px; text-align: center; font-weight: bold; color: #27ae60;">
                                            ${(participant.totalDistance / 1000).toFixed(2)} km
                                        </td>
                                        <td style="padding: 15px; text-align: center; font-weight: bold; color: #16a085; font-family: monospace;">
                                            ${formatTime(participant.totalTime)}
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    // Afficher un classement par temps (pour distances fixes)
    function displayRankingByTime(ranked, title, distance) {
        const rankingSection = document.getElementById('overallChronoRanking');
        const medals = ['🥇', '🥈', '🥉'];
        const sportIcons = { running: '🏃', cycling: '🚴', swimming: '🏊', multisport: '🏅' };

        // Stocker les données pour l'export PDF
        lastChronoRankingData = {
            title: title,
            type: 'distance',
            participants: ranked,
            categoriesMap: null,
            distance: distance
        };

        rankingSection.innerHTML = `
            <div style="background: white; padding: 20px; border-radius: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;">
                    <h3 style="margin: 0; color: #2c3e50;">${title}</h3>
                    <div style="display: flex; gap: 10px;">
                        <button class="btn" onclick="hideChronoRanking()" style="background: #95a5a6;">
                            ⬅️ Retour aux séries
                        </button>
                        <button class="btn" onclick="showOverallChronoRanking()" style="background: #16a085;">
                            🔄 Changer de type
                        </button>
                        <button class="btn" onclick="exportChronoRankingToPDF()" style="background: linear-gradient(135deg, #e74c3c, #c0392b); color: white;">
                            📄 Export PDF
                        </button>
                    </div>
                </div>

                <div style="background: linear-gradient(135deg, #16a085, #1abc9c); color: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
                    <div style="font-size: 14px; opacity: 0.9;">Meilleur Temps sur ${distance}m</div>
                    <div style="font-size: 28px; font-weight: bold;">${ranked.length} participants</div>
                </div>

                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: linear-gradient(135deg, #16a085, #1abc9c); color: white;">
                                <th style="padding: 15px; text-align: center;">Pos.</th>
                                <th style="padding: 15px; text-align: left;">Participant</th>
                                <th style="padding: 15px; text-align: center;">Dossard</th>
                                <th style="padding: 15px; text-align: center;">Catégorie</th>
                                <th style="padding: 15px; text-align: center;">Épreuve</th>
                                <th style="padding: 15px; text-align: center;">Temps</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${ranked.map((participant, index) => {
                                const position = index + 1;
                                const medal = position <= 3 ? medals[position - 1] : position;
                                const rowBg = position <= 3 ? 'background: linear-gradient(135deg, #fff9e6, #ffe9b3);' :
                                              index % 2 === 0 ? 'background: #f8f9fa;' : '';

                                return `
                                    <tr style="${rowBg}">
                                        <td style="padding: 15px; text-align: center; font-size: 20px; font-weight: bold;">
                                            ${medal}
                                        </td>
                                        <td style="padding: 15px;">
                                            <div style="font-weight: bold; color: #2c3e50;">${participant.name}</div>
                                        </td>
                                        <td style="padding: 15px; text-align: center;">
                                            <span style="background: #3498db; color: white; padding: 5px 10px; border-radius: 5px; font-weight: bold;">
                                                ${participant.bib}
                                            </span>
                                        </td>
                                        <td style="padding: 15px; text-align: center; color: #7f8c8d;">
                                            ${participant.category || '-'}
                                        </td>
                                        <td style="padding: 15px; text-align: center; color: #7f8c8d; font-size: 12px;">
                                            ${sportIcons[participant.sportType] || ''} ${participant.eventName}<br>
                                            <span style="opacity: 0.7;">${participant.serieName}</span>
                                        </td>
                                        <td style="padding: 15px; text-align: center; font-weight: bold; color: #27ae60; font-family: monospace; font-size: 18px;">
                                            ${formatTime(participant.time)}
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    // Variable pour stocker les données du dernier classement affiché
    let lastChronoRankingData = {
        title: '',
        type: '',
        participants: [],
        categoriesMap: null
    };

    // Afficher les classements par catégorie
    function displayRankingByCategories(categoriesMap, customTitle = '📋 Classements par Catégorie') {
        const rankingSection = document.getElementById('overallChronoRanking');
        const categories = Object.keys(categoriesMap).sort();

        // Stocker les données pour l'export PDF
        lastChronoRankingData = {
            title: customTitle,
            type: 'category',
            participants: [],
            categoriesMap: categoriesMap
        };

        let html = `
            <div style="background: white; padding: 20px; border-radius: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;">
                    <h3 style="margin: 0; color: #2c3e50;">${customTitle}</h3>
                    <div style="display: flex; gap: 10px;">
                        <button class="btn" onclick="hideChronoRanking()" style="background: #95a5a6;">
                            ⬅️ Retour aux séries
                        </button>
                        <button class="btn" onclick="showOverallChronoRanking()" style="background: #16a085;">
                            🔄 Changer de type
                        </button>
                        <button class="btn" onclick="exportChronoRankingToPDF()" style="background: linear-gradient(135deg, #e74c3c, #c0392b); color: white;">
                            📄 Export PDF
                        </button>
                    </div>
                </div>
        `;

        categories.forEach(category => {
            const participants = categoriesMap[category];
            const ranked = participants.sort((a, b) => {
                if (a.totalDistance !== b.totalDistance) {
                    return b.totalDistance - a.totalDistance;
                }
                return a.totalTime - b.totalTime;
            });

            const medals = ['🥇', '🥈', '🥉'];

            html += `
                <div style="margin-bottom: 30px;">
                    <h4 style="color: #2c3e50; background: linear-gradient(135deg, #f39c12, #e67e22); color: white; padding: 10px 15px; border-radius: 8px; margin-bottom: 15px;">
                        ${category} (${ranked.length} participant${ranked.length > 1 ? 's' : ''})
                    </h4>
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                        <thead>
                            <tr style="background: #f8f9fa; border-bottom: 2px solid #ddd;">
                                <th style="padding: 10px; text-align: center;">Pos.</th>
                                <th style="padding: 10px; text-align: left;">Participant</th>
                                <th style="padding: 10px; text-align: center;">Dossard</th>
                                <th style="padding: 10px; text-align: center;">Distance</th>
                                <th style="padding: 10px; text-align: center;">Temps</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${ranked.map((participant, index) => {
                                const position = index + 1;
                                const medal = position <= 3 ? medals[position - 1] : position;

                                return `
                                    <tr style="${index % 2 === 0 ? 'background: #f8f9fa;' : ''}">
                                        <td style="padding: 10px; text-align: center; font-weight: bold;">
                                            ${medal}
                                        </td>
                                        <td style="padding: 10px; font-weight: bold; color: #2c3e50;">
                                            ${participant.name}
                                        </td>
                                        <td style="padding: 10px; text-align: center;">
                                            <span style="background: #3498db; color: white; padding: 3px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">
                                                ${participant.bib}
                                            </span>
                                        </td>
                                        <td style="padding: 10px; text-align: center; color: #27ae60; font-weight: bold;">
                                            ${(participant.totalDistance / 1000).toFixed(2)} km
                                        </td>
                                        <td style="padding: 10px; text-align: center; font-family: monospace; font-weight: bold; color: #16a085;">
                                            ${formatTime(participant.totalTime)}
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        });

        html += `</div>`;
        rankingSection.innerHTML = html;
    }

    // ========================================
    // EXPORT PDF DU CLASSEMENT CHRONO
    // ========================================

    window.exportChronoRankingToPDF = function() {
        if (!lastChronoRankingData || !lastChronoRankingData.title) {
            alert('Aucun classement à exporter. Veuillez d\'abord afficher un classement.');
            return;
        }

        // Ouvrir le modal de configuration des colonnes
        showChronoPdfConfigModal();
    };

    // Afficher le modal de configuration PDF
    function showChronoPdfConfigModal() {
        const modal = document.getElementById('chronoPdfConfigModal');
        const checkboxesContainer = document.getElementById('pdfColumnsCheckboxes');
        const titleInput = document.getElementById('pdfCustomTitle');
        const defaultTitleSpan = document.getElementById('pdfDefaultTitle');

        const data = lastChronoRankingData;

        // Afficher le titre par défaut et vider le champ de saisie
        defaultTitleSpan.textContent = data.title;
        titleInput.value = '';
        titleInput.placeholder = `Ex: ${data.title} 2025`;

        let columns = [];

        // Définir les colonnes disponibles selon le type de classement
        if (data.type === 'category') {
            columns = [
                { id: 'position', label: 'Position', checked: true },
                { id: 'name', label: 'Nom du participant', checked: true },
                { id: 'bib', label: 'Dossard', checked: true },
                { id: 'distance', label: 'Distance totale', checked: true },
                { id: 'time', label: 'Temps total', checked: true }
            ];
        } else if (data.type === 'distance') {
            columns = [
                { id: 'position', label: 'Position', checked: true },
                { id: 'name', label: 'Nom du participant', checked: true },
                { id: 'bib', label: 'Dossard', checked: true },
                { id: 'category', label: 'Catégorie', checked: true },
                { id: 'event', label: 'Épreuve/Série', checked: true },
                { id: 'time', label: 'Temps', checked: true }
            ];
        } else {
            // Classement standard (global, par sport, par type, multi-épreuves)
            columns = [
                { id: 'position', label: 'Position', checked: true },
                { id: 'name', label: 'Nom du participant', checked: true },
                { id: 'bib', label: 'Dossard', checked: true },
                { id: 'category', label: 'Catégorie', checked: true },
                { id: 'series', label: 'Nombre de séries', checked: true },
                { id: 'distance', label: 'Distance totale', checked: true },
                { id: 'time', label: 'Temps total', checked: true }
            ];
        }

        // Générer les checkboxes
        checkboxesContainer.innerHTML = columns.map(col => `
            <label style="display: flex; align-items: center; padding: 10px; background: #f8f9fa; border-radius: 8px; cursor: pointer; transition: background 0.2s;"
                   onmouseover="this.style.background='#e9ecef'"
                   onmouseout="this.style.background='#f8f9fa'">
                <input type="checkbox"
                       id="pdfCol_${col.id}"
                       ${col.checked ? 'checked' : ''}
                       ${col.id === 'position' || col.id === 'name' ? 'disabled' : ''}
                       style="margin-right: 10px; width: 18px; height: 18px; cursor: pointer;">
                <span style="font-size: 14px; color: #2c3e50;">
                    ${col.label}
                    ${col.id === 'position' || col.id === 'name' ? '<span style="color: #95a5a6; font-size: 12px; margin-left: 5px;">(obligatoire)</span>' : ''}
                </span>
            </label>
        `).join('');

        modal.style.display = 'block';
    }

    // Fermer le modal de configuration PDF
    window.closeChronoPdfConfigModal = function() {
        document.getElementById('chronoPdfConfigModal').style.display = 'none';
    };

    // Confirmer et générer le PDF avec les colonnes sélectionnées
    window.confirmChronoPdfExport = function() {
        // Récupérer le titre personnalisé (ou utiliser le titre par défaut)
        const customTitle = document.getElementById('pdfCustomTitle').value.trim();
        const finalTitle = customTitle || lastChronoRankingData.title;

        // Récupérer les colonnes sélectionnées
        const selectedColumns = {
            position: true, // Toujours inclus
            name: true, // Toujours inclus
            bib: document.getElementById('pdfCol_bib')?.checked ?? true,
            category: document.getElementById('pdfCol_category')?.checked ?? true,
            series: document.getElementById('pdfCol_series')?.checked ?? true,
            distance: document.getElementById('pdfCol_distance')?.checked ?? true,
            time: document.getElementById('pdfCol_time')?.checked ?? true,
            event: document.getElementById('pdfCol_event')?.checked ?? true
        };

        closeChronoPdfConfigModal();
        generateChronoPDF(selectedColumns, finalTitle);
    };

    // Générer le PDF avec les colonnes sélectionnées
    function generateChronoPDF(selectedColumns, customTitle) {
        const currentDate = new Date().toLocaleDateString('fr-FR', {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });

        const data = lastChronoRankingData;
        const pdfTitle = customTitle || data.title; // Utiliser le titre personnalisé ou le titre par défaut
        let tableRows = '';

        // Compter les colonnes affichées pour le colspan
        const visibleColumnsCount = Object.values(selectedColumns).filter(v => v).length;

        // Générer le contenu selon le type de classement
        if (data.type === 'category' && data.categoriesMap) {
            // Classement par catégorie
            const categories = Object.keys(data.categoriesMap).sort();
            categories.forEach(category => {
                const participants = data.categoriesMap[category].sort((a, b) => {
                    if (a.totalDistance !== b.totalDistance) return b.totalDistance - a.totalDistance;
                    return a.totalTime - b.totalTime;
                });

                tableRows += `
                    <tr style="background: linear-gradient(135deg, #f39c12, #e67e22); color: white;">
                        <td colspan="${visibleColumnsCount}" style="padding: 12px; font-weight: bold; font-size: 16px;">
                            ${category} (${participants.length} participant${participants.length > 1 ? 's' : ''})
                        </td>
                    </tr>
                `;

                participants.forEach((p, idx) => {
                    const pos = idx + 1;
                    const medal = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : pos;
                    let row = '<tr style="' + (idx % 2 === 0 ? 'background: #f8f9fa;' : '') + '">';

                    if (selectedColumns.position) row += `<td style="padding: 10px; text-align: center; font-weight: bold;">${medal}</td>`;
                    if (selectedColumns.name) row += `<td style="padding: 10px;">${p.name}</td>`;
                    if (selectedColumns.bib) row += `<td style="padding: 10px; text-align: center;">${p.bib}</td>`;
                    if (selectedColumns.distance) row += `<td style="padding: 10px; text-align: center;">${(p.totalDistance / 1000).toFixed(2)} km</td>`;
                    if (selectedColumns.time) row += `<td style="padding: 10px; text-align: center; font-family: monospace;">${formatTime(p.totalTime)}</td>`;

                    row += '</tr>';
                    tableRows += row;
                });
            });
        } else if (data.type === 'distance') {
            // Classement par temps (distance fixe)
            data.participants.forEach((p, idx) => {
                const pos = idx + 1;
                const medal = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : pos;
                const sportIcons = { running: '🏃', cycling: '🚴', swimming: '🏊', multisport: '🏅' };
                const sportIcon = sportIcons[p.sportType] || '';

                let row = `<tr style="${pos <= 3 ? 'background: linear-gradient(135deg, #fff9e6, #ffe9b3);' : idx % 2 === 0 ? 'background: #f8f9fa;' : ''}">`;

                if (selectedColumns.position) row += `<td style="padding: 12px; text-align: center; font-weight: bold; font-size: 18px;">${medal}</td>`;
                if (selectedColumns.name) row += `<td style="padding: 12px; font-weight: bold;">${p.name}</td>`;
                if (selectedColumns.bib) row += `<td style="padding: 12px; text-align: center;">${p.bib}</td>`;
                if (selectedColumns.category) row += `<td style="padding: 12px; text-align: center;">${p.category || '-'}</td>`;
                if (selectedColumns.event) row += `<td style="padding: 12px; text-align: center; font-size: 11px;">${sportIcon} ${p.eventName}<br>${p.serieName}</td>`;
                if (selectedColumns.time) row += `<td style="padding: 12px; text-align: center; font-weight: bold; font-family: monospace; font-size: 16px; color: #27ae60;">${formatTime(p.time)}</td>`;

                row += '</tr>';
                tableRows += row;
            });
        } else {
            // Classement standard (global, par sport, par type, multi-épreuves)
            data.participants.forEach((p, idx) => {
                const pos = idx + 1;
                const medal = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : pos;

                let row = `<tr style="${pos <= 3 ? 'background: linear-gradient(135deg, #fff9e6, #ffe9b3);' : idx % 2 === 0 ? 'background: #f8f9fa;' : ''}">`;

                if (selectedColumns.position) row += `<td style="padding: 12px; text-align: center; font-weight: bold; font-size: 18px;">${medal}</td>`;
                if (selectedColumns.name) row += `<td style="padding: 12px; font-weight: bold;">${p.name}</td>`;
                if (selectedColumns.bib) row += `<td style="padding: 12px; text-align: center;">${p.bib}</td>`;
                if (selectedColumns.category) row += `<td style="padding: 12px; text-align: center;">${p.category || '-'}</td>`;
                if (selectedColumns.series) row += `<td style="padding: 12px; text-align: center;">${p.series ? p.series.length : 1}</td>`;
                if (selectedColumns.distance) row += `<td style="padding: 12px; text-align: center; font-weight: bold; color: #27ae60;">${(p.totalDistance / 1000).toFixed(2)} km</td>`;
                if (selectedColumns.time) row += `<td style="padding: 12px; text-align: center; font-weight: bold; font-family: monospace; color: #16a085;">${formatTime(p.totalTime)}</td>`;

                row += '</tr>';
                tableRows += row;
            });
        }

        // Définir les en-têtes de tableau selon le type et les colonnes sélectionnées
        let tableHeaders = '';
        if (data.type === 'category') {
            if (selectedColumns.position) tableHeaders += `<th style="padding: 12px; text-align: center;">Pos.</th>`;
            if (selectedColumns.name) tableHeaders += `<th style="padding: 12px; text-align: left;">Participant</th>`;
            if (selectedColumns.bib) tableHeaders += `<th style="padding: 12px; text-align: center;">Dossard</th>`;
            if (selectedColumns.distance) tableHeaders += `<th style="padding: 12px; text-align: center;">Distance</th>`;
            if (selectedColumns.time) tableHeaders += `<th style="padding: 12px; text-align: center;">Temps</th>`;
        } else if (data.type === 'distance') {
            if (selectedColumns.position) tableHeaders += `<th style="padding: 12px; text-align: center;">Pos.</th>`;
            if (selectedColumns.name) tableHeaders += `<th style="padding: 12px; text-align: left;">Participant</th>`;
            if (selectedColumns.bib) tableHeaders += `<th style="padding: 12px; text-align: center;">Dossard</th>`;
            if (selectedColumns.category) tableHeaders += `<th style="padding: 12px; text-align: center;">Catégorie</th>`;
            if (selectedColumns.event) tableHeaders += `<th style="padding: 12px; text-align: center;">Épreuve</th>`;
            if (selectedColumns.time) tableHeaders += `<th style="padding: 12px; text-align: center;">Temps</th>`;
        } else {
            if (selectedColumns.position) tableHeaders += `<th style="padding: 12px; text-align: center;">Pos.</th>`;
            if (selectedColumns.name) tableHeaders += `<th style="padding: 12px; text-align: left;">Participant</th>`;
            if (selectedColumns.bib) tableHeaders += `<th style="padding: 12px; text-align: center;">Dossard</th>`;
            if (selectedColumns.category) tableHeaders += `<th style="padding: 12px; text-align: center;">Catégorie</th>`;
            if (selectedColumns.series) tableHeaders += `<th style="padding: 12px; text-align: center;">Séries</th>`;
            if (selectedColumns.distance) tableHeaders += `<th style="padding: 12px; text-align: center;">Distance Totale</th>`;
            if (selectedColumns.time) tableHeaders += `<th style="padding: 12px; text-align: center;">Temps Total</th>`;
        }

        const htmlContent = `
            <!DOCTYPE html>
            <html lang="fr">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${pdfTitle} - Mode Chrono</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body {
                        font-family: 'Arial', sans-serif;
                        background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
                        padding: 25px;
                    }
                    .container {
                        background: white;
                        border-radius: 15px;
                        padding: 30px;
                        max-width: 1200px;
                        margin: 0 auto;
                        box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 30px;
                        padding: 25px;
                        background: white;
                        border: 2px solid #ddd;
                        border-radius: 12px;
                    }
                    .header h1 {
                        font-size: 32px;
                        margin-bottom: 10px;
                        color: #000000;
                        font-weight: bold;
                    }
                    .header .date {
                        font-size: 14px;
                        color: #666666;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 20px;
                    }
                    thead tr {
                        background: linear-gradient(135deg, #16a085, #1abc9c);
                        color: white;
                    }
                    th {
                        padding: 15px;
                        font-weight: bold;
                    }
                    td {
                        border-bottom: 1px solid #ddd;
                    }
                    @media print {
                        body { background: white; padding: 0; }
                        .container { box-shadow: none; }
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>⏱️ ${pdfTitle}</h1>
                        <div class="date">Généré le ${currentDate}</div>
                    </div>
                    <table>
                        <thead>
                            <tr>${tableHeaders}</tr>
                        </thead>
                        <tbody>
                            ${tableRows}
                        </tbody>
                    </table>
                </div>
            </body>
            </html>
        `;

        // Ouvrir dans une nouvelle fenêtre
        const newWindow = window.open('', '_blank');
        if (!newWindow) {
            alert('Veuillez autoriser les pop-ups pour exporter le PDF');
            return;
        }

        newWindow.document.write(htmlContent);
        newWindow.document.close();

        setTimeout(() => {
            newWindow.focus();
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
    };

    // Générer le classement général de toutes les séries
    function generateOverallChronoRanking() {
        const rankingSection = document.getElementById('overallChronoRanking');

        // Collecter tous les participants de toutes les séries terminées
        const allParticipants = [];

        // Parcourir toutes les épreuves et leurs séries
        raceData.events.forEach(event => {
            event.series.forEach(serie => {
                if (serie.status === 'completed') {
                    serie.participants.forEach(participant => {
                        // Vérifier si le participant existe déjà dans le classement général
                        const existingIndex = allParticipants.findIndex(
                            p => p.bib === participant.bib
                        );

                        if (existingIndex !== -1) {
                            // Ajouter les performances de cette série
                            allParticipants[existingIndex].series.push({
                                eventName: event.name,
                                serieName: serie.name,
                                distance: participant.totalDistance,
                                time: participant.finishTime || participant.totalTime,
                                laps: participant.laps.length,
                                bestLap: participant.bestLap
                            });
                            allParticipants[existingIndex].totalDistance += participant.totalDistance;
                            allParticipants[existingIndex].totalTime += (participant.finishTime || participant.totalTime);
                            allParticipants[existingIndex].totalLaps += participant.laps.length;
                        } else {
                            // Nouveau participant dans le classement général
                            allParticipants.push({
                                name: participant.name,
                                bib: participant.bib,
                                category: participant.category,
                                series: [{
                                    eventName: event.name,
                                    serieName: serie.name,
                                    distance: participant.totalDistance,
                                    time: participant.finishTime || participant.totalTime,
                                    laps: participant.laps.length,
                                    bestLap: participant.bestLap
                                }],
                                totalDistance: participant.totalDistance,
                                totalTime: participant.finishTime || participant.totalTime,
                                totalLaps: participant.laps.length
                            });
                        }
                    });
                }
            });
        });

        if (allParticipants.length === 0) {
            displayEmptyRanking('🏆 Classement Général', 'Aucune série terminée. Terminez au moins une série pour voir le classement général.');
            return;
        }

        // Trier par distance totale, puis par temps total
        const ranked = allParticipants.sort((a, b) => {
            if (a.totalDistance !== b.totalDistance) {
                return b.totalDistance - a.totalDistance;
            }
            return a.totalTime - b.totalTime;
        });

        // Utiliser la fonction d'affichage standard
        displayRanking(ranked, '🏆 Classement Général', 'global');
    }

    // ANCIENNE VERSION CONSERVÉE POUR RÉFÉRENCE - À SUPPRIMER SI TOUT FONCTIONNE
    function generateOverallChronoRanking_OLD() {
        const rankingSection = document.getElementById('overallChronoRanking');
        const medals = ['🥇', '🥈', '🥉'];
        const sportEmoji = {
            running: '🏃',
            cycling: '🚴',
            swimming: '🏊'
        };

        rankingSection.innerHTML = `
            <div style="background: white; padding: 20px; border-radius: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="margin: 0; color: #2c3e50;">🏆 Classement Général de la Journée</h3>
                    <button class="btn" onclick="hideChronoRanking()" style="background: #95a5a6;">
                        ⬅️ Retour aux séries
                    </button>
                </div>

                <div style="background: linear-gradient(135deg, #16a085, #1abc9c); color: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
                        <div>
                            <div style="font-size: 14px; opacity: 0.9;">Participants</div>
                            <div style="font-size: 28px; font-weight: bold;">${ranked.length}</div>
                        </div>
                        <div>
                            <div style="font-size: 14px; opacity: 0.9;">Séries Terminées</div>
                            <div style="font-size: 28px; font-weight: bold;">${raceData.events.reduce((count, event) => count + event.series.filter(s => s.status === 'completed').length, 0)}</div>
                        </div>
                        <div>
                            <div style="font-size: 14px; opacity: 0.9;">Distance Totale</div>
                            <div style="font-size: 28px; font-weight: bold;">
                                ${(ranked.reduce((sum, p) => sum + p.totalDistance, 0) / 1000).toFixed(2)} km
                            </div>
                        </div>
                    </div>
                </div>

                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; background: white;">
                        <thead>
                            <tr style="background: linear-gradient(135deg, #16a085, #1abc9c); color: white;">
                                <th style="padding: 15px; text-align: center;">Pos.</th>
                                <th style="padding: 15px; text-align: left;">Participant</th>
                                <th style="padding: 15px; text-align: center;">Séries</th>
                                <th style="padding: 15px; text-align: center;">Tours Total</th>
                                <th style="padding: 15px; text-align: center;">Distance Totale</th>
                                <th style="padding: 15px; text-align: center;">Temps Total</th>
                                <th style="padding: 15px; text-align: center;">Détails</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${ranked.map((participant, index) => {
                                const position = index + 1;
                                const medal = position <= 3 ? medals[position - 1] : position;
                                const rowBg = position <= 3 ? 'background: linear-gradient(135deg, #fff9e6, #ffe9b3);' :
                                              index % 2 === 0 ? 'background: #f8f9fa;' : '';

                                return `
                                    <tr style="${rowBg} border-bottom: 1px solid #ecf0f1;">
                                        <td style="padding: 15px; text-align: center; font-size: 28px; font-weight: bold;">
                                            ${medal}
                                        </td>
                                        <td style="padding: 15px;">
                                            <div style="font-weight: bold; font-size: 18px; color: #2c3e50;">${participant.name}</div>
                                            <div style="font-size: 13px; color: #7f8c8d; margin-top: 3px;">Dossard ${participant.bib} • ${participant.category}</div>
                                        </td>
                                        <td style="padding: 15px; text-align: center; font-weight: bold; font-size: 16px; color: #3498db;">
                                            ${participant.series.length}
                                        </td>
                                        <td style="padding: 15px; text-align: center; font-weight: bold; font-size: 18px;">
                                            ${participant.totalLaps}
                                        </td>
                                        <td style="padding: 15px; text-align: center; font-weight: bold; font-size: 18px; color: #27ae60;">
                                            ${(participant.totalDistance / 1000).toFixed(2)} km
                                        </td>
                                        <td style="padding: 15px; text-align: center; font-family: monospace; font-weight: bold; font-size: 16px;">
                                            ${formatTime(participant.totalTime)}
                                        </td>
                                        <td style="padding: 15px;">
                                            <details style="cursor: pointer;">
                                                <summary style="font-weight: bold; color: #16a085; user-select: none;">Voir détails</summary>
                                                <div style="margin-top: 10px; padding: 10px; background: #f8f9fa; border-radius: 5px;">
                                                    ${participant.series.map((serie, idx) => {
                                                        // Trouver l'épreuve correspondante pour obtenir le type de sport
                                                        let emoji = '🏃';
                                                        for (const event of raceData.events) {
                                                            if (event.name === serie.eventName) {
                                                                emoji = sportEmoji[event.sportType] || '🏃';
                                                                break;
                                                            }
                                                        }
                                                        return `
                                                            <div style="padding: 8px 0; border-bottom: 1px solid #e0e0e0;">
                                                                <div style="font-weight: bold; color: #2c3e50;">${emoji} ${serie.eventName} - ${serie.serieName}</div>
                                                                <div style="font-size: 12px; color: #7f8c8d; margin-top: 3px;">
                                                                    ${serie.laps} tours • ${(serie.distance / 1000).toFixed(2)} km • ${formatTime(serie.time)}
                                                                    ${serie.bestLap ? ` • Meilleur tour: ${formatTime(serie.bestLap)}` : ''}
                                                                </div>
                                                            </div>
                                                        `;
                                                    }).join('')}
                                                </div>
                                            </details>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>

                <div style="margin-top: 20px; text-align: center;">
                    <button class="btn btn-success" onclick="exportOverallChronoRanking()" style="margin-right: 10px;">
                        📊 Exporter JSON
                    </button>
                    <button class="btn" onclick="exportOverallChronoRankingToPDF()" style="background: linear-gradient(135deg, #e74c3c, #c0392b); color: white; margin-right: 10px;">
                        📄 Exporter PDF
                    </button>
                    <button class="btn" onclick="printOverallChronoRanking()" style="background: linear-gradient(135deg, #95a5a6, #7f8c8d); color: white;">
                        🖨️ Imprimer
                    </button>
                </div>
            </div>
        `;
    }

    // Exporter le classement général en JSON
    window.exportOverallChronoRanking = function() {
        const allParticipants = [];

        // Parcourir toutes les épreuves et leurs séries
        raceData.events.forEach(event => {
            event.series.forEach(serie => {
                if (serie.status === 'completed') {
                    serie.participants.forEach(participant => {
                        const existingIndex = allParticipants.findIndex(
                            p => p.bib === participant.bib
                        );

                        if (existingIndex !== -1) {
                            allParticipants[existingIndex].series.push({
                                eventName: event.name,
                                serieName: serie.name,
                                distance: participant.totalDistance,
                                time: participant.finishTime || participant.totalTime,
                                laps: participant.laps.length,
                                bestLap: participant.bestLap
                            });
                            allParticipants[existingIndex].totalDistance += participant.totalDistance;
                            allParticipants[existingIndex].totalTime += (participant.finishTime || participant.totalTime);
                            allParticipants[existingIndex].totalLaps += participant.laps.length;
                        } else {
                            allParticipants.push({
                                name: participant.name,
                                bib: participant.bib,
                                category: participant.category,
                                series: [{
                                    eventName: event.name,
                                    serieName: serie.name,
                                    distance: participant.totalDistance,
                                    time: participant.finishTime || participant.totalTime,
                                    laps: participant.laps.length,
                                    bestLap: participant.bestLap
                                }],
                                totalDistance: participant.totalDistance,
                                totalTime: participant.finishTime || participant.totalTime,
                                totalLaps: participant.laps.length
                            });
                        }
                    });
                }
            });
        });

        const ranked = allParticipants.sort((a, b) => {
            if (a.totalDistance !== b.totalDistance) {
                return b.totalDistance - a.totalDistance;
            }
            return a.totalTime - b.totalTime;
        });

        const exportData = {
            exportDate: new Date().toISOString(),
            totalParticipants: ranked.length,
            totalSeriesCompleted: raceData.events.reduce((count, event) => count + event.series.filter(s => s.status === 'completed').length, 0),
            ranking: ranked.map((p, index) => ({
                position: index + 1,
                name: p.name,
                bib: p.bib,
                category: p.category,
                totalDistance: p.totalDistance,
                totalTime: p.totalTime,
                totalLaps: p.totalLaps,
                seriesCount: p.series.length,
                series: p.series
            }))
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `classement-general-chrono-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);

        showNotification('Classement général exporté avec succès!', 'success');
    };

    // Imprimer le classement général
    window.printOverallChronoRanking = function() {
        window.print();
    };

    // ============================================
    // EXPORT / IMPORT COMPÉTITION CHRONO
    // ============================================

    // Exporter toute la compétition chrono en JSON
    window.exportChronoCompetition = function() {
        const exportData = {
            version: "1.0",
            exportDate: new Date().toISOString(),
            competitionName: `Competition_Chrono_${new Date().toISOString().slice(0,10)}`,
            raceData: {
                events: raceData.events,
                participants: raceData.participants,
                nextEventId: raceData.nextEventId,
                nextSerieId: raceData.nextSerieId,
                nextParticipantId: raceData.nextParticipantId
            },
            stats: {
                totalEvents: raceData.events.length,
                totalParticipants: raceData.participants.length,
                totalSeries: raceData.events.reduce((count, event) => count + event.series.length, 0),
                completedSeries: raceData.events.reduce((count, event) => count + event.series.filter(s => s.status === 'completed').length, 0)
            }
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `competition-chrono-${new Date().toISOString().slice(0,10)}.json`;
        link.click();
        URL.revokeObjectURL(url);

        showNotification('Compétition chrono exportée avec succès !', 'success');
    };

    // Importer une compétition chrono depuis JSON
    window.importChronoCompetition = function() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.onchange = function(e) {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(event) {
                try {
                    const importedData = JSON.parse(event.target.result);

                    // Vérifier la version
                    if (!importedData.version) {
                        throw new Error('Fichier non valide : version manquante');
                    }

                    // Demander confirmation
                    const stats = importedData.stats || {};
                    const confirmMsg = `Voulez-vous importer cette compétition ?\n\n` +
                                      `📅 Date d'export : ${new Date(importedData.exportDate).toLocaleDateString()}\n` +
                                      `🏅 Épreuves : ${stats.totalEvents || 0}\n` +
                                      `👥 Participants : ${stats.totalParticipants || 0}\n` +
                                      `📊 Séries : ${stats.totalSeries || 0} (dont ${stats.completedSeries || 0} terminées)\n\n` +
                                      `⚠️ Attention : Cela remplacera toutes les données actuelles du mode chrono !`;

                    if (!confirm(confirmMsg)) {
                        return;
                    }

                    // Importer les données
                    if (importedData.raceData) {
                        raceData.events = importedData.raceData.events || [];
                        raceData.participants = importedData.raceData.participants || [];
                        raceData.nextEventId = importedData.raceData.nextEventId || 1;
                        raceData.nextSerieId = importedData.raceData.nextSerieId || 1;
                        raceData.nextParticipantId = importedData.raceData.nextParticipantId || 1;
                    }

                    // Sauvegarder et rafraîchir l'affichage
                    saveChronoToLocalStorage();
                    displayEventsList();
                    displayParticipantsList();

                    showNotification('Compétition chrono importée avec succès !', 'success');
                } catch (error) {
                    console.error('Erreur import:', error);
                    showNotification('Erreur lors de l\'import : ' + error.message, 'error');
                }
            };
            reader.readAsText(file);
        };

        input.click();
    };

    // Exporter le classement général chrono en PDF
    window.exportOverallChronoRankingToPDF = function() {
        console.log("Début de l'export PDF du classement chrono");

        // Collecter tous les participants de toutes les séries terminées
        const allParticipants = [];

        raceData.events.forEach(event => {
            event.series.forEach(serie => {
                if (serie.status === 'completed') {
                    serie.participants.forEach(participant => {
                        const existingIndex = allParticipants.findIndex(
                            p => p.bib === participant.bib
                        );

                        if (existingIndex !== -1) {
                            allParticipants[existingIndex].series.push({
                                eventName: event.name,
                                serieName: serie.name,
                                distance: participant.totalDistance,
                                time: participant.finishTime || participant.totalTime,
                                laps: participant.laps.length,
                                bestLap: participant.bestLap
                            });
                            allParticipants[existingIndex].totalDistance += participant.totalDistance;
                            allParticipants[existingIndex].totalTime += (participant.finishTime || participant.totalTime);
                            allParticipants[existingIndex].totalLaps += participant.laps.length;
                        } else {
                            allParticipants.push({
                                name: participant.name,
                                bib: participant.bib,
                                category: participant.category,
                                series: [{
                                    eventName: event.name,
                                    serieName: serie.name,
                                    distance: participant.totalDistance,
                                    time: participant.finishTime || participant.totalTime,
                                    laps: participant.laps.length,
                                    bestLap: participant.bestLap
                                }],
                                totalDistance: participant.totalDistance,
                                totalTime: participant.finishTime || participant.totalTime,
                                totalLaps: participant.laps.length
                            });
                        }
                    });
                }
            });
        });

        if (allParticipants.length === 0) {
            showNotification('Aucune série terminée à exporter', 'warning');
            return;
        }

        // Trier par distance totale, puis par temps total
        const ranked = allParticipants.sort((a, b) => {
            if (a.totalDistance !== b.totalDistance) {
                return b.totalDistance - a.totalDistance;
            }
            return a.totalTime - b.totalTime;
        });

        const medals = ['🥇', '🥈', '🥉'];
        const totalSeriesCompleted = raceData.events.reduce((count, event) =>
            count + event.series.filter(s => s.status === 'completed').length, 0);

        // Créer la page HTML pour l'impression
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Classement Général Chrono - ${new Date().toLocaleDateString()}</title>
    <style>
        @media print {
            body { margin: 0; }
            @page { margin: 1cm; }
        }
        body {
            font-family: Arial, sans-serif;
            padding: 20px;
            background: white;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #16a085;
            padding-bottom: 20px;
        }
        h1 {
            color: #2c3e50;
            margin: 0;
            font-size: 32px;
        }
        .subtitle {
            color: #7f8c8d;
            font-size: 16px;
            margin-top: 10px;
        }
        .stats-box {
            display: flex;
            justify-content: space-around;
            margin: 20px 0;
            padding: 15px;
            background: linear-gradient(135deg, #16a085, #1abc9c);
            color: white;
            border-radius: 8px;
        }
        .stat-item {
            text-align: center;
        }
        .stat-label {
            font-size: 14px;
            opacity: 0.9;
        }
        .stat-value {
            font-size: 24px;
            font-weight: bold;
            margin-top: 5px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        th {
            background: linear-gradient(135deg, #16a085, #1abc9c);
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: bold;
        }
        th.center, td.center {
            text-align: center;
        }
        td {
            padding: 10px;
            border-bottom: 1px solid #ecf0f1;
        }
        tr:nth-child(even) {
            background: #f8f9fa;
        }
        .podium {
            background: linear-gradient(135deg, #fff9e6, #ffe9b3) !important;
            font-weight: bold;
        }
        .medal {
            font-size: 24px;
        }
        .participant-name {
            font-weight: bold;
            color: #2c3e50;
            font-size: 16px;
        }
        .participant-info {
            font-size: 12px;
            color: #7f8c8d;
            margin-top: 3px;
        }
        .footer {
            margin-top: 40px;
            text-align: center;
            color: #95a5a6;
            font-size: 12px;
            border-top: 1px solid #ecf0f1;
            padding-top: 20px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🏆 Classement Général de la Journée</h1>
        <div class="subtitle">Compétition Chrono - ${new Date().toLocaleDateString('fr-FR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })}</div>
    </div>

    <div class="stats-box">
        <div class="stat-item">
            <div class="stat-label">Participants</div>
            <div class="stat-value">${ranked.length}</div>
        </div>
        <div class="stat-item">
            <div class="stat-label">Séries Terminées</div>
            <div class="stat-value">${totalSeriesCompleted}</div>
        </div>
        <div class="stat-item">
            <div class="stat-label">Distance Totale</div>
            <div class="stat-value">${(ranked.reduce((sum, p) => sum + p.totalDistance, 0) / 1000).toFixed(2)} km</div>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th class="center">Position</th>
                <th>Participant</th>
                <th class="center">Séries</th>
                <th class="center">Tours Total</th>
                <th class="center">Distance Totale</th>
                <th class="center">Temps Total</th>
            </tr>
        </thead>
        <tbody>
            ${ranked.map((participant, index) => {
                const position = index + 1;
                const medal = position <= 3 ? medals[position - 1] : position;
                const rowClass = position <= 3 ? 'podium' : '';

                return `
                    <tr class="${rowClass}">
                        <td class="center medal">${medal}</td>
                        <td>
                            <div class="participant-name">${participant.name}</div>
                            <div class="participant-info">Dossard ${participant.bib} • ${participant.category}</div>
                        </td>
                        <td class="center" style="font-weight: bold; color: #3498db;">${participant.series.length}</td>
                        <td class="center" style="font-weight: bold;">${participant.totalLaps}</td>
                        <td class="center" style="font-weight: bold; color: #27ae60;">${(participant.totalDistance / 1000).toFixed(2)} km</td>
                        <td class="center" style="font-family: monospace; font-weight: bold;">${formatTime(participant.totalTime)}</td>
                    </tr>
                `;
            }).join('')}
        </tbody>
    </table>

    <div class="footer">
        Document généré le ${new Date().toLocaleString('fr-FR')} par le Gestionnaire de Championnats
    </div>

    <script>
        window.onload = function() {
            setTimeout(function() {
                window.print();
            }, 500);
        };
    </script>
</body>
</html>
        `);
        printWindow.document.close();

        showNotification('Page d\'export PDF ouverte dans un nouvel onglet !', 'success');
    };

    // Formater le temps en HH:MM:SS.ms
    function formatTime(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        const milliseconds = Math.floor((ms % 1000) / 10);

        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
    }

} catch (error) {

    console.error("❌ ERREUR DANS LE SCRIPT:", error);
    console.error("Stack trace:", error.stack);
}
