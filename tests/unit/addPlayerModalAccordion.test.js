/**
 * @jest-environment jsdom
 *
 * Fenêtre « ➕ Ajouter des joueurs » (demande utilisateur) : une seule zone de saisie,
 * toujours visible, pour un nom ou une liste (un par ligne, « Nom, Club » accepté) —
 * plus de sections « un joueur » / « plusieurs joueurs » séparées. Restent en accordéon
 * 📥 Reprendre d'une autre journée et 🏢 Gérer les clubs (une seule ouverte à la fois).
 */
const fs = require('fs');
const path = require('path');
const { loadModules } = require('../helpers/loadApp');

const BODY = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8')
    .replace(/^[\s\S]*<body[^>]*>/, '').replace(/<\/body>[\s\S]*$/, '').replace(/<script[\s\S]*?<\/script>/g, '');

beforeAll(() => loadModules());

beforeEach(() => {
    document.body.innerHTML = BODY;
    localStorage.clear();
    window.confirm = jest.fn(() => true);
    championship.config = { numberOfDivisions: 2, numberOfCourts: 4 };
    championship.days = { 1: { dayType: 'championship', players: { 1: [], 2: [] }, matches: { 1: [], 2: [] } } };
});

const openSections = () => [...document.querySelectorAll('#addPlayerModal .apm-section.open')].map((s) => s.id);

const typeNames = (text) => { document.getElementById('addPlayerNames').value = text; };
const names = (div) => championship.days[1].players[div].map((p) => p.name);

test('saisie toujours visible, plus de sections « un » / « plusieurs » ; 📥 et 🏢 en accordéon', () => {
    showAddPlayerModal(1);
    expect(document.getElementById('apm-section-single')).toBeNull();
    expect(document.getElementById('apm-section-bulk')).toBeNull();
    expect(document.getElementById('bulkModal')).toBeNull();
    expect(document.activeElement.id).toBe('addPlayerNames');
    expect(openSections()).toEqual([]);
    toggleAddPlayerSection('import');
    expect(openSections()).toEqual(['apm-section-import']);
    toggleAddPlayerSection('clubs');
    expect(openSections()).toEqual(['apm-section-clubs']);
    toggleAddPlayerSection('clubs');
    expect(openSections()).toEqual([]);
    // 'add' (et les anciens 'single' / 'bulk') : retour à la saisie
    toggleAddPlayerSection('import');
    toggleAddPlayerSection('bulk');
    expect(openSections()).toEqual([]);
    expect(document.activeElement.id).toBe('addPlayerNames');
    // rouvrir la fenêtre referme tout
    toggleAddPlayerSection('clubs');
    closeAddPlayerModal();
    showAddPlayerModal(1);
    expect(openSections()).toEqual([]);
});

test('un seul nom : ajouté, fenêtre ouverte et saisie vidée pour le suivant', () => {
    showAddPlayerModal(1);
    typeNames('dupont jean');
    document.getElementById('addPlayerDivision').value = '2';
    addPlayerFromModal();
    expect(names(2)).toEqual(['Dupont Jean']);
    expect(document.getElementById('addPlayerModal').style.display).toBe('block');
    expect(document.getElementById('addPlayerNames').value).toBe('');
});

test('une liste : un joueur par ligne, lignes vides ignorées, doublons signalés', () => {
    championship.days[1].players[1] = [{ name: 'Déjà Là', club: '' }];
    showAddPlayerModal(1);
    typeNames('Martin Paul\n\n  Durand Léa  \nDéjà Là\nmartin paul');
    addPlayerFromModal();
    expect(names(1)).toEqual(['Déjà Là', 'Martin Paul', 'Durand Léa']);
    const shown = document.body.textContent;
    expect(shown).toContain('2 joueurs ajoutés à D1');
    expect(shown).toContain('Déjà inscrits en D1 (ignorés) : Déjà Là, Martin Paul');
});

test('« Nom, Club » et colonnes collées : club de la ligne, sinon club choisi ; clubs ajoutés à la liste', () => {
    showAddPlayerModal(1);
    const select = document.getElementById('addPlayerClub');
    select.value = '__custom__';
    handleClubSelectChange(select, 'addPlayerClubCustom');
    document.getElementById('addPlayerClubCustom').value = 'CTT Ciney';
    typeNames('Martin Paul, TT Namur\nDurand Léa\tCTT Andenne\tcolonne en trop\nSans Virgule');
    addPlayerFromModal();
    expect(championship.days[1].players[1]).toEqual([
        { name: 'Martin Paul', club: 'TT Namur' },
        { name: 'Durand Léa', club: 'CTT Andenne' },
        { name: 'Sans Virgule', club: 'CTT Ciney' },
    ]);
    expect(clubsModule.getClubsList()).toEqual(expect.arrayContaining(['CTT Ciney', 'TT Namur', 'CTT Andenne']));
    expect(select.value).toBe('CTT Ciney'); // reste choisi pour la suite
});

test('fermer avec des noms tapés non ajoutés : confirmation', () => {
    showAddPlayerModal(1);
    typeNames('Oublié');
    window.confirm = jest.fn(() => false);
    closeAddPlayerModal();
    expect(document.getElementById('addPlayerModal').style.display).toBe('block');
    window.confirm = jest.fn(() => true);
    closeAddPlayerModal();
    expect(document.getElementById('addPlayerModal').style.display).toBe('none');
});

