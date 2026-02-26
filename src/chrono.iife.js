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

// Toggle Mode Chrono
window.toggleChronoMode = function() {
    const checkbox = document.getElementById('chronoModeCheckbox');
    const chronoSection = document.getElementById('chronoModeSection');
    const dayContent = document.querySelector('.day-content.active');
    const divisionConfigContainer = document.getElementById('divisionConfigContainer');
    const courtConfigContainer = document.getElementById('courtConfigContainer');
    const courtAssignmentInfo = document.getElementById('courtAssignmentInfo');
    const applyConfigBtn = document.getElementById('applyConfigBtn');
    const tabsContainer = document.getElementById('tabsContainer');

    if (checkbox.checked) {
        // MODE CHRONO ACTIVÉ
        // Charger les données chrono depuis localStorage au premier affichage
        loadChronoFromLocalStorage();
        chronoSection.style.display = 'block';
        if (dayContent) dayContent.style.display = 'none';

        // Masquer les options Divisions et Terrains (non pertinentes en mode chrono)
        if (divisionConfigContainer) divisionConfigContainer.style.display = 'none';
        if (courtConfigContainer) courtConfigContainer.style.display = 'none';
        if (courtAssignmentInfo) courtAssignmentInfo.style.display = 'none';
        if (applyConfigBtn) applyConfigBtn.style.display = 'none';

        // Masquer les onglets J1 et Classement Général
        if (tabsContainer) tabsContainer.style.display = 'none';

        displayEventsList();
        displayParticipantsList();

        // Vérifier s'il y a un chrono en cours et l'ouvrir automatiquement
        const runningSerie = raceData.series.find(s => s.isRunning);
        if (runningSerie) {
            showNotification(`⚠️ Chrono "${runningSerie.name}" en cours - Reprise automatique`, 'warning');
            setTimeout(() => {
                continueSerie(runningSerie.id);
            }, 500);
        }
    } else {
        // MODE CHAMPIONNAT
        chronoSection.style.display = 'none';
        if (dayContent) dayContent.style.display = 'block';

        // Réafficher les options Divisions et Terrains
        if (divisionConfigContainer) divisionConfigContainer.style.display = 'flex';
        if (courtConfigContainer) courtConfigContainer.style.display = 'flex';
        if (courtAssignmentInfo) courtAssignmentInfo.style.display = 'block';
        if (applyConfigBtn) applyConfigBtn.style.display = 'block';

        // Réafficher les onglets
        if (tabsContainer) tabsContainer.style.display = 'block';
    }
};

// Afficher la liste des séries
function displaySeriesList() {
    const seriesList = document.getElementById('seriesList');
    const noSeriesMessage = document.getElementById('noSeriesMessage');

    if (raceData.series.length === 0) {
        seriesList.style.display = 'none';
        noSeriesMessage.style.display = 'block';
        return;
    }

    seriesList.style.display = 'grid';
    noSeriesMessage.style.display = 'none';

    const sportEmoji = {
        running: '🏃',
        cycling: '🚴',
        swimming: '🏊'
    };

    seriesList.innerHTML = raceData.series.map(serie => {
        const statusColor = serie.status === 'completed' ? '#27ae60' :
                           serie.status === 'running' ? '#3498db' : '#95a5a6';
        const statusText = serie.status === 'completed' ? '✅ Terminée' :
                          serie.status === 'running' ? '▶️ En cours' : '⏸️ En attente';

        return `
            <div style="border: 2px solid ${statusColor}; border-radius: 10px; padding: 15px; background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.1); transition: all 0.3s ease;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                    <div>
                        <h4 style="margin: 0 0 5px 0; color: #2c3e50;">
                            ${sportEmoji[serie.sportType]} ${serie.name}
                        </h4>
                        <div style="display: flex; gap: 15px; flex-wrap: wrap; font-size: 13px; color: #7f8c8d;">
                            <span>📏 ${serie.distance}m</span>
                            <span>👥 ${serie.participants.length} participants</span>
                            ${serie.raceType === 'relay' ? `<span>⏰ ${serie.relayDuration} min</span>` : ''}
                        </div>
                    </div>
                    <span style="background: ${statusColor}; color: white; padding: 5px 10px; border-radius: 5px; font-size: 12px; white-space: nowrap;">
                        ${statusText}
                    </span>
                </div>

                <div style="display: flex; gap: 10px; margin-top: 15px; flex-wrap: wrap;">
                    ${serie.status === 'pending' ? `
                        <button class="btn btn-success" onclick="startSerie(${serie.id})" style="flex: 1; min-width: 120px;">
                            ▶️ Lancer
                        </button>
                        <button class="btn" onclick="editSerie(${serie.id})" style="background: #3498db; flex: 1; min-width: 120px;">
                            ✏️ Modifier
                        </button>
                        <button class="btn btn-danger" onclick="deleteSerie(${serie.id})" style="flex: 1; min-width: 120px;">
                            🗑️ Supprimer
                        </button>
                    ` : serie.status === 'running' ? `
                        <button class="btn" onclick="continueSerie(${serie.id})" style="background: #3498db; flex: 1;">
                            📊 Gérer
                        </button>
                    ` : `
                        <button class="btn" onclick="viewSerieResults(${serie.id})" style="background: #27ae60; flex: 1;">
                            🏆 Résultats
                        </button>
                        <button class="btn" onclick="editSerie(${serie.id})" style="background: #3498db; flex: 1; min-width: 120px;">
                            ✏️ Modifier
                        </button>
                        <button class="btn btn-danger" onclick="deleteSerie(${serie.id})" style="flex: 1; min-width: 120px;">
                            🗑️ Supprimer
                        </button>
                    `}
                </div>
            </div>
        `;
    }).join('');
}

// Gestion des participants du mode chrono
window.showParticipantsManager = function() {
    displayParticipantsList();
    document.getElementById('participantsManagerModal').style.display = 'block';
};

window.closeParticipantsManager = function() {
    document.getElementById('participantsManagerModal').style.display = 'none';
};

window.addParticipantToChrono = function() {
    const name = document.getElementById('participantName').value.trim();
    const category = document.getElementById('participantCategory').value.trim();
    let bib = document.getElementById('participantBib').value.trim();
    const age = document.getElementById('participantAge').value.trim();
    const nationality = document.getElementById('participantNationality').value.trim();
    const club = document.getElementById('participantClub').value.trim();

    if (!name) {
        showNotification('Veuillez entrer un nom ou une équipe', 'warning');
        return;
    }

    // Générer un dossard automatique si non fourni
    if (!bib) {
        const existingBibs = raceData.participants.map(p => parseInt(p.bib) || 0);
        const maxBib = existingBibs.length > 0 ? Math.max(...existingBibs) : 0;
        bib = String(maxBib + 1);
    }

    // Vérifier si le dossard existe déjà
    const existingBib = raceData.participants.find(p => p.bib === bib);
    if (existingBib) {
        showNotification('Ce numéro de dossard est déjà utilisé', 'error');
        return;
    }

    const participant = {
        id: raceData.nextParticipantId++,
        name: name,
        category: category || '',  // Catégorie optionnelle
        bib: bib,
        age: age || null,
        nationality: nationality || null,
        club: club || null
    };

    raceData.participants.push(participant);

    // Réinitialiser le formulaire
    document.getElementById('participantName').value = '';
    document.getElementById('participantCategory').value = '';
    document.getElementById('participantBib').value = '';
    document.getElementById('participantAge').value = '';
    document.getElementById('participantNationality').value = '';
    document.getElementById('participantClub').value = '';

    displayParticipantsList();
    saveChronoToLocalStorage();
    showNotification('Participant ajouté avec succès', 'success');
};

function displayParticipantsList() {
    const participantsList = document.getElementById('participantsList');

    if (raceData.participants.length === 0) {
        participantsList.innerHTML = '<p style="color: #7f8c8d; text-align: center; padding: 20px;">Aucun participant ajouté.</p>';
        return;
    }

    // Trier par dossard
    const sortedParticipants = [...raceData.participants].sort((a, b) => {
        const bibA = parseInt(a.bib) || a.bib;
        const bibB = parseInt(b.bib) || b.bib;
        if (typeof bibA === 'number' && typeof bibB === 'number') {
            return bibA - bibB;
        }
        return String(a.bib).localeCompare(String(b.bib));
    });

    participantsList.innerHTML = `
        <div style="display: grid; gap: 10px;">
            ${sortedParticipants.map(participant => {
                // Construire les infos supplémentaires
                const extraInfo = [];
                if (participant.age) extraInfo.push(`🎂 ${participant.age} ans`);
                if (participant.nationality) extraInfo.push(`🌍 ${participant.nationality}`);
                if (participant.club) extraInfo.push(`🏅 ${participant.club}`);

                return `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; background: #f8f9fa; border-radius: 8px; border: 2px solid #ddd; transition: all 0.3s;">
                    <div style="display: flex; gap: 20px; align-items: center; flex: 1;">
                        <div style="background: linear-gradient(135deg, #16a085, #1abc9c); color: white; padding: 10px 15px; border-radius: 8px; font-weight: bold; min-width: 60px; text-align: center;">
                            ${participant.bib}
                        </div>
                        <div style="flex: 1;">
                            <div style="font-weight: bold; font-size: 16px; color: #2c3e50; margin-bottom: 5px;">
                                🏃 ${participant.name}
                            </div>
                            <div style="font-size: 14px; color: #7f8c8d; margin-bottom: 3px;">
                                📋 ${participant.category}
                            </div>
                            ${extraInfo.length > 0 ? `
                                <div style="font-size: 13px; color: #95a5a6; margin-top: 5px;">
                                    ${extraInfo.join(' • ')}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button class="btn" onclick="editParticipant(${participant.id})" style="background: #3498db; padding: 8px 15px;">
                            ✏️ Éditer
                        </button>
                        <button class="btn btn-danger" onclick="deleteParticipant(${participant.id})" style="padding: 8px 15px;">
                            🗑️
                        </button>
                    </div>
                </div>
            `}).join('')}
        </div>
    `;
}

window.editParticipant = function(id) {
    const participant = raceData.participants.find(p => p.id === id);
    if (!participant) return;

    raceData.editingParticipantId = id;
    document.getElementById('editParticipantName').value = participant.name;
    document.getElementById('editParticipantCategory').value = participant.category;
    document.getElementById('editParticipantBib').value = participant.bib;
    document.getElementById('editParticipantAge').value = participant.age || '';
    document.getElementById('editParticipantNationality').value = participant.nationality || '';
    document.getElementById('editParticipantClub').value = participant.club || '';

    document.getElementById('editParticipantModal').style.display = 'block';
};

window.closeEditParticipantModal = function() {
    document.getElementById('editParticipantModal').style.display = 'none';
    raceData.editingParticipantId = null;
};

window.saveParticipantEdit = function() {
    const name = document.getElementById('editParticipantName').value.trim();
    const category = document.getElementById('editParticipantCategory').value.trim();
    const bib = document.getElementById('editParticipantBib').value.trim();
    const age = document.getElementById('editParticipantAge').value.trim();
    const nationality = document.getElementById('editParticipantNationality').value.trim();
    const club = document.getElementById('editParticipantClub').value.trim();

    if (!name || !category || !bib) {
        showNotification('Les champs Nom, Catégorie et Dossard sont obligatoires', 'warning');
        return;
    }

    const participant = raceData.participants.find(p => p.id === raceData.editingParticipantId);
    if (!participant) return;

    // Vérifier si le dossard existe déjà (sauf pour le participant actuel)
    const existingBib = raceData.participants.find(p => p.bib === bib && p.id !== raceData.editingParticipantId);
    if (existingBib) {
        showNotification('Ce numéro de dossard est déjà utilisé', 'error');
        return;
    }

    participant.name = name;
    participant.category = category;
    participant.bib = bib;
    participant.age = age || null;
    participant.nationality = nationality || null;
    participant.club = club || null;

    displayParticipantsList();
    closeEditParticipantModal();
    saveChronoToLocalStorage();
    showNotification('Participant modifié avec succès', 'success');
};

window.deleteParticipant = function(id) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce participant ?')) {
        return;
    }

    const index = raceData.participants.findIndex(p => p.id === id);
    if (index !== -1) {
        raceData.participants.splice(index, 1);
        displayParticipantsList();
        saveChronoToLocalStorage();
        showNotification('Participant supprimé', 'success');
    }
};

// Ajout en masse de participants
let bulkParticipantsData = [];

window.showBulkParticipantsModal = function() {
    document.getElementById('bulkParticipantsText').value = '';
    document.getElementById('bulkParticipantsPreview').style.display = 'none';
    bulkParticipantsData = [];
    updateBulkImportFormat(); // Mettre à jour le format selon les colonnes sélectionnées
    document.getElementById('bulkParticipantsModal').style.display = 'block';
};

// Mettre à jour le format d'import selon les colonnes sélectionnées
window.updateBulkImportFormat = function() {
    const hasAge = document.getElementById('bulkCol_age').checked;
    const hasNationality = document.getElementById('bulkCol_nationality').checked;
    const hasClub = document.getElementById('bulkCol_club').checked;

    // Générer le HTML du format (seul le nom est obligatoire)
    const formatHTML = `
        <div style="margin-bottom: 8px; padding: 8px; background: #e8f6f3; border-radius: 5px;">
            <strong>Seul le nom est obligatoire</strong> - Dossard et catégorie sont optionnels
        </div>
        <div style="margin-bottom: 5px;"><strong>Format complet :</strong> Dossard*, Nom, Catégorie*${hasAge ? ', Âge' : ''}${hasNationality ? ', Nationalité' : ''}${hasClub ? ', Club' : ''}</div>
        <div style="margin-bottom: 5px; color: #7f8c8d;">Exemple: 42, Jean Dupont, Senior${hasAge ? ', 28' : ''}${hasNationality ? ', France' : ''}${hasClub ? ', AC Paris' : ''}</div>
        <div style="margin: 10px 0;"><strong>Format minimal :</strong> Nom</div>
        <div style="color: #7f8c8d;">Exemple: Jean Dupont</div>
        <div style="margin-top: 8px; font-size: 11px; color: #95a5a6;">* Si dossard non fourni = auto-généré | Si catégorie non fournie = vide</div>
    `;

    document.getElementById('bulkFormatExample').innerHTML = formatHTML;

    // Mettre à jour le placeholder du textarea
    document.getElementById('bulkParticipantsText').placeholder =
        `Format complet:\n42\tJean Dupont\tSenior${hasAge ? '\t28' : ''}${hasNationality ? '\tFrance' : ''}${hasClub ? '\tAC Paris' : ''}\n\nFormat minimal (nom seul):\nMarie Martin\nPierre Durand\nSophie Bernard`;
};

window.closeBulkParticipantsModal = function() {
    document.getElementById('bulkParticipantsModal').style.display = 'none';
    bulkParticipantsData = [];
};

window.previewBulkParticipants = function() {
    const text = document.getElementById('bulkParticipantsText').value.trim();

    if (!text) {
        showNotification('Veuillez coller des données', 'warning');
        return;
    }

    // Récupérer les colonnes sélectionnées
    const hasAge = document.getElementById('bulkCol_age').checked;
    const hasNationality = document.getElementById('bulkCol_nationality').checked;
    const hasClub = document.getElementById('bulkCol_club').checked;

    const expectedColumns = 3 + (hasAge ? 1 : 0) + (hasNationality ? 1 : 0) + (hasClub ? 1 : 0);

    const lines = text.split('\n').filter(line => line.trim());
    bulkParticipantsData = [];
    const errors = [];

    lines.forEach((line, index) => {
        const lineNum = index + 1;
        let parts;

        // Détecter le format (tabulation ou virgule)
        if (line.includes('\t')) {
            parts = line.split('\t').map(p => p.trim());
        } else if (line.includes(',')) {
            parts = line.split(',').map(p => p.trim());
        } else {
            // Essayer de split par espaces multiples
            parts = line.split(/\s{2,}/).map(p => p.trim());
        }

        // Filtrer les parties vides à la fin
        while (parts.length > 0 && !parts[parts.length - 1]) {
            parts.pop();
        }

        // Minimum 1 colonne : nom (dossard et catégorie optionnels)
        if (parts.length < 1 || !parts[0]) {
            errors.push(`Ligne ${lineNum}: format invalide (minimum: nom)`);
            return;
        }

        let bib, name, category, extraFields;

        // Détecter si le premier champ est un dossard (numérique) ou un nom
        const firstFieldIsNumeric = /^\d+$/.test(parts[0]);

        if (firstFieldIsNumeric && parts.length >= 2) {
            // Format avec dossard: dossard, nom, [catégorie], ...
            bib = parts[0];
            name = parts[1];
            category = parts[2] || '';  // Catégorie optionnelle
            extraFields = parts.slice(3);
        } else {
            // Format sans dossard: nom, [catégorie], ...
            bib = null; // Sera généré automatiquement
            name = parts[0];
            category = parts[1] || '';  // Catégorie optionnelle
            extraFields = parts.slice(2);
        }

        if (!name) {
            errors.push(`Ligne ${lineNum}: nom obligatoire`);
            return;
        }

        // Générer un dossard automatique si non fourni
        if (!bib) {
            // Trouver le plus grand dossard existant
            const existingBibs = [
                ...raceData.participants.map(p => parseInt(p.bib) || 0),
                ...bulkParticipantsData.map(p => parseInt(p.bib) || 0)
            ];
            const maxBib = existingBibs.length > 0 ? Math.max(...existingBibs) : 0;
            bib = String(maxBib + 1 + bulkParticipantsData.filter(p => !p.originalBib).length);
        }

        // Vérifier si le dossard existe déjà (seulement si fourni manuellement)
        const existingBib = raceData.participants.find(p => p.bib === bib);
        const duplicateBib = bulkParticipantsData.find(p => p.bib === bib);

        if (existingBib) {
            errors.push(`Ligne ${lineNum}: dossard ${bib} déjà utilisé`);
            return;
        }

        if (duplicateBib) {
            errors.push(`Ligne ${lineNum}: dossard ${bib} dupliqué dans l'import`);
            return;
        }

        // Construire l'objet participant avec les champs supplémentaires
        const participant = {
            bib: bib,
            name: name,
            category: category,
            age: null,
            nationality: null,
            club: null
        };

        // Parser les champs supplémentaires dans l'ordre
        let fieldIndex = 0;
        if (hasAge && extraFields[fieldIndex]) {
            participant.age = extraFields[fieldIndex];
            fieldIndex++;
        }
        if (hasNationality && extraFields[fieldIndex]) {
            participant.nationality = extraFields[fieldIndex];
            fieldIndex++;
        }
        if (hasClub && extraFields[fieldIndex]) {
            participant.club = extraFields[fieldIndex];
            fieldIndex++;
        }

        bulkParticipantsData.push(participant);
    });

    // Afficher l'aperçu
    const previewContent = document.getElementById('bulkParticipantsPreviewContent');
    const previewCount = document.getElementById('bulkPreviewCount');

    if (bulkParticipantsData.length === 0) {
        previewContent.innerHTML = '<p style="color: #e74c3c; font-weight: bold;">❌ Aucun participant valide trouvé</p>';
    } else {
        previewContent.innerHTML = `
            <div style="display: grid; gap: 8px;">
                ${bulkParticipantsData.map((p, i) => {
                    const extraInfo = [];
                    if (p.age) extraInfo.push(`🎂 ${p.age} ans`);
                    if (p.nationality) extraInfo.push(`🌍 ${p.nationality}`);
                    if (p.club) extraInfo.push(`🏅 ${p.club}`);

                    return `
                    <div style="display: flex; gap: 15px; padding: 10px; background: white; border-radius: 5px; border: 2px solid #27ae60;">
                        <div style="background: linear-gradient(135deg, #16a085, #1abc9c); color: white; padding: 5px 10px; border-radius: 5px; font-weight: bold; min-width: 50px; text-align: center;">
                            ${p.bib}
                        </div>
                        <div style="flex: 1;">
                            <div style="font-weight: bold;">${p.name}</div>
                            <div style="font-size: 12px; color: #7f8c8d;">${p.category}</div>
                            ${extraInfo.length > 0 ? `<div style="font-size: 11px; color: #95a5a6; margin-top: 3px;">${extraInfo.join(' • ')}</div>` : ''}
                        </div>
                    </div>
                `}).join('')}
            </div>
        `;
    }

    if (errors.length > 0) {
        previewContent.innerHTML += `
            <div style="margin-top: 15px; padding: 10px; background: #ffe6e6; border-radius: 5px; border: 2px solid #e74c3c;">
                <h5 style="color: #e74c3c; margin: 0 0 10px 0;">⚠️ Erreurs détectées (${errors.length}) :</h5>
                ${errors.map(err => `<div style="font-size: 12px; color: #c0392b; margin: 3px 0;">• ${err}</div>`).join('')}
            </div>
        `;
    }

    previewCount.textContent = bulkParticipantsData.length;
    document.getElementById('bulkParticipantsPreview').style.display = 'block';

    if (bulkParticipantsData.length > 0) {
        showNotification(`${bulkParticipantsData.length} participant(s) prêt(s) à être ajouté(s)`, 'success');
    }
};

