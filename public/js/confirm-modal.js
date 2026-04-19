function showConfirm(message, options) {
    options = options || {};
    const type        = options.type        || 'default';
    const title       = options.title       || 'Confirmation';
    const confirmText = options.confirmText || 'Confirmer';
    const cancelText  = options.cancelText  || 'Annuler';

    return new Promise(function(resolve) {
        const existing = document.getElementById('cc-confirm-overlay');
        if (existing) existing.remove();

        const btnBg = type === 'danger'  ? '#dc2626'
                    : type === 'warning' ? '#d97706'
                    :                      '#4f46e5';

        const icon  = type === 'danger'  ? '🗑️'
                    : type === 'warning' ? '⚠️'
                    :                      '❓';

        const overlay = document.createElement('div');
        overlay.id = 'cc-confirm-overlay';
        overlay.style.cssText = [
            'position:fixed;inset:0;z-index:999999',
            'background:rgba(0,0,0,.45)',
            'display:flex;align-items:center;justify-content:center',
            'animation:ccFadeIn .15s ease'
        ].join(';');

        overlay.innerHTML =
            '<div id="cc-confirm-box" style="' +
                'background:#fff;border-radius:16px;padding:32px 28px 24px;' +
                'max-width:420px;width:90%;' +
                'box-shadow:0 24px 64px rgba(0,0,0,.25);' +
                'animation:ccSlideUp .2s ease' +
            '">' +
                '<div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">' +
                    '<span style="font-size:26px;line-height:1">' + icon + '</span>' +
                    '<h3 style="margin:0;font-size:17px;font-weight:700;color:#111827;">' + title + '</h3>' +
                '</div>' +
                '<p style="margin:0 0 24px;color:#4b5563;line-height:1.6;font-size:14.5px;">' +
                    message.replace(/\n/g, '<br>') +
                '</p>' +
                '<div style="display:flex;gap:10px;justify-content:flex-end;">' +
                    '<button id="cc-cancel-btn" style="' +
                        'padding:9px 20px;border-radius:8px;border:1.5px solid #d1d5db;' +
                        'background:#fff;color:#374151;font-size:14px;font-weight:500;cursor:pointer' +
                    '">' + cancelText + '</button>' +
                    '<button id="cc-confirm-btn" style="' +
                        'padding:9px 20px;border-radius:8px;border:none;' +
                        'background:' + btnBg + ';color:#fff;font-size:14px;font-weight:600;cursor:pointer' +
                    '">' + confirmText + '</button>' +
                '</div>' +
            '</div>';

        if (!document.getElementById('cc-confirm-style')) {
            const s = document.createElement('style');
            s.id = 'cc-confirm-style';
            s.textContent =
                '@keyframes ccFadeIn{from{opacity:0}to{opacity:1}}' +
                '@keyframes ccSlideUp{from{transform:translateY(18px);opacity:0}to{transform:translateY(0);opacity:1}}' +
                '#cc-cancel-btn:hover{background:#f3f4f6!important}' +
                '#cc-confirm-btn:hover{filter:brightness(.9)}';
            document.head.appendChild(s);
        }

        document.body.appendChild(overlay);

        function done(result) {
            overlay.remove();
            resolve(result);
        }

        document.getElementById('cc-confirm-btn').addEventListener('click', function() { done(true); });
        document.getElementById('cc-cancel-btn').addEventListener('click', function() { done(false); });
        overlay.addEventListener('click', function(e) { if (e.target === overlay) done(false); });
    });
}
