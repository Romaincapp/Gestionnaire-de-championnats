/**
 * Contraste des couleurs (audit Impeccable, P1 « colorize ») : les anciennes
 * teintes vives (#3498db, #2ecc71, #f39c12, #7f8c8d…) portaient du texte blanc
 * ou servaient de texte sur fond clair sous 4,5:1 (WCAG AA). Elles ont été
 * remplacées partout par des teintes plus foncées de même ton. Ce test empêche
 * de les réintroduire (copier-coller d'un ancien gabarit) et vérifie que les
 * rôles de la palette (:root de styles.css) gardent 4,5:1 avec le blanc.
 * Le rendu réel de chaque écran est mesuré par npm run test:contrast.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const FILES = [
    ...fs.readdirSync(path.join(ROOT, 'src')).filter(f => f.endsWith('.js')).map(f => path.join('src', f)),
    'index.html', 'styles.css',
];

// ancienne teinte → remplaçante (même ton, ≥ 4,5:1)
const REPLACED = {
    '3498db': '09679e', '2980b9': '08689d', '2ecc71': '017239', '27ae60': '017239', '28a745': '087227',
    'e74c3c': 'd03427', 'f39c12': '8b5700', 'e67e22': '9c5003', '1abc9c': '057e68', '16a085': '057e68',
    '9b59b6': '9654b1', '667eea': '5267d0', '7f8c8d': '586566', '95a5a6': '566566', '6c757d': '5b636b',
    '17a2b8': '067b8c', '007bff': '096cde', '20c997': '017f5d', '10b981': '087f58', '3b82f6': '236bdd',
    '8b5cf6': '804fe8', 'f59e0b': '9c6304', '14b8a6': '077d71', '0ea5e9': '0977a9', '22c55e': '028138',
    '94a3b8': '566376', '00b894': '096b54', 'd35400': 'bd4c05', '999999': '626262', '999': '626262',
};

function luminance(hex) {
    const h = hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex;
    const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255)
        .map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrastWithWhite = (hex) => 1.05 / (luminance(hex) + 0.05);

test('aucune ancienne teinte peu contrastée ne revient dans les gabarits', () => {
    const found = [];
    const pattern = new RegExp('#(' + Object.keys(REPLACED).sort((a, b) => b.length - a.length).join('|') + ')(?![0-9a-fA-F])', 'gi');
    FILES.forEach((file) => {
        const lines = fs.readFileSync(path.join(ROOT, file), 'utf8').split('\n');
        lines.forEach((line, i) => {
            let m;
            while ((m = pattern.exec(line))) found.push(`${file}:${i + 1} #${m[1]} → utiliser #${REPLACED[m[1].toLowerCase()]}`);
        });
    });
    expect(found).toEqual([]);
});

test('les remplaçantes et les rôles de la palette gardent au moins 4,5:1 avec le blanc', () => {
    Object.values(REPLACED).forEach((hex) => expect([hex, contrastWithWhite(hex) >= 4.5]).toEqual([hex, true]));
    const css = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
    const root = css.match(/:root \{([\s\S]*?)\}/)[1];
    const tokens = [...root.matchAll(/(--color-[a-z-]+): #([0-9a-f]{6});/g)];
    expect(tokens.length).toBeGreaterThanOrEqual(8);
    tokens.filter(([, name]) => name !== '--color-focus').forEach(([, name, hex]) => {
        expect([name, contrastWithWhite(hex) >= 4.5]).toEqual([name, true]);
    });
});
