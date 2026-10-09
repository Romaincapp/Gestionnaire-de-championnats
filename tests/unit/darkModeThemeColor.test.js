/**
 * @jest-environment jsdom
 *
 * Sur téléphone, la barre d'adresse suit la couleur de <meta name="theme-color"> :
 * script.js la passe en sombre avec le mode sombre (au clic et au chargement).
 */
const fs = require('fs');
const path = require('path');

const SCRIPT = fs.readFileSync(path.join(__dirname, '..', '..', 'script.js'), 'utf8');
const theme = () => document.querySelector('meta[name="theme-color"]').getAttribute('content');

beforeEach(() => {
    localStorage.clear();
    document.head.innerHTML = '<meta name="theme-color" content="#0a64da">';
    document.body.className = '';
    document.body.innerHTML = '<input type="checkbox" id="darkModeToggle">';
});

test('l\'interrupteur passe la barre d\'adresse en sombre puis en clair', () => {
    (0, eval)(SCRIPT);
    const toggle = document.getElementById('darkModeToggle');
    toggle.checked = true;
    window.toggleDarkMode();
    expect(theme()).toBe('#1a1a2e');
    toggle.checked = false;
    window.toggleDarkMode();
    expect(theme()).toBe('#0a64da');
});

test('mode sombre mémorisé : barre d\'adresse sombre dès le chargement', () => {
    localStorage.setItem('darkMode', 'true');
    (0, eval)(SCRIPT);
    expect(document.body.classList.contains('dark-mode')).toBe(true);
    expect(theme()).toBe('#1a1a2e');
});
