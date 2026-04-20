const API_URL = '/api';
let token = localStorage.getItem('token');
let utilisateurInfo = null;
let demandesExistantes = [];
let comptesExistants = [];
let cartesExistantes = [];
let profilUtilisateur = null;

const LIMITES_CREDIT_STATUT = { student: 1000, employee: 5000, professional: 10000, retired: 3000 };
const STATUT_LABELS = { student: 'étudiant(e)', employee: 'employé(e)', professional: 'professionnel(le)', retired: 'retraité(e)' };

// Vérifier l'authentification
if (!token) {
    window.location.href = 'index.html';
}

// Décoder le token
try {
    utilisateurInfo = JSON.parse(atob(token.split('.')[1]));
} catch (error) {
    console.error('Erreur décodage token:', error);
    window.location.href = 'index.html';
}

// Initialise la page en chargeant les demandes, les comptes et les cartes, puis vérifie les disponibilités.
async function initialiser() {
    await Promise.all([
        chargerDemandes(),
        chargerComptesExistants(),
        chargerCartesExistantes(),
        chargerProfil()
    ]);
    verifierDisponibilitesDemandes();
}

async function chargerProfil() {
    try {
        const res = await fetch(`${API_URL}/utilisateurs/mon-profil`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (data.succes) profilUtilisateur = data.utilisateur;
    } catch (e) { /* silencieux */ }
}

// Charge la liste des comptes bancaires existants de l'utilisateur pour la vérification des disponibilités.
async function chargerComptesExistants() {
    try {
        const response = await fetch(`${API_URL}/comptes/mes-comptes`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (data.succes) {
            comptesExistants = data.comptes;
        }
    } catch (error) {
        console.error('Erreur chargement comptes:', error);
    }
}

// Charge la liste des cartes bancaires existantes de l'utilisateur pour la vérification des disponibilités.
async function chargerCartesExistantes() {
    try {
        const response = await fetch(`${API_URL}/cartes/mes-cartes`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (data.succes) {
            cartesExistantes = data.cartes;
        }
    } catch (error) {
        console.error('Erreur chargement cartes:', error);
    }
}

// Vérifie quelles demandes sont déjà actives ou en cours et désactive les boutons correspondants.
function verifierDisponibilitesDemandes() {
    // Compte Épargne : 1 seul autorisé
    const aCompteEpargne = comptesExistants.some(c => c.type_compte === 'savings');
    const aDemandeEpargneEnCours = demandesExistantes.some(d => 
        d.type_demande === 'account_opening' && 
        d.type_compte === 'savings' && 
        d.statut === 'pending'
    );
    
    if (aCompteEpargne || aDemandeEpargneEnCours) {
        desactiverCarte('epargne', aCompteEpargne ? 'Vous avez déjà un compte épargne' : 'Demande en cours d\'examen');
    }

    // Compte Placement (Investment) : 1 seul autorisé
    const aComptePlacement = comptesExistants.some(c => c.type_compte === 'investment');
    const aDemandePlacementEnCours = demandesExistantes.some(d => 
        d.type_demande === 'investment' && 
        d.statut === 'pending'
    );
    
    if (aComptePlacement || aDemandePlacementEnCours) {
        desactiverCarte('placement', aComptePlacement ? 'Vous avez déjà un compte de placement' : 'Demande en cours d\'examen');
    }

    // Carte de Crédit : 1 seule autorisée
    const aCartCredit = cartesExistantes.some(c => c.type_carte === 'credit');
    const aDemandeCreditEnCours = demandesExistantes.some(d => 
        d.type_demande === 'credit_card' && 
        d.statut === 'pending'
    );
    
    if (aCartCredit || aDemandeCreditEnCours) {
        desactiverCarte('credit', aCartCredit ? 'Vous avez déjà une carte de crédit' : 'Demande en cours d\'examen');
    }

    // Prêts : Toujours disponibles (pas de limite)
}

// Désactive visuellement le bouton d'une demande indisponible et affiche la raison.
function desactiverCarte(type, raison) {
    const cartes = {
        'epargne': document.querySelector('[onclick="ouvrirModalCompteEpargne()"]'),
        'placement': document.querySelector('[onclick="ouvrirModalComptePlacement()"]'),
        'credit': document.querySelector('[onclick="ouvrirModalCarteCredit()"]')
    };

    const carte = cartes[type];
    if (carte) {
        carte.style.opacity = '0.5';
        carte.style.cursor = 'not-allowed';
        carte.style.pointerEvents = 'none';
        
        const p = carte.querySelector('p');
        if (p) {
            p.innerHTML = `<strong style="color: #ef4444;">⚠️ ${raison}</strong>`;
        }
    }
}

// Charge et affiche la liste des demandes soumises par l'utilisateur avec leur statut.
async function chargerDemandes() {
    try {
        const response = await fetch(`${API_URL}/demandes/mes-demandes`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();
        demandesExistantes = data.demandes || [];

        const liste = document.getElementById('demandesList');
        const emptyState = document.getElementById('emptyState');

        if (data.succes && data.demandes.length > 0) {
            liste.innerHTML = '';
            emptyState.style.display = 'none';

            data.demandes.forEach(demande => {
                const li = document.createElement('li');
                li.className = 'demande-item';

                // Type de demande
                const typeLabels = {
                    'account_opening': 'Compte Épargne',
                    'credit_card': 'Carte de crédit',
                    'loan': 'Prêt personnel',
                    'mortgage': 'Prêt hypothécaire',
                    'investment': 'Compte de placement'
                };

                const typeLabel = typeLabels[demande.type_demande] || demande.type_demande;

                // Badge statut
                const statusBadges = {
                    'pending': { class: 'badge-pending', label: 'En attente' },
                    'approved': { class: 'badge-approved', label: 'Approuvée' },
                    'rejected': { class: 'badge-rejected', label: 'Rejetée' }
                };

                const statusInfo = statusBadges[demande.statut] || { class: 'badge-pending', label: demande.statut };

                // Date
                const date = new Date(demande.date_demande).toLocaleDateString('fr-CA', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });

                li.innerHTML = `
                    <div class="demande-info">
                        <h4>${typeLabel}</h4>
                        <p><strong>Date:</strong> ${date}</p>
                        ${demande.commentaire_admin ? `<p><strong>Commentaire:</strong> ${demande.commentaire_admin}</p>` : ''}
                    </div>
                    <span class="badge ${statusInfo.class}">${statusInfo.label}</span>
                `;

                liste.appendChild(li);
            });
        } else {
            liste.innerHTML = '';
            emptyState.style.display = 'block';
        }
    } catch (error) {
        console.error('Erreur chargement demandes:', error);
    }
}

// Ouvre la modale de demande d'ouverture de compte épargne et réinitialise le formulaire.
function ouvrirModalCompteEpargne() {
    document.getElementById('modalCompteEpargne').classList.add('active');
    document.getElementById('formCompteEpargne').reset();
    document.getElementById('alertEpargne').style.display = 'none';
}

// Ouvre la modale de demande d'ouverture de compte de placement et réinitialise le formulaire.
function ouvrirModalComptePlacement() {
    document.getElementById('modalComptePlacement').classList.add('active');
    document.getElementById('formComptePlacement').reset();
    document.getElementById('alertPlacement').style.display = 'none';
}

// Ouvre la modale de demande de carte de crédit et réinitialise le formulaire.
function ouvrirModalCarteCredit() {
    document.getElementById('modalCarteCredit').classList.add('active');
    document.getElementById('formCarteCredit').reset();
    document.getElementById('alertCredit').style.display = 'none';
}

// Ouvre la modale de demande de prêt personnel et réinitialise le formulaire.
function ouvrirModalPretPersonnel() {
    document.getElementById('modalPretPersonnel').classList.add('active');
    document.getElementById('formPretPersonnel').reset();
    document.getElementById('alertPret').style.display = 'none';
}

// Ouvre la modale de demande de prêt hypothécaire et réinitialise le formulaire.
function ouvrirModalPretHypothecaire() {
    document.getElementById('modalPretHypothecaire').classList.add('active');
    document.getElementById('formPretHypothecaire').reset();
    document.getElementById('alertHypothecaire').style.display = 'none';
}

// Ferme la modale identifiée par son id en retirant la classe active.
function fermerModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Soumettre demande compte épargne
document.getElementById('formCompteEpargne').addEventListener('submit', async function(e) {
    e.preventDefault();

    const justification = document.getElementById('justificationEpargne').value.trim();

    if (justification.length < 2) {
        afficherAlerte('alertEpargne', 'La justification doit contenir au moins 2 caractères.', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/demandes/nouvelle`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                typeDemande: 'account_opening',
                typeCompte: 'savings',
                justification
            })
        });

        const data = await response.json();

        if (data.succes) {
            fermerModal('modalCompteEpargne');
            showToast('✅ Demande soumise avec succès !');
            initialiser();
        } else {
            afficherAlerte('alertEpargne', data.message, 'error');
        }
    } catch (error) {
        console.error('Erreur soumission demande:', error);
        afficherAlerte('alertEpargne', 'Erreur lors de la soumission.', 'error');
    }
});

// Soumettre demande compte placement
document.getElementById('formComptePlacement').addEventListener('submit', async function(e) {
    e.preventDefault();

    const typePlacement = document.getElementById('typePlacement').value;
    const montantInitial = parseFloat(document.getElementById('montantInitialPlacement').value);
    const justification = document.getElementById('justificationPlacement').value.trim();

    if (justification.length < 2) {
        afficherAlerte('alertPlacement', 'La justification doit contenir au moins 2 caractères.', 'error');
        return;
    }

    if (montantInitial < 1000) {
        afficherAlerte('alertPlacement', 'Le montant initial minimum est de 1,000$.', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/demandes/nouvelle`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                typeDemande: 'account_opening',
                typeCompte: 'investment',
                montantInitial,
                justification
            })
        });

        const data = await response.json();

        if (data.succes) {
            fermerModal('modalComptePlacement');
            showToast('✅ Demande soumise avec succès !');
            initialiser();
        } else {
            afficherAlerte('alertPlacement', data.message, 'error');
        }
    } catch (error) {
        console.error('Erreur soumission demande:', error);
        afficherAlerte('alertPlacement', 'Erreur lors de la soumission.', 'error');
    }
});

