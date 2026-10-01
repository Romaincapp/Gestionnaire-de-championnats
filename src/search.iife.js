// ============================================
// RECHERCHE DANS LA PAGE (barre 🔍, façon Ctrl+F)
// ============================================
// Cherche dans ce qui est affiché (onglet actif, modale ouverte, écran de course),
// insensible à la casse et aux accents.
//
// Les vues de l'app sont reconstruites par innerHTML (updateMatchesDisplay,
// updatePoolsDisplay, refreshChronoDisplay, displayRaceInterface...) : insérer des
// <mark> serait effacé à chaque rendu et casserait inputs/onclick. On surligne donc
// via la CSS Custom Highlight API (aucune modification du DOM) et un MutationObserver
// relance la recherche après chaque rendu. Aucune fonction d'affichage n'est modifiée.
(function(global) {
    'use strict';

    var BAR_ID = 'appSearchBar';
    var SKIP_TAGS = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEXTAREA: 1, SELECT: 1, OPTION: 1, INPUT: 1 };
    var RESEARCH_DELAY = 200;

    var state = { query: '', ranges: [], index: -1, observer: null, timer: null };

    function hasHighlightApi() {
        return typeof CSS !== 'undefined' && CSS.highlights && typeof Highlight === 'function';
    }

    // Normalise un texte (minuscules, sans accents) en gardant pour chaque caractère
    // produit l'index du caractère d'origine.
    function normalizeWithMap(text) {
        var out = '';
        var map = [];
        for (var i = 0; i < text.length; i++) {
            var n = text[i].normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
            for (var j = 0; j < n.length; j++) {
                out += n[j];
                map.push(i);
            }
        }
        return { text: out, map: map };
    }

    function normalizeQuery(query) {
        return normalizeWithMap(String(query || '').trim()).text;
    }

    function isHiddenElement(el) {
        if (el.id === BAR_ID || SKIP_TAGS[el.tagName]) return true;
        var style = global.getComputedStyle ? global.getComputedStyle(el) : el.style;
        return style.display === 'none' || style.visibility === 'hidden';
    }

    // Retourne les Range de toutes les occurrences de `query` dans les nœuds texte
    // visibles sous `root`.
    function findMatches(root, query) {
        var needle = normalizeQuery(query);
        var ranges = [];
        if (!root || !needle) return ranges;

        var walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
            acceptNode: function(node) {
                if (node.nodeType === 1) {
                    // REJECT saute tout le sous-arbre d'un élément caché.
                    return isHiddenElement(node) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_SKIP;
                }
                return node.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
            }
        });

        var node;
        while ((node = walker.nextNode())) {
            var norm = normalizeWithMap(node.nodeValue);
            var from = 0;
            var pos;
            while ((pos = norm.text.indexOf(needle, from)) !== -1) {
                var start = norm.map[pos];
                var end = norm.map[pos + needle.length - 1] + 1;
                var range = document.createRange();
                range.setStart(node, start);
                range.setEnd(node, end);
                ranges.push(range);
                from = pos + needle.length;
            }
        }
        return ranges;
    }

    function getBar() { return document.getElementById(BAR_ID); }

    function updateCounter() {
        var counter = document.getElementById('appSearchCount');
        if (!counter) return;
        if (!state.query) counter.textContent = '';
        else if (!state.ranges.length) counter.textContent = 'Aucun résultat';
        else counter.textContent = (state.index + 1) + ' / ' + state.ranges.length;
        var input = document.getElementById('appSearchInput');
        if (input) input.classList.toggle('no-result', !!state.query && !state.ranges.length);
    }

    function paintHighlights() {
        if (!hasHighlightApi()) return;
        CSS.highlights.delete('app-search');
        CSS.highlights.delete('app-search-current');
        if (!state.ranges.length) return;
        var others = state.ranges.filter(function(r, i) { return i !== state.index; });
        CSS.highlights.set('app-search', new Highlight(...others));
        var current = new Highlight(state.ranges[state.index]);
        current.priority = 1;
        CSS.highlights.set('app-search-current', current);
    }

    function scrollToCurrent() {
        var range = state.ranges[state.index];
        if (!range) return;
        var el = range.startContainer.parentElement;
        if (el && typeof el.scrollIntoView === 'function') {
            el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
    }

    // keepPosition : relance après un re-rendu (garde l'index, sans faire défiler).
    function runSearch(keepPosition) {
        state.ranges = findMatches(document.body, state.query);
        if (!state.ranges.length) state.index = -1;
        else if (keepPosition) state.index = Math.min(Math.max(state.index, 0), state.ranges.length - 1);
        else state.index = 0;
        paintHighlights();
        updateCounter();
        if (!keepPosition) scrollToCurrent();
    }

    function move(step) {
        if (!state.ranges.length) return;
        var n = state.ranges.length;
        state.index = (state.index + step + n) % n;
        paintHighlights();
        updateCounter();
        scrollToCurrent();
    }

    function appSearchNext() { move(1); }
    function appSearchPrev() { move(-1); }

    function scheduleResearch() {
        // Throttle (et non debounce) : pendant une course le DOM change en continu,
        // un debounce ne se déclencherait jamais.
        if (state.timer) return;
        state.timer = setTimeout(function() {
            state.timer = null;
            if (state.query) runSearch(true);
        }, RESEARCH_DELAY);
    }

    function startObserver() {
        if (state.observer || typeof MutationObserver !== 'function') return;
        state.observer = new MutationObserver(function(mutations) {
            var bar = getBar();
            var relevant = mutations.some(function(m) {
                return !(bar && bar.contains(m.target));
            });
            if (relevant) scheduleResearch();
        });
        state.observer.observe(document.body, {
            childList: true, subtree: true, characterData: true,
            attributes: true, attributeFilter: ['class', 'style']
        });
    }

    function stopObserver() {
        if (state.observer) state.observer.disconnect();
        state.observer = null;
        if (state.timer) clearTimeout(state.timer);
        state.timer = null;
    }

    function onSearchInput(value) {
        state.query = value;
        runSearch(false);
    }

    function onSearchKeydown(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            if (event.shiftKey) appSearchPrev(); else appSearchNext();
        } else if (event.key === 'Escape') {
            event.preventDefault();
            closeAppSearch();
        }
    }

    function openAppSearch() {
        var bar = getBar();
        if (!bar) return;
        bar.style.display = 'flex';
        var input = document.getElementById('appSearchInput');
        if (input) {
            input.focus();
            input.select();
            if (input.value) onSearchInput(input.value);
        }
        startObserver();
    }

    function closeAppSearch() {
        var bar = getBar();
        if (bar) bar.style.display = 'none';
        stopObserver();
        state.ranges = [];
        state.index = -1;
        if (hasHighlightApi()) {
            CSS.highlights.delete('app-search');
            CSS.highlights.delete('app-search-current');
        }
    }

    global.openAppSearch = openAppSearch;
    global.closeAppSearch = closeAppSearch;
    global.appSearchNext = appSearchNext;
    global.appSearchPrev = appSearchPrev;
    global.onAppSearchInput = onSearchInput;
    global.onAppSearchKeydown = onSearchKeydown;
    global.findAppSearchMatches = findMatches;
    global.getAppSearchState = function() {
        return { query: state.query, count: state.ranges.length, index: state.index };
    };
})(window);
