// ============================================
// MAIN.JS - Point d'entrée de l'application
// ============================================
// Ce fichier importe tous les modules et expose 
// les fonctions nécessaires sur window pour la 
// compatibilité avec les onclick dans l'HTML
// ============================================

// Import des modules de base
import { 
    DEFAULT_CONFIG, config, initializeDivisions,
    updateDivisionConfig, updateCourtConfig,
    getNumberOfDivisions, getNumberOfCourts, getCourtsForDivision,
    applyConfiguration
} from './modules/config.js';

import {
    formatProperName, hasReverseMatchInDay, generateId, formatTime,
    calculateWinRate, shuffleArray, isNewerVersion
} from './modules/utils.js';

import {
    championship, importedChampionshipData, showForfaitButtons,
    saveToLocalStorage, loadFromLocalStorage,
    setChampionship, setImportedData, toggleForfaitButtons as toggleForfaitBtns, setShowForfaitButtons
} from './modules/state.js';

import {
    showNotification, confirmAction, alertMessage
} from './modules/notifications.js';

import {
    addPlayer, addPlayerToDay, removePlayer, editPlayer,
    playerHasByeMatch, addBulkPlayers, copyPlayersFromPreviousDay,
    updatePlayerCount, showPlayerDetails, closePlayerModal
} from './modules/players.js';

// ============================================
// EXPOSITION SUR WINDOW (compatibilité HTML)
// ============================================

// Config
window.DEFAULT_CONFIG = DEFAULT_CONFIG;
window.config = config;
window.initializeDivisions = initializeDivisions;
window.updateDivisionConfig = updateDivisionConfig;
window.updateCourtConfig = updateCourtConfig;
window.getNumberOfDivisions = getNumberOfDivisions;
window.getNumberOfCourts = getNumberOfCourts;
window.getCourtsForDivision = getCourtsForDivision;
window.applyConfiguration = applyConfiguration;

// Utils
window.formatProperName = formatProperName;
window.hasReverseMatchInDay = hasReverseMatchInDay;
window.generateId = generateId;
window.formatTime = formatTime;
window.calculateWinRate = calculateWinRate;
window.shuffleArray = shuffleArray;
window.isNewerVersion = isNewerVersion;

// State
window.championship = championship;
window.importedChampionshipData = importedChampionshipData;
window.showForfaitButtons = showForfaitButtons;
window.saveToLocalStorage = saveToLocalStorage;
window.loadFromLocalStorage = loadFromLocalStorage;
window.setChampionship = setChampionship;
window.setImportedData = setImportedData;
window.toggleForfaitButtons = toggleForfaitBtns;
window.setShowForfaitButtons = setShowForfaitButtons;

// Notifications
window.showNotification = showNotification;
window.confirmAction = confirmAction;
window.alertMessage = alertMessage;

// Players
window.addPlayer = addPlayer;
window.addPlayerToDay = addPlayerToDay;
window.removePlayer = removePlayer;
window.editPlayer = editPlayer;
window.playerHasByeMatch = playerHasByeMatch;
window.addBulkPlayers = addBulkPlayers;
window.copyPlayersFromPreviousDay = copyPlayersFromPreviousDay;
window.updatePlayerCount = updatePlayerCount;
window.showPlayerDetails = showPlayerDetails;
window.closePlayerModal = closePlayerModal;

// ============================================
// INITIALISATION
// ============================================

console.log('🎾 Gestionnaire de Championnat - Modules chargés');
console.log('Version modulaire initialisée avec succès');

// Charger les données sauvegardées au démarrage
document.addEventListener('DOMContentLoaded', () => {
    if (loadFromLocalStorage()) {
        console.log('💾 Données chargées depuis le stockage local');
    }
});
