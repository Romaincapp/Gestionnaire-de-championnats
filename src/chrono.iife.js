// ============================================
// MODULE CHRONO - Mode Course / Contre la montre
// ============================================
(function(global) {
    'use strict';

    var showNotification = global.showNotification;
    var formatTime = global.formatTime;
    var generateId = global.generateId;

    // Donnees du mode chrono (separe du championnat)
    var raceData = {
        events: [],
        series: [],
        participants: [],
        currentSerie: null,
        nextEventId: 1,
        nextSerieId: 1,
        nextParticipantId: 1
    };

    // ============================================
    // GESTION DE L'INTERFACE CHRONO
    // ============================================

    function toggleChronoMode() {
        var checkbox = document.getElementById('chronoModeCheckbox');
        var chronoSection = document.getElementById('chronoSection');
        var championshipSection = document.getElementById('championshipSection');
        
        if (!checkbox || !chronoSection || !championshipSection) return;
        
        if (checkbox.checked) {
            chronoSection.style.display = 'block';
            championshipSection.style.display = 'none';
            loadChronoData();
        } else {
            chronoSection.style.display = 'none';
            championshipSection.style.display = 'block';
        }
    }

    function loadChronoData() {
        // Charger depuis localStorage
        try {
            var saved = localStorage.getItem('chronoRaceData');
            if (saved) {
                var loaded = JSON.parse(saved);
                raceData.events = loaded.events || [];
                raceData.series = loaded.series || [];
                raceData.participants = loaded.participants || [];
                raceData.nextEventId = loaded.nextEventId || 1;
                raceData.nextSerieId = loaded.nextSerieId || 1;
                raceData.nextParticipantId = loaded.nextParticipantId || 1;
            }
        } catch (e) {
            console.warn('Erreur chargement chrono:', e);
        }
        
        updateChronoDisplay();
    }

    function saveChronoData() {
        try {
            localStorage.setItem('chronoRaceData', JSON.stringify({
                events: raceData.events,
                series: raceData.series,
                participants: raceData.participants,
                nextEventId: raceData.nextEventId,
                nextSerieId: raceData.nextSerieId,
                nextParticipantId: raceData.nextParticipantId
            }));
        } catch (e) {
            console.warn('Erreur sauvegarde chrono:', e);
        }
    }

    function updateChronoDisplay() {
        var container = document.getElementById('chronoContent');
        if (!container) return;
        
        var html = '<div class="chrono-dashboard">';
        
        // Liste des evenements
        html += '<div class="chrono-events">';
        html += '<h3>🎯 Evenements</h3>';
        
        if (raceData.events.length === 0) {
            html += '<p>Aucun evenement. Creez-en un !</p>';
        } else {
            raceData.events.forEach(function(event) {
                html += '<div class="chrono-event-card">';
                html += '<h4>' + event.name + '</h4>';
                html += '<p>' + (event.date || 'Pas de date') + '</p>';
                html += '<button onclick="showAddSerieModalForEvent(' + event.id + ')" class="btn btn-sm">+ Serie</button>';
                html += '</div>';
            });
        }
        
        html += '</div>';
        
        // Liste des series en cours
        html += '<div class="chrono-series">';
        html += '<h3>🏃 Series</h3>';
        
        if (raceData.series.length === 0) {
            html += '<p>Aucune serie.</p>';
        } else {
            raceData.series.forEach(function(serie) {
                html += '<div class="chrono-serie-card ' + (serie.isRunning ? 'running' : '') + '">';
                html += '<h4>' + serie.name + '</h4>';
                html += '<p>Participants: ' + serie.participants.length + '</p>';
                
                if (serie.isRunning) {
                    html += '<span class="chrono-status">EN COURS</span>';
                    html += '<button onclick="continueSerie(' + serie.id + ')" class="btn btn-primary">Reprendre</button>';
                } else {
                    html += '<button onclick="startSerie(' + serie.id + ')" class="btn btn-secondary">Demarrer</button>';
                }
                
                html += '</div>';
            });
        }
        
        html += '</div>';
        html += '</div>';
        
        container.innerHTML = html;
    }

    // ============================================
    // GESTION DES EVENEMENTS
    // ============================================

    function showAddEventModal() {
        if (document.getElementById('eventModal')) return;
        
        var modal = document.createElement('div');
        modal.id = 'eventModal';
        modal.innerHTML = 
            '<div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; ' +
            'background: rgba(0,0,0,0.5); display: flex; justify-content: center; ' +
            'align-items: center; z-index: 10000;" onclick="if(event.target===this)closeEventModal()">' +
            '<div style="background: white; padding: 30px; border-radius: 10px; max-width: 400px; width: 90%;">' +
            '<h3>🎯 Nouvel evenement</h3>' +
            '<div style="margin: 15px 0;">' +
            '<label>Nom :</label>' +
            '<input type="text" id="eventName" style="width: 100%; padding: 10px; margin-top: 5px;">' +
            '</div>' +
            '<div style="margin: 15px 0;">' +
            '<label>Date :</label>' +
            '<input type="date" id="eventDate" style="width: 100%; padding: 10px; margin-top: 5px;">' +
            '</div>' +
            '<div style="display: flex; gap: 10px; justify-content: flex-end;">' +
            '<button onclick="closeEventModal()" class="btn btn-secondary">Annuler</button>' +
            '<button onclick="saveEvent()" class="btn btn-primary">Sauvegarder</button>' +
            '</div></div></div>';
        
        document.body.appendChild(modal);
    }

    function closeEventModal() {
        var modal = document.getElementById('eventModal');
        if (modal) modal.remove();
    }

    function saveEvent() {
        var nameInput = document.getElementById('eventName');
        var dateInput = document.getElementById('eventDate');
        
        if (!nameInput || !nameInput.value.trim()) {
            showNotification('Veuillez entrer un nom', 'warning');
            return;
        }
        
        var event = {
            id: raceData.nextEventId++,
            name: nameInput.value.trim(),
            date: dateInput ? dateInput.value : null,
            createdAt: new Date().toISOString()
        };
        
        raceData.events.push(event);
        saveChronoData();
        closeEventModal();
        updateChronoDisplay();
        
        showNotification('Evenement cree !', 'success');
    }

    // ============================================
    // GESTION DES SERIES
    // ============================================

    function showAddSerieModal() {
        showAddSerieModalForEvent(null);
    }

    function showAddSerieModalForEvent(eventId) {
        if (document.getElementById('serieModal')) return;
        
        var modal = document.createElement('div');
        modal.id = 'serieModal';
        modal.innerHTML = 
            '<div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; ' +
            'background: rgba(0,0,0,0.5); display: flex; justify-content: center; ' +
            'align-items: center; z-index: 10000;" onclick="if(event.target===this)closeSerieModal()">' +
            '<div style="background: white; padding: 30px; border-radius: 10px; max-width: 400px; width: 90%;">' +
            '<h3>🏃 Nouvelle serie</h3>' +
            '<div style="margin: 15px 0;">' +
            '<label>Nom :</label>' +
            '<input type="text" id="serieName" style="width: 100%; padding: 10px; margin-top: 5px;">' +
            '</div>' +
            '<input type="hidden" id="serieEventId" value="' + (eventId || '') + '">' +
            '<div style="display: flex; gap: 10px; justify-content: flex-end;">' +
            '<button onclick="closeSerieModal()" class="btn btn-secondary">Annuler</button>' +
            '<button onclick="saveSerie()" class="btn btn-primary">Sauvegarder</button>' +
            '</div></div></div>';
        
        document.body.appendChild(modal);
    }

    function closeSerieModal() {
        var modal = document.getElementById('serieModal');
        if (modal) modal.remove();
    }

    function saveSerie() {
        var nameInput = document.getElementById('serieName');
        var eventIdInput = document.getElementById('serieEventId');
        
        if (!nameInput || !nameInput.value.trim()) {
            showNotification('Veuillez entrer un nom', 'warning');
            return;
        }
        
        var serie = {
            id: raceData.nextSerieId++,
            name: nameInput.value.trim(),
            eventId: eventIdInput ? parseInt(eventIdInput.value) || null : null,
            participants: [],
            isRunning: false,
            startTime: null,
            currentTime: 0,
            createdAt: new Date().toISOString()
        };
        
        raceData.series.push(serie);
        saveChronoData();
        closeSerieModal();
        updateChronoDisplay();
        
        showNotification('Serie creee !', 'success');
    }

    function startSerie(serieId) {
        var serie = raceData.series.find(function(s) { return s.id === serieId; });
        if (!serie) return;
        
        raceData.currentSerie = serie;
        serie.isRunning = true;
        serie.startTime = Date.now();
        
        // Afficher l'interface de course
        showRaceInterface(serie);
        saveChronoData();
    }

    function continueSerie(serieId) {
        startSerie(serieId);
    }

    // ============================================
    // INTERFACE DE COURSE
    // ============================================

    function showRaceInterface(serie) {
        var container = document.getElementById('chronoContent');
        if (!container) return;
        
        var html = '<div class="race-interface">';
        html += '<h2>' + serie.name + '</h2>';
        html += '<div class="chrono-display" id="mainChronoDisplay">00:00.00</div>';
        
        html += '<div class="race-controls">';
        html += '<button onclick="toggleRaceTimer()" class="btn btn-lg btn-primary">⏯️ Start/Stop</button>';
        html += '<button onclick="endSerie()" class="btn btn-lg btn-danger">🏁 Fin</button>';
        html += '<button onclick="backToSeriesList()" class="btn btn-secondary">⬅️ Retour</button>';
        html += '</div>';
        
        // Liste des participants
        html += '<div class="race-participants">';
        html += '<h3>Participants</h3>';
        
        if (serie.participants.length === 0) {
            html += '<p>Aucun participant.</p>';
            html += '<button onclick="showAddParticipantModal(' + serie.id + ')" class="btn btn-primary">+ Ajouter</button>';
        } else {
            serie.participants.forEach(function(p) {
                html += '<div class="participant-row" id="participant-' + p.bib + '">';
                html += '<span class="bib">#' + p.bib + '</span>';
                html += '<span class="name">' + p.name + '</span>';
                html += '<span class="time" id="time-' + p.bib + '">' + formatTime(p.totalTime || 0) + '</span>';
                html += '<button onclick="recordLap(' + p.bib + ')" class="btn btn-sm">🏁 Tour</button>';
                html += '</div>';
            });
        }
        
        html += '</div>';
        html += '</div>';
        
        container.innerHTML = html;
        
        // Démarrer le timer d'affichage
        if (serie.timerInterval) clearInterval(serie.timerInterval);
        serie.timerInterval = setInterval(function() {
            if (!serie.isRunning || !serie.startTime) return;
            
            var elapsed = Date.now() - serie.startTime;
            var display = document.getElementById('mainChronoDisplay');
            if (display) {
                display.textContent = formatTime(elapsed);
            }
        }, 100);
    }

    function toggleRaceTimer() {
        var serie = raceData.currentSerie;
        if (!serie) return;
        
        if (serie.isRunning) {
            // Pause
            serie.isRunning = false;
            serie.currentTime = Date.now() - serie.startTime;
            if (serie.timerInterval) clearInterval(serie.timerInterval);
            showNotification('Chrono en pause', 'info');
        } else {
            // Reprendre
            serie.isRunning = true;
            serie.startTime = Date.now() - serie.currentTime;
            
            serie.timerInterval = setInterval(function() {
                if (!serie.isRunning || !serie.startTime) return;
                var elapsed = Date.now() - serie.startTime;
                var display = document.getElementById('mainChronoDisplay');
                if (display) display.textContent = formatTime(elapsed);
            }, 100);
            
            showNotification('Chrono reparti !', 'success');
        }
        
        saveChronoData();
    }

    function recordLap(bib) {
        var serie = raceData.currentSerie;
        if (!serie || !serie.isRunning) return;
        
        var participant = serie.participants.find(function(p) { return p.bib === bib; });
        if (!participant) return;
        
        var lapTime = Date.now() - serie.startTime - (participant.totalTime || 0);
        participant.totalTime = (participant.totalTime || 0) + lapTime;
        participant.laps = (participant.laps || 0) + 1;
        
        // Mettre a jour l'affichage
        var timeDisplay = document.getElementById('time-' + bib);
        if (timeDisplay) {
            timeDisplay.textContent = formatTime(participant.totalTime);
        }
        
        saveChronoData();
    }

    function endSerie() {
        var serie = raceData.currentSerie;
        if (!serie) return;
        
        if (!confirm('Terminer cette serie ?')) return;
        
        serie.isRunning = false;
        serie.endTime = new Date().toISOString();
        if (serie.timerInterval) clearInterval(serie.timerInterval);
        
        raceData.currentSerie = null;
        saveChronoData();
        updateChronoDisplay();
        
        showNotification('Serie terminee !', 'success');
    }

    function backToSeriesList() {
        raceData.currentSerie = null;
        updateChronoDisplay();
    }

    // ============================================
    // GESTION DES PARTICIPANTS
    // ============================================

    function showParticipantsManager() {
        showNotification('Gestion des participants - A implementer', 'info');
    }

    // ============================================
    // CLASSEMENTS
    // ============================================

    function showOverallChronoRanking() {
        showNotification('Classement general - A implementer', 'info');
    }

    function showRaceRanking() {
        var serie = raceData.currentSerie;
        if (!serie) return;
        
        var sorted = serie.participants.slice().sort(function(a, b) {
            if (!a.totalTime) return 1;
            if (!b.totalTime) return -1;
            return a.totalTime - b.totalTime;
        });
        
        var html = '<div class="race-ranking">';
        html += '<h3>🏆 Classement ' + serie.name + '</h3>';
        html += '<ol>';
        
        sorted.forEach(function(p, index) {
            html += '<li>';
            html += '<span class="rank">' + (index + 1) + '</span>';
            html += '<span class="name">' + p.name + '</span>';
            html += '<span class="time">' + formatTime(p.totalTime || 0) + '</span>';
            html += '</li>';
        });
        
        html += '</ol>';
        html += '<button onclick="backToSeriesList()" class="btn btn-secondary">Retour</button>';
        html += '</div>';
        
        var container = document.getElementById('chronoContent');
        if (container) container.innerHTML = html;
    }

    // ============================================
    // EXPORT/IMPORT
    // ============================================

    function exportChronoCompetition() {
        var data = JSON.stringify(raceData, null, 2);
        var blob = new Blob([data], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        
        var a = document.createElement('a');
        a.href = url;
        a.download = 'chrono-competition-' + new Date().toISOString().split('T')[0] + '.json';
        a.click();
        
        URL.revokeObjectURL(url);
        showNotification('Competition exportee !', 'success');
    }

    function importChronoCompetition() {
        var input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = function(e) {
            var file = e.target.files[0];
            if (!file) return;
            
            var reader = new FileReader();
            reader.onload = function(event) {
                try {
                    var data = JSON.parse(event.target.result);
                    
                    if (confirm('Remplacer les donnees actuelles ?')) {
                        raceData = {
                            events: data.events || [],
                            series: data.series || [],
                            participants: data.participants || [],
                            currentSerie: null,
                            nextEventId: data.nextEventId || 1,
                            nextSerieId: data.nextSerieId || 1,
                            nextParticipantId: data.nextParticipantId || 1
                        };
                        
                        saveChronoData();
                        updateChronoDisplay();
                        showNotification('Donnees importees !', 'success');
                    }
                } catch (err) {
                    showNotification('Erreur: Fichier invalide', 'error');
                }
            };
            reader.readAsText(file);
        };
        
        input.click();
    }

    function printChronoCompetition() {
        window.print();
    }

    // ============================================
    // EXPOSITION SUR WINDOW
    // ============================================

    global.raceData = raceData;
    global.toggleChronoMode = toggleChronoMode;
    global.showParticipantsManager = showParticipantsManager;
    global.showAddEventModal = showAddEventModal;
    global.closeEventModal = closeEventModal;
    global.saveEvent = saveEvent;
    global.showAddSerieModal = showAddSerieModal;
    global.showAddSerieModalForEvent = showAddSerieModalForEvent;
    global.closeSerieModal = closeSerieModal;
    global.saveSerie = saveSerie;
    global.startSerie = startSerie;
    global.continueSerie = continueSerie;
    global.toggleRaceTimer = toggleRaceTimer;
    global.recordLap = recordLap;
    global.endSerie = endSerie;
    global.backToSeriesList = backToSeriesList;
    global.showRaceRanking = showRaceRanking;
    global.showOverallChronoRanking = showOverallChronoRanking;
    global.exportChronoCompetition = exportChronoCompetition;
    global.importChronoCompetition = importChronoCompetition;
    global.printChronoCompetition = printChronoCompetition;

})(window);
