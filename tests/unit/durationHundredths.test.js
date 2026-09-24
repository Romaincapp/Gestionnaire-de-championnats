/**
 * @jest-environment jsdom
 *
 * Temps total du classement général des Courses : il était arrondi à la
 * seconde (« 4s »), alors qu'en natation ce sont les centièmes qui départagent.
 */
const { loadModules, DEFAULT_ORDER } = require('../helpers/loadApp');

beforeAll(() => {
    loadModules(DEFAULT_ORDER);
});

test.each([
    [4200, '4,20s'],
    [32507, '32,51s'],
    [62350, '1m02,35s'],
    [3723450, '1h02m03,45s'],
    [59999, '1m00,00s'], // arrondi au centième qui fait passer la minute
    [0, '0,00s'],
])('%i ms → %s', (ms, expected) => {
    expect(window.formatDurationHMS(ms)).toBe(expected);
});

test('deux temps différant de quelques centièmes restent distincts', () => {
    expect(window.formatDurationHMS(32500)).not.toBe(window.formatDurationHMS(32800));
});
