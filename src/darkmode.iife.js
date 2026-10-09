// ============================================
// MODE SOMBRE : adaptation automatique des couleurs « en dur »
// ============================================
// Les fenêtres et écrans sont en grande partie générés en JS avec des styles
// inline (« background: white », « color: #2c3e50 »...), que les règles
// body.dark-mode de styles.css ne peuvent pas atteindre une à une : plusieurs
// centaines de couleurs réparties dans tous les modules. Ce module lit les
// couleurs réellement calculées par le navigateur et pose, en mode sombre
// seulement, des attributs que styles.css traduit en couleurs sombres :
//   data-dm-bg="w|n|g|y|r|b|p|o"  fond clair → surface sombre (teinte conservée)
//   data-dm-fg="n|m|g|y|r|b|p|o"  texte foncé sur fond sombre → texte clair
//   data-dm-fg="k"                texte clair sur fond resté clair → texte sombre
//   data-dm-bd="t?r?b?l?"         bordures claires → bordures sombres
// Un MutationObserver traite chaque rendu (innerHTML, fenêtre créée, style
// modifié au survol...) avant l'affichage : aucune fonction d'affichage n'a
// besoin de connaître le mode sombre. Les fonds clairs saturés (or, boutons
// colorés) et les fenêtres d'impression (window.open) ne sont pas touchés.
// Le style inline des éléments n'est jamais modifié.
(function(global) {
    'use strict';

    var DARK_CLASS = 'dark-mode';
    var ATTRS = ['data-dm-bg', 'data-dm-fg', 'data-dm-bd'];
    var SKIP = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, BR: 1, OPTION: 1, svg: 1, path: 1, IMG: 1, CANVAS: 1 };

    // Doivent correspondre aux règles [data-dm-bg] de styles.css (section MODE SOMBRE AUTO).
    var BG = {
        w: [42, 42, 61],    // blanc            → #2a2a3d
        n: [35, 35, 53],    // gris très clair  → #232335
        g: [29, 58, 44],    // vert pâle        → #1d3a2c
        y: [61, 52, 32],    // jaune / crème    → #3d3420
        r: [67, 36, 39],    // rose / rouge pâle → #432427
        b: [31, 49, 71],    // bleu pâle        → #1f3147
        p: [51, 40, 74],    // violet pâle      → #33284a
        o: [66, 48, 31]     // orange pâle      → #42301f
    };
    // Doivent correspondre aux règles [data-dm-fg] de styles.css.
    var FG = {
        n: [228, 228, 238], m: [169, 173, 193], g: [126, 226, 168], y: [245, 215, 110],
        r: [255, 154, 154], b: [140, 200, 245], p: [201, 166, 245], o: [255, 184, 107]
    };
    var PAGE_BG = [26, 26, 46];

    function parseColor(str) {
        if (!str) return null;
        var m = String(str).match(/rgba?\(([^)]+)\)/);
        if (!m) return null;
        var p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
        return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
    }

    function luminance(c) {
        function f(v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
        return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
    }

    function contrast(a, b) {
        var x = luminance(a), y = luminance(b);
        return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
    }

    function blend(top, bottom) {
        var a = top.a;
        return { r: top.r * a + bottom.r * (1 - a), g: top.g * a + bottom.g * (1 - a), b: top.b * a + bottom.b * (1 - a), a: 1 };
    }

    function hsl(c) {
        var r = c.r / 255, g = c.g / 255, b = c.b / 255;
        var max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
        var l = (max + min) / 2, h = 0, s = 0;
        if (d > 0) {
            s = d / (1 - Math.abs(2 * l - 1));
            if (max === r) h = 60 * (((g - b) / d) % 6);
            else if (max === g) h = 60 * ((b - r) / d + 2);
            else h = 60 * ((r - g) / d + 4);
            if (h < 0) h += 360;
        }
        return { h: h, s: s, l: l, chroma: d };
    }

    function hueFamily(h) {
        if (h < 15 || h >= 340) return 'r';
        if (h < 42) return 'o';
        if (h < 70) return 'y';
        if (h < 170) return 'g';
        if (h < 255) return 'b';
        return 'p';
    }

    // Fond clair à assombrir ? Renvoie la famille ('w', 'n', 'g'...) ou null.
    // Les fonds clairs mais saturés (or #ffd700, boutons jaunes) restent tels quels.
    function bgBucket(c) {
        if (!c || c.a < 0.5) return null;
        if (luminance(c) <= 0.55) return null;
        var x = hsl(c);
        if (x.chroma > 0.45) return null;
        if (x.chroma < 0.05) return luminance(c) > 0.95 ? 'w' : 'n';
        return hueFamily(x.h);
    }

    // Texte illisible ? Renvoie la famille de couleur de remplacement ou null :
    // texte foncé sur fond sombre → couleur claire ; texte clair sur fond resté
    // clair (ligne « or » d'un classement...) → 'k' (texte sombre).
    function fgBucket(fg, bg) {
        if (!fg || fg.a < 0.3 || !bg) return null;
        var c = contrast(blend(fg, bg), bg);
        if (c >= 4.5) return null;
        if (luminance(bg) > 0.2) {
            return (luminance(bg) > 0.55 && luminance(fg) > 0.55 && c < 3) ? 'k' : null;
        }
        var x = hsl(fg);
        var bucket = (x.chroma < 0.08 || x.s < 0.35) ? (luminance(fg) > 0.1 ? 'm' : 'n') : hueFamily(x.h);
        // Seulement si le remplacement est plus lisible (ex. blanc sur badge bleu : inchangé)
        var repl = { r: FG[bucket][0], g: FG[bucket][1], b: FG[bucket][2], a: 1 };
        return contrast(repl, bg) > c ? bucket : null;
    }

    function isLightBorder(c) {
        if (!c || c.a < 0.3) return false;
        return luminance(c) > 0.55 && hsl(c).chroma <= 0.45;
    }

    // Couleur propre d'un fond : background-color, ou moyenne d'un dégradé.
    function ownBackground(cs) {
        var img = cs.backgroundImage;
        if (img && img !== 'none' && img.indexOf('gradient') !== -1) {
            var stops = (img.match(/rgba?\([^)]+\)/g) || []).map(parseColor).filter(Boolean);
            if (stops.length) {
                var n = stops.length, sum = { r: 0, g: 0, b: 0, a: 0 };
                stops.forEach(function(s) { sum.r += s.r; sum.g += s.g; sum.b += s.b; sum.a += s.a; });
                return { r: sum.r / n, g: sum.g / n, b: sum.b / n, a: sum.a / n };
            }
        }
        var c = parseColor(cs.backgroundColor);
        return c && c.a > 0 ? c : null;
    }

    function isDark() {
        return !!(document.body && document.body.classList.contains(DARK_CLASS));
    }

    function hasOwnText(el) {
        if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA' || el.tagName === 'BUTTON') return true;
        for (var n = el.firstChild; n; n = n.nextSibling) {
            if (n.nodeType === 3 && /\S/.test(n.nodeValue)) return true;
        }
        return false;
    }

    function collect(root, list) {
        if (root.nodeType !== 1 || SKIP[root.tagName]) return;
        list.push(root);
        var all = root.getElementsByTagName('*');
        for (var i = 0; i < all.length; i++) {
            if (!SKIP[all[i].tagName] && !(all[i].parentElement && SKIP[all[i].parentElement.tagName])) list.push(all[i]);
        }
    }

    // Traite une liste d'éléments (ordre du document, parents avant enfants) :
    // 1) retire les anciennes marques, 2) lit toutes les couleurs d'origine,
    // 3) décide en simulant les fonds déjà assombris, 4) écrit les marques.
    function processElements(list) {
        if (!list.length) return;
        var i, el;
        // Sans transitions pendant la mesure : sinon, juste après avoir retiré
        // une marque, le navigateur renverrait la couleur sombre en cours
        // d'animation au lieu de la couleur d'origine.
        var html = document.documentElement;
        html.classList.add('dm-measuring');
        for (i = 0; i < list.length; i++) {
            el = list[i];
            for (var a = 0; a < ATTRS.length; a++) if (el.hasAttribute(ATTRS[a])) el.removeAttribute(ATTRS[a]);
        }
        var info = new Map();
        for (i = 0; i < list.length; i++) {
            el = list[i];
            var cs = getComputedStyle(el);
            info.set(el, {
                bg: ownBackground(cs),
                fg: parseColor(cs.color),
                borders: [cs.borderTopColor, cs.borderRightColor, cs.borderBottomColor, cs.borderLeftColor],
                widths: [cs.borderTopWidth, cs.borderRightWidth, cs.borderBottomWidth, cs.borderLeftWidth]
            });
        }
        var outside = new Map();
        function backgroundOf(e) {
            var d = info.get(e);
            if (d) return d.finalBg !== undefined ? d.finalBg : d.bg;
            if (!outside.has(e)) outside.set(e, ownBackground(getComputedStyle(e)));
            return outside.get(e);
        }
        function effectiveBackground(e) {
            var layers = [];
            for (var p = e; p && p.nodeType === 1; p = p.parentElement) {
                var c = backgroundOf(p);
                if (c) { layers.push(c); if (c.a >= 0.99) break; }
            }
            var base = { r: PAGE_BG[0], g: PAGE_BG[1], b: PAGE_BG[2], a: 1 };
            for (var k = layers.length - 1; k >= 0; k--) base = blend(layers[k], base);
            return base;
        }
        var writes = [];
        for (i = 0; i < list.length; i++) {
            el = list[i];
            var d = info.get(el);
            var bucket = bgBucket(d.bg);
            if (bucket) {
                d.finalBg = { r: BG[bucket][0], g: BG[bucket][1], b: BG[bucket][2], a: 1 };
                writes.push([el, 'data-dm-bg', bucket]);
            }
            var sides = '';
            ['t', 'r', 'b', 'l'].forEach(function(s, k) {
                if (parseFloat(d.widths[k]) > 0 && isLightBorder(parseColor(d.borders[k]))) sides += s;
            });
            if (sides) writes.push([el, 'data-dm-bd', sides]);
            if (hasOwnText(el)) {
                var fgb = fgBucket(d.fg, effectiveBackground(el));
                if (fgb) writes.push([el, 'data-dm-fg', fgb]);
            }
        }
        for (i = 0; i < writes.length; i++) writes[i][0].setAttribute(writes[i][1], writes[i][2]);
        void html.offsetHeight;   // applique les marques avant de rétablir les transitions
        html.classList.remove('dm-measuring');
    }

    function processRoots(roots) {
        var list = [];
        var seen = new Set();
        roots.forEach(function(r) {
            if (!r || !r.isConnected) return;
            // un parent déjà traité couvre ses descendants
            for (var p = r.parentElement; p; p = p.parentElement) if (seen.has(p)) return;
            seen.add(r);
        });
        var ordered = Array.from(seen).sort(function(a, b) {
            return a === b ? 0 : (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);
        });
        ordered.forEach(function(r) { collect(r, list); });
        processElements(list);
    }

    function clearAll() {
        ATTRS.forEach(function(attr) {
            document.querySelectorAll('[' + attr + ']').forEach(function(e) { e.removeAttribute(attr); });
        });
    }

    function refreshDarkModeColors() {
        if (!document.body) return;
        if (isDark()) processRoots([document.body]);
        else clearAll();
    }

    // Afficher / masquer (style.display) ne change aucune couleur : les éléments
    // masqués sont déjà traités, inutile de retraiter tout le sous-arbre
    // (accordéons des séries, fenêtres de index.html).
    function withoutDisplay(style) {
        return (style || '').replace(/(^|;)\s*display\s*:[^;]*/gi, '$1').replace(/[\s;]+/g, ' ').trim();
    }
    function onlyDisplayChanged(m) {
        return m.attributeName === 'style' && withoutDisplay(m.oldValue) === withoutDisplay(m.target.getAttribute('style'));
    }

    var observer = null;
    var wasDark = false;
    function start() {
        if (observer || typeof MutationObserver !== 'function' || !document.body) return;
        observer = new MutationObserver(function(mutations) {
            if (!global.document || !document.body) return;   // page en cours de fermeture
            var dark = isDark();
            if (dark !== wasDark) { wasDark = dark; refreshDarkModeColors(); return; }
            if (!dark) return;
            var roots = [];
            mutations.forEach(function(m) {
                if (m.type === 'attributes') {
                    if (m.target === document.body || onlyDisplayChanged(m)) return;
                    roots.push(m.target);
                } else {
                    m.addedNodes.forEach(function(n) { if (n.nodeType === 1) roots.push(n); });
                }
            });
            if (roots.length) processRoots(roots);
        });
        observer.observe(document.body, {
            childList: true, subtree: true,
            attributes: true, attributeOldValue: true, attributeFilter: ['class', 'style']
        });
        wasDark = isDark();
        if (wasDark) refreshDarkModeColors();
    }

    // Chargé en fin de <body> : on observe tout de suite, pour que la classe
    // dark-mode posée par script.js au chargement soit traitée avant l'affichage.
    if (document.body) start();
    else document.addEventListener('DOMContentLoaded', start);

    global.refreshDarkModeColors = refreshDarkModeColors;
    // Exposées pour les tests (tests/unit/darkModeAdapter.test.js)
    global.darkModeColorRules = { parseColor: parseColor, bgBucket: bgBucket, fgBucket: fgBucket, contrast: contrast };
})(window);
