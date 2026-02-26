// ============================================
// MODULE MULTISPORT - Gestion mixte Championship/Chrono
// ============================================
(function(global) {
    'use strict';

    // Accès direct à global.championship pour éviter les problèmes de référence
    // quand loadFromLocalStorage réassigne global.championship
    var showNotification = global.showNotification;
    var saveToLocalStorage = global.saveToLocalStorage;
    var formatTime = global.formatTime;

    // ============================================
    // TYPES DE JOURNÉES
    // ============================================

    var DAY_TYPES = {
        CHAMPIONSHIP: 'championship',
        CHRONO: 'chrono'
    };

    // ============================================
    // INITIALISATION MULTISPORT
    // ============================================

    function initMultisport() {
        // Migrer les données existantes si nécessaire
        Object.keys(global.championship.days).forEach(function(dayNumber) {
            var dayData = global.championship.days[dayNumber];
            if (!dayData.dayType) {
                dayData.dayType = DAY_TYPES.CHAMPIONSHIP;
            }
            if (!dayData.chronoData) {
                dayData.chronoData = {
                    events: [],
                    series: [],
                    participants: [],
                    nextEventId: 1,
                    nextSerieId: 1,
                    nextParticipantId: 1
                };
            }
        });
        saveToLocalStorage();
        
        // Initialiser la visibilité de l'onglet multisport
        initMultisportTab();
    }

    // ============================================
    // GESTION DU TYPE DE JOURNÉE
    // ============================================

    function setDayType(dayNumber, type) {
        if (!global.championship.days[dayNumber]) return false;
        
        global.championship.days[dayNumber].dayType = type;
        saveToLocalStorage();
        
        // Mettre à jour l'affichage
        updateDayTypeUI(dayNumber);
        
        // Mettre à jour la visibilité de l'onglet multisport
        updateMultisportTabVisibility();
        
        showNotification('Journée ' + dayNumber + ' : Mode ' + (type === DAY_TYPES.CHRONO ? 'Courses' : 'Matchs') + ' activé', 'success');
        return true;
    }
    
    // ============================================
    // DÉTECTION INTELLIGENTE DU MODE MULTISPORT
    // ============================================
    
    function isMultisportMode() {
        var hasChampionship = false;
        var hasChrono = false;
        
        Object.keys(global.championship.days).forEach(function(dayNumber) {
            var dayData = global.championship.days[dayNumber];
            if (!dayData || !dayData.dayType) return;
            
            if (dayData.dayType === DAY_TYPES.CHAMPIONSHIP) {
                hasChampionship = true;
            } else if (dayData.dayType === DAY_TYPES.CHRONO) {
                hasChrono = true;
            }
        });
        
        // Mode multisport = au moins une journée de chaque type
        return hasChampionship && hasChrono;
    }
    
    function updateMultisportTabVisibility() {
        var multisportTab = document.getElementById('multisportTab');
        if (!multisportTab) return;
        
        if (isMultisportMode()) {
            multisportTab.style.display = 'inline-block';
            // Petite animation pour attirer l'attention
            multisportTab.style.animation = 'pulse 1s ease-in-out';
            setTimeout(function() {
                multisportTab.style.animation = '';
            }, 1000);
        } else {
            multisportTab.style.display = 'none';
        }
    }
    
    // Initialiser la visibilité au chargement
    function initMultisportTab() {
        updateMultisportTabVisibility();
    }

    function getDayType(dayNumber) {
        if (!global.championship.days[dayNumber]) return DAY_TYPES.CHAMPIONSHIP;
        return global.championship.days[dayNumber].dayType || DAY_TYPES.CHAMPIONSHIP;
    }

    function toggleDayType(dayNumber) {
        var currentType = getDayType(dayNumber);
        var newType = currentType === DAY_TYPES.CHAMPIONSHIP ? DAY_TYPES.CHRONO : DAY_TYPES.CHAMPIONSHIP;
        return setDayType(dayNumber, newType);
    }

    // ============================================
    // INTERFACE UTILISATEUR
    // ============================================

    function updateDayTypeUI(dayNumber) {
        var dayType = getDayType(dayNumber);
        var container = document.getElementById('day-type-indicator-' + dayNumber);
        if (container) {
            container.innerHTML = getDayTypeBadge(dayType);
        }
        
        // Afficher/masquer les sections appropriées
        var chronoSection = document.getElementById('chrono-section-' + dayNumber);
        var championshipSection = document.getElementById('championship-section-' + dayNumber);
        
        if (chronoSection) {
            chronoSection.style.display = dayType === DAY_TYPES.CHRONO ? 'block' : 'none';
        }
        if (championshipSection) {
            championshipSection.style.display = dayType === DAY_TYPES.CHAMPIONSHIP ? 'block' : 'none';
        }
    }

    function getDayTypeBadge(type) {
        if (type === DAY_TYPES.CHRONO) {
            return '<span class="day-type-badge chrono" title="Mode Chrono (courses)">⏱️ CHRONO</span>';
        }
        return '<span class="day-type-badge championship" title="Mode Championship (matchs)">🎾 CHAMPIONSHIP</span>';
    }

    function createDayTypeSelector(dayNumber) {
        var dayType = getDayType(dayNumber);
        
        var html = '<div class="day-type-selector" style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px; padding: 10px; background: #f8f9fa; border-radius: 8px;">';
        html += '<span style="font-weight: bold; color: #2c3e50;">Type de journée:</span>';
        html += '<select id="day-type-select-' + dayNumber + '" onchange="setDayType(' + dayNumber + ', this.value)" style="padding: 8px 12px; border-radius: 6px; border: 2px solid #ddd; font-size: 14px; cursor: pointer;">';
        html += '<option value="' + DAY_TYPES.CHAMPIONSHIP + '" ' + (dayType === DAY_TYPES.CHAMPIONSHIP ? 'selected' : '') + '>🎾 Championship (Matchs)</option>';
        html += '<option value="' + DAY_TYPES.CHRONO + '" ' + (dayType === DAY_TYPES.CHRONO ? 'selected' : '') + '>⏱️ Chrono (Courses)</option>';
        html += '</select>';
        html += '<span id="day-type-indicator-' + dayNumber + '">' + getDayTypeBadge(dayType) + '</span>';
        html += '</div>';
        
        return html;
    }

    // ============================================
    // GESTION DES ÉPREUVES CHRONO PAR JOURNÉE
    // ============================================

    function getChronoDataForDay(dayNumber) {
        // S'assurer que la journée existe
        if (!global.championship.days[dayNumber]) {
            global.championship.days[dayNumber] = {
                players: {},
                matches: {},
                dayType: DAY_TYPES.CHAMPIONSHIP
            };
        }
        
        // S'assurer que chronoData existe
        if (!global.championship.days[dayNumber].chronoData) {
            global.championship.days[dayNumber].chronoData = {
                events: [],
                series: [],
                participants: [],
                nextEventId: 1,
                nextSerieId: 1,
                nextParticipantId: 1
            };
        }
        return global.championship.days[dayNumber].chronoData;
    }

    function addChronoEvent(dayNumber, eventName, eventDate) {
        var chronoData = getChronoDataForDay(dayNumber);
        if (!chronoData) return null;
        
        var event = {
            id: chronoData.nextEventId++,
            name: eventName,
            date: eventDate,
            createdAt: new Date().toISOString()
        };
        
        chronoData.events.push(event);
        saveToLocalStorage();
        return event;
    }

    function addChronoSerie(dayNumber, serieName, eventId, options) {
        var chronoData = getChronoDataForDay(dayNumber);
        if (!chronoData) return null;
        
        options = options || {};
        
        var serie = {
            id: chronoData.nextSerieId++,
            name: serieName,
            eventId: eventId || null,
            participants: [],
            isRunning: false,
            startTime: null,
            currentTime: 0,
            status: 'ready', // ready, running, completed
            results: [], // Résultats finaux
            // Options de course
            sportType: options.sportType || 'running', // running, cycling, swimming
            raceType: options.raceType || 'individual', // individual, relay, interclub
            distance: options.distance || 1000, // Distance par tour en mètres
            relayDuration: options.relayDuration || 60, // Durée relais en minutes
            laneMode: options.laneMode || false, // Mode couloirs (natation)
            interclubPoints: options.interclubPoints || [10, 8, 6, 5, 4, 3, 2, 1], // Barème interclub
            createdAt: new Date().toISOString()
        };
        
        chronoData.series.push(serie);
        saveToLocalStorage();
        return serie;
    }

    function addChronoParticipant(dayNumber, serieId, name, bib, options) {
        var chronoData = getChronoDataForDay(dayNumber);
        if (!chronoData) return null;
        
        var serie = chronoData.series.find(function(s) { return s.id === serieId; });
        if (!serie) return null;
        
        options = options || {};
        
        var participant = {
            id: chronoData.nextParticipantId++,
            name: name,
            bib: bib || serie.participants.length + 1,
            club: options.club || '',
            category: options.category || '',
            division: options.division || null,
            laneNumber: options.laneNumber || null,
            // État de la course
            status: 'ready', // ready, running, finished, dns
            totalTime: 0,
            finishTime: null,
            laps: [], // Tableau des tours détaillés
            totalDistance: 0,
            bestLap: null,
            lastLapStartTime: 0
        };
        
        serie.participants.push(participant);
        saveToLocalStorage();
        return participant;
    }

    function recordChronoResult(dayNumber, serieId, bib, time) {
        var chronoData = getChronoDataForDay(dayNumber);
        if (!chronoData) return false;
        
        var serie = chronoData.series.find(function(s) { return s.id === serieId; });
        if (!serie) return false;
        
        var participant = serie.participants.find(function(p) { return p.bib === bib; });
        if (!participant) return false;
        
        participant.totalTime = time;
        
        // Ajouter aux résultats si pas déjà présent
        var existingResult = serie.results.find(function(r) { return r.bib === bib; });
        if (!existingResult) {
            serie.results.push({
                bib: bib,
                name: participant.name,
                time: time
            });
        } else {
            existingResult.time = time;
        }
        
        saveToLocalStorage();
        return true;
    }

    // ============================================
    // AFFICHAGE INTERFACE CHRONO POUR UNE JOURNÉE
    // ============================================

    function renderChronoInterfaceForDay(dayNumber) {
        // S'assurer que les données chrono sont initialisées
        var chronoData = getChronoDataForDay(dayNumber);
        if (!chronoData) {
            // Initialiser si ce n'est pas déjà fait
            chronoData = {
                events: [],
                series: [],
                participants: [],
                nextEventId: 1,
                nextSerieId: 1,
                nextParticipantId: 1
            };
        }
        
        var html = '<div class="chrono-day-interface">';
        
        // En-tête compact avec actions sur une ligne (comme Championship)
        html += '<div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 15px; padding: 10px; background: #f8f9fa; border-radius: 8px;">';
        html += '<span style="font-size: 13px; color: #64748b; margin-right: 5px;">⏱️ Actions:</span>';
        html += '<button onclick="showAddEventModalForDay(' + dayNumber + ')" style="display: inline-flex; align-items: center; gap: 4px; padding: 8px 12px; font-size: 12px; background: #e67e22; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">🎯 Épreuve</button>';
        html += '<button onclick="showAddSerieModalForDay(' + dayNumber + ')" style="display: inline-flex; align-items: center; gap: 4px; padding: 8px 12px; font-size: 12px; background: #27ae60; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">🏃 Série</button>';
        html += '<span style="color: #cbd5e1;">|</span>';
        html += '<button onclick="showImportPlayersModal(' + dayNumber + ')" style="display: inline-flex; align-items: center; gap: 4px; padding: 8px 10px; font-size: 12px; background: #8b5cf6; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">📥 Importer participants</button>';
        html += '<span id="chrono-quick-copy-buttons-' + dayNumber + '" style="display: inline-flex; align-items: center; gap: 4px; flex-wrap: wrap;"></span>';
        html += '<span style="color: #cbd5e1;">|</span>';
        html += '<button onclick="refreshChronoDisplay(' + dayNumber + ')" style="display: inline-flex; align-items: center; gap: 4px; padding: 8px 10px; font-size: 12px; background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; border-radius: 6px; cursor: pointer; font-weight: 500;">🔄</button>';
        html += '</div>';
        
        // Générer les boutons de copie rapide après l'affichage
        setTimeout(function() { generateChronoQuickCopyButtons(dayNumber); }, 0);
        
        // Section Participants globaux
        html += renderParticipantsSection(dayNumber, chronoData);
        
        // Liste des épreuves
        html += '<div class="chrono-events-list">';
        if (chronoData.events.length === 0) {
            html += '<p style="color: #7f8c8d; text-align: center; padding: 15px; font-size: 13px;">Aucune épreuve. Créez-en une avec 🎯 Épreuve</p>';
        } else {
            chronoData.events.forEach(function(event) {
                html += renderEventCard(dayNumber, event, chronoData);
            });
        }
        html += '</div>';
        
        // Liste des séries sans épreuve
        var orphanSeries = chronoData.series.filter(function(s) { return !s.eventId; });
        if (orphanSeries.length > 0) {
            html += '<div class="chrono-orphan-series" style="margin-top: 15px;">';
            html += '<h4 style="font-size: 13px; color: #64748b; margin-bottom: 8px;">🏃 Séries indépendantes</h4>';
            orphanSeries.forEach(function(serie) {
                html += renderSerieCard(dayNumber, serie);
            });
            html += '</div>';
        }
        
        html += '</div>';
        return html;
    }

    function renderParticipantsSection(dayNumber, chronoData) {
        var participants = chronoData.participants || [];
        var series = chronoData.series || [];
        
        var html = '<div class="chrono-participants-section" style="background: white; border-radius: 8px; padding: 12px; margin-bottom: 15px; box-shadow: 0 1px 4px rgba(0,0,0,0.08);">';
        html += '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">';
        html += '<h4 style="margin: 0; color: #2c3e50; font-size: 14px;">👥 Participants disponibles (' + participants.length + ')</h4>';
        html += '<button onclick="showAddParticipantManualModal(' + dayNumber + ')" style="padding: 5px 10px; font-size: 12px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer;">➕ Ajouter</button>';
        html += '</div>';
        
        // Formulaire rapide d'ajout (toujours visible)
        html += '<div style="display: flex; gap: 8px; margin-bottom: 12px; padding: 10px; background: #f0f9ff; border-radius: 6px;">';
        html += '<input type="text" id="quick-participant-name-' + dayNumber + '" placeholder="Nom du participant" style="flex: 1; padding: 8px; border: 1px solid #cbd5e1; border-radius: 5px; font-size: 13px;">';
        html += '<input type="text" id="quick-participant-club-' + dayNumber + '" placeholder="Club (optionnel)" style="width: 120px; padding: 8px; border: 1px solid #cbd5e1; border-radius: 5px; font-size: 13px;">';
        html += '<button onclick="quickAddParticipantToDay(' + dayNumber + ')" style="padding: 8px 15px; background: #10b981; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: 600;">Ajouter</button>';
        html += '</div>';
        
        if (participants.length === 0) {
            html += '<p style="color: #95a5a6; font-size: 12px; text-align: center; margin: 0; padding: 15px;">Aucun participant encore. Ajoutez-en avec le formulaire ci-dessus, ou importez depuis une autre journée avec 📥 Importer.</p>';
        } else {
            html += '<div style="max-height: 150px; overflow-y: auto;">';
            participants.forEach(function(p) {
                html += '<div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 8px; margin-bottom: 4px; background: #f8f9fa; border-radius: 6px;">';
                html += '<span style="font-size: 12px; color: #2c3e50;">' + p.name + '</span>';
                
                if (series.length > 0) {
                    html += '<button onclick="showAddToSerieModal(' + dayNumber + ', ' + p.id + ')" ' +
                        'style="padding: 3px 8px; font-size: 11px; background: #27ae60; color: white; border: none; border-radius: 4px; cursor: pointer;">+</button>';
                } else {
                    html += '<span style="font-size: 10px; color: #95a5a6;">Créez une série</span>';
                }
                
                html += '</div>';
            });
            html += '</div>';
        }
        
        html += '</div>';
        return html;
    }

    /**
     * Ajoute rapidement un participant à la journée
     */
    function quickAddParticipantToDay(dayNumber) {
        var nameInput = document.getElementById('quick-participant-name-' + dayNumber);
        var clubInput = document.getElementById('quick-participant-club-' + dayNumber);
        
        if (!nameInput || !nameInput.value.trim()) {
            showNotification('Veuillez entrer un nom', 'warning');
            return;
        }
        
        var chronoData = getChronoDataForDay(dayNumber);
        if (!chronoData) return;
        
        var name = nameInput.value.trim();
        var club = clubInput ? clubInput.value.trim() : '';
        
        // Vérifier si déjà existe
        var exists = chronoData.participants.some(function(p) {
            return p.name.toLowerCase() === name.toLowerCase();
        });
        
        if (exists) {
            showNotification('Ce participant existe déjà', 'warning');
            return;
        }
        
        var participant = {
            id: chronoData.nextParticipantId++,
            name: name,
            club: club,
            bib: chronoData.participants.length + 1,
            totalTime: null,
            laps: 0
        };
        
        chronoData.participants.push(participant);
        saveToLocalStorage();
        
        // Vider les champs
        nameInput.value = '';
        if (clubInput) clubInput.value = '';
        nameInput.focus();
        
        refreshChronoDisplay(dayNumber);
        showNotification('Participant ajouté : ' + name, 'success');
    }

    /**
     * Affiche une modal pour ajouter plusieurs participants (bulk)
     */
    function showAddParticipantManualModal(dayNumber) {
        if (document.getElementById('addParticipantsModal-' + dayNumber)) return;
        
        var modal = document.createElement('div');
        modal.id = 'addParticipantsModal-' + dayNumber;
        modal.innerHTML = 
            '<div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; ' +
            'background: rgba(0,0,0,0.5); display: flex; justify-content: center; ' +
            'align-items: center; z-index: 10000;" onclick="if(event.target===this)closeAddParticipantsModal(' + dayNumber + ')">' +
            '<div style="background: white; padding: 30px; border-radius: 10px; max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto;">' +
            '<h3>➕ Ajouter des participants - Journée ' + dayNumber + '</h3>' +
            '<p style="color: #7f8c8d; font-size: 13px;">Entrez les noms (un par ligne). Format: Nom, Club (optionnel)</p>' +
            '<div style="margin: 15px 0;">' +
            '<textarea id="bulk-participants-' + dayNumber + '" rows="10" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-family: inherit;" placeholder="Dupont Jean\nMartin Pierre, Club ABC\nDurand Paul\n..."></textarea>' +
            '</div>' +
            '<div style="display: flex; gap: 10px; justify-content: flex-end;">' +
            '<button onclick="closeAddParticipantsModal(' + dayNumber + ')" class="btn btn-secondary">Annuler</button>' +
            '<button onclick="saveBulkParticipants(' + dayNumber + ')" class="btn btn-primary">💾 Ajouter</button>' +
            '</div></div></div>';
        
        document.body.appendChild(modal);
        
        // Focus sur le textarea
        setTimeout(function() {
            var textarea = document.getElementById('bulk-participants-' + dayNumber);
            if (textarea) textarea.focus();
        }, 100);
    }

    function closeAddParticipantsModal(dayNumber) {
        var modal = document.getElementById('addParticipantsModal-' + dayNumber);
        if (modal) modal.remove();
    }

    function saveBulkParticipants(dayNumber) {
        var textarea = document.getElementById('bulk-participants-' + dayNumber);
        if (!textarea || !textarea.value.trim()) {
            showNotification('Veuillez entrer au moins un nom', 'warning');
            return;
        }
        
        var chronoData = getChronoDataForDay(dayNumber);
        if (!chronoData) return;
        
        var lines = textarea.value.trim().split('\n');
        var added = 0;
        var skipped = 0;
        
        lines.forEach(function(line) {
            line = line.trim();
            if (!line) return;
            
            // Format: Nom, Club ou juste Nom
            var parts = line.split(',');
            var name = parts[0].trim();
            var club = parts[1] ? parts[1].trim() : '';
            
            if (!name) return;
            
            // Vérifier si existe déjà
            var exists = chronoData.participants.some(function(p) {
                return p.name.toLowerCase() === name.toLowerCase();
            });
            
            if (!exists) {
                chronoData.participants.push({
                    id: chronoData.nextParticipantId++,
                    name: name,
                    club: club,
                    bib: chronoData.participants.length + 1,
                    totalTime: null,
                    laps: 0
                });
                added++;
            } else {
                skipped++;
            }
        });
        
        saveToLocalStorage();
        closeAddParticipantsModal(dayNumber);
        refreshChronoDisplay(dayNumber);
        
        var msg = added + ' participant(s) ajouté(s)';
        if (skipped > 0) msg += ' (' + skipped + ' doublon(s) ignoré(s))';
        showNotification(msg, 'success');
    }
    
    function showAddToSerieModal(dayNumber, participantId) {
        var chronoData = getChronoDataForDay(dayNumber);
        if (!chronoData) return;
        
        var participant = chronoData.participants.find(function(p) { return p.id === participantId; });
        if (!participant) return;
        
        if (document.getElementById('addToSerieModal-' + dayNumber)) return;
        
        var html = '<div id="addToSerieModal-' + dayNumber + '" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; ' +
            'background: rgba(0,0,0,0.5); display: flex; justify-content: center; ' +
            'align-items: center; z-index: 10000;" onclick="if(event.target===this)closeAddToSerieModal(' + dayNumber + ')">' +
            '<div style="background: white; padding: 30px; border-radius: 10px; max-width: 400px; width: 90%;">' +
            '<h3>➕ Ajouter ' + participant.name + '</h3>' +
            '<p style="color: #7f8c8d; font-size: 13px; margin-bottom: 15px;">Sélectionnez une série :</p>' +
            '<div style="margin: 15px 0;">';
        
        chronoData.series.forEach(function(serie) {
            // Vérifier si déjà dans cette série
            var alreadyInSerie = serie.participants.some(function(existing) {
                return existing.name.toLowerCase() === participant.name.toLowerCase();
            });
            
            if (alreadyInSerie) {
                html += '<div style="padding: 12px; margin-bottom: 8px; background: #e8f5e9; border-radius: 8px; opacity: 0.6;">' +
                    '<strong style="font-size: 14px;">🏃 ' + serie.name + '</strong>' +
                    '<span style="color: #27ae60; font-size: 12px; margin-left: 10px;">✓ Déjà présent</span>' +
                    '</div>';
            } else {
                html += '<div onclick="addExistingParticipantToSerie(' + dayNumber + ', ' + participantId + ', ' + serie.id + ')" ' +
                    'style="padding: 12px; margin-bottom: 8px; background: #f8f9fa; border-radius: 8px; cursor: pointer; ' +
                    'border: 2px solid transparent; transition: all 0.2s;" ' +
                    'onmouseover="this.style.borderColor=\'#27ae60\'; this.style.background=\'#e8f5e9\';" ' +
                    'onmouseout="this.style.borderColor=\'transparent\'; this.style.background=\'#f8f9fa\';">' +
                    '<strong style="font-size: 14px;">🏃 ' + serie.name + '</strong>' +
                    '<span style="color: #7f8c8d; font-size: 12px; margin-left: 10px;">' + serie.participants.length + ' participants</span>' +
                    '</div>';
            }
        });
        
        html += '</div>' +
            '<div style="display: flex; gap: 10px; justify-content: flex-end;">' +
            '<button onclick="closeAddToSerieModal(' + dayNumber + ')" class="btn btn-secondary">Annuler</button>' +
            '</div></div></div>';
        
        document.body.insertAdjacentHTML('beforeend', html);
    }
    
    function closeAddToSerieModal(dayNumber) {
        var modal = document.getElementById('addToSerieModal-' + dayNumber);
        if (modal) modal.remove();
    }
    
    function addExistingParticipantToSerie(dayNumber, participantId, serieId) {
        var chronoData = getChronoDataForDay(dayNumber);
        if (!chronoData) return;
        
        var participant = chronoData.participants.find(function(p) { return p.id === participantId; });
        if (!participant) return;
        
        // Utiliser la fonction existante addChronoParticipant
        var result = addChronoParticipant(dayNumber, serieId, participant.name, null);
        
        if (result) {
            saveToLocalStorage();
            closeAddToSerieModal(dayNumber);
            refreshChronoDisplay(dayNumber);
            showNotification(participant.name + ' ajouté !', 'success');
        }
    }

    function renderEventCard(dayNumber, event, chronoData) {
        var eventSeries = chronoData.series.filter(function(s) { return s.eventId === event.id; });
        
        var html = '<div class="chrono-event-card" style="background: white; border-radius: 8px; padding: 12px; margin-bottom: 10px; box-shadow: 0 1px 4px rgba(0,0,0,0.08);">';
        html += '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">';
        html += '<div style="display: flex; align-items: center; gap: 8px;">';
        html += '<h4 style="margin: 0; color: #2c3e50; font-size: 14px;">🎯 ' + event.name + '</h4>';
        html += '<button onclick="editEvent(' + dayNumber + ', ' + event.id + ')" style="padding: 2px 6px; font-size: 11px; background: #ecf0f1; border: none; border-radius: 4px; cursor: pointer;" title="Modifier">✏️</button>';
        html += '</div>';
        html += '<span style="color: #7f8c8d; font-size: 11px;">' + (event.date || '') + '</span>';
        html += '</div>';
        
        if (eventSeries.length === 0) {
            html += '<p style="color: #95a5a6; font-size: 13px;">Aucune série</p>';
        } else {
            html += '<div class="event-series" style="display: grid; gap: 10px;">';
            eventSeries.forEach(function(serie) {
                html += renderSerieCard(dayNumber, serie, true);
            });
            html += '</div>';
        }
        
        html += '<button onclick="showAddSerieModalForDayAndEvent(' + dayNumber + ', ' + event.id + ')" style="display: inline-flex; align-items: center; gap: 4px; padding: 6px 10px; font-size: 11px; background: #ecf0f1; color: #2c3e50; border: none; border-radius: 5px; cursor: pointer; margin-top: 8px;">+ Série</button>';
        html += '</div>';
        
        return html;
    }

    function renderSerieCard(dayNumber, serie, compact) {
        var completedCount = serie.results ? serie.results.length : 0;
        var totalCount = serie.participants ? serie.participants.length : 0;
        var hasResults = completedCount > 0;
        
        var html = '<div class="chrono-serie-card" style="background: #f8f9fa; border-radius: 8px; padding: ' + (compact ? '8px 10px' : '10px 12px') + '; border-left: 4px solid ' + (completedCount === totalCount && totalCount > 0 ? '#27ae60' : '#3498db') + '; margin-bottom: 8px;">';
        html += '<div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">';
        html += '<div>';
        html += '<strong style="color: #2c3e50; font-size: 13px;">🏃 ' + serie.name + '</strong>';
        html += '<span style="color: #7f8c8d; font-size: 11px; margin-left: 8px;">' + completedCount + '/' + totalCount + ' résultats</span>';
        html += '</div>';
        html += '<div style="display: flex; gap: 4px;">';
        html += '<button onclick="manageSerieParticipants(' + dayNumber + ', ' + serie.id + ')" style="display: inline-flex; align-items: center; gap: 3px; padding: 5px 8px; font-size: 11px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer;" title="Gérer les participants">👥</button>';
        // Bouton Démarrer la course (si des participants existent)
        if (totalCount > 0) {
            html += '<button onclick="startChronoRaceForDay(' + dayNumber + ', ' + serie.id + ')" style="display: inline-flex; align-items: center; gap: 3px; padding: 5px 8px; font-size: 11px; background: #e74c3c; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;" title="Démarrer la course avec chronométrage">▶️ Course</button>';
        }
        html += '<button onclick="enterSerieResults(' + dayNumber + ', ' + serie.id + ')" style="display: inline-flex; align-items: center; gap: 3px; padding: 5px 8px; font-size: 11px; background: ' + (hasResults ? '#27ae60' : '#95a5a6') + '; color: white; border: none; border-radius: 5px; cursor: pointer;" title="Saisie manuelle des résultats">⏱️</button>';
        html += '<button onclick="showSerieRanking(' + dayNumber + ', ' + serie.id + ')" style="display: inline-flex; align-items: center; gap: 3px; padding: 5px 8px; font-size: 11px; background: #f39c12; color: white; border: none; border-radius: 5px; cursor: pointer;" title="Voir le classement">🏆</button>';
        html += '</div>';
        html += '</div>';
        html += '</div>';
        
        return html;
    }

    // ============================================
    // CALCUL DES POINTS MULTISPORT
    // ============================================

    // Système de points pour les courses (chrono)
    var CHRONO_POINTS = [20, 17, 15, 13, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]; // Points par position

    function calculateChronoPoints(position, totalParticipants) {
        if (position < 1) return 0;
        if (position <= CHRONO_POINTS.length) {
            return CHRONO_POINTS[position - 1];
        }
        return 1; // Point de participation
    }

    function getChronoResultsForDay(dayNumber) {
        var chronoData = getChronoDataForDay(dayNumber);
        if (!chronoData) return {};
        
        var results = {};
        
        chronoData.series.forEach(function(serie) {
            if (serie.results && serie.results.length > 0) {
                // Trier par temps
                var sorted = serie.results.slice().sort(function(a, b) {
                    return a.time - b.time;
                });
                
                sorted.forEach(function(result, index) {
                    var playerName = result.name;
                    if (!results[playerName]) {
                        results[playerName] = {
                            player: playerName,
                            series: [],
                            totalPoints: 0,
                            bestTime: null
                        };
                    }
                    
                    var points = calculateChronoPoints(index + 1, sorted.length);
                    results[playerName].series.push({
                        serieName: serie.name,
                        position: index + 1,
                        time: result.time,
                        points: points
                    });
                    results[playerName].totalPoints += points;
                    
                    if (!results[playerName].bestTime || result.time < results[playerName].bestTime) {
                        results[playerName].bestTime = result.time;
                    }
                });
            }
        });
        
        return results;
    }

    // ============================================
    // CLASSEMENT COMBINÉ MULTISPORT
    // ============================================

    // Helper pour extraire le nom et club du joueur
    function getPlayerName(player) {
        if (typeof player === 'object' && player !== null) {
            return player.name || '';
        }
        return String(player);
    }
    
    function getPlayerClub(player) {
        if (typeof player === 'object' && player !== null) {
            return player.club || '';
        }
        return '';
    }

    function calculateMultisportRanking() {
        var allStats = {};
        
        // Parcourir toutes les journées
        Object.keys(global.championship.days).forEach(function(dayNumber) {
            var dayData = global.championship.days[dayNumber];
            if (!dayData) return;
            
            var dayType = getDayType(dayNumber);
            
            if (dayType === DAY_TYPES.CHAMPIONSHIP) {
                // Récupérer les points du championnat
                if (dayData.players) {
                    for (var division = 1; division <= (global.config ? global.config.numberOfDivisions : 3); division++) {
                        var players = dayData.players[division] || [];
                        
                        players.forEach(function(player) {
                            var playerName = getPlayerName(player);
                            var playerClub = getPlayerClub(player);
                            
                            if (!allStats[playerName]) {
                                allStats[playerName] = createEmptyPlayerStats(playerName, playerClub);
                            }
                            
                            // Mettre à jour le club si on en trouve un
                            if (playerClub && !allStats[playerName].club) {
                                allStats[playerName].club = playerClub;
                            }
                            
                            var stats = global.calculatePlayerStats ? global.calculatePlayerStats(player, parseInt(dayNumber), division) : null;
                            if (stats) {
                                allStats[playerName].championshipPoints += stats.points;
                                allStats[playerName].championshipMatches += stats.played;
                                allStats[playerName].championshipWins += stats.wins;
                            }
                        });
                    }
                }
            } else if (dayType === DAY_TYPES.CHRONO) {
                // Récupérer les points chrono
                var chronoResults = getChronoResultsForDay(dayNumber);
                
                Object.keys(chronoResults).forEach(function(playerName) {
                    if (!allStats[playerName]) {
                        allStats[playerName] = createEmptyPlayerStats(playerName, '');
                    }
                    
                    allStats[playerName].chronoPoints += chronoResults[playerName].totalPoints;
                    allStats[playerName].chronoSeries += chronoResults[playerName].series.length;
                });
            }
        });
        
        // Calculer le total
        Object.keys(allStats).forEach(function(player) {
            allStats[player].totalPoints = allStats[player].championshipPoints + allStats[player].chronoPoints;
        });
        
        return allStats;
    }

    function createEmptyPlayerStats(playerName, playerClub) {
        return {
            player: playerName,
            club: playerClub || '',
            championshipPoints: 0,
            championshipMatches: 0,
            championshipWins: 0,
            chronoPoints: 0,
            chronoSeries: 0,
            totalPoints: 0
        };
    }

    function renderMultisportRanking() {
        var ranking = calculateMultisportRanking();
        var sorted = Object.values(ranking).sort(function(a, b) {
            return b.totalPoints - a.totalPoints;
        });
        
        var html = '<div class="multisport-ranking" style="background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">';
        html += '<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px;">';
        html += '<h2 style="margin: 0; text-align: center;">🏆 Classement Général Multisport</h2>';
        html += '<p style="margin: 10px 0 0 0; text-align: center; opacity: 0.9;">Championship + Courses</p>';
        html += '</div>';
        
        if (sorted.length === 0) {
            html += '<p style="text-align: center; padding: 40px; color: #7f8c8d;">Aucune donnée disponible</p>';
        } else {
            html += '<table class="ranking-table" style="width: 100%; border-collapse: collapse;">';
            html += '<thead><tr style="background: #f8f9fa;">';
            html += '<th style="padding: 15px; text-align: center;">#</th>';
            html += '<th style="padding: 15px; text-align: left;">Joueur</th>';
            html += '<th style="padding: 15px; text-align: center;">Club</th>';
            html += '<th style="padding: 15px; text-align: center;">🎾 Championship</th>';
            html += '<th style="padding: 15px; text-align: center;">⏱️ Chrono</th>';
            html += '<th style="padding: 15px; text-align: center; background: #e8f4f8;">Total</th>';
            html += '</tr></thead><tbody>';
            
            sorted.forEach(function(stat, index) {
                var rankClass = index < 3 ? 'rank-' + (index + 1) : '';
                var rowStyle = index % 2 === 0 ? 'background: white;' : 'background: #f8f9fa;';
                var clubBadge = stat.club ? '<span style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; font-size: 10px; padding: 2px 8px; border-radius: 10px;">' + stat.club + '</span>' : '-';
                
                html += '<tr class="' + rankClass + '" style="' + rowStyle + ' border-bottom: 1px solid #ecf0f1;">';
                html += '<td style="padding: 15px; text-align: center; font-weight: bold;">' + (index + 1) + '</td>';
                html += '<td style="padding: 15px; font-weight: bold; color: #2c3e50;">' + stat.player + '</td>';
                html += '<td style="padding: 15px; text-align: center;">' + clubBadge + '</td>';
                html += '<td style="padding: 15px; text-align: center;">';
                html += '<span style="font-weight: bold; color: #3498db;">' + stat.championshipPoints + ' pts</span>';
                html += '<br><small style="color: #7f8c8d;">' + stat.championshipWins + 'V / ' + stat.championshipMatches + 'J</small>';
                html += '</td>';
                html += '<td style="padding: 15px; text-align: center;">';
                html += '<span style="font-weight: bold; color: #e67e22;">' + stat.chronoPoints + ' pts</span>';
                html += '<br><small style="color: #7f8c8d;">' + stat.chronoSeries + ' séries</small>';
                html += '</td>';
                html += '<td style="padding: 15px; text-align: center; background: #e8f4f8; font-size: 1.2em;">';
                html += '<strong style="color: #27ae60;">' + stat.totalPoints + '</strong>';
                html += '</td>';
                html += '</tr>';
            });
            
            html += '</tbody></table>';
        }
        
        html += '</div>';
        return html;
    }

    // ============================================
    // MODALES POUR GESTION CHRONO PAR JOURNÉE
    // ============================================

    function showAddEventModalForDay(dayNumber) {
        if (document.getElementById('eventModal-' + dayNumber)) return;
        
        var modal = document.createElement('div');
        modal.id = 'eventModal-' + dayNumber;
        modal.innerHTML = 
            '<div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; ' +
            'background: rgba(0,0,0,0.5); display: flex; justify-content: center; ' +
            'align-items: center; z-index: 10000;" onclick="if(event.target===this)closeEventModalForDay(' + dayNumber + ')">' +
            '<div style="background: white; padding: 30px; border-radius: 10px; max-width: 400px; width: 90%;">' +
            '<h3>🎯 Nouvelle Épreuve - Journée ' + dayNumber + '</h3>' +
            '<div style="margin: 15px 0;">' +
            '<label>Nom :</label>' +
            '<input type="text" id="eventName-' + dayNumber + '" style="width: 100%; padding: 10px; margin-top: 5px;" placeholder="ex: Course de natation 50m">' +
            '</div>' +
            '<div style="margin: 15px 0;">' +
            '<label>Date :</label>' +
            '<input type="date" id="eventDate-' + dayNumber + '" style="width: 100%; padding: 10px; margin-top: 5px;">' +
            '</div>' +
            '<div style="display: flex; gap: 10px; justify-content: flex-end;">' +
            '<button onclick="closeEventModalForDay(' + dayNumber + ')" class="btn btn-secondary">Annuler</button>' +
            '<button onclick="saveEventForDay(' + dayNumber + ')" class="btn btn-primary">Sauvegarder</button>' +
            '</div></div></div>';
        
        document.body.appendChild(modal);
    }

    function closeEventModalForDay(dayNumber) {
        var modal = document.getElementById('eventModal-' + dayNumber);
        if (modal) modal.remove();
    }

    function saveEventForDay(dayNumber) {
        var nameInput = document.getElementById('eventName-' + dayNumber);
        var dateInput = document.getElementById('eventDate-' + dayNumber);
        
        if (!nameInput || !nameInput.value.trim()) {
            showNotification('Veuillez entrer un nom', 'warning');
            return;
        }
        
        var event = addChronoEvent(dayNumber, nameInput.value.trim(), dateInput ? dateInput.value : null);
        if (event) {
            closeEventModalForDay(dayNumber);
            refreshChronoDisplay(dayNumber);
            showNotification('Épreuve créée !', 'success');
        }
    }

    // ============================================
    // ÉDITION D'ÉPREUVE
    // ============================================

    function editEvent(dayNumber, eventId) {
        var chronoData = getChronoDataForDay(dayNumber);
        if (!chronoData) return;
        
        var event = chronoData.events.find(function(e) { return e.id === eventId; });
        if (!event) return;
        
        // Créer le modal d'édition
        if (document.getElementById('editEventModal-' + dayNumber)) return;
        
        var modal = document.createElement('div');
        modal.id = 'editEventModal-' + dayNumber;
        modal.innerHTML = 
            '<div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; ' +
            'background: rgba(0,0,0,0.5); display: flex; justify-content: center; ' +
            'align-items: center; z-index: 10000;" onclick="if(event.target===this)closeEditEventModal(' + dayNumber + ')">' +
            '<div style="background: white; padding: 30px; border-radius: 10px; max-width: 400px; width: 90%;">' +
            '<h3>✏️ Modifier l\'épreuve</h3>' +
            '<div style="margin: 15px 0;">' +
            '<label>Nom :</label>' +
            '<input type="text" id="editEventName-' + dayNumber + '-' + eventId + '" value="' + event.name.replace(/"/g, '&quot;') + '" style="width: 100%; padding: 10px; margin-top: 5px; border-radius: 6px; border: 1px solid #ddd;">' +
            '</div>' +
            '<div style="margin: 15px 0;">' +
            '<label>Date :</label>' +
            '<input type="date" id="editEventDate-' + dayNumber + '-' + eventId + '" value="' + (event.date || '') + '" style="width: 100%; padding: 10px; margin-top: 5px; border-radius: 6px; border: 1px solid #ddd;">' +
            '</div>' +
            '<div style="display: flex; gap: 10px; justify-content: flex-end;">' +
            '<button onclick="closeEditEventModal(' + dayNumber + ')" class="btn btn-secondary">Annuler</button>' +
            '<button onclick="saveEditedEvent(' + dayNumber + ', ' + eventId + ')" class="btn btn-primary">💾 Sauvegarder</button>' +
            '</div></div></div>';
        
        document.body.appendChild(modal);
    }

    function closeEditEventModal(dayNumber) {
        var modal = document.getElementById('editEventModal-' + dayNumber);
        if (modal) modal.remove();
    }

    function saveEditedEvent(dayNumber, eventId) {
        var chronoData = getChronoDataForDay(dayNumber);
        if (!chronoData) return;
        
        var event = chronoData.events.find(function(e) { return e.id === eventId; });
        if (!event) return;
        
        var nameInput = document.getElementById('editEventName-' + dayNumber + '-' + eventId);
        var dateInput = document.getElementById('editEventDate-' + dayNumber + '-' + eventId);
        
        if (!nameInput || !nameInput.value.trim()) {
            showNotification('Veuillez entrer un nom', 'warning');
            return;
        }
        
        event.name = nameInput.value.trim();
        event.date = dateInput ? dateInput.value : null;
        
        saveToLocalStorage();
        closeEditEventModal(dayNumber);
        refreshChronoDisplay(dayNumber);
        showNotification('Épreuve mise à jour !', 'success');
    }

    function showAddSerieModalForDay(dayNumber) {
        showAddSerieModalForDayAndEvent(dayNumber, null);
    }

    function showAddSerieModalForDayAndEvent(dayNumber, eventId) {
        if (document.getElementById('serieModal-' + dayNumber)) return;
        
        var modal = document.createElement('div');
        modal.id = 'serieModal-' + dayNumber;
        modal.innerHTML = 
            '<div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; ' +
            'background: rgba(0,0,0,0.5); display: flex; justify-content: center; ' +
            'align-items: center; z-index: 10000;" onclick="if(event.target===this)closeSerieModalForDay(' + dayNumber + ')">' +
            '<div style="background: white; padding: 30px; border-radius: 10px; max-width: 450px; width: 90%; max-height: 90vh; overflow-y: auto;">' +
            '<h3>🏃 Nouvelle Série - Journée ' + dayNumber + '</h3>' +
            '<div style="margin: 15px 0;">' +
            '<label>Nom :</label>' +
            '<input type="text" id="serieName-' + dayNumber + '" style="width: 100%; padding: 10px; margin-top: 5px;" placeholder="ex: Série 1, Finale A">' +
            '</div>' +
            '<input type="hidden" id="serieEventId-' + dayNumber + '" value="' + (eventId || '') + '">' +
            '<div style="margin: 15px 0;">' +
            '<label>Sport :</label>' +
            '<select id="serieSportType-' + dayNumber + '" style="width: 100%; padding: 10px; margin-top: 5px;">' +
            '<option value="running">🏃 Course à pied</option>' +
            '<option value="cycling">🚴 Cyclisme</option>' +
            '<option value="swimming">🏊 Natation</option>' +
            '</select>' +
            '</div>' +
            '<div style="margin: 15px 0;">' +
            '<label>Type de course :</label>' +
            '<select id="serieRaceType-' + dayNumber + '" style="width: 100%; padding: 10px; margin-top: 5px;" onchange="toggleRelayOptionsForDay(' + dayNumber + ')">' +
            '<option value="individual">Individuelle</option>' +
            '<option value="relay">Relais (durée limitée)</option>' +
            '<option value="interclub">Interclub (par club)</option>' +
            '</select>' +
            '</div>' +
            '<div style="margin: 15px 0;">' +
            '<label>Distance par tour (mètres) :</label>' +
            '<input type="number" id="serieDistance-' + dayNumber + '" value="1000" min="50" style="width: 100%; padding: 10px; margin-top: 5px;">' +
            '</div>' +
            '<div id="relayOptions-' + dayNumber + '" style="margin: 15px 0; display: none;">' +
            '<label>Durée du relais (minutes) :</label>' +
            '<input type="number" id="serieRelayDuration-' + dayNumber + '" value="60" min="5" style="width: 100%; padding: 10px; margin-top: 5px;">' +
            '</div>' +
            '<div style="margin: 15px 0;">' +
            '<label><input type="checkbox" id="serieLaneMode-' + dayNumber + '"> Mode couloirs (natation)</label>' +
            '</div>' +
            '<div style="display: flex; gap: 10px; justify-content: flex-end;">' +
            '<button onclick="closeSerieModalForDay(' + dayNumber + ')" class="btn btn-secondary">Annuler</button>' +
            '<button onclick="saveSerieForDay(' + dayNumber + ')" class="btn btn-primary">Sauvegarder</button>' +
            '</div></div></div>';
        
        document.body.appendChild(modal);
    }

    function toggleRelayOptionsForDay(dayNumber) {
        var raceType = document.getElementById('serieRaceType-' + dayNumber).value;
        var relaySection = document.getElementById('relayOptions-' + dayNumber);
        if (relaySection) {
            relaySection.style.display = raceType === 'relay' ? 'block' : 'none';
        }
    }

    function closeSerieModalForDay(dayNumber) {
        var modal = document.getElementById('serieModal-' + dayNumber);
        if (modal) modal.remove();
    }

    function saveSerieForDay(dayNumber) {
        var nameInput = document.getElementById('serieName-' + dayNumber);
        var eventIdInput = document.getElementById('serieEventId-' + dayNumber);
        
        if (!nameInput || !nameInput.value.trim()) {
            showNotification('Veuillez entrer un nom', 'warning');
            return;
        }
        
        var eventId = eventIdInput && eventIdInput.value ? parseInt(eventIdInput.value) : null;
        
        // Récupérer les options
        var options = {};
        var sportTypeInput = document.getElementById('serieSportType-' + dayNumber);
        var raceTypeInput = document.getElementById('serieRaceType-' + dayNumber);
        var distanceInput = document.getElementById('serieDistance-' + dayNumber);
        var relayDurationInput = document.getElementById('serieRelayDuration-' + dayNumber);
        var laneModeInput = document.getElementById('serieLaneMode-' + dayNumber);
        
        if (sportTypeInput) options.sportType = sportTypeInput.value;
        if (raceTypeInput) options.raceType = raceTypeInput.value;
        if (distanceInput) options.distance = parseInt(distanceInput.value) || 1000;
        if (relayDurationInput) options.relayDuration = parseInt(relayDurationInput.value) || 60;
        if (laneModeInput) options.laneMode = laneModeInput.checked;
        
        var serie = addChronoSerie(dayNumber, nameInput.value.trim(), eventId, options);
        
        if (serie) {
            closeSerieModalForDay(dayNumber);
            refreshChronoDisplay(dayNumber);
            showNotification('Série créée !', 'success');
        }
    }

    function manageSerieParticipants(dayNumber, serieId) {
        var chronoData = getChronoDataForDay(dayNumber);
        if (!chronoData) return;
        
        var serie = chronoData.series.find(function(s) { return s.id === serieId; });
        if (!serie) return;
        
        if (document.getElementById('participantsModal-' + dayNumber)) return;
        
        var modal = document.createElement('div');
        modal.id = 'participantsModal-' + dayNumber;
        modal.innerHTML = 
            '<div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; ' +
            'background: rgba(0,0,0,0.5); display: flex; justify-content: center; ' +
            'align-items: center; z-index: 10000;" onclick="if(event.target===this)closeParticipantsModal(' + dayNumber + ')">' +
            '<div style="background: white; padding: 30px; border-radius: 10px; max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto;">' +
            '<h3>👥 Participants - ' + serie.name + '</h3>' +
            '<div style="margin: 15px 0;">' +
            '<label>Ajouter un participant :</label>' +
            '<div style="display: flex; gap: 10px; margin-top: 5px;">' +
            '<input type="text" id="participantName-' + dayNumber + '-' + serieId + '" style="flex: 1; padding: 10px;" placeholder="Nom du participant">' +
            '<input type="number" id="participantBib-' + dayNumber + '-' + serieId + '" style="width: 80px; padding: 10px;" placeholder="Dossard">' +
            '<button onclick="addParticipantToSerie(' + dayNumber + ', ' + serieId + ')" class="btn btn-primary">+</button>' +
            '</div>' +
            '</div>' +
            '<div id="participantsList-' + dayNumber + '-' + serieId + '" style="margin: 20px 0;">' +
            renderParticipantsList(serie) +
            '</div>' +
            '<div style="display: flex; gap: 10px; justify-content: flex-end;">' +
            '<button onclick="closeParticipantsModal(' + dayNumber + ')" class="btn btn-secondary">Fermer</button>' +
            '</div></div></div>';
        
        document.body.appendChild(modal);
    }

    function renderParticipantsList(serie) {
        if (!serie.participants || serie.participants.length === 0) {
            return '<p style="color: #7f8c8d; text-align: center;">Aucun participant</p>';
        }
        
        var html = '<table style="width: 100%; border-collapse: collapse;">';
        html += '<thead><tr style="background: #f8f9fa;"><th style="padding: 10px;">Dossard</th><th style="padding: 10px;">Nom</th><th style="padding: 10px;">Action</th></tr></thead><tbody>';
        
        serie.participants.forEach(function(p) {
            html += '<tr style="border-bottom: 1px solid #ecf0f1;">';
            html += '<td style="padding: 10px; text-align: center;">#' + p.bib + '</td>';
            html += '<td style="padding: 10px;">' + p.name + '</td>';
            html += '<td style="padding: 10px; text-align: center;"><button onclick="removeParticipantFromSerie(' + serie.id + ', ' + p.id + ')" class="btn btn-sm btn-danger">🗑️</button></td>';
            html += '</tr>';
        });
        
        html += '</tbody></table>';
        return html;
    }

    function addParticipantToSerie(dayNumber, serieId) {
        var nameInput = document.getElementById('participantName-' + dayNumber + '-' + serieId);
        var bibInput = document.getElementById('participantBib-' + dayNumber + '-' + serieId);
        
        if (!nameInput || !nameInput.value.trim()) {
            showNotification('Veuillez entrer un nom', 'warning');
            return;
        }
        
        var bib = bibInput && bibInput.value ? parseInt(bibInput.value) : null;
        var participant = addChronoParticipant(dayNumber, serieId, nameInput.value.trim(), bib);
        
        if (participant) {
            nameInput.value = '';
            bibInput.value = '';
            nameInput.focus();
            
            // Rafraîchir la liste
            var chronoData = getChronoDataForDay(dayNumber);
            var serie = chronoData.series.find(function(s) { return s.id === serieId; });
            var listContainer = document.getElementById('participantsList-' + dayNumber + '-' + serieId);
            if (listContainer) {
                listContainer.innerHTML = renderParticipantsList(serie);
            }
            
            refreshChronoDisplay(dayNumber);
        }
    }

    function closeParticipantsModal(dayNumber) {
        var modal = document.getElementById('participantsModal-' + dayNumber);
        if (modal) modal.remove();
    }

    function enterSerieResults(dayNumber, serieId) {
        var chronoData = getChronoDataForDay(dayNumber);
        if (!chronoData) return;
        
        var serie = chronoData.series.find(function(s) { return s.id === serieId; });
        if (!serie) return;
        
        if (document.getElementById('resultsModal-' + dayNumber)) return;
        
        var modal = document.createElement('div');
        modal.id = 'resultsModal-' + dayNumber;
        modal.innerHTML = 
            '<div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; ' +
            'background: rgba(0,0,0,0.5); display: flex; justify-content: center; ' +
            'align-items: center; z-index: 10000;" onclick="if(event.target===this)closeResultsModal(' + dayNumber + ')">' +
            '<div style="background: white; padding: 30px; border-radius: 10px; max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto;">' +
            '<h3>⏱️ Saisie des résultats - ' + serie.name + '</h3>' +
            '<p style="color: #7f8c8d; font-size: 13px;">Format temps: mm:ss.ms ou secondes</p>' +
            '<div id="resultsForm-' + dayNumber + '-' + serieId + '">' +
            renderResultsForm(dayNumber, serie) +
            '</div>' +
            '<div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">' +
            '<button onclick="closeResultsModal(' + dayNumber + ')" class="btn btn-secondary">Annuler</button>' +
            '<button onclick="saveSerieResults(' + dayNumber + ', ' + serieId + ')" class="btn btn-primary">💾 Sauvegarder</button>' +
            '</div></div></div>';
        
        document.body.appendChild(modal);
    }

    function renderResultsForm(dayNumber, serie) {
        if (!serie.participants || serie.participants.length === 0) {
            return '<p style="color: #7f8c8d; text-align: center;">Aucun participant</p>';
        }
        
        var html = '<table style="width: 100%; border-collapse: collapse;">';
        html += '<thead><tr style="background: #f8f9fa;"><th style="padding: 10px;">Dossard</th><th style="padding: 10px;">Nom</th><th style="padding: 10px;">Temps</th></tr></thead><tbody>';
        
        serie.participants.forEach(function(p) {
            var existingTime = p.totalTime ? formatTime(p.totalTime) : '';
            html += '<tr style="border-bottom: 1px solid #ecf0f1;">';
            html += '<td style="padding: 10px; text-align: center;">#' + p.bib + '</td>';
            html += '<td style="padding: 10px;">' + p.name + '</td>';
            html += '<td style="padding: 10px;">';
            html += '<input type="text" id="result-time-' + p.bib + '" value="' + existingTime + '" style="padding: 8px; width: 120px;" placeholder="00:00.00">';
            html += '</td>';
            html += '</tr>';
        });
        
        html += '</tbody></table>';
        return html;
    }

    function parseTimeInput(input) {
        if (!input || !input.trim()) return null;
        
        input = input.trim().replace(',', '.');
        
        // Format mm:ss.ms ou mm:ss
        if (input.includes(':')) {
            var parts = input.split(':');
            var minutes = parseInt(parts[0]) || 0;
            var secondsParts = parts[1] ? parts[1].split('.') : ['0'];
            var seconds = parseInt(secondsParts[0]) || 0;
            var ms = secondsParts[1] ? parseInt(secondsParts[1].padEnd(3, '0').substring(0, 3)) : 0;
            return (minutes * 60 * 1000) + (seconds * 1000) + ms;
        }
        
        // Format secondes (avec ou sans décimales)
        var floatVal = parseFloat(input);
        if (!isNaN(floatVal)) {
            return Math.round(floatVal * 1000);
        }
        
        return null;
    }

    function saveSerieResults(dayNumber, serieId) {
        var chronoData = getChronoDataForDay(dayNumber);
        if (!chronoData) return;
        
        var serie = chronoData.series.find(function(s) { return s.id === serieId; });
        if (!serie) return;
        
        var savedCount = 0;
        serie.participants.forEach(function(p) {
            var timeInput = document.getElementById('result-time-' + p.bib);
            if (timeInput) {
                var time = parseTimeInput(timeInput.value);
                if (time !== null) {
                    recordChronoResult(dayNumber, serieId, p.bib, time);
                    savedCount++;
                }
            }
        });
        
        closeResultsModal(dayNumber);
        refreshChronoDisplay(dayNumber);
        showNotification(savedCount + ' résultat(s) enregistré(s)', 'success');
    }

    function closeResultsModal(dayNumber) {
        var modal = document.getElementById('resultsModal-' + dayNumber);
        if (modal) modal.remove();
    }

    function showSerieRanking(dayNumber, serieId) {
        var chronoData = getChronoDataForDay(dayNumber);
        if (!chronoData) return;
        
        var serie = chronoData.series.find(function(s) { return s.id === serieId; });
        if (!serie) return;
        
        if (document.getElementById('rankingModal-' + dayNumber)) return;
        
        var html = '<div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; ' +
            'background: rgba(0,0,0,0.5); display: flex; justify-content: center; ' +
            'align-items: center; z-index: 10000;" onclick="if(event.target===this)closeRankingModal(' + dayNumber + ')">' +
            '<div style="background: white; padding: 30px; border-radius: 10px; max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto;">' +
            '<h3>🏆 Classement - ' + serie.name + '</h3>';
        
        if (!serie.results || serie.results.length === 0) {
            html += '<p style="color: #7f8c8d; text-align: center;">Aucun résultat</p>';
        } else {
            // Trier par temps
            var sorted = serie.results.slice().sort(function(a, b) {
                return a.time - b.time;
            });
            
            html += '<table style="width: 100%; border-collapse: collapse; margin-top: 15px;">';
            html += '<thead><tr style="background: #f8f9fa;"><th style="padding: 10px;">Pos</th><th style="padding: 10px;">Nom</th><th style="padding: 10px;">Temps</th><th style="padding: 10px;">Points</th></tr></thead><tbody>';
            
            sorted.forEach(function(result, index) {
                var points = calculateChronoPoints(index + 1, sorted.length);
                var rankStyle = index < 3 ? 'font-weight: bold; color: ' + (index === 0 ? '#f1c40f' : index === 1 ? '#95a5a6' : '#cd7f32') + ';' : '';
                html += '<tr style="border-bottom: 1px solid #ecf0f1;">';
                html += '<td style="padding: 10px; text-align: center; ' + rankStyle + '">' + (index + 1) + '</td>';
                html += '<td style="padding: 10px; ' + rankStyle + '">' + result.name + '</td>';
                html += '<td style="padding: 10px; font-family: monospace;">' + formatTime(result.time) + '</td>';
                html += '<td style="padding: 10px; text-align: center; font-weight: bold; color: #27ae60;">+' + points + '</td>';
                html += '</tr>';
            });
            
            html += '</tbody></table>';
        }
        
        html += '<div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">' +
            '<button onclick="closeRankingModal(' + dayNumber + ')" class="btn btn-secondary">Fermer</button>' +
            '</div></div></div>';
        
        var modal = document.createElement('div');
        modal.id = 'rankingModal-' + dayNumber;
        modal.innerHTML = html;
        document.body.appendChild(modal);
    }

    function closeRankingModal(dayNumber) {
        var modal = document.getElementById('rankingModal-' + dayNumber);
        if (modal) modal.remove();
    }

    // ============================================
    // IMPORT DE JOUEURS ENTRE MODES
    // ============================================

    function showImportPlayersModal(dayNumber) {
        if (document.getElementById('importPlayersModal-' + dayNumber)) return;
        
        // S'assurer que dayNumber est un nombre
        var targetDayNum = parseInt(dayNumber);
        
        // Forcer la relecture des données depuis localStorage pour être sûr
        try {
            var saved = localStorage.getItem('tennisTableChampionship');
            if (saved) {
                var loaded = JSON.parse(saved);
                if (loaded.days) {
                    global.championship.days = loaded.days;
                }
            }
        } catch (e) {
            console.warn('Erreur relecture localStorage:', e);
        }
        
        // Récupérer toutes les journées précédentes avec des joueurs
        var availableDays = [];
        var allDays = Object.keys(global.championship.days);
        
        allDays.forEach(function(dayNum) {
            var dayNumInt = parseInt(dayNum);
            
            // Ne prendre que les journées AVANT la journée courante
            if (dayNumInt >= targetDayNum) return;
            
            var dayData = global.championship.days[dayNum];
            if (!dayData) return;
            
            var playerCount = 0;
            var dayType = dayData.dayType || 'championship';
            
            if (dayType === 'championship') {
                // Mode Championship - compter les joueurs dans les divisions
                if (dayData.players) {
                    // Parcourir toutes les clés de l'objet players (1, 2, 3, etc.)
                    Object.keys(dayData.players).forEach(function(divKey) {
                        var players = dayData.players[divKey];
                        if (players && Array.isArray(players)) {
                            playerCount += players.length;
                        }
                    });
                }
            } else if (dayType === 'chrono') {
                // Mode Chrono - compter les participants uniques
                if (dayData.chronoData && dayData.chronoData.series) {
                    var uniqueParticipants = {};
                    dayData.chronoData.series.forEach(function(serie) {
                        if (serie.participants && Array.isArray(serie.participants)) {
                            serie.participants.forEach(function(p) {
                                if (p && p.name) {
                                    uniqueParticipants[p.name] = true;
                                }
                            });
                        }
                    });
                    playerCount = Object.keys(uniqueParticipants).length;
                }
            }
            
            if (playerCount > 0) {
                availableDays.push({
                    dayNumber: dayNumInt,
                    type: dayType,
                    count: playerCount
                });
            }
        });
        
        if (availableDays.length === 0) {
            // Vérifier s'il y a des joueurs dans TOUTES les journées (pour débogage)
            var allDaysWithPlayers = [];
            allDays.forEach(function(dayNum) {
                var dayData = global.championship.days[dayNum];
                if (!dayData) return;
                
                var count = 0;
                if (dayData.players) {
                    Object.keys(dayData.players).forEach(function(divKey) {
                        var players = dayData.players[divKey];
                        if (players && Array.isArray(players)) {
                            count += players.length;
                        }
                    });
                }
                
                if (count > 0) {
                    allDaysWithPlayers.push('J' + dayNum + ':' + count);
                }
            });
            
            if (allDaysWithPlayers.length > 0) {
                showNotification('Joueurs trouvés mais pas dans une journée précédente: ' + allDaysWithPlayers.join(', '), 'warning');
            } else {
                showNotification('Aucune journée avec des joueurs trouvée dans toutes les données.', 'error');
            }
            return;
        }
        
        var currentType = getDayType(dayNumber);
        
        var html = '<div id="importPlayersModal-' + dayNumber + '" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; ' +
            'background: rgba(0,0,0,0.5); display: flex; justify-content: center; ' +
            'align-items: center; z-index: 10000;" onclick="if(event.target===this)closeImportPlayersModal(' + dayNumber + ')">' +
            '<div style="background: white; padding: 30px; border-radius: 10px; max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto;">' +
            '<h3>📥 Importer des joueurs</h3>' +
            '<p style="color: #7f8c8d; font-size: 13px; margin-bottom: 15px;">' +
            'Sélectionnez une journée source pour importer les joueurs. ' +
            'Ils seront automatiquement convertis au format ' + (currentType === 'chrono' ? 'Chrono' : 'Championship') + '.' +
            '</p>';
        
        html += '<div style="margin: 20px 0;">';
        availableDays.forEach(function(day) {
            var typeIcon = day.type === 'chrono' ? '⏱️' : '🏆';
            html += '<div onclick="importPlayersFromDay(' + dayNumber + ', ' + day.dayNumber + ')" ' +
                'style="padding: 12px; margin-bottom: 8px; background: #f8f9fa; border-radius: 8px; cursor: pointer; ' +
                'border: 2px solid transparent; transition: all 0.2s; display: flex; justify-content: space-between; align-items: center;" ' +
                'onmouseover="this.style.borderColor=\'#3498db\'; this.style.background=\'#ebf5fb\';" ' +
                'onmouseout="this.style.borderColor=\'transparent\'; this.style.background=\'#f8f9fa\';">' +
                '<div>' +
                '<strong style="font-size: 14px;">Journée ' + day.dayNumber + '</strong>' +
                '<span style="color: #7f8c8d; font-size: 12px; margin-left: 10px;">' + typeIcon + ' ' + (day.type === 'chrono' ? 'Courses' : 'Matchs') + '</span>' +
                '</div>' +
                '<span style="background: #3498db; color: white; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: bold;">' + day.count + ' joueurs</span>' +
                '</div>';
        });
        html += '</div>';
        
        html += '<div style="display: flex; gap: 10px; justify-content: flex-end;">' +
            '<button onclick="closeImportPlayersModal(' + dayNumber + ')" class="btn btn-secondary">Annuler</button>' +
            '</div></div></div>';
        
        document.body.insertAdjacentHTML('beforeend', html);
    }

    function closeImportPlayersModal(dayNumber) {
        var modal = document.getElementById('importPlayersModal-' + dayNumber);
        if (modal) modal.remove();
    }

    function importPlayersFromDay(targetDayNumber, sourceDayNumber) {
        var targetDay = global.championship.days[targetDayNumber];
        var sourceDay = global.championship.days[sourceDayNumber];
        
        if (!targetDay || !sourceDay) {
            showNotification('Erreur: journée non trouvée', 'error');
            return;
        }
        
        var targetType = getDayType(targetDayNumber);
        var sourceType = getDayType(sourceDayNumber);
        
        var importedCount = 0;
        var skippedCount = 0;
        
        if (targetType === 'championship') {
            // Importer vers mode Championship
            var targetDivision = 1; // Par défaut, mettre en division 1
            
            // S'assurer que la structure players existe
            if (!targetDay.players) {
                targetDay.players = global.initializeDivisions(global.config?.numberOfDivisions || 3);
            }
            
            if (sourceType === 'championship') {
                // Championship -> Championship : copier directement
                for (var div = 1; div <= (global.config?.numberOfDivisions || 3); div++) {
                    var sourcePlayers = sourceDay.players[div] || [];
                    sourcePlayers.forEach(function(player) {
                        var playerName = typeof player === 'object' ? player.name : player;
                        var playerClub = typeof player === 'object' ? (player.club || '') : '';
                        
                        // Vérifier si le joueur existe déjà
                        var exists = targetDay.players[targetDivision].some(function(p) {
                            var pName = typeof p === 'object' ? p.name : p;
                            return pName.toLowerCase() === playerName.toLowerCase();
                        });
                        
                        if (!exists) {
                            targetDay.players[targetDivision].push({
                                name: playerName,
                                club: playerClub
                            });
                            importedCount++;
                        } else {
                            skippedCount++;
                        }
                    });
                }
            } else {
                // Chrono -> Championship : convertir les participants
                if (sourceDay.chronoData) {
                    var uniqueNames = {};
                    sourceDay.chronoData.series.forEach(function(serie) {
                        serie.participants.forEach(function(p) {
                            if (!uniqueNames[p.name]) {
                                uniqueNames[p.name] = true;
                                
                                // Vérifier si le joueur existe déjà
                                var exists = targetDay.players[targetDivision].some(function(existing) {
                                    var existingName = typeof existing === 'object' ? existing.name : existing;
                                    return existingName.toLowerCase() === p.name.toLowerCase();
                                });
                                
                                if (!exists) {
                                    targetDay.players[targetDivision].push({
                                        name: p.name,
                                        club: ''
                                    });
                                    importedCount++;
                                } else {
                                    skippedCount++;
                                }
                            }
                        });
                    });
                }
            }
        } else {
            // Importer vers mode Chrono - stocker dans participants globaux
            if (!targetDay.chronoData) {
                targetDay.chronoData = {
                    events: [],
                    series: [],
                    participants: [],
                    nextEventId: 1,
                    nextSerieId: 1,
                    nextParticipantId: 1
                };
            }
            
            // S'assurer que la liste participants existe
            if (!targetDay.chronoData.participants) {
                targetDay.chronoData.participants = [];
            }
            
            if (sourceType === 'championship') {
                // Championship -> Chrono : ajouter aux participants globaux
                for (var div = 1; div <= (global.config?.numberOfDivisions || 3); div++) {
                    var players = sourceDay.players[div] || [];
                    players.forEach(function(player) {
                        var playerName = typeof player === 'object' ? player.name : player;
                        
                        // Vérifier si déjà présent dans les participants globaux
                        var exists = targetDay.chronoData.participants.some(function(p) {
                            return p.name.toLowerCase() === playerName.toLowerCase();
                        });
                        
                        if (!exists) {
                            targetDay.chronoData.participants.push({
                                id: targetDay.chronoData.nextParticipantId++,
                                name: playerName,
                                bib: targetDay.chronoData.participants.length + 1,
                                totalTime: null,
                                laps: 0
                            });
                            importedCount++;
                        } else {
                            skippedCount++;
                        }
                    });
                }
            } else {
                // Chrono -> Chrono : copier les participants uniques
                if (sourceDay.chronoData) {
                    // D'abord collecter tous les participants uniques de la source
                    var uniqueParticipants = {};
                    
                    // Depuis la liste globale participants
                    if (sourceDay.chronoData.participants) {
                        sourceDay.chronoData.participants.forEach(function(p) {
                            uniqueParticipants[p.name] = p;
                        });
                    }
                    
                    // Depuis toutes les séries
                    sourceDay.chronoData.series.forEach(function(serie) {
                        serie.participants.forEach(function(p) {
                            uniqueParticipants[p.name] = p;
                        });
                    });
                    
                    // Ajouter à la cible
                    Object.keys(uniqueParticipants).forEach(function(name) {
                        var exists = targetDay.chronoData.participants.some(function(existing) {
                            return existing.name.toLowerCase() === name.toLowerCase();
                        });
                        
                        if (!exists) {
                            targetDay.chronoData.participants.push({
                                id: targetDay.chronoData.nextParticipantId++,
                                name: name,
                                bib: targetDay.chronoData.participants.length + 1,
                                totalTime: null,
                                laps: 0
                            });
                            importedCount++;
                        } else {
                            skippedCount++;
                        }
                    });
                }
            }
        }
        
        saveToLocalStorage();
        closeImportPlayersModal(targetDayNumber);
        
        // Rafraîchir l'affichage
        if (targetType === 'chrono' && typeof refreshChronoDisplay === 'function') {
            refreshChronoDisplay(targetDayNumber);
        } else if (typeof updatePlayersDisplay === 'function') {
            updatePlayersDisplay(targetDayNumber);
        }
        
        var msg = importedCount + ' joueur(s) importé(s)';
        if (skippedCount > 0) {
            msg += ' (' + skippedCount + ' doublon(s) ignoré(s))';
        }
        showNotification(msg, 'success');
    }

    function refreshChronoDisplay(dayNumber) {
        var container = document.getElementById('chrono-content-' + dayNumber);
        if (container) {
            container.innerHTML = renderChronoInterfaceForDay(dayNumber);
        }
    }

    /**
     * Génère les boutons de copie rapide pour le mode chrono
     */
    function generateChronoQuickCopyButtons(dayNumber) {
        var container = document.getElementById('chrono-quick-copy-buttons-' + dayNumber);
        if (!container) return;
        
        container.innerHTML = '';
        
        var targetDay = global.championship.days[dayNumber];
        if (!targetDay) return;
        
        // Ne s'afficher que si la journée cible est en mode chrono
        if (targetDay.dayType !== 'chrono') return;
        
        var allDays = Object.keys(global.championship.days).map(Number).sort(function(a, b) { return a - b; });
        var previousDays = allDays.filter(function(d) { return d < dayNumber; });
        
        if (previousDays.length === 0) return;
        
        // Ajouter séparateur si des boutons existent déjà
        if (container.previousElementSibling && container.previousElementSibling.textContent.includes('Importer')) {
            // OK, le séparateur est déjà là
        }
        
        previousDays.forEach(function(prevDay) {
            var sourceDay = global.championship.days[prevDay];
            if (!sourceDay) return;
            
            // Compter les participants/joueurs disponibles
            var count = 0;
            if (sourceDay.dayType === 'championship') {
                // Mode championship - compter les joueurs
                if (sourceDay.players) {
                    Object.keys(sourceDay.players).forEach(function(div) {
                        var players = sourceDay.players[div];
                        if (players && Array.isArray(players)) {
                            count += players.length;
                        }
                    });
                }
            } else if (sourceDay.dayType === 'chrono') {
                // Mode chrono - compter les participants uniques
                if (sourceDay.chronoData) {
                    var uniqueNames = {};
                    if (sourceDay.chronoData.participants) {
                        sourceDay.chronoData.participants.forEach(function(p) {
                            if (p && p.name) uniqueNames[p.name] = true;
                        });
                    }
                    if (sourceDay.chronoData.series) {
                        sourceDay.chronoData.series.forEach(function(serie) {
                            if (serie.participants) {
                                serie.participants.forEach(function(p) {
                                    if (p && p.name) uniqueNames[p.name] = true;
                                });
                            }
                        });
                    }
                    count = Object.keys(uniqueNames).length;
                }
            }
            
            if (count === 0) return;
            
            var btn = document.createElement('button');
            btn.onclick = function() { quickCopyToChrono(dayNumber, prevDay); };
            btn.style.cssText = 'display: inline-flex; align-items: center; gap: 4px; padding: 6px 10px; font-size: 11px; background: #dbeafe; color: #1e40af; border: 1px solid #93c5fd; border-radius: 6px; cursor: pointer; font-weight: 500;';
            btn.title = 'Copier ' + count + ' participant(s) de J' + prevDay;
            btn.innerHTML = '📋 J' + prevDay + ' (' + count + ')';
            container.appendChild(btn);
        });
    }

    /**
     * Copie rapide vers une journée chrono
     */
    function quickCopyToChrono(targetDayNumber, sourceDayNumber) {
        var targetDay = global.championship.days[targetDayNumber];
        var sourceDay = global.championship.days[sourceDayNumber];
        
        if (!targetDay || !sourceDay) {
            showNotification('Journée source ou cible introuvable', 'error');
            return;
        }
        
        if (targetDay.dayType !== 'chrono') {
            showNotification('La journée cible doit être en mode Courses', 'error');
            return;
        }
        
        // S'assurer que chronoData existe
        if (!targetDay.chronoData) {
            targetDay.chronoData = {
                events: [],
                series: [],
                participants: [],
                nextEventId: 1,
                nextSerieId: 1,
                nextParticipantId: 1
            };
        }
        if (!targetDay.chronoData.participants) {
            targetDay.chronoData.participants = [];
        }
        
        var uniqueParticipants = {};
        
        // Collecter depuis la source
        if (sourceDay.dayType === 'championship') {
            // Mode championship - prendre les joueurs
            if (sourceDay.players) {
                Object.keys(sourceDay.players).forEach(function(div) {
                    var players = sourceDay.players[div];
                    if (players && Array.isArray(players)) {
                        players.forEach(function(player) {
                            var name = typeof player === 'object' ? player.name : player;
                            if (name) uniqueParticipants[name] = { name: name, club: typeof player === 'object' ? (player.club || '') : '' };
                        });
                    }
                });
            }
        } else if (sourceDay.dayType === 'chrono') {
            // Mode chrono - prendre les participants
            if (sourceDay.chronoData) {
                if (sourceDay.chronoData.participants) {
                    sourceDay.chronoData.participants.forEach(function(p) {
                        if (p && p.name) uniqueParticipants[p.name] = { name: p.name, club: p.club || '' };
                    });
                }
                if (sourceDay.chronoData.series) {
                    sourceDay.chronoData.series.forEach(function(serie) {
                        if (serie.participants) {
                            serie.participants.forEach(function(p) {
                                if (p && p.name) uniqueParticipants[p.name] = { name: p.name, club: p.club || '' };
                            });
                        }
                    });
                }
            }
        }
        
        var toAdd = Object.keys(uniqueParticipants);
        if (toAdd.length === 0) {
            showNotification('Aucun participant à copier depuis J' + sourceDayNumber, 'warning');
            return;
        }
        
        // Vérifier si doublons
        var existingCount = targetDay.chronoData.participants.length;
        var copied = 0;
        var skipped = 0;
        
        toAdd.forEach(function(name) {
            var exists = targetDay.chronoData.participants.some(function(p) {
                return p.name.toLowerCase() === name.toLowerCase();
            });
            
            if (!exists) {
                var data = uniqueParticipants[name];
                targetDay.chronoData.participants.push({
                    id: targetDay.chronoData.nextParticipantId++,
                    name: data.name,
                    bib: targetDay.chronoData.participants.length + 1,
                    club: data.club,
                    totalTime: null,
                    laps: 0
                });
                copied++;
            } else {
                skipped++;
            }
        });
        
        saveToLocalStorage();
        refreshChronoDisplay(targetDayNumber);
        
        var msg = copied + ' participant(s) copié(s) de J' + sourceDayNumber;
        if (skipped > 0) msg += ' (' + skipped + ' doublon(s) ignoré(s))';
        showNotification(msg, 'success');
    }

    // ============================================
    // INTERFACE DE COURSE EN DIRECT (CHRONOMÉTRAGE LIVE)
    // ============================================

    // Stockage des courses en cours par journée
    var activeRaces = {};

    /**
     * Démarre une course avec interface de chronométrage live
     */
    function startRaceForSerie(dayNumber, serieId) {
        var chronoData = getChronoDataForDay(dayNumber);
        if (!chronoData) return;
        
        var serie = chronoData.series.find(function(s) { return s.id === serieId; });
        if (!serie) return;
        
        if (!serie.participants || serie.participants.length === 0) {
            showNotification('Ajoutez des participants avant de démarrer', 'warning');
            return;
        }
        
        // Vérifier si une course est déjà en cours sur cette journée
        if (activeRaces[dayNumber] && activeRaces[dayNumber].isRunning) {
            if (!confirm('Une course est déjà en cours. La remplacer ?')) {
                return;
            }
            // Arrêter l'ancienne course
            if (activeRaces[dayNumber].timerInterval) {
                clearInterval(activeRaces[dayNumber].timerInterval);
            }
        }
        
        // Initialiser la course
        activeRaces[dayNumber] = {
            serie: serie,
            isRunning: false,
            startTime: null,
            currentTime: 0,
            timerInterval: null,
            dayNumber: dayNumber
        };
        
        // Afficher l'interface de course
        showLiveRaceInterface(dayNumber);
        
        showNotification('Course prête ! Cliquez sur ▶️ pour démarrer', 'success');
    }

    /**
     * Affiche l'interface de course en direct
     */
    function showLiveRaceInterface(dayNumber) {
        var race = activeRaces[dayNumber];
        if (!race) return;
        
        var serie = race.serie;
        var container = document.getElementById('chrono-content-' + dayNumber);
        if (!container) return;
        
        var html = '<div class="live-race-interface" style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 12px; padding: 20px; color: white;">';
        
        // En-tête avec nom de la série
        html += '<div style="text-align: center; margin-bottom: 20px;">';
        html += '<h2 style="margin: 0 0 5px 0; color: #fff; font-size: 20px;">🏁 ' + serie.name + '</h2>';
        html += '<span style="color: #94a3b8; font-size: 12px;">Journée ' + dayNumber + '</span>';
        html += '</div>';
        
        // Affichage du chrono principal
        var chronoClass = race.isRunning ? 'running' : '';
        var chronoColor = race.isRunning ? '#00ff88' : '#fff';
        html += '<div id="race-chrono-display-' + dayNumber + '" style="text-align: center; font-size: 56px; font-family: "Courier New", monospace; font-weight: bold; color: ' + chronoColor + '; text-shadow: 0 0 20px rgba(0,255,136,0.3); margin: 20px 0; letter-spacing: 4px;">';
        html += formatTime(race.currentTime || 0);
        html += '</div>';
        
        // Indicateur de statut
        var statusText = race.isRunning ? '● EN COURS' : '⏸ EN PAUSE';
        var statusColor = race.isRunning ? '#00ff88' : '#f59e0b';
        html += '<div id="race-status-' + dayNumber + '" style="text-align: center; font-size: 14px; font-weight: bold; color: ' + statusColor + '; margin-bottom: 20px;">' + statusText + '</div>';
        
        // Contrôles principaux
        html += '<div style="display: flex; justify-content: center; gap: 12px; margin-bottom: 25px; flex-wrap: wrap;">';
        var startBtnText = race.isRunning ? '⏸ Pause' : '▶️ Démarrer';
        var startBtnColor = race.isRunning ? '#f59e0b' : '#22c55e';
        html += '<button onclick="toggleRaceTimerForDay(' + dayNumber + ')" style="padding: 14px 28px; font-size: 16px; font-weight: bold; background: ' + startBtnColor + '; color: white; border: none; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">' + startBtnText + '</button>';
        html += '<button onclick="endRaceForDay(' + dayNumber + ')" style="padding: 14px 28px; font-size: 16px; font-weight: bold; background: #ef4444; color: white; border: none; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">🏁 Fin</button>';
        html += '<button onclick="backToChronoList(' + dayNumber + ')" style="padding: 14px 28px; font-size: 16px; font-weight: bold; background: #64748b; color: white; border: none; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 8px;">↩️ Retour</button>';
        html += '</div>';
        
        // Liste des participants avec boutons de tour
        html += '<div style="background: rgba(255,255,255,0.05); border-radius: 10px; padding: 15px;">';
        html += '<h3 style="margin: 0 0 15px 0; font-size: 14px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px;">Participants</h3>';
        html += '<div style="display: grid; gap: 8px;">';
        
        serie.participants.forEach(function(p) {
            var pTime = p.totalTime || 0;
            var pLaps = p.laps || 0;
            var isFinished = p.isFinished || false;
            
            html += '<div id="participant-row-' + dayNumber + '-' + p.bib + '" style="display: flex; align-items: center; gap: 12px; padding: 12px; background: ' + (isFinished ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.08)') + '; border-radius: 8px; border: 1px solid ' + (isFinished ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)') + ';">';
            
            // Dossard
            html += '<div style="width: 40px; height: 40px; background: ' + (isFinished ? '#22c55e' : '#3b82f6') + '; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px;">#' + p.bib + '</div>';
            
            // Nom
            html += '<div style="flex: 1; min-width: 0;">';
            html += '<div style="font-weight: 500; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">' + p.name + '</div>';
            html += '<div style="font-size: 11px; color: #94a3b8;">' + pLaps + ' tour(s)</div>';
            html += '</div>';
            
            // Temps
            html += '<div id="participant-time-' + dayNumber + '-' + p.bib + '" style="font-family: "Courier New", monospace; font-size: 16px; font-weight: bold; color: #00ff88; min-width: 90px; text-align: right;">' + formatTime(pTime) + '</div>';
            
            // Bouton Tour / Terminé
            if (isFinished) {
                html += '<div style="padding: 8px 12px; background: #22c55e; color: white; border-radius: 6px; font-size: 12px; font-weight: bold;">✓ Arrivé</div>';
            } else {
                html += '<button onclick="recordRaceLap(' + dayNumber + ', ' + p.bib + ')" style="padding: 10px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 12px; white-space: nowrap;">🏁 Tour</button>';
            }
            
            html += '</div>';
        });
        
        html += '</div>';
        html += '</div>';
        
        // Classement en temps réel
        html += '<div style="margin-top: 15px; text-align: center;">';
        html += '<button onclick="showLiveRanking(' + dayNumber + ')" style="padding: 10px 20px; background: rgba(255,255,255,0.1); color: white; border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; cursor: pointer; font-size: 13px;">📊 Voir le classement</button>';
        html += '</div>';
        
        html += '</div>';
        
        container.innerHTML = html;
    }

    /**
     * Démarre ou met en pause le chronométrage
     */
    function toggleRaceTimerForDay(dayNumber) {
        var race = activeRaces[dayNumber];
        if (!race) return;
        
        var chronoDisplay = document.getElementById('race-chrono-display-' + dayNumber);
        var statusDisplay = document.getElementById('race-status-' + dayNumber);
        
        if (race.isRunning) {
            // Pause
            race.isRunning = false;
            race.currentTime = Date.now() - race.startTime;
            if (race.timerInterval) {
                clearInterval(race.timerInterval);
                race.timerInterval = null;
            }
            
            if (chronoDisplay) {
                chronoDisplay.style.color = '#fff';
                chronoDisplay.textContent = formatTime(race.currentTime);
            }
            if (statusDisplay) {
                statusDisplay.textContent = '⏸ EN PAUSE';
                statusDisplay.style.color = '#f59e0b';
            }
            
            showNotification('Chrono en pause', 'info');
        } else {
            // Démarrer/Reprendre
            race.isRunning = true;
            race.startTime = Date.now() - race.currentTime;
            
            race.timerInterval = setInterval(function() {
                if (!race.isRunning) return;
                var elapsed = Date.now() - race.startTime;
                var display = document.getElementById('race-chrono-display-' + dayNumber);
                if (display) {
                    display.textContent = formatTime(elapsed);
                }
            }, 50); // Mise à jour toutes les 50ms pour une meilleure fluidité
            
            if (chronoDisplay) {
                chronoDisplay.style.color = '#00ff88';
            }
            if (statusDisplay) {
                statusDisplay.textContent = '● EN COURS';
                statusDisplay.style.color = '#00ff88';
            }
            
            showNotification(race.currentTime > 0 ? 'Chrono repris !' : 'Course démarrée !', 'success');
        }
    }

    /**
     * Enregistre un tour pour un participant
     */
    function recordRaceLap(dayNumber, bib) {
        var race = activeRaces[dayNumber];
        if (!race || !race.isRunning) {
            showNotification('Démarrez d\'abord la course !', 'warning');
            return;
        }
        
        var serie = race.serie;
        var participant = serie.participants.find(function(p) { return p.bib === bib; });
        if (!participant) return;
        
        // Calculer le temps du tour
        var now = Date.now();
        var lapTime = now - race.startTime - (participant.totalTime || 0);
        participant.totalTime = (participant.totalTime || 0) + lapTime;
        participant.laps = (participant.laps || 0) + 1;
        
        // Mettre à jour l'affichage du temps du participant
        var timeDisplay = document.getElementById('participant-time-' + dayNumber + '-' + bib);
        if (timeDisplay) {
            timeDisplay.textContent = formatTime(participant.totalTime);
        }
        
        // Mettre à jour le compteur de tours
        var row = document.getElementById('participant-row-' + dayNumber + '-' + bib);
        if (row) {
            var lapsInfo = row.querySelector('div:nth-child(2) div:nth-child(2)');
            if (lapsInfo) {
                lapsInfo.textContent = participant.laps + ' tour(s)';
            }
        }
        
        // Sauvegarder dans les résultats
        recordChronoResult(dayNumber, serie.id, bib, participant.totalTime);
        
        showNotification(participant.name + ' - Tour ' + participant.laps + ' : ' + formatTime(participant.totalTime), 'success');
    }

    /**
     * Marque un participant comme arrivé (temps final)
     */
    function finishParticipant(dayNumber, bib) {
        var race = activeRaces[dayNumber];
        if (!race) return;
        
        var serie = race.serie;
        var participant = serie.participants.find(function(p) { return p.bib === bib; });
        if (!participant) return;
        
        if (!race.isRunning) {
            showNotification('La course n\'est pas en cours !', 'warning');
            return;
        }
        
        // Calculer le temps final
        var finishTime = Date.now() - race.startTime;
        participant.totalTime = finishTime;
        participant.isFinished = true;
        
        // Mettre à jour l'affichage
        var row = document.getElementById('participant-row-' + dayNumber + '-' + bib);
        if (row) {
            row.style.background = 'rgba(34,197,94,0.15)';
            row.style.borderColor = 'rgba(34,197,94,0.3)';
            
            // Remplacer le bouton Tour par "Arrivé"
            var buttonCell = row.querySelector('button, div:last-child');
            if (buttonCell && buttonCell.tagName === 'BUTTON') {
                buttonCell.outerHTML = '<div style="padding: 8px 12px; background: #22c55e; color: white; border-radius: 6px; font-size: 12px; font-weight: bold;">✓ Arrivé</div>';
            }
            
            // Mettre à jour le dossard en vert
            var bibElement = row.querySelector('div:first-child');
            if (bibElement) {
                bibElement.style.background = '#22c55e';
            }
        }
        
        // Mettre à jour le temps
        var timeDisplay = document.getElementById('participant-time-' + dayNumber + '-' + bib);
        if (timeDisplay) {
            timeDisplay.textContent = formatTime(participant.totalTime);
        }
        
        // Sauvegarder
        recordChronoResult(dayNumber, serie.id, bib, participant.totalTime);
        
        showNotification('🏁 ' + participant.name + ' a terminé en ' + formatTime(participant.totalTime), 'success');
    }

    /**
     * Termine la course
     */
    function endRaceForDay(dayNumber) {
        var race = activeRaces[dayNumber];
        if (!race) return;
        
        if (!confirm('Terminer cette course ? Les temps actuels seront sauvegardés.')) {
            return;
        }
        
        // Arrêter le timer
        race.isRunning = false;
        if (race.timerInterval) {
            clearInterval(race.timerInterval);
            race.timerInterval = null;
        }
        
        var serie = race.serie;
        serie.isRunning = false;
        serie.endTime = new Date().toISOString();
        
        // Marquer tous les participants avec un temps comme terminés
        serie.participants.forEach(function(p) {
            if (p.totalTime && !p.isFinished) {
                p.isFinished = true;
                recordChronoResult(dayNumber, serie.id, p.bib, p.totalTime);
            }
        });
        
        // Sauvegarder
        saveToLocalStorage();
        
        // Nettoyer
        delete activeRaces[dayNumber];
        
        // Retour à la liste
        refreshChronoDisplay(dayNumber);
        
        showNotification('Course terminée ! Résultats sauvegardés.', 'success');
    }

    /**
     * Retourne à la liste des séries
     */
    function backToChronoList(dayNumber) {
        var race = activeRaces[dayNumber];
        if (race && race.isRunning) {
            if (!confirm('La course est en cours. Quitter quand même ?')) {
                return;
            }
            // Arrêter le timer
            if (race.timerInterval) {
                clearInterval(race.timerInterval);
            }
        }
        
        delete activeRaces[dayNumber];
        refreshChronoDisplay(dayNumber);
    }

    /**
     * Affiche le classement en temps réel
     */
    function showLiveRanking(dayNumber) {
        var race = activeRaces[dayNumber];
        if (!race) return;
        
        var serie = race.serie;
        
        // Trier les participants par temps
        var sorted = serie.participants.slice().sort(function(a, b) {
            if (!a.totalTime && !b.totalTime) return 0;
            if (!a.totalTime) return 1;
            if (!b.totalTime) return -1;
            return a.totalTime - b.totalTime;
        });
        
        var html = '<div style="background: rgba(255,255,255,0.1); border-radius: 10px; padding: 20px; margin-top: 15px;">';
        html += '<h3 style="margin: 0 0 15px 0; font-size: 16px; text-align: center;">🏆 Classement ' + serie.name + '</h3>';
        
        if (sorted.length === 0 || (!sorted[0].totalTime && !sorted[1] && !sorted[2])) {
            html += '<p style="text-align: center; color: #94a3b8;">Aucun temps enregistré</p>';
        } else {
            html += '<div style="display: grid; gap: 8px;">';
            sorted.forEach(function(p, index) {
                if (!p.totalTime) return;
                
                var rankColors = ['#fbbf24', '#9ca3af', '#b45309']; // Or, Argent, Bronze
                var bgColor = index < 3 ? 'background: ' + rankColors[index] + '; color: #000;' : 'background: rgba(255,255,255,0.1);';
                var trophy = index < 3 ? ['🥇', '🥈', '🥉'][index] : (index + 1) + '.';
                
                html += '<div style="display: flex; align-items: center; gap: 10px; padding: 10px; border-radius: 6px; ' + bgColor + '">';
                html += '<span style="font-size: 16px; width: 30px; text-align: center;">' + trophy + '</span>';
                html += '<span style="flex: 1; font-weight: ' + (index < 3 ? 'bold' : 'normal') + ';">#' + p.bib + ' ' + p.name + '</span>';
                html += '<span style="font-family: monospace; font-weight: bold;">' + formatTime(p.totalTime) + '</span>';
                html += '</div>';
            });
            html += '</div>';
        }
        
        html += '<div style="text-align: center; margin-top: 15px;">';
        html += '<button onclick="this.parentElement.parentElement.remove()" style="padding: 8px 16px; background: rgba(255,255,255,0.2); color: white; border: none; border-radius: 6px; cursor: pointer;">Fermer</button>';
        html += '</div>';
        html += '</div>';
        
        // Insérer après l'interface
        var container = document.getElementById('chrono-content-' + dayNumber);
        if (container) {
            // Vérifier si un classement existe déjà
            var existing = container.querySelector('.live-ranking');
            if (existing) existing.remove();
            
            var rankingDiv = document.createElement('div');
            rankingDiv.className = 'live-ranking';
            rankingDiv.innerHTML = html;
            container.appendChild(rankingDiv);
        }
    }

    // ============================================
    // EXPOSITION SUR WINDOW
    // ============================================

    global.DAY_TYPES = DAY_TYPES;
    global.initMultisport = initMultisport;
    global.setDayType = setDayType;
    global.getDayType = getDayType;
    global.toggleDayType = toggleDayType;
    global.createDayTypeSelector = createDayTypeSelector;
    global.updateDayTypeUI = updateDayTypeUI;
    global.isMultisportMode = isMultisportMode;
    global.updateMultisportTabVisibility = updateMultisportTabVisibility;
    global.initMultisportTab = initMultisportTab;
    global.updateDayTypeUI = updateDayTypeUI;
    global.getChronoDataForDay = getChronoDataForDay;
    global.addChronoEvent = addChronoEvent;
    global.addChronoSerie = addChronoSerie;
    global.addChronoParticipant = addChronoParticipant;
    global.recordChronoResult = recordChronoResult;
    global.renderChronoInterfaceForDay = renderChronoInterfaceForDay;
    global.refreshChronoDisplay = refreshChronoDisplay;
    global.generateChronoQuickCopyButtons = generateChronoQuickCopyButtons;
    global.quickCopyToChrono = quickCopyToChrono;
    global.calculateMultisportRanking = calculateMultisportRanking;
    global.renderMultisportRanking = renderMultisportRanking;
    global.calculateChronoPoints = calculateChronoPoints;
    global.getChronoResultsForDay = getChronoResultsForDay;
    // Modales
    global.showAddEventModalForDay = showAddEventModalForDay;
    global.closeEventModalForDay = closeEventModalForDay;
    global.saveEventForDay = saveEventForDay;
    global.editEvent = editEvent;
    global.closeEditEventModal = closeEditEventModal;
    global.saveEditedEvent = saveEditedEvent;
    global.showImportPlayersModal = showImportPlayersModal;
    global.closeImportPlayersModal = closeImportPlayersModal;
    global.importPlayersFromDay = importPlayersFromDay;
    global.showAddSerieModalForDay = showAddSerieModalForDay;
    global.showAddSerieModalForDayAndEvent = showAddSerieModalForDayAndEvent;
    global.closeSerieModalForDay = closeSerieModalForDay;
    global.saveSerieForDay = saveSerieForDay;
    global.toggleRelayOptionsForDay = toggleRelayOptionsForDay;
    global.manageSerieParticipants = manageSerieParticipants;
    global.addParticipantToSerie = addParticipantToSerie;
    global.closeParticipantsModal = closeParticipantsModal;
    global.renderParticipantsSection = renderParticipantsSection;
    global.quickAddParticipantToDay = quickAddParticipantToDay;
    global.showAddParticipantManualModal = showAddParticipantManualModal;
    global.closeAddParticipantsModal = closeAddParticipantsModal;
    global.saveBulkParticipants = saveBulkParticipants;
    global.showAddToSerieModal = showAddToSerieModal;
    global.closeAddToSerieModal = closeAddToSerieModal;
    global.addExistingParticipantToSerie = addExistingParticipantToSerie;
    global.enterSerieResults = enterSerieResults;
    global.saveSerieResults = saveSerieResults;
    global.closeResultsModal = closeResultsModal;
    global.showSerieRanking = showSerieRanking;
    global.closeRankingModal = closeRankingModal;
    // Interface de course live
    // Note: startChronoRaceForDay est défini dans script.js et utilise l'ancien système chrono
    // Fonctions de course live sont dans script.js (ancien système chrono global)

})(window);
