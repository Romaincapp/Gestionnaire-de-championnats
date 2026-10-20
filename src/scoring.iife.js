// ============================================
// MODULE SCORING (IIFE) — format de score par journée
// ============================================
// Deux formats :
//   - 'simple' : deux scores (score1/score2), match nul permis (comportement historique)
//   - 'sets'   : best-of N, détail set par set dans match.setScores = [{s1, s2}, ...]
//
// En mode sets, score1/score2 restent la vérité « résumée » = nombre de sets gagnés,
// recalculés depuis setScores. Tout le code qui lit score1/score2/winner/completed
// (classements, clubs, multisport, tableau final) continue donc de fonctionner.
//
// Config : championship.days[n].scoring, sinon championship.config.defaultScoring,
// sinon { mode: 'simple' }. Ne pas confondre setScores avec l'ancien `sets`
// ({player1Score, player2Score}) de tennisdetable, migré par migrateLegacySets().
(function(global) {
    'use strict';

    const SIMPLE = Object.freeze({ mode: 'simple' });
    const DEFAULT_SETS = Object.freeze({ mode: 'sets', setsToWin: 2, pointsPerSet: 11 });

    function isBlank(v) {
        return v === '' || v === null || v === undefined;
    }

    function normalizeScoring(scoring) {
        if (!scoring || scoring.mode !== 'sets') return SIMPLE;
        const setsToWin = Math.min(4, Math.max(1, parseInt(scoring.setsToWin) || DEFAULT_SETS.setsToWin));
        const pps = parseInt(scoring.pointsPerSet);
        return { mode: 'sets', setsToWin, pointsPerSet: pps > 0 ? pps : null };
    }

    function getDayScoring(dayNumber) {
        const champ = global.championship;
        const day = champ && champ.days ? champ.days[dayNumber] : null;
        if (day && day.scoring) return normalizeScoring(day.scoring);
        if (champ && champ.config && champ.config.defaultScoring) return normalizeScoring(champ.config.defaultScoring);
        return SIMPLE;
    }

    function isSetsMode(dayNumber) {
        return getDayScoring(dayNumber).mode === 'sets';
    }

    function maxSets(scoring) {
        return scoring.mode === 'sets' ? scoring.setsToWin * 2 - 1 : 0;
    }

    function emptySetScores(scoring) {
        const s = normalizeScoring(scoring);
        return Array.from({ length: maxSets(s) }, () => ({ s1: '', s2: '' }));
    }

    // Garantit que match.setScores a exactement la longueur du format (sans perdre de saisie)
    function ensureSetScores(match, scoring) {
        const s = normalizeScoring(scoring);
        if (s.mode !== 'sets') return match.setScores || null;
        const n = maxSets(s);
        if (!Array.isArray(match.setScores)) match.setScores = [];
        while (match.setScores.length < n) match.setScores.push({ s1: '', s2: '' });
        // On ne tronque que des sets vides (un BO5 repassé en BO3 garde les sets saisis)
        while (match.setScores.length > n) {
            const last = match.setScores[match.setScores.length - 1];
            if (!last || (isBlank(last.s1) && isBlank(last.s2))) match.setScores.pop();
            else break;
        }
        return match.setScores;
    }

    function hasSetDetail(match) {
        return Array.isArray(match.setScores) &&
            match.setScores.some(set => set && !isBlank(set.s1) && !isBlank(set.s2));
    }

    /**
     * Calcule le résultat d'un match sans le modifier.
     * Retourne { score1, score2, completed, winner, gamePoints1, gamePoints2 }.
     */
    function computeMatchResult(match, scoring) {
        const s = normalizeScoring(scoring);

        if (s.mode === 'sets' && hasSetDetail(match)) {
            let sets1 = 0, sets2 = 0, gp1 = 0, gp2 = 0;
            for (const set of match.setScores) {
                // Les sets après la victoire sont ignorés (saisie en trop)
                if (sets1 >= s.setsToWin || sets2 >= s.setsToWin) break;
                if (!set || isBlank(set.s1) || isBlank(set.s2)) continue;
                const a = parseInt(set.s1), b = parseInt(set.s2);
                if (isNaN(a) || isNaN(b)) continue;
                gp1 += a; gp2 += b;
                if (a > b) sets1++;
                else if (b > a) sets2++;
            }
            const completed = sets1 >= s.setsToWin || sets2 >= s.setsToWin;
            return {
                score1: sets1, score2: sets2, completed,
                winner: completed ? (sets1 > sets2 ? match.player1 : match.player2) : null,
                gamePoints1: gp1, gamePoints2: gp2,
            };
        }

        // Mode simple, ou mode sets sans détail (sets gagnés saisis directement / données converties)
        if (match.score1 !== '' && match.score2 !== '') {
            const a = parseInt(match.score1), b = parseInt(match.score2);
            let winner = null;
            if (a > b) winner = match.player1;
            else if (b > a) winner = match.player2;
            // En mode sets, pas de match nul : une égalité reste en attente
            const completed = s.mode === 'sets' ? winner !== null : true;
            return { score1: match.score1, score2: match.score2, completed, winner, gamePoints1: null, gamePoints2: null };
        }
        return { score1: match.score1, score2: match.score2, completed: false, winner: null, gamePoints1: null, gamePoints2: null };
    }

    /** Écrit le résultat calculé dans le match (point d'entrée unique pour les 3 contextes). */
    function applyMatchResult(match, scoring) {
        const r = computeMatchResult(match, scoring);
        if (normalizeScoring(scoring).mode === 'sets' && hasSetDetail(match)) {
            match.score1 = r.score1;
            match.score2 = r.score2;
        }
        match.completed = r.completed;
        match.winner = r.winner;
        return r;
    }

    function fullSets(s, n, winnerSide) {
        const sets = emptySetScores(s);
        for (let i = 0; i < n; i++) {
            const w = s.pointsPerSet || '';
            sets[i] = winnerSide === 1 ? { s1: w, s2: s.pointsPerSet ? 0 : '' } : { s1: s.pointsPerSet ? 0 : '', s2: w };
        }
        return sets;
    }

    /**
     * Score attribué au vainqueur d'un BYE. `simpleDefault` garde les valeurs historiques
     * du contexte en mode simple (5 en championnat/poule, 3 en phase finale).
     */
    function byeResult(scoring, simpleDefault) {
        const s = normalizeScoring(scoring);
        if (s.mode !== 'sets') {
            const v = simpleDefault === undefined ? 5 : simpleDefault;
            return { score1: v, score2: 0, setScores: undefined };
        }
        return {
            score1: s.setsToWin, score2: 0,
            setScores: s.pointsPerSet ? fullSets(s, s.setsToWin, 1) : emptySetScores(s),
        };
    }

    /** Score d'un forfait : `forfaitSide` ('player1'|'player2') perd. */
    function forfeitResult(scoring, forfaitSide) {
        const s = normalizeScoring(scoring);
        const winnerSide = forfaitSide === 'player1' ? 2 : 1;
        if (s.mode !== 'sets') {
            return winnerSide === 1 ? { score1: 5, score2: 0 } : { score1: 0, score2: 5 };
        }
        return {
            score1: winnerSide === 1 ? s.setsToWin : 0,
            score2: winnerSide === 2 ? s.setsToWin : 0,
            setScores: s.pointsPerSet ? fullSets(s, s.setsToWin, winnerSide) : emptySetScores(s),
        };
    }

    /** Applique un résultat byeResult/forfeitResult sur un match. */
    function assignResult(match, result) {
        match.score1 = result.score1;
        match.score2 = result.score2;
        if (result.setScores) match.setScores = result.setScores;
        else delete match.setScores;
    }

    /** Champs de score d'un BYE pour une journée, à étaler dans un objet match ({...}). */
    function byeFieldsForDay(dayNumber, simpleDefault, winnerSide) {
        const r = byeResult(getDayScoring(dayNumber), simpleDefault);
        const fields = { score1: r.score1, score2: r.score2 };
        if (r.setScores) fields.setScores = r.setScores;
        if (winnerSide === 2) {
            fields.score1 = r.score2;
            fields.score2 = r.score1;
            if (fields.setScores) fields.setScores = fields.setScores.map(set => ({ s1: set.s2, s2: set.s1 }));
        }
        return fields;
    }

    /** "2-1 (11-8 9-11 11-5)" en mode sets avec détail, sinon "s1-s2". */
    function formatScoreDetail(match, placeholder) {
        const empty = placeholder === undefined ? '-' : placeholder;
        if (!match) return empty;
        const s1 = isBlank(match.score1) ? empty : match.score1;
        const s2 = isBlank(match.score2) ? empty : match.score2;
        const summary = `${s1}-${s2}`;
        if (!hasSetDetail(match)) return summary;
        const detail = match.setScores
            .filter(set => set && !isBlank(set.s1) && !isBlank(set.s2))
            .map(set => `${set.s1}-${set.s2}`)
            .join(' ');
        return `${summary} (${detail})`;
    }

    /** Avertissements non bloquants sur un set (multi-sport : on ne refuse jamais). */
    function setValidationWarnings(set, scoring) {
        const s = normalizeScoring(scoring);
        const warnings = [];
        if (!set || isBlank(set.s1) || isBlank(set.s2)) return warnings;
        const a = parseInt(set.s1), b = parseInt(set.s2);
        if (isNaN(a) || isNaN(b)) return warnings;
        if (a === b) {
            warnings.push('Set à égalité : il ne compte pour personne');
            return warnings;
        }
        if (s.pointsPerSet) {
            const hi = Math.max(a, b);
            if (hi < s.pointsPerSet) warnings.push(`Set non terminé (moins de ${s.pointsPerSet} points)`);
            else if (hi > s.pointsPerSet && Math.abs(a - b) !== 2) warnings.push('Au-delà de la limite, l\'écart devrait être de 2 points');
        }
        return warnings;
    }

    /** Points de jeu d'un match pour un joueur (somme des sets) — null en mode simple. */
    function gamePointsFor(match, isPlayer1) {
        if (!hasSetDetail(match)) return null;
        let won = 0, lost = 0;
        match.setScores.forEach(set => {
            if (!set || isBlank(set.s1) || isBlank(set.s2)) return;
            const a = parseInt(set.s1) || 0, b = parseInt(set.s2) || 0;
            won += isPlayer1 ? a : b;
            lost += isPlayer1 ? b : a;
        });
        return { won, lost };
    }

    /**
     * Comparateur commun des classements : points > victoires > différence (sets ou
     * goal-average) > différence de points de jeu > points marqués > nom.
     * Accepte les champs des différents calculs de stats du code.
     */
    function compareRankingStats(a, b) {
        const pts = x => x.totalPoints ?? x.points ?? 0;
        const wins = x => x.wins ?? x.totalWins ?? 0;
        const diff = x => x.goalAveragePoints ?? x.goalAverage ?? x.diff ??
            ((x.pointsWon ?? x.pointsFor ?? 0) - (x.pointsLost ?? x.pointsAgainst ?? 0));
        const gpDiff = x => (x.gamePointsWon || 0) - (x.gamePointsLost || 0);
        const pf = x => x.pointsWon ?? x.pointsFor ?? 0;
        return (pts(b) - pts(a)) ||
            (wins(b) - wins(a)) ||
            (diff(b) - diff(a)) ||
            (gpDiff(b) - gpDiff(a)) ||
            (pf(b) - pf(a)) ||
            String(a.name ?? a.player ?? '').localeCompare(String(b.name ?? b.player ?? ''));
    }

    /**
     * Migre l'ancien format tennisdetable `sets: [{player1Score, player2Score}]` vers
     * setScores (sans perte), puis recalcule score1/score2 = sets gagnés.
     * Retourne true si une migration a eu lieu.
     */
    function migrateLegacySets(match) {
        if (!match || !Array.isArray(match.sets)) return false;
        const legacy = match.sets.filter(set => set && ('player1Score' in set || 'player2Score' in set));
        if (legacy.length === 0) return false;
        if (!Array.isArray(match.setScores)) {
            match.setScores = legacy.map(set => ({
                s1: isBlank(set.player1Score) ? '' : String(set.player1Score),
                s2: isBlank(set.player2Score) ? '' : String(set.player2Score),
            }));
        }
        let p1 = 0, p2 = 0;
        match.setScores.forEach(set => {
            if (isBlank(set.s1) || isBlank(set.s2)) return;
            const a = parseInt(set.s1), b = parseInt(set.s2);
            if (a > b) p1++; else if (b > a) p2++;
        });
        if (!match.hasOwnProperty('score1') || isBlank(match.score1)) match.score1 = hasSetDetail(match) ? p1 : '';
        if (!match.hasOwnProperty('score2') || isBlank(match.score2)) match.score2 = hasSetDetail(match) ? p2 : '';
        delete match.sets;
        return true;
    }

    function scoringLabel(scoring) {
        const s = normalizeScoring(scoring);
        if (s.mode !== 'sets') return '2 scores';
        return `BO${maxSets(s)}${s.pointsPerSet ? ` · ${s.pointsPerSet} pts` : ''}`;
    }

    global.SCORING_SIMPLE = SIMPLE;
    global.SCORING_DEFAULT_SETS = DEFAULT_SETS;
    global.normalizeScoring = normalizeScoring;
    global.getDayScoring = getDayScoring;
    global.isSetsMode = isSetsMode;
    global.maxSetsForScoring = maxSets;
    global.emptySetScores = emptySetScores;
    global.ensureSetScores = ensureSetScores;
    global.hasSetDetail = hasSetDetail;
    global.computeMatchResult = computeMatchResult;
    global.applyMatchResult = applyMatchResult;
    global.byeResult = byeResult;
    global.forfeitResult = forfeitResult;
    global.assignResult = assignResult;
    global.byeFieldsForDay = byeFieldsForDay;
    global.formatScoreDetail = formatScoreDetail;
    global.setValidationWarnings = setValidationWarnings;
    global.gamePointsFor = gamePointsFor;
    global.compareRankingStats = compareRankingStats;
    global.migrateLegacySets = migrateLegacySets;
    global.scoringLabel = scoringLabel;

})(window);
