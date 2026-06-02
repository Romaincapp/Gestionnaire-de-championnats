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

    // Vrai s'il existe au moins une journée en mode Courses (chrono)
    function hasChronoDays() {
        return Object.keys(global.championship.days).some(function(dayNumber) {
            var dayData = global.championship.days[dayNumber];
            return dayData && dayData.dayType === DAY_TYPES.CHRONO;
        });
    }
    global.hasChronoDays = hasChronoDays;

    // Vrai s'il existe au moins une journée en mode Championnat (matchs)
    function hasChampionshipDays() {
        return Object.keys(global.championship.days).some(function(dayNumber) {
            var dayData = global.championship.days[dayNumber];
            // Une journée sans dayType est considérée Championship par défaut
            return dayData && (!dayData.dayType || dayData.dayType === DAY_TYPES.CHAMPIONSHIP);
        });
    }
    global.hasChampionshipDays = hasChampionshipDays;

    function updateMultisportTabVisibility() {
        var multisportTab = document.getElementById('multisportTab');
        if (!multisportTab) return;

        // Afficher l'onglet dès qu'il y a des journées chrono (mix OU chrono seul),
        // car c'est lui qui porte le classement combiné / des courses.
        if (isMultisportMode() || hasChronoDays()) {
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

    // Helper: chercher une série dans chronoData (format plat ou imbriqué dans events)
    function findSerieInChronoData(chronoData, serieId) {
        var serie = null;
        // 1. Format plat : chronoData.series[]
        if (chronoData.series && chronoData.series.length > 0) {
            serie = chronoData.series.find(function(s) { return s.id === serieId; });
            if (serie) return serie;
        }
        // 2. Format imbriqué : event.series[]
        if (chronoData.events) {
            for (var i = 0; i < chronoData.events.length; i++) {
                var evt = chronoData.events[i];
                if (evt.series) {
                    serie = evt.series.find(function(s) { return s.id === serieId; });
                    if (serie) return serie;
                }
            }
        }
        return null;
    }
    global.findSerieInChronoData = findSerieInChronoData;

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

    // Met une majuscule à la première lettre de chaque mot d'un nom
    // (gère espaces, traits d'union et apostrophes ; lettres accentuées incluses).
    function toTitleCase(name) {
        if (!name) return name;
        return String(name).toLowerCase().replace(/(^|[\s\-'’])([a-zà-ÿ])/g, function(_, sep, ch) {
            return sep + ch.toUpperCase();
        });
    }
    global.toTitleCase = toTitleCase;

    function addChronoParticipant(dayNumber, serieId, name, bib, options) {
        var chronoData = getChronoDataForDay(dayNumber);
        if (!chronoData) return null;
        
        var serie = findSerieInChronoData(chronoData, serieId);
        if (!serie) return null;
        
        options = options || {};
        
        var participant = {
            id: chronoData.nextParticipantId++,
            name: toTitleCase(name),
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
        
        var serie = findSerieInChronoData(chronoData, serieId);
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
        html += '<button onclick="showSwimmingImportModal(' + dayNumber + ')" style="display: inline-flex; align-items: center; gap: 4px; padding: 8px 10px; font-size: 12px; background: #1abc9c; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">🏊 Séries natation</button>';
        html += '<button onclick="printChronoCompetition(' + dayNumber + ')" style="display: inline-flex; align-items: center; gap: 4px; padding: 8px 10px; font-size: 12px; background: #9b59b6; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">🖨️ Imprimer séries</button>';
        html += '<span style="color: #cbd5e1;">|</span>';
        html += '<button onclick="exportChronoDataForDay(' + dayNumber + ')" style="display: inline-flex; align-items: center; gap: 4px; padding: 8px 10px; font-size: 12px; background: #27ae60; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">💾 Exporter</button>';
        html += '<button onclick="importChronoDataForDay(' + dayNumber + ')" style="display: inline-flex; align-items: center; gap: 4px; padding: 8px 10px; font-size: 12px; background: #3498db; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">📥 Importer</button>';
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
            // Barre d'affectation de club aux participants cochés
            var clubSet = {};
            if (window.clubsModule && window.clubsModule.getClubsList) {
                window.clubsModule.getClubsList().forEach(function(c) { clubSet[c] = true; });
            }
            participants.forEach(function(p) { if (p.club) clubSet[p.club] = true; });
            var datalistOptions = Object.keys(clubSet).sort().map(function(c) {
                return '<option value="' + c + '">';
            }).join('');

            html += '<div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-bottom: 10px; padding: 8px; background: #fef9e7; border-radius: 6px;">';
            html += '<input list="clubs-datalist-' + dayNumber + '" id="assign-club-input-' + dayNumber + '" placeholder="Club à affecter" style="flex: 1; min-width: 140px; padding: 6px 8px; border: 1px solid #cbd5e1; border-radius: 5px; font-size: 13px;">';
            html += '<datalist id="clubs-datalist-' + dayNumber + '">' + datalistOptions + '</datalist>';
            html += '<button onclick="assignClubToSelected(' + dayNumber + ')" style="padding: 6px 12px; font-size: 12px; background: #e67e22; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: 600;">🏷️ Affecter aux cochés</button>';
            html += '<label style="font-size: 11px; color: #7f8c8d; cursor: pointer; white-space: nowrap;"><input type="checkbox" onchange="toggleAllParticipants(' + dayNumber + ', this.checked)" style="vertical-align: middle;"> Tout</label>';
            html += '</div>';

            html += '<div style="max-height: 200px; overflow-y: auto;">';
            participants.forEach(function(p) {
                html += '<div id="participant-row-' + dayNumber + '-' + p.id + '" style="display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 6px 8px; margin-bottom: 4px; background: #f8f9fa; border-radius: 6px;">';
                html += '<label style="display: flex; align-items: center; gap: 8px; flex: 1; cursor: pointer; font-size: 12px; color: #2c3e50;">';
                html += '<input type="checkbox" class="participant-check-' + dayNumber + '" value="' + p.id + '">';
                html += '<span style="font-weight: bold; color: #e67e22; min-width: 26px;">#' + (p.bib != null ? p.bib : '-') + '</span>';
                html += '<span>' + p.name + '</span>';
                if (p.club) {
                    html += '<span style="font-size: 10px; background: #16a085; color: white; padding: 2px 6px; border-radius: 3px;">' + p.club + '</span>';
                }
                html += '</label>';

                html += '<div style="display: flex; gap: 4px; align-items: center; flex-shrink: 0;">';
                html += '<button onclick="editParticipantInfo(' + dayNumber + ', ' + p.id + ')" style="padding: 3px 7px; font-size: 11px; background: #f39c12; color: white; border: none; border-radius: 4px; cursor: pointer;" title="Éditer nom / dossard">✏️</button>';

                if (series.length > 0) {
                    html += '<button onclick="showAddToSerieModal(' + dayNumber + ', ' + p.id + ')" ' +
                        'style="padding: 3px 8px; font-size: 11px; background: #27ae60; color: white; border: none; border-radius: 4px; cursor: pointer; flex-shrink: 0;">+</button>';
                } else {
                    html += '<span style="font-size: 10px; color: #95a5a6; flex-shrink: 0;">Créez une série</span>';
                }
                html += '</div>'; // fin actions

                html += '</div>'; // fin ligne participant
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
     * Affecte un club à tous les participants cochés (et propage dans les séries).
     */
    function assignClubToSelected(dayNumber) {
        var chronoData = getChronoDataForDay(dayNumber);
        if (!chronoData) return;

        var input = document.getElementById('assign-club-input-' + dayNumber);
        var club = input ? input.value.trim() : '';

        var checks = document.querySelectorAll('.participant-check-' + dayNumber + ':checked');
        if (checks.length === 0) {
            showNotification('Cochez au moins un participant', 'warning');
            return;
        }

        // Ids cochés (les value sont des chaînes) + noms correspondants. Le lien
        // global ↔ série se faisant souvent par nom (et l'import natation crée des
        // ids distincts), on matche par id OU par nom.
        var ids = {};
        var names = {};
        checks.forEach(function(ch) { ids[ch.value] = true; });
        chronoData.participants.forEach(function(p) {
            if (ids[String(p.id)] && p.name) names[p.name.toLowerCase()] = true;
        });

        function matches(p) {
            return ids[String(p.id)] || (p.name && names[p.name.toLowerCase()]);
        }

        var count = 0;
        chronoData.participants.forEach(function(p) {
            if (matches(p)) { p.club = club; count++; }
        });

        // Propager le club aux mêmes participants présents dans les séries
        (chronoData.series || []).forEach(function(s) {
            (s.participants || []).forEach(function(p) {
                if (matches(p)) p.club = club;
            });
        });
        (chronoData.events || []).forEach(function(ev) {
            (ev.series || []).forEach(function(s) {
                (s.participants || []).forEach(function(p) {
                    if (matches(p)) p.club = club;
                });
            });
        });

        // Mémoriser le club dans la liste globale s'il est nouveau
        if (club && window.clubsModule && window.clubsModule.addClub) {
            window.clubsModule.addClub(club);
        }

        saveToLocalStorage();
        refreshChronoDisplay(dayNumber);
        showNotification(count + ' participant(s) → club ' + (club || '(aucun)'), 'success');
    }
    global.assignClubToSelected = assignClubToSelected;

    /**
     * Coche / décoche tous les participants de la journée.
     */
    function toggleAllParticipants(dayNumber, checked) {
        var checks = document.querySelectorAll('.participant-check-' + dayNumber);
        checks.forEach(function(ch) { ch.checked = checked; });
    }
    global.toggleAllParticipants = toggleAllParticipants;

    /**
     * Passe une ligne participant en édition inline du nom et du dossard.
     */
    function editParticipantInfo(dayNumber, participantId) {
        var chronoData = getChronoDataForDay(dayNumber);
        if (!chronoData) return;
        var p = chronoData.participants.find(function(x) { return x.id === participantId; });
        if (!p) return;
        var row = document.getElementById('participant-row-' + dayNumber + '-' + participantId);
        if (!row) return;

        var safeName = (p.name || '').replace(/"/g, '&quot;');
        row.innerHTML =
            '<div style="display: flex; align-items: center; gap: 6px; flex: 1; flex-wrap: wrap;">' +
            '<input type="number" id="edit-pbib-' + dayNumber + '-' + participantId + '" value="' + (p.bib != null ? p.bib : '') + '" min="0" placeholder="#" style="width: 55px; padding: 5px; border: 1px solid #f39c12; border-radius: 4px; font-size: 12px; text-align: center;">' +
            '<input type="text" id="edit-pname-' + dayNumber + '-' + participantId + '" value="' + safeName + '" placeholder="Nom" style="flex: 1; min-width: 120px; padding: 5px; border: 1px solid #f39c12; border-radius: 4px; font-size: 12px;">' +
            '</div>' +
            '<div style="display: flex; gap: 4px; flex-shrink: 0;">' +
            '<button onclick="saveParticipantInfo(' + dayNumber + ', ' + participantId + ')" style="padding: 4px 8px; font-size: 11px; background: #27ae60; color: white; border: none; border-radius: 4px; cursor: pointer;" title="Enregistrer">💾</button>' +
            '<button onclick="refreshChronoDisplay(' + dayNumber + ')" style="padding: 4px 8px; font-size: 11px; background: #95a5a6; color: white; border: none; border-radius: 4px; cursor: pointer;" title="Annuler">✖️</button>' +
            '</div>';

        var nameInput = document.getElementById('edit-pname-' + dayNumber + '-' + participantId);
        if (nameInput) { nameInput.focus(); nameInput.select(); }
    }
    global.editParticipantInfo = editParticipantInfo;

    /**
     * Enregistre le nom / dossard édités et propage le changement aux séries.
     */
    function saveParticipantInfo(dayNumber, participantId) {
        var chronoData = getChronoDataForDay(dayNumber);
        if (!chronoData) return;
        var p = chronoData.participants.find(function(x) { return x.id === participantId; });
        if (!p) return;

        var nameEl = document.getElementById('edit-pname-' + dayNumber + '-' + participantId);
        var bibEl = document.getElementById('edit-pbib-' + dayNumber + '-' + participantId);
        if (!nameEl) return;

        var newName = toTitleCase(nameEl.value.trim());
        if (!newName) { showNotification('Le nom ne peut pas être vide', 'warning'); return; }

        // Doublon de nom avec un autre participant
        var dup = chronoData.participants.some(function(x) {
            return x.id !== participantId && (x.name || '').toLowerCase() === newName.toLowerCase();
        });
        if (dup) { showNotification('Un participant porte déjà ce nom', 'warning'); return; }

        var newBib = (bibEl && bibEl.value !== '') ? parseInt(bibEl.value, 10) : p.bib;
        var oldName = p.name;

        applyParticipantRename(chronoData, participantId, oldName, newName, newBib);

        saveToLocalStorage();
        refreshChronoDisplay(dayNumber);
        showNotification('Participant mis à jour : ' + newName, 'success');
    }
    global.saveParticipantInfo = saveParticipantInfo;

    /**
     * Renomme / re-dossarde un participant partout : liste globale, séries,
     * résultats et séries imbriquées dans les événements. Match par id OU ancien nom.
     */
    function applyParticipantRename(chronoData, participantId, oldName, newName, newBib) {
        function applyTo(list) {
            (list || []).forEach(function(sp) {
                if ((participantId != null && sp.id === participantId) ||
                    (oldName && (sp.name || '').toLowerCase() === oldName.toLowerCase())) {
                    sp.name = newName;
                    if (newBib != null && !isNaN(newBib)) sp.bib = newBib;
                }
            });
        }
        applyTo(chronoData.participants);
        (chronoData.series || []).forEach(function(s) { applyTo(s.participants); applyTo(s.results); });
        (chronoData.events || []).forEach(function(ev) {
            (ev.series || []).forEach(function(s) { applyTo(s.participants); applyTo(s.results); });
        });

        // Garder synchronisée la copie "course" de l'ancien système (raceData) si une
        // course est en cours / déjà lancée.
        if (window.raceData) {
            if (window.raceData.currentSerie) applyTo(window.raceData.currentSerie.participants);
            (window.raceData.series || []).forEach(function(s) { applyTo(s.participants); });
            (window.raceData.events || []).forEach(function(ev) {
                (ev.series || []).forEach(function(s) { applyTo(s.participants); });
            });
        }
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
            var name = toTitleCase(parts[0].trim());
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
        // Chercher les séries à la fois dans event.series (nouveau format) et chronoData.series (ancien format)
        var eventSeries = (event.series && event.series.length > 0)
            ? event.series
            : (chronoData.series || []).filter(function(s) { return s.eventId === event.id; });
        
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

        // Rassembler les séries des deux formats (liste plate + imbriquées dans les
        // événements), sans doublon.
        var allSeries = [];
        var seen = [];
        function pushSerie(s) {
            if (!s || seen.indexOf(s) !== -1) return;
            seen.push(s);
            allSeries.push(s);
        }
        (chronoData.series || []).forEach(pushSerie);
        (chronoData.events || []).forEach(function(ev) {
            (ev.series || []).forEach(pushSerie);
        });

        function ensurePlayer(name) {
            if (!results[name]) {
                results[name] = {
                    player: name,
                    series: [],
                    totalPoints: 0,
                    bestTime: null,
                    totalDistance: 0,
                    totalTime: 0
                };
            }
            return results[name];
        }

        allSeries.forEach(function(serie) {
            if (!serie.results || serie.results.length === 0) return;

            // Positions (et donc points) calculées sur les temps des résultats.
            var sorted = serie.results.slice().sort(function(a, b) {
                return a.time - b.time;
            });
            var posByName = {};
            sorted.forEach(function(r, i) { posByName[r.name] = i + 1; });

            // Index des participants de la série par nom : ils portent les VRAIS
            // totaux (distance et temps cumulés tour par tour).
            var partByName = {};
            (serie.participants || []).forEach(function(p) {
                if (p && p.name) partByName[p.name] = p;
            });

            sorted.forEach(function(result) {
                var playerName = result.name;
                var entry = ensurePlayer(playerName);
                var p = partByName[playerName] || {};

                // Distance et temps TOTAUX issus de la série (participant en
                // priorité, repli sur le résultat / la distance de série).
                var distance = (p.totalDistance != null && p.totalDistance > 0)
                    ? p.totalDistance
                    : (serie.distance || 0);
                var time = (p.totalTime != null && p.totalTime > 0)
                    ? p.totalTime
                    : (p.finishTime || result.time || 0);

                var position = posByName[playerName] || (entry.series.length + 1);
                var points = calculateChronoPoints(position, sorted.length);

                entry.series.push({
                    serieName: serie.name,
                    position: position,
                    time: time,
                    distance: distance,
                    points: points
                });
                entry.totalPoints += points;
                entry.totalDistance += distance;
                entry.totalTime += time;

                if (!entry.bestTime || time < entry.bestTime) {
                    entry.bestTime = time;
                }
            });
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
                    allStats[playerName].chronoDistance += chronoResults[playerName].totalDistance || 0;
                    allStats[playerName].chronoTime += chronoResults[playerName].totalTime || 0;
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
            chronoDistance: 0,
            chronoTime: 0,
            totalPoints: 0
        };
    }

    // Formate une distance en mètres : "1 500 m" ou "12,30 km"
    function formatDistance(meters) {
        meters = meters || 0;
        if (meters >= 1000) {
            return (meters / 1000).toFixed(2).replace('.', ',') + ' km';
        }
        return Math.round(meters) + ' m';
    }

    // Formate une durée (ms) de façon lisible : "1h23m45s", "23m45s" ou "45s"
    function formatDurationHMS(ms) {
        ms = ms || 0;
        var totalSec = Math.round(ms / 1000);
        var h = Math.floor(totalSec / 3600);
        var m = Math.floor((totalSec % 3600) / 60);
        var s = totalSec % 60;
        var pad = function(n) { return n < 10 ? '0' + n : '' + n; };
        if (h > 0) return h + 'h' + pad(m) + 'm' + pad(s) + 's';
        if (m > 0) return m + 'm' + pad(s) + 's';
        return s + 's';
    }
    global.formatDurationHMS = formatDurationHMS;

    function renderMultisportRanking() {
        var ranking = calculateMultisportRanking();

        // Mode d'affichage : chrono seul OU mixte (championnat + courses)
        var mixed = hasChampionshipDays() && hasChronoDays();

        // En mode chrono pur : tri par distance (desc) puis temps (asc), pas de points.
        // En mode multisport : tri par total de points.
        var sorted = Object.values(ranking).sort(function(a, b) {
            if (mixed) return b.totalPoints - a.totalPoints;
            if (b.chronoDistance !== a.chronoDistance) return b.chronoDistance - a.chronoDistance;
            return a.chronoTime - b.chronoTime;
        });

        var html = '<div class="multisport-ranking" style="background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">';
        html += '<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px;">';
        html += '<h2 style="margin: 0; text-align: center;">🏆 ' + (mixed ? 'Classement Général Multisport' : 'Classement Général des Courses') + '</h2>';
        html += '<p style="margin: 10px 0 0 0; text-align: center; opacity: 0.9;">' + (mixed ? 'Championship + Courses (points)' : 'Courses — distance &amp; temps') + '</p>';
        html += '</div>';

        // Barre d'outils : harmonisation des noms
        html += '<div style="padding: 12px 15px; display: flex; gap: 10px; flex-wrap: wrap; align-items: center; border-bottom: 1px solid #ecf0f1; background: #fbfbfd;">';
        html += '<button onclick="showNameHarmonizationModal()" style="padding: 8px 14px; font-size: 13px; background: #8e44ad; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">🔤 Harmoniser les noms</button>';
        html += '<button onclick="normalizeAllNamesCase()" style="padding: 8px 14px; font-size: 13px; background: #16a085; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">Aa Normaliser la casse</button>';
        html += '<button onclick="printGeneralRanking()" style="padding: 8px 14px; font-size: 13px; background: #34495e; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">🖨️ Imprimer</button>';
        html += '<span style="font-size: 12px; color: #7f8c8d;">Harmoniser : fusionne les variantes d\'un nom. Normaliser : majuscule à chaque mot.</span>';
        html += '</div>';

        if (sorted.length === 0) {
            html += '<p style="text-align: center; padding: 40px; color: #7f8c8d;">Aucune donnée disponible</p>';
        } else {
            html += '<table class="ranking-table" style="width: 100%; border-collapse: collapse;">';
            html += '<thead><tr style="background: #f8f9fa;">';
            html += '<th style="padding: 15px; text-align: center;">#</th>';
            html += '<th style="padding: 15px; text-align: left;">Joueur</th>';
            html += '<th style="padding: 15px; text-align: center;">Club</th>';
            if (mixed) {
                html += '<th style="padding: 15px; text-align: center;">🎾 Championship</th>';
                html += '<th style="padding: 15px; text-align: center;">⏱️ Chrono</th>';
                html += '<th style="padding: 15px; text-align: center; background: #e8f4f8;">Total</th>';
            } else {
                html += '<th style="padding: 15px; text-align: center;">📏 Distance</th>';
                html += '<th style="padding: 15px; text-align: center;">⏱️ Temps total</th>';
                html += '<th style="padding: 15px; text-align: center; background: #e8f4f8;">Séries</th>';
            }
            html += '</tr></thead><tbody>';

            sorted.forEach(function(stat, index) {
                var rankClass = index < 3 ? 'rank-' + (index + 1) : '';
                var rowStyle = index % 2 === 0 ? 'background: white;' : 'background: #f8f9fa;';
                var clubBadge = stat.club ? '<span style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; font-size: 10px; padding: 2px 8px; border-radius: 10px;">' + stat.club + '</span>' : '-';

                html += '<tr class="' + rankClass + '" style="' + rowStyle + ' border-bottom: 1px solid #ecf0f1;">';
                html += '<td style="padding: 15px; text-align: center; font-weight: bold;">' + (index + 1) + '</td>';
                html += '<td style="padding: 15px; font-weight: bold; color: #2c3e50;">' +
                    '<span onclick="showPlayerChronoDetail(\'' + encodeURIComponent(stat.player) + '\')" ' +
                    'style="cursor: pointer; text-decoration: underline dotted; text-underline-offset: 3px;" ' +
                    'title="Voir le détail des épreuves">' + stat.player + ' 🔍</span></td>';
                html += '<td style="padding: 15px; text-align: center;">' + clubBadge + '</td>';
                if (mixed) {
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
                } else {
                    html += '<td style="padding: 15px; text-align: center; font-weight: bold; color: #2980b9;">' + formatDistance(stat.chronoDistance) + '</td>';
                    html += '<td style="padding: 15px; text-align: center; font-family: monospace; color: #e67e22;">' + (stat.chronoTime ? formatDurationHMS(stat.chronoTime) : '-') + '</td>';
                    html += '<td style="padding: 15px; text-align: center; background: #e8f4f8;"><strong style="color: #27ae60;">' + stat.chronoSeries + '</strong></td>';
                }
                html += '</tr>';
            });

            html += '</tbody></table>';
        }

        html += '</div>';
        return html;
    }

    // Impression du classement général, adaptée au mode courant
    // (chrono : distance & temps, sans points ; multisport : points).
    function printGeneralRanking() {
        var ranking = calculateMultisportRanking();
        var mixed = hasChampionshipDays() && hasChronoDays();

        var sorted = Object.values(ranking).sort(function(a, b) {
            if (mixed) return b.totalPoints - a.totalPoints;
            if (b.chronoDistance !== a.chronoDistance) return b.chronoDistance - a.chronoDistance;
            return a.chronoTime - b.chronoTime;
        });

        var title = mixed ? 'Classement Général Multisport' : 'Classement Général des Courses';
        var champName = (global.championship && global.championship.name) ? global.championship.name : '';
        var dateStr = new Date().toLocaleDateString('fr-FR');

        var head, rows = '';
        if (mixed) {
            head = '<th>#</th><th style="text-align:left;">Joueur</th><th>Club</th><th>Championship</th><th>Chrono</th><th>Total</th>';
            sorted.forEach(function(s, i) {
                rows += '<tr><td>' + (i + 1) + '</td><td style="text-align:left;">' + s.player + '</td><td>' + (s.club || '-') + '</td>' +
                    '<td>' + s.championshipPoints + ' pts</td><td>' + s.chronoPoints + ' pts</td><td><strong>' + s.totalPoints + '</strong></td></tr>';
            });
        } else {
            head = '<th>#</th><th style="text-align:left;">Participant</th><th>Club</th><th>Distance</th><th>Temps total</th><th>Séries</th>';
            sorted.forEach(function(s, i) {
                rows += '<tr><td>' + (i + 1) + '</td><td style="text-align:left;">' + s.player + '</td><td>' + (s.club || '-') + '</td>' +
                    '<td>' + formatDistance(s.chronoDistance) + '</td><td>' + (s.chronoTime ? formatDurationHMS(s.chronoTime) : '-') + '</td><td>' + s.chronoSeries + '</td></tr>';
            });
        }

        var doc = '<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>' + title + '</title>' +
            '<style>' +
            'body{font-family:Arial,Helvetica,sans-serif;color:#222;margin:24px;}' +
            'h1{font-size:20px;margin:0 0 4px;}' +
            '.sub{color:#666;font-size:13px;margin-bottom:16px;}' +
            'table{width:100%;border-collapse:collapse;font-size:13px;}' +
            'th,td{border:1px solid #ccc;padding:7px 9px;text-align:center;}' +
            'thead th{background:#34495e;color:#fff;}' +
            'tbody tr:nth-child(even){background:#f4f6fb;}' +
            '@media print{body{margin:0;} button{display:none;}}' +
            '</style></head><body>' +
            '<h1>🏆 ' + title + '</h1>' +
            '<div class="sub">' + (champName ? champName + ' — ' : '') + 'Édité le ' + dateStr + '</div>' +
            '<table><thead><tr>' + head + '</tr></thead><tbody>' + rows + '</tbody></table>' +
            '<script>window.onload=function(){window.print();};<\/script>' +
            '</body></html>';

        var w = window.open('', '_blank');
        if (!w) { showNotification('Autorise les fenêtres pop-up pour imprimer', 'warning'); return; }
        w.document.open();
        w.document.write(doc);
        w.document.close();
    }
    global.printGeneralRanking = printGeneralRanking;

    // ============================================
    // DÉTAIL D'UN PARTICIPANT (épreuves / séries / journées)
    // ============================================

    // Classement d'une série : distance parcourue (desc) puis temps (asc),
    // cohérent avec le classement général. Renvoie la liste ordonnée des coureurs.
    function getSerieRanking(serie) {
        var byName = {};
        (serie.participants || []).forEach(function(p) {
            if (!p || !p.name) return;
            byName[p.name] = {
                name: p.name,
                distance: p.totalDistance || 0,
                time: (p.totalTime > 0 ? p.totalTime : (p.finishTime || 0)),
                ran: (p.totalTime > 0 || p.totalDistance > 0 || p.finishTime != null)
            };
        });
        (serie.results || []).forEach(function(r) {
            if (!r || !r.name) return;
            if (!byName[r.name]) {
                byName[r.name] = { name: r.name, distance: serie.distance || 0, time: r.time || 0, ran: true };
            } else {
                byName[r.name].ran = true;
                if (!byName[r.name].time) byName[r.name].time = r.time || 0;
            }
        });
        var arr = Object.keys(byName).map(function(k) { return byName[k]; }).filter(function(x) { return x.ran; });
        arr.sort(function(a, b) {
            if (b.distance !== a.distance) return b.distance - a.distance;
            return a.time - b.time;
        });
        return arr;
    }

    // Rassemble toutes les participations chrono d'un joueur, journée par journée.
    function collectPlayerChronoDetail(playerName) {
        var lower = (playerName || '').toLowerCase();
        var days = [];

        Object.keys(global.championship.days).sort(function(a, b) { return a - b; }).forEach(function(dayNumber) {
            var dayData = global.championship.days[dayNumber];
            if (!dayData || !dayData.chronoData) return;
            var cd = dayData.chronoData;

            // Séries avec contexte d'événement, sans doublon (objet identique).
            var seen = [];
            var entries = [];
            (cd.events || []).forEach(function(ev) {
                (ev.series || []).forEach(function(s) {
                    if (s && seen.indexOf(s) === -1) { seen.push(s); entries.push({ serie: s, eventName: ev.name }); }
                });
            });
            (cd.series || []).forEach(function(s) {
                if (s && seen.indexOf(s) === -1) { seen.push(s); entries.push({ serie: s, eventName: null }); }
            });

            var rows = [];
            entries.forEach(function(e) {
                var serie = e.serie;
                if (!serie.results || serie.results.length === 0) return;

                // Classement de la série (distance desc, temps asc) pour la position
                var serieRanking = getSerieRanking(serie);
                var position = null;
                serieRanking.forEach(function(x, i) {
                    if ((x.name || '').toLowerCase() === lower) position = i + 1;
                });
                var resultEntry = serie.results.find(function(r) { return (r.name || '').toLowerCase() === lower; });
                var p = (serie.participants || []).find(function(x) { return x && (x.name || '').toLowerCase() === lower; });
                if (position === null && !p) return;

                var distance = (p && p.totalDistance > 0) ? p.totalDistance : (serie.distance || 0);
                var time = (p && p.totalTime > 0) ? p.totalTime : ((p && p.finishTime) || (resultEntry && resultEntry.time) || 0);
                var laps = (p && p.laps && p.laps.length) ? p.laps.length : null;

                rows.push({
                    eventName: e.eventName,
                    serieName: serie.name,
                    position: position,
                    total: serieRanking.length,
                    distance: distance,
                    time: time,
                    laps: laps,
                    points: position ? calculateChronoPoints(position, sorted.length) : 0
                });
            });

            if (rows.length) days.push({ day: dayNumber, rows: rows });
        });

        return days;
    }

    function showPlayerChronoDetail(encodedName) {
        var playerName = decodeURIComponent(encodedName);
        var existing = document.getElementById('playerChronoDetailModal');
        if (existing) existing.remove();

        var days = collectPlayerChronoDetail(playerName);

        var grandDistance = 0, grandTime = 0, grandSeries = 0, grandPoints = 0;
        var body = '';

        if (days.length === 0) {
            body = '<p style="color:#7f8c8d; text-align:center; padding:20px;">Aucune épreuve trouvée pour ce participant.</p>';
        } else {
            days.forEach(function(d) {
                var dayDistance = 0, dayTime = 0;
                body += '<div style="margin:14px 0 6px; font-weight:700; color:#2c3e50; border-bottom:2px solid #667eea; padding-bottom:4px;">📅 Journée ' + d.day + '</div>';
                body += '<table style="width:100%; border-collapse:collapse; font-size:13px;">';
                body += '<thead><tr style="background:#f4f6fb; color:#34495e;">' +
                    '<th style="padding:6px 8px; text-align:left;">Épreuve</th>' +
                    '<th style="padding:6px 8px; text-align:left;">Série</th>' +
                    '<th style="padding:6px 8px; text-align:center;">Pos.</th>' +
                    '<th style="padding:6px 8px; text-align:center;">Tours</th>' +
                    '<th style="padding:6px 8px; text-align:center;">Distance</th>' +
                    '<th style="padding:6px 8px; text-align:center;">Temps</th>' +
                    '</tr></thead><tbody>';
                d.rows.forEach(function(r) {
                    dayDistance += r.distance; dayTime += r.time;
                    grandDistance += r.distance; grandTime += r.time; grandSeries++; grandPoints += r.points;
                    var posTxt = r.position ? (r.position + ' / ' + r.total) : '-';
                    body += '<tr style="border-bottom:1px solid #ecf0f1;">' +
                        '<td style="padding:6px 8px;">' + (r.eventName || '<span style="color:#bbb;">—</span>') + '</td>' +
                        '<td style="padding:6px 8px;">' + (r.serieName || '') + '</td>' +
                        '<td style="padding:6px 8px; text-align:center; font-weight:600;">' + posTxt + '</td>' +
                        '<td style="padding:6px 8px; text-align:center;">' + (r.laps != null ? r.laps : '-') + '</td>' +
                        '<td style="padding:6px 8px; text-align:center; color:#2980b9;">' + formatDistance(r.distance) + '</td>' +
                        '<td style="padding:6px 8px; text-align:center; font-family:monospace; color:#e67e22;">' + (r.time ? formatDurationHMS(r.time) : '-') + '</td>' +
                        '</tr>';
                });
                body += '<tr style="background:#fbfbfd; font-weight:700;">' +
                    '<td colspan="4" style="padding:6px 8px; text-align:right;">Sous-total journée :</td>' +
                    '<td style="padding:6px 8px; text-align:center; color:#2980b9;">' + formatDistance(dayDistance) + '</td>' +
                    '<td style="padding:6px 8px; text-align:center; font-family:monospace; color:#e67e22;">' + formatDurationHMS(dayTime) + '</td>' +
                    '</tr>';
                body += '</tbody></table>';
            });

            body += '<div style="margin-top:16px; padding:12px; background:linear-gradient(135deg,#667eea,#764ba2); color:white; border-radius:8px; display:flex; justify-content:space-around; flex-wrap:wrap; gap:8px; text-align:center;">' +
                '<div><div style="font-size:11px; opacity:.85;">Séries</div><div style="font-size:18px; font-weight:700;">' + grandSeries + '</div></div>' +
                '<div><div style="font-size:11px; opacity:.85;">Distance totale</div><div style="font-size:18px; font-weight:700;">' + formatDistance(grandDistance) + '</div></div>' +
                '<div><div style="font-size:11px; opacity:.85;">Temps total</div><div style="font-size:18px; font-weight:700;">' + formatDurationHMS(grandTime) + '</div></div>' +
                '<div><div style="font-size:11px; opacity:.85;">Points (multisport)</div><div style="font-size:18px; font-weight:700;">' + grandPoints + '</div></div>' +
                '</div>';
        }

        var modal = document.createElement('div');
        modal.id = 'playerChronoDetailModal';
        modal.innerHTML =
            '<div style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; z-index:10000;" onclick="if(event.target===this)closePlayerChronoDetail()">' +
            '<div style="background:white; padding:25px; border-radius:10px; max-width:720px; width:94%; max-height:88vh; overflow-y:auto;">' +
            '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">' +
            '<h3 style="margin:0;">🔍 ' + playerName + '</h3>' +
            '<button onclick="closePlayerChronoDetail()" style="border:none; background:#ecf0f1; border-radius:6px; padding:6px 12px; cursor:pointer;">✕</button>' +
            '</div>' +
            body +
            '</div></div>';
        document.body.appendChild(modal);
    }
    global.showPlayerChronoDetail = showPlayerChronoDetail;

    function closePlayerChronoDetail() {
        var m = document.getElementById('playerChronoDetailModal');
        if (m) m.remove();
    }
    global.closePlayerChronoDetail = closePlayerChronoDetail;

    // ============================================
    // HARMONISATION DES NOMS
    // ============================================

    function deburr(str) {
        str = String(str || '');
        return str.normalize ? str.normalize('NFD').replace(/[̀-ͯ]/g, '') : str;
    }

    // Clé normalisée : sans accents, minuscules, ponctuation retirée, mots triés
    // (pour matcher "Jean Dupont" et "Dupont Jean").
    function normalizeNameKey(name) {
        var s = deburr(name).toLowerCase();
        s = s.replace(/[.,'’\-_]/g, ' ').replace(/\s+/g, ' ').trim();
        var tokens = s.split(' ').filter(Boolean).sort();
        return tokens.join(' ');
    }

    function levenshtein(a, b) {
        a = a || ''; b = b || '';
        var m = a.length, n = b.length;
        if (!m) return n;
        if (!n) return m;
        var prev = [], cur = [], i, j;
        for (j = 0; j <= n; j++) prev[j] = j;
        for (i = 1; i <= m; i++) {
            cur[0] = i;
            for (j = 1; j <= n; j++) {
                var cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
                cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
            }
            for (j = 0; j <= n; j++) prev[j] = cur[j];
        }
        return prev[n];
    }

    function getNameOf(pl) {
        if (global.clubsModule && global.clubsModule.getPlayerName) return global.clubsModule.getPlayerName(pl);
        return typeof pl === 'string' ? pl : (pl && pl.name) || '';
    }

    // Recense tous les noms (Courses + Championnat) avec leur fréquence
    function collectAllNames() {
        var counts = {};
        function add(name) {
            if (!name) return;
            name = String(name).trim();
            if (!name) return;
            counts[name] = (counts[name] || 0) + 1;
        }
        Object.keys(global.championship.days).forEach(function(dayNumber) {
            var dayData = global.championship.days[dayNumber];
            if (!dayData) return;
            if (dayData.chronoData) {
                (dayData.chronoData.participants || []).forEach(function(p) { add(p.name); });
                var scan = function(list) {
                    (list || []).forEach(function(s) {
                        (s.participants || []).forEach(function(p) { add(p.name); });
                        (s.results || []).forEach(function(r) { add(r.name); });
                    });
                };
                scan(dayData.chronoData.series);
                (dayData.chronoData.events || []).forEach(function(ev) { scan(ev.series); });
            }
            if (dayData.players) {
                Object.keys(dayData.players).forEach(function(div) {
                    (dayData.players[div] || []).forEach(function(pl) { add(getNameOf(pl)); });
                });
            }
        });
        return Object.keys(counts).map(function(n) { return { name: n, count: counts[n] }; });
    }

    // Regroupe les noms similaires (clé normalisée identique ou distance d'édition faible)
    function groupSimilarNames(names) {
        var groups = [];
        names.forEach(function(item) {
            var norm = normalizeNameKey(item.name);
            var best = null;
            for (var i = 0; i < groups.length; i++) {
                var g = groups[i];
                if (g.norm === norm) { best = g; break; }
                var d = levenshtein(g.norm, norm);
                var tol = Math.max(1, Math.floor(Math.min(g.norm.length, norm.length) / 6));
                if (d <= tol) { best = g; break; }
            }
            if (best) best.members.push(item);
            else groups.push({ norm: norm, members: [item] });
        });
        return groups.filter(function(g) {
            var distinct = {};
            g.members.forEach(function(m) { distinct[m.name] = true; });
            return Object.keys(distinct).length > 1;
        });
    }

    // Applique "Majuscule à chaque mot" à TOUS les noms existants (Courses + Championnat)
    function normalizeAllNamesCase() {
        var names = collectAllNames();
        var renamed = 0;
        names.forEach(function(item) {
            var fixed = toTitleCase(item.name);
            if (fixed && fixed !== item.name) {
                renamed += renameNameEverywhere(item.name, fixed);
            }
        });
        saveToLocalStorage();
        if (typeof global.updateMultisportRanking === 'function') global.updateMultisportRanking();
        showNotification(renamed > 0 ? (renamed + ' nom(s) normalisé(s)') : 'Tous les noms sont déjà normalisés', 'success');
    }
    global.normalizeAllNamesCase = normalizeAllNamesCase;

    function showNameHarmonizationModal() {
        if (document.getElementById('nameHarmonizationModal')) return;
        var groups = groupSimilarNames(collectAllNames());

        var body;
        if (groups.length === 0) {
            body = '<p style="color:#7f8c8d; text-align:center; padding:20px;">✅ Aucune similitude détectée. Les noms semblent déjà harmonisés.</p>';
        } else {
            body = '<p style="color:#7f8c8d; font-size:13px;">' + groups.length + ' groupe(s) de noms similaires détecté(s). Choisis le nom final, décoche ce que tu veux ignorer, puis applique.</p>';
            groups.forEach(function(g, gi) {
                var distinct = {};
                g.members.forEach(function(m) { distinct[m.name] = (distinct[m.name] || 0) + m.count; });
                var suggestion = toTitleCase(Object.keys(distinct).sort(function(a, b) { return distinct[b] - distinct[a]; })[0]);

                body += '<div style="border:1px solid #e0e0e0; border-radius:8px; padding:12px; margin:10px 0; background:#fbfbfd;">';
                body += '<label style="display:flex; align-items:center; gap:8px; margin-bottom:8px; font-weight:600; color:#2c3e50;">' +
                    '<input type="checkbox" class="harmo-group-check" data-group="' + gi + '" checked> Fusionner ce groupe</label>';
                body += '<div style="font-size:12px; color:#7f8c8d; margin-bottom:8px;">Variantes : ' +
                    Object.keys(distinct).map(function(n) { return n + ' (' + distinct[n] + ')'; }).join(' · ') + '</div>';
                body += '<label style="font-size:12px; color:#34495e;">Nom final :</label>';
                body += '<input type="text" class="harmo-canonical" data-group="' + gi + '" value="' + suggestion.replace(/"/g, '&quot;') + '" style="width:100%; padding:8px; border:1px solid #8e44ad; border-radius:5px; margin-top:4px; box-sizing:border-box;">';
                body += '<input type="hidden" class="harmo-variants" data-group="' + gi + '" value="' + Object.keys(distinct).join('||').replace(/"/g, '&quot;') + '">';
                body += '</div>';
            });
        }

        var modal = document.createElement('div');
        modal.id = 'nameHarmonizationModal';
        modal.innerHTML =
            '<div style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; z-index:10000;" onclick="if(event.target===this)closeNameHarmonizationModal()">' +
            '<div style="background:white; padding:25px; border-radius:10px; max-width:600px; width:92%; max-height:85vh; overflow-y:auto;">' +
            '<h3 style="margin-top:0;">🔤 Harmoniser les noms</h3>' +
            body +
            '<div style="display:flex; gap:10px; justify-content:flex-end; margin-top:18px;">' +
            '<button onclick="closeNameHarmonizationModal()" class="btn btn-secondary">Fermer</button>' +
            (groups.length ? '<button onclick="applyNameHarmonization()" class="btn btn-primary" style="background:#8e44ad;">Appliquer</button>' : '') +
            '</div></div></div>';
        document.body.appendChild(modal);
    }
    global.showNameHarmonizationModal = showNameHarmonizationModal;

    function closeNameHarmonizationModal() {
        var m = document.getElementById('nameHarmonizationModal');
        if (m) m.remove();
    }
    global.closeNameHarmonizationModal = closeNameHarmonizationModal;

    function applyNameHarmonization() {
        var checks = document.querySelectorAll('.harmo-group-check');
        var renamed = 0;
        checks.forEach(function(ch) {
            if (!ch.checked) return;
            var gi = ch.getAttribute('data-group');
            var canonicalEl = document.querySelector('.harmo-canonical[data-group="' + gi + '"]');
            var variantsEl = document.querySelector('.harmo-variants[data-group="' + gi + '"]');
            if (!canonicalEl || !variantsEl) return;
            var canonical = canonicalEl.value.trim();
            if (!canonical) return;
            variantsEl.value.split('||').forEach(function(v) {
                if (v && v !== canonical) renamed += renameNameEverywhere(v, canonical);
            });
        });
        saveToLocalStorage();
        closeNameHarmonizationModal();
        if (typeof global.updateMultisportRanking === 'function') global.updateMultisportRanking();
        showNotification(renamed + ' renommage(s) appliqué(s)', 'success');
    }
    global.applyNameHarmonization = applyNameHarmonization;

    // Renomme un nom partout : Courses (participants/séries/résultats) + Championnat
    // (joueurs, matchs, poules).
    function renameNameEverywhere(oldName, newName) {
        if (!oldName || !newName || oldName === newName) return 0;
        var lower = oldName.toLowerCase();
        var changed = 0;

        Object.keys(global.championship.days).forEach(function(dayNumber) {
            var dayData = global.championship.days[dayNumber];
            if (!dayData) return;

            if (dayData.chronoData) {
                applyParticipantRename(dayData.chronoData, null, oldName, newName, null);
            }

            if (dayData.players) {
                Object.keys(dayData.players).forEach(function(div) {
                    var arr = dayData.players[div];
                    if (!Array.isArray(arr)) return;
                    arr.forEach(function(pl, idx) {
                        if ((getNameOf(pl) || '').toLowerCase() === lower) {
                            if (typeof pl === 'string') arr[idx] = newName;
                            else pl.name = newName;
                            changed++;
                        }
                    });
                });
            }

            if (dayData.matches) {
                Object.keys(dayData.matches).forEach(function(div) {
                    var arr = dayData.matches[div];
                    if (!Array.isArray(arr)) return;
                    arr.forEach(function(m) {
                        if (m.player1 && m.player1.toLowerCase() === lower) { m.player1 = newName; changed++; }
                        if (m.player2 && m.player2.toLowerCase() === lower) { m.player2 = newName; changed++; }
                        if (m.winner && m.winner.toLowerCase() === lower) m.winner = newName;
                    });
                });
            }

            if (dayData.pools) {
                Object.keys(dayData.pools).forEach(function(div) {
                    var pools = dayData.pools[div];
                    if (!Array.isArray(pools)) return;
                    pools.forEach(function(pool) {
                        if (pool && Array.isArray(pool.players)) {
                            pool.players.forEach(function(pl, idx) {
                                if ((getNameOf(pl) || '').toLowerCase() === lower) {
                                    if (typeof pl === 'string') pool.players[idx] = newName;
                                    else pl.name = newName;
                                }
                            });
                        }
                        if (pool && Array.isArray(pool.matches)) {
                            pool.matches.forEach(function(m) {
                                if (m.player1 && m.player1.toLowerCase() === lower) m.player1 = newName;
                                if (m.player2 && m.player2.toLowerCase() === lower) m.player2 = newName;
                                if (m.winner && m.winner.toLowerCase() === lower) m.winner = newName;
                            });
                        }
                    });
                });
            }
        });

        return changed;
    }
    global.renameNameEverywhere = renameNameEverywhere;

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
        
        var serie = findSerieInChronoData(chronoData, serieId);
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
            renderParticipantsList(serie, dayNumber) +
            '</div>' +
            '<div style="display: flex; gap: 10px; justify-content: flex-end;">' +
            '<button onclick="closeParticipantsModal(' + dayNumber + ')" class="btn btn-secondary">Fermer</button>' +
            '</div></div></div>';
        
        document.body.appendChild(modal);
    }

    function renderParticipantsList(serie, dayNumber) {
        if (!serie.participants || serie.participants.length === 0) {
            return '<p style="color: #7f8c8d; text-align: center;">Aucun participant</p>';
        }

        var html = '<table style="width: 100%; border-collapse: collapse;">';
        html += '<thead><tr style="background: #f8f9fa;"><th style="padding: 10px;">Dossard</th><th style="padding: 10px;">Nom</th><th style="padding: 10px;">Action</th></tr></thead><tbody>';

        serie.participants.forEach(function(p) {
            html += '<tr id="serie-prow-' + dayNumber + '-' + serie.id + '-' + p.id + '" style="border-bottom: 1px solid #ecf0f1;">';
            html += '<td style="padding: 10px; text-align: center;">#' + p.bib + '</td>';
            html += '<td style="padding: 10px;">' + p.name + '</td>';
            html += '<td style="padding: 10px; text-align: center; white-space: nowrap;">' +
                '<button onclick="editSerieParticipant(' + dayNumber + ', ' + serie.id + ', ' + p.id + ')" class="btn btn-sm" style="background:#f39c12; color:white; margin-right:4px;" title="Éditer nom / dossard">✏️</button>' +
                '<button onclick="removeParticipantFromSerie(' + serie.id + ', ' + p.id + ')" class="btn btn-sm btn-danger" title="Retirer">🗑️</button>' +
                '</td>';
            html += '</tr>';
        });

        html += '</tbody></table>';
        return html;
    }

    /**
     * Passe une ligne du modal "Gérer les participants" en édition (nom + dossard).
     */
    function editSerieParticipant(dayNumber, serieId, participantId) {
        var chronoData = getChronoDataForDay(dayNumber);
        if (!chronoData) return;
        var serie = findSerieInChronoData(chronoData, serieId);
        if (!serie) return;
        var p = (serie.participants || []).find(function(x) { return x.id === participantId; });
        if (!p) return;
        var row = document.getElementById('serie-prow-' + dayNumber + '-' + serieId + '-' + participantId);
        if (!row) return;

        var safeName = (p.name || '').replace(/"/g, '&quot;');
        row.innerHTML =
            '<td style="padding: 8px; text-align: center;">' +
            '<input type="number" id="edit-spbib-' + dayNumber + '-' + serieId + '-' + participantId + '" value="' + (p.bib != null ? p.bib : '') + '" min="0" style="width: 60px; padding: 6px; border: 1px solid #f39c12; border-radius: 4px; text-align: center;">' +
            '</td>' +
            '<td style="padding: 8px;">' +
            '<input type="text" id="edit-spname-' + dayNumber + '-' + serieId + '-' + participantId + '" value="' + safeName + '" style="width: 100%; padding: 6px; border: 1px solid #f39c12; border-radius: 4px;">' +
            '</td>' +
            '<td style="padding: 8px; text-align: center; white-space: nowrap;">' +
            '<button onclick="saveSerieParticipant(' + dayNumber + ', ' + serieId + ', ' + participantId + ')" class="btn btn-sm" style="background:#27ae60; color:white; margin-right:4px;" title="Enregistrer">💾</button>' +
            '<button onclick="refreshSerieParticipantsList(' + dayNumber + ', ' + serieId + ')" class="btn btn-sm btn-secondary" title="Annuler">✖️</button>' +
            '</td>';

        var nameInput = document.getElementById('edit-spname-' + dayNumber + '-' + serieId + '-' + participantId);
        if (nameInput) { nameInput.focus(); nameInput.select(); }
    }
    global.editSerieParticipant = editSerieParticipant;

    /**
     * Re-rend la liste des participants dans le modal "Gérer les participants".
     */
    function refreshSerieParticipantsList(dayNumber, serieId) {
        var chronoData = getChronoDataForDay(dayNumber);
        if (!chronoData) return;
        var serie = findSerieInChronoData(chronoData, serieId);
        var listContainer = document.getElementById('participantsList-' + dayNumber + '-' + serieId);
        if (serie && listContainer) {
            listContainer.innerHTML = renderParticipantsList(serie, dayNumber);
        }
    }
    global.refreshSerieParticipantsList = refreshSerieParticipantsList;

    /**
     * Enregistre le nom / dossard édités depuis le modal de série.
     */
    function saveSerieParticipant(dayNumber, serieId, participantId) {
        var chronoData = getChronoDataForDay(dayNumber);
        if (!chronoData) return;
        var serie = findSerieInChronoData(chronoData, serieId);
        if (!serie) return;
        var p = (serie.participants || []).find(function(x) { return x.id === participantId; });
        if (!p) return;

        var nameEl = document.getElementById('edit-spname-' + dayNumber + '-' + serieId + '-' + participantId);
        var bibEl = document.getElementById('edit-spbib-' + dayNumber + '-' + serieId + '-' + participantId);
        if (!nameEl) return;

        var newName = toTitleCase(nameEl.value.trim());
        if (!newName) { showNotification('Le nom ne peut pas être vide', 'warning'); return; }

        // Doublon dans la série (autre participant)
        var dup = (serie.participants || []).some(function(x) {
            return x.id !== participantId && (x.name || '').toLowerCase() === newName.toLowerCase();
        });
        if (dup) { showNotification('Un participant porte déjà ce nom dans cette série', 'warning'); return; }

        var newBib = (bibEl && bibEl.value !== '') ? parseInt(bibEl.value, 10) : p.bib;
        var oldName = p.name;

        applyParticipantRename(chronoData, participantId, oldName, newName, newBib);

        saveToLocalStorage();
        refreshSerieParticipantsList(dayNumber, serieId);
        refreshChronoDisplay(dayNumber);
        showNotification('Participant mis à jour : ' + newName, 'success');
    }
    global.saveSerieParticipant = saveSerieParticipant;

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
            var serie = findSerieInChronoData(chronoData, serieId);
            var listContainer = document.getElementById('participantsList-' + dayNumber + '-' + serieId);
            if (listContainer) {
                listContainer.innerHTML = renderParticipantsList(serie, dayNumber);
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
        
        var serie = findSerieInChronoData(chronoData, serieId);
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
        
        var serie = findSerieInChronoData(chronoData, serieId);
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
        
        var serie = findSerieInChronoData(chronoData, serieId);
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

    function exportChronoDataForDay(dayNumber) {
        var chronoData = getChronoDataForDay(dayNumber);
        var fileName = 'competition-chrono-J' + dayNumber + '-' + new Date().toISOString().slice(0, 10);

        var totalSeries = (chronoData.series || []).length +
            (chronoData.events || []).reduce(function(n, e) { return n + (e.series ? e.series.length : 0); }, 0);

        var exportData = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            competitionName: fileName,
            raceData: {
                events: chronoData.events || [],
                series: chronoData.series || [],
                participants: chronoData.participants || [],
                nextEventId: chronoData.nextEventId || 1,
                nextSerieId: chronoData.nextSerieId || 1,
                nextParticipantId: chronoData.nextParticipantId || 1
            },
            stats: {
                totalEvents: (chronoData.events || []).length,
                totalParticipants: (chronoData.participants || []).length,
                totalSeries: totalSeries
            }
        };

        var dataStr = JSON.stringify(exportData, null, 2);
        var dataBlob = new Blob([dataStr], { type: 'application/json' });
        var url = URL.createObjectURL(dataBlob);
        var link = document.createElement('a');
        link.href = url;
        link.download = fileName + '.json';
        link.click();
        URL.revokeObjectURL(url);

        showNotification('Compétition chrono J' + dayNumber + ' exportée !', 'success');
    }

    function importChronoDataForDay(dayNumber) {
        var input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.onchange = function(e) {
            var file = e.target.files[0];
            if (!file) return;

            var reader = new FileReader();
            reader.onload = function(event) {
                try {
                    var importedData = JSON.parse(event.target.result);

                    if (!importedData.version) {
                        throw new Error('Fichier non valide : version manquante');
                    }

                    var data = importedData.raceData || importedData.chronoData;
                    if (!data) {
                        throw new Error('Données chrono introuvables dans le fichier');
                    }

                    var stats = importedData.stats || {};
                    var exportDate = importedData.exportDate ? new Date(importedData.exportDate).toLocaleDateString() : '?';
                    var confirmMsg = 'Importer cette compétition dans la Journée ' + dayNumber + ' ?\n\n' +
                        '📅 Date d\'export : ' + exportDate + '\n' +
                        '🏅 Épreuves : ' + (stats.totalEvents || (data.events || []).length) + '\n' +
                        '👥 Participants : ' + (stats.totalParticipants || (data.participants || []).length) + '\n' +
                        '📊 Séries : ' + (stats.totalSeries || (data.series || []).length) + '\n\n' +
                        '⚠️ Cela remplacera toutes les données chrono de cette journée !';

                    if (!confirm(confirmMsg)) return;

                    var chronoData = getChronoDataForDay(dayNumber);
                    chronoData.events = data.events || [];
                    chronoData.series = data.series || [];
                    chronoData.participants = data.participants || [];
                    chronoData.nextEventId = data.nextEventId || 1;
                    chronoData.nextSerieId = data.nextSerieId || 1;
                    chronoData.nextParticipantId = data.nextParticipantId || 1;

                    global.saveToLocalStorage();
                    refreshChronoDisplay(dayNumber);
                    showNotification('Compétition chrono importée avec succès !', 'success');
                } catch (error) {
                    console.error('Erreur import chrono:', error);
                    showNotification('Erreur lors de l\'import : ' + error.message, 'error');
                }
            };
            reader.readAsText(file);
        };

        input.click();
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
        
        var serie = findSerieInChronoData(chronoData, serieId);
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
    global.exportChronoDataForDay = exportChronoDataForDay;
    global.importChronoDataForDay = importChronoDataForDay;
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
