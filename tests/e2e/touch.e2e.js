// ============================================
// Téléphone : cibles tactiles et taille du texte, dans un vrai navigateur.
//
//   npm run test:touch     (téléphone 390×844, tactile)
//
// Ouvre un à un les écrans et fenêtres de screens.js (mêmes données réelles
// anonymisées que les autres audits) et mesure, sur ce qui est affiché :
//   - toute cible tactile (bouton, lien, champ, élément cliquable) d'au moins
//     24×24 px (WCAG 2.2 AA, critère 2.5.8) ;
//   - les cases de score d'au moins 44×44 px : c'est le geste principal à la
//     table de marque, au doigt ;
//   - aucun texte sous 11 px (lisibilité à bout de bras).
// Rapport : tests/e2e/output-touch/. Code de sortie 1 au moindre défaut.
// ============================================
const fs = require('fs');
const path = require('path');
const { ROOT, APP, openBrowser, prepareApp, readInfo, buildScreens } = require('./screens');

const OUT = path.join(__dirname, 'output-touch');
const CONTEXT = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36' };

function auditTouch() {
    function visible(el) {
        if (!el.getClientRects().length) return false;
        for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
            const cs = getComputedStyle(e);
            if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) < 0.15) return false;
        }
        return true;
    }
    function describe(el) {
        const id = el.id ? '#' + el.id : '';
        const cls = typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
        const label = (el.textContent || el.value || el.placeholder || el.title || '').replace(/\s+/g, ' ').trim().slice(0, 30);
        return el.tagName.toLowerCase() + id + cls + (label ? ' « ' + label + ' »' : '');
    }
    const overlays = [...document.querySelectorAll('body *')].filter(e => {
        const cs = getComputedStyle(e);
        return cs.position === 'fixed' && visible(e) && e.getBoundingClientRect().width > 250 &&
            e.getBoundingClientRect().height > 150 && !e.classList.contains('notification');
    });
    const root = overlays.length ? overlays[overlays.length - 1] : document.body;
    const issues = [];
    const targets = root.querySelectorAll('button, a[href], input:not([type="hidden"]), select, textarea, [onclick], [role="button"]');
    for (const el of targets) {
        if (el.closest('.notification')) continue;
        if (!visible(el)) continue;
        // un élément cliquable qui contient une cible native est jugé par celle-ci
        if (!/^(BUTTON|A|INPUT|SELECT|TEXTAREA)$/.test(el.tagName) && el.querySelector('button, a[href], input, select, textarea')) continue;
        // champ inclus dans un libellé cliquable plus grand (case à cocher dans un <label>)
        const label = el.closest('label');
        const r = (label && /^(checkbox|radio)$/.test(el.type) ? label : el).getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        const isScore = el.matches('.score-input, .pool-score-input, [class*="score-input"], input[type="number"][onkeydown*="Enter"]');
        const min = isScore ? 44 : 24;
        if (r.width < min - 0.5 || r.height < min - 0.5) {
            issues.push({ kind: isScore ? 'case de score' : 'cible tactile', size: Math.round(r.width) + '×' + Math.round(r.height), min, el: describe(el) });
        }
    }
    for (const el of [root, ...root.querySelectorAll('*')]) {
        if (['SCRIPT', 'STYLE', 'OPTION', 'BR'].includes(el.tagName)) continue;
        const text = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim();
        if (!text || !/[A-Za-zÀ-ÿ0-9]/.test(text)) continue;
        if (!visible(el)) continue;
        const size = parseFloat(getComputedStyle(el).fontSize);
        if (size < 10.95) issues.push({ kind: 'texte trop petit', size: size + 'px', min: 11, el: describe(el) });
    }
    return issues;
}

async function main() {
    fs.mkdirSync(OUT, { recursive: true });
    fs.readdirSync(OUT).forEach(f => fs.unlinkSync(path.join(OUT, f)));
    const browser = await openBrowser();
    const context = await browser.newContext(CONTEXT);
    const page = await context.newPage();
    page.on('dialog', d => d.accept(d.type() === 'prompt' ? d.defaultValue() : undefined));
    await page.addInitScript(() => { window.open = () => null; });
    await page.goto(APP);
    await page.waitForTimeout(600);
    await prepareApp(page);
    await page.reload();
    await page.waitForTimeout(800);
    const screens = buildScreens(page, await readInfo(page));

    const kinds = new Map();
    const report = [];
    let total = 0;
    for (const [name, run] of screens) {
        await page.reload();
        await page.waitForTimeout(500);
        try { await run(); } catch (e) { report.push(`## ${name}\n  ⚠️ écran non ouvert : ${e.message.split('\n')[0]}`); continue; }
        const issues = await page.evaluate(auditTouch);
        total += issues.length;
        console.log(`${issues.length ? '❌' : '✅'} ${name} : ${issues.length} défaut(s)`);
        report.push(`## ${name} (${issues.length})`);
        issues.slice(0, 50).forEach(x => report.push(`  - [${x.kind}] ${x.size} (min ${x.min}) ${x.el}`));
        issues.forEach(x => {
            const key = x.kind + ' — ' + x.el.replace(/ « .*$/, '');
            const k = kinds.get(key) || { n: 0, size: x.size, example: x.el };
            k.n++; kinds.set(key, k);
        });
        if (issues.length) await page.screenshot({ path: path.join(OUT, name + '.png') });
    }
    await browser.close();
    const summary = [...kinds.entries()].sort((a, b) => b[1].n - a[1].n)
        .map(([key, k]) => `  ${String(k.n).padStart(4)}× ${key} (${k.size}) ex. ${k.example}`);
    report.unshift(`Téléphone : cibles tactiles et texte — ${total} défaut(s)\n\nPar type d'élément :\n${summary.join('\n')}\n`);
    fs.writeFileSync(path.join(OUT, 'rapport.txt'), report.join('\n') + '\n');
    console.log(`\nTotal : ${total} défaut(s). Rapport : ${path.relative(ROOT, path.join(OUT, 'rapport.txt'))}`);
    process.exit(total ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(2); });
