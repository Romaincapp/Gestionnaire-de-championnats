// ============================================
// MODULE CLUBS - Gestion des clubs pour les joueurs
// ============================================
(function(global) {
    'use strict';

    var championship = global.championship;
    var showNotification = global.showNotification;
    var saveToLocalStorage = global.saveToLocalStorage;
    var formatProperName = global.formatProperName;

    // ============================================
    // CONFIGURATION
    // ============================================

    // Liste des clubs prédéfinis (peut être étendue)
    var DEFAULT_CLUBS = [
        'Club A', 'Club B', 'Club C', 'Club D', 'Club E',
        'Club F', 'Club G', 'Club H', 'Club I', 'Club J'
    ];

    // Clé pour stocker les clubs personnalisés
    var CLUBS_STORAGE_KEY = 'customClubsList';

    // ============================================
    // GESTION DE LA LISTE DES CLUBS
    // ============================================

    function getClubsList() {
        try {
            var saved = localStorage.getItem(CLUBS_STORAGE_KEY);
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.warn('Erreur chargement clubs:', e);
        }
        return [...DEFAULT_CLUBS];
    }

    function saveClubsList(clubs) {
        try {
            localStorage.setItem(CLUBS_STORAGE_KEY, JSON.stringify(clubs));
        } catch (e) {
            console.warn('Erreur sauvegarde clubs:', e);
        }
    }

    function addClub(clubName) {
        if (!clubName || !clubName.trim()) return false;
        
        var clubs = getClubsList();
        var normalized = clubName.trim();
        
        if (clubs.includes(normalized)) return false;
        
        clubs.push(normalized);
        saveClubsList(clubs);
        return true;
    }

    function removeClub(clubName) {
        var clubs = getClubsList();
        var index = clubs.indexOf(clubName);
        if (index > -1) {
            clubs.splice(index, 1);
            saveClubsList(clubs);
            return true;
        }
        return false;
    }

    // ============================================
    // GÉNÉRATION DES OPTIONS DE SÉLECTION
    // ============================================

    function generateClubOptions(selectedClub) {
        var clubs = getClubsList();
        var html = '<option value="">-- Sélectionner un club --</option>';
        
        clubs.forEach(function(club) {
            var selected = club === selectedClub ? ' selected' : '';
            html += '<option value="' + escapeHtml(club) + '"' + selected + '>' + escapeHtml(club) + '</option>';
        });
        
        html += '<option value="__custom__">+ Ajouter un nouveau club...</option>';
        return html;
    }

    function generateClubInputHtml(inputId, selectId, selectedClub) {
        var html = '<div style="margin: 15px 0;">';
        html += '<label>Club :</label>';
        html += '<select id="' + selectId + '" onchange="handleClubSelectChange(this, \'' + inputId + '\')" style="width: 100%; padding: 10px; margin-top: 5px; border-radius: 6px; border: 1px solid #ddd;">';
        html += generateClubOptions(selectedClub);
        html += '</select>';
        html += '<input type="text" id="' + inputId + '" style="width: 100%; padding: 10px; margin-top: 5px; border-radius: 6px; border: 1px solid #ddd; display: none;" placeholder="Nom du nouveau club">';
        html += '</div>';
        return html;
    }

    // ============================================
    // UTILITAIRES
    // ============================================

    function escapeHtml(text) {
        if (!text) return '';
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ============================================
    // MIGRATION DES DONNÉES EXISTANTES
    // ============================================

    function migratePlayerData() {
        var migrated = false;
        
        Object.keys(championship.days).forEach(function(dayNumber) {
            var dayData = championship.days[dayNumber];
            if (!dayData || !dayData.players) return;
            
            for (var div = 1; div <= (global.config?.numberOfDivisions || 3); div++) {
                var players = dayData.players[div];
                if (!players || !Array.isArray(players)) continue;
                
                dayData.players[div] = players.map(function(player) {
                    // Si c'est déjà un objet, on le garde
                    if (typeof player === 'object' && player !== null && player.name) {
                        // S'assurer que club existe
                        if (!player.club) player.club = '';
                        return player;
                    }
                    // Sinon, on convertit la chaîne en objet
                    migrated = true;
                    return {
                        name: String(player),
                        club: ''
                    };
                });
            }
        });
        
        if (migrated) {
            saveToLocalStorage();
            console.log('Migration des joueurs vers format avec club terminée');
        }
        
        return migrated;
    }

    // ============================================
    // FONCTIONS D'AIDE POUR LES JOUEURS
    // ============================================

    function createPlayerObject(name, club) {
        return {
            name: formatProperName(name),
            club: club ? club.trim() : ''
        };
    }

    function getPlayerName(player) {
        if (typeof player === 'string') return player;
        if (typeof player === 'object' && player !== null) {
            return player.name || '';
        }
        return String(player);
    }

    function getPlayerClub(player) {
        if (typeof player === 'object' && player !== null) {
            return player.club || '';
        }
        return '';
    }

    function getPlayerFullDisplay(player) {
        var name = getPlayerName(player);
        var club = getPlayerClub(player);
        
        if (club) {
            return name + ' <span style="color: #7f8c8d; font-size: 0.85em;">(' + escapeHtml(club) + ')</span>';
        }
        return name;
    }

    function getPlayerDisplayName(player) {
        return getPlayerName(player);
    }

    // ============================================
    // RECHERCHE DE JOUEURS
    // ============================================

    function findPlayerByName(dayNumber, division, playerName) {
        var dayData = championship.days[dayNumber];
        if (!dayData || !dayData.players[division]) return null;
        
        return dayData.players[division].find(function(p) {
            return getPlayerName(p).toLowerCase() === playerName.toLowerCase();
        });
    }

    function playerExists(dayNumber, division, playerName) {
        return findPlayerByName(dayNumber, division, playerName) !== null;
    }

    // ============================================
    // STATISTIQUES PAR CLUB
    // ============================================

    function getClubsStats(dayNumber) {
        var stats = {};
        var dayData = championship.days[dayNumber];
        
        if (!dayData || !dayData.players) return stats;
        
        for (var div = 1; div <= (global.config?.numberOfDivisions || 3); div++) {
            var players = dayData.players[div] || [];
            
            players.forEach(function(player) {
                var club = getPlayerClub(player);
                var name = getPlayerName(player);
                
                if (!club) return; // Ignorer les joueurs sans club
                
                if (!stats[club]) {
                    stats[club] = {
                        club: club,
                        players: [],
                        totalPoints: 0,
                        matchesWon: 0,
                        matchesPlayed: 0
                    };
                }
                
                stats[club].players.push({
                    name: name,
                    division: div
                });
            });
        }
        
        // Ajouter les stats des matchs si disponible
        if (dayData.matches) {
            for (var div = 1; div <= (global.config?.numberOfDivisions || 3); div++) {
                var matches = dayData.matches[div] || [];
                
                matches.forEach(function(match) {
                    if (!match.completed) return;
                    
                    var p1Club = getPlayerClubByName(dayNumber, div, match.player1);
                    var p2Club = getPlayerClubByName(dayNumber, div, match.player2);
                    
                    if (p1Club && stats[p1Club]) {
                        stats[p1Club].matchesPlayed++;
                        if (match.winner === match.player1) {
                            stats[p1Club].matchesWon++;
                            stats[p1Club].totalPoints += 3;
                        }
                    }
                    
                    if (p2Club && stats[p2Club]) {
                        stats[p2Club].matchesPlayed++;
                        if (match.winner === match.player2) {
                            stats[p2Club].matchesWon++;
                            stats[p2Club].totalPoints += 3;
                        }
                    }
                });
            }
        }
        
        return stats;
    }

    function getPlayerClubByName(dayNumber, division, playerName) {
        var player = findPlayerByName(dayNumber, division, playerName);
        return player ? getPlayerClub(player) : '';
    }

    // ============================================
    // INTERFACE UTILISATEUR
    // ============================================

    function showClubManagementModal() {
        if (document.getElementById('clubManagementModal')) return;
        
        var clubs = getClubsList();
        
        var html = '<div id="clubManagementModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; ' +
            'background: rgba(0,0,0,0.5); display: flex; justify-content: center; ' +
            'align-items: center; z-index: 10000;" onclick="if(event.target===this)closeClubManagementModal()">' +
            '<div style="background: white; padding: 30px; border-radius: 10px; max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto;">' +
            '<h3>🏢 Gestion des Clubs</h3>' +
            '<p style="color: #7f8c8d; font-size: 13px; margin-bottom: 15px;">Gérez la liste des clubs disponibles pour l\'attribution des joueurs.</p>' +
            '<div style="margin: 15px 0;">' +
            '<div style="display: flex; gap: 10px;">' +
            '<input type="text" id="newClubName" style="flex: 1; padding: 10px; border-radius: 6px; border: 1px solid #ddd;" placeholder="Nom du nouveau club">' +
            '<button onclick="addNewClubFromModal()" class="btn btn-primary">+ Ajouter</button>' +
            '</div>' +
            '</div>' +
            '<div id="clubsList" style="margin: 20px 0;">' +
            renderClubsList(clubs) +
            '</div>' +
            '<div style="display: flex; gap: 10px; justify-content: flex-end;">' +
            '<button onclick="closeClubManagementModal()" class="btn btn-secondary">Fermer</button>' +
            '</div></div></div>';
        
        document.body.insertAdjacentHTML('beforeend', html);
    }

    function renderClubsList(clubs) {
        if (clubs.length === 0) {
            return '<p style="color: #7f8c8d; text-align: center;">Aucun club défini</p>';
        }
        
        var html = '<ul style="list-style: none; padding: 0; margin: 0;">';
        clubs.forEach(function(club) {
            html += '<li style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #ecf0f1;">' +
                '<span>' + escapeHtml(club) + '</span>' +
                '<button onclick="removeClubFromModal(\'' + escapeHtml(club) + '\')" class="btn btn-sm btn-danger" style="padding: 4px 8px;">🗑️</button>' +
                '</li>';
        });
        html += '</ul>';
        return html;
    }

    function closeClubManagementModal() {
        var modal = document.getElementById('clubManagementModal');
        if (modal) modal.remove();
    }

    function addNewClubFromModal() {
        var input = document.getElementById('newClubName');
        if (!input || !input.value.trim()) {
            showNotification('Veuillez entrer un nom de club', 'warning');
            return;
        }
        
        if (addClub(input.value.trim())) {
            showNotification('Club ajouté !', 'success');
            input.value = '';
            
            // Rafraîchir la liste
            var listContainer = document.getElementById('clubsList');
            if (listContainer) {
                listContainer.innerHTML = renderClubsList(getClubsList());
            }
        } else {
            showNotification('Ce club existe déjà', 'warning');
        }
    }

    function removeClubFromModal(clubName) {
        if (!confirm('Supprimer le club "' + clubName + '" ?\n\nLes joueurs déjà assignés à ce club conserveront leur affiliation.')) {
            return;
        }
        
        if (removeClub(clubName)) {
            showNotification('Club supprimé', 'info');
            
            // Rafraîchir la liste
            var listContainer = document.getElementById('clubsList');
            if (listContainer) {
                listContainer.innerHTML = renderClubsList(getClubsList());
            }
        }
    }

    // ============================================
    // EXPOSITION SUR WINDOW
    // ============================================

    global.clubsModule = {
        getClubsList: getClubsList,
        addClub: addClub,
        removeClub: removeClub,
        generateClubOptions: generateClubOptions,
        generateClubInputHtml: generateClubInputHtml,
        migratePlayerData: migratePlayerData,
        createPlayerObject: createPlayerObject,
        getPlayerName: getPlayerName,
        getPlayerClub: getPlayerClub,
        getPlayerFullDisplay: getPlayerFullDisplay,
        getPlayerDisplayName: getPlayerDisplayName,
        findPlayerByName: findPlayerByName,
        playerExists: playerExists,
        getClubsStats: getClubsStats,
        getPlayerClubByName: getPlayerClubByName
    };

    // Fonctions exposées directement
    global.showClubManagementModal = showClubManagementModal;
    global.closeClubManagementModal = closeClubManagementModal;
    global.addNewClubFromModal = addNewClubFromModal;
    global.removeClubFromModal = removeClubFromModal;
    global.handleClubSelectChange = function(select, inputId) {
        var input = document.getElementById(inputId);
        if (!input) return;
        
        if (select.value === '__custom__') {
            input.style.display = 'block';
            input.focus();
        } else {
            input.style.display = 'none';
            input.value = '';
        }
    };

})(window);