window.saveBulkParticipants = function() {
    if (bulkParticipantsData.length === 0) {
        showNotification('Veuillez d\'abord prévisualiser les données', 'warning');
        return;
    }

    let addedCount = 0;
    bulkParticipantsData.forEach(participant => {
        raceData.participants.push({
            id: raceData.nextParticipantId++,
            name: participant.name,
            category: participant.category,
            bib: participant.bib,
            age: participant.age || null,
            nationality: participant.nationality || null,
            club: participant.club || null
        });
        addedCount++;
    });

    displayParticipantsList();
    closeBulkParticipantsModal();
    saveChronoToLocalStorage();
    showNotification(`${addedCount} participant(s) ajouté(s) avec succès`, 'success');
};

// ============================================
// GESTION DES ÉPREUVES
// ============================================

window.showAddEventModal = function() {
    raceData.editingEventId = null;
    document.getElementById('eventModalTitle').textContent = '🏅 Nouvelle Épreuve';

    // Réinitialiser le formulaire
    document.getElementById('eventName').value = '';
    document.getElementById('eventSportType').value = 'running';
    document.getElementById('eventDistance').value = '400';
    document.getElementById('eventRaceType').value = 'individual';
    document.getElementById('eventRelayDuration').value = '60';
    document.getElementById('eventRelayDurationSection').style.display = 'none';

    // Réinitialiser section interclub
    const interclubSection = document.getElementById('eventInterclubSection');
    if (interclubSection) {
        interclubSection.style.display = 'none';
        document.getElementById('eventInterclubPoints').value = '10,8,6,5,4,3,2,1';
    }

    // Réinitialiser mode couloirs
    document.getElementById('eventLaneMode').checked = false;

    document.getElementById('eventModal').style.display = 'block';
};

window.closeEventModal = function() {
    document.getElementById('eventModal').style.display = 'none';
    raceData.editingEventId = null;
};

window.updateEventRelayOptions = function() {
    const raceType = document.getElementById('eventRaceType').value;
    const relaySection = document.getElementById('eventRelayDurationSection');
    const interclubSection = document.getElementById('eventInterclubSection');

    // Afficher/masquer section relais
    if (raceType === 'relay') {
        relaySection.style.display = 'block';
    } else {
        relaySection.style.display = 'none';
    }

    // Afficher/masquer section interclub
    if (interclubSection) {
        if (raceType === 'interclub') {
            interclubSection.style.display = 'block';
        } else {
            interclubSection.style.display = 'none';
        }
    }
};

window.saveEvent = function() {
    const name = document.getElementById('eventName').value.trim();
    const sportType = document.getElementById('eventSportType').value;
    const distance = parseInt(document.getElementById('eventDistance').value);
    const raceType = document.getElementById('eventRaceType').value;
    const relayDuration = raceType === 'relay' ? parseInt(document.getElementById('eventRelayDuration').value) : null;
    const laneMode = document.getElementById('eventLaneMode').checked;

    // Récupérer le barème de points pour le mode interclub
    let interclubPoints = null;
    if (raceType === 'interclub') {
        const pointsInput = document.getElementById('eventInterclubPoints').value.trim();
        interclubPoints = pointsInput.split(',').map(p => parseInt(p.trim())).filter(p => !isNaN(p));
        if (interclubPoints.length === 0) {
            interclubPoints = [10, 8, 6, 5, 4, 3, 2, 1]; // Barème par défaut
        }
    }

    if (!name) {
        showNotification('Veuillez entrer un nom pour l\'épreuve', 'warning');
        return;
    }

    if (!distance || distance <= 0) {
        showNotification('Veuillez entrer une distance valide', 'warning');
        return;
    }

    const eventData = {
        id: raceData.editingEventId || raceData.nextEventId++,
        name,
        sportType,
        distance,
        raceType,
        relayDuration,
        interclubPoints,  // Barème de points pour mode interclub
        laneMode,         // Mode couloirs (1-9)
        series: [] // Chaque épreuve contient plusieurs séries
    };

    if (raceData.editingEventId !== null) {
        // Modification
        const index = raceData.events.findIndex(e => e.id === raceData.editingEventId);
        if (index !== -1) {
            // Garder les séries existantes
            eventData.series = raceData.events[index].series;
            raceData.events[index] = eventData;
            showNotification('Épreuve modifiée avec succès', 'success');
        }
    } else {
        // Nouvelle épreuve
        raceData.events.push(eventData);
        showNotification('Épreuve créée avec succès', 'success');
    }

    closeEventModal();
    displayEventsList();
    saveChronoToLocalStorage();
};

window.editEvent = function(eventId) {
    const event = raceData.events.find(e => e.id === eventId);
    if (!event) return;

    raceData.editingEventId = eventId;
    document.getElementById('eventModalTitle').textContent = '✏️ Modifier l\'Épreuve';

    document.getElementById('eventName').value = event.name;
    document.getElementById('eventSportType').value = event.sportType;
    document.getElementById('eventDistance').value = event.distance;
    document.getElementById('eventRaceType').value = event.raceType;

    // Gérer section relais
    if (event.raceType === 'relay') {
        document.getElementById('eventRelayDuration').value = event.relayDuration;
        document.getElementById('eventRelayDurationSection').style.display = 'block';
    } else {
        document.getElementById('eventRelayDurationSection').style.display = 'none';
    }

    // Gérer section interclub
    const interclubSection = document.getElementById('eventInterclubSection');
    if (interclubSection) {
        if (event.raceType === 'interclub') {
            interclubSection.style.display = 'block';
            const points = event.interclubPoints || [10, 8, 6, 5, 4, 3, 2, 1];
            document.getElementById('eventInterclubPoints').value = points.join(',');
        } else {
            interclubSection.style.display = 'none';
        }
    }

    // Charger mode couloirs
    document.getElementById('eventLaneMode').checked = event.laneMode || false;

    document.getElementById('eventModal').style.display = 'block';
};

window.deleteEvent = function(eventId) {
    const event = raceData.events.find(e => e.id === eventId);
    if (!event) return;

    const seriesCount = event.series.length;
    const confirmMessage = seriesCount > 0
        ? `Êtes-vous sûr de vouloir supprimer "${event.name}" et ses ${seriesCount} série(s) ?`
        : `Êtes-vous sûr de vouloir supprimer "${event.name}" ?`;

    if (!confirm(confirmMessage)) {
        return;
    }

    const index = raceData.events.findIndex(e => e.id === eventId);
    if (index !== -1) {
        raceData.events.splice(index, 1);
        displayEventsList();
        saveChronoToLocalStorage();
        showNotification('Épreuve supprimée', 'success');
    }
};

