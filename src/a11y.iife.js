// ============================================
// CLAVIER ET LECTEURS D'ÉCRAN : fenêtres et éléments cliquables
// ============================================
// Les fenêtres (≈ 30 gabarits : .modal de index.html, fonds plein écran créés
// en JS) et les éléments cliquables qui ne sont pas des <button> (titres
// repliables, cartes de choix, lignes de classement...) sont générés dans des
// dizaines de modules. Ce module les repère à mesure qu'ils s'affichent
// (MutationObserver, comme darkmode/mobile) et leur ajoute, sans toucher à
// leur gabarit :
//   - fenêtre : role="dialog", aria-modal, titre (aria-labelledby), focus
//     placé dedans à l'ouverture (premier champ ; la fenêtre elle-même sur
//     écran tactile, pour ne pas sortir le clavier virtuel), Tab qui reste
//     dans la fenêtre, Échap qui la ferme par SON bouton (×, ✕, Fermer,
//     Annuler) ou son fond cliquable — donc avec sa logique de fermeture —,
//     focus rendu à l'élément d'origine à la fermeture ;
//   - élément cliquable non natif ([onclick] sur div/span/h2/td/tr...) :
//     tabindex="0", role="button" (sauf <tr>), Entrée/Espace = clic ;
//   - champ sans libellé : nom accessible (aria-label) déduit du contexte —
//     case de score « Score de A contre B », champ de nom de joueur, libellé
//     voisin non relié, en-tête de colonne, placeholder parlant ;
//   - réglage « réduire les animations » : défilements JS « smooth » instantanés.
// Aucune fonction d'affichage n'a besoin de connaître ce module.
(function(global) {
    'use strict';

    var NATIVE = /^(BUTTON|A|INPUT|SELECT|TEXTAREA|LABEL|SUMMARY|OPTION|DETAILS)$/;
    var FOCUSABLE = 'button:not([disabled]), a[href], input:not([disabled]):not([type="hidden"]), ' +
        'select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    var TEXT_FIELD = 'input:not([type]), input[type="text"], input[type="number"], input[type="search"], ' +
        'input[type="email"], input[type="tel"], input[type="time"], textarea, select';
    // ✖️ = ✖ + sélecteur de variante (U+FE0F)
    var CLOSE_SYMBOL = /^[×✕✖✗❌]\uFE0F?$/;
    // « Fermer » / « Annuler » / « OK » (message), éventuellement précédé d'un symbole de fermeture
    // (« ❌ Annuler ») — pas de n'importe quel émoji : « ↩️ Annuler » annule une
    // action de course (undoRaceAction), il ne ferme rien.
    var CLOSE_WORD = /^(?:[×✕✖✗❌]\uFE0F?\s*)?(fermer|annuler|ok)$/i;
    // barre de recherche, notifications, panneau latéral de l'historique de course
    // (étroit sur ordinateur, mais ≥ 90 % de l'écran sur un très petit téléphone)
    var IGNORED = '#appSearchBar, .notification, #raceActionHistoryPanel';

    var openDialogs = [];   // [{ el, returnFocus }] dans l'ordre d'ouverture
    var titleCount = 0;

    function isVisible(el) {
        if (!el || !el.isConnected) return false;
        var cs = getComputedStyle(el);
        return cs.display !== 'none' && cs.visibility !== 'hidden';
    }

    function isShown(el) {
        if (!isVisible(el)) return false;
        for (var p = el.parentElement; p && p !== document.body; p = p.parentElement) {
            if (getComputedStyle(p).display === 'none') return false;
        }
        return true;
    }

    // Fenêtre : .modal / .player-modal affichée, ou calque fixe couvrant l'écran.
    function isDialog(el) {
        if (!el || el.nodeType !== 1 || el === document.body || !el.isConnected) return false;
        if (el.matches(IGNORED) || el.closest(IGNORED)) return false;
        var cs = getComputedStyle(el);
        if (cs.position !== 'fixed' || cs.display === 'none' || cs.visibility === 'hidden') return false;
        if (el.classList.contains('modal') || el.classList.contains('player-modal')) return true;
        var r = el.getBoundingClientRect();
        var vw = global.innerWidth || document.documentElement.clientWidth;
        var vh = global.innerHeight || document.documentElement.clientHeight;
        return r.width >= vw * 0.9 && r.height >= vh * 0.9;
    }

    var CANDIDATES = '.modal, .player-modal, body > div, [style*="fixed"], [id$="-modal"], [id$="Modal"]';

    function dialogCandidates() {
        return document.body.querySelectorAll(CANDIDATES);
    }

    function focusables(dialog) {
        return Array.prototype.filter.call(dialog.querySelectorAll(FOCUSABLE), function(el) {
            return isShown(el) && el.getAttribute('tabindex') !== '-1';
        });
    }

    // Panneau visible de la fenêtre (le fond plein écran n'est que le calque).
    function panelOf(dialog) {
        var child = dialog.firstElementChild;
        return child && isVisible(child) ? child : dialog;
    }

    function labelDialog(dialog) {
        if (!dialog.getAttribute('role')) dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');
        if (dialog.getAttribute('aria-labelledby') || dialog.getAttribute('aria-label')) return;
        var title = dialog.querySelector('h1, h2, h3, h4');
        if (!title) return;
        if (!title.id) title.id = 'a11y-dialog-title-' + (++titleCount);
        dialog.setAttribute('aria-labelledby', title.id);
    }

    function isTouch() {
        return !!(global.matchMedia && global.matchMedia('(pointer: coarse)').matches);
    }

    function focusInto(dialog) {
        if (dialog.contains(document.activeElement)) return;
        var target = null;
        if (!isTouch()) {
            target = Array.prototype.find.call(dialog.querySelectorAll(TEXT_FIELD), function(el) {
                return isShown(el) && !el.disabled && !el.readOnly;
            });
        }
        if (!target) {
            target = panelOf(dialog);
            if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
        }
        try { target.focus({ preventScroll: true }); } catch (e) { target.focus(); }
    }

    function restoreFocus(entry) {
        var back = entry.returnFocus;
        var active = document.activeElement;
        var lost = !active || active === document.body || !active.isConnected || entry.el.contains(active);
        if (!lost) return;
        var top = openDialogs[openDialogs.length - 1];
        if (top) { focusInto(top.el); return; }
        if (back && back.isConnected && isShown(back)) {
            try { back.focus({ preventScroll: true }); } catch (e) { back.focus(); }
        }
    }

    function syncDialogs() {
        if (!document.body) return;
        // fermées : retirées du DOM ou masquées
        openDialogs.slice().forEach(function(entry) {
            if (isDialog(entry.el)) return;
            openDialogs.splice(openDialogs.indexOf(entry), 1);
            restoreFocus(entry);
        });
        // ouvertes
        Array.prototype.forEach.call(dialogCandidates(), function(el) {
            if (!isDialog(el)) return;
            if (openDialogs.some(function(d) { return d.el === el || d.el.contains(el) || el.contains(d.el); })) return;
            var active = document.activeElement;
            var entry = { el: el, returnFocus: active && active !== document.body && !el.contains(active) ? active : null };
            openDialogs.push(entry);
            labelDialog(el);
            focusInto(el);
        });
    }

    // Bouton de fermeture de la fenêtre : ×/✕ d'abord, puis Fermer/Annuler. Un « × » dans
    // une cellule de tableau retire une ligne (ex. grille « Ajouter des participants ») :
    // ce n'est pas la fermeture de la fenêtre, il est ignoré.
    function findCloseControl(dialog) {
        var controls = Array.prototype.filter.call(dialog.querySelectorAll('button, [onclick], [role="button"]'), function(el) {
            return el !== dialog && isShown(el) && !el.closest('td, th');
        });
        var text = function(el) { return el.textContent.replace(/\s+/g, ' ').trim(); };
        return controls.find(function(el) { return CLOSE_SYMBOL.test(text(el)); }) ||
            controls.find(function(el) { return CLOSE_WORD.test(text(el)); }) ||
            controls.find(function(el) { return CLOSE_WORD.test((el.getAttribute('title') || '').trim()); }) ||
            null;
    }

    function closeTopDialog() {
        var top = openDialogs[openDialogs.length - 1];
        if (!top) return false;
        var control = findCloseControl(top.el);
        if (control) { control.click(); return true; }
        // fond cliquable (« if (event.target === this) fermer() ») : clic sur le fond lui-même
        if (top.el.hasAttribute('onclick')) {
            top.el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: global }));
            return true;
        }
        return false;
    }

    function trapTab(event, dialog) {
        var items = focusables(dialog);
        var active = document.activeElement;
        if (!items.length) {
            event.preventDefault();
            focusInto(dialog);
            return;
        }
        var first = items[0], last = items[items.length - 1];
        var inside = dialog.contains(active);
        if (event.shiftKey && (!inside || active === first || active === panelOf(dialog))) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && (!inside || active === last)) {
            event.preventDefault();
            first.focus();
        }
    }

    // ---- éléments cliquables non natifs
    function isClickable(el) {
        if (NATIVE.test(el.tagName) || el.closest(IGNORED)) return false;
        var code = el.getAttribute('onclick') || '';
        if (/^\s*event\.stopPropagation\(\)\s*;?\s*$/.test(code)) return false;
        if (/event\.target\s*===?\s*this/.test(code)) return false;    // fond de fenêtre
        return getComputedStyle(el).position !== 'fixed';
    }

    function enhanceClickables(root) {
        if (!root || root.nodeType !== 1) return;
        var list = root.matches('[onclick]') ? [root] : [];
        Array.prototype.push.apply(list, root.querySelectorAll('[onclick]'));
        list.forEach(function(el) {
            if (el.hasAttribute('data-a11y-click') || !isClickable(el)) return;
            el.setAttribute('data-a11y-click', '');
            if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
            if (el.tagName !== 'TR' && !el.getAttribute('role')) el.setAttribute('role', 'button');
        });
    }

    // ---- champs sans libellé (cases de score, champs à placeholder, cellules de tableau)
    var FIELDS = 'input:not([type="hidden"]):not([type="button"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"]), select, textarea';

    function hasName(el) {
        return (el.labels && el.labels.length) || el.getAttribute('aria-label') ||
            el.getAttribute('aria-labelledby') || el.getAttribute('title');
    }
    function cleanText(t) {
        return (t || '').replace(/\s+/g, ' ').replace(/\s*:\s*$/, '').trim();
    }
    // Nom d'un joueur du match : « Gai Séjour 1 » (nom affiché) ou champ de nom en mode « Modifier ».
    function playerOf(container, side) {
        var span = container.querySelector(side === 1 ? '.player-name-left' : '.player-name-right');
        if (span) return cleanText(span.textContent);
        var field = container.querySelector('input[onchange*="\'player' + side + '\'"]');
        return field ? cleanText(field.value) : '';
    }
    function scoreName(el) {
        var m = (el.getAttribute('onchange') || '').match(/'score([12])'/);
        if (!m) return '';
        var side = +m[1];
        for (var box = el.parentElement; box && box !== document.body; box = box.parentElement) {
            var me = playerOf(box, side), other = playerOf(box, 3 - side);
            if (me || other) {
                return 'Score de ' + (me || 'joueur ' + side) + (other ? ' contre ' + other : '');
            }
        }
        return 'Score du joueur ' + side;
    }
    function playerFieldName(el) {
        var m = (el.getAttribute('onchange') || '').match(/'player([12])'/);
        return m ? 'Nom du joueur ' + m[1] + ' du match' : '';
    }
    // Libellé posé juste avant le champ (<label>, <strong>, <span> court) sans être relié.
    function nearbyLabel(el) {
        var prev = el.previousElementSibling;
        if (!prev && el.parentElement) prev = el.parentElement.previousElementSibling;
        if (!prev || prev.matches(FIELDS) || prev.querySelector(FIELDS + ', button, a[href], [onclick]')) return null;
        if (!/^(LABEL|STRONG|B|SPAN|DIV|SMALL)$/.test(prev.tagName)) return null;
        var text = cleanText(prev.textContent);
        // un vrai <label> reste le libellé quelle que soit sa longueur ; ailleurs, texte court
        return text && (prev.tagName === 'LABEL' || text.length <= 60) ? { el: prev, text: text } : null;
    }
    // Champ dans un tableau : en-tête de sa colonne + première cellule de sa ligne.
    function tableName(el) {
        var cell = el.closest('td');
        var row = cell && cell.parentElement;
        var table = row && row.closest('table');
        if (!table) return '';
        var head = table.querySelector('thead tr') || table.querySelector('tr');
        var th = head && head !== row ? head.children[cell.cellIndex] : null;
        var col = th ? cleanText(th.textContent) : '';
        var first = row.cells[0] !== cell ? cleanText(row.cells[0].textContent) : '';
        if (row.cells[1] && row.cells[1] !== cell && /^\d+$/.test(first)) first = cleanText(row.cells[1].textContent);
        return [col, first].filter(Boolean).join(' – ');
    }
    // Placeholder parlant (« Nom du participant ») ; un exemple (« ex: Solo… ») n'est pas un nom ;
    // une liste d'exemples sur plusieurs lignes (« Joueur 1⏎Joueur 2 ») décrit une saisie par ligne.
    function placeholderName(ph) {
        if (!/[A-Za-zÀ-ÿ]{3}/.test(ph) || /^\s*(ex\b|exemple|e\.g\.)/i.test(ph)) return '';
        var lines = ph.split('\n').map(cleanText).filter(Boolean);
        if (lines.length > 1) return 'Liste, une entrée par ligne (ex. ' + lines[0] + ')';
        return lines[0] || '';
    }
    function nameField(el) {
        if (el.hasAttribute('data-a11y-name') || hasName(el)) return;
        el.setAttribute('data-a11y-name', '');
        var name = scoreName(el) || playerFieldName(el);
        if (!name) {
            var near = nearbyLabel(el);
            if (near && near.el.tagName === 'LABEL' && !near.el.htmlFor && el.id) { near.el.htmlFor = el.id; return; }
            if (near) name = near.text;
        }
        if (!name) name = tableName(el);
        if (!name) name = placeholderName(el.placeholder || '');
        if (name) el.setAttribute('aria-label', name);
    }
    function nameFields(root) {
        if (!root || root.nodeType !== 1) return;
        if (root.matches(FIELDS)) nameField(root);
        Array.prototype.forEach.call(root.querySelectorAll(FIELDS), nameField);
    }

    function onKeydown(event) {
        if (event.defaultPrevented) return;
        var target = event.target;
        if (event.key === 'Escape') {
            if (target && target.closest && target.closest(IGNORED)) return;
            syncDialogs();
            if (closeTopDialog()) event.preventDefault();
            return;
        }
        if (event.key === 'Tab') {
            // la barre de recherche s'utilise par-dessus une fenêtre ouverte
            if (target && target.closest && target.closest(IGNORED)) return;
            var top = openDialogs[openDialogs.length - 1];
            if (top && isDialog(top.el)) trapTab(event, top.el);
            return;
        }
        if ((event.key === 'Enter' || event.key === ' ') && target && target.hasAttribute &&
            target.hasAttribute('data-a11y-click') && !event.repeat) {
            event.preventDefault();
            target.click();
        }
    }

    function start() {
        if (!document.body) return;
        enhanceClickables(document.body);
        nameFields(document.body);
        syncDialogs();
        document.addEventListener('keydown', onKeydown);
        if (typeof MutationObserver !== 'function') return;
        new MutationObserver(function(mutations) {
            if (!global.document || !document.body) return;   // page en cours de fermeture
            var changed = false;
            mutations.forEach(function(m) {
                // style/classe : seulement sur une fenêtre possible (le chrono restyle sans cesse)
                if (m.type === 'attributes') {
                    if (m.target.matches(CANDIDATES)) changed = true;
                    return;
                }
                // le chrono remplace du texte 10 fois par seconde : seuls les éléments comptent
                Array.prototype.forEach.call(m.addedNodes, function(n) {
                    if (n.nodeType === 1) { changed = true; enhanceClickables(n); nameFields(n); }
                });
                Array.prototype.forEach.call(m.removedNodes, function(n) {
                    if (n.nodeType === 1) changed = true;
                });
            });
            if (changed) syncDialogs();
        }).observe(document.body, {
            childList: true, subtree: true,
            attributes: true, attributeFilter: ['class', 'style']
        });
    }

    // « Réduire les animations » (réglage système) : les défilements en douceur
    // demandés en JS (scrollIntoView / scrollTo avec behavior: 'smooth') deviennent
    // instantanés — le CSS (styles.css, MOINS D'ANIMATIONS) ne les atteint pas.
    function reducedMotion() {
        return !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }
    function withoutSmooth(original) {
        return function(arg) {
            if (reducedMotion() && arg && typeof arg === 'object' && arg.behavior === 'smooth') {
                arg = Object.assign({}, arg, { behavior: 'auto' });
                return original.apply(this, [arg].concat(Array.prototype.slice.call(arguments, 1)));
            }
            return original.apply(this, arguments);
        };
    }
    if (global.Element && Element.prototype.scrollIntoView) {
        Element.prototype.scrollIntoView = withoutSmooth(Element.prototype.scrollIntoView);
    }
    if (typeof global.scrollTo === 'function') global.scrollTo = withoutSmooth(global.scrollTo);
    if (global.Element && Element.prototype.scrollTo) Element.prototype.scrollTo = withoutSmooth(Element.prototype.scrollTo);

    global.a11yRules = { withoutSmooth: withoutSmooth };   // pour les tests
    global.getOpenDialogs = function() { return openDialogs.map(function(d) { return d.el; }); };
    global.closeTopDialog = closeTopDialog;
    global.refreshA11y = function() { enhanceClickables(document.body); nameFields(document.body); syncDialogs(); };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})(window);
