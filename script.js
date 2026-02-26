// ============================================
// BOOTSTRAP - Gestionnaire de Championnats
// ============================================
// Tous les modules sont chargés via les fichiers IIFE dans src/
// Ce fichier ne contient que le dark mode et la référence locale championship.

try {
    // DARK MODE
    function toggleDarkMode() {
        var isDark = document.getElementById('darkModeToggle').checked;
        if (isDark) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
        try {
            localStorage.setItem('darkMode', isDark ? 'true' : 'false');
        } catch(e) {}
    }
    window.toggleDarkMode = toggleDarkMode;

    // Charger la préférence dark mode au démarrage
    (function loadDarkMode() {
        try {
            var saved = localStorage.getItem('darkMode');
            if (saved === 'true') {
                document.body.classList.add('dark-mode');
                var toggle = document.getElementById('darkModeToggle');
                if (toggle) toggle.checked = true;
            }
        } catch(e) {}
    })();

} catch (error) {
    console.error("ERREUR DANS LE SCRIPT:", error);
    console.error("Stack trace:", error.stack);
}