function displayEventsList() {
    const eventsList = document.getElementById('eventsList');
    const noEventsMessage = document.getElementById('noEventsMessage');

    // Vérifier s'il y a un chrono en cours
    let runningSerieInfo = null;
    for (const event of raceData.events) {
        const runningSerie = event.series.find(s => s.isRunning);
        if (runningSerie) {
            runningSerieInfo = { event, serie: runningSerie };
            break;
        }
    }

    // Afficher ou masquer la bannière chrono en cours
    let runningBanner = document.getElementById('runningChronoBanner');
    if (runningSerieInfo) {
        if (!runningBanner) {
            runningBanner = document.createElement('div');
            runningBanner.id = 'runningChronoBanner';
            const chronoSection = document.getElementById('chronoModeSection');
            chronoSection.insertBefore(runningBanner, chronoSection.firstChild);
        }
        runningBanner.innerHTML = `
            <div style="background: linear-gradient(135deg, #e74c3c, #c0392b); color: white; padding: 15px 20px; border-radius: 10px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; animation: pulse 2s infinite;">
                <div>
                    <strong style="font-size: 16px;">⏱️ CHRONO EN COURS</strong>
                    <span style="margin-left: 15px;">${runningSerieInfo.event.name} - ${runningSerieInfo.serie.name}</span>
                </div>
                <button onclick="continueSerie(${runningSerieInfo.serie.id})" style="background: white; color: #e74c3c; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: bold;">
                    📊 Reprendre le chrono
                </button>
            </div>
            <style>
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.85; }
                }
            </style>
        `;
        runningBanner.style.display = 'block';
    } else if (runningBanner) {
        runningBanner.style.display = 'none';
    }

    if (raceData.events.length === 0) {
        eventsList.style.display = 'none';
        noEventsMessage.style.display = 'block';
        return;
    }

    eventsList.style.display = 'grid';
    noEventsMessage.style.display = 'none';

    const sportEmoji = {
        running: '🏃',
        cycling: '🚴',
        swimming: '🏊'
    };

    eventsList.innerHTML = raceData.events.map(event => {
        const totalParticipants = event.series.reduce((sum, s) => sum + s.participants.length, 0);
        const completedSeries = event.series.filter(s => s.status === 'completed').length;

        return `
            <div style="border: 3px solid #e67e22; border-radius: 12px; padding: 20px; background: linear-gradient(135deg, #fff5f0, #ffffff); box-shadow: 0 4px 12px rgba(230, 126, 34, 0.2);">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                    <div style="flex: 1;">
                        <h3 style="margin: 0 0 10px 0; color: #e67e22; font-size: 22px;">
                            🏅 ${event.name}
                        </h3>
                        <div style="display: flex; gap: 20px; flex-wrap: wrap; font-size: 14px; color: #7f8c8d;">
                            <span>${sportEmoji[event.sportType]} ${event.distance}m</span>
                            <span>📊 ${event.series.length} série(s)</span>
                            <span>👥 ${totalParticipants} participants au total</span>
                            ${completedSeries > 0 ? `<span style="color: #27ae60;">✅ ${completedSeries} terminée(s)</span>` : ''}
                            ${event.laneMode ? `<span style="background: #3498db; color: white; padding: 2px 8px; border-radius: 4px;">🏊 Couloirs 1-9</span>` : ''}
                            ${event.raceType === 'interclub' ? `<span style="background: #9b59b6; color: white; padding: 2px 8px; border-radius: 4px;">🏆 Interclub</span>` : ''}
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn" onclick="showAddSerieModalForEvent(${event.id})" style="background: #27ae60; color: white; padding: 8px 15px;">
                            ➕ Série
                        </button>
                        <button class="btn" onclick="editEvent(${event.id})" style="background: #3498db; padding: 8px 15px;">
                            ✏️
                        </button>
                        <button class="btn btn-danger" onclick="deleteEvent(${event.id})" style="padding: 8px 15px;">
                            🗑️
                        </button>
                    </div>
                </div>

                ${event.series.length > 0 ? `
                    <div style="margin-top: 15px; padding-top: 15px; border-top: 2px solid #f39c12;">
                        <h4 style="margin: 0 0 10px 0; color: #2c3e50; font-size: 16px;">Séries de cette épreuve:</h4>
                        <div style="display: grid; gap: 10px;">
                            ${event.series.map(serie => {
                                const statusColor = serie.status === 'completed' ? '#27ae60' :
                                                   serie.status === 'running' ? '#3498db' : '#95a5a6';
                                const statusText = serie.status === 'completed' ? '✅ Terminée' :
                                                  serie.status === 'running' ? '▶️ En cours' : '⏸️ En attente';

                                return `
                                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: white; border-radius: 8px; border-left: 4px solid ${statusColor};">
                                        <div style="flex: 1;">
                                            <span style="font-weight: bold; color: #2c3e50;">${serie.name}</span>
                                            <span style="margin-left: 15px; font-size: 13px; color: #7f8c8d;">
                                                👥 ${serie.participants.length} participants
                                            </span>
                                            <span style="margin-left: 10px; background: ${statusColor}; color: white; padding: 3px 8px; border-radius: 4px; font-size: 11px;">
                                                ${statusText}
                                            </span>
                                        </div>
                                        <div style="display: flex; gap: 5px;">
                                            ${serie.status === 'pending' ? `
                                                <button class="btn btn-success" onclick="startSerie(${serie.id})" style="padding: 6px 12px; font-size: 13px;">
                                                    ▶️ Lancer
                                                </button>
                                                <button class="btn" onclick="editSerie(${serie.id})" style="background: #3498db; padding: 6px 12px; font-size: 13px;">
                                                    ✏️
                                                </button>
                                                <button class="btn btn-danger" onclick="deleteSerie(${serie.id})" style="padding: 6px 12px; font-size: 13px;">
                                                    🗑️
                                                </button>
                                            ` : serie.status === 'running' ? `
                                                <button class="btn" onclick="continueSerie(${serie.id})" style="background: #3498db; padding: 6px 12px; font-size: 13px;">
                                                    📊 Gérer
                                                </button>
                                            ` : `
                                                <button class="btn" onclick="viewSerieResults(${serie.id})" style="background: #27ae60; padding: 6px 12px; font-size: 13px;">
                                                    🏆 Résultats
                                                </button>
                                                <button class="btn" onclick="editSerie(${serie.id})" style="background: #3498db; padding: 6px 12px; font-size: 13px;">
                                                    ✏️
                                                </button>
                                                <button class="btn btn-danger" onclick="deleteSerie(${serie.id})" style="padding: 6px 12px; font-size: 13px;">
                                                    🗑️
                                                </button>
                                            `}
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                ` : `
                    <div style="margin-top: 10px; padding: 15px; background: #f8f9fa; border-radius: 8px; text-align: center; color: #7f8c8d; font-size: 13px;">
                        Aucune série créée pour cette épreuve. Cliquez sur "➕ Série" pour en ajouter une.
                    </div>
                `}
            </div>
        `;
    }).join('');
}

// ============================================
// GESTION DES SÉRIES
// ============================================

// Afficher la modale d'ajout de série pour une épreuve spécifique
window.showAddSerieModalForEvent = function(eventId) {
    raceData.currentEventId = eventId;
    showAddSerieModal();

    // Pré-sélectionner l'épreuve
    document.getElementById('serieEventId').value = eventId;
    updateSerieFromEvent();
};

// Afficher la modale d'ajout de série
window.showAddSerieModal = function() {
    raceData.editingSerieId = null;
    raceData.currentEventId = null;
    document.getElementById('serieModalTitle').textContent = 'Nouvelle Série';

    // Réinitialiser le formulaire
    document.getElementById('serieName').value = '';

    // Réinitialiser l'option mode couloirs
    const laneModeCheckbox = document.getElementById('serieLaneMode');
    if (laneModeCheckbox) {
        laneModeCheckbox.checked = false;
    }
    const laneModeContainer = document.getElementById('laneModeContainer');
    if (laneModeContainer) {
        laneModeContainer.style.display = 'none';
    }

    // Charger la liste des épreuves dans le select
    loadEventsListInSelect();

    // Charger la liste des participants
    loadParticipantsList();

    document.getElementById('serieModal').style.display = 'block';
};

function loadEventsListInSelect() {
    const selectElement = document.getElementById('serieEventId');

    if (raceData.events.length === 0) {
        selectElement.innerHTML = '<option value="">Aucune épreuve disponible - Créez-en une d\'abord</option>';
        return;
    }

    selectElement.innerHTML = '<option value="">-- Sélectionnez une épreuve --</option>' +
        raceData.events.map(event => `<option value="${event.id}">${event.name} (${event.distance}m)</option>`).join('');
}

window.updateSerieFromEvent = function() {
    const eventId = parseInt(document.getElementById('serieEventId').value);
    if (!eventId) return;

    const event = raceData.events.find(e => e.id === eventId);
    if (!event) return;

    // Suggérer un nom de série basé sur le nombre de séries existantes
    const serieNumber = event.series.length + 1;
    document.getElementById('serieName').value = `Série ${serieNumber}`;

    // Hériter du mode couloirs de l'épreuve
    const laneModeCheckbox = document.getElementById('serieLaneMode');
    if (laneModeCheckbox && event.laneMode) {
        laneModeCheckbox.checked = true;
        // Activer les sélecteurs de couloirs
        if (typeof toggleLaneSelectors === 'function') {
            toggleLaneSelectors();
        }
        // Mettre à jour la visibilité du conteneur
        const laneModeContainer = document.getElementById('laneModeContainer');
        if (laneModeContainer) {
            laneModeContainer.style.display = 'block';
        }
    }
};

// Charger la liste des participants avec checkboxes
function loadParticipantsList(selectedParticipants = []) {
    const participantsCheckboxList = document.getElementById('participantsCheckboxList');

    // Utiliser les participants du mode chrono
    if (raceData.participants.length === 0) {
        participantsCheckboxList.innerHTML = '<p style="color: #7f8c8d; text-align: center;">Aucun participant disponible. Cliquez sur "Ajouter des participants" pour en créer.</p>';
        return;
    }

    // Trier par dossard
    const sortedParticipants = [...raceData.participants].sort((a, b) => {
        const bibA = parseInt(a.bib) || a.bib;
        const bibB = parseInt(b.bib) || b.bib;
        if (typeof bibA === 'number' && typeof bibB === 'number') {
            return bibA - bibB;
        }
        return String(a.bib).localeCompare(String(b.bib));
    });

    // Déterminer les couloirs déjà utilisés
    const usedLanes = selectedParticipants
        .filter(p => p.laneNumber)
        .map(p => p.laneNumber);

    // Trouver le prochain couloir disponible (de 1 à 9)
    const getNextAvailableLane = () => {
        for (let i = 1; i <= 9; i++) {
            if (!usedLanes.includes(i)) {
                return i;
            }
        }
        return null; // Tous les couloirs sont pris
    };

    participantsCheckboxList.innerHTML = sortedParticipants.map(participant => {
        // Correspondance par ID si disponible, sinon par bib (pour JSON importés)
        const isChecked = selectedParticipants.some(p =>
            p.id === participant.id || (p.bib && p.bib === participant.bib)
        );
        // Récupérer le numéro de couloir existant si en mode édition
        const existingParticipant = selectedParticipants.find(p =>
            p.id === participant.id || (p.bib && p.bib === participant.bib)
        );
        const existingLane = existingParticipant?.laneNumber || '';

        // Si pas de couloir existant, suggérer le prochain disponible
        const suggestedLane = existingLane || (isChecked ? getNextAvailableLane() : null);

        // Générer les options avec indication des couloirs disponibles/occupés
        const laneOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(laneNum => {
            const isOccupied = usedLanes.includes(laneNum) && existingLane !== laneNum;
            const isSelected = (existingLane === laneNum) || (suggestedLane === laneNum && !existingLane);
            const occupiedBy = isOccupied ? selectedParticipants.find(p => p.laneNumber === laneNum)?.name : null;
            const label = isOccupied ?
                `Couloir ${laneNum} (occupé)` :
                `Couloir ${laneNum}`;

            return `<option value="${laneNum}"
                ${isSelected ? 'selected' : ''}
                ${isOccupied ? 'disabled style="color: #999; background: #f5f5f5;"' : ''}
                title="${occupiedBy ? 'Occupé par: ' + occupiedBy : 'Disponible'}">${label}</option>`;
        }).join('');

        return `
            <div style="display: flex; align-items: center; gap: 10px; padding: 8px; border-radius: 5px; transition: background 0.2s;">
                <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; flex: 1;">
                    <input type="checkbox"
                           class="participant-checkbox"
                           data-id="${participant.id}"
                           data-name="${participant.name}"
                           data-category="${participant.category}"
                           data-bib="${participant.bib}"
                           data-club="${participant.club || ''}"
                           ${isChecked ? 'checked' : ''}
                           onchange="updateLaneModeVisibility(); autoAssignLane(${participant.id})"
                           style="width: 18px; height: 18px; cursor: pointer;">
                    <div style="background: linear-gradient(135deg, #16a085, #1abc9c); color: white; padding: 4px 8px; border-radius: 5px; font-weight: bold; min-width: 45px; text-align: center; font-size: 12px;">
                        ${participant.bib}
                    </div>
                    <span style="font-weight: bold;">${participant.name}</span>
                    <span style="font-size: 12px; color: #7f8c8d;">(${participant.category})</span>
                    ${participant.club ? `<span style="font-size: 11px; color: #16a085; font-weight: bold;">🏅 ${participant.club}</span>` : ''}
                </label>
                <div class="lane-selector-container" style="display: none;">
                    <select class="lane-selector" data-participant-id="${participant.id}"
                            style="padding: 5px 10px; border-radius: 5px; border: 2px solid #3498db; font-weight: bold; background: #e8f4fc; min-width: 80px;">
                        <option value="">--</option>
                        ${laneOptions}
                    </select>
                </div>
            </div>
        `;
    }).join('');

    // Mettre à jour la visibilité de l'option mode couloirs
    updateLaneModeVisibility();
}

// Fonction pour auto-assigner un couloir disponible quand on coche un participant
window.autoAssignLane = function(participantId) {
    const checkbox = document.querySelector(`.participant-checkbox[data-id="${participantId}"]`);
    const laneSelector = document.querySelector(`.lane-selector[data-participant-id="${participantId}"]`);

    if (!checkbox || !laneSelector) return;

    // Si le participant vient d'être coché et n'a pas encore de couloir
    if (checkbox.checked && !laneSelector.value) {
        // Récupérer tous les couloirs déjà assignés
        const allLaneSelectors = document.querySelectorAll('.lane-selector');
        const usedLanes = Array.from(allLaneSelectors)
            .filter(sel => sel.value && sel !== laneSelector)
            .map(sel => parseInt(sel.value));

        // Trouver le premier couloir disponible
        for (let i = 1; i <= 9; i++) {
            if (!usedLanes.includes(i)) {
                laneSelector.value = i;
                console.log(`✨ Couloir ${i} auto-assigné à ${checkbox.dataset.name}`);
                break;
            }
        }
    }
};

// Fonction pour afficher/masquer l'option mode couloirs selon le nombre de participants
window.updateLaneModeVisibility = function() {
    const checkedCount = document.querySelectorAll('.participant-checkbox:checked').length;
    const laneModeContainer = document.getElementById('laneModeContainer');
    const laneModeCheckbox = document.getElementById('serieLaneMode');

    if (checkedCount >= 1 && checkedCount <= 9) {
        laneModeContainer.style.display = 'block';
    } else {
        laneModeContainer.style.display = 'none';
        if (laneModeCheckbox) {
            laneModeCheckbox.checked = false;
        }
    }

    // Mettre à jour l'affichage des sélecteurs de couloir
    toggleLaneSelectors();
}

// Fonction pour afficher/masquer les sélecteurs de couloir
window.toggleLaneSelectors = function() {
    const laneModeCheckbox = document.getElementById('serieLaneMode');
    const laneAssignmentInfo = document.getElementById('laneAssignmentInfo');
    const laneSelectors = document.querySelectorAll('.lane-selector-container');
    const isLaneModeEnabled = laneModeCheckbox && laneModeCheckbox.checked;

    // Afficher/masquer l'info d'assignation
    if (laneAssignmentInfo) {
        laneAssignmentInfo.style.display = isLaneModeEnabled ? 'block' : 'none';
    }

    // Afficher les sélecteurs uniquement pour les participants cochés
    laneSelectors.forEach(container => {
        const participantDiv = container.closest('div[style*="display: flex"]');
        const checkbox = participantDiv ? participantDiv.querySelector('.participant-checkbox') : null;

        if (isLaneModeEnabled && checkbox && checkbox.checked) {
            container.style.display = 'block';
        } else {
            container.style.display = 'none';
            // Réinitialiser la valeur si non coché
            const select = container.querySelector('.lane-selector');
            if (select && (!checkbox || !checkbox.checked)) {
                select.value = '';
            }
        }
    });

    // Auto-assigner les couloirs si aucun n'est assigné
    if (isLaneModeEnabled) {
        autoAssignLanes();
    }
}

// Auto-assigner les couloirs aux participants cochés
function autoAssignLanes() {
    const checkedBoxes = document.querySelectorAll('.participant-checkbox:checked');
    let laneNumber = 1;

    checkedBoxes.forEach(checkbox => {
        const participantDiv = checkbox.closest('div[style*="display: flex"]');
        const select = participantDiv ? participantDiv.querySelector('.lane-selector') : null;

        if (select && !select.value) {
            select.value = laneNumber.toString();
        }
        laneNumber++;
    });
}

// Mise à jour options relais dans modal série
window.updateSerieRelayOptions = function() {
    const raceType = document.getElementById('serieRaceType').value;
    const relaySection = document.getElementById('serieRelayDurationSection');

    if (raceType === 'relay') {
        relaySection.style.display = 'block';
    } else {
        relaySection.style.display = 'none';
    }
};

// Fermer modal série
window.closeSerieModal = function() {
    document.getElementById('serieModal').style.display = 'none';
    raceData.editingSerieId = null;
};

// Sauvegarder une série
window.saveSerie = function() {
    const name = document.getElementById('serieName').value.trim();
    const eventId = parseInt(document.getElementById('serieEventId').value);

    if (!name) {
        showNotification('Veuillez entrer un nom pour la série', 'warning');
        return;
    }

    if (!eventId) {
        showNotification('Veuillez sélectionner une épreuve', 'warning');
        return;
    }

    const event = raceData.events.find(e => e.id === eventId);
    if (!event) {
        showNotification('Épreuve introuvable', 'error');
        return;
    }

    // Récupérer les participants sélectionnés
    const checkboxes = document.querySelectorAll('.participant-checkbox:checked');

    // Si on édite une série existante, récupérer les données actuelles des participants
    let existingSerieParticipants = [];
    let oldSerie = null;
    if (raceData.editingSerieId !== null) {
        const result = findSerieById(raceData.editingSerieId);
        if (result && result.serie) {
            existingSerieParticipants = result.serie.participants;
            oldSerie = result.serie;
        }
    }

    // Collecter les IDs des participants cochés
    const checkedParticipantIds = Array.from(checkboxes).map(cb => parseInt(cb.dataset.id));

    // Construire la liste finale des participants
    const participants = [];

    // IMPORTANT: Si on édite une série existante, commencer par TOUS les participants existants
    if (oldSerie) {
        // 1. Conserver TOUS les participants existants de la série
        existingSerieParticipants.forEach(existingP => {
            // Vérifier si ce participant est coché dans la liste (pour mettre à jour ses infos)
            // Correspondance par ID si disponible, sinon par bib (pour JSON importés)
            const checkbox = Array.from(checkboxes).find(cb =>
                parseInt(cb.dataset.id) === existingP.id ||
                (existingP.bib && cb.dataset.bib == existingP.bib)
            );

            if (checkbox) {
                // Le participant existant est coché : mettre à jour ses infos de base et couloir
                const participantId = parseInt(checkbox.dataset.id);
                const laneSelector = document.querySelector(`.lane-selector[data-participant-id="${participantId}"]`);
                const laneNumber = laneSelector && laneSelector.value ? parseInt(laneSelector.value) : existingP.laneNumber;

                participants.push({
                    ...existingP,
                    id: participantId,  // S'assurer que l'ID est présent (important pour les imports JSON)
                    // Mettre à jour les infos de base au cas où elles auraient changé
                    bib: checkbox.dataset.bib,
                    name: checkbox.dataset.name,
                    category: checkbox.dataset.category,
                    club: checkbox.dataset.club || existingP.club || '',
                    laneNumber: laneNumber
                });
            } else {
                // Le participant existant n'est pas coché : le conserver tel quel
                // Ajouter l'ID s'il manque (pour JSON importés)
                if (!existingP.id) {
                    const globalParticipant = raceData.participants.find(p => p.bib == existingP.bib);
                    if (globalParticipant) {
                        existingP.id = globalParticipant.id;
                    }
                }
                participants.push(existingP);
                console.log(`✅ Participant existant "${existingP.name}" préservé automatiquement`);
            }
        });

        // 2. Ajouter les NOUVEAUX participants cochés (qui n'étaient pas dans la série)
        Array.from(checkboxes).forEach(cb => {
            const participantId = parseInt(cb.dataset.id);
            const participantBib = cb.dataset.bib;

            // Vérifier si c'est un nouveau participant (pas dans la série existante)
            // Correspondance par ID ou par bib
            const isNewParticipant = !existingSerieParticipants.find(p =>
                p.id === participantId || (p.bib && p.bib == participantBib)
            );

            if (isNewParticipant) {
                const laneSelector = document.querySelector(`.lane-selector[data-participant-id="${participantId}"]`);
                const laneNumber = laneSelector && laneSelector.value ? parseInt(laneSelector.value) : null;

                participants.push({
                    id: participantId,
                    bib: participantBib,
                    name: cb.dataset.name,
                    category: cb.dataset.category,
                    club: cb.dataset.club || '',
                    laps: [],
                    status: 'ready',
                    totalTime: 0,
                    totalDistance: 0,
                    bestLap: null,
                    finishTime: null,
                    lastLapStartTime: 0,
                    laneNumber: laneNumber
                });
                console.log(`➕ Nouveau participant "${cb.dataset.name}" ajouté à la série`);
            }
        });
    } else {
        // Création d'une nouvelle série : ajouter tous les participants cochés
        Array.from(checkboxes).forEach(cb => {
            const participantId = parseInt(cb.dataset.id);
            const laneSelector = document.querySelector(`.lane-selector[data-participant-id="${participantId}"]`);
            const laneNumber = laneSelector && laneSelector.value ? parseInt(laneSelector.value) : null;

            participants.push({
                id: participantId,
                bib: cb.dataset.bib,
                name: cb.dataset.name,
                category: cb.dataset.category,
                club: cb.dataset.club || '',
                laps: [],
                status: 'ready',
                totalTime: 0,
                totalDistance: 0,
                bestLap: null,
                finishTime: null,
                lastLapStartTime: 0,
                laneNumber: laneNumber
            });
        });
    }

    if (participants.length === 0) {
        showNotification('Sélectionnez au moins un participant', 'warning');
        return;
    }

    // Fonction helper pour fusionner les données sans perdre les chronos
    function mergeSerieData(oldSerie, newData) {
        // Si la série a déjà des données chronométrées (running ou completed), les préserver
        if (oldSerie && (oldSerie.status === 'running' || oldSerie.status === 'completed')) {
            return {
                ...oldSerie,  // Conserver toutes les données existantes
                name: newData.name,  // Mettre à jour le nom
                participants: newData.participants,  // Mettre à jour les participants (déjà fusionnés ci-dessus)
                eventId: newData.eventId,  // Mettre à jour l'épreuve parente si changée
                // Ne PAS écraser: status, startTime, isRunning, currentTime, timerInterval
            };
        }
        // Si la série n'a pas encore de chronos (status: pending), on peut tout remplacer
        return { ...newData };
    }

    // Récupérer l'option mode couloirs
    const laneModeCheckbox = document.getElementById('serieLaneMode');
    const laneMode = laneModeCheckbox ? laneModeCheckbox.checked : false;

    // Validation des couloirs si mode couloirs activé
    if (laneMode) {
        const laneNumbers = participants
            .filter(p => p.laneNumber)
            .map(p => p.laneNumber);

        // Vérifier les doublons
        const duplicates = laneNumbers.filter((item, index) => laneNumbers.indexOf(item) !== index);
        if (duplicates.length > 0) {
            showNotification(`Erreur: Le couloir ${duplicates[0]} est assigné à plusieurs participants!`, 'error');
            return;
        }

        // Vérifier que tous les participants ont un couloir assigné
        const participantsWithoutLane = participants.filter(p => !p.laneNumber);
        if (participantsWithoutLane.length > 0) {
            showNotification(`Erreur: ${participantsWithoutLane.length} participant(s) n'ont pas de couloir assigné!`, 'error');
            return;
        }
    }

    const serieData = {
        name,
        eventId,  // Lier la série à l'épreuve
        sportType: event.sportType,
        distance: event.distance,
        raceType: event.raceType,
        relayDuration: event.relayDuration,
        participants,
        status: 'pending',
        startTime: null,
        isRunning: false,
        timerInterval: null,
        currentTime: 0,
        laneMode: laneMode  // Mode couloirs (1-9) pour natation/athlétisme
    };

    if (raceData.editingSerieId !== null) {
        // Modification
        // Trouver la série dans toutes les épreuves
        let found = false;
        raceData.events.forEach(evt => {
            const index = evt.series.findIndex(s => s.id === raceData.editingSerieId);
            if (index !== -1) {
                const oldSerie = evt.series[index];
                serieData.id = raceData.editingSerieId;

                // Fusionner intelligemment pour préserver les chronos
                const mergedSerie = mergeSerieData(oldSerie, serieData);

                // Si l'épreuve a changé, déplacer la série
                if (evt.id !== eventId) {
                    evt.series.splice(index, 1);
                    event.series.push(mergedSerie);
                } else {
                    evt.series[index] = mergedSerie;
                }
                found = true;
            }
        });
        if (found) {
            showNotification('Série modifiée avec succès (chronos préservés)', 'success');
        }
    } else {
        // Nouvelle série
        serieData.id = raceData.nextSerieId++;
        event.series.push(serieData);
        showNotification('Série créée avec succès', 'success');
    }

    closeSerieModal();
    displayEventsList();
    saveChronoToLocalStorage();
};

// Fonction utilitaire pour trouver une série dans toutes les épreuves
function findSerieById(serieId) {
    for (const event of raceData.events) {
        const serie = event.series.find(s => s.id === serieId);
        if (serie) {
            return { serie, event };
        }
    }
    return null;
}

// Éditer une série
window.editSerie = function(serieId) {
    const result = findSerieById(serieId);
    if (!result) return;

    const { serie, event } = result;

    // Avertissement si la série est terminée
    if (serie.status === 'completed') {
        if (!confirm('✅ Cette série est terminée.\n\n✨ NOUVEAU: Les temps chronométrés seront PRÉSERVÉS !\n\n📝 Vous pouvez:\n- Modifier le nom de la série\n- Ajouter de nouveaux participants (initialisés sans chrono)\n- Retirer des participants (leurs chronos restent archivés)\n\n⏱️ Les participants conservés gardent leurs temps et tours enregistrés.\n\nVoulez-vous continuer ?')) {
            return;
        }
    }

    // Avertissement si la série est en cours
    if (serie.status === 'running') {
        if (!confirm('⚠️ Cette série est en cours d\'exécution.\n\n✨ Les temps chronométrés seront préservés.\n\n⚠️ Attention: Ajouter/retirer des participants pendant une course peut affecter le déroulement.\n\nVoulez-vous continuer ?')) {
            return;
        }
    }

    raceData.editingSerieId = serieId;
    document.getElementById('serieModalTitle').textContent = serie.status === 'completed' ? '✏️ Modifier la Série (Terminée)' : 'Modifier la Série';

    // Charger la liste des épreuves
    loadEventsListInSelect();

    // Pré-sélectionner l'épreuve
    document.getElementById('serieEventId').value = event.id;
    document.getElementById('serieName').value = serie.name;

    loadParticipantsList(serie.participants);

    // Charger l'état du mode couloirs
    const laneModeCheckbox = document.getElementById('serieLaneMode');
    if (laneModeCheckbox) {
        laneModeCheckbox.checked = serie.laneMode || false;
    }

    document.getElementById('serieModal').style.display = 'block';
};

// Supprimer une série
window.deleteSerie = function(serieId) {
    if (!confirm('Voulez-vous vraiment supprimer cette série?')) return;

    raceData.events.forEach(event => {
        const index = event.series.findIndex(s => s.id === serieId);
        if (index !== -1) {
            event.series.splice(index, 1);
            showNotification('Série supprimée', 'info');
            displayEventsList();
            saveChronoToLocalStorage();
        }
    });
};

// Démarrer une série
window.startSerie = function(serieId) {
    const result = findSerieById(serieId);
    if (!result) return;

    const { serie, event } = result;
    raceData.currentSerie = serie;
    serie.status = 'running';

    displayRaceInterface(serie);
    displayEventsList();
    saveChronoToLocalStorage();
};

// Continuer une série en cours
window.continueSerie = function(serieId) {
    const result = findSerieById(serieId);
    if (!result) return;

    const { serie } = result;
    if (!serie) return;

    raceData.currentSerie = serie;
    displayRaceInterface(serie);

    // Réactiver l'écouteur clavier si mode couloirs et série en cours
    if (serie.laneMode && serie.isRunning) {
        addLaneModeKeyListener();
    }
};

// Voir les résultats d'une série terminée
window.viewSerieResults = function(serieId) {
    const result = findSerieById(serieId);
    if (!result) return;

    const { serie } = result;
    raceData.currentSerie = serie;
    displayRaceInterface(serie);
    showRaceRanking();
};

// Adapter les anciennes fonctions pour la série courante
// Mise à jour options relais
window.updateRelayOptions = function() {
    const raceType = document.getElementById('raceType').value;
    const relaySection = document.getElementById('relayDurationSection');

    if (raceType === 'relay') {
        relaySection.style.display = 'block';
    } else {
        relaySection.style.display = 'none';
    }
};

// Afficher l'interface de course pour une série
function displayRaceInterface(serie) {
    if (!serie) serie = raceData.currentSerie;
    if (!serie) return;

    const raceInterface = document.getElementById('raceInterface');
    const eventsList = document.getElementById('eventsList').parentElement;

    eventsList.style.display = 'none';
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

// Retour à la liste des épreuves
window.backToSeriesList = function() {
    const raceInterface = document.getElementById('raceInterface');
    const eventsList = document.getElementById('eventsList');
    
    const dayNumber = raceData.currentDayNumber;

    // Sauvegarder les résultats vers le stockage par jour avant de quitter
    if (typeof saveRaceResultsToDay === 'function' && dayNumber) {
        saveRaceResultsToDay();
    }

    if (raceInterface) raceInterface.style.display = 'none';
    if (eventsList) eventsList.style.display = 'block';

    // Retirer l'écouteur clavier du mode couloirs
    removeLaneModeKeyListener();

    if (typeof displayEventsList === 'function') {
        displayEventsList();
    }
    
    // Retourner à l'onglet de la journée si on venait d'une journée
    if (dayNumber && typeof switchTab === 'function') {
        // Cacher la section chrono globale
        const chronoModeSection = document.getElementById('chronoModeSection');
        if (chronoModeSection) {
            chronoModeSection.style.display = 'none';
        }
        
        // Afficher le bon onglet de jour
        switchTab(dayNumber);
    }
};

// ============================================
// MODE COULOIRS - ÉCOUTEUR CLAVIER
// ============================================

// Variable pour stocker la référence de l'écouteur clavier
let laneModeKeyHandler = null;

// Fonction pour arrêter le chrono d'un couloir (par numéro 1-9)
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

    // Vérifier si tous les participants ont terminé
    checkAllFinished();
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

// Générer les lignes de participants
function generateParticipantsRows(serie) {
    if (!serie) serie = raceData.currentSerie;
    if (!serie) return '';

    return serie.participants.map(p => {
        const statusColor = {
            ready: '#95a5a6',
            running: '#3498db',
            finished: '#27ae60',
            dns: '#e74c3c'
        };

        const statusText = {
            ready: '⏸️ Prêt',
            running: '▶️ En course',
            finished: '🏁 Terminé',
            dns: '🚫 DNS'
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
                    ${p.status === 'dns' ? `
                        <div style="display: flex; gap: 4px; justify-content: center; align-items: center;">
                            <button onclick="cancelDNS('${p.bib}')" style="background: #95a5a6; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;" title="Annuler DNS">↩️</button>
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
        dns: '#e74c3c'
    };

    const statusText = {
        ready: '⏸️ Prêt',
        running: '▶️ En course',
        finished: '🏁 Terminé',
        dns: '🚫 DNS'
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
            ${participant.status === 'dns' ? `
                <div style="display: flex; gap: 4px; justify-content: center; align-items: center;">
                    <button onclick="cancelDNS('${participant.bib}')" style="background: #95a5a6; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;" title="Annuler DNS">↩️</button>
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
                </div>
            `}
        </td>
    `;
}

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
        if (a.status === 'dns' && b.status !== 'dns') return 1;
        if (b.status === 'dns' && a.status !== 'dns') return -1;

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
            <h3 style="color: white; text-align: center; margin-bottom: 20px;">🏆 Classement Général</h3>
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
                            const isDNS = p.status === 'dns';
                            const medal = isDNS ? 'DNS' : (position <= 3 ? medals[position - 1] : position);
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
window.showOverallChronoRanking = function() {
    // Vérifier s'il y a des séries terminées
    const completedSeriesCount = raceData.events.reduce((count, event) =>
        count + event.series.filter(s => s.status === 'completed').length, 0);

    if (completedSeriesCount === 0) {
        showNotification('Aucune série terminée. Terminez au moins une série pour voir le classement.', 'warning');
        return;
    }

    // Ouvrir le modal de sélection du type de classement
    showChronoRankingTypeModal();
};

// Afficher le modal de sélection du type de classement
function showChronoRankingTypeModal() {
    const modal = document.getElementById('chronoRankingTypeModal');
    const optionsContainer = document.getElementById('rankingTypeOptions');

    // Analyser les épreuves pour proposer les options pertinentes
    const analysis = analyzeCompletedEvents();

    // Générer les options de classement
    let optionsHTML = '';

    // Option 1: Classement Global (toujours disponible)
    optionsHTML += createRankingOption(
        '🌍 Classement Global',
        'Tous les participants, toutes épreuves confondues',
        'global',
        '#16a085',
        `${analysis.totalParticipants} participants • ${analysis.totalSeries} séries`
    );

    // Option 2: Classements par Épreuve (toujours disponible)
    const eventsWithCompletedSeries = raceData.events.filter(event =>
        event.series && event.series.some(serie => serie.status === 'completed')
    ).length;
    if (eventsWithCompletedSeries > 0) {
        optionsHTML += createRankingOption(
            '🏆 Classements par Épreuve',
            'Afficher les classements de chaque série par épreuve',
            'by-event',
            '#3498db',
            `${eventsWithCompletedSeries} épreuve(s)`
        );
    }

    // Option 3: Par Sport (si plusieurs sports)
    if (analysis.sports.length > 1) {
        const sportIcons = { running: '🏃', cycling: '🚴', swimming: '🏊', multisport: '🏅' };
        analysis.sports.forEach(sport => {
            optionsHTML += createRankingOption(
                `${sportIcons[sport] || '🏃'} Classement ${sport === 'running' ? 'Course' : sport === 'cycling' ? 'Vélo' : sport === 'swimming' ? 'Natation' : 'Multisport'}`,
                `Uniquement les épreuves de ${sport === 'running' ? 'course' : sport === 'cycling' ? 'vélo' : sport === 'swimming' ? 'natation' : 'multisport'}`,
                `sport-${sport}`,
                sport === 'running' ? '#e67e22' : sport === 'cycling' ? '#3498db' : sport === 'swimming' ? '#1abc9c' : '#16a085',
                `${analysis.sportCounts[sport]} série(s)`
            );
        });
    }

    // Option 4: Par Type (Individuel vs Relais)
    if (analysis.hasIndividual && analysis.hasRelay) {
        optionsHTML += createRankingOption(
            '👤 Classement Individuel',
            'Uniquement les épreuves individuelles',
            'type-individual',
            '#27ae60',
            `${analysis.individualCount} série(s)`
        );
        optionsHTML += createRankingOption(
            '👥 Classement Relais',
            'Uniquement les épreuves en relais',
            'type-relay',
            '#e74c3c',
            `${analysis.relayCount} série(s)`
        );
    }

    // Option 5: Multi-épreuves (même participants dans plusieurs épreuves)
    if (analysis.hasMultiEvents) {
        optionsHTML += createRankingOption(
            '🎯 Classement Multi-Épreuves',
            'Participants ayant effectué plusieurs épreuves (cumul des performances)',
            'multi-events',
            '#16a085',
            `${analysis.multiEventsParticipants} participant(s) concerné(s)`
        );
    }

    // Option 6: Par Distance (si plusieurs épreuves avec même distance)
    if (analysis.commonDistances.length > 0) {
        analysis.commonDistances.forEach(distance => {
            optionsHTML += createRankingOption(
                `📏 Classement ${distance}m`,
                `Toutes les épreuves de ${distance}m (meilleur temps)`,
                `distance-${distance}`,
                '#16a085',
                `${analysis.distanceCounts[distance]} série(s)`
            );
        });
    }

    // Option 7: Par Catégorie (si plusieurs catégories détectées)
    if (analysis.categories.length > 1) {
        optionsHTML += createRankingOption(
            '📋 Classements par Catégorie',
            'Classements séparés pour chaque catégorie',
            'by-category',
            '#f39c12',
            `${analysis.categories.length} catégorie(s)`
        );
    }

    // Option 8: Par Nationalité (si plusieurs nationalités détectées)
    if (analysis.nationalities.length > 1) {
        optionsHTML += createRankingOption(
            '🌍 Classements par Nationalité',
            'Classements séparés pour chaque nationalité',
            'by-nationality',
            '#3498db',
            `${analysis.nationalities.length} nationalité(s)`
        );
    }

    // Option 9: Par Club (si plusieurs clubs détectés)
    if (analysis.clubs.length > 1) {
        optionsHTML += createRankingOption(
            '🏅 Classements par Club',
            'Classements séparés pour chaque club',
            'by-club',
            '#27ae60',
            `${analysis.clubs.length} club(s)`
        );
        optionsHTML += createRankingOption(
            '🏆 Classement Interclub',
            'Classement des clubs par points (système équitable : chaque club ne marque qu\'une fois par épreuve)',
            'interclub',
            '#2ecc71',
            `${analysis.clubs.length} club(s) en compétition`
        );
    }

    optionsContainer.innerHTML = optionsHTML;
    modal.style.display = 'block';
}

// Créer une option de classement
function createRankingOption(title, description, type, color, info) {
    return `
        <div onclick="selectRankingType('${type}')"
             style="background: linear-gradient(135deg, ${color}, ${adjustColor(color, -20)});
                    color: white;
                    padding: 20px;
                    border-radius: 10px;
                    cursor: pointer;
                    transition: transform 0.2s, box-shadow 0.2s;
                    border: 3px solid transparent;"
             onmouseover="this.style.transform='scale(1.03)'; this.style.boxShadow='0 8px 20px rgba(0,0,0,0.3)'; this.style.borderColor='white';"
             onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none'; this.style.borderColor='transparent';">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                <h4 style="margin: 0; font-size: 18px;">${title}</h4>
                <span style="background: rgba(255,255,255,0.3); padding: 4px 10px; border-radius: 15px; font-size: 12px; font-weight: bold;">
                    ${info}
                </span>
            </div>
            <p style="margin: 0; font-size: 14px; opacity: 0.95;">${description}</p>
        </div>
    `;
}

// Fonction helper pour ajuster la couleur
function adjustColor(color, amount) {
    const clamp = (num) => Math.min(255, Math.max(0, num));
    const num = parseInt(color.replace('#', ''), 16);
    const r = clamp((num >> 16) + amount);
    const g = clamp(((num >> 8) & 0x00FF) + amount);
    const b = clamp((num & 0x0000FF) + amount);
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

// Analyser les épreuves terminées pour proposer des options pertinentes
function analyzeCompletedEvents() {
    const analysis = {
        totalParticipants: 0,
        totalSeries: 0,
        sports: new Set(),
        sportCounts: {},
        hasIndividual: false,
        hasRelay: false,
        individualCount: 0,
        relayCount: 0,
        commonDistances: [],
        distanceCounts: {},
        hasMultiEvents: false,
        multiEventsParticipants: 0,
        categories: new Set(),
        nationalities: new Set(),
        clubs: new Set(),
        participantBibMap: {} // Pour détecter les participants multi-épreuves
    };

    raceData.events.forEach(event => {
        event.series.forEach(serie => {
            if (serie.status === 'completed') {
                analysis.totalSeries++;

                // Analyser le sport
                const sport = serie.sportType || event.sportType || 'running';
                analysis.sports.add(sport);
                analysis.sportCounts[sport] = (analysis.sportCounts[sport] || 0) + 1;

                // Analyser le type (individuel/relais)
                const raceType = serie.raceType || event.raceType || 'individual';
                if (raceType === 'individual') {
                    analysis.hasIndividual = true;
                    analysis.individualCount++;
                } else {
                    analysis.hasRelay = true;
                    analysis.relayCount++;
                }

                // Analyser les distances
                const distance = serie.distance || event.distance || 0;
                if (distance > 0) {
                    analysis.distanceCounts[distance] = (analysis.distanceCounts[distance] || 0) + 1;
                }

                // Analyser les participants et catégories
                serie.participants.forEach(participant => {
                    if (participant.status === 'finished') {
                        // Catégories
                        if (participant.category) {
                            analysis.categories.add(participant.category);
                        }

                        // Nationalités
                        if (participant.nationality) {
                            analysis.nationalities.add(participant.nationality);
                        }

                        // Clubs
                        const club = participant.club || 'Sans club';
                        analysis.clubs.add(club);

                        // Multi-épreuves
                        const bib = participant.bib;
                        if (!analysis.participantBibMap[bib]) {
                            analysis.participantBibMap[bib] = {
                                name: participant.name,
                                count: 0
                            };
                        }
                        analysis.participantBibMap[bib].count++;
                    }
                });
            }
        });
    });

    // Détecter les distances communes (au moins 2 séries)
    analysis.commonDistances = Object.keys(analysis.distanceCounts)
        .filter(d => analysis.distanceCounts[d] >= 2)
        .map(d => parseInt(d))
        .sort((a, b) => a - b);

    // Détecter les participants multi-épreuves
    const multiEventsParticipants = Object.values(analysis.participantBibMap)
        .filter(p => p.count > 1);
    analysis.hasMultiEvents = multiEventsParticipants.length > 0;
    analysis.multiEventsParticipants = multiEventsParticipants.length;

    // Compter les participants uniques
    analysis.totalParticipants = Object.keys(analysis.participantBibMap).length;

    // Convertir Sets en Arrays
    analysis.sports = Array.from(analysis.sports);
    analysis.categories = Array.from(analysis.categories);
    analysis.nationalities = Array.from(analysis.nationalities);
    analysis.clubs = Array.from(analysis.clubs);

    return analysis;
}

// Fermer le modal de sélection
window.closeChronoRankingTypeModal = function() {
    document.getElementById('chronoRankingTypeModal').style.display = 'none';
};

// Sélectionner un type de classement et le générer
window.selectRankingType = function(type) {
    closeChronoRankingTypeModal();

    const rankingSection = document.getElementById('overallChronoRanking');
    const eventsList = document.getElementById('eventsList');

    // Masquer la liste des épreuves et afficher le classement
    if (eventsList && eventsList.parentElement) {
        eventsList.parentElement.style.display = 'none';
    }

    if (rankingSection) {
        rankingSection.style.display = 'block';
    }

    // Générer le classement selon le type sélectionné
    if (type === 'global') {
        generateOverallChronoRanking();
    } else if (type === 'by-event') {
        generateRankingByEvent();
    } else if (type.startsWith('sport-')) {
        const sport = type.replace('sport-', '');
        generateRankingBySport(sport);
    } else if (type.startsWith('type-')) {
        const raceType = type.replace('type-', '');
        generateRankingByType(raceType);
    } else if (type === 'multi-events') {
        generateMultiEventsRanking();
    } else if (type.startsWith('distance-')) {
        const distance = parseInt(type.replace('distance-', ''));
        generateRankingByDistance(distance);
    } else if (type === 'by-category') {
        generateRankingByCategory();
    } else if (type === 'by-nationality') {
        generateRankingByNationality();
    } else if (type === 'by-club') {
        generateRankingByClub();
    } else if (type === 'interclub') {
        generateInterclubRanking();
    }
};

// ========================================
// FONCTIONS DE CLASSEMENT SPÉCIALISÉES
// ========================================

// Classement par sport
function generateRankingBySport(sport) {
    const sportNames = { running: 'Course', cycling: 'Vélo', swimming: 'Natation', multisport: 'Multisport' };
    const sportIcons = { running: '🏃', cycling: '🚴', swimming: '🏊', multisport: '🏅' };

    generateFilteredRanking(
        (event, serie) => (serie.sportType || event.sportType || 'running') === sport,
        `${sportIcons[sport]} Classement ${sportNames[sport]}`,
        sport
    );
}

// Classement par type (individuel/relais)
function generateRankingByType(raceType) {
    const typeNames = { individual: 'Individuel', relay: 'Relais' };
    const typeIcons = { individual: '👤', relay: '👥' };

    generateFilteredRanking(
        (event, serie) => (serie.raceType || event.raceType || 'individual') === raceType,
        `${typeIcons[raceType]} Classement ${typeNames[raceType]}`,
        raceType
    );
}

// Classement Multi-Épreuves (participants avec plusieurs épreuves)
function generateMultiEventsRanking() {
    const allParticipants = [];
    const participantMap = {};

    // Collecter tous les participants et leurs performances
    raceData.events.forEach(event => {
        event.series.forEach(serie => {
            if (serie.status === 'completed') {
                serie.participants.forEach(participant => {
                    if (participant.status === 'finished') {
                        const bib = participant.bib;

                        if (!participantMap[bib]) {
                            participantMap[bib] = {
                                name: participant.name,
                                bib: participant.bib,
                                category: participant.category,
                                series: [],
                                totalDistance: 0,
                                totalTime: 0,
                                totalLaps: 0,
                                eventsCount: 0
                            };
                        }

                        participantMap[bib].series.push({
                            eventName: event.name,
                            serieName: serie.name,
                            sportType: serie.sportType || event.sportType,
                            distance: participant.totalDistance,
                            time: participant.finishTime || participant.totalTime,
                            laps: participant.laps.length
                        });
                        participantMap[bib].totalDistance += participant.totalDistance;
                        participantMap[bib].totalTime += (participant.finishTime || participant.totalTime);
                        participantMap[bib].totalLaps += participant.laps.length;
                        participantMap[bib].eventsCount++;
                    }
                });
            }
        });
    });

    // Ne garder que ceux avec plusieurs épreuves
    Object.values(participantMap).forEach(p => {
        if (p.eventsCount > 1) {
            allParticipants.push(p);
        }
    });

    if (allParticipants.length === 0) {
        displayEmptyRanking('🎯 Classement Multi-Épreuves', 'Aucun participant n\'a effectué plusieurs épreuves.');
        return;
    }

    // Trier par distance totale puis temps
    const ranked = allParticipants.sort((a, b) => {
        if (a.totalDistance !== b.totalDistance) {
            return b.totalDistance - a.totalDistance;
        }
        return a.totalTime - b.totalTime;
    });

    displayRanking(ranked, '🎯 Classement Multi-Épreuves', 'multi-events');
}

// Classement par distance fixe
function generateRankingByDistance(targetDistance) {
    const allParticipants = [];

    raceData.events.forEach(event => {
        event.series.forEach(serie => {
            if (serie.status === 'completed') {
                const distance = serie.distance || event.distance || 0;

                // Filtrer uniquement les séries avec la distance cible
                if (distance === targetDistance) {
                    serie.participants.forEach(participant => {
                        if (participant.status === 'finished') {
                            allParticipants.push({
                                name: participant.name,
                                bib: participant.bib,
                                category: participant.category,
                                eventName: event.name,
                                serieName: serie.name,
                                time: participant.finishTime || participant.totalTime,
                                distance: participant.totalDistance,
                                laps: participant.laps.length,
                                sportType: serie.sportType || event.sportType
                            });
                        }
                    });
                }
            }
        });
    });

    if (allParticipants.length === 0) {
        displayEmptyRanking(`📏 Classement ${targetDistance}m`, `Aucune épreuve de ${targetDistance}m terminée.`);
        return;
    }

    // Trier par meilleur temps
    const ranked = allParticipants.sort((a, b) => a.time - b.time);

    displayRankingByTime(ranked, `📏 Classement ${targetDistance}m`, targetDistance);
}

// Classement par épreuve
function generateRankingByEvent() {
    const eventsMap = {};

    // Parcourir toutes les épreuves
    raceData.events.forEach(event => {
        // Filtrer les séries terminées de cette épreuve
        const completedSeries = (event.series || []).filter(serie => serie.status === 'completed');

        // Si l'épreuve a au moins une série terminée, l'ajouter
        if (completedSeries.length > 0) {
            eventsMap[event.id] = {
                eventName: event.name,
                eventId: event.id,
                sportType: event.sportType,
                distance: event.distance,
                series: []
            };

            // Ajouter toutes les séries de l'épreuve (terminées ou non)
            event.series.forEach(serie => {
                const serieData = {
                    serieName: serie.name,
                    serieId: serie.id,
                    status: serie.status,
                    participants: []
                };

                // Pour les séries terminées, collecter les participants
                if (serie.status === 'completed') {
                    serie.participants.forEach(participant => {
                        if (participant.status === 'finished') {
                            serieData.participants.push({
                                name: participant.name,
                                bib: participant.bib,
                                category: participant.category,
                                club: participant.club,
                                totalDistance: participant.totalDistance,
                                totalTime: participant.finishTime || participant.totalTime,
                                totalLaps: participant.laps ? participant.laps.length : 0
                            });
                        }
                    });

                    // Trier les participants par temps
                    serieData.participants.sort((a, b) => a.totalTime - b.totalTime);
                }

                eventsMap[event.id].series.push(serieData);
            });
        }
    });

    displayRankingByEvents(eventsMap, '🏆 Classements par Épreuve');
}

// Classement par catégorie
function generateRankingByCategory() {
    const categoriesMap = {};

    raceData.events.forEach(event => {
        event.series.forEach(serie => {
            if (serie.status === 'completed') {
                serie.participants.forEach(participant => {
                    if (participant.status === 'finished') {
                        const category = participant.category || 'Non catégorisé';

                        if (!categoriesMap[category]) {
                            categoriesMap[category] = [];
                        }

                        categoriesMap[category].push({
                            name: participant.name,
                            bib: participant.bib,
                            category: participant.category,
                            eventName: event.name,
                            serieName: serie.name,
                            totalDistance: participant.totalDistance,
                            totalTime: participant.finishTime || participant.totalTime,
                            totalLaps: participant.laps.length
                        });
                    }
                });
            }
        });
    });

    displayRankingByCategories(categoriesMap, '📋 Classements par Catégorie');
}

// Classement par nationalité
function generateRankingByNationality() {
    const nationalitiesMap = {};

    raceData.events.forEach(event => {
        event.series.forEach(serie => {
            if (serie.status === 'completed') {
                serie.participants.forEach(participant => {
                    if (participant.status === 'finished') {
                        const nationality = participant.nationality || 'Non renseignée';

                        if (!nationalitiesMap[nationality]) {
                            nationalitiesMap[nationality] = [];
                        }

                        nationalitiesMap[nationality].push({
                            name: participant.name,
                            bib: participant.bib,
                            category: participant.category,
                            nationality: participant.nationality,
                            club: participant.club,
                            age: participant.age,
                            eventName: event.name,
                            serieName: serie.name,
                            totalDistance: participant.totalDistance,
                            totalTime: participant.finishTime || participant.totalTime,
                            totalLaps: participant.laps.length
                        });
                    }
                });
            }
        });
    });

    displayRankingByCategories(nationalitiesMap, '🌍 Classements par Nationalité');
}

// Classement par club
function generateRankingByClub() {
    const clubsMap = {};

    raceData.events.forEach(event => {
        event.series.forEach(serie => {
            if (serie.status === 'completed') {
                serie.participants.forEach(participant => {
                    if (participant.status === 'finished') {
                        const club = participant.club || 'Sans club';

                        if (!clubsMap[club]) {
                            clubsMap[club] = [];
                        }

                        clubsMap[club].push({
                            name: participant.name,
                            bib: participant.bib,
                            category: participant.category,
                            nationality: participant.nationality,
                            club: participant.club,
                            age: participant.age,
                            eventName: event.name,
                            serieName: serie.name,
                            totalDistance: participant.totalDistance,
                            totalTime: participant.finishTime || participant.totalTime,
                            totalLaps: participant.laps.length
                        });
                    }
                });
            }
        });
    });

    displayRankingByCategories(clubsMap, '🏅 Classements par Club');
}

function generateInterclubRanking() {
    const clubStats = {};
    const eventsList = [];
    const pointsScale = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

    raceData.events.forEach(event => {
        const completedSeries = event.series.filter(s => s.status === 'completed');
        if (completedSeries.length === 0) return;

        eventsList.push(event.name);

        const eventParticipants = [];
        completedSeries.forEach(serie => {
            serie.participants.forEach(participant => {
                if (participant.status === 'finished') {
                    eventParticipants.push({
                        ...participant,
                        serieName: serie.name,
                        raceType: serie.raceType
                    });
                }
            });
        });

        const rankedFinished = eventParticipants.sort((a, b) => {
            if (a.raceType === 'relay') {
                if (a.totalDistance !== b.totalDistance) {
                    return b.totalDistance - a.totalDistance;
                }
                return a.totalTime - b.totalTime;
            } else {
                if (a.totalDistance !== b.totalDistance) {
                    return b.totalDistance - a.totalDistance;
                }
                return (a.finishTime || a.totalTime) - (b.finishTime || b.totalTime);
            }
        });

        // Étape 1: Identifier le meilleur participant de chaque club (avec position individuelle et temps)
        const clubBestInEvent = {};
        rankedFinished.forEach((participant, index) => {
            const club = participant.club || 'Sans club';

            if (!clubBestInEvent[club]) {
                clubBestInEvent[club] = {
                    individualPosition: index + 1,  // Position individuelle (pour affichage)
                    participant: participant,
                    time: participant.finishTime || participant.totalTime,
                    distance: participant.totalDistance
                };
            }
        });

        // Étape 2: Classer les clubs par leur meilleur temps (même logique que le classement individuel)
        const rankedClubs = Object.entries(clubBestInEvent).sort(([clubA, dataA], [clubB, dataB]) => {
            const a = dataA.participant;
            const b = dataB.participant;

            // Même logique de tri que pour rankedFinished
            if (a.raceType === 'relay') {
                if (a.totalDistance !== b.totalDistance) {
                    return b.totalDistance - a.totalDistance;
                }
                return a.totalTime - b.totalTime;
            } else {
                if (a.totalDistance !== b.totalDistance) {
                    return b.totalDistance - a.totalDistance;
                }
                return (a.finishTime || a.totalTime) - (b.finishTime || b.totalTime);
            }
        });

        // Étape 3: Attribuer les points en fonction du classement PAR CLUB
        rankedClubs.forEach(([club, data], clubIndex) => {
            const clubPosition = clubIndex + 1;  // Position du club dans le classement interclub
            const clubPoints = pointsScale[clubIndex] || 0;  // Points selon la position du club

            if (!clubStats[club]) {
                clubStats[club] = {
                    clubName: club,
                    totalPoints: 0,
                    eventScores: {},
                    participants: new Set()
                };
            }

            clubStats[club].totalPoints += clubPoints;
            clubStats[club].eventScores[event.name] = {
                position: clubPosition,  // Position du club (4ème club)
                points: clubPoints,       // Points du club (12 pts pour 4ème)
                participantName: data.participant.name,
                individualPosition: data.individualPosition  // Position individuelle (15ème) pour info
            };
            clubStats[club].participants.add(data.participant.bib);
        });
    });

    const rankedClubs = Object.values(clubStats).map(club => ({
        ...club,
        totalParticipants: club.participants.size,
        participants: undefined
    })).sort((a, b) => {
        if (a.totalPoints !== b.totalPoints) {
            return b.totalPoints - a.totalPoints;
        }
        return b.totalParticipants - a.totalParticipants;
    });

    // Stocker les données pour l'export PDF
    lastInterclubRankingData = {
        eventsList: eventsList,
        rankedClubs: rankedClubs,
        pointsScale: pointsScale
    };

    const rankingSection = document.getElementById('overallChronoRanking');
    const medals = ['🥇', '🥈', '🥉'];

    let html = `
        <div style="background: white; padding: 20px; border-radius: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;">
                <h3 style="margin: 0; color: #2c3e50;">🏆 Classement Interclub par Épreuve</h3>
                <div style="display: flex; gap: 10px;">
                    <button class="btn" onclick="hideChronoRanking()" style="background: #95a5a6;">
                        ⬅️ Retour aux séries
                    </button>
                    <button class="btn" onclick="showOverallChronoRanking()" style="background: #16a085;">
                        🔄 Changer de type
                    </button>
                    <button class="btn" onclick="exportInterclubToPDF()" style="background: linear-gradient(135deg, #e74c3c, #c0392b);">
                        🖨️ PDF
                    </button>
                </div>
            </div>

            <p style="color: #7f8c8d; margin-bottom: 20px; text-align: center;">
                <strong>Système de points par épreuve :</strong> Meilleur résultat du club dans chaque épreuve (toutes séries confondues)
                <br>
                <span style="font-size: 13px;">Barème : 1er=25pts, 2e=18pts, 3e=15pts, 4e=12pts, 5e=10pts, 6e=8pts, 7e=6pts, 8e=4pts, 9e=2pts, 10e=1pt</span>
            </p>

            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; min-width: ${600 + (eventsList.length * 120)}px;">
                    <thead>
                        <tr style="background: linear-gradient(135deg, #2ecc71, #27ae60); color: white;">
                            <th style="padding: 12px; text-align: center; position: sticky; left: 0; background: linear-gradient(135deg, #2ecc71, #27ae60);">Pos.</th>
                            <th style="padding: 12px; text-align: left; position: sticky; left: 60px; background: linear-gradient(135deg, #2ecc71, #27ae60);">Club</th>
                            ${eventsList.map(eventName =>
                                `<th style="padding: 12px; text-align: center;">${eventName}</th>`
                            ).join('')}
                            <th style="padding: 12px; text-align: center; font-weight: bold; font-size: 16px;">TOTAL</th>
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
                                    <td style="padding: 12px; text-align: center; font-size: 20px; font-weight: bold; position: sticky; left: 0; ${rowBg}">
                                        ${medal}
                                    </td>
                                    <td style="padding: 12px; position: sticky; left: 60px; ${rowBg}">
                                        <div style="font-weight: bold; font-size: 16px; color: #2ecc71;">
                                            🏅 ${club.clubName}
                                        </div>
                                    </td>
                                    ${eventsList.map(eventName => {
                                        const score = club.eventScores[eventName];
                                        if (score) {
                                            const positionMedal = score.position <= 3 ? medals[score.position - 1] : score.position + 'e';
                                            // Afficher la position individuelle si différente de la position du club
                                            const individualInfo = score.individualPosition && score.individualPosition !== score.position
                                                ? ` (${score.individualPosition}e indiv.)`
                                                : '';
                                            return `
                                                <td style="padding: 12px; text-align: center;">
                                                    <div style="font-weight: bold; font-size: 18px; color: #27ae60;">${score.points}</div>
                                                    <div style="font-size: 11px; color: #7f8c8d;">${positionMedal} club</div>
                                                    <div style="font-size: 10px; color: #95a5a6;">${score.participantName}${individualInfo}</div>
                                                </td>
                                            `;
                                        } else {
                                            return `<td style="padding: 12px; text-align: center; color: #bdc3c7;">-</td>`;
                                        }
                                    }).join('')}
                                    <td style="padding: 12px; text-align: center; font-weight: bold; font-size: 24px; color: #e74c3c;">
                                        ${club.totalPoints}
                                    </td>
                                    <td style="padding: 12px; text-align: center; font-weight: bold; color: #3498db;">
                                        ${club.totalParticipants}
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    rankingSection.innerHTML = html;
}

// Exporter le classement interclub en PDF
window.exportInterclubToPDF = function() {
    if (!lastInterclubRankingData || lastInterclubRankingData.rankedClubs.length === 0) {
        showNotification('Aucun classement interclub disponible pour l\'export PDF', 'warning');
        return;
    }

    const currentDate = new Date().toLocaleDateString('fr-FR', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });

    const { eventsList, rankedClubs, pointsScale } = lastInterclubRankingData;
    const medals = ['🥇', '🥈', '🥉'];

    // Générer le tableau HTML pour le PDF
    let tableRows = '';
    rankedClubs.forEach((club, index) => {
        const position = index + 1;
        const medal = position <= 3 ? medals[position - 1] : position;
        const rowBg = position <= 3 ? 'background: linear-gradient(135deg, #fff9e6, #ffe9b3);' : (index % 2 === 0 ? 'background: #f8f9fa;' : '');

        let row = `
            <tr style="${rowBg} border-bottom: 1px solid #ecf0f1;">
                <td style="padding: 12px; text-align: center; font-size: 20px; font-weight: bold;">
                    ${medal}
                </td>
                <td style="padding: 12px; font-weight: bold; font-size: 16px; color: #2ecc71;">
                    🏅 ${club.clubName}
                </td>
                ${eventsList.map(eventName => {
                    const score = club.eventScores[eventName];
                    if (score) {
                        const positionMedal = score.position <= 3 ? medals[score.position - 1] : score.position + 'e';
                        const individualInfo = score.individualPosition && score.individualPosition !== score.position
                            ? ` (${score.individualPosition}e indiv.)`
                            : '';
                        return `
                            <td style="padding: 12px; text-align: center;">
                                <div style="font-weight: bold; font-size: 18px; color: #27ae60;">${score.points}</div>
                                <div style="font-size: 11px; color: #7f8c8d;">${positionMedal} club</div>
                                <div style="font-size: 10px; color: #95a5a6;">${score.participantName}${individualInfo}</div>
                            </td>
                        `;
                    } else {
                        return `<td style="padding: 12px; text-align: center; color: #bdc3c7;">-</td>`;
                    }
                }).join('')}
                <td style="padding: 12px; text-align: center; font-weight: bold; font-size: 24px; color: #e74c3c;">
                    ${club.totalPoints}
                </td>
                <td style="padding: 12px; text-align: center; font-weight: bold; color: #3498db;">
                    ${club.totalParticipants}
                </td>
            </tr>
        `;
        tableRows += row;
    });

    // Générer le HTML complet pour l'impression
    const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Classement Interclub par Épreuve</title>
            <style>
                @page {
                    size: landscape;
                    margin: 15mm;
                }

                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    margin: 0;
                    padding: 20px;
                    background: white;
                }

                .header {
                    text-align: center;
                    margin-bottom: 20px;
                    padding-bottom: 15px;
                    border-bottom: 3px solid #2ecc71;
                }

                .header h1 {
                    color: #2c3e50;
                    margin: 0 0 10px 0;
                    font-size: 28px;
                }

                .header p {
                    color: #7f8c8d;
                    margin: 5px 0;
                    font-size: 13px;
                }

                .points-info {
                    background: #e8f5e9;
                    padding: 12px;
                    border-radius: 8px;
                    margin-bottom: 20px;
                    text-align: center;
                    font-size: 13px;
                    color: #2c3e50;
                }

                table {
                    width: 100%;
                    border-collapse: collapse;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }

                thead tr {
                    background: linear-gradient(135deg, #2ecc71, #27ae60);
                    color: white;
                }

                th {
                    padding: 12px;
                    text-align: center;
                    font-weight: bold;
                    border-right: 1px solid rgba(255,255,255,0.2);
                }

                th:last-child {
                    border-right: none;
                }

                td {
                    border-right: 1px solid #ecf0f1;
                }

                td:last-child {
                    border-right: none;
                }

                .footer {
                    margin-top: 30px;
                    padding-top: 15px;
                    border-top: 2px solid #ecf0f1;
                    text-align: center;
                    color: #95a5a6;
                    font-size: 11px;
                }

                @media print {
                    body {
                        padding: 10px;
                    }

                    .no-print {
                        display: none;
                    }

                    table {
                        page-break-inside: auto;
                    }

                    tr {
                        page-break-inside: avoid;
                        page-break-after: auto;
                    }

                    thead {
                        display: table-header-group;
                    }

                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🏆 Classement Interclub par Épreuve</h1>
                <p><strong>Système de points :</strong> Meilleur résultat du club dans chaque épreuve (toutes séries confondues)</p>
                <p>Généré le ${currentDate}</p>
            </div>

            <div class="points-info">
                <strong>Barème de points :</strong> ${pointsScale.map((p, i) => `${i + 1}${i === 0 ? 'er' : 'e'}=${p}pts`).join(', ')}
            </div>

            <table>
                <thead>
                    <tr>
                        <th>Pos.</th>
                        <th>Club</th>
                        ${eventsList.map(eventName => `<th>${eventName}</th>`).join('')}
                        <th>TOTAL</th>
                        <th>Participants</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>

            <div class="footer">
                <p>Gestionnaire de Championnats - Mode Chrono - Classement Interclub</p>
            </div>

            <button class="no-print" onclick="window.print()"
                    style="position: fixed; top: 20px; right: 20px; padding: 12px 24px;
                           background: linear-gradient(135deg, #e74c3c, #c0392b); color: white;
                           border: none; border-radius: 8px; cursor: pointer; font-size: 16px;
                           box-shadow: 0 4px 12px rgba(0,0,0,0.2); font-weight: bold;">
                🖨️ Imprimer
            </button>
        </body>
        </html>
    `;

    // Ouvrir dans une nouvelle fenêtre pour l'impression
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();

    // Déclencher automatiquement l'aperçu d'impression après un court délai
    setTimeout(() => {
        printWindow.focus();
        printWindow.print();
    }, 500);

    showNotification('Aperçu d\'impression du classement interclub ouvert', 'success');
};

// Fonction générique pour générer un classement filtré
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
window.hideChronoRanking = function() {
    const rankingSection = document.getElementById('overallChronoRanking');
    const eventsList = document.getElementById('eventsList');

    // Masquer le classement
    if (rankingSection) {
        rankingSection.style.display = 'none';
    }

    // Afficher la liste des épreuves
    if (eventsList && eventsList.parentElement) {
        eventsList.parentElement.style.display = 'block';
    }
};

// Afficher un classement vide
function displayEmptyRanking(title, message) {
    const rankingSection = document.getElementById('overallChronoRanking');
    rankingSection.innerHTML = `
        <div style="background: white; padding: 40px; border-radius: 10px; text-align: center;">
            <h3 style="color: #2c3e50; margin-bottom: 20px;">${title}</h3>
            <p style="color: #7f8c8d; margin-bottom: 30px;">${message}</p>
            <div style="display: flex; gap: 10px; justify-content: center;">
                <button class="btn" onclick="hideChronoRanking()" style="background: #95a5a6;">
                    ⬅️ Retour aux séries
                </button>
                <button class="btn" onclick="showOverallChronoRanking()" style="background: #16a085;">
                    🔄 Choisir un type de classement
                </button>
            </div>
        </div>
    `;
}

// Afficher un classement standard
function displayRanking(ranked, title, type) {
    const rankingSection = document.getElementById('overallChronoRanking');
    const medals = ['🥇', '🥈', '🥉'];

    // Calculer les places par catégorie
    const categoryRankings = {};
    ranked.forEach((participant, index) => {
        const category = participant.category || 'Non catégorisé';
        if (!categoryRankings[category]) {
            categoryRankings[category] = [];
        }
        categoryRankings[category].push({ ...participant, scratchPosition: index + 1 });
    });

    // Assigner les places par catégorie
    Object.keys(categoryRankings).forEach(category => {
        categoryRankings[category].forEach((p, idx) => {
            const participantInRanked = ranked.find(rp => rp.bib === p.bib);
            if (participantInRanked) {
                participantInRanked.categoryPosition = idx + 1;
            }
        });
    });

    // Stocker les données pour l'export PDF
    lastChronoRankingData = {
        title: title,
        type: type,
        participants: ranked,
        categoriesMap: null
    };

    rankingSection.innerHTML = `
        <div style="background: white; padding: 20px; border-radius: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;">
                <h3 style="margin: 0; color: #2c3e50;">${title}</h3>
                <div style="display: flex; gap: 10px;">
                    <button class="btn" onclick="hideChronoRanking()" style="background: #95a5a6;">
                        ⬅️ Retour aux séries
                    </button>
                    <button class="btn" onclick="showOverallChronoRanking()" style="background: #16a085;">
                        🔄 Changer de type
                    </button>
                    <button class="btn" onclick="exportChronoRankingToPDF()" style="background: linear-gradient(135deg, #e74c3c, #c0392b); color: white;">
                        📄 Export PDF
                    </button>
                </div>
            </div>

            <div style="background: linear-gradient(135deg, #16a085, #1abc9c); color: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
                <div style="font-size: 14px; opacity: 0.9;">Participants</div>
                <div style="font-size: 28px; font-weight: bold;">${ranked.length}</div>
            </div>

            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: linear-gradient(135deg, #16a085, #1abc9c); color: white;">
                            <th style="padding: 15px; text-align: center;">Pos. Scratch</th>
                            <th style="padding: 15px; text-align: left;">Participant</th>
                            <th style="padding: 15px; text-align: center;">Dossard</th>
                            <th style="padding: 15px; text-align: center;">Catégorie</th>
                            <th style="padding: 15px; text-align: center;">Pos. Cat.</th>
                            <th style="padding: 15px; text-align: center;">Séries</th>
                            <th style="padding: 15px; text-align: center;">Distance</th>
                            <th style="padding: 15px; text-align: center;">Temps</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${ranked.map((participant, index) => {
                            const position = index + 1;
                            const medal = position <= 3 ? medals[position - 1] : position;
                            const catMedal = participant.categoryPosition <= 3 ? medals[participant.categoryPosition - 1] : participant.categoryPosition;
                            const rowBg = position <= 3 ? 'background: linear-gradient(135deg, #fff9e6, #ffe9b3);' :
                                          index % 2 === 0 ? 'background: #f8f9fa;' : '';

                            return `
                                <tr style="${rowBg}">
                                    <td style="padding: 15px; text-align: center; font-size: 20px; font-weight: bold;">
                                        ${medal}
                                    </td>
                                    <td style="padding: 15px;">
                                        <div style="font-weight: bold; color: #2c3e50;">${participant.name}</div>
                                    </td>
                                    <td style="padding: 15px; text-align: center;">
                                        <span style="background: #3498db; color: white; padding: 5px 10px; border-radius: 5px; font-weight: bold;">
                                            ${participant.bib}
                                        </span>
                                    </td>
                                    <td style="padding: 15px; text-align: center; color: #7f8c8d;">
                                        ${participant.category || '-'}
                                    </td>
                                    <td style="padding: 15px; text-align: center; font-size: 18px; font-weight: bold; color: #f39c12;">
                                        ${catMedal}
                                    </td>
                                    <td style="padding: 15px; text-align: center; font-weight: bold; color: #e67e22;">
                                        ${participant.series ? participant.series.length : 1}
                                    </td>
                                    <td style="padding: 15px; text-align: center; font-weight: bold; color: #27ae60;">
                                        ${(participant.totalDistance / 1000).toFixed(2)} km
                                    </td>
                                    <td style="padding: 15px; text-align: center; font-weight: bold; color: #16a085; font-family: monospace;">
                                        ${formatTime(participant.totalTime)}
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

// Afficher un classement par temps (pour distances fixes)
function displayRankingByTime(ranked, title, distance) {
    const rankingSection = document.getElementById('overallChronoRanking');
    const medals = ['🥇', '🥈', '🥉'];
    const sportIcons = { running: '🏃', cycling: '🚴', swimming: '🏊', multisport: '🏅' };

    // Stocker les données pour l'export PDF
    lastChronoRankingData = {
        title: title,
        type: 'distance',
        participants: ranked,
        categoriesMap: null,
        distance: distance
    };

    rankingSection.innerHTML = `
        <div style="background: white; padding: 20px; border-radius: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;">
                <h3 style="margin: 0; color: #2c3e50;">${title}</h3>
                <div style="display: flex; gap: 10px;">
                    <button class="btn" onclick="hideChronoRanking()" style="background: #95a5a6;">
                        ⬅️ Retour aux séries
                    </button>
                    <button class="btn" onclick="showOverallChronoRanking()" style="background: #16a085;">
                        🔄 Changer de type
                    </button>
                    <button class="btn" onclick="exportChronoRankingToPDF()" style="background: linear-gradient(135deg, #e74c3c, #c0392b); color: white;">
                        📄 Export PDF
                    </button>
                </div>
            </div>

            <div style="background: linear-gradient(135deg, #16a085, #1abc9c); color: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
                <div style="font-size: 14px; opacity: 0.9;">Meilleur Temps sur ${distance}m</div>
                <div style="font-size: 28px; font-weight: bold;">${ranked.length} participants</div>
            </div>

            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: linear-gradient(135deg, #16a085, #1abc9c); color: white;">
                            <th style="padding: 15px; text-align: center;">Pos.</th>
                            <th style="padding: 15px; text-align: left;">Participant</th>
                            <th style="padding: 15px; text-align: center;">Dossard</th>
                            <th style="padding: 15px; text-align: center;">Catégorie</th>
                            <th style="padding: 15px; text-align: center;">Épreuve</th>
                            <th style="padding: 15px; text-align: center;">Temps</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${ranked.map((participant, index) => {
                            const position = index + 1;
                            const medal = position <= 3 ? medals[position - 1] : position;
                            const rowBg = position <= 3 ? 'background: linear-gradient(135deg, #fff9e6, #ffe9b3);' :
                                          index % 2 === 0 ? 'background: #f8f9fa;' : '';

                            return `
                                <tr style="${rowBg}">
                                    <td style="padding: 15px; text-align: center; font-size: 20px; font-weight: bold;">
                                        ${medal}
                                    </td>
                                    <td style="padding: 15px;">
                                        <div style="font-weight: bold; color: #2c3e50;">${participant.name}</div>
                                    </td>
                                    <td style="padding: 15px; text-align: center;">
                                        <span style="background: #3498db; color: white; padding: 5px 10px; border-radius: 5px; font-weight: bold;">
                                            ${participant.bib}
                                        </span>
                                    </td>
                                    <td style="padding: 15px; text-align: center; color: #7f8c8d;">
                                        ${participant.category || '-'}
                                    </td>
                                    <td style="padding: 15px; text-align: center; color: #7f8c8d; font-size: 12px;">
                                        ${sportIcons[participant.sportType] || ''} ${participant.eventName}<br>
                                        <span style="opacity: 0.7;">${participant.serieName}</span>
                                    </td>
                                    <td style="padding: 15px; text-align: center; font-weight: bold; color: #27ae60; font-family: monospace; font-size: 18px;">
                                        ${formatTime(participant.time)}
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

// Variable pour stocker les données du dernier classement affiché
let lastChronoRankingData = {
    title: '',
    type: '',
    participants: [],
    categoriesMap: null
};

// Variable pour stocker les données du classement interclub
let lastInterclubRankingData = {
    eventsList: [],
    rankedClubs: [],
    pointsScale: []
};

// Afficher les classements par catégorie
function displayRankingByCategories(categoriesMap, customTitle = '📋 Classements par Catégorie') {
    const rankingSection = document.getElementById('overallChronoRanking');
    const categories = Object.keys(categoriesMap).sort();

    // Stocker les données pour l'export PDF
    lastChronoRankingData = {
        title: customTitle,
        type: 'category',
        participants: [],
        categoriesMap: categoriesMap
    };

    let html = `
        <div style="background: white; padding: 20px; border-radius: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;">
                <h3 style="margin: 0; color: #2c3e50;">${customTitle}</h3>
                <div style="display: flex; gap: 10px;">
                    <button class="btn" onclick="hideChronoRanking()" style="background: #95a5a6;">
                        ⬅️ Retour aux séries
                    </button>
                    <button class="btn" onclick="showOverallChronoRanking()" style="background: #16a085;">
                        🔄 Changer de type
                    </button>
                    <button class="btn" onclick="exportChronoRankingToPDF()" style="background: linear-gradient(135deg, #e74c3c, #c0392b); color: white;">
                        📄 Export PDF
                    </button>
                </div>
            </div>
    `;

    categories.forEach(category => {
        const participants = categoriesMap[category];
        const ranked = participants.sort((a, b) => {
            if (a.totalDistance !== b.totalDistance) {
                return b.totalDistance - a.totalDistance;
            }
            return a.totalTime - b.totalTime;
        });

        const medals = ['🥇', '🥈', '🥉'];

        html += `
            <div style="margin-bottom: 30px;">
                <h4 style="color: #2c3e50; background: linear-gradient(135deg, #f39c12, #e67e22); color: white; padding: 10px 15px; border-radius: 8px; margin-bottom: 15px;">
                    ${category} (${ranked.length} participant${ranked.length > 1 ? 's' : ''})
                </h4>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                    <thead>
                        <tr style="background: #f8f9fa; border-bottom: 2px solid #ddd;">
                            <th style="padding: 10px; text-align: center;">Pos.</th>
                            <th style="padding: 10px; text-align: left;">Participant</th>
                            <th style="padding: 10px; text-align: center;">Dossard</th>
                            <th style="padding: 10px; text-align: center;">Distance</th>
                            <th style="padding: 10px; text-align: center;">Temps</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${ranked.map((participant, index) => {
                            const position = index + 1;
                            const medal = position <= 3 ? medals[position - 1] : position;

                            return `
                                <tr style="${index % 2 === 0 ? 'background: #f8f9fa;' : ''}">
                                    <td style="padding: 10px; text-align: center; font-weight: bold;">
                                        ${medal}
                                    </td>
                                    <td style="padding: 10px; font-weight: bold; color: #2c3e50;">
                                        ${participant.name}
                                    </td>
                                    <td style="padding: 10px; text-align: center;">
                                        <span style="background: #3498db; color: white; padding: 3px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">
                                            ${participant.bib}
                                        </span>
                                    </td>
                                    <td style="padding: 10px; text-align: center; color: #27ae60; font-weight: bold;">
                                        ${(participant.totalDistance / 1000).toFixed(2)} km
                                    </td>
                                    <td style="padding: 10px; text-align: center; font-family: monospace; font-weight: bold; color: #16a085;">
                                        ${formatTime(participant.totalTime)}
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    });

    html += `</div>`;
    rankingSection.innerHTML = html;
}

// Afficher les classements par épreuve
function displayRankingByEvents(eventsMap, customTitle = '🏆 Classements par Épreuve') {
    const rankingSection = document.getElementById('overallChronoRanking');
    const eventIds = Object.keys(eventsMap);

    // Stocker les données pour l'export PDF
    lastChronoRankingData = {
        title: customTitle,
        type: 'event',
        participants: [],
        eventsMap: eventsMap
    };

    const sportIcons = { running: '🏃', cycling: '🚴', swimming: '🏊', multisport: '🏅' };

    let html = `
        <div style="background: white; padding: 20px; border-radius: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;">
                <h3 style="margin: 0; color: #2c3e50;">${customTitle}</h3>
                <div style="display: flex; gap: 10px;">
                    <button class="btn" onclick="hideChronoRanking()" style="background: #95a5a6;">
                        ⬅️ Retour aux séries
                    </button>
                    <button class="btn" onclick="showOverallChronoRanking()" style="background: #16a085;">
                        🔄 Changer de type
                    </button>
                    <button class="btn" onclick="exportChronoRankingToPDF()" style="background: linear-gradient(135deg, #e74c3c, #c0392b); color: white;">
                        📄 Export PDF
                    </button>
                </div>
            </div>
    `;

    // Parcourir chaque épreuve
    eventIds.forEach(eventId => {
        const eventData = eventsMap[eventId];
        const sportIcon = sportIcons[eventData.sportType] || '🏃';
        const distanceText = eventData.distance ? ` - ${eventData.distance}m` : '';

        html += `
            <div style="margin-bottom: 40px; border: 2px solid #3498db; border-radius: 10px; padding: 15px; background: linear-gradient(135deg, #f8f9fa, #ffffff);">
                <h4 style="color: white; background: linear-gradient(135deg, #3498db, #2980b9); padding: 12px 15px; border-radius: 8px; margin: 0 0 20px 0; display: flex; align-items: center; gap: 10px;">
                    ${sportIcon} ${eventData.eventName}${distanceText}
                    <span style="background: rgba(255,255,255,0.3); padding: 4px 10px; border-radius: 15px; font-size: 12px; margin-left: auto;">
                        ${eventData.series.length} série(s)
                    </span>
                </h4>
        `;

        // Parcourir chaque série de l'épreuve
        eventData.series.forEach((serieData, serieIndex) => {
            const medals = ['🥇', '🥈', '🥉'];

            if (serieData.status === 'completed' && serieData.participants.length > 0) {
                html += `
                    <div style="margin-bottom: 25px;">
                        <h5 style="color: #2c3e50; background: #ecf0f1; padding: 8px 12px; border-radius: 6px; margin-bottom: 12px; font-size: 14px;">
                            ${serieData.serieName} (${serieData.participants.length} participant${serieData.participants.length > 1 ? 's' : ''})
                        </h5>
                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 13px;">
                            <thead>
                                <tr style="background: #f8f9fa; border-bottom: 2px solid #ddd;">
                                    <th style="padding: 8px; text-align: center;">Pos.</th>
                                    <th style="padding: 8px; text-align: left;">Participant</th>
                                    <th style="padding: 8px; text-align: center;">Dossard</th>
                                    <th style="padding: 8px; text-align: center;">Catégorie</th>
                                    <th style="padding: 8px; text-align: center;">Club</th>
                                    <th style="padding: 8px; text-align: center;">Distance</th>
                                    <th style="padding: 8px; text-align: center;">Temps</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${serieData.participants.map((participant, index) => {
                                    const position = index + 1;
                                    const medal = position <= 3 ? medals[position - 1] : position;

                                    return `
                                        <tr style="${index % 2 === 0 ? 'background: #f8f9fa;' : ''}">
                                            <td style="padding: 8px; text-align: center; font-weight: bold; font-size: 16px;">
                                                ${medal}
                                            </td>
                                            <td style="padding: 8px; font-weight: bold; color: #2c3e50;">
                                                ${participant.name}
                                            </td>
                                            <td style="padding: 8px; text-align: center;">
                                                <span style="background: #3498db; color: white; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">
                                                    ${participant.bib}
                                                </span>
                                            </td>
                                            <td style="padding: 8px; text-align: center; color: #7f8c8d;">
                                                ${participant.category || '-'}
                                            </td>
                                            <td style="padding: 8px; text-align: center; color: #7f8c8d;">
                                                ${participant.club || '-'}
                                            </td>
                                            <td style="padding: 8px; text-align: center; color: #27ae60; font-weight: bold;">
                                                ${(participant.totalDistance / 1000).toFixed(2)} km
                                            </td>
                                            <td style="padding: 8px; text-align: center; font-family: monospace; font-weight: bold; color: #3498db;">
                                                ${formatTime(participant.totalTime)}
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
            } else if (serieData.status !== 'completed') {
                html += `
                    <div style="margin-bottom: 15px; padding: 10px; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
                        <span style="color: #856404; font-size: 13px;">
                            ⏳ ${serieData.serieName} - ${serieData.status === 'running' ? 'En cours' : 'Non démarrée'}
                        </span>
                    </div>
                `;
            } else {
                html += `
                    <div style="margin-bottom: 15px; padding: 10px; background: #f8d7da; border-left: 4px solid #dc3545; border-radius: 4px;">
                        <span style="color: #721c24; font-size: 13px;">
                            ℹ️ ${serieData.serieName} - Aucun participant n'a terminé
                        </span>
                    </div>
                `;
            }
        });

        html += `</div>`;
    });

    html += `</div>`;
    rankingSection.innerHTML = html;
}

// ========================================
// EXPORT PDF DU CLASSEMENT CHRONO
// ========================================

window.exportChronoRankingToPDF = function() {
    if (!lastChronoRankingData || !lastChronoRankingData.title) {
        alert('Aucun classement à exporter. Veuillez d\'abord afficher un classement.');
        return;
    }

    // Ouvrir le modal de configuration des colonnes
    showChronoPdfConfigModal();
};

// Afficher le modal de configuration PDF
function showChronoPdfConfigModal() {
    const modal = document.getElementById('chronoPdfConfigModal');
    const checkboxesContainer = document.getElementById('pdfColumnsCheckboxes');
    const titleInput = document.getElementById('pdfCustomTitle');
    const defaultTitleSpan = document.getElementById('pdfDefaultTitle');

    const data = lastChronoRankingData;

    // Afficher le titre par défaut et vider le champ de saisie
    defaultTitleSpan.textContent = data.title;
    titleInput.value = '';
    titleInput.placeholder = `Ex: ${data.title} 2025`;

    let columns = [];

    // Définir les colonnes disponibles selon le type de classement
    if (data.type === 'category') {
        columns = [
            { id: 'position', label: 'Position', checked: true },
            { id: 'name', label: 'Nom du participant', checked: true },
            { id: 'bib', label: 'Dossard', checked: true },
            { id: 'distance', label: 'Distance totale', checked: true },
            { id: 'time', label: 'Temps total', checked: true }
        ];
    } else if (data.type === 'event') {
        columns = [
            { id: 'position', label: 'Position', checked: true },
            { id: 'name', label: 'Nom du participant', checked: true },
            { id: 'bib', label: 'Dossard', checked: true },
            { id: 'category', label: 'Catégorie', checked: true },
            { id: 'club', label: 'Club', checked: true },
            { id: 'distance', label: 'Distance totale', checked: true },
            { id: 'time', label: 'Temps total', checked: true }
        ];
    } else if (data.type === 'distance') {
        columns = [
            { id: 'position', label: 'Position', checked: true },
            { id: 'name', label: 'Nom du participant', checked: true },
            { id: 'bib', label: 'Dossard', checked: true },
            { id: 'category', label: 'Catégorie', checked: true },
            { id: 'event', label: 'Épreuve/Série', checked: true },
            { id: 'time', label: 'Temps', checked: true }
        ];
    } else {
        // Classement standard (global, par sport, par type, multi-épreuves)
        columns = [
            { id: 'position', label: 'Position', checked: true },
            { id: 'name', label: 'Nom du participant', checked: true },
            { id: 'bib', label: 'Dossard', checked: true },
            { id: 'category', label: 'Catégorie', checked: true },
            { id: 'series', label: 'Nombre de séries', checked: true },
            { id: 'distance', label: 'Distance totale', checked: true },
            { id: 'time', label: 'Temps total', checked: true }
        ];
    }

    // Générer les checkboxes
    checkboxesContainer.innerHTML = columns.map(col => `
        <label style="display: flex; align-items: center; padding: 10px; background: #f8f9fa; border-radius: 8px; cursor: pointer; transition: background 0.2s;"
               onmouseover="this.style.background='#e9ecef'"
               onmouseout="this.style.background='#f8f9fa'">
            <input type="checkbox"
                   id="pdfCol_${col.id}"
                   ${col.checked ? 'checked' : ''}
                   ${col.id === 'position' || col.id === 'name' ? 'disabled' : ''}
                   style="margin-right: 10px; width: 18px; height: 18px; cursor: pointer;">
            <span style="font-size: 14px; color: #2c3e50;">
                ${col.label}
                ${col.id === 'position' || col.id === 'name' ? '<span style="color: #95a5a6; font-size: 12px; margin-left: 5px;">(obligatoire)</span>' : ''}
            </span>
        </label>
    `).join('');

    modal.style.display = 'block';
}

// Fermer le modal de configuration PDF
window.closeChronoPdfConfigModal = function() {
    document.getElementById('chronoPdfConfigModal').style.display = 'none';
};

// Confirmer et générer le PDF avec les colonnes sélectionnées
window.confirmChronoPdfExport = function() {
    // Récupérer le titre personnalisé (ou utiliser le titre par défaut)
    const customTitle = document.getElementById('pdfCustomTitle').value.trim();
    const finalTitle = customTitle || lastChronoRankingData.title;

    // Récupérer les colonnes sélectionnées
    const selectedColumns = {
        position: true, // Toujours inclus
        name: true, // Toujours inclus
        bib: document.getElementById('pdfCol_bib')?.checked ?? true,
        category: document.getElementById('pdfCol_category')?.checked ?? true,
        club: document.getElementById('pdfCol_club')?.checked ?? true,
        series: document.getElementById('pdfCol_series')?.checked ?? true,
        distance: document.getElementById('pdfCol_distance')?.checked ?? true,
        time: document.getElementById('pdfCol_time')?.checked ?? true,
        event: document.getElementById('pdfCol_event')?.checked ?? true
    };

    closeChronoPdfConfigModal();
    generateChronoPDF(selectedColumns, finalTitle);
};

// Générer le PDF avec les colonnes sélectionnées
function generateChronoPDF(selectedColumns, customTitle) {
    const currentDate = new Date().toLocaleDateString('fr-FR', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });

    const data = lastChronoRankingData;
    const pdfTitle = customTitle || data.title; // Utiliser le titre personnalisé ou le titre par défaut
    let tableRows = '';

    // Compter les colonnes affichées pour le colspan
    const visibleColumnsCount = Object.values(selectedColumns).filter(v => v).length;

    // Générer le contenu selon le type de classement
    if (data.type === 'category' && data.categoriesMap) {
        // Classement par catégorie
        const categories = Object.keys(data.categoriesMap).sort();
        categories.forEach(category => {
            const participants = data.categoriesMap[category].sort((a, b) => {
                if (a.totalDistance !== b.totalDistance) return b.totalDistance - a.totalDistance;
                return a.totalTime - b.totalTime;
            });

            tableRows += `
                <tr style="background: linear-gradient(135deg, #f39c12, #e67e22); color: white;">
                    <td colspan="${visibleColumnsCount}" style="padding: 12px; font-weight: bold; font-size: 16px;">
                        ${category} (${participants.length} participant${participants.length > 1 ? 's' : ''})
                    </td>
                </tr>
            `;

            participants.forEach((p, idx) => {
                const pos = idx + 1;
                const medal = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : pos;
                let row = '<tr style="' + (idx % 2 === 0 ? 'background: #f8f9fa;' : '') + '">';

                if (selectedColumns.position) row += `<td style="padding: 10px; text-align: center; font-weight: bold;">${medal}</td>`;
                if (selectedColumns.name) row += `<td style="padding: 10px;">${p.name}</td>`;
                if (selectedColumns.bib) row += `<td style="padding: 10px; text-align: center;">${p.bib}</td>`;
                if (selectedColumns.distance) row += `<td style="padding: 10px; text-align: center;">${(p.totalDistance / 1000).toFixed(2)} km</td>`;
                if (selectedColumns.time) row += `<td style="padding: 10px; text-align: center; font-family: monospace;">${formatTime(p.totalTime)}</td>`;

                row += '</tr>';
                tableRows += row;
            });
        });
    } else if (data.type === 'event' && data.eventsMap) {
        // Classement par épreuve
        const eventIds = Object.keys(data.eventsMap);
        const sportIcons = { running: '🏃', cycling: '🚴', swimming: '🏊', multisport: '🏅' };

        eventIds.forEach(eventId => {
            const eventData = data.eventsMap[eventId];
            const sportIcon = sportIcons[eventData.sportType] || '🏃';
            const distanceText = eventData.distance ? ` - ${eventData.distance}m` : '';

            // En-tête de l'épreuve
            tableRows += `
                <tr style="background: linear-gradient(135deg, #3498db, #2980b9); color: white;">
                    <td colspan="${visibleColumnsCount}" style="padding: 15px; font-weight: bold; font-size: 18px;">
                        ${sportIcon} ${eventData.eventName}${distanceText}
                    </td>
                </tr>
            `;

            // Parcourir chaque série
            eventData.series.forEach(serieData => {
                if (serieData.status === 'completed' && serieData.participants.length > 0) {
                    // Sous-en-tête de la série
                    tableRows += `
                        <tr style="background: #ecf0f1;">
                            <td colspan="${visibleColumnsCount}" style="padding: 10px; font-weight: bold; font-size: 14px; color: #2c3e50;">
                                ${serieData.serieName} (${serieData.participants.length} participant${serieData.participants.length > 1 ? 's' : ''})
                            </td>
                        </tr>
                    `;

                    // Lignes des participants
                    serieData.participants.forEach((p, idx) => {
                        const pos = idx + 1;
                        const medal = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : pos;
                        let row = '<tr style="' + (idx % 2 === 0 ? 'background: #f8f9fa;' : '') + '">';

                        if (selectedColumns.position) row += `<td style="padding: 8px; text-align: center; font-weight: bold; font-size: 16px;">${medal}</td>`;
                        if (selectedColumns.name) row += `<td style="padding: 8px; font-weight: bold;">${p.name}</td>`;
                        if (selectedColumns.bib) row += `<td style="padding: 8px; text-align: center;">${p.bib}</td>`;
                        if (selectedColumns.category) row += `<td style="padding: 8px; text-align: center;">${p.category || '-'}</td>`;
                        if (selectedColumns.club) row += `<td style="padding: 8px; text-align: center;">${p.club || '-'}</td>`;
                        if (selectedColumns.distance) row += `<td style="padding: 8px; text-align: center;">${(p.totalDistance / 1000).toFixed(2)} km</td>`;
                        if (selectedColumns.time) row += `<td style="padding: 8px; text-align: center; font-family: monospace; font-weight: bold;">${formatTime(p.totalTime)}</td>`;

                        row += '</tr>';
                        tableRows += row;
                    });
                } else if (serieData.status !== 'completed') {
                    // Série non terminée
                    tableRows += `
                        <tr style="background: #fff3cd;">
                            <td colspan="${visibleColumnsCount}" style="padding: 8px; color: #856404; font-size: 12px;">
                                ⏳ ${serieData.serieName} - ${serieData.status === 'running' ? 'En cours' : 'Non démarrée'}
                            </td>
                        </tr>
                    `;
                } else {
                    // Série terminée sans participants
                    tableRows += `
                        <tr style="background: #f8d7da;">
                            <td colspan="${visibleColumnsCount}" style="padding: 8px; color: #721c24; font-size: 12px;">
                                ℹ️ ${serieData.serieName} - Aucun participant n'a terminé
                            </td>
                        </tr>
                    `;
                }
            });

            // Ligne de séparation entre les épreuves
            tableRows += `
                <tr>
                    <td colspan="${visibleColumnsCount}" style="padding: 10px;"></td>
                </tr>
            `;
        });
    } else if (data.type === 'distance') {
        // Classement par temps (distance fixe)
        data.participants.forEach((p, idx) => {
            const pos = idx + 1;
            const medal = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : pos;
            const sportIcons = { running: '🏃', cycling: '🚴', swimming: '🏊', multisport: '🏅' };
            const sportIcon = sportIcons[p.sportType] || '';

            let row = `<tr style="${pos <= 3 ? 'background: linear-gradient(135deg, #fff9e6, #ffe9b3);' : idx % 2 === 0 ? 'background: #f8f9fa;' : ''}">`;

            if (selectedColumns.position) row += `<td style="padding: 12px; text-align: center; font-weight: bold; font-size: 18px;">${medal}</td>`;
            if (selectedColumns.name) row += `<td style="padding: 12px; font-weight: bold;">${p.name}</td>`;
            if (selectedColumns.bib) row += `<td style="padding: 12px; text-align: center;">${p.bib}</td>`;
            if (selectedColumns.category) row += `<td style="padding: 12px; text-align: center;">${p.category || '-'}</td>`;
            if (selectedColumns.event) row += `<td style="padding: 12px; text-align: center; font-size: 11px;">${sportIcon} ${p.eventName}<br>${p.serieName}</td>`;
            if (selectedColumns.time) row += `<td style="padding: 12px; text-align: center; font-weight: bold; font-family: monospace; font-size: 16px; color: #27ae60;">${formatTime(p.time)}</td>`;

            row += '</tr>';
            tableRows += row;
        });
    } else {
        // Classement standard (global, par sport, par type, multi-épreuves)
        data.participants.forEach((p, idx) => {
            const pos = idx + 1;
            const medal = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : pos;

            let row = `<tr style="${pos <= 3 ? 'background: linear-gradient(135deg, #fff9e6, #ffe9b3);' : idx % 2 === 0 ? 'background: #f8f9fa;' : ''}">`;

            if (selectedColumns.position) row += `<td style="padding: 12px; text-align: center; font-weight: bold; font-size: 18px;">${medal}</td>`;
            if (selectedColumns.name) row += `<td style="padding: 12px; font-weight: bold;">${p.name}</td>`;
            if (selectedColumns.bib) row += `<td style="padding: 12px; text-align: center;">${p.bib}</td>`;
            if (selectedColumns.category) row += `<td style="padding: 12px; text-align: center;">${p.category || '-'}</td>`;
            if (selectedColumns.series) row += `<td style="padding: 12px; text-align: center;">${p.series ? p.series.length : 1}</td>`;
            if (selectedColumns.distance) row += `<td style="padding: 12px; text-align: center; font-weight: bold; color: #27ae60;">${(p.totalDistance / 1000).toFixed(2)} km</td>`;
            if (selectedColumns.time) row += `<td style="padding: 12px; text-align: center; font-weight: bold; font-family: monospace; color: #16a085;">${formatTime(p.totalTime)}</td>`;

            row += '</tr>';
            tableRows += row;
        });
    }

    // Définir les en-têtes de tableau selon le type et les colonnes sélectionnées
    let tableHeaders = '';
    if (data.type === 'category') {
        if (selectedColumns.position) tableHeaders += `<th style="padding: 12px; text-align: center;">Pos.</th>`;
        if (selectedColumns.name) tableHeaders += `<th style="padding: 12px; text-align: left;">Participant</th>`;
        if (selectedColumns.bib) tableHeaders += `<th style="padding: 12px; text-align: center;">Dossard</th>`;
        if (selectedColumns.distance) tableHeaders += `<th style="padding: 12px; text-align: center;">Distance</th>`;
        if (selectedColumns.time) tableHeaders += `<th style="padding: 12px; text-align: center;">Temps</th>`;
    } else if (data.type === 'event') {
        if (selectedColumns.position) tableHeaders += `<th style="padding: 8px; text-align: center;">Pos.</th>`;
        if (selectedColumns.name) tableHeaders += `<th style="padding: 8px; text-align: left;">Participant</th>`;
        if (selectedColumns.bib) tableHeaders += `<th style="padding: 8px; text-align: center;">Dossard</th>`;
        if (selectedColumns.category) tableHeaders += `<th style="padding: 8px; text-align: center;">Catégorie</th>`;
        if (selectedColumns.club) tableHeaders += `<th style="padding: 8px; text-align: center;">Club</th>`;
        if (selectedColumns.distance) tableHeaders += `<th style="padding: 8px; text-align: center;">Distance</th>`;
        if (selectedColumns.time) tableHeaders += `<th style="padding: 8px; text-align: center;">Temps</th>`;
    } else if (data.type === 'distance') {
        if (selectedColumns.position) tableHeaders += `<th style="padding: 12px; text-align: center;">Pos.</th>`;
        if (selectedColumns.name) tableHeaders += `<th style="padding: 12px; text-align: left;">Participant</th>`;
        if (selectedColumns.bib) tableHeaders += `<th style="padding: 12px; text-align: center;">Dossard</th>`;
        if (selectedColumns.category) tableHeaders += `<th style="padding: 12px; text-align: center;">Catégorie</th>`;
        if (selectedColumns.event) tableHeaders += `<th style="padding: 12px; text-align: center;">Épreuve</th>`;
        if (selectedColumns.time) tableHeaders += `<th style="padding: 12px; text-align: center;">Temps</th>`;
    } else {
        if (selectedColumns.position) tableHeaders += `<th style="padding: 12px; text-align: center;">Pos.</th>`;
        if (selectedColumns.name) tableHeaders += `<th style="padding: 12px; text-align: left;">Participant</th>`;
        if (selectedColumns.bib) tableHeaders += `<th style="padding: 12px; text-align: center;">Dossard</th>`;
        if (selectedColumns.category) tableHeaders += `<th style="padding: 12px; text-align: center;">Catégorie</th>`;
        if (selectedColumns.series) tableHeaders += `<th style="padding: 12px; text-align: center;">Séries</th>`;
        if (selectedColumns.distance) tableHeaders += `<th style="padding: 12px; text-align: center;">Distance Totale</th>`;
        if (selectedColumns.time) tableHeaders += `<th style="padding: 12px; text-align: center;">Temps Total</th>`;
    }

    const htmlContent = `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${pdfTitle} - Mode Chrono</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    font-family: 'Arial', sans-serif;
                    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
                    padding: 25px;
                }
                .container {
                    background: white;
                    border-radius: 15px;
                    padding: 30px;
                    max-width: 1200px;
                    margin: 0 auto;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                }
                .header {
                    text-align: center;
                    margin-bottom: 30px;
                    padding: 25px;
                    background: white;
                    border: 2px solid #ddd;
                    border-radius: 12px;
                }
                .header h1 {
                    font-size: 32px;
                    margin-bottom: 10px;
                    color: #000000;
                    font-weight: bold;
                }
                .header .date {
                    font-size: 14px;
                    color: #666666;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 20px;
                }
                thead tr {
                    background: linear-gradient(135deg, #16a085, #1abc9c);
                    color: white;
                }
                th {
                    padding: 15px;
                    font-weight: bold;
                }
                td {
                    border-bottom: 1px solid #ddd;
                }
                @media print {
                    body { background: white; padding: 0; }
                    .container { box-shadow: none; }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>⏱️ ${pdfTitle}</h1>
                    <div class="date">Généré le ${currentDate}</div>
                </div>
                <table>
                    <thead>
                        <tr>${tableHeaders}</tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </div>
        </body>
        </html>
    `;

    // Ouvrir dans une nouvelle fenêtre
    const newWindow = window.open('', '_blank');
    if (!newWindow) {
        alert('Veuillez autoriser les pop-ups pour exporter le PDF');
        return;
    }

    newWindow.document.write(htmlContent);
    newWindow.document.close();

    setTimeout(() => {
        newWindow.focus();
        const alertMessage = "✅ Page d'export créée avec succès !\n\n" +
                            "Pour enregistrer en PDF :\n" +
                            "1. Appuyez sur Ctrl+P (ou Cmd+P sur Mac)\n" +
                            "2. Choisissez 'Enregistrer au format PDF'\n" +
                            "3. Cliquez sur 'Enregistrer'\n\n" +
                            "Voulez-vous ouvrir la boîte de dialogue d'impression maintenant ?";

        if (newWindow.confirm(alertMessage)) {
            newWindow.print();
        }
    }, 500);

    showNotification('Page d\'export PDF ouverte dans un nouvel onglet !', 'success');
};

// Générer le classement général de toutes les séries
function generateOverallChronoRanking() {
    const rankingSection = document.getElementById('overallChronoRanking');

    // Collecter tous les participants de toutes les séries terminées
    const allParticipants = [];

    // Parcourir toutes les épreuves et leurs séries
    raceData.events.forEach(event => {
        event.series.forEach(serie => {
            if (serie.status === 'completed') {
                serie.participants.forEach(participant => {
                    // Vérifier si le participant existe déjà dans le classement général
                    const existingIndex = allParticipants.findIndex(
                        p => p.bib === participant.bib
                    );

                    if (existingIndex !== -1) {
                        // Ajouter les performances de cette série
                        allParticipants[existingIndex].series.push({
                            eventName: event.name,
                            serieName: serie.name,
                            distance: participant.totalDistance,
                            time: participant.finishTime || participant.totalTime,
                            laps: participant.laps.length,
                            bestLap: participant.bestLap
                        });
                        allParticipants[existingIndex].totalDistance += participant.totalDistance;
                        allParticipants[existingIndex].totalTime += (participant.finishTime || participant.totalTime);
                        allParticipants[existingIndex].totalLaps += participant.laps.length;
                    } else {
                        // Nouveau participant dans le classement général
                        allParticipants.push({
                            name: participant.name,
                            bib: participant.bib,
                            category: participant.category,
                            series: [{
                                eventName: event.name,
                                serieName: serie.name,
                                distance: participant.totalDistance,
                                time: participant.finishTime || participant.totalTime,
                                laps: participant.laps.length,
                                bestLap: participant.bestLap
                            }],
                            totalDistance: participant.totalDistance,
                            totalTime: participant.finishTime || participant.totalTime,
                            totalLaps: participant.laps.length
                        });
                    }
                });
            }
        });
    });

    if (allParticipants.length === 0) {
        displayEmptyRanking('🏆 Classement Général', 'Aucune série terminée. Terminez au moins une série pour voir le classement général.');
        return;
    }

    // Trier par distance totale, puis par temps total
    const ranked = allParticipants.sort((a, b) => {
        if (a.totalDistance !== b.totalDistance) {
            return b.totalDistance - a.totalDistance;
        }
        return a.totalTime - b.totalTime;
    });

    // Utiliser la fonction d'affichage standard
    displayRanking(ranked, '🏆 Classement Général', 'global');
}

// ANCIENNE VERSION CONSERVÉE POUR RÉFÉRENCE - À SUPPRIMER SI TOUT FONCTIONNE
function generateOverallChronoRanking_OLD() {
    const rankingSection = document.getElementById('overallChronoRanking');
    const medals = ['🥇', '🥈', '🥉'];
    const sportEmoji = {
        running: '🏃',
        cycling: '🚴',
        swimming: '🏊'
    };

    rankingSection.innerHTML = `
        <div style="background: white; padding: 20px; border-radius: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="margin: 0; color: #2c3e50;">🏆 Classement Général de la Journée</h3>
                <button class="btn" onclick="hideChronoRanking()" style="background: #95a5a6;">
                    ⬅️ Retour aux séries
                </button>
            </div>

            <div style="background: linear-gradient(135deg, #16a085, #1abc9c); color: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
                    <div>
                        <div style="font-size: 14px; opacity: 0.9;">Participants</div>
                        <div style="font-size: 28px; font-weight: bold;">${ranked.length}</div>
                    </div>
                    <div>
                        <div style="font-size: 14px; opacity: 0.9;">Séries Terminées</div>
                        <div style="font-size: 28px; font-weight: bold;">${raceData.events.reduce((count, event) => count + event.series.filter(s => s.status === 'completed').length, 0)}</div>
                    </div>
                    <div>
                        <div style="font-size: 14px; opacity: 0.9;">Distance Totale</div>
                        <div style="font-size: 28px; font-weight: bold;">
                            ${(ranked.reduce((sum, p) => sum + p.totalDistance, 0) / 1000).toFixed(2)} km
                        </div>
                    </div>
                </div>
            </div>

            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; background: white;">
                    <thead>
                        <tr style="background: linear-gradient(135deg, #16a085, #1abc9c); color: white;">
                            <th style="padding: 15px; text-align: center;">Pos.</th>
                            <th style="padding: 15px; text-align: left;">Participant</th>
                            <th style="padding: 15px; text-align: center;">Séries</th>
                            <th style="padding: 15px; text-align: center;">Tours Total</th>
                            <th style="padding: 15px; text-align: center;">Distance Totale</th>
                            <th style="padding: 15px; text-align: center;">Temps Total</th>
                            <th style="padding: 15px; text-align: center;">Détails</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${ranked.map((participant, index) => {
                            const position = index + 1;
                            const medal = position <= 3 ? medals[position - 1] : position;
                            const rowBg = position <= 3 ? 'background: linear-gradient(135deg, #fff9e6, #ffe9b3);' :
                                          index % 2 === 0 ? 'background: #f8f9fa;' : '';

                            return `
                                <tr style="${rowBg} border-bottom: 1px solid #ecf0f1;">
                                    <td style="padding: 15px; text-align: center; font-size: 28px; font-weight: bold;">
                                        ${medal}
                                    </td>
                                    <td style="padding: 15px;">
                                        <div style="font-weight: bold; font-size: 18px; color: #2c3e50;">${participant.name}</div>
                                        <div style="font-size: 13px; color: #7f8c8d; margin-top: 3px;">Dossard ${participant.bib} • ${participant.category}</div>
                                    </td>
                                    <td style="padding: 15px; text-align: center; font-weight: bold; font-size: 16px; color: #3498db;">
                                        ${participant.series.length}
                                    </td>
                                    <td style="padding: 15px; text-align: center; font-weight: bold; font-size: 18px;">
                                        ${participant.totalLaps}
                                    </td>
                                    <td style="padding: 15px; text-align: center; font-weight: bold; font-size: 18px; color: #27ae60;">
                                        ${(participant.totalDistance / 1000).toFixed(2)} km
                                    </td>
                                    <td style="padding: 15px; text-align: center; font-family: monospace; font-weight: bold; font-size: 16px;">
                                        ${formatTime(participant.totalTime)}
                                    </td>
                                    <td style="padding: 15px;">
                                        <details style="cursor: pointer;">
                                            <summary style="font-weight: bold; color: #16a085; user-select: none;">Voir détails</summary>
                                            <div style="margin-top: 10px; padding: 10px; background: #f8f9fa; border-radius: 5px;">
                                                ${participant.series.map((serie, idx) => {
                                                    // Trouver l'épreuve correspondante pour obtenir le type de sport
                                                    let emoji = '🏃';
                                                    for (const event of raceData.events) {
                                                        if (event.name === serie.eventName) {
                                                            emoji = sportEmoji[event.sportType] || '🏃';
                                                            break;
                                                        }
                                                    }
                                                    return `
                                                        <div style="padding: 8px 0; border-bottom: 1px solid #e0e0e0;">
                                                            <div style="font-weight: bold; color: #2c3e50;">${emoji} ${serie.eventName} - ${serie.serieName}</div>
                                                            <div style="font-size: 12px; color: #7f8c8d; margin-top: 3px;">
                                                                ${serie.laps} tours • ${(serie.distance / 1000).toFixed(2)} km • ${formatTime(serie.time)}
                                                                ${serie.bestLap ? ` • Meilleur tour: ${formatTime(serie.bestLap)}` : ''}
                                                            </div>
                                                        </div>
                                                    `;
                                                }).join('')}
                                            </div>
                                        </details>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>

            <div style="margin-top: 20px; text-align: center;">
                <button class="btn btn-success" onclick="exportOverallChronoRanking()" style="margin-right: 10px;">
                    📊 Exporter JSON
                </button>
                <button class="btn" onclick="exportOverallChronoRankingToPDF()" style="background: linear-gradient(135deg, #e74c3c, #c0392b); color: white; margin-right: 10px;">
                    📄 Exporter PDF
                </button>
                <button class="btn" onclick="printOverallChronoRanking()" style="background: linear-gradient(135deg, #95a5a6, #7f8c8d); color: white;">
                    🖨️ Imprimer
                </button>
            </div>
        </div>
    `;
}

// Exporter le classement général en JSON
window.exportOverallChronoRanking = function() {
    const allParticipants = [];

    // Parcourir toutes les épreuves et leurs séries
    raceData.events.forEach(event => {
        event.series.forEach(serie => {
            if (serie.status === 'completed') {
                serie.participants.forEach(participant => {
                    const existingIndex = allParticipants.findIndex(
                        p => p.bib === participant.bib
                    );

                    if (existingIndex !== -1) {
                        allParticipants[existingIndex].series.push({
                            eventName: event.name,
                            serieName: serie.name,
                            distance: participant.totalDistance,
                            time: participant.finishTime || participant.totalTime,
                            laps: participant.laps.length,
                            bestLap: participant.bestLap
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
                                laps: participant.laps.length,
                                bestLap: participant.bestLap
                            }],
                            totalDistance: participant.totalDistance,
                            totalTime: participant.finishTime || participant.totalTime,
                            totalLaps: participant.laps.length
                        });
                    }
                });
            }
        });
    });

    const ranked = allParticipants.sort((a, b) => {
        if (a.totalDistance !== b.totalDistance) {
            return b.totalDistance - a.totalDistance;
        }
        return a.totalTime - b.totalTime;
    });

    const exportData = {
        exportDate: new Date().toISOString(),
        totalParticipants: ranked.length,
        totalSeriesCompleted: raceData.events.reduce((count, event) => count + event.series.filter(s => s.status === 'completed').length, 0),
        ranking: ranked.map((p, index) => ({
            position: index + 1,
            name: p.name,
            bib: p.bib,
            category: p.category,
            totalDistance: p.totalDistance,
            totalTime: p.totalTime,
            totalLaps: p.totalLaps,
            seriesCount: p.series.length,
            series: p.series
        }))
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `classement-general-chrono-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);

    showNotification('Classement général exporté avec succès!', 'success');
};

// Imprimer le classement général
window.printOverallChronoRanking = function() {
    window.print();
};

// ============================================
// EXPORT / IMPORT COMPÉTITION CHRONO
// ============================================

// Exporter toute la compétition chrono en JSON
window.exportChronoCompetition = function() {
    // Afficher une modale pour choisir le nom du fichier
    const defaultName = `competition-chrono-${new Date().toISOString().slice(0,10)}`;

    const modal = document.createElement('div');
    modal.id = 'exportChronoModal';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 10000;';

    modal.innerHTML = `
        <div style="background: white; padding: 20px; border-radius: 8px; max-width: 400px; width: 90%;">
            <h3 style="margin: 0 0 15px 0; color: #16a085; font-size: 16px;">Exporter la compétition chrono</h3>
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-size: 13px; color: #555;">Nom du fichier :</label>
                <input type="text" id="exportChronoFileName" value="${defaultName}"
                       style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px; box-sizing: border-box;">
                <span style="font-size: 11px; color: #888;">.json</span>
            </div>
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button onclick="document.getElementById('exportChronoModal').remove()"
                        style="padding: 8px 15px; border: 1px solid #ddd; background: #f5f5f5; border-radius: 4px; cursor: pointer; font-size: 13px;">
                    Annuler
                </button>
                <button onclick="confirmExportChronoCompetition()"
                        style="padding: 8px 15px; border: none; background: #16a085; color: white; border-radius: 4px; cursor: pointer; font-size: 13px;">
                    Exporter
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Focus sur le champ de saisie et sélectionner le texte
    const input = document.getElementById('exportChronoFileName');
    input.focus();
    input.select();

    // Permettre l'export avec Entrée
    input.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            confirmExportChronoCompetition();
        }
    });
};

window.confirmExportChronoCompetition = function() {
    const input = document.getElementById('exportChronoFileName');
    let fileName = input.value.trim();

    if (!fileName) {
        fileName = `competition-chrono-${new Date().toISOString().slice(0,10)}`;
    }

    // Retirer l'extension .json si l'utilisateur l'a ajoutée
    fileName = fileName.replace(/\.json$/i, '');

    const exportData = {
        version: "1.0",
        exportDate: new Date().toISOString(),
        competitionName: fileName,
        raceData: {
            events: raceData.events,
            participants: raceData.participants,
            nextEventId: raceData.nextEventId,
            nextSerieId: raceData.nextSerieId,
            nextParticipantId: raceData.nextParticipantId
        },
        stats: {
            totalEvents: raceData.events.length,
            totalParticipants: raceData.participants.length,
            totalSeries: raceData.events.reduce((count, event) => count + event.series.length, 0),
            completedSeries: raceData.events.reduce((count, event) => count + event.series.filter(s => s.status === 'completed').length, 0)
        }
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}.json`;
    link.click();
    URL.revokeObjectURL(url);

    // Fermer la modale
    document.getElementById('exportChronoModal').remove();

    showNotification('Compétition chrono exportée avec succès !', 'success');
};

// Imprimer les épreuves et séries du mode chrono
window.printChronoCompetition = function() {
    if (raceData.events.length === 0) {
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
                <div class="stat"><strong>${raceData.events.length}</strong> épreuve(s)</div>
                <div class="stat"><strong>${raceData.events.reduce((c, e) => c + e.series.length, 0)}</strong> série(s)</div>
                <div class="stat"><strong>${raceData.participants.length}</strong> participant(s)</div>
            </div>
    `;

    // Parcourir les épreuves
    raceData.events.forEach(event => {
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
window.importChronoCompetition = function() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const importedData = JSON.parse(event.target.result);

                // Vérifier la version
                if (!importedData.version) {
                    throw new Error('Fichier non valide : version manquante');
                }

                // Demander confirmation
                const stats = importedData.stats || {};
                const confirmMsg = `Voulez-vous importer cette compétition ?\n\n` +
                                  `📅 Date d'export : ${new Date(importedData.exportDate).toLocaleDateString()}\n` +
                                  `🏅 Épreuves : ${stats.totalEvents || 0}\n` +
                                  `👥 Participants : ${stats.totalParticipants || 0}\n` +
                                  `📊 Séries : ${stats.totalSeries || 0} (dont ${stats.completedSeries || 0} terminées)\n\n` +
                                  `⚠️ Attention : Cela remplacera toutes les données actuelles du mode chrono !`;

                if (!confirm(confirmMsg)) {
                    return;
                }

                // Importer les données
                if (importedData.raceData) {
                    raceData.events = importedData.raceData.events || [];
                    raceData.participants = importedData.raceData.participants || [];
                    raceData.nextEventId = importedData.raceData.nextEventId || 1;
                    raceData.nextSerieId = importedData.raceData.nextSerieId || 1;
                    raceData.nextParticipantId = importedData.raceData.nextParticipantId || 1;
                }

                // Sauvegarder et rafraîchir l'affichage
                saveChronoToLocalStorage();
                displayEventsList();
                displayParticipantsList();

                showNotification('Compétition chrono importée avec succès !', 'success');
            } catch (error) {
                console.error('Erreur import:', error);
                showNotification('Erreur lors de l\'import : ' + error.message, 'error');
            }
        };
        reader.readAsText(file);
    };

    input.click();
};

// Exporter le classement général chrono en PDF
window.exportOverallChronoRankingToPDF = function() {
    // Collecter tous les participants de toutes les séries terminées
    const allParticipants = [];

    raceData.events.forEach(event => {
        event.series.forEach(serie => {
            if (serie.status === 'completed') {
                serie.participants.forEach(participant => {
                    const existingIndex = allParticipants.findIndex(
                        p => p.bib === participant.bib
                    );

                    if (existingIndex !== -1) {
                        allParticipants[existingIndex].series.push({
                            eventName: event.name,
                            serieName: serie.name,
                            distance: participant.totalDistance,
                            time: participant.finishTime || participant.totalTime,
                            laps: participant.laps.length,
                            bestLap: participant.bestLap
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
                                laps: participant.laps.length,
                                bestLap: participant.bestLap
                            }],
                            totalDistance: participant.totalDistance,
                            totalTime: participant.finishTime || participant.totalTime,
                            totalLaps: participant.laps.length
                        });
                    }
                });
            }
        });
    });

    if (allParticipants.length === 0) {
        showNotification('Aucune série terminée à exporter', 'warning');
        return;
    }

    // Trier par distance totale, puis par temps total
    const ranked = allParticipants.sort((a, b) => {
        if (a.totalDistance !== b.totalDistance) {
            return b.totalDistance - a.totalDistance;
        }
        return a.totalTime - b.totalTime;
    });

    const medals = ['🥇', '🥈', '🥉'];
    const totalSeriesCompleted = raceData.events.reduce((count, event) =>
        count + event.series.filter(s => s.status === 'completed').length, 0);

    // Créer la page HTML pour l'impression
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Classement Général Chrono - ${new Date().toLocaleDateString()}</title>
<style>
    @media print {
        body { margin: 0; }
        @page { margin: 1cm; }
    }
    body {
        font-family: Arial, sans-serif;
        padding: 20px;
        background: white;
    }
    .header {
        text-align: center;
        margin-bottom: 30px;
        border-bottom: 3px solid #16a085;
        padding-bottom: 20px;
    }
    h1 {
        color: #2c3e50;
        margin: 0;
        font-size: 32px;
    }
    .subtitle {
        color: #7f8c8d;
        font-size: 16px;
        margin-top: 10px;
    }
    .stats-box {
        display: flex;
        justify-content: space-around;
        margin: 20px 0;
        padding: 15px;
        background: linear-gradient(135deg, #16a085, #1abc9c);
        color: white;
        border-radius: 8px;
    }
    .stat-item {
        text-align: center;
    }
    .stat-label {
        font-size: 14px;
        opacity: 0.9;
    }
    .stat-value {
        font-size: 24px;
        font-weight: bold;
        margin-top: 5px;
    }
    table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 20px;
    }
    th {
        background: linear-gradient(135deg, #16a085, #1abc9c);
        color: white;
        padding: 12px;
        text-align: left;
        font-weight: bold;
    }
    th.center, td.center {
        text-align: center;
    }
    td {
        padding: 10px;
        border-bottom: 1px solid #ecf0f1;
    }
    tr:nth-child(even) {
        background: #f8f9fa;
    }
    .podium {
        background: linear-gradient(135deg, #fff9e6, #ffe9b3) !important;
        font-weight: bold;
    }
    .medal {
        font-size: 24px;
    }
    .participant-name {
        font-weight: bold;
        color: #2c3e50;
        font-size: 16px;
    }
    .participant-info {
        font-size: 12px;
        color: #7f8c8d;
        margin-top: 3px;
    }
    .footer {
        margin-top: 40px;
        text-align: center;
        color: #95a5a6;
        font-size: 12px;
        border-top: 1px solid #ecf0f1;
        padding-top: 20px;
    }
</style>
</head>
<body>
<div class="header">
    <h1>🏆 Classement Général de la Journée</h1>
    <div class="subtitle">Compétition Chrono - ${new Date().toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })}</div>
</div>

<div class="stats-box">
    <div class="stat-item">
        <div class="stat-label">Participants</div>
        <div class="stat-value">${ranked.length}</div>
    </div>
    <div class="stat-item">
        <div class="stat-label">Séries Terminées</div>
        <div class="stat-value">${totalSeriesCompleted}</div>
    </div>
    <div class="stat-item">
        <div class="stat-label">Distance Totale</div>
        <div class="stat-value">${(ranked.reduce((sum, p) => sum + p.totalDistance, 0) / 1000).toFixed(2)} km</div>
    </div>
</div>

<table>
    <thead>
        <tr>
            <th class="center">Position</th>
            <th>Participant</th>
            <th class="center">Séries</th>
            <th class="center">Tours Total</th>
            <th class="center">Distance Totale</th>
            <th class="center">Temps Total</th>
        </tr>
    </thead>
    <tbody>
        ${ranked.map((participant, index) => {
            const position = index + 1;
            const medal = position <= 3 ? medals[position - 1] : position;
            const rowClass = position <= 3 ? 'podium' : '';

            return `
                <tr class="${rowClass}">
                    <td class="center medal">${medal}</td>
                    <td>
                        <div class="participant-name">${participant.name}</div>
                        <div class="participant-info">Dossard ${participant.bib} • ${participant.category}</div>
                    </td>
                    <td class="center" style="font-weight: bold; color: #3498db;">${participant.series.length}</td>
                    <td class="center" style="font-weight: bold;">${participant.totalLaps}</td>
                    <td class="center" style="font-weight: bold; color: #27ae60;">${(participant.totalDistance / 1000).toFixed(2)} km</td>
                    <td class="center" style="font-family: monospace; font-weight: bold;">${formatTime(participant.totalTime)}</td>
                </tr>
            `;
        }).join('')}
    </tbody>
</table>

<div class="footer">
    Document généré le ${new Date().toLocaleString('fr-FR')} par le Gestionnaire de Championnats
</div>

<script>
    window.onload = function() {
        setTimeout(function() {
            window.print();
        }, 500);
    };
</script>
</body>
</html>
    `);
    printWindow.document.close();

    showNotification('Page d\'export PDF ouverte dans un nouvel onglet !', 'success');
};

// Formater le temps en HH:MM:SS.ms
function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = Math.floor((ms % 1000) / 10);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
}


})(window);
