// ============================================
// MODULE UTILITAIRES (IIFE)
// ============================================
(function(global) {
    'use strict';

    function formatProperName(name) {
        if (!name) return '';
        // Si c'est un objet joueur {name, club}, formater le nom dans l'objet et retourner l'objet
        if (typeof name === 'object' && name !== null) {
            if (name.name && typeof name.name === 'string') {
                name.name = formatProperName(name.name);
            }
            return name;
        }
        if (typeof name !== 'string') return '';
        return name.trim()
            .toLowerCase()
            .split(/(\s+|-)/)
            .map(part => {
                if (part.match(/^[\s-]+$/)) return part;
                return part.charAt(0).toUpperCase() + part.slice(1);
            })
            .join('');
    }

    function escapeForOnclick(str) {
        if (!str) return '';
        return String(str).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    }

    function hasReverseMatchInDay(matches, player1, player2) {
        if (!matches || !Array.isArray(matches)) return false;
        return matches.some(match => {
            return (match.player1 === player1 && match.player2 === player2) ||
                   (match.player1 === player2 && match.player2 === player1);
        });
    }

    function getPlayerName(player) {
        if (typeof player === 'object' && player !== null) {
            return player.name || '';
        }
        return player || '';
    }

    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    function formatTime(ms) {
        if (!ms || ms < 0) return '00:00.00';
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        const milliseconds = Math.floor((ms % 1000) / 10);
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
    }

    function calculateWinRate(wins, total) {
        if (total === 0) return 0;
        return Math.round((wins / total) * 100);
    }

    function shuffleArray(array) {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }

    function isNewerVersion(newData, currentData) {
        if (!currentData.lastModified) return true;
        if (!newData.lastModified) return false;
        return new Date(newData.lastModified) > new Date(currentData.lastModified);
    }

    // Exposer sur window
    global.formatProperName = formatProperName;
    global.escapeForOnclick = escapeForOnclick;
    global.hasReverseMatchInDay = hasReverseMatchInDay;
    global.getPlayerName = getPlayerName;
    global.generateId = generateId;
    global.formatTime = formatTime;
    global.calculateWinRate = calculateWinRate;
    global.shuffleArray = shuffleArray;
    global.isNewerVersion = isNewerVersion;

})(window);
