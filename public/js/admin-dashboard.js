const API_URL = '/api';
let token = localStorage.getItem('token');
let socket;
let currentUserId = null;
let currentDemandeId = null;

// Mémorise la dernière section consultée dans sessionStorage pour la restaurer après rechargement.
function sauvegarderSectionActive(section) {
    sessionStorage.setItem('adminActiveSection', section);
}

// Relit la section active depuis sessionStorage et l'affiche au chargement de la page.
function restaurerSectionActive() {
    const section = sessionStorage.getItem('adminActiveSection') || 'dashboard';
    afficherSection(section);
}

if (!token) {
    window.location.href = 'index.html';
}

// Initialise la connexion WebSocket de l'admin.
// Écoute les événements de nouvelles inscriptions et demandes pour rafraîchir les listes en temps réel.
function initWebSocket() {
    socket = io();
    
    socket.on('connect', () => {
        console.log('✅ WebSocket Admin connecté');
        socket.emit('authenticate', token);
    });

    socket.on('authenticated', (data) => {
        console.log('✅ WebSocket authentifié:', data);
    });

    socket.on('new_registration', (data) => {
        console.log('📨 Nouvelle inscription:', data);
        chargerStats();
        chargerInscriptions();
    });

    socket.on('new_request', (data) => {
        console.log('📨 Nouvelle demande:', data);
        chargerStats();
        chargerDemandes();
    });
}

