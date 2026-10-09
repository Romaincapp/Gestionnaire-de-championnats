/**
 * @jest-environment jsdom
 *
 * Journée Courses, « Participants disponibles » : un seul bouton « + » ouvre un
 * champ (une ligne par participant, une seule suffit). Remplace le formulaire
 * Nom/Club toujours affiché et la fenêtre « ➕ Ajouter ».
 */
const { loadModules, DEFAULT_ORDER } = require('../helpers/loadApp');

beforeAll(() => {
    loadModules(DEFAULT_ORDER);
});

beforeEach(() => {
    localStorage.clear();
    championship.days = {
        1: { dayType: 'chrono', chronoData: { events: [], series: [], participants: [], nextEventId: 1, nextSerieId: 1, nextParticipantId: 1 } },
    };
    document.body.innerHTML = '<div id="chrono-content-1"></div>';
    window.closeAddParticipantsModal(1);
    window.refreshChronoDisplay(1);
});

const panel = () => document.getElementById('add-participants-panel-1');
const participants = () => championship.days[1].chronoData.participants;

test('replié par défaut, plus de formulaire Nom/Club toujours affiché', () => {
    expect(panel().style.display).toBe('none');
    expect(document.getElementById('quick-participant-name-1')).toBeNull();
    expect(document.getElementById('add-participants-btn-1').textContent).toBe('+');
});

test('« + » ouvre le champ (multi-lignes) ; recliquer le referme', () => {
    window.toggleAddParticipantsPanel(1);
    expect(panel().style.display).toBe('block');
    expect(document.getElementById('bulk-participants-1').tagName).toBe('TEXTAREA');
    expect(document.getElementById('add-participants-btn-1').textContent).toBe('×');
    window.toggleAddParticipantsPanel(1);
    expect(panel().style.display).toBe('none');
});

test('un seul participant (avec club) : une ligne suffit', () => {
    window.toggleAddParticipantsPanel(1);
    document.getElementById('bulk-participants-1').value = 'Dupont Jean, Club ABC';
    document.getElementById('save-participants-btn-1').click();
    expect(participants().map((p) => [p.name, p.club])).toEqual([['Dupont Jean', 'Club ABC']]);
    expect(panel().style.display).toBe('none');           // refermé après l'ajout
});

test('plusieurs d\'un coup, catégorie appliquée à tous, doublons ignorés', () => {
    participants().push({ id: 9, name: 'Martin Paul', club: '', bib: 1 });
    window.refreshChronoDisplay(1);
    window.toggleAddParticipantsPanel(1);
    document.getElementById('bulk-participants-1').value = 'Dupont Jean\nMartin Paul\n7\tLeroy Anne';
    document.getElementById('bulk-participants-category-1').value = 'Solo';
    window.saveBulkParticipantsForDay(1);
    expect(participants().map((p) => p.name)).toEqual(['Martin Paul', 'Dupont Jean', 'Leroy Anne']);
    expect(participants()[2]).toMatchObject({ bib: 7, category: 'Solo' });
});

test('le champ ouvert reste ouvert après un rafraîchissement de l\'écran', () => {
    window.toggleAddParticipantsPanel(1);
    window.refreshChronoDisplay(1);
    expect(panel().style.display).toBe('block');
});

test('Annuler vide et referme', () => {
    window.toggleAddParticipantsPanel(1);
    document.getElementById('bulk-participants-1').value = 'Brouillon';
    window.closeAddParticipantsModal(1);
    expect(panel().style.display).toBe('none');
    window.toggleAddParticipantsPanel(1);
    expect(document.getElementById('bulk-participants-1').value).toBe('');
    expect(participants()).toHaveLength(0);
});