// Soumettre demande carte crédit
document.getElementById('formCarteCredit').addEventListener('submit', async function(e) {
    e.preventDefault();

    const limiteCredit = parseFloat(document.getElementById('limiteCredit').value);
    const justification = document.getElementById('justificationCredit').value.trim();

    if (justification.length < 2) {
        afficherAlerte('alertCredit', 'La justification doit contenir au moins 2 caractères.', 'error');
        return;
    }

    if (limiteCredit < 500 || limiteCredit > 50000) {
        afficherAlerte('alertCredit', 'La limite de crédit doit être entre 500$ et 50,000$.', 'error');
        return;
    }

    // Vérifier conformité avec le statut du client
    if (profilUtilisateur) {
        const statut = profilUtilisateur.statut_professionnel;
        const limiteStatut = LIMITES_CREDIT_STATUT[statut];
        if (limiteStatut && limiteCredit > limiteStatut) {
            const fmt = n => n.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' });
            const ok = await showConfirm(
                `En tant que ${STATUT_LABELS[statut] || statut}, la limite maximale recommandée est de ${fmt(limiteStatut)}. Votre demande de ${fmt(limiteCredit)} pourrait être rejetée par l'administrateur.`,
                { title: 'Limite non conforme à votre statut', type: 'warning', confirmText: 'Soumettre quand même', cancelText: 'Modifier ma demande' }
            );
            if (!ok) return;
        }
    }

    try {
        const response = await fetch(`${API_URL}/demandes/nouvelle`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                typeDemande: 'credit_card',
                typeCarte: 'credit',
                limiteDemandee: limiteCredit,
                justification
            })
        });

        const data = await response.json();

        if (data.succes) {
            fermerModal('modalCarteCredit');
            showToast('✅ Demande soumise avec succès !');
            initialiser();
        } else {
            afficherAlerte('alertCredit', data.message, 'error');
        }
    } catch (error) {
        console.error('Erreur soumission demande:', error);
        afficherAlerte('alertCredit', 'Erreur lors de la soumission.', 'error');
    }
});

