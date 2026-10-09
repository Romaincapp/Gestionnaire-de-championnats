/**
 * @jest-environment jsdom
 *
 * Renommer un joueur dans un match (mode « 🔓 Modifier les matchs ») : choix entre
 * « Renommer partout » (même joueur, faute de frappe) et « Nouveau joueur » (ce match
 * seulement). Avant, seul ce match changeait mais le listing était renommé : les
 * autres matchs gardaient l'ancien nom, qui revenait au listing au verrouillage.
 */
const { loadModules, DEFAULT_ORDER } = require('../helpers/loadApp');

beforeAll(() => {
    loadModules(DEFAULT_ORDER);
});

const names = (list) => (list || []).map((p) => (typeof p === 'object' ? p.name : p));

beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
    championship.currentDay = 1;
    championship.days = {
        1: {
            dayType: 'championship',
            players: { 1: [{ name: 'Alice', club: 'A' }, { name: 'Bruno', club: 'B' }, { name: 'Chloé', club: '' }] },
            matches: {
                1: [
                    { player1: 'Alice', player2: 'Bruno', score1: 11, score2: 7, completed: true, winner: 'Alice' },
                    { player1: 'Alice', player2: 'Chloé', score1: '', score2: '' },
                    { player1: 'Bruno', player2: 'Chloé', score1: '', score2: '' },
                ],
            },
        },
    };
});

const matches = () => championship.days[1].matches[1];
const listing = () => names(championship.days[1].players[1]);
const modal = () => document.getElementById('renamePlayerChoiceModal');

test('renommer un joueur présent ailleurs ouvre le choix, sans rien changer avant la réponse', () => {
    window.editMatchPlayerName(1, 1, 0, 'player1', 'Alicia');
    expect(modal()).not.toBeNull();
    expect(modal().textContent).toMatch(/1 autre match/);
    expect(matches()[0].player1).toBe('Alice');
});

test('« Renommer partout » : tous les matchs, le vainqueur et le listing (club conservé)', () => {
    window.editMatchPlayerName(1, 1, 0, 'player1', 'Alicia');
    document.getElementById('renameChoiceAll').click();
    expect(modal()).toBeNull();
    expect(matches().map((m) => m.player1)).toEqual(['Alicia', 'Alicia', 'Bruno']);
    expect(matches()[0].winner).toBe('Alicia');
    expect(listing()).toEqual(['Alicia', 'Bruno', 'Chloé']);
    expect(championship.days[1].players[1][0]).toEqual({ name: 'Alicia', club: 'A' });
});

test('« Nouveau joueur » : ce match seulement, l\'ancien garde ses matchs et sa place au listing', () => {
    window.editMatchPlayerName(1, 1, 1, 'player1', 'Denis');
    document.getElementById('renameChoiceSingle').click();
    expect(matches().map((m) => m.player1)).toEqual(['Alice', 'Denis', 'Bruno']);
    expect(listing()).toEqual(['Alice', 'Bruno', 'Chloé', 'Denis']);
});

test('le verrouillage ne fait plus réapparaître l\'ancien nom comme un joueur de plus', () => {
    window.editMatchPlayerName(1, 1, 0, 'player1', 'Alicia');
    document.getElementById('renameChoiceAll').click();
    window.reconcilePlayersFromMatches(1);
    expect(listing()).toEqual(['Alicia', 'Bruno', 'Chloé']);
});

test('« Renommer partout » vers un joueur déjà inscrit : fusion, pas de doublon au listing', () => {
    window.editMatchPlayerName(1, 1, 2, 'player2', 'Alice');
    document.getElementById('renameChoiceAll').click();
    expect(matches()[1]).toMatchObject({ player1: 'Alice', player2: 'Alice' });
    expect(listing()).toEqual(['Alice', 'Bruno']);
});

test('Annuler : rien ne change', () => {
    window.editMatchPlayerName(1, 1, 0, 'player1', 'Alicia');
    window.resolveRenamePlayerChoice(null);
    expect(modal()).toBeNull();
    expect(matches()[0].player1).toBe('Alice');
    expect(listing()).toEqual(['Alice', 'Bruno', 'Chloé']);
});

test('remplacer un BYE ne pose pas de question', () => {
    matches().push({ player1: 'Chloé', player2: 'BYE', score1: '', score2: '' });
    window.editMatchPlayerName(1, 1, 3, 'player2', 'Emma');
    expect(modal()).toBeNull();
    expect(matches()[3].player2).toBe('Emma');
    expect(listing()).toContain('Emma');
});

describe('poules et phase finale', () => {
    beforeEach(() => {
        const day = championship.days[1];
        day.matches = { 1: [{ player1: 'Zed', player2: 'Yves', score1: '', score2: '' }] };   // match ordinaire au même index
        day.pools = {
            enabled: true,
            divisions: {
                1: {
                    pools: [['Alice', 'Bruno'], ['Chloé', 'Denis']],
                    matches: [
                        { id: 'p1', player1: 'Alice', player2: 'Bruno', score1: '', score2: '' },
                        { id: 'p2', player1: 'Chloé', player2: 'Denis', score1: '', score2: '' },
                    ],
                },
            },
            manualFinalPhase: {
                divisions: {
                    1: {
                        qualified: [{ name: 'Alice', poolIndex: 0 }, { name: 'Chloé', poolIndex: 1 }],
                        rounds: { Finale: { matches: [{ id: 'f1', player1: 'Alice', player2: 'Chloé', winner: 'Alice' }] } },
                        champion: 'Alice',
                    },
                },
            },
        };
    });

    test('match de poule : retrouvé par son id, pas le match ordinaire de même position', () => {
        window.editPoolMatchPlayerName(1, 1, 'p1', 'player1', 'Alicia');
        document.getElementById('renameChoiceAll').click();
        expect(championship.days[1].matches[1][0].player1).toBe('Zed');
        const pd = championship.days[1].pools.divisions[1];
        expect(pd.matches[0].player1).toBe('Alicia');
        expect(pd.pools[0]).toEqual(['Alicia', 'Bruno']);
        // « partout » couvre aussi la phase finale
        const fp = championship.days[1].pools.manualFinalPhase.divisions[1];
        expect(fp.rounds.Finale.matches[0]).toMatchObject({ player1: 'Alicia', winner: 'Alicia' });
        expect(fp.qualified[0].name).toBe('Alicia');
        expect(fp.champion).toBe('Alicia');
    });

    test('match de poule, « Nouveau joueur » : il rejoint la poule de l\'ancien', () => {
        window.editPoolMatchPlayerName(1, 1, 'p2', 'player2', 'Emma');
        document.getElementById('renameChoiceSingle').click();
        const pd = championship.days[1].pools.divisions[1];
        expect(pd.matches[1].player2).toBe('Emma');
        expect(pd.pools[1]).toEqual(['Chloé', 'Denis', 'Emma']);
    });

    test('phase finale : même choix, « Nouveau joueur » ne touche que ce match', () => {
        window.editFinalMatchPlayerName(1, 1, 'f1', 'player2', 'Emma');
        expect(modal()).not.toBeNull();
        document.getElementById('renameChoiceSingle').click();
        const fp = championship.days[1].pools.manualFinalPhase.divisions[1];
        expect(fp.rounds.Finale.matches[0].player2).toBe('Emma');
        expect(championship.days[1].pools.divisions[1].matches[1].player1).toBe('Chloé');
    });
});
