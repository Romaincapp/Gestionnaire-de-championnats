// ============================================
// MODULE NOTIFICATIONS (IIFE)
// ============================================
(function(global) {
    'use strict';

    function showNotification(message, type = 'info') {
        if (typeof document === 'undefined') {
            return;
        }

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        // Style de base
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.right = '20px';
        notification.style.padding = '15px';
        notification.style.borderRadius = '5px';
        notification.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
        notification.style.zIndex = '10000';
        notification.style.transition = 'all 0.3s ease';

        // Styles par type
        switch(type) {
            case 'success':
                notification.style.backgroundColor = '#4CAF50';
                notification.style.color = 'white';
                break;
            case 'warning':
                notification.style.backgroundColor = '#FFC107';
                notification.style.color = 'black';
                break;
            case 'error':
                notification.style.backgroundColor = '#F44336';
                notification.style.color = 'white';
                break;
            default:
                notification.style.backgroundColor = '#2196F3';
                notification.style.color = 'white';
        }

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(-20px)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, 3000);
    }

    // ============================================
    // ÉCHEC DE SAUVEGARDE (localStorage plein, navigation privée...)
    // ============================================
    // Les sauvegardes ont lieu à chaque modification : un toast se répéterait
    // sans cesse et disparaîtrait en 3 s. On affiche donc UN bandeau persistant,
    // retiré automatiquement dès que toutes les sauvegardes réussissent de nouveau.
    // `store` identifie la sauvegarde concernée ('championship', 'chrono').
    const failingSaves = {};

    function describeSaveError(error) {
        const name = error && error.name;
        if (name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED') {
            return 'espace de stockage du navigateur plein';
        }
        return 'stockage du navigateur indisponible (navigation privée ou stockage bloqué ?)';
    }

    function reportSaveFailure(store, error) {
        failingSaves[store] = true;
        if (typeof document === 'undefined' || !document.body) return;

        let banner = document.getElementById('saveFailureBanner');
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'saveFailureBanner';
            banner.setAttribute('role', 'alert');
            banner.style.cssText = 'position: fixed; left: 0; right: 0; bottom: 0; z-index: 10001; ' +
                'background: #c0392b; color: white; padding: 12px 15px; font-size: 14px; ' +
                'display: flex; align-items: center; justify-content: center; gap: 12px; flex-wrap: wrap; ' +
                'box-shadow: 0 -2px 10px rgba(0,0,0,0.3);';

            const text = document.createElement('span');
            text.id = 'saveFailureBannerText';
            banner.appendChild(text);

            const exportBtn = document.createElement('button');
            exportBtn.textContent = '💾 Exporter maintenant';
            exportBtn.style.cssText = 'background: white; color: #c0392b; border: none; padding: 8px 12px; ' +
                'border-radius: 5px; font-weight: bold; cursor: pointer; font-size: 13px;';
            exportBtn.onclick = function() {
                if (typeof global.exportChampionship === 'function') global.exportChampionship();
            };
            banner.appendChild(exportBtn);

            document.body.appendChild(banner);
        }
        document.getElementById('saveFailureBannerText').textContent =
            '⚠️ Sauvegarde impossible (' + describeSaveError(error) + ') : vos dernières modifications ' +
            'ne sont PAS enregistrées dans ce navigateur. Ne fermez pas cet onglet et exportez vos données.';
    }

    function reportSaveSuccess(store) {
        if (!failingSaves[store]) return; // cas normal : rien à faire (appelé à chaque sauvegarde)
        delete failingSaves[store];
        if (Object.keys(failingSaves).length > 0) return;
        const banner = typeof document !== 'undefined' && document.getElementById('saveFailureBanner');
        if (banner) {
            banner.remove();
            showNotification('✅ Sauvegarde rétablie', 'success');
        }
    }

    // Exposer sur window
    global.showNotification = showNotification;
    global.reportSaveFailure = reportSaveFailure;
    global.reportSaveSuccess = reportSaveSuccess;

})(window);