test('clubs gérés dans la fenêtre : ajout et suppression mettent à jour la liste et le sélecteur', () => {
    showAddPlayerModal(1);
    toggleAddPlayerSection('clubs');
    document.getElementById('apmNewClubName').value = "TT l'Envol";
    addClubFromAddPlayerModal();
    const optionValues = () => [...document.querySelectorAll('#addPlayerClub option')].map((o) => o.value);
    expect(document.getElementById('addPlayerClubsPanel').textContent).toContain("TT l'Envol");
    expect(optionValues()).toContain("TT l'Envol");

    const index = clubsModule.getClubsList().indexOf("TT l'Envol");
    removeClubFromAddPlayerModal(index);
    expect(clubsModule.getClubsList()).not.toContain("TT l'Envol");
    expect(optionValues()).not.toContain("TT l'Envol");
});

test('aucun club prédéfini : le menu « Club » ne propose que « + Ajouter un nouveau club… »', () => {
    expect(clubsModule.getClubsList()).toEqual([]);
    showAddPlayerModal(1);
    const values = [...document.querySelectorAll('#addPlayerClub option')].map((o) => o.value);
    expect(values).toEqual(['', '__custom__']);
    expect(document.getElementById('addPlayerClubsPanel').textContent).toContain('Aucun club');
    // un joueur sans club s'ajoute normalement
    typeNames('Sans Club');
    addPlayerFromModal();
    expect(championship.days[1].players[1].map((p) => [p.name, p.club])).toEqual([['Sans Club', '']]);
});

test('nouveau club saisi en ajoutant un joueur : visible tout de suite dans le menu et la section 🏢', () => {
    showAddPlayerModal(1);
    const select = document.getElementById('addPlayerClub');
    const custom = document.getElementById('addPlayerClubCustom');
    select.value = '__custom__';
    handleClubSelectChange(select, 'addPlayerClubCustom');
    custom.value = 'CTT Ciney';
    typeNames('Martin Paul');
    addPlayerFromModal();

    expect(championship.days[1].players[1]).toEqual([{ name: 'Martin Paul', club: 'CTT Ciney' }]);
    expect([...select.options].map((o) => o.value)).toContain('CTT Ciney');
    expect(select.value).toBe('CTT Ciney'); // reste choisi pour le joueur suivant
    expect(custom.style.display).toBe('none');
    expect(document.getElementById('addPlayerClubsPanel').textContent).toContain('CTT Ciney');
});

test('joueur refusé (nom vide) : le nouveau club n\'est pas créé', () => {
    showAddPlayerModal(1);
    const select = document.getElementById('addPlayerClub');
    select.value = '__custom__';
    document.getElementById('addPlayerClubCustom').value = 'Club Fantôme';
    typeNames('');
    addPlayerFromModal();
    expect(clubsModule.getClubsList()).not.toContain('Club Fantôme');
});

test('« 📥 Importer joueurs » déplacé dans la fenêtre : plus dans la barre des journées Matchs', () => {
    // J1 (écrite en dur dans index.html) et journées générées
    expect(document.querySelectorAll('#day-hub-content-1 button[onclick^="showImportPlayersModal"]')).toHaveLength(0);
    championship.days[2] = { dayType: 'championship', players: { 1: [], 2: [] }, matches: { 1: [], 2: [] } };
    jest.useFakeTimers();
    initializeAllDaysContent();
    jest.runAllTimers();
    jest.useRealTimers();
    expect(document.querySelectorAll('[id^="championship-section-"] button[onclick^="showImportPlayersModal"]')).toHaveLength(0);
    expect(document.querySelectorAll('#addPlayerModal #apm-section-import')).toHaveLength(1);
});

test('section 📥 : ouvre la fenêtre d\'import de la journée et ferme celle-ci', () => {
    championship.days[2] = { dayType: 'championship', players: { 1: [{ name: 'Ancien', club: '' }], 2: [] }, matches: { 1: [], 2: [] } };
    championship.days[3] = { dayType: 'championship', players: { 1: [], 2: [] }, matches: { 1: [], 2: [] } };
    localStorage.setItem('tennisTableChampionship', JSON.stringify(championship));
    showAddPlayerModal(3);
    toggleAddPlayerSection('import');
    importPlayersFromAddPlayerModal();
    expect(document.getElementById('addPlayerModal').style.display).toBe('none');
    const modal = document.getElementById('importPlayersModal-3');
    expect(modal).not.toBeNull();
    expect(modal.textContent).toContain('Journée 2');
});

test('plus de petits boutons « 📋 J1, J2… » de copie rapide dans la barre des journées Matchs', () => {
    championship.days[2] = { dayType: 'championship', players: { 1: [], 2: [] }, matches: { 1: [], 2: [] } };
    championship.days[3] = { dayType: 'championship', players: { 1: [], 2: [] }, matches: { 1: [], 2: [] } };
    jest.useFakeTimers();
    initializeAllDaysContent();
    jest.runAllTimers();
    jest.useRealTimers();
    expect(document.querySelectorAll('[id^="quick-copy-buttons-"]')).toHaveLength(0);
    const bar = document.getElementById('day-hub-content-3').textContent;
    expect(bar).not.toMatch(/📋 J\d/);
    expect(typeof window.quickCopyFromDay).toBe('undefined');
});
