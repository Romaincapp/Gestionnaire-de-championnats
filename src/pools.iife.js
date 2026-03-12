// ============================================
// MODULE POOLS + PHASES FINALES (IIFE)
// ============================================
(function(global) {
    'use strict';

    var championship = global.championship;
    var config = global.config;
    var showNotification = global.showNotification;
    var saveToLocalStorage = function() { if (typeof global.saveToLocalStorage === 'function') global.saveToLocalStorage(); };
    var getNumberOfDivisions = function() { return typeof global.getNumberOfDivisions === 'function' ? global.getNumberOfDivisions() : 3; };
    var getNumberOfCourts = function() { return typeof global.getNumberOfCourts === 'function' ? global.getNumberOfCourts() : 4; };
    var shuffleArray = function(arr) { return typeof global.shuffleArray === 'function' ? global.shuffleArray(arr) : arr; };
    var escapeForOnclick = function(s) { return typeof global.escapeForOnclick === 'function' ? global.escapeForOnclick(s) : s; };
    var getPlayerName = function(p) { return typeof global.getPlayerName === 'function' ? global.getPlayerName(p) : (p || ''); };
    var hasReverseMatchInDay = function(m, p1, p2) { return typeof global.hasReverseMatchInDay === 'function' ? global.hasReverseMatchInDay(m, p1, p2) : false; };

    // ======================================
// SYSTÈME DE POULES OPTIONNEL - EXTENSION SÉCURISÉE
// ======================================

// Extension de la structure de données (non-breaking)
function initializePoolSystem(dayNumber) {
    const dayData = championship.days[dayNumber];
    const numDivisions = championship.config.numDivisions || 3;

    // Ajouter la structure poules si elle n'existe pas
    if (!dayData.pools) {
        const divisions = {};
        for (let div = 1; div <= numDivisions; div++) {
            divisions[div] = { pools: [], matches: [] };
        }

        dayData.pools = {
            enabled: false,
            divisions: divisions
        };
    }

    // Garantir la compatibilité avec l'ancien système
    if (!dayData.matches) {
        const matches = {};
        for (let div = 1; div <= numDivisions; div++) {
            matches[div] = [];
        }
        dayData.matches = matches;
    }
}

// ======================================
// INTERFACE UTILISATEUR - ACTIVATION POULES
// ======================================

function addPoolToggleToInterface(dayNumber) {
    const section = document.querySelector(`#day-${dayNumber} .section`);
    if (!section) return;

    // Chercher le conteneur day-hub-content pour insérer le mode pool après
    const dayHubContent = document.getElementById(`day-hub-content-${dayNumber}`);
    if (!dayHubContent) return;

    const poolToggleHTML = `
        <!-- Section Mode Poules (bouton déplacé dans la barre d'action) -->
        <div class="pool-toggle-section" id="pool-toggle-${dayNumber}" style="
            background: linear-gradient(135deg, #fff8e1, #ffe082);
            border: 2px solid #f39c12;
            border-radius: 8px;
            padding: 15px;
            margin: 15px auto;
            max-width: 800px;
            display: none;
        ">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <h3 style="color: #e67e22; margin: 0; font-size: 16px;">
                    🏊 Mode Poules de Qualification
                </h3>
                <button onclick="togglePoolSection(${dayNumber})" style="
                    background: none;
                    border: none;
                    font-size: 24px;
                    cursor: pointer;
                    color: #e67e22;
                    padding: 0;
                    line-height: 1;
                ">×</button>
            </div>

            <p style="color: #856404; margin-bottom: 12px; font-size: 12px;">
                Créez des groupes, puis organisez des phases finales avec les meilleurs
            </p>

            <div class="toggle-container" style="margin-bottom: 12px; text-align: center;">
                <label class="toggle-switch" style="display: inline-flex; align-items: center; gap: 8px; cursor: pointer;">
                    <input type="checkbox" id="pool-enabled-${dayNumber}" onchange="togglePoolMode(${dayNumber})" style="
                        width: 18px; height: 18px; cursor: pointer; accent-color: #f39c12;
                    ">
                    <span style="font-weight: bold; color: #e67e22; font-size: 13px;">✓ Activer le mode Poules</span>
                </label>
            </div>

            <div id="pool-config-${dayNumber}" class="pool-config" style="display: none;">
                ${dayNumber > 1 ? `
                    <div style="background: rgba(52, 152, 219, 0.1); padding: 10px; border-radius: 6px; margin-bottom: 12px; border: 2px solid #3498db;">
                        <button class="btn" onclick="preFillFromGeneralRanking(${dayNumber})" style="
                            background: linear-gradient(135deg, #3498db, #2980b9);
                            color: white;
                            padding: 8px 12px;
                            font-size: 12px;
                            width: 100%;
                        ">
                            ⭐ Pré-remplir depuis le Classement Général
                        </button>
                        <p style="margin: 8px 0 0 0; font-size: 11px; color: #2c3e50; text-align: center;">
                            Les meilleurs joueurs du classement général seront répartis équitablement
                        </p>
                    </div>
                ` : ''}

                <!-- Toggle Mode Simple/Avancé -->
                <div style="display: flex; gap: 15px; justify-content: center; margin-bottom: 15px; flex-wrap: wrap;">
                    <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 12px;">
                        <input type="radio" name="pool-config-mode-${dayNumber}" value="simple" checked
                               onchange="togglePoolConfigMode(${dayNumber}, 'simple')"
                               style="width: 16px; height: 16px; cursor: pointer; accent-color: #3498db;">
                        <span style="font-weight: 600; color: #2c3e50;">📊 Mode Simple</span>
                    </label>
                    <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 12px;">
                        <input type="radio" name="pool-config-mode-${dayNumber}" value="advanced"
                               onchange="togglePoolConfigMode(${dayNumber}, 'advanced')"
                               style="width: 16px; height: 16px; cursor: pointer; accent-color: #e67e22;">
                        <span style="font-weight: 600; color: #2c3e50;">🎯 Mode Avancé</span>
                    </label>
                </div>

                <!-- Mode Simple -->
                <div id="simple-config-${dayNumber}" style="display: flex; gap: 10px; justify-content: center; align-items: center; flex-wrap: wrap; margin-bottom: 12px;">
                    <label style="display: flex; align-items: center; gap: 6px; font-size: 12px;">
                        <span style="font-weight: 600; color: #2c3e50;">Taille:</span>
                        <select id="pool-size-${dayNumber}" onchange="updateSimpleConfigInfo(${dayNumber})" style="padding: 6px 8px; border: 2px solid #3498db; border-radius: 5px; font-size: 12px;">
                            <option value="4">4 joueurs/poule</option>
                            <option value="5">5 joueurs/poule</option>
                            <option value="6">6 joueurs/poule</option>
                        </select>
                    </label>

                    <label style="display: flex; align-items: center; gap: 6px; font-size: 12px;">
                        <span style="font-weight: 600; color: #2c3e50;">Qualifiés:</span>
                        <select id="qualified-per-pool-${dayNumber}" onchange="updateSimpleConfigInfo(${dayNumber})" style="padding: 6px 8px; border: 2px solid #3498db; border-radius: 5px; font-size: 12px;">
                            <option value="2">2 premiers</option>
                            <option value="3">3 premiers</option>
                        </select>
                    </label>

                    <label style="display: flex; align-items: center; gap: 6px; font-size: 12px;">
                        <span style="font-weight: 600; color: #2c3e50;">⚡ Matchs/joueur:</span>
                        <select id="matches-per-player-${dayNumber}" onchange="updateSimpleConfigInfo(${dayNumber})" style="padding: 6px 8px; border: 2px solid #16a085; border-radius: 5px; font-size: 12px;">
                            <option value="">Tous contre tous</option>
                            <option value="3" selected>3 matchs</option>
                            <option value="4">4 matchs</option>
                            <option value="5">5 matchs</option>
                        </select>
                    </label>
                </div>

                <!-- Mode Avancé -->
                <div id="advanced-config-${dayNumber}" style="display: none; gap: 10px; justify-content: center; align-items: center; flex-wrap: wrap; margin-bottom: 12px;">
                    <label style="display: flex; align-items: center; gap: 6px; font-size: 12px;">
                        <span style="font-weight: 600; color: #2c3e50;">Nombre de poules:</span>
                        <input type="number" id="num-pools-${dayNumber}" min="2" max="10" value="4"
                               onchange="updateAdvancedConfigInfo(${dayNumber})"
                               style="width: 60px; padding: 6px 8px; border: 2px solid #e67e22; border-radius: 5px; font-size: 12px;">
                    </label>

                    <label style="display: flex; align-items: center; gap: 6px; font-size: 12px;">
                        <span style="font-weight: 600; color: #2c3e50;">Total qualifiés:</span>
                        <input type="number" id="total-qualified-${dayNumber}" min="4" max="32" value="8"
                               onchange="updateAdvancedConfigInfo(${dayNumber})"
                               style="width: 60px; padding: 6px 8px; border: 2px solid #e67e22; border-radius: 5px; font-size: 12px;">
                    </label>

                    <label style="display: flex; align-items: center; gap: 6px; font-size: 12px;">
                        <span style="font-weight: 600; color: #2c3e50;">⚡ Matchs/joueur:</span>
                        <select id="matches-per-player-adv-${dayNumber}" onchange="updateAdvancedConfigInfo(${dayNumber})" style="padding: 6px 8px; border: 2px solid #16a085; border-radius: 5px; font-size: 12px;">
                            <option value="">Tous contre tous</option>
                            <option value="3" selected>3 matchs</option>
                            <option value="4">4 matchs</option>
                            <option value="5">5 matchs</option>
                        </select>
                    </label>
                </div>

                <!-- Message informatif dynamique -->
                <div id="config-info-${dayNumber}" style="
                    background: rgba(52, 152, 219, 0.1);
                    padding: 8px 10px;
                    border-radius: 5px;
                    margin-bottom: 12px;
                    font-size: 11px;
                    color: #2c3e50;
                    text-align: center;
                    border-left: 3px solid #3498db;
                    display: none;
                "></div>

                <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
                    <button class="btn" onclick="generatePools(${dayNumber})" style="
                        background: linear-gradient(135deg, #27ae60, #2ecc71);
                        color: white;
                        padding: 8px 15px;
                        font-size: 12px;
                    ">
                        🎯 Générer Poules
                    </button>

                    <button class="btn" onclick="generateFinalPhase(${dayNumber})" style="
                        background: linear-gradient(135deg, #f39c12, #e67e22);
                        color: white;
                        padding: 8px 15px;
                        font-size: 12px;
                    " disabled id="final-phase-btn-${dayNumber}">
                        🏆 Phase Finale
                    </button>

                    <button class="btn" onclick="generateDirectFinalPhase(${dayNumber})" style="
                        background: linear-gradient(135deg, #9b59b6, #8e44ad);
                        color: white;
                        padding: 8px 15px;
                        font-size: 12px;
                    " id="direct-final-btn-${dayNumber}">
                        ⚡ Élimination Directe
                    </button>

                    <button class="btn" onclick="generateSeasonFinalPhase(${dayNumber})" style="
                        background: linear-gradient(135deg, #f39c12, #e67e22);
                        color: white;
                        padding: 8px 15px;
                        font-size: 12px;
                    " id="season-final-btn-${dayNumber}">
                        🏆 Finale Saison
                    </button>
                </div>
            </div>

            <div class="pool-info" style="
                background: rgba(255, 255, 255, 0.8);
                padding: 10px;
                border-radius: 6px;
                margin-top: 10px;
                font-size: 11px;
                color: #2c3e50;
                display: none;
            " id="pool-info-${dayNumber}">
                <strong>ℹ️ Comment ça marche :</strong><br>
                1. Les joueurs sont répartis en poules équilibrées<br>
                2. Chaque poule joue en round-robin<br>
                3. Les meilleurs se qualifient pour les phases finales<br>
                4. Tableaux à élimination directe pour désigner les champions
            </div>
        </div>
    `;

    dayHubContent.insertAdjacentHTML('afterend', poolToggleHTML);
}

// ======================================
// FONCTIONS DE GESTION DES POULES
// ======================================

// Toggle entre Mode Simple et Mode Avancé pour la configuration des poules
function togglePoolConfigMode(dayNumber, mode) {
    const simpleConfig = document.getElementById(`simple-config-${dayNumber}`);
    const advancedConfig = document.getElementById(`advanced-config-${dayNumber}`);
    const configInfo = document.getElementById(`config-info-${dayNumber}`);

    // Sauvegarder le mode choisi
    const dayData = championship.days[dayNumber];
    if (!dayData.pools.config) {
        dayData.pools.config = {};
    }
    dayData.pools.config.mode = mode;
    saveToLocalStorage();

    if (mode === 'simple') {
        simpleConfig.style.display = 'flex';
        advancedConfig.style.display = 'none';
        updateSimpleConfigInfo(dayNumber);
    } else {
        simpleConfig.style.display = 'none';
        advancedConfig.style.display = 'flex';
        updateAdvancedConfigInfo(dayNumber);
    }
}

// Met à jour le message informatif pour le Mode Simple
function updateSimpleConfigInfo(dayNumber) {
    const configInfo = document.getElementById(`config-info-${dayNumber}`);
    const poolSize = parseInt(document.getElementById(`pool-size-${dayNumber}`).value);
    const qualifiedPerPool = parseInt(document.getElementById(`qualified-per-pool-${dayNumber}`).value);
    const matchesPerPlayerInput = document.getElementById(`matches-per-player-${dayNumber}`);
    const matchesPerPlayer = matchesPerPlayerInput?.value ? parseInt(matchesPerPlayerInput.value) : null;

    const dayData = championship.days[dayNumber];
    const numDivisions = championship.config?.numberOfDivisions || 3;

    // Sauvegarder la configuration
    if (!dayData.pools.config) {
        dayData.pools.config = {};
    }
    dayData.pools.config.mode = 'simple';
    dayData.pools.config.poolSize = poolSize;
    dayData.pools.config.qualifiedPerPool = qualifiedPerPool;
    dayData.pools.config.matchesPerPlayer = matchesPerPlayer;
    saveToLocalStorage();

    let infoHTML = '<strong>ℹ️ Configuration Simple :</strong><br>';

    for (let division = 1; division <= numDivisions; division++) {
        const players = dayData.players[division] || [];
        if (players.length === 0) continue;

        const numPools = Math.ceil(players.length / poolSize);
        const totalQualified = numPools * qualifiedPerPool;

        // Calculer le nombre de matchs par poule
        let matchesPerPoolText = '';
        if (!matchesPerPlayer || matchesPerPlayer >= poolSize - 1) {
            // Round-robin complet
            const matchesPerPool = (poolSize * (poolSize - 1)) / 2;
            matchesPerPoolText = `~${matchesPerPool} matchs/poule (tous contre tous)`;
        } else {
            // Limité
            const matchesPerPool = (poolSize * matchesPerPlayer) / 2;
            matchesPerPoolText = `${matchesPerPool} matchs/poule (${matchesPerPlayer} par joueur)`;
        }

        infoHTML += `Division ${division}: ${players.length} joueurs → ${numPools} poule(s) → ${totalQualified} qualifié(s) → ${matchesPerPoolText}<br>`;
    }

    configInfo.innerHTML = infoHTML;
    configInfo.style.display = 'block';
    configInfo.style.borderLeftColor = '#3498db';
    configInfo.style.background = 'rgba(52, 152, 219, 0.1)';
}

// Met à jour le message informatif pour le Mode Avancé avec validation
function updateAdvancedConfigInfo(dayNumber) {
    const configInfo = document.getElementById(`config-info-${dayNumber}`);
    const numPoolsEl = document.getElementById(`num-pools-${dayNumber}`);
    const totalQualifiedEl = document.getElementById(`total-qualified-${dayNumber}`);
    const matchesPerPlayerInput = document.getElementById(`matches-per-player-adv-${dayNumber}`);

    if (!numPoolsEl || !totalQualifiedEl) return;

    const numPools = parseInt(numPoolsEl.value);
    const totalQualified = parseInt(totalQualifiedEl.value);
    const matchesPerPlayer = matchesPerPlayerInput?.value ? parseInt(matchesPerPlayerInput.value) : null;

    const dayData = championship.days[dayNumber];
    const numDivisions = championship.config?.numberOfDivisions || 3;

    // Sauvegarder la configuration avancée
    if (!dayData.pools.config) {
        dayData.pools.config = {};
    }
    dayData.pools.config.mode = 'advanced';
    dayData.pools.config.numPools = numPools;
    dayData.pools.config.totalQualified = totalQualified;
    dayData.pools.config.matchesPerPlayer = matchesPerPlayer;
    saveToLocalStorage();

    let infoHTML = '';
    let hasWarning = false;

    for (let division = 1; division <= numDivisions; division++) {
        const players = dayData.players[division] || [];
        if (players.length === 0) continue;

        const result = calculateQualificationDistribution(numPools, totalQualified, players.length);
        const poolSize = Math.ceil(players.length / numPools);

        infoHTML += `<div style="background: white; padding: 10px; border-radius: 8px; margin-bottom: 10px; border: 2px solid #3498db;">`;
        infoHTML += `<div style="font-weight: bold; color: #2c3e50; margin-bottom: 8px; font-size: 13px;">📋 Division ${division} — ${players.length} joueurs</div>`;

        // Structure des poules
        infoHTML += `<div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px;">`;
        infoHTML += `<span style="background: #3498db; color: white; padding: 3px 8px; border-radius: 12px; font-size: 11px;">${result.poolSizeInfo}</span>`;

        // Matchs par poule
        if (!matchesPerPlayer || matchesPerPlayer >= poolSize - 1) {
            const matchesPerPool = Math.round((poolSize * (poolSize - 1)) / 2);
            infoHTML += `<span style="background: #9b59b6; color: white; padding: 3px 8px; border-radius: 12px; font-size: 11px;">~${matchesPerPool} matchs/poule</span>`;
        } else {
            const matchesPerPool = Math.round((poolSize * matchesPerPlayer) / 2);
            infoHTML += `<span style="background: #16a085; color: white; padding: 3px 8px; border-radius: 12px; font-size: 11px;">${matchesPerPlayer} matchs/joueur</span>`;
        }
        infoHTML += `</div>`;

        // Logique de qualification - APERÇU DÉTAILLÉ
        infoHTML += `<div style="background: linear-gradient(135deg, #27ae60, #2ecc71); color: white; padding: 10px; border-radius: 8px; margin-top: 8px;">`;
        infoHTML += `<div style="font-weight: bold; margin-bottom: 6px; font-size: 12px;">🏆 Logique de Qualification → ${totalQualified} qualifiés</div>`;

        // Affichage visuel de la logique
        infoHTML += `<div style="background: rgba(255,255,255,0.2); padding: 8px; border-radius: 6px; font-size: 11px;">`;

        if (result.topPerPool === 0) {
            infoHTML += `<div style="margin-bottom: 4px;">🥇 Les <strong>${totalQualified} meilleurs 1ers</strong> toutes poules confondues</div>`;
        } else if (result.bestRunnerUps === 0) {
            // Cas parfait
            if (result.topPerPool === 1) {
                infoHTML += `<div>🥇 <strong>1er de chaque poule</strong> (${numPools} qualifiés directs)</div>`;
            } else if (result.topPerPool === 2) {
                infoHTML += `<div>🥇 <strong>1er</strong> + 🥈 <strong>2ème de chaque poule</strong> (${numPools * 2} qualifiés directs)</div>`;
            } else {
                infoHTML += `<div>🏅 <strong>Top ${result.topPerPool} de chaque poule</strong> (${numPools * result.topPerPool} qualifiés directs)</div>`;
            }
        } else {
            // Cas hybride - le plus intéressant !
            const directQualified = result.topPerPool * numPools;
            const positionOrdinal = result.runnerUpPosition === 2 ? '2èmes' : result.runnerUpPosition === 3 ? '3èmes' : result.runnerUpPosition === 4 ? '4èmes' : `${result.runnerUpPosition}èmes`;

            infoHTML += `<div style="margin-bottom: 6px;">`;
            if (result.topPerPool === 1) {
                infoHTML += `🥇 <strong>1er de chaque poule</strong> → ${directQualified} qualifiés directs`;
            } else if (result.topPerPool === 2) {
                infoHTML += `🥇🥈 <strong>1er + 2ème de chaque poule</strong> → ${directQualified} qualifiés directs`;
            } else {
                infoHTML += `🏅 <strong>Top ${result.topPerPool} de chaque poule</strong> → ${directQualified} qualifiés directs`;
            }
            infoHTML += `</div>`;

            infoHTML += `<div style="background: rgba(0,0,0,0.1); padding: 4px 8px; border-radius: 4px;">`;
            infoHTML += `➕ Les <strong>${result.bestRunnerUps} meilleurs ${positionOrdinal}</strong> toutes poules confondues`;
            infoHTML += `</div>`;
        }
        infoHTML += `</div>`;

        // Phase finale
        const finalPhaseType = getFinalPhaseType(totalQualified);
        infoHTML += `<div style="margin-top: 6px; font-size: 10px; opacity: 0.9;">`;
        infoHTML += `📊 Phase finale : <strong>${finalPhaseType}</strong>`;
        infoHTML += `</div>`;

        infoHTML += `</div>`; // Fin bloc qualification

        // Avertissements
        if (result.warnings && result.warnings.length > 0) {
            hasWarning = true;
            infoHTML += `<div style="margin-top: 8px;">`;
            result.warnings.forEach(warning => {
                infoHTML += `<div style="background: #fff3cd; color: #856404; padding: 4px 8px; border-radius: 4px; font-size: 10px; margin-bottom: 2px;">⚠️ ${warning}</div>`;
            });
            infoHTML += `</div>`;
        }

        infoHTML += `</div>`; // Fin division
    }

    configInfo.innerHTML = infoHTML;
    configInfo.style.display = 'block';
    configInfo.style.padding = '0';
    configInfo.style.background = 'transparent';
    configInfo.style.borderLeft = 'none';
}

// Retourne le type de phase finale selon le nombre de qualifiés
function getFinalPhaseType(numQualified) {
    if (numQualified <= 2) return 'Finale directe';
    if (numQualified <= 4) return 'Demi-finales → Finale';
    if (numQualified <= 8) return 'Quarts → Demi → Finale';
    if (numQualified <= 16) return 'Huitièmes → Quarts → Demi → Finale';
    if (numQualified <= 32) return 'Seizièmes → ... → Finale';
    return 'Tableau à élimination directe';
}

// Calcule la distribution de qualification pour le Mode Avancé
function calculateQualificationDistribution(numPools, totalQualified, totalPlayers) {
    const result = {
        topPerPool: 0,
        bestRunnerUps: 0,
        runnerUpPosition: 3, // 3ème, 4ème, etc.
        poolSizeInfo: '',
        qualificationInfo: '',
        warnings: [],
        isValid: true
    };

    // Validation de base
    if (totalQualified < numPools) {
        result.warnings.push(`Moins d'1 qualifié par poule en moyenne (${totalQualified}/${numPools})`);
        result.isValid = false;
    }

    if (totalQualified > totalPlayers) {
        result.warnings.push(`Plus de qualifiés que de joueurs disponibles !`);
        result.isValid = false;
        totalQualified = totalPlayers;
    }

    // Calcul de la taille des poules
    const poolSize = Math.ceil(totalPlayers / numPools);
    const evenDivision = totalPlayers % numPools === 0;

    if (evenDivision) {
        result.poolSizeInfo = `${numPools} poules de ${poolSize} joueurs`;
    } else {
        const fullPools = totalPlayers % numPools;
        const smallPools = numPools - fullPools;
        result.poolSizeInfo = `${fullPools} poule(s) de ${poolSize} + ${smallPools} poule(s) de ${poolSize - 1} joueurs`;
        result.warnings.push('Poules de tailles inégales');
    }

    // Calcul de la répartition de qualification (Hybride)
    result.topPerPool = Math.floor(totalQualified / numPools);
    result.bestRunnerUps = totalQualified % numPools;

    if (result.topPerPool === 0) {
        // Cas extrême: moins de qualifiés que de poules
        result.topPerPool = 0;
        result.bestRunnerUps = totalQualified;
        result.runnerUpPosition = 1;
        result.qualificationInfo = `Les ${totalQualified} meilleurs 1ers`;
    } else if (result.bestRunnerUps === 0) {
        // Cas parfait: division exacte
        result.qualificationInfo = `${result.topPerPool} premier(s) de chaque poule`;
    } else {
        // Cas hybride: top N + meilleurs runners-up
        result.runnerUpPosition = result.topPerPool + 1;
        const positionName = result.runnerUpPosition === 3 ? '3èmes' : result.runnerUpPosition === 4 ? '4èmes' : `${result.runnerUpPosition}èmes`;
        result.qualificationInfo = `${result.topPerPool} premier(s) par poule + ${result.bestRunnerUps} meilleur(s) ${positionName}`;
    }

    // Vérification puissance de 2 pour tableau final
    const isPowerOf2 = (n) => n && (n & (n - 1)) === 0;
    if (!isPowerOf2(totalQualified) && totalQualified >= 4) {
        const suggested = [4, 8, 16, 32, 64].find(n => n >= totalQualified) || 64;
        result.warnings.push(`${totalQualified} qualifiés nécessitera des BYEs. Recommandé: ${suggested}`);
    }

    return result;
}

// Toggle l'affichage de la section mode poules
function togglePoolSection(dayNumber) {
    const poolSection = document.getElementById(`pool-toggle-${dayNumber}`);
    const toggleBtn = document.getElementById(`show-pool-btn-${dayNumber}`);

    if (poolSection) {
        if (poolSection.style.display === 'none') {
            poolSection.style.display = 'block';
            if (toggleBtn) {
                toggleBtn.textContent = '🏊 Masquer';
                toggleBtn.style.background = '#dc2626';
            }
        } else {
            poolSection.style.display = 'none';
            if (toggleBtn) {
                toggleBtn.textContent = '🏊 Poules';
                toggleBtn.style.background = '#f59e0b';
            }
        }
    }
}

// Toggle le hub de configuration d'une journée
function toggleDayHub(dayNumber) {
    const hubContent = document.getElementById(`day-hub-content-${dayNumber}`);
    const collapseIcon = document.getElementById(`day-hub-icon-${dayNumber}`);

    if (!hubContent || !collapseIcon) return;

    const isCollapsed = hubContent.style.display === 'none';

    if (isCollapsed) {
        hubContent.style.display = 'block';
        collapseIcon.textContent = '▼';
        collapseIcon.style.transform = 'rotate(0deg)';
    } else {
        hubContent.style.display = 'none';
        collapseIcon.textContent = '▶';
        collapseIcon.style.transform = 'rotate(0deg)';
    }

    saveCollapseState(dayNumber, !isCollapsed);
}

// Toggle le hub du classement général
function toggleGeneralHub() {
    const hubContent = document.getElementById('general-hub-content');
    const collapseIcon = document.getElementById('general-hub-icon');

    if (!hubContent || !collapseIcon) return;

    const isCollapsed = hubContent.style.display === 'none';

    if (isCollapsed) {
        hubContent.style.display = 'block';
        collapseIcon.textContent = '▼';
        collapseIcon.style.transform = 'rotate(0deg)';
    } else {
        hubContent.style.display = 'none';
        collapseIcon.textContent = '▶';
        collapseIcon.style.transform = 'rotate(0deg)';
    }

    saveCollapseState('general', !isCollapsed);
}

// Sauvegarde l'état collapse dans localStorage
function saveCollapseState(key, isCollapsed) {
    try {
        let collapseState = JSON.parse(localStorage.getItem('collapseState') || '{}');
        collapseState[key] = isCollapsed;
        localStorage.setItem('collapseState', JSON.stringify(collapseState));
    } catch (e) {
        console.error('Erreur sauvegarde collapse state:', e);
    }
}

// Restaure l'état collapse depuis localStorage
function restoreCollapseState() {
    try {
        const collapseState = JSON.parse(localStorage.getItem('collapseState') || '{}');

        // Restaurer l'état pour chaque journée existante
        Object.keys(championship.days || {}).forEach(dayNumber => {
            const hubContent = document.getElementById(`day-hub-content-${dayNumber}`);
            const collapseIcon = document.getElementById(`day-hub-icon-${dayNumber}`);

            if (hubContent && collapseIcon && collapseState[dayNumber]) {
                hubContent.style.display = 'none';
                collapseIcon.textContent = '▶';
                collapseIcon.style.transform = 'rotate(0deg)';
            }
        });

        // Restaurer l'état du classement général
        if (collapseState['general']) {
            const hubContent = document.getElementById('general-hub-content');
            const collapseIcon = document.getElementById('general-hub-icon');

            if (hubContent && collapseIcon) {
                hubContent.style.display = 'none';
                collapseIcon.textContent = '▶';
                collapseIcon.style.transform = 'rotate(0deg)';
            }
        }
    } catch (e) {
        console.error('Erreur restauration collapse state:', e);
    }
}

function togglePoolMode(dayNumber) {
    const checkbox = document.getElementById(`pool-enabled-${dayNumber}`);
    const config = document.getElementById(`pool-config-${dayNumber}`);
    const info = document.getElementById(`pool-info-${dayNumber}`);
    const generateButton = document.querySelector(`#day-${dayNumber} button[onclick*="generateMatchesForDay"]`);
    
    initializePoolSystem(dayNumber);
    
    if (checkbox.checked) {
        // Activer mode poules
        championship.days[dayNumber].pools.enabled = true;
        config.style.display = 'block';
        info.style.display = 'block';
        
        // Désactiver l'ancien bouton
        if (generateButton) {
            generateButton.style.opacity = '0.5';
            generateButton.style.pointerEvents = 'none';
            generateButton.innerHTML = '⚠️ Mode Poules Activé - Utilisez les boutons ci-dessus';
        }
        
        showNotification('Mode Poules activé ! Utilisez "Générer les Poules" ci-dessus', 'info');
    } else {
        // Désactiver mode poules - Revenir au mode classique
        championship.days[dayNumber].pools.enabled = false;
        config.style.display = 'none';
        info.style.display = 'none';
        
        // Réactiver l'ancien bouton
        if (generateButton) {
            generateButton.style.opacity = '1';
            generateButton.style.pointerEvents = 'auto';
            generateButton.innerHTML = '🎯 Générer les Matchs (Round-Robin)';
        }
        
        // Nettoyer les poules existantes mais préserver les matchs round-robin classiques
        championship.days[dayNumber].pools.divisions = {
            1: { pools: [], matches: [] },
            2: { pools: [], matches: [] },
            3: { pools: [], matches: [] }
        };
        
        showNotification('Mode Poules désactivé - Retour au mode classique', 'warning');
    }
    
    saveToLocalStorage();
}

// Variable globale pour stocker le contexte du pré-remplissage
let preFillContext = null;

// Ouvrir le modal de sélection de stratégie
function preFillFromGeneralRanking(dayNumber) {
    if (dayNumber < 2) {
        showNotification('❌ Cette fonctionnalité n\'est disponible qu\'à partir de la Journée 2', 'error');
        return;
    }

    const dayData = championship.days[dayNumber];
    if (!dayData) {
        showNotification('❌ Journée introuvable', 'error');
        return;
    }

    // Récupérer le classement général (qui inclut maintenant les matchs de poules)
    const rankingData = calculateGeneralRanking();

    if (!rankingData || !rankingData.hasData) {
        showNotification('❌ Aucun classement disponible. Jouez d\'abord la Journée 1.', 'error');
        return;
    }

    // Stocker le contexte pour l'utiliser après la sélection de la stratégie
    preFillContext = {
        dayNumber: dayNumber,
        dayData: dayData,
        rankingData: rankingData,
        mode: null // 'reorganize' ou 'prefill'
    };

    // Ouvrir le modal de sélection de stratégie (étape 1 : choix du mode)
    const modal = document.getElementById('poolPreFillStrategyModal');
    if (modal) modal.style.display = 'block';

    // Afficher l'étape 1 (choix du mode)
    document.getElementById('preFillModeSelection').style.display = 'block';
    document.getElementById('preFillStrategySelection').style.display = 'none';
}

// Fermer le modal de stratégie
function closePoolPreFillStrategyModal() {
    const modal = document.getElementById('poolPreFillStrategyModal');
    if (modal) modal.style.display = 'none';
    preFillContext = null;

    // Réinitialiser l'affichage
    document.getElementById('preFillModeSelection').style.display = 'block';
    document.getElementById('preFillStrategySelection').style.display = 'none';
}

// Retour à la sélection du mode
function backToModeSelection() {
    document.getElementById('preFillModeSelection').style.display = 'block';
    document.getElementById('preFillStrategySelection').style.display = 'none';
}

// Sélectionner le mode (reorganize ou prefill)
function selectPreFillMode(mode) {
    if (!preFillContext) {
        showNotification('❌ Erreur : contexte de pré-remplissage non trouvé', 'error');
        return;
    }

    // Stocker le mode choisi
    preFillContext.mode = mode;

    // Passer à l'étape 2 : choix de la stratégie
    document.getElementById('preFillModeSelection').style.display = 'none';
    document.getElementById('preFillStrategySelection').style.display = 'block';
}

// Appliquer la stratégie sélectionnée
function applyPreFillStrategy(strategy) {
    if (!preFillContext) {
        showNotification('❌ Erreur : contexte de pré-remplissage non trouvé', 'error');
        return;
    }

    const { dayNumber, dayData, rankingData, mode } = preFillContext;
    const numDivisions = championship.config.numDivisions || 3;

    let sourceData = null;

    // MODE 1 : Réorganiser les joueurs existants de la journée PRÉCÉDENTE
    if (mode === 'reorganize') {
        // Récupérer TOUS les joueurs de la journée précédente
        const previousDayNumber = dayNumber - 1;
        const previousDayData = championship.days[previousDayNumber];

        if (!previousDayData) {
            showNotification('❌ Aucune journée précédente trouvée.', 'error');
            closePoolPreFillStrategyModal();
            return;
        }

        const existingPlayers = [];
        for (let div = 1; div <= numDivisions; div++) {
            if (previousDayData.players[div] && previousDayData.players[div].length > 0) {
                previousDayData.players[div].forEach(playerName => {
                    existingPlayers.push(playerName);
                });
            }
        }

        if (existingPlayers.length === 0) {
            showNotification('❌ Aucun joueur dans la journée précédente. Utilisez le mode "Pré-remplir depuis le classement".', 'error');
            closePoolPreFillStrategyModal();
            return;
        }

        // Vider les divisions de la journée actuelle avant de les remplir
        for (let div = 1; div <= numDivisions; div++) {
            dayData.players[div] = [];
        }

        // Créer un classement local basé sur le général pour ces joueurs
        sourceData = {
            type: 'reorganize',
            players: existingPlayers,
            rankingData: rankingData
        };

    // MODE 2 : Pré-remplir depuis le classement général
    } else if (mode === 'prefill') {
        sourceData = {
            type: 'prefill',
            rankingData: rankingData
        };
    }

    // Créer un tableau avec tous les joueurs classés (toutes divisions confondues)
    const allPlayers = [];

    if (sourceData.type === 'reorganize') {
        // Utiliser uniquement les joueurs existants
        for (let div = 1; div <= numDivisions; div++) {
            if (rankingData.divisions[div] && rankingData.divisions[div].length > 0) {
                rankingData.divisions[div].forEach(player => {
                    // Ne garder que les joueurs qui étaient dans la journée
                    if (sourceData.players.includes(player.name)) {
                        allPlayers.push({
                            name: player.name,
                            currentDivision: div, // Sauvegarde de la division actuelle
                            totalPoints: player.totalPoints,
                            totalWins: player.totalWins,
                            goalAveragePoints: player.goalAveragePoints,
                            totalPointsWon: player.totalPointsWon,
                            avgWinRate: player.avgWinRate
                        });
                    }
                });
            }
        }
    } else {
        // Utiliser tous les joueurs du classement
        for (let div = 1; div <= numDivisions; div++) {
            if (rankingData.divisions[div] && rankingData.divisions[div].length > 0) {
                rankingData.divisions[div].forEach(player => {
                    allPlayers.push({
                        name: player.name,
                        currentDivision: div,
                        totalPoints: player.totalPoints,
                        totalWins: player.totalWins,
                        goalAveragePoints: player.goalAveragePoints,
                        totalPointsWon: player.totalPointsWon,
                        avgWinRate: player.avgWinRate
                    });
                });
            }
        }
    }

    // Trier tous les joueurs ensemble (inter-divisions)
    allPlayers.sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
        if (b.totalWins !== a.totalWins) return b.totalWins - a.totalWins;
        if (b.goalAveragePoints !== a.goalAveragePoints) return b.goalAveragePoints - a.goalAveragePoints;
        if (b.totalPointsWon !== a.totalPointsWon) return b.totalPointsWon - a.totalPointsWon;
        if (b.avgWinRate !== a.avgWinRate) return b.avgWinRate - a.avgWinRate;
        return a.name.localeCompare(b.name);
    });

    if (allPlayers.length === 0) {
        showNotification('❌ Aucun joueur trouvé dans le classement.', 'error');
        closePoolPreFillStrategyModal();
        return;
    }

    let addedCount = 0;

    // Regrouper les joueurs par division actuelle
    const playersByDivision = {};
    for (let div = 1; div <= numDivisions; div++) {
        playersByDivision[div] = allPlayers.filter(p => p.currentDivision === div);
    }

    // Appliquer la stratégie sélectionnée
    if (strategy === 'by-level') {
        // Stratégie PAR NIVEAU : Les joueurs restent dans leur division
        // Ils sont simplement triés du meilleur au moins bon au sein de chaque division

        for (let div = 1; div <= numDivisions; div++) {
            if (playersByDivision[div] && playersByDivision[div].length > 0) {
                // Les joueurs sont déjà triés dans allPlayers
                playersByDivision[div].forEach(player => {
                    const playerName = player.name;

                    if (!dayData.players[div]) {
                        dayData.players[div] = [];
                    }

                    if (!dayData.players[div].includes(playerName)) {
                        dayData.players[div].push(playerName);
                        addedCount++;
                    }
                });
            }
        }

    } else if (strategy === 'snake') {
        // Stratégie SERPENT : Les joueurs restent dans leur division
        // Ordre serpent : 1er, dernier, 2e, avant-dernier, 3e, etc.
        // Équilibre les poules en mélangeant forts et faibles

        for (let div = 1; div <= numDivisions; div++) {
            if (playersByDivision[div] && playersByDivision[div].length > 0) {
                const players = [...playersByDivision[div]];
                const snakeOrder = [];

                let leftIndex = 0;
                let rightIndex = players.length - 1;
                let pickFromLeft = true;

                while (leftIndex <= rightIndex) {
                    if (pickFromLeft) {
                        snakeOrder.push(players[leftIndex]);
                        leftIndex++;
                    } else {
                        snakeOrder.push(players[rightIndex]);
                        rightIndex--;
                    }
                    pickFromLeft = !pickFromLeft;
                }

                // Ajouter les joueurs dans l'ordre serpent
                snakeOrder.forEach(player => {
                    const playerName = player.name;

                    if (!dayData.players[div]) {
                        dayData.players[div] = [];
                    }

                    if (!dayData.players[div].includes(playerName)) {
                        dayData.players[div].push(playerName);
                        addedCount++;
                    }
                });
            }
        }

    } else if (strategy === 'balanced') {
        // Stratégie MIXTE ÉQUILIBRÉ : Les joueurs restent dans leur division
        // Dans chaque division : diviser en 3 tiers (forts/moyens/faibles)
        // Puis alterner : 1 fort, 1 moyen, 1 faible, 1 fort, 1 moyen, 1 faible...

        for (let div = 1; div <= numDivisions; div++) {
            if (playersByDivision[div] && playersByDivision[div].length > 0) {
                const players = [...playersByDivision[div]];
                const tierSize = Math.ceil(players.length / 3);

                const topTier = players.slice(0, tierSize);
                const midTier = players.slice(tierSize, tierSize * 2);
                const lowTier = players.slice(tierSize * 2);

                const balancedOrder = [];
                const maxLength = Math.max(topTier.length, midTier.length, lowTier.length);

                // Alterner entre les 3 tiers
                for (let i = 0; i < maxLength; i++) {
                    if (i < topTier.length) balancedOrder.push(topTier[i]);
                    if (i < midTier.length) balancedOrder.push(midTier[i]);
                    if (i < lowTier.length) balancedOrder.push(lowTier[i]);
                }

                // Ajouter les joueurs dans l'ordre équilibré
                balancedOrder.forEach(player => {
                    const playerName = player.name;

                    if (!dayData.players[div]) {
                        dayData.players[div] = [];
                    }

                    if (!dayData.players[div].includes(playerName)) {
                        dayData.players[div].push(playerName);
                        addedCount++;
                    }
                });
            }
        }

    } else if (strategy === 'rebalance') {
        // Stratégie ÉQUILIBRER : Promotions/Relégations entre divisions
        // Les meilleurs de chaque division montent, les derniers descendent

        // Demander combien de joueurs faire monter/descendre
        const numToPromote = parseInt(prompt('Combien de joueurs faire monter/descendre entre chaque division ?', '2'));

        if (isNaN(numToPromote) || numToPromote <= 0) {
            showNotification('❌ Nombre invalide. Opération annulée.', 'error');
            closePoolPreFillStrategyModal();
            return;
        }

        // Pour chaque division, récupérer le classement actuel
        const divisionRankings = {};
        for (let div = 1; div <= numDivisions; div++) {
            if (playersByDivision[div] && playersByDivision[div].length > 0) {
                // Copier le classement de la division
                divisionRankings[div] = [...playersByDivision[div]];
            } else {
                divisionRankings[div] = [];
            }
        }

        // Créer les nouvelles compositions de divisions
        const newDivisions = {};
        for (let div = 1; div <= numDivisions; div++) {
            newDivisions[div] = [];
        }

        // Traiter chaque division
        for (let div = 1; div <= numDivisions; div++) {
            const currentDivisionPlayers = divisionRankings[div];

            if (currentDivisionPlayers.length === 0) continue;

            // Division 1 : Garder tous sauf les derniers (qui descendent en D2)
            if (div === 1) {
                const toKeep = currentDivisionPlayers.slice(0, -numToPromote);
                toKeep.forEach(p => newDivisions[1].push(p.name));

                // Les derniers descendent en D2
                if (numDivisions > 1) {
                    const toRelegate = currentDivisionPlayers.slice(-numToPromote);
                    toRelegate.forEach(p => newDivisions[2].push(p.name));
                }
            }
            // Division intermédiaire : Les meilleurs montent, les derniers descendent, le reste reste
            else if (div > 1 && div < numDivisions) {
                // Les meilleurs montent
                const toPromoteUp = currentDivisionPlayers.slice(0, numToPromote);
                toPromoteUp.forEach(p => newDivisions[div - 1].push(p.name));

                // Les derniers descendent
                const toRelegate = currentDivisionPlayers.slice(-numToPromote);
                toRelegate.forEach(p => newDivisions[div + 1].push(p.name));

                // Le reste reste dans la division
                const toKeep = currentDivisionPlayers.slice(numToPromote, -numToPromote);
                toKeep.forEach(p => newDivisions[div].push(p.name));
            }
            // Dernière division : Les meilleurs montent, les autres restent
            else if (div === numDivisions) {
                // Les meilleurs montent
                const toPromoteUp = currentDivisionPlayers.slice(0, numToPromote);
                toPromoteUp.forEach(p => newDivisions[div - 1].push(p.name));

                // Le reste reste dans la division
                const toKeep = currentDivisionPlayers.slice(numToPromote);
                toKeep.forEach(p => newDivisions[div].push(p.name));
            }
        }

        // Appliquer les nouvelles divisions
        for (let div = 1; div <= numDivisions; div++) {
            if (!dayData.players[div]) {
                dayData.players[div] = [];
            }

            newDivisions[div].forEach(playerName => {
                if (!dayData.players[div].includes(playerName)) {
                    dayData.players[div].push(playerName);
                    addedCount++;
                }
            });
        }
    }

    // Mettre à jour l'affichage des joueurs pour toutes les divisions
    initializeDivisionsDisplay(dayNumber);
    saveToLocalStorage();

    // Fermer le modal
    closePoolPreFillStrategyModal();

    const strategyNames = {
        'by-level': 'Par Niveau',
        'snake': 'Serpent',
        'balanced': 'Mixte Équilibré',
        'rebalance': 'Équilibrer les Divisions'
    };

    const modeText = mode === 'reorganize'
        ? `${addedCount} joueur(s) réorganisé(s)`
        : `${addedCount} joueur(s) ajouté(s)`;

    // GÉNÉRER AUTOMATIQUEMENT LES POULES (si le mode poules est activé)
    if (dayData.pools && dayData.pools.enabled) {
        generatePools(dayNumber);

        showNotification(
            `✅ ${modeText} - Stratégie: ${strategyNames[strategy]}\n` +
            `🎯 Poules générées automatiquement !`,
            'success',
            5000
        );
    } else {
        showNotification(
            `✅ ${modeText} - Stratégie: ${strategyNames[strategy]}\n` +
            `💡 Mode poules non activé. Activez-le pour générer les matchs.`,
            'success',
            5000
        );
    }
}

function generatePools(dayNumber) {
    const dayData = championship.days[dayNumber];
    if (!dayData.pools || !dayData.pools.enabled) return;

    // Détecter le mode de configuration actif
    const modeRadios = document.querySelectorAll(`input[name="pool-config-mode-${dayNumber}"]`);
    let configMode = 'simple';
    modeRadios.forEach(radio => {
        if (radio.checked) configMode = radio.value;
    });

    const numDivisions = championship.config.numDivisions || 3;
    let totalMatches = 0;
    let poolSize;
    let numPools;
    let totalQualified;

    // Lire les paramètres selon le mode
    if (configMode === 'simple') {
        poolSize = parseInt(document.getElementById(`pool-size-${dayNumber}`).value);
    } else {
        numPools = parseInt(document.getElementById(`num-pools-${dayNumber}`).value);
        totalQualified = parseInt(document.getElementById(`total-qualified-${dayNumber}`).value);
    }

    // Lire le paramètre matchesPerPlayer (global pour tous les modes)
    const matchesPerPlayerInput = configMode === 'simple'
        ? document.getElementById(`matches-per-player-${dayNumber}`)
        : document.getElementById(`matches-per-player-adv-${dayNumber}`);
    const matchesPerPlayer = matchesPerPlayerInput?.value ? parseInt(matchesPerPlayerInput.value) : null;

    console.log(`🎯 Configuration pools J${dayNumber}:`, { mode: configMode, matchesPerPlayer });

    // Sauvegarder la configuration du mode
    if (!dayData.pools.config) {
        dayData.pools.config = {};
    }
    dayData.pools.config.mode = configMode;
    dayData.pools.config.matchesPerPlayer = matchesPerPlayer; // Sauvegarde globale

    for (let division = 1; division <= numDivisions; division++) {
        // Normaliser les joueurs : extraire le nom si c'est un objet {name, club}
        const players = (dayData.players[division] || []).map(p => getPlayerName(p));
        if (players.length < 4) {
            if (players.length > 0) {
                alert(`Division ${division}: Il faut au moins 4 joueurs pour créer des poules (${players.length} actuellement)`);
            }
            continue;
        }

        // En mode avancé, calculer la taille des poules
        if (configMode === 'advanced') {
            poolSize = Math.ceil(players.length / numPools);

            // Sauvegarder les paramètres avancés pour cette division
            const distResult = calculateQualificationDistribution(numPools, totalQualified, players.length);
            if (!dayData.pools.config.divisions) {
                dayData.pools.config.divisions = {};
            }
            dayData.pools.config.divisions[division] = {
                numPools: numPools,
                totalQualified: totalQualified,
                topPerPool: distResult.topPerPool,
                bestRunnerUps: distResult.bestRunnerUps,
                runnerUpPosition: distResult.runnerUpPosition
            };
        } else {
            // Mode simple : sauvegarder les paramètres simples
            const qualifiedPerPool = parseInt(document.getElementById(`qualified-per-pool-${dayNumber}`).value);
            if (!dayData.pools.config.divisions) {
                dayData.pools.config.divisions = {};
            }
            dayData.pools.config.divisions[division] = {
                poolSize: poolSize,
                qualifiedPerPool: qualifiedPerPool
            };
        }

        // Calculer le nombre optimal et avertir si nécessaire (Mode Simple uniquement)
        if (configMode === 'simple') {
            const optimalCounts = calculateOptimalPlayerCounts(poolSize);
            const isOptimal = optimalCounts.includes(players.length);

            if (!isOptimal) {
                const nearest = optimalCounts.reduce((prev, curr) =>
                    Math.abs(curr - players.length) < Math.abs(prev - players.length) ? curr : prev
                );
                const notPerfectlyBalanced = players.length % poolSize !== 0;

                if (notPerfectlyBalanced) {
                    // Calculer la répartition réelle sans BYE
                    const numPools = Math.ceil(players.length / poolSize);
                    const baseSize = Math.floor(players.length / numPools);
                    const extraPools = players.length % numPools;
                    const poolDistribution = extraPools > 0
                        ? `${extraPools} poule(s) de ${baseSize + 1} + ${numPools - extraPools} poule(s) de ${baseSize}`
                        : `${numPools} poule(s) de ${baseSize}`;

                    const confirmed = confirm(
                        `ℹ️ Division ${division}: ${players.length} joueur(s)\n\n` +
                        `📊 Nombre optimal pour des poules égales de ${poolSize}: ${optimalCounts.join(', ')}\n` +
                        `💡 Le plus proche: ${nearest} joueurs\n\n` +
                        `🎯 Répartition prévue: ${poolDistribution}\n` +
                        `(Poules de tailles légèrement différentes - pratique sportive standard)\n\n` +
                        `Voulez-vous continuer ?`
                    );

                    if (!confirmed) {
                        continue;
                    }
                }
            }
        }

        // Mélanger les joueurs pour équilibrer les poules
        const shuffledPlayers = shuffleArray([...players]);
        // En mode avancé, passer le nombre de poules exact choisi par l'utilisateur
        const targetPools = (configMode === 'advanced') ? numPools : null;
        const pools = createBalancedPoolsWithBye(shuffledPlayers, poolSize, targetPools);

        // Valider le nombre de matchs par joueur pour CHAQUE poule
        if (matchesPerPlayer) {
            let hasWarning = false;
            pools.forEach((pool, idx) => {
                const realSize = pool.filter(p => !p.startsWith('BYE')).length;
                const validation = validateMatchesPerPlayer(realSize, matchesPerPlayer);
                if (!validation.valid) {
                    alert(`❌ Division ${division}, Poule ${String.fromCharCode(65 + idx)}: ${validation.message}`);
                }
                if (validation.warning && !hasWarning) {
                    hasWarning = true;
                    console.log(`⚠️ Division ${division}: ${validation.warning}`);
                }
            });
        }

        // Sauvegarder les poules
        dayData.pools.divisions[division].pools = pools;

        // Générer les matchs de poules avec le paramètre matchesPerPlayer
        const poolMatches = generatePoolMatches(pools, division, dayNumber, matchesPerPlayer);
        dayData.pools.divisions[division].matches = poolMatches;
        totalMatches += poolMatches.length;
    }

    // Mettre à jour l'affichage
    updatePoolsDisplay(dayNumber);
    saveToLocalStorage();
    
    // Activer le bouton phase finale quand toutes les poules sont terminées
    checkPoolsCompletion(dayNumber);
    
    alert(`Poules générées avec succès !\n${totalMatches} matchs de poules créés.\n\nTerminez les poules pour débloquer la phase finale.`);
}

// Calculer les nombres optimaux de joueurs pour une taille de poule donnée
function calculateOptimalPlayerCounts(poolSize) {
    const optimal = [];
    for (let numPools = 2; numPools <= 10; numPools++) {
        optimal.push(numPools * poolSize);
    }
    return optimal;
}

// Créer des poules équilibrées SANS ajouter de BYE
// Les poules peuvent avoir des tailles légèrement différentes (ex: 8 et 7 joueurs)
// C'est la pratique standard dans les tournois sportifs
// @param players - liste des joueurs
// @param maxPoolSize - taille max d'une poule (utilisé pour calculer le nombre de poules si targetNumPools non spécifié)
// @param targetNumPools - (optionnel) nombre exact de poules souhaité (mode avancé)
function createBalancedPoolsWithBye(players, maxPoolSize, targetNumPools = null) {
    const totalPlayers = players.length;

    // Utiliser le nombre de poules spécifié ou le calculer depuis maxPoolSize
    const numPools = targetNumPools || Math.ceil(totalPlayers / maxPoolSize);

    // Répartir équitablement les joueurs sans BYE
    // Ex: 38 joueurs, 5 poules → 3 poules de 8 + 2 poules de 7
    const baseSize = Math.floor(totalPlayers / numPools);
    const extraPlayers = totalPlayers % numPools;

    const pools = [];
    let playerIndex = 0;

    for (let i = 0; i < numPools; i++) {
        // Les premières poules ont 1 joueur de plus si nécessaire
        const poolSize = baseSize + (i < extraPlayers ? 1 : 0);
        const pool = players.slice(playerIndex, playerIndex + poolSize);
        pools.push(pool);
        playerIndex += poolSize;
    }

    return pools;
}

function createBalancedPools(players, maxPoolSize) {
    const numPools = Math.ceil(players.length / maxPoolSize);
    const pools = Array.from({ length: numPools }, () => []);

    // Répartition équilibrée (serpent)
    players.forEach((player, index) => {
        const poolIndex = Math.floor(index / maxPoolSize);
        if (poolIndex < numPools) {
            pools[poolIndex].push(player);
        } else {
            // Si il reste des joueurs, les répartir dans les poules existantes
            const targetPool = index % numPools;
            pools[targetPool].push(player);
        }
    });

    // Filtrer les poules vides
    return pools.filter(pool => pool.length > 0);
}

// ======================================
// VALIDATION DU NOMBRE DE MATCHS PAR JOUEUR
// ======================================

function validateMatchesPerPlayer(poolSize, matchesPerPlayer) {
    if (!matchesPerPlayer) return { valid: true }; // Round-robin complet (par défaut)

    const maxPossible = poolSize - 1;

    // Vérifier que le nombre demandé n'excède pas le maximum possible
    if (matchesPerPlayer > maxPossible) {
        return {
            valid: false,
            message: `Impossible: ${matchesPerPlayer} matchs demandés mais seulement ${maxPossible} adversaires disponibles dans une poule de ${poolSize} joueurs!`
        };
    }

    // Vérifier si la distribution parfaite est possible
    const totalEdges = poolSize * matchesPerPlayer;
    if (totalEdges % 2 !== 0) {
        // Ce n'est plus bloquant - l'algorithme gère ce cas
        // Mais on retourne un warning pour informer l'utilisateur
        return {
            valid: true,
            warning: `Note: ${poolSize} joueurs × ${matchesPerPlayer} matchs = distribution imparfaite. Certains joueurs auront ${matchesPerPlayer - 1} ou ${matchesPerPlayer} matchs.`
        };
    }

    return { valid: true };
}

// ======================================
// GÉNÉRATION DES MATCHS DE POULES
// ======================================

function generateRoundRobinMatches(pool, poolIndex, division, dayNumber, startMatchId = 0) {
    const matches = [];
    let matchId = startMatchId;

    // Génération round-robin complet: tous contre tous
    for (let i = 0; i < pool.length; i++) {
        for (let j = i + 1; j < pool.length; j++) {
            const player1 = pool[i];
            const player2 = pool[j];

            // Ne pas créer de match si l'un des joueurs est BYE
            const isBye1 = player1.startsWith('BYE');
            const isBye2 = player2.startsWith('BYE');

            if (isBye1 || isBye2) {
                // Match automatiquement gagné par le joueur non-BYE
                if (!isBye1 && isBye2) {
                    // player1 gagne automatiquement
                    matches.push({
                        id: matchId++,
                        player1: player1,
                        player2: player2,
                        poolIndex: poolIndex,
                        poolName: `Poule ${String.fromCharCode(65 + poolIndex)}`,
                        division: division,
                        dayNumber: dayNumber,
                        score1: 5,
                        score2: 0,
                        completed: true,
                        winner: player1,
                        isPoolMatch: true,
                        isByeMatch: true
                    });
                } else if (isBye1 && !isBye2) {
                    // player2 gagne automatiquement
                    matches.push({
                        id: matchId++,
                        player1: player1,
                        player2: player2,
                        poolIndex: poolIndex,
                        poolName: `Poule ${String.fromCharCode(65 + poolIndex)}`,
                        division: division,
                        dayNumber: dayNumber,
                        score1: 0,
                        score2: 5,
                        completed: true,
                        winner: player2,
                        isPoolMatch: true,
                        isByeMatch: true
                    });
                }
                // Si les deux sont BYE, on ne crée pas de match du tout
            } else {
                // Match normal
                matches.push({
                    id: matchId++,
                    player1: player1,
                    player2: player2,
                    poolIndex: poolIndex,
                    poolName: `Poule ${String.fromCharCode(65 + poolIndex)}`,
                    division: division,
                    dayNumber: dayNumber,
                    score1: '',
                    score2: '',
                    completed: false,
                    winner: null,
                    isPoolMatch: true,
                    isByeMatch: false
                });
            }
        }
    }

    return matches;
}

function generateLimitedMatches(pool, poolIndex, division, dayNumber, matchesPerPlayer, startMatchId = 0) {
    const matches = [];
    let matchId = startMatchId;
    const n = pool.length;

    // Filtrer les BYE pour le calcul
    const realPlayers = pool.filter(p => !p.startsWith('BYE'));
    const realN = realPlayers.length;

    // Vérifier si la distribution exacte est possible
    const totalConnections = realN * matchesPerPlayer;
    const isExactPossible = totalConnections % 2 === 0;

    // Calculer le nombre de matchs cible
    // Si impossible (impair), certains joueurs auront 1 match de plus ou moins
    const targetMatches = isExactPossible
        ? totalConnections / 2
        : Math.floor(totalConnections / 2);

    console.log(`📊 Poule ${String.fromCharCode(65 + poolIndex)}: ${realN} joueurs, ${matchesPerPlayer} matchs demandés`);
    console.log(`   Distribution exacte possible: ${isExactPossible ? 'OUI' : 'NON (certains auront ±1 match)'}`);

    // Tableau de suivi: combien de matchs chaque joueur a
    const matchCounts = Array(n).fill(0);
    // Set pour éviter les matchs en double
    const matchedPairs = new Set();

    // NOUVEL ALGORITHME: Priorisation par nombre de matchs restants
    // Générer toutes les paires possibles et les trier par priorité

    function generatePriorityPairs() {
        const pairs = [];
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const player1 = pool[i];
                const player2 = pool[j];
                const isBye1 = player1.startsWith('BYE');
                const isBye2 = player2.startsWith('BYE');

                // Ignorer les paires BYE vs BYE
                if (isBye1 && isBye2) continue;

                const pairKey = `${i}-${j}`;
                if (!matchedPairs.has(pairKey)) {
                    // Priorité = somme des matchs manquants (plus élevé = plus prioritaire)
                    const remaining1 = Math.max(0, matchesPerPlayer - matchCounts[i]);
                    const remaining2 = Math.max(0, matchesPerPlayer - matchCounts[j]);
                    pairs.push({
                        i, j,
                        priority: remaining1 + remaining2,
                        minRemaining: Math.min(remaining1, remaining2)
                    });
                }
            }
        }
        // Trier: d'abord par minRemaining décroissant (joueurs qui ont le plus besoin)
        // puis par priorité totale décroissante
        pairs.sort((a, b) => {
            if (b.minRemaining !== a.minRemaining) return b.minRemaining - a.minRemaining;
            return b.priority - a.priority;
        });
        return pairs;
    }

    // Générer les matchs jusqu'à atteindre le quota ou épuiser les possibilités
    let iterations = 0;
    const maxIterations = n * n; // Sécurité

    while (iterations < maxIterations) {
        // Vérifier si on a assez de matchs
        if (matches.length >= targetMatches) break;

        // Vérifier si tous les joueurs ont atteint leur quota
        const allReached = matchCounts.every((c, idx) => {
            const player = pool[idx];
            if (player.startsWith('BYE')) return true;
            return c >= matchesPerPlayer;
        });
        if (allReached) break;

        // Obtenir les paires prioritaires
        const priorityPairs = generatePriorityPairs();
        if (priorityPairs.length === 0) break;

        // Prendre la paire la plus prioritaire où les deux joueurs ont besoin de matchs
        const bestPair = priorityPairs.find(p => p.minRemaining > 0);
        if (!bestPair) break;

        const { i, j } = bestPair;
        const player1 = pool[i];
        const player2 = pool[j];
        const pairKey = `${i}-${j}`;

        matchedPairs.add(pairKey);

        const isBye1 = player1.startsWith('BYE');
        const isBye2 = player2.startsWith('BYE');

        if (isBye1 || isBye2) {
            // Gestion des BYE - ne compte pas comme match joué
            if (!isBye1 && isBye2) {
                matches.push({
                    id: matchId++,
                    player1: player1,
                    player2: player2,
                    poolIndex: poolIndex,
                    poolName: `Poule ${String.fromCharCode(65 + poolIndex)}`,
                    division: division,
                    dayNumber: dayNumber,
                    score1: '0',
                    score2: '0',
                    completed: true,
                    winner: player1,
                    isPoolMatch: true,
                    isByeMatch: true
                });
            } else if (isBye1 && !isBye2) {
                matches.push({
                    id: matchId++,
                    player1: player1,
                    player2: player2,
                    poolIndex: poolIndex,
                    poolName: `Poule ${String.fromCharCode(65 + poolIndex)}`,
                    division: division,
                    dayNumber: dayNumber,
                    score1: '0',
                    score2: '0',
                    completed: true,
                    winner: player2,
                    isPoolMatch: true,
                    isByeMatch: true
                });
            }
        } else {
            // Match normal
            matches.push({
                id: matchId++,
                player1: player1,
                player2: player2,
                poolIndex: poolIndex,
                poolName: `Poule ${String.fromCharCode(65 + poolIndex)}`,
                division: division,
                dayNumber: dayNumber,
                score1: '',
                score2: '',
                completed: false,
                winner: null,
                isPoolMatch: true,
                isByeMatch: false
            });
            matchCounts[i]++;
            matchCounts[j]++;
        }

        iterations++;
    }

    // Log de la distribution finale
    const distribution = {};
    pool.forEach((player, idx) => {
        if (!player.startsWith('BYE')) {
            distribution[player] = matchCounts[idx];
        }
    });
    console.log(`✅ Poule ${String.fromCharCode(65 + poolIndex)}: ${matches.length} matchs générés`);
    console.log(`   Distribution finale:`, distribution);

    // Vérifier si la distribution est équilibrée
    const counts = Object.values(distribution);
    const minCount = Math.min(...counts);
    const maxCount = Math.max(...counts);
    if (maxCount - minCount > 1) {
        console.warn(`⚠️ Distribution inégale dans Poule ${String.fromCharCode(65 + poolIndex)}: min=${minCount}, max=${maxCount}`);
    }

    return matches;
}

