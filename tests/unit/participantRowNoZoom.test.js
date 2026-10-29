/**
 * Modifier un participant (« ⋯ » → ✏️) transforme sa ligne de « Participants
 * disponibles » (#participant-row-J-ID) en une seule case d'édition. Un ancien effet
 * de l'écran de course, `[id^="participant-"]:hover td:first-child { scale(1.2) }`,
 * attrapait aussi ces lignes : au survol, toute la ligne grossissait et sortait du
 * cadre, cachant 💾 / ✖️. Les règles d'agrandissement doivent exclure participant-row-.
 */
const fs = require('fs');
const path = require('path');

test('aucun agrandissement au survol sur les lignes participant-row-', () => {
    const css = fs.readFileSync(path.join(__dirname, '..', '..', 'styles.css'), 'utf8');
    const rules = css.match(/[^{}]*\[id\^="participant-"\][^{}]*\{[^}]*\}/g) || [];
    expect(rules.length).toBeGreaterThan(0);
    rules.filter((r) => /transform\s*:\s*scale/.test(r)).forEach((rule) => {
        const selector = rule.slice(0, rule.indexOf('{'));
        selector.split(',').filter((s) => s.includes('[id^="participant-"]')).forEach((s) => {
            expect(s).toContain(':not([id^="participant-row-"])');
        });
    });
});
