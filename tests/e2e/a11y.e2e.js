// ============================================
// Clavier et lecteurs d'écran dans un vrai navigateur (src/a11y.iife.js).
//
//   npm run test:a11y            (navigateur invisible)
//   HEADED=1 npm run test:a11y   (fenêtre visible)
//   npm run test:a11y:mobile     (téléphone : le focus va sur la fenêtre, pas sur un champ)
//
// Ouvre un à un les écrans et fenêtres de screens.js (mêmes données réelles
// anonymisées que l'audit du mode sombre). Sur chaque fenêtre, vérifie :
//   - role="dialog" + aria-modal + titre (aria-labelledby) ;
//   - focus placé dans la fenêtre, et qui y reste après 25 Tab / 25 Maj+Tab ;
//   - Échap ferme la fenêtre (par son propre bouton) et le focus n'est pas perdu
//     dans une fenêtre restée ouverte.
// Sur chaque écran : aucun élément [onclick] non natif inatteignable au clavier,
// aucun champ (case de score, liste, texte) sans nom accessible.
// Rapport : tests/e2e/output-a11y/. Code de sortie 1 au moindre défaut.
// ============================================
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const { ROOT, APP, launchOptions, prepareApp, readInfo, buildScreens } = require('./screens');

const MOBILE = process.argv.includes('--mobile') || !!process.env.MOBILE;
const OUT = path.join(__dirname, MOBILE ? 'output-a11y-mobile' : 'output-a11y');
const CONTEXT = MOBILE
    ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
    : { viewport: { width: 1400, height: 1000 } };

// Dans la page : état de la fenêtre du dessus et des éléments cliquables.
function inspect() {
    const dialogs = window.getOpenDialogs();
    const top = dialogs[dialogs.length - 1] || null;
    const unreachable = [...document.querySelectorAll('[onclick]')].filter(el => {
        if (/^(BUTTON|A|INPUT|SELECT|TEXTAREA|LABEL|SUMMARY|OPTION|DETAILS)$/.test(el.tagName)) return false;
        if (el.closest('#appSearchBar, .notification')) return false;
        const code = el.getAttribute('onclick');
        if (/^\s*event\.stopPropagation\(\)\s*;?\s*$/.test(code) || /event\.target\s*===?\s*this/.test(code)) return false;
        if (getComputedStyle(el).position === 'fixed' || !el.getClientRects().length) return false;
        return !el.hasAttribute('tabindex');
    }).map(el => el.tagName.toLowerCase() + ' « ' + el.textContent.replace(/\s+/g, ' ').trim().slice(0, 40) + ' »');
    // champs visibles sans nom accessible (libellé relié, aria-label, title)
    const unnamed = [...document.querySelectorAll('input:not([type="hidden"]):not([type="button"]):not([type="submit"]), select, textarea')]
        .filter(el => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden' && !el.closest('#appSearchBar') &&
            !((el.labels && el.labels.length) || el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.title))
        .map(el => {
            const box = el.parentElement;
            const ctx = box ? box.textContent.replace(/\s+/g, ' ').trim().slice(0, 40) : '';
            return el.tagName.toLowerCase() + (el.type ? '[' + el.type + ']' : '') + (el.id ? '#' + el.id : '') +
                (el.placeholder ? ' ph=« ' + el.placeholder.split('\n')[0].slice(0, 20) + ' »' : '') + ' dans « ' + ctx + ' »';
        });
    if (!top) return { count: 0, unreachable, unnamed };
    const label = top.getAttribute('aria-labelledby');
    const titleEl = label && document.getElementById(label);
    return {
        count: dialogs.length,
        role: top.getAttribute('role'),
        modal: top.getAttribute('aria-modal'),
        title: titleEl ? titleEl.textContent.replace(/\s+/g, ' ').trim().slice(0, 50) : (top.getAttribute('aria-label') || ''),
        focusInside: top.contains(document.activeElement),
        focusTag: document.activeElement ? document.activeElement.tagName.toLowerCase() : '',
        unreachable,
        unnamed,
    };
}