// Soumettre demande prêt personnel
document.getElementById('formPretPersonnel').addEventListener('submit', async function(e) {
    e.preventDefault();

    const montantPret = parseFloat(document.getElementById('montantPret').value);
    const dureeMois = parseInt(document.getElementById('dureeMois').value);
    const justification = document.getElementById('justificationPret').value.trim();

    if (justification.length < 2) {
        afficherAlerte('alertPret', 'La justification doit contenir au moins 2 caractères.', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/demandes/nouvelle`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                typeDemande: 'loan',
                montantDemande: montantPret,
                dureeMois,
                justification
            })
        });

        const data = await response.json();

        if (data.succes) {
            fermerModal('modalPretPersonnel');
            showToast('✅ Demande soumise avec succès !');
            initialiser();
        } else {
            afficherAlerte('alertPret', data.message, 'error');
        }
    } catch (error) {
        console.error('Erreur soumission demande:', error);
        afficherAlerte('alertPret', 'Erreur lors de la soumission.', 'error');
    }
});

// Soumettre demande prêt hypothécaire
document.getElementById('formPretHypothecaire').addEventListener('submit', async function(e) {
    e.preventDefault();

    const montantHypothecaire = parseFloat(document.getElementById('montantHypothecaire').value);
    const valeurPropriete = parseFloat(document.getElementById('valeurPropriete').value);
    const justification = document.getElementById('justificationHypothecaire').value.trim();

    if (justification.length < 2) {
        afficherAlerte('alertHypothecaire', 'La justification doit contenir au moins 2 caractères.', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/demandes/nouvelle`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                typeDemande: 'loan',
                montantDemande: montantHypothecaire,
                valeurPropriete,
                justification
            })
        });

        const data = await response.json();

        if (data.succes) {
            fermerModal('modalPretHypothecaire');
            showToast('✅ Demande soumise avec succès !');
            initialiser();
        } else {
            afficherAlerte('alertHypothecaire', data.message, 'error');
        }
    } catch (error) {
        console.error('Erreur soumission demande:', error);
        afficherAlerte('alertHypothecaire', 'Erreur lors de la soumission.', 'error');
    }
});

// Affiche un message d'alerte dans l'élément identifié par elementId selon le type (error ou warning).
function afficherAlerte(elementId, message, type) {
    const alertDiv = document.getElementById(elementId);
    alertDiv.className = type === 'error' ? 'alert alert-error' : 'alert alert-warning';
    alertDiv.innerHTML = message;
    alertDiv.style.display = 'block';
}

// Déconnecte l'utilisateur en supprimant le token et redirige vers la page de connexion.
async function deconnexion() {
    const ok = await showConfirm('Voulez-vous vraiment vous déconnecter ?', {
        title: 'Déconnexion',
        confirmText: 'Se déconnecter',
        cancelText: 'Rester connecté'
    });
    if (!ok) return;
    localStorage.removeItem('token');
    window.location.href = 'index.html';
}

// Initialiser au chargement
document.addEventListener('DOMContentLoaded', initialiser);