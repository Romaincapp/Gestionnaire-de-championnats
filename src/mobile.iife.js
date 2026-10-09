// ============================================
// TÉLÉPHONE : tableaux trop larges défilables
// ============================================
// Les tableaux (séries, classements, statistiques...) sont générés en JS dans
// des dizaines de gabarits. Sur un écran étroit, un tableau plus large que sa
// place était coupé : dernières colonnes (Rang, Temps, Total...) invisibles.
// Ce module repère, sur écran étroit seulement, les tableaux qui ne tiennent
// pas et leur pose la classe « table-scroll-x » (styles.css) : le tableau
// défile alors horizontalement au doigt. Les tableaux qui tiennent restent
// intacts ; sur ordinateur rien ne change. Un MutationObserver suit chaque
// rendu (innerHTML, fenêtre ouverte, section dépliée), et la rotation de
// l'écran. Aucune fonction d'affichage n'a besoin de connaître ce module.
(function(global) {
    'use strict';

    var NARROW = '(max-width: 768px)';
    var CLASS = 'table-scroll-x';
    var scheduled = false;

    function isNarrow() {
        return !!(global.matchMedia && global.matchMedia(NARROW).matches);
    }

    // Largeur disponible pour un élément : boîte de contenu de son parent,
    // bornée par l'écran (un parent lui-même étiré par le tableau ne compte pas).
    function availableRight(table) {
        var parent = table.parentElement;
        var vw = document.documentElement.clientWidth;
        if (!parent) return vw;
        var cs = getComputedStyle(parent);
        var r = parent.getBoundingClientRect();
        return Math.min(r.right - parseFloat(cs.paddingRight || 0) - parseFloat(cs.borderRightWidth || 0), vw);
    }

    // Mesure tous les tableaux d'un coup (une seule mise en page), puis ne
    // touche qu'aux classes qui changent : pas de va-et-vient à chaque rendu
    // (le chrono redessine l'écran de course 10 fois par seconde).
    function fitTables() {
        scheduled = false;
        if (!document.body) return;
        var tables = Array.prototype.slice.call(document.body.getElementsByTagName('table'));
        var narrow = isNarrow();
        var wanted = tables.map(function(t) {
            if (!narrow) return false;
            if (t.classList.contains(CLASS)) {
                // déjà défilant : le reste tant que son contenu dépasse
                return t.clientWidth ? t.scrollWidth > t.clientWidth + 1 : true;
            }
            var r = t.getBoundingClientRect();
            if (!r.width) return false;                       // masqué
            return r.right > availableRight(t) + 1;
        });
        tables.forEach(function(t, i) {
            if (t.classList.contains(CLASS) !== wanted[i]) t.classList.toggle(CLASS, wanted[i]);
        });
    }

    function schedule() {
        if (scheduled) return;
        scheduled = true;
        (global.requestAnimationFrame || setTimeout)(fitTables);
    }

    function start() {
        if (typeof MutationObserver !== 'function' || !document.body) return;
        new MutationObserver(function(mutations) {
            if (!global.document || !document.body) return;   // page en cours de fermeture
            if (!isNarrow() && !document.querySelector('table.' + CLASS)) return;
            // nos propres changements de classe sur les tableaux ne relancent rien
            var relevant = mutations.some(function(m) {
                return !(m.type === 'attributes' && m.target.tagName === 'TABLE');
            });
            if (relevant) schedule();
        }).observe(document.body, {
            childList: true, subtree: true,
            attributes: true, attributeFilter: ['class', 'style']
        });
        global.addEventListener('resize', schedule);
        schedule();
    }

    if (document.body) start();
    else document.addEventListener('DOMContentLoaded', start);

    global.fitTablesToScreen = fitTables;
})(window);
