/**
 * @jest-environment jsdom
 *
 * « 🔍 Vérifier les noms » (classement général) : scénarios de saisie qu'un humain
 * fait réellement d'une journée à l'autre, et faux positifs à éviter.
 */
const { loadModules, DEFAULT_ORDER } = require('../helpers/loadApp');

beforeAll(() => {
    loadModules(DEFAULT_ORDER);
});

const linked = (a, b) => compareNamesForCheck(a, b) !== null;
const groupsOf = (names) => groupSimilarPlayerNames(names).map(g => g.members.map(m => m.name).sort());

describe('même personne, écrite autrement', () => {
    test.each([
        ['Jean Dupont', 'JEAN DUPONT', 'majuscules'],
        ['Hélène Lefèvre', 'Helene Lefevre', 'accents'],
        ['Jean Dupont', 'Jean  Dupont ', 'espaces'],
        ['Jean-Pierre Martin', 'Jean Pierre Martin', 'tiret'],
        ['Jeanpierre Martin', 'Jean-Pierre Martin', 'mots collés'],
        ['Jean Dupont', 'Jean Dupond', 'faute de frappe'],
        ['Jean Dupont', 'Jaen Dupont', 'lettres inversées'],
        ['Dupont Jean', 'Jean Dupont', 'nom et prénom inversés'],
        ['DUPONT Jean', 'jean dupont', 'inversion + casse'],
        ['Dupont Jean', 'Jean Dupond', 'inversion + faute'],
        ['Van Damme Lucie', 'Lucie Van Damme', 'nom à particule inversé'],
        ['Jean Dupont', 'Jean Dupont La Boule', 'club ajouté au nom'],
        ['Jean Dupont', 'Jean Dupont (La Boule)', 'club entre parenthèses'],
        ['Jean Dupont', 'La Boule - Jean Dupont', 'club devant le nom'],
        ['Jean Dupont Boule Joyeuse', 'Jean Dupont La Boule Joyeuse', 'déterminant en plus devant le club'],
        ['Jean Dupont Archers', 'Jean Dupont Les Archers', 'déterminant (les)'],
        ['Jean Dupont TT Liège', 'Jean Dupont Club TT Liège', '« club » en plus'],
        ['Jean Dupont Union', "Jean Dupont L'Union", "article élidé"],
        ['Dupont Jean La Boule', 'Jean Dupont', 'inversion + club'],
        ['J. Dupont', 'Jean Dupont', 'initiale du prénom'],
        ['Dupont J', 'Jean Dupont', 'initiale + inversion'],
        ['Marie Dupont', 'Marie Dupont-Durand', 'nom composé (mariage)'],
        ['Jean', 'Jean La Boule Joyeuse', 'prénom seul + club'],
    ])('%s ↔ %s (%s)', (a, b) => {
        expect(linked(a, b)).toBe(true);
        expect(groupsOf([a, b])).toHaveLength(1);
    });

    test('les raisons sont lisibles', () => {
        expect(compareNamesForCheck('Dupont Jean', 'Jean Dupont').reasons).toContain('nom et prénom inversés');
        expect(compareNamesForCheck('Jean Dupont Boule', 'Jean Dupont La Boule').reasons).toContain('article ou « club » en plus');
        expect(compareNamesForCheck('J. Dupont', 'Jean Dupont').reasons).toContain('initiale au lieu du prénom');
        expect(compareNamesForCheck('Jean Dupont', 'Jean Dupont La Boule').reasons.join()).toMatch(/mot.* en plus/);
    });

    test('inversion et déterminant restent « similitude forte » (≥ 85 %)', () => {
        expect(compareNamesForCheck('Dupont Jean', 'Jean Dupont').score).toBeGreaterThanOrEqual(85);
        expect(compareNamesForCheck('Jean Dupont Archers', 'Jean Dupont Les Archers').score).toBeGreaterThanOrEqual(85);
    });
});

describe('personnes différentes : pas de rapprochement', () => {
    test.each([
        ['Jean Dupont', 'Paul Martin'],
        ['Jean Dupont', 'Jean Martin'],
        ['Jean Dupont', 'Pierre Dupont'],
        ['Jean Dupont', 'J. Martin'],
        ['Anne Leroy', 'Anna Lemaire'],
    ])('%s ≠ %s', (a, b) => {
        expect(linked(a, b)).toBe(false);
    });

    test('frères/sœurs au prénom court : signalés mais « incertain »', () => {
        const cmp = compareNamesForCheck('Léa Dupont', 'Léo Dupont');
        expect(cmp).not.toBeNull();
        expect(cmp.score).toBeLessThan(65);
    });

    test('« Jean » seul ne relie pas Jean Dupont et Jean Martin (ambigu)', () => {
        expect(groupsOf(['Jean Dupont', 'Jean', 'Jean Martin'])).toEqual([]);
    });

    test('« J. Dupont » ambigu entre Jean et Julie Dupont : pas de groupe', () => {
        expect(groupsOf(['Jean Dupont', 'J. Dupont', 'Julie Dupont'])).toEqual([]);
    });

    test('« J. Dupont » non ambigu : groupé avec Jean Dupont', () => {
        expect(groupsOf(['Jean Dupont', 'J. Dupont', 'Paul Martin'])).toEqual([['J. Dupont', 'Jean Dupont']]);
    });
});

