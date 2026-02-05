// ============================================
// MODULE CONFIGURATION GLOBALE
// ============================================

export const DEFAULT_CONFIG = {
    numberOfDivisions: 3,
    numberOfCourts: 4
};

export let config = { ...DEFAULT_CONFIG };

export function initializeDivisions(numberOfDivisions) {
    const divisions = {};
    for (let i = 1; i <= numberOfDivisions; i++) {
        divisions[i] = [];
    }
    return divisions;
}

export function updateDivisionConfig() {
    const select = document.getElementById('divisionConfig');
    if (select) {
        config.numberOfDivisions = parseInt(select.value);
    }
}

export function updateCourtConfig() {
    const select = document.getElementById('courtConfig');
    if (select) {
        config.numberOfCourts = parseInt(select.value);
    }
}

export function getNumberOfDivisions() {
    return config.numberOfDivisions;
}

export function getNumberOfCourts() {
    return config.numberOfCourts;
}

export function getCourtsForDivision(division) {
    const numCourts = config.numberOfCourts;
    const numDivisions = config.numberOfDivisions;
    const courtsPerDivision = Math.ceil(numCourts / numDivisions);
    const firstCourt = (division - 1) * courtsPerDivision + 1;
    const lastCourt = Math.min(division * courtsPerDivision, numCourts);
    return { first: firstCourt, last: lastCourt, count: lastCourt - firstCourt + 1 };
}

export function applyConfiguration() {
    const newDivisions = parseInt(document.getElementById('divisionConfig').value);
    const newCourts = parseInt(document.getElementById('courtConfig').value);
    
    if (!confirm(`⚙️ Appliquer la nouvelle configuration ?\n\n` +
        `📊 Divisions: ${newDivisions}\n` +
        `🎾 Terrains: ${newCourts}\n\n` +
        `⚠️ Attention: Cela peut affecter l'affichage des joueurs et matchs existants.`)) {
        return;
    }
    
    config.numberOfDivisions = newDivisions;
    config.numberOfCourts = newCourts;
    
    // Mettre à jour toutes les journées existantes
    Object.keys(championship.days).forEach(dayKey => {
        const day = championship.days[dayKey];
        
        // Ajouter les nouvelles divisions si nécessaire
        for (let i = 1; i <= newDivisions; i++) {
            if (!day.players[i]) day.players[i] = [];
            if (!day.matches[i]) day.matches[i] = [];
        }
        
        // Supprimer les divisions en trop
        Object.keys(day.players).forEach(div => {
            if (parseInt(div) > newDivisions) {
                delete day.players[div];
                delete day.matches[div];
            }
        });
    });
    
    championship.config = { ...config };
    
    if (typeof saveToLocalStorage === 'function') saveToLocalStorage();
    if (typeof showNotification === 'function') showNotification('Configuration appliquée avec succès !', 'success');
    if (typeof updateMatchesDisplay === 'function') updateMatchesDisplay(championship.currentDay);
}
