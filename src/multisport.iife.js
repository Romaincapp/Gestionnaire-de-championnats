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
    
    // Matchs ET Courses. Une journée sans dayType est une journée Matchs (comme
    // hasChampionshipDays), sinon l'onglet Multisport s'affichait avec des points
    // calculés hors barème.
    function isMultisportMode() {
        return hasChampionshipDays() && hasChronoDays();
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

        // Onglet « 🏅 Multisport » seulement s'il y a à combiner (journées Matchs
        // ET Courses). Courses seules : leur classement s'ouvre par
        // « 🏆 Classement » (switchToGeneralRanking), un second onglet ferait doublon.
        // Journées Matchs ET Courses : « 🏆 Classement » ouvrirait ce même classement
        // multisport (switchToGeneralRanking), il ferait doublon → masqué.
        var mixed = hasChampionshipDays() && hasChronoDays();
        var generalTab = document.getElementById('generalRankingTab');
        if (generalTab) generalTab.style.display = mixed ? 'none' : '';

        if (mixed) {
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

        // La barre globale "Divisions / Terrains" (en tête de page, incluant
        // son sous-titre d'attribution des terrains #courtAssignmentInfo) ne
        // concerne que le mode Championship — inutile de la montrer sur une
        // journée Chrono. On masque le conteneur entier (#championshipConfigBar)
        // en un seul bloc plutôt que ses enfants un par un, pour ne rien
        // oublier (le sous-titre #courtAssignmentInfo restait visible avant
        // ce correctif car c'était un enfant non couvert par le toggle).
        // On ne la masque que si `dayNumber` est bien la journée actuellement
        // affichée (currentDay) pour ne pas la cacher à tort depuis un appel
        // déclenché par une autre journée en arrière-plan.
        if (global.championship && dayNumber === global.championship.currentDay) {
            var isChampionshipDay = dayType === DAY_TYPES.CHAMPIONSHIP;
            var configBar = document.getElementById('championshipConfigBar');
            if (configBar) configBar.style.display = isChampionshipDay ? 'block' : 'none';
        }
    }
    global.updateDayTypeUI = updateDayTypeUI;

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

    function addChronoEvent(dayNumber, eventName, eventDate, fun) {
        var chronoData = getChronoDataForDay(dayNumber);
        if (!chronoData) return null;
        
        var event = {
            id: chronoData.nextEventId++,
            name: eventName,
            date: eventDate,
            createdAt: new Date().toISOString()
        };
        // Épreuve « fun » : résultats affichés, mais hors classement des clubs
        if (fun) event.fun = true;
        
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

    // Premier couloir libre (1 à 10) d'une série en mode couloirs, ou null si tous pris
    function nextFreeLane(serie) {
        var used = (serie.participants || []).map(function(p) { return p.laneNumber; });
        for (var lane = 1; lane <= 10; lane++) {
            if (used.indexOf(lane) === -1) return lane;
        }
        return null;
    }
    global.nextFreeLane = nextFreeLane;

    // Complète les couloirs manquants d'une série en mode couloirs (séries créées
    // avant l'attribution automatique). Appelée au départ de la course ET à
    // l'impression des séries : la feuille imprimée montre ainsi exactement les
    // couloirs des boutons d'arrêt. Retourne true si un couloir a été attribué.
    function ensureSerieLanes(serie) {
        if (!serie || !serie.laneMode) return false;
        var changed = false;
        (serie.participants || []).forEach(function(p) {
            if (p.laneNumber) return;
            var lane = nextFreeLane(serie);
            if (lane) { p.laneNumber = lane; changed = true; }
        });
        return changed;
    }
    global.ensureSerieLanes = ensureSerieLanes;

    // Dossard libre d'une série : le plus grand + 1. « Nombre de participants + 1 »
    // retombait sur un dossard déjà pris dans les séries natation générées (dossards
    // continus : Série 2 = 6..10), or le dossard est la clé des actions de course.
    function nextFreeBib(serie) {
        var max = 0;
        (serie.participants || []).forEach(function(p) {
            var b = parseInt(p.bib, 10);
            if (b > max) max = b;
        });
        return max + 1;
    }

    function addChronoParticipant(dayNumber, serieId, name, bib, options) {
        var chronoData = getChronoDataForDay(dayNumber);
        if (!chronoData) return null;
        
        var serie = findSerieInChronoData(chronoData, serieId);
        if (!serie) return null;
        
        options = options || {};

        var laneNumber = options.laneNumber || null;
        if (!laneNumber && serie.laneMode) laneNumber = nextFreeLane(serie);

        var participant = {
            id: chronoData.nextParticipantId++,
            name: toTitleCase(name),
            bib: bib || nextFreeBib(serie),
            club: options.club || '',
            category: options.category || '',
            division: options.division || null,
            laneNumber: laneNumber,
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
        
        // Les séries générées (Séries automatiques) n'ont pas de tableau results
        if (!Array.isArray(serie.results)) serie.results = [];
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
        
        // Barre d'actions sobre, sur le modèle des journées Matchs : actions principales
        // en couleur (mêmes tons), actions secondaires en gris, impression / export /
        // vidage réduits à leur icône.
        var PRIMARY = 'display: inline-flex; align-items: center; gap: 4px; padding: 8px 12px; font-size: 12px; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; background: ';
        var NEUTRAL = 'display: inline-flex; align-items: center; gap: 4px; padding: 8px 10px; font-size: 12px; background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; border-radius: 6px; cursor: pointer; font-weight: 500;';
        var SEP = '<span style="color: #cbd5e1;">|</span>';
        html += '<div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 15px;">';
        // Ajouter / importer des participants en tête, côte à côte (même place que
        // « ➕ Joueurs ▾ » des journées Matchs)
        html += '<button onclick="showAddParticipantManualModal(' + dayNumber + ')" style="' + PRIMARY + '#087f58; font-weight: 600;">➕ Participants</button>';
        html += '<button onclick="toggleImportMenu(' + dayNumber + ', this, \'chrono\')" aria-haspopup="menu" aria-expanded="false" style="' + NEUTRAL + '">📥 Importer ▾</button>';
        html += SEP;
        html += '<button onclick="showAddEventModalForDay(' + dayNumber + ')" style="' + PRIMARY + '#236bdd;">🎯 Épreuve</button>';
        // Pas de bouton « Série » ici : une série se crée dans son épreuve (➕ Série de la
        // carte). Créée d'ici, elle n'avait pas d'épreuve : ni imprimée ni classée par épreuve.
        html += '<button onclick="showSwimmingImportModal(' + dayNumber + ')" ' + global.dayActionAttrs(dayNumber, 'events') + ' style="' + PRIMARY + '#9c6304;" title="Répartir les participants en séries par couloirs, au temps d\'engagement (natation, athlétisme…)">🏁 Séries automatiques</button>';
        html += '<button onclick="showChronoDayRanking(' + dayNumber + ')" ' + global.dayActionAttrs(dayNumber, 'series') + ' style="' + PRIMARY + '#804fe8;" title="Classement de la journée : épreuves, participants et clubs">🏆 Classement</button>';
        var allSeries = [];
        getDaySerieGroups(chronoData).forEach(function(g) { allSeries = allSeries.concat(g.series); });
        var allOpen = allSeries.length > 0 && allSeries.every(function(s) { return isSerieDetailsOpen(dayNumber, s.id); });
        html += '<button id="toggle-all-series-' + dayNumber + '" onclick="toggleAllSeriesDetails(' + dayNumber + ')" ' + global.dayActionAttrs(dayNumber, 'series') + ' style="' + NEUTRAL + '" title="Afficher / masquer les participants de toutes les séries">' + (allOpen ? '📁 Tout replier' : '📂 Tout déplier') + '</button>';
        html += SEP;
        html += '<button onclick="printChronoCompetition(' + dayNumber + ')" ' + global.dayActionAttrs(dayNumber, 'series') + ' style="' + NEUTRAL + '" title="Imprimer les séries" aria-label="Imprimer les séries">🖨️</button>';
        html += '<button onclick="exportChronoDataForDay(' + dayNumber + ')" ' + global.dayActionAttrs(dayNumber, 'content') + ' style="' + NEUTRAL + '" title="Exporter la journée" aria-label="Exporter la journée">💾</button>';
        html += '<button onclick="clearChronoDataForDay(' + dayNumber + ')" ' + global.dayActionAttrs(dayNumber, 'content') + ' style="display: inline-flex; align-items: center; gap: 4px; padding: 8px 10px; font-size: 12px; background: #fef2f2; color: #d92223; border: 1px solid #fecaca; border-radius: 6px; cursor: pointer; font-weight: 500;" title="Vider la journée" aria-label="Vider la journée">🗑️</button>';
        html += '<button onclick="refreshChronoDisplay(' + dayNumber + ')" style="' + NEUTRAL + '" title="Actualiser l\'affichage" aria-label="Actualiser l\'affichage">🔄</button>';
        html += '</div>';
        
        
        // Section Participants globaux
        html += renderParticipantsSection(dayNumber, chronoData);
        
        // Liste des épreuves
        html += '<div class="chrono-events-list">';
        if (chronoData.events.length === 0) {
            html += '<p style="color: #586566; text-align: center; padding: 15px; font-size: 13px;">Aucune épreuve. Créez-en une avec 🎯 Épreuve</p>';
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
            html += '<h4 style="font-size: 13px; color: #54637a; margin-bottom: 8px;">🏃 Séries indépendantes</h4>';
            orphanSeries.forEach(function(serie) {
                html += renderSerieCard(dayNumber, serie, false, chronoData.events);
            });
            html += '</div>';
        }

        // Classement de la journée en bas de page, comme les journées Matchs
        // (recalculé à chaque rafraîchissement tant qu'il est affiché)
        if (openChronoDayRankings[dayNumber]) html += renderChronoDayRankingSection(dayNumber);
        
        html += '</div>';
        return html;
    }

    function renderParticipantsSection(dayNumber, chronoData) {
        var participants = chronoData.participants || [];
        // Toutes les séries (générées par « Séries natation » comprises) : avant, seules les
        // séries « à plat » comptaient et le « + » affichait « Créez une série ».
        var hasSeries = getDaySeriesByEvent(chronoData).length > 0;
        
        var html = '<div class="chrono-participants-section" style="background: white; border-radius: 8px; padding: 12px; margin-bottom: 15px; box-shadow: 0 1px 4px rgba(0,0,0,0.08);">';
        html += '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">';
        html += '<h4 style="margin: 0; color: #2c3e50; font-size: 14px;">👥 Participants disponibles (' + participants.length + ')</h4>';
        html += '</div>';
        
        if (participants.length === 0) {
            html += '<p style="color: #566566; font-size: 12px; text-align: center; margin: 0; padding: 15px;">Aucun participant encore. Ajoutez-en avec ➕ Participants, ou importez depuis une autre journée avec 📥 Importer.</p>';
        } else {
            // Tableau façon « data table » (mêmes classes et fonctions de sélection / filtre
            // que la liste des joueurs, players.iife.js) : sélection, dossard, participant,
            // club, épreuve·série·couloir et menu « ⋯ » par ligne. Les actions groupées
            // (club, série, retrait) apparaissent dès qu'une ligne est cochée.
            var clubSet = {};
            if (window.clubsModule && window.clubsModule.getClubsList) {
                window.clubsModule.getClubsList().forEach(function(c) { clubSet[c] = true; });
            }
            participants.forEach(function(p) { if (p.club) clubSet[p.club] = true; });
            var datalistOptions = Object.keys(clubSet).sort().map(function(c) {
                return '<option value="' + escapeLaneHtml(c) + '">';
            }).join('');

            // Après « 🏁 Séries automatiques » : une fiche par inscription. Infos de chaque
            // fiche (épreuve, engagement, série, couloir) et lignes non placées en tête.
            var placement = buildParticipantPlacement(chronoData);
            var generated = participants.some(function(p) { return p.swimImport; });
            var unplacedReason = function(p) {
                if (!generated || p.swimImport || placement.byName[String(p.name || '').toLowerCase()]) return '';
                if (typeof global.parseSwimmingEntry === 'function' && !global.parseSwimmingEntry(p.name)) {
                    return 'Non placée : ligne non comprise par « 🏁 Séries automatiques » (distance ou nage manquante ?)';
                }
                return 'Non placée : aucune épreuve ne correspond (ou ajouté après la génération) — « ⋯ » puis « Ajouter à une série »';
            };
            var ordered = participants.map(function(p) { return { p: p, unplaced: unplacedReason(p) }; });
            ordered.sort(function(a, b) { return (b.unplaced ? 1 : 0) - (a.unplaced ? 1 : 0); }); // stable
            var anyInfo = false;
            var rowsHtml = ordered.map(function(item) {
                var p = item.p;
                var info = participantEntryInfo(p, chronoData, placement);
                if (info) anyInfo = true;
                return { item: item, info: info };
            }).map(function(r, index) {
                var p = r.item.p;
                var name = escapeLaneHtml(p.name || '');
                var row = '<tr id="participant-row-' + dayNumber + '-' + p.id + '" data-name="' + name + '" data-order="' + index + '"' + (r.item.unplaced ? ' class="pt-warning"' : '') + '>';
                row += '<td class="pt-select"><input type="checkbox" class="participant-check-' + dayNumber + '" value="' + p.id + '" aria-label="Sélectionner ' + name + '" onchange="onPlayerRowSelect(this)"></td>';
                row += '<td class="pt-bib" data-col="bib">' + (p.bib != null ? escapeLaneHtml(p.bib) : '<span class="pt-muted">—</span>') + '</td>';
                row += '<td class="pt-name pt-plain"><span' + (p.swimRaw ? ' title="' + escapeLaneHtml('Ligne d\'origine : ' + p.swimRaw) + '"' : '') + '>' + name + '</span>';
                if (r.item.unplaced) {
                    row += ' <span class="participant-unplaced pt-badge" title="' + escapeLaneHtml(r.item.unplaced) + '">⚠️ non placée</span>';
                }
                row += '</td>';
                row += '<td class="pt-club" data-col="club">' + (p.club ? escapeLaneHtml(p.club) : '<span class="pt-muted">—</span>') + '</td>';
                if (anyInfo) {
                    row += '<td class="pt-info" data-col="info">' + (r.info ? '<span class="participant-entry-info">' + escapeLaneHtml(r.info) + '</span>' : '') + '</td>';
                }
                row += '<td class="pt-actions"><button type="button" class="pt-menu-btn" aria-haspopup="menu" aria-expanded="false" aria-label="Actions pour ' + name + '" title="Actions" ' +
                    'onclick="openParticipantRowMenu(this, ' + dayNumber + ', ' + p.id + ')">⋯</button></td>';
                return row + '</tr>';
            }).join('');

            html += '<div class="player-table-wrap participant-table-wrap' + global.playerTableHiddenClasses('participants') + '" data-table="participants" data-day="' + dayNumber + '">';
            html += '<div class="pt-toolbar">';
            html += '<input type="search" class="pt-filter" placeholder="Filtrer les participants…" aria-label="Filtrer les participants" oninput="filterPlayerTable(this)">';
            html += global.playerTableColumnsButtonHTML();
            html += '<input class="pt-needs-selection pt-club-input" hidden list="clubs-datalist-' + dayNumber + '" id="assign-club-input-' + dayNumber + '" placeholder="Club à affecter" aria-label="Club à affecter aux participants cochés">';
            html += '<datalist id="clubs-datalist-' + dayNumber + '">' + datalistOptions + '</datalist>';
            html += '<button type="button" class="ranking-action-btn pt-needs-selection" hidden onclick="assignClubToSelected(' + dayNumber + ')">🏷️ Affecter aux cochés</button>';
            if (hasSeries) {
                html += '<button type="button" class="ranking-action-btn pt-needs-selection" hidden onclick="showBulkAddToSerieModal(' + dayNumber + ')">➕ Ajouter à une série</button>';
            }
            html += '<button type="button" class="ranking-action-btn pt-bulk-delete" hidden data-label="🗑️ Retirer de la liste" onclick="removeSelectedParticipants(' + dayNumber + ')">🗑️ Retirer de la liste</button>';
            html += '</div>';

            // Hauteur de la liste : agrandissable à la souris (poignée en bas à droite),
            // gardée d'un affichage à l'autre (préférence de ce navigateur)
            var savedHeight = readParticipantsListHeight();
            var listHeight = savedHeight || (participants.length > 6 ? 240 : 0);
            html += '<div id="participants-list-' + dayNumber + '" class="pt-scroll" data-initial-height="' + listHeight + '" ' +
                'onmousedown="watchParticipantsListResize(' + dayNumber + ', this)" ' +
                'style="' + (listHeight ? 'height: ' + listHeight + 'px; ' : '') + 'min-height: 60px; overflow-y: auto; resize: vertical;">';
            html += '<table class="player-table"><thead><tr>';
            html += '<th class="pt-select"><input type="checkbox" aria-label="Tout sélectionner" onchange="togglePlayerSelectAll(this)"></th>';
            html += global.playerTableSortHeader('#', 'bib', 'pt-bib') + global.playerTableSortHeader('Participant') + global.playerTableSortHeader('Club', 'club');
            if (anyInfo) html += global.playerTableSortHeader('Épreuve · série · couloir', 'info');
            html += '<th class="pt-actions"><span class="pt-sr-only">Actions</span></th>';
            html += '</tr></thead><tbody>' + rowsHtml + '</tbody></table>';
            html += '</div>';
            html += '<div class="pt-footer"><span class="pt-count" aria-live="polite">0 sur ' + participants.length + ' sélectionné</span>' +
                (listHeight ? '<span class="pt-resize-hint">↘ tirer le coin pour agrandir la liste</span>' : '') + '</div>';
            html += '</div>';
        }

        html += '</div>';
        return html;
    }

    // Où se trouve chaque nageur de la journée : par id de participant de série et, en
    // secours, par épreuve + nom (un nageur déplacé avec « + » a une nouvelle fiche de
    // série, avec un autre id). byName : présent dans au moins une série.
    function buildParticipantPlacement(chronoData) {
        var byId = {}, byEventName = {}, byName = {};
        getDaySeriesByEvent(chronoData).forEach(function(group) {
            group.series.forEach(function(serie) {
                (serie.participants || []).forEach(function(sp) {
                    if (!sp) return;
                    var where = { serieName: serie.name, lane: serie.laneMode ? sp.laneNumber : null };
                    var key = String(sp.name || '').toLowerCase();
                    if (sp.id != null) byId[sp.id] = where;
                    if (group.event) byEventName[group.event.id + '|' + key] = where;
                    byName[key] = true;
                });
            });
        });
        return { byId: byId, byEventName: byEventName, byName: byName };
    }

    // Ligne d'infos d'une fiche générée par « 🏁 Séries automatiques » :
    // « 🎯 50m libre · ⏱ 32,50s · Série 1, couloir 4 ». La série et le couloir sont lus
    // en direct (restent justes après un déplacement). '' pour une autre fiche.
    function participantEntryInfo(p, chronoData, placement) {
        if (!p.swimImport || p.swimEventId == null) return '';
        var evt = (chronoData.events || []).find(function(e) { return e.id === p.swimEventId; });
        if (!evt) return '';
        var parts = ['🎯 ' + evt.name];
        if (p.seedTimeMs > 0) parts.push('⏱ ' + formatDurationHMS(p.seedTimeMs));
        var where = placement.byId[p.id] || placement.byEventName[evt.id + '|' + String(p.name || '').toLowerCase()];
        parts.push(where ? where.serieName + (where.lane ? ', couloir ' + where.lane : '') : '⚠️ hors série');
        return parts.join(' · ');
    }

    function readParticipantsListHeight() {
        try {
            var h = parseInt(localStorage.getItem('chronoParticipantsListHeight'), 10);
            return h > 0 ? h : 0;
        } catch (e) {
            return 0;
        }
    }

    // Enregistre la hauteur de la liste quand on relâche la poignée ; un simple clic dans
    // la liste (case, bouton) ne change rien
    function saveParticipantsListHeight(dayNumber, el) {
        if (!el) return;
        var h = parseInt(el.style.height, 10);
        if (!(h > 0) || String(h) === el.getAttribute('data-initial-height')) return;
        el.setAttribute('data-initial-height', String(h));
        try { localStorage.setItem('chronoParticipantsListHeight', String(h)); } catch (e) { /* navigation privée */ }
    }
    global.saveParticipantsListHeight = saveParticipantsListHeight;

    // Le relâchement de la poignée peut avoir lieu hors de la liste (souris tirée plus
    // bas que la fenêtre) : on l'écoute sur toute la fenêtre, une fois, dès l'appui.
    function watchParticipantsListResize(dayNumber, el) {
        var done = function() {
            window.removeEventListener('mouseup', done, true);
            saveParticipantsListHeight(dayNumber, el);
        };
        window.addEventListener('mouseup', done, true);
    }
    global.watchParticipantsListResize = watchParticipantsListResize;

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

        // Liste, séries, résultats déjà enregistrés et cache de course de la journée
        var count = updateParticipantEverywhere(dayNumber, chronoData, matches, { club: club });

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
     * Menu « ⋯ » d'une ligne de « Participants disponibles » (toggleActionMenu, init.iife.js).
     */
    function openParticipantRowMenu(button, dayNumber, participantId) {
        var chronoData = getChronoDataForDay(dayNumber);
        var p = chronoData && chronoData.participants.find(function(x) { return x.id === participantId; });
        if (!p) return;
        var items = [
            { icon: '✏️', label: 'Modifier', hint: 'Nom, dossard, club, catégorie', onclick: 'editParticipantInfo(' + dayNumber + ', ' + participantId + ')' }
        ];
        if (getDaySeriesByEvent(chronoData).length > 0) {
            items.push({ icon: '➕', label: 'Ajouter à une série', hint: 'Choisir la série (et le couloir)', onclick: 'showAddToSerieModal(' + dayNumber + ', ' + participantId + ')' });
        }
        items.push({ icon: '🗑️', label: 'Retirer de la liste', hint: 'Les séries ne changent pas', type: 'danger', onclick: 'removeParticipantsFromPool(' + dayNumber + ', [' + participantId + '])' });
        global.toggleActionMenu('participantRowMenu', button, 'Actions pour ' + p.name, items, dayNumber + '|' + participantId);
    }
    global.openParticipantRowMenu = openParticipantRowMenu;

    function removeSelectedParticipants(dayNumber) {
        var checks = document.querySelectorAll('.participant-check-' + dayNumber + ':checked');
        removeParticipantsFromPool(dayNumber, Array.prototype.map.call(checks, function(ch) { return parseInt(ch.value, 10); }));
    }
    global.removeSelectedParticipants = removeSelectedParticipants;

    /**
     * Retire des fiches de la liste « Participants disponibles » (une confirmation).
     * Les séries, résultats et classements ne changent pas : un nageur déjà placé reste
     * dans sa série.
     */
    function removeParticipantsFromPool(dayNumber, ids) {
        var chronoData = getChronoDataForDay(dayNumber);
        if (!chronoData || !ids || ids.length === 0) return false;
        var wanted = {};
        ids.forEach(function(id) { wanted[String(id)] = true; });
        var targets = chronoData.participants.filter(function(p) { return wanted[String(p.id)]; });
        if (targets.length === 0) return false;
        var label = targets.length === 1 ? targets[0].name : 'ces ' + targets.length + ' participants';
        if (!confirm('Retirer ' + label + ' de la liste des participants disponibles ?\n\nLes séries et les résultats ne changent pas.')) return false;
        chronoData.participants = chronoData.participants.filter(function(p) { return !wanted[String(p.id)]; });
        saveToLocalStorage();
        refreshChronoDisplay(dayNumber);
        showNotification(targets.length === 1 ? targets[0].name + ' retiré de la liste' : targets.length + ' participants retirés de la liste', 'warning');
        return true;
    }
    global.removeParticipantsFromPool = removeParticipantsFromPool;

    /**
     * Affiche une modal pour ajouter en masse les participants cochés à une série.
     */
    /**
     * Construit un <datalist> HTML des catégories déjà utilisées dans le pool
     * de participants de la journée, pour suggestion (pas de liste fermée).
     */
    function buildCategoryDatalist(dayNumber) {
        var chronoData = getChronoDataForDay(dayNumber);
        var categories = {};
        (chronoData && chronoData.participants || []).forEach(function(p) {
            if (p && p.category) categories[p.category] = true;
        });
        var options = Object.keys(categories).sort().map(function(c) {
            return '<option value="' + c.replace(/"/g, '&quot;') + '">';
        }).join('');
        return '<datalist id="categoryList-' + dayNumber + '">' + options + '</datalist>';
    }
    global.buildCategoryDatalist = buildCategoryDatalist;

    function showBulkAddToSerieModal(dayNumber) {
        var chronoData = getChronoDataForDay(dayNumber);
        if (!chronoData) return;

        var checks = document.querySelectorAll('.participant-check-' + dayNumber + ':checked');
        if (checks.length === 0) {
            showNotification('Cochez au moins un participant', 'warning');
            return;
        }

        if (getDaySeriesByEvent(chronoData).length === 0) {
            showNotification('Créez d\'abord une série', 'warning');
            return;
        }

        if (document.getElementById('bulkAddToSerieModal-' + dayNumber)) return;

        var names = Array.prototype.map.call(checks, function(ch) {
            var p = chronoData.participants.find(function(pp) { return String(pp.id) === ch.value; });
            return p ? p.name : null;
        }).filter(Boolean);

        var html = '<div id="bulkAddToSerieModal-' + dayNumber + '" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; ' +
            'background: rgba(0,0,0,0.5); display: flex; justify-content: center; ' +
            'align-items: center; z-index: 10000;">' +
            '<div style="background: white; padding: 30px; border-radius: 10px; max-width: 420px; width: 90%; max-height: 80vh; overflow-y: auto;">' +
            '<h3>➕ Ajouter ' + checks.length + ' participant(s) à une série</h3>' +
            '<div style="margin-bottom: 15px;">' +
            '<label style="font-size: 12px; color: #555; display: block; margin-bottom: 4px;">Catégorie (optionnel — remplace celle des participants pour cette série)</label>' +
            '<input type="text" id="bulkAddToSerieCategory-' + dayNumber + '" list="categoryList-' + dayNumber + '" placeholder="ex: Solo, Équipe..." style="width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; box-sizing: border-box;">' +
            buildCategoryDatalist(dayNumber) +
            '</div>' +
            '<p style="color: #586566; font-size: 13px; margin-bottom: 15px;">Sélectionnez une série :</p>' +
            '<div style="margin: 15px 0;">';

        html += renderSeriePickerHTML(chronoData, names, function(serie) {
            return 'bulkAddParticipantsToSerie(' + dayNumber + ', ' + serie.id + ')';
        });

        html += '</div>' +
            '<div style="display: flex; gap: 10px; justify-content: flex-end;">' +
            '<button onclick="closeBulkAddToSerieModal(' + dayNumber + ')" class="btn btn-secondary">Annuler</button>' +
            '</div></div></div>';

        document.body.insertAdjacentHTML('beforeend', html);
    }
    global.showBulkAddToSerieModal = showBulkAddToSerieModal;

    function closeBulkAddToSerieModal(dayNumber) {
        var modal = document.getElementById('bulkAddToSerieModal-' + dayNumber);
        if (modal) modal.remove();
    }
    global.closeBulkAddToSerieModal = closeBulkAddToSerieModal;

    function bulkAddParticipantsToSerie(dayNumber, serieId) {
        var chronoData = getChronoDataForDay(dayNumber);
        if (!chronoData) return;

        var serie = findSerieInChronoData(chronoData, serieId);
        if (!serie) return;

        var checks = document.querySelectorAll('.participant-check-' + dayNumber + ':checked');
        var ids = Array.prototype.map.call(checks, function(ch) { return parseInt(ch.value, 10); });

        var categoryInput = document.getElementById('bulkAddToSerieCategory-' + dayNumber);
        var categoryOverride = categoryInput ? categoryInput.value.trim() : '';

        var participants = ids.map(function(id) {
            return chronoData.participants.find(function(p) { return p.id === id; });
        }).filter(Boolean);

        // Déjà dans une autre série de l'épreuve : déplacés, après UNE confirmation
        var toMove = participants.map(function(p) {
            if (findInSerieByName(serie, p.name)) return null;
            var other = findOtherSerieOfEvent(chronoData, serie, p.name);
            return other && !hasSwumInSerie(other, findInSerieByName(other, p.name)) ? { p: p, other: other } : null;
        }).filter(Boolean);
        if (toMove.length > 0 && !confirm('Déplacer vers « ' + serie.name + ' » (retirés de leur série actuelle de l\'épreuve) :\n'
            + toMove.map(function(m) { return '• ' + m.p.name + ' (' + m.other.name + ')'; }).join('\n') + '\n\nContinuer ?')) {
            return;
        }

        var counts = { added: 0, moved: 0, present: 0, swum: 0 };
        participants.forEach(function(participant) {
            var result = placeParticipantInSerie(dayNumber, chronoData, participant, serie, categoryOverride);
            if (result) counts[result]++;
        });

        saveToLocalStorage();
        closeBulkAddToSerieModal(dayNumber);
        refreshChronoDisplay(dayNumber);

        var msg = counts.added + ' participant(s) ajouté(s) à "' + serie.name + '"';
        if (counts.moved > 0) msg += ', ' + counts.moved + ' déplacé(s)';
        if (counts.present > 0) msg += ' (' + counts.present + ' déjà présent(s))';
        if (counts.swum > 0) msg += ' — ' + counts.swum + ' non déplacé(s) : leur série est déjà disputée';
        showNotification(msg, counts.swum > 0 ? 'warning' : 'success');
    }
    global.bulkAddParticipantsToSerie = bulkAddParticipantsToSerie;

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
        var safeClub = (p.club || '').replace(/"/g, '&quot;');
        var safeCategory = (p.category || '').replace(/"/g, '&quot;');
        // Ligne du tableau : toute la ligne devient une cellule d'édition
        var isTableRow = row.tagName === 'TR';
        var cols = isTableRow ? (row.closest('table').querySelectorAll('thead th').length || 1) : 0;
        row.innerHTML = (isTableRow ? '<td colspan="' + cols + '"><div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">' : '') +
            '<div style="display: flex; align-items: center; gap: 6px; flex: 1; flex-wrap: wrap;">' +
            '<input type="number" id="edit-pbib-' + dayNumber + '-' + participantId + '" value="' + (p.bib != null ? p.bib : '') + '" min="0" placeholder="#" aria-label="Dossard" style="width: 55px; padding: 5px; border: 1px solid #8b5700; border-radius: 4px; font-size: 12px; text-align: center;">' +
            '<input type="text" id="edit-pname-' + dayNumber + '-' + participantId + '" value="' + safeName + '" placeholder="Nom" style="flex: 1; min-width: 120px; padding: 5px; border: 1px solid #8b5700; border-radius: 4px; font-size: 12px;">' +
            '<input type="text" id="edit-pclub-' + dayNumber + '-' + participantId + '" value="' + safeClub + '" placeholder="Club" style="width: 110px; padding: 5px; border: 1px solid #8b5700; border-radius: 4px; font-size: 12px;">' +
            '<input type="text" id="edit-pcategory-' + dayNumber + '-' + participantId + '" list="categoryListRow-' + dayNumber + '-' + participantId + '" value="' + safeCategory + '" placeholder="Catégorie" style="width: 100px; padding: 5px; border: 1px solid #8b5700; border-radius: 4px; font-size: 12px;">' +
            buildCategoryDatalist(dayNumber).replace('categoryList-' + dayNumber, 'categoryListRow-' + dayNumber + '-' + participantId) +
            '</div>' +
            '<div style="display: flex; gap: 4px; flex-shrink: 0;">' +
            '<button onclick="saveParticipantInfo(' + dayNumber + ', ' + participantId + ')" style="padding: 4px 8px; font-size: 11px; background: #017239; color: white; border: none; border-radius: 4px; cursor: pointer;" title="Enregistrer">💾</button>' +
            '<button onclick="refreshChronoDisplay(' + dayNumber + ')" style="padding: 4px 8px; font-size: 11px; background: #566566; color: white; border: none; border-radius: 4px; cursor: pointer;" title="Annuler">✖️</button>' +
            '</div>' + (isTableRow ? '</div></td>' : '');

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

        if (nameTakenByOther(chronoData.participants, participantId, p.name, newName)) {
            showNotification('Un participant porte déjà ce nom', 'warning');
            return;
        }

        var newBib = (bibEl && bibEl.value !== '') ? parseInt(bibEl.value, 10) : p.bib;
        var clubEl = document.getElementById('edit-pclub-' + dayNumber + '-' + participantId);
        var newClub = clubEl ? clubEl.value.trim() : undefined;
        var categoryEl = document.getElementById('edit-pcategory-' + dayNumber + '-' + participantId);
        var newCategory = categoryEl ? categoryEl.value.trim() : undefined;

        applyParticipantRename(dayNumber, chronoData, participantId, p.name,
            editedChanges(p, newName, newBib, newClub, newCategory));

        saveToLocalStorage();
        refreshChronoDisplay(dayNumber);
        showNotification('Participant mis à jour : ' + newName, 'success');
    }
    global.saveParticipantInfo = saveParticipantInfo;

    // Le nom est-il porté par un AUTRE nageur de la liste ? Après « 🏁 Séries
    // automatiques », un nageur a une ligne par inscription (même nom, une par
    // épreuve) : ces lignes sont les siennes et suivent la modification.
    function nameTakenByOther(list, participantId, oldName, newName) {
        if (sameName(newName, oldName)) return false;
        return (list || []).some(function(x) {
            return x.id !== participantId && sameName(x.name, newName);
        });
    }

    // Modifications d'une fiche éditée (✏️) à propager. Nom, club et catégorie modifiée
    // valent pour le nageur (toutes ses inscriptions) ; le dossard est propre à chaque
    // inscription : propagé seulement s'il a été changé.
    function editedChanges(p, newName, newBib, newClub, newCategory) {
        var changes = { name: newName };
        if (newBib != null && !isNaN(newBib) && String(newBib) !== String(p.bib)) changes.bib = newBib;
        if (newClub !== undefined) changes.club = newClub;
        if (newCategory !== undefined && newCategory !== (p.category || '')) changes.category = newCategory;
        return changes;
    }

    /**
     * Applique `changes` (name, bib, club, category : seuls les champs présents) à un
     * nageur partout dans la journée : liste, séries (participants ET résultats — le
     * classement lit le club du résultat en priorité) et cache de course de CETTE
     * journée (dans les autres, un même id peut désigner quelqu'un d'autre).
     * match(p) désigne le nageur. Retourne le nombre de lignes de la liste modifiées.
     */
    function updateParticipantEverywhere(dayNumber, chronoData, match, changes) {
        var listCount = 0;
        function applyTo(list, isList) {
            (list || []).forEach(function(sp) {
                if (!sp || !match(sp)) return;
                if (changes.name !== undefined) sp.name = changes.name;
                if (changes.bib !== undefined) sp.bib = changes.bib;
                if (changes.club !== undefined) sp.club = changes.club;
                if (changes.category !== undefined) sp.category = changes.category;
                if (isList) listCount++;
            });
        }
        function applyToSerie(serie) {
            applyTo(serie.participants);
            applyTo(serie.results);
        }
        applyTo(chronoData.participants, true);
        (chronoData.series || []).forEach(applyToSerie);
        (chronoData.events || []).forEach(function(ev) { (ev.series || []).forEach(applyToSerie); });

        // Cache du moteur de course (raceData) : course en cours ou déjà lancée
        var rd = global.raceData;
        if (rd && dayNumber != null) {
            dayNumber = Number(dayNumber);
            if (rd.currentSerie && Number(rd.currentDayNumber) === dayNumber) applyTo(rd.currentSerie.participants);
            (rd.series || []).forEach(function(rs) {
                if (Number(rs.dayNumber) === dayNumber) applyTo(rs.participants);
            });
            (rd.events || []).forEach(function(ev) {
                if (Number(ev.dayNumber) === dayNumber) (ev.series || []).forEach(function(rs) { applyTo(rs.participants); });
            });
            if (typeof global.saveChronoToLocalStorage === 'function') global.saveChronoToLocalStorage();
        }
        return listCount;
    }

    // Renomme / modifie un nageur partout dans la journée. Correspondance par id OU
    // ancien nom (les copies en série ont souvent un autre id que la ligne de la liste).
    function applyParticipantRename(dayNumber, chronoData, participantId, oldName, changes) {
        return updateParticipantEverywhere(dayNumber, chronoData, function(sp) {
            return (participantId != null && sp.id === participantId) || (!!oldName && sameName(sp.name, oldName));
        }, changes);
    }

    /**
     * Fenêtre « ➕ Ajouter des participants » : deux façons de saisir.
     * - 📝 Liste : une ligne par participant (Nom · Nom, Club · Dossard + Nom).
     * - 📊 Tableau : colonnes Nom / Prénom / Club / Catégorie à contrôler une à une ;
     *   une ligne s'ajoute quand on remplit la dernière, un collage depuis un tableur
     *   (lignes + tabulations) se répartit dans les cellules. Passer de la liste au
     *   tableau découpe la liste en colonnes. Dernier mode choisi gardé (navigateur).
     */
    var BULK_MODE_KEY = 'addParticipantsMode';
    var BULK_COLUMNS = [
        { key: 'nom', label: 'Nom' },
        { key: 'prenom', label: 'Prénom' },
        { key: 'club', label: 'Club' },
        { key: 'category', label: 'Catégorie' },
        // Épreuve (et temps d'engagement) : la fiche devient « Nom Prénom 50m brasse 45.20 »,
        // la ligne que lit « 🏁 Séries automatiques »
        { key: 'event', label: 'Épreuve', placeholder: 'ex. 50m brasse 45.20' }
    ];

    function showAddParticipantManualModal(dayNumber) {
        if (document.getElementById('addParticipantsModal-' + dayNumber)) return;
        var mode = 'list';
        try { if (localStorage.getItem(BULK_MODE_KEY) === 'table') mode = 'table'; } catch (e) { /* ignore */ }

        var tab = function(key, label) {
            return '<button type="button" role="tab" id="bulk-tab-' + key + '-' + dayNumber + '" class="bulk-mode-tab" ' +
                'aria-controls="bulk-panel-' + key + '-' + dayNumber + '" onclick="setBulkParticipantsMode(' + dayNumber + ', \'' + key + '\')">' + label + '</button>';
        };

        var modal = document.createElement('div');
        modal.id = 'addParticipantsModal-' + dayNumber;
        modal.innerHTML =
            '<div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; ' +
            'background: rgba(0,0,0,0.5); display: flex; justify-content: center; ' +
            'align-items: center; z-index: 10000;">' + // pas de fermeture au clic à côté : la saisie serait perdue
            '<div class="bulk-participants-dialog" style="background: white; padding: 30px; border-radius: 10px; width: 92%; max-height: 85vh; overflow-y: auto;">' +
            '<h3>➕ Ajouter des participants - Journée ' + dayNumber + '</h3>' +
            '<div class="bulk-mode-tabs" role="tablist" aria-label="Mode de saisie">' + tab('list', '📝 Liste') + tab('table', '📊 Tableau') + '</div>' +
            // Panneau Liste (saisie historique)
            '<div id="bulk-panel-list-' + dayNumber + '" role="tabpanel" aria-labelledby="bulk-tab-list-' + dayNumber + '">' +
            '<p style="color: #586566; font-size: 13px;">Un participant par ligne. Optionnel : son club après une virgule, ou son numéro de dossard devant. Un copier-coller depuis un tableur fonctionne aussi.</p>' +
            '<div style="margin: 15px 0;">' +
            '<textarea id="bulk-participants-' + dayNumber + '" rows="10" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-family: inherit;" placeholder="Dupont Jean\nMartin Pierre, Club ABC\n12 Durand Sophie"></textarea>' +
            '</div>' +
            // Astuce : avec l'épreuve (et le temps d'engagement) sur la ligne, « 🏁 Séries
            // automatiques » crée les séries en un clic (generateSwimmingSeries)
            '<p class="bulk-tip">💡 <strong>Astuce :</strong> ajoutez le nom de l\'épreuve en fin de ligne, et même le temps d\'engagement ' +
            '(ex. <em>Dupont Jean 50m brasse 45.20</em>)&nbsp;: le bouton «&nbsp;🏁 Séries automatiques&nbsp;» créera alors les séries en un clic.</p>' +
            '</div>' +
            // Panneau Tableau
            '<div id="bulk-panel-table-' + dayNumber + '" role="tabpanel" aria-labelledby="bulk-tab-table-' + dayNumber + '" hidden>' +
            '<p style="color: #586566; font-size: 13px;">Un participant par ligne : seul le nom est obligatoire. Vous pouvez aussi coller des lignes copiées depuis un tableur, dans l\'ordre des colonnes.</p>' +
            '<p class="bulk-tip" style="margin: 0 0 10px;">💡 <strong>Astuce :</strong> remplissez la colonne Épreuve (avec le temps si vous l\'avez) pour créer ensuite les séries en un clic via «&nbsp;🏁 Séries automatiques&nbsp;».</p>' +
            '<div class="bulk-grid-scroll"><table class="bulk-grid" id="bulk-grid-' + dayNumber + '"><thead><tr><th class="bulk-grid-num">#</th>' +
            BULK_COLUMNS.map(function(c) { return '<th>' + c.label + '</th>'; }).join('') +
            '<th class="bulk-grid-del"><span class="pt-sr-only">Retirer</span></th></tr></thead><tbody></tbody></table></div>' +
            '<button type="button" class="ranking-action-btn" style="margin-top: 8px;" onclick="addBulkGridRow(' + dayNumber + ', null, true)">➕ Ligne</button>' +
            '</div>' +
            '<div style="margin: 15px 0;">' +
            '<label for="bulk-participants-category-' + dayNumber + '" style="font-size: 12px; color: #555; display: block; margin-bottom: 4px;">Catégorie par défaut (optionnel — pour les participants sans catégorie)</label>' +
            '<input type="text" id="bulk-participants-category-' + dayNumber + '" list="categoryList-' + dayNumber + '" placeholder="ex: Solo, Équipe..." style="width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; box-sizing: border-box;">' +
            buildCategoryDatalist(dayNumber) +
            '</div>' +
            '<div style="display: flex; gap: 10px; justify-content: flex-end;">' +
            '<button onclick="cancelAddParticipantsModal(' + dayNumber + ')" class="btn btn-secondary">Annuler</button>' +
            '<button onclick="saveBulkParticipantsForDay(' + dayNumber + ')" class="btn btn-primary">💾 Ajouter</button>' +
            '</div></div></div>';

        document.body.appendChild(modal);
        setBulkParticipantsMode(dayNumber, mode, true);
    }

    // Change d'onglet. Liste → Tableau : la liste saisie est découpée dans le tableau
    // (s'il est encore vide) pour pouvoir contrôler chaque colonne.
    function setBulkParticipantsMode(dayNumber, mode, initial) {
        ['list', 'table'].forEach(function(key) {
            var t = document.getElementById('bulk-tab-' + key + '-' + dayNumber);
            var panel = document.getElementById('bulk-panel-' + key + '-' + dayNumber);
            if (t) { t.setAttribute('aria-selected', String(key === mode)); t.classList.toggle('active', key === mode); }
            if (panel) panel.hidden = key !== mode;
        });
        var dialog = document.querySelector('#addParticipantsModal-' + dayNumber + ' .bulk-participants-dialog');
        if (dialog) dialog.style.maxWidth = mode === 'table' ? '760px' : '500px';
        if (!initial) { try { localStorage.setItem(BULK_MODE_KEY, mode); } catch (e) { /* ignore */ } }

        if (mode === 'table') {
            var rows = bulkGridRows(dayNumber);
            if (!rows.some(bulkRowFilled)) {
                var textarea = document.getElementById('bulk-participants-' + dayNumber);
                var parsed = textarea ? textarea.value.split('\n').map(parseBulkParticipantLine).filter(Boolean) : [];
                var tbody = document.querySelector('#bulk-grid-' + dayNumber + ' tbody');
                if (tbody) tbody.innerHTML = '';
                parsed.forEach(function(p) {
                    // Ligne de natation (« Dupont Jean 50m brasse 45.20 ») : épreuve et temps
                    // dans leur colonne, club connu (en tête de ligne) dans la sienne
                    var swim = typeof global.parseSwimmingEntry === 'function' && !p.club ? global.parseSwimmingEntry(p.name) : null;
                    if (swim && swim.swimmerName && !swim.relay) {
                        var s2 = splitNomPrenom(swim.swimmerName);
                        addBulkGridRow(dayNumber, { nom: s2.nom, prenom: s2.prenom, club: swim.club, category: '', event: swimEventText(swim) });
                        return;
                    }
                    var split = splitNomPrenom(p.name);
                    addBulkGridRow(dayNumber, { nom: split.nom, prenom: split.prenom, club: p.club, category: '' });
                });
                // Toujours quelques lignes vides prêtes à remplir
                var empty = Math.max(1, 5 - parsed.length);
                for (var i = 0; i < empty; i++) addBulkGridRow(dayNumber);
            }
            var first = document.querySelector('#bulk-grid-' + dayNumber + ' tbody input');
            if (first) setTimeout(function() { first.focus(); }, 50);
        } else {
            var ta = document.getElementById('bulk-participants-' + dayNumber);
            if (ta) setTimeout(function() { ta.focus(); }, 50);
        }
    }

    // Épreuve + temps d'une ligne de natation analysée : « 50m Brasse 45.20 », « 100m Libre 1:02.50 »
    function swimEventText(entry) {
        var text = entry.distance + 'm' + (entry.stroke ? ' ' + entry.stroke : '');
        if (entry.timeMs > 0) {
            var cs = Math.round(entry.timeMs / 10);
            var min = Math.floor(cs / 6000), sec = Math.floor((cs % 6000) / 100), cent = cs % 100;
            var pad = function(n) { return (n < 10 ? '0' : '') + n; };
            text += ' ' + (min > 0 ? min + ':' + pad(sec) : String(sec)) + '.' + pad(cent);
        }
        return text;
    }

    // « Dupont Jean » → Nom Dupont, Prénom Jean ; « Van Der Berg Jean » → Nom Van Der Berg ;
    // un nom d'équipe (« Gringos - Julien ») ou un seul mot reste entier dans Nom.
    function splitNomPrenom(full) {
        var name = String(full || '').trim();
        if (!name || / - /.test(name) || name.indexOf(' ') === -1) return { nom: name, prenom: '' };
        var i = name.lastIndexOf(' ');
        return { nom: name.slice(0, i), prenom: name.slice(i + 1) };
    }

    function bulkGridRows(dayNumber) {
        return Array.prototype.slice.call(document.querySelectorAll('#bulk-grid-' + dayNumber + ' tbody tr'));
    }

    function bulkRowValues(tr) {
        var v = {};
        BULK_COLUMNS.forEach(function(c) {
            var input = tr.querySelector('input[data-col="' + c.key + '"]');
            v[c.key] = input ? input.value.trim() : '';
        });
        return v;
    }

    function bulkRowFilled(tr) {
        var v = bulkRowValues(tr);
        return !!(v.nom || v.prenom || v.club || v.category || v.event);
    }

    function renumberBulkGrid(dayNumber) {
        bulkGridRows(dayNumber).forEach(function(tr, i) {
            tr.querySelector('.bulk-grid-num').textContent = i + 1;
            BULK_COLUMNS.forEach(function(c) {
                var input = tr.querySelector('input[data-col="' + c.key + '"]');
                if (input) input.setAttribute('aria-label', c.label + ', ligne ' + (i + 1));
            });
            var del = tr.querySelector('.bulk-grid-del button');
            if (del) del.setAttribute('aria-label', 'Retirer la ligne ' + (i + 1));
        });
    }

    function addBulkGridRow(dayNumber, values, focus) {
        var tbody = document.querySelector('#bulk-grid-' + dayNumber + ' tbody');
        if (!tbody) return null;
        values = values || {};
        var tr = document.createElement('tr');
        tr.innerHTML = '<td class="bulk-grid-num"></td>' + BULK_COLUMNS.map(function(c) {
            return '<td><input type="text" data-col="' + c.key + '" value="' + escapeLaneHtml(values[c.key] || '') + '"' +
                // Exemple seulement sur la 1re ligne (répété partout, il charge la grille)
                (c.placeholder && tbody.rows.length === 0 ? ' placeholder="' + escapeLaneHtml(c.placeholder) + '"' : '') +
                (c.key === 'category' ? ' list="categoryList-' + dayNumber + '"' : '') +
                ' oninput="onBulkGridInput(' + dayNumber + ', this)" onpaste="onBulkGridPaste(' + dayNumber + ', event)"></td>';
        }).join('') +
            '<td class="bulk-grid-del"><button type="button" title="Retirer la ligne" onclick="removeBulkGridRow(' + dayNumber + ', this)">×</button></td>';
        tbody.appendChild(tr);
        renumberBulkGrid(dayNumber);
        if (focus) tr.querySelector('input').focus();
        return tr;
    }

    function removeBulkGridRow(dayNumber, button) {
        var tr = button.closest('tr');
        if (tr) tr.remove();
        if (bulkGridRows(dayNumber).length === 0) addBulkGridRow(dayNumber);
        renumberBulkGrid(dayNumber);
    }

    // Remplir la dernière ligne en ajoute une nouvelle, vide
    function onBulkGridInput(dayNumber, input) {
        var rows = bulkGridRows(dayNumber);
        var tr = input.closest('tr');
        if (tr === rows[rows.length - 1] && bulkRowFilled(tr)) addBulkGridRow(dayNumber);
    }

    // Collage d'un bloc (lignes / tabulations) : réparti à partir de la cellule visée
    function onBulkGridPaste(dayNumber, event) {
        var text = (event.clipboardData || window.clipboardData || { getData: function() { return ''; } }).getData('text') || '';
        if (text.indexOf('\n') === -1 && text.indexOf('\t') === -1) return; // simple texte : collage normal
        event.preventDefault();
        var lines = text.replace(/\r/g, '').split('\n');
        while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
        var startTr = event.target.closest('tr');
        var startCol = BULK_COLUMNS.findIndex(function(c) { return c.key === event.target.dataset.col; });
        var rows = bulkGridRows(dayNumber);
        var rowIndex = rows.indexOf(startTr);
        lines.forEach(function(line, i) {
            var tr = bulkGridRows(dayNumber)[rowIndex + i] || addBulkGridRow(dayNumber);
            line.split('\t').forEach(function(cell, j) {
                var col = BULK_COLUMNS[startCol + j];
                if (!col) return;
                tr.querySelector('input[data-col="' + col.key + '"]').value = cell.trim();
            });
        });
        var last = bulkGridRows(dayNumber);
        if (bulkRowFilled(last[last.length - 1])) addBulkGridRow(dayNumber);
    }

    function closeAddParticipantsModal(dayNumber) {
        var modal = document.getElementById('addParticipantsModal-' + dayNumber);
        if (modal) modal.remove();
    }

    // « Annuler » (et Échap, qui clique ce bouton) : confirmation si une saisie est en cours
    function cancelAddParticipantsModal(dayNumber) {
        var textarea = document.getElementById('bulk-participants-' + dayNumber);
        var typed = (textarea && textarea.value.trim()) || bulkGridRows(dayNumber).some(bulkRowFilled);
        if (typed && !confirm('Abandonner la saisie ? Les participants tapés seront perdus.')) return false;
        closeAddParticipantsModal(dayNumber);
        return true;
    }

    // Une ligne de la saisie « Liste » → { bib, name, club }. Formats : « Nom »,
    // « Nom, Club », « Dossard, Nom, … » / « Dossard<TAB>Nom<TAB>… » (colonnes en
    // trop ignorées), ligne natation (nom + distance + temps) gardée entière.
    function parseBulkParticipantLine(line) {
        line = String(line || '').trim();
        if (!line) return null;
        var parts;
        if (line.indexOf('\t') !== -1) {
            parts = line.split('\t').map(function(p) { return p.trim(); });
        } else {
            parts = line.split(',').map(function(p) { return p.trim(); });
        }
        while (parts.length > 1 && !parts[parts.length - 1]) parts.pop();

        var bib = null, name, club = '';
        if (/\b\d{2,4}\s*(?:m[eè]tres?|m)\b/i.test(line)) {
            // Ligne de natation (nom + distance + temps) : garder la ligne entière
            // pour l'import « Séries natation », sans couper « 32,50 » ni les
            // colonnes d'un collage Excel. Un dossard en tête est mis de côté.
            name = line.replace(/\t+/g, ' ').replace(/\s+/g, ' ').trim();
            var lead = name.match(/^(\d+)\s+(?!m\b|m[eè]tres?\b)(?=\D)/i);
            if (lead) {
                bib = parseInt(lead[1], 10);
                name = name.slice(lead[0].length);
            }
        } else if (parts.length >= 2 && /^\d+$/.test(parts[0])) {
            bib = parseInt(parts[0], 10);
            name = parts[1];
        } else {
            name = parts[0];
            club = parts[1] || '';
            // Dossard séparé du nom par un simple espace (« 12 Durand Sophie »)
            var leadBib = name.match(/^(\d+)\s+(?=\D)/);
            if (leadBib) {
                bib = parseInt(leadBib[1], 10);
                name = name.slice(leadBib[0].length);
            }
        }
        name = toTitleCase(name);
        return name ? { bib: bib, name: name, club: club } : null;
    }

    function saveBulkParticipantsForDay(dayNumber) {
        var chronoData = getChronoDataForDay(dayNumber);
        if (!chronoData) return;

        var categoryInput = document.getElementById('bulk-participants-category-' + dayNumber);
        var defaultCategory = categoryInput ? categoryInput.value.trim() : '';
        var tablePanel = document.getElementById('bulk-panel-table-' + dayNumber);
        var useTable = tablePanel && !tablePanel.hidden;

        var entries;
        if (useTable) {
            entries = bulkGridRows(dayNumber).map(bulkRowValues).filter(function(v) { return v.nom || v.prenom; }).map(function(v) {
                return {
                    bib: null,
                    // Avec une épreuve : « Nom Prénom 50m brasse 45.20 », comme une ligne de la Liste
                    name: toTitleCase((v.nom + ' ' + v.prenom + ' ' + v.event).replace(/\s+/g, ' ').trim()),
                    club: v.club,
                    category: v.category || defaultCategory
                };
            });
        } else {
            var textarea = document.getElementById('bulk-participants-' + dayNumber);
            entries = (textarea ? textarea.value.split('\n') : []).map(parseBulkParticipantLine).filter(Boolean)
                .map(function(e) { e.category = defaultCategory; return e; });
        }
        if (entries.length === 0) {
            showNotification(useTable ? 'Remplissez au moins un nom dans le tableau' : 'Veuillez entrer au moins un nom', 'warning');
            return;
        }

        var added = 0;
        var skipped = 0;
        entries.forEach(function(e) {
            var exists = chronoData.participants.some(function(p) {
                return p.name.toLowerCase() === e.name.toLowerCase();
            });
            if (exists) { skipped++; return; }
            chronoData.participants.push({
                id: chronoData.nextParticipantId++,
                name: e.name,
                club: e.club || '',
                category: e.category || '',
                bib: e.bib != null ? e.bib : chronoData.participants.length + 1,
                totalTime: null,
                laps: 0
            });
            added++;
        });

        saveToLocalStorage();
        closeAddParticipantsModal(dayNumber);
        refreshChronoDisplay(dayNumber);

        var msg = added + ' participant(s) ajouté(s)';
        if (skipped > 0) msg += ' (' + skipped + ' doublon(s) ignoré(s))';
        showNotification(msg, 'success');
    }

    global.cancelAddParticipantsModal = cancelAddParticipantsModal;
    global.setBulkParticipantsMode = setBulkParticipantsMode;
    global.addBulkGridRow = addBulkGridRow;
    global.removeBulkGridRow = removeBulkGridRow;
    global.onBulkGridInput = onBulkGridInput;
    global.onBulkGridPaste = onBulkGridPaste;
    global.parseBulkParticipantLine = parseBulkParticipantLine;
    global.splitNomPrenom = splitNomPrenom;

    function showAddToSerieModal(dayNumber, participantId) {
        var chronoData = getChronoDataForDay(dayNumber);
        if (!chronoData) return;
        
        var participant = chronoData.participants.find(function(p) { return p.id === participantId; });
        if (!participant) return;
        
        if (document.getElementById('addToSerieModal-' + dayNumber)) return;
        
        var html = '<div id="addToSerieModal-' + dayNumber + '" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; ' +
            'background: rgba(0,0,0,0.5); display: flex; justify-content: center; ' +
            'align-items: center; z-index: 10000;">' +
            '<div style="background: white; padding: 30px; border-radius: 10px; max-width: 420px; width: 90%; max-height: 80vh; overflow-y: auto;">' +
            '<h3>➕ Ajouter ' + participant.name + '</h3>' +
            '<p style="color: #586566; font-size: 13px; margin-bottom: 15px;">Sélectionnez une série :</p>' +
            '<div style="margin: 15px 0;">';

        html += renderSeriePickerHTML(chronoData, [participant.name], function(serie) {
            return 'addExistingParticipantToSerie(' + dayNumber + ', ' + participantId + ', ' + serie.id + ')';
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
        var serie = findSerieInChronoData(chronoData, serieId);
        if (!serie) return;

        if (findInSerieByName(serie, participant.name)) {
            showNotification(participant.name + ' est déjà dans « ' + serie.name + ' »', 'info');
            return;
        }
        // Déjà dans une autre série de la même épreuve : déplacement (sinon il serait
        // classé deux fois dans l'épreuve), refusé s'il y a déjà nagé
        var other = findOtherSerieOfEvent(chronoData, serie, participant.name);
        if (other) {
            if (hasSwumInSerie(other, findInSerieByName(other, participant.name))) {
                showNotification(participant.name + ' a déjà disputé « ' + other.name + ' » : déplacement impossible', 'warning');
                return;
            }
            if (!confirm('Déplacer « ' + participant.name + ' » de « ' + other.name + ' » vers « ' + serie.name + ' » ?')) return;
        }

        var result = placeParticipantInSerie(dayNumber, chronoData, participant, serie, '');
        if (result === 'added' || result === 'moved') {
            saveToLocalStorage();
            closeAddToSerieModal(dayNumber);
            refreshChronoDisplay(dayNumber);
            showNotification(participant.name + (result === 'moved' ? ' déplacé vers « ' + serie.name + ' »' : ' ajouté !'), 'success');
        }
    }

    function sameName(a, b) {
        return String(a || '').toLowerCase() === String(b || '').toLowerCase();
    }

    function findInSerieByName(serie, name) {
        return (serie.participants || []).find(function(p) { return sameName(p.name, name); }) || null;
    }

    // A déjà nagé dans cette série (arrivé, disqualifié, tours ou temps enregistrés) ;
    // un DNS (pas parti) peut encore changer de série
    function hasSwumInSerie(serie, p) {
        if (!p) return false;
        return p.status === 'finished' || p.status === 'disq'
            || (Array.isArray(p.laps) && p.laps.length > 0)
            || (serie.results || []).some(function(r) { return sameName(r.name, p.name); });
    }

    // Autre série de la même épreuve où ce nageur figure déjà, ou null
    function findOtherSerieOfEvent(chronoData, target, name) {
        if (!target.eventId) return null;
        var evt = (chronoData.events || []).find(function(e) { return e.id === target.eventId; });
        if (!evt) return null;
        return getEventSeries(chronoData, evt).find(function(s) {
            return s !== target && findInSerieByName(s, name);
        }) || null;
    }

    // Séries de la journée groupées par épreuve (générées par « Séries natation » ET
    // ajoutées via ➕ Série), puis les séries sans épreuve : [{ event, series }]
    function getDaySeriesByEvent(chronoData) {
        var events = chronoData.events || [];
        var groups = events.map(function(evt) {
            return { event: evt, series: getEventSeries(chronoData, evt) };
        }).filter(function(g) { return g.series.length > 0; });
        var orphans = (chronoData.series || []).filter(function(s) {
            return !s.eventId || !events.some(function(e) { return e.id === s.eventId; });
        });
        if (orphans.length > 0) groups.push({ event: null, series: orphans });
        return groups;
    }

    // Place un participant du jour dans une série. S'il est dans une autre série de la
    // même épreuve, il en est retiré (déplacement) sauf s'il y a déjà nagé. Dossard :
    // le sien s'il est libre dans la série, sinon le plus grand + 1 (addChronoParticipant).
    // Retourne 'added' | 'moved' | 'present' | 'swum' (ou null en cas d'échec).
    function placeParticipantInSerie(dayNumber, chronoData, participant, serie, categoryOverride) {
        if (findInSerieByName(serie, participant.name)) return 'present';
        var other = findOtherSerieOfEvent(chronoData, serie, participant.name);
        var prev = other ? findInSerieByName(other, participant.name) : null;
        if (prev && hasSwumInSerie(other, prev)) return 'swum';

        var wantedBib = prev ? prev.bib : participant.bib;
        var bibFree = wantedBib != null && wantedBib !== '' && !serie.participants.some(function(p) {
            return String(p.bib) === String(wantedBib);
        });
        var added = addChronoParticipant(dayNumber, serie.id, participant.name, bibFree ? wantedBib : null, {
            club: participant.club || (prev && prev.club) || '',
            category: categoryOverride || participant.category || (prev && prev.category) || ''
        });
        if (!added) return null;
        if (other) {
            other.participants = other.participants.filter(function(p) { return p !== prev; });
            return 'moved';
        }
        return 'added';
    }

    // Liste des séries (groupées par épreuve) des fenêtres « + » et « ➕ Ajouter à une
    // série ». names : noms à ajouter ; onclickFor(serie) : action au clic.
    function renderSeriePickerHTML(chronoData, names, onclickFor) {
        var html = '';
        getDaySeriesByEvent(chronoData).forEach(function(group) {
            html += '<div style="font-size: 12px; font-weight: 700; color: #475569; margin: 12px 0 6px;">' +
                (group.event ? '🎯 ' + group.event.name : '🏃 Séries indépendantes') + '</div>';
            group.series.forEach(function(serie) {
                var missing = names.filter(function(n) { return !findInSerieByName(serie, n); });
                var elsewhere = [];
                missing.forEach(function(n) {
                    var o = findOtherSerieOfEvent(chronoData, serie, n);
                    if (o && elsewhere.indexOf(o.name) === -1) elsewhere.push(o.name);
                });

                var info = serie.participants.length + ' participant(s)';
                if (serie.status === 'completed') info += ' · ✅ terminée';
                if (serie.laneMode && missing.length > 0) {
                    var lane = nextFreeLane(serie);
                    info += lane ? ' · → couloir ' + lane : ' · couloirs pleins';
                }
                var body = '<strong style="font-size: 14px;">🏃 ' + serie.name + '</strong>' +
                    '<span style="color: #586566; font-size: 12px; margin-left: 10px;">' + info + '</span>';

                if (missing.length === 0) {
                    html += '<div data-serie-id="' + serie.id + '" style="padding: 12px; margin-bottom: 8px; background: #e8f5e9; border-radius: 8px; border: 1px dashed #017239;">' +
                        body + '<span style="color: #017239; font-size: 12px; margin-left: 10px;">✓ Déjà présent</span></div>';
                    return;
                }
                if (elsewhere.length > 0) {
                    body += '<div style="color: #a95b02; font-size: 12px; margin-top: 4px;">⚠️ ' +
                        (names.length === 1 ? 'déjà en ' + elsewhere[0] + ' : sera déplacé ici'
                            : 'certains déjà en ' + elsewhere.join(', ') + ' : seront déplacés ici') + '</div>';
                }
                html += '<div data-serie-id="' + serie.id + '" onclick="' + onclickFor(serie) + '" ' +
                    'style="padding: 12px; margin-bottom: 8px; background: #f8f9fa; border-radius: 8px; cursor: pointer; ' +
                    'border: 2px solid transparent; transition: all 0.2s;" ' +
                    'onmouseover="this.style.borderColor=\'#017239\'; this.style.background=\'#e8f5e9\';" ' +
                    'onmouseout="this.style.borderColor=\'transparent\'; this.style.background=\'#f8f9fa\';">' +
                    body + '</div>';
            });
        });
        return html;
    }

    function renderEventCard(dayNumber, event, chronoData) {
        // Séries imbriquées (génération natation) ET « à plat » (➕ Série) : avant, une série
        // ajoutée sur place à une épreuve générée n'apparaissait pas ici.
        var eventSeries = getEventSeries(chronoData, event);
        
        var html = '<div class="chrono-event-card" style="background: white; border-radius: 8px; padding: 12px; margin-bottom: 10px; box-shadow: 0 1px 4px rgba(0,0,0,0.08);">';
        html += '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">';
        html += '<div style="display: flex; align-items: center; gap: 8px;">';
        var eventOpen = eventSeries.length > 0 && eventSeries.every(function(s) { return isSerieDetailsOpen(dayNumber, s.id); });
        // Chevron hors du <h4> : le titre garde son texte exact « 🎯 nom » (repéré tel quel par le test e2e)
        html += '<span onclick="toggleEventSeriesDetails(' + dayNumber + ', ' + event.id + ')" style="display: inline-flex; align-items: center; cursor: pointer;" title="Afficher / masquer les participants de toutes les séries">' +
            '<span id="event-chevron-' + dayNumber + '-' + event.id + '" style="display: inline-block; width: 14px; color: #54637a; font-size: 11px;">' + (eventOpen ? '▼' : '▶') + '</span>' +
            '<h4 style="margin: 0; color: #2c3e50; font-size: 14px;">🎯 ' + event.name + '</h4></span>';
        if (event.fun) html += funEventBadgeHTML();
        html += '<button onclick="editEventForDay(' + dayNumber + ', ' + event.id + ')" style="padding: 2px 6px; font-size: 11px; background: #ecf0f1; border: none; border-radius: 4px; cursor: pointer;" title="Modifier l\'épreuve" aria-label="Modifier l\'épreuve">✏️</button>';
        html += '<button onclick="deleteEventForDay(' + dayNumber + ', ' + event.id + ')" style="padding: 2px 6px; font-size: 11px; background: #fdecea; color: #d03427; border: none; border-radius: 4px; cursor: pointer;" title="Supprimer l\'épreuve" aria-label="Supprimer l\'épreuve">🗑️</button>';
        html += '</div>';
        html += '<div style="display: flex; align-items: center; gap: 8px;">';
        html += '<span style="color: #586566; font-size: 11px;">' + (event.date || '') + '</span>';
        html += '<button onclick="showAddSerieModalForDayAndEvent(' + dayNumber + ', ' + event.id + ')" style="display: inline-flex; align-items: center; gap: 4px; padding: 6px 10px; font-size: 12px; background: #017239; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;" title="Ajouter une série à cette épreuve">➕ Série</button>';
        html += '</div>';
        html += '</div>';
        
        if (eventSeries.length === 0) {
            html += '<p style="color: #566566; font-size: 13px;">Aucune série — ➕ Série pour en ajouter une</p>';
        } else {
            html += '<div class="event-series" style="display: grid; gap: 10px;">';
            eventSeries.forEach(function(serie) {
                html += renderSerieCard(dayNumber, serie, true);
            });
            html += '</div>';
        }
        
        html += '</div>';
        
        return html;
    }

    // Avancement d'une série : un participant est « réglé » s'il a un temps (arrivé ou
    // ligne de résultats) ou s'il est DNS / DISQ. Avant, seuls les résultats comptaient :
    // une série avec un DNS restait « 4/5 » et n'était jamais terminée.
    function serieProgress(serie) {
        var participants = serie.participants || [];
        var resultNames = {};
        (serie.results || []).forEach(function(r) { if (r && r.name) resultNames[r.name.toLowerCase()] = true; });
        var dns = 0, disq = 0, settled = 0;
        participants.forEach(function(p) {
            if (p.status === 'dns') dns++;
            else if (p.status === 'disq') disq++;
            if (p.status === 'dns' || p.status === 'disq' || p.status === 'finished'
                || (p.name && resultNames[p.name.toLowerCase()])) settled++;
        });
        return {
            total: participants.length, settled: settled, dns: dns, disq: disq,
            complete: participants.length > 0 && settled === participants.length
        };
    }

    // attachEvents (séries indépendantes seulement) : épreuves proposées dans
    // « 📎 Rattacher à une épreuve »
    function renderSerieCard(dayNumber, serie, compact, attachEvents) {
        var progress = serieProgress(serie);
        var completedCount = progress.settled;
        var totalCount = progress.total;
        var hasResults = (serie.results || []).length > 0 || progress.dns + progress.disq > 0;
        var complete = progress.complete || serie.status === 'completed';
        var outOfRace = [];
        if (progress.dns) outOfRace.push(progress.dns + ' DNS');
        if (progress.disq) outOfRace.push(progress.disq + ' DISQ');

        var html = '<div class="chrono-serie-card" style="background: #f8f9fa; border-radius: 8px; padding: ' + (compact ? '8px 10px' : '10px 12px') + '; border-left: 4px solid ' + (complete ? '#017239' : '#09679e') + '; margin-bottom: 8px;">';
        var open = isSerieDetailsOpen(dayNumber, serie.id);
        html += '<div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">';
        // Accordéon : un clic sur le nom de la série affiche / masque ses participants
        html += '<div onclick="toggleSerieDetails(' + dayNumber + ', ' + serie.id + ')" style="cursor: pointer; flex: 1; min-width: 160px;" title="Afficher / masquer les participants">';
        html += '<span id="serie-chevron-' + dayNumber + '-' + serie.id + '" style="display: inline-block; width: 14px; color: #54637a; font-size: 11px;">' + (open ? '▼' : '▶') + '</span>';
        html += '<strong style="color: #2c3e50; font-size: 13px;">🏃 ' + serie.name + '</strong>';
        html += '<span style="color: #586566; font-size: 11px; margin-left: 8px;">' + (complete ? '✅ ' : '') + completedCount + '/' + totalCount + ' résultats' +
            (outOfRace.length ? ' (dont ' + outOfRace.join(', ') + ')' : '') + '</span>';
        html += '</div>';
        html += '<div style="display: flex; gap: 4px;">';
        html += '<button onclick="manageSerieParticipants(' + dayNumber + ', ' + serie.id + ')" style="display: inline-flex; align-items: center; gap: 3px; padding: 5px 8px; font-size: 11px; background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; border-radius: 5px; cursor: pointer;" title="Gérer les participants" aria-label="Gérer les participants">👥</button>';
        html += '<button onclick="assignSerieLanes(' + dayNumber + ', ' + serie.id + ')" style="display: inline-flex; align-items: center; gap: 3px; padding: 5px 8px; font-size: 11px; background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; border-radius: 5px; cursor: pointer;" title="Affecter les nageurs aux couloirs" aria-label="Affecter les nageurs aux couloirs">🏊</button>';
        // Bouton Démarrer la course (si des participants existent)
        if (totalCount > 0) {
            html += '<button onclick="startChronoRaceForDay(' + dayNumber + ', ' + serie.id + ')" style="display: inline-flex; align-items: center; gap: 3px; padding: 5px 8px; font-size: 11px; background: #d03427; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;" title="Démarrer la course avec chronométrage">▶️ Course</button>';
        }
        html += '<button onclick="enterSerieResults(' + dayNumber + ', ' + serie.id + ')" style="display: inline-flex; align-items: center; gap: 3px; padding: 5px 8px; font-size: 11px; background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; border-radius: 5px; cursor: pointer;" title="Saisie manuelle des résultats" aria-label="Saisie manuelle des résultats">⏱️</button>';
        html += '<button onclick="showSerieRanking(' + dayNumber + ', ' + serie.id + ')" style="display: inline-flex; align-items: center; gap: 3px; padding: 5px 8px; font-size: 11px; background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; border-radius: 5px; cursor: pointer;" title="Classement de la série" aria-label="Classement de la série">🏆</button>';
        html += '<button onclick="deleteSerieForDay(' + dayNumber + ', ' + serie.id + ')" style="display: inline-flex; align-items: center; gap: 3px; padding: 5px 8px; font-size: 11px; background: #fdecea; color: #d03427; border: none; border-radius: 5px; cursor: pointer;" title="Supprimer la série" aria-label="Supprimer la série">🗑️</button>';
        html += '</div>';
        html += '</div>';
        if (attachEvents && attachEvents.length > 0) {
            html += '<div style="margin-top: 6px; font-size: 11px; color: #586566;">Sans épreuve : ni imprimée ni classée par épreuve. ';
            html += '<select id="attachSerie-' + dayNumber + '-' + serie.id + '" onchange="if (this.value) attachSerieToEvent(' + dayNumber + ', ' + serie.id + ', parseInt(this.value))" style="padding: 3px 6px; font-size: 11px; border: 1px solid #cbd5e1; border-radius: 4px;">';
            html += '<option value="">📎 Rattacher à une épreuve…</option>';
            attachEvents.forEach(function(evt) {
                html += '<option value="' + evt.id + '">' + evt.name + '</option>';
            });
            html += '</select></div>';
        }
        html += '<div id="serie-details-' + dayNumber + '-' + serie.id + '" class="chrono-serie-details" style="display: ' + (open ? 'block' : 'none') + '; margin-top: 8px;">' +
            renderSerieDetailsHTML(serie) + '</div>';
        html += '</div>';
        
        return html;
    }

    // ============================================
    // ACCORDÉON DES SÉRIES (vue détaillée, lecture seule)
    // ============================================
    // État ouvert/fermé gardé en mémoire (clé « jour-série ») pour survivre aux
    // re-rendus de refreshChronoDisplay ; les détails sont toujours dans le DOM,
    // masqués : ouvrir/fermer ne fait que changer un display, sans tout redessiner.
    var openSerieDetails = {};

    function isSerieDetailsOpen(dayNumber, serieId) {
        return !!openSerieDetails[dayNumber + '-' + serieId];
    }

    // Participants de la série dans l'ordre du bassin (couloir), sinon du dossard,
    // avec leur résultat : rang et temps, DNS / DISQ, ou « — » pas encore nagé.
    function renderSerieDetailsHTML(serie) {
        var participants = (serie.participants || []).slice();
        if (participants.length === 0) {
            return '<p style="margin: 0; padding: 6px 4px; color: #566566; font-size: 12px;">Aucun participant</p>';
        }
        var esc = escapeLaneHtml;
        var ranked = rankSerieResults(serie).entries;
        var resultByName = {};
        ranked.forEach(function(e) { resultByName[e.name.toLowerCase()] = e; });
        var hasLanes = participants.some(function(p) { return p.laneNumber; });
        var hasClub = participants.some(function(p) { return p.club; });
        var hasCategory = participants.some(function(p) { return p.category; });
        participants.sort(function(a, b) {
            if (hasLanes) return (a.laneNumber || 99) - (b.laneNumber || 99);
            return (a.bib || 0) - (b.bib || 0);
        });

        var td = 'padding: 4px 8px; border-bottom: 1px solid #eef2f7;';
        var html = '<table style="width: 100%; border-collapse: collapse; font-size: 12px; background: white; border-radius: 6px;">';
        html += '<thead><tr style="color: #54637a; text-align: left;">' +
            (hasLanes ? '<th style="' + td + '">Couloir</th>' : '') +
            '<th style="' + td + '">Dossard</th><th style="' + td + '">Nom</th>' +
            (hasClub ? '<th style="' + td + '">Club</th>' : '') +
            (hasCategory ? '<th style="' + td + '">Catégorie</th>' : '') +
            '<th style="' + td + ' text-align: center;">Rang</th><th style="' + td + '">Temps</th></tr></thead><tbody>';
        participants.forEach(function(p) {
            var r = resultByName[(p.name || '').toLowerCase()];
            var rank = '', time = '<span style="color: #566566;">—</span>';
            if (p.status === 'dns' || p.status === 'disq') {
                time = '<span style="color: #d03427; font-weight: bold;">' + (p.status === 'dns' ? 'DNS' : 'DISQ') + '</span>';
            } else if (r) {
                rank = r.rank;
                time = '<span style="font-family: monospace;">' + formatDurationHMS(r.time) + '</span>';
            } else if (p.status === 'running') {
                time = '<span style="color: #9c5003;">en course</span>';
            }
            html += '<tr>' +
                (hasLanes ? '<td style="' + td + '">' + (p.laneNumber || '') + '</td>' : '') +
                '<td style="' + td + ' color: #9c5003; font-weight: bold;">' + (p.bib != null ? '#' + p.bib : '') + '</td>' +
                '<td style="' + td + '">' + esc(p.name) + '</td>' +
                (hasClub ? '<td style="' + td + '">' + esc(p.club || '') + '</td>' : '') +
                (hasCategory ? '<td style="' + td + '">' + esc(p.category || '') + '</td>' : '') +
                '<td style="' + td + ' text-align: center; font-weight: bold;">' + rank + '</td>' +
                '<td style="' + td + '">' + time + '</td></tr>';
        });
        return html + '</tbody></table>';
    }

    // Applique l'état ouvert/fermé d'une série au DOM, sans re-rendu
    function setSerieDetailsOpen(dayNumber, serieId, open) {
        var key = dayNumber + '-' + serieId;
        if (open) openSerieDetails[key] = true; else delete openSerieDetails[key];
        var details = document.getElementById('serie-details-' + key);
        if (details) details.style.display = open ? 'block' : 'none';
        var chevron = document.getElementById('serie-chevron-' + key);
        if (chevron) chevron.textContent = open ? '▼' : '▶';
    }

    // Séries de chaque épreuve (et séries indépendantes) d'une journée
    function getDaySerieGroups(chronoData) {
        var groups = (chronoData.events || []).map(function(evt) {
            return { eventId: evt.id, series: getEventSeries(chronoData, evt) };
        });
        groups.push({ eventId: null, series: (chronoData.series || []).filter(function(s) { return !s.eventId; }) });
        return groups;
    }

    // Libellés : chevron de chaque épreuve, bouton « tout » de la journée
    function updateAccordionControls(dayNumber) {
        var chronoData = getChronoDataForDay(dayNumber);
        if (!chronoData) return;
        var allOpen = true, any = false;
        getDaySerieGroups(chronoData).forEach(function(g) {
            var groupOpen = g.series.length > 0 && g.series.every(function(s) { return isSerieDetailsOpen(dayNumber, s.id); });
            if (g.series.length) { any = true; if (!groupOpen) allOpen = false; }
            if (g.eventId != null) {
                var chevron = document.getElementById('event-chevron-' + dayNumber + '-' + g.eventId);
                if (chevron) chevron.textContent = groupOpen ? '▼' : '▶';
            }
        });
        var btn = document.getElementById('toggle-all-series-' + dayNumber);
        if (btn) btn.textContent = any && allOpen ? '📁 Tout replier' : '📂 Tout déplier';
    }

    function toggleSerieDetails(dayNumber, serieId) {
        setSerieDetailsOpen(dayNumber, serieId, !isSerieDetailsOpen(dayNumber, serieId));
        updateAccordionControls(dayNumber);
    }

    // Clic sur une épreuve : ouvre toutes ses séries, ou les ferme si elles l'étaient toutes
    function toggleEventSeriesDetails(dayNumber, eventId) {
        var chronoData = getChronoDataForDay(dayNumber);
        if (!chronoData) return;
        var evt = (chronoData.events || []).find(function(e) { return e.id === eventId; });
        if (!evt) return;
        var series = getEventSeries(chronoData, evt);
        var open = !series.every(function(s) { return isSerieDetailsOpen(dayNumber, s.id); });
        series.forEach(function(s) { setSerieDetailsOpen(dayNumber, s.id, open); });
        updateAccordionControls(dayNumber);
    }

    // Bouton de la barre d'actions : tout ouvrir, ou tout fermer si tout est ouvert
    function toggleAllSeriesDetails(dayNumber) {
        var chronoData = getChronoDataForDay(dayNumber);
        if (!chronoData) return;
        var all = [];
        getDaySerieGroups(chronoData).forEach(function(g) { all = all.concat(g.series); });
        var open = !all.every(function(s) { return isSerieDetailsOpen(dayNumber, s.id); });
        all.forEach(function(s) { setSerieDetailsOpen(dayNumber, s.id, open); });
        updateAccordionControls(dayNumber);
    }
    // Journée supprimée : l'état ouvert/fermé de ses séries disparaît et celui des
    // journées suivantes suit leur nouveau numéro (J5 → J4…)
    function shiftSerieDetailsAfterDayRemoval(removedDay) {
        var next = {};
        Object.keys(openSerieDetails).forEach(function(key) {
            var parts = key.split('-');
            var day = Number(parts[0]);
            if (day === removedDay) return;
            next[(day > removedDay ? day - 1 : day) + '-' + parts.slice(1).join('-')] = true;
        });
        openSerieDetails = next;
        var rankings = {};
        Object.keys(openChronoDayRankings).forEach(function(key) {
            var day = Number(key);
            if (day !== removedDay) rankings[day > removedDay ? day - 1 : day] = true;
        });
        openChronoDayRankings = rankings;
    }
    global.shiftSerieDetailsAfterDayRemoval = shiftSerieDetailsAfterDayRemoval;
    global.toggleSerieDetails = toggleSerieDetails;
    global.toggleEventSeriesDetails = toggleEventSeriesDetails;
    global.toggleAllSeriesDetails = toggleAllSeriesDetails;

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

    // ============================================
    // BARÈME MULTISPORT (points par position de journée)
    // ============================================
    // Utilisé UNIQUEMENT en mode multisport (au moins une journée Matchs ET une
    // journée Courses). Chaque journée classe les joueurs — par division pour les
    // Matchs, par classement de course pour le Chrono — et la POSITION donne les
    // points. Ne modifie NI le mode Championnat pur (3 pts/victoire) NI le mode
    // Chrono pur (barème CHRONO_POINTS 20/17…), qui gardent leur calcul d'origine.
    var MULTISPORT_POINTS = [25, 19, 17, 15, 12, 10, 8, 6, 4, 2]; // barème par défaut : 1er→25, 2e→19… ; 0 au-delà

    // Réglages du classement multisport, enregistrés avec la compétition
    // (championship.config.multisport) : barème et nombre de meilleures journées retenues.
    function getMultisportSettings() {
        var c = (global.championship && global.championship.config && global.championship.config.multisport) || {};
        var bareme = Array.isArray(c.bareme) && c.bareme.length && c.bareme.every(function(n) { return typeof n === 'number' && n >= 0; })
            ? c.bareme : MULTISPORT_POINTS;
        var bestDays = parseInt(c.bestDays, 10);
        return { bareme: bareme, bestDays: bestDays > 0 ? bestDays : 0 };
    }

    function saveMultisportSettings(changes) {
        var champ = global.championship;
        champ.config = champ.config || {};
        champ.config.multisport = Object.assign({}, champ.config.multisport, changes);
        if (typeof global.saveToLocalStorage === 'function') global.saveToLocalStorage();
        if (typeof global.updateMultisportRanking === 'function') global.updateMultisportRanking();
    }

    // Champ « 25, 19, 17… » : nombres séparés par virgules, espaces ou points-virgules
    function setMultisportBareme(text) {
        var values = String(text || '').split(/[\s,;]+/).filter(Boolean).map(Number);
        if (!values.length || values.some(function(n) { return !isFinite(n) || n < 0; })) {
            if (typeof global.showNotification === 'function') global.showNotification('Barème invalide : saisissez des nombres positifs séparés par des virgules', 'error');
            return false;
        }
        saveMultisportSettings({ bareme: values });
        return true;
    }

    function resetMultisportBareme() {
        saveMultisportSettings({ bareme: null });
    }

    function setMultisportBestDays(value) {
        saveMultisportSettings({ bestDays: parseInt(value, 10) || 0 });
    }

    function multisportBaremeText() {
        return getMultisportSettings().bareme.join(' / ');
    }

    function calculateMultisportPositionPoints(position) {
        var bareme = getMultisportSettings().bareme;
        if (position < 1) return 0;
        if (position <= bareme.length) return bareme[position - 1];
        return 0; // au-delà du barème : 0 point
    }

    // Classement d'une journée MATCHS pour une division : liste ordonnée des
    // joueurs AYANT JOUÉ (même tri que le classement de journée affiché :
    // points, victoires, goal-average, points pour, nom ; en mode poules
    // l'étape finale prime). L'index dans la liste = la position (0 = 1er).
    function getMatchsDayDivisionOrder(dayNumber, division) {
        var dayData = global.championship.days[dayNumber];
        if (!dayData || !dayData.players || !dayData.players[division]) return [];
        var isPoolMode = !!(dayData.pools && dayData.pools.enabled);
        var rows = [];
        dayData.players[division].forEach(function(p) {
            var name = getPlayerName(p);
            if (!name || name.toUpperCase() === 'BYE') return;
            var stats = (typeof global.calculatePlayerStats === 'function')
                ? global.calculatePlayerStats(dayNumber, division, name) : null;
            // Seuls les joueurs ayant réellement joué un match marquent des points.
            if (!stats || !(stats.matchesPlayed > 0)) return;
            var stage = (isPoolMode && typeof global.getPlayerFinalStageForDay === 'function')
                ? global.getPlayerFinalStageForDay(name, dayNumber, division) : null;
            rows.push({
                name: name,
                club: getPlayerClub(p),
                totalPoints: stats.totalPoints,
                wins: stats.wins,
                matchesPlayed: stats.matchesPlayed,
                goalAverage: stats.pointsWon - stats.pointsLost,
                gamePointsWon: stats.gamePointsWon || 0,
                gamePointsLost: stats.gamePointsLost || 0,
                pointsWon: stats.pointsWon,
                stageWeight: stage ? stage.stageWeight : 0
            });
        });
        rows.sort(function(a, b) {
            if (isPoolMode && b.stageWeight !== a.stageWeight) return b.stageWeight - a.stageWeight;
            if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
            if (b.wins !== a.wins) return b.wins - a.wins;
            if (b.goalAverage !== a.goalAverage) return b.goalAverage - a.goalAverage;
            // Même départage que le classement de journée (mode sets : points de jeu)
            if (global.gamePointsDiff(b) !== global.gamePointsDiff(a)) return global.gamePointsDiff(b) - global.gamePointsDiff(a);
            if (b.pointsWon !== a.pointsWon) return b.pointsWon - a.pointsWon;
            return a.name.localeCompare(b.name);
        });
        return rows;
    }

    // Classement d'une journée CHRONO : ordre des joueurs sur l'ensemble des
    // séries du jour (distance décroissante puis temps croissant, cohérent avec
    // getSerieRanking et le classement des courses). L'index = la position.
    function getChronoDayOrder(dayNumber) {
        var results = getChronoResultsForDay(dayNumber); // { name: {player,series,totalDistance,totalTime,…} }
        return Object.keys(results).map(function(name) { return results[name]; })
            .sort(function(a, b) {
                if ((b.totalDistance || 0) !== (a.totalDistance || 0)) return (b.totalDistance || 0) - (a.totalDistance || 0);
                return (a.totalTime || 0) - (b.totalTime || 0);
            });
    }

    // Classement d'une journée COURSES en mode multisport. Chaque épreuve est classée
    // séparément (toutes ses séries regroupées, au temps) et chaque place rapporte les
    // points du barème ; la somme de ces points classe la journée. Ainsi un 50 m et un
    // 100 m ne sont jamais comparés entre eux. Séries sans épreuve : regroupées par
    // distance. Épreuves « fun » : sans points. Ex æquo = même rang.
    // → [{ name, club, eventPoints, rank }] trié par rang
    // Épreuves d'une journée Courses : chaque épreuve (séries regroupées) ; séries sans
    // épreuve regroupées par distance. Épreuves « fun » exclues (sans points).
    // → [{ name, series }]
    function getChronoDayEventGroups(dayNumber, includeFun) {
        var cd = getChronoDataForDay(dayNumber);
        if (!cd) return [];
        var groups = [];
        var used = [];
        (cd.events || []).forEach(function(evt) {
            var series = getEventSeries(cd, evt);
            series.forEach(function(serie) { used.push(serie); });
            if (!evt.fun || includeFun) groups.push({ name: evt.name, series: series, fun: !!evt.fun });
        });
        var byDistance = {}, order = [];
        (cd.series || []).forEach(function(serie) {
            if (!serie || used.indexOf(serie) !== -1) return;
            var key = String(serie.distance || 0);
            if (!byDistance[key]) { byDistance[key] = []; order.push(key); }
            byDistance[key].push(serie);
        });
        order.forEach(function(key) {
            var series = byDistance[key];
            var name = series.length === 1 && series[0].name ? series[0].name : formatDistance(Number(key));
            groups.push({ name: name, series: series });
        });
        return groups;
    }

    // Classement d'une épreuve : une ligne par participant (sa meilleure performance),
    // distance décroissante puis temps, ex æquo au centième = même rang.
    function rankEventGroup(series) {
        var best = {};
        series.forEach(function(serie) {
            rankSerieResults(serie).entries.forEach(function(e) {
                var key = e.name.toLowerCase();
                var cur = best[key];
                if (!cur || e.distance > cur.distance || (e.distance === cur.distance && e.time < cur.time)) {
                    best[key] = Object.assign({}, e, { serieName: serie.name });
                }
            });
        });
        var entries = Object.keys(best).map(function(k) { return best[k]; });
        entries.sort(function(a, b) {
            if (b.distance !== a.distance) return b.distance - a.distance;
            return a.time - b.time;
        });
        var prev = null;
        entries.forEach(function(e, i) {
            e.rank = (prev && prev.distance === e.distance && Math.round(prev.time / 10) === Math.round(e.time / 10)) ? prev.rank : i + 1;
            prev = e;
        });
        return entries;
    }

    // Classement d'une journée COURSES en mode multisport. Chaque épreuve est classée
    // séparément et chaque place rapporte les points du barème ; la somme de ces points
    // classe la journée. Ainsi un 50 m et un 100 m ne sont jamais comparés entre eux.
    // → [{ name, club, eventPoints, rank }] trié par rang
    function getChronoDayMultisportOrder(dayNumber) {
        var players = {};
        getChronoDayEventGroups(dayNumber).forEach(function(group) {
            rankEventGroup(group.series).forEach(function(e) {
                var key = e.name.toLowerCase();
                if (!players[key]) players[key] = { name: e.name, club: e.club || '', eventPoints: 0 };
                players[key].eventPoints += calculateMultisportPositionPoints(e.rank);
            });
        });

        var order = Object.keys(players).map(function(k) { return players[k]; });
        order.sort(function(a, b) {
            if (b.eventPoints !== a.eventPoints) return b.eventPoints - a.eventPoints;
            return a.name.localeCompare(b.name);
        });
        order.forEach(function(row, i) {
            row.rank = (i > 0 && order[i - 1].eventPoints === row.eventPoints) ? order[i - 1].rank : i + 1;
        });
        return order;
    }

    // Courses (hors natation) : épreuves de toutes les journées, au même format que
    // calculateEventRankings, pour le classement des clubs (un club marque une fois
    // par course, avec son meilleur classé).
    function calculateRaceClubEvents() {
        var out = [];
        Object.keys(global.championship.days).map(Number).sort(function(a, b) { return a - b; }).forEach(function(day) {
            if (getDayType(day) !== DAY_TYPES.CHRONO) return;
            getChronoDayEventGroups(day).forEach(function(group) {
                var entries = rankEventGroup(group.series);
                if (!entries.length) return;
                assignEventClubPoints(entries);
                out.push({ dayNumber: day, eventName: group.name, fun: false, entries: entries, outOfRace: [] });
            });
        });
        return out;
    }

    // Classement d'UNE série, seule source pour la fenêtre 🏆 de la série et les points
    // par série du classement général (Chrono pur). Mêmes règles que le classement par
    // épreuve : DNS/DISQ jamais classés même si une ancienne ligne de résultat existe,
    // une ligne par nageur (nom sans casse), distance décroissante (relais à durée
    // fixe) puis temps, ex æquo au centième = même rang (1, 2, 2, 4).
    // → { entries: [{rank, name, club, category, time, distance}], outOfRace: [{name, club, status}] }
    function rankSerieResults(serie) {
        var partByName = {};
        var outOfRace = [];
        (serie.participants || []).forEach(function(p) {
            if (!p || !p.name) return;
            partByName[p.name.toLowerCase()] = p;
            if (p.status === 'dns' || p.status === 'disq') {
                outOfRace.push({ name: p.name, club: p.club || '', status: p.status });
            }
        });
        var seen = {};
        var entries = [];
        (serie.results || []).forEach(function(r) {
            if (!r || !r.name || !(r.time > 0)) return;
            var key = r.name.toLowerCase();
            if (seen[key]) return;
            var p = partByName[key] || {};
            if (p.status === 'dns' || p.status === 'disq') return;
            seen[key] = true;
            entries.push({
                name: r.name,
                club: p.club || r.club || '',
                category: r.category || p.category || '',
                time: r.time,
                distance: (p.totalDistance > 0 ? p.totalDistance : (r.totalDistance || serie.distance || 0))
            });
        });
        entries.sort(function(a, b) {
            if (b.distance !== a.distance) return b.distance - a.distance;
            return a.time - b.time;
        });
        var prev = null;
        entries.forEach(function(e, i) {
            var cs = Math.round(e.time / 10);
            e.rank = (prev && prev.distance === e.distance && Math.round(prev.time / 10) === cs) ? prev.rank : i + 1;
            prev = e;
        });
        return { entries: entries, outOfRace: outOfRace };
    }
    global.rankSerieResults = rankSerieResults;

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
                    club: '',
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

            // Positions (et donc points) : même classement que la fenêtre 🏆 de la
            // série (DNS/DISQ exclus, relais à la distance, ex æquo au centième).
            var sorted = rankSerieResults(serie).entries;
            var posByName = {};
            sorted.forEach(function(r) { posByName[r.name] = r.rank; });

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
                if (!entry.club) entry.club = p.club || result.club || '';

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
        // Mode multisport = au moins une journée Matchs ET une journée Courses.
        // Dans ce cas, les points viennent du BARÈME de position (réglable),
        // par division pour les Matchs et par épreuve pour les Courses.
        var multisport = isMultisportMode();
        var numDivisions = (global.config && global.config.numberOfDivisions) ? global.config.numberOfDivisions : 3;

        function ensureStats(playerName, club) {
            if (!allStats[playerName]) allStats[playerName] = createEmptyPlayerStats(playerName, club || '');
            if (club && !allStats[playerName].club) allStats[playerName].club = club;
            return allStats[playerName];
        }

        function addCategory(entry, category) {
            category = String(category || '').trim();
            if (category && entry.categories.indexOf(category) === -1) entry.categories.push(category);
        }

        // Points d'une journée (une ligne par journée, divisions cumulées)
        function addDayPoints(entry, day, type, points, position) {
            var d = entry.days.find(function(x) { return x.day === day; });
            if (!d) { d = { day: day, type: type, points: 0, position: position }; entry.days.push(d); }
            d.points += points;
        }

        // Parcourir toutes les journées
        Object.keys(global.championship.days).sort(function(a, b) { return a - b; }).forEach(function(dayNumber) {
            var dayData = global.championship.days[dayNumber];
            if (!dayData) return;

            var dayNum = parseInt(dayNumber);
            var dayType = getDayType(dayNumber);

            if (dayType === DAY_TYPES.CHAMPIONSHIP) {
                if (!dayData.players) return;

                for (var division = 1; division <= numDivisions; division++) {
                    if (multisport) {
                        // BARÈME MULTISPORT : position dans la division → points
                        var order = getMatchsDayDivisionOrder(dayNum, division);
                        order.forEach(function(row, index) {
                            var entry = ensureStats(row.name, row.club);
                            var points = calculateMultisportPositionPoints(index + 1);
                            entry.championshipPoints += points;
                            entry.championshipMatches += row.matchesPlayed;
                            entry.championshipWins += row.wins;
                            addDayPoints(entry, dayNum, 'matchs', points, index + 1);
                        });
                        (dayData.players[division] || []).forEach(function(p) {
                            if (p && typeof p === 'object' && p.name && allStats[p.name]) addCategory(allStats[p.name], p.category);
                        });
                    } else {
                        // MODE CHAMPIONNAT PUR : comportement d'origine (3 pts/victoire)
                        (dayData.players[division] || []).forEach(function(player) {
                            var playerName = getPlayerName(player);
                            if (!playerName || playerName.toUpperCase() === 'BYE') return;
                            var entry = ensureStats(playerName, getPlayerClub(player));
                            var stats = (typeof global.calculatePlayerStats === 'function')
                                ? global.calculatePlayerStats(dayNum, division, playerName) : null;
                            if (stats) {
                                entry.championshipPoints += stats.totalPoints;
                                entry.championshipMatches += stats.matchesPlayed;
                                entry.championshipWins += stats.wins;
                            }
                        });
                    }
                }
            } else if (dayType === DAY_TYPES.CHRONO) {
                var chronoResults = getChronoResultsForDay(dayNum);
                Object.keys(chronoResults).forEach(function(playerName) {
                    var res = chronoResults[playerName];
                    var entry = ensureStats(playerName, res.club);
                    if (!multisport) entry.chronoPoints += res.totalPoints; // MODE CHRONO PUR : barème CHRONO_POINTS
                    entry.chronoSeries += res.series.length;
                    entry.chronoDistance += res.totalDistance || 0;
                    entry.chronoTime += res.totalTime || 0;
                });
                if (multisport) {
                    // BARÈME MULTISPORT : épreuves classées une à une → position de la journée → points
                    getChronoDayMultisportOrder(dayNum).forEach(function(row) {
                        var entry = ensureStats(allStats[row.name] ? row.name : (Object.keys(allStats).find(function(k) {
                            return k.toLowerCase() === row.name.toLowerCase();
                        }) || row.name), row.club);
                        var points = calculateMultisportPositionPoints(row.rank);
                        entry.chronoPoints += points;
                        addDayPoints(entry, dayNum, 'courses', points, row.rank);
                    });
                }
                // Catégories des participants (filtre du classement)
                var cd = getChronoDataForDay(dayNum);
                if (cd) {
                    var allSeries = (cd.series || []).slice();
                    (cd.events || []).forEach(function(ev) { allSeries = allSeries.concat(ev.series || []); });
                    allSeries.forEach(function(serie) {
                        (serie && serie.participants || []).forEach(function(p) {
                            if (p && p.name && allStats[p.name]) addCategory(allStats[p.name], p.category);
                        });
                    });
                }
            }
        });

        // Total : en multisport, seules les N meilleures journées comptent si réglé
        var bestDays = multisport ? getMultisportSettings().bestDays : 0;
        Object.keys(allStats).forEach(function(player) {
            var entry = allStats[player];
            if (!multisport) {
                entry.totalPoints = entry.championshipPoints + entry.chronoPoints;
                return;
            }
            var byPoints = entry.days.slice().sort(function(a, b) { return b.points - a.points || a.day - b.day; });
            byPoints.forEach(function(d, i) { d.dropped = bestDays > 0 && i >= bestDays; });
            entry.totalPoints = entry.days.reduce(function(sum, d) { return sum + (d.dropped ? 0 : d.points); }, 0);
        });

        return allStats;
    }

    // Classement multisport trié, avec rang. À total égal, départage aux meilleures
    // places : le plus de journées au meilleur score, puis au suivant… (comme en F1).
    // Si tout est identique, même place. category : ne garder que cette catégorie.
    function getMultisportStandings(category) {
        var list = Object.values(calculateMultisportRanking());
        if (category) list = list.filter(function(s) { return s.categories.indexOf(category) !== -1; });

        var countback = function(s) {
            return s.days.filter(function(d) { return !d.dropped; }).map(function(d) { return d.points; }).sort(function(a, b) { return b - a; });
        };
        var compareCountback = function(a, b) {
            var ca = countback(a), cb = countback(b);
            for (var i = 0; i < Math.max(ca.length, cb.length); i++) {
                var diff = (cb[i] || 0) - (ca[i] || 0);
                if (diff) return diff;
            }
            return 0;
        };
        list.sort(function(a, b) {
            return (b.totalPoints - a.totalPoints) || compareCountback(a, b) || a.player.localeCompare(b.player);
        });
        list.forEach(function(s, i) {
            var prev = list[i - 1];
            s.rank = (prev && prev.totalPoints === s.totalPoints && compareCountback(prev, s) === 0) ? prev.rank : i + 1;
        });
        return list;
    }

    // Journées (numéro + type) qui apparaissent comme colonnes du classement
    function getMultisportDayColumns() {
        return Object.keys(global.championship.days).map(Number).sort(function(a, b) { return a - b; })
            .filter(function(day) { return !!global.championship.days[day]; })
            .map(function(day) { return { day: day, type: getDayType(day) === DAY_TYPES.CHRONO ? 'courses' : 'matchs' }; });
    }

    // Classement des clubs : somme des totaux de leurs membres
    function getMultisportClubStandings(standings) {
        var clubs = {};
        standings.forEach(function(s) {
            var name = String(s.club || '').trim();
            if (!name) return;
            var key = clubKey(name);
            if (!clubs[key]) clubs[key] = { club: name, members: [], perDay: {}, totalPoints: 0 };
            var c = clubs[key];
            c.members.push(s);
            c.totalPoints += s.totalPoints;
            s.days.forEach(function(d) {
                if (!d.dropped) c.perDay[d.day] = (c.perDay[d.day] || 0) + d.points;
            });
        });
        var list = Object.keys(clubs).map(function(k) { return clubs[k]; });
        list.sort(function(a, b) { return (b.totalPoints - a.totalPoints) || a.club.localeCompare(b.club); });
        list.forEach(function(c, i) {
            c.rank = (i > 0 && list[i - 1].totalPoints === c.totalPoints) ? list[i - 1].rank : i + 1;
        });
        return list;
    }

    function getMultisportCategories() {
        var all = [];
        Object.values(calculateMultisportRanking()).forEach(function(s) {
            s.categories.forEach(function(c) { if (all.indexOf(c) === -1) all.push(c); });
        });
        return all.sort(function(a, b) { return a.localeCompare(b); });
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
            totalPoints: 0,
            days: [],       // multisport : [{ day, type, points, position, dropped }]
            categories: []
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
    // Durée lisible AVEC centièmes (« 4,20s », « 1m02,35s », « 1h02m03,45s ») :
    // en natation, ce sont les centièmes qui départagent. Calcul sur les centièmes
    // totaux pour qu'un arrondi fasse bien passer la seconde/minute (59,999 s → 1m00,00s).
    function formatDurationHMS(ms) {
        var totalCs = Math.round((ms || 0) / 10);
        var cs = totalCs % 100;
        var totalSec = Math.floor(totalCs / 100);
        var h = Math.floor(totalSec / 3600);
        var m = Math.floor((totalSec % 3600) / 60);
        var s = totalSec % 60;
        var pad = function(n) { return n < 10 ? '0' + n : '' + n; };
        var secPart = ',' + pad(cs) + 's';
        if (h > 0) return h + 'h' + pad(m) + 'm' + pad(s) + secPart;
        if (m > 0) return m + 'm' + pad(s) + secPart;
        return s + secPart;
    }
    global.formatDurationHMS = formatDurationHMS;
    global.formatDistance = formatDistance;

    // ============================================
    // CLASSEMENT PAR ÉPREUVE (natation)
    // ============================================
    // En natation, on ne compare que ce qui est comparable : toutes les séries
    // d'une même épreuve (ex. les 7 séries du 50m brasse) sont regroupées et
    // classées au temps. Pas de classement général « distance & temps » (pensé
    // pour la course à pied) entre des épreuves différentes.

    function isSwimmingSerie(serie) {
        return !!serie && (serie.sportType === 'swimming' || !!serie.laneMode);
    }

    // Séries d'une épreuve : imbriquées (evt.series, génération natation) et
    // « à plat » (chronoData.series) rattachées par eventId.
    function getEventSeries(chronoData, evt) {
        return (evt.series || []).concat((chronoData.series || []).filter(function(s) {
            return s.eventId === evt.id && (evt.series || []).indexOf(s) === -1;
        }));
    }
    global.getEventSeries = getEventSeries;

    // Vrai pour une compétition uniquement composée de journées Courses dont
    // toutes les séries (avec participants) sont de la natation OU en mode couloirs
    // (séries automatiques d'athlétisme) : classement par épreuve.
    function isSwimmingOnlyCompetition() {
        if (!hasChronoDays() || hasChampionshipDays()) return false;
        var found = false, allSwim = true;
        Object.keys(global.championship.days).forEach(function(dayKey) {
            var day = global.championship.days[dayKey];
            if (!day || day.dayType !== DAY_TYPES.CHRONO || !day.chronoData) return;
            var cd = day.chronoData;
            var series = (cd.series || []).slice();
            (cd.events || []).forEach(function(evt) { series = series.concat(evt.series || []); });
            series.forEach(function(s) {
                if (!s || !(s.participants || []).length) return;
                found = true;
                if (!isSwimmingSerie(s)) allSwim = false;
            });
        });
        return found && allSwim;
    }
    global.isSwimmingOnlyCompetition = isSwimmingOnlyCompetition;

    // Titre du classement par épreuve : « natation » seulement si toutes les séries le
    // sont ; neutre dès qu'il y a de l'athlétisme (séries automatiques en couloirs)
    function eventRankingTitle() {
        var allSwimming = true;
        Object.keys(global.championship.days).forEach(function(dayKey) {
            var day = global.championship.days[dayKey];
            if (!day || day.dayType !== DAY_TYPES.CHRONO || !day.chronoData) return;
            var cd = day.chronoData;
            var series = (cd.series || []).slice();
            (cd.events || []).forEach(function(evt) { series = series.concat(evt.series || []); });
            series.forEach(function(s) {
                if (s && (s.participants || []).length && s.sportType !== 'swimming') allSwimming = false;
            });
        });
        return allSwimming ? '🏊 Résultats natation par épreuve' : '🏁 Résultats par épreuve';
    }
    global.eventRankingTitle = eventRankingTitle;

    // [{ dayNumber, eventId, eventName, entries: [{rank, name, club, category,
    //    serieName, time}], outOfRace: [{name, club, serieName, status}] }]
    // entries triées au temps ; ex æquo au centième → même rang (1, 2, 2, 4).
    // DNS/DISQ : jamais classés (même si un ancien résultat les contient encore).
    function calculateEventRankings() {
        var out = [];
        Object.keys(global.championship.days)
            .sort(function(a, b) { return Number(a) - Number(b); })
            .forEach(function(dayKey) {
                var day = global.championship.days[dayKey];
                if (!day || day.dayType !== DAY_TYPES.CHRONO || !day.chronoData) return;
                var cd = day.chronoData;
                (cd.events || []).forEach(function(evt) {
                    var entries = [], outOfRace = [];
                    getEventSeries(cd, evt).forEach(function(s) {
                        // Mêmes règles que le bouton 🏆 de la série (rankSerieResults) :
                        // DNS/DISQ exclus, une seule ligne par nageur et par série
                        var ranked = rankSerieResults(s);
                        ranked.outOfRace.forEach(function(o) {
                            outOfRace.push({ name: o.name, club: o.club, serieName: s.name, status: o.status });
                        });
                        ranked.entries.forEach(function(e) {
                            entries.push({ name: e.name, club: e.club, category: e.category, serieName: s.name, time: e.time });
                        });
                    });
                    if (entries.length === 0 && outOfRace.length === 0) return;
                    entries.sort(function(a, b) { return a.time - b.time; });
                    var prevCs = null, prevRank = 0;
                    entries.forEach(function(e, i) {
                        var cs = Math.round(e.time / 10);
                        e.rank = cs === prevCs ? prevRank : i + 1;
                        prevCs = cs;
                        prevRank = e.rank;
                    });
                    var fun = !!evt.fun;
                    if (fun) {
                        entries.forEach(function(e) { e.clubPoints = null; e.clubRank = null; });
                    } else {
                        assignEventClubPoints(entries);
                    }
                    out.push({ dayNumber: Number(dayKey), eventId: evt.id, eventName: evt.name, fun: fun, entries: entries, outOfRace: outOfRace });
                });
            });
        return out;
    }
    global.calculateEventRankings = calculateEventRankings;

    // Club normalisé (« CN Liège » = « cn  liège ») ; '' si pas de club
    function clubKey(club) {
        return String(club || '').trim().toLowerCase().replace(/\s+/g, ' ');
    }

    // Points des clubs dans une épreuve (entrées déjà classées au temps) : un club ne
    // marque qu'une fois, avec son meilleur classé, et ces meilleurs sont reclassés entre
    // clubs (1er et 2e du club A, 3e du club B → A 25, B 19). Barème Multisport
    // 25-19-17…, ex æquo au centième = même rang club. clubPoints null : sans club ou
    // club déjà compté.
    function assignEventClubPoints(entries) {
        var seen = {}, clubIndex = 0, prevCs = null, prevRank = 0;
        entries.forEach(function(e) {
            e.clubPoints = null;
            e.clubRank = null;
            var key = clubKey(e.club);
            if (!key || seen[key]) return;
            seen[key] = true;
            clubIndex++;
            var cs = Math.round(e.time / 10);
            e.clubRank = cs === prevCs ? prevRank : clubIndex;
            prevCs = cs;
            prevRank = e.clubRank;
            e.clubPoints = calculateMultisportPositionPoints(e.clubRank);
        });
    }

    // Classement des clubs toutes épreuves : points de chaque épreuve (perEvent, aligné
    // sur `events` ; null = personne du club classé dans l'épreuve) et total. Tri par
    // total, puis nombre de 1res places club (25 points), puis nom ; même rang si total
    // et 1res places sont égaux.
    function calculateClubEventRanking(events) {
        events = events || calculateEventRankings();
        var clubs = {}, order = [];
        events.forEach(function(evt, i) {
            evt.entries.forEach(function(e) {
                if (e.clubPoints == null) return;
                var key = clubKey(e.club);
                if (!clubs[key]) {
                    clubs[key] = { club: String(e.club).trim(), perEvent: events.map(function() { return null; }), total: 0, wins: 0 };
                    order.push(key);
                }
                clubs[key].perEvent[i] = e.clubPoints;
                clubs[key].total += e.clubPoints;
                if (e.clubRank === 1) clubs[key].wins++;
            });
        });
        var list = order.map(function(k) { return clubs[k]; });
        list.sort(function(a, b) {
            return (b.total - a.total) || (b.wins - a.wins) || a.club.localeCompare(b.club);
        });
        list.forEach(function(c, i) {
            var prev = list[i - 1];
            c.rank = prev && prev.total === c.total && prev.wins === c.wins ? prev.rank : i + 1;
        });
        return list;
    }
    global.calculateClubEventRanking = calculateClubEventRanking;

    function funEventBadgeHTML() {
        return '<span class="fun-event-badge" title="Épreuve fun : hors classement des clubs" style="display: inline-block; padding: 2px 8px; font-size: 11px; font-weight: 600; color: #8e44ad; background: #f4ecf7; border-radius: 10px;">🎉 Fun</span>';
    }

    // Nom de club ouvrant sa fiche (onglet seulement : la fenêtre « Afficher » et
    // l'impression n'ont pas la fonction)
    function clubNameHTML(club, interactive) {
        var label = escapeLaneHtml(club);
        if (!interactive) return label;
        return '<span onclick="showClubDetail(\'' + encodeURIComponent(club) + '\')" ' +
            'style="cursor: pointer;" ' +
            'title="Voir le détail du club">' + label + '</span>';
    }

    function buildClubRankingHTML(events, clubs, multiDay, interactive) {
        var th = 'padding: 6px; text-align: center; font-size: 11px; vertical-align: bottom;';
        var html = '<div class="club-ranking" style="margin: 0 0 26px 0; page-break-inside: avoid;">';
        html += '<h3 style="margin: 0 0 4px 0; color: #057e68;">🏆 Classement des clubs (toutes épreuves)</h3>';
        html += '<p style="margin: 0 0 8px 0; font-size: 12px; color: #586566;">Barème ' + getMultisportSettings().bareme.join('-') + ' : un club marque une fois par épreuve, avec son meilleur classé.' +
            (interactive ? ' Cliquez sur un club pour le détail.' : '') + '</p>';
        html += '<div style="overflow-x: auto;"><table style="width: 100%; border-collapse: collapse; font-size: 13px;">';
        html += '<thead><tr><th style="' + th + '">Rang</th><th style="' + th + ' text-align: left;">Club</th>';
        events.forEach(function(evt) {
            html += '<th style="' + th + '">' + escapeLaneHtml(evt.eventName) + (multiDay ? ' (J' + evt.dayNumber + ')' : '') + '</th>';
        });
        html += '<th style="' + th + '">Total</th></tr></thead><tbody>';
        clubs.forEach(function(c) {
            html += '<tr style="border-bottom: 1px solid #ecf0f1;">' +
                '<td style="padding: 6px; text-align: center; font-weight: bold;">' + c.rank + '</td>' +
                '<td style="padding: 6px; text-align: left; font-weight: bold;">' + clubNameHTML(c.club, interactive) + '</td>';
            c.perEvent.forEach(function(pts) {
                html += '<td style="padding: 6px; text-align: center;' + (pts == null ? ' color: #bdc3c7;' : '') + '">' + (pts == null ? '–' : pts) + '</td>';
            });
            html += '<td style="padding: 6px; text-align: center; font-weight: bold; color: #057e68;">' + c.total + '</td></tr>';
        });
        html += '</tbody></table></div></div>';
        return html;
    }

    // Tableaux HTML du classement par épreuve (un par épreuve), utilisés par
    // l'onglet, l'impression / export HTML et le second écran « Afficher ».
    function buildEventRankingsHTML(interactive) {
        var events = calculateEventRankings();
        if (events.length === 0) {
            return '<p style="text-align: center; padding: 40px; color: #586566;">Aucun résultat pour le moment</p>';
        }
        var multiDay = events.some(function(e) { return e.dayNumber !== events[0].dayNumber; });
        var medals = ['🥇', '🥈', '🥉'];
        var html = '';
        // Les épreuves fun n'ont pas de colonne dans le classement des clubs
        var scored = events.filter(function(e) { return !e.fun; });
        var clubs = calculateClubEventRanking(scored);
        if (clubs.length > 0) html += buildClubRankingHTML(scored, clubs, multiDay, interactive);
        events.forEach(function(evt) {
            var withPoints = !evt.fun;
            html += '<div class="event-ranking" style="margin: 0 0 22px 0; page-break-inside: avoid;">';
            html += '<h3 style="margin: 0 0 8px 0; color: #057e68;">🏊 ' + escapeLaneHtml(evt.eventName) +
                (multiDay ? ' — Journée ' + evt.dayNumber : '') +
                ' <span style="font-size: 12px; color: #586566; font-weight: normal;">(' + evt.entries.length + ' classé' + (evt.entries.length > 1 ? 's' : '') + ')</span>' +
                (evt.fun ? ' ' + funEventBadgeHTML() : '') + '</h3>';
            if (evt.fun) {
                html += '<p class="fun-event-note" style="margin: 0 0 8px 0; font-size: 12px; color: #586566;">🎉 Épreuve fun — hors classement des clubs</p>';
            }
            html += '<table style="width: 100%; border-collapse: collapse;">';
            html += '<thead><tr><th style="padding: 8px; text-align: center;">Rang</th><th style="padding: 8px; text-align: left;">Nageur</th>' +
                '<th style="padding: 8px; text-align: center;">Club</th><th style="padding: 8px; text-align: center;">Série</th>' +
                '<th style="padding: 8px; text-align: center;">Temps</th>' +
                (withPoints ? '<th style="padding: 8px; text-align: center;">Points</th>' : '') + '</tr></thead><tbody>';
            evt.entries.forEach(function(e) {
                var pointsCell = !withPoints ? '' : e.clubPoints != null
                    ? '<td style="padding: 8px; text-align: center; font-weight: bold; color: #057e68;">' + e.clubPoints + '</td>'
                    : '<td style="padding: 8px; text-align: center; color: #bdc3c7;" title="' + (e.club ? 'Déjà compté pour ce club' : 'Sans club') + '">–</td>';
                html += '<tr style="border-bottom: 1px solid #ecf0f1;">' +
                    '<td style="padding: 8px; text-align: center; font-weight: bold;">' + (e.rank <= 3 ? medals[e.rank - 1] + ' ' : '') + e.rank + '</td>' +
                    '<td style="padding: 8px; font-weight: bold;">' + escapeLaneHtml(e.name) + '</td>' +
                    '<td style="padding: 8px; text-align: center;">' + (e.club ? escapeLaneHtml(e.club) : '-') + '</td>' +
                    '<td style="padding: 8px; text-align: center;">' + escapeLaneHtml(e.serieName) + '</td>' +
                    '<td style="padding: 8px; text-align: center; font-family: monospace;">' + formatDurationHMS(e.time) + '</td>' + pointsCell + '</tr>';
            });
            evt.outOfRace.forEach(function(o) {
                html += '<tr style="border-bottom: 1px solid #ecf0f1; color: #586566;">' +
                    '<td style="padding: 8px; text-align: center; font-weight: bold;">' + (o.status === 'disq' ? 'DISQ' : 'DNS') + '</td>' +
                    '<td style="padding: 8px;">' + escapeLaneHtml(o.name) + '</td>' +
                    '<td style="padding: 8px; text-align: center;">' + (o.club ? escapeLaneHtml(o.club) : '-') + '</td>' +
                    '<td style="padding: 8px; text-align: center;">' + escapeLaneHtml(o.serieName) + '</td>' +
                    '<td style="padding: 8px; text-align: center;">-</td>' +
                    (withPoints ? '<td style="padding: 8px; text-align: center;">–</td>' : '') + '</tr>';
            });
            html += '</tbody></table></div>';
        });
        return html;
    }
    global.buildEventRankingsHTML = buildEventRankingsHTML;

    // Onglet Multisport d'une compétition 100 % natation
    function renderEventRankingsPanel() {
        var html = '<div class="multisport-ranking">';
        html += '<h3 style="margin: 0 0 4px 0; color: #2c3e50;">🏊 Classement par épreuve</h3>';
        html += '<p style="margin: 0 0 15px 0; color: #586566; font-size: 14px;">Toutes les séries d\'une même épreuve regroupées, classées au temps</p>';
        html += '<div style="padding: 0 0 15px 0; display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">';
        html += '<button class="ranking-action-btn" onclick="showNameHarmonizationModal()">🔤 Harmoniser les noms</button>';
        html += '<button class="ranking-action-btn" onclick="normalizeAllNamesCase()">Aa Normaliser la casse</button>';
        html += '<button class="ranking-action-btn" onclick="printGeneralRanking()">🖨️ Imprimer</button>';
        html += '</div>';
        html += '<div>' + buildEventRankingsHTML(true) + '</div>';
        html += '</div>';
        return html;
    }

    function buildRaceClubRankingHTML(interactive) {
        var events = calculateRaceClubEvents();
        var clubs = calculateClubEventRanking(events);
        if (clubs.length < 2) return '';
        var multiDay = events.some(function(e) { return e.dayNumber !== events[0].dayNumber; });
        return buildClubRankingHTML(events, clubs, multiDay, interactive);
    }

    var multisportCategoryFilter = ''; // filtre de catégorie de l'onglet (non enregistré)

    function setMultisportCategoryFilter(category) {
        multisportCategoryFilter = category || '';
        if (typeof global.updateMultisportRanking === 'function') global.updateMultisportRanking();
    }

    // Tableau du classement multisport (une colonne par journée). Partagé par l'onglet,
    // la fenêtre « Afficher » et l'impression ; interactive = nom cliquable vers la fiche.
    function buildMultisportStandingsTable(standings, interactive) {
        var columns = getMultisportDayColumns();
        var cell = 'padding: ' + (interactive ? '12px 10px' : '7px 9px') + '; text-align: center;';
        var html = '<table class="ranking-table multisport-standings" style="width: 100%; border-collapse: collapse;">';
        html += '<thead><tr' + (interactive ? ' style="background: #f8f9fa;"' : '') + '>';
        html += '<th style="' + cell + '">#</th><th style="' + cell + ' text-align: left;">Joueur</th><th style="' + cell + '">Club</th>';
        columns.forEach(function(c) {
            html += '<th style="' + cell + '" title="Journée ' + c.day + ' (' + (c.type === 'courses' ? 'courses' : 'matchs') + ')">J' + c.day + ' ' + (c.type === 'courses' ? '🏁' : '⚔️') + '</th>';
        });
        html += '<th style="' + cell + '">Total</th></tr></thead><tbody>';

        standings.forEach(function(stat) {
            var rankClass = stat.rank <= 3 ? 'rank-' + stat.rank : '';
            html += '<tr class="' + rankClass + '" style="border-bottom: 1px solid #ecf0f1;">';
            html += '<td style="' + cell + ' font-weight: bold;">' + stat.rank + '</td>';
            var name = interactive
                ? '<span onclick="showPlayerChronoDetail(\'' + encodeURIComponent(stat.player) + '\')" ' +
                  'style="cursor: pointer;" ' +
                  'title="Voir le détail des matchs et épreuves">' + stat.player + '</span>'
                : stat.player;
            html += '<td style="' + cell + ' text-align: left; font-weight: bold; color: #2c3e50;">' + name + '</td>';
            html += '<td style="' + cell + '">' + (stat.club || '-') + '</td>';
            columns.forEach(function(c) {
                var d = stat.days.find(function(x) { return x.day === c.day; });
                if (!d) { html += '<td style="' + cell + ' color: #aab;">–</td>'; return; }
                var title = (d.type === 'courses' ? 'Position de la journée : ' : 'Position dans la division : ') + d.position +
                    (d.dropped ? ' — journée non retenue' : '');
                html += '<td style="' + cell + '" title="' + title + '">' +
                    (d.dropped ? '<s style="color: #8a9499;">' + d.points + '</s>' : d.points) + '</td>';
            });
            html += '<td style="' + cell + ' font-size: 1.15em;"><strong style="color: #2c3e50;">' + stat.totalPoints + '</strong></td>';
            html += '</tr>';
        });
        html += '</tbody></table>';
        return html;
    }

    function buildMultisportClubTable(clubs, interactive) {
        var columns = getMultisportDayColumns();
        var cell = 'padding: ' + (interactive ? '10px' : '7px 9px') + '; text-align: center;';
        var html = '<table class="ranking-table" style="width: 100%; border-collapse: collapse;">';
        html += '<thead><tr' + (interactive ? ' style="background: #f8f9fa;"' : '') + '><th style="' + cell + '">#</th><th style="' + cell + ' text-align: left;">Club</th>' +
            '<th style="' + cell + '">Membres</th>';
        columns.forEach(function(c) {
            html += '<th style="' + cell + '">J' + c.day + ' ' + (c.type === 'courses' ? '🏁' : '⚔️') + '</th>';
        });
        html += '<th style="' + cell + '">Total</th></tr></thead><tbody>';
        clubs.forEach(function(c) {
            html += '<tr style="border-bottom: 1px solid #ecf0f1;"><td style="' + cell + ' font-weight: bold;">' + c.rank + '</td>' +
                '<td style="' + cell + ' text-align: left; font-weight: bold;">' + clubNameHTML(c.club, interactive) + '</td>' +
                '<td style="' + cell + '">' + c.members.length + '</td>';
            columns.forEach(function(col) {
                var pts = c.perDay[col.day];
                html += '<td style="' + cell + (pts == null ? ' color: #aab;' : '') + '">' + (pts == null ? '–' : pts) + '</td>';
            });
            html += '<td style="' + cell + '"><strong>' + c.totalPoints + '</strong></td></tr>';
        });
        return html + '</tbody></table>';
    }

    function multisportRulesText() {
        var settings = getMultisportSettings();
        return 'Barème par journée : ' + settings.bareme.join(' / ') + ' (0 au-delà). ' +
            (settings.bestDays ? 'Seules les ' + settings.bestDays + ' meilleures journées comptent. ' : '') +
            'Ex æquo départagés au nombre de meilleures places.';
    }

    function renderMultisportRanking() {
        if (isSwimmingOnlyCompetition()) return renderEventRankingsPanel();

        // Mode d'affichage : chrono seul OU mixte (championnat + courses)
        var mixed = hasChampionshipDays() && hasChronoDays();

        var html = '<div class="multisport-ranking">';
        html += '<h3 style="margin: 0 0 4px 0; color: #2c3e50;">🏆 ' + (mixed ? 'Classement Général Multisport' : 'Classement Général des Courses') + '</h3>';
        html += '<p style="margin: 0 0 15px 0; color: #586566; font-size: 14px;">' + (mixed ? 'Matchs + Courses (points)' : 'Courses — distance &amp; temps') + '</p>';

        // Barre d'outils : harmonisation des noms, impression, export, filtre
        var categories = mixed ? getMultisportCategories() : [];
        if (multisportCategoryFilter && categories.indexOf(multisportCategoryFilter) === -1) multisportCategoryFilter = '';
        html += '<div style="padding: 0 0 15px 0; display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">';
        html += '<button class="ranking-action-btn" onclick="showNameHarmonizationModal()">🔤 Harmoniser les noms</button>';
        html += '<button class="ranking-action-btn" onclick="normalizeAllNamesCase()">Aa Normaliser la casse</button>';
        html += '<button class="ranking-action-btn" onclick="printGeneralRanking()">🖨️ Imprimer</button>';
        if (mixed) {
            html += '<button class="ranking-action-btn" onclick="exportMultisportRankingCSV()">📄 Export tableur (CSV)</button>';
            if (categories.length) {
                html += '<label style="font-size: 13px; color: #34495e; display: inline-flex; align-items: center; gap: 6px;">Catégorie ' +
                    '<select onchange="setMultisportCategoryFilter(this.value)" style="padding: 5px 8px; border: 1px solid #cbd5e1; border-radius: 6px;">' +
                    '<option value="">Toutes</option>' +
                    categories.map(function(c) {
                        return '<option value="' + c.replace(/"/g, '&quot;') + '"' + (c === multisportCategoryFilter ? ' selected' : '') + '>' + c + '</option>';
                    }).join('') +
                    '</select></label>';
            }
        }
        html += '<span style="font-size: 12px; color: #586566;">Harmoniser : fusionne les variantes d\'un nom. Normaliser : majuscule à chaque mot.</span>';
        html += '</div>';

        if (mixed) {
            // Réglages du classement (enregistrés avec la compétition)
            var settings = getMultisportSettings();
            var dayCount = getMultisportDayColumns().length;
            html += '<details class="multisport-settings" style="margin: 0 0 15px 0; padding: 10px 14px; background: #f8f9fb; border: 1px solid #e3e8f0; border-radius: 8px;">' +
                '<summary style="cursor: pointer; font-weight: 600; color: #34495e;">⚙️ Réglages du classement</summary>' +
                '<div style="display: flex; flex-wrap: wrap; gap: 14px 24px; margin-top: 12px; align-items: flex-end;">' +
                '<label style="font-size: 13px; color: #34495e; display: flex; flex-direction: column; gap: 4px; flex: 1 1 260px;">Points par place (1er, 2e, 3e…)' +
                '<input type="text" value="' + settings.bareme.join(', ') + '" onchange="setMultisportBareme(this.value)" ' +
                'style="padding: 7px 9px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;"></label>' +
                '<button type="button" class="ranking-action-btn" onclick="resetMultisportBareme()">↺ Barème par défaut</button>' +
                '<label style="font-size: 13px; color: #34495e; display: flex; flex-direction: column; gap: 4px;">Journées prises en compte' +
                '<select onchange="setMultisportBestDays(this.value)" style="padding: 7px 9px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">' +
                '<option value="0"' + (settings.bestDays ? '' : ' selected') + '>Toutes</option>';
            for (var n = 1; n < Math.max(dayCount, settings.bestDays + 1); n++) {
                html += '<option value="' + n + '"' + (settings.bestDays === n ? ' selected' : '') + '>Les ' + n + ' meilleure' + (n > 1 ? 's' : '') + '</option>';
            }
            html += '</select></label></div>' +
                '<p style="margin: 10px 0 0; font-size: 12px; color: #586566;">Les journées non retenues restent visibles, barrées.</p>' +
                '</details>';
        }

        if (mixed) {
            var standings = getMultisportStandings(multisportCategoryFilter);
            if (standings.length === 0) {
                html += '<p style="text-align: center; padding: 40px; color: #586566;">Aucun résultat pour le moment : saisissez des scores de matchs ou des temps de course.</p>';
            } else {
                html += '<div class="bulk-grid-scroll">' + buildMultisportStandingsTable(standings, true) + '</div>';
                var clubs = getMultisportClubStandings(standings);
                if (clubs.length >= 2) {
                    html += '<h3 style="margin: 28px 0 10px 0; color: #2c3e50;">🏛️ Classement des clubs</h3>';
                    html += '<p style="margin: 0 0 10px 0; color: #586566; font-size: 13px;">Somme des points retenus des membres' +
                        (multisportCategoryFilter ? ' (catégorie ' + multisportCategoryFilter + ')' : '') + '. Cliquez sur un club pour le détail.</p>';
                    html += buildMultisportClubTable(clubs, true);
                }
            }
            html += '</div>';
            return html;
        }

        // Courses seules : tri par distance (desc) puis temps (asc), pas de points
        var sorted = Object.values(calculateMultisportRanking()).sort(function(a, b) {
            if (b.chronoDistance !== a.chronoDistance) return b.chronoDistance - a.chronoDistance;
            return a.chronoTime - b.chronoTime;
        });

        if (sorted.length === 0) {
            html += '<p style="text-align: center; padding: 40px; color: #586566;">Aucun résultat pour le moment : saisissez des temps de course.</p>';
        } else {
            html += '<table class="ranking-table" style="width: 100%; border-collapse: collapse;">';
            html += '<thead><tr style="background: #f8f9fa;">';
            html += '<th style="padding: 15px; text-align: center;">#</th>';
            html += '<th style="padding: 15px; text-align: left;">Joueur</th>';
            html += '<th style="padding: 15px; text-align: center;">Club</th>';
            html += '<th style="padding: 15px; text-align: center;">📏 Distance</th>';
            html += '<th style="padding: 15px; text-align: center;">⏱️ Temps total</th>';
            html += '<th style="padding: 15px; text-align: center;">Séries</th>';
            html += '</tr></thead><tbody>';

            sorted.forEach(function(stat, index) {
                var rankClass = index < 3 ? 'rank-' + (index + 1) : '';
                html += '<tr class="' + rankClass + '" style="border-bottom: 1px solid #ecf0f1;">';
                html += '<td style="padding: 15px; text-align: center; font-weight: bold;">' + (index + 1) + '</td>';
                html += '<td style="padding: 15px; text-align: left; font-weight: bold; color: #2c3e50;">' +
                    '<span onclick="showPlayerChronoDetail(\'' + encodeURIComponent(stat.player) + '\')" ' +
                    'style="cursor: pointer;" ' +
                    'title="Voir le détail des épreuves">' + stat.player + '</span></td>';
                html += '<td style="padding: 15px; text-align: center;">' + (stat.club || '-') + '</td>';
                html += '<td style="padding: 15px; text-align: center; font-weight: bold; color: #08689d;">' + formatDistance(stat.chronoDistance) + '</td>';
                html += '<td style="padding: 15px; text-align: center; font-family: monospace; color: #9c5003;">' + (stat.chronoTime ? formatDurationHMS(stat.chronoTime) : '-') + '</td>';
                html += '<td style="padding: 15px; text-align: center;"><strong>' + stat.chronoSeries + '</strong></td>';
                html += '</tr>';
            });

            html += '</tbody></table>';
            html += buildRaceClubRankingHTML(true).replace('margin: 0 0 26px 0', 'margin: 28px 0 0 0');
        }

        html += '</div>';
        return html;
    }

    // Export tableur du classement multisport affiché (filtre de catégorie compris).
    // Séparateur « ; » et BOM UTF-8 : s'ouvre directement dans Excel en français.
    function exportMultisportRankingCSV() {
        var standings = getMultisportStandings(multisportCategoryFilter);
        var columns = getMultisportDayColumns();
        var esc = function(v) {
            v = String(v == null ? '' : v);
            return /[";\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
        };
        var lines = [['Place', 'Joueur', 'Club'].concat(columns.map(function(c) {
            return 'J' + c.day + ' (' + c.type + ')';
        })).concat(['Total']).map(esc).join(';')];
        standings.forEach(function(s) {
            var row = [s.rank, s.player, s.club || ''];
            columns.forEach(function(c) {
                var d = s.days.find(function(x) { return x.day === c.day; });
                row.push(d ? d.points + (d.dropped ? ' (non retenue)' : '') : '');
            });
            row.push(s.totalPoints);
            lines.push(row.map(esc).join(';'));
        });
        var blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'classement-multisport' + (multisportCategoryFilter ? '-' + multisportCategoryFilter : '') + '-' + new Date().toISOString().split('T')[0] + '.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        if (typeof global.showNotification === 'function') global.showNotification('Classement exporté (CSV) !', 'success');
    }

    // Impression du classement général, adaptée au mode courant
    // (chrono : distance & temps, sans points ; multisport : points).
    // Construit le document HTML autonome du classement général multisport.
    // autoPrint=true ajoute le déclenchement de l'impression (pour la fenêtre
    // d'impression / export PDF) ; false produit un fichier HTML à télécharger.
    function buildMultisportRankingDoc(autoPrint) {
        var swimmingOnly = isSwimmingOnlyCompetition();
        var ranking = swimmingOnly ? {} : calculateMultisportRanking();
        var mixed = hasChampionshipDays() && hasChronoDays();

        var sorted = Object.values(ranking).sort(function(a, b) {
            if (b.chronoDistance !== a.chronoDistance) return b.chronoDistance - a.chronoDistance;
            return a.chronoTime - b.chronoTime;
        });

        var title = swimmingOnly ? 'Résultats par épreuve'
            : (mixed ? 'Classement Général Multisport' : 'Classement Général des Courses');
        var champName = (global.championship && global.championship.name) ? global.championship.name : '';
        var dateStr = new Date().toLocaleDateString('fr-FR');
        var bareme = mixed ? multisportRulesText() + (multisportCategoryFilter ? ' Catégorie : ' + multisportCategoryFilter + '.' : '') : '';

        var head = '', rows = '', table = null;
        if (mixed) {
            var standings = getMultisportStandings(multisportCategoryFilter);
            table = buildMultisportStandingsTable(standings, false);
            var clubs = getMultisportClubStandings(standings);
            if (clubs.length >= 2) table += '<h2 style="font-size:16px;margin:22px 0 8px;">Classement des clubs</h2>' + buildMultisportClubTable(clubs, false);
        } else {
            head = '<th>#</th><th style="text-align:left;">Participant</th><th>Club</th><th>Distance</th><th>Temps total</th><th>Séries</th>';
            sorted.forEach(function(s, i) {
                rows += '<tr><td>' + (i + 1) + '</td><td style="text-align:left;">' + s.player + '</td><td>' + (s.club || '-') + '</td>' +
                    '<td>' + formatDistance(s.chronoDistance) + '</td><td>' + (s.chronoTime ? formatDurationHMS(s.chronoTime) : '-') + '</td><td>' + s.chronoSeries + '</td></tr>';
            });
        }

        return '<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>' + title + '</title>' +
            '<style>' +
            'body{font-family:Arial,Helvetica,sans-serif;color:#222;margin:24px;}' +
            'h1{font-size:20px;margin:0 0 4px;}' +
            '.sub{color:#666;font-size:13px;margin-bottom:4px;}' +
            '.bareme{color:#8e44ad;font-size:12px;margin-bottom:16px;}' +
            'table{width:100%;border-collapse:collapse;font-size:13px;}' +
            'th,td{border:1px solid #ccc;padding:7px 9px;text-align:center;}' +
            'thead th{background:#34495e;color:#fff;}' +
            'tbody tr:nth-child(even){background:#f4f6fb;}' +
            global.rankingPrintCSS() +
            '</style></head><body>' +
            '<h1>🏆 ' + title + '</h1>' +
            '<div class="sub">' + (champName ? champName + ' — ' : '') + 'Édité le ' + dateStr + '</div>' +
            (bareme ? '<div class="bareme">🏅 ' + bareme + '</div>' : '') +
            (swimmingOnly
                // Natation : un tableau par épreuve (séries regroupées), pas de général
                ? '<style>h3{font-size:16px;margin:18px 0 6px;}</style>' + buildEventRankingsHTML()
                : (table || '<table><thead><tr>' + head + '</tr></thead><tbody>' + rows + '</tbody></table>' +
                    buildRaceClubRankingHTML(false).replace('margin: 0 0 26px 0', 'margin: 24px 0 0 0'))) +
            (autoPrint ? '<script>window.onload=function(){window.print();};<\/script>' : '') +
            '</body></html>';
    }
    global.buildMultisportRankingDoc = buildMultisportRankingDoc;

    function printGeneralRanking() {
        var doc = buildMultisportRankingDoc(true);
        var w = window.open('', '_blank');
        if (!w) { showNotification('Autorise les fenêtres pop-up pour imprimer', 'warning'); return; }
        w.document.open();
        w.document.write(doc);
        w.document.close();
    }
    global.printGeneralRanking = printGeneralRanking;

    // Télécharge le classement général multisport en fichier HTML autonome.
    function exportMultisportRankingToHTML() {
        var doc = buildMultisportRankingDoc(false);
        var blob = new Blob([doc], { type: 'text/html' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'classement-multisport-' + new Date().toISOString().split('T')[0] + '.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        if (typeof showNotification === 'function') showNotification('Classement multisport exporté (HTML) !', 'success');
    }
    global.exportMultisportRankingToHTML = exportMultisportRankingToHTML;

    // ============================================
    // DÉTAIL D'UN PARTICIPANT (épreuves / séries / journées)
    // ============================================

    /**
     * Ajoute catRank/catTotal à chaque entrée d'un classement déjà trié
     * (ordre scratch), en numérotant chaque participant au sein de sa
     * catégorie tout en conservant l'ordre scratch. Ajoute aussi
     * hasMultipleCategories sur le tableau lui-même (>= 2 catégories non
     * vides distinctes parmi les entrées). Fonction pure, ne modifie que
     * les objets déjà présents dans arr (pas de tri, arr doit déjà être
     * dans l'ordre scratch voulu).
     */
    function assignCategoryRanks(arr) {
        var counters = {};
        var distinctCategories = {};
        arr.forEach(function(entry) {
            var cat = entry.category || '';
            if (cat) distinctCategories[cat] = true;
            counters[cat] = (counters[cat] || 0) + 1;
            entry.catRank = counters[cat];
        });
        var totals = counters; // même clé, le compteur final = le total par catégorie
        arr.forEach(function(entry) {
            entry.catTotal = totals[entry.category || ''];
        });
        arr.hasMultipleCategories = Object.keys(distinctCategories).length >= 2;
        return arr;
    }
    global.assignCategoryRanks = assignCategoryRanks;

    // Classement d'une série : distance parcourue (desc) puis temps (asc),
    // cohérent avec le classement général. Renvoie la liste ordonnée des coureurs.
    // Ajoute category/catRank/catTotal à chaque entrée (voir assignCategoryRanks) ;
    // arr.hasMultipleCategories indique si une colonne Catégorie doit être affichée.
    function getSerieRanking(serie) {
        var byName = {};
        (serie.participants || []).forEach(function(p) {
            if (!p || !p.name) return;
            byName[p.name] = {
                name: p.name,
                category: p.category || '',
                distance: p.totalDistance || 0,
                time: (p.totalTime > 0 ? p.totalTime : (p.finishTime || 0)),
                ran: (p.totalTime > 0 || p.totalDistance > 0 || p.finishTime != null)
            };
        });
        (serie.results || []).forEach(function(r) {
            if (!r || !r.name) return;
            if (!byName[r.name]) {
                byName[r.name] = { name: r.name, category: r.category || '', distance: serie.distance || 0, time: r.time || 0, ran: true };
            } else {
                byName[r.name].ran = true;
                if (!byName[r.name].category) byName[r.name].category = r.category || '';
                if (!byName[r.name].time) byName[r.name].time = r.time || 0;
            }
        });
        var arr = Object.keys(byName).map(function(k) { return byName[k]; }).filter(function(x) { return x.ran; });
        arr.sort(function(a, b) {
            if (b.distance !== a.distance) return b.distance - a.distance;
            return a.time - b.time;
        });
        return assignCategoryRanks(arr);
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
                    points: position ? calculateChronoPoints(position, serieRanking.length) : 0
                });
            });

            if (rows.length) days.push({ day: dayNumber, rows: rows });
        });

        return days;
    }

    // Rassemble les journées Matchs d'un joueur : position dans la division, bilan,
    // points (barème multisport ou points de championnat) et matchs joués.
    function collectPlayerMatchsDetail(playerName) {
        var lower = (playerName || '').toLowerCase();
        var multisport = isMultisportMode();
        var numDivisions = (global.config && global.config.numberOfDivisions) ? global.config.numberOfDivisions : 3;
        var days = [];

        Object.keys(global.championship.days).sort(function(a, b) { return a - b; }).forEach(function(dayNumber) {
            var dayNum = parseInt(dayNumber, 10);
            var dayData = global.championship.days[dayNumber];
            if (!dayData || !dayData.players || getDayType(dayNumber) !== DAY_TYPES.CHAMPIONSHIP) return;

            for (var division = 1; division <= numDivisions; division++) {
                var order = getMatchsDayDivisionOrder(dayNum, division);
                var index = -1;
                order.forEach(function(row, i) { if (row.name.toLowerCase() === lower) index = i; });
                if (index === -1) continue;
                var name = order[index].name;
                var stats = global.calculatePlayerStats(dayNum, division, name);
                if (!stats) continue;

                var matches = (stats.matches || []).filter(function(m) { return m.completed; }).map(function(m) {
                    var isP1 = m.player1 === name;
                    var result;
                    if (m.forfaitBy) result = m.forfaitBy === (isP1 ? 'player1' : 'player2') ? 'F' : 'V';
                    else if (m.winner === null || m.winner === undefined) result = 'N';
                    else result = m.winner === name ? 'V' : 'D';
                    var mine = isP1 ? m.score1 : m.score2, theirs = isP1 ? m.score2 : m.score1;
                    return {
                        opponent: isP1 ? m.player2 : m.player1,
                        score: (mine === '' || mine == null ? '-' : mine) + ' – ' + (theirs === '' || theirs == null ? '-' : theirs),
                        result: result
                    };
                });

                days.push({
                    day: dayNum,
                    division: division,
                    position: index + 1,
                    total: order.length,
                    stats: stats,
                    points: multisport ? calculateMultisportPositionPoints(index + 1) : stats.totalPoints,
                    matches: matches
                });
            }
        });

        return days;
    }

    function showPlayerChronoDetail(encodedName) {
        var playerName = decodeURIComponent(encodedName);
        var existing = document.getElementById('playerChronoDetailModal');
        if (existing) existing.remove();

        var days = collectPlayerChronoDetail(playerName);
        var matchDays = collectPlayerMatchsDetail(playerName);

        // Totaux identiques à ceux du tableau du classement multisport
        var lower = playerName.toLowerCase();
        var ranking = calculateMultisportRanking();
        var totals = null;
        Object.keys(ranking).forEach(function(k) { if (k.toLowerCase() === lower) totals = ranking[k]; });

        var grandDistance = 0, grandTime = 0, grandSeries = 0;
        var sections = [];
        var th = function(label, align) { return '<th style="padding:6px 8px; text-align:' + (align || 'center') + ';">' + label + '</th>'; };
        var dayTitle = function(day, suffix) {
            return '<div style="margin:14px 0 6px; font-weight:700; color:#2c3e50; border-bottom:2px solid #5267d0; padding-bottom:4px;">📅 Journée ' + day + suffix + '</div>';
        };
        var RESULT_STYLE = {
            V: ['Victoire', '#017239', '#d5f4e6'],
            N: ['Nul', '#6b5b00', '#fdf3c4'],
            D: ['Défaite', '#a12a1d', '#fbe1dd'],
            F: ['Forfait', '#586566', '#ecf0f1']
        };

        matchDays.forEach(function(d) {
            var st = d.stats;
            var dayInfo = totals && totals.days.find(function(x) { return x.day === d.day; });
            var html = dayTitle(d.day, ' · ⚔️ Matchs · Division ' + d.division);
            html += '<div style="display:flex; flex-wrap:wrap; gap:6px 18px; font-size:13px; color:#34495e; margin:4px 0 8px;">' +
                '<span><strong>Position :</strong> ' + d.position + ' / ' + d.total + '</span>' +
                '<span><strong>Bilan :</strong> ' + st.wins + 'V · ' + st.draws + 'N · ' + st.losses + 'D' + (st.forfeits ? ' · ' + st.forfeits + 'F' : '') + '</span>' +
                '<span><strong>Points marqués :</strong> ' + st.pointsWon + ' – ' + st.pointsLost + '</span>' +
                '<span style="color:#08689d;"><strong>' + d.points + ' pts</strong></span>' +
                (dayInfo && dayInfo.dropped ? '<span style="color:#8a9499;">(journée non retenue)</span>' : '') +
                '</div>';
            if (d.matches.length) {
                html += '<table style="width:100%; border-collapse:collapse; font-size:13px;">';
                html += '<thead><tr style="background:#f4f6fb; color:#34495e;">' + th('Adversaire', 'left') + th('Score') + th('Résultat') + '</tr></thead><tbody>';
                d.matches.forEach(function(m) {
                    var r = RESULT_STYLE[m.result];
                    html += '<tr style="border-bottom:1px solid #ecf0f1;">' +
                        '<td style="padding:6px 8px;">' + m.opponent + '</td>' +
                        '<td style="padding:6px 8px; text-align:center; font-weight:600;">' + m.score + '</td>' +
                        '<td style="padding:6px 8px; text-align:center;"><span style="padding:2px 8px; border-radius:10px; font-size:12px; color:' + r[1] + '; background:' + r[2] + ';">' + r[0] + '</span></td>' +
                        '</tr>';
                });
                html += '</tbody></table>';
            }
            sections.push({ day: d.day, html: html });
        });

        days.forEach(function(d) {
            var dayDistance = 0, dayTime = 0;
            var html = dayTitle(d.day, matchDays.length ? ' · 🏁 Courses' : '');
            var chronoDay = totals && totals.days.find(function(x) { return x.day === Number(d.day); });
            if (chronoDay) {
                html += '<div style="display:flex; flex-wrap:wrap; gap:6px 18px; font-size:13px; color:#34495e; margin:4px 0 8px;">' +
                    '<span><strong>Place de la journée :</strong> ' + chronoDay.position + '</span>' +
                    '<span style="color:#9c5003;"><strong>' + chronoDay.points + ' pts</strong></span>' +
                    (chronoDay.dropped ? '<span style="color:#8a9499;">(journée non retenue)</span>' : '') +
                    '</div>';
            }
            html += '<table style="width:100%; border-collapse:collapse; font-size:13px;">';
            html += '<thead><tr style="background:#f4f6fb; color:#34495e;">' +
                th('Épreuve', 'left') + th('Série', 'left') + th('Pos.') + th('Tours') + th('Distance') + th('Temps') +
                '</tr></thead><tbody>';
            d.rows.forEach(function(r) {
                dayDistance += r.distance; dayTime += r.time;
                grandDistance += r.distance; grandTime += r.time; grandSeries++;
                var posTxt = r.position ? (r.position + ' / ' + r.total) : '-';
                html += '<tr style="border-bottom:1px solid #ecf0f1;">' +
                    '<td style="padding:6px 8px;">' + (r.eventName || '<span style="color:#bbb;">—</span>') + '</td>' +
                    '<td style="padding:6px 8px;">' + (r.serieName || '') + '</td>' +
                    '<td style="padding:6px 8px; text-align:center; font-weight:600;">' + posTxt + '</td>' +
                    '<td style="padding:6px 8px; text-align:center;">' + (r.laps != null ? r.laps : '-') + '</td>' +
                    '<td style="padding:6px 8px; text-align:center; color:#08689d;">' + formatDistance(r.distance) + '</td>' +
                    '<td style="padding:6px 8px; text-align:center; font-family:monospace; color:#9c5003;">' + (r.time ? formatDurationHMS(r.time) : '-') + '</td>' +
                    '</tr>';
            });
            html += '<tr style="background:#fbfbfd; font-weight:700;">' +
                '<td colspan="4" style="padding:6px 8px; text-align:right;">Sous-total journée :</td>' +
                '<td style="padding:6px 8px; text-align:center; color:#08689d;">' + formatDistance(dayDistance) + '</td>' +
                '<td style="padding:6px 8px; text-align:center; font-family:monospace; color:#9c5003;">' + formatDurationHMS(dayTime) + '</td>' +
                '</tr>';
            html += '</tbody></table>';
            sections.push({ day: d.day, html: html });
        });

        var body = '';
        if (sections.length === 0) {
            body = '<p style="color:#586566; text-align:center; padding:20px;">Aucun match ni épreuve trouvé pour ce participant.</p>';
        } else {
            sections.sort(function(a, b) { return a.day - b.day; });
            body = sections.map(function(x) { return x.html; }).join('');

            var stat = function(label, value) {
                return '<div><div style="font-size:11px;">' + label + '</div><div style="font-size:18px; font-weight:700;">' + value + '</div></div>';
            };
            var summary = '';
            if (matchDays.length) {
                summary += stat('Matchs', totals ? totals.championshipWins + 'V / ' + totals.championshipMatches + 'J' : '-');
                summary += stat('Points matchs', totals ? totals.championshipPoints : 0);
            }
            if (days.length) {
                summary += stat('Séries', grandSeries) + stat('Distance totale', formatDistance(grandDistance)) + stat('Temps total', formatDurationHMS(grandTime));
                summary += stat('Points courses', totals ? totals.chronoPoints : 0);
            }
            summary += stat('Total', totals ? totals.totalPoints : 0);
            body += '<div style="margin-top:16px; padding:12px; background:linear-gradient(135deg,#5267d0,#764ba2); color:white; border-radius:8px; display:flex; justify-content:space-around; flex-wrap:wrap; gap:8px; text-align:center;">' +
                summary + '</div>';
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

    // ============================================
    // CLASSEMENT D'UNE JOURNÉE COURSES
    // ============================================
    // Classement de la journée (somme des points d'épreuves, comme pour la colonne de
    // la journée du classement multisport), classement des clubs du jour, puis chaque
    // épreuve. interactive : noms cliquables vers la fiche joueur (fenêtre de l'onglet).
    function buildChronoDayRankingHTML(dayNumber, interactive) {
        var groups = getChronoDayEventGroups(dayNumber, true).map(function(g) {
            return { name: g.name, fun: g.fun, entries: rankEventGroup(g.series) };
        }).filter(function(g) { return g.entries.length > 0; });
        if (!groups.length) {
            return '<p style="text-align:center; padding:30px; color:#586566;">Aucun résultat pour cette journée : saisissez des temps dans les séries.</p>';
        }

        var cell = 'padding:7px 9px; text-align:center;';
        var th = function(label, align) { return '<th style="' + cell + (align ? ' text-align:' + align + ';' : '') + '">' + label + '</th>'; };
        var nameHTML = function(name) {
            return interactive
                ? '<span onclick="showPlayerChronoDetail(\'' + encodeURIComponent(name) + '\')" style="cursor:pointer;" title="Voir la fiche du participant">' + escapeLaneHtml(name) + '</span>'
                : escapeLaneHtml(name);
        };
        var medal = function(rank) { return rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] + ' ' : ''; };
        var section = function(title, note) {
            return '<h3 style="margin:22px 0 4px; color:#2c3e50; font-size:16px;">' + title + '</h3>' +
                (note ? '<p style="margin:0 0 8px; font-size:12px; color:#586566;">' + note + '</p>' : '');
        };
        var html = '';

        // 1. Classement de la journée
        var counts = {};
        groups.forEach(function(g) {
            if (g.fun) return;
            g.entries.forEach(function(e) { var k = e.name.toLowerCase(); counts[k] = (counts[k] || 0) + 1; });
        });
        var order = getChronoDayMultisportOrder(dayNumber);
        if (order.length) {
            var multisport = isMultisportMode();
            html += section('🏆 Classement de la journée',
                'Chaque place dans une épreuve rapporte ' + multisportBaremeText() + ' points ; le total classe la journée.' +
                (multisport ? ' La dernière colonne est reportée au classement multisport.' : ''));
            html += '<table class="ranking-table" style="width:100%; border-collapse:collapse; font-size:13px;"><thead><tr>' +
                th('Place') + th('Participant', 'left') + th('Club') + th('Épreuves') + th('Points d\'épreuves') +
                (multisport ? th('Points multisport') : '') + '</tr></thead><tbody>';
            order.forEach(function(r) {
                html += '<tr class="' + (r.rank <= 3 ? 'rank-' + r.rank : '') + '" style="border-bottom:1px solid #ecf0f1;">' +
                    '<td style="' + cell + ' font-weight:bold;">' + medal(r.rank) + r.rank + '</td>' +
                    '<td style="' + cell + ' text-align:left; font-weight:bold;">' + nameHTML(r.name) + '</td>' +
                    '<td style="' + cell + '">' + (r.club ? escapeLaneHtml(r.club) : '-') + '</td>' +
                    '<td style="' + cell + '">' + (counts[r.name.toLowerCase()] || 0) + '</td>' +
                    '<td style="' + cell + ' font-weight:bold;">' + r.eventPoints + '</td>' +
                    (multisport ? '<td style="' + cell + ' font-weight:bold; color:#5267d0;">' + calculateMultisportPositionPoints(r.rank) + '</td>' : '') +
                    '</tr>';
            });
            html += '</tbody></table>';
        }

        // 2. Classement des clubs du jour (mêmes règles que le classement général des clubs)
        var clubEvents = (isSwimmingOnlyCompetition()
            ? calculateEventRankings().filter(function(e) { return !e.fun; })
            : calculateRaceClubEvents()
        ).filter(function(e) { return e.dayNumber === Number(dayNumber); });
        var clubs = calculateClubEventRanking(clubEvents);
        if (clubs.length >= 2) {
            html += '<div style="margin-top:22px;">' + buildClubRankingHTML(clubEvents, clubs, false, false)
                .replace('Classement des clubs (toutes épreuves)', 'Classement des clubs de la journée') + '</div>';
        }

        // 3. Chaque épreuve
        html += section('🎯 Résultats par épreuve', 'Toutes les séries d\'une épreuve regroupées, classées au temps.');
        groups.forEach(function(g) {
            html += '<h4 style="margin:16px 0 6px; color:#057e68; font-size:14px;">' + escapeLaneHtml(g.name) +
                ' <span style="font-size:12px; color:#586566; font-weight:normal;">(' + g.entries.length + ' classé' + (g.entries.length > 1 ? 's' : '') + ')</span>' +
                (g.fun ? ' ' + funEventBadgeHTML() : '') + '</h4>';
            html += '<table class="ranking-table" style="width:100%; border-collapse:collapse; font-size:13px;"><thead><tr>' +
                th('Place') + th('Participant', 'left') + th('Club') + th('Série') + th('Temps') + (g.fun ? '' : th('Points')) + '</tr></thead><tbody>';
            g.entries.forEach(function(e) {
                html += '<tr style="border-bottom:1px solid #ecf0f1;">' +
                    '<td style="' + cell + ' font-weight:bold;">' + medal(e.rank) + e.rank + '</td>' +
                    '<td style="' + cell + ' text-align:left; font-weight:bold;">' + nameHTML(e.name) + '</td>' +
                    '<td style="' + cell + '">' + (e.club ? escapeLaneHtml(e.club) : '-') + '</td>' +
                    '<td style="' + cell + '">' + escapeLaneHtml(e.serieName || '') + '</td>' +
                    '<td style="' + cell + ' font-family:monospace; color:#9c5003;">' + formatDurationHMS(e.time) + '</td>' +
                    (g.fun ? '' : '<td style="' + cell + ' font-weight:bold; color:#057e68;">' + calculateMultisportPositionPoints(e.rank) + '</td>') +
                    '</tr>';
            });
            html += '</tbody></table>';
        });
        return html;
    }

    function chronoDayRankingDoc(dayNumber, autoPrint) {
        var champName = (global.championship && global.championship.name) ? global.championship.name : '';
        var title = 'Classement — Journée ' + dayNumber;
        return '<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>' + title + '</title>' +
            '<style>body{font-family:Arial,Helvetica,sans-serif;color:#222;margin:24px;}h1{font-size:20px;margin:0 0 4px;}' +
            '.sub{color:#666;font-size:13px;margin-bottom:8px;}table{width:100%;border-collapse:collapse;font-size:13px;}' +
            'th,td{border:1px solid #ccc;padding:7px 9px;text-align:center;}thead th{background:#34495e;color:#fff;}' +
            'tbody tr:nth-child(even){background:#f4f6fb;}.no-print{margin-bottom:12px;}@media print{.no-print{display:none;}}' +
            global.rankingPrintCSS() + '</style></head><body>' +
            (autoPrint ? '' : '<div class="no-print"><button onclick="if (window.opener && window.opener.openChronoDayRankingWindow) window.opener.openChronoDayRankingWindow(' + dayNumber + ')">🔄 Actualiser</button></div>') +
            '<h1>🏆 ' + title + '</h1>' +
            '<div class="sub">' + (champName ? escapeLaneHtml(champName) + ' — ' : '') + 'Édité le ' + new Date().toLocaleDateString('fr-FR') + '</div>' +
            buildChronoDayRankingHTML(dayNumber, false) +
            (autoPrint ? '<script>window.onload=function(){window.print();};<\/script>' : '') +
            '</body></html>';
    }

    function writeChronoDayRankingWindow(dayNumber, autoPrint) {
        var w = window.open('', autoPrint ? '_blank' : 'chronoDayRanking-' + dayNumber);
        if (!w) { showNotification('Autorisez les fenêtres pop-up pour afficher le classement', 'warning'); return; }
        w.document.open();
        w.document.write(chronoDayRankingDoc(dayNumber, autoPrint));
        w.document.close();
    }

    function printChronoDayRanking(dayNumber) { writeChronoDayRankingWindow(dayNumber, true); }
    function openChronoDayRankingWindow(dayNumber) { writeChronoDayRankingWindow(dayNumber, false); }

    // Journées dont le classement est affiché en bas de page : { dayNumber: true }
    var openChronoDayRankings = {};

    function renderChronoDayRankingSection(dayNumber) {
        return '<div class="rankings-section" id="chrono-rankings-' + dayNumber + '">' +
            '<div class="rankings-header">' +
            '<div class="rankings-title">🏆 Classements Journée ' + dayNumber + '</div>' +
            '<div class="rankings-toggle" style="flex-wrap: wrap; gap: 5px;">' +
            '<button class="ranking-action-btn" onclick="openChronoDayRankingWindow(' + dayNumber + ')" title="Ouvrir dans une fenêtre (second écran)">📺 Afficher</button>' +
            '<button class="ranking-action-btn" onclick="printChronoDayRanking(' + dayNumber + ')">🖨️ Imprimer</button>' +
            '<button class="ranking-action-btn" onclick="closeChronoDayRanking(' + dayNumber + ')" title="Masquer le classement">✕ Masquer</button>' +
            '</div></div>' +
            '<div style="overflow-x: auto;">' + buildChronoDayRankingHTML(dayNumber, true) + '</div>' +
            '</div>';
    }

    // « 🏆 Classement » : affiche le classement en bas de la journée et y fait défiler
    function showChronoDayRanking(dayNumber) {
        openChronoDayRankings[dayNumber] = true;
        refreshChronoDisplay(dayNumber);
        var section = document.getElementById('chrono-rankings-' + dayNumber);
        if (section) section.scrollIntoView({ behavior: 'smooth' });
    }

    function closeChronoDayRanking(dayNumber) {
        delete openChronoDayRankings[dayNumber];
        var section = document.getElementById('chrono-rankings-' + dayNumber);
        if (section) section.remove();
    }

    global.showChronoDayRanking = showChronoDayRanking;
    global.closeChronoDayRanking = closeChronoDayRanking;
    global.printChronoDayRanking = printChronoDayRanking;
    global.openChronoDayRankingWindow = openChronoDayRankingWindow;
    global.buildChronoDayRankingHTML = buildChronoDayRankingHTML;

    // Fiche d'un club : multisport → points de chaque membre par journée ;
    // natation / courses → chaque épreuve, ses membres classés et celui qui marque.
    function showClubDetail(encodedClub) {
        var clubName = decodeURIComponent(encodedClub);
        var key = clubKey(clubName);
        var existing = document.getElementById('clubDetailModal');
        if (existing) existing.remove();

        var th = function(label, align) { return '<th style="padding:6px 8px; text-align:' + (align || 'center') + ';">' + label + '</th>'; };
        var td = function(value, extra) { return '<td style="padding:6px 8px; text-align:center;' + (extra || '') + '">' + value + '</td>'; };
        var playerLink = function(name) {
            return '<span onclick="closeClubDetail(); showPlayerChronoDetail(\'' + encodeURIComponent(name) + '\')" ' +
                'style="cursor:pointer;" title="Voir la fiche du joueur">' +
                escapeLaneHtml(name) + '</span>';
        };
        var stat = function(label, value) {
            return '<div><div style="font-size:11px;">' + label + '</div><div style="font-size:18px; font-weight:700;">' + value + '</div></div>';
        };
        var summaryBox = function(inner) {
            return '<div style="margin-top:16px; padding:12px; background:linear-gradient(135deg,#5267d0,#764ba2); color:white; border-radius:8px; display:flex; justify-content:space-around; flex-wrap:wrap; gap:8px; text-align:center;">' + inner + '</div>';
        };

        var body = '';
        var mixed = hasChampionshipDays() && hasChronoDays();

        if (mixed) {
            var standings = getMultisportStandings(multisportCategoryFilter);
            var clubs = getMultisportClubStandings(standings);
            var club = clubs.find(function(c) { return clubKey(c.club) === key; });
            if (club) {
                var columns = getMultisportDayColumns();
                body += '<table style="width:100%; border-collapse:collapse; font-size:13px;"><thead><tr style="background:#f4f6fb; color:#34495e;">' +
                    th('Place') + th('Membre', 'left');
                columns.forEach(function(c) { body += th('J' + c.day + ' ' + (c.type === 'courses' ? '🏁' : '⚔️')); });
                body += th('Total') + '</tr></thead><tbody>';
                club.members.forEach(function(m) {
                    body += '<tr style="border-bottom:1px solid #ecf0f1;">' + td(m.rank, ' font-weight:600;') +
                        '<td style="padding:6px 8px;">' + playerLink(m.player) + '</td>';
                    columns.forEach(function(c) {
                        var d = m.days.find(function(x) { return x.day === c.day; });
                        body += !d ? td('–', ' color:#aab;') : td(d.dropped ? '<s style="color:#8a9499;">' + d.points + '</s>' : d.points,
                            '" title="' + (d.type === 'courses' ? 'Place de la journée : ' : 'Place dans la division : ') + d.position);
                    });
                    body += td('<strong>' + m.totalPoints + '</strong>') + '</tr>';
                });
                body += '<tr style="background:#fbfbfd; font-weight:700;">' + '<td colspan="2" style="padding:6px 8px; text-align:right;">Club :</td>';
                columns.forEach(function(c) { body += td(club.perDay[c.day] != null ? club.perDay[c.day] : '–'); });
                body += td(club.totalPoints) + '</tr></tbody></table>';
                var best = club.members[0];
                body += summaryBox(stat('Place du club', club.rank + ' / ' + clubs.length) + stat('Membres classés', club.members.length) +
                    stat('Meilleur membre', escapeLaneHtml(best.player) + ' (' + best.rank + (best.rank === 1 ? 'er' : 'e') + ')') + stat('Total', club.totalPoints));
            }
        } else {
            var events = isSwimmingOnlyCompetition()
                ? calculateEventRankings().filter(function(e) { return !e.fun; })
                : calculateRaceClubEvents();
            var ranking = calculateClubEventRanking(events);
            var clubRow = ranking.find(function(c) { return clubKey(c.club) === key; });
            var multiDay = events.some(function(e) { return e.dayNumber !== (events[0] && events[0].dayNumber); });
            var members = {};
            events.forEach(function(evt) {
                var mine = evt.entries.filter(function(e) { return clubKey(e.club) === key; });
                if (!mine.length) return;
                mine.forEach(function(e) { members[e.name.toLowerCase()] = true; });
                var scorer = mine.find(function(e) { return e.clubPoints != null; });
                body += '<div style="margin:14px 0 6px; font-weight:700; color:#2c3e50; border-bottom:2px solid #5267d0; padding-bottom:4px; display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap;">' +
                    '<span>' + escapeLaneHtml(evt.eventName) + (multiDay ? ' · Journée ' + evt.dayNumber : '') + '</span>' +
                    '<span style="color:#057e68;">' + (scorer ? '+' + scorer.clubPoints + ' pts · ' + scorer.clubRank + (scorer.clubRank === 1 ? 'er' : 'e') + ' club' : '') + '</span></div>';
                body += '<table style="width:100%; border-collapse:collapse; font-size:13px;"><thead><tr style="background:#f4f6fb; color:#34495e;">' +
                    th('Place') + th('Membre', 'left') + th('Temps') + th('Points club') + '</tr></thead><tbody>';
                mine.forEach(function(e) {
                    body += '<tr style="border-bottom:1px solid #ecf0f1;">' + td(e.rank + ' / ' + evt.entries.length, ' font-weight:600;') +
                        '<td style="padding:6px 8px;">' + playerLink(e.name) + '</td>' +
                        td(formatDurationHMS(e.time), ' font-family:monospace; color:#9c5003;') +
                        (e.clubPoints != null ? td('⭐ ' + e.clubPoints, ' font-weight:700; color:#057e68;') : td('–', ' color:#aab;" title="Un club ne marque qu\'avec son meilleur classé')) +
                        '</tr>';
                });
                body += '</tbody></table>';
            });
            if (clubRow) {
                body += summaryBox(stat('Place du club', clubRow.rank + ' / ' + ranking.length) + stat('Membres', Object.keys(members).length) +
                    stat('Épreuves marquées', clubRow.perEvent.filter(function(p) { return p != null; }).length) +
                    stat('1res places', clubRow.wins) + stat('Total', clubRow.total));
            }
        }

        if (!body) body = '<p style="color:#586566; text-align:center; padding:20px;">Aucun résultat trouvé pour ce club.</p>';

        var modal = document.createElement('div');
        modal.id = 'clubDetailModal';
        modal.innerHTML =
            '<div style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; z-index:10000;" onclick="if(event.target===this)closeClubDetail()">' +
            '<div style="background:white; padding:25px; border-radius:10px; max-width:820px; width:94%; max-height:88vh; overflow-y:auto;">' +
            '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">' +
            '<h3 style="margin:0;">🏛️ ' + escapeLaneHtml(clubName) + '</h3>' +
            '<button onclick="closeClubDetail()" aria-label="Fermer" style="border:none; background:#ecf0f1; border-radius:6px; padding:6px 12px; cursor:pointer;">✕</button>' +
            '</div><div style="overflow-x:auto;">' + body + '</div></div></div>';
        document.body.appendChild(modal);
    }
    global.showClubDetail = showClubDetail;

    function closeClubDetail() {
        var m = document.getElementById('clubDetailModal');
        if (m) m.remove();
    }
    global.closeClubDetail = closeClubDetail;

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
            body = '<p style="color:#586566; text-align:center; padding:20px;">✅ Aucune similitude détectée. Les noms semblent déjà harmonisés.</p>';
        } else {
            body = '<p style="color:#586566; font-size:13px;">' + groups.length + ' groupe(s) de noms similaires détecté(s). Choisis le nom final, décoche ce que tu veux ignorer, puis applique.</p>';
            groups.forEach(function(g, gi) {
                var distinct = {};
                g.members.forEach(function(m) { distinct[m.name] = (distinct[m.name] || 0) + m.count; });
                var suggestion = toTitleCase(Object.keys(distinct).sort(function(a, b) { return distinct[b] - distinct[a]; })[0]);

                body += '<div style="border:1px solid #e0e0e0; border-radius:8px; padding:12px; margin:10px 0; background:#fbfbfd;">';
                body += '<label style="display:flex; align-items:center; gap:8px; margin-bottom:8px; font-weight:600; color:#2c3e50;">' +
                    '<input type="checkbox" class="harmo-group-check" data-group="' + gi + '" checked> Fusionner ce groupe</label>';
                body += '<div style="font-size:12px; color:#586566; margin-bottom:8px;">Variantes : ' +
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
                applyParticipantRename(dayNumber, dayData.chronoData, null, oldName, { name: newName });
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
            '<h3>🎯 Nouvelle(s) épreuve(s) - Journée ' + dayNumber + '</h3>' +
            '<div style="margin: 15px 0;">' +
            '<label>Nom(s) : <span style="font-weight: normal; color: #586566; font-size: 12px;">une épreuve par ligne</span></label>' +
            '<textarea id="eventName-' + dayNumber + '" rows="5" style="width: 100%; padding: 10px; margin-top: 5px; box-sizing: border-box; font-family: inherit; resize: vertical;" ' +
            'placeholder="ex :&#10;50m brasse&#10;50m dos&#10;100m nage libre" ' +
            'onkeydown="if (event.key === \'Enter\' && (event.ctrlKey || event.metaKey)) saveEventForDay(' + dayNumber + ')"></textarea>' +
            '<div style="font-size: 11px; color: #566566; margin-top: 4px;">Collez une liste pour tout créer d\'un coup (Ctrl+Entrée pour valider).</div>' +
            '</div>' +
            '<div style="margin: 15px 0;">' +
            '<label>Date :</label>' +
            '<input type="date" id="eventDate-' + dayNumber + '" style="width: 100%; padding: 10px; margin-top: 5px;">' +
            '</div>' +
            '<label style="display: flex; align-items: flex-start; gap: 8px; margin: 15px 0; cursor: pointer;">' +
            '<input type="checkbox" id="eventFun-' + dayNumber + '" style="margin-top: 3px;">' +
            '<span>🎉 Épreuve fun <span style="display: block; font-size: 12px; color: #586566;">Hors classement des clubs (s\'applique à toutes les épreuves saisies)</span></span>' +
            '</label>' +
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

    // Une épreuve par ligne : lignes vides et puces (« - », « • », « * ») ignorées, et une
    // épreuve déjà présente (dans la liste ou dans la journée) n'est pas recréée.
    function saveEventForDay(dayNumber) {
        var nameInput = document.getElementById('eventName-' + dayNumber);
        var dateInput = document.getElementById('eventDate-' + dayNumber);
        var funInput = document.getElementById('eventFun-' + dayNumber);

        var names = (nameInput ? nameInput.value : '').split(/\r?\n/).map(function(line) {
            return line.replace(/^[\s\-•*]+/, '').trim();
        }).filter(Boolean);
        if (names.length === 0) {
            showNotification('Veuillez entrer un nom', 'warning');
            return;
        }

        var chronoData = getChronoDataForDay(dayNumber);
        var seen = {};
        ((chronoData && chronoData.events) || []).forEach(function(e) { seen[String(e.name).toLowerCase()] = true; });
        var created = 0, skipped = 0;
        names.forEach(function(name) {
            var key = name.toLowerCase();
            if (seen[key]) { skipped++; return; }
            seen[key] = true;
            if (addChronoEvent(dayNumber, name, dateInput ? dateInput.value : null, funInput && funInput.checked)) created++;
        });

        if (created === 0) {
            showNotification(names.length === 1 ? '« ' + names[0] + ' » existe déjà' : 'Ces épreuves existent déjà', 'warning');
            return;
        }
        closeEventModalForDay(dayNumber);
        refreshChronoDisplay(dayNumber);
        if (created === 1 && skipped === 0) {
            showNotification('Épreuve créée !', 'success');
        } else {
            showNotification(created + ' épreuve' + (created > 1 ? 's créées' : ' créée')
                + (skipped > 0 ? ' (' + skipped + ' déjà existante' + (skipped > 1 ? 's' : '') + ', ignorée' + (skipped > 1 ? 's' : '') + ')' : ''), 'success');
        }
    }

    // ============================================
    // ÉDITION D'ÉPREUVE
    // ============================================

    function editEventForDay(dayNumber, eventId) {
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
            '<label style="display: flex; align-items: flex-start; gap: 8px; margin: 15px 0; cursor: pointer;">' +
            '<input type="checkbox" id="editEventFun-' + dayNumber + '-' + eventId + '"' + (event.fun ? ' checked' : '') + ' style="margin-top: 3px;">' +
            '<span>🎉 Épreuve fun <span style="display: block; font-size: 12px; color: #586566;">Résultats affichés, mais hors classement des clubs</span></span>' +
            '</label>' +
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
        var funInput = document.getElementById('editEventFun-' + dayNumber + '-' + eventId);
        if (funInput) {
            if (funInput.checked) event.fun = true;
            else delete event.fun;
        }
        
        saveToLocalStorage();
        closeEditEventModal(dayNumber);
        refreshChronoDisplay(dayNumber);
        showNotification('Épreuve mise à jour !', 'success');
    }

    function deleteEventForDay(dayNumber, eventId) {
        var chronoData = getChronoDataForDay(dayNumber);
        if (!chronoData) return;

        var event = chronoData.events.find(function(e) { return e.id === eventId; });
        if (!event) return;

        var seriesCount = getEventSeries(chronoData, event).length;
        var confirmMessage = seriesCount > 0
            ? 'Êtes-vous sûr de vouloir supprimer "' + event.name + '" et ses ' + seriesCount + ' série(s) ?'
            : 'Êtes-vous sûr de vouloir supprimer "' + event.name + '" ?';

        if (!confirm(confirmMessage)) return;

        chronoData.events = chronoData.events.filter(function(e) { return e.id !== eventId; });
        chronoData.series = chronoData.series.filter(function(s) { return s.eventId !== eventId; });

        saveToLocalStorage();
        refreshChronoDisplay(dayNumber);
        showNotification('Épreuve supprimée', 'success');
    }

    function showAddSerieModalForDay(dayNumber) {
        showAddSerieModalForDayAndEvent(dayNumber, null);
    }

    // Réglages proposés pour une nouvelle série d'une épreuve : ceux de sa dernière
    // série (ajout sur place d'une série natation : natation, 50 m, couloirs), sinon
    // déduits de l'épreuve (« 100m Brasse » → natation, 100 m, couloirs).
    function getSerieDefaultsForEvent(chronoData, event) {
        var defaults = { name: '', sportType: 'running', raceType: 'individual', distance: 1000, relayDuration: 60, laneMode: false };
        if (!event) return defaults;

        var series = getEventSeries(chronoData, event);
        var maxNum = series.length;
        series.forEach(function(s) {
            var m = String(s.name || '').match(/S[ée]rie\s*(\d+)/i);
            if (m) maxNum = Math.max(maxNum, parseInt(m[1]));
        });
        defaults.name = 'Série ' + (maxNum + 1);

        var info = typeof deriveSwimmingEventInfo === 'function' ? deriveSwimmingEventInfo(event) : null;
        var last = series[series.length - 1];
        if (last) {
            defaults.sportType = last.sportType || defaults.sportType;
            defaults.raceType = last.raceType || defaults.raceType;
            if (last.relayDuration) defaults.relayDuration = last.relayDuration;
            defaults.laneMode = !!last.laneMode;
            var lastDistance = last.distance || event.distance
                || (defaults.sportType === 'swimming' && info && info.distance);
            if (lastDistance) defaults.distance = lastDistance;
            return defaults;
        }

        // Natation si l'épreuve le dit, sinon si son nom donne une nage ET une distance
        var swimming = event.sportType ? event.sportType === 'swimming'
            : (!!event.laneMode || !!(info && info.stroke && info.distance));
        defaults.sportType = event.sportType || (swimming ? 'swimming' : defaults.sportType);
        if (event.raceType) defaults.raceType = event.raceType;
        // Distance lue dans le nom (« 200m », relais « 4x100m » → 400), natation ou non
        var distance = event.distance || (info && info.distance);
        if (distance) defaults.distance = distance;
        defaults.laneMode = !!event.laneMode || swimming;
        return defaults;
    }

    function showAddSerieModalForDayAndEvent(dayNumber, eventId) {
        if (document.getElementById('serieModal-' + dayNumber)) return;

        var chronoData = getChronoDataForDay(dayNumber);
        var event = chronoData && eventId ? (chronoData.events || []).find(function(e) { return e.id === eventId; }) : null;
        var d = getSerieDefaultsForEvent(chronoData, event);
        function opt(value, label, current) {
            return '<option value="' + value + '"' + (value === current ? ' selected' : '') + '>' + label + '</option>';
        }
        
        var modal = document.createElement('div');
        modal.id = 'serieModal-' + dayNumber;
        modal.innerHTML = 
            '<div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; ' +
            'background: rgba(0,0,0,0.5); display: flex; justify-content: center; ' +
            'align-items: center; z-index: 10000;">' +
            '<div style="background: white; padding: 30px; border-radius: 10px; max-width: 450px; width: 90%; max-height: 90vh; overflow-y: auto;">' +
            '<h3>🏃 Nouvelle série' + (event ? ' — ' + event.name : ' - Journée ' + dayNumber) + '</h3>' +
            '<div style="margin: 15px 0;">' +
            '<label>Nom :</label>' +
            '<input type="text" id="serieName-' + dayNumber + '" value="' + d.name + '" style="width: 100%; padding: 10px; margin-top: 5px;" placeholder="ex: Série 1, Finale A">' +
            '</div>' +
            '<input type="hidden" id="serieEventId-' + dayNumber + '" value="' + (eventId || '') + '">' +
            '<div style="margin: 15px 0;">' +
            '<label>Sport :</label>' +
            '<select id="serieSportType-' + dayNumber + '" style="width: 100%; padding: 10px; margin-top: 5px;">' +
            opt('running', '🏃 Course à pied', d.sportType) +
            opt('cycling', '🚴 Cyclisme', d.sportType) +
            opt('swimming', '🏊 Natation', d.sportType) +
            '</select>' +
            '</div>' +
            '<div style="margin: 15px 0;">' +
            '<label>Type de course :</label>' +
            '<select id="serieRaceType-' + dayNumber + '" style="width: 100%; padding: 10px; margin-top: 5px;" onchange="toggleRelayOptionsForDay(' + dayNumber + ')">' +
            opt('individual', 'Individuelle', d.raceType) +
            opt('relay', 'Relais (durée limitée)', d.raceType) +
            opt('interclub', 'Interclub (par club)', d.raceType) +
            '</select>' +
            '</div>' +
            '<div style="margin: 15px 0;">' +
            '<label>Distance par tour (mètres) :</label>' +
            '<input type="number" id="serieDistance-' + dayNumber + '" value="' + d.distance + '" min="10" style="width: 100%; padding: 10px; margin-top: 5px;">' +
            '</div>' +
            '<div id="relayOptions-' + dayNumber + '" style="margin: 15px 0; display: ' + (d.raceType === 'relay' ? 'block' : 'none') + ';">' +
            '<label>Durée du relais (minutes) :</label>' +
            '<input type="number" id="serieRelayDuration-' + dayNumber + '" value="' + d.relayDuration + '" min="5" style="width: 100%; padding: 10px; margin-top: 5px;">' +
            '</div>' +
            '<div style="margin: 15px 0;">' +
            '<label><input type="checkbox" id="serieLaneMode-' + dayNumber + '"' + (d.laneMode ? ' checked' : '') + '> Mode couloirs (un bouton d\'arrêt par couloir)</label>' +
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

    // Rattacher une série indépendante (créée sans épreuve) à une épreuve : elle est
    // alors affichée sous l'épreuve, imprimée et classée par épreuve.
    function attachSerieToEvent(dayNumber, serieId, eventId) {
        var chronoData = getChronoDataForDay(dayNumber);
        if (!chronoData) return;
        eventId = parseInt(eventId);
        var event = (chronoData.events || []).find(function(e) { return e.id === eventId; });
        var serie = (chronoData.series || []).find(function(s) { return s.id === serieId; });
        if (!event || !serie) return;

        serie.eventId = event.id;
        saveToLocalStorage();
        refreshChronoDisplay(dayNumber);
        showNotification('« ' + serie.name + ' » rattachée à « ' + event.name + ' »', 'success');
    }

    // Supprimer une série (créée par erreur, en trop…), qu'elle soit imbriquée dans son
    // épreuve (génération natation) ou « à plat » (➕ Série). Refusé pendant sa course.
    function deleteSerieForDay(dayNumber, serieId) {
        var chronoData = getChronoDataForDay(dayNumber);
        if (!chronoData) return;
        var serie = findSerieInChronoData(chronoData, serieId);
        if (!serie) return;

        var live = global.raceData && global.raceData.currentSerie;
        if (live && live.id === serieId && live.dayNumber === dayNumber && (live.isRunning || live.status === 'running')) {
            showNotification('Course en cours : terminez-la avant de supprimer la série', 'warning');
            return;
        }

        var participants = serie.participants || [];
        var finished = participants.filter(function(p) { return p.status === 'finished'; }).length;
        var times = Math.max((serie.results || []).length, finished);
        var message = 'Supprimer « ' + serie.name + ' » (' + participants.length + ' participant(s)) ?';
        if (times > 0) message += '\n\n⚠️ Ses ' + times + ' temps seront perdus.';
        if (!confirm(message)) return;

        chronoData.series = (chronoData.series || []).filter(function(s) { return s !== serie; });
        (chronoData.events || []).forEach(function(evt) {
            if (evt.series) evt.series = evt.series.filter(function(s) { return s !== serie; });
        });
        saveToLocalStorage();
        refreshChronoDisplay(dayNumber);
        showNotification('Série supprimée', 'success');
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
            '<input type="text" id="participantCategory-' + dayNumber + '-' + serieId + '" list="categoryListAddToSerie-' + dayNumber + '-' + serieId + '" style="width: 110px; padding: 10px;" placeholder="Catégorie">' +
            buildCategoryDatalist(dayNumber).replace('categoryList-' + dayNumber, 'categoryListAddToSerie-' + dayNumber + '-' + serieId) +
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
            return '<p style="color: #586566; text-align: center;">Aucun participant</p>';
        }

        var html = '<table style="width: 100%; border-collapse: collapse;">';
        html += '<thead><tr style="background: #f8f9fa;"><th style="padding: 10px;">Dossard</th><th style="padding: 10px;">Nom</th><th style="padding: 10px;">Action</th></tr></thead><tbody>';

        serie.participants.forEach(function(p) {
            html += '<tr id="serie-prow-' + dayNumber + '-' + serie.id + '-' + p.id + '" style="border-bottom: 1px solid #ecf0f1;">';
            html += '<td style="padding: 10px; text-align: center;">#' + p.bib + '</td>';
            html += '<td style="padding: 10px;">' +
                (serie.laneMode && p.laneNumber ? '<span style="font-size:11px; background:#08689d; color:white; padding:2px 6px; border-radius:3px; margin-right:6px;">Couloir ' + p.laneNumber + '</span>' : '') +
                p.name +
                (p.club ? '<span style="font-size:11px; background:#057e68; color:white; padding:2px 6px; border-radius:3px; margin-left:6px;">' + p.club + '</span>' : '') +
                (p.category ? '<span style="font-size:11px; background:#8e44ad; color:white; padding:2px 6px; border-radius:3px; margin-left:6px;">' + p.category + '</span>' : '') +
                '</td>';
            html += '<td style="padding: 10px; text-align: center; white-space: nowrap;">' +
                '<button onclick="editSerieParticipant(' + dayNumber + ', ' + serie.id + ', ' + p.id + ')" class="btn btn-sm" style="background:#8b5700; color:white; margin-right:4px;" title="Éditer nom / dossard">✏️</button>' +
                '<button onclick="removeParticipantFromSerie(' + dayNumber + ', ' + serie.id + ', ' + p.id + ')" class="btn btn-sm btn-danger" title="Retirer">🗑️</button>' +
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
        var safeClub = (p.club || '').replace(/"/g, '&quot;');
        var safeCategory = (p.category || '').replace(/"/g, '&quot;');
        row.innerHTML =
            '<td style="padding: 8px; text-align: center;">' +
            '<input type="number" id="edit-spbib-' + dayNumber + '-' + serieId + '-' + participantId + '" value="' + (p.bib != null ? p.bib : '') + '" min="0" style="width: 60px; padding: 6px; border: 1px solid #8b5700; border-radius: 4px; text-align: center;">' +
            '</td>' +
            '<td style="padding: 8px;">' +
            '<input type="text" id="edit-spname-' + dayNumber + '-' + serieId + '-' + participantId + '" value="' + safeName + '" placeholder="Nom" style="width: 100%; padding: 6px; border: 1px solid #8b5700; border-radius: 4px; margin-bottom: 4px;">' +
            '<input type="text" id="edit-spclub-' + dayNumber + '-' + serieId + '-' + participantId + '" value="' + safeClub + '" placeholder="Club" style="width: 100%; padding: 6px; border: 1px solid #8b5700; border-radius: 4px; margin-bottom: 4px;">' +
            '<input type="text" id="edit-spcategory-' + dayNumber + '-' + serieId + '-' + participantId + '" list="categoryListRow-' + dayNumber + '-' + participantId + '" value="' + safeCategory + '" placeholder="Catégorie" style="width: 100%; padding: 6px; border: 1px solid #8b5700; border-radius: 4px;">' +
            buildCategoryDatalist(dayNumber).replace('categoryList-' + dayNumber, 'categoryListRow-' + dayNumber + '-' + participantId) +
            '</td>' +
            '<td style="padding: 8px; text-align: center; white-space: nowrap;">' +
            '<button onclick="saveSerieParticipant(' + dayNumber + ', ' + serieId + ', ' + participantId + ')" class="btn btn-sm" style="background:#017239; color:white; margin-right:4px;" title="Enregistrer">💾</button>' +
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
        var clubEl = document.getElementById('edit-spclub-' + dayNumber + '-' + serieId + '-' + participantId);
        var newClub = clubEl ? clubEl.value.trim() : undefined;
        var categoryEl = document.getElementById('edit-spcategory-' + dayNumber + '-' + serieId + '-' + participantId);
        var newCategory = categoryEl ? categoryEl.value.trim() : undefined;

        applyParticipantRename(dayNumber, chronoData, participantId, p.name,
            editedChanges(p, newName, newBib, newClub, newCategory));

        saveToLocalStorage();
        refreshSerieParticipantsList(dayNumber, serieId);
        refreshChronoDisplay(dayNumber);
        showNotification('Participant mis à jour : ' + newName, 'success');
    }
    global.saveSerieParticipant = saveSerieParticipant;

    function addParticipantToSerie(dayNumber, serieId) {
        var nameInput = document.getElementById('participantName-' + dayNumber + '-' + serieId);
        var bibInput = document.getElementById('participantBib-' + dayNumber + '-' + serieId);
        var categoryInput = document.getElementById('participantCategory-' + dayNumber + '-' + serieId);

        if (!nameInput || !nameInput.value.trim()) {
            showNotification('Veuillez entrer un nom', 'warning');
            return;
        }

        var bib = bibInput && bibInput.value ? parseInt(bibInput.value) : null;
        var category = categoryInput ? categoryInput.value.trim() : '';
        var participant = addChronoParticipant(dayNumber, serieId, nameInput.value.trim(), bib, { category: category });

        if (participant) {
            nameInput.value = '';
            bibInput.value = '';
            if (categoryInput) categoryInput.value = '';
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

    // Retire un participant d'une série (bouton 🗑️ du modal "Gérer les participants")
    function removeParticipantFromSerie(dayNumber, serieId, participantId) {
        var chronoData = getChronoDataForDay(dayNumber);
        if (!chronoData) return;

        var serie = findSerieInChronoData(chronoData, serieId);
        if (!serie) return;

        var participant = (serie.participants || []).find(function(p) { return p.id === participantId; });
        if (!participant) return;

        if (!confirm('Retirer "' + participant.name + '" de cette série ?')) return;

        serie.participants = serie.participants.filter(function(p) { return p.id !== participantId; });
        // Sa ligne de résultat partirait sinon avec lui dans les classements de la série
        removeSerieResultOf(serie, participant);

        saveToLocalStorage();

        var listContainer = document.getElementById('participantsList-' + dayNumber + '-' + serieId);
        if (listContainer) {
            listContainer.innerHTML = renderParticipantsList(serie, dayNumber);
        }

        refreshChronoDisplay(dayNumber);
        showNotification('Participant retiré', 'success');
    }

    // ============================================
    // AFFECTATION MANUELLE DES COULOIRS
    // ============================================

    function escapeLaneHtml(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function computeDefaultLaneCount(serie) {
        var maxLane = 0, placed = 0;
        (serie.participants || []).forEach(function(p) {
            if (p.laneNumber) { placed++; if (p.laneNumber > maxLane) maxLane = p.laneNumber; }
        });
        return Math.max(maxLane, placed, (serie.participants || []).length, 8);
    }

    function assignSerieLanes(dayNumber, serieId) {
        var chronoData = getChronoDataForDay(dayNumber);
        if (!chronoData) return;
        var serie = findSerieInChronoData(chronoData, serieId);
        if (!serie) return;
        if (document.getElementById('laneAssignModal-' + dayNumber)) return;

        var modal = document.createElement('div');
        modal.id = 'laneAssignModal-' + dayNumber;
        modal.innerHTML =
            '<div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); ' +
            'display: flex; justify-content: center; align-items: center; z-index: 10000;" ' +
            'onclick="if(event.target===this)closeLaneAssignModal(' + dayNumber + ')">' +
            '<div id="laneAssignBody-' + dayNumber + '" style="background: white; padding: 24px; border-radius: 10px; max-width: 560px; width: 92%; max-height: 85vh; overflow-y: auto;">' +
            renderLaneAssignBody(dayNumber, serieId, computeDefaultLaneCount(serie)) +
            '</div></div>';
        document.body.appendChild(modal);
    }
    global.assignSerieLanes = assignSerieLanes;

    function renderLaneAssignBody(dayNumber, serieId, laneCount) {
        var chronoData = getChronoDataForDay(dayNumber);
        var serie = findSerieInChronoData(chronoData, serieId);
        if (!serie) return '';
        laneCount = Math.max(1, Math.min(20, laneCount || 8));

        var pool = chronoData.participants || [];

        // Options : tous les « Participants disponibles » de la journée
        function optionsFor(selectedId) {
            var html = '<option value="">— vide —</option>';
            pool.forEach(function(pp) {
                var label = (pp.name && pp.name.trim()) ? pp.name : ('Nageur ' + (pp.bib != null ? pp.bib : '?'));
                if (pp.club) label += ' — ' + pp.club;
                html += '<option value="' + pp.id + '"' + (pp.id === selectedId ? ' selected' : '') + '>' +
                    escapeLaneHtml(label) + '</option>';
            });
            return html;
        }

        // Occupant actuel de chaque couloir (participant de la série ↔ pool, lié par le nom)
        var poolByName = {};
        pool.forEach(function(pp) { poolByName[(pp.name || '').toLowerCase()] = pp; });
        var byLane = {};
        (serie.participants || []).forEach(function(p) {
            if (p.laneNumber) {
                var match = poolByName[(p.name || '').toLowerCase()];
                byLane[p.laneNumber] = match ? match.id : null;
            }
        });

        var html = '';
        html += '<h3 style="margin:0 0 4px 0; color:#057e68;">🏊 Couloirs — ' + escapeLaneHtml(serie.name) + '</h3>';
        html += '<p style="color:#586566; font-size:12px; margin:0 0 14px 0;">Choisis le nageur de chaque couloir dans la liste des « Participants disponibles » de la journée. Les nageurs non placés restent disponibles pour les autres séries.</p>';

        // Nombre de couloirs
        html += '<div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">';
        html += '<label style="font-size:13px; color:#555; font-weight:600;">Nombre de couloirs :</label>';
        html += '<input type="number" id="laneCount-' + dayNumber + '" value="' + laneCount + '" min="1" max="20" style="width:70px; padding:6px; border:1px solid #ddd; border-radius:4px;" onchange="changeLaneCount(' + dayNumber + ', ' + serieId + ')">';
        html += '</div>';

        // Grille des couloirs
        html += '<div style="display:flex; flex-direction:column; gap:6px; margin-bottom:16px;">';
        for (var k = 1; k <= laneCount; k++) {
            var occId = byLane[k];
            html += '<div style="display:flex; align-items:center; gap:8px;">';
            html += '<span style="flex:0 0 78px; font-size:12px; font-weight:600; color:#057e68;">Couloir ' + k + '</span>';
            html += '<select id="laneSel-' + dayNumber + '-' + k + '" style="flex:1; padding:7px; border:1px solid #ddd; border-radius:4px; font-size:13px;">' +
                optionsFor(occId != null ? occId : null) + '</select>';
            html += '<button onclick="editLaneSwimmer(' + dayNumber + ', ' + serieId + ', ' + k + ')" title="Éditer nom / club / dossard" style="flex:0 0 auto; padding:6px 9px; font-size:12px; background:#8b5700; color:white; border:none; border-radius:4px; cursor:pointer;">✏️</button>';
            html += '</div>';
            html += '<div id="laneEdit-' + dayNumber + '-' + k + '"></div>';
        }
        html += '</div>';

        // Coller une liste de noms → pool "Participants disponibles"
        html += '<div style="margin-bottom:14px; padding:10px; background:#f0fbf9; border:1px solid #cdeae4; border-radius:6px;">';
        html += '<label style="display:block; font-size:12px; color:#057e68; font-weight:600; margin-bottom:5px;">➕ Ajouter des nageurs aux Participants disponibles (un nom par ligne) :</label>';
        html += '<textarea id="laneReserve-' + dayNumber + '" rows="3" placeholder="Dupont Jean\nMartin Alice\n…" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px; font-size:13px; box-sizing:border-box;"></textarea>';
        html += '<button onclick="addReserveNamesToSerie(' + dayNumber + ', ' + serieId + ')" style="margin-top:6px; padding:6px 12px; border:none; background:#057e68; color:white; border-radius:4px; cursor:pointer; font-size:12px;">Ajouter à la liste</button>';
        html += '<span style="font-size:11px; color:#586566; margin-left:8px;">Ils apparaîtront dans les listes déroulantes ci-dessus.</span>';
        html += '</div>';

        // Actions
        html += '<div style="display:flex; gap:10px; justify-content:flex-end;">';
        html += '<button onclick="closeLaneAssignModal(' + dayNumber + ')" style="padding:8px 15px; border:1px solid #ddd; background:#f5f5f5; border-radius:4px; cursor:pointer; font-size:13px;">Annuler</button>';
        html += '<button onclick="saveSerieLanes(' + dayNumber + ', ' + serieId + ')" style="padding:8px 15px; border:none; background:#057e68; color:white; border-radius:4px; cursor:pointer; font-size:13px; font-weight:600;">💾 Enregistrer</button>';
        html += '</div>';

        return html;
    }
    global.renderLaneAssignBody = renderLaneAssignBody;

    function changeLaneCount(dayNumber, serieId) {
        var input = document.getElementById('laneCount-' + dayNumber);
        var body = document.getElementById('laneAssignBody-' + dayNumber);
        if (!input || !body) return;
        // Conserver les choix déjà faits dans les couloirs avant de redessiner
        var count = Math.max(1, Math.min(20, parseInt(input.value) || 8));
        var picks = readLaneSelections(dayNumber);
        body.innerHTML = renderLaneAssignBody(dayNumber, serieId, count);
        // Restaurer les sélections
        Object.keys(picks).forEach(function(k) {
            var sel = document.getElementById('laneSel-' + dayNumber + '-' + k);
            if (sel) sel.value = picks[k];
        });
    }
    global.changeLaneCount = changeLaneCount;

    // Lire les sélections courantes { laneNumber: participantId(str) }
    function readLaneSelections(dayNumber) {
        var picks = {};
        for (var k = 1; k <= 20; k++) {
            var sel = document.getElementById('laneSel-' + dayNumber + '-' + k);
            if (sel && sel.value) picks[k] = sel.value;
        }
        return picks;
    }

    function addReserveNamesToSerie(dayNumber, serieId) {
        var ta = document.getElementById('laneReserve-' + dayNumber);
        if (!ta || !ta.value.trim()) { showNotification('Aucun nom à ajouter', 'warning'); return; }
        var chronoData = getChronoDataForDay(dayNumber);
        if (!chronoData) return;
        if (!chronoData.participants) chronoData.participants = [];
        var names = ta.value.split(/\r?\n/).map(function(s) { return s.trim(); }).filter(Boolean);
        var added = 0;
        names.forEach(function(name) {
            var exists = chronoData.participants.some(function(p) {
                return (p.name || '').toLowerCase() === name.toLowerCase();
            });
            if (exists) return;
            chronoData.participants.push({
                id: chronoData.nextParticipantId++,
                name: toTitleCase(name),
                club: '',
                bib: chronoData.participants.length + 1,
                totalTime: null,
                laps: 0
            });
            added++;
        });
        saveToLocalStorage();
        showNotification(added + ' nageur(s) ajouté(s) aux Participants disponibles', 'success');
        // Redessiner en conservant les sélections en cours
        var input = document.getElementById('laneCount-' + dayNumber);
        var count = input ? (parseInt(input.value) || 8) : 8;
        var picks = readLaneSelections(dayNumber);
        var body = document.getElementById('laneAssignBody-' + dayNumber);
        if (body) {
            body.innerHTML = renderLaneAssignBody(dayNumber, serieId, count);
            Object.keys(picks).forEach(function(k) {
                var sel = document.getElementById('laneSel-' + dayNumber + '-' + k);
                if (sel) sel.value = picks[k];
            });
        }
    }
    global.addReserveNamesToSerie = addReserveNamesToSerie;

    // Éditer (inline) le nageur actuellement choisi dans un couloir
    function editLaneSwimmer(dayNumber, serieId, lane) {
        var sel = document.getElementById('laneSel-' + dayNumber + '-' + lane);
        if (!sel || !sel.value) {
            showNotification('Choisis d\'abord un nageur dans ce couloir', 'warning');
            return;
        }
        var chronoData = getChronoDataForDay(dayNumber);
        if (!chronoData) return;
        var pid = parseInt(sel.value);
        var p = (chronoData.participants || []).find(function(x) { return x.id === pid; });
        if (!p) return;
        var wrap = document.getElementById('laneEdit-' + dayNumber + '-' + lane);
        if (!wrap) return;

        var safeName = (p.name || '').replace(/"/g, '&quot;');
        var safeClub = (p.club || '').replace(/"/g, '&quot;');
        wrap.innerHTML =
            '<div style="display:flex; gap:6px; align-items:center; margin:2px 0 6px 86px; flex-wrap:wrap;">' +
            '<input type="number" id="laneEditBib-' + dayNumber + '-' + lane + '" value="' + (p.bib != null ? p.bib : '') + '" min="0" placeholder="#" style="width:52px; padding:5px; border:1px solid #8b5700; border-radius:4px; font-size:12px; text-align:center;">' +
            '<input type="text" id="laneEditName-' + dayNumber + '-' + lane + '" value="' + safeName + '" placeholder="Nom" style="flex:1; min-width:120px; padding:5px; border:1px solid #8b5700; border-radius:4px; font-size:12px;">' +
            '<input type="text" id="laneEditClub-' + dayNumber + '-' + lane + '" value="' + safeClub + '" placeholder="Club" style="width:100px; padding:5px; border:1px solid #8b5700; border-radius:4px; font-size:12px;">' +
            '<button onclick="saveLaneSwimmer(' + dayNumber + ', ' + serieId + ', ' + lane + ', ' + p.id + ')" style="padding:4px 8px; font-size:11px; background:#017239; color:white; border:none; border-radius:4px; cursor:pointer;" title="Enregistrer">💾</button>' +
            '<button onclick="document.getElementById(\'laneEdit-' + dayNumber + '-' + lane + '\').innerHTML=\'\'" style="padding:4px 8px; font-size:11px; background:#566566; color:white; border:none; border-radius:4px; cursor:pointer;" title="Annuler">✖️</button>' +
            '</div>';
        var ni = document.getElementById('laneEditName-' + dayNumber + '-' + lane);
        if (ni) { ni.focus(); ni.select(); }
    }
    global.editLaneSwimmer = editLaneSwimmer;

    function saveLaneSwimmer(dayNumber, serieId, lane, participantId) {
        var chronoData = getChronoDataForDay(dayNumber);
        if (!chronoData) return;
        var p = (chronoData.participants || []).find(function(x) { return x.id === participantId; });
        if (!p) return;

        var nameEl = document.getElementById('laneEditName-' + dayNumber + '-' + lane);
        var bibEl = document.getElementById('laneEditBib-' + dayNumber + '-' + lane);
        var clubEl = document.getElementById('laneEditClub-' + dayNumber + '-' + lane);
        if (!nameEl) return;

        var newName = toTitleCase(nameEl.value.trim());
        if (!newName) { showNotification('Le nom ne peut pas être vide', 'warning'); return; }

        if (nameTakenByOther(chronoData.participants, participantId, p.name, newName)) {
            showNotification('Un participant porte déjà ce nom', 'warning');
            return;
        }

        var newBib = (bibEl && bibEl.value !== '') ? parseInt(bibEl.value, 10) : p.bib;
        var newClub = clubEl ? clubEl.value.trim() : undefined;

        applyParticipantRename(dayNumber, chronoData, participantId, p.name,
            editedChanges(p, newName, newBib, newClub, undefined));
        saveToLocalStorage();

        // Redessiner la modale en conservant les sélections (identifiées par id du pool)
        var input = document.getElementById('laneCount-' + dayNumber);
        var count = input ? (parseInt(input.value) || 8) : 8;
        var picks = readLaneSelections(dayNumber);
        var body = document.getElementById('laneAssignBody-' + dayNumber);
        if (body) {
            body.innerHTML = renderLaneAssignBody(dayNumber, serieId, count);
            Object.keys(picks).forEach(function(k) {
                var s = document.getElementById('laneSel-' + dayNumber + '-' + k);
                if (s) s.value = picks[k];
            });
        }
        refreshChronoDisplay(dayNumber);
        showNotification('Nageur mis à jour : ' + newName, 'success');
    }
    global.saveLaneSwimmer = saveLaneSwimmer;

    function saveSerieLanes(dayNumber, serieId) {
        var chronoData = getChronoDataForDay(dayNumber);
        if (!chronoData) return;
        var serie = findSerieInChronoData(chronoData, serieId);
        if (!serie) return;

        // Source : les « Participants disponibles » de la journée
        var pool = chronoData.participants || [];
        var poolById = {};
        pool.forEach(function(pp) { poolById[pp.id] = pp; });

        // Lire les couloirs + détecter les doublons
        var chosen = [];
        var seen = {};
        var input = document.getElementById('laneCount-' + dayNumber);
        var laneCount = input ? Math.max(1, Math.min(20, parseInt(input.value) || 8)) : 20;
        for (var k = 1; k <= laneCount; k++) {
            var sel = document.getElementById('laneSel-' + dayNumber + '-' + k);
            if (!sel || !sel.value) continue;
            var pid = parseInt(sel.value);
            if (seen[pid]) {
                var dupName = poolById[pid] ? poolById[pid].name : ('#' + pid);
                showNotification('« ' + dupName + ' » est affecté à deux couloirs', 'warning');
                return;
            }
            seen[pid] = true;
            chosen.push({ lane: k, pid: pid });
        }

        // Reconstruire les participants de la série depuis les choix.
        // On réutilise l'objet participant existant (même nom) pour conserver
        // son dossard et d'éventuels résultats ; sinon on crée une copie.
        var existingByName = {};
        (serie.participants || []).forEach(function(sp) {
            existingByName[(sp.name || '').toLowerCase()] = sp;
        });

        var newParticipants = [];
        chosen.forEach(function(c) {
            var src = poolById[c.pid];
            if (!src) return;
            var key = (src.name || '').toLowerCase();
            var sp = existingByName[key];
            if (sp) {
                sp.laneNumber = c.lane;
                delete existingByName[key];
                newParticipants.push(sp);
            } else {
                newParticipants.push({
                    id: chronoData.nextParticipantId++,
                    name: src.name,
                    bib: (src.bib != null ? src.bib : newParticipants.length + 1),
                    club: src.club || '',
                    category: src.category || '',
                    division: src.division || null,
                    laneNumber: c.lane,
                    status: 'ready',
                    totalTime: 0,
                    finishTime: null,
                    laps: [],
                    totalDistance: 0,
                    bestLap: null,
                    lastLapStartTime: 0
                });
            }
        });

        serie.participants = newParticipants;
        serie.laneMode = true;
        saveToLocalStorage();
        closeLaneAssignModal(dayNumber);
        refreshChronoDisplay(dayNumber);
        showNotification(chosen.length + ' nageur(s) placé(s) dans « ' + serie.name + ' »', 'success');
    }
    global.saveSerieLanes = saveSerieLanes;

    function closeLaneAssignModal(dayNumber) {
        var modal = document.getElementById('laneAssignModal-' + dayNumber);
        if (modal) modal.remove();
    }
    global.closeLaneAssignModal = closeLaneAssignModal;

    // Course de cette série en train de tourner (chrono lancé) dans l'écran de course
    function isSerieRaceRunning(dayNumber, serieId) {
        var live = global.raceData && global.raceData.currentSerie;
        return !!(live && live.id === serieId && live.dayNumber === dayNumber && live.isRunning);
    }

    // Retire du cache de course (raceData) l'entrée de cette série : une réouverture
    // (▶️ Course) repart alors de la série de la journée, saisie manuelle comprise.
    // Sinon la progression en cache (sans les temps saisis) reprenait le dessus et
    // « Terminer » réécrivait les résultats.
    function dropSerieFromRaceCache(dayNumber, serieId) {
        var rd = global.raceData;
        if (!rd) return;
        if (rd.series) rd.series = rd.series.filter(function(s) { return !(s.id === serieId && s.dayNumber === dayNumber); });
        (rd.events || []).forEach(function(e) {
            if (e.dayNumber === dayNumber && e.series) e.series = e.series.filter(function(s) { return s.id !== serieId; });
        });
        if (rd.currentSerie && rd.currentSerie.id === serieId && rd.currentDayNumber === dayNumber) {
            rd.currentSerie = null;
            rd.currentSerieId = null;
            rd.currentDayNumber = null;
        }
        if (typeof global.saveChronoToLocalStorage === 'function') global.saveChronoToLocalStorage();
    }

    function enterSerieResults(dayNumber, serieId) {
        var chronoData = getChronoDataForDay(dayNumber);
        if (!chronoData) return;
        
        var serie = findSerieInChronoData(chronoData, serieId);
        if (!serie) return;

        if (isSerieRaceRunning(dayNumber, serieId)) {
            showNotification('Course en cours : arrêtez le chrono avant la saisie manuelle', 'warning');
            return;
        }
        if (document.getElementById('resultsModal-' + dayNumber)) return;

        // Mêmes couloirs que la feuille imprimée et les boutons d'arrêt
        if (serie.laneMode && ensureSerieLanes(serie)) saveToLocalStorage();
        
        var modal = document.createElement('div');
        modal.id = 'resultsModal-' + dayNumber;
        modal.innerHTML = 
            '<div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; ' +
            'background: rgba(0,0,0,0.5); display: flex; justify-content: center; ' +
            'align-items: center; z-index: 10000;" onclick="if(event.target===this)closeResultsModal(' + dayNumber + ')">' +
            '<div style="background: white; padding: 30px; border-radius: 10px; max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto;">' +
            '<h3>⏱️ Saisie des résultats - ' + serie.name + '</h3>' +
            '<p style="color: #586566; font-size: 13px;">Temps (1:02.35, 62.35 ou 1\'02"35), ou DNS / DISQ. Champ vidé = temps retiré. Entrée : ligne suivante.' +
            (serie.laneMode ? ' Lignes dans l\'ordre des couloirs, comme la feuille imprimée.' : '') + '</p>' +
            '<div id="resultsForm-' + dayNumber + '-' + serieId + '">' +
            renderResultsForm(dayNumber, serie) +
            '</div>' +
            '<div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">' +
            '<button onclick="closeResultsModal(' + dayNumber + ')" class="btn btn-secondary">Annuler</button>' +
            '<button onclick="saveSerieResults(' + dayNumber + ', ' + serieId + ')" class="btn btn-primary">💾 Sauvegarder</button>' +
            '</div></div></div>';
        
        document.body.appendChild(modal);
    }

    // Valeur affichée dans le champ : statut DNS/DISQ, sinon le temps existant
    function manualResultFieldValue(p) {
        if (p.status === 'dns') return 'DNS';
        if (p.status === 'disq') return 'DISQ';
        var t = p.finishTime || p.totalTime;
        return t > 0 ? formatTime(t) : '';
    }

    function renderResultsForm(dayNumber, serie) {
        if (!serie.participants || serie.participants.length === 0) {
            return '<p style="color: #586566; text-align: center;">Aucun participant</p>';
        }

        // Mode couloirs : colonne Couloir, lignes dans l'ordre du bassin (comme la feuille
        // imprimée) ; sinon le dossard, dans l'ordre de la série
        var laneMode = !!serie.laneMode;
        var list = laneMode
            ? serie.participants.slice().sort(function(a, b) { return (a.laneNumber || 99) - (b.laneNumber || 99); })
            : serie.participants;
        
        var html = '<table style="width: 100%; border-collapse: collapse;">';
        html += '<thead><tr style="background: #f8f9fa;"><th style="padding: 10px;">' + (laneMode ? 'Couloir' : 'Dossard') + '</th><th style="padding: 10px;">Nom</th><th style="padding: 10px;">Temps</th></tr></thead><tbody>';
        
        list.forEach(function(p) {
            var value = manualResultFieldValue(p);
            html += '<tr style="border-bottom: 1px solid #ecf0f1;">';
            html += '<td style="padding: 10px; text-align: center; font-weight: bold;">' +
                (laneMode ? (p.laneNumber != null ? p.laneNumber : '-') : '#' + p.bib) + '</td>';
            html += '<td style="padding: 10px;">' + p.name + '</td>';
            html += '<td style="padding: 10px;">';
            html += '<input type="text" id="result-time-' + dayNumber + '-' + serie.id + '-' + p.id + '" value="' + value + '" ' +
                'data-initial="' + value + '" onkeydown="manualResultNext(event, this)" ' +
                'style="padding: 8px; width: 120px; border: 1px solid #cbd5e1; border-radius: 4px;" placeholder="1:02.35 / DNS">';
            html += '</td>';
            html += '</tr>';
        });
        
        html += '</tbody></table>';
        return html;
    }

    // Entrée dans un champ de temps : passer au champ de la ligne suivante
    function manualResultNext(event, input) {
        if (!event || event.key !== 'Enter') return;
        event.preventDefault();
        var row = input.closest('tr');
        var next = row && row.nextElementSibling ? row.nextElementSibling.querySelector('input') : null;
        if (next) { next.focus(); next.select(); }
    }

    // Temps saisi à la main, en millisecondes (null si illisible) :
    // « 31.45 », « 31,45 », « 1:02.35 », « 1:02:35 » (h:mm:ss), « 1'02"35 »
    function parseTimeInput(input) {
        if (input == null) return null;
        var s = String(input).trim().replace(/\s+/g, '');
        if (!s) return null;
        function fracMs(f) { return f ? parseInt(String(f).padEnd(3, '0').substring(0, 3), 10) : 0; }

        // Notation natation : 1'02"35, 1'02''35, 1'02
        var q = s.match(/^(\d+)['’](\d{1,2})(?:(?:"|''|”)(\d{1,3})?)?$/);
        if (q) {
            if (+q[2] >= 60) return null;
            return (+q[1]) * 60000 + (+q[2]) * 1000 + fracMs(q[3]);
        }

        s = s.replace(',', '.');
        var parts = s.split(':');
        if (parts.length > 3) return null;
        // Seule la dernière partie peut avoir une décimale
        for (var i = 0; i < parts.length; i++) {
            var re = i === parts.length - 1 ? /^\d+(\.\d{1,3})?$/ : /^\d+$/;
            if (!re.test(parts[i])) return null;
        }
        var last = parts[parts.length - 1].split('.');
        var secMs = (+last[0]) * 1000 + fracMs(last[1]);
        if (parts.length === 1) return secMs;
        if (+last[0] >= 60) return null;
        if (parts.length === 2) return (+parts[0]) * 60000 + secMs;
        if (+parts[1] >= 60) return null;
        return (+parts[0]) * 3600000 + (+parts[1]) * 60000 + secMs;
    }

    // Contenu d'un champ : vide, DNS, DISQ, un temps, ou illisible
    function parseManualResult(text) {
        var t = String(text || '').trim();
        if (!t) return { kind: 'empty' };
        var u = t.toUpperCase().replace(/[\s.]+/g, '');
        if (u === 'DNS') return { kind: 'dns' };
        if (u === 'DISQ' || u === 'DSQ' || u === 'DQ') return { kind: 'disq' };
        var ms = parseTimeInput(t);
        return ms > 0 ? { kind: 'time', ms: ms } : { kind: 'invalid' };
    }

    function removeSerieResultOf(serie, p) {
        serie.results = (serie.results || []).filter(function(r) {
            return !(r.name && p.name && r.name.toLowerCase() === p.name.toLowerCase());
        });
    }

    // Applique une saisie manuelle à un participant. Un temps = une arrivée complète
    // (statut, temps, distance, ligne de résultats avec club et catégorie) : la feuille
    // imprimée, les classements et l'écran de course la voient comme une arrivée au chrono.
    function applyManualResult(serie, p, r, counts) {
        var hadResult = p.status === 'finished' || p.totalTime > 0 || p.finishTime > 0
            || (serie.results || []).some(function(res) { return res.name && p.name && res.name.toLowerCase() === p.name.toLowerCase(); });
        removeSerieResultOf(serie, p);
        if (r.kind === 'time') {
            p.status = 'finished';
            p.totalTime = r.ms;
            p.finishTime = r.ms;
            if (!(p.totalDistance > 0)) p.totalDistance = serie.distance || 0;
            serie.results.push({
                bib: p.bib, name: p.name, club: p.club || '', category: p.category || '',
                time: r.ms, totalDistance: p.totalDistance || 0
            });
            counts.saved++;
        } else if (r.kind === 'dns' || r.kind === 'disq') {
            p.status = r.kind;
            // Un DISQ garde son temps éventuel (disqualification constatée après l'arrivée)
            if (r.kind === 'dns') { p.totalTime = 0; p.finishTime = null; }
            counts[r.kind]++;
        } else {
            if (hadResult || p.status === 'dns' || p.status === 'disq') counts.cleared++;
            p.status = 'ready';
            p.totalTime = 0;
            p.finishTime = null;
            p.totalDistance = 0;
            p.laps = [];
            p.bestLap = null;
        }
    }

    function saveSerieResults(dayNumber, serieId) {
        var chronoData = getChronoDataForDay(dayNumber);
        if (!chronoData) return;
        
        var serie = findSerieInChronoData(chronoData, serieId);
        if (!serie) return;

        if (isSerieRaceRunning(dayNumber, serieId)) {
            showNotification('Course en cours : arrêtez le chrono avant la saisie manuelle', 'warning');
            return;
        }

        var rows = serie.participants.map(function(p) {
            var el = document.getElementById('result-time-' + dayNumber + '-' + serieId + '-' + p.id);
            return el ? { p: p, el: el, r: parseManualResult(el.value) } : null;
        }).filter(Boolean);

        // Une saisie illisible : on n'enregistre rien (plutôt que d'ignorer la ligne en silence)
        var invalid = rows.filter(function(x) { return x.r.kind === 'invalid'; });
        rows.forEach(function(x) { x.el.style.borderColor = x.r.kind === 'invalid' ? '#d03427' : ''; });
        if (invalid.length > 0) {
            showNotification(invalid.length + ' saisie(s) illisible(s) (ex. : 1:02.35, 62.35, DNS, DISQ) : rien n\'est enregistré', 'error');
            invalid[0].el.focus();
            return;
        }

        if (!Array.isArray(serie.results)) serie.results = [];
        var counts = { saved: 0, cleared: 0, dns: 0, disq: 0 };
        rows.forEach(function(x) {
            // Champ inchangé : on ne réécrit pas (précision du chrono, tours), sauf un temps
            // resté « à moitié » (ancienne saisie sans statut d'arrivée)
            var unchanged = x.el.value.trim() === String(x.el.getAttribute('data-initial') || '').trim();
            if (unchanged && !(x.r.kind === 'time' && x.p.status !== 'finished')) return;
            applyManualResult(serie, x.p, x.r, counts);
        });

        // Terminée quand chacun a un temps ou est DNS / DISQ (tout le monde DNS compris)
        if (serieProgress(serie).complete) {
            serie.status = 'completed';
        } else if (serie.status === 'completed') {
            serie.status = 'ready';
        }

        dropSerieFromRaceCache(dayNumber, serieId);
        saveToLocalStorage();
        closeResultsModal(dayNumber);
        refreshChronoDisplay(dayNumber);

        var parts = [counts.saved + ' temps enregistré(s)'];
        if (counts.dns) parts.push(counts.dns + ' DNS');
        if (counts.disq) parts.push(counts.disq + ' DISQ');
        if (counts.cleared) parts.push(counts.cleared + ' temps effacé(s)');
        showNotification(parts.join(', '), 'success');
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
        
        // Une fenêtre déjà ouverte (autre série) est remplacée : avant, le clic ne
        // faisait rien et l'ancien classement restait affiché.
        closeRankingModal(dayNumber);

        var ranking = rankSerieResults(serie);
        var sorted = assignCategoryRanks(ranking.entries);
        var showCategory = sorted.hasMultipleCategories;
        var showClub = sorted.some(function(r) { return r.club; });
        // Relais à durée fixe (ou distances différentes) : la distance départage
        var showDistance = serie.raceType === 'relay' || sorted.some(function(r) { return sorted.length && r.distance !== sorted[0].distance; });
        // Points de série = barème du classement général en Chrono pur seulement ;
        // en natation (classement par épreuve) ou en Multisport (barème par journée),
        // des points par série seraient faux.
        var showPoints = !isMultisportMode() && !isSwimmingOnlyCompetition();
        var esc = escapeLaneHtml;
        var th = 'padding: 10px;';

        var html = '<div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; ' +
            'background: rgba(0,0,0,0.5); display: flex; justify-content: center; ' +
            'align-items: center; z-index: 10000;" onclick="if(event.target===this)closeRankingModal(' + dayNumber + ')">' +
            '<div style="background: white; padding: 30px; border-radius: 10px; max-width: 640px; width: 90%; max-height: 80vh; overflow-y: auto;">' +
            '<h3>🏆 Classement - ' + esc(serie.name) + '</h3>';
        
        if (sorted.length === 0 && ranking.outOfRace.length === 0) {
            html += '<p style="color: #586566; text-align: center;">Aucun résultat</p>';
        } else {
            html += '<table style="width: 100%; border-collapse: collapse; margin-top: 15px;">';
            html += '<thead><tr style="background: #f8f9fa;"><th style="' + th + '">' + (showCategory ? 'Pos. Scratch' : 'Pos') + '</th><th style="' + th + '">Nom</th>' +
                (showClub ? '<th style="' + th + '">Club</th>' : '') +
                (showCategory ? '<th style="' + th + '">Catégorie</th>' : '') +
                (showDistance ? '<th style="' + th + '">Distance</th>' : '') +
                '<th style="' + th + '">Temps</th>' +
                (showPoints ? '<th style="' + th + '">Points</th>' : '') + '</tr></thead><tbody>';

            sorted.forEach(function(result) {
                var rank = result.rank;
                var rankStyle = rank <= 3 ? 'font-weight: bold; color: ' + (rank === 1 ? '#8e7205' : rank === 2 ? '#566566' : '#ae6203') + ';' : '';
                html += '<tr style="border-bottom: 1px solid #ecf0f1;">';
                html += '<td style="padding: 10px; text-align: center; ' + rankStyle + '">' + rank + '</td>';
                html += '<td style="padding: 10px; ' + rankStyle + '">' + esc(result.name) + '</td>';
                if (showClub) html += '<td style="padding: 10px;">' + esc(result.club || '-') + '</td>';
                if (showCategory) {
                    html += '<td style="padding: 10px;">' + esc(result.category || '-') + (result.category ? ' (' + result.catRank + 'e/' + result.catTotal + ')' : '') + '</td>';
                }
                if (showDistance) html += '<td style="padding: 10px; text-align: center;">' + formatDistance(result.distance) + '</td>';
                html += '<td style="padding: 10px; font-family: monospace;">' + formatDurationHMS(result.time) + '</td>';
                if (showPoints) html += '<td style="padding: 10px; text-align: center; font-weight: bold; color: #017239;">+' + calculateChronoPoints(rank) + '</td>';
                html += '</tr>';
            });

            ranking.outOfRace.forEach(function(o) {
                var cols = 3 + (showClub ? 1 : 0) + (showCategory ? 1 : 0) + (showDistance ? 1 : 0) + (showPoints ? 1 : 0);
                html += '<tr style="border-bottom: 1px solid #ecf0f1; color: #566566;">' +
                    '<td style="padding: 10px; text-align: center;">' + (o.status === 'disq' ? 'DISQ' : 'DNS') + '</td>' +
                    '<td style="padding: 10px;">' + esc(o.name) + '</td>' +
                    (showClub ? '<td style="padding: 10px;">' + esc(o.club || '-') + '</td>' : '') +
                    '<td colspan="' + (cols - 2 - (showClub ? 1 : 0)) + '"></td></tr>';
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
            '<p style="color: #586566; font-size: 13px; margin-bottom: 15px;">' +
            'Sélectionnez une journée source pour importer les joueurs. ' +
            'Ils seront automatiquement convertis au format ' + (currentType === 'chrono' ? 'Chrono' : 'Championship') + '.' +
            '</p>';
        
        html += '<div style="margin: 20px 0;">';
        availableDays.forEach(function(day) {
            var typeIcon = day.type === 'chrono' ? '⏱️' : '🏆';
            html += '<div onclick="importPlayersFromDay(' + dayNumber + ', ' + day.dayNumber + ')" ' +
                'style="padding: 12px; margin-bottom: 8px; background: #f8f9fa; border-radius: 8px; cursor: pointer; ' +
                'border: 2px solid transparent; transition: all 0.2s; display: flex; justify-content: space-between; align-items: center;" ' +
                'onmouseover="this.style.borderColor=\'#09679e\'; this.style.background=\'#ebf5fb\';" ' +
                'onmouseout="this.style.borderColor=\'transparent\'; this.style.background=\'#f8f9fa\';">' +
                '<div>' +
                '<strong style="font-size: 14px;">Journée ' + day.dayNumber + '</strong>' +
                '<span style="color: #586566; font-size: 12px; margin-left: 10px;">' + typeIcon + ' ' + (day.type === 'chrono' ? 'Courses' : 'Matchs') + '</span>' +
                '</div>' +
                '<span style="background: #09679e; color: white; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: bold;">' + day.count + ' joueurs</span>' +
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
            var targetDivision = 1; // Courses -> Matchs : pas de division connue, D1 par défaut
            
            // S'assurer que la structure players existe
            if (!targetDay.players) {
                targetDay.players = global.initializeDivisions(global.config?.numberOfDivisions || 3);
            }
            
            if (sourceType === 'championship') {
                // Championship -> Championship : chaque joueur garde sa division
                // (avant : tout le monde atterrissait en D1)
                Object.keys(sourceDay.players || {}).forEach(function(div) {
                    var sourcePlayers = sourceDay.players[div] || [];
                    if (!Array.isArray(sourcePlayers)) return;
                    if (!Array.isArray(targetDay.players[div])) targetDay.players[div] = [];
                    sourcePlayers.forEach(function(player) {
                        var playerName = typeof player === 'object' ? player.name : player;
                        var playerClub = typeof player === 'object' ? (player.club || '') : '';
                        if (!playerName) return;

                        // Déjà inscrit dans la journée cible, quelle que soit sa division ?
                        var exists = Object.keys(targetDay.players).some(function(targetDiv) {
                            return (targetDay.players[targetDiv] || []).some(function(p) {
                                var pName = typeof p === 'object' ? p.name : p;
                                return pName && pName.toLowerCase() === playerName.toLowerCase();
                            });
                        });

                        if (!exists) {
                            targetDay.players[div].push({
                                name: playerName,
                                club: playerClub
                            });
                            importedCount++;
                        } else {
                            skippedCount++;
                        }
                    });
                });
            } else {
                // Chrono -> Championship : convertir les participants
                if (sourceDay.chronoData) {
                    var uniqueNames = {};
                    sourceDay.chronoData.series.forEach(function(serie) {
                        serie.participants.forEach(function(p) {
                            if (!uniqueNames[p.name]) {
                                uniqueNames[p.name] = true;
                                
                                // Déjà inscrit dans la journée cible, quelle que soit sa division ?
                                var exists = Object.keys(targetDay.players).some(function(targetDiv) {
                                    return (targetDay.players[targetDiv] || []).some(function(existing) {
                                        var existingName = typeof existing === 'object' ? existing.name : existing;
                                        return existingName && existingName.toLowerCase() === p.name.toLowerCase();
                                    });
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

    function clearChronoDataForDay(dayNumber) {
        var chronoData = getChronoDataForDay(dayNumber);
        var totalEvents = (chronoData.events || []).length;
        var totalSeries = (chronoData.series || []).length +
            (chronoData.events || []).reduce(function(n, e) { return n + (e.series ? e.series.length : 0); }, 0);
        var totalParticipants = (chronoData.participants || []).length;

        if (totalEvents === 0 && totalSeries === 0 && totalParticipants === 0) {
            showNotification('La journée ' + dayNumber + ' est déjà vide', 'info');
            return;
        }

        var confirmMsg = 'Vider complètement la Journée ' + dayNumber + ' (mode Courses) ?\n\n' +
            'Cela supprimera :\n' +
            '• ' + totalEvents + ' épreuve(s)\n' +
            '• ' + totalSeries + ' série(s)\n' +
            '• ' + totalParticipants + ' participant(s)\n\n' +
            'Cette action est irréversible !';

        if (!confirm(confirmMsg)) return;

        global.championship.days[dayNumber].chronoData = {
            events: [],
            series: [],
            participants: [],
            nextEventId: 1,
            nextSerieId: 1,
            nextParticipantId: 1
        };
        // Compteurs d'id remis à 1 : purger aussi le cache de course live, sinon les
        // prochaines séries reprennent les nageurs/couloirs/temps des anciennes
        if (typeof global.purgeRaceCacheForDay === 'function') global.purgeRaceCacheForDay(dayNumber);

        global.saveToLocalStorage();
        refreshChronoDisplay(dayNumber);
        showNotification('Journée ' + dayNumber + ' (Courses) vidée', 'warning');
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
     * Journées précédentes dont on peut reprendre les participants en un clic :
     * suggérées en tête du menu « 📥 Importer ▾ » d'une journée Courses, la plus
     * récente d'abord. → [{ day, count, type: 'chrono' | 'championship' }]
     */
    function getChronoQuickCopySources(dayNumber) {
        var targetDay = global.championship.days[dayNumber];
        if (!targetDay || targetDay.dayType !== 'chrono') return [];

        return Object.keys(global.championship.days).map(Number)
            .filter(function(d) { return d < dayNumber; })
            .sort(function(a, b) { return b - a; })
            .map(function(prevDay) {
                var sourceDay = global.championship.days[prevDay];
                var count = 0;
                if (sourceDay && sourceDay.dayType === 'chrono') {
                    // Participants uniques (liste de la journée + séries)
                    var uniqueNames = {};
                    var cd = sourceDay.chronoData || {};
                    (cd.participants || []).forEach(function(p) { if (p && p.name) uniqueNames[p.name] = true; });
                    (cd.series || []).forEach(function(serie) {
                        (serie.participants || []).forEach(function(p) { if (p && p.name) uniqueNames[p.name] = true; });
                    });
                    count = Object.keys(uniqueNames).length;
                } else if (sourceDay && sourceDay.players) {
                    Object.keys(sourceDay.players).forEach(function(div) {
                        var players = sourceDay.players[div];
                        if (Array.isArray(players)) count += players.length;
                    });
                }
                return { day: prevDay, count: count, type: sourceDay && sourceDay.dayType === 'chrono' ? 'chrono' : 'championship' };
            })
            .filter(function(src) { return src.count > 0; });
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
    // EXPOSITION SUR WINDOW
    // ============================================

    global.DAY_TYPES = DAY_TYPES;
    global.initMultisport = initMultisport;
    global.setDayType = setDayType;
    global.getDayType = getDayType;
    global.toggleDayType = toggleDayType;
    global.createDayTypeSelector = createDayTypeSelector;
    global.isMultisportMode = isMultisportMode;
    global.updateMultisportTabVisibility = updateMultisportTabVisibility;
    global.initMultisportTab = initMultisportTab;
    global.getChronoDataForDay = getChronoDataForDay;
    global.addChronoEvent = addChronoEvent;
    global.addChronoSerie = addChronoSerie;
    global.addChronoParticipant = addChronoParticipant;
    global.recordChronoResult = recordChronoResult;
    global.renderChronoInterfaceForDay = renderChronoInterfaceForDay;
    global.refreshChronoDisplay = refreshChronoDisplay;
    global.exportChronoDataForDay = exportChronoDataForDay;
    global.importChronoDataForDay = importChronoDataForDay;
    global.clearChronoDataForDay = clearChronoDataForDay;
    global.getChronoQuickCopySources = getChronoQuickCopySources;
    global.quickCopyToChrono = quickCopyToChrono;
    global.calculateMultisportRanking = calculateMultisportRanking;
    global.getMultisportStandings = getMultisportStandings;
    global.getMultisportClubStandings = getMultisportClubStandings;
    global.getMultisportSettings = getMultisportSettings;
    global.setMultisportBareme = setMultisportBareme;
    global.resetMultisportBareme = resetMultisportBareme;
    global.setMultisportBestDays = setMultisportBestDays;
    global.multisportBaremeText = multisportBaremeText;
    global.multisportRulesText = multisportRulesText;
    global.setMultisportCategoryFilter = setMultisportCategoryFilter;
    global.getMultisportCategoryFilter = function() { return multisportCategoryFilter; };
    global.buildMultisportStandingsTable = buildMultisportStandingsTable;
    global.buildMultisportClubTable = buildMultisportClubTable;
    global.exportMultisportRankingCSV = exportMultisportRankingCSV;
    global.getChronoDayMultisportOrder = getChronoDayMultisportOrder;
    global.calculateRaceClubEvents = calculateRaceClubEvents;
    global.buildRaceClubRankingHTML = buildRaceClubRankingHTML;
    global.renderMultisportRanking = renderMultisportRanking;
    global.calculateChronoPoints = calculateChronoPoints;
    global.MULTISPORT_POINTS = MULTISPORT_POINTS;
    global.calculateMultisportPositionPoints = calculateMultisportPositionPoints;
    global.getMatchsDayDivisionOrder = getMatchsDayDivisionOrder;
    global.getChronoDayOrder = getChronoDayOrder;
    global.getChronoResultsForDay = getChronoResultsForDay;
    // Modales
    global.showAddEventModalForDay = showAddEventModalForDay;
    global.closeEventModalForDay = closeEventModalForDay;
    global.saveEventForDay = saveEventForDay;
    global.editEventForDay = editEventForDay;
    global.closeEditEventModal = closeEditEventModal;
    global.saveEditedEvent = saveEditedEvent;
    global.deleteEventForDay = deleteEventForDay;
    global.showImportPlayersModal = showImportPlayersModal;
    global.closeImportPlayersModal = closeImportPlayersModal;
    global.importPlayersFromDay = importPlayersFromDay;
    global.showAddSerieModalForDay = showAddSerieModalForDay;
    global.showAddSerieModalForDayAndEvent = showAddSerieModalForDayAndEvent;
    global.getSerieDefaultsForEvent = getSerieDefaultsForEvent;
    global.attachSerieToEvent = attachSerieToEvent;
    global.deleteSerieForDay = deleteSerieForDay;
    global.closeSerieModalForDay = closeSerieModalForDay;
    global.saveSerieForDay = saveSerieForDay;
    global.toggleRelayOptionsForDay = toggleRelayOptionsForDay;
    global.manageSerieParticipants = manageSerieParticipants;
    global.addParticipantToSerie = addParticipantToSerie;
    global.closeParticipantsModal = closeParticipantsModal;
    global.removeParticipantFromSerie = removeParticipantFromSerie;
    global.renderParticipantsSection = renderParticipantsSection;
    global.showAddParticipantManualModal = showAddParticipantManualModal;
    global.closeAddParticipantsModal = closeAddParticipantsModal;
    global.saveBulkParticipantsForDay = saveBulkParticipantsForDay;
    global.showAddToSerieModal = showAddToSerieModal;
    global.getDaySeriesByEvent = getDaySeriesByEvent;
    global.closeAddToSerieModal = closeAddToSerieModal;
    global.addExistingParticipantToSerie = addExistingParticipantToSerie;
    global.enterSerieResults = enterSerieResults;
    global.saveSerieResults = saveSerieResults;
    global.manualResultNext = manualResultNext;
    global.parseTimeInput = parseTimeInput;
    global.closeResultsModal = closeResultsModal;
    global.showSerieRanking = showSerieRanking;
    global.closeRankingModal = closeRankingModal;
    // Interface de course live
    // Note: startChronoRaceForDay est défini dans script.js et utilise l'ancien système chrono
    // Fonctions de course live sont dans script.js (ancien système chrono global)

})(window);