describe('dans un championnat', () => {
    beforeEach(() => {
        localStorage.clear();
        document.body.innerHTML = '';
        delete championship.nameCheckIgnored;
        championship.days = {
            1: {
                dayType: 'championship',
                players: { 1: [{ name: 'Jean Dupont', club: 'La Boule' }, { name: 'Paul Martin', club: 'TC Liège' }] },
                matches: { 1: [{ player1: 'Jean Dupont', player2: 'Paul Martin', score1: 3, score2: 1, completed: true, winner: 'Jean Dupont' }] },
            },
            2: {
                dayType: 'championship',
                players: { 1: [{ name: 'Dupont Jean', club: 'Boule' }, { name: 'Martin Paul', club: 'TC Liege' }] },
                matches: { 1: [{ player1: 'Dupont Jean', player2: 'Martin Paul', score1: 0, score2: 3, completed: true, winner: 'Martin Paul' }] },
            },
        };
    });

    test('inversion nom/prénom entre deux journées : 2 groupes, club compatible malgré le « La »', () => {
        const groups = groupSimilarPlayerNames(collectChampionshipPlayerNames());
        expect(groups.map(g => g.members.map(m => m.name).sort())).toEqual(
            expect.arrayContaining([['Dupont Jean', 'Jean Dupont'], ['Martin Paul', 'Paul Martin']]));
        groups.forEach(g => expect(g.minScore).toBeGreaterThanOrEqual(85));
    });

    test('deux noms qui se sont affrontés ne sont jamais proposés', () => {
        championship.days[1].matches[1].push({ player1: 'Jean Dupont', player2: 'Jean Dupond', score1: '', score2: '' });
        const groups = groupSimilarPlayerNames(collectChampionshipPlayerNames());
        expect(groups.some(g => g.members.some(m => m.name === 'Jean Dupond'))).toBe(false);
    });

    test('clubs différents : proposé mais « incertain »', () => {
        championship.days[2].players[1][0].club = 'Les Archers';
        const g = groupSimilarPlayerNames(collectChampionshipPlayerNames())
            .find(x => x.members.some(m => m.name === 'Dupont Jean'));
        expect(g.minScore).toBeLessThan(65);
        expect(g.edges[0].notes).toContain('clubs différents');
    });

    test('suggestion : sans club ajouté ni initiale', () => {
        expect(suggestNameForGroup([
            { name: 'Jean Dupont La Boule', count: 9 }, { name: 'Jean Dupont', count: 2 }, { name: 'J. Dupont', count: 1 },
        ])).toBe('Jean Dupont');
    });

    test('fusion : renomme partout et ne laisse pas de doublon dans la liste', () => {
        championship.days[2].players[1].push({ name: 'Jean Dupont', club: '' });
        showNameCheckModal();
        const gi = Array.from(document.querySelectorAll('[id^="nameCheckInput-"]'))
            .findIndex(i => /Dupont/.test(i.value));
        document.getElementById('nameCheckInput-' + gi).value = 'Jean Dupont';
        applyNameCheckMerge(gi);
        const names2 = championship.days[2].players[1].map(p => p.name);
        expect(names2.filter(n => n === 'Jean Dupont')).toHaveLength(1);
        expect(championship.days[2].matches[1][0].player1).toBe('Jean Dupont');
        expect(championship.days[2].players[1].find(p => p.name === 'Jean Dupont').club).toBe('Boule');
    });

    test('« Personnes différentes » : le groupe n\'est plus proposé (mémorisé)', () => {
        showNameCheckModal();
        const gi = Array.from(document.querySelectorAll('[id^="nameCheckInput-"]'))
            .findIndex(i => /Dupont/.test(i.value));
        ignoreNameCheckGroup(gi);
        expect(championship.nameCheckIgnored.length).toBe(1);
        closeNameCheckModal();
        showNameCheckModal();
        const values = Array.from(document.querySelectorAll('[id^="nameCheckInput-"]')).map(i => i.value);
        expect(values.some(v => /Dupont/.test(v))).toBe(false);
        expect(values.some(v => /Martin/.test(v))).toBe(true);
    });
});

describe('équipes numérotées et données réelles', () => {
    test.each([
        ['Apri1', 'Apri2'],
        ['Pela Jo1', 'Pela Jo2'],
        ['Dupont 25m Libre', 'Dupont 50 M Libre'],
    ])('%s ≠ %s (numéros différents)', (a, b) => {
        expect(linked(a, b)).toBe(false);
    });

    test('« Equipe 01 » = « Équipe 1 »', () => {
        expect(linked('Equipe 01', 'Équipe 1')).toBe(true);
    });

    test('lien fragile écarté si les deux noms sont inscrits le même jour', () => {
        const items = [
            { name: 'Panda 1', count: 3, days: { 1: true }, divisions: {}, listed: { 1: true } },
            { name: 'Panda Olivier 1', count: 3, days: { 1: true }, divisions: {}, listed: { 1: true } },
        ];
        expect(groupSimilarPlayerNames(items)).toEqual([]);
    });
});