// Charge les statistiques du tableau de bord admin (inscriptions en attente, demandes, utilisateurs actifs, cartes).
async function chargerStats() {
    try {
        const response = await fetch(`${API_URL}/admin/statistiques`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        if (data.succes) {
            document.getElementById('statInscriptions').textContent = data.stats.inscriptions_attente;
            document.getElementById('statDemandes').textContent = data.stats.demandes_attente;
            document.getElementById('statUtilisateurs').textContent = data.stats.utilisateurs_actifs;
            document.getElementById('statCartes').textContent = data.stats.cartes_actives;

            const inscriptionsBadge = document.getElementById('inscriptionsBadge');
            const demandesBadge = document.getElementById('demandesBadge');

            if (data.stats.inscriptions_attente > 0) {
                inscriptionsBadge.textContent = data.stats.inscriptions_attente;
                inscriptionsBadge.style.display = 'inline-block';
            } else {
                inscriptionsBadge.style.display = 'none';
            }

            if (data.stats.demandes_attente > 0) {
                demandesBadge.textContent = data.stats.demandes_attente;
                demandesBadge.style.display = 'inline-block';
            } else {
                demandesBadge.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Erreur chargement stats:', error);
    }
}

// Charge et affiche la liste des inscriptions en attente d'approbation dans le tableau HTML.
async function chargerInscriptions() {
    try {
        const response = await fetch(`${API_URL}/admin/inscriptions`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        const tbody = document.querySelector('#inscriptionsTable tbody');
        const emptyState = document.getElementById('inscriptionsEmpty');

        if (data.succes && data.inscriptions.length > 0) {
            tbody.innerHTML = '';
            emptyState.style.display = 'none';
            document.getElementById('inscriptionsTable').style.display = 'table';

            data.inscriptions.forEach(user => {
                const tr = document.createElement('tr');
                
                const dateNaissance = new Date(user.date_naissance);
                const dateNaissanceFormatee = dateNaissance.toLocaleDateString('fr-CA');

                const dateInscription = new Date(user.date_inscription);
                const dateInscriptionFormatee = dateInscription.toLocaleDateString('fr-CA', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });

                const statusBadges = {
                    'student': { class: 'badge-student', label: 'Étudiant' },
                    'employee': { class: 'badge-employee', label: 'Employé' },
                    'professional': { class: 'badge-professional', label: 'Professionnel' },
                    'retired': { class: 'badge-employee', label: 'Retraité' }
                };

                const statusInfo = statusBadges[user.statut_professionnel] || { class: 'badge-employee', label: user.statut_professionnel };

                tr.innerHTML = `
                    <td><strong>${user.prenom} ${user.nom}</strong></td>
                    <td>${user.email}</td>
                    <td>${dateNaissanceFormatee}</td>
                    <td><span class="badge ${statusInfo.class}">${statusInfo.label}</span></td>
                    <td>${formatMontant(user.revenu_annuel)}</td>
                    <td>${dateInscriptionFormatee}</td>
                    <td>
                        <button class="btn btn-approve" onclick="approuverInscription(${user.id}, '${(user.prenom + ' ' + user.nom).replace(/'/g, "\\'")}')">
                            Approuver
                        </button>
                        <button class="btn btn-reject" onclick="rejeterInscription(${user.id}, '${(user.prenom + ' ' + user.nom).replace(/'/g, "\\'")}')">
                            Rejeter
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        } else {
            document.getElementById('inscriptionsTable').style.display = 'none';
            emptyState.style.display = 'block';
        }
    } catch (error) {
        console.error('Erreur chargement inscriptions:', error);
    }
}

// Ouvre la modale de confirmation pour approuver l'inscription d'un utilisateur.
function approuverInscription(userId, userName) {
    currentUserId = userId;
    document.getElementById('approveUserName').textContent = `Êtes-vous sûr de vouloir approuver l'inscription de ${userName} ?`;
    openModal('approveModal');
}

// Confirme l'approbation de l'inscription : envoie la requête à l'API et rafraîchit les données.
async function confirmApprove() {
    try {
        const response = await fetch(`${API_URL}/admin/inscriptions/${currentUserId}/approuver`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (data.succes) {
            closeModal('approveModal');
            showToast('✅ Inscription approuvée avec succès !');
            chargerStats();
            chargerInscriptions();
            chargerUtilisateurs();
        } else {
            showToast('❌ Erreur: ' + data.message);
        }
    } catch (error) {
        console.error('Erreur approbation:', error);
        showToast('❌ Erreur lors de l\'approbation');
    }
}

// Ouvre la modale de rejet d'inscription avec le nom de l'utilisateur à rejeter.
function rejeterInscription(userId, userName) {
    currentUserId = userId;
    document.getElementById('rejectUserName').textContent = `Rejeter l'inscription de ${userName}`;
    document.getElementById('rejectReason').value = '';
    openModal('rejectModal');
}

document.getElementById('rejectForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const raison = document.getElementById('rejectReason').value.trim();

    if (!raison) {
        showToast('⚠️ Veuillez indiquer la raison du rejet');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/admin/inscriptions/${currentUserId}/rejeter`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ raison })
        });

        const data = await response.json();

        if (data.succes) {
            closeModal('rejectModal');
            showToast('✅ Inscription rejetée');
            chargerStats();
            chargerInscriptions();
            chargerUtilisateurs();
        } else {
            showToast('❌ Erreur: ' + data.message);
        }
    } catch (error) {
        console.error('Erreur rejet:', error);
        showToast('❌ Erreur lors du rejet');
    }
});

const LIMITES_CREDIT_STATUT = { student: 1000, employee: 5000, professional: 10000, retired: 3000 };
const STATUT_LABELS_FR = { student: 'Étudiant(e)', employee: 'Employé(e)', professional: 'Professionnel(le)', retired: 'Retraité(e)' };

let currentReviewDemande = null; // demande en cours de révision

function formatMontantFR(n) {
    if (!n) return '—';
    return parseFloat(n).toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' });
}

function estNonConforme(demande) {
    if (demande.type_demande !== 'credit_card' || !demande.limite_demandee) return false;
    const limiteStatut = LIMITES_CREDIT_STATUT[demande.statut_utilisateur];
    return limiteStatut != null && parseFloat(demande.limite_demandee) > limiteStatut;
}

// Charge et affiche la liste des demandes de services (comptes, cartes, prêts) en attente d'approbation.
async function chargerDemandes() {
    try {
        const response = await fetch(`${API_URL}/admin/demandes`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        const tbody = document.querySelector('#demandesTable tbody');
        const emptyState = document.getElementById('demandesEmpty');

        if (data.succes && data.demandes.length > 0) {
            tbody.innerHTML = '';
            emptyState.style.display = 'none';
            document.getElementById('demandesTable').style.display = 'table';

            data.demandes.forEach(demande => {
                const tr = document.createElement('tr');

                const typeLabels = {
                    'account_opening': 'Ouverture de compte',
                    'credit_card': 'Carte de crédit',
                    'loan': 'Prêt personnel',
                    'mortgage': 'Prêt hypothécaire',
                    'investment': 'Compte de placement'
                };

                const typeLabel = typeLabels[demande.type_demande] || demande.type_demande;

                let details = '';
                if (demande.type_compte) {
                    details = `Compte ${demande.type_compte === 'savings' ? 'épargne' : 'investissement'}`;
                } else if (demande.type_carte) {
                    details = `Carte ${demande.type_carte}`;
                    if (demande.limite_demandee) {
                        details += ` (${formatMontant(demande.limite_demandee)})`;
                    }
                }

                const dateDemande = new Date(demande.date_demande).toLocaleDateString('fr-CA', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });

                const nonConforme = estNonConforme(demande);
                const badgeAlerte = nonConforme
                    ? `<span title="Limite dépasse le seuil du statut ${STATUT_LABELS_FR[demande.statut_utilisateur] || ''}" style="display:inline-block;background:#fef3c7;color:#92400e;border:1px solid #f59e0b;border-radius:12px;padding:2px 8px;font-size:11px;font-weight:700;margin-left:6px;">⚠️ Non conforme</span>`
                    : '';

                tr.innerHTML = `
                    <td><strong>${demande.prenom} ${demande.nom}</strong><br><small style="color: #6b7280;">${demande.email}</small></td>
                    <td>${typeLabel}${badgeAlerte}</td>
                    <td>${details}</td>
                    <td>${formatMontant(demande.revenu_annuel)}</td>
                    <td>${dateDemande}</td>
                    <td>
                        <button class="btn btn-approve" style="background:linear-gradient(135deg,#667eea,#764ba2);color:white;" onclick="ouvrirRevueDemande(${demande.id})">
                            🔍 Réviser
                        </button>
                    </td>
                `;
                tr.dataset.demande = JSON.stringify(demande);
                tbody.appendChild(tr);
            });
        } else {
            document.getElementById('demandesTable').style.display = 'none';
            emptyState.style.display = 'block';
        }
    } catch (error) {
        console.error('Erreur chargement demandes:', error);
    }
}

// Ouvre le modal de révision complet pour une demande.
function ouvrirRevueDemande(demandeId) {
    // Récupérer la demande depuis le dataset de la ligne du tableau
    const tr = document.querySelector(`tr[data-demande]`
        + ` button[onclick="ouvrirRevueDemande(${demandeId})"]`);
    let demande = null;
    document.querySelectorAll('tr[data-demande]').forEach(row => {
        try {
            const d = JSON.parse(row.dataset.demande);
            if (d.id === demandeId) demande = d;
        } catch(e) {}
    });
    if (!demande) return;

    currentReviewDemande = demande;

    const typeLabels = { account_opening: 'Ouverture de compte', credit_card: 'Carte de crédit', loan: 'Prêt personnel', mortgage: 'Prêt hypothécaire', investment: 'Compte de placement' };
    const typeLabel = typeLabels[demande.type_demande] || demande.type_demande;
    const nonConforme = estNonConforme(demande);
    const limiteStatut = LIMITES_CREDIT_STATUT[demande.statut_utilisateur];

    // Icône et titre
    document.getElementById('reviewDemandeIcon').textContent = nonConforme ? '⚠️' : '📋';
    document.getElementById('reviewDemandeTitre').textContent = `Révision — ${typeLabel} — ${demande.prenom} ${demande.nom}`;

    // Alerte non-conformité
    const alertBox = document.getElementById('reviewDemandeAlerte');
    if (nonConforme) {
        document.getElementById('reviewDemandeAlerteMsg').textContent =
            `Le statut ${STATUT_LABELS_FR[demande.statut_utilisateur] || demande.statut_utilisateur} autorise une limite maximale de ${formatMontantFR(limiteStatut)}. ` +
            `La limite demandée est de ${formatMontantFR(demande.limite_demandee)}, ce qui dépasse le seuil de ${formatMontantFR(parseFloat(demande.limite_demandee) - limiteStatut)}.`;
        alertBox.style.display = 'block';
    } else {
        alertBox.style.display = 'none';
    }

    // Info client
    document.getElementById('rdNom').textContent = `${demande.prenom} ${demande.nom}`;
    document.getElementById('rdEmail').textContent = demande.email;
    document.getElementById('rdStatut').textContent = STATUT_LABELS_FR[demande.statut_utilisateur] || demande.statut_utilisateur || '—';
    document.getElementById('rdRevenu').textContent = formatMontantFR(demande.revenu_annuel);

    // Info demande
    document.getElementById('rdType').textContent = typeLabel;

    const limiteDemandeeRow = document.getElementById('rdLimiteDemandeeRow');
    const limiteStatutRow = document.getElementById('rdLimiteStatutRow');
    const montantRow = document.getElementById('rdMontantRow');

    if (demande.limite_demandee) {
        document.getElementById('rdLimiteDemandee').textContent = formatMontantFR(demande.limite_demandee);
        limiteDemandeeRow.style.display = '';
        limiteStatutRow.style.display = limiteStatut ? '' : 'none';
        if (limiteStatut) document.getElementById('rdLimiteStatut').textContent = formatMontantFR(limiteStatut);
        montantRow.style.display = 'none';
    } else if (demande.montant_demande) {
        document.getElementById('rdMontant').textContent = formatMontantFR(demande.montant_demande);
        montantRow.style.display = '';
        limiteDemandeeRow.style.display = 'none';
        limiteStatutRow.style.display = 'none';
    } else {
        limiteDemandeeRow.style.display = 'none';
        limiteStatutRow.style.display = 'none';
        montantRow.style.display = 'none';
    }

    document.getElementById('rdJustification').textContent = demande.justification || 'Aucune justification fournie.';
    document.getElementById('reviewDemandeComment').value = '';

    openModal('reviewDemandeModal');
}

// Soumet l'approbation depuis le modal de révision.
async function soumettreApprobationDepuisRevue() {
    if (!currentReviewDemande) return;
    const commentaire = document.getElementById('reviewDemandeComment').value.trim();

    const response = await fetch(`${API_URL}/admin/demandes/${currentReviewDemande.id}/approuver`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentaire, forceApprove: false })
    });
    const data = await response.json();

    if (data.succes) {
        closeModal('reviewDemandeModal');
        showToast('✅ Demande approuvée avec succès !');
        chargerStats();
        chargerDemandes();
        return;
    }

    if (data.warning) {
        // Demande confirmation admin avec "Approuver quand même"
        const ok = await showConfirm(
            data.message,
            { title: `⚠️ Limite non conforme — ${data.prenom} ${data.nom}`, type: 'warning', confirmText: 'Approuver quand même', cancelText: 'Annuler' }
        );
        if (!ok) return;

        // Renvoyer avec forceApprove
        const res2 = await fetch(`${API_URL}/admin/demandes/${currentReviewDemande.id}/approuver`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ commentaire, forceApprove: true })
        });
        const data2 = await res2.json();
        if (data2.succes) {
            closeModal('reviewDemandeModal');
            showToast('✅ Demande approuvée (limite non conforme acceptée).');
            chargerStats();
            chargerDemandes();
        } else {
            showToast('❌ ' + data2.message);
        }
        return;
    }

    showToast('❌ ' + data.message);
}

// Ouvre le modal de raison de rejet depuis la revue.
function soumettreRejetDepuisRevue() {
    if (!currentReviewDemande) return;
    document.getElementById('rejectReasonTitre').textContent = `Rejeter — ${currentReviewDemande.prenom} ${currentReviewDemande.nom}`;
    document.getElementById('rejectReasonText').value = '';
    closeModal('reviewDemandeModal');
    openModal('rejectReasonModal');
}

// Confirme le rejet depuis le modal de raison.
async function confirmerRejetDepuisRevue() {
    const raison = document.getElementById('rejectReasonText').value.trim();
    if (!raison) { showToast('⚠️ Veuillez indiquer la raison du rejet'); return; }

    const response = await fetch(`${API_URL}/admin/demandes/${currentReviewDemande.id}/rejeter`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ raison })
    });
    const data = await response.json();
    if (data.succes) {
        closeModal('rejectReasonModal');
        showToast('✅ Demande rejetée.');
        chargerStats();
        chargerDemandes();
    } else {
        showToast('❌ ' + data.message);
    }
}

// Ouvre la modale de confirmation pour approuver une demande de service, avec le nom du demandeur et le type.
function approuverDemande(demandeId, userName, typeLabel) {
    currentDemandeId = demandeId;
    document.getElementById('approveDemandeInfo').textContent = `Demande de ${userName} - ${typeLabel}`;
    document.getElementById('approveDemandeComment').value = '';
    openModal('approveDemandeModal');
}

document.getElementById('approveDemandeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const commentaire = document.getElementById('approveDemandeComment').value.trim();

    try {
        const response = await fetch(`${API_URL}/admin/demandes/${currentDemandeId}/approuver`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ commentaire })
        });

        const data = await response.json();

        if (data.succes) {
            closeModal('approveDemandeModal');
            showToast('✅ Demande approuvée avec succès !');
            chargerStats();
            chargerDemandes();
        } else {
            showToast('❌ Erreur: ' + data.message);
        }
    } catch (error) {
        console.error('Erreur approbation demande:', error);
        showToast('❌ Erreur lors de l\'approbation');
    }
});

// Ouvre la modale de rejet d'une demande de service pour saisir une raison avant de confirmer.
function rejeterDemande(demandeId, userName, typeLabel) {
    currentDemandeId = demandeId;
    document.getElementById('rejectDemandeInfo').textContent = `Demande de ${userName} - ${typeLabel}`;
    document.getElementById('rejectDemandeReason').value = '';
    openModal('rejectDemandeModal');
}

document.getElementById('rejectDemandeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const raison = document.getElementById('rejectDemandeReason').value.trim();

    if (!raison) {
        showToast('⚠️ Veuillez indiquer la raison du rejet');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/admin/demandes/${currentDemandeId}/rejeter`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ raison })
        });

        const data = await response.json();

        if (data.succes) {
            closeModal('rejectDemandeModal');
            showToast('✅ Demande rejetée');
            chargerStats();
            chargerDemandes();
        } else {
            showToast('❌ Erreur: ' + data.message);
        }
    } catch (error) {
        console.error('Erreur rejet demande:', error);
        showToast('❌ Erreur lors du rejet');
    }
});

// Charge et affiche la liste de tous les utilisateurs avec leur statut et les boutons bloquer/débloquer.
async function chargerUtilisateurs() {
    try {
        const response = await fetch(`${API_URL}/admin/utilisateurs`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        const tbody = document.querySelector('#utilisateursTable tbody');

        if (data.succes && data.utilisateurs.length > 0) {
            tbody.innerHTML = '';

            data.utilisateurs.forEach(user => {
                const tr = document.createElement('tr');

                const statusBadges = {
                    'pending': { class: 'badge-pending', label: 'En attente' },
                    'active': { class: 'badge-approved', label: 'Actif' },
                    'suspended': { class: 'badge-rejected', label: 'Suspendu' },
                    'rejected': { class: 'badge-rejected', label: 'Rejeté' }
                };

                const statusInfo = statusBadges[user.statut_compte] || { class: 'badge-pending', label: user.statut_compte };

                const dateCreation = new Date(user.date_creation).toLocaleDateString('fr-CA', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });

                const dateApprobation = user.date_approbation 
                    ? new Date(user.date_approbation).toLocaleDateString('fr-CA', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    })
                    : '-';

                tr.innerHTML = `
                    <td><strong>${user.prenom} ${user.nom}</strong></td>
                    <td>${user.email}</td>
                    <td><span class="badge ${statusInfo.class}">${statusInfo.label}</span></td>
                    <td>${user.revenu_annuel ? formatMontant(user.revenu_annuel) : 'N/A'}</td>
                    <td>${dateCreation}</td>
                    <td>${dateApprobation}</td>
                    <td style="display:flex; gap:6px; flex-wrap:wrap;">
                        ${user.statut_compte === 'suspended'
                            ? `<button class="btn btn-unblock" onclick="debloquerUtilisateur(${user.id}, '${user.prenom} ${user.nom}')">🔓 Débloquer</button>`
                            : user.statut_compte === 'active'
                            ? `<button class="btn btn-block" onclick="bloquerUtilisateur(${user.id}, '${user.prenom} ${user.nom}')">🔒 Bloquer</button>`
                            : ''
                        }
                        <button style="background:#fee2e2;color:#991b1b;border:none;padding:6px 12px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600;" onclick="supprimerUtilisateur(${user.id}, '${user.prenom} ${user.nom}', '${user.email}')">🗑️ Supprimer</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: #9ca3af;">Aucun utilisateur</td></tr>';
        }
    } catch (error) {
        console.error('Erreur chargement utilisateurs:', error);
    }
}

// Demande une raison via un prompt et bloque le compte de l'utilisateur via l'API admin.
async function bloquerUtilisateur(userId, userName) {
    const raison = await showPrompt('Raison du blocage :', {
        title: `Bloquer le compte de ${userName}`,
        confirmText: 'Bloquer',
        placeholder: 'Ex: Activité suspecte, violation des CGU…'
    });

    if (!raison || raison.trim().length < 2) {
        if (raison !== null) showToast('⚠️ Raison requise (minimum 2 caractères)');
        return;
    }

    fetch(`${API_URL}/admin/utilisateurs/${userId}/bloquer`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ raison: raison.trim() })
    })
    .then(res => res.json())
    .then(data => {
        if (data.succes) {
            showToast('✅ Compte bloqué avec succès !');
            chargerUtilisateurs();
            chargerStats();
        } else {
            showToast('❌ Erreur: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Erreur:', error);
        showToast('❌ Erreur lors du blocage');
    });
}

// Demande une confirmation et réactive le compte suspendu de l'utilisateur via l'API admin.
async function debloquerUtilisateur(userId, userName) {
    const ok = await showConfirm(`Débloquer le compte de <strong>${userName}</strong> ?`, {
        title: 'Débloquer le compte',
        confirmText: 'Débloquer'
    });
    if (!ok) return;

    fetch(`${API_URL}/admin/utilisateurs/${userId}/debloquer`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(res => res.json())
    .then(data => {
        if (data.succes) {
            showToast('✅ Compte débloqué avec succès !');
            chargerUtilisateurs();
            chargerStats();
        } else {
            showToast('❌ Erreur: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Erreur:', error);
        showToast('❌ Erreur lors du déblocage');
    });
}

function formatMontant(montant) {
    if (!montant) return 'N/A';
    return new Intl.NumberFormat('fr-CA', {
        style: 'currency',
        currency: 'CAD'
    }).format(montant);
}

// Affiche la section demandée (dashboard, inscriptions, demandes, utilisateurs) et masque les autres.
// Met à jour les classes actives dans la navigation et charge les données correspondantes.
function afficherSection(section) {
    document.getElementById('sectionDashboard').style.display = 'none';
    document.getElementById('sectionInscriptions').style.display = 'none';
    document.getElementById('sectionDemandes').style.display = 'none';
    document.getElementById('sectionUtilisateurs').style.display = 'none';

    document.getElementById('navDashboard').classList.remove('active');
    document.getElementById('navInscriptions').classList.remove('active');
    document.getElementById('navDemandes').classList.remove('active');
    document.getElementById('navUtilisateurs').classList.remove('active');

    // Sauvegarder la section active
    sauvegarderSectionActive(section);

    if (section === 'dashboard') {
        document.getElementById('sectionDashboard').style.display = 'block';
        document.getElementById('navDashboard').classList.add('active');
    } else if (section === 'inscriptions') {
        document.getElementById('sectionInscriptions').style.display = 'block';
        document.getElementById('navInscriptions').classList.add('active');
        chargerInscriptions();
    } else if (section === 'demandes') {
        document.getElementById('sectionDemandes').style.display = 'block';
        document.getElementById('navDemandes').classList.add('active');
        chargerDemandes();
    } else if (section === 'utilisateurs') {
        document.getElementById('sectionUtilisateurs').style.display = 'block';
        document.getElementById('navUtilisateurs').classList.add('active');
        chargerUtilisateurs();
    }
}

async function supprimerUtilisateur(userId, userName, email) {
    const ok = await showConfirm(
        `Supprimer définitivement le compte de <strong>${userName}</strong> (${email}) ?<br><br>` +
        `Toutes ses données seront effacées (comptes, transactions, cartes, demandes).<br>` +
        `<strong>Cette action est irréversible.</strong>`,
        { title: 'Supprimer le compte', type: 'danger', confirmText: 'Supprimer' }
    );
    if (!ok) return;
    try {
        const res = await fetch(`${API_URL}/admin/utilisateurs/${userId}`, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();
        showToast(data.message, data.succes ? 'success' : 'error');
        if (data.succes) chargerUtilisateurs();
    } catch (e) {
        showToast('Erreur lors de la suppression.', 'error');
    }
}

function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

async function deconnexion() {
    const ok = await showConfirm('Voulez-vous vraiment vous déconnecter ?', {
        title: 'Déconnexion',
        confirmText: 'Se déconnecter',
        cancelText: 'Rester connecté'
    });
    if (!ok) return;
    localStorage.removeItem('token');
    if (socket) socket.disconnect();
    window.location.href = 'index.html';
}

document.addEventListener('DOMContentLoaded', function() {
    initWebSocket();
    chargerStats();
    restaurerSectionActive(); // Restaurer la section active
});
// ==============================
// GESTION DES TRANSACTIONS
// ==============================

function switchTabTx(tab) {
    const pending = document.getElementById('tabContentPending');
    const all = document.getElementById('tabContentAll');
    const btnPending = document.getElementById('tabPending');
    const btnAll = document.getElementById('tabAll');
    if (tab === 'pending') {
        pending.style.display = 'block';
        all.style.display = 'none';
        btnPending.style.background = '#667eea';
        btnPending.style.color = 'white';
        btnPending.style.border = 'none';
        btnAll.style.background = 'white';
        btnAll.style.color = '#374151';
        btnAll.style.border = '2px solid #e5e7eb';
    } else {
        pending.style.display = 'none';
        all.style.display = 'block';
        btnAll.style.background = '#667eea';
        btnAll.style.color = 'white';
        btnAll.style.border = 'none';
        btnPending.style.background = 'white';
        btnPending.style.color = '#374151';
        btnPending.style.border = '2px solid #e5e7eb';
        chargerToutesTransactions();
    }
}

async function chargerToutesTransactions() {
    const container = document.getElementById('toutesTransactionsContainer');
    const recherche = document.getElementById('txRecherche').value;
    const statut = document.getElementById('txStatut').value;
    const type = document.getElementById('txType').value;

    let url = `${API_URL}/admin/transactions?limite=200`;
    if (recherche) url += `&recherche=${encodeURIComponent(recherche)}`;
    if (statut) url += `&statut=${statut}`;
    if (type) url += `&type=${type}`;

    container.innerHTML = '<p style="color:#9ca3af;text-align:center;padding:30px;">Chargement...</p>';
    try {
        const res = await fetch(url, { headers: { 'Authorization': 'Bearer ' + token } });
        const data = await res.json();
        if (!data.succes || data.transactions.length === 0) {
            container.innerHTML = '<p style="color:#9ca3af;text-align:center;padding:30px;">Aucune transaction trouvée.</p>';
            return;
        }
        const typesLabels = { deposit:'Dépôt', withdrawal:'Retrait', transfer:'Virement', payment:'Paiement', fee:'Frais' };
        const statutColors = { completed:'#d1fae5', pending:'#fef3c7', failed:'#fee2e2', cancelled:'#f3f4f6' };
        const statutTextColors = { completed:'#065f46', pending:'#92400e', failed:'#991b1b', cancelled:'#6b7280' };
        const rows = data.transactions.map(t => `
            <tr style="border-bottom:1px solid #f3f4f6;">
                <td style="padding:12px 8px; font-weight:600; color:#374151;">#${t.id}</td>
                <td style="padding:12px 8px;">${t.prenom} ${t.nom}<br><span style="font-size:12px;color:#9ca3af;">${t.email}</span></td>
                <td style="padding:12px 8px; font-size:13px; color:#6b7280;">${t.numero_compte}</td>
                <td style="padding:12px 8px;">${typesLabels[t.type] || t.type}</td>
                <td style="padding:12px 8px; font-weight:700; color:${t.type==='deposit'||t.type==='transfer'?'#059669':'#dc2626'};">
                    ${t.type==='deposit'||t.type==='transfer'?'+':'-'}${parseFloat(t.montant).toFixed(2)} $
                </td>
                <td style="padding:12px 8px;">
                    <span style="background:${statutColors[t.statut]||'#f3f4f6'};color:${statutTextColors[t.statut]||'#374151'};padding:4px 10px;border-radius:20px;font-size:12px;font-weight:600;">
                        ${t.statut}
                    </span>
                </td>
                <td style="padding:12px 8px; font-size:12px; color:#9ca3af;">${new Date(t.date).toLocaleString('fr-CA')}</td>
                <td style="padding:12px 8px;">
                    ${t.statut !== 'cancelled' && t.statut !== 'pending' ? `
                    <button onclick="annulerTransaction(${t.id})" style="background:#fee2e2;color:#991b1b;border:none;padding:6px 12px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600;">
                        Annuler
                    </button>` : '<span style="color:#d1d5db;font-size:12px;">—</span>'}
                </td>
            </tr>`).join('');
        container.innerHTML = `
            <div style="overflow-x:auto;">
                <table style="width:100%;border-collapse:collapse;font-size:14px;">
                    <thead>
                        <tr style="background:#f9fafb;text-align:left;">
                            <th style="padding:12px 8px;color:#6b7280;font-weight:600;">ID</th>
                            <th style="padding:12px 8px;color:#6b7280;font-weight:600;">Utilisateur</th>
                            <th style="padding:12px 8px;color:#6b7280;font-weight:600;">Compte</th>
                            <th style="padding:12px 8px;color:#6b7280;font-weight:600;">Type</th>
                            <th style="padding:12px 8px;color:#6b7280;font-weight:600;">Montant</th>
                            <th style="padding:12px 8px;color:#6b7280;font-weight:600;">Statut</th>
                            <th style="padding:12px 8px;color:#6b7280;font-weight:600;">Date</th>
                            <th style="padding:12px 8px;color:#6b7280;font-weight:600;">Action</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
            <p style="color:#9ca3af;font-size:12px;margin-top:12px;text-align:right;">${data.transactions.length} transaction(s) affichée(s)</p>`;
    } catch(e) {
        container.innerHTML = '<p style="color:#dc2626;text-align:center;padding:30px;">Erreur lors du chargement.</p>';
    }
}

async function annulerTransaction(id) {
    const ok = await showConfirm(
        `Le solde du compte sera corrigé automatiquement.`,
        { title: `Annuler la transaction #${id} ?`, type: 'warning', confirmText: 'Oui, annuler', cancelText: 'Non' }
    );
    if (!ok) return;
    try {
        const res = await fetch(`${API_URL}/admin/transactions/${id}/annuler`, {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();
        showToast(data.message, data.succes ? 'success' : 'error');
        if (data.succes) chargerToutesTransactions();
    } catch(e) {
        showToast('Erreur lors de l\'annulation.', 'error');
    }
}
