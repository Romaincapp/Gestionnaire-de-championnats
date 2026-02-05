// ============================================
// MODULE GESTION DES JOUEURS
// ============================================

import { championship, saveToLocalStorage, showForfaitButtons } from './state.js';
import { showNotification } from './notifications.js';
import { formatProperName } from './utils.js';
import { config, initializeDivisions, getCourtsForDivision } from './config.js';

/**
 * Ajoute un joueur au championnat
 */
export function addPlayer() {
    const input = document.getElementById('playerName');
    const divisionSelect = document.getElementById('playerDivision');
    
    if (!input || !divisionSelect) return;
    
    const name = input.value.trim();
    const division = parseInt(divisionSelect.value);
    
    if (!name) {
        showNotification('Veuillez entrer un nom de joueur', 'warning');
        return;
    }
    
    const formattedName = formatProperName(name);
    const currentDay = championship.currentDay;
    
    // Initialiser la structure si nécessaire
    if (!championship.days[currentDay]) {
        championship.days[currentDay] = {
            players: initializeDivisions(config.numberOfDivisions),
            matches: initializeDivisions(config.numberOfDivisions)
        };
    }
    
    // Vérifier si le joueur existe déjà dans cette division
    if (championship.days[currentDay].players[division].includes(formattedName)) {
        showNotification('Ce joueur existe déjà dans cette division', 'warning');
        return;
    }
    
    // Ajouter le joueur
    championship.days[currentDay].players[division].push(formattedName);
    
    // Sauvegarder et mettre à jour l'affichage
    saveToLocalStorage();
    input.value = '';
    
    if (typeof updatePlayersDisplay === 'function') {
        updatePlayersDisplay(currentDay);
    }
    if (typeof updateMatchesDisplay === 'function') {
        updateMatchesDisplay(currentDay);
    }
    if (typeof updatePlayerCount === 'function') {
        updatePlayerCount(currentDay);
    }
    
    showNotification(`${formattedName} ajouté à la Division ${division}`, 'success');
}

/**
 * Ajoute un joueur à une journée spécifique
 */
export function addPlayerToDay(dayNumber) {
    const input = document.getElementById(`player-name-day-${dayNumber}`);
    const divisionSelect = document.getElementById(`player-division-day-${dayNumber}`);
    
    if (!input || !divisionSelect) return;
    
    const name = input.value.trim();
    const division = parseInt(divisionSelect.value);
    
    if (!name) {
        showNotification('Veuillez entrer un nom de joueur', 'warning');
        return;
    }
    
    const formattedName = formatProperName(name);
    
    // Initialiser la structure si nécessaire
    if (!championship.days[dayNumber]) {
        championship.days[dayNumber] = {
            players: initializeDivisions(config.numberOfDivisions),
            matches: initializeDivisions(config.numberOfDivisions)
        };
    }
    
    // Vérifier si le joueur existe déjà
    if (championship.days[dayNumber].players[division].includes(formattedName)) {
        showNotification('Ce joueur existe déjà dans cette division', 'warning');
        return;
    }
    
    // Ajouter le joueur
    championship.days[dayNumber].players[division].push(formattedName);
    
    saveToLocalStorage();
    input.value = '';
    
    if (typeof updatePlayersDisplay === 'function') {
        updatePlayersDisplay(dayNumber);
    }
    if (typeof updateMatchesDisplay === 'function') {
        updateMatchesDisplay(dayNumber);
    }
    if (typeof updatePlayerCount === 'function') {
        updatePlayerCount(dayNumber);
    }
    
    showNotification(`${formattedName} ajouté à la Division ${division}`, 'success');
}

/**
 * Supprime un joueur
 */
