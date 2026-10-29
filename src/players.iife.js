// ============================================
// MODULE JOUEURS (IIFE)
// ============================================
(function(global) {
    'use strict';

    var championship = global.championship;
    var showNotification = global.showNotification;
    var formatProperName = global.formatProperName;
    var saveToLocalStorage = function() { if (typeof global.saveToLocalStorage === 'function') global.saveToLocalStorage(); };
    var getNumberOfDivisions = function() { return typeof global.getNumberOfDivisions === 'function' ? global.getNumberOfDivisions() : 3; };
    var getPlayerName = function(p) { return typeof global.getPlayerName === 'function' ? global.getPlayerName(p) : (p || ''); };
    var escapeForOnclick = function(s) { return typeof global.escapeForOnclick === 'function' ? global.escapeForOnclick(s) : s; };
    var initializeDivisions = function(n) { return typeof global.initializeDivisions === 'function' ? global.initializeDivisions(n) : {}; };

    // FONCTIONS DE BASE
    function addPlayer() {
        const name = formatProperName(document.getElementById('playerName').value);
        const division = parseInt(document.getElementById('playerDivision').value);
        const targetDay = 1; // Toujours ajouter à la journée 1 depuis le formulaire de J1

        if (!name || name === '') {
            showNotification('Veuillez entrer un nom de joueur', 'warning');
            return;
        }

        if (!championship.days[targetDay]) {
            const numDivisions = championship.config?.numberOfDivisions || 3;
            const players = {};
            const matches = {};
            for (let div = 1; div <= numDivisions; div++) {
                players[div] = [];
                matches[div] = [];
            }
            championship.days[targetDay] = {
                players: players,
                matches: matches
            };
        }

        if (championship.days[targetDay].players[division].includes(name)) {
            showNotification(`${name} est déjà inscrit en D${division}`, 'warning');
            return;
        }

        championship.days[targetDay].players[division].push(name);
        saveToLocalStorage();
        showNotification(`${name} ajouté à D${division}`, 'success');

        updatePlayersDisplay(targetDay);
        document.getElementById('playerName').value = '';
    }
    window.addPlayer = addPlayer;

    // Fonction pour ajouter un joueur directement depuis une journée spécifique
    function addPlayerToDay(dayNumber) {
        const name = formatProperName(document.getElementById(`playerName-${dayNumber}`).value);
        const division = parseInt(document.getElementById(`playerDivision-${dayNumber}`).value);

        if (!name || name === '') {
            showNotification('Veuillez entrer un nom de joueur', 'warning');
            return;
        }

        if (!championship.days[dayNumber]) {
            const numDivisions = championship.config?.numberOfDivisions || 3;
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

        if (championship.days[dayNumber].players[division].includes(name)) {
            showNotification(`${name} est déjà inscrit en D${division} - J${dayNumber}`, 'warning');
            return;
        }

        championship.days[dayNumber].players[division].push(name);
        saveToLocalStorage();
        showNotification(`${name} ajouté à D${division} - J${dayNumber}`, 'success');

        updatePlayersDisplay(dayNumber);
        document.getElementById(`playerName-${dayNumber}`).value = '';
    }
    window.addPlayerToDay = addPlayerToDay;

    // Fonction pour gérer l'import de fichier depuis une journée spécifique
    function handleFileInputForDay(dayNumber, event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        const fileExtension = file.name.split('.').pop().toLowerCase();

        reader.onload = function(e) {
            try {
                let players = [];

                if (fileExtension === 'csv') {
                    const csvData = e.target.result;
                    const lines = csvData.split('\n').filter(line => line.trim());

                    lines.forEach(line => {
                        const parts = line.split(/[,;]/);
                        const name = formatProperName(parts[0]?.trim());
                        const division = parseInt(parts[1]?.trim()) || 1;
                        if (name) {
                            players.push({ name, division });
                        }
                    });
                } else if (['xlsx', 'xls'].includes(fileExtension)) {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

                    jsonData.forEach(row => {
                        const name = formatProperName(row[0]?.toString()?.trim());
                        const division = parseInt(row[1]) || 1;
                        if (name) {
                            players.push({ name, division });
                        }
                    });
                }

                if (players.length === 0) {
                    showNotification('Aucun joueur trouvé dans le fichier', 'warning');
                    return;
                }

                // Créer la journée si elle n'existe pas
                if (!championship.days[dayNumber]) {
                    const numDivisions = championship.config?.numberOfDivisions || 3;
                    const playersObj = {};
                    const matches = {};
                    for (let div = 1; div <= numDivisions; div++) {
                        playersObj[div] = [];
                        matches[div] = [];
                    }
                    championship.days[dayNumber] = {
                        players: playersObj,
                        matches: matches
                    };
                }

                const numDivisions = championship.config?.numberOfDivisions || 3;
                let added = 0;
                let skipped = 0;

                players.forEach(player => {
                    const div = Math.min(Math.max(player.division, 1), numDivisions);
                    if (!championship.days[dayNumber].players[div].includes(player.name)) {
                        championship.days[dayNumber].players[div].push(player.name);
                        added++;
                    } else {
                        skipped++;
                    }
                });

                saveToLocalStorage();
                updatePlayersDisplay(dayNumber);
                showNotification(`${added} joueur(s) importé(s) dans J${dayNumber}${skipped > 0 ? `, ${skipped} doublon(s) ignoré(s)` : ''}`, 'success');

            } catch (error) {
                console.error('Erreur lors de l\'import:', error);
                showNotification('Erreur lors de la lecture du fichier', 'error');
            }
        };

        if (fileExtension === 'csv') {
            reader.readAsText(file);
        } else {
            reader.readAsArrayBuffer(file);
        }

        // Réinitialiser l'input file pour permettre de réimporter le même fichier
        event.target.value = '';
    }
    window.handleFileInputForDay = handleFileInputForDay;

    // Variable globale pour stocker la journée cible du modal
    let addPlayerModalDayNumber = 1;

    // Fonction pour ouvrir le modal d'ajout de joueurs
    function showAddPlayerModal(dayNumber) {
        addPlayerModalDayNumber = dayNumber;
        const modal = document.getElementById('addPlayerModal');
        const dayLabel = document.getElementById('addPlayerDayLabel');

        dayLabel.textContent = `- Journée ${dayNumber}`;

        // Initialiser les sélecteurs de division
        const numDivisions = championship.config?.numberOfDivisions || 3;
        ['addPlayerDivision'].forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                select.innerHTML = '';
                for (let i = 1; i <= numDivisions; i++) {
                    const option = document.createElement('option');
                    option.value = i;
                    option.textContent = `Division ${i}`;
                    select.appendChild(option);
                }
            }
        });

        // Initialiser le sélecteur de clubs
        const clubSelect = document.getElementById('addPlayerClub');
        if (clubSelect && typeof clubsModule !== 'undefined' && clubsModule.generateClubOptions) {
            clubSelect.innerHTML = clubsModule.generateClubOptions();
        }
        
        // Cacher le champ de club personnalisé
        const clubCustom = document.getElementById('addPlayerClubCustom');
        if (clubCustom) {
            clubCustom.style.display = 'none';
            clubCustom.value = '';
        }

        if (typeof renderAddPlayerClubsPanel === 'function') renderAddPlayerClubsPanel();
        modal.style.display = 'block';
        // Sections secondaires (📥, 🏢) fermées ; la saisie des noms est toujours visible
        document.querySelectorAll('#addPlayerModal .apm-section').forEach(section => section.classList.remove('open'));
        const names = document.getElementById('addPlayerNames');
        if (names) names.focus();
    }
    window.showAddPlayerModal = showAddPlayerModal;

    // Accordéon de la fenêtre : une seule section ouverte à la fois. Un clic sur la
    // section ouverte la referme ; forceOpen l'ouvre toujours.
    // 'add' (et les anciens 'single' / 'bulk') : la saisie des noms, toujours
    // visible — referme les sections et place le curseur dans la liste.
    function toggleAddPlayerSection(name, forceOpen) {
        if (name === 'add' || name === 'single' || name === 'bulk') {
            document.querySelectorAll('#addPlayerModal .apm-section').forEach(section => section.classList.remove('open'));
            const names = document.getElementById('addPlayerNames');
            if (names) names.focus();
            return;
        }
        const target = document.getElementById('apm-section-' + name);
        if (!target) return;
        const open = forceOpen || !target.classList.contains('open');
        document.querySelectorAll('#addPlayerModal .apm-section').forEach(section => section.classList.remove('open'));
        if (!open) return;
        target.classList.add('open');
        const focusId = { clubs: 'apmNewClubName' }[name];
        const field = focusId && document.getElementById(focusId);
        if (field) field.focus();
    }
    window.toggleAddPlayerSection = toggleAddPlayerSection;

    // Section « 📥 Reprendre d'une autre journée » : ouvre la fenêtre d'import entre
    // journées (showImportPlayersModal, multisport) à la place de celle-ci
    function importPlayersFromAddPlayerModal() {
        const dayNumber = addPlayerModalDayNumber;
        closeAddPlayerModal();
        if (typeof showImportPlayersModal === 'function') showImportPlayersModal(dayNumber);
    }
    window.importPlayersFromAddPlayerModal = importPlayersFromAddPlayerModal;

    // Fermer le modal (« Fermer », Échap) : confirmation si des noms tapés n'ont pas été ajoutés
    function closeAddPlayerModal() {
        const names = document.getElementById('addPlayerNames');
        if (names && names.value.trim() && !confirm('Fermer sans ajouter les joueurs tapés ?')) return false;
        document.getElementById('addPlayerModal').style.display = 'none';
        if (names) names.value = '';
        return true;
    }
    window.closeAddPlayerModal = closeAddPlayerModal;

    // Une ligne de la saisie → { name, club }. « Nom », « Nom, Club » ou colonnes
    // collées depuis un tableur (Nom<TAB>Club, colonnes en trop ignorées).
    function parseAddPlayerLine(line) {
        line = String(line || '').trim();
        if (!line) return null;
        const parts = line.split(line.indexOf('\t') !== -1 ? '\t' : ',').map(p => p.trim());
        const name = formatProperName(parts[0] || '');
        return name ? { name, club: parts[1] || '' } : null;
    }
    window.parseAddPlayerLine = parseAddPlayerLine;

    // « ➕ Ajouter » : un nom ou une liste (un par ligne) dans la division choisie.
    // Le club choisi s'applique aux lignes sans club. La fenêtre reste ouverte
    // (curseur dans la liste vidée) pour enchaîner les ajouts un par un.
    function addPlayerFromModal() {
        const textarea = document.getElementById('addPlayerNames');
        const division = parseInt(document.getElementById('addPlayerDivision').value) || 1;
        const dayNumber = addPlayerModalDayNumber;
        const entries = (textarea ? textarea.value : '').split('\n').map(parseAddPlayerLine).filter(Boolean);

        if (entries.length === 0) {
            showNotification('Veuillez entrer au moins un nom de joueur', 'warning');
            if (textarea) textarea.focus();
            return;
        }

        // Club par défaut
        let defaultClub = '';
        let newDefaultClub = false;
        const clubSelect = document.getElementById('addPlayerClub');
        const clubCustom = document.getElementById('addPlayerClubCustom');
        if (clubSelect) {
            if (clubSelect.value === '__custom__' && clubCustom && clubCustom.value.trim()) {
                defaultClub = clubCustom.value.trim();
                newDefaultClub = true; // ajouté à la liste seulement si un joueur est accepté
            } else if (clubSelect.value && clubSelect.value !== '__custom__') {
                defaultClub = clubSelect.value;
            }
        }

        if (!championship.days[dayNumber]) {
            const numDivisions = championship.config?.numberOfDivisions || 3;
            const players = {};
            const matches = {};
            for (let div = 1; div <= numDivisions; div++) {
                players[div] = [];
                matches[div] = [];
            }
            championship.days[dayNumber] = { players, matches };
        }
        const dayPlayers = championship.days[dayNumber].players;
        if (!dayPlayers[division]) dayPlayers[division] = [];

        const exists = (name) => (typeof clubsModule !== 'undefined' && clubsModule.playerExists)
            ? clubsModule.playerExists(dayNumber, division, name)
            : dayPlayers[division].some(p => (typeof p === 'object' ? p.name : p).toLowerCase() === name.toLowerCase());

        const added = [];
        const duplicates = [];
        const lineClubs = [];
        entries.forEach(entry => {
            if (exists(entry.name)) {
                duplicates.push(entry.name);
                return;
            }
            const club = entry.club || defaultClub;
            dayPlayers[division].push({ name: entry.name, club });
            added.push(entry.name + (club ? ' (' + club + ')' : ''));
            if (entry.club) lineClubs.push(entry.club);
        });

        if (added.length) {
            saveToLocalStorage();
            updatePlayersDisplay(dayNumber);
            if (typeof updateDaySelectors === 'function') updateDaySelectors();
        }

        if (added.length === 1) {
            showNotification(`${added[0]} ajouté à D${division}`, 'success');
        } else if (added.length > 1) {
            showNotification(`${added.length} joueurs ajoutés à D${division}`, 'success');
        }
        if (duplicates.length) {
            showNotification(`Déjà inscrit${duplicates.length > 1 ? 's' : ''} en D${division} (ignoré${duplicates.length > 1 ? 's' : ''}) : ${duplicates.join(', ')}`, 'warning');
        }
        if (!added.length) return;

        // Nouveaux clubs (club par défaut saisi, ou « Nom, Club » des lignes) : ajoutés à
        // la liste et visibles tout de suite dans la fenêtre (menu « Club » et section 🏢)
        const known = (typeof clubsModule !== 'undefined' && clubsModule.getClubsList) ? clubsModule.getClubsList() : [];
        const newClubs = (newDefaultClub ? [defaultClub] : []).concat(lineClubs)
            .filter((club, i, all) => all.indexOf(club) === i && known.indexOf(club) === -1);
        if (newClubs.length) {
            if (typeof clubsModule !== 'undefined' && clubsModule.addClub) newClubs.forEach(club => clubsModule.addClub(club));
            if (typeof refreshAddPlayerClubSelect === 'function') refreshAddPlayerClubSelect(newDefaultClub ? defaultClub : (clubSelect ? clubSelect.value : ''));
            if (typeof renderAddPlayerClubsPanel === 'function') renderAddPlayerClubsPanel();
        }

        textarea.value = '';
        textarea.focus();
    }
    window.addPlayerFromModal = addPlayerFromModal;

    // Import fichier depuis le modal
    function handleModalFileInput(event) {
        handleFileInputForDay(addPlayerModalDayNumber, event);
    }
    window.handleModalFileInput = handleModalFileInput;

    // Fonction pour vérifier si un joueur a au moins un match BYE
    function playerHasByeMatch(dayNumber, division, playerName) {
        const dayData = championship.days[dayNumber];
        if (!dayData) return false;

        // Helper pour vérifier si un joueur est un BYE (nom exact 'BYE' ou commence par 'BYE')
        const isByePlayer = (name) => name === 'BYE' || (typeof name === 'string' && name.startsWith('BYE'));

        // Vérifier dans les matchs classiques
        const regularMatches = dayData.matches[division] || [];
        const hasByeInRegular = regularMatches.some(match =>
            (match.player1 === playerName && isByePlayer(match.player2)) ||
            (match.player2 === playerName && isByePlayer(match.player1))
        );

        if (hasByeInRegular) return true;

        // Vérifier dans les matchs de poules
        if (dayData.pools?.enabled && dayData.pools.divisions[division]) {
            const poolMatches = dayData.pools.divisions[division].matches || [];
            const hasByeInPools = poolMatches.some(match =>
                (match.player1 === playerName && isByePlayer(match.player2)) ||
                (match.player2 === playerName && isByePlayer(match.player1))
            );

            if (hasByeInPools) return true;
        }

        // Vérifier dans la phase finale
        if (dayData.pools?.divisions[division]?.finalPhase) {
            const finalMatches = dayData.pools.divisions[division].finalPhase || [];
            const hasByeInFinal = finalMatches.some(match =>
                (match.player1 === playerName && isByePlayer(match.player2)) ||
                (match.player2 === playerName && isByePlayer(match.player1))
            );

            if (hasByeInFinal) return true;
        }

        return false;
    }
    window.playerHasByeMatch = playerHasByeMatch;

    function updatePlayersDisplay(dayNumber) {
        if (!championship.days[dayNumber]) return;

        const numDivisions = championship.config?.numberOfDivisions || 3;
        for (let division = 1; division <= numDivisions; division++) {
            const container = document.getElementById(`division${dayNumber}-${division}-players`);
            if (!container) continue;

            const players = championship.days[dayNumber].players[division];

            container.innerHTML = players.length === 0
                ? '<div class="empty-state">Aucun joueur</div>'
                : renderPlayerTable(dayNumber, division, players);

            // Mettre à jour le compteur de joueurs dynamiquement
            updatePlayerCount(dayNumber, division);
        }
    }
    window.updatePlayersDisplay = updatePlayersDisplay;

    // ----- Liste des joueurs en tableau (façon « data table ») -----
    // Colonne de sélection (cases à cocher + « tout sélectionner »), Joueur, Club,
    // et un bouton « ⋯ » par ligne qui ouvre le menu d'actions (toggleActionMenu).
    // La sélection et le filtre vivent dans le DOM : un re-rendu les remet à zéro.
    function playerNameAndClub(player) {
        if (typeof player === 'object' && player !== null) return { name: player.name || '', club: player.club || '' };
        return { name: String(player), club: '' };
    }

    function renderPlayerTable(dayNumber, division, players) {
        const rows = players.map((player, index) => {
            const { name, club } = playerNameAndClub(player);
            const attrName = escapeHtmlAttr(name);
            const onclickName = escapeHtmlAttr(escapeForOnclick(name));
            const bye = playerHasByeMatch(dayNumber, division, name)
                ? ' <span class="pt-badge" title="A au moins un match BYE">BYE</span>' : '';
            return `<tr data-name="${attrName}" data-order="${index}">
                    <td class="pt-select"><input type="checkbox" aria-label="Sélectionner ${attrName}" onchange="onPlayerRowSelect(this)"></td>
                    <td class="pt-name" onclick="showPlayerDetails(${dayNumber}, ${division}, '${onclickName}')">${escapeHtmlAttr(name)}${bye}</td>
                    <td class="pt-club" data-col="club">${club ? escapeHtmlAttr(club) : '<span class="pt-muted">—</span>'}</td>
                    <td class="pt-actions"><button type="button" class="pt-menu-btn" aria-haspopup="menu" aria-expanded="false" aria-label="Actions pour ${attrName}" title="Actions"
                        onclick="openPlayerRowMenu(this, ${dayNumber}, ${division}, '${onclickName}')">⋯</button></td>
                </tr>`;
        }).join('');
        return `<div class="player-table-wrap${playerTableHiddenClasses('players')}" data-table="players" data-day="${dayNumber}" data-division="${division}">
                <div class="pt-toolbar">
                    <input type="search" class="pt-filter" placeholder="Filtrer les joueurs…" aria-label="Filtrer les joueurs de la division ${division}" oninput="filterPlayerTable(this)">
                    ${playerTableColumnsButtonHTML()}
                    <button type="button" class="ranking-action-btn pt-bulk-delete" hidden onclick="removeSelectedPlayers(this)">🗑️ Supprimer la sélection</button>
                </div>
                <table class="player-table">
                    <thead><tr>
                        <th class="pt-select"><input type="checkbox" aria-label="Tout sélectionner" onchange="togglePlayerSelectAll(this)"></th>
                        ${playerTableSortHeader('Joueur')}
                        ${playerTableSortHeader('Club', 'club')}
                        <th class="pt-actions"><span class="pt-sr-only">Actions</span></th>
                    </tr></thead>
                    <tbody>${rows}</tbody>
                </table>
                <div class="pt-footer" aria-live="polite">0 sur ${players.length} sélectionné</div>
            </div>`;
    }

    // ----- Colonnes affichées (bouton « Colonnes ▾ », comme le data table shadcn) -----
    // Choix gardé dans ce navigateur, par type de tableau ; une colonne masquée porte
    // data-col="…" et la classe pt-hide-… sur le tableau la cache (styles.css).
    const PT_COLUMNS = {
        players: [{ key: 'club', label: 'Club' }],
        participants: [
            { key: 'bib', label: 'Dossard (#)' },
            { key: 'club', label: 'Club' },
            { key: 'info', label: 'Épreuve · série · couloir' }
        ]
    };
    const PT_HIDDEN_KEY = 'playerTableHiddenColumns';
    let columnsMenuAnchor = null;

    function readHiddenColumns() {
        try { return JSON.parse(localStorage.getItem(PT_HIDDEN_KEY)) || {}; } catch (e) { return {}; }
    }

    function playerTableHiddenClasses(kind) {
        return (readHiddenColumns()[kind] || []).map(key => ' pt-hide-' + key).join('');
    }

    function playerTableColumnsButtonHTML() {
        return '<button type="button" class="ranking-action-btn pt-columns-btn" aria-haspopup="menu" aria-expanded="false" onclick="openPlayerTableColumnsMenu(this)">Colonnes ▾</button>';
    }

    function openPlayerTableColumnsMenu(button) {
        const wrap = playerTableOf(button);
        if (!wrap) return;
        const kind = wrap.dataset.table;
        const hidden = readHiddenColumns()[kind] || [];
        // Seulement les colonnes présentes dans ce tableau (ex. « Épreuve » après les séries automatiques)
        const cols = (PT_COLUMNS[kind] || []).filter(c => wrap.querySelector(`th[data-col="${c.key}"]`));
        columnsMenuAnchor = button;
        toggleActionMenu('playerTableColumnsMenu', button, 'Colonnes affichées', cols.map(c => {
            const shown = !hidden.includes(c.key);
            return {
                icon: shown ? '☑' : '☐', label: c.label, hint: shown ? 'Affichée' : 'Masquée',
                onclick: `togglePlayerTableColumn('${kind}', '${c.key}', true)`
            };
        }), kind);
    }

    function togglePlayerTableColumn(kind, key, reopenMenu) {
        const all = readHiddenColumns();
        const hidden = new Set(all[kind] || []);
        if (hidden.has(key)) hidden.delete(key); else hidden.add(key);
        all[kind] = Array.from(hidden);
        try { localStorage.setItem(PT_HIDDEN_KEY, JSON.stringify(all)); } catch (e) { /* navigation privée */ }
        document.querySelectorAll(`.player-table-wrap[data-table="${kind}"]`).forEach(w => {
            w.classList.toggle('pt-hide-' + key, hidden.has(key));
        });
        // Le menu reste ouvert pour cocher / décocher plusieurs colonnes de suite
        if (reopenMenu && columnsMenuAnchor && document.body.contains(columnsMenuAnchor)) {
            openPlayerTableColumnsMenu(columnsMenuAnchor);
            const item = Array.from(document.querySelectorAll('#playerTableColumnsMenu [role="menuitem"]'))
                .find(b => (b.getAttribute('onclick') || '').includes(`'${key}'`));
            if (item) item.focus();
        }
    }

    window.playerTableHiddenClasses = playerTableHiddenClasses;
    window.playerTableColumnsButtonHTML = playerTableColumnsButtonHTML;
    window.openPlayerTableColumnsMenu = openPlayerTableColumnsMenu;
    window.togglePlayerTableColumn = togglePlayerTableColumn;

    // ----- Tri par colonne (clic sur le titre : A→Z, Z→A, puis ordre d'origine) -----
    function playerTableSortHeader(label, col, extraClass) {
        return `<th${col ? ` data-col="${col}"` : ''}${extraClass ? ` class="${extraClass}"` : ''} aria-sort="none">` +
            `<button type="button" class="pt-sort" onclick="sortPlayerTable(this)" title="Trier par ${label}">${label}` +
            ` <span class="pt-sort-icon" aria-hidden="true">↕</span></button></th>`;
    }

    function sortPlayerTable(button) {
        const th = button.closest('th');
        const table = th && th.closest('table');
        if (!table) return;
        const next = { none: 'ascending', ascending: 'descending', descending: 'none' }[th.getAttribute('aria-sort') || 'none'];
        table.querySelectorAll('thead th[aria-sort]').forEach(h => {
            h.setAttribute('aria-sort', 'none');
            const icon = h.querySelector('.pt-sort-icon');
            if (icon) icon.textContent = '↕';
        });
        th.setAttribute('aria-sort', next);
        th.querySelector('.pt-sort-icon').textContent = { ascending: '↑', descending: '↓', none: '↕' }[next];
        const col = th.cellIndex;
        const tbody = table.tBodies[0];
        const text = tr => (tr.cells[col] ? tr.cells[col].textContent : '').replace(/\s+/g, ' ').trim();
        const rows = Array.from(tbody.rows);
        rows.sort((a, b) => {
            if (next === 'none') return Number(a.dataset.order) - Number(b.dataset.order);
            const ta = text(a), tb = text(b);
            // Cellules vides (« — ») toujours en bas
            const ea = ta === '' || ta === '—', eb = tb === '' || tb === '—';
            if (ea !== eb) return ea ? 1 : -1;
            const c = ta.localeCompare(tb, 'fr', { numeric: true, sensitivity: 'base' });
            return (next === 'ascending' ? c : -c) || Number(a.dataset.order) - Number(b.dataset.order);
        });
        rows.forEach(tr => tbody.appendChild(tr));
    }

    window.playerTableSortHeader = playerTableSortHeader;
    window.sortPlayerTable = sortPlayerTable;

    function playerTableOf(el) {
        return el && el.closest('.player-table-wrap');
    }

    function visiblePlayerRows(wrap) {
        return Array.from(wrap.querySelectorAll('tbody tr')).filter(tr => !tr.hidden);
    }

    // Compteur, case « tout sélectionner » (cochée / indéterminée) et bouton de suppression groupée
    function refreshPlayerTableSelection(wrap) {
        if (!wrap) return;
        const all = Array.from(wrap.querySelectorAll('tbody tr'));
        const checked = all.filter(tr => tr.querySelector('.pt-select input').checked);
        all.forEach(tr => tr.classList.toggle('pt-selected', tr.querySelector('.pt-select input').checked));
        const visible = visiblePlayerRows(wrap);
        const visibleChecked = visible.filter(tr => tr.querySelector('.pt-select input').checked);
        const head = wrap.querySelector('thead .pt-select input');
        if (head) {
            head.checked = visible.length > 0 && visibleChecked.length === visible.length;
            head.indeterminate = visibleChecked.length > 0 && visibleChecked.length < visible.length;
        }
        const footer = wrap.querySelector('.pt-count') || wrap.querySelector('.pt-footer');
        if (footer) footer.textContent = `${checked.length} sur ${all.length} sélectionné${checked.length > 1 ? 's' : ''}`;
        const bulk = wrap.querySelector('.pt-bulk-delete');
        if (bulk) bulk.textContent = `${bulk.dataset.label || '🗑️ Supprimer la sélection'} (${checked.length})`;
        // Actions groupées (suppression, et pour les Courses : club, série) : visibles avec une sélection
        wrap.querySelectorAll('.pt-bulk-delete, .pt-needs-selection').forEach(el => { el.hidden = checked.length === 0; });
    }

    function onPlayerRowSelect(checkbox) {
        refreshPlayerTableSelection(playerTableOf(checkbox));
    }

    // Coche / décoche les lignes visibles (le filtre s'applique, comme sur shadcn)
    function togglePlayerSelectAll(checkbox) {
        const wrap = playerTableOf(checkbox);
        if (!wrap) return;
        visiblePlayerRows(wrap).forEach(tr => { tr.querySelector('.pt-select input').checked = checkbox.checked; });
        refreshPlayerTableSelection(wrap);
    }

    function filterPlayerTable(input) {
        const wrap = playerTableOf(input);
        if (!wrap) return;
        const norm = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
        const q = norm(input.value.trim());
        wrap.querySelectorAll('tbody tr').forEach(tr => {
            tr.hidden = q !== '' && !norm(tr.textContent).includes(q);
        });
        refreshPlayerTableSelection(wrap);
    }

    function openPlayerRowMenu(button, dayNumber, division, playerName) {
        const n = escapeForOnclick(playerName);
        toggleActionMenu('playerRowMenu', button, `Actions pour ${playerName}`, [
            { icon: '✏️', label: 'Modifier', hint: 'Nom et club', onclick: `editPlayer(${dayNumber}, ${division}, '${n}')` },
            { icon: '📊', label: 'Détails', hint: 'Matchs et statistiques', onclick: `showPlayerDetails(${dayNumber}, ${division}, '${n}')` },
            { icon: '🗑️', label: 'Supprimer', hint: 'Retire le joueur et ses matchs', type: 'danger', onclick: `removePlayer(${dayNumber}, ${division}, '${n}')` }
        ], `${dayNumber}|${division}|${playerName}`);
    }

    function removeSelectedPlayers(button) {
        const wrap = playerTableOf(button);
        if (!wrap) return;
        const names = Array.from(wrap.querySelectorAll('tbody tr'))
            .filter(tr => tr.querySelector('.pt-select input').checked)
            .map(tr => tr.dataset.name);
        removePlayers(parseInt(wrap.dataset.day), parseInt(wrap.dataset.division), names);
    }

    // Suppression groupée : une seule confirmation, joueurs et leurs matchs retirés
    function removePlayers(dayNumber, division, names) {
        if (!names || names.length === 0) return false;
        const label = names.length === 1 ? names[0] : `ces ${names.length} joueurs`;
        if (!confirm(`Êtes-vous sûr de vouloir supprimer ${label} ?\n\nLeurs matchs de la journée seront aussi supprimés.`)) return false;
        const lower = new Set(names.map(n => String(n).toLowerCase()));
        const day = championship.days[dayNumber];
        day.players[division] = (day.players[division] || []).filter(p => !lower.has(playerNameAndClub(p).name.toLowerCase()));
        day.matches[division] = (day.matches[division] || []).filter(m => !names.includes(m.player1) && !names.includes(m.player2));
        updatePlayersDisplay(dayNumber);
        updateMatchesDisplay(dayNumber);
        updateStats(dayNumber);
        saveToLocalStorage();
        showNotification(names.length === 1 ? `${names[0]} supprimé` : `${names.length} joueurs supprimés`, 'warning');
        return true;
    }

    window.renderPlayerTable = renderPlayerTable;
    window.refreshPlayerTableSelection = refreshPlayerTableSelection;
    window.onPlayerRowSelect = onPlayerRowSelect;
    window.togglePlayerSelectAll = togglePlayerSelectAll;
    window.filterPlayerTable = filterPlayerTable;
    window.openPlayerRowMenu = openPlayerRowMenu;
    window.removeSelectedPlayers = removeSelectedPlayers;
    window.removePlayers = removePlayers;

    function removePlayer(dayNumber, division, playerName) {
        // Trouver le joueur pour obtenir son nom d'affichage
        let displayName = playerName;
        const players = championship.days[dayNumber].players[division];
        const playerObj = players.find(p => {
            const pName = typeof p === 'object' ? p.name : p;
            return pName.toLowerCase() === playerName.toLowerCase();
        });
        if (playerObj && typeof playerObj === 'object' && playerObj.club) {
            displayName = `${playerObj.name} (${playerObj.club})`;
        }
        
        // Demander confirmation avant suppression
        if (!confirm(`Êtes-vous sûr de vouloir supprimer ${displayName} ?`)) {
            return; // Annuler la suppression
        }

        championship.days[dayNumber].players[division] = players.filter(p => {
            const pName = typeof p === 'object' ? p.name : p;
            return pName.toLowerCase() !== playerName.toLowerCase();
        });
        championship.days[dayNumber].matches[division] = championship.days[dayNumber].matches[division].filter(match =>
            match.player1 !== playerName && match.player2 !== playerName
        );
        updatePlayersDisplay(dayNumber);
        updateMatchesDisplay(dayNumber);
        updateStats(dayNumber);
        saveToLocalStorage();
        showNotification(`${displayName} supprimé`, 'warning');
    }
    window.removePlayer = removePlayer;

    function editPlayer(dayNumber, division, oldPlayerName) {
        // Trouver le joueur dans la liste
        const players = championship.days[dayNumber].players[division];
        const playerIndex = players.findIndex(p => {
            const pName = typeof p === 'object' ? p.name : p;
            return pName.toLowerCase() === oldPlayerName.toLowerCase();
        });
        
        if (playerIndex === -1) return;
        
        const currentPlayer = players[playerIndex];
        const currentName = typeof currentPlayer === 'object' ? currentPlayer.name : currentPlayer;
        const currentClub = typeof currentPlayer === 'object' ? (currentPlayer.club || '') : '';
        
        // Utiliser un modal personnalisé au lieu de prompt pour permettre l'édition du club
        showEditPlayerModal(dayNumber, division, playerIndex, currentName, currentClub);
    }
    
    function showEditPlayerModal(dayNumber, division, playerIndex, currentName, currentClub) {
        // Supprimer le modal existant s'il y en a un
        const existingModal = document.getElementById('editPlayerModal');
        if (existingModal) existingModal.remove();
        
        var modal = document.createElement('div');
        modal.id = 'editPlayerModal';
        modal.innerHTML = 
            '<div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; ' +
            'background: rgba(0,0,0,0.5); display: flex; justify-content: center; ' +
            'align-items: center; z-index: 10000;" onclick="if(event.target===this)closeEditPlayerModal()">' +
            '<div style="background: white; padding: 30px; border-radius: 10px; max-width: 400px; width: 90%;">' +
            '<h3>✏️ Modifier le joueur</h3>' +
            '<div style="margin: 15px 0;">' +
            '<label>Nom :</label>' +
            '<input type="text" id="editPlayerNameInput" value="' + escapeHtmlAttr(currentName) + '" style="width: 100%; padding: 10px; margin-top: 5px; border-radius: 6px; border: 1px solid #ddd;">' +
            '</div>' +
            '<div style="margin: 15px 0;">' +
            '<label>Club :</label>' +
            '<select id="editPlayerClubSelect" style="width: 100%; padding: 10px; margin-top: 5px; border-radius: 6px; border: 1px solid #ddd;">' +
            generateClubOptionsForEdit(currentClub) +
            '</select>' +
            '<input type="text" id="editPlayerClubCustom" value="" style="width: 100%; padding: 10px; margin-top: 5px; border-radius: 6px; border: 1px solid #ddd; display: none;" placeholder="Nouveau club...">' +
            '</div>' +
            '<div style="display: flex; gap: 10px; justify-content: flex-end;">' +
            '<button onclick="closeEditPlayerModal()" class="btn btn-secondary">Annuler</button>' +
            '<button onclick="saveEditedPlayer(' + dayNumber + ', ' + division + ', ' + playerIndex + ')" class="btn btn-primary">Sauvegarder</button>' +
            '</div></div></div>';
        
        document.body.appendChild(modal);
        
        // Configurer le changement de sélection de club
        var clubSelect = document.getElementById('editPlayerClubSelect');
        var clubCustom = document.getElementById('editPlayerClubCustom');
        if (clubSelect && clubCustom) {
            clubSelect.onchange = function() {
                if (this.value === '__custom__') {
                    clubCustom.style.display = 'block';
                    clubCustom.focus();
                } else {
                    clubCustom.style.display = 'none';
                    clubCustom.value = '';
                }
            };
        }
    }
    
    function escapeHtmlAttr(str) {
        return String(str == null ? '' : str)
            .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
            .replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function generateClubOptionsForEdit(selectedClub) {
        var clubs = (typeof clubsModule !== 'undefined' && clubsModule.getClubsList) ? 
            clubsModule.getClubsList() : [];
        var html = '<option value="">-- Aucun club --</option>';
        clubs.forEach(function(club) {
            var selected = club === selectedClub ? ' selected' : '';
            html += '<option value="' + escapeHtmlAttr(club) + '"' + selected + '>' + escapeHtmlAttr(club) + '</option>';
        });
        html += '<option value="__custom__">+ Ajouter un nouveau club...</option>';
        return html;
    }
    
    function closeEditPlayerModal() {
        var modal = document.getElementById('editPlayerModal');
        if (modal) modal.remove();
    }
    
    function saveEditedPlayer(dayNumber, division, playerIndex, oldPlayerName) {
        var nameInput = document.getElementById('editPlayerNameInput');
        var clubSelect = document.getElementById('editPlayerClubSelect');
        var clubCustom = document.getElementById('editPlayerClubCustom');
        
        if (!nameInput) return;

        if (oldPlayerName === undefined) {
            var current = championship.days[dayNumber].players[division][playerIndex];
            oldPlayerName = typeof current === 'object' ? current.name : current;
        }

        var newName = formatProperName(nameInput.value);
        if (!newName) {
            showNotification('Veuillez entrer un nom', 'warning');
            return;
        }
        
        // Récupérer le club
        var newClub = '';
        if (clubSelect) {
            if (clubSelect.value === '__custom__' && clubCustom && clubCustom.value.trim()) {
                newClub = clubCustom.value.trim();
                if (typeof clubsModule !== 'undefined' && clubsModule.addClub) {
                    clubsModule.addClub(newClub);
                }
            } else if (clubSelect.value && clubSelect.value !== '__custom__') {
                newClub = clubSelect.value;
            }
        }
        
        // Vérifier si le nom a changé et s'il existe déjà
        if (newName.toLowerCase() !== oldPlayerName.toLowerCase()) {
            var exists = championship.days[dayNumber].players[division].some((p, idx) => {
                if (idx === playerIndex) return false;
                var pName = typeof p === 'object' ? p.name : p;
                return pName.toLowerCase() === newName.toLowerCase();
            });
            
            if (exists) {
                showNotification('Ce nom existe déjà dans la division', 'warning');
                return;
            }
        }
        
        // Mettre à jour le joueur
        championship.days[dayNumber].players[division][playerIndex] = {
            name: newName,
            club: newClub
        };
        
        // Mettre à jour les matchs si le nom a changé
        if (newName !== oldPlayerName) {
            championship.days[dayNumber].matches[division].forEach(match => {
                if (match.player1 === oldPlayerName) match.player1 = newName;
                if (match.player2 === oldPlayerName) match.player2 = newName;
                if (match.winner === oldPlayerName) match.winner = newName;
            });
            
            // Mettre à jour dans les poules si activé
            if (championship.days[dayNumber].pools?.enabled && championship.days[dayNumber].pools.divisions[division]) {
                const poolMatches = championship.days[dayNumber].pools.divisions[division].matches || [];
                poolMatches.forEach(match => {
                    if (match.player1 === oldPlayerName) match.player1 = newName;
                    if (match.player2 === oldPlayerName) match.player2 = newName;
                    if (match.winner === oldPlayerName) match.winner = newName;
                });
                
                const pools = championship.days[dayNumber].pools.divisions[division].pools || [];
                pools.forEach(pool => {
                    const idx = pool.indexOf(oldPlayerName);
                    if (idx !== -1) pool[idx] = newName;
                });
                
                const finalPhase = championship.days[dayNumber].pools.divisions[division].finalPhase || [];
                finalPhase.forEach(match => {
                    if (match.player1 === oldPlayerName) match.player1 = newName;
                    if (match.player2 === oldPlayerName) match.player2 = newName;
                    if (match.winner === oldPlayerName) match.winner = newName;
                });
            }
        }
        
        closeEditPlayerModal();
        saveToLocalStorage();
        updatePlayersDisplay(dayNumber);
        updateMatchesDisplay(dayNumber);
        
        var msg = newClub ? 
            `"${newName}" (${newClub}) mis à jour` : 
            `"${newName}" mis à jour`;
        showNotification(msg, 'success');
    }
    window.editPlayer = editPlayer;
    window.showEditPlayerModal = showEditPlayerModal;
    window.closeEditPlayerModal = closeEditPlayerModal;
    window.saveEditedPlayer = saveEditedPlayer;


})(window);
