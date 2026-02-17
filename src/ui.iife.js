// ============================================
// MODULE UI GÉNÉRAL - Gestion des onglets et navigation
// ============================================
(function(global) {
    'use strict';

    var championship = global.championship;
    var showNotification = global.showNotification;
    var saveToLocalStorage = global.saveToLocalStorage;

    // ============================================
    // GESTION DES ONGLETS ET JOURNÉES
    // ============================================

    // switchTab est défini dans script.js avec gestion complète des styles inline
    // Ne PAS redéfinir ici pour éviter les conflits
    function switchTab(dayNumber) {
        // Déléguer à la version de script.js si disponible
        if (global.switchTab && global.switchTab !== switchTab) {
            return global.switchTab(dayNumber);
        }
        // Fallback minimal si script.js n'est pas encore chargé
        championship.currentDay = dayNumber;
        document.querySelectorAll('.tab').forEach(function(tab) {
            tab.classList.remove('active');
            if (parseInt(tab.dataset.day) === dayNumber) {
                tab.classList.add('active');
            }
        });
        document.querySelectorAll('.tab-content').forEach(function(content) {
            content.classList.remove('active');
            content.style.display = 'none';
        });
        var dayContent = document.getElementById('day-' + dayNumber);
        if (dayContent) {
            dayContent.classList.add('active');
            dayContent.style.display = 'block';
        }
    }

    function switchToGeneralRanking() {
        // Mettre à jour l'onglet actif
        document.querySelectorAll('.tab').forEach(function(tab) {
            tab.classList.remove('active');
        });
        
        var generalTab = document.querySelector('.tab[data-tab="general"]');
        if (generalTab) {
            generalTab.classList.add('active');
        }
        
        // Masquer tous les contenus de journée
        document.querySelectorAll('.tab-content').forEach(function(content) {
            content.classList.remove('active');
        });
        
        // Afficher le classement général
        var generalContent = document.getElementById('general-ranking');
        if (generalContent) {
            generalContent.classList.add('active');
        }
        
        // Mettre à jour le classement
        if (typeof updateGeneralRanking === 'function') {
            updateGeneralRanking();
        }
    }

    function addNewDay() {
        var dayNumbers = Object.keys(championship.days).map(Number);
        var maxDay = Math.max(...dayNumbers);
        var newDayNumber = maxDay + 1;
        
        if (newDayNumber > 20) {
            showNotification('Maximum 20 journées autorisées', 'warning');
            return;
        }
        
        // Créer la nouvelle journée
        championship.days[newDayNumber] = {
            players: global.initializeDivisions(global.config.numberOfDivisions),
            matches: global.initializeDivisions(global.config.numberOfDivisions)
        };
        
        saveToLocalStorage();
        
        // Créer l'onglet
        createDayTab(newDayNumber);
        
        // Créer le contenu
        if (typeof createDayContent === 'function') {
            createDayContent(newDayNumber);
        }
        
        showNotification('Journée ' + newDayNumber + ' créée avec succès !', 'success');
        
        // Passer à la nouvelle journée
        switchTab(newDayNumber);
    }

    function createDayTab(dayNumber) {
        var tabsContainer = document.getElementById('tabs');
        if (!tabsContainer) return;
        
        // Créer le nouvel onglet
        var newTab = document.createElement('button');
        newTab.className = 'tab';
        newTab.dataset.day = dayNumber;
        newTab.onclick = function() { switchTab(dayNumber); };
        newTab.innerHTML = 'Journée ' + dayNumber;
        
        // Insérer avant le bouton "+" et le classement général
        var addButton = tabsContainer.querySelector('.add-day-btn');
        if (addButton) {
            tabsContainer.insertBefore(newTab, addButton);
        } else {
            tabsContainer.appendChild(newTab);
        }
    }

    function removeDay(dayNumber) {
        if (dayNumber === 1) {
            showNotification('Impossible de supprimer la première journée', 'error');
            return;
        }
        
        if (!confirm('Êtes-vous sûr de vouloir supprimer la Journée ' + dayNumber + ' ?\n\nCette action est irréversible.')) {
            return;
        }
        
        // Supprimer les données
        delete championship.days[dayNumber];
        
        // Supprimer l'onglet
        var tab = document.querySelector('.tab[data-day="' + dayNumber + '"]');
        if (tab) {
            tab.remove();
        }
        
        // Supprimer le contenu
        var content = document.getElementById('day-' + dayNumber);
        if (content) {
            content.remove();
        }
        
        saveToLocalStorage();
        
        // Passer à la journée 1
        switchTab(1);
        
        showNotification('Journée ' + dayNumber + ' supprimée', 'info');
    }

    // ============================================
    // MODALES GÉNÉRALES
    // ============================================

    function closeModal(modalId) {
        var modal = document.getElementById(modalId);
        if (modal) {
            modal.remove();
        }
    }

    function closeImportModal() {
        closeModal('importModal');
    }

    function showImportModal() {
        // Vérifier si la modale existe déjà
        if (document.getElementById('importModal')) {
            return;
        }
        
        var modal = document.createElement('div');
        modal.id = 'importModal';
        modal.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                        background: rgba(0,0,0,0.5); display: flex; justify-content: center; 
                        align-items: center; z-index: 10000;" onclick="if(event.target===this)closeImportModal()">
                <div style="background: white; padding: 30px; border-radius: 10px; max-width: 500px; width: 90%;">
                    <h3>📥 Importer des données</h3>
                    <p>Collez les données JSON du championnat :</p>
                    <textarea id="importData" style="width: 100%; height: 150px; margin: 10px 0; padding: 10px;"></textarea>
                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button onclick="closeImportModal()" class="btn btn-secondary">Annuler</button>
                        <button onclick="processImport()" class="btn btn-primary">Importer</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    function processImport() {
        // Déléguer à la version de script.js si disponible (import par fichier)
        if (global.processImport && global.processImport !== processImport) {
            return global.processImport();
        }

        // Fallback: import par textarea (si script.js pas encore chargé)
        var textarea = document.getElementById('importData');
        if (!textarea) return;

        try {
            var data = JSON.parse(textarea.value);

            if (!data.days || !data.config) {
                throw new Error('Format de données invalide');
            }

            // Confirmer si des données existent
            if (Object.keys(championship.days).length > 0) {
                if (!confirm('Des données existent déjà. Voulez-vous les remplacer ?')) {
                    return;
                }
            }

            // IMPORTANT: Modifier l'objet EN PLACE pour préserver les références
            Object.keys(championship).forEach(function(key) { delete championship[key]; });
            Object.assign(championship, {
                days: data.days,
                config: data.config,
                currentDay: 1
            });

            // Mettre à jour la config globale
            global.config = { ...data.config };

            saveToLocalStorage();

            showNotification('Données importées avec succès !', 'success');

            // Recharger la page pour appliquer les changements
            setTimeout(function() {
                location.reload();
            }, 1000);

        } catch (error) {
            showNotification('Erreur lors de l\'import : ' + error.message, 'error');
        }
    }

    function clearAllData() {
        // Déléguer à la version de script.js si disponible
        if (global.clearAllData && global.clearAllData !== clearAllData) {
            return global.clearAllData();
        }

        if (!confirm('⚠️ ATTENTION ⚠️\n\nCela va supprimer TOUTES les données du championnat.\n\nCette action est irréversible.\n\nÊtes-vous sûr ?')) {
            return;
        }

        if (!confirm('Dernière confirmation :\n\nVoulez-vous vraiment tout supprimer ?')) {
            return;
        }

        // IMPORTANT: Modifier l'objet EN PLACE pour préserver les références
        Object.keys(championship).forEach(function(key) { delete championship[key]; });
        Object.assign(championship, {
            currentDay: 1,
            config: { ...global.DEFAULT_CONFIG },
            days: {
                1: {
                    players: global.initializeDivisions(global.config.numberOfDivisions),
                    matches: global.initializeDivisions(global.config.numberOfDivisions)
                }
            }
        });

        // Supprimer du localStorage
        localStorage.removeItem('tennisTableChampionship');

        showNotification('Toutes les données ont été supprimées', 'info');

        // Recharger la page
        setTimeout(function() {
            location.reload();
        }, 1000);
    }

    // ============================================
    // GESTION DES HUBS (SECTIONS REPLIABLES)
    // ============================================

    function toggleDayHub(dayNumber) {
        var hub = document.getElementById('day-hub-' + dayNumber);
        if (hub) {
            hub.style.display = hub.style.display === 'none' ? 'block' : 'none';
        }
    }

    function toggleGeneralHub() {
        var hub = document.getElementById('general-hub');
        if (hub) {
            hub.style.display = hub.style.display === 'none' ? 'block' : 'none';
        }
    }

    // ============================================
    // MODALES JOUEURS
    // ============================================

    function showAddPlayerModal(dayNumber) {
        if (document.getElementById('addPlayerModal')) return;
        
        var modal = document.createElement('div');
        modal.id = 'addPlayerModal';
        modal.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                        background: rgba(0,0,0,0.5); display: flex; justify-content: center; 
                        align-items: center; z-index: 10000;" onclick="if(event.target===this)closeAddPlayerModal()">
                <div style="background: white; padding: 30px; border-radius: 10px; max-width: 400px; width: 90%;">
                    <h3>➕ Ajouter un joueur</h3>
                    <div style="margin: 15px 0;">
                        <label>Nom du joueur :</label>
                        <input type="text" id="modalPlayerName" style="width: 100%; padding: 10px; margin-top: 5px;" 
                               placeholder="Nom Prénom" onkeydown="if(event.key==='Enter')addPlayerFromModal()">
                    </div>
                    <div style="margin: 15px 0;">
                        <label>Division :</label>
                        <select id="modalPlayerDivision" style="width: 100%; padding: 10px; margin-top: 5px;">
                            ${generateDivisionOptions()}
                        </select>
                    </div>
                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button onclick="closeAddPlayerModal()" class="btn btn-secondary">Annuler</button>
                        <button onclick="addPlayerFromModal()" class="btn btn-primary">Ajouter</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Focus sur le champ
        setTimeout(function() {
            var input = document.getElementById('modalPlayerName');
            if (input) input.focus();
        }, 100);
    }

    function closeAddPlayerModal() {
        closeModal('addPlayerModal');
    }

    function addPlayerFromModal() {
        var nameInput = document.getElementById('modalPlayerName');
        var divisionSelect = document.getElementById('modalPlayerDivision');
        
        if (!nameInput || !divisionSelect) return;
        
        var name = nameInput.value.trim();
        var division = parseInt(divisionSelect.value);
        
        if (!name) {
            showNotification('Veuillez entrer un nom', 'warning');
            return;
        }
        
        // Utiliser la fonction existante
        var currentDay = championship.currentDay;
        var formattedName = global.formatProperName(name);
        
        if (!championship.days[currentDay]) {
            championship.days[currentDay] = {
                players: global.initializeDivisions(global.config.numberOfDivisions),
                matches: global.initializeDivisions(global.config.numberOfDivisions)
            };
        }
        
        if (championship.days[currentDay].players[division].includes(formattedName)) {
            showNotification('Ce joueur existe déjà', 'warning');
            return;
        }
        
        championship.days[currentDay].players[division].push(formattedName);
        saveToLocalStorage();
        
        if (typeof updatePlayersDisplay === 'function') updatePlayersDisplay(currentDay);
        if (typeof updatePlayerCount === 'function') updatePlayerCount(currentDay);
        
        showNotification(formattedName + ' ajouté !', 'success');
        
        nameInput.value = '';
        nameInput.focus();
    }

    function generateDivisionOptions() {
        var options = '';
        for (var i = 1; i <= global.config.numberOfDivisions; i++) {
            options += '<option value="' + i + '">Division ' + i + '</option>';
        }
        return options;
    }

    // ============================================
    // MODALES BULK
    // ============================================

    function showBulkInput() {
        if (document.getElementById('bulkModal')) return;
        
        var modal = document.createElement('div');
        modal.id = 'bulkModal';
        modal.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                        background: rgba(0,0,0,0.5); display: flex; justify-content: center; 
                        align-items: center; z-index: 10000;" onclick="if(event.target===this)closeBulkModal()">
                <div style="background: white; padding: 30px; border-radius: 10px; max-width: 500px; width: 90%;">
                    <h3>📋 Ajouter plusieurs joueurs</h3>
                    <p>Entrez les noms (un par ligne, ou séparés par virgule/point-virgule) :</p>
                    <textarea id="bulkPlayers" style="width: 100%; height: 200px; margin: 10px 0; padding: 10px;"></textarea>
                    <div style="margin: 10px 0;">
                        <label>Division :</label>
                        <select id="bulkDivision" style="width: 100%; padding: 8px; margin-top: 5px;">
                            ${generateDivisionOptions()}
                        </select>
                    </div>
                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button onclick="closeBulkModal()" class="btn btn-secondary">Annuler</button>
                        <button onclick="addBulkPlayers()" class="btn btn-primary">Ajouter</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    function closeBulkModal() {
        closeModal('bulkModal');
    }

    // ============================================
    // EXPOSITION SUR WINDOW
    // ============================================

    global.switchTab = switchTab;
    global.switchToGeneralRanking = switchToGeneralRanking;
    global.addNewDay = addNewDay;
    global.removeDay = removeDay;
    global.createDayTab = createDayTab;
    global.closeModal = closeModal;
    global.closeImportModal = closeImportModal;
    global.showImportModal = showImportModal;
    global.processImport = processImport;
    global.clearAllData = clearAllData;
    global.toggleDayHub = toggleDayHub;
    global.toggleGeneralHub = toggleGeneralHub;
    global.showAddPlayerModal = showAddPlayerModal;
    global.closeAddPlayerModal = closeAddPlayerModal;
    global.addPlayerFromModal = addPlayerFromModal;
    global.showBulkInput = showBulkInput;
    global.closeBulkModal = closeBulkModal;

})(window);