export function removePlayer(dayNumber, division, index) {
    if (!championship.days[dayNumber]) return;
    
    const players = championship.days[dayNumber].players[division];
    if (!players || !players[index]) return;
    
    const playerName = players[index];
    
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${playerName} ?`)) {
        return;
    }
    
    // Supprimer le joueur
    players.splice(index, 1);
    
    // Supprimer les matchs associés
    if (championship.days[dayNumber].matches[division]) {
        championship.days[dayNumber].matches[division] = 
            championship.days[dayNumber].matches[division].filter(
                match => match.player1 !== playerName && match.player2 !== playerName
            );
    }
    
    saveToLocalStorage();
    
    if (typeof updatePlayersDisplay === 'function') {
        updatePlayersDisplay(dayNumber);
    }
    if (typeof updateMatchesDisplay === 'function') {
        updateMatchesDisplay(dayNumber);
    }
    if (typeof updatePlayerCount === 'function') {
        updatePlayerCount(dayNumber);
    }
    if (typeof updateRankings === 'function') {
        updateRankings();
    }
    
    showNotification(`${playerName} a été supprimé`, 'info');
}

/**
 * Modifie un joueur
 */
export function editPlayer(dayNumber, division, index) {
    if (!championship.days[dayNumber]) return;
    
    const players = championship.days[dayNumber].players[division];
    if (!players || !players[index]) return;
    
    const oldName = players[index];
    const newName = prompt(`Modifier le nom de ${oldName}:`, oldName);
    
    if (!newName || newName.trim() === '' || newName.trim() === oldName) {
        return;
    }
    
    const formattedNewName = formatProperName(newName.trim());
    
    // Vérifier si le nouveau nom existe déjà
    if (players.includes(formattedNewName)) {
        showNotification('Ce nom existe déjà', 'error');
        return;
    }
    
    // Mettre à jour le nom dans les matchs
    if (championship.days[dayNumber].matches[division]) {
        championship.days[dayNumber].matches[division].forEach(match => {
            if (match.player1 === oldName) match.player1 = formattedNewName;
            if (match.player2 === oldName) match.player2 = formattedNewName;
            if (match.winner === oldName) match.winner = formattedNewName;
            if (match.forfaitBy === oldName) match.forfaitBy = formattedNewName;
        });
    }
    
    // Mettre à jour le nom dans la liste
    players[index] = formattedNewName;
    
    saveToLocalStorage();
    
    if (typeof updatePlayersDisplay === 'function') {
        updatePlayersDisplay(dayNumber);
    }
    if (typeof updateMatchesDisplay === 'function') {
        updateMatchesDisplay(dayNumber);
    }
    if (typeof updateRankings === 'function') {
        updateRankings();
    }
    
    showNotification(`Joueur renommé en ${formattedNewName}`, 'success');
}

/**
 * Vérifie si un joueur a un match BYE
 */
export function playerHasByeMatch(dayNumber, division, playerName) {
    const dayData = championship.days[dayNumber];
    if (!dayData) return false;
    
    // Helper pour vérifier si un nom est un BYE (exact ou commence par 'BYE')
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
    
    return false;
}

/**
 * Ajoute plusieurs joueurs en bulk
 */
export function addBulkPlayers() {
    const textarea = document.getElementById('bulkPlayers');
    const divisionSelect = document.getElementById('bulkDivision');
    
    if (!textarea || !divisionSelect) return;
    
    const rawText = textarea.value;
    const division = parseInt(divisionSelect.value);
    const dayNumber = championship.currentDay;
    
    // Parser les noms (séparés par nouvelle ligne, virgule, ou point-virgule)
    const names = rawText
        .split(/[\n,;]/)
        .map(n => n.trim())
        .filter(n => n.length > 0)
        .map(formatProperName);
    
    if (names.length === 0) {
        showNotification('Aucun nom valide trouvé', 'warning');
        return;
    }
    
    // Initialiser la structure si nécessaire
    if (!championship.days[dayNumber]) {
        championship.days[dayNumber] = {
            players: initializeDivisions(config.numberOfDivisions),
            matches: initializeDivisions(config.numberOfDivisions)
        };
    }
    
    const existingPlayers = championship.days[dayNumber].players[division];
    let addedCount = 0;
    let duplicateCount = 0;
    
    names.forEach(name => {
        if (!existingPlayers.includes(name)) {
            existingPlayers.push(name);
            addedCount++;
        } else {
            duplicateCount++;
        }
    });
    
    saveToLocalStorage();
    textarea.value = '';
    
    if (typeof closeBulkModal === 'function') {
        closeBulkModal();
    }
    if (typeof updatePlayersDisplay === 'function') {
        updatePlayersDisplay(dayNumber);
    }
    if (typeof updateMatchesDisplay === 'function') {
        updateMatchesDisplay(dayNumber);
    }
    if (typeof updatePlayerCount === 'function') {
        updatePlayerCount(dayNumber);
    }
    
    let message = `${addedCount} joueur(s) ajouté(s)`;
    if (duplicateCount > 0) {
        message += ` (${duplicateCount} doublon(s) ignoré(s))`;
    }
    showNotification(message, 'success');
}

/**
 * Copie les joueurs de la journée précédente
 */
export function copyPlayersFromPreviousDay(dayNumber) {
    if (dayNumber <= 1) {
        showNotification('Pas de journée précédente', 'warning');
        return;
    }
    
    const previousDay = dayNumber - 1;
    const prevDayData = championship.days[previousDay];
    
    if (!prevDayData || !prevDayData.players) {
        showNotification('Aucune donnée pour la journée précédente', 'warning');
        return;
    }
    
    if (!confirm(`Copier les joueurs de la Journée ${previousDay} vers la Journée ${dayNumber} ?`)) {
        return;
    }
    
    // Initialiser la structure si nécessaire
    if (!championship.days[dayNumber]) {
        championship.days[dayNumber] = {
            players: initializeDivisions(config.numberOfDivisions),
            matches: initializeDivisions(config.numberOfDivisions)
        };
    }
    
    // Copier les joueurs de chaque division
    Object.keys(prevDayData.players).forEach(division => {
        const divNum = parseInt(division);
        championship.days[dayNumber].players[divNum] = [...prevDayData.players[division]];
    });
    
    saveToLocalStorage();
    
    if (typeof updatePlayersDisplay === 'function') {
        updatePlayersDisplay(dayNumber);
    }
    if (typeof updatePlayerCount === 'function') {
        updatePlayerCount(dayNumber);
    }
    
    showNotification(`Joueurs de la Journée ${previousDay} copiés avec succès`, 'success');
}

/**
 * Met à jour le compteur de joueurs
 */
export function updatePlayerCount(dayNumber) {
    const dayData = championship.days[dayNumber];
    if (!dayData || !dayData.players) return;
    
    let totalPlayers = 0;
    Object.values(dayData.players).forEach(divisionPlayers => {
        totalPlayers += divisionPlayers.length;
    });
    
    // Mettre à jour l'affichage si l'élément existe
    const countElements = document.querySelectorAll(`[id^="player-count-day-${dayNumber}"]`);
    countElements.forEach(el => {
        el.textContent = `${totalPlayers} joueur(s)`;
    });
}

/**
 * Affiche les détails d'un joueur
 */
export function showPlayerDetails(playerName) {
    // Cette fonction est complexe et dépend de nombreuses autres fonctions
    // Elle sera déplacée dans le fichier principal ou un module stats.js
    console.log('showPlayerDetails appelé pour:', playerName);
}

export function closePlayerModal() {
    const modal = document.getElementById('playerModal');
    if (modal) modal.remove();
}
