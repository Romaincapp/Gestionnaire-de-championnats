/**
 * @jest-environment jsdom
 */
const { loadModules } = require('../helpers/loadApp');

beforeAll(() => {
    loadModules(['utils']);
});

describe('formatProperName', () => {
    test('capitalise après espace et tiret', () => {
        expect(formatProperName('jean-pierre dupont')).toBe('Jean-Pierre Dupont');
    });

    // Régression : bug trouvé et corrigé le 2026-09 (commit 7de0947) —
    // formatProperName ne capitalisait pas après une apostrophe.
    test("capitalise après apostrophe (régression O'Brien)", () => {
        expect(formatProperName("o'brien")).toBe("O'Brien");
        expect(formatProperName("jean-pierre d'angelo")).toBe("Jean-Pierre D'Angelo");
    });

    test('préserve les accents', () => {
        expect(formatProperName('élodie martin')).toBe('Élodie Martin');
    });

    test('retourne une chaîne vide pour une entrée vide/undefined', () => {
        expect(formatProperName('')).toBe('');
        expect(formatProperName(undefined)).toBe('');
    });

    test('gère un objet joueur {name, club} en formatant name en place', () => {
        const player = { name: "o'brien", club: 'ASPTT' };
        const result = formatProperName(player);
        expect(result.name).toBe("O'Brien");
        expect(result.club).toBe('ASPTT');
    });
});

describe('calculateWinRate', () => {
    test('calcule un pourcentage arrondi', () => {
        expect(calculateWinRate(3, 4)).toBe(75);
        expect(calculateWinRate(1, 3)).toBe(33);
    });

    test('retourne 0 si total est 0 (pas de division par zéro)', () => {
        expect(calculateWinRate(0, 0)).toBe(0);
    });
});

describe('formatTime', () => {
    test('formate des millisecondes en mm:ss.ms', () => {
        expect(formatTime(65432)).toBe('01:05.43');
        expect(formatTime(0)).toBe('00:00.00');
    });

    test('retourne 00:00.00 pour une valeur négative ou nulle', () => {
        expect(formatTime(-100)).toBe('00:00.00');
        expect(formatTime(null)).toBe('00:00.00');
    });
});

describe('shuffleArray', () => {
    test('ne modifie pas le tableau original et conserve les mêmes éléments', () => {
        const original = [1, 2, 3, 4, 5];
        const copy = [...original];
        const shuffled = shuffleArray(original);
        expect(original).toEqual(copy); // non muté
        expect(shuffled.sort()).toEqual(copy.sort()); // mêmes éléments
    });
});

describe('isNewerVersion', () => {
    test('retourne true si currentData n\'a pas de lastModified', () => {
        expect(isNewerVersion({ lastModified: '2026-01-01' }, {})).toBe(true);
    });

    test('retourne false si newData n\'a pas de lastModified', () => {
        expect(isNewerVersion({}, { lastModified: '2026-01-01' })).toBe(false);
    });

    test('compare correctement deux dates', () => {
        expect(isNewerVersion(
            { lastModified: '2026-02-01' },
            { lastModified: '2026-01-01' }
        )).toBe(true);
    });
});

describe('hasReverseMatchInDay', () => {
    test('détecte un match existant dans les deux sens', () => {
        const matches = [{ player1: 'A', player2: 'B' }];
        expect(hasReverseMatchInDay(matches, 'A', 'B')).toBe(true);
        expect(hasReverseMatchInDay(matches, 'B', 'A')).toBe(true);
        expect(hasReverseMatchInDay(matches, 'A', 'C')).toBe(false);
    });
});
