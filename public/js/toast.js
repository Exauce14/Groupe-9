// Système de notifications toast - remplace les alert() natifs
(function () {
    var pendingToasts = [];
    var container = null;

    function showToast(message, type) {
        if (!container) return;
        var clean = message.replace(/^[✅❌⚠️🎉📧🔒💳🏦]\s*/, '').trim();
        var icons = { success: '✔', error: '✖', warning: '⚠', info: 'ℹ' };
        var toast = document.createElement('div');
        toast.className = 'toast ' + type;
        toast.innerHTML = '<span class="toast-icon">' + icons[type] + '</span><span>' + clean + '</span>';
        container.appendChild(toast);
        setTimeout(function () {
            toast.classList.add('fadeout');
            setTimeout(function () { toast.remove(); }, 300);
        }, 3500);
    }

    function detectType(msg) {
        if (msg.includes('✅') || msg.includes('succès') || msg.includes('approuvé') || msg.includes('débloqué')) return 'success';
        if (msg.includes('❌') || msg.includes('Erreur') || msg.includes('erreur')) return 'error';
        if (msg.includes('⚠️') || msg.includes('Veuillez') || msg.includes('requis')) return 'warning';
        return 'info';
    }

    // Override window.alert immédiatement
    window.alert = function (message) {
        var msg = String(message);
        var type = detectType(msg);
        if (container) {
            showToast(msg, type);
        } else {
            pendingToasts.push({ msg: msg, type: type });
        }
    };

    document.addEventListener('DOMContentLoaded', function () {
        // Injecter le CSS
        var style = document.createElement('style');
        style.textContent = [
            '#toast-container { position:fixed; top:20px; right:20px; z-index:99999; display:flex; flex-direction:column; gap:10px; pointer-events:none; }',
            '.toast { display:flex; align-items:center; gap:10px; padding:14px 18px; border-radius:10px; font-size:14px; font-weight:500; color:#fff; min-width:280px; max-width:400px; box-shadow:0 4px 16px rgba(0,0,0,0.2); animation:toastIn 0.3s ease; pointer-events:all; font-family:inherit; }',
            '.toast.success { background:#1a8a4a; }',
            '.toast.error   { background:#c0392b; }',
            '.toast.warning { background:#d68910; }',
            '.toast.info    { background:#2471a3; }',
            '.toast.fadeout { animation:toastOut 0.3s ease forwards; }',
            '.toast-icon { font-size:16px; flex-shrink:0; }',
            '@keyframes toastIn  { from { opacity:0; transform:translateX(40px); } to { opacity:1; transform:translateX(0); } }',
            '@keyframes toastOut { from { opacity:1; transform:translateX(0); } to { opacity:0; transform:translateX(40px); } }'
        ].join('\n');
        document.head.appendChild(style);

        // Créer le container
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);

        // Afficher les toasts en attente
        pendingToasts.forEach(function (t) { showToast(t.msg, t.type); });
        pendingToasts = [];
    });

    window.showToast = showToast;
})();
