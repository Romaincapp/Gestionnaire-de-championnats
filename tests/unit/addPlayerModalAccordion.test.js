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

test('s\'ouvre sur « Ajouter un joueur », une seule section ouverte à la fois', () => {
    showAddPlayerModal(1);
    expect(openSections()).toEqual(['apm-section-single']);
    toggleAddPlayerSection('bulk');
    expect(openSections()).toEqual(['apm-section-bulk']);
    toggleAddPlayerSection('bulk');
    expect(openSections()).toEqual([]);
    // rouvrir la fenêtre revient toujours sur l'ajout individuel
    closeAddPlayerModal();
    showAddPlayerModal(1);
    expect(openSections()).toEqual(['apm-section-single']);
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
