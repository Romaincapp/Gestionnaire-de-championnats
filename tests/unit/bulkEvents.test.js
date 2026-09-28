/**
 * @jest-environment jsdom
 *
 * Fenêtre « 🎯 Épreuve » : plusieurs épreuves d'un coup, une par ligne (demande
 * utilisateur : « ajouter des épreuves en masse, une épreuve par ligne au lieu d'une
 * épreuve à la fois, dans le modal existant »).
 */
const { loadModules, DEFAULT_ORDER } = require('../helpers/loadApp');

beforeAll(() => {
    loadModules(DEFAULT_ORDER);
});

// Les modules gardent leur propre référence à showNotification : on lit le toast affiché
const lastToast = () => {
    const toasts = document.querySelectorAll('.notification');
    const t = toasts[toasts.length - 1];
    return t ? { text: t.textContent, type: t.className.replace('notification', '').trim() } : null;
};

beforeEach(() => {
    championship.config = { numberOfDivisions: 1, numberOfCourts: 4 };
    championship.days = {
        1: {
            dayType: 'chrono', players: {}, matches: {},
            chronoData: { events: [{ id: 1, name: '50m Nage Libre', series: [] }], series: [], participants: [], nextEventId: 2, nextSerieId: 1, nextParticipantId: 1 },
        },
    };
    document.body.innerHTML = '<div id="chrono-content-1"></div>';
    window.showAddEventModalForDay(1);
});

afterEach(() => {
    const modal = document.getElementById('eventModal-1');
    if (modal) modal.remove();
});

const eventNames = () => championship.days[1].chronoData.events.map(e => e.name);

test('le champ Nom accepte plusieurs lignes (une épreuve par ligne)', () => {
    const field = document.getElementById('eventName-1');
    expect(field.tagName).toBe('TEXTAREA');
    expect(document.getElementById('eventModal-1').textContent).toMatch(/une épreuve par ligne/i);
});

test('crée une épreuve par ligne, dans l\'ordre, avec la même date', () => {
    document.getElementById('eventName-1').value = '50m brasse\n50m dos\n100m libre';
    document.getElementById('eventDate-1').value = '2026-10-04';
    window.saveEventForDay(1);
    expect(eventNames()).toEqual(['50m Nage Libre', '50m brasse', '50m dos', '100m libre']);
    expect(championship.days[1].chronoData.events.slice(1).every(e => e.date === '2026-10-04')).toBe(true);
    expect(new Set(championship.days[1].chronoData.events.map(e => e.id)).size).toBe(4);
    expect(document.getElementById('eventModal-1')).toBeNull();
    expect(lastToast()).toEqual({ text: expect.stringContaining('3 épreuves créées'), type: 'success' });
});

test('lignes vides, espaces et puces ignorés ; doublons (liste et journée) non recréés', () => {
    document.getElementById('eventName-1').value = '\n  50m brasse  \n\n• 50m dos\n- 25m libre\n50m BRASSE\n50m nage libre\n';
    window.saveEventForDay(1);
    expect(eventNames()).toEqual(['50m Nage Libre', '50m brasse', '50m dos', '25m libre']);
    expect(lastToast()).toEqual({ text: expect.stringMatching(/3 épreuves créées.*2 déjà existante/), type: 'success' });
});

test('une seule ligne : comme avant', () => {
    document.getElementById('eventName-1').value = '200m 4 nages';
    window.saveEventForDay(1);
    expect(eventNames()).toEqual(['50m Nage Libre', '200m 4 nages']);
    expect(lastToast()).toEqual({ text: 'Épreuve créée !', type: 'success' });
});

test('rien de saisi : avertissement, fenêtre laissée ouverte', () => {
    document.getElementById('eventName-1').value = ' \n \n';
    window.saveEventForDay(1);
    expect(eventNames()).toEqual(['50m Nage Libre']);
    expect(document.getElementById('eventModal-1')).not.toBeNull();
    expect(lastToast().type).toBe('warning');
});

test('uniquement des épreuves existantes : rien de créé, on le dit', () => {
    document.getElementById('eventName-1').value = '50m Nage Libre';
    window.saveEventForDay(1);
    expect(eventNames()).toEqual(['50m Nage Libre']);
    expect(lastToast()).toEqual({ text: expect.stringContaining('existe déjà'), type: 'warning' });
});
