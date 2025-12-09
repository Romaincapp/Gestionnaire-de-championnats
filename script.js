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

    // Fonction pour formater un nom en "Nom Propre" (première lettre majuscule, reste minuscule)
    function formatProperName(name) {
        if (!name) return '';
        return name.trim()
            .toLowerCase()
            .split(/(\s+|-)/) // Sépare par espaces ou tirets, en gardant les séparateurs
            .map(part => {
                if (part.match(/^[\s-]+$/)) return part; // Garde les séparateurs tels quels
                return part.charAt(0).toUpperCase() + part.slice(1);
            })
            .join('');
    }
    window.formatProperName = formatProperName;

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

    window.championship = championship; // Rendre accessible globalement

    let importedChampionshipData = null;

    // Variable pour afficher/masquer les boutons forfait (évite les clics accidentels)
    let showForfaitButtons = false;
    window.showForfaitButtons = showForfaitButtons;

    function toggleForfaitButtons() {
        showForfaitButtons = !showForfaitButtons;
        window.showForfaitButtons = showForfaitButtons;

        // Mettre à jour tous les boutons toggle (pour toutes les journées)
        document.querySelectorAll('[id^="forfait-toggle-btn-"]').forEach(btn => {
            btn.style.background = showForfaitButtons ? '#e74c3c' : '#95a5a6';
            btn.innerHTML = showForfaitButtons ? '⚠️ Actions ON' : '⚠️ Actions OFF';
        });

        // Rafraîchir l'affichage des matchs
        const currentDay = championship.currentDay;
        updateMatchesDisplay(currentDay);
        if (championship.days[currentDay]?.pools?.enabled) {
            updatePoolsDisplay(currentDay);
        }
        if (championship.days[currentDay]?.pools?.manualFinalPhase) {
            updateManualFinalPhaseDisplay(currentDay);
        }

        showNotification(showForfaitButtons ? 'Actions dangereuses activées (forfaits + suppressions)' : 'Actions dangereuses masquées', showForfaitButtons ? 'warning' : 'info');
    }
    window.toggleForfaitButtons = toggleForfaitButtons;

    // FONCTION SHOWNOTIFICATION (DÉFINIE AVANT TOUT)
    function showNotification(message, type = 'info') {
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

    // SAUVEGARDE LOCAL STORAGE
    function saveToLocalStorage() {
        try {
            localStorage.setItem('tennisTableChampionship', JSON.stringify(championship));
        } catch (error) {
            console.warn("Erreur sauvegarde:", error);
        }
    }

    // SAUVEGARDE DONNÉES CHRONO
    function saveChronoToLocalStorage() {
        try {
            localStorage.setItem('chronoRaceData', JSON.stringify(raceData));
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
        const name = formatProperName(document.getElementById('playerName').value);
        const division = parseInt(document.getElementById('playerDivision').value);
        const targetDay = parseInt(document.getElementById('targetDay').value);

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
        const text = document.getElementById('bulkText').value.trim();
        const modal = document.getElementById('bulkModal');
        const dayNumber = parseInt(modal.dataset.dayNumber) || parseInt(document.getElementById('bulkTargetDay').value);
        const division = parseInt(modal.dataset.division) || parseInt(document.getElementById('bulkDivision').value);
        
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
                    // Utiliser JSON.stringify pour échapper correctement tous les caractères spéciaux
                    const escapedPlayer = JSON.stringify(player).slice(1, -1);
                    return `<div class="player-tag" onclick="showPlayerDetails(${dayNumber}, ${division}, '${escapedPlayer}')">
                        ${player}
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
        const newName = prompt(`Modifier le nom du joueur:\n\nNom actuel: ${oldPlayerName}`, oldPlayerName);

        if (!newName || newName.trim() === '') {
            return; // Annulé
        }

        const trimmedNewName = formatProperName(newName);

        // Si le nom n'a pas changé (comparaison insensible à la casse)
        if (trimmedNewName.toLowerCase() === oldPlayerName.toLowerCase()) {
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

            // Mettre à jour dans la phase finale (ancien système)
            const finalPhase = championship.days[dayNumber].pools.divisions[division].finalPhase || [];
            finalPhase.forEach(match => {
                if (match.player1 === oldPlayerName) match.player1 = trimmedNewName;
                if (match.player2 === oldPlayerName) match.player2 = trimmedNewName;
                if (match.winner === oldPlayerName) match.winner = trimmedNewName;
            });

            // Mettre à jour dans la phase finale MANUELLE (nouveau système)
            const manualFinalPhase = championship.days[dayNumber].pools?.manualFinalPhase?.divisions?.[division];
            if (manualFinalPhase) {
                // Mettre à jour dans les qualifiés
                if (manualFinalPhase.qualified) {
                    manualFinalPhase.qualified.forEach(player => {
                        if (player.name === oldPlayerName) player.name = trimmedNewName;
                    });
                }
                // Mettre à jour dans tous les tours
                if (manualFinalPhase.rounds) {
                    Object.values(manualFinalPhase.rounds).forEach(round => {
                        if (round.matches) {
                            round.matches.forEach(match => {
                                if (match.player1 === oldPlayerName) match.player1 = trimmedNewName;
                                if (match.player2 === oldPlayerName) match.player2 = trimmedNewName;
                                if (match.winner === oldPlayerName) match.winner = trimmedNewName;
                            });
                        }
                    });
                }
            }
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

        // Restaurer l'état collapsed si présent
        setTimeout(() => {
            restoreCollapseState();
        }, 100);

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
                <h2 style="cursor: pointer; user-select: none; display: flex; align-items: center; gap: 8px;" onclick="toggleDayHub(${dayNumber})">
                    <span id="day-hub-icon-${dayNumber}" class="collapse-icon" style="font-size: 14px; transition: transform 0.3s ease; display: inline-block;">▼</span>
                    <span>👥 Gestion des Joueurs - Journée ${dayNumber}</span>
                </h2>

                <div id="day-hub-content-${dayNumber}">
                <div style="text-align: center; margin-bottom: 20px;">
                    <p style="color: #7f8c8d; font-style: italic;">
                        Utilisez la <strong>Journée 1 (Hub Central)</strong> pour ajouter des joueurs à cette journée
                    </p>
                    <button class="btn" onclick="switchTab(1)" style="margin: 10px;">
                        ← Retour au Hub Central
                    </button>
                </div>

                <div class="control-buttons" style="gap: 8px; flex-wrap: wrap; margin-top: 15px;">
                    <button class="btn btn-success" onclick="updateRankingsForDay(${dayNumber})" style="padding: 8px 12px; font-size: 13px;">
                        🏆 Classements J${dayNumber}
                    </button>
                    <button class="btn" onclick="showMatchGenerationModal(${dayNumber})" style="padding: 8px 12px; font-size: 13px;">
                        🎯 Générer Matchs
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
                    <button id="forfait-toggle-btn-${dayNumber}" class="btn" onclick="toggleForfaitButtons()" style="padding: 8px 12px; font-size: 13px; background: #95a5a6;">
                        ⚠️ Actions OFF
                    </button>
                </div>
                </div><!-- Fin day-hub-content-${dayNumber} -->
            </div>

            <div class="divisions" id="divisions-${dayNumber}">
            </div>
            
            <div class="rankings-section" id="rankings-${dayNumber}" style="display: none;">
                <div class="rankings-header">
                    <div class="rankings-title">🏆 Classements Journée ${dayNumber}</div>
                    <div class="rankings-toggle" style="flex-wrap: wrap; gap: 5px;">
                        <button class="toggle-btn active" onclick="showRankingsForDay(${dayNumber}, 'points')">Par Points</button>
                        <button class="toggle-btn" onclick="showRankingsForDay(${dayNumber}, 'winrate')">Par % Victoires</button>
                        <button class="toggle-btn" onclick="openRankingInNewWindow(${dayNumber})" style="background: linear-gradient(135deg, #9b59b6, #8e44ad); color: white;">📺 Afficher</button>
                        <button class="toggle-btn" onclick="showCompleteDayRanking(${dayNumber})" style="background: linear-gradient(135deg, #27ae60, #2ecc71); color: white;">📊 Complet</button>
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

        // Retirer la classe active de tous les contenus de journées
        const allTabContents = document.querySelectorAll('.tab-content');
        allTabContents.forEach(content => {
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

        if (targetTab) targetTab.classList.add('active');
        if (targetContent) {
            targetContent.classList.add('active');
            targetContent.style.display = 'block'; // Force l'affichage
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
                            score1: 5,
                            score2: 0,
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
                            <div class="tour-header" data-day="${dayNumber}" data-division="${division}" data-tour="${tour}" style="cursor: pointer;">
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
                            <div class="match ${matchStatus}" data-match-id="d${dayNumber}-div${division}-m${globalIndex}" style="position: relative;">
                                ${window.showForfaitButtons ? `<button onclick="event.stopPropagation(); deleteMatch(${dayNumber}, ${division}, ${globalIndex})"
                                        title="Supprimer ce match"
                                        style="position: absolute; top: 50%; right: 5px; transform: translateY(-50%);
                                               width: 18px; height: 18px; z-index: 10;
                                               background: #e74c3c; color: white; border: none; border-radius: 50%;
                                               font-size: 11px; cursor: pointer; line-height: 1; padding: 0;
                                               opacity: 0.6; transition: opacity 0.2s;"
                                        onmouseover="this.style.opacity='1'"
                                        onmouseout="this.style.opacity='0.6'">×</button>` : ''}
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
                                        ${!match.completed && window.showForfaitButtons ? `
                                        <div style="display: flex; gap: 4px; justify-content: center; margin-top: 6px;">
                                            <button onclick="declareForfait('regular', ${dayNumber}, ${division}, ${globalIndex}, 'player1')"
                                                    style="padding: 2px 6px; font-size: 10px; background: #e74c3c; color: white;
                                                           border: none; border-radius: 3px; cursor: pointer;"
                                                    title="Forfait ${match.player1}">F1</button>
                                            <button onclick="declareForfait('regular', ${dayNumber}, ${division}, ${globalIndex}, 'player2')"
                                                    style="padding: 2px 6px; font-size: 10px; background: #e74c3c; color: white;
                                                           border: none; border-radius: 3px; cursor: pointer;"
                                                    title="Forfait ${match.player2}">F2</button>
                                        </div>
                                        ` : ''}
                                    </div>
                                </div>
                        `;

                        if (match.completed && match.winner) {
                            const forfaitText = match.forfaitBy ? ' (forfait)' : '';
                            html += `
                                <div class="match-result result-completed" ${match.forfaitBy ? 'style="background: #fff3cd; color: #856404;"' : ''}>
                                    ${match.forfaitBy ? '⚠️' : '🏆'} ${match.winner} remporte le match${forfaitText} (${score1}-${score2})
                                </div>
                            `;
                        } else if (match.completed && match.winner === null) {
                            html += `
                                <div class="match-result result-completed" style="background: #e3f2fd; color: #1565c0;">
                                    🤝 Match nul (${score1}-${score2})
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
        }

        // Ouvrir le premier tour de chaque division et installer les event listeners
        setTimeout(() => {
            // Ouvrir le premier tour de chaque division
            for (let div = 1; div <= numDivisions; div++) {
                const firstTour = document.getElementById(`tour${dayNumber}-${div}-1`);
                if (firstTour) {
                    firstTour.classList.add('active');
                }
            }

            // Installer un event listener global avec délégation d'événements
            const divisionsContainer = document.getElementById(`divisions-${dayNumber}`);
            if (divisionsContainer && !divisionsContainer.hasAttribute('data-tour-listener')) {
                divisionsContainer.addEventListener('click', function(e) {
                    const tourHeader = e.target.closest('.tour-header');
                    if (tourHeader) {
                        const day = parseInt(tourHeader.getAttribute('data-day'));
                        const division = parseInt(tourHeader.getAttribute('data-division'));
                        const tour = parseInt(tourHeader.getAttribute('data-tour'));
                        if (day && division && tour) {
                            toggleTour(day, division, tour);
                        }
                    }
                });
                divisionsContainer.setAttribute('data-tour-listener', 'true');
            }
        }, 100);
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

        // Persister l'état collapsed dans l'objet match
        const matchId = matchElement.getAttribute('data-match-id');
        const divisionAttr = matchElement.getAttribute('data-division');

        if (matchId) {
            const dayNumber = championship.currentDay;
            const dayData = championship.days[dayNumber];
            const numDivisions = championship.config.numDivisions || 3;

            // Chercher dans les pools
            if (dayData.pools && dayData.pools.enabled) {
                for (let division = 1; division <= numDivisions; division++) {
                    const match = dayData.pools.divisions[division].matches.find(m => m.id == matchId);
                    if (match) {
                        match.isCollapsed = matchElement.classList.contains('collapsed');
                        saveToLocalStorage();
                        return;
                    }
                }
            }

            // Chercher dans la phase finale manuelle
            if (dayData.pools && dayData.pools.manualFinalPhase && dayData.pools.manualFinalPhase.divisions) {
                for (let division = 1; division <= numDivisions; division++) {
                    const rounds = dayData.pools.manualFinalPhase.divisions[division]?.rounds;
                    if (rounds) {
                        for (const roundName in rounds) {
                            const match = rounds[roundName].matches.find(m => m.id === matchId);
                            if (match) {
                                match.isCollapsed = matchElement.classList.contains('collapsed');
                                saveToLocalStorage();
                                return;
                            }
                        }
                    }
                }
            }

            // Chercher dans les matchs normaux (pour les manual-match)
            if (divisionAttr) {
                const division = parseInt(divisionAttr);
                const matches = dayData.matches[division];
                if (matches) {
                    const matchIndex = parseInt(matchId);
                    if (matches[matchIndex]) {
                        matches[matchIndex].isCollapsed = matchElement.classList.contains('collapsed');
                        saveToLocalStorage();
                    }
                }
            }
        }
    }
    window.toggleMatchCollapse = toggleMatchCollapse;

    function updateSetScore(dayNumber, division, matchIndex, setIndex, scoreField, value) {
        championship.days[dayNumber].matches[division][matchIndex].sets[setIndex][scoreField] = value;
        saveToLocalStorage();
    }
    window.updateSetScore = updateSetScore;

    function updateMatchScore(dayNumber, division, matchIndex, scoreField, value) {
        const match = championship.days[dayNumber].matches[division][matchIndex];
        match[scoreField] = value;
        // Annuler le forfait si les scores sont modifiés manuellement
        if (match.forfaitBy) {
            delete match.forfaitBy;
        }
        saveToLocalStorage();
    }
    window.updateMatchScore = updateMatchScore;

    function deleteMatch(dayNumber, division, matchIndex) {
        const match = championship.days[dayNumber].matches[division][matchIndex];
        if (!match) return;

        const confirmMsg = `Supprimer ce match ?\n\n${match.player1} vs ${match.player2}`;
        if (!confirm(confirmMsg)) return;

        // Supprimer le match du tableau
        championship.days[dayNumber].matches[division].splice(matchIndex, 1);

        saveToLocalStorage();
        updateMatchesDisplay(dayNumber);
        showNotification(`Match supprimé`, 'warning');
    }
    window.deleteMatch = deleteMatch;

    function deletePoolMatch(dayNumber, matchId, division) {
        const dayData = championship.days[dayNumber];
        if (!dayData || !dayData.pools || !dayData.pools.divisions || !dayData.pools.divisions[division]) return;

        const poolDiv = dayData.pools.divisions[division];
        if (!poolDiv.matches) return;

        const matchIndex = poolDiv.matches.findIndex(m => m.id === matchId);
        if (matchIndex === -1) return;

        const match = poolDiv.matches[matchIndex];
        const confirmMsg = `Supprimer ce match de poule ?\n\n${match.player1} vs ${match.player2}`;
        if (!confirm(confirmMsg)) return;

        // Supprimer le match
        poolDiv.matches.splice(matchIndex, 1);

        saveToLocalStorage();
        updatePoolsDisplay(dayNumber);
        showNotification(`Match de poule supprimé`, 'warning');
    }
    window.deletePoolMatch = deletePoolMatch;

    // ======================================
    // AJOUT MANUEL DE MATCHS DANS LES POOLS
    // ======================================

    function showAddPoolMatchModal(dayNumber, division, poolIndex) {
        const dayData = championship.days[dayNumber];
        if (!dayData || !dayData.pools || !dayData.pools.divisions || !dayData.pools.divisions[division]) {
            showNotification('Erreur: données de pool non trouvées', 'error');
            return;
        }

        const pools = dayData.pools.divisions[division].pools;
        if (!pools || !pools[poolIndex]) {
            showNotification('Erreur: pool non trouvée', 'error');
            return;
        }

        const allPoolPlayers = pools[poolIndex];
        const realPlayers = allPoolPlayers.filter(p => !p.startsWith('BYE'));
        const poolName = `Poule ${String.fromCharCode(65 + poolIndex)}`;

        // Options: joueurs réels + option BYE toujours disponible à la fin
        let playerOptions = realPlayers.map(p => `<option value="${p}">${p}</option>`).join('');
        playerOptions += `<option value="BYE">--- BYE (repos) ---</option>`;

        const modalHTML = `
            <div id="add-pool-match-modal" style="
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.5); display: flex; align-items: center;
                justify-content: center; z-index: 10000;
            " onclick="if(event.target === this) this.remove()">
                <div style="
                    background: white; border-radius: 12px; padding: 25px;
                    max-width: 400px; width: 90%; box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                " onclick="event.stopPropagation()">
                    <h3 style="margin: 0 0 20px 0; color: #2c3e50; text-align: center;">
                        Ajouter un match - ${poolName}
                    </h3>
                    <p style="color: #7f8c8d; font-size: 14px; text-align: center; margin-bottom: 20px;">
                        Division ${division} - Journée ${dayNumber}
                    </p>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #34495e;">
                            Joueur 1
                        </label>
                        <select id="add-match-player1" style="
                            width: 100%; padding: 10px; border: 2px solid #ecf0f1;
                            border-radius: 8px; font-size: 14px;
                        ">
                            ${playerOptions}
                        </select>
                    </div>

                    <div style="text-align: center; margin: 10px 0; font-weight: bold; color: #3498db;">
                        VS
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #34495e;">
                            Joueur 2
                        </label>
                        <select id="add-match-player2" style="
                            width: 100%; padding: 10px; border: 2px solid #ecf0f1;
                            border-radius: 8px; font-size: 14px;
                        ">
                            ${playerOptions}
                        </select>
                    </div>

                    <div style="display: flex; gap: 10px; justify-content: center;">
                        <button onclick="document.getElementById('add-pool-match-modal').remove()" style="
                            padding: 10px 25px; background: #95a5a6; color: white;
                            border: none; border-radius: 8px; cursor: pointer; font-weight: 600;
                        ">Annuler</button>
                        <button onclick="addManualPoolMatch(${dayNumber}, ${division}, ${poolIndex})" style="
                            padding: 10px 25px; background: #27ae60; color: white;
                            border: none; border-radius: 8px; cursor: pointer; font-weight: 600;
                        ">Ajouter</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Sélectionner le 2ème joueur par défaut pour éviter le même joueur
        const select2 = document.getElementById('add-match-player2');
        if (select2 && poolPlayers.length > 1) {
            select2.selectedIndex = 1;
        }
    }
    window.showAddPoolMatchModal = showAddPoolMatchModal;

    function addManualPoolMatch(dayNumber, division, poolIndex) {
        const player1 = document.getElementById('add-match-player1').value;
        const player2 = document.getElementById('add-match-player2').value;

        if (player1 === player2) {
            showNotification('Veuillez sélectionner deux joueurs différents', 'error');
            return;
        }

        const dayData = championship.days[dayNumber];
        const poolDiv = dayData.pools.divisions[division];

        // Créer le nouveau match (scores vides, à remplir manuellement)
        const newMatch = {
            id: 'manual-' + Date.now(),
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
            isByeMatch: false,
            isManualMatch: true
        };

        // Ajouter le match
        poolDiv.matches.push(newMatch);

        // Fermer le modal
        const modal = document.getElementById('add-pool-match-modal');
        if (modal) modal.remove();

        // Sauvegarder et rafraîchir
        saveToLocalStorage();
        updatePoolsDisplay(dayNumber);
        showNotification(`Match ajouté: ${player1} vs ${player2}`, 'success');
    }
    window.addManualPoolMatch = addManualPoolMatch;

    function deleteManualMatch(dayNumber, division, roundName, position) {
        const dayData = championship.days[dayNumber];
        if (!dayData || !dayData.pools || !dayData.pools.manualFinalPhase) return;

        const manualPhase = dayData.pools.manualFinalPhase;
        if (!manualPhase.matches || !manualPhase.matches[division]) return;

        const matches = manualPhase.matches[division];
        const matchIndex = matches.findIndex(m => m.round === roundName && m.position === position);
        if (matchIndex === -1) return;

        const match = matches[matchIndex];
        const confirmMsg = `Supprimer ce match de phase finale ?\n\n${match.player1 || '?'} vs ${match.player2 || '?'}`;
        if (!confirm(confirmMsg)) return;

        // Supprimer le match
        matches.splice(matchIndex, 1);

        saveToLocalStorage();
        updateManualFinalPhaseDisplay(dayNumber);
        showNotification(`Match de phase finale supprimé`, 'warning');
    }
    window.deleteManualMatch = deleteManualMatch;

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

    // Déclarer un forfait pour un match (régulier, poule ou phase finale)
    function declareForfait(matchType, dayNumber, division, matchId, forfaitPlayer) {
        let match = null;

        if (matchType === 'regular') {
            // Match régulier
            match = championship.days[dayNumber].matches[division][matchId];
        } else if (matchType === 'pool') {
            // Match de poule - rechercher par ID
            const poolData = championship.days[dayNumber].pools?.divisions[division];
            if (poolData && poolData.matches) {
                match = poolData.matches.find(m => m.id === matchId);
            }
        } else if (matchType === 'final') {
            // Match de phase finale manuelle - rechercher dans tous les tours
            const manualFinalPhase = championship.days[dayNumber].pools?.manualFinalPhase?.divisions[division];
            if (manualFinalPhase && manualFinalPhase.rounds) {
                Object.values(manualFinalPhase.rounds).forEach(round => {
                    if (round.matches) {
                        const foundMatch = round.matches.find(m => m.id === matchId);
                        if (foundMatch) match = foundMatch;
                    }
                });
            }
        }

        if (!match) {
            showNotification('Match non trouvé', 'error');
            return;
        }

        // Appliquer le forfait
        match.forfaitBy = forfaitPlayer; // 'player1' ou 'player2'
        match.completed = true;

        if (forfaitPlayer === 'player1') {
            match.score1 = '0';
            match.score2 = '3';
            match.winner = match.player2;
        } else {
            match.score1 = '3';
            match.score2 = '0';
            match.winner = match.player1;
        }

        saveToLocalStorage();

        // Rafraîchir l'affichage selon le type de match
        if (matchType === 'regular') {
            updateMatchesDisplay(dayNumber);
        } else if (matchType === 'pool') {
            updatePoolsDisplay(dayNumber);
        } else if (matchType === 'final') {
            updateManualFinalPhaseDisplay(dayNumber);
        }

        showNotification(`Forfait déclaré pour ${forfaitPlayer === 'player1' ? match.player1 : match.player2}`, 'warning');
    }
    window.declareForfait = declareForfait;

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

        const numDivisions = championship.config?.numberOfDivisions || 3;
        data.forEach((row, index) => {
            if (row.length >= 2) {
                const name = formatProperName(String(row[0]));
                const division = parseInt(row[1]);

                if (name && division >= 1 && division <= numDivisions) {
                    if (!championship.days[dayNumber]) {
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

        const numDivisions = championship.config?.numberOfDivisions || 3;
        const prevPlayers = championship.days[previousDay].players;
        let totalPlayers = 0;
        let divisionDetails = '';

        for (let division = 1; division <= numDivisions; division++) {
            const divPlayerCount = prevPlayers[division]?.length || 0;
            totalPlayers += divPlayerCount;
            divisionDetails += `Division ${division}: ${divPlayerCount} joueurs\n`;
        }

        if (totalPlayers === 0) {
            alert(`Aucun joueur à copier depuis la Journée ${previousDay}`);
            return;
        }

        const confirmMsg = `Copier les joueurs de la Journée ${previousDay} vers la Journée ${dayNumber} ?\n\n` +
                          divisionDetails + `\nTotal: ${totalPlayers} joueurs`;

        if (confirm(confirmMsg)) {
            for (let division = 1; division <= numDivisions; division++) {
                championship.days[dayNumber].players[division] = [...(prevPlayers[division] || [])];
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

        const numDivisions = championship.config?.numberOfDivisions || 3;
        for (let division = 1; division <= numDivisions; division++) {
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
                    <h3>${medal} Division ${i} <span id="player-count-${dayNumber}-${i}" style="font-size: 14px; color: #7f8c8d; font-weight: normal;">(${playersCount} joueur${playersCount !== 1 ? 's' : ''})</span></h3>
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

    // Fonction pour mettre à jour dynamiquement le compteur de joueurs
    function updatePlayerCount(dayNumber, division) {
        const playerCountElement = document.getElementById(`player-count-${dayNumber}-${division}`);
        if (!playerCountElement) return;

        const playersCount = championship.days[dayNumber]?.players[division]?.length || 0;
        playerCountElement.textContent = `(${playersCount} joueur${playersCount !== 1 ? 's' : ''})`;
    }
    window.updatePlayerCount = updatePlayerCount;

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
        
        document.querySelectorAll(`#rankings-${dayNumber} .toggle-btn`).forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
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
            if (dayData.players[division].length === 0) continue;

           const playerStats = dayData.players[division]
    .filter(player => player.toUpperCase() !== 'BYE')
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
    const escapedPlayerName = JSON.stringify(player.name).slice(1, -1);

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
    const escapedPlayerName = JSON.stringify(player.name).slice(1, -1);

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

                dayData.players[division]
                    .filter(playerName => playerName.toUpperCase() !== 'BYE')
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

                dayData.players[division]
                    .filter(playerName => playerName.toUpperCase() !== 'BYE')
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

            if (dayData.players[division].includes(playerName)) {
                if (firstAppearance === null || dayNum < firstAppearance) {
                    firstAppearance = dayNum;
                }
                if (lastAppearance === null || dayNum > lastAppearance) {
                    lastAppearance = dayNum;
                }
            }
        });

        const allDays = Object.keys(championship.days).map(d => parseInt(d)).sort((a, b) => a - b);

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
        
        let historyHtml = '<h4 style="color: #2c3e50; margin-bottom: 15px;">📈 Performance par journée</h4>';
        playerHistory.forEach(dayStats => {
            if (dayStats.isForfeit) {
                // Affichage spécial pour les journées forfaitées
                historyHtml += `
                    <div class="history-match" style="background: #fee; border-left: 4px solid #e74c3c; opacity: 0.7;">
                        <div>
                            <div class="history-opponent">Journée ${dayStats.day} ⚠️ FORFAIT</div>
                            <div style="font-size: 12px; color: #c0392b;">
                                Équipe absente - 4 forfaits automatiques (-20 buts)
                            </div>
                        </div>
                        <div class="history-score">
                            <div style="font-weight: bold; color: #e74c3c;">${dayStats.totalPoints} pts</div>
                            <div style="font-size: 12px;">0V/0D/4F</div>
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
                                ${dayStats.wins}V/${dayStats.draws || 0}N/${dayStats.losses}D/${dayStats.forfeits || 0}F - ${dayStats.matchesPlayed} matchs
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

        poolPlayers.forEach(player => {
            if (player.toUpperCase() === 'BYE') return;

            // Calculer les stats de ce joueur dans cette poule uniquement
            const playerPoolMatches = poolMatches.filter(m =>
                m.poolIndex === poolIndex &&
                (m.player1 === player || m.player2 === player)
            );

            let wins = 0, losses = 0, pointsWon = 0, pointsLost = 0;

            playerPoolMatches.forEach(match => {
                if (match.completed) {
                    const isPlayer1 = match.player1 === player;
                    const score1 = parseInt(match.score1) || 0;
                    const score2 = parseInt(match.score2) || 0;

                    if (match.winner === player) {
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
                losses,
                points: wins * 3 + losses * 1,
                pointsWon,
                pointsLost,
                goalAverage: pointsWon - pointsLost,
                matchesPlayed: wins + losses
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
                    <span style="color: #7f8c8d;">${player.points}pts (${player.wins}V-${player.losses}D)</span>
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
            const escapedPlayerName = JSON.stringify(player.name).slice(1, -1);
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
        const dayData = championship.days[dayNumber];
        if (!dayData) return;

        const numDivisions = championship.config?.numberOfDivisions || 3;
        let addedCount = 0;

        for (let division = 1; division <= numDivisions; division++) {
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
        // Charger les données sauvegardées
        if (loadFromLocalStorage()) {
            initializeDivisionSelects();
            updateTabsDisplay();
            updateDaySelectors();
            initializeAllDaysContent();
            restoreCollapseState();
            switchTab(championship.currentDay);
        } else {
            initializeDivisionSelects();
            initializeDivisionsDisplay(1);
            updatePlayersDisplay(1);
            initializePoolsForDay(1);
            restoreCollapseState();
        }

        setupEventListeners();
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

    // Chercher le conteneur control-buttons pour insérer le mode pool après
    const controlButtons = section.querySelector('.control-buttons');
    if (!controlButtons) return;

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

                <!-- Toggle Mode Simple/Avancé -->
                <div style="display: flex; gap: 15px; justify-content: center; margin-bottom: 15px; flex-wrap: wrap;">
                    <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 12px;">
                        <input type="radio" name="pool-config-mode-${dayNumber}" value="simple" checked
                               onchange="togglePoolConfigMode(${dayNumber}, 'simple')"
                               style="width: 16px; height: 16px; cursor: pointer; accent-color: #3498db;">
                        <span style="font-weight: 600; color: #2c3e50;">📊 Mode Simple</span>
                    </label>
                    <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 12px;">
                        <input type="radio" name="pool-config-mode-${dayNumber}" value="advanced"
                               onchange="togglePoolConfigMode(${dayNumber}, 'advanced')"
                               style="width: 16px; height: 16px; cursor: pointer; accent-color: #e67e22;">
                        <span style="font-weight: 600; color: #2c3e50;">🎯 Mode Avancé</span>
                    </label>
                </div>

                <!-- Mode Simple -->
                <div id="simple-config-${dayNumber}" style="display: flex; gap: 10px; justify-content: center; align-items: center; flex-wrap: wrap; margin-bottom: 12px;">
                    <label style="display: flex; align-items: center; gap: 6px; font-size: 12px;">
                        <span style="font-weight: 600; color: #2c3e50;">Taille:</span>
                        <select id="pool-size-${dayNumber}" onchange="updateSimpleConfigInfo(${dayNumber})" style="padding: 6px 8px; border: 2px solid #3498db; border-radius: 5px; font-size: 12px;">
                            <option value="4">4 joueurs/poule</option>
                            <option value="5">5 joueurs/poule</option>
                            <option value="6">6 joueurs/poule</option>
                        </select>
                    </label>

                    <label style="display: flex; align-items: center; gap: 6px; font-size: 12px;">
                        <span style="font-weight: 600; color: #2c3e50;">Qualifiés:</span>
                        <select id="qualified-per-pool-${dayNumber}" onchange="updateSimpleConfigInfo(${dayNumber})" style="padding: 6px 8px; border: 2px solid #3498db; border-radius: 5px; font-size: 12px;">
                            <option value="2">2 premiers</option>
                            <option value="3">3 premiers</option>
                        </select>
                    </label>

                    <label style="display: flex; align-items: center; gap: 6px; font-size: 12px;">
                        <span style="font-weight: 600; color: #2c3e50;">⚡ Matchs/joueur:</span>
                        <select id="matches-per-player-${dayNumber}" onchange="updateSimpleConfigInfo(${dayNumber})" style="padding: 6px 8px; border: 2px solid #16a085; border-radius: 5px; font-size: 12px;">
                            <option value="">Tous contre tous</option>
                            <option value="3" selected>3 matchs</option>
                            <option value="4">4 matchs</option>
                            <option value="5">5 matchs</option>
                        </select>
                    </label>
                </div>

                <!-- Mode Avancé -->
                <div id="advanced-config-${dayNumber}" style="display: none; gap: 10px; justify-content: center; align-items: center; flex-wrap: wrap; margin-bottom: 12px;">
                    <label style="display: flex; align-items: center; gap: 6px; font-size: 12px;">
                        <span style="font-weight: 600; color: #2c3e50;">Nombre de poules:</span>
                        <input type="number" id="num-pools-${dayNumber}" min="2" max="10" value="4"
                               onchange="updateAdvancedConfigInfo(${dayNumber})"
                               style="width: 60px; padding: 6px 8px; border: 2px solid #e67e22; border-radius: 5px; font-size: 12px;">
                    </label>

                    <label style="display: flex; align-items: center; gap: 6px; font-size: 12px;">
                        <span style="font-weight: 600; color: #2c3e50;">Total qualifiés:</span>
                        <input type="number" id="total-qualified-${dayNumber}" min="4" max="32" value="8"
                               onchange="updateAdvancedConfigInfo(${dayNumber})"
                               style="width: 60px; padding: 6px 8px; border: 2px solid #e67e22; border-radius: 5px; font-size: 12px;">
                    </label>

                    <label style="display: flex; align-items: center; gap: 6px; font-size: 12px;">
                        <span style="font-weight: 600; color: #2c3e50;">⚡ Matchs/joueur:</span>
                        <select id="matches-per-player-adv-${dayNumber}" onchange="updateAdvancedConfigInfo(${dayNumber})" style="padding: 6px 8px; border: 2px solid #16a085; border-radius: 5px; font-size: 12px;">
                            <option value="">Tous contre tous</option>
                            <option value="3" selected>3 matchs</option>
                            <option value="4">4 matchs</option>
                            <option value="5">5 matchs</option>
                        </select>
                    </label>
                </div>

                <!-- Message informatif dynamique -->
                <div id="config-info-${dayNumber}" style="
                    background: rgba(52, 152, 219, 0.1);
                    padding: 8px 10px;
                    border-radius: 5px;
                    margin-bottom: 12px;
                    font-size: 11px;
                    color: #2c3e50;
                    text-align: center;
                    border-left: 3px solid #3498db;
                    display: none;
                "></div>

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

                    <button class="btn" onclick="generateDirectFinalPhase(${dayNumber})" style="
                        background: linear-gradient(135deg, #9b59b6, #8e44ad);
                        color: white;
                        padding: 8px 15px;
                        font-size: 12px;
                    " id="direct-final-btn-${dayNumber}">
                        ⚡ Élimination Directe
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

    controlButtons.insertAdjacentHTML('afterend', poolToggleHTML);
}

// ======================================
// FONCTIONS DE GESTION DES POULES
// ======================================

// Toggle entre Mode Simple et Mode Avancé pour la configuration des poules
function togglePoolConfigMode(dayNumber, mode) {
    const simpleConfig = document.getElementById(`simple-config-${dayNumber}`);
    const advancedConfig = document.getElementById(`advanced-config-${dayNumber}`);
    const configInfo = document.getElementById(`config-info-${dayNumber}`);

    // Sauvegarder le mode choisi
    const dayData = championship.days[dayNumber];
    if (!dayData.pools.config) {
        dayData.pools.config = {};
    }
    dayData.pools.config.mode = mode;
    saveToLocalStorage();

    if (mode === 'simple') {
        simpleConfig.style.display = 'flex';
        advancedConfig.style.display = 'none';
        updateSimpleConfigInfo(dayNumber);
    } else {
        simpleConfig.style.display = 'none';
        advancedConfig.style.display = 'flex';
        updateAdvancedConfigInfo(dayNumber);
    }
}

// Met à jour le message informatif pour le Mode Simple
function updateSimpleConfigInfo(dayNumber) {
    const configInfo = document.getElementById(`config-info-${dayNumber}`);
    const poolSize = parseInt(document.getElementById(`pool-size-${dayNumber}`).value);
    const qualifiedPerPool = parseInt(document.getElementById(`qualified-per-pool-${dayNumber}`).value);
    const matchesPerPlayerInput = document.getElementById(`matches-per-player-${dayNumber}`);
    const matchesPerPlayer = matchesPerPlayerInput?.value ? parseInt(matchesPerPlayerInput.value) : null;

    const dayData = championship.days[dayNumber];
    const numDivisions = championship.config?.numberOfDivisions || 3;

    // Sauvegarder la configuration
    if (!dayData.pools.config) {
        dayData.pools.config = {};
    }
    dayData.pools.config.mode = 'simple';
    dayData.pools.config.poolSize = poolSize;
    dayData.pools.config.qualifiedPerPool = qualifiedPerPool;
    dayData.pools.config.matchesPerPlayer = matchesPerPlayer;
    saveToLocalStorage();

    let infoHTML = '<strong>ℹ️ Configuration Simple :</strong><br>';

    for (let division = 1; division <= numDivisions; division++) {
        const players = dayData.players[division] || [];
        if (players.length === 0) continue;

        const numPools = Math.ceil(players.length / poolSize);
        const totalQualified = numPools * qualifiedPerPool;

        // Calculer le nombre de matchs par poule
        let matchesPerPoolText = '';
        if (!matchesPerPlayer || matchesPerPlayer >= poolSize - 1) {
            // Round-robin complet
            const matchesPerPool = (poolSize * (poolSize - 1)) / 2;
            matchesPerPoolText = `~${matchesPerPool} matchs/poule (tous contre tous)`;
        } else {
            // Limité
            const matchesPerPool = (poolSize * matchesPerPlayer) / 2;
            matchesPerPoolText = `${matchesPerPool} matchs/poule (${matchesPerPlayer} par joueur)`;
        }

        infoHTML += `Division ${division}: ${players.length} joueurs → ${numPools} poule(s) → ${totalQualified} qualifié(s) → ${matchesPerPoolText}<br>`;
    }

    configInfo.innerHTML = infoHTML;
    configInfo.style.display = 'block';
    configInfo.style.borderLeftColor = '#3498db';
    configInfo.style.background = 'rgba(52, 152, 219, 0.1)';
}

// Met à jour le message informatif pour le Mode Avancé avec validation
function updateAdvancedConfigInfo(dayNumber) {
    const configInfo = document.getElementById(`config-info-${dayNumber}`);
    const numPoolsEl = document.getElementById(`num-pools-${dayNumber}`);
    const totalQualifiedEl = document.getElementById(`total-qualified-${dayNumber}`);
    const matchesPerPlayerInput = document.getElementById(`matches-per-player-adv-${dayNumber}`);

    if (!numPoolsEl || !totalQualifiedEl) return;

    const numPools = parseInt(numPoolsEl.value);
    const totalQualified = parseInt(totalQualifiedEl.value);
    const matchesPerPlayer = matchesPerPlayerInput?.value ? parseInt(matchesPerPlayerInput.value) : null;

    const dayData = championship.days[dayNumber];
    const numDivisions = championship.config?.numberOfDivisions || 3;

    // Sauvegarder la configuration avancée
    if (!dayData.pools.config) {
        dayData.pools.config = {};
    }
    dayData.pools.config.mode = 'advanced';
    dayData.pools.config.numPools = numPools;
    dayData.pools.config.totalQualified = totalQualified;
    dayData.pools.config.matchesPerPlayer = matchesPerPlayer;
    saveToLocalStorage();

    let infoHTML = '';
    let hasWarning = false;

    for (let division = 1; division <= numDivisions; division++) {
        const players = dayData.players[division] || [];
        if (players.length === 0) continue;

        const result = calculateQualificationDistribution(numPools, totalQualified, players.length);
        const poolSize = Math.ceil(players.length / numPools);

        infoHTML += `<div style="background: white; padding: 10px; border-radius: 8px; margin-bottom: 10px; border: 2px solid #3498db;">`;
        infoHTML += `<div style="font-weight: bold; color: #2c3e50; margin-bottom: 8px; font-size: 13px;">📋 Division ${division} — ${players.length} joueurs</div>`;

        // Structure des poules
        infoHTML += `<div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px;">`;
        infoHTML += `<span style="background: #3498db; color: white; padding: 3px 8px; border-radius: 12px; font-size: 11px;">${result.poolSizeInfo}</span>`;

        // Matchs par poule
        if (!matchesPerPlayer || matchesPerPlayer >= poolSize - 1) {
            const matchesPerPool = Math.round((poolSize * (poolSize - 1)) / 2);
            infoHTML += `<span style="background: #9b59b6; color: white; padding: 3px 8px; border-radius: 12px; font-size: 11px;">~${matchesPerPool} matchs/poule</span>`;
        } else {
            const matchesPerPool = Math.round((poolSize * matchesPerPlayer) / 2);
            infoHTML += `<span style="background: #16a085; color: white; padding: 3px 8px; border-radius: 12px; font-size: 11px;">${matchesPerPlayer} matchs/joueur</span>`;
        }
        infoHTML += `</div>`;

        // Logique de qualification - APERÇU DÉTAILLÉ
        infoHTML += `<div style="background: linear-gradient(135deg, #27ae60, #2ecc71); color: white; padding: 10px; border-radius: 8px; margin-top: 8px;">`;
        infoHTML += `<div style="font-weight: bold; margin-bottom: 6px; font-size: 12px;">🏆 Logique de Qualification → ${totalQualified} qualifiés</div>`;

        // Affichage visuel de la logique
        infoHTML += `<div style="background: rgba(255,255,255,0.2); padding: 8px; border-radius: 6px; font-size: 11px;">`;

        if (result.topPerPool === 0) {
            infoHTML += `<div style="margin-bottom: 4px;">🥇 Les <strong>${totalQualified} meilleurs 1ers</strong> toutes poules confondues</div>`;
        } else if (result.bestRunnerUps === 0) {
            // Cas parfait
            if (result.topPerPool === 1) {
                infoHTML += `<div>🥇 <strong>1er de chaque poule</strong> (${numPools} qualifiés directs)</div>`;
            } else if (result.topPerPool === 2) {
                infoHTML += `<div>🥇 <strong>1er</strong> + 🥈 <strong>2ème de chaque poule</strong> (${numPools * 2} qualifiés directs)</div>`;
            } else {
                infoHTML += `<div>🏅 <strong>Top ${result.topPerPool} de chaque poule</strong> (${numPools * result.topPerPool} qualifiés directs)</div>`;
            }
        } else {
            // Cas hybride - le plus intéressant !
            const directQualified = result.topPerPool * numPools;
            const positionOrdinal = result.runnerUpPosition === 2 ? '2èmes' : result.runnerUpPosition === 3 ? '3èmes' : result.runnerUpPosition === 4 ? '4èmes' : `${result.runnerUpPosition}èmes`;

            infoHTML += `<div style="margin-bottom: 6px;">`;
            if (result.topPerPool === 1) {
                infoHTML += `🥇 <strong>1er de chaque poule</strong> → ${directQualified} qualifiés directs`;
            } else if (result.topPerPool === 2) {
                infoHTML += `🥇🥈 <strong>1er + 2ème de chaque poule</strong> → ${directQualified} qualifiés directs`;
            } else {
                infoHTML += `🏅 <strong>Top ${result.topPerPool} de chaque poule</strong> → ${directQualified} qualifiés directs`;
            }
            infoHTML += `</div>`;

            infoHTML += `<div style="background: rgba(0,0,0,0.1); padding: 4px 8px; border-radius: 4px;">`;
            infoHTML += `➕ Les <strong>${result.bestRunnerUps} meilleurs ${positionOrdinal}</strong> toutes poules confondues`;
            infoHTML += `</div>`;
        }
        infoHTML += `</div>`;

        // Phase finale
        const finalPhaseType = getFinalPhaseType(totalQualified);
        infoHTML += `<div style="margin-top: 6px; font-size: 10px; opacity: 0.9;">`;
        infoHTML += `📊 Phase finale : <strong>${finalPhaseType}</strong>`;
        infoHTML += `</div>`;

        infoHTML += `</div>`; // Fin bloc qualification

        // Avertissements
        if (result.warnings && result.warnings.length > 0) {
            hasWarning = true;
            infoHTML += `<div style="margin-top: 8px;">`;
            result.warnings.forEach(warning => {
                infoHTML += `<div style="background: #fff3cd; color: #856404; padding: 4px 8px; border-radius: 4px; font-size: 10px; margin-bottom: 2px;">⚠️ ${warning}</div>`;
            });
            infoHTML += `</div>`;
        }

        infoHTML += `</div>`; // Fin division
    }

    configInfo.innerHTML = infoHTML;
    configInfo.style.display = 'block';
    configInfo.style.padding = '0';
    configInfo.style.background = 'transparent';
    configInfo.style.borderLeft = 'none';
}

// Retourne le type de phase finale selon le nombre de qualifiés
function getFinalPhaseType(numQualified) {
    if (numQualified <= 2) return 'Finale directe';
    if (numQualified <= 4) return 'Demi-finales → Finale';
    if (numQualified <= 8) return 'Quarts → Demi → Finale';
    if (numQualified <= 16) return 'Huitièmes → Quarts → Demi → Finale';
    if (numQualified <= 32) return 'Seizièmes → ... → Finale';
    return 'Tableau à élimination directe';
}

// Calcule la distribution de qualification pour le Mode Avancé
function calculateQualificationDistribution(numPools, totalQualified, totalPlayers) {
    const result = {
        topPerPool: 0,
        bestRunnerUps: 0,
        runnerUpPosition: 3, // 3ème, 4ème, etc.
        poolSizeInfo: '',
        qualificationInfo: '',
        warnings: [],
        isValid: true
    };

    // Validation de base
    if (totalQualified < numPools) {
        result.warnings.push(`Moins d'1 qualifié par poule en moyenne (${totalQualified}/${numPools})`);
        result.isValid = false;
    }

    if (totalQualified > totalPlayers) {
        result.warnings.push(`Plus de qualifiés que de joueurs disponibles !`);
        result.isValid = false;
        totalQualified = totalPlayers;
    }

    // Calcul de la taille des poules
    const poolSize = Math.ceil(totalPlayers / numPools);
    const evenDivision = totalPlayers % numPools === 0;

    if (evenDivision) {
        result.poolSizeInfo = `${numPools} poules de ${poolSize} joueurs`;
    } else {
        const fullPools = totalPlayers % numPools;
        const smallPools = numPools - fullPools;
        result.poolSizeInfo = `${fullPools} poule(s) de ${poolSize} + ${smallPools} poule(s) de ${poolSize - 1} joueurs`;
        result.warnings.push('Poules de tailles inégales');
    }

    // Calcul de la répartition de qualification (Hybride)
    result.topPerPool = Math.floor(totalQualified / numPools);
    result.bestRunnerUps = totalQualified % numPools;

    if (result.topPerPool === 0) {
        // Cas extrême: moins de qualifiés que de poules
        result.topPerPool = 0;
        result.bestRunnerUps = totalQualified;
        result.runnerUpPosition = 1;
        result.qualificationInfo = `Les ${totalQualified} meilleurs 1ers`;
    } else if (result.bestRunnerUps === 0) {
        // Cas parfait: division exacte
        result.qualificationInfo = `${result.topPerPool} premier(s) de chaque poule`;
    } else {
        // Cas hybride: top N + meilleurs runners-up
        result.runnerUpPosition = result.topPerPool + 1;
        const positionName = result.runnerUpPosition === 3 ? '3èmes' : result.runnerUpPosition === 4 ? '4èmes' : `${result.runnerUpPosition}èmes`;
        result.qualificationInfo = `${result.topPerPool} premier(s) par poule + ${result.bestRunnerUps} meilleur(s) ${positionName}`;
    }

    // Vérification puissance de 2 pour tableau final
    const isPowerOf2 = (n) => n && (n & (n - 1)) === 0;
    if (!isPowerOf2(totalQualified) && totalQualified >= 4) {
        const suggested = [4, 8, 16, 32, 64].find(n => n >= totalQualified) || 64;
        result.warnings.push(`${totalQualified} qualifiés nécessitera des BYEs. Recommandé: ${suggested}`);
    }

    return result;
}

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

// Toggle le hub de configuration d'une journée
function toggleDayHub(dayNumber) {
    const hubContent = document.getElementById(`day-hub-content-${dayNumber}`);
    const collapseIcon = document.getElementById(`day-hub-icon-${dayNumber}`);

    if (!hubContent || !collapseIcon) return;

    const isCollapsed = hubContent.style.display === 'none';

    if (isCollapsed) {
        hubContent.style.display = 'block';
        collapseIcon.textContent = '▼';
        collapseIcon.style.transform = 'rotate(0deg)';
    } else {
        hubContent.style.display = 'none';
        collapseIcon.textContent = '▶';
        collapseIcon.style.transform = 'rotate(0deg)';
    }

    saveCollapseState(dayNumber, !isCollapsed);
}

// Toggle le hub du classement général
function toggleGeneralHub() {
    const hubContent = document.getElementById('general-hub-content');
    const collapseIcon = document.getElementById('general-hub-icon');

    if (!hubContent || !collapseIcon) return;

    const isCollapsed = hubContent.style.display === 'none';

    if (isCollapsed) {
        hubContent.style.display = 'block';
        collapseIcon.textContent = '▼';
        collapseIcon.style.transform = 'rotate(0deg)';
    } else {
        hubContent.style.display = 'none';
        collapseIcon.textContent = '▶';
        collapseIcon.style.transform = 'rotate(0deg)';
    }

    saveCollapseState('general', !isCollapsed);
}

// Sauvegarde l'état collapse dans localStorage
function saveCollapseState(key, isCollapsed) {
    try {
        let collapseState = JSON.parse(localStorage.getItem('collapseState') || '{}');
        collapseState[key] = isCollapsed;
        localStorage.setItem('collapseState', JSON.stringify(collapseState));
    } catch (e) {
        console.error('Erreur sauvegarde collapse state:', e);
    }
}

// Restaure l'état collapse depuis localStorage
function restoreCollapseState() {
    try {
        const collapseState = JSON.parse(localStorage.getItem('collapseState') || '{}');

        // Restaurer l'état pour chaque journée existante
        Object.keys(championship.days || {}).forEach(dayNumber => {
            const hubContent = document.getElementById(`day-hub-content-${dayNumber}`);
            const collapseIcon = document.getElementById(`day-hub-icon-${dayNumber}`);

            if (hubContent && collapseIcon && collapseState[dayNumber]) {
                hubContent.style.display = 'none';
                collapseIcon.textContent = '▶';
                collapseIcon.style.transform = 'rotate(0deg)';
            }
        });

        // Restaurer l'état du classement général
        if (collapseState['general']) {
            const hubContent = document.getElementById('general-hub-content');
            const collapseIcon = document.getElementById('general-hub-icon');

            if (hubContent && collapseIcon) {
                hubContent.style.display = 'none';
                collapseIcon.textContent = '▶';
                collapseIcon.style.transform = 'rotate(0deg)';
            }
        }
    } catch (e) {
        console.error('Erreur restauration collapse state:', e);
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
    if (!dayData.pools || !dayData.pools.enabled) return;

    // Détecter le mode de configuration actif
    const modeRadios = document.querySelectorAll(`input[name="pool-config-mode-${dayNumber}"]`);
    let configMode = 'simple';
    modeRadios.forEach(radio => {
        if (radio.checked) configMode = radio.value;
    });

    const numDivisions = championship.config.numDivisions || 3;
    let totalMatches = 0;
    let poolSize;
    let numPools;
    let totalQualified;

    // Lire les paramètres selon le mode
    if (configMode === 'simple') {
        poolSize = parseInt(document.getElementById(`pool-size-${dayNumber}`).value);
    } else {
        numPools = parseInt(document.getElementById(`num-pools-${dayNumber}`).value);
        totalQualified = parseInt(document.getElementById(`total-qualified-${dayNumber}`).value);
    }

    // Lire le paramètre matchesPerPlayer (global pour tous les modes)
    const matchesPerPlayerInput = configMode === 'simple'
        ? document.getElementById(`matches-per-player-${dayNumber}`)
        : document.getElementById(`matches-per-player-adv-${dayNumber}`);
    const matchesPerPlayer = matchesPerPlayerInput?.value ? parseInt(matchesPerPlayerInput.value) : null;

    console.log(`🎯 Configuration pools J${dayNumber}:`, { mode: configMode, matchesPerPlayer });

    // Sauvegarder la configuration du mode
    if (!dayData.pools.config) {
        dayData.pools.config = {};
    }
    dayData.pools.config.mode = configMode;
    dayData.pools.config.matchesPerPlayer = matchesPerPlayer; // Sauvegarde globale

    for (let division = 1; division <= numDivisions; division++) {
        const players = [...dayData.players[division]];
        if (players.length < 4) {
            if (players.length > 0) {
                alert(`Division ${division}: Il faut au moins 4 joueurs pour créer des poules (${players.length} actuellement)`);
            }
            continue;
        }

        // En mode avancé, calculer la taille des poules
        if (configMode === 'advanced') {
            poolSize = Math.ceil(players.length / numPools);

            // Sauvegarder les paramètres avancés pour cette division
            const distResult = calculateQualificationDistribution(numPools, totalQualified, players.length);
            if (!dayData.pools.config.divisions) {
                dayData.pools.config.divisions = {};
            }
            dayData.pools.config.divisions[division] = {
                numPools: numPools,
                totalQualified: totalQualified,
                topPerPool: distResult.topPerPool,
                bestRunnerUps: distResult.bestRunnerUps,
                runnerUpPosition: distResult.runnerUpPosition
            };
        } else {
            // Mode simple : sauvegarder les paramètres simples
            const qualifiedPerPool = parseInt(document.getElementById(`qualified-per-pool-${dayNumber}`).value);
            if (!dayData.pools.config.divisions) {
                dayData.pools.config.divisions = {};
            }
            dayData.pools.config.divisions[division] = {
                poolSize: poolSize,
                qualifiedPerPool: qualifiedPerPool
            };
        }

        // Calculer le nombre optimal et avertir si nécessaire (Mode Simple uniquement)
        if (configMode === 'simple') {
            const optimalCounts = calculateOptimalPlayerCounts(poolSize);
            const isOptimal = optimalCounts.includes(players.length);

            if (!isOptimal) {
                const nearest = optimalCounts.reduce((prev, curr) =>
                    Math.abs(curr - players.length) < Math.abs(prev - players.length) ? curr : prev
                );
                const notPerfectlyBalanced = players.length % poolSize !== 0;

                if (notPerfectlyBalanced) {
                    // Calculer la répartition réelle sans BYE
                    const numPools = Math.ceil(players.length / poolSize);
                    const baseSize = Math.floor(players.length / numPools);
                    const extraPools = players.length % numPools;
                    const poolDistribution = extraPools > 0
                        ? `${extraPools} poule(s) de ${baseSize + 1} + ${numPools - extraPools} poule(s) de ${baseSize}`
                        : `${numPools} poule(s) de ${baseSize}`;

                    const confirmed = confirm(
                        `ℹ️ Division ${division}: ${players.length} joueur(s)\n\n` +
                        `📊 Nombre optimal pour des poules égales de ${poolSize}: ${optimalCounts.join(', ')}\n` +
                        `💡 Le plus proche: ${nearest} joueurs\n\n` +
                        `🎯 Répartition prévue: ${poolDistribution}\n` +
                        `(Poules de tailles légèrement différentes - pratique sportive standard)\n\n` +
                        `Voulez-vous continuer ?`
                    );

                    if (!confirmed) {
                        continue;
                    }
                }
            }
        }

        // Mélanger les joueurs pour équilibrer les poules
        const shuffledPlayers = shuffleArray([...players]);
        // En mode avancé, passer le nombre de poules exact choisi par l'utilisateur
        const targetPools = (configMode === 'advanced') ? numPools : null;
        const pools = createBalancedPoolsWithBye(shuffledPlayers, poolSize, targetPools);

        // Valider le nombre de matchs par joueur pour CHAQUE poule
        if (matchesPerPlayer) {
            let hasWarning = false;
            pools.forEach((pool, idx) => {
                const realSize = pool.filter(p => !p.startsWith('BYE')).length;
                const validation = validateMatchesPerPlayer(realSize, matchesPerPlayer);
                if (!validation.valid) {
                    alert(`❌ Division ${division}, Poule ${String.fromCharCode(65 + idx)}: ${validation.message}`);
                }
                if (validation.warning && !hasWarning) {
                    hasWarning = true;
                    console.log(`⚠️ Division ${division}: ${validation.warning}`);
                }
            });
        }

        // Sauvegarder les poules
        dayData.pools.divisions[division].pools = pools;

        // Générer les matchs de poules avec le paramètre matchesPerPlayer
        const poolMatches = generatePoolMatches(pools, division, dayNumber, matchesPerPlayer);
        dayData.pools.divisions[division].matches = poolMatches;
        totalMatches += poolMatches.length;
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

// Créer des poules équilibrées SANS ajouter de BYE
// Les poules peuvent avoir des tailles légèrement différentes (ex: 8 et 7 joueurs)
// C'est la pratique standard dans les tournois sportifs
// @param players - liste des joueurs
// @param maxPoolSize - taille max d'une poule (utilisé pour calculer le nombre de poules si targetNumPools non spécifié)
// @param targetNumPools - (optionnel) nombre exact de poules souhaité (mode avancé)
function createBalancedPoolsWithBye(players, maxPoolSize, targetNumPools = null) {
    const totalPlayers = players.length;

    // Utiliser le nombre de poules spécifié ou le calculer depuis maxPoolSize
    const numPools = targetNumPools || Math.ceil(totalPlayers / maxPoolSize);

    // Répartir équitablement les joueurs sans BYE
    // Ex: 38 joueurs, 5 poules → 3 poules de 8 + 2 poules de 7
    const baseSize = Math.floor(totalPlayers / numPools);
    const extraPlayers = totalPlayers % numPools;

    const pools = [];
    let playerIndex = 0;

    for (let i = 0; i < numPools; i++) {
        // Les premières poules ont 1 joueur de plus si nécessaire
        const poolSize = baseSize + (i < extraPlayers ? 1 : 0);
        const pool = players.slice(playerIndex, playerIndex + poolSize);
        pools.push(pool);
        playerIndex += poolSize;
    }

    return pools;
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

// ======================================
// VALIDATION DU NOMBRE DE MATCHS PAR JOUEUR
// ======================================

function validateMatchesPerPlayer(poolSize, matchesPerPlayer) {
    if (!matchesPerPlayer) return { valid: true }; // Round-robin complet (par défaut)

    const maxPossible = poolSize - 1;

    // Vérifier que le nombre demandé n'excède pas le maximum possible
    if (matchesPerPlayer > maxPossible) {
        return {
            valid: false,
            message: `Impossible: ${matchesPerPlayer} matchs demandés mais seulement ${maxPossible} adversaires disponibles dans une poule de ${poolSize} joueurs!`
        };
    }

    // Vérifier si la distribution parfaite est possible
    const totalEdges = poolSize * matchesPerPlayer;
    if (totalEdges % 2 !== 0) {
        // Ce n'est plus bloquant - l'algorithme gère ce cas
        // Mais on retourne un warning pour informer l'utilisateur
        return {
            valid: true,
            warning: `Note: ${poolSize} joueurs × ${matchesPerPlayer} matchs = distribution imparfaite. Certains joueurs auront ${matchesPerPlayer - 1} ou ${matchesPerPlayer} matchs.`
        };
    }

    return { valid: true };
}

// ======================================
// GÉNÉRATION DES MATCHS DE POULES
// ======================================

function generateRoundRobinMatches(pool, poolIndex, division, dayNumber, startMatchId = 0) {
    const matches = [];
    let matchId = startMatchId;

    // Génération round-robin complet: tous contre tous
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
                    matches.push({
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
                    matches.push({
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
                matches.push({
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

    return matches;
}

function generateLimitedMatches(pool, poolIndex, division, dayNumber, matchesPerPlayer, startMatchId = 0) {
    const matches = [];
    let matchId = startMatchId;
    const n = pool.length;

    // Filtrer les BYE pour le calcul
    const realPlayers = pool.filter(p => !p.startsWith('BYE'));
    const realN = realPlayers.length;

    // Vérifier si la distribution exacte est possible
    const totalConnections = realN * matchesPerPlayer;
    const isExactPossible = totalConnections % 2 === 0;

    // Calculer le nombre de matchs cible
    // Si impossible (impair), certains joueurs auront 1 match de plus ou moins
    const targetMatches = isExactPossible
        ? totalConnections / 2
        : Math.floor(totalConnections / 2);

    console.log(`📊 Poule ${String.fromCharCode(65 + poolIndex)}: ${realN} joueurs, ${matchesPerPlayer} matchs demandés`);
    console.log(`   Distribution exacte possible: ${isExactPossible ? 'OUI' : 'NON (certains auront ±1 match)'}`);

    // Tableau de suivi: combien de matchs chaque joueur a
    const matchCounts = Array(n).fill(0);
    // Set pour éviter les matchs en double
    const matchedPairs = new Set();

    // NOUVEL ALGORITHME: Priorisation par nombre de matchs restants
    // Générer toutes les paires possibles et les trier par priorité

    function generatePriorityPairs() {
        const pairs = [];
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const player1 = pool[i];
                const player2 = pool[j];
                const isBye1 = player1.startsWith('BYE');
                const isBye2 = player2.startsWith('BYE');

                // Ignorer les paires BYE vs BYE
                if (isBye1 && isBye2) continue;

                const pairKey = `${i}-${j}`;
                if (!matchedPairs.has(pairKey)) {
                    // Priorité = somme des matchs manquants (plus élevé = plus prioritaire)
                    const remaining1 = Math.max(0, matchesPerPlayer - matchCounts[i]);
                    const remaining2 = Math.max(0, matchesPerPlayer - matchCounts[j]);
                    pairs.push({
                        i, j,
                        priority: remaining1 + remaining2,
                        minRemaining: Math.min(remaining1, remaining2)
                    });
                }
            }
        }
        // Trier: d'abord par minRemaining décroissant (joueurs qui ont le plus besoin)
        // puis par priorité totale décroissante
        pairs.sort((a, b) => {
            if (b.minRemaining !== a.minRemaining) return b.minRemaining - a.minRemaining;
            return b.priority - a.priority;
        });
        return pairs;
    }

    // Générer les matchs jusqu'à atteindre le quota ou épuiser les possibilités
    let iterations = 0;
    const maxIterations = n * n; // Sécurité

    while (iterations < maxIterations) {
        // Vérifier si on a assez de matchs
        if (matches.length >= targetMatches) break;

        // Vérifier si tous les joueurs ont atteint leur quota
        const allReached = matchCounts.every((c, idx) => {
            const player = pool[idx];
            if (player.startsWith('BYE')) return true;
            return c >= matchesPerPlayer;
        });
        if (allReached) break;

        // Obtenir les paires prioritaires
        const priorityPairs = generatePriorityPairs();
        if (priorityPairs.length === 0) break;

        // Prendre la paire la plus prioritaire où les deux joueurs ont besoin de matchs
        const bestPair = priorityPairs.find(p => p.minRemaining > 0);
        if (!bestPair) break;

        const { i, j } = bestPair;
        const player1 = pool[i];
        const player2 = pool[j];
        const pairKey = `${i}-${j}`;

        matchedPairs.add(pairKey);

        const isBye1 = player1.startsWith('BYE');
        const isBye2 = player2.startsWith('BYE');

        if (isBye1 || isBye2) {
            // Gestion des BYE - ne compte pas comme match joué
            if (!isBye1 && isBye2) {
                matches.push({
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
                matches.push({
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
        } else {
            // Match normal
            matches.push({
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
            matchCounts[i]++;
            matchCounts[j]++;
        }

        iterations++;
    }

    // Log de la distribution finale
    const distribution = {};
    pool.forEach((player, idx) => {
        if (!player.startsWith('BYE')) {
            distribution[player] = matchCounts[idx];
        }
    });
    console.log(`✅ Poule ${String.fromCharCode(65 + poolIndex)}: ${matches.length} matchs générés`);
    console.log(`   Distribution finale:`, distribution);

    // Vérifier si la distribution est équilibrée
    const counts = Object.values(distribution);
    const minCount = Math.min(...counts);
    const maxCount = Math.max(...counts);
    if (maxCount - minCount > 1) {
        console.warn(`⚠️ Distribution inégale dans Poule ${String.fromCharCode(65 + poolIndex)}: min=${minCount}, max=${maxCount}`);
    }

    return matches;
}

function generatePoolMatches(pools, division, dayNumber, matchesPerPlayer = null) {
    const allMatches = [];
    let matchId = 0;

    console.log(`🎯 Génération matchs pour Division ${division}:`, matchesPerPlayer ? `${matchesPerPlayer} matchs/joueur` : 'Round-robin complet');

    pools.forEach((pool, poolIndex) => {
        let poolMatches;

        if (!matchesPerPlayer || matchesPerPlayer >= pool.length - 1) {
            // Round-robin complet: tous contre tous
            poolMatches = generateRoundRobinMatches(pool, poolIndex, division, dayNumber, matchId);
        } else {
            // Nombre de matchs limité par joueur
            poolMatches = generateLimitedMatches(pool, poolIndex, division, dayNumber, matchesPerPlayer, matchId);
        }

        matchId += poolMatches.length;
        allMatches.push(...poolMatches);
    });

    console.log(`✅ Total: ${allMatches.length} matchs générés pour Division ${division}`);
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

        // Vérifier si toutes les poules sont terminées pour calculer les qualifiés
        const allPoolsCompleted = pools.every((pool, poolIndex) => {
            const poolMatches = matches.filter(m => m.poolIndex === poolIndex);
            return poolMatches.every(m => m.completed);
        });

        let qualifiedPlayers = null;
        let qualificationInfo = null;

        if (allPoolsCompleted) {
            // Calculer qui est qualifié en utilisant la même logique que generateManualFinalPhase
            const configMode = dayData.pools.config?.mode || 'simple';

            if (configMode === 'simple') {
                const qualifiedPerPoolElement = document.getElementById(`qualified-per-pool-${dayNumber}`);
                if (qualifiedPerPoolElement) {
                    const qualifiedPerPool = parseInt(qualifiedPerPoolElement.value);
                    qualifiedPlayers = getQualifiedPlayersFromPools(pools, matches, qualifiedPerPool);
                    qualificationInfo = {
                        mode: 'simple',
                        text: `${qualifiedPerPool} premier(s) de chaque poule`
                    };
                }
            } else {
                const advancedConfig = dayData.pools.config.divisions[division];
                if (advancedConfig) {
                    qualifiedPlayers = getQualifiedPlayersFromPools(pools, matches, null, advancedConfig);
                    const positionName = advancedConfig.runnerUpPosition === 3 ? '3èmes' : advancedConfig.runnerUpPosition === 4 ? '4èmes' : `${advancedConfig.runnerUpPosition}èmes`;
                    qualificationInfo = {
                        mode: 'advanced',
                        text: advancedConfig.bestRunnerUps > 0
                            ? `${advancedConfig.topPerPool} premier(s) par poule + ${advancedConfig.bestRunnerUps} meilleur(s) ${positionName}`
                            : `${advancedConfig.topPerPool} premier(s) de chaque poule`
                    };
                }
            }
        }

        let html = '<div class="pools-container">';

        // Afficher l'info de qualification si disponible
        if (qualificationInfo) {
            html += `
                <div style="
                    background: linear-gradient(135deg, #f39c12, #e67e22);
                    color: white;
                    padding: 12px 15px;
                    border-radius: 8px;
                    margin-bottom: 15px;
                    text-align: center;
                    font-size: 13px;
                    font-weight: 600;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                ">
                    🏆 Qualification: ${qualificationInfo.text}
                </div>
            `;
        }

        pools.forEach((pool, poolIndex) => {
            const poolName = `Poule ${String.fromCharCode(65 + poolIndex)}`;
            const poolMatches = matches.filter(m => m.poolIndex === poolIndex);
            const completedMatches = poolMatches.filter(m => m.completed).length;
            const isCompleted = completedMatches === poolMatches.length;
            const poolContentId = `pool-content-${dayNumber}-${division}-${poolIndex}`;
            const poolArrowId = `pool-arrow-${dayNumber}-${division}-${poolIndex}`;

            html += `
                <div class="pool-section" style="
                    background: white;
                    border: 2px solid ${isCompleted ? '#27ae60' : '#3498db'};
                    border-radius: 12px;
                    padding: 20px;
                    margin-bottom: 20px;
                ">
                    <div class="pool-header" onclick="togglePoolCollapse('${poolContentId}', '${poolArrowId}')" style="
                        background: linear-gradient(135deg, ${isCompleted ? '#27ae60, #2ecc71' : '#3498db, #2980b9'});
                        color: white;
                        padding: 15px;
                        border-radius: 8px;
                        margin-bottom: 15px;
                        text-align: center;
                        cursor: pointer;
                        position: relative;
                        transition: all 0.3s;
                    " onmouseover="this.style.opacity='0.9'"
                       onmouseout="this.style.opacity='1'">
                        <span id="${poolArrowId}" style="
                            position: absolute;
                            left: 15px;
                            top: 50%;
                            transform: translateY(-50%) rotate(0deg);
                            font-size: 20px;
                            transition: transform 0.3s;
                        ">▼</span>
                        <button onclick="event.stopPropagation(); showAddPoolMatchModal(${dayNumber}, ${division}, ${poolIndex})"
                                title="Ajouter un match"
                                style="position: absolute; right: 15px; top: 50%; transform: translateY(-50%);
                                       width: 28px; height: 28px; background: rgba(255,255,255,0.9);
                                       color: #3498db; border: none; border-radius: 50%;
                                       font-size: 20px; font-weight: bold; cursor: pointer;
                                       display: flex; align-items: center; justify-content: center;"
                                onmouseover="this.style.background='white'; this.style.transform='translateY(-50%) scale(1.1)'"
                                onmouseout="this.style.background='rgba(255,255,255,0.9)'; this.style.transform='translateY(-50%)'">+</button>
                        <h4 style="margin: 0; font-size: 1.2rem;">${poolName}${isCompleted ? ' ✓' : ''}</h4>
                        <div style="font-size: 14px; margin-top: 5px;">
                            ${completedMatches}/${poolMatches.length} matchs terminés
                        </div>
                    </div>

                    <div id="${poolContentId}" class="pool-content" style="display: block;">
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
                            `<span class="pool-player-tag" onclick="showPlayerPoolSummary(${dayNumber}, ${division}, '${player}')" style="
                                background: linear-gradient(135deg, #27ae60, #2ecc71);
                                color: white;
                                padding: 8px 15px;
                                border-radius: 20px;
                                font-weight: 500;
                                font-size: 14px;
                                cursor: pointer;
                                transition: transform 0.2s, box-shadow 0.2s;
                            " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.2)'"
                               onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'"
                               title="Cliquez pour voir les statistiques">${player}</span>`
                        ).join('')}
                    </div>

                    <div class="pool-matches">
                        ${poolMatches.map(match => generatePoolMatchHTML(match, dayNumber)).join('')}
                    </div>

                        ${completedMatches === poolMatches.length ?
                            `<div class="pool-ranking" style="margin-top: 15px;">
                                ${generatePoolRankingHTML(pool, poolMatches, poolIndex, qualifiedPlayers, dayNumber, division)}
                            </div>` : ''}
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
    }
}

// Toggle l'affichage du contenu d'une poule (collapse/expand)
function togglePoolCollapse(poolContentId, poolArrowId) {
    const content = document.getElementById(poolContentId);
    const arrow = document.getElementById(poolArrowId);

    if (!content || !arrow) return;

    if (content.style.display === 'none') {
        // Ouvrir la poule
        content.style.display = 'block';
        arrow.style.transform = 'translateY(-50%) rotate(0deg)';
    } else {
        // Fermer la poule
        content.style.display = 'none';
        arrow.style.transform = 'translateY(-50%) rotate(-90deg)';
    }
}

function generatePoolMatchHTML(match, dayNumber) {
    // Gérer les matchs BYE différemment
    if (match.isByeMatch) {
        const realPlayer = match.winner;
        const byePlayer = match.player1 === realPlayer ? match.player2 : match.player1;

        return `
            <div class="pool-match bye-match" data-match-id="${match.id}" data-division="${match.division}" style="
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
                        🎯 <span onclick="showPlayerPoolSummary(${dayNumber}, ${match.division}, '${realPlayer}')"
                                style="cursor: pointer; text-decoration: underline dotted;"
                                title="Cliquez pour voir les statistiques"
                                onmouseover="this.style.color='#3498db'"
                                onmouseout="this.style.color='#856404'">${realPlayer}</span> VS ${byePlayer}
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
                    <strong style="color: #856404;">✅ <span onclick="showPlayerPoolSummary(${dayNumber}, ${match.division}, '${realPlayer}')"
                                                            style="cursor: pointer; text-decoration: underline dotted;"
                                                            title="Cliquez pour voir les statistiques"
                                                            onmouseover="this.style.color='#3498db'"
                                                            onmouseout="this.style.color='#856404'">${realPlayer}</span> qualifié(e) automatiquement</strong>
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
        <div class="pool-match ${matchStatus} ${match.isCollapsed ? 'collapsed' : ''}" data-match-id="${match.id}" data-division="${match.division}" style="
            background: ${match.completed ? '#d5f4e6' : '#fff'};
            border: 2px solid ${match.completed ? '#27ae60' : '#ecf0f1'};
            border-radius: 8px;
            padding: 10px;
            margin-bottom: 6px;
            position: relative;
        ">
            ${window.showForfaitButtons ? `<button onclick="event.stopPropagation(); deletePoolMatch(${dayNumber}, '${match.id}', ${match.division})"
                    title="Supprimer ce match"
                    style="position: absolute; top: 50%; right: 5px; transform: translateY(-50%);
                           width: 18px; height: 18px; z-index: 10;
                           background: #e74c3c; color: white; border: none; border-radius: 50%;
                           font-size: 11px; cursor: pointer; line-height: 1; padding: 0;
                           opacity: 0.6; transition: opacity 0.2s;"
                    onmouseover="this.style.opacity='1'"
                    onmouseout="this.style.opacity='0.6'">×</button>` : ''}
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
                <span onclick="showPlayerPoolSummary(${dayNumber}, ${match.division}, '${match.player1}')"
                      style="font-size: 11px; color: #2c3e50; font-weight: 600; cursor: pointer; text-decoration: underline dotted;"
                      title="Cliquez pour voir les statistiques"
                      onmouseover="this.style.color='#3498db'"
                      onmouseout="this.style.color='#2c3e50'">${match.player1}</span>
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
                <span onclick="showPlayerPoolSummary(${dayNumber}, ${match.division}, '${match.player2}')"
                      style="font-size: 11px; color: #2c3e50; font-weight: 600; cursor: pointer; text-decoration: underline dotted;"
                      title="Cliquez pour voir les statistiques"
                      onmouseover="this.style.color='#3498db'"
                      onmouseout="this.style.color='#2c3e50'">${match.player2}</span>
            </div>

            ${!match.completed && window.showForfaitButtons ? `
            <div style="display: flex; gap: 4px; justify-content: center; margin-bottom: 8px;">
                <button onclick="declareForfait('pool', ${dayNumber}, ${match.division}, '${match.id}', 'player1')"
                        style="padding: 2px 6px; font-size: 10px; background: #e74c3c; color: white;
                               border: none; border-radius: 3px; cursor: pointer;"
                        title="Forfait ${match.player1}">F1</button>
                <button onclick="declareForfait('pool', ${dayNumber}, ${match.division}, '${match.id}', 'player2')"
                        style="padding: 2px 6px; font-size: 10px; background: #e74c3c; color: white;
                               border: none; border-radius: 3px; cursor: pointer;"
                        title="Forfait ${match.player2}">F2</button>
            </div>
            ` : ''}

            ${match.completed && match.winner ? `
            <div class="match-result" style="
                text-align: center;
                font-weight: bold;
                padding: 6px;
                border-radius: 6px;
                font-size: 13px;
                background: ${match.forfaitBy ? '#fff3cd' : '#a8e6cf'};
                color: ${match.forfaitBy ? '#856404' : '#00b894'};
            ">
                ${match.forfaitBy ? '⚠️' : '🏆'} ${match.winner} remporte le match${match.forfaitBy ? ' (forfait)' : ''} (${score1}-${score2})
            </div>` : ''}
            ${match.completed && match.winner === null ? `
            <div class="match-result" style="
                text-align: center;
                font-weight: bold;
                padding: 6px;
                border-radius: 6px;
                font-size: 13px;
                background: #e3f2fd;
                color: #1565c0;
            ">
                🤝 Match nul (${score1}-${score2})
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
            // Annuler le forfait si les scores sont modifiés manuellement
            if (match.forfaitBy) {
                delete match.forfaitBy;
            }
            // NE PAS régénérer le DOM ici pour permettre la navigation Tab naturelle
            // La régénération se fera dans handlePoolMatchEnter quand le match est validé
            saveToLocalStorage();
            break;
        }
    }
}

function handlePoolMatchEnter(event, dayNumber, matchId) {
    console.log('🔵 handlePoolMatchEnter appelé - Key:', event.key, 'MatchId:', matchId);

    const dayData = championship.days[dayNumber];
    const numDivisions = championship.config.numDivisions || 3;
    let match = null;
    let currentDivision = null;

    // Trouver le match et sa division
    for (let division = 1; division <= numDivisions; division++) {
        match = dayData.pools.divisions[division].matches.find(m => m.id == matchId);
        if (match) {
            currentDivision = division;
            break;
        }
    }

    if (!match) {
        console.log('❌ Match non trouvé');
        return;
    }

    // CORRECTION: Lire les valeurs directement depuis le DOM (pas depuis l'objet match)
    const currentInput = event.target;
    const matchContainer = currentInput.closest('.pool-match');
    if (!matchContainer) {
        console.log('❌ Container non trouvé');
        return;
    }

    const inputs = matchContainer.querySelectorAll('input[type="number"]');
    const input1 = inputs[0];
    const input2 = inputs[1];

    if (!input1 || !input2) {
        console.log('❌ Inputs non trouvés');
        return;
    }

    // Lire les valeurs actuelles du DOM
    const score1Value = input1.value.trim();
    const score2Value = input2.value.trim();
    console.log('📊 Scores du DOM:', score1Value, '-', score2Value);

    // Déterminer si on doit valider selon les valeurs du DOM
    const bothScoresFilled = score1Value !== '' && score2Value !== '';
    const shouldValidate = event.key === 'Enter' || (event.key === 'Tab' && bothScoresFilled);
    console.log('✅ Should validate:', shouldValidate, '(bothFilled:', bothScoresFilled, ')');

    if (shouldValidate) {
        // Si Tab sur scores incomplets, laisser la navigation naturelle
        if (event.key === 'Tab' && !bothScoresFilled) {
            console.log('⏩ Tab avec scores incomplets - navigation naturelle');
            return;
        }

        event.preventDefault();
        console.log('🛑 Validation du match...');

        // Mettre à jour les valeurs dans l'objet match AVANT de valider
        match.score1 = score1Value;
        match.score2 = score2Value;

        // Sauvegarder l'état AVANT régénération
        const wasCompleted = match.completed;

        // Compléter le match et régénérer le DOM
        checkPoolMatchCompletion(dayNumber, matchId);

        // Auto-collapse le match qui vient d'être complété
        if (!wasCompleted && match.completed) {
            console.log('✂️ Auto-collapse du match:', matchId);
            match.isCollapsed = true;
        }

        updatePoolsDisplay(dayNumber);
        checkPoolsCompletion(dayNumber);
        saveToLocalStorage();

        // Passer au match suivant
        setTimeout(() => {
            console.log('🔄 Navigation vers le match suivant...');
            // Trouver tous les inputs VISIBLES (pools ouvertes ET matchs non collapsed)
            const visibleInputs = Array.from(
                document.querySelectorAll('.pool-content[style*="display: block"] .pool-match:not(.collapsed) input[type="number"]')
            );
            console.log('📝 Nombre d\'inputs visibles:', visibleInputs.length);

            // Trouver le prochain match non-complété (le match actuel est maintenant collapsed)
            // On cherche simplement le premier input disponible dont le matchId est différent de celui qu'on vient de compléter
            let foundNext = false;
            for (let i = 0; i < visibleInputs.length; i++) {
                const inputMatchElement = visibleInputs[i].closest('.pool-match');
                const inputMatchId = inputMatchElement?.getAttribute('data-match-id');

                // Si c'est un match différent (donc le match actuel est déjà collapsed et exclu)
                // Prendre le premier input
                if (inputMatchId && inputMatchId !== matchId) {
                    console.log('➡️ Focus sur le match suivant:', inputMatchId);
                    // Empêcher le scroll automatique
                    visibleInputs[i].focus({ preventScroll: true });
                    visibleInputs[i].select();
                    // Scroll doux vers l'élément seulement s'il n'est pas visible
                    visibleInputs[i].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    foundNext = true;
                    break;
                }
            }

            if (!foundNext) {
                console.log('✅ Tous les matchs sont terminés!');
            }
        }, 150); // Délai augmenté pour assurer la stabilité du DOM
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
// RÉSUMÉ JOUEUR EN MODE POOL
// ======================================

// Collecte toutes les statistiques d'un joueur pour une journée donnée
function getPlayerPoolDayStats(dayNumber, division, playerName) {
    const dayData = championship.days[dayNumber];
    if (!dayData || !dayData.pools || !dayData.pools.enabled) return null;

    const matches = [];

    // 1. Collecter les matchs de poules
    if (dayData.pools.divisions[division] && dayData.pools.divisions[division].matches) {
        const poolMatches = dayData.pools.divisions[division].matches.filter(m =>
            (m.player1 === playerName || m.player2 === playerName) && m.completed
        );
        matches.push(...poolMatches);
    }

    // 2. Collecter les matchs de phase finale
    if (dayData.pools.manualFinalPhase && dayData.pools.manualFinalPhase.enabled) {
        const finalPhase = dayData.pools.manualFinalPhase.divisions[division];
        if (finalPhase && finalPhase.rounds) {
            Object.values(finalPhase.rounds).forEach(round => {
                if (round.matches) {
                    const finalMatches = round.matches.filter(m =>
                        (m.player1 === playerName || m.player2 === playerName) && m.completed
                    );
                    matches.push(...finalMatches);
                }
            });
        }
    }

    // Calculer les statistiques
    let wins = 0, losses = 0, pointsWon = 0, pointsLost = 0;
    const opponents = [];

    matches.forEach(match => {
        const isPlayer1 = match.player1 === playerName;
        const opponent = isPlayer1 ? match.player2 : match.player1;
        const score1 = parseInt(match.score1) || 0;
        const score2 = parseInt(match.score2) || 0;
        const playerScore = isPlayer1 ? score1 : score2;
        const opponentScore = isPlayer1 ? score2 : score1;
        const isWin = match.winner === playerName;

        if (isWin) wins++;
        else losses++;

        pointsWon += playerScore;
        pointsLost += opponentScore;

        opponents.push({
            name: opponent,
            playerScore: playerScore,
            opponentScore: opponentScore,
            result: isWin ? 'V' : 'D',
            matchType: match.roundName ? `${match.roundName}` : match.poolName || 'Poule',
            isBye: match.isBye || false
        });
    });

    return {
        playerName: playerName,
        division: division,
        dayNumber: dayNumber,
        totalMatches: matches.length,
        wins: wins,
        losses: losses,
        pointsWon: pointsWon,
        pointsLost: pointsLost,
        diff: pointsWon - pointsLost,
        opponents: opponents
    };
}

// Affiche le modal de résumé d'un joueur
function showPlayerPoolSummary(dayNumber, division, playerName) {
    const stats = getPlayerPoolDayStats(dayNumber, division, playerName);

    if (!stats || stats.totalMatches === 0) {
        alert(`Aucune statistique disponible pour ${playerName} sur cette journée.`);
        return;
    }

    // Créer le modal
    const modalHTML = `
        <div id="player-pool-summary-modal" style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            animation: fadeIn 0.3s;
        " onclick="closePlayerPoolSummary()">
            <div style="
                background: white;
                border-radius: 15px;
                padding: 0;
                max-width: 600px;
                width: 90%;
                max-height: 85vh;
                overflow-y: auto;
                box-shadow: 0 10px 40px rgba(0,0,0,0.3);
                animation: slideUp 0.3s;
            " onclick="event.stopPropagation()">
                <!-- En-tête -->
                <div style="
                    background: linear-gradient(135deg, #3498db, #2980b9);
                    color: white;
                    padding: 20px;
                    border-radius: 15px 15px 0 0;
                    position: relative;
                ">
                    <button onclick="closePlayerPoolSummary()" style="
                        position: absolute;
                        top: 15px;
                        right: 15px;
                        background: rgba(255,255,255,0.2);
                        border: none;
                        color: white;
                        font-size: 24px;
                        width: 35px;
                        height: 35px;
                        border-radius: 50%;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        transition: background 0.2s;
                    " onmouseover="this.style.background='rgba(255,255,255,0.3)'"
                       onmouseout="this.style.background='rgba(255,255,255,0.2)'">×</button>

                    <h3 style="margin: 0 0 10px 0; font-size: 24px;">
                        ${playerName}
                    </h3>
                    <div style="font-size: 14px; opacity: 0.9;">
                        Division ${division} • Journée ${dayNumber}
                    </div>
                </div>

                <!-- Corps -->
                <div style="padding: 20px;">
                    <h4 style="
                        color: #2c3e50;
                        margin: 0 0 15px 0;
                        font-size: 18px;
                        border-bottom: 2px solid #3498db;
                        padding-bottom: 8px;
                    ">
                        📊 Adversaires affrontés (${stats.totalMatches} match${stats.totalMatches > 1 ? 's' : ''})
                    </h4>

                    <table style="
                        width: 100%;
                        border-collapse: collapse;
                        font-size: 13px;
                    ">
                        <thead>
                            <tr style="
                                background: #ecf0f1;
                                color: #2c3e50;
                            ">
                                <th style="padding: 10px; text-align: left; font-weight: 600;">Adversaire</th>
                                <th style="padding: 10px; text-align: center; font-weight: 600;">Type</th>
                                <th style="padding: 10px; text-align: center; font-weight: 600;">Score</th>
                                <th style="padding: 10px; text-align: center; font-weight: 600;">Résultat</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${stats.opponents.map((opp, index) => {
                                const bgColor = index % 2 === 0 ? '#f8f9fa' : 'white';
                                const resultBg = opp.result === 'V' ? '#d4edda' : '#f8d7da';
                                const resultColor = opp.result === 'V' ? '#155724' : '#721c24';
                                const resultIcon = opp.result === 'V' ? '✓' : '✗';

                                return `
                                    <tr style="background: ${bgColor}; border-bottom: 1px solid #dee2e6;">
                                        <td style="padding: 10px; font-weight: 500;">${opp.name}</td>
                                        <td style="padding: 10px; text-align: center; font-size: 11px; color: #6c757d;">
                                            ${opp.matchType}
                                        </td>
                                        <td style="padding: 10px; text-align: center; font-weight: bold;">
                                            <span style="color: #2c3e50;">${opp.playerScore}</span>
                                            <span style="color: #95a5a6;"> - </span>
                                            <span style="color: #7f8c8d;">${opp.opponentScore}</span>
                                        </td>
                                        <td style="padding: 10px; text-align: center;">
                                            <span style="
                                                background: ${resultBg};
                                                color: ${resultColor};
                                                padding: 4px 10px;
                                                border-radius: 12px;
                                                font-weight: bold;
                                                font-size: 12px;
                                            ">
                                                ${resultIcon} ${opp.result}
                                            </span>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>

                    <!-- Statistiques globales -->
                    <div style="
                        margin-top: 20px;
                        padding: 15px;
                        background: linear-gradient(135deg, #f8f9fa, #e9ecef);
                        border-radius: 10px;
                        border-left: 4px solid #3498db;
                    ">
                        <div style="display: flex; justify-content: space-around; flex-wrap: wrap; gap: 10px;">
                            <div style="text-align: center;">
                                <div style="font-size: 12px; color: #6c757d; margin-bottom: 4px;">Victoires</div>
                                <div style="font-size: 20px; font-weight: bold; color: #27ae60;">${stats.wins}</div>
                            </div>
                            <div style="text-align: center;">
                                <div style="font-size: 12px; color: #6c757d; margin-bottom: 4px;">Défaites</div>
                                <div style="font-size: 20px; font-weight: bold; color: #e74c3c;">${stats.losses}</div>
                            </div>
                            <div style="text-align: center;">
                                <div style="font-size: 12px; color: #6c757d; margin-bottom: 4px;">Points marqués</div>
                                <div style="font-size: 20px; font-weight: bold; color: #3498db;">${stats.pointsWon}</div>
                            </div>
                            <div style="text-align: center;">
                                <div style="font-size: 12px; color: #6c757d; margin-bottom: 4px;">Points encaissés</div>
                                <div style="font-size: 20px; font-weight: bold; color: #95a5a6;">${stats.pointsLost}</div>
                            </div>
                            <div style="text-align: center;">
                                <div style="font-size: 12px; color: #6c757d; margin-bottom: 4px;">Différence</div>
                                <div style="font-size: 20px; font-weight: bold; color: ${stats.diff >= 0 ? '#27ae60' : '#e74c3c'};">
                                    ${stats.diff >= 0 ? '+' : ''}${stats.diff}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Ajouter le modal au DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Gérer la touche Échap
    document.addEventListener('keydown', handleEscKey);
}

// Ferme le modal de résumé
function closePlayerPoolSummary() {
    const modal = document.getElementById('player-pool-summary-modal');
    if (modal) {
        modal.remove();
    }
    document.removeEventListener('keydown', handleEscKey);
}

// Gère la touche Échap
function handleEscKey(event) {
    if (event.key === 'Escape') {
        closePlayerPoolSummary();
    }
}

// Ajouter les animations CSS
if (!document.getElementById('player-summary-animations')) {
    const style = document.createElement('style');
    style.id = 'player-summary-animations';
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes slideUp {
            from { transform: translateY(50px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
}

// ======================================
// CLASSEMENT DES POULES
// ======================================

function generatePoolRankingHTML(pool, poolMatches, poolIndex, qualifiedPlayers = null, dayNumber = null, division = null) {
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

    // Déterminer le statut de qualification pour chaque joueur
    const getQualificationStatus = (playerName) => {
        if (!qualifiedPlayers) return { qualified: false, isDirect: false };

        const qualified = qualifiedPlayers.find(q => q.name === playerName && q.poolIndex === poolIndex);
        if (qualified) {
            return {
                qualified: true,
                isDirect: qualified.isDirect,
                method: qualified.qualificationMethod
            };
        }
        return { qualified: false, isDirect: false };
    };

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
                        <th style="padding: 8px; text-align: center;">V/N/D/F</th>
                        <th style="padding: 8px; text-align: center;">PP/PC</th>
                        <th style="padding: 8px; text-align: center;">Diff</th>
                    </tr>
                </thead>
                <tbody>
                    ${playerStats.map((player, index) => {
                        const status = getQualificationStatus(player.name);

                        // Déterminer les couleurs selon le statut
                        let bgColor, textColor, emoji, badge;
                        if (status.qualified && status.isDirect) {
                            // Qualifié direct
                            bgColor = '#d4edda';
                            textColor = '#155724';
                            emoji = '✅';
                            badge = '<span style="font-size: 10px; background: #28a745; color: white; padding: 2px 6px; border-radius: 10px; margin-left: 5px;">Qualifié</span>';
                        } else if (status.qualified && !status.isDirect) {
                            // Meilleur runner-up
                            bgColor = '#fff3cd';
                            textColor = '#856404';
                            emoji = '⭐';
                            badge = '<span style="font-size: 10px; background: #ffc107; color: #856404; padding: 2px 6px; border-radius: 10px; margin-left: 5px;">Repêché</span>';
                        } else {
                            // Non qualifié
                            bgColor = 'white';
                            textColor = '#6c757d';
                            emoji = '';
                            badge = '';
                        }

                        return `
                            <tr style="
                                background: ${bgColor};
                                border-bottom: 1px solid #dee2e6;
                                ${!status.qualified ? 'opacity: 0.7;' : ''}
                            ">
                                <td style="padding: 8px; font-weight: bold; color: ${textColor};">
                                    ${index + 1} ${emoji}
                                </td>
                                <td style="padding: 8px; font-weight: 600; color: ${textColor};">
                                    <span ${dayNumber && division ? `onclick="showPlayerPoolSummary(${dayNumber}, ${division}, '${player.name}')"` : ''}
                                          style="cursor: ${dayNumber && division ? 'pointer' : 'default'}; ${dayNumber && division ? 'text-decoration: underline dotted;' : ''}"
                                          ${dayNumber && division ? `title="Cliquez pour voir les statistiques"` : ''}
                                          ${dayNumber && division ? `onmouseover="this.style.color='#3498db'"` : ''}
                                          ${dayNumber && division ? `onmouseout="this.style.color='${textColor}'"` : ''}>${player.name}</span>${badge}
                                </td>
                                <td style="padding: 8px; text-align: center; font-weight: bold; color: ${textColor};">${player.points}</td>
                                <td style="padding: 8px; text-align: center; color: ${textColor};">${player.wins}/${player.draws || 0}/${player.losses}/${player.forfeits || 0}</td>
                                <td style="padding: 8px; text-align: center; color: ${textColor};">${player.pointsWon}/${player.pointsLost}</td>
                                <td style="padding: 8px; text-align: center; color: ${textColor};">${player.diff > 0 ? '+' : ''}${player.diff}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
            ${qualifiedPlayers ? `
                <div style="margin-top: 10px; padding: 8px; background: rgba(255, 193, 7, 0.1); border-radius: 5px; font-size: 11px; color: #6c757d; text-align: center;">
                    ✅ Qualifié direct | ⭐ Repêché (meilleur runner-up)
                </div>
            ` : ''}
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

    // Restaurer l'état complet des poules si elles étaient activées
    const dayData = championship.days[dayNumber];
    if (dayData.pools && dayData.pools.enabled) {
        // Attendre que le DOM soit prêt
        setTimeout(() => {
            restorePoolState(dayNumber);
        }, 100);
    }
}

// Restaure l'état complet des poules après un rechargement
function restorePoolState(dayNumber) {
    const dayData = championship.days[dayNumber];
    if (!dayData || !dayData.pools) return;

    console.log(`Restauration des poules pour J${dayNumber}...`);

    // 1. Afficher le bouton et la section toggle
    const showPoolBtn = document.getElementById(`show-pool-btn-${dayNumber}`);
    const poolToggle = document.getElementById(`pool-toggle-${dayNumber}`);

    if (poolToggle && dayData.pools.enabled) {
        poolToggle.style.display = 'block';
    }

    // 2. Cocher la checkbox
    const checkbox = document.getElementById(`pool-enabled-${dayNumber}`);
    if (checkbox) {
        checkbox.checked = dayData.pools.enabled;
    }

    // 3. Afficher la config et l'info
    const config = document.getElementById(`pool-config-${dayNumber}`);
    const info = document.getElementById(`pool-info-${dayNumber}`);

    if (dayData.pools.enabled) {
        if (config) config.style.display = 'block';
        if (info) info.style.display = 'block';
    }

    // 4. Restaurer le mode de configuration (simple/avancé)
    if (dayData.pools.config) {
        const mode = dayData.pools.config.mode || 'simple';
        const modeRadio = document.querySelector(`input[name="pool-config-mode-${dayNumber}"][value="${mode}"]`);
        if (modeRadio) {
            modeRadio.checked = true;
            togglePoolConfigMode(dayNumber, mode);
        }

        // Restaurer les valeurs du mode simple
        if (mode === 'simple') {
            const poolSizeEl = document.getElementById(`pool-size-${dayNumber}`);
            const qualifiedEl = document.getElementById(`qualified-per-pool-${dayNumber}`);
            if (poolSizeEl && dayData.pools.config.poolSize) {
                poolSizeEl.value = dayData.pools.config.poolSize;
            }
            if (qualifiedEl && dayData.pools.config.qualifiedPerPool) {
                qualifiedEl.value = dayData.pools.config.qualifiedPerPool;
            }
        }

        // Restaurer les valeurs du mode avancé
        if (mode === 'advanced') {
            const numPoolsEl = document.getElementById(`num-pools-${dayNumber}`);
            const totalQualifiedEl = document.getElementById(`total-qualified-${dayNumber}`);
            if (numPoolsEl && dayData.pools.config.numPools) {
                numPoolsEl.value = dayData.pools.config.numPools;
            }
            if (totalQualifiedEl && dayData.pools.config.totalQualified) {
                totalQualifiedEl.value = dayData.pools.config.totalQualified;
            }
            updateAdvancedConfigInfo(dayNumber);
        }
    }

    // 5. Afficher les poules générées si elles existent
    const numDivisions = championship.config?.numberOfDivisions || 3;
    let hasPoolData = false;

    for (let div = 1; div <= numDivisions; div++) {
        if (dayData.pools.divisions &&
            dayData.pools.divisions[div] &&
            dayData.pools.divisions[div].pools &&
            dayData.pools.divisions[div].pools.length > 0) {
            hasPoolData = true;
            break;
        }
    }

    if (hasPoolData) {
        updatePoolsDisplay(dayNumber);

        // Activer le bouton Phase Finale si des poules existent
        const finalPhaseBtn = document.getElementById(`final-phase-btn-${dayNumber}`);
        if (finalPhaseBtn) {
            finalPhaseBtn.disabled = false;
        }
    }

    // 6. Restaurer la phase finale si elle existe
    if (dayData.pools.manualFinalPhase && dayData.pools.manualFinalPhase.enabled) {
        setTimeout(() => {
            displayManualFinalPhaseFromData(dayNumber);
        }, 200);
    }

    console.log(`Poules J${dayNumber} restaurées avec succès`);
}
window.restorePoolState = restorePoolState;

// Restaure l'affichage de la phase finale depuis les données sauvegardées
function displayManualFinalPhaseFromData(dayNumber) {
    const dayData = championship.days[dayNumber];
    if (!dayData || !dayData.pools || !dayData.pools.manualFinalPhase) return;

    const manualFinalPhase = dayData.pools.manualFinalPhase;
    if (!manualFinalPhase.enabled) return;

    const numDivisions = championship.config?.numberOfDivisions || 3;

    for (let division = 1; division <= numDivisions; division++) {
        const divisionFinalPhase = manualFinalPhase.divisions[division];
        if (!divisionFinalPhase || !divisionFinalPhase.qualified || divisionFinalPhase.qualified.length === 0) continue;

        const container = document.getElementById(`division${dayNumber}-${division}-matches`);
        if (!container) continue;

        // Ajouter l'affichage de la phase finale
        const finalPhaseHTML = generateManualFinalPhaseHTML(dayNumber, division, divisionFinalPhase);

        // Chercher si le conteneur de phase finale existe déjà
        let finalContainer = container.querySelector('.manual-final-phase-container');
        if (finalContainer) {
            finalContainer.outerHTML = finalPhaseHTML;
        } else {
            container.insertAdjacentHTML('beforeend', finalPhaseHTML);
        }
    }

    console.log(`Phase finale J${dayNumber} restaurée`);
}
window.displayManualFinalPhaseFromData = displayManualFinalPhaseFromData;

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

// ======================================
// SYSTÈME DE PHASES FINALES MANUELLES - SYNTAXE CORRIGÉE
// ======================================

// Extension de la structure pour les phases finales manuelles
function initializeManualFinalPhase(dayNumber) {
    const dayData = championship.days[dayNumber];
    const numDivisions = championship.config?.numberOfDivisions || championship.config?.numDivisions || 3;

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

function getQualifiedPlayersFromPools(pools, matches, qualifiedPerPool, advancedConfig = null) {
    // Calculer les statistiques pour tous les joueurs de toutes les poules
    const allPlayerStats = [];
    const poolRankings = []; // Classements par poule

    pools.forEach((pool, poolIndex) => {
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

        // Trier les joueurs de cette poule
        playerStats.sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.diff !== a.diff) return b.diff - a.diff;
            return b.pointsWon - a.pointsWon;
        });

        // Ajouter la position dans la poule
        playerStats.forEach((player, index) => {
            player.poolRank = index + 1;
        });

        poolRankings.push(playerStats);
        allPlayerStats.push(...playerStats);
    });

    const allQualified = [];

    // MODE AVANCÉ : Qualification hybride (top N par poule + meilleurs runners-up)
    if (advancedConfig && advancedConfig.topPerPool !== undefined) {
        const { topPerPool, bestRunnerUps, runnerUpPosition } = advancedConfig;

        // 1. Prendre les top N de chaque poule (qualifiés directs)
        poolRankings.forEach(poolStats => {
            const directQualified = poolStats.slice(0, topPerPool);
            directQualified.forEach(player => {
                player.qualificationMethod = `${player.poolRank}er de poule ${player.poolName}`;
                player.isDirect = true;
            });
            allQualified.push(...directQualified);
        });

        // 2. Si besoin de runners-up, collecter et trier
        if (bestRunnerUps > 0 && runnerUpPosition > 0) {
            const runnersUp = [];

            poolRankings.forEach(poolStats => {
                if (poolStats[runnerUpPosition - 1]) {
                    const runner = poolStats[runnerUpPosition - 1];
                    runner.qualificationMethod = `Meilleur ${runnerUpPosition}ème`;
                    runner.isDirect = false;
                    runnersUp.push(runner);
                }
            });

            // Trier tous les runners-up entre eux
            runnersUp.sort((a, b) => {
                if (b.points !== a.points) return b.points - a.points;
                if (b.diff !== a.diff) return b.diff - a.diff;
                return b.pointsWon - a.pointsWon;
            });

            // Prendre les meilleurs runners-up
            const bestRunners = runnersUp.slice(0, bestRunnerUps);
            allQualified.push(...bestRunners);
        }
    }
    // MODE SIMPLE : Qualification classique (top N de chaque poule)
    else {
        poolRankings.forEach(poolStats => {
            const qualified = poolStats.slice(0, qualifiedPerPool);
            qualified.forEach(player => {
                player.qualificationMethod = `${player.poolRank}er de poule ${player.poolName}`;
                player.isDirect = true;
            });
            allQualified.push(...qualified);
        });
    }

    // Attribuer les seeds globaux
    allQualified.forEach((player, index) => {
        player.seed = index + 1;
    });

    return allQualified;
}

// Fonction principale pour générer les phases finales manuelles
function generateManualFinalPhase(dayNumber) {
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

    // Détecter le mode de configuration
    const configMode = dayData.pools.config?.mode || 'simple';
    const numDivisions = championship.config?.numberOfDivisions || championship.config?.numDivisions || 3;
    let totalQualified = 0;

    // Qualifier les joueurs de chaque division
    for (let division = 1; division <= numDivisions; division++) {
        const pools = dayData.pools.divisions[division].pools;
        const matches = dayData.pools.divisions[division].matches;

        if (pools.length === 0) continue;

        let qualified;

        // Mode Simple : qualification classique (top N de chaque poule)
        if (configMode === 'simple') {
            const qualifiedPerPool = parseInt(document.getElementById(`qualified-per-pool-${dayNumber}`).value);
            qualified = getQualifiedPlayersFromPools(pools, matches, qualifiedPerPool);
        }
        // Mode Avancé : qualification hybride (utilise les paramètres sauvegardés)
        else {
            const advancedConfig = dayData.pools.config.divisions[division];
            qualified = getQualifiedPlayersFromPools(pools, matches, null, advancedConfig);
        }
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

    // Scroll automatique vers la phase finale après l'alert
    setTimeout(() => {
        const firstFinalPhase = document.querySelector('.manual-final-phase-container');
        if (firstFinalPhase) {
            firstFinalPhase.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
            console.log('✅ Scroll automatique vers la phase finale');
        }
    }, 100); // Petit délai pour laisser l'alert se fermer
}

// ======================================
// PHASE FINALE DIRECTE (sans poules)
// ======================================

/**
 * Génère une phase finale directe avec tous les joueurs inscrits
 * Sans passer par les phases de poules
 */
function generateDirectFinalPhase(dayNumber) {
    const dayData = championship.days[dayNumber];
    if (!dayData) {
        alert('Journée non trouvée !');
        return;
    }

    const numDivisions = championship.config?.numberOfDivisions || 3;
    let totalPlayers = 0;

    // Vérifier qu'il y a des joueurs dans au moins une division
    for (let division = 1; division <= numDivisions; division++) {
        const players = dayData.players[division] || [];
        const validPlayers = players.filter(p => p && p.toUpperCase() !== 'BYE');
        totalPlayers += validPlayers.length;
    }

    if (totalPlayers === 0) {
        alert('⚠️ Aucun joueur inscrit !\n\nAjoutez des joueurs avant de générer la phase finale.');
        return;
    }

    // Demander confirmation
    if (!confirm(`⚡ ÉLIMINATION DIRECTE\n\nCette option crée une phase finale directe sans poules.\n\n${totalPlayers} joueur(s) inscrit(s) au total.\n\nContinuer ?`)) {
        return;
    }

    // Initialiser la structure pools si nécessaire
    if (!dayData.pools) {
        dayData.pools = {
            enabled: true,
            config: { mode: 'direct' },
            divisions: {}
        };
    } else {
        dayData.pools.enabled = true;
        dayData.pools.config = dayData.pools.config || {};
        dayData.pools.config.mode = 'direct';
    }

    // Initialiser les divisions
    for (let div = 1; div <= numDivisions; div++) {
        if (!dayData.pools.divisions[div]) {
            dayData.pools.divisions[div] = {
                pools: [],
                matches: []
            };
        }
    }

    // Initialiser la phase finale manuelle
    initializeManualFinalPhase(dayNumber);

    let totalQualified = 0;

    // Pour chaque division, qualifier tous les joueurs directement
    for (let division = 1; division <= numDivisions; division++) {
        const players = dayData.players[division] || [];
        const validPlayers = players.filter(p => p && p.toUpperCase() !== 'BYE');

        if (validPlayers.length < 2) continue;

        // Créer la liste des qualifiés (tous les joueurs)
        const qualified = validPlayers.map((playerName, index) => ({
            name: playerName,
            seed: index + 1,
            qualificationMethod: 'Inscrit',
            isDirect: true,
            wins: 0,
            losses: 0,
            points: 0,
            diff: 0,
            pointsWon: 0,
            poolRank: index + 1,
            poolName: '-'
        }));

        // Mélanger les joueurs pour un tirage aléatoire équitable
        const shuffledQualified = shuffleArray([...qualified]);

        // Réattribuer les seeds après mélange
        shuffledQualified.forEach((player, idx) => {
            player.seed = idx + 1;
        });

        dayData.pools.manualFinalPhase.divisions[division].qualified = shuffledQualified;
        totalQualified += shuffledQualified.length;

        // Ajuster le nombre de joueurs à une puissance de 2 (avec BYEs si nécessaire)
        const adjustedQualified = adjustToPowerOfTwo(shuffledQualified);

        // Déterminer le premier tour selon le nombre de joueurs
        const firstRoundName = determineFirstRound(adjustedQualified.length);
        if (firstRoundName && adjustedQualified.length >= 2) {
            generateFirstRoundDirect(dayNumber, division, adjustedQualified, firstRoundName);
        }
    }

    dayData.pools.manualFinalPhase.enabled = true;

    // Mettre à jour l'affichage
    updateManualFinalPhaseDisplay(dayNumber);
    saveToLocalStorage();

    // Désactiver le bouton d'élimination directe
    const directBtn = document.getElementById(`direct-final-btn-${dayNumber}`);
    if (directBtn) {
        directBtn.disabled = true;
        directBtn.style.opacity = '0.5';
    }

    alert(`⚡ ÉLIMINATION DIRECTE CRÉÉE !\n\n${totalQualified} joueur(s) en compétition.\n\nLes matchs ont été générés automatiquement.`);

    // Scroll vers la phase finale
    setTimeout(() => {
        const firstFinalPhase = document.querySelector('.manual-final-phase-container');
        if (firstFinalPhase) {
            firstFinalPhase.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, 100);
}
window.generateDirectFinalPhase = generateDirectFinalPhase;

/**
 * Ajuste le nombre de joueurs à la puissance de 2 supérieure en ajoutant des BYEs
 */
function adjustToPowerOfTwo(players) {
    const count = players.length;

    // Trouver la prochaine puissance de 2
    let targetSize = 2;
    while (targetSize < count) {
        targetSize *= 2;
    }

    // Si déjà une puissance de 2, retourner tel quel
    if (count === targetSize) {
        return players;
    }

    // Ajouter des BYEs pour atteindre la puissance de 2
    const result = [...players];
    const byesToAdd = targetSize - count;

    for (let i = 0; i < byesToAdd; i++) {
        result.push({
            name: 'BYE',
            seed: count + i + 1,
            isBye: true,
            qualificationMethod: 'BYE',
            isDirect: false
        });
    }

    return result;
}

/**
 * Génère le premier tour pour l'élimination directe
 */
function generateFirstRoundDirect(dayNumber, division, qualified, roundName) {
    const dayData = championship.days[dayNumber];
    const rounds = dayData.pools.manualFinalPhase.divisions[division].rounds;

    // Organiser les seeds pour un bracket équilibré
    const seededPlayers = organizeSeeds(qualified);
    const matches = [];

    for (let i = 0; i < seededPlayers.length; i += 2) {
        const player1 = seededPlayers[i];
        const player2 = seededPlayers[i + 1] || { name: 'BYE', isBye: true };

        const isByeMatch = player1.isBye || player2.isBye;
        const winner = player1.isBye ? player2.name : (player2.isBye ? player1.name : null);

        const matchData = {
            id: `${roundName}-${division}-${Math.floor(i/2) + 1}`,
            player1: player1.name,
            player2: player2.name,
            player1Seed: player1.seed,
            player2Seed: player2.seed || null,
            score1: player2.isBye ? 3 : (player1.isBye ? 0 : ''),
            score2: player2.isBye ? 0 : (player1.isBye ? 3 : ''),
            completed: isByeMatch,
            winner: winner,
            roundName: roundName,
            position: Math.floor(i/2) + 1,
            isBye: isByeMatch
        };

        matches.push(matchData);
    }

    rounds[roundName] = {
        name: roundName,
        matches: matches,
        completed: false,
        nextRound: getNextRoundName(roundName),
        createdAt: new Date().toISOString()
    };

    dayData.pools.manualFinalPhase.currentRound = roundName;
}

/**
 * Mélange un tableau de manière aléatoire (Fisher-Yates)
 */
function shuffleArray(array) {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

function determineFirstRound(numPlayers) {
    // Détermine le premier tour selon le nombre de joueurs
    // 2 joueurs = Finale directe
    // 3-4 joueurs = Demi-finales
    // 5-8 joueurs = Quarts de finale
    // 9-16 joueurs = 8èmes de finale
    // 17-32 joueurs = 16èmes de finale
    // 33+ joueurs = 32èmes de finale
    if (numPlayers > 32) return "32èmes";
    if (numPlayers > 16) return "16èmes";
    if (numPlayers > 8) return "8èmes";
    if (numPlayers > 4) return "Quarts";
    if (numPlayers > 2) return "Demi-finales";
    if (numPlayers === 2) return "Finale";
    return null;
}

function generateFirstRound(dayNumber, division, qualified, roundName) {
    const dayData = championship.days[dayNumber];
    const rounds = dayData.pools.manualFinalPhase.divisions[division].rounds;

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
}

function getNextRoundName(currentRound) {
    const sequence = ["32èmes", "16èmes", "8èmes", "Quarts", "Demi-finales", "Finale"];
    const currentIndex = sequence.indexOf(currentRound);
    return currentIndex >= 0 && currentIndex < sequence.length - 1 ? sequence[currentIndex + 1] : null;
}

function organizeSeeds(qualified) {
    // Algorithme de placement qui sépare les joueurs de même poule
    // pour qu'ils ne se rencontrent qu'au tour le plus tardif possible

    const numPlayers = qualified.length;
    if (numPlayers < 4) {
        return qualified.sort((a, b) => a.seed - b.seed);
    }

    // Grouper les joueurs par poule
    const poolGroups = {};
    qualified.forEach(player => {
        const poolKey = player.poolIndex !== undefined ? player.poolIndex : player.poolName;
        if (!poolGroups[poolKey]) {
            poolGroups[poolKey] = [];
        }
        poolGroups[poolKey].push(player);
    });

    // Trier chaque groupe par rang dans la poule
    Object.values(poolGroups).forEach(group => {
        group.sort((a, b) => a.poolRank - b.poolRank);
    });

    const poolKeys = Object.keys(poolGroups);
    const numPools = poolKeys.length;

    // Déterminer la taille du tableau (prochaine puissance de 2)
    const bracketSize = Math.pow(2, Math.ceil(Math.log2(numPlayers)));
    const result = new Array(bracketSize).fill(null);

    // Cas spécial : 2 poules (croisement classique)
    if (numPools === 2) {
        const poolA = poolGroups[poolKeys[0]];
        const poolB = poolGroups[poolKeys[1]];

        // Placement croisé : 1A vs 2B en haut, 1B vs 2A en bas
        // Ainsi les joueurs de même poule ne se rencontrent qu'en finale
        if (bracketSize === 4) {
            result[0] = poolA[0]; // 1er poule A
            result[1] = poolB[1]; // 2ème poule B
            result[2] = poolB[0]; // 1er poule B
            result[3] = poolA[1]; // 2ème poule A
        } else {
            // Pour tableaux plus grands, alterner les placements
            let posA = 0, posB = bracketSize / 2;
            poolA.forEach((player, idx) => {
                if (idx % 2 === 0) result[posA++] = player;
                else result[posB++] = player;
            });
            posA = 1; posB = bracketSize / 2 + 1;
            poolB.forEach((player, idx) => {
                if (idx % 2 === 0) result[posB - 1 + idx] = player;
                else result[posA - 1 + idx] = player;
            });
        }
    }
    // Cas 4 poules : placement en quarts séparés
    else if (numPools === 4) {
        // Ordre des poules pour croisement optimal
        // Q1: 1A vs 2C, Q2: 1D vs 2B, Q3: 1B vs 2D, Q4: 1C vs 2A
        const crossOrder = [
            [0, 2], // Q1: poule 0 vs poule 2
            [3, 1], // Q2: poule 3 vs poule 1
            [1, 3], // Q3: poule 1 vs poule 3
            [2, 0]  // Q4: poule 2 vs poule 0
        ];

        let pos = 0;
        crossOrder.forEach(([poolIdx1, poolIdx2]) => {
            const pool1 = poolGroups[poolKeys[poolIdx1]] || [];
            const pool2 = poolGroups[poolKeys[poolIdx2]] || [];

            if (pool1[0]) result[pos] = pool1[0]; // 1er de poule
            if (pool2[1]) result[pos + 1] = pool2[1]; // 2ème de l'autre poule
            pos += 2;
        });
    }
    // Cas général : algorithme de séparation par moitiés
    else {
        // Grouper les joueurs par rang (tous les 1ers, tous les 2èmes, etc.)
        const byRank = {};
        qualified.forEach(player => {
            const rank = player.poolRank || 1;
            if (!byRank[rank]) byRank[rank] = [];
            byRank[rank].push(player);
        });

        // Placer les joueurs en s'assurant que même poule = moitiés différentes
        const halfSize = bracketSize / 2;
        let topPos = 0;
        let bottomPos = halfSize;

        // Alterner les poules entre haut et bas du tableau
        poolKeys.forEach((poolKey, poolIdx) => {
            const players = poolGroups[poolKey];
            players.forEach((player, playerIdx) => {
                // Alterner: pair en haut, impair en bas (par poule)
                if (poolIdx % 2 === 0) {
                    if (playerIdx % 2 === 0 && topPos < halfSize) {
                        result[topPos++] = player;
                    } else if (bottomPos < bracketSize) {
                        result[bottomPos++] = player;
                    }
                } else {
                    if (playerIdx % 2 === 0 && bottomPos < bracketSize) {
                        result[bottomPos++] = player;
                    } else if (topPos < halfSize) {
                        result[topPos++] = player;
                    }
                }
            });
        });
    }

    // Compacter le tableau (retirer les nulls) et réorganiser pour matchs équilibrés
    const compacted = result.filter(p => p !== null);

    // Si on n'a pas assez de joueurs, compléter avec les joueurs manquants
    qualified.forEach(player => {
        if (!compacted.includes(player)) {
            compacted.push(player);
        }
    });

    // S'assurer qu'on a le bon nombre de joueurs
    const finalResult = compacted.slice(0, numPlayers);

    // Réorganiser pour que les matchs soient bien formés (seed order dans chaque moitié)
    return reorderForBracket(finalResult, poolGroups);
}

// Réorganise le tableau pour un bracket équilibré tout en gardant la séparation des poules
function reorderForBracket(players, poolGroups) {
    const n = players.length;
    if (n < 4) return players;

    // Vérifier si deux joueurs sont de la même poule
    function samePool(p1, p2) {
        if (!p1 || !p2) return false;
        const pool1 = p1.poolIndex !== undefined ? p1.poolIndex : p1.poolName;
        const pool2 = p2.poolIndex !== undefined ? p2.poolIndex : p2.poolName;
        return pool1 === pool2;
    }

    // Trier par seed d'abord
    const sorted = [...players].sort((a, b) => (a.seed || 99) - (b.seed || 99));

    // Pour un tableau de 4 : positions [0,1] = match1, [2,3] = match2
    // Pour un tableau de 8 : [0,1]=M1, [2,3]=M2, [4,5]=M3, [6,7]=M4
    // Les gagnants de M1 vs M2 se rencontrent en demi, M3 vs M4 aussi

    const result = new Array(n).fill(null);
    const used = new Set();

    // Placement standard du seeding avec vérification des poules
    // Seed 1 vs dernier seed, Seed 2 vs avant-dernier, etc.
    const positions = generateBracketPositions(n);

    positions.forEach((pos, idx) => {
        if (idx < sorted.length) {
            result[pos] = sorted[idx];
        }
    });

    // Vérifier et corriger les conflits de poules
    for (let i = 0; i < result.length; i += 2) {
        if (samePool(result[i], result[i + 1])) {
            // Conflit ! Chercher un échange possible
            for (let j = i + 2; j < result.length; j++) {
                // Essayer d'échanger result[i+1] avec result[j]
                if (!samePool(result[i], result[j]) && !samePool(result[j - (j % 2)], result[i + 1])) {
                    const temp = result[i + 1];
                    result[i + 1] = result[j];
                    result[j] = temp;
                    break;
                }
            }
        }
    }

    return result.filter(p => p !== null);
}

// Génère les positions de placement pour un bracket standard
function generateBracketPositions(n) {
    if (n <= 2) return [0, 1];
    if (n <= 4) return [0, 3, 2, 1]; // 1 vs 4, 2 vs 3 -> gagnants en finale
    if (n <= 8) return [0, 7, 4, 3, 2, 5, 6, 1]; // Standard 8-bracket
    if (n <= 16) {
        // Pour 16: séparation maximale des têtes de série
        return [0, 15, 8, 7, 4, 11, 12, 3, 2, 13, 10, 5, 6, 9, 14, 1];
    }
    // Pour 32: bracket standard avec séparation maximale
    if (n <= 32) {
        return [
            0, 31, 16, 15, 8, 23, 24, 7,   // Haut du tableau (quart 1-2)
            4, 27, 20, 11, 12, 19, 28, 3,  // Haut du tableau (quart 3-4)
            2, 29, 18, 13, 10, 21, 26, 5,  // Bas du tableau (quart 5-6)
            6, 25, 22, 9, 14, 17, 30, 1    // Bas du tableau (quart 7-8)
        ];
    }
    // Pour 64 ou plus: générer dynamiquement
    const positions = [];
    for (let i = 0; i < n; i++) {
        positions.push(i);
    }
    // Algorithme de placement standard : seed 1 vs seed n, seed 2 vs seed n-1, etc.
    const result = new Array(n);
    for (let i = 0; i < n / 2; i++) {
        result[i * 2] = positions[i];
        result[i * 2 + 1] = positions[n - 1 - i];
    }
    return result.map((_, idx) => idx); // Retourner indices linéaires si > 32
}

// ======================================
// AFFICHAGE DES PHASES FINALES MANUELLES
// ======================================

function updateManualFinalPhaseDisplay(dayNumber) {
    const dayData = championship.days[dayNumber];
    if (!dayData.pools || !dayData.pools.manualFinalPhase || !dayData.pools.manualFinalPhase.enabled) {
        return;
    }

    const numDivisions = championship.config?.numberOfDivisions || 3;

    for (let division = 1; division <= numDivisions; division++) {
        const container = document.getElementById(`division${dayNumber}-${division}-matches`);
        if (!container) continue;

        const finalPhase = dayData.pools.manualFinalPhase.divisions[division];

        if (!finalPhase || finalPhase.qualified.length === 0) continue;

        let html = generateManualFinalPhaseHTML(dayNumber, division, finalPhase);

        // Supprimer ancien affichage phase finale s'il existe
        const existingFinal = container.querySelector('.manual-final-phase-container');
        if (existingFinal) existingFinal.remove();

        // Ajouter après les poules si elles existent, sinon directement dans le conteneur
        const poolsContainer = container.querySelector('.pools-container');
        if (poolsContainer) {
            poolsContainer.insertAdjacentHTML('afterend', html);
        } else {
            // Mode élimination directe - pas de poules, ajouter directement
            container.insertAdjacentHTML('beforeend', html);
        }
    }
}

function generateManualFinalPhaseHTML(dayNumber, division, finalPhase) {
    const currentRound = championship.days[dayNumber].pools.manualFinalPhase.currentRound;
    const rounds = finalPhase.rounds;
    const isDirectMode = championship.days[dayNumber].pools.config?.mode === 'direct';

    // Adapter les textes selon le mode
    const headerTitle = isDirectMode ? '⚡ ÉLIMINATION DIRECTE' : '🏆 PHASE FINALE';
    const headerBg = isDirectMode ? 'linear-gradient(135deg, #9b59b6, #8e44ad)' : 'linear-gradient(135deg, #16a085, #1abc9c)';
    const playersTitle = isDirectMode ? '👥 Participants au Tournoi' : '✨ Joueurs Qualifiés des Poules';

    let html = `
        <div class="manual-final-phase-container" style="margin-top: 30px;">
            <div class="final-phase-header" style="
                background: ${headerBg};
                color: white;
                padding: 25px;
                border-radius: 15px;
                text-align: center;
                margin-bottom: 25px;
                box-shadow: 0 5px 15px rgba(142, 68, 173, 0.3);
            ">
                <h3 style="margin: 0 0 10px 0; font-size: 1.5rem;">
                    ${headerTitle} - Division ${division}
                </h3>
                <div style="font-size: 16px; opacity: 0.9;">
                    ${finalPhase.qualified.length} joueurs en compétition
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
                    ${playersTitle}
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
                            #${player.seed} ${player.name}${player.poolName && player.poolName !== '-' ? ` (${player.poolName})` : ''}
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
        <div class="manual-match ${match.isCollapsed ? 'collapsed' : ''}" style="
            background: ${isCompleted ? '#d5f4e6' : isActive ? 'white' : '#f8f9fa'};
            border: 2px solid ${isCompleted ? '#28a745' : isActive ? '#007bff' : '#6c757d'};
            border-radius: 10px;
            padding: 10px;
            position: relative;
            ${match.isBye ? 'opacity: 0.7;' : ''}
        ">
            ${!match.isBye && window.showForfaitButtons ? `<button onclick="event.stopPropagation(); deleteManualMatch(${dayNumber}, ${division}, '${roundName}', ${match.position})"
                    title="Supprimer ce match"
                    style="position: absolute; top: 50%; right: 5px; transform: translateY(-50%);
                           width: 18px; height: 18px; z-index: 10;
                           background: #e74c3c; color: white; border: none; border-radius: 50%;
                           font-size: 11px; cursor: pointer; line-height: 1; padding: 0;
                           opacity: 0.6; transition: opacity 0.2s;"
                    onmouseover="this.style.opacity='1'"
                    onmouseout="this.style.opacity='0.6'">×</button>` : ''}
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

                ${!isCompleted && window.showForfaitButtons ? `
                <div style="display: flex; gap: 4px; justify-content: center; margin-bottom: 8px;">
                    <button onclick="declareForfait('final', ${dayNumber}, ${division}, '${match.id}', 'player1')"
                            style="padding: 2px 6px; font-size: 10px; background: #e74c3c; color: white;
                                   border: none; border-radius: 3px; cursor: pointer;"
                            title="Forfait ${match.player1}">F1</button>
                    <button onclick="declareForfait('final', ${dayNumber}, ${division}, '${match.id}', 'player2')"
                            style="padding: 2px 6px; font-size: 10px; background: #e74c3c; color: white;
                                   border: none; border-radius: 3px; cursor: pointer;"
                            title="Forfait ${match.player2}">F2</button>
                </div>
                ` : ''}

                <div class="match-result" style="
                    text-align: center;
                    padding: 6px;
                    border-radius: 6px;
                    font-weight: bold;
                    background: ${isCompleted ? (match.forfaitBy ? '#fff3cd' : (match.winner === null ? '#e3f2fd' : '#d4edda')) : '#fff3cd'};
                    color: ${isCompleted ? (match.forfaitBy ? '#856404' : (match.winner === null ? '#1565c0' : '#155724')) : '#856404'};
                    font-size: 13px;
                ">
                    ${isCompleted && match.winner ? `${match.forfaitBy ? '⚠️' : '🏆'} ${match.winner} gagne${match.forfaitBy ? ' (forfait)' : ''} (${score1}-${score2})` :
                      isCompleted && match.winner === null ? `🤝 Match nul (${score1}-${score2})` : 'En attente des scores'}
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
        // Fallback: calculer nextRound si non défini (pour données créées avant correction)
        const nextRound = round.nextRound || getNextRoundName(roundName);
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
                // Annuler le forfait si les scores sont modifiés manuellement
                if (match.forfaitBy) {
                    delete match.forfaitBy;
                }
                // NE PAS régénérer le DOM ici pour permettre la navigation Tab naturelle
                // La régénération se fera dans handleManualMatchEnter quand le match est validé
                matchFound = true;
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
    console.log('🔵 handleManualMatchEnter appelé - Key:', event.key, 'MatchId:', matchId);

    const dayData = championship.days[dayNumber];
    const numDivisions = championship.config?.numberOfDivisions || 3;
    let match = null;
    let matchDivision = null;
    let matchRoundName = null;

    // Trouver le match
    for (let division = 1; division <= numDivisions; division++) {
        const rounds = dayData.pools.manualFinalPhase.divisions[division].rounds;
        for (const roundName in rounds) {
            match = rounds[roundName].matches.find(m => m.id === matchId);
            if (match) {
                matchDivision = division;
                matchRoundName = roundName;
                break;
            }
        }
        if (match) break;
    }

    if (!match) {
        console.log('❌ Match non trouvé');
        return;
    }

    // CORRECTION: Lire les valeurs directement depuis le DOM (pas depuis l'objet match)
    const currentInput = event.target;
    const matchContainer = currentInput.closest('.manual-match');
    if (!matchContainer) {
        console.log('❌ Container non trouvé');
        return;
    }

    const inputs = matchContainer.querySelectorAll('input[type="number"]');
    const input1 = inputs[0];
    const input2 = inputs[1];

    if (!input1 || !input2) {
        console.log('❌ Inputs non trouvés');
        return;
    }

    // Lire les valeurs actuelles du DOM
    const score1Value = input1.value.trim();
    const score2Value = input2.value.trim();
    console.log('📊 Scores du DOM:', score1Value, '-', score2Value);

    // Déterminer si on doit valider selon les valeurs du DOM
    const bothScoresFilled = score1Value !== '' && score2Value !== '';
    const shouldValidate = event.key === 'Enter' || (event.key === 'Tab' && bothScoresFilled);
    console.log('✅ Should validate:', shouldValidate, '(bothFilled:', bothScoresFilled, ')');

    if (shouldValidate) {
        // Si Tab sur scores incomplets, laisser la navigation naturelle
        if (event.key === 'Tab' && !bothScoresFilled) {
            console.log('⏩ Tab avec scores incomplets - navigation naturelle');
            return;
        }

        event.preventDefault();
        console.log('🛑 Validation du match...');

        // Mettre à jour les valeurs dans l'objet match AVANT de valider
        match.score1 = score1Value;
        match.score2 = score2Value;

        // Sauvegarder l'état AVANT régénération
        const wasCompleted = match.completed;

        // Vérifier la complétion du match
        checkManualMatchCompletion(match);

        // Vérifier si le tour est terminé (pour débloquer le suivant)
        if (matchDivision && matchRoundName) {
            checkRoundCompletion(dayNumber, matchDivision, matchRoundName);
        }

        // Auto-collapse le match qui vient d'être complété
        if (!wasCompleted && match.completed) {
            console.log('✂️ Auto-collapse du match:', matchId);
            match.isCollapsed = true;
        }

        // Rafraîchir l'affichage
        updateManualFinalPhaseDisplay(dayNumber);
        saveToLocalStorage();

        // Passer au match suivant
        setTimeout(() => {
            console.log('🔄 Navigation vers le match suivant...');
            // Trouver tous les inputs VISIBLES (matchs non collapsed)
            const visibleInputs = Array.from(
                document.querySelectorAll('.manual-match:not(.collapsed) input[type="number"]')
            );
            console.log('📝 Nombre d\'inputs visibles:', visibleInputs.length);

            // Trouver le prochain match non-complété
            let foundNext = false;
            for (let i = 0; i < visibleInputs.length; i++) {
                const inputMatchElement = visibleInputs[i].closest('.manual-match');
                const inputs = inputMatchElement?.querySelectorAll('input[type="number"]');

                if (inputs && inputs.length >= 2) {
                    const onchangeAttr = inputs[0].getAttribute('onchange');
                    const inputMatchId = onchangeAttr ? onchangeAttr.match(/'([^']+)'/)?.[1] : null;

                    // Si c'est un match différent (donc le match actuel est déjà collapsed et exclu)
                    if (inputMatchId && inputMatchId !== matchId) {
                        console.log('➡️ Focus sur le match suivant:', inputMatchId);
                        // Empêcher le scroll automatique
                        visibleInputs[i].focus({ preventScroll: true });
                        visibleInputs[i].select();
                        // Scroll doux vers l'élément seulement s'il n'est pas visible
                        visibleInputs[i].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        foundNext = true;
                        break;
                    }
                }
            }

            if (!foundNext) {
                console.log('✅ Tous les matchs sont terminés!');
            }
        }, 150);
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
        showNotification(`🏆 ${match.winner || 'Match nul'} remporte le match !`, 'success');
    } else if (wasCompleted && !match.completed) {
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
    const dayData = championship.days[dayNumber];
    const currentRound = dayData.pools.manualFinalPhase.divisions[division].rounds[currentRoundName];

    // Vérifier si tous les matchs sont terminés (fallback si completed non mis à jour)
    const allMatchesCompleted = currentRound.matches.every(m => m.completed);
    if (!currentRound.completed && !allMatchesCompleted) {
        alert('⚠️ Terminez d\'abord tous les matchs du tour actuel !');
        return;
    }

    // Fallback: calculer nextRound si non défini
    const nextRoundName = currentRound.nextRound || getNextRoundName(currentRoundName);
    if (!nextRoundName) {
        alert('⚠️ Pas de tour suivant défini !');
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
}

// ======================================
// GESTION FINALE ET PETITE FINALE
// ======================================

function generateFinale(dayNumber, division) {
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

    const numDivisions = championship.config?.numberOfDivisions || 3;
    for (let division = 1; division <= numDivisions; division++) {
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

// ======================================
// DÉTERMINATION DE L'ÉTAPE FINALE D'UN JOUEUR
// ======================================

/**
 * Détermine l'étape finale atteinte par un joueur pour une journée donnée
 * Retourne un objet avec:
 * - stageWeight: poids pour le tri (plus c'est élevé, meilleure est la performance)
 * - stageLabel: label textuel de l'étape
 * - position: position finale (1 = champion, 2 = finaliste, etc.)
 */
function getPlayerFinalStageForDay(playerName, dayNumber, division) {
    const dayData = championship.days[dayNumber];

    // Si pas de mode pool activé, retourner null (pas d'étape)
    if (!dayData || !dayData.pools || !dayData.pools.enabled) {
        return null;
    }

    const divisionPools = dayData.pools.divisions[division];
    if (!divisionPools) {
        return null;
    }

    // Vérifier si le joueur est dans cette division
    const players = dayData.players[division] || [];
    if (!players.includes(playerName)) {
        return null;
    }

    // Vérifier si le joueur a été qualifié pour la phase finale
    const manualFinalPhase = dayData.pools.manualFinalPhase;
    const isQualified = manualFinalPhase &&
                        manualFinalPhase.enabled &&
                        manualFinalPhase.divisions[division] &&
                        manualFinalPhase.divisions[division].qualified &&
                        manualFinalPhase.divisions[division].qualified.some(q => q.name === playerName);

    if (!isQualified) {
        // Joueur éliminé en phase de poules
        return {
            stageWeight: 10,
            stageLabel: 'Pool',
            position: 99
        };
    }

    // Joueur qualifié - déterminer à quelle étape il a été éliminé
    const finalPhase = manualFinalPhase.divisions[division];
    const rounds = finalPhase.rounds || {};

    // Ordre des rounds du moins avancé au plus avancé
    const roundsOrder = ["16èmes", "8èmes", "Quarts", "Demi-finales", "Petite finale", "Finale"];
    const roundWeights = {
        "16èmes": 40,
        "8èmes": 50,
        "Quarts": 60,
        "Demi-finales": 70,
        "Petite finale": 75,
        "Finale": 90
    };
    const roundPositions = {
        "16èmes": 17,      // 17-32
        "8èmes": 9,        // 9-16
        "Quarts": 5,       // 5-8
        "Demi-finales": 3, // 3-4 (avant petite finale)
        "Petite finale": 3, // 3-4
        "Finale": 2        // 1-2
    };

    let lastRoundPlayed = null;
    let isWinner = false;
    let lostInRound = null;

    // Parcourir les rounds pour trouver où le joueur a été éliminé
    for (const roundName of roundsOrder) {
        if (!rounds[roundName]) continue;

        const roundMatches = rounds[roundName].matches || [];
        for (const match of roundMatches) {
            if (match.player1 === playerName || match.player2 === playerName) {
                lastRoundPlayed = roundName;

                if (match.completed && match.winner) {
                    if (match.winner === playerName) {
                        isWinner = true;
                    } else {
                        // Joueur a perdu dans ce round
                        lostInRound = roundName;
                    }
                }
            }
        }
    }

    // Déterminer l'étape finale
    if (lostInRound === "Finale") {
        // Finaliste
        return {
            stageWeight: 90,
            stageLabel: 'Finaliste',
            position: 2
        };
    }

    if (lostInRound === "Petite finale") {
        // 4ème place
        return {
            stageWeight: 75,
            stageLabel: '4ème',
            position: 4
        };
    }

    // Vérifier si le joueur a gagné la petite finale (3ème)
    if (rounds["Petite finale"]) {
        const petiteFinaleMatches = rounds["Petite finale"].matches || [];
        for (const match of petiteFinaleMatches) {
            if (match.completed && match.winner === playerName) {
                return {
                    stageWeight: 80,
                    stageLabel: '3ème',
                    position: 3
                };
            }
        }
    }

    // Vérifier si le joueur a gagné la finale (Champion)
    if (rounds["Finale"]) {
        const finaleMatches = rounds["Finale"].matches || [];
        for (const match of finaleMatches) {
            if (match.completed && match.winner === playerName) {
                return {
                    stageWeight: 100,
                    stageLabel: 'Champion',
                    position: 1
                };
            }
        }
    }

    if (lostInRound === "Demi-finales") {
        // Perdant de demi-finale (3-4ème, en attendant petite finale)
        return {
            stageWeight: 70,
            stageLabel: 'Demi',
            position: 3
        };
    }

    if (lostInRound === "Quarts") {
        return {
            stageWeight: 60,
            stageLabel: 'Quart',
            position: 5
        };
    }

    if (lostInRound === "8èmes") {
        return {
            stageWeight: 50,
            stageLabel: '8ème',
            position: 9
        };
    }

    if (lostInRound === "16èmes") {
        return {
            stageWeight: 40,
            stageLabel: '16ème',
            position: 17
        };
    }

    // Joueur qualifié mais phase finale non terminée
    if (lastRoundPlayed) {
        return {
            stageWeight: roundWeights[lastRoundPlayed] || 30,
            stageLabel: 'En cours',
            position: roundPositions[lastRoundPlayed] || 10
        };
    }

    // Qualifié mais pas encore joué
    return {
        stageWeight: 30,
        stageLabel: 'Qualifié',
        position: 10
    };
}

/**
 * Récupère la meilleure étape atteinte par un joueur sur toutes les journées
 */
function getBestPlayerStage(playerName, division) {
    let bestStage = null;

    Object.keys(championship.days).forEach(dayNumber => {
        const dayNum = parseInt(dayNumber);
        const stage = getPlayerFinalStageForDay(playerName, dayNum, division);

        if (stage) {
            if (!bestStage || stage.stageWeight > bestStage.stageWeight) {
                bestStage = { ...stage, dayNumber: dayNum };
            }
        }
    });

    return bestStage;
}

function resetManualFinalPhase(dayNumber) {
    if (!confirm('⚠️ Supprimer toute la phase finale manuelle ?\n\nCela supprimera tous les matchs et résultats, mais conservera les poules.')) {
        return;
    }

    const numDivisions = championship.config?.numberOfDivisions || 3;
    const dayData = championship.days[dayNumber];
    if (dayData.pools && dayData.pools.manualFinalPhase) {
        dayData.pools.manualFinalPhase.enabled = false;
        dayData.pools.manualFinalPhase.currentRound = null;

        for (let division = 1; division <= numDivisions; division++) {
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
    for (let division = 1; division <= numDivisions; division++) {
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

    // ======================================
// FONCTION MANQUANTE - getQualifiedPlayersFromPools
// ======================================

function getQualifiedPlayersFromPools(pools, matches, qualifiedPerPool, advancedConfig = null) {
    // Calculer les statistiques pour tous les joueurs de toutes les poules
    const allPlayerStats = [];
    const poolRankings = []; // Classements par poule

    pools.forEach((pool, poolIndex) => {
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

        // Trier les joueurs de cette poule
        playerStats.sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.diff !== a.diff) return b.diff - a.diff;
            return b.pointsWon - a.pointsWon;
        });

        // Ajouter la position dans la poule
        playerStats.forEach((player, index) => {
            player.poolRank = index + 1;
        });

        poolRankings.push(playerStats);
        allPlayerStats.push(...playerStats);
    });

    const allQualified = [];

    // MODE AVANCÉ : Qualification hybride (top N par poule + meilleurs runners-up)
    if (advancedConfig && advancedConfig.topPerPool !== undefined) {
        const { topPerPool, bestRunnerUps, runnerUpPosition } = advancedConfig;

        // 1. Prendre les top N de chaque poule (qualifiés directs)
        poolRankings.forEach(poolStats => {
            const directQualified = poolStats.slice(0, topPerPool);
            directQualified.forEach(player => {
                player.qualificationMethod = `${player.poolRank}er de poule ${player.poolName}`;
                player.isDirect = true;
            });
            allQualified.push(...directQualified);
        });

        // 2. Si besoin de runners-up, collecter et trier
        if (bestRunnerUps > 0 && runnerUpPosition > 0) {
            const runnersUp = [];

            poolRankings.forEach(poolStats => {
                if (poolStats[runnerUpPosition - 1]) {
                    const runner = poolStats[runnerUpPosition - 1];
                    runner.qualificationMethod = `Meilleur ${runnerUpPosition}ème`;
                    runner.isDirect = false;
                    runnersUp.push(runner);
                }
            });

            // Trier tous les runners-up entre eux
            runnersUp.sort((a, b) => {
                if (b.points !== a.points) return b.points - a.points;
                if (b.diff !== a.diff) return b.diff - a.diff;
                return b.pointsWon - a.pointsWon;
            });

            // Prendre les meilleurs runners-up
            const bestRunners = runnersUp.slice(0, bestRunnerUps);
            allQualified.push(...bestRunners);
        }
    }
    // MODE SIMPLE : Qualification classique (top N de chaque poule)
    else {
        poolRankings.forEach(poolStats => {
            const qualified = poolStats.slice(0, qualifiedPerPool);
            qualified.forEach(player => {
                player.qualificationMethod = `${player.poolRank}er de poule ${player.poolName}`;
                player.isDirect = true;
            });
            allQualified.push(...qualified);
        });
    }

    // Attribuer les seeds globaux
    allQualified.forEach((player, index) => {
        player.seed = index + 1;
    });

    return allQualified;
}

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
                    font-size: 10px;
                    line-height: 1.3;
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
                    font-size: 20px;
                    font-weight: bold;
                    color: #2c3e50;
                    margin-bottom: 3px;
                }

                .page-subtitle {
                    font-size: 12px;
                    color: #666;
                }

                .tour-info {
                    background: #3498db;
                    color: white;
                    padding: 8px;
                    margin-bottom: 10px;
                    font-size: 16px;
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
                    padding: 6px 4px;
                    text-align: left;
                    font-size: 11px;
                    font-weight: bold;
                }

                .matches-table td {
                    padding: 8px 4px;
                    border-bottom: 1px solid #ddd;
                    font-size: 10px;
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
                    font-size: 9px;
                }

                .player-name {
                    font-weight: 600;
                }

                .score-cell {
                    width: 40px;
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
                    font-size: 10px;
                    line-height: 1.3;
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
                    font-size: 20px;
                    font-weight: bold;
                    color: #2c3e50;
                    margin-bottom: 3px;
                }

                .page-subtitle {
                    font-size: 12px;
                    color: #666;
                }

                .court-info {
                    background: #16a085;
                    color: white;
                    padding: 8px;
                    margin-bottom: 10px;
                    font-size: 16px;
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
                    padding: 6px 4px;
                    text-align: left;
                    font-size: 11px;
                    font-weight: bold;
                }

                .matches-table td {
                    padding: 8px 4px;
                    border-bottom: 1px solid #ddd;
                    font-size: 10px;
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
                    font-size: 9px;
                }

                .player-name {
                    font-weight: 600;
                }

                .score-cell {
                    width: 40px;
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
                    font-size: 10px;
                    line-height: 1.3;
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
                    font-size: 20px;
                    font-weight: bold;
                    color: #2c3e50;
                    margin-bottom: 3px;
                }

                .page-subtitle {
                    font-size: 12px;
                    color: #666;
                }

                .pool-info {
                    background: #3498db;
                    color: white;
                    padding: 8px;
                    margin-bottom: 10px;
                    font-size: 16px;
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
                    padding: 6px 4px;
                    text-align: left;
                    font-size: 11px;
                    font-weight: bold;
                }

                .matches-table td {
                    padding: 8px 4px;
                    border-bottom: 1px solid #ddd;
                    font-size: 10px;
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
                    font-size: 9px;
                }

                .player-name {
                    font-weight: 600;
                }

                .score-cell {
                    width: 40px;
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
