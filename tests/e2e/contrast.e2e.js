// ============================================
// Contraste du texte en mode clair (WCAG AA) dans un vrai navigateur.
//
//   npm run test:contrast            (navigateur invisible)
//   npm run test:contrast:mobile     (téléphone 390×844)
//
// Ouvre un à un les écrans et fenêtres de screens.js (mêmes données réelles
// anonymisées que les audits mode sombre / clavier) et mesure chaque texte
// réellement affiché contre son fond réel (dégradés compris : le texte doit
// rester lisible sur l'arrêt le plus défavorable du dégradé ; l'opacité de
// l'élément et de ses ancêtres est prise en compte). Seuils WCAG AA :
// 4,5:1, ou 3:1 pour un grand texte (≥ 24 px, ou ≥ 18,66 px en gras). Les
// boutons désactivés sont exemptés (WCAG 1.4.3). Le mode sombre a son propre
// audit (npm run test:darkmode).
// Rapport (défauts regroupés par couple couleur de texte / fond) :
// tests/e2e/output-contrast/. Code de sortie 1 au moindre défaut.
// ============================================
const fs = require('fs');
const path = require('path');
const { ROOT, APP, openBrowser, prepareApp, readInfo, buildScreens } = require('./screens');

const MOBILE = process.argv.includes('--mobile') || !!process.env.MOBILE;
const OUT = path.join(__dirname, MOBILE ? 'output-contrast-mobile' : 'output-contrast');
const CONTEXT = MOBILE
    ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
    : { viewport: { width: 1400, height: 1000 } };

function auditContrast() {
    function parse(c) {
        const m = c && c.match(/rgba?\(([^)]+)\)/);
        if (!m) return null;
        const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
        return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
    }
    function lum(c) {
        const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
        return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
    }
    function ratio(a, b) { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
    function over(top, bottom) {
        const a = top.a;
        return { r: top.r * a + bottom.r * (1 - a), g: top.g * a + bottom.g * (1 - a), b: top.b * a + bottom.b * (1 - a), a: 1 };
    }
    const hex = (c) => '#' + [c.r, c.g, c.b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
    // Calques de fond d'un élément : sa couleur, ou chaque arrêt de son dégradé.
    function ownLayers(el) {
        const cs = getComputedStyle(el);
        if (cs.backgroundImage && cs.backgroundImage.includes('gradient')) {
            const stops = (cs.backgroundImage.match(/rgba?\([^)]+\)/g) || []).map(parse).filter(Boolean);
            if (stops.length) return stops;
        }
        const c = parse(cs.backgroundColor);
        return c && c.a > 0 ? [c] : null;
    }
    // Fonds possibles derrière un élément (un par arrêt du dégradé le plus proche).
    function backgrounds(el) {
        const chain = [];
        for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
            const l = ownLayers(e);
            if (!l) continue;
            chain.push(l);
            if (l.every(c => c.a >= 0.99)) break;
        }
        let bases = [{ r: 255, g: 255, b: 255, a: 1 }];
        for (let i = chain.length - 1; i >= 0; i--) {
            const next = [];
            chain[i].forEach(c => bases.forEach(b => next.push(over(c, b))));
            bases = next.slice(0, 16);
        }
        return bases;
    }
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
        const st = (el.getAttribute('style') || '').replace(/\s+/g, ' ').slice(0, 80);
        const up = el.parentElement;
        const ctx = up ? ' ⊂ ' + up.tagName.toLowerCase() + (typeof up.className === 'string' && up.className.trim() ? '.' + up.className.trim().split(/\s+/)[0] : '') : '';
        return el.tagName.toLowerCase() + id + cls + (st ? ' [style="' + st + '"]' : '') + ctx;
    }
    const overlays = [...document.querySelectorAll('body *')].filter(e => {
        const cs = getComputedStyle(e);
        return cs.position === 'fixed' && visible(e) && e.getBoundingClientRect().width > 250 &&
            e.getBoundingClientRect().height > 150 && !e.classList.contains('notification');
    });
    const root = overlays.length ? overlays[overlays.length - 1] : document.body;
    const issues = [];
    for (const el of [root, ...root.querySelectorAll('*')]) {
        if (['SCRIPT', 'STYLE', 'OPTION', 'BR', 'svg', 'path'].includes(el.tagName)) continue;
        if (el.closest('.app-search-bar')) continue;
        if (el.closest('button:disabled, [disabled]')) continue;
        const text = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim();
        if (!text || !/[A-Za-zÀ-ÿ0-9]/.test(text)) continue;
        if (!visible(el)) continue;
        // texte réservé aux lecteurs d'écran (zone d'annonce découpée à 1 px) : jamais affiché
        const box = el.getBoundingClientRect();
        if (box.width <= 1 && box.height <= 1) continue;
        const cs = getComputedStyle(el);
        const fg = parse(cs.color);
        if (!fg || fg.a === 0) continue;
        // opacité des ancêtres (et de l'élément) : le texte se fond d'autant dans son fond
        for (let e = el; e && e.nodeType === 1; e = e.parentElement) fg.a *= parseFloat(getComputedStyle(e).opacity);
        const size = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight, 10) >= 700;
        const need = size >= 24 || (bold && size >= 18.66) ? 3 : 4.5;
        let worst = null;
        for (const bg of backgrounds(el)) {
            const r = ratio(over(fg, bg), bg);
            if (!worst || r < worst.r) worst = { r, bg };
        }
        if (worst.r < need - 0.005) {
            issues.push({ pair: hex(over(fg, worst.bg)) + ' sur ' + hex(worst.bg), ratio: +worst.r.toFixed(2), need,
                text: text.replace(/\s+/g, ' ').slice(0, 40), el: describe(el) });
        }
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

    const pairs = new Map();
    const report = [];
    let total = 0;
    for (const [name, run] of screens) {
        await page.reload();
        await page.waitForTimeout(500);
        try { await run(); } catch (e) { report.push(`## ${name}\n  ⚠️ écran non ouvert : ${e.message.split('\n')[0]}`); continue; }
        const issues = await page.evaluate(auditContrast);
        total += issues.length;
        console.log(`${issues.length ? '❌' : '✅'} ${name} : ${issues.length} texte(s) sous le seuil`);
        report.push(`## ${name} (${issues.length})`);
        issues.slice(0, 40).forEach(x => report.push(`  - ${x.pair} ${x.ratio}:1 (≥ ${x.need}) « ${x.text} »\n      ${x.el}`));
        issues.forEach(x => {
            const p = pairs.get(x.pair) || { n: 0, ratio: x.ratio, example: x.text, screens: new Set() };
            p.n++; p.screens.add(name); pairs.set(x.pair, p);
        });
        if (issues.length) await page.screenshot({ path: path.join(OUT, name + '.png') });
    }
    await browser.close();
    const summary = [...pairs.entries()].sort((a, b) => b[1].n - a[1].n)
        .map(([pair, p]) => `  ${String(p.n).padStart(4)}× ${pair} (${p.ratio}:1) ex. « ${p.example} » — ${[...p.screens].slice(0, 3).join(', ')}`);
    report.unshift(`Contraste mode clair — ${total} texte(s) sous le seuil WCAG AA\n\nPar couple de couleurs :\n${summary.join('\n')}\n`);
    fs.writeFileSync(path.join(OUT, 'rapport.txt'), report.join('\n') + '\n');
    console.log(`\nTotal : ${total} texte(s) sous le seuil. Rapport : ${path.relative(ROOT, path.join(OUT, 'rapport.txt'))}`);
    process.exit(total ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(2); });
