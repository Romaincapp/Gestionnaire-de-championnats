// ============================================
// MODULE ÉTAT GLOBAL (State Management)
// ============================================

import { DEFAULT_CONFIG, initializeDivisions } from './config.js';

// État global du championnat
export let championship = {
    currentDay: 1,
    config: { ...DEFAULT_CONFIG },
    days: {
        1: {
            players: initializeDivisions(DEFAULT_CONFIG.numberOfDivisions),
            matches: initializeDivisions(DEFAULT_CONFIG.numberOfDivisions)
        }
    }
};

// Données importées temporairement
export let importedChampionshipData = null;

// Variable pour afficher/masquer les boutons forfait
export let showForfaitButtons = false;

// ============================================
// GESTION LOCAL STORAGE
// ============================================

export function saveToLocalStorage() {
    try {
        localStorage.setItem('tennisTableChampionship', JSON.stringify(championship));
    } catch (error) {
        console.warn("Erreur sauvegarde:", error);
    }
}

export function loadFromLocalStorage() {
    try {
        const saved = localStorage.getItem('tennisTableChampionship');
        if (saved) {
            const loaded = JSON.parse(saved);
            // Fusionner avec la structure par défaut pour éviter les erreurs
            championship = { 
                ...championship, 
                ...loaded,
                config: { ...DEFAULT_CONFIG, ...loaded.config }
            };
            return true;
        }
    } catch (error) {
        console.warn("Erreur chargement:", error);
    }
    return false;
}

// ============================================
// GETTERS & SETTERS
// ============================================

export function setChampionship(newChampionship) {
    championship = newChampionship;
}

export function setImportedData(data) {
    importedChampionshipData = data;
}

export function toggleForfaitButtons() {
    showForfaitButtons = !showForfaitButtons;
    
    // Mettre à jour tous les boutons toggle
    document.querySelectorAll('[id^="forfait-toggle-btn-"]').forEach(btn => {
        btn.style.background = showForfaitButtons ? '#e74c3c' : '#95a5a6';
        btn.innerHTML = showForfaitButtons ? '⚠️ Actions ON' : '⚠️ Actions OFF';
    });
    
    return showForfaitButtons;
}

export function setShowForfaitButtons(value) {
    showForfaitButtons = value;
}
