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

    /**
     * Détail des sets d'un score en sets gagnés (ex. 2-1) : chaque set gagné vaut
     * pointsPerSet-loserPoints (11-0, 11-5…). Les sets sont alternés pour que le set
     * décisif soit le dernier (2-1 → G P G). null si « libre » (loserPoints null) ou
     * sans points par set : on garde alors seulement les sets gagnés.
     */
    function buildSetScores(scoring, sets1, sets2, loserPoints) {
        const s = normalizeScoring(scoring);
        if (s.mode !== 'sets' || !s.pointsPerSet || loserPoints === null || loserPoints === undefined || loserPoints === '') return null;
        const lose = Math.max(0, parseInt(loserPoints) || 0);
        const result = emptySetScores(s);
        let a = parseInt(sets1) || 0, b = parseInt(sets2) || 0;
        const p1First = a >= b; // le vainqueur gagne le 1er set et le set décisif
        for (let i = 0; i < result.length && (a > 0 || b > 0); i++) {
            const p1Turn = (i % 2 === 0) === p1First ? a > 0 : b === 0;
            if (p1Turn) { result[i] = { s1: s.pointsPerSet, s2: lose }; a--; }
            else { result[i] = { s1: lose, s2: s.pointsPerSet }; b--; }
        }
        return result;
    }

    function fullSets(s, n, winnerSide) {
        return buildSetScores(s, winnerSide === 1 ? n : 0, winnerSide === 1 ? 0 : n, 0) || emptySetScores(s);
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

    /** Différence de points de jeu d'une ligne de classement (0 en mode 2 scores). */
    function gamePointsDiff(stats) {
        return (stats && (stats.gamePointsWon || 0) - (stats.gamePointsLost || 0)) || 0;
    }

    /** Score encaissé par forfait pour une journée : 5 (2 scores) ou setsToWin (sets). */
    function forfeitPenaltyForDay(dayNumber) {
        const r = forfeitResult(getDayScoring(dayNumber), 'player1');
        return parseInt(r.score2) || 0;
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

    /**
     * Détail des sets vu par un joueur, à coller après un score résumé :
     * " : 11-8 9-11 11-5" (ou "" sans détail). isPlayer1=false inverse chaque set.
     */
    function setDetailSuffix(match, isPlayer1, separator) {
        if (!hasSetDetail(match)) return '';
        const p1 = isPlayer1 !== false;
        const detail = match.setScores
            .filter(set => set && !isBlank(set.s1) && !isBlank(set.s2))
            .map(set => p1 ? `${set.s1}-${set.s2}` : `${set.s2}-${set.s1}`)
            .join(' ');
        return `${separator === undefined ? ' : ' : separator}${detail}`;
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

    /**
     * Parcourt tous les matchs d'une journée (match collection pattern, voir claude.md) :
     * matchs par tours, matchs de poule, ancienne finalPhase et rounds de manualFinalPhase.
     */
    function forEachDayMatch(dayData, fn) {
        if (!dayData) return;
        Object.values(dayData.matches || {}).forEach(list => (list || []).forEach(fn));
        const divisions = dayData.pools && dayData.pools.divisions;
        if (divisions) {
            Object.values(divisions).forEach(div => {
                (div && div.matches || []).forEach(fn);
                (div && div.finalPhase || []).forEach(fn);
            });
        }
        const finals = dayData.pools && dayData.pools.manualFinalPhase && dayData.pools.manualFinalPhase.divisions;
        if (finals) {
            Object.values(finals).forEach(div => {
                Object.values(div && div.rounds || {}).forEach(round => (round && round.matches || []).forEach(fn));
            });
        }
    }

    /**
     * Normalise le format de score d'une journée importée ou chargée :
     *  - migre l'ancien `sets` de tennisdetable (la journée passe alors en BO3 11 pts) ;
     *  - applique `fallbackScoring` (défaut du fichier importé) si la journée n'a pas de format ;
     *  - nettoie setScores (entrées invalides, longueur adaptée au format).
     * Retourne true si des sets au format tennisdetable ont été migrés.
     */
    function normalizeDayScoring(day, fallbackScoring) {
        if (!day || day.dayType === 'chrono') return false;
        let legacy = false;
        forEachDayMatch(day, m => { if (migrateLegacySets(m)) legacy = true; });
        if (!day.scoring) {
            if (legacy) day.scoring = Object.assign({}, DEFAULT_SETS);
            else if (fallbackScoring) day.scoring = normalizeScoring(fallbackScoring);
        }
        if (day.scoring) day.scoring = normalizeScoring(day.scoring);
        const s = day.scoring || SIMPLE;
        forEachDayMatch(day, m => {
            if (m.setScores === undefined) return;
            if (!Array.isArray(m.setScores)) { delete m.setScores; return; }
            m.setScores = m.setScores.map(set => ({
                s1: set && !isBlank(set.s1) ? String(set.s1) : '',
                s2: set && !isBlank(set.s2) ? String(set.s2) : '',
            }));
            if (s.mode === 'sets') ensureSetScores(m, s);
        });
        return legacy;
    }

    // ======================================
    // SÉLECTEUR DE FORMAT DANS L'EN-TÊTE DE JOURNÉE
    // ======================================

    function scoringToKey(scoring) {
        const s = normalizeScoring(scoring);
        return s.mode === 'sets' ? `sets-${s.setsToWin}` : 'simple';
    }

    function renderDayScoringControl(dayNumber) {
        const s = getDayScoring(dayNumber);
        const key = scoringToKey(s);
        const opt = (value, label) => `<option value="${value}" ${key === value ? 'selected' : ''}>${label}</option>`;
        const ppsOpt = (value, label) => `<option value="${value}" ${String(s.pointsPerSet || '') === String(value) ? 'selected' : ''}>${label}</option>`;
        return `
            <label for="day-scoring-select-${dayNumber}" style="font-size: 13px; font-weight: 500;">🎯 Score:</label>
            <select id="day-scoring-select-${dayNumber}" onchange="changeDayScoringFromControl(${dayNumber})" title="Format de score des matchs de cette journée" style="padding: 6px 10px; border-radius: 6px; border: 1px solid #ced4da; font-size: 13px; cursor: pointer; background: white; color: #333;">
                ${opt('simple', '2 scores')}
                ${opt('sets-2', 'Sets · BO3')}
                ${opt('sets-3', 'Sets · BO5')}
                ${opt('sets-4', 'Sets · BO7')}
            </select>
            <select id="day-scoring-pps-${dayNumber}" onchange="changeDayScoringFromControl(${dayNumber})" aria-label="Points par set" title="Points par set (pour pré-remplir BYE/forfait et signaler un set incomplet)" style="padding: 6px 10px; border-radius: 6px; border: 1px solid #ced4da; font-size: 13px; cursor: pointer; background: white; color: #333; display: ${s.mode === 'sets' ? 'inline-block' : 'none'};">
                ${ppsOpt('', 'Points libres')}
                ${ppsOpt(11, '11 pts')}
                ${ppsOpt(15, '15 pts')}
                ${ppsOpt(21, '21 pts')}
                ${ppsOpt(25, '25 pts')}
            </select>`;
    }

    function refreshDayScoringControl(dayNumber) {
        const ctl = document.getElementById(`day-scoring-ctl-${dayNumber}`);
        if (!ctl) return;
        const day = global.championship && global.championship.days ? global.championship.days[dayNumber] : null;
        ctl.innerHTML = renderDayScoringControl(dayNumber);
        ctl.style.display = day && day.dayType === 'chrono' ? 'none' : 'inline-flex';
    }

    function changeDayScoringFromControl(dayNumber) {
        const select = document.getElementById(`day-scoring-select-${dayNumber}`);
        const pps = document.getElementById(`day-scoring-pps-${dayNumber}`);
        if (!select) return;
        let scoring = SIMPLE;
        if (select.value.indexOf('sets-') === 0) {
            const previous = getDayScoring(dayNumber);
            const ppsValue = pps && pps.style.display !== 'none' ? pps.value
                : (previous.mode === 'sets' ? previous.pointsPerSet : DEFAULT_SETS.pointsPerSet);
            scoring = { mode: 'sets', setsToWin: parseInt(select.value.slice(5)), pointsPerSet: ppsValue };
        }
        if (!setDayScoring(dayNumber, scoring)) refreshDayScoringControl(dayNumber); // annulé : remettre l'ancien choix
    }

    /**
     * Change le format de score d'une journée. Les scores déjà saisis sont conservés
     * (en passant en sets, score1/score2 deviennent des sets gagnés). Retourne false si
     * l'utilisateur annule.
     */
    function setDayScoring(dayNumber, scoring, options) {
        const champ = global.championship;
        const day = champ && champ.days ? champ.days[dayNumber] : null;
        if (!day) return false;
        const next = normalizeScoring(scoring);
        const prev = getDayScoring(dayNumber);
        if (JSON.stringify(prev) === JSON.stringify(next)) return true;

        let scored = 0;
        forEachDayMatch(day, m => {
            if (m.isBye || m.isByeMatch) return;
            if ((m.score1 !== '' && m.score1 !== undefined) || hasSetDetail(m)) scored++;
        });
        const skipConfirm = options && options.confirm === false;
        if (scored > 0 && !skipConfirm && typeof global.confirm === 'function') {
            const msg = prev.mode !== next.mode
                ? `${scored} match(s) ont déjà un score.\n\nPasser en « ${scoringLabel(next)} » : les scores saisis sont conservés` +
                  (next.mode === 'sets' ? ' et lus comme des sets gagnés.' : ' (le détail des sets est gardé mais n\'est plus affiché).') +
                  '\n\nContinuer ?'
                : `${scored} match(s) ont déjà un score.\n\nPasser en « ${scoringLabel(next)} » ? Les sets déjà saisis sont conservés.`;
            if (!global.confirm(msg)) return false;
        }

        day.scoring = next;
        // Recalculer vainqueurs/états avec la nouvelle règle (BYE/forfaits inclus)
        forEachDayMatch(day, m => {
            if (m.isBye || m.isByeMatch || m.forfaitBy) return;
            if (next.mode === 'sets') ensureSetScores(m, next);
            applyMatchResult(m, next);
        });

        if (typeof global.saveToLocalStorage === 'function') global.saveToLocalStorage();
        refreshDayScoringControl(dayNumber);
        if (typeof global.updateMatchesDisplay === 'function') global.updateMatchesDisplay(dayNumber);
        if (day.pools && day.pools.enabled) {
            if (typeof global.updatePoolsDisplay === 'function') global.updatePoolsDisplay(dayNumber);
            if (typeof global.updateManualFinalPhaseDisplay === 'function') global.updateManualFinalPhaseDisplay(dayNumber);
        }
        if (typeof global.showNotification === 'function') {
            global.showNotification(`🎯 Journée ${dayNumber} : score en ${scoringLabel(next)}`, 'success');
        }
        return true;
    }

    // ======================================
    // SAISIE SET PAR SET (matchs par tours, poules, phase finale)
    // ======================================
    // type : 'regular' (ref = index dans matches[div]), 'pool' (ref = id), 'final' (ref = id)

    function findMatchByRef(type, dayNumber, division, ref) {
        const day = global.championship && global.championship.days ? global.championship.days[dayNumber] : null;
        if (!day) return null;
        if (type === 'regular') return (day.matches && day.matches[division] || [])[ref] || null;
        if (type === 'pool') {
            const divs = day.pools && day.pools.divisions || {};
            const inDiv = divs[division] && (divs[division].matches || []).find(m => m.id == ref);
            if (inDiv) return inDiv;
            for (const d of Object.values(divs)) {
                const m = (d && d.matches || []).find(x => x.id == ref);
                if (m) return m;
            }
            return null;
        }
        if (type === 'final') {
            const finals = day.pools && day.pools.manualFinalPhase && day.pools.manualFinalPhase.divisions || {};
            for (const d of Object.values(finals)) {
                for (const round of Object.values(d && d.rounds || {})) {
                    const m = (round && round.matches || []).find(x => x.id == ref);
                    if (m) return m;
                }
            }
        }
        return null;
    }

    function escapeAttr(v) {
        return String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    }

    function refArg(ref) {
        return typeof ref === 'number' ? String(ref) : `'${String(ref).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
    }

    /** Index du set qui décide le match (-1 si pas encore décidé). */
    function decisiveSetIndex(setScores, scoring) {
        let a = 0, b = 0;
        for (let i = 0; i < setScores.length; i++) {
            const set = setScores[i];
            if (!set || isBlank(set.s1) || isBlank(set.s2)) continue;
            const x = parseInt(set.s1), y = parseInt(set.s2);
            if (x > y) a++; else if (y > x) b++;
            if (a >= scoring.setsToWin || b >= scoring.setsToWin) return i;
        }
        return -1;
    }

    /**
     * Grille de saisie des sets (mode sets) — null en mode 2 scores : l'appelant garde
     * alors ses deux cases historiques.
     */
    function renderSetScoreInputs(type, dayNumber, division, ref, match, options) {
        const s = getDayScoring(dayNumber);
        if (s.mode !== 'sets') return null;
        const sets = ensureSetScores(match, s).slice(0, maxSets(s));
        const decisive = decisiveSetIndex(sets, s);
        const r = computeMatchResult(match, s);
        const opts = options || {};
        const args = `'${type}', ${dayNumber}, ${division}, ${refArg(ref)}`;
        const cells = sets.map((set, i) => {
            const unused = decisive >= 0 && i > decisive;
            const input = (side) => `<input type="number" class="score-input set-score-input" min="0" placeholder="0"
                       data-set="${i}" data-side="${side}" aria-label="Set ${i + 1}, ${escapeAttr(side === 1 ? match.player1 : match.player2)}"
                       value="${escapeAttr(isBlank(set[`s${side}`]) ? '' : set[`s${side}`])}" ${unused ? 'disabled' : ''}
                       oninput="onSetScoreInput(this)"
                       onchange="updateSetScore(${args}, ${i}, ${side}, this.value)"
                       onkeydown="${opts.onkeydown || ''}"${opts.inputStyle ? ` style="${opts.inputStyle}"` : ''}>`;
            return `<span class="set-score-cell${unused ? ' set-unused' : ''}" data-set-cell="${i}">
                    <span class="set-label">S${i + 1}</span>
                    ${input(1)}<span class="score-separator">-</span>${input(2)}
                </span>`;
        }).join('');
        const summary = hasSetDetail(match) || !isBlank(match.score1) ? `${r.score1}-${r.score2}` : '';
        return `<div class="score-center set-score-grid" data-sets-to-win="${s.setsToWin}" data-points-per-set="${s.pointsPerSet || ''}">
                ${cells}
                <span class="sets-summary" title="Sets gagnés">${summary}</span>
            </div>`;
    }

    function readGrid(grid) {
        const sets = [];
        grid.querySelectorAll('.set-score-input').forEach(input => {
            const i = parseInt(input.dataset.set);
            sets[i] = sets[i] || { s1: '', s2: '' };
            sets[i][`s${input.dataset.side}`] = input.value.trim();
        });
        return sets;
    }

    /** Mise à jour visuelle pendant la frappe : résumé des sets, sets inutiles grisés, alertes. */
    function onSetScoreInput(input) {
        const grid = input && input.closest('.set-score-grid');
        if (!grid) return;
        const s = normalizeScoring({ mode: 'sets', setsToWin: grid.dataset.setsToWin, pointsPerSet: grid.dataset.pointsPerSet });
        const sets = readGrid(grid);
        const decisive = decisiveSetIndex(sets, s);
        grid.querySelectorAll('.set-score-cell').forEach(cell => {
            const i = parseInt(cell.dataset.setCell);
            const unused = decisive >= 0 && i > decisive;
            cell.classList.toggle('set-unused', unused);
            cell.querySelectorAll('input').forEach(inp => { inp.disabled = unused; });
            const warnings = setValidationWarnings(sets[i], s);
            cell.classList.toggle('set-warning', warnings.length > 0);
            cell.title = warnings.join(' · ');
        });
        const r = computeMatchResult({ setScores: sets, score1: '', score2: '' }, s);
        const summary = grid.querySelector('.sets-summary');
        if (summary) summary.textContent = hasSetDetail({ setScores: sets }) ? `${r.score1}-${r.score2}` : '';
    }

    function storeSets(match, sets, scoring) {
        ensureSetScores(match, scoring);
        sets.forEach((set, i) => { if (set) match.setScores[i] = { s1: set.s1, s2: set.s2 }; });
        if (!hasSetDetail(match)) { match.score1 = ''; match.score2 = ''; }
        if (match.forfaitBy) delete match.forfaitBy; // scores modifiés à la main : plus un forfait
    }

    /** onchange d'une case de set : enregistre sans valider (la validation se fait à Entrée). */
    function updateSetScore(type, dayNumber, division, ref, setIndex, side, value) {
        const match = findMatchByRef(type, dayNumber, division, ref);
        if (!match || match.isBye) return;
        const s = getDayScoring(dayNumber);
        ensureSetScores(match, s);
        match.setScores[setIndex] = match.setScores[setIndex] || { s1: '', s2: '' };
        match.setScores[setIndex][`s${side}`] = String(value).trim();
        storeSets(match, [], s);
        if (hasSetDetail(match)) {
            const r = computeMatchResult(match, s);
            match.score1 = r.score1;
            match.score2 = r.score2;
        }
        if (typeof global.saveToLocalStorage === 'function') global.saveToLocalStorage();
    }

    /**
     * Gestion clavier d'une grille de sets, appelée en tête des handlers Entrée/Tab des
     * 3 contextes. Recopie la grille (DOM) dans match.setScores puis retourne :
     *   'validate' → l'appelant valide le match comme d'habitude
     *   'handled'  → focus déplacé vers le set suivant, rien d'autre à faire
     *   'natural'  → laisser le navigateur faire (Tab vers la case suivante, autre touche)
     */
    function handleSetsKeydown(event, match, dayNumber) {
        const grid = event.target && event.target.closest ? event.target.closest('.set-score-grid') : null;
        if (!grid || (event.key !== 'Enter' && event.key !== 'Tab')) return 'natural';
        const s = getDayScoring(dayNumber);
        storeSets(match, readGrid(grid), s);
        const r = computeMatchResult(match, s);
        if (hasSetDetail(match)) { match.score1 = r.score1; match.score2 = r.score2; }

        const inputs = Array.from(grid.querySelectorAll('.set-score-input'));
        const pos = inputs.indexOf(event.target);
        const after = inputs.slice(pos + 1).filter(inp => !inp.disabled);

        if (event.key === 'Tab') {
            // Valider seulement en quittant un match décidé (dernière case utile)
            if (!event.shiftKey && r.completed && after.every(inp => inp.value.trim() === '')) {
                event.preventDefault();
                return 'validate';
            }
            return 'natural';
        }

        event.preventDefault();
        if (r.completed) return 'validate';
        const next = after.find(inp => inp.value.trim() === '') || after[0];
        if (next) { next.focus(); if (next.select) next.select(); return 'handled'; }
        return 'validate';
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
    global.buildSetScores = buildSetScores;
    global.byeFieldsForDay = byeFieldsForDay;
    global.formatScoreDetail = formatScoreDetail;
    global.setDetailSuffix = setDetailSuffix;
    global.setValidationWarnings = setValidationWarnings;
    global.gamePointsFor = gamePointsFor;
    global.gamePointsDiff = gamePointsDiff;
    global.forfeitPenaltyForDay = forfeitPenaltyForDay;
    global.compareRankingStats = compareRankingStats;
    global.migrateLegacySets = migrateLegacySets;
    global.scoringLabel = scoringLabel;
    global.forEachDayMatch = forEachDayMatch;
    global.normalizeDayScoring = normalizeDayScoring;
    global.renderDayScoringControl = renderDayScoringControl;
    global.refreshDayScoringControl = refreshDayScoringControl;
    global.changeDayScoringFromControl = changeDayScoringFromControl;
    global.setDayScoring = setDayScoring;
    global.findMatchByRef = findMatchByRef;
    global.renderSetScoreInputs = renderSetScoreInputs;
    global.onSetScoreInput = onSetScoreInput;
    global.updateSetScore = updateSetScore;
    global.handleSetsKeydown = handleSetsKeydown;

})(window);
