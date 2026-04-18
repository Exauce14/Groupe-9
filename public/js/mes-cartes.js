const API_URL = '/api';
let token = localStorage.getItem('token');
let carteActuelle = null;

// Vérifier l'authentification
if (!token) {
    window.location.href = 'index.html';
}

// Charger les cartes de l'utilisateur
async function chargerCartes() {
    try {
        const response = await fetch(`${API_URL}/cartes/mes-cartes`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        const grid = document.getElementById('cardsGrid');
        const emptyState = document.getElementById('emptyState');

        if (data.succes && data.cartes.length > 0) {
            grid.innerHTML = '';
            emptyState.style.display = 'none';

            // Décoder le token pour obtenir le nom de l'utilisateur
            const payload = JSON.parse(atob(token.split('.')[1]));
            const nomComplet = `${payload.prenom} ${payload.nom}`.toUpperCase();

            data.cartes.forEach(carte => {
                const div = document.createElement('div');

                // Formater le numéro de carte (masquer les chiffres du milieu)
                const numeroAffiche = carte.numero_carte.replace(/(\d{4})\s(\d{4})\s(\d{4})\s(\d{4})/, '$1 •••• •••• $4');

                // Formater la date d'expiration
                const dateExpiration = new Date(carte.date_expiration);
                const expirationFormatee = `${String(dateExpiration.getMonth() + 1).padStart(2, '0')}/${String(dateExpiration.getFullYear()).slice(-2)}`;

                // Type de carte
                const typeLabel = carte.type_carte === 'debit' ? 'CARTE DE DÉBIT' : 'CARTE DE CRÉDIT';

                // Badge statut
                const statusBadge = carte.statut === 'active' 
                    ? '<span class="badge badge-active">✓ Active</span>'
                    : '<span class="badge badge-blocked">🔒 Bloquée</span>';

                // Classe CSS selon le statut
                const cardClass = carte.statut === 'blocked' ? 'credit-card blocked' : 'credit-card';

                // Affichage spécial pour carte de crédit
                let detailsCredit = '';
                if (carte.type_carte === 'credit') {
                    const limiteCredit = parseFloat(carte.limite_credit || 0);
                    const creditDisponible = parseFloat(carte.credit_disponible || 0);
                    const soldeUtilise = parseFloat(carte.solde_utilise || 0);
                    
                    detailsCredit = `
                        <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255, 255, 255, 0.2);">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                <span style="font-size: 12px; opacity: 0.8;">Limite:</span>
                                <span style="font-size: 14px; font-weight: 600;">${formatMontant(limiteCredit)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                <span style="font-size: 12px; opacity: 0.8;">Disponible:</span>
                                <span style="font-size: 14px; font-weight: 600;">${formatMontant(creditDisponible)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span style="font-size: 12px; opacity: 0.8;">Utilisé:</span>
                                <span style="font-size: 14px; font-weight: 600;">${formatMontant(soldeUtilise)}</span>
                            </div>
                        </div>
                    `;
                }

                div.innerHTML = `
                    <div class="${cardClass}">
                        <div class="card-header">
                            <div>
                                <div class="card-type">${typeLabel}</div>
                                ${statusBadge}
                            </div>
                            <div class="card-chip">💳</div>
                        </div>

                        <div class="card-number">${numeroAffiche}</div>

                        <div class="card-footer">
                            <div>
                                <div class="card-holder">TITULAIRE</div>
                                <div class="card-holder-name">${nomComplet}</div>
                            </div>
                            <div class="card-expiry">
                                <div class="card-expiry-label">VALIDE JUSQU'AU</div>
                                <div class="card-expiry-date">${expirationFormatee}</div>
                            </div>
                        </div>

                        ${detailsCredit}
                    </div>

                    <div class="card-actions">
                        ${carte.statut === 'active' 
                            ? `<button class="btn btn-block" onclick="ouvrirModalBlocage(${carte.id}, '${numeroAffiche}')">🔒 Bloquer la carte</button>`
                            : `<button class="btn btn-unblock" onclick="ouvrirModalDeblocage(${carte.id}, '${numeroAffiche}')">🔓 Débloquer la carte</button>`
                        }
                    </div>
                `;

                grid.appendChild(div);
            });
        } else {
            grid.innerHTML = '';
            emptyState.style.display = 'block';
        }
    } catch (error) {
        console.error('Erreur chargement cartes:', error);
    }
}

// Ouvrir modal blocage
function ouvrirModalBlocage(carteId, numeroAffiche) {
    carteActuelle = carteId;
    document.getElementById('blocageInfo').textContent = `Carte : ${numeroAffiche}`;
    document.getElementById('raisonBlocage').value = '';
    document.getElementById('modalBloquer').classList.add('active');
}

// Soumettre le blocage
document.getElementById('formBloquer').addEventListener('submit', async function(e) {
    e.preventDefault();

    const raison = document.getElementById('raisonBlocage').value.trim();

    if (!raison) {
        showToast('⚠️ Veuillez indiquer la raison du blocage');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/cartes/${carteActuelle}/bloquer`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ raison })
        });

        const data = await response.json();

        if (data.succes) {
            fermerModal('modalBloquer');
            showToast('✅ Carte bloquée avec succès !');
            chargerCartes();
        } else {
            showToast('❌ Erreur: ' + data.message);
        }
    } catch (error) {
        console.error('Erreur blocage carte:', error);
        showToast('❌ Erreur lors du blocage de la carte');
    }
});

// Ouvrir modal déblocage
function ouvrirModalDeblocage(carteId, numeroAffiche) {
    carteActuelle = carteId;
    document.getElementById('deblocageInfo').textContent = `Carte : ${numeroAffiche}`;
    document.getElementById('modalDebloquer').classList.add('active');
}

// Confirmer le déblocage
async function confirmerDeblocage() {
    try {
        const response = await fetch(`${API_URL}/cartes/${carteActuelle}/debloquer`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        if (data.succes) {
            fermerModal('modalDebloquer');
            showToast('✅ Carte débloquée avec succès !');
            chargerCartes();
        } else {
            showToast('❌ Erreur: ' + data.message);
        }
    } catch (error) {
        console.error('Erreur déblocage carte:', error);
        showToast('❌ Erreur lors du déblocage de la carte');
    }
}

// Fermer modal
function fermerModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Formater un montant
function formatMontant(montant) {
    return new Intl.NumberFormat('fr-CA', {
        style: 'currency',
        currency: 'CAD'
    }).format(montant);
}

// Déconnexion
function deconnexion() {
    if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
        localStorage.removeItem('token');
        window.location.href = 'index.html';
    }
}

// Initialiser
document.addEventListener('DOMContentLoaded', chargerCartes);