const API_URL = 'http://localhost:3000/api';
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
    socket = io('http://localhost:3000');
    
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
                        <button class="btn btn-approve" onclick="approuverInscription(${user.id}, '${user.prenom} ${user.nom}')">
                            Approuver
                        </button>
                        <button class="btn btn-reject" onclick="rejeterInscription(${user.id}, '${user.prenom} ${user.nom}')">
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
            alert('✅ Inscription approuvée avec succès !');
            chargerStats();
            chargerInscriptions();
            chargerUtilisateurs();
        } else {
            alert('❌ Erreur: ' + data.message);
        }
    } catch (error) {
        console.error('Erreur approbation:', error);
        alert('❌ Erreur lors de l\'approbation');
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
        alert('⚠️ Veuillez indiquer la raison du rejet');
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
            alert('✅ Inscription rejetée');
            chargerStats();
            chargerInscriptions();
            chargerUtilisateurs();
        } else {
            alert('❌ Erreur: ' + data.message);
        }
    } catch (error) {
        console.error('Erreur rejet:', error);
        alert('❌ Erreur lors du rejet');
    }
});

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

                tr.innerHTML = `
                    <td><strong>${demande.prenom} ${demande.nom}</strong><br><small style="color: #6b7280;">${demande.email}</small></td>
                    <td>${typeLabel}</td>
                    <td>${details}</td>
                    <td>${formatMontant(demande.revenu_annuel)}</td>
                    <td>${dateDemande}</td>
                    <td>
                        <button class="btn btn-approve" onclick="approuverDemande(${demande.id}, '${demande.prenom} ${demande.nom}', '${typeLabel}')">
                            Approuver
                        </button>
                        <button class="btn btn-reject" onclick="rejeterDemande(${demande.id}, '${demande.prenom} ${demande.nom}', '${typeLabel}')">
                            Rejeter
                        </button>
                    </td>
                `;
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
            alert('✅ Demande approuvée avec succès !');
            chargerStats();
            chargerDemandes();
        } else {
            alert('❌ Erreur: ' + data.message);
        }
    } catch (error) {
        console.error('Erreur approbation demande:', error);
        alert('❌ Erreur lors de l\'approbation');
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
        alert('⚠️ Veuillez indiquer la raison du rejet');
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
            alert('✅ Demande rejetée');
            chargerStats();
            chargerDemandes();
        } else {
            alert('❌ Erreur: ' + data.message);
        }
    } catch (error) {
        console.error('Erreur rejet demande:', error);
        alert('❌ Erreur lors du rejet');
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
                    <td>
                        ${user.statut_compte === 'suspended' 
                            ? `<button class="btn btn-unblock" onclick="debloquerUtilisateur(${user.id}, '${user.prenom} ${user.nom}')">🔓 Débloquer</button>`
                            : user.statut_compte === 'active'
                            ? `<button class="btn btn-block" onclick="bloquerUtilisateur(${user.id}, '${user.prenom} ${user.nom}')">🔒 Bloquer</button>`
                            : '-'
                        }
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
function bloquerUtilisateur(userId, userName) {
    const raison = prompt(`Bloquer le compte de ${userName}.\n\nRaison du blocage :`);
    
    if (!raison || raison.trim().length < 2) {
        alert('⚠️ Raison requise (minimum 2 caractères)');
        return;
    }

    if (!confirm(`Confirmer le blocage du compte de ${userName} ?`)) {
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
            alert('✅ Compte bloqué avec succès !');
            chargerUtilisateurs();
            chargerStats();
        } else {
            alert('❌ Erreur: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Erreur:', error);
        alert('❌ Erreur lors du blocage');
    });
}

// Demande une confirmation et réactive le compte suspendu de l'utilisateur via l'API admin.
function debloquerUtilisateur(userId, userName) {
    if (!confirm(`Débloquer le compte de ${userName} ?`)) {
        return;
    }

    fetch(`${API_URL}/admin/utilisateurs/${userId}/debloquer`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(res => res.json())
    .then(data => {
        if (data.succes) {
            alert('✅ Compte débloqué avec succès !');
            chargerUtilisateurs();
            chargerStats();
        } else {
            alert('❌ Erreur: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Erreur:', error);
        alert('❌ Erreur lors du déblocage');
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

function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function deconnexion() {
    if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
        localStorage.removeItem('token');
        if (socket) {
            socket.disconnect();
        }
        window.location.href = 'index.html';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    initWebSocket();
    chargerStats();
    restaurerSectionActive(); // Restaurer la section active
});