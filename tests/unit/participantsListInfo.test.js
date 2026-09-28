/**
 * @jest-environment jsdom
 *
 * « Participants disponibles » après « 🏁 Séries automatiques » (demande utilisateur) :
 * la liste n'a plus qu'une fiche nom + club par inscription. Sur la même ligne (pas en
 * dessous, pour ne pas prendre de place) : l'épreuve, le temps d'engagement, la série et
 * le couloir. Les lignes non placées sont signalées en tête. La liste s'agrandit à la
 * souris (poignée en bas à droite) et garde sa hauteur.
 */
const { loadModules, DEFAULT_ORDER } = require('../helpers/loadApp');

beforeAll(() => {
    loadModules(DEFAULT_ORDER);
});

const LINES = [
    'Anne Martin 50m libre 32.50',
    'Anne Martin 50m dos 40.10',
    'Bob Durand 50m libre 30.00',
    'Chloé Petit 100m brasse 45.00', // comprise, mais aucune épreuve « 100m brasse »
    'Ligne sans info',               // non comprise
];

beforeEach(() => {
    try { localStorage.clear(); } catch (e) { /* ignore */ }
    championship.config = { numberOfDivisions: 1, numberOfCourts: 4 };
    championship.days = {
        1: {
            dayType: 'chrono', players: {}, matches: {},
            chronoData: {
                events: [{ id: 1, name: '50m libre', series: [] }, { id: 2, name: '50m dos', series: [] }],
                series: [], participants: LINES.map((name, i) => ({ id: i + 1, name, club: '', bib: i + 1 })),
                nextEventId: 3, nextSerieId: 1, nextParticipantId: LINES.length + 1,
            },
        },
    };
    window.generateSwimmingSeries(1, 1, 5);
    document.body.innerHTML = '<div id="chrono-content-1"></div>';
    window.refreshChronoDisplay(1);
});

const cd = () => championship.days[1].chronoData;
const rows = () => [...document.querySelectorAll('[id^="participant-row-1-"]')];
const rowOf = (p) => document.getElementById('participant-row-1-' + p.id);
const infoOf = (p) => (rowOf(p).querySelector('.participant-entry-info') || { textContent: '' }).textContent.replace(/\s+/g, ' ').trim();

describe('ligne d\'infos d\'une inscription (même ligne)', () => {
    test('nageur inscrit dans 2 épreuves : épreuve, temps d\'engagement, série et couloir de chaque inscription', () => {
        const [libre, dos] = cd().participants.filter(p => p.name === 'Anne Martin');
        expect(infoOf(libre)).toBe('🎯 50m libre · ⏱ 32,50s · Série 1, couloir 4');
        expect(infoOf(dos)).toBe('🎯 50m dos · ⏱ 40,10s · Série 1, couloir 3');
        // Sur la ligne du participant, pas dans un bloc en dessous
        expect(rowOf(libre).querySelector('.participant-entry-info').closest('label')).not.toBeNull();
    });

    test('ligne d\'origine en info-bulle sur le nom', () => {
        const bob = cd().participants.find(p => p.name === 'Bob Durand');
        expect(rowOf(bob).querySelector('[title^="Ligne d\'origine"]').getAttribute('title')).toBe('Ligne d\'origine : Bob Durand 50m libre 30.00');
    });

    test('série et couloir lus en direct : nageur déplacé dans une autre série de l\'épreuve', () => {
        const serie1 = cd().events[0].series[0];
        serie1.participants = serie1.participants.filter(p => p.name !== 'Anne Martin');
        cd().series.push({ id: 99, name: 'Série 2', eventId: 1, laneMode: true, participants: [{ id: 500, name: 'Anne Martin', laneNumber: 2 }] });
        window.refreshChronoDisplay(1);
        const libre = cd().participants.find(p => p.name === 'Anne Martin' && p.swimEventId === 1);
        expect(infoOf(libre)).toBe('🎯 50m libre · ⏱ 32,50s · Série 2, couloir 2');
    });

    test('retiré de toutes les séries de son épreuve : « hors série »', () => {
        const serie1 = cd().events[0].series[0];
        serie1.participants = serie1.participants.filter(p => p.name !== 'Bob Durand');
        window.refreshChronoDisplay(1);
        const bob = cd().participants.find(p => p.name === 'Bob Durand');
        expect(infoOf(bob)).toBe('🎯 50m libre · ⏱ 30,00s · ⚠️ hors série');
    });
});

describe('lignes non placées', () => {
    test('signalées, avec la raison, et affichées en tête', () => {
        const order = rows().map(r => r.textContent);
        expect(order[0]).toContain('Chloé Petit 100m brasse');
        expect(order[1]).toContain('Ligne sans info');
        const [chloe, ligne] = rows().slice(0, 2).map(r => r.querySelector('.participant-unplaced'));
        expect(chloe.getAttribute('title')).toContain('aucune épreuve ne correspond');
        expect(ligne.getAttribute('title')).toContain('ligne non comprise');
        expect(document.querySelectorAll('.participant-unplaced')).toHaveLength(2);
    });

    test('liste sans « Séries automatiques » : ni infos ni badge', () => {
        cd().participants = [{ id: 1, name: 'Zoé Libre', club: '', bib: 1 }];
        cd().events.forEach(e => { e.series = []; });
        window.refreshChronoDisplay(1);
        expect(document.querySelector('.participant-entry-info')).toBeNull();
        expect(document.querySelector('.participant-unplaced')).toBeNull();
    });
});

describe('liste agrandissable à la souris', () => {
    const list = () => document.getElementById('participants-list-1');

    test('poignée de redimensionnement verticale', () => {
        expect(list().getAttribute('style')).toMatch(/resize:\s*vertical/);
    });

    test('la hauteur choisie est gardée après un rafraîchissement', () => {
        list().style.height = '420px'; // ce que fait la poignée du navigateur
        window.saveParticipantsListHeight(1, list());
        window.refreshChronoDisplay(1);
        expect(list().style.height).toBe('420px');
    });

    test('un simple clic dans la liste ne change pas la hauteur enregistrée', () => {
        window.saveParticipantsListHeight(1, list());
        expect(localStorage.getItem('chronoParticipantsListHeight')).toBeNull();
    });
});
