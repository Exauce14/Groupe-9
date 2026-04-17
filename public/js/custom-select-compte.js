// Composant dropdown personnalisé pour la sélection de comptes bancaires
// Format affiché : [Nom du compte]     [Solde] ▼
//                  [Numéro de compte]

// Crée un dropdown personnalisé pour afficher et sélectionner un compte bancaire.
// containerId : ID du div conteneur ; comptes : tableau de comptes ; labels : noms d'affichage par type ;
// onChangeFn : callback appelé avec le compte sélectionné.
function creerSelectCompte(containerId, comptes, labels, onChangeFn) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container._selectedId   = null;
    container._selectedType = null;
    container._selectedSolde = null;

    // Formate un montant en dollars canadiens, en utilisant formatMontant() si disponible globalement.
    function fmt(n) {
        return typeof formatMontant === 'function'
            ? formatMontant(n)
            : new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(n);
    }

    // Génère le HTML du bouton déclencheur selon le compte sélectionné (ou texte placeholder si null).
    function triggerHtml(compte) {
        if (!compte) {
            return `<span class="csc-placeholder">-- Sélectionner un compte --</span>
                    <span class="csc-chevron">&#9660;</span>`;
        }
        return `<div class="csc-info">
                    <div class="csc-name">${labels[compte.type_compte] || compte.type_compte}</div>
                    <div class="csc-num">${compte.numero_compte}</div>
                </div>
                <div class="csc-right">
                    <span class="csc-balance">${fmt(compte.solde)}</span>
                    <span class="csc-chevron">&#9660;</span>
                </div>`;
    }

    container.innerHTML = `
        <div class="csc-trigger">${triggerHtml(null)}</div>
        <div class="csc-dropdown">
            ${comptes.length === 0
                ? '<div class="csc-empty">Aucun compte disponible</div>'
                : comptes.map(c => `
                    <div class="csc-option"
                         data-id="${c.id}"
                         data-type="${c.type_compte}"
                         data-solde="${c.solde}">
                        <div class="csc-info">
                            <div class="csc-name">${labels[c.type_compte] || c.type_compte}</div>
                            <div class="csc-num">${c.numero_compte}</div>
                        </div>
                        <span class="csc-balance">${fmt(c.solde)}</span>
                    </div>`).join('')
            }
        </div>`;

    const trigger  = container.querySelector('.csc-trigger');
    const dropdown = container.querySelector('.csc-dropdown');

    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const wasOpen = container.classList.contains('csc-open');
        document.querySelectorAll('.custom-select-compte.csc-open')
                .forEach(el => el.classList.remove('csc-open'));
        if (!wasOpen) container.classList.add('csc-open');
    });

    dropdown.querySelectorAll('.csc-option').forEach(opt => {
        opt.addEventListener('click', (e) => {
            e.stopPropagation();
            const id     = parseInt(opt.dataset.id);
            const compte = comptes.find(c => c.id === id);
            if (!compte) return;

            container._selectedId    = compte.id;
            container._selectedType  = compte.type_compte;
            container._selectedSolde = parseFloat(compte.solde);

            trigger.innerHTML = triggerHtml(compte);
            container.classList.remove('csc-open');

            if (onChangeFn) onChangeFn(compte);
        });
    });
}

// Fermer les dropdowns au clic extérieur
document.addEventListener('click', () => {
    document.querySelectorAll('.custom-select-compte.csc-open')
            .forEach(el => el.classList.remove('csc-open'));
});
