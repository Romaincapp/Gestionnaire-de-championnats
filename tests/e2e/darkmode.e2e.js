// ============================================
// Audit du mode sombre dans un vrai navigateur.
//
//   npm run test:darkmode            (navigateur invisible)
//   HEADED=1 npm run test:darkmode   (fenêtre visible)
//   npm run test:darkmode:mobile     (même audit sur un téléphone)
//
// Charge des données réelles anonymisées (tests/fixtures/ : journée Matchs en poules, journée
// natation avec résultats, journée Matchs « classique » avec scores), active le
// mode sombre puis ouvre un à un les écrans, onglets, classements et fenêtres
// (statiques et créées dynamiquement). Sur chaque écran, mesure dans le DOM :
//   - le contraste texte / fond réellement affiché (WCAG, seuil 3:1) ;
//   - les champs (input/select/textarea) restés clairs ;
//   - les grands panneaux à fond clair (> 0.75 de luminance) qui « éblouissent ».
// Les fenêtres d'impression / nouvel onglet (window.open) ne sont pas
// concernées : elles restent volontairement claires pour le papier.
// Captures et rapport : tests/e2e/output-darkmode/. Code de sortie 1 si un
// écran présente un défaut.
// ============================================
const fs = require('fs');
const path = require('path');
const { ROOT, APP, openBrowser, prepareApp, readInfo, buildScreens } = require('./screens');

// --mobile : téléphone (390×844, tactile, user-agent mobile) → les règles
// @media (max-width: 768px) et les mises en page mobiles sont auditées.
const MOBILE = process.argv.includes('--mobile') || !!process.env.MOBILE;
const OUT = path.join(__dirname, MOBILE ? 'output-darkmode-mobile' : 'output-darkmode');
const CONTEXT = MOBILE
    ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
        userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36' }
    : { viewport: { width: 1400, height: 1000 } };

