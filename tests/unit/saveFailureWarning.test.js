/**
 * @jest-environment jsdom
 *
 * Échec de sauvegarde localStorage (quota dépassé, navigation privée...) :
 * il n'était signalé que par un console.warn — invisible pendant une
 * compétition, l'utilisateur croyait ses données enregistrées.
 * Attendu : un bandeau persistant et visible (un seul, pas de spam à chaque
 * sauvegarde), avec un bouton d'export de secours, retiré automatiquement dès
 * que toutes les sauvegardes réussissent de nouveau.
 */
const { loadModules, DEFAULT_ORDER } = require('../helpers/loadApp');

beforeAll(() => {
    loadModules(DEFAULT_ORDER);
});

let setItemSpy;

function failWith(name) {
    setItemSpy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('storage error', name);
    });
}

function storageWorks() {
    if (setItemSpy) setItemSpy.mockRestore();
    setItemSpy = null;
}

function banners() {
    return document.querySelectorAll('#saveFailureBanner');
}

beforeEach(() => {
    jest.useFakeTimers();
    document.body.innerHTML = '';
    championship.days = { 1: { players: {}, matches: {} } };
    // Repartir d'un état "sauvegardes OK"
    storageWorks();
    saveToLocalStorage();
    saveChronoToLocalStorage();
});

afterEach(() => {
    storageWorks();
    jest.useRealTimers();
});

test('un échec de sauvegarde du championnat affiche un bandeau persistant', () => {
    failWith('QuotaExceededError');
    saveToLocalStorage();

    const banner = document.getElementById('saveFailureBanner');
    expect(banner).not.toBeNull();
    expect(banner.textContent).toMatch(/PAS enregistrées/);
    expect(banner.textContent).toMatch(/plein/);

    // Persistant : toujours là bien après la durée d'un toast
    jest.advanceTimersByTime(60000);
    expect(banners()).toHaveLength(1);
});

test('pas de spam : des échecs répétés gardent un seul bandeau', () => {
    failWith('QuotaExceededError');
    for (let i = 0; i < 20; i++) saveToLocalStorage();
    expect(banners()).toHaveLength(1);
});

test('stockage indisponible (navigation privée) : cause différente annoncée', () => {
    failWith('SecurityError');
    saveToLocalStorage();
    expect(document.getElementById('saveFailureBanner').textContent).toMatch(/indisponible/);
});

test('le bandeau disparaît dès que la sauvegarde refonctionne', () => {
    failWith('QuotaExceededError');
    saveToLocalStorage();
    expect(banners()).toHaveLength(1);

    storageWorks();
    saveToLocalStorage();
    expect(banners()).toHaveLength(0);
});

test('échec de la sauvegarde chrono : bandeau aussi, retiré seulement quand chrono ET championnat réussissent', () => {
    failWith('QuotaExceededError');
    saveChronoToLocalStorage();
    saveToLocalStorage();
    expect(banners()).toHaveLength(1);

    storageWorks();
    saveToLocalStorage(); // le championnat repasse, la course live pas encore resauvegardée
    expect(banners()).toHaveLength(1);

    saveChronoToLocalStorage();
    expect(banners()).toHaveLength(0);
});

test('le bouton du bandeau lance l\'export de secours', () => {
    const original = window.exportChampionship;
    window.exportChampionship = jest.fn();
    try {
        failWith('QuotaExceededError');
        saveToLocalStorage();
        document.querySelector('#saveFailureBanner button').click();
        expect(window.exportChampionship).toHaveBeenCalledTimes(1);
    } finally {
        window.exportChampionship = original;
    }
});

test('aucun bandeau quand tout se passe bien', () => {
    saveToLocalStorage();
    saveChronoToLocalStorage();
    expect(banners()).toHaveLength(0);
});
