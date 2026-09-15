/**
 * @jest-environment jsdom
 *
 * Feature : catégories multiples au sein d'une même course Chrono
 * (ex: "Solo" / "Équipe"). Teste assignCategoryRanks() en isolation —
 * la fonction pure qui numérote chaque participant dans sa catégorie tout
 * en conservant l'ordre scratch déjà trié en entrée.
 */
const { loadModules } = require('../helpers/loadApp');

beforeAll(() => {
    loadModules(['config', 'utils', 'notifications', 'state', 'clubs', 'multisport']);
});

test('sans catégorie du tout : hasMultipleCategories est false', () => {
    const arr = [{ name: 'Alice' }, { name: 'Bob' }];
    assignCategoryRanks(arr);
    expect(arr.hasMultipleCategories).toBe(false);
    expect(arr[0].catRank).toBe(1);
    expect(arr[0].catTotal).toBe(2); // même catégorie implicite '' pour tous
});

test('une seule catégorie renseignée : hasMultipleCategories est false', () => {
    const arr = [
        { name: 'Alice', category: 'Solo' },
        { name: 'Bob', category: 'Solo' },
    ];
    assignCategoryRanks(arr);
    expect(arr.hasMultipleCategories).toBe(false);
});

test('deux catégories distinctes : hasMultipleCategories est true, rang correct par catégorie', () => {
    // Ordre scratch déjà trié en entrée (ex: par temps croissant)
    const arr = [
        { name: 'Alice', category: 'Solo' },    // 1er scratch, 1er Solo
        { name: 'Bob', category: 'Équipe' },    // 2e scratch, 1er Équipe
        { name: 'Carol', category: 'Solo' },    // 3e scratch, 2e Solo
        { name: 'Dan', category: 'Équipe' },    // 4e scratch, 2e Équipe
    ];
    assignCategoryRanks(arr);

    expect(arr.hasMultipleCategories).toBe(true);
    expect(arr[0].catRank).toBe(1); expect(arr[0].catTotal).toBe(2); // Alice: 1er/2 Solo
    expect(arr[1].catRank).toBe(1); expect(arr[1].catTotal).toBe(2); // Bob: 1er/2 Équipe
    expect(arr[2].catRank).toBe(2); expect(arr[2].catTotal).toBe(2); // Carol: 2e/2 Solo
    expect(arr[3].catRank).toBe(2); expect(arr[3].catTotal).toBe(2); // Dan: 2e/2 Équipe
});

test('catégories vides mélangées à des catégories renseignées : la catégorie vide compte comme sa propre "catégorie"', () => {
    const arr = [
        { name: 'Alice', category: 'Solo' },
        { name: 'Bob', category: '' },
        { name: 'Carol', category: 'Solo' },
    ];
    assignCategoryRanks(arr);
    // Seul "Solo" est une catégorie non-vide distincte -> une seule catégorie
    // non-vide détectée, donc hasMultipleCategories reste false malgré 2
    // groupes distincts (Solo / vide) — la colonne catégorie ne doit
    // apparaître que si on a vraiment >=2 catégories NOMMÉES.
    expect(arr.hasMultipleCategories).toBe(false);
});

test("n'affecte pas l'ordre du tableau (numérote seulement)", () => {
    const arr = [
        { name: 'Alice', category: 'Solo' },
        { name: 'Bob', category: 'Équipe' },
    ];
    const before = arr.map((x) => x.name);
    assignCategoryRanks(arr);
    expect(arr.map((x) => x.name)).toEqual(before);
});
