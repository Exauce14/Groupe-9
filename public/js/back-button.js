// Bouton retour automatique sur toutes les pages
document.addEventListener('DOMContentLoaded', function () {
    var pagesExclues = ['index.html', 'inscription.html', 'inscription-wizard.html', '/', ''];
    var page = window.location.pathname.split('/').pop();
    if (pagesExclues.includes(page)) return;

    var style = document.createElement('style');
    style.textContent = [
        '.btn-retour {',
        '    display: inline-flex;',
        '    align-items: center;',
        '    gap: 6px;',
        '    background: #f0f4ff;',
        '    color: #4f46e5;',
        '    border: 1.5px solid #c7d2fe;',
        '    border-radius: 8px;',
        '    padding: 7px 14px;',
        '    font-size: 13px;',
        '    font-weight: 600;',
        '    cursor: pointer;',
        '    box-shadow: 0 1px 3px rgba(79,70,229,0.08);',
        '    transition: background 0.15s, box-shadow 0.15s;',
        '    font-family: inherit;',
        '    margin: 16px 0 4px 0;',
        '}',
        '.btn-retour:hover {',
        '    background: #e0e7ff;',
        '    box-shadow: 0 2px 8px rgba(79,70,229,0.15);',
        '}',
        '.btn-retour svg {',
        '    width: 15px;',
        '    height: 15px;',
        '    flex-shrink: 0;',
        '}',
        '.btn-retour-wrapper {',
        '    padding: 0 40px;',
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

    // Insérer juste après la navbar, dans le container ou directement dans le body
    var navbar = document.querySelector('nav, .navbar, header');
    if (navbar && navbar.nextElementSibling) {
        var wrapper = document.createElement('div');
        wrapper.className = 'btn-retour-wrapper';
        wrapper.appendChild(btn);
        navbar.parentNode.insertBefore(wrapper, navbar.nextElementSibling);
    } else {
        // Fallback : premier enfant du body après la nav
        var container = document.querySelector('.container, main, .content, .main-content');
        if (container) {
            container.insertBefore(btn, container.firstChild);
        } else {
            document.body.insertBefore(btn, document.body.firstChild);
        }
    }
});
