// ============================================
// MODULE CHRONO - MODE COURSE (IIFE)
// ============================================
(function(global) {
    'use strict';

    // Références aux fonctions utilitaires globales
    var showNotification = global.showNotification;
    var generateId = global.generateId;
    var formatProperName = global.formatProperName;
    var championship = global.championship;
    var saveToLocalStorage = function() { if (typeof global.saveToLocalStorage === 'function') global.saveToLocalStorage(); };

// ============================================
// MODE CHRONO - GESTION DE COURSES MULTIPLES
// ============================================

let raceData = {
    events: [], // Liste de toutes les épreuves (ex: 400m Dames)
    currentEvent: null, // Épreuve actuellement affichée
    editingEventId: null, // ID de l'épreuve en cours d'édition
    nextEventId: 1,
    series: [], // Liste de toutes les séries (DEPRECATED - sera migré vers events[].series)
    currentSerie: null, // Série en cours d'exécution
    editingSerieId: null, // ID de la série en cours d'édition
    nextSerieId: 1,
    participants: [], // Liste des participants du mode chrono (athlètes ou équipes)
    nextParticipantId: 1,
    customFields: [], // Colonnes personnalisées (âge, nationalité, club, etc.)
    nextCustomFieldId: 1
};

window.raceData = raceData;

// SAUVEGARDE DONNÉES CHRONO
function saveChronoToLocalStorage() {
    try {
        localStorage.setItem('chronoRaceData', JSON.stringify(raceData));
    } catch (error) {
        console.warn("Erreur sauvegarde chrono:", error);
    }
}
window.saveChronoToLocalStorage = saveChronoToLocalStorage;

// CHARGEMENT DONNÉES CHRONO
function loadChronoFromLocalStorage() {
    try {
        var saved = localStorage.getItem('chronoRaceData');
        if (saved) {
            var loadedData = JSON.parse(saved);
            raceData.events = loadedData.events || [];
            raceData.series = loadedData.series || [];
            raceData.participants = loadedData.participants || [];
            raceData.nextEventId = loadedData.nextEventId || 1;
            raceData.nextSerieId = loadedData.nextSerieId || 1;
            raceData.nextParticipantId = loadedData.nextParticipantId || 1;
            raceData.customFields = loadedData.customFields || [];
            raceData.nextCustomFieldId = loadedData.nextCustomFieldId || 1;
            return true;
        }
    } catch (error) {
        console.warn("Erreur chargement chrono:", error);
    }
    return false;
}
window.loadChronoFromLocalStorage = loadChronoFromLocalStorage;

// Restaurer les chronos en cours après rechargement de page
function restoreRunningTimers() {
    raceData.series.forEach(function(serie) {
        if (serie.isRunning && serie.startTime) {
            console.log('Restauration du chrono en cours pour:', serie.name);
            serie.currentTime = Date.now() - serie.startTime;
            serie.timerInterval = setInterval(function() {
                serie.currentTime = Date.now() - serie.startTime;
                if (raceData.currentSerie && raceData.currentSerie.id === serie.id) {
                    var display = document.getElementById('mainChronoDisplay');
                    if (display) {
                        display.textContent = formatTime(serie.currentTime || 0);
                    }
                    serie.participants.forEach(function(p) {
                        if (p.status === 'running') {
                            var timeDisplay = document.getElementById('time-' + p.bib);
                            if (timeDisplay) {
                                timeDisplay.textContent = formatTime(serie.currentTime - p.lastLapStartTime + (p.totalTime || 0));
                            }
                        }
                    });
                }
            }, 100);
            if (typeof showNotification === 'function') showNotification('⚠️ Chrono "' + serie.name + '" restauré et en cours!', 'warning');
        }
    });
}
window.restoreRunningTimers = restoreRunningTimers;

// Protection contre le rafraîchissement accidentel
function setupChronoProtection() {
    window.addEventListener('beforeunload', function(e) {
        var hasRunningTimer = raceData.series && raceData.series.some(function(s) { return s.isRunning; });
        if (hasRunningTimer) {
            saveChronoToLocalStorage();
            var message = '⚠️ Un chrono est en cours! Êtes-vous sûr de vouloir quitter?';
            e.preventDefault();
            e.returnValue = message;
            return message;
        }
    });
}
window.setupChronoProtection = setupChronoProtection;

function displayRaceInterface(serie) {
    if (!serie) serie = raceData.currentSerie;
    if (!serie) return;

    const raceInterface = document.getElementById('raceInterface');
    if (!raceInterface) {
        // Le conteneur #raceInterface est injecté dynamiquement dans l'onglet de la
        // journée par startChronoRaceForDay(). S'il est absent, il n'y a nulle part
        // où afficher la course : on évite un crash sur raceInterface.innerHTML.
        console.warn('displayRaceInterface: conteneur #raceInterface introuvable');
        return;
    }
    var eventsListEl = document.getElementById('eventsList');
    var eventsList = eventsListEl ? eventsListEl.parentElement : null;

    if (eventsList) eventsList.style.display = 'none';
    raceInterface.style.display = 'block';

    const sportEmoji = {
        running: '🏃',
        cycling: '🚴',
        swimming: '🏊'
    };

    let html = `
        <div style="background: white; padding: 20px; border-radius: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 15px;">
                <div>
                    <h3 style="margin: 0;">
                        ${sportEmoji[serie.sportType]} ${serie.name}
                    </h3>
                    <p style="color: #7f8c8d; margin: 5px 0 0 0;">
                        Distance: ${serie.distance}m | ${serie.raceType === 'relay' ? `Relais ${serie.relayDuration} min` : 'Course individuelle'}
                    </p>
                </div>
                <div style="text-align: right;">
                    <div id="mainChronoDisplay" style="font-size: 48px; font-weight: bold; color: #2c3e50; font-family: monospace;">
                        ${formatTime(serie.currentTime || 0)}
                    </div>
                    <button id="startStopBtn" class="btn ${serie.isRunning ? 'btn-warning' : 'btn-success'}" onclick="toggleRaceTimer()" style="font-size: 18px; padding: 12px 30px;">
                        ${serie.isRunning ? '⏸️ Pause' : '▶️ Démarrer'}
                    </button>
                </div>
            </div>

            <!-- Mode Couloirs (visible si laneMode activé et course lancée) -->
            ${serie.laneMode && serie.isRunning ? `
                <div style="background: linear-gradient(135deg, #2980b9, #3498db); padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                    <div style="text-align: center; margin-bottom: 15px;">
                        <h4 style="color: white; margin: 0 0 8px 0; font-size: 18px;">🏊 MODE COULOIRS ACTIF</h4>
                        <p style="color: #ecf0f1; margin: 0; font-size: 13px;">Appuyez sur les touches <strong>1-9</strong> du clavier pour arrêter les chronos instantanément</p>
                    </div>
                    <div style="display: flex; flex-wrap: wrap; gap: 10px; justify-content: center;">
                        ${serie.participants
                            .filter(p => p.laneNumber)
                            .sort((a, b) => a.laneNumber - b.laneNumber)
                            .map(p => {
                            const laneNumber = p.laneNumber;
                            const isFinished = p.status === 'finished';
                            const bgColor = isFinished ? '#27ae60' : '#e74c3c';
                            const statusIcon = isFinished ? '✅' : '🏃';
                            return `
                                <div id="lane-${laneNumber}"
                                     onclick="finishLane(${laneNumber})"
                                     style="background: ${bgColor}; color: white; padding: 15px 20px; border-radius: 10px; cursor: ${isFinished ? 'default' : 'pointer'}; min-width: 120px; text-align: center; transition: transform 0.1s, background 0.2s; ${!isFinished ? 'box-shadow: 0 4px 15px rgba(231, 76, 60, 0.4);' : ''}">
                                    <div style="font-size: 36px; font-weight: bold; line-height: 1;">${laneNumber}</div>
                                    <div style="font-size: 12px; margin-top: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100px;">${p.name}</div>
                                    <div style="font-size: 11px; opacity: 0.9;">${p.bib}</div>
                                    <div style="font-size: 18px; margin-top: 5px;">${statusIcon}</div>
                                    ${isFinished ? `<div style="font-size: 11px; font-family: monospace; margin-top: 3px;">${formatTime(p.finishTime || p.totalTime)}</div>` : ''}
                                </div>
                            `;
                        }).join('')}
                    </div>
                    <div style="text-align: center; margin-top: 15px;">
                        <span style="color: #ecf0f1; font-size: 12px; background: rgba(0,0,0,0.2); padding: 5px 15px; border-radius: 15px;">
                            Clavier: touches des couloirs assignés | Clic: sur le couloir
                        </span>
                    </div>
                </div>
            ` : ''}

            <!-- Saisie rapide dossard (visible uniquement si course lancée ET pas en mode couloirs) -->
            ${serie.isRunning && !serie.laneMode ? `
                <div style="background: linear-gradient(135deg, #16a085, #1abc9c); padding: 15px; border-radius: 10px; margin-bottom: 20px;">
                    <div style="display: flex; align-items: center; gap: 15px; flex-wrap: wrap;">
                        <label style="color: white; font-weight: bold; font-size: 16px;">⚡ Saisie Rapide:</label>
                        <input
                            type="text"
                            id="quickFinishInput"
                            placeholder="Dossard + Enter (ou L+Dossard pour LAP)"
                            style="padding: 12px; border-radius: 8px; border: 3px solid white; font-size: 18px; font-weight: bold; width: 350px; text-align: center;"
                            onkeypress="if(event.key === 'Enter') quickAction()"
                        >
                        <div style="color: white; font-size: 13px; line-height: 1.5;">
                            ${serie.raceType === 'relay' ? `
                                <div style="margin-bottom: 8px; background: rgba(255,255,255,0.2); padding: 8px; border-radius: 5px;">
                                    <strong>🤖 MODE RELAIS - DÉTECTION AUTOMATIQUE</strong>
                                </div>
                                <div>⏱️ <strong>Dossard + Enter</strong> = LAP (si temps &lt; ${serie.relayDuration} min)</div>
                                <div>🏁 <strong>Dossard + Enter</strong> = FINISH (si temps ≥ ${serie.relayDuration} min)</div>
                                <div style="margin-top: 5px; opacity: 0.8; font-size: 11px;">💡 Plus besoin de taper "L" !</div>
                            ` : `
                                <div>✅ <strong>Dossard + Enter</strong> = FINISH</div>
                                <div>⏱️ <strong>L + Dossard + Enter</strong> = LAP</div>
                            `}
                        </div>
                    </div>
                </div>
            ` : ''}

            <div style="margin-bottom: 20px;">
                <button class="btn" onclick="backToSeriesList()" style="background: #95a5a6; margin-right: 10px;">
                    ⬅️ Retour aux séries
                </button>
                <button class="btn" onclick="showRaceRanking()" style="background: linear-gradient(135deg, #16a085, #1abc9c); margin-right: 10px;">
                    🏆 Voir Classement
                </button>
                <button class="btn" onclick="openLiveRaceDisplayWindow()" style="background: linear-gradient(135deg, #9b59b6, #8e44ad); margin-right: 10px;">
                    🖥️ Afficher
                </button>
                <button class="btn btn-danger" onclick="endSerie()">
                    🏁 Terminer la Série
                </button>
            </div>

            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; background: white;">
                    <thead>
                        <tr style="background: linear-gradient(135deg, #16a085, #1abc9c); color: white;">
                            <th style="padding: 12px; text-align: center;">Dossard</th>
                            <th style="padding: 12px; text-align: left;">Participant</th>
                            <th style="padding: 12px; text-align: left;">Club</th>
                            <th style="padding: 12px; text-align: center;">Tours</th>
                            <th style="padding: 12px; text-align: center;">Distance</th>
                            <th style="padding: 12px; text-align: center;">Temps Total</th>
                            <th style="padding: 12px; text-align: center;">Meilleur Tour</th>
                            <th style="padding: 12px; text-align: center;">Statut</th>
                            <th style="padding: 12px; text-align: center;">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="participantsTableBody">
                        ${generateParticipantsRows(serie)}
                    </tbody>
                </table>
            </div>

            <div id="raceRankingSection" style="display: none; margin-top: 30px;">
                <!-- Classement sera affiché ici -->
            </div>
        </div>
    `;

    raceInterface.innerHTML = html;
}
// Exposer pour les autres modules (ex. startChronoRaceForDay dans ui.iife.js)
window.displayRaceInterface = displayRaceInterface;

// Retour à la liste des épreuves
window.finishLane = function(laneNumber) {
    const serie = raceData.currentSerie;
    if (!serie || !serie.laneMode || !serie.isRunning) return;

    // Vérifier que le numéro de couloir est valide (1-9)
    if (laneNumber < 1 || laneNumber > 9) {
        return;
    }

    // Récupérer le participant assigné à ce couloir
    const participant = serie.participants.find(p => p.laneNumber === laneNumber);
    if (!participant) {
        // Aucun participant assigné à ce couloir
        return;
    }

    // Vérifier si le participant n'a pas déjà terminé
    if (participant.status === 'finished') {
        showNotification(`Couloir ${laneNumber} (${participant.name}) a déjà terminé!`, 'warning');
        return;
    }

    // Arrêter le chrono pour ce participant
    const currentTime = serie.currentTime;

    // Si le participant était en attente, le démarrer d'abord
    if (participant.status === 'ready') {
        participant.status = 'running';
        participant.lastLapStartTime = 0;
    }

    // Initialiser les valeurs si elles sont null/undefined
    if (participant.totalTime == null) participant.totalTime = 0;
    if (participant.totalDistance == null) participant.totalDistance = 0;
    if (!participant.laps) participant.laps = [];
    if (participant.lastLapStartTime == null) participant.lastLapStartTime = 0;

    // Calculer le temps du dernier tour
    const lapTime = currentTime - participant.lastLapStartTime;

    participant.laps.push({
        lapNumber: participant.laps.length + 1,
        time: lapTime,
        timestamp: currentTime
    });

    participant.totalTime = (participant.totalTime || 0) + lapTime;
    participant.totalDistance = (participant.totalDistance || 0) + serie.distance;

    if (!participant.bestLap || lapTime < participant.bestLap) {
        participant.bestLap = lapTime;
    }

    participant.status = 'finished';
    participant.finishTime = currentTime;

    // Mettre à jour l'affichage du couloir
    updateLaneDisplay(laneNumber, participant, currentTime);

    // Mettre à jour la ligne du participant dans le tableau
    updateParticipantRow(participant);

    showNotification(`Couloir ${laneNumber} - ${participant.name}: ${formatTime(currentTime)}`, 'success');
    saveChronoToLocalStorage();

    // Si tous les couloirs ont terminé, arrêter aussi le chrono général de la série
    const allFinished = serie.participants.every(p => p.status === 'finished');
    if (allFinished) {
        if (serie.isRunning) {
            toggleRaceTimer(); // arrête le chrono général (fige le temps affiché)
        }
        saveChronoToLocalStorage();
        showNotification('Tous les couloirs ont terminé! 🎉', 'success');
    }
};

// Mettre à jour l'affichage d'un couloir après finish
function updateLaneDisplay(laneNumber, participant, finishTime) {
    const laneElement = document.getElementById(`lane-${laneNumber}`);
    if (!laneElement) return;

    laneElement.style.background = '#27ae60';
    laneElement.style.cursor = 'default';
    laneElement.style.boxShadow = 'none';

    // Mettre à jour le contenu
    laneElement.innerHTML = `
        <div style="font-size: 36px; font-weight: bold; line-height: 1;">${laneNumber}</div>
        <div style="font-size: 12px; margin-top: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100px;">${participant.name}</div>
        <div style="font-size: 11px; opacity: 0.9;">${participant.bib}</div>
        <div style="font-size: 18px; margin-top: 5px;">✅</div>
        <div style="font-size: 11px; font-family: monospace; margin-top: 3px;">${formatTime(finishTime)}</div>
    `;
}

// Vérifier si tous les participants ont terminé
function checkAllFinished() {
    const serie = raceData.currentSerie;
    if (!serie) return;

    const allFinished = serie.participants.every(p => p.status === 'finished');
    if (allFinished) {
        showNotification('Tous les participants ont terminé!', 'success');
    }
}

// Ajouter l'écouteur clavier pour le mode couloirs
function addLaneModeKeyListener() {
    if (laneModeKeyHandler) return; // Déjà actif

    laneModeKeyHandler = function(event) {
        const serie = raceData.currentSerie;
        if (!serie || !serie.laneMode || !serie.isRunning) return;

        // Ignorer si on est dans un champ de saisie
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;

        // Vérifier si c'est une touche 1-9
        const key = event.key;
        if (key >= '1' && key <= '9') {
            const laneNumber = parseInt(key);
            // Vérifier si un participant est assigné à ce couloir
            const hasParticipant = serie.participants.some(p => p.laneNumber === laneNumber);
            if (hasParticipant) {
                event.preventDefault();
                finishLane(laneNumber);
            }
        }
    };

    document.addEventListener('keydown', laneModeKeyHandler);
}

// Retirer l'écouteur clavier du mode couloirs
function removeLaneModeKeyListener() {
    if (laneModeKeyHandler) {
        document.removeEventListener('keydown', laneModeKeyHandler);
        laneModeKeyHandler = null;
    }
}

// Terminer la série
window.endSerie = function() {
    if (!raceData.currentSerie) return;

    if (!confirm('Voulez-vous vraiment terminer cette série? Elle ne pourra plus être modifiée.')) return;

    if (raceData.currentSerie.isRunning) {
        clearInterval(raceData.currentSerie.timerInterval);
    }

    raceData.currentSerie.status = 'completed';
    raceData.currentSerie.isRunning = false;
    raceData.currentSerie.endTime = new Date().toISOString();

    // Sauvegarder les résultats vers le stockage par jour (si course lancée depuis un jour)
    if (typeof saveRaceResultsToDay === 'function') {
        saveRaceResultsToDay();
    }

    saveChronoToLocalStorage();
    showNotification('Série terminée!', 'success');
    
    // Retourner à la liste des séries (qui gèrera le retour à la journée si nécessaire)
    backToSeriesList();
};

// Statuts qui sortent le participant de la course (non partant / disqualifié) :
// exclus du classement au chrono, affichés à part et à la fin.
function isOutOfRaceStatus(status) {
    return status === 'dns' || status === 'disq';
}

// Libellé court affiché pour ces statuts (position dans le classement, badge...)
function outOfRaceLabel(status) {
    return status === 'disq' ? 'DISQ' : 'DNS';
}

// Générer les lignes de participants
function generateParticipantsRows(serie) {
    if (!serie) serie = raceData.currentSerie;
    if (!serie) return '';

    return serie.participants.map(p => {
        const statusColor = {
            ready: '#95a5a6',
            running: '#3498db',
            finished: '#27ae60',
            dns: '#e74c3c',
            disq: '#8e44ad'
        };

        const statusText = {
            ready: '⏸️ Prêt',
            running: '▶️ En course',
            finished: '🏁 Terminé',
            dns: '🚫 DNS',
            disq: '⛔ DISQ'
        };

        return `
            <tr id="participant-${p.bib}" style="border-bottom: 1px solid #ecf0f1;">
                <td style="padding: 12px; text-align: center; font-weight: bold; font-size: 20px; color: ${statusColor[p.status]};">
                    #${p.bib}
                </td>
                <td style="padding: 12px;">
                    <div style="font-weight: bold;">${p.name}</div>
                    <div style="font-size: 12px; color: #7f8c8d;">${p.category || 'Division ' + (p.division || '-')}</div>
                </td>
                <td style="padding: 12px;">
                    <div style="font-weight: bold; color: #16a085;">${p.club || '-'}</div>
                </td>
                <td style="padding: 12px; text-align: center; font-weight: bold; font-size: 18px;">
                    ${(p.laps || []).length}
                </td>
                <td style="padding: 12px; text-align: center; font-weight: bold;">
                    ${((p.totalDistance || 0) / 1000).toFixed(2)} km
                </td>
                <td id="time-${p.bib}" style="padding: 12px; text-align: center; font-family: monospace; font-weight: bold;">
                    ${formatTime(p.totalTime || p.finishTime || 0)}
                </td>
                <td style="padding: 12px; text-align: center; font-family: monospace;">
                    ${p.bestLap ? formatTime(p.bestLap) : (p.finishTime ? formatTime(p.finishTime) : '-')}
                </td>
                <td style="padding: 12px; text-align: center;">
                    <span style="background: ${statusColor[p.status]}; color: white; padding: 5px 10px; border-radius: 5px; font-size: 12px;">
                        ${statusText[p.status]}
                    </span>
                </td>
                <td style="padding: 8px; text-align: center;">
                    ${isOutOfRaceStatus(p.status) ? `
                        <div style="display: flex; gap: 4px; justify-content: center; align-items: center;">
                            <button onclick="${p.status === 'disq' ? 'cancelDISQ' : 'cancelDNS'}('${p.bib}')" style="background: #95a5a6; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;" title="Annuler ${outOfRaceLabel(p.status)}">↩️</button>
                        </div>
                    ` : p.status === 'finished' ? `
                        <div style="display: flex; gap: 4px; justify-content: center; align-items: center;">
                            <button onclick="editParticipantTime('${p.bib}')" style="background: #f39c12; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;" title="Éditer le temps">✏️</button>
                            <button onclick="restartParticipant('${p.bib}')" style="background: #e74c3c; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;" title="Relancer">🔄</button>
                        </div>
                    ` : `
                        <div style="display: flex; gap: 4px; justify-content: center; align-items: center;">
                            <button onclick="recordLap('${p.bib}')" style="background: #3498db; color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold;" title="Enregistrer un tour">LAP</button>
                            <button onclick="finishParticipant('${p.bib}')" style="background: #27ae60; color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold;" title="Terminer">FIN</button>
                            <button onclick="markAsDNS('${p.bib}')" style="background: none; border: 1px solid #ccc; color: #999; padding: 3px 6px; border-radius: 3px; cursor: pointer; font-size: 10px;" title="Non partant">DNS</button>
                            <button onclick="markAsDISQ('${p.bib}')" style="background: none; border: 1px solid #e74c3c; color: #e74c3c; padding: 3px 6px; border-radius: 3px; cursor: pointer; font-size: 10px;" title="Disqualifier">DISQ</button>
                            <button onclick="editParticipantRowInline('${p.bib}')" style="background: #f39c12; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;" title="Éditer tours / distance / temps">✏️</button>
                        </div>
                    `}
                </td>
            </tr>
        `;
    }).join('');
}

// Démarrer/Arrêter le chrono
window.toggleRaceTimer = function() {
    const serie = raceData.currentSerie;
    if (!serie) return;

    const btn = document.getElementById('startStopBtn');

    if (!serie.isRunning) {
        // Démarrer
        serie.isRunning = true;
        serie.startTime = Date.now() - (serie.currentTime || 0);

        // Démarrer tous les participants automatiquement s'ils sont en statut 'ready'
        const currentTime = serie.currentTime;
        serie.participants.forEach(p => {
            if (p.status === 'ready') {
                p.status = 'running';
                p.lastLapStartTime = currentTime;
            }
        });

        serie.timerInterval = setInterval(() => {
            serie.currentTime = Date.now() - serie.startTime;
            updateMainChronoDisplay();
            updateParticipantsTimes();
        }, 100);

        btn.textContent = '⏸️ Pause';
        btn.className = 'btn btn-warning';
        showNotification('Course démarrée! Tous les participants sont lancés!', 'success');

        // Rafraîchir l'affichage de tous les participants
        displayRaceInterface(serie);

        // Activer l'écouteur clavier si mode couloirs
        if (serie.laneMode) {
            addLaneModeKeyListener();
        } else {
            // Focus automatique sur le champ de saisie rapide (mode normal)
            setTimeout(() => {
                const quickInput = document.getElementById('quickFinishInput');
                if (quickInput) quickInput.focus();
            }, 100);
        }

        // Sauvegarder l'état dans le localStorage
        saveChronoToLocalStorage();
    } else {
        // Pause
        serie.isRunning = false;
        clearInterval(serie.timerInterval);

        // Désactiver l'écouteur clavier du mode couloirs
        if (serie.laneMode) {
            removeLaneModeKeyListener();
        }

        btn.textContent = '▶️ Reprendre';
        btn.className = 'btn btn-success';
        showNotification('Course en pause', 'warning');

        // Rafraîchir l'affichage (pour cacher les couloirs pendant la pause)
        displayRaceInterface(serie);

        // Sauvegarder l'état dans le localStorage
        saveChronoToLocalStorage();
    }
};

// Mettre à jour l'affichage du chrono principal
function updateMainChronoDisplay() {
    const serie = raceData.currentSerie;
    if (!serie) return;

    const display = document.getElementById('mainChronoDisplay');
    if (display) {
        display.textContent = formatTime(serie.currentTime || 0);
    }
}

// Mettre à jour les temps des participants en cours
function updateParticipantsTimes() {
    const serie = raceData.currentSerie;
    if (!serie) return;

    serie.participants.forEach(p => {
        if (p.status === 'running') {
            // Ne pas écraser la cellule si sa ligne est en cours d'édition inline
            // (editParticipantRowInline y a placé un <input id="edit-time-...">) :
            // sinon le tick de 100ms efface le champ avant que "Enregistrer" ne s'exécute.
            if (document.getElementById(`edit-time-${p.bib}`)) return;
            const timeDisplay = document.getElementById(`time-${p.bib}`);
            if (timeDisplay) {
                timeDisplay.textContent = formatTime(serie.currentTime - p.lastLapStartTime + p.totalTime);
            }
        }
    });
}

// Enregistrer un tour
window.recordLap = function(bib) {
    const serie = raceData.currentSerie;
    if (!serie) return;

    if (!serie.isRunning) {
        showNotification('Démarrez la course d\'abord!', 'warning');
        return;
    }

    // Comparer en string pour supporter les dossards alphanumériques
    const participant = serie.participants.find(p => String(p.bib) === String(bib));
    if (!participant) return;

    const currentTime = serie.currentTime;

    if (participant.status === 'ready') {
        // Si le participant n'est pas encore démarré (cas rare), le démarrer
        participant.status = 'running';
        participant.lastLapStartTime = currentTime;
        showNotification(`${participant.name} démarré!`, 'info');
    } else if (participant.status === 'running') {
        // Enregistrer le tour : calculer le temps depuis le dernier LAP (ou depuis le départ)
        const lapTime = currentTime - participant.lastLapStartTime;

        participant.laps.push({
            lapNumber: participant.laps.length + 1,
            time: lapTime,
            timestamp: currentTime
        });

        participant.totalTime += lapTime;
        participant.totalDistance += serie.distance;

        // Meilleur tour
        if (!participant.bestLap || lapTime < participant.bestLap) {
            participant.bestLap = lapTime;
        }

        // Réinitialiser le chrono pour le prochain tour
        participant.lastLapStartTime = currentTime;

        showNotification(`${participant.name} - Tour ${participant.laps.length}: ${formatTime(lapTime)}`, 'info');
    }

    // Rafraîchir l'affichage
    updateParticipantRow(participant);
    saveChronoToLocalStorage();
};

// Terminer un participant
window.finishParticipant = function(bib) {
    const serie = raceData.currentSerie;
    if (!serie) return;

    if (!serie.isRunning) {
        showNotification('Démarrez la course d\'abord!', 'warning');
        return;
    }

    // Comparer en string pour supporter les dossards alphanumériques
    const participant = serie.participants.find(p => String(p.bib) === String(bib));
    if (!participant || participant.status === 'finished') return;

    // Initialiser les valeurs si elles sont null/undefined
    if (participant.totalTime == null) participant.totalTime = 0;
    if (participant.totalDistance == null) participant.totalDistance = 0;
    if (!participant.laps) participant.laps = [];
    if (participant.lastLapStartTime == null) participant.lastLapStartTime = 0;

    // Enregistrer le dernier tour si en cours
    if (participant.status === 'running') {
        const lapTime = serie.currentTime - participant.lastLapStartTime;

        participant.laps.push({
            lapNumber: participant.laps.length + 1,
            time: lapTime,
            timestamp: serie.currentTime
        });

        participant.totalTime = (participant.totalTime || 0) + lapTime;
        participant.totalDistance = (participant.totalDistance || 0) + serie.distance;

        if (!participant.bestLap || lapTime < participant.bestLap) {
            participant.bestLap = lapTime;
        }
    }

    participant.status = 'finished';
    participant.finishTime = serie.currentTime;

    showNotification(`${participant.name} a terminé! 🏁`, 'success');

    // Rafraîchir l'affichage
    updateParticipantRow(participant);
    saveChronoToLocalStorage();

    // Vérifier si tous ont terminé
    const allFinished = serie.participants.every(p => p.status === 'finished');
    if (allFinished) {
        toggleRaceTimer(); // Arrêter le chrono
        saveChronoToLocalStorage();
        showNotification('Tous les participants ont terminé! 🎉', 'success');
    }
};

// Relancer un participant (annuler son finish)
window.restartParticipant = function(bib) {
    const serie = raceData.currentSerie;
    if (!serie) return;

    const participant = serie.participants.find(p => String(p.bib) === String(bib));
    if (!participant) return;

    if (!confirm(`Voulez-vous vraiment relancer ${participant.name} ?\n\nCela annulera son temps actuel et le remettra en course.`)) {
        return;
    }

    // Remettre le participant en course
    participant.status = 'running';
    participant.finishTime = null;
    participant.lastLapStartTime = serie.currentTime;

    showNotification(`${participant.name} a été relancé! 🔄`, 'info');
    updateParticipantRow(participant);
};

// Marquer un participant comme DNS (Did Not Start)
window.markAsDNS = function(bib) {
    const serie = raceData.currentSerie;
    if (!serie) return;

    const participant = serie.participants.find(p => String(p.bib) === String(bib));
    if (!participant) return;

    participant.status = 'dns';
    participant.totalTime = 0;
    participant.laps = [];
    participant.totalDistance = 0;

    saveChronoToLocalStorage();
    updateParticipantRow(participant);
    showNotification(`${participant.name} marqué DNS (non partant)`, 'info');
};

// Annuler le DNS d'un participant
window.cancelDNS = function(bib) {
    const serie = raceData.currentSerie;
    if (!serie) return;

    const participant = serie.participants.find(p => String(p.bib) === String(bib));
    if (!participant) return;

    // Remettre en statut 'ready' ou 'running' selon si la course est en cours
    participant.status = serie.isRunning ? 'running' : 'ready';
    if (serie.isRunning) {
        participant.lastLapStartTime = serie.currentTime;
    }

    saveChronoToLocalStorage();
    updateParticipantRow(participant);
    showNotification(`${participant.name} remis en course`, 'success');
};

// Marquer un participant comme disqualifié (DISQ). Contrairement au DNS, on
// conserve ses tours/distance/temps déjà enregistrés (utile pour justifier
// la disqualification a posteriori) — seul le statut change.
window.markAsDISQ = function(bib) {
    const serie = raceData.currentSerie;
    if (!serie) return;

    const participant = serie.participants.find(p => String(p.bib) === String(bib));
    if (!participant) return;

    participant.status = 'disq';

    saveChronoToLocalStorage();
    if (typeof saveRaceResultsToDay === 'function') saveRaceResultsToDay();
    updateParticipantRow(participant);
    showNotification(`${participant.name} disqualifié`, 'warning');
};

// Annuler la disqualification d'un participant
window.cancelDISQ = function(bib) {
    const serie = raceData.currentSerie;
    if (!serie) return;

    const participant = serie.participants.find(p => String(p.bib) === String(bib));
    if (!participant) return;

    // S'il avait déjà un temps d'arrivée (disqualifié après coup depuis le
    // modal d'édition), on le remet "Terminé" plutôt qu'en course.
    if (participant.finishTime) {
        participant.status = 'finished';
    } else {
        participant.status = serie.isRunning ? 'running' : 'ready';
        if (serie.isRunning) {
            participant.lastLapStartTime = serie.currentTime;
        }
    }

    saveChronoToLocalStorage();
    if (typeof saveRaceResultsToDay === 'function') saveRaceResultsToDay();
    updateParticipantRow(participant);
    showNotification(`${participant.name} réintégré`, 'success');
};

// Éditer le temps d'un participant
let editingParticipantBib = null;

window.editParticipantTime = function(bib) {
    const serie = raceData.currentSerie;
    if (!serie) return;

    const participant = serie.participants.find(p => String(p.bib) === String(bib));
    if (!participant) return;

    editingParticipantBib = bib;

    // Afficher les infos du participant
    document.getElementById('editTimeParticipantName').textContent = participant.name;
    document.getElementById('editTimeParticipantBib').textContent = `#${participant.bib}`;
    document.getElementById('editTimeCurrentTime').textContent = formatTime(participant.totalTime);
    document.getElementById('editTimeCurrentLaps').textContent = participant.laps.length;
    document.getElementById('editTimeDistancePerLap').textContent = `${(serie.distance / 1000).toFixed(2)} km`;

    // Remplir le nombre de tours actuel
    document.getElementById('editTimeLaps').value = participant.laps.length;

    // Convertir le temps actuel en heures/minutes/secondes/centièmes
    const totalMs = participant.totalTime;
    const hours = Math.floor(totalMs / 3600000);
    const minutes = Math.floor((totalMs % 3600000) / 60000);
    const seconds = Math.floor((totalMs % 60000) / 1000);
    const centiseconds = Math.floor((totalMs % 1000) / 10);

    document.getElementById('editTimeHours').value = hours;
    document.getElementById('editTimeMinutes').value = minutes;
    document.getElementById('editTimeSeconds').value = seconds;
    document.getElementById('editTimeCentiseconds').value = centiseconds;

    updateTimePreview();

    // Ajouter les listeners pour la prévisualisation en temps réel
    ['editTimeHours', 'editTimeMinutes', 'editTimeSeconds', 'editTimeCentiseconds'].forEach(id => {
        document.getElementById(id).addEventListener('input', updateTimePreview);
    });

    // Ajouter listener pour le nombre de tours
    document.getElementById('editTimeLaps').addEventListener('input', updateDistancePreview);
    updateDistancePreview();

    document.getElementById('editTimeModal').style.display = 'block';
};

function updateTimePreview() {
    const hours = parseInt(document.getElementById('editTimeHours').value) || 0;
    const minutes = parseInt(document.getElementById('editTimeMinutes').value) || 0;
    const seconds = parseInt(document.getElementById('editTimeSeconds').value) || 0;
    const centiseconds = parseInt(document.getElementById('editTimeCentiseconds').value) || 0;

    const totalMs = (hours * 3600000) + (minutes * 60000) + (seconds * 1000) + (centiseconds * 10);
    document.getElementById('editTimePreview').textContent = formatTime(totalMs);
}

function updateDistancePreview() {
    const serie = raceData.currentSerie;
    if (!serie) return;

    const laps = parseInt(document.getElementById('editTimeLaps').value) || 0;
    const totalDistance = (laps * serie.distance) / 1000;
    document.getElementById('editTimeTotalDistance').textContent = `${totalDistance.toFixed(2)} km`;
}

window.closeEditTimeModal = function() {
    document.getElementById('editTimeModal').style.display = 'none';
    editingParticipantBib = null;
};

// Disqualifier le participant depuis le modal d'édition (accessible même
// quand sa course est déjà terminée, pour disqualifier a posteriori).
window.disqualifyFromEditTimeModal = function() {
    if (!editingParticipantBib) return;
    if (!confirm('Disqualifier ce participant ?')) return;

    const bib = editingParticipantBib;
    window.closeEditTimeModal();
    window.markAsDISQ(bib);
};

window.saveEditedTime = function() {
    if (!editingParticipantBib) return;

    const serie = raceData.currentSerie;
    if (!serie) return;

    const participant = serie.participants.find(p => String(p.bib) === String(editingParticipantBib));
    if (!participant) return;

    const hours = parseInt(document.getElementById('editTimeHours').value) || 0;
    const minutes = parseInt(document.getElementById('editTimeMinutes').value) || 0;
    const seconds = parseInt(document.getElementById('editTimeSeconds').value) || 0;
    const centiseconds = parseInt(document.getElementById('editTimeCentiseconds').value) || 0;
    const newLaps = parseInt(document.getElementById('editTimeLaps').value) || 0;

    const newTotalTime = (hours * 3600000) + (minutes * 60000) + (seconds * 1000) + (centiseconds * 10);

    if (newTotalTime <= 0) {
        showNotification('Le temps doit être supérieur à 0', 'error');
        return;
    }

    // Sauvegarder les anciennes valeurs pour l'historique
    const oldTime = participant.totalTime;
    const oldLaps = participant.laps.length;
    const oldDistance = participant.totalDistance;

    // Mettre à jour le temps
    participant.totalTime = newTotalTime;
    participant.finishTime = newTotalTime; // Mettre à jour aussi le finish time

    // Mettre à jour le nombre de tours et la distance
    const newDistance = newLaps * serie.distance;
    participant.totalDistance = newDistance;

    // Recréer les tours avec le nouveau nombre
    if (newLaps > 0) {
        const avgLapTime = newTotalTime / newLaps;
        participant.laps = [];

        for (let i = 0; i < newLaps; i++) {
            participant.laps.push({
                lapNumber: i + 1,
                time: avgLapTime,
                timestamp: avgLapTime * (i + 1)
            });
        }

        // Recalculer le meilleur tour
        participant.bestLap = avgLapTime;
    } else {
        participant.laps = [];
        participant.bestLap = null;
    }

    // Message de notification détaillé
    let message = `Modifications enregistrées:\n`;
    if (oldTime !== newTotalTime) {
        message += `Temps: ${formatTime(oldTime)} → ${formatTime(newTotalTime)}\n`;
    }
    if (oldLaps !== newLaps) {
        message += `Tours: ${oldLaps} → ${newLaps}\n`;
    }
    if (oldDistance !== newDistance) {
        message += `Distance: ${(oldDistance / 1000).toFixed(2)} km → ${(newDistance / 1000).toFixed(2)} km`;
    }

    showNotification(message.trim(), 'success');
    updateParticipantRow(participant);
    closeEditTimeModal();
    saveChronoToLocalStorage();
};

// Saisie rapide pour LAP ou FINISH via dossard
window.quickAction = function() {
    const input = document.getElementById('quickFinishInput');
    if (!input) return;

    const value = input.value.trim().toUpperCase();

    if (!value) {
        input.value = '';
        input.focus();
        return;
    }

    let isLap = false;
    let bibNumber;

    // Vérifier si c'est un LAP (commence par L)
    if (value.startsWith('L')) {
        isLap = true;
        bibNumber = value.substring(1).trim();
    } else {
        bibNumber = value.trim();
    }

    if (!bibNumber) {
        showNotification('Format invalide. Utilisez: Dossard ou L+Dossard', 'warning');
        input.value = '';
        input.focus();
        return;
    }

    const serie = raceData.currentSerie;
    if (!serie) return;

    // Comparer en string pour supporter les dossards alphanumériques
    const participant = serie.participants.find(p => String(p.bib).toUpperCase() === bibNumber.toUpperCase());

    if (!participant) {
        showNotification(`Dossard #${bibNumber} introuvable`, 'error');
        input.value = '';
        input.focus();
        return;
    }

    if (participant.status === 'finished') {
        showNotification(`${participant.name} (#${bibNumber}) a déjà terminé`, 'warning');
        input.value = '';
        input.focus();
        return;
    }

    // LOGIQUE AUTOMATIQUE POUR LES RELAIS
    // Si c'est un relais ET que l'utilisateur n'a pas tapé "L", on détecte automatiquement
    if (serie.raceType === 'relay' && !value.startsWith('L')) {
        const relayDurationMs = serie.relayDuration * 60 * 1000; // Durée du relais en millisecondes
        const currentTime = serie.currentTime;

        // Si le temps actuel est inférieur à la durée du relais → c'est un LAP
        // Si le temps actuel est >= à la durée du relais → c'est un FINISH
        if (currentTime < relayDurationMs) {
            isLap = true;
            showNotification(`⏱️ Détection auto: LAP pour ${participant.name}`, 'info');
        } else {
            isLap = false;
            showNotification(`🏁 Détection auto: FINISH pour ${participant.name}`, 'info');
        }
    }

    // Exécuter l'action
    if (isLap) {
        recordLap(participant.bib);
    } else {
        finishParticipant(participant.bib);
    }

    // Réinitialiser et refocus sur l'input pour saisie suivante
    input.value = '';
    input.focus();
};

// Mettre à jour une ligne de participant
function updateParticipantRow(participant) {
    const row = document.getElementById(`participant-${participant.bib}`);
    if (!row) return;

    const serie = raceData.currentSerie;
    if (!serie) return;

    const statusColor = {
        ready: '#95a5a6',
        running: '#3498db',
        finished: '#27ae60',
        dns: '#e74c3c',
        disq: '#8e44ad'
    };

    const statusText = {
        ready: '⏸️ Prêt',
        running: '▶️ En course',
        finished: '🏁 Terminé',
        dns: '🚫 DNS',
        disq: '⛔ DISQ'
    };

    // Reconstruire la ligne complète du participant
    row.innerHTML = `
        <td style="padding: 12px; text-align: center; font-weight: bold; font-size: 20px; color: ${statusColor[participant.status]};">
            #${participant.bib}
        </td>
        <td style="padding: 12px;">
            <div style="font-weight: bold;">${participant.name}</div>
            <div style="font-size: 12px; color: #7f8c8d;">${participant.category || 'Division ' + (participant.division || '-')}</div>
        </td>
        <td style="padding: 12px;">
            <div style="font-weight: bold; color: #16a085;">${participant.club || '-'}</div>
        </td>
        <td style="padding: 12px; text-align: center; font-weight: bold; font-size: 18px;">
            ${(participant.laps || []).length}
        </td>
        <td style="padding: 12px; text-align: center; font-weight: bold;">
            ${((participant.totalDistance || 0) / 1000).toFixed(2)} km
        </td>
        <td id="time-${participant.bib}" style="padding: 12px; text-align: center; font-family: monospace; font-weight: bold;">
            ${formatTime(participant.totalTime || participant.finishTime || 0)}
        </td>
        <td style="padding: 12px; text-align: center; font-family: monospace;">
            ${participant.bestLap ? formatTime(participant.bestLap) : (participant.finishTime ? formatTime(participant.finishTime) : '-')}
        </td>
        <td style="padding: 12px; text-align: center;">
            <span style="background: ${statusColor[participant.status]}; color: white; padding: 5px 10px; border-radius: 5px; font-size: 12px;">
                ${statusText[participant.status]}
            </span>
        </td>
        <td style="padding: 8px; text-align: center;">
            ${isOutOfRaceStatus(participant.status) ? `
                <div style="display: flex; gap: 4px; justify-content: center; align-items: center;">
                    <button onclick="${participant.status === 'disq' ? 'cancelDISQ' : 'cancelDNS'}('${participant.bib}')" style="background: #95a5a6; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;" title="Annuler ${outOfRaceLabel(participant.status)}">↩️</button>
                </div>
            ` : participant.status === 'finished' ? `
                <div style="display: flex; gap: 4px; justify-content: center; align-items: center;">
                    <button onclick="editParticipantTime('${participant.bib}')" style="background: #f39c12; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;" title="Éditer le temps">✏️</button>
                    <button onclick="restartParticipant('${participant.bib}')" style="background: #e74c3c; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;" title="Relancer">🔄</button>
                </div>
            ` : `
                <div style="display: flex; gap: 4px; justify-content: center; align-items: center;">
                    <button onclick="recordLap('${participant.bib}')" style="background: #3498db; color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold;" title="Enregistrer un tour">LAP</button>
                    <button onclick="finishParticipant('${participant.bib}')" style="background: #27ae60; color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold;" title="Terminer">FIN</button>
                    <button onclick="markAsDNS('${participant.bib}')" style="background: none; border: 1px solid #ccc; color: #999; padding: 3px 6px; border-radius: 3px; cursor: pointer; font-size: 10px;" title="Non partant">DNS</button>
                    <button onclick="markAsDISQ('${participant.bib}')" style="background: none; border: 1px solid #e74c3c; color: #e74c3c; padding: 3px 6px; border-radius: 3px; cursor: pointer; font-size: 10px;" title="Disqualifier">DISQ</button>
                    <button onclick="editParticipantRowInline('${participant.bib}')" style="background: #f39c12; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;" title="Éditer tours / distance / temps">✏️</button>
                </div>
            `}
        </td>
    `;
}

// Parser un temps saisi "HH:MM:SS.cc" / "MM:SS.cc" / "SS.cc" en millisecondes
function parseTimeString(str) {
    if (!str) return 0;
    str = String(str).trim();
    if (!str) return 0;

    var parts = str.split(':').map(function(s) { return s.trim(); });
    var h = 0, m = 0, secPart = '0';

    if (parts.length === 3) {
        h = parseInt(parts[0], 10) || 0;
        m = parseInt(parts[1], 10) || 0;
        secPart = parts[2];
    } else if (parts.length === 2) {
        m = parseInt(parts[0], 10) || 0;
        secPart = parts[1];
    } else {
        secPart = parts[0];
    }

    var sp = secPart.split('.');
    var s = parseInt(sp[0], 10) || 0;
    var cc = 0;
    if (sp.length > 1) {
        var frac = (sp[1] + '00').slice(0, 2); // normaliser en centièmes
        cc = parseInt(frac, 10) || 0;
    }

    return (h * 3600000) + (m * 60000) + (s * 1000) + (cc * 10);
}

// Passer une ligne de participant en mode édition inline (Tours / Distance / Temps Total)
window.editParticipantRowInline = function(bib) {
    var serie = raceData.currentSerie;
    if (!serie) return;

    var participant = serie.participants.find(function(p) { return String(p.bib) === String(bib); });
    if (!participant) return;

    var row = document.getElementById('participant-' + bib);
    if (!row) return;

    var cells = row.children;
    // Ordre des colonnes : 0=Dossard 1=Participant 2=Club 3=Tours 4=Distance 5=Temps Total 6=Meilleur tour 7=Statut 8=Actions
    var lapsCount = (participant.laps || []).length;
    var distanceKm = ((participant.totalDistance || 0) / 1000).toFixed(2);
    var timeStr = formatTime(participant.totalTime || participant.finishTime || 0);

    cells[3].innerHTML = '<input type="number" min="0" id="edit-laps-' + bib + '" value="' + lapsCount + '" style="width: 60px; padding: 4px; text-align: center; border: 1px solid #f39c12; border-radius: 4px; font-size: 14px;">';
    cells[4].innerHTML = '<input type="number" min="0" step="0.01" id="edit-dist-' + bib + '" value="' + distanceKm + '" style="width: 65px; padding: 4px; text-align: center; border: 1px solid #f39c12; border-radius: 4px; font-size: 14px;"> km';
    cells[5].innerHTML = '<input type="text" id="edit-time-' + bib + '" value="' + timeStr + '" placeholder="MM:SS.cc" style="width: 95px; padding: 4px; text-align: center; font-family: monospace; border: 1px solid #f39c12; border-radius: 4px; font-size: 14px;">';
    cells[8].innerHTML = '<div style="display: flex; gap: 4px; justify-content: center; align-items: center;">' +
        '<button onclick="saveParticipantRowInline(\'' + bib + '\')" style="background: #27ae60; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;" title="Enregistrer">💾</button>' +
        '<button onclick="cancelParticipantRowInline(\'' + bib + '\')" style="background: #95a5a6; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;" title="Annuler">✖️</button>' +
        '</div>';

    var timeInput = document.getElementById('edit-time-' + bib);
    if (timeInput) { timeInput.focus(); timeInput.select(); }
};

// Annuler l'édition inline : redessiner la ligne telle quelle
window.cancelParticipantRowInline = function(bib) {
    var serie = raceData.currentSerie;
    if (!serie) return;
    var participant = serie.participants.find(function(p) { return String(p.bib) === String(bib); });
    if (participant) updateParticipantRow(participant);
};

// Enregistrer l'édition inline
window.saveParticipantRowInline = function(bib) {
    var serie = raceData.currentSerie;
    if (!serie) return;

    var participant = serie.participants.find(function(p) { return String(p.bib) === String(bib); });
    if (!participant) return;

    var lapsEl = document.getElementById('edit-laps-' + bib);
    var distEl = document.getElementById('edit-dist-' + bib);
    var timeEl = document.getElementById('edit-time-' + bib);
    if (!lapsEl || !distEl || !timeEl) return;

    var newLaps = parseInt(lapsEl.value, 10) || 0;
    var newDistanceKm = parseFloat(distEl.value) || 0;
    var newTotalTime = parseTimeString(timeEl.value);

    // Appliquer le temps. Cette édition sert à corriger tours/distance/temps
    // (ex: clic LAP accidentel) — elle ne doit jamais terminer la course pour
    // ce participant : son statut (ex: "En course") reste inchangé.
    participant.totalTime = newTotalTime;
    if (participant.status === 'finished') {
        participant.finishTime = newTotalTime > 0 ? newTotalTime : null;
    }

    // Appliquer la distance (saisie en km, stockée en mètres)
    participant.totalDistance = Math.round(newDistanceKm * 1000);

    // Recréer les tours pour refléter le nombre saisi
    if (newLaps > 0) {
        var avgLapTime = newTotalTime > 0 ? newTotalTime / newLaps : 0;
        participant.laps = [];
        for (var i = 0; i < newLaps; i++) {
            participant.laps.push({
                lapNumber: i + 1,
                time: avgLapTime,
                timestamp: avgLapTime * (i + 1)
            });
        }
        participant.bestLap = avgLapTime > 0 ? avgLapTime : null;
    } else {
        participant.laps = [];
        participant.bestLap = null;
    }

    // Le temps de la série correspond au temps du plus lent participant arrivé
    recomputeSerieTime(serie);

    saveChronoToLocalStorage();
    // Répercuter immédiatement dans le stockage par journée (carte de série + classement)
    if (typeof saveRaceResultsToDay === 'function') {
        saveRaceResultsToDay();
    }
    updateParticipantRow(participant);
    showNotification(participant.name + ' mis à jour', 'success');
};

// Recalcule le temps de la série = temps du plus lent participant arrivé,
// et met à jour l'affichage du chrono principal si présent.
function recomputeSerieTime(serie) {
    if (!serie) return;
    var times = (serie.participants || [])
        .filter(function(p) { return p.status !== 'dns' && (p.finishTime || p.totalTime) > 0; })
        .map(function(p) { return p.finishTime || p.totalTime; });
    serie.currentTime = times.length ? Math.max.apply(null, times) : 0;

    var mainDisplay = document.getElementById('mainChronoDisplay');
    if (mainDisplay && !serie.isRunning) {
        mainDisplay.textContent = formatTime(serie.currentTime);
    }
}
window.recomputeSerieTime = recomputeSerieTime;

// Afficher le classement
window.showRaceRanking = function() {
    const rankingSection = document.getElementById('raceRankingSection');

    if (rankingSection.style.display === 'none') {
        rankingSection.style.display = 'block';
        generateRaceRanking();
    } else {
        rankingSection.style.display = 'none';
    }
};

// Générer le classement
function generateRaceRanking() {
    const serie = raceData.currentSerie;
    if (!serie) return;

    const rankingSection = document.getElementById('raceRankingSection');

    // Trier les participants
    const ranked = [...serie.participants].sort((a, b) => {
        // Les DNS à la fin
        if (isOutOfRaceStatus(a.status) && !isOutOfRaceStatus(b.status)) return 1;
        if (isOutOfRaceStatus(b.status) && !isOutOfRaceStatus(a.status)) return -1;

        // Les terminés d'abord
        if (a.status === 'finished' && b.status !== 'finished') return -1;
        if (b.status === 'finished' && a.status !== 'finished') return 1;

        // Pour les courses relais (durée limitée), trier par distance puis temps
        // Pour les courses individuelles (distance fixe), trier par temps
        if (serie.raceType === 'relay') {
            // Course relais : priorité à la distance (plus c'est grand, mieux c'est)
            if (a.totalDistance !== b.totalDistance) {
                return b.totalDistance - a.totalDistance;
            }
            return a.totalTime - b.totalTime; // En cas d'égalité, temps le plus court
        } else {
            // Course individuelle : priorité au temps (le plus rapide gagne)
            // Mais si distances différentes, priorité à la distance quand même
            if (a.totalDistance !== b.totalDistance) {
                return b.totalDistance - a.totalDistance;
            }
            return a.totalTime - b.totalTime;
        }
    });

    const medals = ['🥇', '🥈', '🥉'];

    let html = `
        <div style="background: linear-gradient(135deg, #16a085 0%, #1abc9c 100%); padding: 20px; border-radius: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;">
                <h3 style="color: white; margin: 0;">🏆 Classement Général</h3>
                <button onclick="exportRaceRankingToPDF()" style="background: white; color: #16a085; border: none; padding: 10px 18px; border-radius: 8px; font-weight: bold; font-size: 14px; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); transition: opacity 0.2s;" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">
                    📄 Exporter en PDF
                </button>
            </div>
            <div style="background: white; border-radius: 10px; padding: 20px;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #f8f9fa; border-bottom: 2px solid #dee2e6;">
                            <th style="padding: 12px; text-align: center;">Pos.</th>
                            <th style="padding: 12px; text-align: center;">Dossard</th>
                            <th style="padding: 12px; text-align: left;">Participant</th>
                            <th style="padding: 12px; text-align: left;">Club</th>
                            <th style="padding: 12px; text-align: center;">Tours</th>
                            <th style="padding: 12px; text-align: center;">Distance Totale</th>
                            <th style="padding: 12px; text-align: center;">Temps Total</th>
                            <th style="padding: 12px; text-align: center;">Meilleur Tour</th>
                            <th style="padding: 12px; text-align: center;">Statut</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${ranked.map((p, index) => {
                            const position = index + 1;
                            const isDNS = isOutOfRaceStatus(p.status);
                            const medal = isDNS ? outOfRaceLabel(p.status) : (position <= 3 ? medals[position - 1] : position);
                            const rowBg = isDNS ? 'background: #fdeaea; opacity: 0.7;' : (position <= 3 ? 'background: linear-gradient(135deg, #fff9e6, #ffe9b3);' : '');

                            return `
                                <tr style="${rowBg} border-bottom: 1px solid #ecf0f1;">
                                    <td style="padding: 12px; text-align: center; font-size: ${isDNS ? '14px' : '24px'}; font-weight: bold; color: ${isDNS ? '#e74c3c' : 'inherit'};">
                                        ${medal}
                                    </td>
                                    <td style="padding: 12px; text-align: center; font-weight: bold; font-size: 20px; color: #3498db;">
                                        #${p.bib}
                                    </td>
                                    <td style="padding: 12px;">
                                        <div style="font-weight: bold; font-size: 16px;">${p.name}</div>
                                        <div style="font-size: 12px; color: #7f8c8d;">${p.category || 'Division ' + (p.division || '-')}</div>
                                    </td>
                                    <td style="padding: 12px;">
                                        <div style="font-weight: bold; color: #16a085; font-size: 14px;">${p.club || '-'}</div>
                                    </td>
                                    <td style="padding: 12px; text-align: center; font-weight: bold; font-size: 18px;">
                                        ${p.laps.length}
                                    </td>
                                    <td style="padding: 12px; text-align: center; font-weight: bold; font-size: 16px;">
                                        ${(p.totalDistance / 1000).toFixed(2)} km
                                    </td>
                                    <td style="padding: 12px; text-align: center; font-family: monospace; font-weight: bold; font-size: 16px;">
                                        ${p.status === 'finished' ? formatTime(p.finishTime) : formatTime(p.totalTime)}
                                    </td>
                                    <td style="padding: 12px; text-align: center; font-family: monospace; font-size: 14px;">
                                        ${p.bestLap ? formatTime(p.bestLap) : '-'}
                                    </td>
                                    <td style="padding: 12px; text-align: center;">
                                        ${p.status === 'finished' ?
                                            '<span style="color: #27ae60; font-weight: bold;">✅ Terminé</span>' :
                                            p.status === 'dns' ?
                                            '<span style="color: #e74c3c; font-weight: bold;">🚫 DNS</span>' :
                                            p.status === 'disq' ?
                                            '<span style="color: #8e44ad; font-weight: bold;">⛔ DISQ</span>' :
                                            '<span style="color: #e67e22; font-weight: bold;">⏳ En cours</span>'
                                        }
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>

                <div style="margin-top: 30px; display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">
                    <div style="background: linear-gradient(135deg, #16a085, #1abc9c); color: white; padding: 15px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 14px; opacity: 0.9;">Participants Totaux</div>
                        <div style="font-size: 32px; font-weight: bold;">${serie.participants.length}</div>
                    </div>
                    <div style="background: linear-gradient(135deg, #16a085, #1abc9c); color: white; padding: 15px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 14px; opacity: 0.9;">Terminés</div>
                        <div style="font-size: 32px; font-weight: bold;">
                            ${serie.participants.filter(p => p.status === 'finished').length}
                        </div>
                    </div>
                    <div style="background: linear-gradient(135deg, #fa709a, #fee140); color: white; padding: 15px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 14px; opacity: 0.9;">Distance Totale</div>
                        <div style="font-size: 32px; font-weight: bold;">
                            ${(serie.participants.reduce((sum, p) => sum + p.totalDistance, 0) / 1000).toFixed(2)} km
                        </div>
                    </div>
                    <div style="background: linear-gradient(135deg, #30cfd0, #330867); color: white; padding: 15px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 14px; opacity: 0.9;">Tours Totaux</div>
                        <div style="font-size: 32px; font-weight: bold;">
                            ${serie.participants.reduce((sum, p) => sum + p.laps.length, 0)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Ajouter le classement par club si mode interclub
    const parentEvent = raceData.events.find(e => e.id === serie.eventId);
    if (parentEvent && parentEvent.raceType === 'interclub') {
        html += generateInterclubRanking(ranked, parentEvent);
    }

    rankingSection.innerHTML = html;
}

// ============================================
// AFFICHAGE LIVE (2e ÉCRAN) DE LA COURSE EN COURS
// ============================================

// Construit le contenu (chrono + tableau de classement) affiché dans la
// fenêtre "🖥️ Afficher", à partir de l'état courant de la course.
function buildLiveRaceDisplayContentHTML() {
    const serie = raceData.currentSerie;
    if (!serie) {
        return { title: 'Aucune course en cours', body: '<p style="text-align:center; padding:40px; color:#7f8c8d;">Aucune course en cours.</p>' };
    }

    const ranked = [...serie.participants].sort((a, b) => {
        if (isOutOfRaceStatus(a.status) && !isOutOfRaceStatus(b.status)) return 1;
        if (isOutOfRaceStatus(b.status) && !isOutOfRaceStatus(a.status)) return -1;
        if (a.status === 'finished' && b.status !== 'finished') return -1;
        if (b.status === 'finished' && a.status !== 'finished') return 1;
        if (a.totalDistance !== b.totalDistance) return b.totalDistance - a.totalDistance;
        return a.totalTime - b.totalTime;
    });

    const medals = ['🥇', '🥈', '🥉'];

    const rows = ranked.map((p, index) => {
        const position = index + 1;
        const isDNS = isOutOfRaceStatus(p.status);
        const medal = isDNS ? outOfRaceLabel(p.status) : (position <= 3 ? medals[position - 1] : position);
        const rowBg = isDNS ? 'background: rgba(231,76,60,0.15); opacity: 0.7;' : (position <= 3 ? 'background: rgba(255,215,0,0.12);' : '');
        const statusHtml = p.status === 'finished'
            ? '<span style="color: #2ecc71; font-weight: bold;">✅ Terminé</span>'
            : p.status === 'disq'
            ? '<span style="color: #c39bd3; font-weight: bold;">⛔ DISQ</span>'
            : (isDNS ? '<span style="color: #e74c3c; font-weight: bold;">🚫 DNS</span>' : '<span style="color: #f39c12; font-weight: bold;">⏳ En cours</span>');

        return `
            <tr style="${rowBg} border-bottom: 1px solid rgba(255,255,255,0.1);">
                <td style="padding: 12px; text-align: center; font-size: ${isDNS ? '14px' : '22px'}; font-weight: bold;">${medal}</td>
                <td style="padding: 12px; text-align: center; font-weight: bold; font-size: 18px; color: #3498db;">#${p.bib}</td>
                <td style="padding: 12px; font-weight: bold;">${p.name}${p.club ? '<div style="font-size:11px; color:#94a3b8; font-weight:normal;">' + p.club + '</div>' : ''}</td>
                <td style="padding: 12px; text-align: center; font-weight: bold;">${p.laps.length}</td>
                <td style="padding: 12px; text-align: center; font-weight: bold;">${(p.totalDistance / 1000).toFixed(2)} km</td>
                <td style="padding: 12px; text-align: center; font-family: monospace; font-weight: bold;">${p.status === 'finished' ? formatTime(p.finishTime) : formatTime(p.totalTime)}</td>
                <td style="padding: 12px; text-align: center;">${statusHtml}</td>
            </tr>`;
    }).join('');

    const body = `
        <div style="text-align: center; font-family: 'Courier New', monospace; font-size: 48px; font-weight: bold; color: #00ff88; text-shadow: 0 0 20px rgba(0,255,136,0.3); margin-bottom: 25px; letter-spacing: 3px;">
            ${formatTime(serie.currentTime || 0)}
        </div>
        <table style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr style="background: rgba(255,255,255,0.08);">
                    <th style="padding: 12px; text-align: center;">Pos.</th>
                    <th style="padding: 12px; text-align: center;">Dossard</th>
                    <th style="padding: 12px; text-align: left;">Participant</th>
                    <th style="padding: 12px; text-align: center;">Tours</th>
                    <th style="padding: 12px; text-align: center;">Distance</th>
                    <th style="padding: 12px; text-align: center;">Temps</th>
                    <th style="padding: 12px; text-align: center;">Statut</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>`;

    return { title: serie.name, body: body };
}

let liveRaceDisplayWindow = null;

window.openLiveRaceDisplayWindow = function() {
    const data = buildLiveRaceDisplayContentHTML();

    const html = `<!DOCTYPE html>
    <html><head><meta charset="UTF-8"><title>🖥️ ${data.title}</title>
    <style>
        * { box-sizing: border-box; }
        body { margin: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: #fff; padding: 25px; }
        h1 { text-align: center; margin: 0 0 5px 0; font-size: 26px; }
        .update-time { text-align: center; font-size: 0.85em; color: #94a3b8; margin-bottom: 20px; }
        table { width: 100%; }
        td, th { font-size: 15px; }
        .auto-refresh { position: fixed; bottom: 20px; left: 20px; background: rgba(255,255,255,0.1); padding: 10px 15px; border-radius: 25px; font-size: 13px; }
        .refresh-btn { position: fixed; bottom: 20px; right: 20px; background: linear-gradient(135deg, #27ae60, #2ecc71); color: white; border: none; padding: 15px 25px; border-radius: 50px; font-size: 16px; cursor: pointer; }
        .refreshing { animation: pulse 1s ease-in-out; }
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
    </style></head><body>
        <h1>🏁 ${data.title}</h1>
        <div class="update-time" id="updateTime">Mis à jour : ${new Date().toLocaleTimeString('fr-FR')}</div>
        <div id="liveRaceContent">${data.body}</div>
        <div class="auto-refresh"><label><input type="checkbox" id="autoRefresh" checked> Auto-refresh (3s)</label></div>
        <button class="refresh-btn" onclick="requestRefresh()">🔄 Rafraîchir</button>
        <script>
            let autoRefreshInterval;
            const checkbox = document.getElementById('autoRefresh');

            function requestRefresh() {
                if (window.opener && !window.opener.closed) {
                    document.body.classList.add('refreshing');
                    window.opener.postMessage({ action: 'refreshLiveRaceDisplay' }, '*');
                }
            }

            function startAutoRefresh() { autoRefreshInterval = setInterval(requestRefresh, 3000); }
            function stopAutoRefresh() { clearInterval(autoRefreshInterval); }

            checkbox.addEventListener('change', function(e) {
                if (e.target.checked) startAutoRefresh(); else stopAutoRefresh();
            });

            window.addEventListener('message', function(event) {
                if (event.data && event.data.action === 'updateLiveRaceDisplay') {
                    document.title = '🖥️ ' + event.data.title;
                    document.querySelector('h1').textContent = '🏁 ' + event.data.title;
                    document.getElementById('liveRaceContent').innerHTML = event.data.body;
                    document.getElementById('updateTime').textContent = 'Mis à jour : ' + new Date().toLocaleTimeString('fr-FR');
                    document.body.classList.remove('refreshing');
                }
            });

            startAutoRefresh();
        <\/script>
    </body></html>`;

    if (liveRaceDisplayWindow && !liveRaceDisplayWindow.closed) {
        liveRaceDisplayWindow.document.open();
        liveRaceDisplayWindow.document.write(html);
        liveRaceDisplayWindow.document.close();
        liveRaceDisplayWindow.focus();
    } else {
        liveRaceDisplayWindow = window.open('', 'LiveRaceDisplay', 'width=900,height=700,menubar=no,toolbar=no,location=no,status=no');
        if (liveRaceDisplayWindow) {
            liveRaceDisplayWindow.document.write(html);
            liveRaceDisplayWindow.document.close();
        }
    }
};

// Répond aux demandes de rafraîchissement envoyées par la fenêtre d'affichage
window.addEventListener('message', function(event) {
    if (event.data && event.data.action === 'refreshLiveRaceDisplay') {
        if (liveRaceDisplayWindow && !liveRaceDisplayWindow.closed) {
            const data = buildLiveRaceDisplayContentHTML();
            liveRaceDisplayWindow.postMessage({ action: 'updateLiveRaceDisplay', title: data.title, body: data.body }, '*');
        }
    }
});

// Exporter le classement général de la série en PDF
window.exportRaceRankingToPDF = function() {
    const serie = raceData.currentSerie;
    if (!serie) return;

    const ranked = [...serie.participants].sort((a, b) => {
        if (isOutOfRaceStatus(a.status) && !isOutOfRaceStatus(b.status)) return 1;
        if (isOutOfRaceStatus(b.status) && !isOutOfRaceStatus(a.status)) return -1;
        if (a.status === 'finished' && b.status !== 'finished') return -1;
        if (b.status === 'finished' && a.status !== 'finished') return 1;
        if (a.totalDistance !== b.totalDistance) return b.totalDistance - a.totalDistance;
        return a.totalTime - b.totalTime;
    });

    const currentDate = new Date().toLocaleDateString('fr-FR', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });

    const medals = ['🥇', '🥈', '🥉'];
    const serieName = serie.name || 'Série';

    const rows = ranked.map((p, index) => {
        const position = index + 1;
        const isDNS = isOutOfRaceStatus(p.status);
        const medal = isDNS ? outOfRaceLabel(p.status) : (position <= 3 ? medals[position - 1] : position);
        const rowBg = isDNS ? '#fdeaea' : (position <= 3 ? '#fff9e6' : (index % 2 === 0 ? '#f8f9fa' : 'white'));
        const timeDisplay = p.status === 'finished' ? formatTime(p.finishTime) : formatTime(p.totalTime);
        const statusText = p.status === 'finished' ? 'Terminé' : (p.status === 'disq' ? 'DISQ' : (p.status === 'dns' ? 'DNS' : 'En cours'));
        const statusColorForText = p.status === 'finished' ? '#27ae60' : (p.status === 'disq' ? '#8e44ad' : (p.status === 'dns' ? '#e74c3c' : '#e67e22'));

        return `<tr style="background: ${rowBg}; border-bottom: 1px solid #dee2e6;">
            <td style="padding: 10px; text-align: center; font-size: ${isDNS ? '13px' : '20px'}; font-weight: bold; color: ${isDNS ? '#e74c3c' : 'inherit'};">${medal}</td>
            <td style="padding: 10px; text-align: center; font-weight: bold; color: #3498db;">#${p.bib}</td>
            <td style="padding: 10px;">
                <div style="font-weight: bold;">${p.name}</div>
                <div style="font-size: 11px; color: #7f8c8d;">${p.category || '-'}</div>
            </td>
            <td style="padding: 10px; color: #16a085; font-weight: bold;">${p.club || '-'}</td>
            <td style="padding: 10px; text-align: center; font-weight: bold;">${p.laps.length}</td>
            <td style="padding: 10px; text-align: center; font-weight: bold;">${(p.totalDistance / 1000).toFixed(2)} km</td>
            <td style="padding: 10px; text-align: center; font-family: monospace; font-weight: bold;">${timeDisplay}</td>
            <td style="padding: 10px; text-align: center; font-family: monospace;">${p.bestLap ? formatTime(p.bestLap) : '-'}</td>
            <td style="padding: 10px; text-align: center; font-weight: bold; color: ${statusColorForText};">${statusText}</td>
        </tr>`;
    }).join('');

    const totalDistance = (serie.participants.reduce((sum, p) => sum + p.totalDistance, 0) / 1000).toFixed(2);
    const finishedCount = serie.participants.filter(p => p.status === 'finished').length;
    const totalLaps = serie.participants.reduce((sum, p) => sum + p.laps.length, 0);

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Classement Général - ${serieName}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; color: #2c3e50; }
        h1 { text-align: center; color: #16a085; margin-bottom: 5px; }
        .subtitle { text-align: center; color: #7f8c8d; font-size: 13px; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        thead tr { background: linear-gradient(135deg, #16a085, #1abc9c); color: white; }
        th { padding: 10px 8px; text-align: center; font-weight: bold; }
        th:nth-child(3) { text-align: left; }
        th:nth-child(4) { text-align: left; }
        td { border-bottom: 1px solid #dee2e6; }
        .stats { display: flex; gap: 15px; margin-top: 20px; justify-content: center; }
        .stat-card { background: #f0faf8; border: 2px solid #16a085; border-radius: 8px; padding: 12px 20px; text-align: center; }
        .stat-label { font-size: 11px; color: #7f8c8d; }
        .stat-value { font-size: 22px; font-weight: bold; color: #16a085; }
        .footer { text-align: center; margin-top: 20px; font-size: 11px; color: #95a5a6; }
        @media print { button { display: none; } }
    </style>
</head>
<body>
    <h1>🏆 Classement Général</h1>
    <p class="subtitle">${serieName} &nbsp;|&nbsp; Généré le ${currentDate}</p>
    <table>
        <thead>
            <tr>
                <th>Pos.</th>
                <th>Dossard</th>
                <th style="text-align: left;">Participant</th>
                <th style="text-align: left;">Club</th>
                <th>Tours</th>
                <th>Distance</th>
                <th>Temps</th>
                <th>Meilleur Tour</th>
                <th>Statut</th>
            </tr>
        </thead>
        <tbody>${rows}</tbody>
    </table>
    <div class="stats">
        <div class="stat-card"><div class="stat-label">Participants</div><div class="stat-value">${serie.participants.length}</div></div>
        <div class="stat-card"><div class="stat-label">Terminés</div><div class="stat-value">${finishedCount}</div></div>
        <div class="stat-card"><div class="stat-label">Distance totale</div><div class="stat-value">${totalDistance} km</div></div>
        <div class="stat-card"><div class="stat-label">Tours totaux</div><div class="stat-value">${totalLaps}</div></div>
    </div>
    <p class="footer">Gestionnaire de Championnats</p>
    <script>window.onload = function() { window.print(); }<\/script>
</body>
</html>`);
    printWindow.document.close();
};

// Afficher le classement par club pour une série
window.showSerieClubRanking = function() {
    const serie = raceData.currentSerie;
    if (!serie) return;

    const rankingSection = document.getElementById('raceRankingSection');

    // Trier les participants terminés
    const rankedFinished = [...serie.participants]
        .filter(p => p.status === 'finished')
        .sort((a, b) => {
            if (serie.raceType === 'relay') {
                if (a.totalDistance !== b.totalDistance) {
                    return b.totalDistance - a.totalDistance;
                }
                return a.totalTime - b.totalTime;
            } else {
                if (a.totalDistance !== b.totalDistance) {
                    return b.totalDistance - a.totalDistance;
                }
                return a.totalTime - b.totalTime;
            }
        });

    // Barème de points (comme en F1 ou athlétisme)
    const pointsScale = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

    // Calculer les points par club
    const clubStats = {};

    rankedFinished.forEach((p, index) => {
        const club = p.club || 'Sans club';
        const points = pointsScale[index] || 0; // 0 points après la 10e place

        if (!clubStats[club]) {
            clubStats[club] = {
                clubName: club,
                totalPoints: 0,
                participants: [],
                positions: []
            };
        }

        clubStats[club].totalPoints += points;
        clubStats[club].participants.push(p.name);
        clubStats[club].positions.push({ position: index + 1, points: points, name: p.name });
    });

    // Trier les clubs par points
    const rankedClubs = Object.values(clubStats).sort((a, b) => b.totalPoints - a.totalPoints);

    const medals = ['🥇', '🥈', '🥉'];

    let html = `
        <div style="background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%); padding: 20px; border-radius: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="color: white; margin: 0;">🏅 Classement par Club</h3>
                <button class="btn" onclick="showRaceRanking()" style="background: linear-gradient(135deg, #16a085, #1abc9c); color: white; font-weight: bold;">
                    👤 Classement Individuel
                </button>
            </div>

            <div style="background: white; border-radius: 10px; padding: 20px;">
                <p style="color: #7f8c8d; margin-bottom: 20px; text-align: center;">
                    Attribution de points selon la position : 1er=25pts, 2e=18pts, 3e=15pts, 4e=12pts, 5e=10pts, 6e=8pts, 7e=6pts, 8e=4pts, 9e=2pts, 10e=1pt
                </p>

                <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                    <thead>
                        <tr style="background: linear-gradient(135deg, #2ecc71, #27ae60); color: white;">
                            <th style="padding: 12px; text-align: center;">Position</th>
                            <th style="padding: 12px; text-align: left;">Club</th>
                            <th style="padding: 12px; text-align: center;">Points</th>
                            <th style="padding: 12px; text-align: center;">Participants</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rankedClubs.map((club, index) => {
                            const position = index + 1;
                            const medal = position <= 3 ? medals[position - 1] : position;
                            const rowBg = position <= 3 ? 'background: linear-gradient(135deg, #fff9e6, #ffe9b3);' : (index % 2 === 0 ? 'background: #f8f9fa;' : '');

                            return `
                                <tr style="${rowBg} border-bottom: 1px solid #ecf0f1;">
                                    <td style="padding: 12px; text-align: center; font-size: 24px; font-weight: bold;">
                                        ${medal}
                                    </td>
                                    <td style="padding: 12px;">
                                        <div style="font-weight: bold; font-size: 18px; color: #2ecc71;">
                                            🏅 ${club.clubName}
                                        </div>
                                    </td>
                                    <td style="padding: 12px; text-align: center; font-weight: bold; font-size: 24px; color: #27ae60;">
                                        ${club.totalPoints} pts
                                    </td>
                                    <td style="padding: 12px; text-align: center;">
                                        <div style="font-weight: bold; color: #3498db; font-size: 16px;">
                                            ${club.participants.length} participant(s)
                                        </div>
                                    </td>
                                </tr>
                                <tr style="${rowBg}">
                                    <td colspan="4" style="padding: 0 12px 12px 60px;">
                                        <div style="font-size: 13px; color: #7f8c8d;">
                                            ${club.positions.map(pos =>
                                                `<span style="display: inline-block; margin-right: 15px; margin-bottom: 5px;">
                                                    <strong>${pos.position}e</strong> - ${pos.name}
                                                    <span style="color: #27ae60;">(${pos.points} pts)</span>
                                                </span>`
                                            ).join('')}
                                        </div>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>

                <div style="margin-top: 20px; padding: 15px; background: #ecf0f1; border-radius: 8px;">
                    <h4 style="margin: 0 0 10px 0; color: #2c3e50;">📊 Statistiques</h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">
                        <div>
                            <strong>Clubs présents:</strong> ${rankedClubs.length}
                        </div>
                        <div>
                            <strong>Participants terminés:</strong> ${rankedFinished.length}
                        </div>
                        <div>
                            <strong>Points attribués:</strong> ${rankedClubs.reduce((sum, c) => sum + c.totalPoints, 0)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    rankingSection.innerHTML = html;
};

// Générer le classement par club pour le mode interclub
function generateInterclubRanking(rankedParticipants, event) {
    const pointsScale = event.interclubPoints || [10, 8, 6, 5, 4, 3, 2, 1];

    // Étape 1: Identifier le meilleur participant de chaque club
    const clubBest = {};
    rankedParticipants.forEach((p, index) => {
        if (p.status !== 'finished') return;

        // Récupérer le club du participant
        const participantData = raceData.participants.find(rp => rp.id === p.id);
        const club = participantData?.club || p.club || 'Sans club';

        if (!club || club.trim() === '') return;

        // Garder seulement le meilleur participant du club (premier rencontré car déjà trié)
        if (!clubBest[club]) {
            clubBest[club] = {
                participant: p,
                individualPosition: index + 1,
                time: p.finishTime || p.totalTime
            };
        }
    });

    // Étape 2: Classer les clubs par le temps de leur meilleur participant
    const rankedClubs = Object.entries(clubBest).sort(([clubA, dataA], [clubB, dataB]) => {
        // Comparer les temps (plus rapide = meilleur)
        return dataA.time - dataB.time;
    });

    // Étape 3: Attribuer les points selon le classement par club
    const clubPoints = {};
    const clubDetails = {};

    rankedClubs.forEach(([club, data], clubIndex) => {
        const clubPosition = clubIndex + 1;
        const clubPointsValue = clubPosition <= pointsScale.length ? pointsScale[clubPosition - 1] : 0;

        clubPoints[club] = clubPointsValue;
        clubDetails[club] = [{
            name: data.participant.name,
            position: clubPosition,  // Position du club
            individualPosition: data.individualPosition,  // Position individuelle
            points: clubPointsValue,  // Points du club
            time: data.time
        }];
    });

    // Trier les clubs par points décroissants (déjà triés mais pour cohérence)
    const sortedClubs = Object.entries(clubPoints)
        .sort((a, b) => b[1] - a[1])
        .map(([club, points], index) => ({
            club,
            points,
            position: index + 1,
            athletes: clubDetails[club]
        }));

    if (sortedClubs.length === 0) {
        return `
            <div style="margin-top: 20px; background: linear-gradient(135deg, #9b59b6, #8e44ad); padding: 20px; border-radius: 10px;">
                <h3 style="color: white; text-align: center; margin-bottom: 15px;">🏅 Classement Interclub</h3>
                <div style="background: white; border-radius: 10px; padding: 20px; text-align: center; color: #7f8c8d;">
                    Aucun club trouvé. Assurez-vous que les participants ont un club assigné.
                </div>
            </div>
        `;
    }

    const clubMedals = ['🥇', '🥈', '🥉'];

    return `
        <div style="margin-top: 20px; background: linear-gradient(135deg, #9b59b6, #8e44ad); padding: 20px; border-radius: 10px;">
            <h3 style="color: white; text-align: center; margin-bottom: 15px;">🏅 Classement Interclub</h3>
            <p style="color: rgba(255,255,255,0.8); text-align: center; margin-bottom: 15px; font-size: 13px;">
                Barème: ${pointsScale.map((p, i) => `${i + 1}er=${p}pts`).join(', ')}
            </p>
            <div style="background: white; border-radius: 10px; padding: 20px;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #f8f9fa; border-bottom: 2px solid #dee2e6;">
                            <th style="padding: 12px; text-align: center;">Pos.</th>
                            <th style="padding: 12px; text-align: left;">Club</th>
                            <th style="padding: 12px; text-align: center;">Points</th>
                            <th style="padding: 12px; text-align: center;">Athlètes</th>
                            <th style="padding: 12px; text-align: left;">Détails</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sortedClubs.map(c => {
                            const medal = c.position <= 3 ? clubMedals[c.position - 1] : c.position;
                            const rowBg = c.position <= 3 ? 'background: linear-gradient(135deg, #f5e6ff, #e8d4f8);' : '';

                            return `
                                <tr style="${rowBg} border-bottom: 1px solid #ecf0f1;">
                                    <td style="padding: 12px; text-align: center; font-size: 24px; font-weight: bold;">
                                        ${medal}
                                    </td>
                                    <td style="padding: 12px; font-weight: bold; font-size: 16px; color: #9b59b6;">
                                        ${c.club}
                                    </td>
                                    <td style="padding: 12px; text-align: center; font-weight: bold; font-size: 24px; color: #e74c3c;">
                                        ${c.points}
                                    </td>
                                    <td style="padding: 12px; text-align: center; font-weight: bold;">
                                        ${c.athletes.length}
                                    </td>
                                    <td style="padding: 12px; font-size: 12px; color: #7f8c8d;">
                                        ${c.athletes.map(a => {
                                            const individualInfo = a.individualPosition && a.individualPosition !== a.position
                                                ? ` - ${a.individualPosition}e indiv.`
                                                : '';
                                            return `${a.name} (${a.position}e club: ${a.points}pts${individualInfo})`;
                                        }).join(', ')}
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// Afficher le classement général de toutes les séries avec sélection intelligente
function generateFilteredRanking(filterFunc, title, type) {
    const allParticipants = [];

    raceData.events.forEach(event => {
        event.series.forEach(serie => {
            if (serie.status === 'completed' && filterFunc(event, serie)) {
                serie.participants.forEach(participant => {
                    if (participant.status === 'finished') {
                        const existingIndex = allParticipants.findIndex(p => p.bib === participant.bib);

                        if (existingIndex !== -1) {
                            allParticipants[existingIndex].series.push({
                                eventName: event.name,
                                serieName: serie.name,
                                distance: participant.totalDistance,
                                time: participant.finishTime || participant.totalTime,
                                laps: participant.laps.length
                            });
                            allParticipants[existingIndex].totalDistance += participant.totalDistance;
                            allParticipants[existingIndex].totalTime += (participant.finishTime || participant.totalTime);
                            allParticipants[existingIndex].totalLaps += participant.laps.length;
                        } else {
                            allParticipants.push({
                                name: participant.name,
                                bib: participant.bib,
                                category: participant.category,
                                series: [{
                                    eventName: event.name,
                                    serieName: serie.name,
                                    distance: participant.totalDistance,
                                    time: participant.finishTime || participant.totalTime,
                                    laps: participant.laps.length
                                }],
                                totalDistance: participant.totalDistance,
                                totalTime: participant.finishTime || participant.totalTime,
                                totalLaps: participant.laps.length
                            });
                        }
                    }
                });
            }
        });
    });

    if (allParticipants.length === 0) {
        displayEmptyRanking(title, 'Aucune série terminée pour ce type.');
        return;
    }

    // Trier par distance puis temps
    const ranked = allParticipants.sort((a, b) => {
        if (a.totalDistance !== b.totalDistance) {
            return b.totalDistance - a.totalDistance;
        }
        return a.totalTime - b.totalTime;
    });

    displayRanking(ranked, title, type);
}

// Fonction pour fermer le classement et retourner aux séries
window.printChronoCompetition = function(dayNumber) {
    // Chercher les données chrono : d'abord dans la journée, puis dans raceData global
    var printEvents = raceData.events;
    var printParticipants = raceData.participants;

    // Si un dayNumber est fourni, ou si raceData est vide, chercher dans les journées
    if (printEvents.length === 0 || dayNumber) {
        // Chercher la première journée chrono avec des épreuves
        var days = championship ? championship.days : {};
        for (var d in days) {
            if (days.hasOwnProperty(d)) {
                var dd = days[d];
                if (dd.dayType === 'chrono' && dd.chronoData && dd.chronoData.events && dd.chronoData.events.length > 0) {
                    if (!dayNumber || parseInt(d) === dayNumber) {
                        printEvents = dd.chronoData.events;
                        printParticipants = dd.chronoData.participants || [];
                        break;
                    }
                }
            }
        }
    }

    if (printEvents.length === 0) {
        showNotification('Aucune épreuve à imprimer', 'warning');
        return;
    }

    const sportEmoji = {
        running: '🏃',
        cycling: '🚴',
        swimming: '🏊',
        multisport: '🏅'
    };

    const raceTypeLabels = {
        individual: 'Individuelle',
        relay: 'Relais',
        interclub: 'Interclub'
    };

    // Générer le HTML pour l'impression
    let printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Compétition Chrono - ${new Date().toLocaleDateString('fr-FR')}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: Arial, sans-serif; padding: 20px; font-size: 12px; }
                h1 { text-align: center; margin-bottom: 20px; font-size: 24px; }
                h2 { margin: 20px 0 10px 0; font-size: 18px; border-bottom: 2px solid #333; padding-bottom: 5px; }
                h3 { margin: 15px 0 8px 0; font-size: 14px; color: #555; }
                .event { margin-bottom: 30px; page-break-inside: avoid; }
                .serie { margin: 10px 0 20px 20px; }
                .info { color: #666; font-size: 11px; margin-bottom: 10px; }
                table { width: 100%; border-collapse: collapse; margin-top: 8px; }
                th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
                th { background: #f0f0f0; font-weight: bold; }
                .rank { text-align: center; font-weight: bold; }
                .time { font-family: monospace; }
                .finished { color: green; }
                .running { color: orange; }
                .ready { color: gray; }
                .medal-1 { background: #fff9e6; }
                .medal-2 { background: #f5f5f5; }
                .medal-3 { background: #fdf5e6; }
                .club-ranking { margin-top: 15px; background: #f9f0ff; padding: 10px; border-radius: 5px; }
                .club-ranking h4 { margin-bottom: 8px; color: #8e44ad; }
                .stats { display: flex; gap: 20px; margin: 10px 0; flex-wrap: wrap; }
                .stat { background: #f5f5f5; padding: 8px 15px; border-radius: 5px; }
                .print-date { text-align: right; color: #999; font-size: 10px; margin-bottom: 10px; }
                @media print {
                    .event { page-break-inside: avoid; }
                    body { padding: 10px; }
                }
            </style>
        </head>
        <body>
            <div class="print-date">Imprimé le ${new Date().toLocaleString('fr-FR')}</div>
            <h1>🏆 Compétition Chrono</h1>
            <div class="stats">
                <div class="stat"><strong>${printEvents.length}</strong> épreuve(s)</div>
                <div class="stat"><strong>${printEvents.reduce((c, e) => c + (e.series ? e.series.length : 0), 0)}</strong> série(s)</div>
                <div class="stat"><strong>${printParticipants.length}</strong> participant(s)</div>
            </div>
    `;

    // Parcourir les épreuves
    printEvents.forEach(event => {
        printContent += `
            <div class="event">
                <h2>${sportEmoji[event.sportType] || '🏅'} ${event.name}</h2>
                <div class="info">
                    Distance: ${event.distance}m | Type: ${raceTypeLabels[event.raceType] || event.raceType}
                    ${event.raceType === 'relay' ? ` | Durée: ${event.relayDuration} min` : ''}
                    ${event.raceType === 'interclub' ? ` | Barème: ${(event.interclubPoints || [10,8,6,5,4,3,2,1]).join(', ')}` : ''}
                </div>
        `;

        if (event.series.length === 0) {
            printContent += `<p style="color: #999; margin-left: 20px;">Aucune série</p>`;
        } else {
            // Parcourir les séries
            event.series.forEach(serie => {
                const statusLabel = serie.status === 'completed' ? '✅ Terminée' :
                                   serie.status === 'running' ? '⏳ En cours' : '⏸️ En attente';

                printContent += `
                    <div class="serie">
                        <h3>${serie.name} - ${statusLabel}</h3>
                `;

                if (serie.participants.length === 0) {
                    printContent += `<p style="color: #999;">Aucun participant</p>`;
                } else {
                    // Trier les participants par résultat
                    const sorted = [...serie.participants].sort((a, b) => {
                        if (a.status === 'finished' && b.status !== 'finished') return -1;
                        if (b.status === 'finished' && a.status !== 'finished') return 1;
                        if (a.totalDistance !== b.totalDistance) return b.totalDistance - a.totalDistance;
                        return (a.finishTime || a.totalTime) - (b.finishTime || b.totalTime);
                    });

                    printContent += `
                        <table>
                            <thead>
                                <tr>
                                    <th style="width: 40px;">Pos.</th>
                                    <th style="width: 60px;">Dossard</th>
                                    <th>Nom</th>
                                    <th>Club</th>
                                    <th style="width: 60px;">Tours</th>
                                    <th style="width: 80px;">Temps</th>
                                    <th style="width: 70px;">Statut</th>
                                </tr>
                            </thead>
                            <tbody>
                    `;

                    sorted.forEach((p, index) => {
                        const position = index + 1;
                        const medalClass = position === 1 ? 'medal-1' : position === 2 ? 'medal-2' : position === 3 ? 'medal-3' : '';
                        const statusClass = p.status === 'finished' ? 'finished' : p.status === 'running' ? 'running' : 'ready';

                        // Récupérer le club du participant
                        const participantData = raceData.participants.find(rp => rp.id === p.id);
                        const club = participantData?.club || p.club || '-';

                        printContent += `
                            <tr class="${medalClass}">
                                <td class="rank">${position}</td>
                                <td>${p.bib}</td>
                                <td>${p.name}</td>
                                <td>${club}</td>
                                <td style="text-align: center;">${p.laps ? p.laps.length : 0}</td>
                                <td class="time">${p.status === 'finished' ? formatTime(p.finishTime || p.totalTime) : '-'}</td>
                                <td class="${statusClass}">${p.status === 'finished' ? 'Terminé' : p.status === 'running' ? 'En cours' : 'Prêt'}</td>
                            </tr>
                        `;
                    });

                    printContent += `</tbody></table>`;

                    // Ajouter classement interclub si applicable
                    if (event.raceType === 'interclub' && serie.status === 'completed') {
                        const clubRanking = calculateClubRanking(sorted, event.interclubPoints || [10,8,6,5,4,3,2,1]);
                        if (clubRanking.length > 0) {
                            printContent += `
                                <div class="club-ranking">
                                    <h4>🏅 Classement Interclub</h4>
                                    <table>
                                        <thead>
                                            <tr>
                                                <th style="width: 40px;">Pos.</th>
                                                <th>Club</th>
                                                <th style="width: 60px;">Points</th>
                                                <th style="width: 60px;">Athlètes</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                            `;
                            clubRanking.forEach((c, i) => {
                                printContent += `
                                    <tr>
                                        <td class="rank">${i + 1}</td>
                                        <td>${c.club}</td>
                                        <td style="text-align: center; font-weight: bold;">${c.points}</td>
                                        <td style="text-align: center;">${c.count}</td>
                                    </tr>
                                `;
                            });
                            printContent += `</tbody></table></div>`;
                        }
                    }
                }

                printContent += `</div>`; // fin serie
            });
        }

        printContent += `</div>`; // fin event
    });

    printContent += `
        </body>
        </html>
    `;

    // Ouvrir la fenêtre d'impression
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
    }, 250);
};

// Fonction helper pour calculer le classement par club (pour l'impression)
function calculateClubRanking(sortedParticipants, pointsScale) {
    const clubPoints = {};

    sortedParticipants.forEach((p, index) => {
        if (p.status !== 'finished') return;

        const participantData = raceData.participants.find(rp => rp.id === p.id);
        const club = participantData?.club || p.club;
        if (!club || club.trim() === '') return;

        const position = index + 1;
        const points = position <= pointsScale.length ? pointsScale[position - 1] : 0;

        if (!clubPoints[club]) {
            clubPoints[club] = { points: 0, count: 0 };
        }
        clubPoints[club].points += points;
        clubPoints[club].count++;
    });

    return Object.entries(clubPoints)
        .map(([club, data]) => ({ club, points: data.points, count: data.count }))
        .sort((a, b) => b.points - a.points);
}

// Importer une compétition chrono depuis JSON
function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = Math.floor((ms % 1000) / 10);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
}


// ============================================
// IMPORT NATATION - PARSING ET GÉNÉRATION DE SÉRIES
// ============================================

// Liste des clubs connus (triée par longueur décroissante pour matching glouton)
var KNOWN_SWIMMING_CLUBS = [
    'Cordée Sport Ifa Bouge',
    'Cordee Sports',
    'Aquaphile Saja',
    'Carpe Mosane',
    'Gai Séjour',
    'Marthe Et Marie',
    'Sra Goélands',
    'SRA Goélands',
    'Batoulu',
    'Boulaie',
    'Trucket',
    'Renards',
    'Apris',
    'Jalon'
].sort(function(a, b) { return b.length - a.length; });

// Ordres de couloirs partagés (le plus rapide au centre) — source unique de vérité
// utilisée à la fois par l'aperçu et la génération, pour qu'ils ne divergent jamais.
var SWIMMING_LANE_ORDERS = {
    3: [2, 3, 1],
    4: [2, 3, 1, 4],
    5: [3, 4, 2, 5, 1],
    6: [3, 4, 2, 5, 1, 6],
    7: [4, 5, 3, 6, 2, 7, 1],
    8: [4, 5, 3, 6, 2, 7, 1, 8],
    9: [5, 6, 4, 7, 3, 8, 2, 9, 1],
    10: [5, 6, 4, 7, 3, 8, 2, 9, 1, 10]
};
function getSwimmingLaneOrder(lanesPerSerie) {
    return SWIMMING_LANE_ORDERS[lanesPerSerie] || SWIMMING_LANE_ORDERS[5];
}

// Nages reconnues — source unique de vérité (fautes de frappe fréquentes incluses).
// Ordre important : les motifs les plus longs/spécifiques d'abord.
var SWIMMING_STROKE_PATTERN =
    'papillon|butterfly|pap\\b|4\\s*nages|quatre\\s*nages|4\\s*styles|nage\\s*libre|' +
    'libre|crawl|brasse|breaststroke|dos|backstroke|freestyle|' +
    'assist[eéè]\\w*|asssit[eéè]\\w*|assit[eéè]\\w*';
var SWIMMING_STROKE_REGEX = new RegExp('(' + SWIMMING_STROKE_PATTERN + ')', 'i');
var SWIMMING_STROKE_REGEX_G = new RegExp('(' + SWIMMING_STROKE_PATTERN + ')', 'gi');

// Normaliser un libellé de nage vers une forme canonique
function normalizeSwimmingStroke(raw) {
    var s = (raw || '').toLowerCase().trim();
    if (/^ass|^asss|^assit/.test(s)) return 'assisté';
    if (/^pap|butterfly/.test(s)) return 'papillon';
    if (/nages|styles|^4|quatre/.test(s)) return '4 nages';
    if (/nage\s*libre|crawl|freestyle/.test(s)) return 'libre';
    if (/^libre/.test(s)) return 'libre';
    if (/brasse|breaststroke/.test(s)) return 'brasse';
    if (/dos|backstroke/.test(s)) return 'dos';
    return s;
}

// Termes à chercher dans le nom d'une épreuve pour matcher une nage canonique
var SWIMMING_STROKE_ALIASES = {
    'assisté': ['assist', 'assisté', 'assiste'],
    'libre': ['libre', 'crawl', 'freestyle', 'nage libre'],
    'papillon': ['papillon', 'pap', 'butterfly'],
    '4 nages': ['4 nages', 'quatre nages', '4nages', '4 styles'],
    'brasse': ['brasse', 'breaststroke'],
    'dos': ['dos', 'backstroke']
};

// Parse un temps de natation depuis divers formats → millisecondes
function parseSwimmingTime(text) {
    if (!text) return { timeMs: 0, timeStr: '' };
    // Nettoyer espaces dans les temps comme "00: 45,00"
    text = text.replace(/:\s+/g, ':');

    var patterns = [
        // 0:00:35,493 ou 0:01:10,000 (H:MM:SS,ms)
        { r: /(\d{1,2}):(\d{1,2}):(\d{2})[,.](\d{1,3})/, fn: function(m) {
            var h = +m[1], min = +m[2], sec = +m[3], frac = m[4];
            var fracMs = frac.length === 3 ? +frac : frac.length === 2 ? +frac * 10 : +frac * 100;
            if (h === 0) return min * 60000 + sec * 1000 + fracMs;
            // h > 0 : probablement M:SS:cc (natation courte distance)
            return h * 60000 + min * 1000 + sec * 10;
        }},
        // 0:00:28 ou 0:01:16 ou 1:34:00 (H:MM:SS ou M:SS:cc)
        { r: /(\d{1,2}):(\d{1,2}):(\d{2})/, fn: function(m) {
            var a = +m[1], b = +m[2], c = +m[3];
            if (a === 0) return b * 60000 + c * 1000;
            // Si H:MM:SS donnerait > 5 min, c'est M:SS:cc
            var asHMS = a * 3600 + b * 60 + c;
            if (asHMS > 300) return a * 60000 + b * 1000 + c * 10;
            return asHMS * 1000;
        }},
        // 01:06,50 ou 00:52,40 ou 01:10.3 (MM:SS,cc)
        { r: /(\d{1,2}):(\d{2})[,.](\d{1,2})/, fn: function(m) {
            var min = +m[1], sec = +m[2], frac = m[3];
            var fracMs = frac.length === 1 ? +frac * 100 : +frac * 10;
            return min * 60000 + sec * 1000 + fracMs;
        }},
        // 0.50.00 ou 3.25.00 (M.SS.cc)
        { r: /(\d{1,2})\.(\d{2})\.(\d{2})/, fn: function(m) {
            return (+m[1]) * 60000 + (+m[2]) * 1000 + (+m[3]) * 10;
        }},
        // 1,24,11 (M,SS,cc)
        { r: /(\d{1,2}),(\d{2}),(\d{2})/, fn: function(m) {
            return (+m[1]) * 60000 + (+m[2]) * 1000 + (+m[3]) * 10;
        }}
    ];

    for (var i = 0; i < patterns.length; i++) {
        var match = text.match(patterns[i].r);
        if (match) {
            return { timeMs: patterns[i].fn(match), timeStr: match[0] };
        }
    }
    return { timeMs: 0, timeStr: '' };
}

// Parse une entrée brute de natation → objet structuré
function parseSwimmingEntry(rawName) {
    // Normaliser les séparateurs (points comme séparateurs de mots)
    var text = rawName
        .replace(/\.\s+/g, ' ')       // "Name. " → "Name "
        .replace(/\s+\.\s+/g, ' ')    // " . " → " "
        .replace(/\.([A-Za-zÀ-ÿ])/g, ' $1')  // ".Nom" → " Nom"
        .replace(/([a-zéèê])(\d)/gi, '$1 $2')  // "Brasse0:01" → "Brasse 0:01"
        .replace(/\s+/g, ' ')
        .trim();

    // Retirer le point final
    text = text.replace(/\.\s*$/, '').trim();

    // Traiter "(bord)" comme nage assistée
    if (/\(bord\)/i.test(text) && !/(brasse|dos|libre|assist)/i.test(text)) {
        text = text.replace(/\(bord\)/i, 'Assisté');
    }

    // Extraire la nage (sans \b car accents mal gérés)
    var strokeMatch = text.match(SWIMMING_STROKE_REGEX);
    if (!strokeMatch) return null;

    var stroke = normalizeSwimmingStroke(strokeMatch[1]);

    // Extraire la distance (n'importe quelle distance en mètres : 25, 50, 100, 200...)
    var distRegex = /\b(\d{2,4})\s*(?:m[eè]tres?|m)\b/i;
    var distMatch = text.match(distRegex);
    if (!distMatch) return null;

    var distance = parseInt(distMatch[1]);
    if (!distance || distance <= 0) return null;

    // Extraire le temps
    var timeResult = parseSwimmingTime(text);

    // Retirer les parties épreuve/temps pour isoler club + nom
    var remaining = text;
    if (timeResult.timeStr) {
        remaining = remaining.replace(timeResult.timeStr, ' ');
    }
    // Retirer TOUTES les occurrences de la nage (parfois dupliquée) + variantes
    remaining = remaining.replace(new RegExp(strokeMatch[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), ' ');
    remaining = remaining.replace(SWIMMING_STROKE_REGEX_G, ' ');
    remaining = remaining.replace(distRegex, ' ');
    remaining = remaining.replace(/\(bord\)/gi, ' ');
    remaining = remaining.replace(/\bLent\b/i, ' ');
    // Retirer résidus numériques orphelins (temps partiellement nettoyés)
    remaining = remaining.replace(/\b\d{1,2}:\s*\d{1,2}[,.:]\s*\d{1,3}\b/g, ' ');
    remaining = remaining.replace(/\b\d{1,2}[:.]\d{2}[:.]\d{2}\b/g, ' ');
    remaining = remaining.replace(/\b\d{1,2}:\d{2}\b/g, ' ');
    remaining = remaining.replace(/[.,]+\s*/g, ' ');
    remaining = remaining.replace(/\s+/g, ' ').trim();

    // Extraire le club depuis la liste connue
    var club = '';
    var swimmerName = remaining;

    for (var i = 0; i < KNOWN_SWIMMING_CLUBS.length; i++) {
        var c = KNOWN_SWIMMING_CLUBS[i];
        var escaped = c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        var clubRegex = new RegExp('^' + escaped + '\\s*', 'i');
        if (clubRegex.test(remaining)) {
            club = c;
            swimmerName = remaining.replace(clubRegex, '').trim();
            break;
        }
    }

    // Nettoyer le nom du nageur
    swimmerName = swimmerName.replace(/^\s*[.,]\s*/, '').replace(/\s*[.,]\s*$/, '').trim();

    // Capitaliser proprement
    if (swimmerName) {
        swimmerName = swimmerName.split(' ').map(function(w) {
            if (!w) return '';
            return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
        }).join(' ');
    }

    return {
        club: club,
        swimmerName: swimmerName,
        distance: distance,
        stroke: stroke,
        timeMs: timeResult.timeMs,
        rawName: rawName
    };
}

// Matcher une entrée parsée à une épreuve
function matchEntryToEvent(entry, events) {
    // Épreuve forcée (via "Épreuve par défaut" quand la donnée manque)
    if (entry._eventId != null) {
        for (var f = 0; f < events.length; f++) {
            if (events[f].id === entry._eventId) return events[f];
        }
    }
    var aliases = SWIMMING_STROKE_ALIASES[entry.stroke] || [entry.stroke];
    for (var i = 0; i < events.length; i++) {
        var evtName = events[i].name.toLowerCase().replace(/\s+/g, ' ');
        var hasDistance = evtName.indexOf(entry.distance + 'm') !== -1 || evtName.indexOf(entry.distance + ' m') !== -1;
        if (!hasDistance) continue;

        // Vérifier la nage (tolérant : accepte les alias/synonymes)
        var strokeOk = aliases.some(function(a) { return evtName.indexOf(a) !== -1; });
        if (strokeOk) {
            return events[i];
        }
    }
    return null;
}

// Formater ms en texte lisible pour l'aperçu
function formatSwimmingTimePreview(ms) {
    if (!ms || ms <= 0) return 'Pas de temps';
    var totalSec = ms / 1000;
    var min = Math.floor(totalSec / 60);
    var sec = totalSec % 60;
    if (min > 0) {
        return min + ':' + (sec < 10 ? '0' : '') + sec.toFixed(2);
    }
    return sec.toFixed(2) + 's';
}

// Fonction principale : générer les séries natation depuis les joueurs d'une journée source.
// preParsed (optionnel) : tableau d'entrées déjà parsées (mode colonnes via la modale).
window.generateSwimmingSeries = function(dayNumber, sourceDayNumber, lanesPerSerie, preParsed) {
    lanesPerSerie = lanesPerSerie || 5;

    var dayData = championship.days[dayNumber];
    if (!dayData || dayData.dayType !== 'chrono' || !dayData.chronoData) {
        showNotification('La journée ' + dayNumber + ' n\'est pas en mode chrono', 'error');
        return null;
    }

    // Récupérer les joueurs source
    var srcDay = championship.days[sourceDayNumber];
    if (!srcDay) {
        showNotification('Journée source ' + sourceDayNumber + ' introuvable', 'error');
        return null;
    }

    // Parser toutes les entrées (ou réutiliser celles déjà parsées par la modale)
    var parsed = [];
    var errors = [];
    if (Array.isArray(preParsed)) {
        parsed = preParsed;
    } else {
        var sourcePlayers = [];
        var numDiv = championship.config && championship.config.numberOfDivisions ? championship.config.numberOfDivisions : 3;
        for (var div = 1; div <= numDiv; div++) {
            if (srcDay.players && srcDay.players[div]) {
                sourcePlayers = sourcePlayers.concat(srcDay.players[div]);
            }
        }

        if (sourcePlayers.length === 0) {
            showNotification('Aucun joueur dans la journée ' + sourceDayNumber, 'error');
            return null;
        }

        sourcePlayers.forEach(function(p) {
            var name = typeof p === 'string' ? p : p.name;
            if (!name) return;
            var entry = parseSwimmingEntry(name);
            if (entry) {
                parsed.push(entry);
            } else {
                errors.push(name);
            }
        });
    }

    if (parsed.length === 0) {
        showNotification('Aucune entrée n\'a pu être parsée', 'error');
        return null;
    }

    // Grouper par épreuve
    var events = dayData.chronoData.events;
    var eventGroups = {};
    events.forEach(function(evt) { eventGroups[evt.id] = []; });

    var unmatched = [];
    parsed.forEach(function(entry) {
        var evt = matchEntryToEvent(entry, events);
        if (evt) {
            eventGroups[evt.id].push(entry);
        } else {
            unmatched.push(entry);
        }
    });

    // Ordres de couloirs (le plus rapide au milieu) — constante partagée
    var laneOrder = getSwimmingLaneOrder(lanesPerSerie);

    // Créer les séries pour chaque épreuve
    var nextSerieId = dayData.chronoData.nextSerieId || 1;
    var nextParticipantId = dayData.chronoData.nextParticipantId || 1;
    var allParticipants = [];
    var totalSeries = 0;

    // Compteur de dossards continu : repartir du plus grand dossard déjà attribué
    // pour éviter les collisions entre épreuves/journées lors des régénérations.
    var bibCounter = 1;
    if (dayData.chronoData.participants && dayData.chronoData.participants.length > 0) {
        dayData.chronoData.participants.forEach(function(p) {
            if (p && typeof p.bib === 'number' && p.bib >= bibCounter) bibCounter = p.bib + 1;
        });
    }

    events.forEach(function(evt) {
        var entries = eventGroups[evt.id];
        // Réinitialiser les séries de TOUTES les épreuves ciblées (même vides),
        // pour ne pas laisser d'anciennes séries traîner lors d'une régénération.
        if (!entries || entries.length === 0) {
            evt.series = [];
            return;
        }

        // Trier : avec temps d'abord (ASC), puis sans temps
        var withTime = entries.filter(function(e) { return e.timeMs > 0; })
            .sort(function(a, b) { return a.timeMs - b.timeMs; });
        var withoutTime = entries.filter(function(e) { return e.timeMs <= 0; });
        var sorted = withTime.concat(withoutTime);

        // Activer le mode couloir sur l'épreuve et réinitialiser les séries
        evt.laneMode = true;
        evt.series = [];

        // Créer les séries
        for (var i = 0; i < sorted.length; i += lanesPerSerie) {
            var batch = sorted.slice(i, i + lanesPerSerie);
            var serieNum = Math.floor(i / lanesPerSerie) + 1;

            var participants = batch.map(function(entry, idx) {
                var pid = nextParticipantId++;
                var bib = bibCounter++;
                var lane = idx < laneOrder.length ? laneOrder[idx] : (idx + 1);
                // Nom de repli si la donnée est absente (listes sans noms)
                var displayName = (entry.swimmerName && entry.swimmerName.trim())
                    ? entry.swimmerName : ('Nageur ' + bib);

                // Ajouter à la liste globale
                allParticipants.push({
                    id: pid,
                    name: displayName,
                    bib: bib,
                    club: entry.club,
                    category: '',
                    totalTime: null,
                    laps: 0
                });

                return {
                    id: pid,
                    bib: bib,
                    name: displayName,
                    category: '',
                    club: entry.club,
                    laps: [],
                    status: 'ready',
                    totalTime: 0,
                    totalDistance: 0,
                    bestLap: null,
                    finishTime: null,
                    lastLapStartTime: 0,
                    laneNumber: lane
                };
            });

            evt.series.push({
                id: nextSerieId++,
                name: 'Série ' + serieNum,
                eventId: evt.id,
                sportType: evt.sportType || 'swimming',
                distance: evt.distance || 0,
                raceType: evt.raceType || 'individual',
                relayDuration: null,
                participants: participants,
                status: 'pending',
                startTime: null,
                isRunning: false,
                timerInterval: null,
                currentTime: 0,
                laneMode: true
            });
            totalSeries++;
        }
    });

    dayData.chronoData.participants = allParticipants;
    dayData.chronoData.nextSerieId = nextSerieId;
    dayData.chronoData.nextParticipantId = nextParticipantId;

    saveToLocalStorage();

    var msg = '🏊 Import natation: ' + parsed.length + ' nageurs → ' + totalSeries + ' séries';
    if (errors.length > 0) msg += ' (' + errors.length + ' non parsés)';
    if (unmatched.length > 0) msg += ' (' + unmatched.length + ' sans épreuve)';
    showNotification(msg, 'success');

    console.log('Import natation terminé:', {
        parsed: parsed.length,
        errors: errors,
        unmatched: unmatched,
        totalSeries: totalSeries
    });

    return { parsed: parsed, errors: errors, unmatched: unmatched, totalSeries: totalSeries };
};

// Modale d'import natation avec aperçu
window.showSwimmingImportModal = function(dayNumber) {
    // Trouver les journées sources disponibles (non-chrono avec des joueurs)
    var sourceDays = [];
    // Trouver les journées chrono de destination (avec des épreuves)
    var chronoDays = [];
    for (var d in championship.days) {
        if (championship.days.hasOwnProperty(d)) {
            var dd = championship.days[d];
            if (dd.dayType !== 'chrono') {
                var count = 0;
                var numDiv = championship.config && championship.config.numberOfDivisions ? championship.config.numberOfDivisions : 3;
                for (var div = 1; div <= numDiv; div++) {
                    if (dd.players && dd.players[div]) count += dd.players[div].length;
                }
                if (count > 0) {
                    sourceDays.push({ day: d, count: count });
                }
            } else if (dd.chronoData && dd.chronoData.events && dd.chronoData.events.length > 0) {
                chronoDays.push({ day: d, events: dd.chronoData.events });
            }
        }
    }

    if (sourceDays.length === 0) {
        showNotification('Aucune journée source avec des joueurs trouvée', 'warning');
        return;
    }

    // Si la journée courante est chrono avec épreuves, l'utiliser comme destination
    // Sinon, chercher une journée chrono disponible
    var targetDay = dayNumber;
    var currentDay = championship.days[dayNumber];
    if (!currentDay || currentDay.dayType !== 'chrono' || !currentDay.chronoData || !currentDay.chronoData.events || currentDay.chronoData.events.length === 0) {
        if (chronoDays.length > 0) {
            targetDay = parseInt(chronoDays[0].day);
        } else {
            showNotification('Aucune journée chrono avec des épreuves configurées trouvée', 'warning');
            return;
        }
    }

    var events = championship.days[targetDay].chronoData.events;
    // Stocker le targetDay pour l'utiliser dans les callbacks
    dayNumber = targetDay;

    var modal = document.createElement('div');
    modal.id = 'swimmingImportModal';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 10000;';

    var sourceDayOptions = sourceDays.map(function(sd) {
        return '<option value="' + sd.day + '">Journée ' + sd.day + ' (' + sd.count + ' entrées)</option>';
    }).join('');

    var chronoDayOptions = chronoDays.map(function(cd) {
        return '<option value="' + cd.day + '"' + (parseInt(cd.day) === targetDay ? ' selected' : '') + '>Journée ' + cd.day + ' (' + cd.events.length + ' épreuves)</option>';
    }).join('');

    var eventsListHtml = events.map(function(e) {
        return '<span style="display:inline-block;padding:3px 8px;margin:2px;background:#e8f4f8;border-radius:4px;font-size:11px;">' + e.name + '</span>';
    }).join('');

    var defaultEventOptions = '<option value="">(déduire des données)</option>' + events.map(function(e) {
        return '<option value="' + e.id + '">' + e.name + '</option>';
    }).join('');

    modal.innerHTML = '\
        <div style="background: white; padding: 20px; border-radius: 8px; max-width: 600px; width: 95%; max-height: 85vh; overflow-y: auto;">\
            <h3 style="margin: 0 0 15px 0; color: #16a085; font-size: 16px;">🏊 Import natation → Séries par couloirs</h3>\
            <div style="margin-bottom: 12px;">\
                <label style="display: block; margin-bottom: 5px; font-size: 13px; color: #555; font-weight: 600;">Journée source (avec noms bruts) :</label>\
                <select id="swimSourceDay" onchange="renderSwimmingColumnMapping()" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px;">' + sourceDayOptions + '</select>\
            </div>\
            <div style="margin-bottom: 12px;">\
                <label style="display: block; margin-bottom: 5px; font-size: 13px; color: #555; font-weight: 600;">Journée destination (chrono avec épreuves) :</label>\
                <select id="swimTargetDay" onchange="updateSwimmingEventsPreview()" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px;">' + chronoDayOptions + '</select>\
            </div>\
            <div style="margin-bottom: 12px;">\
                <label style="display: block; margin-bottom: 5px; font-size: 13px; color: #555; font-weight: 600;">Nageurs par série (couloirs) :</label>\
                <select id="swimLanesPerSerie" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px;">\
                    <option value="3">3 couloirs</option>\
                    <option value="4">4 couloirs</option>\
                    <option value="5" selected>5 couloirs</option>\
                    <option value="6">6 couloirs</option>\
                    <option value="7">7 couloirs</option>\
                    <option value="8">8 couloirs</option>\
                    <option value="9">9 couloirs</option>\
                    <option value="10">10 couloirs</option>\
                </select>\
            </div>\
            <div style="margin-bottom: 12px;">\
                <label style="display: block; margin-bottom: 5px; font-size: 13px; color: #555; font-weight: 600;">Épreuve par défaut <span style="font-weight:400;color:#888;">(si distance/nage absentes des données)</span> :</label>\
                <select id="swimDefaultEvent" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px;">' + defaultEventOptions + '</select>\
            </div>\
            <div style="margin-bottom: 12px; padding: 10px; background: #f0fbf9; border: 1px solid #cdeae4; border-radius: 6px;">\
                <label style="display: block; margin-bottom: 5px; font-size: 13px; color: #16a085; font-weight: 600;">📋 Séparateur de colonnes (façon Excel) :</label>\
                <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">\
                    <select id="swimSeparator" onchange="renderSwimmingColumnMapping()" style="flex:1; min-width:180px; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px;">\
                        <option value="auto" selected>Automatique (ligne entière, détection intelligente)</option>\
                        <option value="tab">Tabulation</option>\
                        <option value=";">Point-virgule ( ; )</option>\
                        <option value=",">Virgule ( , )</option>\
                        <option value="-">Tiret ( - )</option>\
                        <option value="|">Barre verticale ( | )</option>\
                        <option value="space">Espace</option>\
                        <option value="custom">Personnalisé…</option>\
                    </select>\
                    <input type="text" id="swimSeparatorCustom" oninput="renderSwimmingColumnMapping()" placeholder="séparateur" maxlength="3" style="display:none; width:90px; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px;">\
                </div>\
                <div id="swimColumnMapping" style="display:none; margin-top:10px;"></div>\
            </div>\
            <div style="margin-bottom: 12px;">\
                <label style="display: block; margin-bottom: 5px; font-size: 13px; color: #555; font-weight: 600;">Épreuves cibles (<span id="swimEventsDayLabel">J' + dayNumber + '</span>) :</label>\
                <div id="swimEventsPreview">' + eventsListHtml + '</div>\
            </div>\
            <div id="swimPreviewContainer" style="margin-bottom: 12px; display: none;">\
                <label style="display: block; margin-bottom: 5px; font-size: 13px; color: #555; font-weight: 600;">Aperçu :</label>\
                <div id="swimPreviewContent" style="max-height: 300px; overflow-y: auto; border: 1px solid #e0e0e0; border-radius: 4px; padding: 10px; font-size: 12px; background: #fafafa;"></div>\
            </div>\
            <div style="display: flex; gap: 10px; justify-content: flex-end; position: sticky; bottom: 0; background: white; padding-top: 10px;">\
                <button onclick="document.getElementById(\'swimmingImportModal\').remove()" style="padding: 8px 15px; border: 1px solid #ddd; background: #f5f5f5; border-radius: 4px; cursor: pointer; font-size: 13px;">Annuler</button>\
                <button onclick="previewSwimmingImport(' + dayNumber + ')" style="padding: 8px 15px; border: none; background: #3498db; color: white; border-radius: 4px; cursor: pointer; font-size: 13px;">👁️ Aperçu</button>\
                <button onclick="confirmSwimmingImport(' + dayNumber + ')" style="padding: 8px 15px; border: none; background: #16a085; color: white; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: 600;">🏊 Générer séries</button>\
            </div>\
        </div>';

    document.body.appendChild(modal);
};

// Rafraîchir la liste des épreuves cibles quand la journée destination change
window.updateSwimmingEventsPreview = function() {
    var sel = document.getElementById('swimTargetDay');
    var previewDiv = document.getElementById('swimEventsPreview');
    var dayLabel = document.getElementById('swimEventsDayLabel');
    if (!sel || !previewDiv) return;

    var targetDay = parseInt(sel.value);
    var dd = championship.days[targetDay];
    var events = (dd && dd.chronoData && dd.chronoData.events) ? dd.chronoData.events : [];

    if (dayLabel) dayLabel.textContent = 'J' + targetDay;
    previewDiv.innerHTML = events.length > 0
        ? events.map(function(e) {
            return '<span style="display:inline-block;padding:3px 8px;margin:2px;background:#e8f4f8;border-radius:4px;font-size:11px;">' + e.name + '</span>';
        }).join('')
        : '<span style="font-size:11px;color:#e74c3c;">Aucune épreuve configurée sur cette journée</span>';

    // Repeupler le sélecteur d'épreuve par défaut (en conservant le choix si possible)
    var defSel = document.getElementById('swimDefaultEvent');
    if (defSel) {
        var prev = defSel.value;
        defSel.innerHTML = '<option value="">(déduire des données)</option>' + events.map(function(e) {
            return '<option value="' + e.id + '">' + e.name + '</option>';
        }).join('');
        if (events.some(function(e) { return String(e.id) === prev; })) defSel.value = prev;
    }

    // Masquer un ancien aperçu devenu obsolète (il pointait sur l'autre journée)
    var previewContainer = document.getElementById('swimPreviewContainer');
    if (previewContainer) previewContainer.style.display = 'none';
};

// --- Import "façon Excel" : séparateur + mapping de colonnes -----------------

// Caractère séparateur choisi, ou null pour le mode "ligne entière" (parser auto)
function getSwimmingSeparatorChar() {
    var sel = document.getElementById('swimSeparator');
    if (!sel) return null;
    var v = sel.value;
    if (v === 'auto') return null;
    if (v === 'tab') return '\t';
    if (v === 'space') return ' ';
    if (v === 'custom') {
        var c = document.getElementById('swimSeparatorCustom');
        return (c && c.value) ? c.value : null;
    }
    return v; // ';', ',', '-', '|'
}

// Découper une ligne en colonnes selon le séparateur
function splitSwimmingLine(line, sep) {
    if (sep === ' ') {
        return line.trim().split(/\s+/).map(function(s) { return s.trim(); }).filter(Boolean);
    }
    return String(line).split(sep).map(function(s) { return s.trim(); });
}

// Récupérer les lignes brutes de la journée source
function getSwimmingSourceLines(sourceDayNumber) {
    var lines = [];
    var srcDay = championship.days[sourceDayNumber];
    if (!srcDay) return lines;
    var numDiv = championship.config && championship.config.numberOfDivisions ? championship.config.numberOfDivisions : 3;
    for (var div = 1; div <= numDiv; div++) {
        if (srcDay.players && srcDay.players[div]) {
            srcDay.players[div].forEach(function(p) {
                var name = typeof p === 'string' ? p : (p && p.name);
                if (name) lines.push(name);
            });
        }
    }
    return lines;
}

// Vrai si la valeur commence par un club connu
function looksLikeKnownClub(v) {
    if (!v) return false;
    for (var i = 0; i < KNOWN_SWIMMING_CLUBS.length; i++) {
        var escaped = KNOWN_SWIMMING_CLUBS[i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (new RegExp('^' + escaped, 'i').test(v)) return true;
    }
    return false;
}

// Deviner le rôle d'une colonne à partir d'échantillons de valeurs
function guessSwimmingColumnRole(samples, colIndex) {
    var timeHits = 0, eventHits = 0, strokeHits = 0, distHits = 0, clubHits = 0, n = 0;
    var distRe = /\b\d{2,4}\s*(?:m[eè]tres?|m)\b/i;
    var distOnlyRe = /^\d{2,4}\s*(?:m[eè]tres?|m)?$/i; // colonne distance "nue" : 50, 100, 50m...
    samples.forEach(function(v) {
        if (!v) return;
        n++;
        if (parseSwimmingTime(v).timeMs > 0) timeHits++;
        var hasStroke = SWIMMING_STROKE_REGEX.test(v);
        var hasDist = distRe.test(v) || distOnlyRe.test(v);
        if (hasStroke && distRe.test(v)) eventHits++;
        else if (hasStroke) strokeHits++;
        else if (hasDist) distHits++;
        if (looksLikeKnownClub(v)) clubHits++;
    });
    if (n === 0) return 'ignore';
    if (timeHits / n > 0.5) return 'time';
    if (eventHits / n > 0.4) return 'event';
    if (strokeHits / n > 0.5) return 'stroke';
    if (distHits / n > 0.5) return 'distance';
    if (clubHits / n > 0.4) return 'club';
    if (colIndex === 0) return 'club';
    return 'name';
}

var SWIMMING_COLUMN_ROLES = [
    ['ignore', '— (ignorer)'],
    ['club', 'Club'],
    ['name', 'Nom'],
    ['event', 'Épreuve (distance + nage)'],
    ['distance', 'Distance'],
    ['stroke', 'Nage'],
    ['time', 'Temps']
];

function escapeSwimHtml(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Construire/rafraîchir le tableau de mapping des colonnes
window.renderSwimmingColumnMapping = function() {
    var sel = document.getElementById('swimSeparator');
    var customInput = document.getElementById('swimSeparatorCustom');
    var container = document.getElementById('swimColumnMapping');
    if (customInput) customInput.style.display = (sel && sel.value === 'custom') ? 'inline-block' : 'none';
    if (!container) return;

    var sepChar = getSwimmingSeparatorChar();
    if (sepChar === null) {
        container.style.display = 'none';
        container.innerHTML = '';
        return;
    }
    container.style.display = 'block';

    var srcSel = document.getElementById('swimSourceDay');
    var lines = srcSel ? getSwimmingSourceLines(parseInt(srcSel.value)) : [];
    if (lines.length === 0) {
        container.innerHTML = '<span style="font-size:11px;color:#e74c3c;">Aucune ligne dans la journée source</span>';
        return;
    }

    var rows = lines.map(function(l) { return splitSwimmingLine(l, sepChar); });
    var maxCols = rows.reduce(function(m, r) { return Math.max(m, r.length); }, 0);

    if (maxCols <= 1) {
        container.innerHTML = '<span style="font-size:11px;color:#e67e22;">⚠️ Ce séparateur ne découpe rien (une seule colonne). Vérifie le séparateur ou repasse en « Automatique ».</span>';
        return;
    }

    // Préserver les choix déjà faits par l'utilisateur
    var existing = {};
    for (var c = 0; c < maxCols; c++) {
        var s = document.getElementById('swimColRole' + c);
        if (s) existing[c] = s.value;
    }

    var html = '<div style="font-size:11px;color:#555;margin-bottom:6px;">Associe chaque colonne (« Nom » peut être coché sur plusieurs colonnes) :</div>';
    html += '<div style="overflow-x:auto;"><table style="border-collapse:collapse;font-size:11px;min-width:100%;">';
    // Ligne des sélecteurs de rôle
    html += '<tr>';
    for (var col = 0; col < maxCols; col++) {
        var samples = rows.slice(0, 12).map(function(r) { return r[col] || ''; });
        var role = existing[col] || guessSwimmingColumnRole(samples, col);
        var opts = SWIMMING_COLUMN_ROLES.map(function(o) {
            return '<option value="' + o[0] + '"' + (o[0] === role ? ' selected' : '') + '>' + o[1] + '</option>';
        }).join('');
        html += '<th style="border:1px solid #cdeae4;padding:3px;background:#e8f4f8;">' +
            '<select id="swimColRole' + col + '" style="font-size:11px;padding:2px;border:1px solid #ddd;border-radius:3px;">' + opts + '</select></th>';
    }
    html += '</tr>';
    // Aperçu des premières lignes
    rows.slice(0, 5).forEach(function(r) {
        html += '<tr>';
        for (var col2 = 0; col2 < maxCols; col2++) {
            html += '<td style="border:1px solid #e0e0e0;padding:3px 6px;white-space:nowrap;max-width:160px;overflow:hidden;text-overflow:ellipsis;">' +
                escapeSwimHtml(r[col2] || '') + '</td>';
        }
        html += '</tr>';
    });
    html += '</table></div>';
    container.innerHTML = html;
};

// Lire le mapping choisi → { role: colIndex(es) }
function readSwimmingColumnMapping() {
    var map = { name: [] };
    var c = 0;
    while (true) {
        var s = document.getElementById('swimColRole' + c);
        if (!s) break;
        var role = s.value;
        if (role === 'name') map.name.push(c);
        else if (role !== 'ignore' && map[role] == null) map[role] = c;
        c++;
    }
    return map;
}

// Déduire distance + nage depuis une épreuve cible (pour l'épreuve par défaut)
function deriveSwimmingEventInfo(evt) {
    if (!evt) return null;
    var name = evt.name || '';
    var dm = name.match(/\b(\d{2,4})\s*(?:m[eè]tres?|m)\b/i) || name.match(/(\d{2,4})/);
    var sm = name.match(SWIMMING_STROKE_REGEX);
    return {
        event: evt,
        distance: dm ? parseInt(dm[1]) : (evt.distance || 0),
        stroke: sm ? normalizeSwimmingStroke(sm[1]) : ''
    };
}

// Appliquer une épreuve par défaut quand distance/nage manquent, et forcer l'épreuve.
// Renvoie l'entrée complétée, ou null si toujours inexploitable.
function applySwimmingDefaultEvent(entry, def, raw) {
    var stroke = entry.stroke, distance = entry.distance, forcedEventId = null;
    if (def && (!stroke || !distance)) {
        if (!distance) distance = def.distance || 0;
        if (!stroke) stroke = def.stroke || '';
        forcedEventId = def.event.id;
    }
    // Sans épreuve forcée, il faut nage + distance pour matcher
    if (!forcedEventId && (!stroke || !distance)) return null;
    var out = {
        club: entry.club || '',
        swimmerName: entry.swimmerName || '',
        distance: distance,
        stroke: stroke,
        timeMs: entry.timeMs || 0,
        rawName: raw
    };
    if (forcedEventId != null) out._eventId = forcedEventId;
    return out;
}

// Construire une entrée natation depuis des colonnes déjà découpées
function buildSwimmingEntryFromColumns(cols, map, raw, def) {
    function col(i) { return (i != null && cols[i] != null) ? String(cols[i]).trim() : ''; }

    var club = map.club != null ? col(map.club) : '';
    var name = (map.name || []).map(col).filter(Boolean).join(' ').trim();

    var distance = 0, stroke = '';
    if (map.event != null) {
        var ev = col(map.event);
        var dm = ev.match(/\b(\d{2,4})\s*(?:m[eè]tres?|m)\b/i) || ev.match(/(\d{2,4})/);
        if (dm) distance = parseInt(dm[1]);
        var sm = ev.match(SWIMMING_STROKE_REGEX);
        if (sm) stroke = normalizeSwimmingStroke(sm[1]);
    }
    if (map.distance != null) {
        var d = col(map.distance).match(/(\d{2,4})/);
        if (d) distance = parseInt(d[1]);
    }
    if (map.stroke != null) {
        var sc = col(map.stroke);
        if (sc) stroke = normalizeSwimmingStroke(sc);
    }
    var timeMs = 0;
    if (map.time != null) timeMs = parseSwimmingTime(col(map.time)).timeMs;

    if (name) {
        name = name.split(/\s+/).map(function(w) {
            return w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : '';
        }).join(' ');
    }

    return applySwimmingDefaultEvent(
        { club: club, swimmerName: name, distance: distance, stroke: stroke, timeMs: timeMs },
        def, raw
    );
}

// Construire une entrée de repli depuis une ligne libre (mode auto + épreuve par défaut)
function buildSwimmingFallbackEntry(line, def) {
    if (!def) return null;
    var t = parseSwimmingTime(line);
    var remaining = line;
    if (t.timeStr) remaining = remaining.replace(t.timeStr, ' ');

    // Extraire un club connu en préfixe
    var club = '', rest = remaining;
    for (var i = 0; i < KNOWN_SWIMMING_CLUBS.length; i++) {
        var escaped = KNOWN_SWIMMING_CLUBS[i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        var re = new RegExp('^\\s*' + escaped + '\\s*', 'i');
        if (re.test(remaining)) { club = KNOWN_SWIMMING_CLUBS[i]; rest = remaining.replace(re, ''); break; }
    }

    // Nettoyer les résidus (séparateurs, chiffres de temps orphelins)
    rest = rest.replace(/\b\d{1,2}[:.,]\d{1,2}([:.,]\d{1,3})?\b/g, ' ')
               .replace(/[.,;|]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (rest) {
        rest = rest.split(/\s+/).map(function(w) {
            return w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : '';
        }).join(' ');
    }

    return applySwimmingDefaultEvent(
        { club: club, swimmerName: rest, distance: 0, stroke: '', timeMs: t.timeMs },
        def, line
    );
}

// Épreuve par défaut choisie dans la modale (ou null)
function getSwimmingDefaultEventInfo(targetDayNumber) {
    var sel = document.getElementById('swimDefaultEvent');
    if (!sel || !sel.value) return null;
    var dd = championship.days[targetDayNumber];
    var events = (dd && dd.chronoData && dd.chronoData.events) ? dd.chronoData.events : [];
    for (var i = 0; i < events.length; i++) {
        if (String(events[i].id) === String(sel.value)) return deriveSwimmingEventInfo(events[i]);
    }
    return null;
}

// Collecteur unifié : renvoie { parsed, errors } selon le mode (auto ou colonnes)
function collectSwimmingEntries(sourceDayNumber, defaultEvent) {
    var lines = getSwimmingSourceLines(sourceDayNumber);
    var sepChar = getSwimmingSeparatorChar();
    var parsed = [], errors = [];

    if (sepChar === null) {
        // Mode "ligne entière" : parser auto historique, avec repli sur l'épreuve par défaut
        lines.forEach(function(l) {
            var e = parseSwimmingEntry(l);
            if (!e && defaultEvent) e = buildSwimmingFallbackEntry(l, defaultEvent);
            else if (e && defaultEvent) e = applySwimmingDefaultEvent(e, defaultEvent, l);
            if (e) parsed.push(e); else errors.push(l);
        });
        return { parsed: parsed, errors: errors };
    }

    // Mode colonnes : utiliser le mapping choisi
    var map = readSwimmingColumnMapping();
    lines.forEach(function(l) {
        var cols = splitSwimmingLine(l, sepChar);
        var e = buildSwimmingEntryFromColumns(cols, map, l, defaultEvent);
        if (e) parsed.push(e); else errors.push(l);
    });
    return { parsed: parsed, errors: errors };
}

// Aperçu de l'import natation
window.previewSwimmingImport = function(dayNumber) {
    var sourceDayNumber = parseInt(document.getElementById('swimSourceDay').value);
    var targetDayNumber = parseInt(document.getElementById('swimTargetDay').value);
    var lanesPerSerie = parseInt(document.getElementById('swimLanesPerSerie').value);

    var srcDay = championship.days[sourceDayNumber];
    if (!srcDay) return;

    var events = championship.days[targetDayNumber].chronoData.events;

    // Parser (mode auto ou colonnes selon le séparateur choisi)
    var defaultEvent = getSwimmingDefaultEventInfo(targetDayNumber);
    var collected = collectSwimmingEntries(sourceDayNumber, defaultEvent);
    var parsed = collected.parsed;
    var errors = collected.errors;

    // Grouper par épreuve
    var eventGroups = {};
    events.forEach(function(evt) { eventGroups[evt.id] = { event: evt, entries: [] }; });
    var unmatched = [];
    parsed.forEach(function(entry) {
        var evt = matchEntryToEvent(entry, events);
        if (evt) { eventGroups[evt.id].entries.push(entry); } else { unmatched.push(entry); }
    });

    var laneOrder = getSwimmingLaneOrder(lanesPerSerie);

    // Générer l'aperçu HTML
    var html = '<div style="margin-bottom:8px;padding:6px;background:#d4edda;border-radius:4px;"><strong>✅ ' + parsed.length + ' entrées parsées</strong>';
    if (errors.length > 0) html += ' | <span style="color:#e74c3c;">❌ ' + errors.length + ' non parsées</span>';
    if (unmatched.length > 0) html += ' | <span style="color:#f39c12;">⚠️ ' + unmatched.length + ' sans épreuve</span>';
    html += '</div>';

    events.forEach(function(evt) {
        var group = eventGroups[evt.id];
        if (!group || group.entries.length === 0) {
            html += '<div style="margin:6px 0;padding:6px;background:#fff3cd;border-radius:4px;font-size:11px;">⚠️ <strong>' + evt.name + '</strong> — aucun nageur</div>';
            return;
        }

        var withTime = group.entries.filter(function(e) { return e.timeMs > 0; }).sort(function(a,b) { return a.timeMs - b.timeMs; });
        var withoutTime = group.entries.filter(function(e) { return e.timeMs <= 0; });
        var sorted = withTime.concat(withoutTime);
        var nbSeries = Math.ceil(sorted.length / lanesPerSerie);

        html += '<div style="margin:8px 0;padding:8px;background:#e8f4f8;border-radius:4px;border-left:3px solid #16a085;">';
        html += '<strong>🎯 ' + evt.name + '</strong> — ' + sorted.length + ' nageurs → ' + nbSeries + ' série(s)';

        for (var i = 0; i < sorted.length; i += lanesPerSerie) {
            var batch = sorted.slice(i, i + lanesPerSerie);
            var serieNum = Math.floor(i / lanesPerSerie) + 1;
            html += '<div style="margin:4px 0 0 10px;font-size:11px;"><em>Série ' + serieNum + ':</em> ';
            var parts = batch.map(function(e, idx) {
                var lane = laneOrder[idx] || (idx + 1);
                var timeStr = e.timeMs > 0 ? formatSwimmingTimePreview(e.timeMs) : '?';
                return 'C' + lane + ': ' + e.swimmerName + ' (' + timeStr + ')';
            });
            html += parts.join(' | ');
            html += '</div>';
        }
        html += '</div>';
    });

    if (errors.length > 0) {
        html += '<div style="margin:8px 0;padding:6px;background:#f8d7da;border-radius:4px;font-size:11px;">';
        html += '<strong>❌ Non parsées :</strong><br>';
        html += errors.map(function(e) { return '• ' + e; }).join('<br>');
        html += '</div>';
    }

    if (unmatched.length > 0) {
        html += '<div style="margin:8px 0;padding:6px;background:#fff3cd;border-radius:4px;font-size:11px;">';
        html += '<strong>⚠️ Sans épreuve correspondante :</strong><br>';
        html += unmatched.map(function(e) { return '• ' + e.swimmerName + ' (' + e.distance + 'm ' + e.stroke + ')'; }).join('<br>');
        html += '</div>';
    }

    document.getElementById('swimPreviewContainer').style.display = 'block';
    document.getElementById('swimPreviewContent').innerHTML = html;
};

// Confirmer et générer les séries
window.confirmSwimmingImport = function(dayNumber) {
    var sourceDayNumber = parseInt(document.getElementById('swimSourceDay').value);
    var targetDayNumber = parseInt(document.getElementById('swimTargetDay').value);
    var lanesPerSerie = parseInt(document.getElementById('swimLanesPerSerie').value);

    // Collecter les entrées selon le mode choisi (auto ou colonnes façon Excel)
    var defaultEvent = getSwimmingDefaultEventInfo(targetDayNumber);
    var collected = collectSwimmingEntries(sourceDayNumber, defaultEvent);
    if (collected.parsed.length === 0) {
        showNotification('Aucune entrée n\'a pu être parsée avec ce séparateur/mapping', 'error');
        return;
    }

    var result = window.generateSwimmingSeries(targetDayNumber, sourceDayNumber, lanesPerSerie, collected.parsed);
    if (result) {
        document.getElementById('swimmingImportModal').remove();
        // Rafraîchir l'affichage chrono
        if (typeof refreshChronoDisplay === 'function') {
            refreshChronoDisplay(targetDayNumber);
        }
    }
};

})(window);