// ---------------------------------------------------------------
// Audit exécuté dans la page : renvoie la liste des défauts visibles.
function auditInPage(checkOverflow) {
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
    // Couleur propre d'un élément : background-color, sinon la moyenne des
    // couleurs de son dégradé éventuel.
    function ownBg(el) {
        const cs = getComputedStyle(el);
        const img = cs.backgroundImage;
        if (img && img.includes('gradient')) {
            const stops = (img.match(/rgba?\([^)]+\)/g) || []).map(parse).filter(Boolean);
            if (stops.length) {
                const n = stops.length;
                return { r: stops.reduce((t, s) => t + s.r, 0) / n, g: stops.reduce((t, s) => t + s.g, 0) / n,
                    b: stops.reduce((t, s) => t + s.b, 0) / n, a: stops.reduce((t, s) => t + s.a, 0) / n };
            }
        }
        const c = parse(cs.backgroundColor);
        return c && c.a > 0 ? c : null;
    }
    function effectiveBg(el) {
        const layers = [];
        for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
            const c = ownBg(e);
            if (c) { layers.push(c); if (c.a >= 0.99) break; }
        }
        let base = { r: 26, g: 26, b: 46, a: 1 };
        for (let i = layers.length - 1; i >= 0; i--) base = over(layers[i], base);
        return base;
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
        const st = (el.getAttribute('style') || '').replace(/\s+/g, ' ').slice(0, 90);
        return el.tagName.toLowerCase() + id + cls + (st ? ' [style="' + st + '"]' : '');
    }
    const hex = (c) => '#' + [c.r, c.g, c.b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');

    // Racine : la fenêtre au premier plan si elle existe, sinon la page.
    const overlays = [...document.querySelectorAll('body *')].filter(e => {
        const cs = getComputedStyle(e);
        return (cs.position === 'fixed') && visible(e) && e.getBoundingClientRect().width > 250 && e.getBoundingClientRect().height > 150 && !e.classList.contains('notification');
    });
    const root = overlays.length ? overlays[overlays.length - 1] : document.body;

    const issues = [];
    const textCandidates = [];
    const seen = new Set();
    const push = (kind, el, msg) => {
        const key = kind + describe(el) + msg;
        if (seen.has(key)) return;
        seen.add(key);
        issues.push({ kind, el: describe(el), msg });
    };
    const all = [root, ...root.querySelectorAll('*')];
    for (const el of all) {
        if (['SCRIPT', 'STYLE', 'OPTION', 'BR', 'svg', 'path'].includes(el.tagName)) continue;
        if (el.closest('.notification, .app-search-bar, .dark-mode-toggle')) continue;
        if (!visible(el)) continue;
        const cs = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        // 1) Champs
        if (['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)) {
            // Contrôles natifs (calendrier, cases à cocher, liste déroulante du
            // téléphone) dessinés par le système : clairs sans color-scheme: dark.
            if (el.type !== 'hidden' && !/dark/.test(cs.colorScheme)) push('contrôle natif clair', el, 'color-scheme: ' + cs.colorScheme);
            if (['checkbox', 'radio', 'range', 'color', 'file', 'hidden', 'button', 'submit'].includes(el.type)) continue;
            const bg = effectiveBg(el), fg = parse(cs.color);
            if (lum(bg) > 0.6) push('champ clair', el, 'fond ' + hex(bg));
            else if (fg && ratio(over(fg, bg), bg) < 3) push('champ illisible', el, hex(fg) + ' sur ' + hex(bg));
            continue;
        }
        // 2) Grands panneaux clairs
        const own = ownBg(el);
        if (own && own.a > 0.6 && rect.width * rect.height > 6000) {
            const b = effectiveBg(el);
            if (lum(b) > 0.75) push('panneau clair', el, 'fond ' + hex(b) + ' ' + Math.round(rect.width) + 'x' + Math.round(rect.height));
        }
        // 3) Texte
        const text = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim();
        if (!text || !/[A-Za-zÀ-ÿ0-9]/.test(text)) continue;
        const fg = parse(cs.color);
        if (!fg || fg.a === 0) continue;
        const bg = effectiveBg(el);
        const r = ratio(over(fg, bg), bg);
        if (r < 3) textCandidates.push({ el, r, msg: '« ' + text.slice(0, 40) + ' » ' + hex(fg) + ' sur ' + hex(bg) + ' (' + r.toFixed(2) + ':1)' });
    }
    // Un texte déjà peu contrasté en mode clair (ex. blanc sur bouton vert) est un
    // choix de charte, pas un défaut du mode sombre : on ne garde que les textes
    // que le mode sombre rend moins lisibles qu'en mode clair.
    document.body.classList.remove('dark-mode');
    const lightRatios = textCandidates.map(c => {
        const fg = parse(getComputedStyle(c.el).color), bg = effectiveBg(c.el);
        return fg ? ratio(over(fg, bg), bg) : 21;
    });
    document.body.classList.add('dark-mode');
    textCandidates.forEach((c, k) => { if (c.r < lightRatios[k] - 0.1) push('texte peu lisible', c.el, c.msg + ' — mode clair ' + lightRatios[k].toFixed(2) + ':1'); });

    // Sur téléphone : contenu qui dépasse de l'écran sans pouvoir défiler
    // (tableau coupé, page qui glisse de côté). Un élément dans un conteneur à
    // défilement horizontal (overflow-x: auto) est accessible : pas un défaut.
    if (checkOverflow) {
        const vw = document.documentElement.clientWidth;
        if (document.documentElement.scrollWidth > vw + 1) {
            push('débordement', document.documentElement, 'la page défile horizontalement (' + document.documentElement.scrollWidth + 'px pour ' + vw + 'px)');
        }
        const clippedBy = (el) => {
            for (let e = el.parentElement; e && e !== document.body; e = e.parentElement) {
                if (getComputedStyle(e).position === 'fixed') return null;   // panneau fixe : borné par l'écran
                const ox = getComputedStyle(e).overflowX;
                if (ox !== 'visible') return { el: e, scrolls: ox === 'auto' || ox === 'scroll' };
            }
            return null;
        };
        for (const el of all) {
            if (el.closest('.notification, .app-search-bar') || !visible(el)) continue;
            const rect = el.getBoundingClientRect();
            if (rect.width < 2 || rect.height < 2 || rect.right < 0) continue;   // caché hors écran exprès
            const clip = getComputedStyle(el).position === 'fixed' ? null : clippedBy(el);
            const box = clip ? clip.el.getBoundingClientRect() : { left: 0, right: vw };
            if (clip && clip.scrolls) continue;
            const out = rect.right > Math.min(box.right, vw) + 2 || rect.left < Math.max(box.left, 0) - 2;
            if (!out) continue;
            // ne garder que l'élément le plus haut qui déborde (pas tous ses enfants)
            const parent = el.parentElement;
            const pr = parent && parent.getBoundingClientRect();
            if (pr && parent !== root && (pr.right > Math.min(box.right, vw) + 2 || pr.left < Math.max(box.left, 0) - 2)) continue;
            // coupable : l'élément le plus profond qui dépasse encore
            const limit = Math.min(box.right, vw) + 2;
            let culprit = el;
            for (;;) {
                const next = [...culprit.children].find(c => visible(c) && c.getBoundingClientRect().right > limit);
                if (!next) break;
                culprit = next;
            }
            push(clip ? 'contenu coupé' : 'débordement', el, Math.round(rect.left) + '→' + Math.round(rect.right) + 'px (écran ' + vw + 'px)'
                + (culprit !== el ? ' — à cause de ' + describe(culprit) + ' (' + Math.round(culprit.getBoundingClientRect().width) + 'px, « ' + culprit.textContent.replace(/\s+/g, ' ').trim().slice(0, 60) + ' »)' : ''));
        }
    }
    return issues;
}

// ---------------------------------------------------------------
async function main() {
    fs.mkdirSync(OUT, { recursive: true });
    fs.readdirSync(OUT).forEach(f => fs.unlinkSync(path.join(OUT, f)));
    const browser = await openBrowser();
    const context = await browser.newContext(CONTEXT);
    const page = await context.newPage();
    const jsErrors = [];
    page.on('pageerror', e => jsErrors.push(e.message));
    page.on('dialog', d => d.accept(d.type() === 'prompt' ? d.defaultValue() : undefined));
    // window.open (impression, nouvel onglet) : fenêtres claires volontairement, ignorées.
    await page.addInitScript(() => { window.open = () => null; });
    await page.goto(APP);
    await page.waitForTimeout(600);
    await prepareApp(page);

    // --- Mode sombre via le vrai interrupteur
    await page.reload();
    await page.waitForTimeout(800);
    await page.locator('.dark-mode-toggle').click();
    await page.waitForTimeout(200);
    if (!(await page.evaluate(() => document.body.classList.contains('dark-mode')))) throw new Error('mode sombre non activé');

    const info = await readInfo(page);
    const screens = buildScreens(page, info);

    const report = [];
    let total = 0;
    let i = 0;
    for (const [name, run] of screens) {
        await page.reload();
        await page.waitForTimeout(500);
        let issues;
        try {
            await run();
            issues = await page.evaluate(auditInPage, MOBILE);
        } catch (e) {
            report.push(`## ${name}\n  ⚠️ écran non ouvert : ${e.message.split('\n')[0]}`);
            console.log(`⚠️  ${name} : ${e.message.split('\n')[0]}`);
            continue;
        }
        await page.screenshot({ path: path.join(OUT, String(++i).padStart(2, '0') + '-' + name + '.png'), fullPage: false });
        total += issues.length;
        console.log(`${issues.length ? '❌' : '✅'} ${name} : ${issues.length} défaut(s)`);
        report.push(`## ${name} (${issues.length})`);
        issues.slice(0, 60).forEach(x => report.push(`  - [${x.kind}] ${x.msg}\n      ${x.el}`));
    }
    // Les données de test chargées ne doivent pas rester dans le navigateur
    await browser.close();
    report.unshift(`Audit mode sombre — ${total} défaut(s)` + (jsErrors.length ? `\nErreurs JS : ${[...new Set(jsErrors)].join(' | ')}` : ''));
    fs.writeFileSync(path.join(OUT, 'rapport.txt'), report.join('\n') + '\n');
    console.log(`\nTotal : ${total} défaut(s). Rapport : ${path.relative(ROOT, path.join(OUT, 'rapport.txt'))}`);
    if (jsErrors.length) console.log('Erreurs JS :', [...new Set(jsErrors)].slice(0, 5));
    process.exit(total ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(2); });
