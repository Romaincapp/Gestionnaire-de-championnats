const { loadModules } = require('../helpers/loadApp');

describe('getCourtsForDivision : terrains par division', () => {
    beforeAll(() => loadModules(['config']));

    function ranges(divisions, courts) {
        window.championship = { config: { numberOfDivisions: divisions, numberOfCourts: courts } };
        const out = [];
        for (let d = 1; d <= divisions; d++) out.push(window.getCourtsForDivision(d));
        return out;
    }

    test('1 terrain pour 3 divisions : toutes sur le terrain 1 (pas « Terrains 2-1 »)', () => {
        expect(ranges(3, 1)).toEqual([
            { first: 1, last: 1, count: 1 },
            { first: 1, last: 1, count: 1 },
            { first: 1, last: 1, count: 1 },
        ]);
    });

    test('2 terrains pour 3 divisions : partage à tour de rôle', () => {
        expect(ranges(3, 2).map(r => r.first)).toEqual([1, 2, 1]);
    });

    test('4 terrains pour 3 divisions : 1-2, 3, 4 (jamais au-delà du nombre de terrains)', () => {
        expect(ranges(3, 4)).toEqual([
            { first: 1, last: 2, count: 2 },
            { first: 3, last: 3, count: 1 },
            { first: 4, last: 4, count: 1 },
        ]);
    });

    test('répartitions usuelles inchangées', () => {
        expect(ranges(2, 4).map(r => [r.first, r.last])).toEqual([[1, 2], [3, 4]]);
        expect(ranges(3, 5).map(r => [r.first, r.last])).toEqual([[1, 2], [3, 4], [5, 5]]);
        expect(ranges(3, 6).map(r => [r.first, r.last])).toEqual([[1, 2], [3, 4], [5, 6]]);
    });

    test('toutes les combinaisons : plage valide, dans 1..terrains', () => {
        for (let div = 1; div <= 6; div++) {
            for (let courts = 1; courts <= 12; courts++) {
                ranges(div, courts).forEach(r => {
                    expect(r.count).toBeGreaterThanOrEqual(1);
                    expect(r.first).toBeGreaterThanOrEqual(1);
                    expect(r.last).toBe(r.first + r.count - 1);
                    expect(r.last).toBeLessThanOrEqual(courts);
                });
            }
        }
    });
});
