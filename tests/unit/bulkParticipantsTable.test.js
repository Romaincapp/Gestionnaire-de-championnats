/**
 * @jest-environment jsdom
 *
 * Fenêtre « ➕ Ajouter des participants » (journée Courses) : onglet « 📊 Tableau »
 * (colonnes Nom, Prénom, Club, Catégorie) en plus de la saisie « 📝 Liste ».
 */
const { loadModules, DEFAULT_ORDER } = require('../helpers/loadApp');

beforeAll(() => {
    loadModules(DEFAULT_ORDER);
});

beforeEach(() => {
    try { localStorage.clear(); } catch (e) { /* ignore */ }
    document.body.innerHTML = '<div id="chrono-content-1"></div>';
    championship.config = { numberOfDivisions: 1, numberOfCourts: 1 };
    championship.days = {
        1: { dayType: 'chrono', players: {}, matches: {},
             chronoData: { events: [], series: [], participants: [], nextEventId: 1, nextSerieId: 1, nextParticipantId: 1 } },
    };
    window.showAddParticipantManualModal(1);
});
afterEach(() => window.closeAddParticipantsModal(1));

const cd = () => championship.days[1].chronoData;
const rows = () => [...document.querySelectorAll('#bulk-grid-1 tbody tr')];
const cell = (i, col) => rows()[i].querySelector(`input[data-col="${col}"]`);
const type = (input, value) => { input.value = value; window.onBulkGridInput(1, input); };

test('par défaut : onglet Liste (zone de texte), tableau masqué', () => {
    expect(document.getElementById('bulk-tab-list-1').getAttribute('aria-selected')).toBe('true');
    expect(document.getElementById('bulk-panel-table-1').hidden).toBe(true);
    expect(document.getElementById('bulk-participants-1')).not.toBeNull();
});

test('tableau : colonnes Nom, Prénom, Club, Catégorie ; une ligne s\'ajoute en remplissant la dernière', () => {
    window.setBulkParticipantsMode(1, 'table');
    expect([...document.querySelectorAll('#bulk-grid-1 thead th')].map(th => th.textContent.trim()))
        .toEqual(['#', 'Nom', 'Prénom', 'Club', 'Catégorie', 'Retirer']);
    expect(rows()).toHaveLength(5);
    for (let i = 0; i < 5; i++) type(cell(i, 'nom'), 'N' + i);
    expect(rows()).toHaveLength(6);
    expect(cell(0, 'nom').getAttribute('aria-label')).toBe('Nom, ligne 1');
});

test('Liste → Tableau : la liste est découpée en colonnes à contrôler', () => {
    document.getElementById('bulk-participants-1').value = 'Dupont Jean\nMartin Pierre, Club ABC\nVan Der Berg Anna\nGringos - Julien';
    window.setBulkParticipantsMode(1, 'table');
    const v = (i) => ['nom', 'prenom', 'club'].map(c => cell(i, c).value);
    expect(v(0)).toEqual(['Dupont', 'Jean', '']);
    expect(v(1)).toEqual(['Martin', 'Pierre', 'Club ABC']);
    expect(v(2)).toEqual(['Van Der Berg', 'Anna', '']);
    expect(v(3)).toEqual(['Gringos - Julien', '', '']);
});

test('ajout depuis le tableau : nom + prénom, club et catégorie par ligne, catégorie par défaut sinon', () => {
    window.setBulkParticipantsMode(1, 'table');
    type(cell(0, 'nom'), 'dupont'); type(cell(0, 'prenom'), 'jean'); type(cell(0, 'club'), 'USBW'); type(cell(0, 'category'), 'Solo');
    type(cell(1, 'nom'), 'Martin'); type(cell(1, 'prenom'), 'Pierre');
    type(cell(2, 'club'), 'Sans nom'); // ignorée : ni nom ni prénom
    document.getElementById('bulk-participants-category-1').value = 'Équipe';
    window.saveBulkParticipantsForDay(1);
    expect(cd().participants.map(p => [p.name, p.club, p.category])).toEqual([
        ['Dupont Jean', 'USBW', 'Solo'],
        ['Martin Pierre', '', 'Équipe'],
    ]);
});

test('collage depuis un tableur : réparti dans les lignes et colonnes', () => {
    window.setBulkParticipantsMode(1, 'table');
    const target = cell(0, 'nom');
    const event = new Event('paste', { bubbles: true, cancelable: true });
    event.clipboardData = { getData: () => 'Dupont\tJean\tUSBW\tSolo\nMartin\tPierre\tAcacias\n' };
    target.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(['nom', 'prenom', 'club', 'category'].map(c => cell(0, c).value)).toEqual(['Dupont', 'Jean', 'USBW', 'Solo']);
    expect(['nom', 'prenom', 'club'].map(c => cell(1, c).value)).toEqual(['Martin', 'Pierre', 'Acacias']);
});

test('le dernier mode choisi est gardé ; retirer une ligne', () => {
    window.setBulkParticipantsMode(1, 'table');
    window.closeAddParticipantsModal(1);
    window.showAddParticipantManualModal(1);
    expect(document.getElementById('bulk-panel-table-1').hidden).toBe(false);
    const before = rows().length;
    window.removeBulkGridRow(1, rows()[0].querySelector('.bulk-grid-del button'));
    expect(rows()).toHaveLength(before - 1);
});

test('la saisie Liste fonctionne toujours (catégorie appliquée à tous)', () => {
    document.getElementById('bulk-participants-1').value = 'Dupont Jean, USBW\n3\tMartin Pierre';
    document.getElementById('bulk-participants-category-1').value = 'Solo';
    window.saveBulkParticipantsForDay(1);
    expect(cd().participants.map(p => [p.name, p.club, p.category, p.bib])).toEqual([
        ['Dupont Jean', 'USBW', 'Solo', 1],
        ['Martin Pierre', '', 'Solo', 3],
    ]);
});

test('astuce de la Liste : épreuve (et temps) en fin de ligne → « 🏁 Séries automatiques » ; l\'exemple est bien compris', () => {
    const tip = document.querySelector('#bulk-panel-list-1 .bulk-tip');
    expect(tip.textContent).toMatch(/épreuve en fin de ligne/);
    expect(tip.textContent).toMatch(/Séries automatiques/);
    const example = tip.querySelector('em').textContent;
    expect(window.parseSwimmingEntry(example)).toBeTruthy();
});