function generatePoolMatches(pools, division, dayNumber, matchesPerPlayer = null) {
    const allMatches = [];
    let matchId = 0;

    console.log(`🎯 Génération matchs pour Division ${division}:`, matchesPerPlayer ? `${matchesPerPlayer} matchs/joueur` : 'Round-robin complet');

    pools.forEach((pool, poolIndex) => {
        let poolMatches;

        if (!matchesPerPlayer || matchesPerPlayer >= pool.length - 1) {
            // Round-robin complet: tous contre tous
            poolMatches = generateRoundRobinMatches(pool, poolIndex, division, dayNumber, matchId);
        } else {
            // Nombre de matchs limité par joueur
            poolMatches = generateLimitedMatches(pool, poolIndex, division, dayNumber, matchesPerPlayer, matchId);
        }

        matchId += poolMatches.length;
        allMatches.push(...poolMatches);
    });

    console.log(`✅ Total: ${allMatches.length} matchs générés pour Division ${division}`);
    return allMatches;
}

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// ======================================
// AFFICHAGE DES POULES
// ======================================

function updatePoolsDisplay(dayNumber) {
    const dayData = championship.days[dayNumber];
    if (!dayData.pools.enabled) return;

    const numDivisions = championship.config.numDivisions || 3;

    for (let division = 1; division <= numDivisions; division++) {
        const container = document.getElementById(`division${dayNumber}-${division}-matches`);
        if (!container) continue;

        const pools = dayData.pools.divisions[division].pools;
        const matches = dayData.pools.divisions[division].matches;

        if (pools.length === 0) {
            container.innerHTML = '<div class="empty-state">Aucune poule générée</div>';
            continue;
        }

        // Vérifier si toutes les poules sont terminées pour calculer les qualifiés
        const allPoolsCompleted = pools.every((pool, poolIndex) => {
            const poolMatches = matches.filter(m => m.poolIndex === poolIndex);
            return poolMatches.every(m => m.completed);
        });

        let qualifiedPlayers = null;
        let qualificationInfo = null;

        if (allPoolsCompleted) {
            // Calculer qui est qualifié en utilisant la même logique que generateManualFinalPhase
            const configMode = dayData.pools.config?.mode || 'simple';

            if (configMode === 'simple') {
                const qualifiedPerPoolElement = document.getElementById(`qualified-per-pool-${dayNumber}`);
                if (qualifiedPerPoolElement) {
                    const qualifiedPerPool = parseInt(qualifiedPerPoolElement.value);
                    qualifiedPlayers = getQualifiedPlayersFromPools(pools, matches, qualifiedPerPool);
                    qualificationInfo = {
                        mode: 'simple',
                        text: `${qualifiedPerPool} premier(s) de chaque poule`
                    };
                }
            } else {
                const advancedConfig = dayData.pools.config.divisions[division];
                if (advancedConfig) {
                    qualifiedPlayers = getQualifiedPlayersFromPools(pools, matches, null, advancedConfig);
                    const positionName = advancedConfig.runnerUpPosition === 3 ? '3èmes' : advancedConfig.runnerUpPosition === 4 ? '4èmes' : `${advancedConfig.runnerUpPosition}èmes`;
                    qualificationInfo = {
                        mode: 'advanced',
                        text: advancedConfig.bestRunnerUps > 0
                            ? `${advancedConfig.topPerPool} premier(s) par poule + ${advancedConfig.bestRunnerUps} meilleur(s) ${positionName}`
                            : `${advancedConfig.topPerPool} premier(s) de chaque poule`
                    };
                }
            }
        }

        let html = '<div class="pools-container">';

        // Afficher l'info de qualification si disponible
        if (qualificationInfo) {
            html += `
                <div style="
                    background: linear-gradient(135deg, #f39c12, #e67e22);
                    color: white;
                    padding: 12px 15px;
                    border-radius: 8px;
                    margin-bottom: 15px;
                    text-align: center;
                    font-size: 13px;
                    font-weight: 600;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                ">
                    🏆 Qualification: ${qualificationInfo.text}
                </div>
            `;
        }

        pools.forEach((pool, poolIndex) => {
            const poolName = `Poule ${String.fromCharCode(65 + poolIndex)}`;
            const poolMatches = matches.filter(m => m.poolIndex === poolIndex);
            const completedMatches = poolMatches.filter(m => m.completed).length;
            const isCompleted = completedMatches === poolMatches.length;
            const poolContentId = `pool-content-${dayNumber}-${division}-${poolIndex}`;
            const poolArrowId = `pool-arrow-${dayNumber}-${division}-${poolIndex}`;

            html += `
                <div class="pool-section" style="
                    background: white;
                    border: 2px solid ${isCompleted ? '#27ae60' : '#3498db'};
                    border-radius: 12px;
                    padding: 20px;
                    margin-bottom: 20px;
                ">
                    <div class="pool-header" onclick="togglePoolCollapse('${poolContentId}', '${poolArrowId}')" style="
                        background: linear-gradient(135deg, ${isCompleted ? '#27ae60, #2ecc71' : '#3498db, #2980b9'});
                        color: white;
                        padding: 15px;
                        border-radius: 8px;
                        margin-bottom: 15px;
                        text-align: center;
                        cursor: pointer;
                        position: relative;
                        transition: all 0.3s;
                    " onmouseover="this.style.opacity='0.9'"
                       onmouseout="this.style.opacity='1'">
                        <span id="${poolArrowId}" style="
                            position: absolute;
                            left: 15px;
                            top: 50%;
                            transform: translateY(-50%) rotate(0deg);
                            font-size: 20px;
                            transition: transform 0.3s;
                        ">▼</span>
                        <button onclick="event.stopPropagation(); showAddPoolMatchModal(${dayNumber}, ${division}, ${poolIndex})"
                                title="Ajouter un match"
                                style="position: absolute; right: 15px; top: 50%; transform: translateY(-50%);
                                       width: 28px; height: 28px; background: rgba(255,255,255,0.9);
                                       color: #3498db; border: none; border-radius: 50%;
                                       font-size: 20px; font-weight: bold; cursor: pointer;
                                       display: flex; align-items: center; justify-content: center;"
                                onmouseover="this.style.background='white'; this.style.transform='translateY(-50%) scale(1.1)'"
                                onmouseout="this.style.background='rgba(255,255,255,0.9)'; this.style.transform='translateY(-50%)'">+</button>
                        <h4 style="margin: 0; font-size: 1.2rem;">${poolName}${isCompleted ? ' ✓' : ''}</h4>
                        <div style="font-size: 14px; margin-top: 5px;">
                            ${completedMatches}/${poolMatches.length} matchs terminés
                        </div>
                    </div>

                    <div id="${poolContentId}" class="pool-content" style="display: block;">
                        <div class="pool-players" style="
                        display: flex;
                        flex-wrap: wrap;
                        gap: 10px;
                        justify-content: center;
                        margin-bottom: 15px;
                        padding: 15px;
                        background: #f8f9fa;
                        border-radius: 8px;
                    ">
                        ${pool.map(player =>
                            `<span class="pool-player-tag" onclick="showPlayerPoolSummary(${dayNumber}, ${division}, '${escapeForOnclick(player)}')" style="
                                background: linear-gradient(135deg, #27ae60, #2ecc71);
                                color: white;
                                padding: 8px 15px;
                                border-radius: 20px;
                                font-weight: 500;
                                font-size: 14px;
                                cursor: pointer;
                                transition: transform 0.2s, box-shadow 0.2s;
                            " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.2)'"
                               onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'"
                               title="Cliquez pour voir les statistiques">${player}</span>`
                        ).join('')}
                    </div>

                    <div class="pool-matches" style="max-width: 500px; margin: 0 auto; padding: 10px; background: linear-gradient(135deg, #f8f9fa, #e9ecef); border-radius: 8px;">
                        ${poolMatches.map((match, idx) => {
                            match._matchIndex = matches.indexOf(match);
                            return generatePoolMatchHTML(match, dayNumber);
                        }).join('')}
                    </div>

                        ${completedMatches === poolMatches.length ?
                            `<div class="pool-ranking" style="margin-top: 15px;">
                                ${generatePoolRankingHTML(pool, poolMatches, poolIndex, qualifiedPlayers, dayNumber, division)}
                            </div>` : ''}
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
    }
}

// Toggle l'affichage du contenu d'une poule (collapse/expand)
function togglePoolCollapse(poolContentId, poolArrowId) {
    const content = document.getElementById(poolContentId);
    const arrow = document.getElementById(poolArrowId);

    if (!content || !arrow) return;

    if (content.style.display === 'none') {
        // Ouvrir la poule
        content.style.display = 'block';
        arrow.style.transform = 'translateY(-50%) rotate(0deg)';
    } else {
        // Fermer la poule
        content.style.display = 'none';
        arrow.style.transform = 'translateY(-50%) rotate(-90deg)';
    }
}

function generatePoolMatchHTML(match, dayNumber) {
    // Gérer les matchs BYE différemment
    if (match.isByeMatch) {
        const realPlayer = match.winner;
        const byePlayer = match.player1 === realPlayer ? match.player2 : match.player1;

        return `
            <div class="pool-match bye-match" data-match-id="${match.id}" data-division="${match.division}" style="
                background: linear-gradient(135deg, #fff3cd, #fffaeb);
                border: 2px dashed #ffc107;
                border-radius: 8px;
                padding: 15px;
                margin-bottom: 10px;
            ">
                <div class="match-header" style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 10px;
                ">
                    <div class="player-names" style="font-weight: 600; color: #856404;">
                        🎯 <span onclick="showPlayerPoolSummary(${dayNumber}, ${match.division}, '${escapeForOnclick(realPlayer)}')"
                                style="cursor: pointer; text-decoration: underline dotted;"
                                title="Cliquez pour voir les statistiques"
                                onmouseover="this.style.color='#3498db'"
                                onmouseout="this.style.color='#856404'">${realPlayer}</span> VS ${byePlayer}
                    </div>
                    <div class="match-status" style="
                        font-size: 12px;
                        padding: 4px 8px;
                        border-radius: 12px;
                        font-weight: bold;
                        background: #ffc107;
                        color: white;
                    ">BYE - Repos</div>
                </div>

                <div style="text-align: center; padding: 10px; background: rgba(255, 193, 7, 0.1); border-radius: 6px;">
                    <strong style="color: #856404;">✅ <span onclick="showPlayerPoolSummary(${dayNumber}, ${match.division}, '${escapeForOnclick(realPlayer)}')"
                                                            style="cursor: pointer; text-decoration: underline dotted;"
                                                            title="Cliquez pour voir les statistiques"
                                                            onmouseover="this.style.color='#3498db'"
                                                            onmouseout="this.style.color='#856404'">${realPlayer}</span> qualifié(e) automatiquement</strong>
                    <div style="font-size: 12px; color: #6c757d; margin-top: 5px;">
                        Match non joué - Victoire par forfait
                    </div>
                </div>
            </div>
        `;
    }

    // Match normal
    const matchStatus = match.completed ? 'completed' : 'pending';
    const statusClass = match.completed ? 'status-completed' : 'status-pending';
    const statusText = match.completed ? 'Terminé' : 'En cours';
    const score1 = match.score1 || 0;
    const score2 = match.score2 || 0;
    const collapsedSummary = match.completed ? `${match.player1} <span class="collapse-score">${score1}-${score2}</span> ${match.player2}` : '';

    return `
        <div class="pool-match ${matchStatus} ${match.isCollapsed ? 'collapsed' : ''}" data-match-id="${match.id}" data-division="${match.division}" style="
            background: ${match.completed ? 'rgba(39, 174, 96, 0.1)' : 'transparent'};
            border: none;
            border-bottom: 1px solid rgba(0,0,0,0.08);
            border-radius: 0;
            padding: 8px 0;
            margin-bottom: 0;
            position: relative;
        ">
            ${window.showForfaitButtons ? `<button onclick="event.stopPropagation(); deletePoolMatch(${dayNumber}, '${match.id}', ${match.division})"
                    title="Supprimer ce match"
                    style="position: absolute; top: 50%; right: 5px; transform: translateY(-50%);
                           width: 18px; height: 18px; z-index: 10;
                           background: #e74c3c; color: white; border: none; border-radius: 50%;
                           font-size: 11px; cursor: pointer; line-height: 1; padding: 0;
                           opacity: 0.6; transition: opacity 0.2s;"
                    onmouseover="this.style.opacity='1'"
                    onmouseout="this.style.opacity='0.6'">×</button>` : ''}
            ${match.completed ? `<div class="match-header" onclick="toggleMatchCollapse(this.parentElement)" style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
                cursor: pointer;
            ">
                <div class="player-names" style="font-weight: 600; color: #2c3e50; font-size: 14px;">
                    ${collapsedSummary}
                </div>
                <div class="match-status ${statusClass}" style="
                    font-size: 12px;
                    padding: 4px 8px;
                    border-radius: 12px;
                    font-weight: bold;
                    background: #a8e6cf;
                    color: #00b894;
                ">${statusText}</div>
            </div>` : ''}
            
            <div class="score-container">
                ${window.showForfaitButtons ? 
                    `<input type="text" value="${match.player1}" 
                            onchange="editMatchPlayerName(${dayNumber}, ${match.division}, ${match._matchIndex || 0}, 'player1', this.value)"
                            style="flex: 1; min-width: 80px; padding: 4px 8px; font-size: 14px; border: 1px solid #3498db; border-radius: 4px; background: white; cursor: text;">`
                    : `<span class="player-name-left" onclick="showPlayerPoolSummary(${dayNumber}, ${match.division}, '${escapeForOnclick(match.player1)}')"
                          style="cursor: pointer; text-decoration: underline dotted;"
                          title="Cliquez pour voir les statistiques"
                          onmouseover="this.style.color='#3498db'"
                          onmouseout="this.style.color='#2c3e50'">${match.player1}</span>`}
                <div class="score-center">
                    <input type="number"
                           value="${match.score1 === null || match.score1 === undefined ? '' : match.score1}"
                           placeholder="0"
                           onchange="updatePoolMatchScore(${dayNumber}, '${match.id}', 'score1', this.value)"
                           onkeydown="handlePoolMatchEnter(event, ${dayNumber}, '${match.id}')"
                           style="width: 50px; height: 40px; text-align: center; padding: 6px; font-weight: bold; font-size: 16px; border: 2px solid #007bff; border-radius: 6px;">
                    <span style="font-weight: bold; color: #7f8c8d; font-size: 14px;">-</span>
                    <input type="number"
                           value="${match.score2 === null || match.score2 === undefined ? '' : match.score2}"
                           placeholder="0"
                           onchange="updatePoolMatchScore(${dayNumber}, '${match.id}', 'score2', this.value)"
                           onkeydown="handlePoolMatchEnter(event, ${dayNumber}, '${match.id}')"
                           style="width: 50px; height: 40px; text-align: center; padding: 6px; font-weight: bold; font-size: 16px; border: 2px solid #007bff; border-radius: 6px;">
                </div>
                ${window.showForfaitButtons ? 
                    `<input type="text" value="${match.player2}" 
                            onchange="editMatchPlayerName(${dayNumber}, ${match.division}, ${match._matchIndex || 0}, 'player2', this.value)"
                            style="flex: 1; min-width: 80px; padding: 4px 8px; font-size: 14px; border: 1px solid #3498db; border-radius: 4px; background: white; cursor: text;">`
                    : `<span class="player-name-right" onclick="showPlayerPoolSummary(${dayNumber}, ${match.division}, '${escapeForOnclick(match.player2)}')"
                          style="cursor: pointer; text-decoration: underline dotted;"
                          title="Cliquez pour voir les statistiques"
                          onmouseover="this.style.color='#3498db'"
                          onmouseout="this.style.color='#2c3e50'">${match.player2}</span>`}
            </div>

            ${!match.completed && window.showForfaitButtons ? `
            <div style="display: flex; gap: 4px; justify-content: center; margin-bottom: 8px;">
                <button onclick="declareForfait('pool', ${dayNumber}, ${match.division}, '${match.id}', 'player1')"
                        style="padding: 2px 6px; font-size: 10px; background: #e74c3c; color: white;
                               border: none; border-radius: 3px; cursor: pointer;"
                        title="Forfait ${match.player1}">F1</button>
                <button onclick="declareForfait('pool', ${dayNumber}, ${match.division}, '${match.id}', 'player2')"
                        style="padding: 2px 6px; font-size: 10px; background: #e74c3c; color: white;
                               border: none; border-radius: 3px; cursor: pointer;"
                        title="Forfait ${match.player2}">F2</button>
            </div>
            ` : ''}

            ${match.completed && match.winner ? `
            <div class="match-result" style="
                text-align: center;
                font-weight: bold;
                padding: 6px;
                border-radius: 6px;
                font-size: 13px;
                background: ${match.forfaitBy ? '#fff3cd' : '#a8e6cf'};
                color: ${match.forfaitBy ? '#856404' : '#00b894'};
            ">
                ${match.forfaitBy ? '⚠️' : '🏆'} ${match.winner} remporte le match${match.forfaitBy ? ' (forfait)' : ''} (${score1}-${score2})
            </div>` : ''}
            ${match.completed && match.winner === null ? `
            <div class="match-result" style="
                text-align: center;
                font-weight: bold;
                padding: 6px;
                border-radius: 6px;
                font-size: 13px;
                background: #e3f2fd;
                color: #1565c0;
            ">
                🤝 Match nul (${score1}-${score2})
            </div>` : ''}
        </div>
    `;
}

// ======================================
// GESTION DES SCORES DE POULES
// ======================================

function updatePoolMatchScore(dayNumber, matchId, scoreField, value) {
    const dayData = championship.days[dayNumber];
    const numDivisions = championship.config.numDivisions || 3;

    for (let division = 1; division <= numDivisions; division++) {
        const match = dayData.pools.divisions[division].matches.find(m => m.id == matchId);
        if (match) {
            match[scoreField] = value;
            // Annuler le forfait si les scores sont modifiés manuellement
            if (match.forfaitBy) {
                delete match.forfaitBy;
            }
            // NE PAS régénérer le DOM ici pour permettre la navigation Tab naturelle
            // La régénération se fera dans handlePoolMatchEnter quand le match est validé
            saveToLocalStorage();
            break;
        }
    }
}

function handlePoolMatchEnter(event, dayNumber, matchId) {
    console.log('🔵 handlePoolMatchEnter appelé - Key:', event.key, 'MatchId:', matchId);

    const dayData = championship.days[dayNumber];
    const numDivisions = championship.config.numDivisions || 3;
    let match = null;
    let currentDivision = null;

    // Trouver le match et sa division
    for (let division = 1; division <= numDivisions; division++) {
        match = dayData.pools.divisions[division].matches.find(m => m.id == matchId);
        if (match) {
            currentDivision = division;
            break;
        }
    }

    if (!match) {
        console.log('❌ Match non trouvé');
        return;
    }

    // CORRECTION: Lire les valeurs directement depuis le DOM (pas depuis l'objet match)
    const currentInput = event.target;
    const matchContainer = currentInput.closest('.pool-match');
    if (!matchContainer) {
        console.log('❌ Container non trouvé');
        return;
    }

    const inputs = matchContainer.querySelectorAll('input[type="number"]');
    const input1 = inputs[0];
    const input2 = inputs[1];

    if (!input1 || !input2) {
        console.log('❌ Inputs non trouvés');
        return;
    }

    // Lire les valeurs actuelles du DOM
    const score1Value = input1.value.trim();
    const score2Value = input2.value.trim();
    console.log('📊 Scores du DOM:', score1Value, '-', score2Value);

    // Déterminer si on doit valider selon les valeurs du DOM
    const bothScoresFilled = score1Value !== '' && score2Value !== '';
    const shouldValidate = event.key === 'Enter' || (event.key === 'Tab' && bothScoresFilled);
    console.log('✅ Should validate:', shouldValidate, '(bothFilled:', bothScoresFilled, ')');

    if (shouldValidate) {
        // Si Tab sur scores incomplets, laisser la navigation naturelle
        if (event.key === 'Tab' && !bothScoresFilled) {
            console.log('⏩ Tab avec scores incomplets - navigation naturelle');
            return;
        }

        event.preventDefault();
        console.log('🛑 Validation du match...');

        // Mettre à jour les valeurs dans l'objet match AVANT de valider
        match.score1 = score1Value;
        match.score2 = score2Value;

        // Sauvegarder l'état AVANT régénération
        const wasCompleted = match.completed;

        // Compléter le match et régénérer le DOM
        checkPoolMatchCompletion(dayNumber, matchId);

        // Auto-collapse le match qui vient d'être complété
        if (!wasCompleted && match.completed) {
            console.log('✂️ Auto-collapse du match:', matchId);
            match.isCollapsed = true;
        }

        updatePoolsDisplay(dayNumber);
        checkPoolsCompletion(dayNumber);
        saveToLocalStorage();

        // Passer au match suivant
        setTimeout(() => {
            console.log('🔄 Navigation vers le match suivant...');
            // Trouver tous les inputs VISIBLES (pools ouvertes ET matchs non collapsed)
            const visibleInputs = Array.from(
                document.querySelectorAll('.pool-content[style*="display: block"] .pool-match:not(.collapsed) input[type="number"]')
            );
            console.log('📝 Nombre d\'inputs visibles:', visibleInputs.length);

            // Trouver le prochain match non-complété (le match actuel est maintenant collapsed)
            // On cherche simplement le premier input disponible dont le matchId est différent de celui qu'on vient de compléter
            let foundNext = false;
            for (let i = 0; i < visibleInputs.length; i++) {
                const inputMatchElement = visibleInputs[i].closest('.pool-match');
                const inputMatchId = inputMatchElement?.getAttribute('data-match-id');

                // Si c'est un match différent (donc le match actuel est déjà collapsed et exclu)
                // Prendre le premier input
                if (inputMatchId && inputMatchId !== matchId) {
                    console.log('➡️ Focus sur le match suivant:', inputMatchId);
                    // Empêcher le scroll automatique
                    visibleInputs[i].focus({ preventScroll: true });
                    visibleInputs[i].select();
                    // Scroll doux vers l'élément seulement s'il n'est pas visible
                    visibleInputs[i].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    foundNext = true;
                    break;
                }
            }

            if (!foundNext) {
                console.log('✅ Tous les matchs sont terminés!');
            }
        }, 150); // Délai augmenté pour assurer la stabilité du DOM
    }
}

function checkPoolMatchCompletion(dayNumber, matchId) {
    const dayData = championship.days[dayNumber];
    const numDivisions = championship.config.numDivisions || 3;

    for (let division = 1; division <= numDivisions; division++) {
        const match = dayData.pools.divisions[division].matches.find(m => m.id == matchId);
        if (match) {
            const wasCompleted = match.completed;

            if (match.score1 !== '' && match.score2 !== '') {
                const score1 = parseInt(match.score1);
                const score2 = parseInt(match.score2);

                if (score1 > score2) {
                    match.completed = true;
                    match.winner = match.player1;
                } else if (score2 > score1) {
                    match.completed = true;
                    match.winner = match.player2;
                } else {
                    match.completed = true;
                    match.winner = null;
                }
            } else {
                // Si l'un des scores est vide, remettre le match en attente
                match.completed = false;
                match.winner = null;
            }

            // Notification du changement d'état
            if (!wasCompleted && match.completed) {
                showNotification(`🏆 ${match.winner || 'Match nul'} remporte le match !`, 'success');
            } else if (wasCompleted && !match.completed) {
                showNotification(`⏸️ Match remis en attente`, 'info');
            }

            break;
        }
    }
}

function checkPoolsCompletion(dayNumber) {
    const dayData = championship.days[dayNumber];
    const numDivisions = championship.config.numDivisions || 3;
    const finalButton = document.getElementById(`final-phase-btn-${dayNumber}`);

    let allPoolsCompleted = true;

    for (let division = 1; division <= numDivisions; division++) {
        const matches = dayData.pools.divisions[division].matches;
        if (matches.length > 0 && !matches.every(match => match.completed)) {
            allPoolsCompleted = false;
            break;
        }
    }

    if (finalButton) {
        finalButton.disabled = !allPoolsCompleted;
        finalButton.style.opacity = allPoolsCompleted ? '1' : '0.5';
    }

    return allPoolsCompleted;
}

// ======================================
// RÉSUMÉ JOUEUR EN MODE POOL
// ======================================

// Collecte toutes les statistiques d'un joueur pour une journée donnée
function getPlayerPoolDayStats(dayNumber, division, playerName) {
    const dayData = championship.days[dayNumber];
    if (!dayData || !dayData.pools || !dayData.pools.enabled) return null;

    const matches = [];

    // 1. Collecter les matchs de poules
    if (dayData.pools.divisions[division] && dayData.pools.divisions[division].matches) {
        const poolMatches = dayData.pools.divisions[division].matches.filter(m =>
            (m.player1 === playerName || m.player2 === playerName) && m.completed
        );
        matches.push(...poolMatches);
    }

    // 2. Collecter les matchs de phase finale
    if (dayData.pools.manualFinalPhase && dayData.pools.manualFinalPhase.enabled) {
        const finalPhase = dayData.pools.manualFinalPhase.divisions[division];
        if (finalPhase && finalPhase.rounds) {
            Object.values(finalPhase.rounds).forEach(round => {
                if (round.matches) {
                    const finalMatches = round.matches.filter(m =>
                        (m.player1 === playerName || m.player2 === playerName) && m.completed
                    );
                    matches.push(...finalMatches);
                }
            });
        }
    }

    // Calculer les statistiques
    let wins = 0, draws = 0, losses = 0, forfeits = 0, pointsWon = 0, pointsLost = 0;
    const opponents = [];

    matches.forEach(match => {
        const isPlayer1 = match.player1 === playerName;
        const opponent = isPlayer1 ? match.player2 : match.player1;
        const score1 = parseInt(match.score1) || 0;
        const score2 = parseInt(match.score2) || 0;
        const playerScore = isPlayer1 ? score1 : score2;
        const opponentScore = isPlayer1 ? score2 : score1;

        let result;
        if (match.forfaitBy) {
            if (match.forfaitBy === (isPlayer1 ? 'player1' : 'player2')) {
                forfeits++;
                result = 'F';
            } else {
                wins++;
                result = 'V';
            }
        } else if (match.winner === null) {
            draws++;
            result = 'N';
        } else if (match.winner === playerName) {
            wins++;
            result = 'V';
        } else {
            losses++;
            result = 'D';
        }

        pointsWon += playerScore;
        pointsLost += opponentScore;

        opponents.push({
            name: opponent,
            playerScore: playerScore,
            opponentScore: opponentScore,
            result: result,
            matchType: match.roundName ? `${match.roundName}` : match.poolName || 'Poule',
            isBye: match.isBye || false
        });
    });

    return {
        playerName: playerName,
        division: division,
        dayNumber: dayNumber,
        totalMatches: matches.length,
        wins: wins,
        draws: draws,
        losses: losses,
        forfeits: forfeits,
        pointsWon: pointsWon,
        pointsLost: pointsLost,
        diff: pointsWon - pointsLost,
        opponents: opponents
    };
}

// Affiche le modal de résumé d'un joueur
function showPlayerPoolSummary(dayNumber, division, playerName) {
    const stats = getPlayerPoolDayStats(dayNumber, division, playerName);

    if (!stats || stats.totalMatches === 0) {
        alert(`Aucune statistique disponible pour ${playerName} sur cette journée.`);
        return;
    }

    // Créer le modal
    const modalHTML = `
        <div id="player-pool-summary-modal" style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            animation: fadeIn 0.3s;
        " onclick="closePlayerPoolSummary()">
            <div style="
                background: white;
                border-radius: 15px;
                padding: 0;
                max-width: 600px;
                width: 90%;
                max-height: 85vh;
                overflow-y: auto;
                box-shadow: 0 10px 40px rgba(0,0,0,0.3);
                animation: slideUp 0.3s;
            " onclick="event.stopPropagation()">
                <!-- En-tête -->
                <div style="
                    background: linear-gradient(135deg, #3498db, #2980b9);
                    color: white;
                    padding: 20px;
                    border-radius: 15px 15px 0 0;
                    position: relative;
                ">
                    <button onclick="closePlayerPoolSummary()" style="
                        position: absolute;
                        top: 15px;
                        right: 15px;
                        background: rgba(255,255,255,0.2);
                        border: none;
                        color: white;
                        font-size: 24px;
                        width: 35px;
                        height: 35px;
                        border-radius: 50%;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        transition: background 0.2s;
                    " onmouseover="this.style.background='rgba(255,255,255,0.3)'"
                       onmouseout="this.style.background='rgba(255,255,255,0.2)'">×</button>

                    <h3 style="margin: 0 0 10px 0; font-size: 24px;">
                        ${playerName}
                    </h3>
                    <div style="font-size: 14px; opacity: 0.9;">
                        Division ${division} • Journée ${dayNumber}
                    </div>
                </div>

                <!-- Corps -->
                <div style="padding: 20px;">
                    <h4 style="
                        color: #2c3e50;
                        margin: 0 0 15px 0;
                        font-size: 18px;
                        border-bottom: 2px solid #3498db;
                        padding-bottom: 8px;
                    ">
                        📊 Adversaires affrontés (${stats.totalMatches} match${stats.totalMatches > 1 ? 's' : ''})
                    </h4>

                    <table style="
                        width: 100%;
                        border-collapse: collapse;
                        font-size: 13px;
                    ">
                        <thead>
                            <tr style="
                                background: #ecf0f1;
                                color: #2c3e50;
                            ">
                                <th style="padding: 10px; text-align: left; font-weight: 600;">Adversaire</th>
                                <th style="padding: 10px; text-align: center; font-weight: 600;">Type</th>
                                <th style="padding: 10px; text-align: center; font-weight: 600;">Score</th>
                                <th style="padding: 10px; text-align: center; font-weight: 600;">Résultat</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${stats.opponents.map((opp, index) => {
                                const bgColor = index % 2 === 0 ? '#f8f9fa' : 'white';
                                const resultBg = opp.result === 'V' ? '#d4edda' : '#f8d7da';
                                const resultColor = opp.result === 'V' ? '#155724' : '#721c24';
                                const resultIcon = opp.result === 'V' ? '✓' : '✗';

                                return `
                                    <tr style="background: ${bgColor}; border-bottom: 1px solid #dee2e6;">
                                        <td style="padding: 10px; font-weight: 500;">${opp.name}</td>
                                        <td style="padding: 10px; text-align: center; font-size: 11px; color: #6c757d;">
                                            ${opp.matchType}
                                        </td>
                                        <td style="padding: 10px; text-align: center; font-weight: bold;">
                                            <span style="color: #2c3e50;">${opp.playerScore}</span>
                                            <span style="color: #95a5a6;"> - </span>
                                            <span style="color: #7f8c8d;">${opp.opponentScore}</span>
                                        </td>
                                        <td style="padding: 10px; text-align: center;">
                                            <span style="
                                                background: ${resultBg};
                                                color: ${resultColor};
                                                padding: 4px 10px;
                                                border-radius: 12px;
                                                font-weight: bold;
                                                font-size: 12px;
                                            ">
                                                ${resultIcon} ${opp.result}
                                            </span>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>

                    <!-- Statistiques globales -->
                    <div style="
                        margin-top: 20px;
                        padding: 15px;
                        background: linear-gradient(135deg, #f8f9fa, #e9ecef);
                        border-radius: 10px;
                        border-left: 4px solid #3498db;
                    ">
                        <div style="display: flex; justify-content: space-around; flex-wrap: wrap; gap: 10px;">
                            <div style="text-align: center;">
                                <div style="font-size: 12px; color: #6c757d; margin-bottom: 4px;">Victoires</div>
                                <div style="font-size: 20px; font-weight: bold; color: #27ae60;">${stats.wins}</div>
                            </div>
                            <div style="text-align: center;">
                                <div style="font-size: 12px; color: #6c757d; margin-bottom: 4px;">Défaites</div>
                                <div style="font-size: 20px; font-weight: bold; color: #e74c3c;">${stats.losses}</div>
                            </div>
                            <div style="text-align: center;">
                                <div style="font-size: 12px; color: #6c757d; margin-bottom: 4px;">Points marqués</div>
                                <div style="font-size: 20px; font-weight: bold; color: #3498db;">${stats.pointsWon}</div>
                            </div>
                            <div style="text-align: center;">
                                <div style="font-size: 12px; color: #6c757d; margin-bottom: 4px;">Points encaissés</div>
                                <div style="font-size: 20px; font-weight: bold; color: #95a5a6;">${stats.pointsLost}</div>
                            </div>
                            <div style="text-align: center;">
                                <div style="font-size: 12px; color: #6c757d; margin-bottom: 4px;">Différence</div>
                                <div style="font-size: 20px; font-weight: bold; color: ${stats.diff >= 0 ? '#27ae60' : '#e74c3c'};">
                                    ${stats.diff >= 0 ? '+' : ''}${stats.diff}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Ajouter le modal au DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Gérer la touche Échap
    document.addEventListener('keydown', handleEscKey);
}

// Ferme le modal de résumé
function closePlayerPoolSummary() {
    const modal = document.getElementById('player-pool-summary-modal');
    if (modal) {
        modal.remove();
    }
    document.removeEventListener('keydown', handleEscKey);
}

// Gère la touche Échap
function handleEscKey(event) {
    if (event.key === 'Escape') {
        closePlayerPoolSummary();
    }
}

// Ajouter les animations CSS
if (!document.getElementById('player-summary-animations')) {
    const style = document.createElement('style');
    style.id = 'player-summary-animations';
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes slideUp {
            from { transform: translateY(50px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
}

// ======================================
// CLASSEMENT DES POULES
// ======================================

function generatePoolRankingHTML(pool, poolMatches, poolIndex, qualifiedPlayers = null, dayNumber = null, division = null) {
    const playerStats = pool.map(player => {
        let wins = 0, draws = 0, losses = 0, forfeits = 0, pointsWon = 0, pointsLost = 0;

        poolMatches.forEach(match => {
            if (!match.completed) return;

            const isPlayer1 = match.player1 === player;
            const isPlayer2 = match.player2 === player;

            if (isPlayer1 || isPlayer2) {
                if (match.forfaitBy) {
                    if (match.forfaitBy === (isPlayer1 ? 'player1' : 'player2')) {
                        forfeits++;
                    } else {
                        wins++;
                    }
                } else if (match.winner === null) {
                    draws++;
                } else if (match.winner === player) {
                    wins++;
                } else {
                    losses++;
                }

                const score1 = parseInt(match.score1) || 0;
                const score2 = parseInt(match.score2) || 0;

                if (isPlayer1) {
                    pointsWon += score1;
                    pointsLost += score2;
                } else {
                    pointsWon += score2;
                    pointsLost += score1;
                }
            }
        });

        return {
            name: player,
            wins,
            draws,
            losses,
            forfeits,
            pointsWon,
            pointsLost,
            diff: pointsWon - pointsLost,
            points: wins * 3 + draws * 2 + losses * 1
        };
    });

    // Trier par points puis par différence puis par points Pour
    playerStats.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.diff !== a.diff) return b.diff - a.diff;
        return b.pointsWon - a.pointsWon;
    });

    // Déterminer le statut de qualification pour chaque joueur
    const getQualificationStatus = (playerName) => {
        if (!qualifiedPlayers) return { qualified: false, isDirect: false };

        const qualified = qualifiedPlayers.find(q => q.name === playerName && q.poolIndex === poolIndex);
        if (qualified) {
            return {
                qualified: true,
                isDirect: qualified.isDirect,
                method: qualified.qualificationMethod
            };
        }
        return { qualified: false, isDirect: false };
    };

    return `
        <div style="
            background: linear-gradient(135deg, #f8f9fa, #e9ecef);
            border: 2px solid #28a745;
            border-radius: 8px;
            padding: 15px;
        ">
            <h5 style="text-align: center; color: #28a745; margin-bottom: 15px;">
                📊 Classement ${String.fromCharCode(65 + poolIndex)}
            </h5>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <thead>
                    <tr style="background: #28a745; color: white;">
                        <th style="padding: 8px; text-align: left;">Rang</th>
                        <th style="padding: 8px; text-align: left;">Joueur</th>
                        <th style="padding: 8px; text-align: center;">Pts</th>
                        <th style="padding: 8px; text-align: center;">V/N/D/F</th>
                        <th style="padding: 8px; text-align: center;">PP/PC</th>
                        <th style="padding: 8px; text-align: center;">Diff</th>
                    </tr>
                </thead>
                <tbody>
                    ${playerStats.map((player, index) => {
                        const status = getQualificationStatus(player.name);

                        // Déterminer les couleurs selon le statut
                        let bgColor, textColor, emoji, badge;
                        if (status.qualified && status.isDirect) {
                            // Qualifié direct
                            bgColor = '#d4edda';
                            textColor = '#155724';
                            emoji = '✅';
                            badge = '<span style="font-size: 10px; background: #28a745; color: white; padding: 2px 6px; border-radius: 10px; margin-left: 5px;">Qualifié</span>';
                        } else if (status.qualified && !status.isDirect) {
                            // Meilleur runner-up
                            bgColor = '#fff3cd';
                            textColor = '#856404';
                            emoji = '⭐';
                            badge = '<span style="font-size: 10px; background: #ffc107; color: #856404; padding: 2px 6px; border-radius: 10px; margin-left: 5px;">Repêché</span>';
                        } else {
                            // Non qualifié
                            bgColor = 'white';
                            textColor = '#6c757d';
                            emoji = '';
                            badge = '';
                        }

                        return `
                            <tr style="
                                background: ${bgColor};
                                border-bottom: 1px solid #dee2e6;
                                ${!status.qualified ? 'opacity: 0.7;' : ''}
                            ">
                                <td style="padding: 8px; font-weight: bold; color: ${textColor};">
                                    ${index + 1} ${emoji}
                                </td>
                                <td style="padding: 8px; font-weight: 600; color: ${textColor};">
                                    <span ${dayNumber && division ? `onclick="showPlayerPoolSummary(${dayNumber}, ${division}, '${escapeForOnclick(player.name)}')"` : ''}
                                          style="cursor: ${dayNumber && division ? 'pointer' : 'default'}; ${dayNumber && division ? 'text-decoration: underline dotted;' : ''}"
                                          ${dayNumber && division ? `title="Cliquez pour voir les statistiques"` : ''}
                                          ${dayNumber && division ? `onmouseover="this.style.color='#3498db'"` : ''}
                                          ${dayNumber && division ? `onmouseout="this.style.color='${textColor}'"` : ''}>${player.name}</span>${badge}
                                </td>
                                <td style="padding: 8px; text-align: center; font-weight: bold; color: ${textColor};">${player.points}</td>
                                <td style="padding: 8px; text-align: center; color: ${textColor};">${player.wins}/${player.draws || 0}/${player.losses}/${player.forfeits || 0}</td>
                                <td style="padding: 8px; text-align: center; color: ${textColor};">${player.pointsWon}/${player.pointsLost}</td>
                                <td style="padding: 8px; text-align: center; color: ${textColor};">${player.diff > 0 ? '+' : ''}${player.diff}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
            ${qualifiedPlayers ? `
                <div style="margin-top: 10px; padding: 8px; background: rgba(255, 193, 7, 0.1); border-radius: 5px; font-size: 11px; color: #6c757d; text-align: center;">
                    ✅ Qualifié direct | ⭐ Repêché (meilleur runner-up)
                </div>
            ` : ''}
        </div>
    `;
}

// ======================================
// INTÉGRATION AVEC LE SYSTÈME EXISTANT
// ======================================

// Modifier la fonction de génération des matchs pour détecter le mode poules
function generateMatchesForDayWithPoolSupport(dayNumber) {
    if (!dayNumber) dayNumber = championship.currentDay;
    
    const dayData = championship.days[dayNumber];
    if (!dayData) return;
    
    // Vérifier si le mode poules est activé
    if (dayData.pools && dayData.pools.enabled) {
        alert('⚠️ Mode Poules activé !\n\nUtilisez les boutons "Générer les Poules" dans la section bleue ci-dessus.');
        return;
    }
    
    // Continuer avec la génération classique
    generateMatchesForDay(dayNumber);
}

// Hook d'initialisation pour chaque journée
function initializePoolsForDay(dayNumber) {
    // Ajouter l'interface poules si elle n'existe pas
    const existingToggle = document.getElementById(`pool-toggle-${dayNumber}`);
    if (!existingToggle) {
        addPoolToggleToInterface(dayNumber);
    }

    // Initialiser la structure de données
    initializePoolSystem(dayNumber);

    // Restaurer l'état complet des poules si elles étaient activées
    const dayData = championship.days[dayNumber];
    if (dayData.pools && dayData.pools.enabled) {
        // Attendre que le DOM soit prêt
        setTimeout(() => {
            restorePoolState(dayNumber);
        }, 100);
    }
}

// Restaure l'état complet des poules après un rechargement
function restorePoolState(dayNumber) {
    const dayData = championship.days[dayNumber];
    if (!dayData || !dayData.pools) return;

    console.log(`Restauration des poules pour J${dayNumber}...`);

    // 1. Afficher le bouton et la section toggle
    const showPoolBtn = document.getElementById(`show-pool-btn-${dayNumber}`);
    const poolToggle = document.getElementById(`pool-toggle-${dayNumber}`);

    if (poolToggle && dayData.pools.enabled) {
        poolToggle.style.display = 'block';
    }

    // 2. Cocher la checkbox
    const checkbox = document.getElementById(`pool-enabled-${dayNumber}`);
    if (checkbox) {
        checkbox.checked = dayData.pools.enabled;
    }

    // 3. Afficher la config et l'info
    const config = document.getElementById(`pool-config-${dayNumber}`);
    const info = document.getElementById(`pool-info-${dayNumber}`);

    if (dayData.pools.enabled) {
        if (config) config.style.display = 'block';
        if (info) info.style.display = 'block';
    }

    // 4. Restaurer le mode de configuration (simple/avancé)
    if (dayData.pools.config) {
        const mode = dayData.pools.config.mode || 'simple';
        const modeRadio = document.querySelector(`input[name="pool-config-mode-${dayNumber}"][value="${mode}"]`);
        if (modeRadio) {
            modeRadio.checked = true;
            togglePoolConfigMode(dayNumber, mode);
        }

        // Restaurer les valeurs du mode simple
        if (mode === 'simple') {
            const poolSizeEl = document.getElementById(`pool-size-${dayNumber}`);
            const qualifiedEl = document.getElementById(`qualified-per-pool-${dayNumber}`);
            if (poolSizeEl && dayData.pools.config.poolSize) {
                poolSizeEl.value = dayData.pools.config.poolSize;
            }
            if (qualifiedEl && dayData.pools.config.qualifiedPerPool) {
                qualifiedEl.value = dayData.pools.config.qualifiedPerPool;
            }
        }

        // Restaurer les valeurs du mode avancé
        if (mode === 'advanced') {
            const numPoolsEl = document.getElementById(`num-pools-${dayNumber}`);
            const totalQualifiedEl = document.getElementById(`total-qualified-${dayNumber}`);
            if (numPoolsEl && dayData.pools.config.numPools) {
                numPoolsEl.value = dayData.pools.config.numPools;
            }
            if (totalQualifiedEl && dayData.pools.config.totalQualified) {
                totalQualifiedEl.value = dayData.pools.config.totalQualified;
            }
            updateAdvancedConfigInfo(dayNumber);
        }
    }

    // 5. Afficher les poules générées si elles existent
    const numDivisions = championship.config?.numberOfDivisions || 3;
    let hasPoolData = false;

    for (let div = 1; div <= numDivisions; div++) {
        if (dayData.pools.divisions &&
            dayData.pools.divisions[div] &&
            dayData.pools.divisions[div].pools &&
            dayData.pools.divisions[div].pools.length > 0) {
            hasPoolData = true;
            break;
        }
    }

    if (hasPoolData) {
        updatePoolsDisplay(dayNumber);

        // Activer le bouton Phase Finale si des poules existent
        const finalPhaseBtn = document.getElementById(`final-phase-btn-${dayNumber}`);
        if (finalPhaseBtn) {
            finalPhaseBtn.disabled = false;
        }
    }

    // 6. Restaurer la phase finale si elle existe
    if (dayData.pools.manualFinalPhase && dayData.pools.manualFinalPhase.enabled) {
        setTimeout(() => {
            displayManualFinalPhaseFromData(dayNumber);
        }, 200);
    }

    console.log(`Poules J${dayNumber} restaurées avec succès`);
}
window.restorePoolState = restorePoolState;

// Restaure l'affichage de la phase finale depuis les données sauvegardées
function displayManualFinalPhaseFromData(dayNumber) {
    const dayData = championship.days[dayNumber];
    if (!dayData || !dayData.pools || !dayData.pools.manualFinalPhase) return;

    const manualFinalPhase = dayData.pools.manualFinalPhase;
    if (!manualFinalPhase.enabled) return;

    const numDivisions = championship.config?.numberOfDivisions || 3;

    for (let division = 1; division <= numDivisions; division++) {
        const divisionFinalPhase = manualFinalPhase.divisions[division];
        if (!divisionFinalPhase || !divisionFinalPhase.qualified || divisionFinalPhase.qualified.length === 0) continue;

        const container = document.getElementById(`division${dayNumber}-${division}-matches`);
        if (!container) continue;

        // Ajouter l'affichage de la phase finale
        const finalPhaseHTML = generateManualFinalPhaseHTML(dayNumber, division, divisionFinalPhase);

        // Chercher si le conteneur de phase finale existe déjà
        let finalContainer = container.querySelector('.manual-final-phase-container');
        if (finalContainer) {
            finalContainer.outerHTML = finalPhaseHTML;
        } else {
            container.insertAdjacentHTML('beforeend', finalPhaseHTML);
        }
    }

    console.log(`Phase finale J${dayNumber} restaurée`);
}
window.displayManualFinalPhaseFromData = displayManualFinalPhaseFromData;

// Export des fonctions principales
window.initializePoolsForDay = initializePoolsForDay;
window.updatePoolsDisplay = updatePoolsDisplay;
window.togglePoolMode = togglePoolMode;
window.generatePools = generatePools;
window.updatePoolMatchScore = updatePoolMatchScore;
window.handlePoolMatchEnter = handlePoolMatchEnter;
window.updateManualFinalPhaseDisplay = updateManualFinalPhaseDisplay;
window.restoreCollapseState = restoreCollapseState;
window.generateFinalPhase = function(dayNumber) {
    // Appeler la vraie fonction de génération des phases finales manuelles
    generateManualFinalPhase(dayNumber);
};

// ======================================
// SYSTÈME DE PHASES FINALES MANUELLES - SYNTAXE CORRIGÉE
// ======================================

// Extension de la structure pour les phases finales manuelles
function initializeManualFinalPhase(dayNumber) {
    const dayData = championship.days[dayNumber];
    const numDivisions = championship.config?.numberOfDivisions || championship.config?.numDivisions || 3;

    if (dayData.pools && !dayData.pools.manualFinalPhase) {
        const divisions = {};

        // Créer dynamiquement les divisions selon la configuration
        for (let div = 1; div <= numDivisions; div++) {
            divisions[div] = {
                qualified: [],
                rounds: {},
                champion: null,
                runnerUp: null,
                third: null,
                fourth: null
            };
        }

        dayData.pools.manualFinalPhase = {
            enabled: false,
            currentRound: null,
            divisions: divisions
        };
    }
}

// ======================================
// FONCTION MANQUANTE - getQualifiedPlayersFromPools
// ======================================

function getQualifiedPlayersFromPools(pools, matches, qualifiedPerPool, advancedConfig = null) {
    // Calculer les statistiques pour tous les joueurs de toutes les poules
    const allPlayerStats = [];
    const poolRankings = []; // Classements par poule

    pools.forEach((pool, poolIndex) => {
        const playerStats = pool.map(player => {
            let wins = 0, draws = 0, losses = 0, forfeits = 0, pointsWon = 0, pointsLost = 0;

            const poolMatches = matches.filter(m => m.poolIndex === poolIndex && m.completed);

            poolMatches.forEach(match => {
                const isPlayer1 = match.player1 === player;
                const isPlayer2 = match.player2 === player;

                if (isPlayer1 || isPlayer2) {
                    if (match.forfaitBy) {
                        if (match.forfaitBy === (isPlayer1 ? 'player1' : 'player2')) {
                            forfeits++;
                        } else {
                            wins++;
                        }
                    } else if (match.winner === null) {
                        draws++;
                    } else if (match.winner === player) {
                        wins++;
                    } else {
                        losses++;
                    }

                    const score1 = parseInt(match.score1) || 0;
                    const score2 = parseInt(match.score2) || 0;

                    if (isPlayer1) {
                        pointsWon += score1;
                        pointsLost += score2;
                    } else {
                        pointsWon += score2;
                        pointsLost += score1;
                    }
                }
            });

            return {
                name: player,
                wins, draws, losses, forfeits, pointsWon, pointsLost,
                diff: pointsWon - pointsLost,
                points: wins * 3 + draws * 2 + losses * 1,
                poolIndex: poolIndex,
                poolName: String.fromCharCode(65 + poolIndex)
            };
        });

        // Trier les joueurs de cette poule
        playerStats.sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.diff !== a.diff) return b.diff - a.diff;
            return b.pointsWon - a.pointsWon;
        });

        // Ajouter la position dans la poule
        playerStats.forEach((player, index) => {
            player.poolRank = index + 1;
        });

        poolRankings.push(playerStats);
        allPlayerStats.push(...playerStats);
    });

    const allQualified = [];

    // MODE AVANCÉ : Qualification hybride (top N par poule + meilleurs runners-up)
    if (advancedConfig && advancedConfig.topPerPool !== undefined) {
        const { topPerPool, bestRunnerUps, runnerUpPosition } = advancedConfig;

        // 1. Prendre les top N de chaque poule (qualifiés directs)
        poolRankings.forEach(poolStats => {
            const directQualified = poolStats.slice(0, topPerPool);
            directQualified.forEach(player => {
                player.qualificationMethod = `${player.poolRank}er de poule ${player.poolName}`;
                player.isDirect = true;
            });
            allQualified.push(...directQualified);
        });

        // 2. Si besoin de runners-up, collecter et trier
        if (bestRunnerUps > 0 && runnerUpPosition > 0) {
            const runnersUp = [];

            poolRankings.forEach(poolStats => {
                if (poolStats[runnerUpPosition - 1]) {
                    const runner = poolStats[runnerUpPosition - 1];
                    runner.qualificationMethod = `Meilleur ${runnerUpPosition}ème`;
                    runner.isDirect = false;
                    runnersUp.push(runner);
                }
            });

            // Trier tous les runners-up entre eux
            runnersUp.sort((a, b) => {
                if (b.points !== a.points) return b.points - a.points;
                if (b.diff !== a.diff) return b.diff - a.diff;
                return b.pointsWon - a.pointsWon;
            });

            // Prendre les meilleurs runners-up
            const bestRunners = runnersUp.slice(0, bestRunnerUps);
            allQualified.push(...bestRunners);
        }
    }
    // MODE SIMPLE : Qualification classique (top N de chaque poule)
    else {
        poolRankings.forEach(poolStats => {
            const qualified = poolStats.slice(0, qualifiedPerPool);
            qualified.forEach(player => {
                player.qualificationMethod = `${player.poolRank}er de poule ${player.poolName}`;
                player.isDirect = true;
            });
            allQualified.push(...qualified);
        });
    }

    // Attribuer les seeds globaux
    allQualified.forEach((player, index) => {
        player.seed = index + 1;
    });

    return allQualified;
}

// Fonction principale pour générer les phases finales manuelles
function generateManualFinalPhase(dayNumber) {
    const dayData = championship.days[dayNumber];
    if (!dayData.pools || !dayData.pools.enabled) {
        alert('Les phases finales ne sont disponibles qu\'en mode Poules !');
        return;
    }
    
    // Vérifier que toutes les poules sont terminées
    if (!checkPoolsCompletion(dayNumber)) {
        alert('⚠️ Terminez d\'abord toutes les poules avant de générer la phase finale !');
        return;
    }
    
    initializeManualFinalPhase(dayNumber);

    // Détecter le mode de configuration
    const configMode = dayData.pools.config?.mode || 'simple';
    const numDivisions = championship.config?.numberOfDivisions || championship.config?.numDivisions || 3;
    let totalQualified = 0;

    // Qualifier les joueurs de chaque division
    for (let division = 1; division <= numDivisions; division++) {
        const pools = dayData.pools.divisions[division].pools;
        const matches = dayData.pools.divisions[division].matches;

        if (pools.length === 0) continue;

        let qualified;

        // Mode Simple : qualification classique (top N de chaque poule)
        if (configMode === 'simple') {
            const qualifiedPerPool = parseInt(document.getElementById(`qualified-per-pool-${dayNumber}`).value);
            qualified = getQualifiedPlayersFromPools(pools, matches, qualifiedPerPool);
        }
        // Mode Avancé : qualification hybride (utilise les paramètres sauvegardés)
        else {
            const advancedConfig = dayData.pools.config.divisions[division];
            qualified = getQualifiedPlayersFromPools(pools, matches, null, advancedConfig);
        }
        dayData.pools.manualFinalPhase.divisions[division].qualified = qualified;
        totalQualified += qualified.length;
        
        // Déterminer le premier tour selon le nombre de qualifiés
        const firstRoundName = determineFirstRound(qualified.length);
        if (firstRoundName && qualified.length >= 4) {
            generateFirstRound(dayNumber, division, qualified, firstRoundName);
        }
    }
    
    dayData.pools.manualFinalPhase.enabled = true;

    // Mettre à jour l'affichage
    updateManualFinalPhaseDisplay(dayNumber);
    saveToLocalStorage();

    alert(`🏆 Phase finale initialisée !\n\n${totalQualified} joueurs qualifiés au total.\n\nVous pouvez maintenant gérer les tours un par un !`);

    // Scroll automatique vers la phase finale après l'alert
    setTimeout(() => {
        const firstFinalPhase = document.querySelector('.manual-final-phase-container');
        if (firstFinalPhase) {
            firstFinalPhase.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
            console.log('✅ Scroll automatique vers la phase finale');
        }
    }, 100); // Petit délai pour laisser l'alert se fermer
}

// ======================================
// PHASE FINALE DIRECTE (sans poules)
// ======================================

/**
 * Génère une phase finale directe avec tous les joueurs inscrits
 * Sans passer par les phases de poules
 */
function generateDirectFinalPhase(dayNumber) {
    const dayData = championship.days[dayNumber];
    if (!dayData) {
        alert('Journée non trouvée !');
        return;
    }

    const numDivisions = championship.config?.numberOfDivisions || 3;
    let totalPlayers = 0;

    // Vérifier qu'il y a des joueurs dans au moins une division
    for (let division = 1; division <= numDivisions; division++) {
        const players = dayData.players[division] || [];
        const validPlayers = players.map(p => getPlayerName(p)).filter(p => p && p.toUpperCase() !== 'BYE');
        totalPlayers += validPlayers.length;
    }

    if (totalPlayers === 0) {
        alert('⚠️ Aucun joueur inscrit !\n\nAjoutez des joueurs avant de générer la phase finale.');
        return;
    }

    // Demander confirmation
    if (!confirm(`⚡ ÉLIMINATION DIRECTE\n\nCette option crée une phase finale directe sans poules.\n\n${totalPlayers} joueur(s) inscrit(s) au total.\n\nContinuer ?`)) {
        return;
    }

    // Initialiser la structure pools si nécessaire
    if (!dayData.pools) {
        dayData.pools = {
            enabled: true,
            config: { mode: 'direct' },
            divisions: {}
        };
    } else {
        dayData.pools.enabled = true;
        dayData.pools.config = dayData.pools.config || {};
        dayData.pools.config.mode = 'direct';
    }

    // Initialiser les divisions
    for (let div = 1; div <= numDivisions; div++) {
        if (!dayData.pools.divisions[div]) {
            dayData.pools.divisions[div] = {
                pools: [],
                matches: []
            };
        }
    }

    // Initialiser la phase finale manuelle
    initializeManualFinalPhase(dayNumber);

    let totalQualified = 0;

    // Pour chaque division, qualifier tous les joueurs directement
    for (let division = 1; division <= numDivisions; division++) {
        const players = dayData.players[division] || [];
        const validPlayers = players.map(p => getPlayerName(p)).filter(p => p && p.toUpperCase() !== 'BYE');

        if (validPlayers.length < 2) continue;

        // Créer la liste des qualifiés (tous les joueurs)
        const qualified = validPlayers.map((playerName, index) => ({
            name: playerName,
            seed: index + 1,
            qualificationMethod: 'Inscrit',
            isDirect: true,
            wins: 0,
            losses: 0,
            points: 0,
            diff: 0,
            pointsWon: 0,
            poolRank: index + 1,
            poolName: '-'
        }));

        // Mélanger les joueurs pour un tirage aléatoire équitable
        const shuffledQualified = shuffleArray([...qualified]);

        // Réattribuer les seeds après mélange
        shuffledQualified.forEach((player, idx) => {
            player.seed = idx + 1;
        });

        dayData.pools.manualFinalPhase.divisions[division].qualified = shuffledQualified;
        totalQualified += shuffledQualified.length;

        // Ajuster le nombre de joueurs à une puissance de 2 (avec BYEs si nécessaire)
        const adjustedQualified = adjustToPowerOfTwo(shuffledQualified);

        // Déterminer le premier tour selon le nombre de joueurs
        const firstRoundName = determineFirstRound(adjustedQualified.length);
        if (firstRoundName && adjustedQualified.length >= 2) {
            generateFirstRoundDirect(dayNumber, division, adjustedQualified, firstRoundName);
        }
    }

    dayData.pools.manualFinalPhase.enabled = true;

    // Mettre à jour l'affichage
    updateManualFinalPhaseDisplay(dayNumber);
    saveToLocalStorage();

    // Désactiver le bouton d'élimination directe
    const directBtn = document.getElementById(`direct-final-btn-${dayNumber}`);
    if (directBtn) {
        directBtn.disabled = true;
        directBtn.style.opacity = '0.5';
    }

    alert(`⚡ ÉLIMINATION DIRECTE CRÉÉE !\n\n${totalQualified} joueur(s) en compétition.\n\nLes matchs ont été générés automatiquement.`);

    // Scroll vers la phase finale
    setTimeout(() => {
        const firstFinalPhase = document.querySelector('.manual-final-phase-container');
        if (firstFinalPhase) {
            firstFinalPhase.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, 100);
}
window.generateDirectFinalPhase = generateDirectFinalPhase;

// ======================================
// FINALE DE SAISON (basée sur classement général)
// ======================================

/**
 * Génère une phase finale basée sur les X meilleurs du classement général de la saison
 */
function generateSeasonFinalPhase(dayNumber) {
    const dayData = championship.days[dayNumber];
    if (!dayData) {
        alert('Journée non trouvée !');
        return;
    }

    // Vérifier qu'il y a au moins une journée précédente avec des matchs
    const previousDays = Object.keys(championship.days)
        .map(d => parseInt(d))
        .filter(d => d < dayNumber);

    if (previousDays.length === 0) {
        alert('⚠️ Aucune journée précédente !\n\nLa finale de saison nécessite au moins une journée avec des matchs terminés.');
        return;
    }

    // Récupérer le classement général
    const generalRanking = calculateGeneralRanking();
    if (!generalRanking.hasData) {
        alert('⚠️ Aucun classement général disponible !\n\nTerminez au moins un match dans une journée précédente.');
        return;
    }

    const numDivisions = championship.config?.numberOfDivisions || 3;

    // Compter les joueurs par division pour proposer des options pertinentes
    let divisionInfo = [];
    for (let division = 1; division <= numDivisions; division++) {
        const players = generalRanking.divisions[division] || [];
        if (players.length > 0) {
            divisionInfo.push(`Division ${division}: ${players.length} joueurs`);
        }
    }

    if (divisionInfo.length === 0) {
        alert('⚠️ Aucun joueur dans le classement général !');
        return;
    }

    // Demander le nombre de qualifiés par division
    const promptMsg = `🏆 FINALE DE SAISON\n\nClassement général actuel :\n${divisionInfo.join('\n')}\n\nCombien de joueurs qualifier par division ?\n(Sera arrondi à la puissance de 2 : 4, 8, 16, 32...)\n\nEntrez un nombre :`;

    const input = prompt(promptMsg, '8');
    if (input === null) return;

    let numQualified = parseInt(input);
    if (isNaN(numQualified) || numQualified < 2) {
        alert('⚠️ Veuillez entrer un nombre valide (minimum 2)');
        return;
    }

    // Arrondir à la puissance de 2 inférieure ou égale
    let targetSize = 2;
    while (targetSize * 2 <= numQualified) {
        targetSize *= 2;
    }
    numQualified = targetSize;

    // Confirmation
    const confirmMsg = `🏆 FINALE DE SAISON - Journée ${dayNumber}\n\n` +
        `Les ${numQualified} meilleurs de chaque division (selon le classement général) seront qualifiés.\n\n` +
        `Une phase éliminatoire sera générée avec seeding basé sur le classement.\n\n` +
        `Continuer ?`;

    if (!confirm(confirmMsg)) return;

    // Initialiser la structure pools si nécessaire
    if (!dayData.pools) {
        dayData.pools = {
            enabled: true,
            config: { mode: 'season-final' },
            divisions: {}
        };
    } else {
        dayData.pools.enabled = true;
        dayData.pools.config = dayData.pools.config || {};
        dayData.pools.config.mode = 'season-final';
    }

    // Initialiser les divisions
    for (let div = 1; div <= numDivisions; div++) {
        if (!dayData.pools.divisions[div]) {
            dayData.pools.divisions[div] = {
                pools: [],
                matches: []
            };
        }
    }

    // Initialiser la phase finale manuelle
    initializeManualFinalPhase(dayNumber);

    let totalQualified = 0;
    let qualificationSummary = [];

    // Pour chaque division, qualifier les X meilleurs du classement général
    for (let division = 1; division <= numDivisions; division++) {
        const rankedPlayers = generalRanking.divisions[division] || [];

        if (rankedPlayers.length < 2) continue;

        // Prendre les X meilleurs (ou tous si moins de X joueurs)
        const topPlayers = rankedPlayers.slice(0, Math.min(numQualified, rankedPlayers.length));

        if (topPlayers.length < 2) continue;

        // Créer la liste des qualifiés avec leur seed basé sur le classement
        const qualified = topPlayers.map((player, index) => ({
            name: player.name,
            seed: index + 1,
            qualificationMethod: `#${index + 1} Classement Général`,
            isSeasonFinal: true,
            // Garder les stats pour référence
            totalPoints: player.totalPoints,
            totalWins: player.totalWins,
            goalAverage: player.goalAveragePoints,
            avgWinRate: player.avgWinRate
        }));

        // Ajuster à une puissance de 2 si nécessaire
        const adjustedQualified = adjustToPowerOfTwo(qualified);

        dayData.pools.manualFinalPhase.divisions[division].qualified = adjustedQualified;
        totalQualified += qualified.length; // Compter seulement les vrais joueurs, pas les BYEs

        // Déterminer et générer le premier tour
        const firstRoundName = determineFirstRound(adjustedQualified.length);
        if (firstRoundName && adjustedQualified.length >= 4) {
            generateFirstRoundDirect(dayNumber, division, adjustedQualified, firstRoundName);
        }

        qualificationSummary.push(`Division ${division}: ${qualified.length} qualifiés (top ${qualified.length} du classement)`);
    }

    dayData.pools.manualFinalPhase.enabled = true;

    // Mettre à jour l'affichage
    updateManualFinalPhaseDisplay(dayNumber);
    saveToLocalStorage();

    // Désactiver les boutons
    const seasonBtn = document.getElementById(`season-final-btn-${dayNumber}`);
    if (seasonBtn) {
        seasonBtn.disabled = true;
        seasonBtn.style.opacity = '0.5';
    }
    const directBtn = document.getElementById(`direct-final-btn-${dayNumber}`);
    if (directBtn) {
        directBtn.disabled = true;
        directBtn.style.opacity = '0.5';
    }

    const summary = `🏆 FINALE DE SAISON CRÉÉE !\n\n` +
        `${totalQualified} joueur(s) qualifié(s) au total.\n\n` +
        `${qualificationSummary.join('\n')}\n\n` +
        `Les matchs ont été générés avec seeding basé sur le classement général !`;

    alert(summary);

    // Scroll vers la phase finale
    setTimeout(() => {
        const firstFinalPhase = document.querySelector('.manual-final-phase-container');
        if (firstFinalPhase) {
            firstFinalPhase.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, 100);
}
window.generateSeasonFinalPhase = generateSeasonFinalPhase;

/**
 * Ajuste le nombre de joueurs à la puissance de 2 supérieure en ajoutant des BYEs
 */
function adjustToPowerOfTwo(players) {
    const count = players.length;

    // Trouver la prochaine puissance de 2
    let targetSize = 2;
    while (targetSize < count) {
        targetSize *= 2;
    }

    // Si déjà une puissance de 2, retourner tel quel
    if (count === targetSize) {
        return players;
    }

    // Ajouter des BYEs pour atteindre la puissance de 2
    const result = [...players];
    const byesToAdd = targetSize - count;

    for (let i = 0; i < byesToAdd; i++) {
        result.push({
            name: 'BYE',
            seed: count + i + 1,
            isBye: true,
            qualificationMethod: 'BYE',
            isDirect: false
        });
    }

    return result;
}

/**
 * Génère le premier tour pour l'élimination directe
 */
function generateFirstRoundDirect(dayNumber, division, qualified, roundName) {
    const dayData = championship.days[dayNumber];
    const rounds = dayData.pools.manualFinalPhase.divisions[division].rounds;

    // Organiser les seeds pour un bracket équilibré
    const seededPlayers = organizeSeeds(qualified);
    const matches = [];

    for (let i = 0; i < seededPlayers.length; i += 2) {
        const player1 = seededPlayers[i];
        const player2 = seededPlayers[i + 1] || { name: 'BYE', isBye: true };

        const isByeMatch = player1.isBye || player2.isBye;
        const winner = player1.isBye ? player2.name : (player2.isBye ? player1.name : null);

        const matchData = {
            id: `${roundName}-${division}-${Math.floor(i/2) + 1}`,
            player1: player1.name,
            player2: player2.name,
            player1Seed: player1.seed,
            player2Seed: player2.seed || null,
            score1: player2.isBye ? 3 : (player1.isBye ? 0 : ''),
            score2: player2.isBye ? 0 : (player1.isBye ? 3 : ''),
            completed: isByeMatch,
            winner: winner,
            roundName: roundName,
            position: Math.floor(i/2) + 1,
            isBye: isByeMatch
        };

        matches.push(matchData);
    }

    rounds[roundName] = {
        name: roundName,
        matches: matches,
        completed: false,
        nextRound: getNextRoundName(roundName),
        createdAt: new Date().toISOString()
    };

    dayData.pools.manualFinalPhase.currentRound = roundName;
}

function determineFirstRound(numPlayers) {
    // Détermine le premier tour selon le nombre de joueurs
    // 2 joueurs = Finale directe
    // 3-4 joueurs = Demi-finales
    // 5-8 joueurs = Quarts de finale
    // 9-16 joueurs = 8èmes de finale
    // 17-32 joueurs = 16èmes de finale
    // 33+ joueurs = 32èmes de finale
    if (numPlayers > 32) return "32èmes";
    if (numPlayers > 16) return "16èmes";
    if (numPlayers > 8) return "8èmes";
    if (numPlayers > 4) return "Quarts";
    if (numPlayers > 2) return "Demi-finales";
    if (numPlayers === 2) return "Finale";
    return null;
}

function generateFirstRound(dayNumber, division, qualified, roundName) {
    const dayData = championship.days[dayNumber];
    const rounds = dayData.pools.manualFinalPhase.divisions[division].rounds;

    // Créer le tableau équilibré
    const seededPlayers = organizeSeeds(qualified);
    const matches = [];
    
    for (let i = 0; i < seededPlayers.length; i += 2) {
        const player1 = seededPlayers[i];
        const player2 = seededPlayers[i + 1] || { name: 'BYE', isBye: true };
        
        const matchData = {
            id: `${roundName}-${division}-${Math.floor(i/2) + 1}`,
            player1: player1.name,
            player2: player2.name,
            player1Seed: player1.seed,
            player2Seed: player2.seed || null,
            score1: player2.isBye ? 3 : '',
            score2: player2.isBye ? 0 : '',
            completed: player2.isBye || false,
            winner: player2.isBye ? player1.name : null,
            roundName: roundName,
            position: Math.floor(i/2) + 1,
            isBye: player2.isBye || false
        };
        
        matches.push(matchData);
    }
    
    rounds[roundName] = {
        name: roundName,
        matches: matches,
        completed: false,
        nextRound: getNextRoundName(roundName)
    };
    
    // Marquer comme tour actuel
    dayData.pools.manualFinalPhase.currentRound = roundName;
}

function getNextRoundName(currentRound) {
    const sequence = ["32èmes", "16èmes", "8èmes", "Quarts", "Demi-finales", "Finale"];
    const currentIndex = sequence.indexOf(currentRound);
    return currentIndex >= 0 && currentIndex < sequence.length - 1 ? sequence[currentIndex + 1] : null;
}

function organizeSeeds(qualified) {
    // Algorithme de placement qui sépare les joueurs de même poule
    // pour qu'ils ne se rencontrent qu'au tour le plus tardif possible

    const numPlayers = qualified.length;
    if (numPlayers < 4) {
        return qualified.sort((a, b) => a.seed - b.seed);
    }

    // Grouper les joueurs par poule
    const poolGroups = {};
    qualified.forEach(player => {
        const poolKey = player.poolIndex !== undefined ? player.poolIndex : player.poolName;
        if (!poolGroups[poolKey]) {
            poolGroups[poolKey] = [];
        }
        poolGroups[poolKey].push(player);
    });

    // Trier chaque groupe par rang dans la poule
    Object.values(poolGroups).forEach(group => {
        group.sort((a, b) => a.poolRank - b.poolRank);
    });

    const poolKeys = Object.keys(poolGroups);
    const numPools = poolKeys.length;

    // Déterminer la taille du tableau (prochaine puissance de 2)
    const bracketSize = Math.pow(2, Math.ceil(Math.log2(numPlayers)));
    const result = new Array(bracketSize).fill(null);

    // Cas spécial : 2 poules (croisement classique)
    if (numPools === 2) {
        const poolA = poolGroups[poolKeys[0]];
        const poolB = poolGroups[poolKeys[1]];

        // Placement croisé : 1A vs 2B en haut, 1B vs 2A en bas
        // Ainsi les joueurs de même poule ne se rencontrent qu'en finale
        if (bracketSize === 4) {
            result[0] = poolA[0]; // 1er poule A
            result[1] = poolB[1]; // 2ème poule B
            result[2] = poolB[0]; // 1er poule B
            result[3] = poolA[1]; // 2ème poule A
        } else {
            // Pour tableaux plus grands, alterner les placements
            let posA = 0, posB = bracketSize / 2;
            poolA.forEach((player, idx) => {
                if (idx % 2 === 0) result[posA++] = player;
                else result[posB++] = player;
            });
            posA = 1; posB = bracketSize / 2 + 1;
            poolB.forEach((player, idx) => {
                if (idx % 2 === 0) result[posB - 1 + idx] = player;
                else result[posA - 1 + idx] = player;
            });
        }
    }
    // Cas 4 poules : placement en quarts séparés
    else if (numPools === 4) {
        // Ordre des poules pour croisement optimal
        // Q1: 1A vs 2C, Q2: 1D vs 2B, Q3: 1B vs 2D, Q4: 1C vs 2A
        const crossOrder = [
            [0, 2], // Q1: poule 0 vs poule 2
            [3, 1], // Q2: poule 3 vs poule 1
            [1, 3], // Q3: poule 1 vs poule 3
            [2, 0]  // Q4: poule 2 vs poule 0
        ];

        let pos = 0;
        crossOrder.forEach(([poolIdx1, poolIdx2]) => {
            const pool1 = poolGroups[poolKeys[poolIdx1]] || [];
            const pool2 = poolGroups[poolKeys[poolIdx2]] || [];

            if (pool1[0]) result[pos] = pool1[0]; // 1er de poule
            if (pool2[1]) result[pos + 1] = pool2[1]; // 2ème de l'autre poule
            pos += 2;
        });
    }
    // Cas général : algorithme de séparation par moitiés
    else {
        // Grouper les joueurs par rang (tous les 1ers, tous les 2èmes, etc.)
        const byRank = {};
        qualified.forEach(player => {
            const rank = player.poolRank || 1;
            if (!byRank[rank]) byRank[rank] = [];
            byRank[rank].push(player);
        });

        // Placer les joueurs en s'assurant que même poule = moitiés différentes
        const halfSize = bracketSize / 2;
        let topPos = 0;
        let bottomPos = halfSize;

        // Alterner les poules entre haut et bas du tableau
        poolKeys.forEach((poolKey, poolIdx) => {
            const players = poolGroups[poolKey];
            players.forEach((player, playerIdx) => {
                // Alterner: pair en haut, impair en bas (par poule)
                if (poolIdx % 2 === 0) {
                    if (playerIdx % 2 === 0 && topPos < halfSize) {
                        result[topPos++] = player;
                    } else if (bottomPos < bracketSize) {
                        result[bottomPos++] = player;
                    }
                } else {
                    if (playerIdx % 2 === 0 && bottomPos < bracketSize) {
                        result[bottomPos++] = player;
                    } else if (topPos < halfSize) {
                        result[topPos++] = player;
                    }
                }
            });
        });
    }

    // Compacter le tableau (retirer les nulls) et réorganiser pour matchs équilibrés
    const compacted = result.filter(p => p !== null);

    // Si on n'a pas assez de joueurs, compléter avec les joueurs manquants
    qualified.forEach(player => {
        if (!compacted.includes(player)) {
            compacted.push(player);
        }
    });

    // S'assurer qu'on a le bon nombre de joueurs
    const finalResult = compacted.slice(0, numPlayers);

    // Réorganiser pour que les matchs soient bien formés (seed order dans chaque moitié)
    return reorderForBracket(finalResult, poolGroups);
}

// Réorganise le tableau pour un bracket équilibré tout en gardant la séparation des poules
function reorderForBracket(players, poolGroups) {
    const n = players.length;
    if (n < 4) return players;

    // Vérifier si deux joueurs sont de la même poule
    function samePool(p1, p2) {
        if (!p1 || !p2) return false;
        const pool1 = p1.poolIndex !== undefined ? p1.poolIndex : p1.poolName;
        const pool2 = p2.poolIndex !== undefined ? p2.poolIndex : p2.poolName;
        return pool1 === pool2;
    }

    // Trier par seed d'abord
    const sorted = [...players].sort((a, b) => (a.seed || 99) - (b.seed || 99));

    // Pour un tableau de 4 : positions [0,1] = match1, [2,3] = match2
    // Pour un tableau de 8 : [0,1]=M1, [2,3]=M2, [4,5]=M3, [6,7]=M4
    // Les gagnants de M1 vs M2 se rencontrent en demi, M3 vs M4 aussi

    const result = new Array(n).fill(null);
    const used = new Set();

    // Placement standard du seeding avec vérification des poules
    // Seed 1 vs dernier seed, Seed 2 vs avant-dernier, etc.
    const positions = generateBracketPositions(n);

    positions.forEach((pos, idx) => {
        if (idx < sorted.length) {
            result[pos] = sorted[idx];
        }
    });

    // Vérifier et corriger les conflits de poules
    for (let i = 0; i < result.length; i += 2) {
        if (samePool(result[i], result[i + 1])) {
            // Conflit ! Chercher un échange possible
            for (let j = i + 2; j < result.length; j++) {
                // Essayer d'échanger result[i+1] avec result[j]
                if (!samePool(result[i], result[j]) && !samePool(result[j - (j % 2)], result[i + 1])) {
                    const temp = result[i + 1];
                    result[i + 1] = result[j];
                    result[j] = temp;
                    break;
                }
            }
        }
    }

    return result.filter(p => p !== null);
}

// Génère les positions de placement pour un bracket standard
function generateBracketPositions(n) {
    if (n <= 2) return [0, 1];
    if (n <= 4) return [0, 3, 2, 1]; // 1 vs 4, 2 vs 3 -> gagnants en finale
    if (n <= 8) return [0, 7, 4, 3, 2, 5, 6, 1]; // Standard 8-bracket
    if (n <= 16) {
        // Pour 16: séparation maximale des têtes de série
        return [0, 15, 8, 7, 4, 11, 12, 3, 2, 13, 10, 5, 6, 9, 14, 1];
    }
    // Pour 32: bracket standard avec séparation maximale
    if (n <= 32) {
        return [
            0, 31, 16, 15, 8, 23, 24, 7,   // Haut du tableau (quart 1-2)
            4, 27, 20, 11, 12, 19, 28, 3,  // Haut du tableau (quart 3-4)
            2, 29, 18, 13, 10, 21, 26, 5,  // Bas du tableau (quart 5-6)
            6, 25, 22, 9, 14, 17, 30, 1    // Bas du tableau (quart 7-8)
        ];
    }
    // Pour 64 ou plus: générer dynamiquement
    const positions = [];
    for (let i = 0; i < n; i++) {
        positions.push(i);
    }
    // Algorithme de placement standard : seed 1 vs seed n, seed 2 vs seed n-1, etc.
    const result = new Array(n);
    for (let i = 0; i < n / 2; i++) {
        result[i * 2] = positions[i];
        result[i * 2 + 1] = positions[n - 1 - i];
    }
    return result.map((_, idx) => idx); // Retourner indices linéaires si > 32
}

// ======================================
// AFFICHAGE DES PHASES FINALES MANUELLES
// ======================================

function updateManualFinalPhaseDisplay(dayNumber) {
    const dayData = championship.days[dayNumber];
    if (!dayData.pools || !dayData.pools.manualFinalPhase || !dayData.pools.manualFinalPhase.enabled) {
        return;
    }

    const numDivisions = championship.config?.numberOfDivisions || 3;

    for (let division = 1; division <= numDivisions; division++) {
        const container = document.getElementById(`division${dayNumber}-${division}-matches`);
        if (!container) continue;

        const finalPhase = dayData.pools.manualFinalPhase.divisions[division];

        if (!finalPhase || finalPhase.qualified.length === 0) continue;

        let html = generateManualFinalPhaseHTML(dayNumber, division, finalPhase);

        // Supprimer ancien affichage phase finale s'il existe
        const existingFinal = container.querySelector('.manual-final-phase-container');
        if (existingFinal) existingFinal.remove();

        // Ajouter après les poules si elles existent, sinon directement dans le conteneur
        const poolsContainer = container.querySelector('.pools-container');
        if (poolsContainer) {
            poolsContainer.insertAdjacentHTML('afterend', html);
        } else {
            // Mode élimination directe - pas de poules, ajouter directement
            container.insertAdjacentHTML('beforeend', html);
        }
    }
}

function generateManualFinalPhaseHTML(dayNumber, division, finalPhase) {
    const currentRound = championship.days[dayNumber].pools.manualFinalPhase.currentRound;
    const rounds = finalPhase.rounds;
    const isDirectMode = championship.days[dayNumber].pools.config?.mode === 'direct';

    // Adapter les textes selon le mode
    const headerTitle = isDirectMode ? '⚡ ÉLIMINATION DIRECTE' : '🏆 PHASE FINALE';
    const headerBg = isDirectMode ? 'linear-gradient(135deg, #9b59b6, #8e44ad)' : 'linear-gradient(135deg, #16a085, #1abc9c)';
    const playersTitle = isDirectMode ? '👥 Participants au Tournoi' : '✨ Joueurs Qualifiés des Poules';

    let html = `
        <div class="manual-final-phase-container" style="margin-top: 30px;">
            <div class="final-phase-header" style="
                background: ${headerBg};
                color: white;
                padding: 25px;
                border-radius: 15px;
                text-align: center;
                margin-bottom: 25px;
                box-shadow: 0 5px 15px rgba(142, 68, 173, 0.3);
            ">
                <h3 style="margin: 0 0 10px 0; font-size: 1.5rem;">
                    ${headerTitle} - Division ${division}
                </h3>
                <div style="font-size: 16px; opacity: 0.9;">
                    ${finalPhase.qualified.length} joueurs en compétition
                </div>
                ${currentRound ? `
                    <div style="
                        background: rgba(255,255,255,0.2);
                        padding: 10px 20px;
                        border-radius: 20px;
                        margin-top: 15px;
                        display: inline-block;
                    ">
                        <strong>🎯 Tour actuel : ${currentRound}</strong>
                    </div>
                ` : ''}
            </div>

            <div class="qualified-players" style="
                background: linear-gradient(135deg, #e8f5e8, #d4edda);
                border: 2px solid #28a745;
                border-radius: 12px;
                padding: 20px;
                margin-bottom: 25px;
            ">
                <h4 style="color: #155724; margin-bottom: 15px; text-align: center;">
                    ${playersTitle}
                </h4>
                <div style="display: flex; flex-wrap: wrap; gap: 10px; justify-content: center;">
                    ${finalPhase.qualified.map(player => `
                        <span style="
                            background: linear-gradient(135deg, #28a745, #20c997);
                            color: white;
                            padding: 8px 15px;
                            border-radius: 20px;
                            font-size: 14px;
                            font-weight: 600;
                            box-shadow: 0 3px 8px rgba(40, 167, 69, 0.3);
                        ">
                            #${player.seed} ${player.name}${player.poolName && player.poolName !== '-' ? ` (${player.poolName})` : ''}
                        </span>
                    `).join('')}
                </div>
            </div>
    `;
    
    // Afficher les tours
    if (Object.keys(rounds).length > 0) {
        html += generateRoundsHTML(dayNumber, division, rounds, currentRound);
    }
    
    // Afficher le podium si terminé
    const champion = getChampionFromFinalPhase(finalPhase);
    if (champion) {
        html += generatePodiumHTML(finalPhase);
    }
    
    html += '</div>';
    
    return html;
}

function generateRoundsHTML(dayNumber, division, rounds, currentRound) {
    let html = '';
    
    const roundOrder = ["16èmes", "8èmes", "Quarts", "Demi-finales", "Petite finale", "Finale"];
    
    for (const roundName of roundOrder) {
        if (!rounds[roundName]) continue;
        
        const round = rounds[roundName];
        const isCurrentRound = roundName === currentRound;
        const isCompleted = round.completed;
        const completedMatches = round.matches.filter(m => m.completed).length;
        const totalMatches = round.matches.length;
        
        html += `
            <div class="manual-round" style="
                background: ${isCurrentRound ? 'linear-gradient(135deg, #fff3cd, #ffeaa7)' : 'white'};
                border: 3px solid ${isCurrentRound ? '#ffc107' : isCompleted ? '#28a745' : '#6c757d'};
                border-radius: 15px;
                padding: 25px;
                margin-bottom: 25px;
                ${isCurrentRound ? 'box-shadow: 0 5px 20px rgba(255, 193, 7, 0.3);' : ''}
            ">
                <div class="round-header" style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                ">
                    <h4 style="
                        margin: 0;
                        color: ${isCurrentRound ? '#856404' : isCompleted ? '#155724' : '#495057'};
                        font-size: 1.3rem;
                    ">
                        ${getRoundIcon(roundName)} ${roundName}
                    </h4>
                    <div style="
                        background: ${isCompleted ? '#d4edda' : isCurrentRound ? '#fff3cd' : '#f8f9fa'};
                        color: ${isCompleted ? '#155724' : isCurrentRound ? '#856404' : '#6c757d'};
                        padding: 8px 15px;
                        border-radius: 20px;
                        font-weight: bold;
                        font-size: 14px;
                    ">
                        ${completedMatches}/${totalMatches} terminés
                        ${isCompleted ? ' ✅' : isCurrentRound ? ' ⚡' : ' ⏳'}
                    </div>
                </div>
                
                <div class="round-matches" style="
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    gap: 15px;
                    margin-bottom: 20px;
                ">
                    ${round.matches.map(match => generateManualMatchHTML(dayNumber, division, match, roundName)).join('')}
                </div>
                
                ${generateRoundControlsHTML(dayNumber, division, round, roundName, completedMatches, totalMatches)}
            </div>
        `;
    }
    
    return html;
}

function getRoundIcon(roundName) {
    const icons = {
        "16èmes": "🎯",
        "8èmes": "🔥", 
        "Quarts": "⚡",
        "Demi-finales": "🚀",
        "Petite finale": "🥉",
        "Finale": "🏆"
    };
    return icons[roundName] || "🎲";
}

function generateManualMatchHTML(dayNumber, division, match, roundName) {
    const isCompleted = match.completed;
    const isActive = !match.isBye;
    const score1 = match.score1 || 0;
    const score2 = match.score2 || 0;
    const scoreDisplay = isCompleted && !match.isBye ? `<span class="collapse-score">${score1}-${score2}</span>` : '';
    return `
        <div class="manual-match ${match.isCollapsed ? 'collapsed' : ''}" style="
            background: ${isCompleted ? '#d5f4e6' : isActive ? 'white' : '#f8f9fa'};
            border: 2px solid ${isCompleted ? '#28a745' : isActive ? '#007bff' : '#6c757d'};
            border-radius: 10px;
            padding: 10px;
            position: relative;
            ${match.isBye ? 'opacity: 0.7;' : ''}
        ">
            ${!match.isBye && window.showForfaitButtons ? `<button onclick="event.stopPropagation(); deleteManualMatch(${dayNumber}, ${division}, '${roundName}', ${match.position})"
                    title="Supprimer ce match"
                    style="position: absolute; top: 50%; right: 5px; transform: translateY(-50%);
                           width: 18px; height: 18px; z-index: 10;
                           background: #e74c3c; color: white; border: none; border-radius: 50%;
                           font-size: 11px; cursor: pointer; line-height: 1; padding: 0;
                           opacity: 0.6; transition: opacity 0.2s;"
                    onmouseover="this.style.opacity='1'"
                    onmouseout="this.style.opacity='0.6'">×</button>` : ''}
            <div class="match-header" ${isCompleted && !match.isBye ? `onclick="toggleMatchCollapse(this.parentElement)"` : ''} style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
                ${isCompleted && !match.isBye ? 'cursor: pointer;' : ''}
            ">
                <div class="match-title" style="
                    font-size: 13px;
                    color: #6c757d;
                    font-weight: bold;
                ">
                    Match ${match.position}${scoreDisplay}
                </div>
                ${isCompleted || match.isBye ? `<div class="match-status" style="
                    font-size: 12px;
                    padding: 4px 10px;
                    border-radius: 15px;
                    font-weight: bold;
                    background: ${isCompleted ? '#d4edda' : '#e2e3e5'};
                    color: ${isCompleted ? '#155724' : '#6c757d'};
                ">
                    ${isCompleted ? 'Terminé ✅' : 'Qualifié ⚡'}
                </div>` : ''}
            </div>
            
            <div class="players" style="
                font-weight: bold;
                color: #2c3e50;
                margin-bottom: ${match.isBye ? '0' : '15px'};
                font-size: 15px;
                text-align: center;
                ${!match.isBye ? 'display: none;' : ''}
            ">
                ${match.player1Seed ? `#${match.player1Seed}` : ''} ${match.player1}
                ${!match.isBye ? ` VS ${match.player2Seed ? `#${match.player2Seed}` : ''} ${match.player2}` : ''}
            </div>
            
            ${match.isBye ? `
                <div style="
                    text-align: center;
                    color: #28a745;
                    font-style: italic;
                    padding: 10px;
                ">
                    Qualifié automatiquement
                </div>
            ` : `
                <div class="score-container" style="
                    margin-bottom: 12px;
                    padding: 12px;
                    background: #f8f9fa;
                    border: 1px solid #dee2e6;
                    border-radius: 6px;
                ">
                    ${window.showForfaitButtons ? 
                        `<input type="text" value="${match.player1}" 
                                onchange="editFinalMatchPlayerName(${dayNumber}, ${division}, '${match.id}', 'player1', this.value)"
                                style="flex: 1; min-width: 80px; padding: 4px 8px; font-size: 14px; border: 1px solid #3498db; border-radius: 4px; background: white;">`
                        : `<span class="player-name-left">${match.player1}</span>`}
                    <div class="score-center">
                        <input type="number"
                               value="${match.score1 === null || match.score1 === undefined ? '' : match.score1}"
                               placeholder="0"
                               onchange="updateManualMatchScore('${match.id}', 'score1', this.value, ${dayNumber})"
                               onkeydown="handleManualMatchEnter(event, '${match.id}', ${dayNumber})"
                               style="width: 45px; height: 40px; text-align: center; border: 2px solid #007bff; border-radius: 4px; font-size: 16px; font-weight: bold;">
                        <span style="color: #6c757d; font-weight: bold; font-size: 14px;">-</span>
                        <input type="number"
                               value="${match.score2 === null || match.score2 === undefined ? '' : match.score2}"
                               placeholder="0"
                               onchange="updateManualMatchScore('${match.id}', 'score2', this.value, ${dayNumber})"
                               onkeydown="handleManualMatchEnter(event, '${match.id}', ${dayNumber})"
                               style="width: 45px; height: 40px; text-align: center; border: 2px solid #007bff; border-radius: 4px; font-size: 16px; font-weight: bold;">
                    </div>
                    ${window.showForfaitButtons ? 
                        `<input type="text" value="${match.player2}" 
                                onchange="editFinalMatchPlayerName(${dayNumber}, ${division}, '${match.id}', 'player2', this.value)"
                                style="flex: 1; min-width: 80px; padding: 4px 8px; font-size: 14px; border: 1px solid #3498db; border-radius: 4px; background: white;">`
                        : `<span class="player-name-right">${match.player2}</span>`}
                </div>

                ${!isCompleted && window.showForfaitButtons ? `
                <div style="display: flex; gap: 4px; justify-content: center; margin-bottom: 8px;">
                    <button onclick="declareForfait('final', ${dayNumber}, ${division}, '${match.id}', 'player1')"
                            style="padding: 2px 6px; font-size: 10px; background: #e74c3c; color: white;
                                   border: none; border-radius: 3px; cursor: pointer;"
                            title="Forfait ${match.player1}">F1</button>
                    <button onclick="declareForfait('final', ${dayNumber}, ${division}, '${match.id}', 'player2')"
                            style="padding: 2px 6px; font-size: 10px; background: #e74c3c; color: white;
                                   border: none; border-radius: 3px; cursor: pointer;"
                            title="Forfait ${match.player2}">F2</button>
                </div>
                ` : ''}

                <div class="match-result" style="
                    text-align: center;
                    padding: 6px;
                    border-radius: 6px;
                    font-weight: bold;
                    background: ${isCompleted ? (match.forfaitBy ? '#fff3cd' : (match.winner === null ? '#e3f2fd' : '#d4edda')) : '#fff3cd'};
                    color: ${isCompleted ? (match.forfaitBy ? '#856404' : (match.winner === null ? '#1565c0' : '#155724')) : '#856404'};
                    font-size: 13px;
                ">
                    ${isCompleted && match.winner ? `${match.forfaitBy ? '⚠️' : '🏆'} ${match.winner} gagne${match.forfaitBy ? ' (forfait)' : ''} (${score1}-${score2})` :
                      isCompleted && match.winner === null ? `🤝 Match nul (${score1}-${score2})` : 'En attente des scores'}
                </div>
            `}
        </div>
    `;
}

function generateRoundControlsHTML(dayNumber, division, round, roundName, completedMatches, totalMatches) {
    const allCompleted = completedMatches === totalMatches && totalMatches > 0;
    
    if (!allCompleted && roundName !== "Finale" && roundName !== "Petite finale") {
        return `
            <div style="
                text-align: center;
                padding: 15px;
                background: #f8f9fa;
                border-radius: 8px;
                color: #6c757d;
                font-style: italic;
            ">
                Terminez tous les matchs pour passer au tour suivant
            </div>
        `;
    }
    
    if (allCompleted && (roundName === "Finale" || roundName === "Petite finale")) {
        return `
            <div style="
                text-align: center;
                padding: 20px;
                background: linear-gradient(135deg, #28a745, #20c997);
                color: white;
                border-radius: 10px;
                font-weight: bold;
            ">
                🎉 ${roundName} terminée ! Consultez le podium ci-dessous.
            </div>
        `;
    }
    
    // Cas spécial pour les demi-finales
    if (allCompleted && roundName === "Demi-finales") {
        return `
            <div style="
                text-align: center;
                padding: 20px;
                background: linear-gradient(135deg, #ffc107, #ffca2c);
                border-radius: 10px;
            ">
                <div style="color: #856404; font-weight: bold; margin-bottom: 15px; font-size: 16px;">
                    ✅ Demi-finales terminées !
                </div>
                <div style="display: flex; gap: 15px; justify-content: center; margin-top: 15px;">
                    <button class="btn" onclick="generatePetiteFinale(${dayNumber}, ${division})" 
                            style="
                        background: linear-gradient(135deg, #fd7e14, #e55a00);
                        color: white;
                        border: none;
                        padding: 12px 20px;
                        border-radius: 8px;
                        font-weight: bold;
                        cursor: pointer;
                    ">
                        🥉 Petite Finale
                    </button>
                    <button class="btn" onclick="generateFinale(${dayNumber}, ${division})" 
                            style="
                        background: linear-gradient(135deg, #dc3545, #c82333);
                        color: white;
                        border: none;
                        padding: 12px 20px;
                        border-radius: 8px;
                        font-weight: bold;
                        cursor: pointer;
                    ">
                        🏆 Grande Finale
                    </button>
                </div>
            </div>
        `;
    }
    
    // Pour les autres tours terminés
    if (allCompleted) {
        // Fallback: calculer nextRound si non défini (pour données créées avant correction)
        const nextRound = round.nextRound || getNextRoundName(roundName);
        if (nextRound) {
            return `
                <div style="
                    text-align: center;
                    padding: 20px;
                    background: linear-gradient(135deg, #ffc107, #ffca2c);
                    border-radius: 10px;
                ">
                    <div style="color: #856404; font-weight: bold; margin-bottom: 15px; font-size: 16px;">
                        ✅ Tous les matchs sont terminés !
                    </div>
                    <div style="margin-bottom: 15px; color: #6c5f00;">
                        Qualifiés : ${getQualifiedFromRound(round).join(', ')}
                    </div>
                    <button class="btn" onclick="generateNextManualRound(${dayNumber}, ${division}, '${roundName}')" 
                            style="
                        background: linear-gradient(135deg, #28a745, #20c997);
                        color: white;
                        border: none;
                        padding: 12px 25px;
                        border-radius: 8px;
                        font-size: 16px;
                        font-weight: bold;
                        cursor: pointer;
                        box-shadow: 0 3px 10px rgba(40, 167, 69, 0.3);
                    ">
                        🚀 Passer aux ${nextRound}
                    </button>
                </div>
            `;
        }
    }
    
    return '';
}

function getQualifiedFromRound(round) {
    return round.matches.filter(m => m.completed && m.winner).map(m => m.winner);
}

// ======================================
// FONCTIONS DE GESTION DES MATCHS
// ======================================

function updateManualMatchScore(matchId, scoreField, value, dayNumber) {
    const dayData = championship.days[dayNumber];
    const numDivisions = championship.config.numDivisions || 3;
    let matchFound = false;

    // Chercher dans toutes les divisions et tous les tours
    for (let division = 1; division <= numDivisions; division++) {
        const rounds = dayData.pools.manualFinalPhase.divisions[division].rounds;

        for (const roundName in rounds) {
            const round = rounds[roundName];
            const match = round.matches.find(m => m.id === matchId);

            if (match && !match.isBye) {
                match[scoreField] = value;
                // Annuler le forfait si les scores sont modifiés manuellement
                if (match.forfaitBy) {
                    delete match.forfaitBy;
                }
                // NE PAS régénérer le DOM ici pour permettre la navigation Tab naturelle
                // La régénération se fera dans handleManualMatchEnter quand le match est validé
                matchFound = true;
                saveToLocalStorage();
                break;
            }
        }
        if (matchFound) break;
    }

    if (!matchFound) {
        console.error(`❌ Match ${matchId} non trouvé`);
    }
}

function handleManualMatchEnter(event, matchId, dayNumber) {
    console.log('🔵 handleManualMatchEnter appelé - Key:', event.key, 'MatchId:', matchId);

    const dayData = championship.days[dayNumber];
    const numDivisions = championship.config?.numberOfDivisions || 3;
    let match = null;
    let matchDivision = null;
    let matchRoundName = null;

    // Trouver le match
    for (let division = 1; division <= numDivisions; division++) {
        const rounds = dayData.pools.manualFinalPhase.divisions[division].rounds;
        for (const roundName in rounds) {
            match = rounds[roundName].matches.find(m => m.id === matchId);
            if (match) {
                matchDivision = division;
                matchRoundName = roundName;
                break;
            }
        }
        if (match) break;
    }

    if (!match) {
        console.log('❌ Match non trouvé');
        return;
    }

    // CORRECTION: Lire les valeurs directement depuis le DOM (pas depuis l'objet match)
    const currentInput = event.target;
    const matchContainer = currentInput.closest('.manual-match');
    if (!matchContainer) {
        console.log('❌ Container non trouvé');
        return;
    }

    const inputs = matchContainer.querySelectorAll('input[type="number"]');
    const input1 = inputs[0];
    const input2 = inputs[1];

    if (!input1 || !input2) {
        console.log('❌ Inputs non trouvés');
        return;
    }

    // Lire les valeurs actuelles du DOM
    const score1Value = input1.value.trim();
    const score2Value = input2.value.trim();
    console.log('📊 Scores du DOM:', score1Value, '-', score2Value);

    // Déterminer si on doit valider selon les valeurs du DOM
    const bothScoresFilled = score1Value !== '' && score2Value !== '';
    const shouldValidate = event.key === 'Enter' || (event.key === 'Tab' && bothScoresFilled);
    console.log('✅ Should validate:', shouldValidate, '(bothFilled:', bothScoresFilled, ')');

    if (shouldValidate) {
        // Si Tab sur scores incomplets, laisser la navigation naturelle
        if (event.key === 'Tab' && !bothScoresFilled) {
            console.log('⏩ Tab avec scores incomplets - navigation naturelle');
            return;
        }

        event.preventDefault();
        console.log('🛑 Validation du match...');

        // Mettre à jour les valeurs dans l'objet match AVANT de valider
        match.score1 = score1Value;
        match.score2 = score2Value;

        // Sauvegarder l'état AVANT régénération
        const wasCompleted = match.completed;

        // Vérifier la complétion du match
        checkManualMatchCompletion(match);

        // Vérifier si le tour est terminé (pour débloquer le suivant)
        if (matchDivision && matchRoundName) {
            checkRoundCompletion(dayNumber, matchDivision, matchRoundName);
        }

        // Auto-collapse le match qui vient d'être complété
        if (!wasCompleted && match.completed) {
            console.log('✂️ Auto-collapse du match:', matchId);
            match.isCollapsed = true;
        }

        // Rafraîchir l'affichage
        updateManualFinalPhaseDisplay(dayNumber);
        saveToLocalStorage();

        // Passer au match suivant
        setTimeout(() => {
            console.log('🔄 Navigation vers le match suivant...');
            // Trouver tous les inputs VISIBLES (matchs non collapsed)
            const visibleInputs = Array.from(
                document.querySelectorAll('.manual-match:not(.collapsed) input[type="number"]')
            );
            console.log('📝 Nombre d\'inputs visibles:', visibleInputs.length);

            // Trouver le prochain match non-complété
            let foundNext = false;
            for (let i = 0; i < visibleInputs.length; i++) {
                const inputMatchElement = visibleInputs[i].closest('.manual-match');
                const inputs = inputMatchElement?.querySelectorAll('input[type="number"]');

                if (inputs && inputs.length >= 2) {
                    const onchangeAttr = inputs[0].getAttribute('onchange');
                    const inputMatchId = onchangeAttr ? onchangeAttr.match(/'([^']+)'/)?.[1] : null;

                    // Si c'est un match différent (donc le match actuel est déjà collapsed et exclu)
                    if (inputMatchId && inputMatchId !== matchId) {
                        console.log('➡️ Focus sur le match suivant:', inputMatchId);
                        // Empêcher le scroll automatique
                        visibleInputs[i].focus({ preventScroll: true });
                        visibleInputs[i].select();
                        // Scroll doux vers l'élément seulement s'il n'est pas visible
                        visibleInputs[i].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        foundNext = true;
                        break;
                    }
                }
            }

            if (!foundNext) {
                console.log('✅ Tous les matchs sont terminés!');
            }
        }, 150);
    }
}

function checkManualMatchCompletion(match) {
    if (match.isBye) return;

    const wasCompleted = match.completed;

    if (match.score1 !== '' && match.score2 !== '') {
        const score1 = parseInt(match.score1);
        const score2 = parseInt(match.score2);

        if (score1 > score2) {
            match.completed = true;
            match.winner = match.player1;
        } else if (score2 > score1) {
            match.completed = true;
            match.winner = match.player2;
        } else {
            match.completed = true;
            match.winner = null;
        }
    } else {
        // Si l'un des scores est vide, remettre le match en attente
        match.completed = false;
        match.winner = null;
    }

    if (!wasCompleted && match.completed) {
        showNotification(`🏆 ${match.winner || 'Match nul'} remporte le match !`, 'success');
    } else if (wasCompleted && !match.completed) {
        showNotification(`⏸️ Match remis en attente`, 'info');
    }
}

function checkRoundCompletion(dayNumber, division, roundName) {
    const round = championship.days[dayNumber].pools.manualFinalPhase.divisions[division].rounds[roundName];
    if (!round) return;
    
    const completedMatches = round.matches.filter(m => m.completed).length;
    const totalMatches = round.matches.length;
    
    const wasCompleted = round.completed;
    round.completed = (completedMatches === totalMatches && totalMatches > 0);
    
    if (!wasCompleted && round.completed) {
        showNotification(`✅ ${roundName} terminé ! Vous pouvez passer au tour suivant.`, 'info');
        
        // Mettre à jour l'affichage
        setTimeout(() => {
            updateManualFinalPhaseDisplay(dayNumber);
        }, 500);
    }
}

// ======================================
// GÉNÉRATION DES TOURS SUIVANTS
// ======================================

function generateNextManualRound(dayNumber, division, currentRoundName) {
    const dayData = championship.days[dayNumber];
    const currentRound = dayData.pools.manualFinalPhase.divisions[division].rounds[currentRoundName];

    // Vérifier si tous les matchs sont terminés (fallback si completed non mis à jour)
    const allMatchesCompleted = currentRound.matches.every(m => m.completed);
    if (!currentRound.completed && !allMatchesCompleted) {
        alert('⚠️ Terminez d\'abord tous les matchs du tour actuel !');
        return;
    }

    // Fallback: calculer nextRound si non défini
    const nextRoundName = currentRound.nextRound || getNextRoundName(currentRoundName);
    if (!nextRoundName) {
        alert('⚠️ Pas de tour suivant défini !');
        return;
    }
    
    // Récupérer les gagnants
    const winners = currentRound.matches
        .filter(match => match.completed && match.winner)
        .map(match => ({
            name: match.winner,
            seed: match.winner === match.player1 ? match.player1Seed : match.player2Seed
        }));
    
    if (winners.length < 2) {
        alert('❌ Pas assez de gagnants pour créer le tour suivant !');
        return;
    }
    
    // Créer le tour suivant
    createManualRound(dayNumber, division, nextRoundName, winners);
    
    // Mettre à jour le tour actuel
    dayData.pools.manualFinalPhase.currentRound = nextRoundName;
    
    updateManualFinalPhaseDisplay(dayNumber);
    saveToLocalStorage();
    
    showNotification(`🎯 ${nextRoundName} générés ! ${winners.length} joueurs qualifiés.`, 'success');
}

function createManualRound(dayNumber, division, roundName, players) {
    const dayData = championship.days[dayNumber];
    const rounds = dayData.pools.manualFinalPhase.divisions[division].rounds;
    
    const matches = [];
    
    for (let i = 0; i < players.length; i += 2) {
        const player1 = players[i];
        const player2 = players[i + 1];
        
        if (player1 && player2) {
            const matchData = {
                id: `${roundName}-${division}-${Math.floor(i/2) + 1}`,
                player1: player1.name,
                player2: player2.name,
                player1Seed: player1.seed,
                player2Seed: player2.seed,
                score1: '',
                score2: '',
                completed: false,
                winner: null,
                roundName: roundName,
                position: Math.floor(i/2) + 1,
                isBye: false
            };
            
            matches.push(matchData);
        }
    }
    
    rounds[roundName] = {
        name: roundName,
        matches: matches,
        completed: false,
        nextRound: getNextRoundName(roundName)
    };
}

// ======================================
// GESTION FINALE ET PETITE FINALE
// ======================================

function generateFinale(dayNumber, division) {
    const dayData = championship.days[dayNumber];
    const demiFinales = dayData.pools.manualFinalPhase.divisions[division].rounds["Demi-finales"];
    
    if (!demiFinales || !demiFinales.completed) {
        alert('⚠️ Les demi-finales doivent être terminées !');
        return;
    }
    
    // Récupérer les gagnants des demi-finales
    const finalistes = demiFinales.matches
        .filter(match => match.completed && match.winner)
        .map(match => ({
            name: match.winner,
            seed: match.winner === match.player1 ? match.player1Seed : match.player2Seed
        }));
    
    if (finalistes.length !== 2) {
        alert(`❌ Il faut exactement 2 finalistes ! (${finalistes.length} trouvés)`);
        return;
    }
    
    createManualRound(dayNumber, division, "Finale", finalistes);
    
    // Marquer la finale comme tour actuel
    dayData.pools.manualFinalPhase.currentRound = "Finale";
    
    updateManualFinalPhaseDisplay(dayNumber);
    saveToLocalStorage();
    
    showNotification(`🏆 GRANDE FINALE créée ! ${finalistes[0].name} vs ${finalistes[1].name}`, 'success');
}

function generatePetiteFinale(dayNumber, division) {
    const dayData = championship.days[dayNumber];
    const demiFinales = dayData.pools.manualFinalPhase.divisions[division].rounds["Demi-finales"];
    
    if (!demiFinales || !demiFinales.completed) {
        alert('⚠️ Les demi-finales doivent être terminées !');
        return;
    }
    
    // Récupérer les perdants des demi-finales
    const perdants = demiFinales.matches
        .filter(match => match.completed && match.winner)
        .map(match => ({
            name: match.winner === match.player1 ? match.player2 : match.player1,
            seed: match.winner === match.player1 ? match.player2Seed : match.player1Seed
        }));
    
    if (perdants.length !== 2) {
        alert(`❌ Il faut exactement 2 perdants de demi-finale ! (${perdants.length} trouvés)`);
        return;
    }
    
    createManualRound(dayNumber, division, "Petite finale", perdants);
    
    updateManualFinalPhaseDisplay(dayNumber);
    saveToLocalStorage();
    
    showNotification(`🥉 PETITE FINALE créée ! ${perdants[0].name} vs ${perdants[1].name}`, 'info');
}

// ======================================
// PODIUM ET CLASSEMENT FINAL
// ======================================

function generatePodiumHTML(finalPhase) {
    const finale = finalPhase.rounds["Finale"];
    const petiteFinale = finalPhase.rounds["Petite finale"];
    
    if (!finale || !finale.completed) {
        return '';
    }
    
    const finaleMatch = finale.matches[0];
    if (!finaleMatch || !finaleMatch.completed) {
        return '';
    }
    
    const champion = finaleMatch.winner;
    const finaliste = finaleMatch.winner === finaleMatch.player1 ? finaleMatch.player2 : finaleMatch.player1;
    
    let troisieme = null;
    let quatrieme = null;
    
    if (petiteFinale && petiteFinale.completed && petiteFinale.matches[0] && petiteFinale.matches[0].completed) {
        const petiteFinaleMatch = petiteFinale.matches[0];
        troisieme = petiteFinaleMatch.winner;
        quatrieme = petiteFinaleMatch.winner === petiteFinaleMatch.player1 ? 
            petiteFinaleMatch.player2 : petiteFinaleMatch.player1;
    }
    
    return `
        <div class="podium-container" style="
            background: linear-gradient(135deg, #ffd700, #ffed4e);
            border: 3px solid #f39c12;
            border-radius: 20px;
            padding: 30px;
            margin-top: 30px;
            text-align: center;
            box-shadow: 0 10px 30px rgba(243, 156, 18, 0.3);
        ">
            <h3 style="
                color: #b8860b;
                margin: 0 0 25px 0;
                font-size: 1.8rem;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
            ">
                🏆 PODIUM FINAL
            </h3>
            
            <div class="podium" style="
                display: flex;
                justify-content: center;
                align-items: end;
                gap: 20px;
                margin: 25px 0;
            ">
                ${troisieme ? `
                    <div class="podium-place" style="
                        background: linear-gradient(135deg, #cd7f32, #b8722c);
                        color: white;
                        padding: 20px 15px;
                        border-radius: 15px;
                        min-width: 120px;
                        height: 100px;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        box-shadow: 0 5px 15px rgba(205, 127, 50, 0.4);
                    ">
                        <div style="font-size: 2rem; margin-bottom: 5px;">🥉</div>
                        <div style="font-weight: bold; font-size: 16px;">${troisieme}</div>
                        <div style="font-size: 12px; opacity: 0.9;">3ème place</div>
                    </div>
                ` : ''}
                
                <div class="podium-place" style="
                    background: linear-gradient(135deg, #ffd700, #ffed4e);
                    color: #b8860b;
                    padding: 25px 20px;
                    border-radius: 15px;
                    min-width: 140px;
                    height: 140px;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    box-shadow: 0 8px 25px rgba(255, 215, 0, 0.5);
                    transform: scale(1.1);
                ">
                    <div style="font-size: 3rem; margin-bottom: 8px;">🏆</div>
                    <div style="font-weight: bold; font-size: 18px; text-shadow: 1px 1px 2px rgba(0,0,0,0.3);">
                        ${champion}
                    </div>
                    <div style="font-size: 14px; font-weight: bold;">CHAMPION</div>
                </div>
                
                <div class="podium-place" style="
                    background: linear-gradient(135deg, #c0c0c0, #a8a8a8);
                    color: white;
                    padding: 20px 15px;
                    border-radius: 15px;
                    min-width: 120px;
                    height: 120px;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    box-shadow: 0 5px 15px rgba(192, 192, 192, 0.4);
                ">
                    <div style="font-size: 2.5rem; margin-bottom: 5px;">🥈</div>
                    <div style="font-weight: bold; font-size: 16px;">${finaliste}</div>
                    <div style="font-size: 12px; opacity: 0.9;">Finaliste</div>
                </div>
            </div>
            
            ${quatrieme ? `
                <div style="
                    background: rgba(255, 255, 255, 0.8);
                    padding: 10px 20px;
                    border-radius: 10px;
                    margin-top: 15px;
                    color: #6c757d;
                ">
                    <strong>4ème place :</strong> ${quatrieme}
                </div>
            ` : ''}
            
            <div style="
                margin-top: 20px;
                font-size: 14px;
                color: #856404;
                font-style: italic;
            ">
                🎉 Félicitations à tous les participants ! 🎉
            </div>
        </div>
    `;
}

// ======================================
// FONCTIONS D'EXPORT ET UTILITAIRES
// ======================================

function exportManualFinalResults(dayNumber) {
    const dayData = championship.days[dayNumber];
    if (!dayData.pools || !dayData.pools.manualFinalPhase || !dayData.pools.manualFinalPhase.enabled) {
        alert('Aucune phase finale manuelle à exporter !');
        return;
    }
    
    const exportData = {
        version: "2.0",
        exportDate: new Date().toISOString(),
        exportType: "manual_final_phase_results",
        dayNumber: dayNumber,
        results: {}
    };

    const numDivisions = championship.config?.numberOfDivisions || 3;
    for (let division = 1; division <= numDivisions; division++) {
        const finalPhase = dayData.pools.manualFinalPhase.divisions[division];
        
        if (Object.keys(finalPhase.rounds).length > 0) {
            exportData.results[division] = {
                qualified: finalPhase.qualified,
                rounds: finalPhase.rounds,
                champion: getChampionFromFinalPhase(finalPhase),
                podium: getPodiumFromFinalPhase(finalPhase)
            };
        }
    }
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `resultats_phase_finale_manuelle_J${dayNumber}_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification(`Résultats phase finale manuelle J${dayNumber} exportés !`, 'success');
}

function getChampionFromFinalPhase(finalPhase) {
    const finale = finalPhase.rounds["Finale"];
    if (finale && finale.completed && finale.matches[0] && finale.matches[0].completed) {
        return finale.matches[0].winner;
    }
    return null;
}

function getPodiumFromFinalPhase(finalPhase) {
    const finale = finalPhase.rounds["Finale"];
    const petiteFinale = finalPhase.rounds["Petite finale"];
    
    if (!finale || !finale.completed || !finale.matches[0] || !finale.matches[0].completed) {
        return null;
    }
    
    const finaleMatch = finale.matches[0];
    const podium = {
        champion: finaleMatch.winner,
        finaliste: finaleMatch.winner === finaleMatch.player1 ? finaleMatch.player2 : finaleMatch.player1,
        troisieme: null,
        quatrieme: null
    };
    
    if (petiteFinale && petiteFinale.completed && petiteFinale.matches[0] && petiteFinale.matches[0].completed) {
        const petiteFinaleMatch = petiteFinale.matches[0];
        podium.troisieme = petiteFinaleMatch.winner;
        podium.quatrieme = petiteFinaleMatch.winner === petiteFinaleMatch.player1 ? 
            petiteFinaleMatch.player2 : petiteFinaleMatch.player1;
    }
    
    return podium;
}

// ======================================
// DÉTERMINATION DE L'ÉTAPE FINALE D'UN JOUEUR
// ======================================

/**
 * Détermine l'étape finale atteinte par un joueur pour une journée donnée
 * Retourne un objet avec:
 * - stageWeight: poids pour le tri (plus c'est élevé, meilleure est la performance)
 * - stageLabel: label textuel de l'étape
 * - position: position finale (1 = champion, 2 = finaliste, etc.)
 */
function getPlayerFinalStageForDay(playerName, dayNumber, division) {
    const dayData = championship.days[dayNumber];

    // Si pas de mode pool activé, retourner null (pas d'étape)
    if (!dayData || !dayData.pools || !dayData.pools.enabled) {
        return null;
    }

    const divisionPools = dayData.pools.divisions[division];
    if (!divisionPools) {
        return null;
    }

    // Vérifier si le joueur est dans cette division
    const players = (dayData.players[division] || []).map(p => getPlayerName(p));
    if (!players.includes(playerName)) {
        return null;
    }

    // Vérifier si le joueur a été qualifié pour la phase finale
    const manualFinalPhase = dayData.pools.manualFinalPhase;
    const isQualified = manualFinalPhase &&
                        manualFinalPhase.enabled &&
                        manualFinalPhase.divisions[division] &&
                        manualFinalPhase.divisions[division].qualified &&
                        manualFinalPhase.divisions[division].qualified.some(q => q.name === playerName);

    if (!isQualified) {
        // Joueur éliminé en phase de poules
        return {
            stageWeight: 10,
            stageLabel: 'Pool',
            position: 99
        };
    }

    // Joueur qualifié - déterminer à quelle étape il a été éliminé
    const finalPhase = manualFinalPhase.divisions[division];
    const rounds = finalPhase.rounds || {};

    // Ordre des rounds du moins avancé au plus avancé
    const roundsOrder = ["16èmes", "8èmes", "Quarts", "Demi-finales", "Petite finale", "Finale"];
    const roundWeights = {
        "16èmes": 40,
        "8èmes": 50,
        "Quarts": 60,
        "Demi-finales": 70,
        "Petite finale": 75,
        "Finale": 90
    };
    const roundPositions = {
        "16èmes": 17,      // 17-32
        "8èmes": 9,        // 9-16
        "Quarts": 5,       // 5-8
        "Demi-finales": 3, // 3-4 (avant petite finale)
        "Petite finale": 3, // 3-4
        "Finale": 2        // 1-2
    };

    let lastRoundPlayed = null;
    let isWinner = false;
    let lostInRound = null;

    // Parcourir les rounds pour trouver où le joueur a été éliminé
    for (const roundName of roundsOrder) {
        if (!rounds[roundName]) continue;

        const roundMatches = rounds[roundName].matches || [];
        for (const match of roundMatches) {
            if (match.player1 === playerName || match.player2 === playerName) {
                lastRoundPlayed = roundName;

                if (match.completed && match.winner) {
                    if (match.winner === playerName) {
                        isWinner = true;
                    } else {
                        // Joueur a perdu dans ce round
                        lostInRound = roundName;
                    }
                }
            }
        }
    }

    // Déterminer l'étape finale
    if (lostInRound === "Finale") {
        // Finaliste
        return {
            stageWeight: 90,
            stageLabel: 'Finaliste',
            position: 2
        };
    }

    if (lostInRound === "Petite finale") {
        // 4ème place
        return {
            stageWeight: 75,
            stageLabel: '4ème',
            position: 4
        };
    }

    // Vérifier si le joueur a gagné la petite finale (3ème)
    if (rounds["Petite finale"]) {
        const petiteFinaleMatches = rounds["Petite finale"].matches || [];
        for (const match of petiteFinaleMatches) {
            if (match.completed && match.winner === playerName) {
                return {
                    stageWeight: 80,
                    stageLabel: '3ème',
                    position: 3
                };
            }
        }
    }

    // Vérifier si le joueur a gagné la finale (Champion)
    if (rounds["Finale"]) {
        const finaleMatches = rounds["Finale"].matches || [];
        for (const match of finaleMatches) {
            if (match.completed && match.winner === playerName) {
                return {
                    stageWeight: 100,
                    stageLabel: 'Champion',
                    position: 1
                };
            }
        }
    }

    if (lostInRound === "Demi-finales") {
        // Perdant de demi-finale (3-4ème, en attendant petite finale)
        return {
            stageWeight: 70,
            stageLabel: 'Demi',
            position: 3
        };
    }

    if (lostInRound === "Quarts") {
        return {
            stageWeight: 60,
            stageLabel: 'Quart',
            position: 5
        };
    }

    if (lostInRound === "8èmes") {
        return {
            stageWeight: 50,
            stageLabel: '8ème',
            position: 9
        };
    }

    if (lostInRound === "16èmes") {
        return {
            stageWeight: 40,
            stageLabel: '16ème',
            position: 17
        };
    }

    // Joueur qualifié mais phase finale non terminée
    if (lastRoundPlayed) {
        return {
            stageWeight: roundWeights[lastRoundPlayed] || 30,
            stageLabel: 'En cours',
            position: roundPositions[lastRoundPlayed] || 10
        };
    }

    // Qualifié mais pas encore joué
    return {
        stageWeight: 30,
        stageLabel: 'Qualifié',
        position: 10
    };
}

/**
 * Récupère la meilleure étape atteinte par un joueur sur toutes les journées
 */
function getBestPlayerStage(playerName, division) {
    let bestStage = null;

    Object.keys(championship.days).forEach(dayNumber => {
        const dayNum = parseInt(dayNumber);
        const stage = getPlayerFinalStageForDay(playerName, dayNum, division);

        if (stage) {
            if (!bestStage || stage.stageWeight > bestStage.stageWeight) {
                bestStage = { ...stage, dayNumber: dayNum };
            }
        }
    });

    return bestStage;
}

function resetManualFinalPhase(dayNumber) {
    if (!confirm('⚠️ Supprimer toute la phase finale manuelle ?\n\nCela supprimera tous les matchs et résultats, mais conservera les poules.')) {
        return;
    }

    const numDivisions = championship.config?.numberOfDivisions || 3;
    const dayData = championship.days[dayNumber];
    if (dayData.pools && dayData.pools.manualFinalPhase) {
        dayData.pools.manualFinalPhase.enabled = false;
        dayData.pools.manualFinalPhase.currentRound = null;

        for (let division = 1; division <= numDivisions; division++) {
            dayData.pools.manualFinalPhase.divisions[division] = {
                qualified: [],
                rounds: {},
                champion: null,
                runnerUp: null,
                third: null,
                fourth: null
            };
        }
    }

    // Supprimer l'affichage
    for (let division = 1; division <= numDivisions; division++) {
        const container = document.getElementById(`division${dayNumber}-${division}-matches`);
        if (container) {
            const finalPhaseContainer = container.querySelector('.manual-final-phase-container');
            if (finalPhaseContainer) {
                finalPhaseContainer.remove();
            }
        }
    }
    
    saveToLocalStorage();
    showNotification('Phase finale manuelle réinitialisée', 'warning');
}

// ======================================
// INTÉGRATION AVEC LE SYSTÈME EXISTANT
// ======================================

// Remplacer la fonction generateFinalPhase existante
window.generateFinalPhase = generateManualFinalPhase;
window.updateManualMatchScore = updateManualMatchScore;
window.handleManualMatchEnter = handleManualMatchEnter;
window.generateNextManualRound = generateNextManualRound;
window.generateFinale = generateFinale;
window.generatePetiteFinale = generatePetiteFinale;
window.exportManualFinalResults = exportManualFinalResults;
window.resetManualFinalPhase = resetManualFinalPhase;

// Améliorer le bouton phase finale
const originalCheckPoolsCompletion = window.checkPoolsCompletion;
if (originalCheckPoolsCompletion) {
    window.checkPoolsCompletion = function(dayNumber) {
        const result = originalCheckPoolsCompletion(dayNumber);
        
        const finalButton = document.getElementById(`final-phase-btn-${dayNumber}`);
        if (finalButton && result) {
            const dayData = championship.days[dayNumber];
            if (dayData.pools && dayData.pools.manualFinalPhase && dayData.pools.manualFinalPhase.enabled) {
                finalButton.innerHTML = '🔄 Gérer Phase Finale';
                finalButton.style.background = 'linear-gradient(135deg, #16a085, #1abc9c)';
                finalButton.onclick = () => updateManualFinalPhaseDisplay(dayNumber);
            } else {
                finalButton.innerHTML = '🏆 Phase Finale Manuelle';
                finalButton.style.background = 'linear-gradient(135deg, #f39c12, #e67e22)';
            }
        }
        
        return result;
    };
}

// Hook pour l'initialisation
const originalInitializePoolsForDay = window.initializePoolsForDay;
if (originalInitializePoolsForDay) {
    window.initializePoolsForDay = function(dayNumber) {
        originalInitializePoolsForDay(dayNumber);
        
        // Initialiser les phases finales manuelles si elles existent
        const dayData = championship.days[dayNumber];
        if (dayData.pools && dayData.pools.manualFinalPhase && dayData.pools.manualFinalPhase.enabled) {
            initializeManualFinalPhase(dayNumber);
            updateManualFinalPhaseDisplay(dayNumber);
        }
    };
}

// ======================================
// CORRECTIF - SUPPRESSION SPINNERS ET AGRANDISSEMENT CHAMPS
// ======================================

// Ajouter ce CSS pour supprimer les spinners et agrandir les champs
function addScoreInputStyles() {
    // Vérifier si le style n'existe pas déjà
    if (document.getElementById('score-input-styles')) {
        return;
    }
    
    const style = document.createElement('style');
    style.id = 'score-input-styles';
    style.textContent = `
        /* Supprimer les spinners des inputs number */
        input[type="number"]::-webkit-outer-spin-button,
        input[type="number"]::-webkit-inner-spin-button {
            -webkit-appearance: none !important;
            margin: 0 !important;
        }
        
        input[type="number"] {
            -moz-appearance: textfield !important;
        }
        
        /* Agrandir les champs de score dans les phases finales */
        .manual-match input[type="number"] {
            width: 45px !important;
            height: 35px !important;
            font-size: 15px !important;
            font-weight: bold !important;
            text-align: center !important;
            padding: 8px 4px !important;
            border: 2px solid #007bff !important;
            border-radius: 6px !important;
            background: white !important;
        }
        
        .manual-match input[type="number"]:focus {
            border-color: #0056b3 !important;
            box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.25) !important;
            outline: none !important;
        }
        
        /* Améliorer aussi la lisibilité du séparateur */
        .manual-match .sets span {
            font-size: 16px !important;
            font-weight: bold !important;
            color: #495057 !important;
            margin: 0 2px !important;
        }
        
        /* Espacement des sets */
        .manual-match .sets > div {
            padding: 10px 8px !important;
        }
    `;

    document.head.appendChild(style);
}

// Fonction pour mettre à jour le HTML de génération des matchs avec de plus gros champs
function generateManualMatchHTMLImproved(dayNumber, division, match, roundName) {
    const isCompleted = match.completed;
    const isActive = !match.isBye;
    
    return `
        <div class="manual-match" style="
            background: ${isCompleted ? '#d5f4e6' : isActive ? 'white' : '#f8f9fa'};
            border: 2px solid ${isCompleted ? '#28a745' : isActive ? '#007bff' : '#6c757d'};
            border-radius: 10px;
            padding: 15px;
            ${match.isBye ? 'opacity: 0.7;' : ''}
        ">
            <div class="match-header" style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
            ">
                <div class="match-title" style="
                    font-size: 13px;
                    color: #6c757d;
                    font-weight: bold;
                ">
                    Match ${match.position}
                </div>
                <div class="match-status" style="
                    font-size: 12px;
                    padding: 4px 10px;
                    border-radius: 15px;
                    font-weight: bold;
                    background: ${isCompleted ? '#d4edda' : isActive ? '#cce5ff' : '#e2e3e5'};
                    color: ${isCompleted ? '#155724' : isActive ? '#004085' : '#6c757d'};
                ">
                    ${isCompleted ? 'Terminé ✅' : match.isBye ? 'Qualifié ⚡' : 'En cours 🎯'}
                </div>
            </div>
            
            <div class="players" style="
                font-weight: bold;
                color: #2c3e50;
                margin-bottom: ${match.isBye ? '0' : '18px'};
                font-size: 16px;
                text-align: center;
            ">
                ${match.player1Seed ? `#${match.player1Seed}` : ''} ${match.player1}
                ${!match.isBye ? ` VS ${match.player2Seed ? `#${match.player2Seed}` : ''} ${match.player2}` : ''}
            </div>
            
            ${match.isBye ? `
                <div style="
                    text-align: center;
                    color: #28a745;
                    font-style: italic;
                    padding: 10px;
                ">
                    Qualifié automatiquement
                </div>
            ` : `
                <div class="score-container" style="
                    margin-bottom: 15px;
                    padding: 15px;
                    background: #f8f9fa;
                    border: 1px solid #dee2e6;
                    border-radius: 8px;
                ">
                    ${window.showForfaitButtons ? 
                        `<input type="text" value="${match.player1}" 
                                onchange="editFinalMatchPlayerName(${dayNumber}, ${division}, '${match.id}', 'player1', this.value)"
                                style="flex: 1; min-width: 80px; padding: 6px 10px; font-size: 14px; border: 1px solid #3498db; border-radius: 4px; background: white;">`
                        : `<span class="player-name-left">${match.player1}</span>`}
                    <div class="score-center">
                        <input type="number"
                               value="${match.score1 === null || match.score1 === undefined ? '' : match.score1}"
                               placeholder="0"
                               min="0"
                               max="30"
                               onchange="updateManualMatchScore('${match.id}', 'score1', this.value, ${dayNumber})"
                               onkeydown="handleManualMatchEnter(event, '${match.id}', ${dayNumber})"
                               style="
                                   width: 55px;
                                   height: 45px;
                                   text-align: center;
                                   border: 2px solid #007bff;
                                   border-radius: 8px;
                                   font-size: 18px;
                                   font-weight: bold;
                                   background: white;
                                   padding: 8px 4px;
                               ">
                        <span style="color: #495057; font-weight: bold; font-size: 16px;">-</span>
                        <input type="number"
                               value="${match.score2 === null || match.score2 === undefined ? '' : match.score2}"
                               placeholder="0"
                               min="0"
                               max="30"
                               onchange="updateManualMatchScore('${match.id}', 'score2', this.value, ${dayNumber})"
                               onkeydown="handleManualMatchEnter(event, '${match.id}', ${dayNumber})"
                               style="
                                   width: 55px;
                                   height: 45px;
                                   text-align: center;
                                   border: 2px solid #007bff;
                                   border-radius: 8px;
                                   font-size: 18px;
                                   font-weight: bold;
                                   background: white;
                                   padding: 8px 4px;
                               ">
                    </div>
                    ${window.showForfaitButtons ? 
                        `<input type="text" value="${match.player2}" 
                                onchange="editFinalMatchPlayerName(${dayNumber}, ${division}, '${match.id}', 'player2', this.value)"
                                style="flex: 1; min-width: 80px; padding: 6px 10px; font-size: 14px; border: 1px solid #3498db; border-radius: 4px; background: white;">`
                        : `<span class="player-name-right">${match.player2}</span>`}
                </div>
                
                <div class="match-result" style="
                    text-align: center;
                    padding: 10px;
                    border-radius: 6px;
                    font-weight: bold;
                    background: ${isCompleted ? '#d4edda' : '#fff3cd'};
                    color: ${isCompleted ? '#155724' : '#856404'};
                    font-size: 14px;
                ">
                    ${isCompleted && match.winner ? `🏆 ${match.winner} gagne` : 'En attente des scores'}
                </div>
            `}
        </div>
    `;
}

// Remplacer la fonction existante
window.generateManualMatchHTML = generateManualMatchHTMLImproved;

// Exposer les fonctions d'étape finale pour le classement
global.getPlayerFinalStageForDay = getPlayerFinalStageForDay;
global.getBestPlayerStage = getBestPlayerStage;

// Exposer la fonction d'initialisation des poules
global.initializePoolSystem = initializePoolSystem;

// Exposer les fonctions de toggle des hubs
global.toggleDayHub = toggleDayHub;
global.toggleGeneralHub = toggleGeneralHub;
global.togglePoolSection = togglePoolSection;
global.togglePoolMode = togglePoolMode;
global.togglePoolConfigMode = togglePoolConfigMode;
global.saveCollapseState = saveCollapseState;
global.restoreCollapseState = restoreCollapseState;

// Exposer les fonctions de configuration des poules
global.updateSimpleConfigInfo = updateSimpleConfigInfo;
global.updateAdvancedConfigInfo = updateAdvancedConfigInfo;
global.selectPreFillMode = selectPreFillMode;
global.applyPreFillStrategy = applyPreFillStrategy;
global.backToModeSelection = backToModeSelection;
global.closePoolPreFillStrategyModal = closePoolPreFillStrategyModal;
global.preFillFromGeneralRanking = preFillFromGeneralRanking;

// Exposer les fonctions de génération des poules et phases finales
global.generatePools = generatePools;
global.generateFinalPhase = generateFinalPhase;
global.generateDirectFinalPhase = generateDirectFinalPhase;
global.generateSeasonFinalPhase = generateSeasonFinalPhase;
global.updatePoolsDisplay = updatePoolsDisplay;
global.updatePoolMatchScore = updatePoolMatchScore;
global.handlePoolMatchEnter = handlePoolMatchEnter;

// Exposer les fonctions de phase finale manuelle
global.initializePoolsForDay = initializePoolsForDay;
global.initializeManualFinalPhase = initializeManualFinalPhase;
global.updateManualFinalPhaseDisplay = updateManualFinalPhaseDisplay;
global.updateManualMatchScore = updateManualMatchScore;
global.handleManualMatchEnter = handleManualMatchEnter;
global.generateManualFinalPhase = generateManualFinalPhase;
global.generateNextManualRound = generateNextManualRound;
global.resetManualFinalPhase = resetManualFinalPhase;
global.exportManualFinalResults = exportManualFinalResults;
global.showPlayerPoolSummary = showPlayerPoolSummary;
global.closePlayerPoolSummary = closePlayerPoolSummary;

// Appliquer les styles au chargement
addScoreInputStyles();


})(window);
