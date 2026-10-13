/**
 * @jest-environment jsdom
 *
 * Notifications annoncées aux lecteurs d'écran (src/notifications.iife.js) :
 * le toast visuel n'a pas de rôle ; le message passe par une zone d'annonce
 * permanente et invisible (polie pour info / succès, prioritaire pour
 * avertissement / erreur), qui relit aussi un message identique.
 */
const { loadModules } = require('../helpers/loadApp');

beforeAll(() => loadModules(['notifications']));
beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test('info et succès : annonce polie (role status)', () => {
    window.showNotification('Série enregistrée', 'success');
    jest.advanceTimersByTime(60);
    const region = document.getElementById('a11yLiveStatus');
    expect(region.getAttribute('role')).toBe('status');
    expect(region.getAttribute('aria-live')).toBe('polite');
    expect(region.textContent).toBe('Série enregistrée');
});

test('erreur et avertissement : annonce prioritaire (role alert), message répété relu', () => {
    window.showNotification('Cochez au moins un participant', 'warning');
    jest.advanceTimersByTime(60);
    const region = document.getElementById('a11yLiveAlert');
    expect(region.getAttribute('aria-live')).toBe('assertive');
    expect(region.textContent).toBe('Cochez au moins un participant');
    window.showNotification('Cochez au moins un participant', 'warning');
    expect(region.textContent).toBe('');                 // vidée d'abord…
    jest.advanceTimersByTime(60);
    expect(region.textContent).toBe('Cochez au moins un participant');   // …puis relue
    expect(document.querySelectorAll('#a11yLiveAlert')).toHaveLength(1);
});

test('alert() ouvre une fenêtre de l\'app : message, OK focalisé, focus rendu à la fermeture', () => {
    document.body.innerHTML = '<button id="origin">Importer</button>';
    const origin = document.getElementById('origin');
    origin.focus();
    window.alert('Aucun fichier sélectionné\nRéessayez');
    const dlg = document.querySelector('.app-alert');
    expect(dlg.getAttribute('role')).toBe('alertdialog');
    const msg = document.getElementById(dlg.getAttribute('aria-describedby'));
    expect(msg.textContent).toBe('Aucun fichier sélectionné\nRéessayez');
    expect(document.activeElement.textContent).toBe('OK');
    document.activeElement.click();
    expect(document.querySelector('.app-alert')).toBeNull();
    expect(document.activeElement).toBe(origin);
});
