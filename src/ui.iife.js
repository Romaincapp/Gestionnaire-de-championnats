// ============================================
// MODULE UI - ONGLETS, JOURNÉES, MULTISPORT (IIFE)
// ============================================
(function(global) {
    'use strict';

    var championship = global.championship;
    var config = global.config;
    var showNotification = global.showNotification;
    var formatProperName = global.formatProperName;
    var saveToLocalStorage = function() { if (typeof global.saveToLocalStorage === 'function') global.saveToLocalStorage(); };
    var getNumberOfDivisions = function() { return typeof global.getNumberOfDivisions === 'function' ? global.getNumberOfDivisions() : 3; };
    var getPlayerName = function(p) { return typeof global.getPlayerName === 'function' ? global.getPlayerName(p) : (p || ''); };
    var escapeForOnclick = function(s) { return typeof global.escapeForOnclick === 'function' ? global.escapeForOnclick(s) : s; };
    var initializeDivisions = function(n) { return typeof global.initializeDivisions === 'function' ? global.initializeDivisions(n) : {}; };

    // GESTION DES ONGLETS ET JOURNÉES
    function addNewDay() {
        // Sauvegarder avant toute modification (sécurité)
        saveToLocalStorage();
        
        const existingDays = Object.keys(championship.days).map(Number);
        console.log('Journées existantes:', existingDays);
        
        const newDayNumber = Math.max(...existingDays) + 1;
        const numDivisions = championship.config.numDivisions || 3;

        // Créer la structure dynamique pour le nombre de divisions configuré
        const players = {};
        const matches = {};
        for (let div = 1; div <= numDivisions; div++) {
            players[div] = [];
            matches[div] = [];
        }

        championship.days[newDayNumber] = {
            players: players,
            matches: matches,
            dayType: 'championship', // Par défaut: mode championship
            chronoData: {
                events: [],
                series: [],
                participants: [],
                nextEventId: 1,
                nextSerieId: 1,
                nextParticipantId: 1
            }
        };

        // Initialiser le système de poules pour cette nouvelle journée
        initializePoolSystem(newDayNumber);

        createDayTab(newDayNumber);
        createDayContent(newDayNumber);

        // IMPORTANT : Initialiser l'interface du mode poules après avoir créé le contenu
        if (typeof initializePoolsForDay === 'function') {
            initializePoolsForDay(newDayNumber);
        }

        // Initialiser les sélecteurs de division pour la nouvelle journée
        initializeDivisionSelects();

        updateDaySelectors();
        updateTabsDisplay();
        switchTab(newDayNumber);
        
        // Mettre à jour la visibilité de l'onglet multisport (peut-être qu'on passe en mode mixte)
        if (typeof updateMultisportTabVisibility === 'function') {
            updateMultisportTabVisibility();
        }

        // Restaurer l'état collapsed si présent
        setTimeout(() => {
            restoreCollapseState();
        }, 100);

        // Mettre à jour les boutons de copie rapide pour toutes les journées
        setTimeout(() => {
            Object.keys(championship.days).forEach(dayNum => {
                generateQuickCopyButtons(parseInt(dayNum));
            });
        }, 50);

        saveToLocalStorage();

        showNotification(`Journée ${newDayNumber} créée !`, 'success');
    }
    window.addNewDay = addNewDay;

    function updateDaySelectors() {
        const dayNumbers = Object.keys(championship.days).sort((a, b) => Number(a) - Number(b));
        
        const selectors = ['targetDay', 'fileTargetDay', 'bulkTargetDay'];
        
        selectors.forEach(selectorId => {
            const selector = document.getElementById(selectorId);
            if (selector) {
                const currentValue = selector.value;
                selector.innerHTML = '';
                
                dayNumbers.forEach(dayNum => {
                    const option = document.createElement('option');
                    option.value = dayNum;
                    option.textContent = `→ Journée ${dayNum}`;
                    selector.appendChild(option);
                });
                
                if (dayNumbers.includes(currentValue)) {
                    selector.value = currentValue;
                } else {
                    selector.value = Math.max(...dayNumbers.map(Number)).toString();
                }
            }
        });
    }

    function createDayTab(dayNumber) {
        const tabsContainer = document.getElementById('tabs');
        const addButton = tabsContainer.querySelector('.add-day-btn');
        
        const newTab = document.createElement('button');
        newTab.className = 'tab';
        newTab.onclick = () => switchTab(dayNumber);
        newTab.dataset.day = dayNumber;
        
        if (dayNumber === 1) {
            newTab.innerHTML = `Journée ${dayNumber} <span style="font-size: 10px; opacity: 0.7;">(Hub Central)</span>`;
        } else {
            newTab.innerHTML = `
                Journée ${dayNumber}
                <button class="remove-day" onclick="event.stopPropagation(); removeDay(${dayNumber})" title="Supprimer">×</button>
            `;
        }
        
        tabsContainer.insertBefore(newTab, addButton);
    }

    function createDayContent(dayNumber) {
        // Récupérer le type de journée depuis les données
        const dayData = championship.days[dayNumber];
        const dayType = dayData?.dayType || 'championship';
        
        // Vérifier si le contenu de la journée existe déjà
        const existingDayContent = document.getElementById(`day-${dayNumber}`);
        if (existingDayContent) {
            // Si le contenu existe déjà, le mettre à jour plutôt que de le recréer
            existingDayContent.innerHTML = generateDayContentHTML(dayNumber).replace(/<div class="section">|<\/div>\s*<div class="divisions"|<\/div>\s*<div class="rankings-section"|<\/div>\s*<div class="stats"/g, '');
            // Extraire juste le contenu de la section
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = generateDayContentHTML(dayNumber);
            existingDayContent.innerHTML = tempDiv.innerHTML;
            initializeDivisionsDisplay(dayNumber);
            setTimeout(() => generateQuickCopyButtons(dayNumber), 0);
            
            // S'assurer que le sélecteur a la bonne valeur et mettre à jour l'affichage
            setTimeout(() => {
                const selector = document.getElementById(`day-type-select-${dayNumber}`);
                if (selector) {
                    selector.value = dayType;
                }
                
                // Afficher la bonne section (championship ou chrono)
                const chronoSection = document.getElementById(`chrono-section-${dayNumber}`);
                const championshipSection = document.getElementById(`championship-section-${dayNumber}`);
                
                if (chronoSection && championshipSection) {
                    if (dayType === 'chrono') {
                        chronoSection.style.display = 'block';
                        championshipSection.style.display = 'none';
                    } else {
                        chronoSection.style.display = 'none';
                        championshipSection.style.display = 'block';
                    }
                }
                
                // Rafraîchir l'affichage chrono si nécessaire
                if (dayType === 'chrono' && typeof refreshChronoDisplay === 'function') {
                    const chronoContent = document.getElementById(`chrono-content-${dayNumber}`);
                    if (chronoContent) {
                        chronoContent.innerHTML = renderChronoInterfaceForDay(dayNumber);
                    }
                }
            }, 50);
            return;
        }

        const content = document.querySelector('.content');
        const generalRanking = document.getElementById('general-ranking');

        const dayContent = document.createElement('div');
        dayContent.className = 'tab-content day-content';
        dayContent.id = `day-${dayNumber}`;
        dayContent.innerHTML = generateDayContentHTML(dayNumber);

        content.insertBefore(dayContent, generalRanking);
        initializeDivisionsDisplay(dayNumber);
        setTimeout(() => generateQuickCopyButtons(dayNumber), 0);
    }

    function generateDayContentHTML(dayNumber) {
        // Déterminer le type de journée (sera mis à jour après chargement)
        const dayType = championship.days[dayNumber]?.dayType || 'championship';
        const isChrono = dayType === 'chrono';
        
        return `
            <!-- Sélecteur de type de journée (compact et intelligent) -->
            <div class="day-type-selector" id="day-type-selector-${dayNumber}" style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px; padding: 8px 12px; background: ${isChrono ? 'linear-gradient(135deg, #e67e22 0%, #d35400 100%)' : 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)'}; border-radius: 8px; color: white;">
                <span style="font-size: 13px; font-weight: 500;">${isChrono ? '⏱️' : '🎾'} Mode:</span>
                <select id="day-type-select-${dayNumber}" onchange="handleDayTypeChange(${dayNumber}, this.value)" style="padding: 6px 10px; border-radius: 6px; border: none; font-size: 13px; cursor: pointer; background: rgba(255,255,255,0.95); color: #333; min-width: 140px;">
                    <option value="championship" ${!isChrono ? 'selected' : ''}>🏆 Matchs</option>
                    <option value="chrono" ${isChrono ? 'selected' : ''}>⏱️ Courses</option>
                </select>
                <span id="day-type-label-${dayNumber}" style="font-size: 11px; opacity: 0.9; margin-left: auto;">
                    ${isChrono ? 'Chronométrage' : 'Championnat'}
                </span>
            </div>
            
            <!-- SECTION CHAMPIONSHIP (affichée si type = championship) -->
            <div id="championship-section-${dayNumber}" style="display: ${isChrono ? 'none' : 'block'};">
            <div class="section">
                <h2 style="cursor: pointer; user-select: none; display: flex; align-items: center; gap: 8px;" onclick="toggleDayHub(${dayNumber})">
                    <span id="day-hub-icon-${dayNumber}" class="collapse-icon" style="font-size: 14px; transition: transform 0.3s ease; display: inline-block;">▼</span>
                    <span>👥 Gestion des Joueurs - Journée ${dayNumber}</span>
                </h2>

                <div id="day-hub-content-${dayNumber}">
                <!-- Ligne unique de boutons -->
                <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                    <!-- Ajout joueurs -->
                    <button onclick="showAddPlayerModal(${dayNumber})" style="display: inline-flex; align-items: center; gap: 4px; padding: 8px 12px; font-size: 12px; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
                        ➕ Joueurs
                    </button>
                    <button onclick="showImportPlayersModal(${dayNumber})" style="display: inline-flex; align-items: center; gap: 4px; padding: 8px 10px; font-size: 12px; background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; border-radius: 6px; cursor: pointer; font-weight: 500;">
                        📥 Importer joueurs
                    </button>
                    <!-- Boutons copie rapide -->
                    <span id="quick-copy-buttons-${dayNumber}" style="display: inline-flex; align-items: center; gap: 4px; flex-wrap: wrap;"></span>
                    <!-- Actions matchs -->
                    <button onclick="showMatchGenerationModal(${dayNumber})" style="display: inline-flex; align-items: center; gap: 4px; padding: 8px 12px; font-size: 12px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">
                        🎯 Matchs
                    </button>
                    <button onclick="togglePoolSection(${dayNumber})" id="show-pool-btn-${dayNumber}" style="display: inline-flex; align-items: center; gap: 4px; padding: 8px 12px; font-size: 12px; background: #f59e0b; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">
                        🏊 Poules
                    </button>
                    <button onclick="updateRankingsForDay(${dayNumber})" style="display: inline-flex; align-items: center; gap: 4px; padding: 8px 12px; font-size: 12px; background: #8b5cf6; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">
                        🏆 Classements
                    </button>
                    <button onclick="showByeManagementModal(${dayNumber})" style="display: inline-flex; align-items: center; gap: 4px; padding: 8px 12px; font-size: 12px; background: #14b8a6; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">
                        👋 BYE
                    </button>
                    <button onclick="toggleForfaitButtons()" id="forfait-toggle-btn-${dayNumber}" style="display: inline-flex; align-items: center; gap: 4px; padding: 8px 12px; font-size: 12px; background: #64748b; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">
                        ⚠️ Actions
                    </button>
                    <!-- Séparateur visuel -->
                    <span style="color: #cbd5e1;">|</span>
                    <!-- Actions données -->
                    <button onclick="exportChampionship()" style="display: inline-flex; align-items: center; gap: 4px; padding: 8px 10px; font-size: 12px; background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; border-radius: 6px; cursor: pointer; font-weight: 500;">
                        💾 Exporter
                    </button>
                    <button onclick="showImportModal()" style="display: inline-flex; align-items: center; gap: 4px; padding: 8px 10px; font-size: 12px; background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; border-radius: 6px; cursor: pointer; font-weight: 500;">
                        📥 Importer
                    </button>
                    <button onclick="showPrintOptionsModal(${dayNumber})" style="display: inline-flex; align-items: center; gap: 4px; padding: 8px 10px; font-size: 12px; background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; border-radius: 6px; cursor: pointer; font-weight: 500;" title="Options d'impression (feuilles de match, Boccia, récaps)">
                        🖨️
                    </button>
                    <button onclick="clearDayData(${dayNumber})" style="display: inline-flex; align-items: center; gap: 4px; padding: 8px 10px; font-size: 12px; background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; border-radius: 6px; cursor: pointer; font-weight: 500;">
                        🗑️
                    </button>
                </div>
                <!-- Inputs cachés pour les sélecteurs -->
                <select id="playerDivision-${dayNumber}" style="display: none;"></select>
                <select id="bulkDivision-${dayNumber}" style="display: none;"></select>
                </div><!-- Fin day-hub-content-${dayNumber} -->
            </div>

            <div class="divisions" id="divisions-${dayNumber}">
            </div>
            
            <div class="rankings-section" id="rankings-${dayNumber}" style="display: none;">
                <div class="rankings-header">
                    <div class="rankings-title">🏆 Classements Journée ${dayNumber}</div>
                    <div class="rankings-toggle" style="flex-wrap: wrap; gap: 5px;">
                        <button class="toggle-btn active" onclick="showRankingsForDay(${dayNumber}, 'points')">Par Points</button>
                        <button class="toggle-btn" onclick="showRankingsForDay(${dayNumber}, 'winrate')">Par % Victoires</button>
                        <button class="toggle-btn" onclick="openRankingInNewWindow(${dayNumber})" style="background: linear-gradient(135deg, #9b59b6, #8e44ad); color: white;">📺 Afficher</button>
                        <button class="toggle-btn" onclick="showCompleteDayRanking(${dayNumber})" style="background: linear-gradient(135deg, #27ae60, #2ecc71); color: white;">📊 Complet</button>
                    </div>
                </div>
                <div id="rankingsContent-${dayNumber}"></div>
            </div>
            
            <div class="stats" id="stats-${dayNumber}" style="display: none;">
                <h3>📊 Statistiques Journée ${dayNumber}</h3>
                <div class="stats-grid" id="statsContent-${dayNumber}"></div>
            </div>
            </div><!-- Fin championship-section -->
            
            <!-- SECTION CHRONO (affichée si type = chrono) -->
            <div id="chrono-section-${dayNumber}" style="display: ${isChrono ? 'block' : 'none'};">
                <div class="section" style="background: linear-gradient(135deg, #16a085 0%, #1abc9c 100%);">
                    <h2 style="color: white;">⏱️ Gestion des Courses - Journée ${dayNumber}</h2>
                    <div id="chrono-content-${dayNumber}" style="background: white; padding: 20px; border-radius: 10px; margin-top: 15px;">
                        ${isChrono && typeof renderChronoInterfaceForDay === 'function' ? renderChronoInterfaceForDay(dayNumber) : '<p style="text-align: center; color: #7f8c8d;">Chargement de l\'interface chrono...</p>'}
                    </div>
                </div>
            </div>
        `;
    }

    function removeDay(dayNumber) {
        if (dayNumber === 1) {
            alert('⚠️ Impossible de supprimer la Journée 1 !\n\nLa Journée 1 est le Hub Central pour la gestion des joueurs.\nElle ne peut pas être supprimée.');
            return;
        }
        
        if (Object.keys(championship.days).length <= 1) {
            alert('Vous ne pouvez pas supprimer la dernière journée !');
            return;
        }
        
        if (confirm(`Supprimer définitivement la Journée ${dayNumber} ?\n\nTous les joueurs, matchs et scores seront perdus !`)) {
            delete championship.days[dayNumber];
            
            const tab = document.querySelector(`[data-day="${dayNumber}"]`);
            if (tab) tab.remove();
            
            const dayContent = document.getElementById(`day-${dayNumber}`);
            if (dayContent) dayContent.remove();
            
            const remainingDays = Object.keys(championship.days).map(Number);
            switchTab(Math.min(...remainingDays));
            
            updateDaySelectors();
            saveToLocalStorage();
            showNotification(`Journée ${dayNumber} supprimée`, 'warning');
        }
    }
    window.removeDay = removeDay;

    function switchTab(dayNumber) {
        championship.currentDay = dayNumber;

        // Masquer TOUS les contenus de journées (réinitialiser class ET style inline)
        const allTabContents = document.querySelectorAll('.tab-content');
        allTabContents.forEach(content => {
            content.classList.remove('active');
            content.style.display = 'none';
        });

        // Retirer la classe active de tous les onglets
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });

        // Ajouter la classe active à l'onglet et au contenu ciblés
        const targetTab = document.querySelector(`[data-day="${dayNumber}"]`);
        const targetContent = document.getElementById(`day-${dayNumber}`);

        if (targetTab) targetTab.classList.add('active');
        if (targetContent) {
            targetContent.classList.add('active');
            targetContent.style.display = 'block';
        }
    }
    
    // Fonction pour changer le type de journée sans recharger la page
    // Initialiser le sélecteur de type pour la J1 (HTML statique)
    function initializeDayTypeSelectorForDay1() {
        const dayNumber = 1;
        if (!championship.days[dayNumber]) return;
        
        const dayType = championship.days[dayNumber].dayType || 'championship';
        const isChrono = dayType === 'chrono';
        
        // Mettre à jour le sélecteur
        const selector = document.getElementById(`day-type-selector-${dayNumber}`);
        const select = document.getElementById(`day-type-select-${dayNumber}`);
        const label = document.getElementById(`day-type-label-${dayNumber}`);
        
        if (selector) {
            if (isChrono) {
                selector.style.background = 'linear-gradient(135deg, #e67e22 0%, #d35400 100%)';
            } else {
                selector.style.background = 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)';
            }
        }
        
        if (select) {
            select.value = dayType;
        }
        
        if (label) {
            label.textContent = isChrono ? 'Chronométrage' : 'Championnat';
        }
        
        // Afficher/masquer les sections
        const chronoSection = document.getElementById(`chrono-section-${dayNumber}`);
        const championshipSection = document.getElementById(`championship-section-${dayNumber}`);
        
        if (chronoSection) {
            chronoSection.style.display = isChrono ? 'block' : 'none';
        }
        if (championshipSection) {
            championshipSection.style.display = isChrono ? 'none' : 'block';
        }
        
        // Rafraîchir l'affichage chrono si nécessaire
        if (isChrono && typeof refreshChronoDisplay === 'function') {
            refreshChronoDisplay(dayNumber);
        }
    }
    window.initializeDayTypeSelectorForDay1 = initializeDayTypeSelectorForDay1;

    function handleDayTypeChange(dayNumber, type) {
        // Sauvegarder le nouveau type
        if (!championship.days[dayNumber]) return;
        
        // S'assurer que la structure de données existe
        if (!championship.days[dayNumber].dayType) {
            championship.days[dayNumber].dayType = 'championship';
        }
        
        // Initialiser les données chrono si elles n'existent pas
        if (!championship.days[dayNumber].chronoData) {
            championship.days[dayNumber].chronoData = {
                events: [],
                series: [],
                participants: [],
                nextEventId: 1,
                nextSerieId: 1,
                nextParticipantId: 1
            };
        }
        
        championship.days[dayNumber].dayType = type;
        saveToLocalStorage();
        
        // Mettre à jour l'interface visuelle du sélecteur
        const selector = document.getElementById(`day-type-selector-${dayNumber}`);
        const label = document.getElementById(`day-type-label-${dayNumber}`);
        
        if (selector) {
            if (type === 'chrono') {
                selector.style.background = 'linear-gradient(135deg, #e67e22 0%, #d35400 100%)';
                if (label) label.textContent = 'Chronométrage';
            } else {
                selector.style.background = 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)';
                if (label) label.textContent = 'Championnat';
            }
        }
        
        // Afficher/masquer les sections appropriées
        const chronoSection = document.getElementById(`chrono-section-${dayNumber}`);
        const championshipSection = document.getElementById(`championship-section-${dayNumber}`);
        
        if (chronoSection) {
            chronoSection.style.display = type === 'chrono' ? 'block' : 'none';
        }
        if (championshipSection) {
            championshipSection.style.display = type === 'championship' ? 'block' : 'none';
        }
        
        // Rafraîchir l'affichage chrono si on passe en mode chrono
        if (type === 'chrono' && typeof refreshChronoDisplay === 'function') {
            refreshChronoDisplay(dayNumber);
        }
        
        // Mettre à jour la visibilité de l'onglet multisport
        if (typeof updateMultisportTabVisibility === 'function') {
            updateMultisportTabVisibility();
        }
        
        showNotification(`Mode ${type === 'chrono' ? 'Courses' : 'Matchs'} activé`, 'success');
    }
    window.handleDayTypeChange = handleDayTypeChange;
    window.switchTab = switchTab;

    function switchToGeneralRanking() {
        // Si on est en mode multisport (mix de types), rediriger vers le classement multisport
        if (typeof isMultisportMode === 'function' && isMultisportMode()) {
            switchToMultisportRanking();
            return;
        }
        
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
            // Force le masquage de tous les contenus sauf general-ranking
            if (content.id !== 'general-ranking') {
                content.style.display = 'none';
            }
        });

        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });

        const generalTab = document.querySelector('[data-tab="general"]');
        const generalContent = document.getElementById('general-ranking');

        if (generalTab) generalTab.classList.add('active');
        if (generalContent) {
            generalContent.classList.add('active');
            generalContent.style.display = 'block'; // Force l'affichage
        }

        updateGeneralRanking();
    }
    window.switchToGeneralRanking = switchToGeneralRanking;

    // ============================================
    // FONCTIONS MULTISPORT
    // ============================================

    function switchToMultisportRanking() {
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
            content.style.display = 'none';
        });

        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });

        const multisportTab = document.querySelector('[data-tab="multisport"]');
        const multisportContent = document.getElementById('multisport-ranking');

        if (multisportTab) multisportTab.classList.add('active');
        if (multisportContent) {
            multisportContent.classList.add('active');
            multisportContent.style.display = 'block';
        }

        updateMultisportRanking();
    }
    window.switchToMultisportRanking = switchToMultisportRanking;

    function updateMultisportRanking() {
        const container = document.getElementById('multisportRankingContent');
        if (!container) return;
        
        if (typeof renderMultisportRanking === 'function') {
            container.innerHTML = renderMultisportRanking();
        } else {
            container.innerHTML = '<p style="text-align: center; padding: 40px; color: #7f8c8d;">Module multisport non chargé</p>';
        }
    }
    window.updateMultisportRanking = updateMultisportRanking;

    function toggleMultisportHub() {
        const hub = document.getElementById('multisport-hub-content');
        const icon = document.getElementById('multisport-hub-icon');
        if (hub) {
            if (hub.style.display === 'none') {
                hub.style.display = 'block';
                if (icon) icon.style.transform = 'rotate(0deg)';
            } else {
                hub.style.display = 'none';
                if (icon) icon.style.transform = 'rotate(-90deg)';
            }
        }
    }
    window.toggleMultisportHub = toggleMultisportHub;

    function openMultisportRankingInNewWindow() {
        const ranking = typeof calculateMultisportRanking === 'function' ? calculateMultisportRanking() : {};
        const sorted = Object.values(ranking).sort((a, b) => b.totalPoints - a.totalPoints);
        
        let html = `<!DOCTYPE html>
        <html><head><meta charset="UTF-8"><title>Classement Multisport</title>
        <style>
            body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
            .container { max-width: 1000px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; }
            h1 { text-align: center; color: #667eea; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 15px; }
            td { padding: 12px; text-align: center; border-bottom: 1px solid #eee; }
            tr:nth-child(1) { background: linear-gradient(135deg, #ffd700, #ffed4a); }
            tr:nth-child(2) { background: linear-gradient(135deg, #c0c0c0, #e0e0e0); }
            tr:nth-child(3) { background: linear-gradient(135deg, #cd7f32, #daa520); color: white; }
            .total { font-size: 1.3em; font-weight: bold; color: #27ae60; }
            .club-badge { background: linear-gradient(135deg, #667eea, #764ba2); color: white; font-size: 11px; padding: 3px 10px; border-radius: 12px; }
        </style></head><body>
        <div class="container">
        <h1>🏅 Classement Multisport</h1>
        <table>
        <thead><tr><th>#</th><th>Joueur</th><th>Club</th><th>🎾 Championship</th><th>⏱️ Chrono</th><th>Total</th></tr></thead>
        <tbody>`;
        
        sorted.forEach((stat, index) => {
            const clubBadge = stat.club ? `<span class="club-badge">${stat.club}</span>` : '-';
            html += `<tr>
                <td>${index + 1}</td>
                <td><strong>${stat.player}</strong></td>
                <td>${clubBadge}</td>
                <td>${stat.championshipPoints} pts<br><small>${stat.championshipWins}V/${stat.championshipMatches}J</small></td>
                <td>${stat.chronoPoints} pts<br><small>${stat.chronoSeries} séries</small></td>
                <td class="total">${stat.totalPoints}</td>
            </tr>`;
        });
        
        html += `</tbody></table></div></body></html>`;
        
        const win = window.open('', '_blank');
        win.document.write(html);
        win.document.close();
    }
    window.openMultisportRankingInNewWindow = openMultisportRankingInNewWindow;

    function exportMultisportRanking() {
        const ranking = typeof calculateMultisportRanking === 'function' ? calculateMultisportRanking() : {};
        const dataStr = JSON.stringify(ranking, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'classement-multisport-' + new Date().toISOString().split('T')[0] + '.json';
        a.click();
        
        URL.revokeObjectURL(url);
        showNotification('Classement exporté !', 'success');
    }
    window.exportMultisportRanking = exportMultisportRanking;

    function updateTabsDisplay() {
        const tabsContainer = document.getElementById('tabs');
        if (!tabsContainer) return;
        
        const existingTabs = tabsContainer.querySelectorAll('.tab:not(.general-ranking)');
        
        existingTabs.forEach(tab => {
            if (!tab.classList.contains('add-day-btn')) {
                tab.remove();
            }
        });
        
        const addButton = tabsContainer.querySelector('.add-day-btn');
        const generalTab = tabsContainer.querySelector('.general-ranking');
        
        Object.keys(championship.days).sort((a, b) => Number(a) - Number(b)).forEach(dayNumber => {
            const tab = document.createElement('button');
            tab.className = 'tab';
            if (Number(dayNumber) === championship.currentDay) {
                tab.classList.add('active');
            }
            tab.onclick = () => switchTab(Number(dayNumber));
            tab.dataset.day = dayNumber;
            
            if (Number(dayNumber) === 1) {
                tab.innerHTML = `Journée ${dayNumber}`;
            } else {
                tab.innerHTML = `
                    Journée ${dayNumber}
                    <button class="remove-day" onclick="event.stopPropagation(); removeDay(${dayNumber})" title="Supprimer">×</button>
                `;
            }
            
            tabsContainer.insertBefore(tab, addButton);
        });
    }

    function initializeAllDaysContent() {
        Object.keys(championship.days).forEach(dayNumber => {
            const dayNum = Number(dayNumber);
            // Recréer/mettre à jour le contenu pour TOUTES les journées (y compris J1)
            // Cela garantit que le bon type d'interface est affiché
            createDayContent(dayNum);
            initializeDivisionsDisplay(dayNum);
            updatePlayersDisplay(dayNum);
            updateMatchesDisplay(dayNum);
            updateStats(dayNum);
            
            // Afficher la bonne section selon le type de journée
            const dayData = championship.days[dayNum];
            if (dayData) {
                const dayType = dayData.dayType || 'championship';
                const chronoSection = document.getElementById(`chrono-section-${dayNum}`);
                const championshipSection = document.getElementById(`championship-section-${dayNum}`);
                const selector = document.getElementById(`day-type-select-${dayNum}`);
                
                if (selector) {
                    selector.value = dayType;
                }
                
                if (chronoSection && championshipSection) {
                    chronoSection.style.display = dayType === 'chrono' ? 'block' : 'none';
                    championshipSection.style.display = dayType === 'championship' ? 'block' : 'none';
                }
                
                // Rafraîchir l'affichage chrono si nécessaire (délai pour s'assurer que le DOM est prêt)
                if (dayType === 'chrono' && typeof renderChronoInterfaceForDay === 'function') {
                    setTimeout(() => {
                        const chronoContent = document.getElementById(`chrono-content-${dayNum}`);
                        if (chronoContent) {
                            chronoContent.innerHTML = renderChronoInterfaceForDay(dayNum);
                        }
                    }, 200);
                }
            }
            
            // Générer les boutons de copie rapide
            setTimeout(() => generateQuickCopyButtons(dayNum), 100);
            //nouveau pour les pools
            initializePoolsForDay(dayNum);
        });

        // IMPORTANT: Forcer la mise à jour du contenu HTML pour les journées existantes
        // Cela garantit que les boutons optimisés apparaissent même après un chargement depuis localStorage
    }

    // GÉNÉRATION DES MATCHS

    // Génération et affichage des matchs fournis par matches.iife.js

    // GESTION DES FICHIERS
    function handleFileImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        const targetDay = 1; // Toujours importer dans la journée 1 depuis le formulaire de J1

        // Vérifier si XLSX est disponible
        if (typeof XLSX === 'undefined') {
            alert('La bibliothèque XLSX n\'est pas chargée. Seuls les fichiers CSV sont supportés pour le moment.');

            // Traiter seulement les CSV
            if (!file.name.endsWith('.csv')) {
                alert('Veuillez utiliser un fichier CSV (.csv) pour l\'instant.');
                return;
            }

            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const text = e.target.result;
                    const data = parseCSV(text);
                    importPlayersFromData(data, targetDay);
                } catch (error) {
                    alert('Erreur lors de la lecture du fichier : ' + error.message);
                }
            };
            reader.readAsText(file);
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                let data;
                
                if (file.name.endsWith('.csv')) {
                    const text = e.target.result;
                    data = parseCSV(text);
                } else {
                    const workbook = XLSX.read(e.target.result, { type: 'binary' });
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
                }
                
                importPlayersFromData(data, targetDay);
                
            } catch (error) {
                alert('Erreur lors de la lecture du fichier : ' + error.message);
            }
        };
        
        if (file.name.endsWith('.csv')) {
            reader.readAsText(file);
        } else {
            reader.readAsBinaryString(file);
        }
    }

    function parseCSV(text) {
        const lines = text.split('\n');
        return lines.map(line => {
            return line.split(/[,;]/).map(cell => cell.trim().replace(/^"(.*)"$/, '$1'));
        }).filter(row => row[0] && row[0].trim());
    }

    function importPlayersFromData(data, dayNumber) {
        let imported = 0;
        let errors = [];

        const numDivisions = championship.config?.numberOfDivisions || 3;
        data.forEach((row, index) => {
            if (row.length >= 2) {
                const name = formatProperName(String(row[0]));
                const division = parseInt(row[1]);

                if (name && division >= 1 && division <= numDivisions) {
                    if (!championship.days[dayNumber]) {
                        const players = {};
                        const matches = {};
                        for (let div = 1; div <= numDivisions; div++) {
                            players[div] = [];
                            matches[div] = [];
                        }
                        championship.days[dayNumber] = {
                            players: players,
                            matches: matches
                        };
                    }
                    if (!championship.days[dayNumber].players[division].includes(name)) {
                        championship.days[dayNumber].players[division].push(name);
                        imported++;
                    }
                } else {
                    errors.push(`Ligne ${index + 1}: "${row[0]}" division "${row[1]}" invalide`);
                }
            }
        });
        
        updatePlayersDisplay(dayNumber);
        updateDaySelectors();
        saveToLocalStorage();
        
        let message = `✅ ${imported} joueurs importés vers la Journée ${dayNumber} !`;
        if (errors.length > 0 && errors.length < 5) {
            message += '\n\n⚠️ Erreurs:\n' + errors.slice(0, 5).join('\n');
        } else if (errors.length >= 5) {
            message += `\n\n⚠️ ${errors.length} erreurs détectées. Vérifiez le format.`;
        }
        
        alert(message);
        document.getElementById('fileInput').value = '';
    }

    function copyPlayersFromPreviousDay(dayNumber) {
        // Rediriger vers le nouveau modal d'import qui gère tous les modes
        if (typeof showImportPlayersModal === 'function') {
            showImportPlayersModal(dayNumber);
        } else {
            // Fallback sur l'ancienne méthode si le module n'est pas chargé
            const previousDay = dayNumber - 1;
            if (!championship.days[previousDay]) {
                alert(`Aucune journée ${previousDay} trouvée`);
                return;
            }
            showNotification('Module d\'import non chargé', 'error');
        }
    }
    window.copyPlayersFromPreviousDay = copyPlayersFromPreviousDay;

    /**
     * Démarre une course pour une série d'une journée spécifique (Mode Chrono par jour)
     * Adapte les données du format jour vers le format global de l'ancien système
     */
    function startChronoRaceForDay(dayNumber, serieId) {
        const dayData = championship.days[dayNumber];
        if (!dayData || !dayData.chronoData) {
            showNotification('Données chrono introuvables pour cette journée', 'error');
            return;
        }
        
        const chronoData = dayData.chronoData;
        const serie = chronoData.series.find(s => s.id === serieId);
        if (!serie) {
            showNotification('Série introuvable', 'error');
            return;
        }
        
        if (!serie.participants || serie.participants.length === 0) {
            showNotification('Ajoutez des participants avant de démarrer', 'warning');
            return;
        }
        
        // Préparer la structure pour l'ancien système
        // Créer un événement temporaire si nécessaire
        let event = raceData.events.find(e => e.id === serie.eventId);
        if (!event && serie.eventId) {
            // Chercher dans les événements du jour
            const dayEvent = chronoData.events.find(e => e.id === serie.eventId);
            if (dayEvent) {
                event = {
                    id: dayEvent.id,
                    name: dayEvent.name,
                    date: dayEvent.date,
                    sportType: serie.sportType || 'running',
                    raceType: serie.raceType || 'individual',
                    distance: serie.distance || 1000,
                    relayDuration: serie.relayDuration || 60,
                    interclubPoints: serie.interclubPoints || [10,8,6,5,4,3,2,1],
                    series: []
                };
                raceData.events.push(event);
            }
        }
        
        // Si pas d'événement, créer un événement virtuel pour cette série
        if (!event) {
            event = {
                id: raceData.nextEventId++,
                name: 'Jour ' + dayNumber + ' - ' + serie.name,
                date: new Date().toISOString().split('T')[0],
                sportType: serie.sportType || 'running',
                raceType: serie.raceType || 'individual',
                distance: serie.distance || 1000,
                relayDuration: serie.relayDuration || 60,
                interclubPoints: serie.interclubPoints || [10,8,6,5,4,3,2,1],
                series: []
            };
            raceData.events.push(event);
            serie.eventId = event.id;
        }
        
        // Vérifier si la série existe déjà dans raceData
        let raceSerie = raceData.series.find(s => s.id === serieId && s.eventId === event.id);
        if (!raceSerie) {
            // Créer la série dans le format de l'ancien système
            raceSerie = {
                id: serieId,
                name: serie.name,
                eventId: event.id,
                participants: serie.participants.map(p => ({
                    id: p.id,
                    name: p.name,
                    bib: p.bib,
                    club: p.club || '',
                    category: p.category || '',
                    division: p.division,
                    laneNumber: p.laneNumber,
                    status: p.status || 'ready',
                    totalTime: p.totalTime || 0,
                    finishTime: p.finishTime || null,
                    laps: p.laps || [],
                    totalDistance: p.totalDistance || 0,
                    bestLap: p.bestLap || null,
                    lastLapStartTime: p.lastLapStartTime || 0
                })),
                isRunning: serie.isRunning || false,
                startTime: serie.startTime || null,
                currentTime: serie.currentTime || 0,
                status: serie.status || 'ready',
                laneMode: serie.laneMode || false
            };
            raceData.series.push(raceSerie);
            event.series.push(raceSerie);
        }
        
        // Stocker la référence au jour et série pour la sauvegarde ultérieure
        raceData.currentDayNumber = dayNumber;
        raceData.currentSerieId = serieId;
        
        // Mettre la série comme courante
        raceData.currentSerie = raceSerie;
        
        // Sauvegarder les données de course
        saveChronoToLocalStorage();
        
        // Basculer vers la section chrono globale
        const chronoModeSection = document.getElementById('chronoModeSection');
        // Cacher tous les onglets de journée
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.style.display = 'none';
        });
        
        // Afficher la section chrono
        if (chronoModeSection) {
            chronoModeSection.style.display = 'block';
        }
        
        // Mettre à jour l'onglet actif dans la navigation
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Charger l'affichage des événements puis afficher l'interface de course
        if (typeof displayEventsList === 'function') {
            displayEventsList();
        }
        
        // Afficher l'interface de course
        setTimeout(() => {
            displayRaceInterface(raceSerie);
        }, 100);
        
        showNotification('Course démarrée pour ' + serie.name + ' (Jour ' + dayNumber + ')', 'success');
    }
    window.startChronoRaceForDay = startChronoRaceForDay;

    /**
     * Sauvegarde les résultats de la course vers le stockage par jour
     * Appelée automatiquement quand on termine une course
     */
    function saveRaceResultsToDay() {
        if (!raceData.currentSerie || !raceData.currentDayNumber) return;
        
        const dayNumber = raceData.currentDayNumber;
        const serieId = raceData.currentSerieId;
        const dayData = championship.days[dayNumber];
        
        if (!dayData || !dayData.chronoData) return;
        
        const serie = dayData.chronoData.series.find(s => s.id === serieId);
        if (!serie) return;
        
        const raceSerie = raceData.currentSerie;
        
        // Copier les données modifiées vers le stockage par jour
        serie.isRunning = raceSerie.isRunning;
        serie.startTime = raceSerie.startTime;
        serie.currentTime = raceSerie.currentTime;
        serie.status = raceSerie.status;
        serie.endTime = raceSerie.endTime;
        
        // Copier les participants avec leurs résultats
        serie.participants = raceSerie.participants.map(p => ({
            id: p.id,
            name: p.name,
            bib: p.bib,
            club: p.club || '',
            category: p.category || '',
            division: p.division,
            laneNumber: p.laneNumber,
            status: p.status,
            totalTime: p.totalTime,
            finishTime: p.finishTime,
            laps: p.laps || [],
            totalDistance: p.totalDistance,
            bestLap: p.bestLap,
            lastLapStartTime: p.lastLapStartTime
        }));
        
        // Sauvegarder dans championship
        saveToLocalStorage();
        
        // Nettoyer les références temporaires
        delete raceData.currentDayNumber;
        delete raceData.currentSerieId;
    }
    window.saveRaceResultsToDay = saveRaceResultsToDay;

    /**
     * Génère les boutons de copie rapide "Copier J1", "Copier J2" etc.
     * pour une journée donnée
     */
    function generateQuickCopyButtons(dayNumber) {
        const container = document.getElementById(`quick-copy-buttons-${dayNumber}`);
        if (!container) return;
        
        // Vider le conteneur
        container.innerHTML = '';
        
        // Générer un bouton pour chaque journée précédente
        const allDays = Object.keys(championship.days).map(Number).sort((a, b) => a - b);
        const previousDays = allDays.filter(d => d < dayNumber);
        
        if (previousDays.length === 0) return;
        
        // Ajouter un séparateur visuel si nécessaire
        if (previousDays.length > 0) {
            const sep = document.createElement('span');
            sep.style.color = '#cbd5e1';
            sep.textContent = '|';
            container.appendChild(sep);
        }
        
        previousDays.forEach(prevDay => {
            const btn = document.createElement('button');
            btn.onclick = function() { quickCopyFromDay(dayNumber, prevDay); };
            btn.style.cssText = 'display: inline-flex; align-items: center; gap: 4px; padding: 6px 10px; font-size: 11px; background: #dbeafe; color: #1e40af; border: 1px solid #93c5fd; border-radius: 6px; cursor: pointer; font-weight: 500;';
            btn.title = `Copier tous les joueurs de la Journée ${prevDay}`;
            btn.innerHTML = `📋 J${prevDay}`;
            container.appendChild(btn);
        });
    }
    window.generateQuickCopyButtons = generateQuickCopyButtons;

    /**
     * Copie rapide des joueurs d'une journée à une autre
     */
    function quickCopyFromDay(targetDayNumber, sourceDayNumber) {
        const sourceDay = championship.days[sourceDayNumber];
        const targetDay = championship.days[targetDayNumber];
        
        if (!sourceDay || !targetDay) {
            showNotification('Journée source ou cible introuvable', 'error');
            return;
        }
        
        // Compter les joueurs à copier
        let playersToCopy = 0;
        const numDivisions = championship.config?.numberOfDivisions || 3;
        for (let div = 1; div <= numDivisions; div++) {
            playersToCopy += (sourceDay.players[div] || []).length;
        }
        
        if (playersToCopy === 0) {
            showNotification(`La Journée ${sourceDayNumber} n'a pas de joueurs`, 'warning');
            return;
        }
        
        // Confirmer si joueurs existent déjà
        let existingCount = 0;
        for (let div = 1; div <= numDivisions; div++) {
            existingCount += (targetDay.players[div] || []).length;
        }
        
        let confirmMsg = `Copier ${playersToCopy} joueur(s) de J${sourceDayNumber} vers J${targetDayNumber} ?`;
        if (existingCount > 0) {
            confirmMsg += `\n\n⚠️ Attention : La Journée ${targetDayNumber} a déjà ${existingCount} joueur(s).\nLes doublons seront ignorés.`;
        }
        
        if (!confirm(confirmMsg)) return;
        
        // Effectuer la copie
        let copied = 0;
        let skipped = 0;
        
        for (let div = 1; div <= numDivisions; div++) {
            const sourcePlayers = sourceDay.players[div] || [];
            const targetPlayers = targetDay.players[div] || [];
            
            sourcePlayers.forEach(player => {
                const playerName = typeof player === 'object' ? player.name : player;
                const playerClub = typeof player === 'object' ? (player.club || '') : '';
                
                // Vérifier si déjà présent
                const exists = targetPlayers.some(p => {
                    const pName = typeof p === 'object' ? p.name : p;
                    return pName.toLowerCase() === playerName.toLowerCase();
                });
                
                if (!exists) {
                    targetPlayers.push({
                        name: playerName,
                        club: playerClub
                    });
                    copied++;
                } else {
                    skipped++;
                }
            });
            
            targetDay.players[div] = targetPlayers;
        }
        
        saveToLocalStorage();
        
        // Rafraîchir l'affichage
        if (typeof updatePlayersDisplay === 'function') {
            updatePlayersDisplay(targetDayNumber);
        }
        
        let msg = `${copied} joueur(s) copié(s) de J${sourceDayNumber}`;
        if (skipped > 0) msg += ` (${skipped} doublon(s) ignoré(s))`;
        showNotification(msg, 'success');
    }
    window.quickCopyFromDay = quickCopyFromDay;

    function clearDayData(dayNumber) {
        const dayData = championship.days[dayNumber];
        if (!dayData) return;
        
        let totalPlayers = 0;
        let totalMatches = 0;

        const numDivisions = championship.config?.numberOfDivisions || 3;
        for (let division = 1; division <= numDivisions; division++) {
            totalPlayers += dayData.players[division].length;
            totalMatches += dayData.matches[division].length;
        }
        
        if (totalPlayers === 0 && totalMatches === 0) {
            alert(`La Journée ${dayNumber} est déjà vide`);
            return;
        }
        
        const confirmMsg = `Vider complètement la Journée ${dayNumber} ?\n\n` +
                          `Cela supprimera :\n` +
                          `• ${totalPlayers} joueurs\n` +
                          `• ${totalMatches} matchs\n` +
                          `• Tous les scores\n\n` +
                          `Cette action est irréversible !`;
        
        if (confirm(confirmMsg)) {
            const players = {};
            const matches = {};
            for (let div = 1; div <= numDivisions; div++) {
                players[div] = [];
                matches[div] = [];
            }
            championship.days[dayNumber] = {
                players: players,
                matches: matches
            };
            
            updatePlayersDisplay(dayNumber);
            updateMatchesDisplay(dayNumber);
            updateStats(dayNumber);
            const rankingsEl = document.getElementById(`rankings-${dayNumber}`);
            if (rankingsEl) rankingsEl.style.display = 'none';
            
            saveToLocalStorage();
            showNotification(`Journée ${dayNumber} vidée`, 'warning');
        }
    }
    window.clearDayData = clearDayData;

    function initializeDivisionsDisplay(dayNumber = 1) {
        const divisionsContainer = document.getElementById(`divisions-${dayNumber}`);
        if (!divisionsContainer) return;

        const numDivisions = getNumberOfDivisions();
        const medals = ['🥇', '🥈', '🥉', '🏅', '🎖️', '⭐'];

        let html = '';
        for (let i = 1; i <= numDivisions; i++) {
            const medal = medals[i - 1] || '📊';
            const playersCount = championship.days[dayNumber]?.players[i]?.length || 0;
            html += `
                <div class="division division-${i}">
                    <h3>${medal} Division ${i} <span id="player-count-${dayNumber}-${i}" style="font-size: 14px; color: #7f8c8d; font-weight: normal;">(${playersCount} joueur${playersCount !== 1 ? 's' : ''})</span></h3>
                    <div class="players-list-header" onclick="togglePlayersList(${dayNumber}, ${i})" style="
                        padding: 8px 12px;
                        background: linear-gradient(135deg, #ecf0f1, #d5dbdb);
                        border-radius: 6px;
                        margin-bottom: 10px;
                        cursor: pointer;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        transition: all 0.3s ease;
                    ">
                        <span style="font-weight: 600; color: #2c3e50; font-size: 13px;">👥 Liste des joueurs</span>
                        <span id="players-list-toggle-${dayNumber}-${i}" style="font-size: 12px; color: #7f8c8d;">▼</span>
                    </div>
                    <div class="players-list-container active" id="players-list-container-${dayNumber}-${i}" style="transition: all 0.3s ease;">
                        <div class="players-list" id="division${dayNumber}-${i}-players">
                            <div class="empty-state">Aucun joueur</div>
                        </div>
                    </div>
                    <div class="matches-container" id="division${dayNumber}-${i}-matches"></div>
                </div>
            `;
        }

        divisionsContainer.innerHTML = html;
    }

    // Fonction pour mettre à jour dynamiquement le compteur de joueurs
    function updatePlayerCount(dayNumber, division) {
        const playerCountElement = document.getElementById(`player-count-${dayNumber}-${division}`);
        if (!playerCountElement) return;

        const playersCount = championship.days[dayNumber]?.players[division]?.length || 0;
        playerCountElement.textContent = `(${playersCount} joueur${playersCount !== 1 ? 's' : ''})`;
    }
    window.updatePlayerCount = updatePlayerCount;

})(window);
