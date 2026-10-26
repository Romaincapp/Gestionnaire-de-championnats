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
            .split(/(\s+|-|'|’)/)
            .map(part => {
                if (part.match(/^[\s\-'’]+$/)) return part;
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

    /**
     * Règles d'impression communes à tous les documents de classement (fenêtres
     * window.open : elles ne chargent pas styles.css). L'aperçu reprend l'affichage
     * écran (couleurs gardées, fond de page blanc) et un long tableau continue sur
     * la page suivante au lieu d'être repoussé en entier (grand blanc), en-tête de
     * colonnes répété, jamais de ligne coupée, titre gardé avec son tableau.
     * landscape : A4 paysage (tableaux de 8 colonnes et plus).
     */
    function rankingPrintCSS(options) {
        const landscape = options && options.landscape;
        return `
        ${landscape ? '@page { size: A4 landscape; margin: 1cm; }' : ''}
        @media print {
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            html, body { background: #fff !important; min-height: 0 !important; }
            body { padding: 0 !important; margin: 0 !important; }
            .export-info, .refresh-btn, .auto-refresh, button { display: none !important; }
            .container, .content, .section, .division, .division-ranking, .ranking-division {
                break-inside: auto !important; page-break-inside: auto !important;
                box-shadow: none !important; max-width: none !important;
            }
            table { break-inside: auto !important; page-break-inside: auto !important; }
            thead { display: table-header-group; }
            tr, th, td { break-inside: avoid; page-break-inside: avoid; }
            h1, h2, h3, h4, .header, .division-title { break-after: avoid; page-break-after: avoid; }
        }`;
    }

    /** « 1 journée · 151 matchs » (+ « dont N terminés » s'il en reste à jouer). */
    function championshipSummaryText(stats) {
        const plural = (n, word) => `${n} ${word}${n > 1 ? 's' : ''}`;
        const parts = [plural(stats.totalDays, 'journée'), plural(stats.totalMatches, 'match')];
        if (stats.completedMatches < stats.totalMatches) parts[1] += ` dont ${stats.completedMatches} terminé${stats.completedMatches > 1 ? 's' : ''}`;
        return parts.join(' · ');
    }

    // Exposer sur window
    global.rankingPrintCSS = rankingPrintCSS;
    global.championshipSummaryText = championshipSummaryText;
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
