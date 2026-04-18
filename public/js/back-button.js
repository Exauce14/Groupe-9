// Bouton retour automatique sur toutes les pages
document.addEventListener('DOMContentLoaded', function () {
    // Ne pas afficher sur la page d'accueil / connexion / inscription
    var pagesExclues = ['index.html', 'inscription.html', 'inscription-wizard.html', '/', ''];
    var page = window.location.pathname.split('/').pop();
    if (pagesExclues.includes(page)) return;

    var style = document.createElement('style');
    style.textContent = [
        '.btn-retour {',
        '    position: fixed;',
        '    top: 16px;',
        '    left: 16px;',
        '    z-index: 9998;',
        '    display: flex;',
        '    align-items: center;',
        '    gap: 6px;',
        '    background: #ffffff;',
        '    color: #374151;',
        '    border: 1.5px solid #d1d5db;',
        '    border-radius: 8px;',
        '    padding: 8px 14px;',
        '    font-size: 13px;',
        '    font-weight: 500;',
        '    cursor: pointer;',
        '    box-shadow: 0 1px 4px rgba(0,0,0,0.1);',
        '    transition: background 0.15s, box-shadow 0.15s;',
        '    font-family: inherit;',
        '    text-decoration: none;',
        '}',
        '.btn-retour:hover {',
        '    background: #f3f4f6;',
        '    box-shadow: 0 2px 8px rgba(0,0,0,0.15);',
        '}',
        '.btn-retour svg {',
        '    width: 16px;',
        '    height: 16px;',
        '    flex-shrink: 0;',
        '}'
    ].join('\n');
    document.head.appendChild(style);

    var btn = document.createElement('button');
    btn.className = 'btn-retour';
    btn.setAttribute('aria-label', 'Retour');
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>Retour';
    btn.addEventListener('click', function () {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            window.location.href = 'index.html';
        }
    });

    document.body.appendChild(btn);
});
