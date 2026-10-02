/**
 * @jest-environment jsdom
 *
 * Fenêtre « ➕ Ajouter des joueurs » épurée en accordéon (demande utilisateur) :
 * 👤 Ajouter un joueur / 📋 Ajouter plusieurs joueurs / 🏢 Gérer les clubs, une seule
 * section ouverte à la fois, la gestion des clubs intégrée (plus de seconde fenêtre).
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

test('toutes les sections fermées à l\'ouverture, une seule ouverte à la fois', () => {
    showAddPlayerModal(1);
    expect(openSections()).toEqual([]);
    toggleAddPlayerSection('single');
    expect(openSections()).toEqual(['apm-section-single']);
    toggleAddPlayerSection('bulk');
    expect(openSections()).toEqual(['apm-section-bulk']);
    toggleAddPlayerSection('bulk');
    expect(openSections()).toEqual([]);
    // rouvrir la fenêtre referme tout, même si une section était restée ouverte
    toggleAddPlayerSection('clubs');
    closeAddPlayerModal();
    showAddPlayerModal(1);
    expect(openSections()).toEqual([]);
});

test('ajout individuel toujours fonctionnel (mêmes champs)', () => {
    showAddPlayerModal(1);
    document.getElementById('addPlayerName').value = 'Dupont Jean';
    document.getElementById('addPlayerDivision').value = '2';
    addPlayerFromModal();
    expect(championship.days[1].players[2].map((p) => p.name)).toEqual(['Dupont Jean']);
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
    document.getElementById('addPlayerName').value = 'Sans Club';
    addPlayerFromModal();
    expect(championship.days[1].players[1].map((p) => [p.name, p.club])).toEqual([['Sans Club', '']]);
});
