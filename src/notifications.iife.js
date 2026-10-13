// ============================================
// MODULE NOTIFICATIONS (IIFE)
// ============================================
(function(global) {
    'use strict';

    // Lecteurs d'écran : une zone d'annonce permanente et invisible (une zone créée
    // avec son texte n'est pas lue de façon fiable). Info / succès : annonce polie ;
    // avertissement / erreur : annonce prioritaire.
    function liveRegion(assertive) {
        const id = assertive ? 'a11yLiveAlert' : 'a11yLiveStatus';
        let region = document.getElementById(id);
        if (!region && document.body) {
            region = document.createElement('div');
            region.id = id;
            region.setAttribute('role', assertive ? 'alert' : 'status');
            region.setAttribute('aria-live', assertive ? 'assertive' : 'polite');
            region.setAttribute('aria-atomic', 'true');
            region.style.cssText = 'position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; ' +
                'overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;';
            document.body.appendChild(region);
        }
        return region;
    }
    function announce(message, assertive) {
        const region = liveRegion(!!assertive);
        if (!region) return;
        region.textContent = '';
        // vider puis remplir au tour suivant : un message identique est relu
        setTimeout(function() { region.textContent = String(message); }, 50);
    }

    function showNotification(message, type = 'info') {
        if (typeof document === 'undefined') {
            return;
        }
        announce(message, type === 'error' || type === 'warning');

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
                notification.style.backgroundColor = '#017239';
                notification.style.color = 'white';
                break;
            case 'warning':
                notification.style.backgroundColor = '#FFC107';
                notification.style.color = 'black';
                break;
            case 'error':
                notification.style.backgroundColor = '#d03427';
                notification.style.color = 'white';
                break;
            default:
                notification.style.backgroundColor = '#09679e';
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

    // ============================================
    // MESSAGES (window.alert) DANS L'APPLICATION
    // ============================================
    // Les ~90 alert(...) des modules ouvrent une fenêtre de l'app au lieu de la
    // boîte native : aux couleurs du thème (mode sombre compris), annoncée aux
    // lecteurs d'écran (role="alertdialog"), et sans bloquer la page — une boîte
    // native gèle l'affichage, chrono compris, tant qu'on ne l'a pas fermée.
    // OK reçoit le focus (Entrée ferme, comme la boîte native ; Échap aussi, via
    // a11y.iife.js), puis le focus revient où il était. confirm() / prompt()
    // restent natifs : leur réponse est attendue de façon synchrone par le code.
    const nativeAlert = typeof global.alert === 'function' ? global.alert.bind(global) : null;
    let alertCount = 0;

    function appAlert(message) {
        if (typeof document === 'undefined' || !document.body) {
            if (nativeAlert) nativeAlert(message);
            return;
        }
        const previousFocus = document.activeElement;
        const id = 'appAlertMessage-' + (++alertCount);

        const overlay = document.createElement('div');
        overlay.className = 'app-alert';
        overlay.setAttribute('role', 'alertdialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-label', 'Message');
        overlay.setAttribute('aria-describedby', id);
        overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; ' +
            'background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; ' +
            'z-index: 10050; padding: 16px; box-sizing: border-box;';

        const panel = document.createElement('div');
        panel.style.cssText = 'background: white; color: #2c3e50; border-radius: 10px; padding: 20px; ' +
            'width: 100%; max-width: 480px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);';

        const text = document.createElement('p');
        text.id = id;
        text.textContent = message === undefined ? '' : String(message);
        text.style.cssText = 'margin: 0 0 16px; white-space: pre-line; font-size: 15px; line-height: 1.5; ' +
            'overflow-wrap: anywhere; max-height: 60vh; overflow-y: auto;';

        const actions = document.createElement('div');
        actions.style.cssText = 'text-align: right;';
        const ok = document.createElement('button');
        ok.type = 'button';
        ok.textContent = 'OK';
        ok.style.cssText = 'background: #09679e; color: white; border: none; border-radius: 6px; ' +
            'padding: 10px 28px; font-size: 15px; font-weight: bold; cursor: pointer;';
        ok.onclick = function() {
            overlay.remove();
            if (previousFocus && previousFocus.isConnected && typeof previousFocus.focus === 'function') {
                try { previousFocus.focus({ preventScroll: true }); } catch (e) { previousFocus.focus(); }
            }
        };
        actions.appendChild(ok);
        panel.appendChild(text);
        panel.appendChild(actions);
        overlay.appendChild(panel);
        document.body.appendChild(overlay);
        ok.focus();
    }

    // Exposer sur window
    global.appAlert = appAlert;
    global.alert = appAlert;
    global.showNotification = showNotification;
    global.announce = announce;
    global.reportSaveFailure = reportSaveFailure;
    global.reportSaveSuccess = reportSaveSuccess;

})(window);
