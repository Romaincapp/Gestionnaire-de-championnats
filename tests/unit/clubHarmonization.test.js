/**
 * @jest-environment jsdom
 *
 * « 🏛️ Harmoniser les clubs » : rattache les nageurs sans club (club resté collé
 * au nom quand la ligne d'import le portait en fin de ligne : « Rogge Maxime
 * Boulaie ») et fusionne les variantes d'un même club. Sans club, un nageur ne
 * marque aucun point au classement des clubs (bug rapporté : colonnes J2 vides).
 */
const { loadModules, DEFAULT_ORDER } = require('../helpers/loadApp');

beforeAll(() => {
    loadModules(DEFAULT_ORDER);
});

function p(name, club, time) {
    return { id: name + time, name, club, bib: 1, status: 'finished', finishTime: time, totalTime: time, laneNumber: 1 };
}
function serie(id, parts) {
    return {
        id, name: 'Série ' + id, sportType: 'swimming', laneMode: true,
        participants: parts,
        results: parts.map(x => ({ name: x.name, club: x.club, bib: x.bib, time: x.finishTime })),
    };
}
function day(series) {
    return { dayType: 'chrono', players: {}, matches: {}, chronoData: { events: [{ id: 1, name: '25m libre', series }], series: [], participants: [] } };
}

beforeEach(() => {
    document.body.innerHTML = '<div id="multisportRankingContent"></div>';
    championship.config = { numberOfDivisions: 1, numberOfCourts: 4 };
    championship.days = {
        1: day([serie(1, [p('Martin Paul', 'Aquaphiles', 30000), p('Durand Léa', 'Boulaie', 31000)])]),
        2: day([serie(2, [
            p('Dupont Jean Boulaie', '', 20000),       // club connu en fin de nom
            p('Colin Renards', '', 21000),             // club connu, un seul mot de nom
            p('Petit Anne La Cordée', '', 22000),      // club inconnu, fin de nom récurrente
            p('Roux Marc La Cordée', '', 23000),
            p('Martin Paul Aquaphiles Sra', '', 24000), // même nageur qu'en J1 → son club
            p('Blanc Eva Aquaphiles Sra', '', 25000),
            p('Inconnu Total', '', 26000),             // aucune piste
        ])]),
    };
});

function byName(list) {
    const out = {};
    list.forEach(o => { out[o.name] = o; });
    return out;
}

test('repère les nageurs sans club et propose nom nettoyé + club', () => {
    const o = byName(findClubOrphans());
    expect(Object.keys(o)).toHaveLength(7);
    expect(o['Dupont Jean Boulaie']).toMatchObject({ day: 2, newName: 'Dupont Jean', club: 'Boulaie' });
    expect(o['Colin Renards']).toMatchObject({ newName: 'Colin', club: 'Renards' });
    expect(o['Petit Anne La Cordée']).toMatchObject({ newName: 'Petit Anne', club: 'La Cordée', source: 'recurring' });
    expect(o['Martin Paul Aquaphiles Sra']).toMatchObject({ newName: 'Martin Paul', club: 'Aquaphiles' });
    expect(o['Blanc Eva Aquaphiles Sra']).toMatchObject({ newName: 'Blanc Eva', club: 'Aquaphiles Sra' });
    expect(o['Inconnu Total']).toMatchObject({ newName: 'Inconnu Total', club: '' });
});

test('les nageurs déjà rattachés ne sont pas proposés', () => {
    const names = findClubOrphans().map(o => o.name);
    expect(names).not.toContain('Martin Paul');
    expect(names).not.toContain('Durand Léa');
});

test('rattacher les orphelins remplit les colonnes J2 du classement des clubs', () => {
    const before = calculateClubEventRanking();
    // J2 : aucun point, faute de club
    const j2Index = calculateEventRankings().findIndex(e => e.dayNumber === 2);
    expect(before.every(c => c.perEvent[j2Index] == null)).toBe(true);

    findClubOrphans().forEach(assignClubToOrphan);
    const after = calculateClubEventRanking();
    const boulaie = after.find(c => c.club === 'Boulaie');
    expect(boulaie.perEvent[j2Index]).toBe(25);
    // Nom nettoyé partout : participants ET résultats (le classement lit les résultats)
    const s = championship.days[2].chronoData.events[0].series[0];
    expect(s.participants[0]).toMatchObject({ name: 'Dupont Jean', club: 'Boulaie' });
    expect(s.results[0]).toMatchObject({ name: 'Dupont Jean', club: 'Boulaie' });
    // Sans suggestion : rien n'est touché
    expect(s.participants[6]).toMatchObject({ name: 'Inconnu Total', club: '' });
});

test('les variantes d\'un club (y compris clubs proposés) sont regroupées', () => {
    const orphans = findClubOrphans();
    const groups = findClubVariantGroups(orphans.map(o => o.club));
    const aqua = groups.find(g => g.members.some(m => m.club === 'Aquaphiles'));
    expect(aqua.members.map(m => m.club).sort()).toEqual(['Aquaphiles', 'Aquaphiles Sra']);
    expect(groups.some(g => g.members.some(m => m.club === 'Boulaie'))).toBe(false);
});

test('renameClubEverywhere fusionne un club dans toutes les journées', () => {
    findClubOrphans().forEach(assignClubToOrphan);
    renameClubEverywhere('Aquaphiles Sra', 'Aquaphiles');
    const clubs = calculateClubEventRanking().map(c => c.club);
    expect(clubs).toContain('Aquaphiles');
    expect(clubs).not.toContain('Aquaphiles Sra');
});

test('la fenêtre applique les lignes cochées, avec les corrections saisies', () => {
    global.saveToLocalStorage = jest.fn();
    showClubHarmonizationModal();
    const modal = document.getElementById('clubHarmonizationModal');
    expect(modal).not.toBeNull();
    const rows = Array.from(modal.querySelectorAll('.club-orphan-row'));
    const idx = name => rows.findIndex(r => r.textContent.includes(name));
    // Ligne sans suggestion : décochée ; on la corrige à la main
    const iUnknown = idx('Inconnu Total');
    const check = modal.querySelector('.club-orphan-check[data-index="' + iUnknown + '"]');
    expect(check.checked).toBe(false);
    modal.querySelector('.club-orphan-club[data-index="' + iUnknown + '"]').value = 'Trucket';
    check.checked = true;
    // Ligne décochée : laissée telle quelle
    modal.querySelector('.club-orphan-check[data-index="' + idx('Roux Marc') + '"]').checked = false;

    applyClubHarmonization();
    expect(document.getElementById('clubHarmonizationModal')).toBeNull();
    const parts = championship.days[2].chronoData.events[0].series[0].participants;
    expect(parts.find(x => x.name === 'Inconnu Total').club).toBe('Trucket');
    expect(parts.find(x => x.name === 'Roux Marc La Cordée').club).toBe('');
    expect(parts.find(x => x.name === 'Petit Anne').club).not.toBe('');
});

test('le bouton est présent à côté de « Harmoniser les noms »', () => {
    updateMultisportRanking();
    const html = document.getElementById('multisportRankingContent').innerHTML;
    expect(html).toContain('showClubHarmonizationModal()');
});