async function main() {
    fs.mkdirSync(OUT, { recursive: true });
    fs.readdirSync(OUT).forEach(f => fs.unlinkSync(path.join(OUT, f)));
    const browser = await chromium.launch(launchOptions());
    const context = await browser.newContext(CONTEXT);
    const page = await context.newPage();
    const jsErrors = [];
    page.on('pageerror', e => jsErrors.push(e.message));
    page.on('dialog', d => d.accept(d.type() === 'prompt' ? d.defaultValue() : undefined));
    await page.addInitScript(() => { window.open = () => null; });
    await page.goto(APP);
    await page.waitForTimeout(600);
    await prepareApp(page);
    await page.reload();
    await page.waitForTimeout(800);
    const screens = buildScreens(page, await readInfo(page));

    const report = [];
    let total = 0, dialogsChecked = 0;
    for (const [name, run] of screens) {
        await page.reload();
        await page.waitForTimeout(500);
        try { await run(); } catch (e) {
            report.push(`## ${name}\n  ⚠️ écran non ouvert : ${e.message.split('\n')[0]}`);
            continue;
        }
        const issues = [];
        const before = await page.evaluate(inspect);
        before.unreachable.slice(0, 10).forEach(u => issues.push('inatteignable au clavier : ' + u));
        before.unnamed.slice(0, 15).forEach(u => issues.push('champ sans nom accessible : ' + u));
        if (before.unnamed.length > 15) issues.push(`… et ${before.unnamed.length - 15} autre(s) champ(s) sans nom`);
        if (before.count) {
            dialogsChecked++;
            if (before.role !== 'dialog' && before.role !== 'alertdialog') issues.push('role="dialog" absent');
            if (before.modal !== 'true') issues.push('aria-modal absent');
            if (!before.title) issues.push('fenêtre sans titre (aria-labelledby)');
            if (!before.focusInside) issues.push('focus hors de la fenêtre à l\'ouverture');
            for (const shift of [false, true]) {
                for (let k = 0; k < 25; k++) await page.keyboard.press(shift ? 'Shift+Tab' : 'Tab');
                if (!(await page.evaluate(inspect)).focusInside) issues.push(`focus sorti de la fenêtre après 25 ${shift ? 'Maj+Tab' : 'Tab'}`);
            }
            await page.keyboard.press('Escape');
            await page.waitForTimeout(300);
            const after = await page.evaluate(inspect);
            if (after.count >= before.count) issues.push('Échap ne ferme pas la fenêtre');
            else if (after.count && !after.focusInside) issues.push('focus perdu après Échap (fenêtre précédente encore ouverte)');
        }
        total += issues.length;
        const what = before.count ? `fenêtre « ${before.title} », focus sur ${before.focusTag}` : 'écran';
        console.log(`${issues.length ? '❌' : '✅'} ${name} (${what}) : ${issues.length} défaut(s)`);
        report.push(`## ${name} — ${what} (${issues.length})`);
        issues.forEach(x => report.push('  - ' + x));
        if (issues.length) await page.screenshot({ path: path.join(OUT, name + '.png') });
    }
    await browser.close();
    report.unshift(`Audit clavier — ${dialogsChecked} fenêtre(s) vérifiée(s), ${total} défaut(s)` +
        (jsErrors.length ? `\nErreurs JS : ${[...new Set(jsErrors)].join(' | ')}` : ''));
    fs.writeFileSync(path.join(OUT, 'rapport.txt'), report.join('\n') + '\n');
    console.log(`\n${dialogsChecked} fenêtre(s) vérifiée(s). Total : ${total} défaut(s). Rapport : ${path.relative(ROOT, path.join(OUT, 'rapport.txt'))}`);
    if (jsErrors.length) console.log('Erreurs JS :', [...new Set(jsErrors)].slice(0, 5));
    process.exit(total || jsErrors.length ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(2); });
