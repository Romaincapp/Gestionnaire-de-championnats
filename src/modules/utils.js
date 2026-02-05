// ============================================
// MODULE UTILITAIRES
// ============================================

/**
 * Formate un nom en "Nom Propre" (première lettre majuscule, reste minuscule)
 */
export function formatProperName(name) {
    if (!name) return '';
    return name.trim()
        .toLowerCase()
        .split(/(\s+|-)/)
        .map(part => {
            if (part.match(/^[\s-]+$/)) return part;
            return part.charAt(0).toUpperCase() + part.slice(1);
        })
        .join('');
}

/**
 * Vérifie si un match aller-retour existe déjà dans une liste de matchs
 */
export function hasReverseMatchInDay(matches, player1, player2) {
    if (!matches || !Array.isArray(matches)) return false;
    return matches.some(match => {
        return (match.player1 === player1 && match.player2 === player2) ||
               (match.player1 === player2 && match.player2 === player1);
    });
}

/**
 * Génère un ID unique
 */
export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Formate le temps (ms) en format mm:ss.ms
 */
export function formatTime(ms) {
    if (!ms || ms < 0) return '00:00.00';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = Math.floor((ms % 1000) / 10);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
}

/**
 * Calcule le pourcentage de victoires
 */
export function calculateWinRate(wins, total) {
    if (total === 0) return 0;
    return Math.round((wins / total) * 100);
}

/**
 * Mélange un tableau (algorithme Fisher-Yates)
 */
export function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

/**
 * Compare deux versions de championnat pour import
 */
export function isNewerVersion(newData, currentData) {
    if (!currentData.lastModified) return true;
    if (!newData.lastModified) return false;
    return new Date(newData.lastModified) > new Date(currentData.lastModified);
}
