// ============================================
// APP.JS — SPRINT 1
// Logique du tableau de bord
// ============================================

const SESSION_WARNING = 28 * 60 * 1000;  // 28 minutes
const SESSION_TIMEOUT = 30 * 60 * 1000;  // 30 minutes
let intervalSurveillance = null;
let intervalCompte = null;

// ──────────────────────────────────────────
// INITIALISATION
// ──────────────────────────────────────────

async function initialiserTableauBord() {
    // Vérifier la session
    if (!verifierSessionOuRediriger()) return;

    // Boutons
    document.getElementById('btnDeconnexion').addEventListener('click', deconnexion);
    document.getElementById('btnProlongerSession').addEventListener('click', prolongerSession);
    document.getElementById('btnSeDeconnecter').addEventListener('click', deconnexion);

    // Date
    afficherDateActuelle();

    // Charger les données
    await chargerInfoUtilisateur();
    await chargerComptes();
    await chargerTransactionsRecentes();

    // Démarrer la surveillance de session
    demarrerSurveillanceSession();
}

// ──────────────────────────────────────────
// DATE
// ──────────────────────────────────────────

function afficherDateActuelle() {
    const el = document.getElementById('dateActuelle');
    if (!el) return;

    const maintenant = new Date();
    const jours = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
    const mois  = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];

    el.textContent = `${jours[maintenant.getDay()]} ${maintenant.getDate()} ${mois[maintenant.getMonth()]} ${maintenant.getFullYear()}`;
}

// ──────────────────────────────────────────
// UTILISATEUR
// ──────────────────────────────────────────

async function chargerInfoUtilisateur() {
    try {
        const { response, data } = await appelAPI('/auth/moi', 'GET', null, true);

        if (response.ok && data.succes) {
            const u = data.utilisateur;
            document.getElementById('nomUtilisateur').textContent = `${u.prenom} ${u.nom}`;
            document.getElementById('messageBienvenue').textContent = `Bonjour, ${u.prenom} !`;

            // Initiales du avatar
            const initiales = document.getElementById('initialesAvatar');
            if (initiales) initiales.textContent = `${u.prenom[0]}${u.nom[0]}`.toUpperCase();
        } else if (response.status === 401) {
            supprimerToken();
            window.location.href = 'index.html';
        }
    } catch (err) {
        console.error('Erreur charger info utilisateur:', err);
    }
}

// ──────────────────────────────────────────
// COMPTES
// ──────────────────────────────────────────

async function chargerComptes() {
    try {
        const { response, data } = await appelAPI('/comptes', 'GET', null, true);

        if (response.ok && data.succes) {
            mettreAJourTotaux(data.totaux);
            afficherComptes(data.comptes);
        } else if (response.status === 401) {
            supprimerToken();
            window.location.href = 'index.html';
        }
    } catch (err) {
        console.error('Erreur charger comptes:', err);
    }
}

function mettreAJourTotaux(totaux) {
    document.getElementById('totalDepenses').textContent      = formatMontant(totaux.depenses);
    document.getElementById('totalEpargne').textContent       = formatMontant(totaux.epargne);
    document.getElementById('totalCredit').textContent        = formatMontant(totaux.credit);
    document.getElementById('totalInvestissement').textContent = formatMontant(totaux.investissement);
}

function afficherComptes(comptes) {
    const conteneur = document.getElementById('listeComptes');
    if (!conteneur) return;

    if (!comptes || comptes.length === 0) {
        conteneur.innerHTML = '<p class="texte-gris">Aucun compte trouvé.</p>';
        return;
    }

    conteneur.innerHTML = comptes.map(c => `
        <div class="carte-compte compte-${c.type}">
            <div class="en-tete-carte-compte">
                <span class="type-compte">${c.typeFr}</span>
                <span class="statut-compte ${c.statut === 'active' ? 'actif' : 'ferme'}">${c.statut === 'active' ? 'Actif' : 'Fermé'}</span>
            </div>
            <div class="numero-compte">${c.numeroCompte}</div>
            <div class="solde-compte">${formatMontant(c.solde)}</div>
            <div class="pied-carte-compte">
                <span class="date-compte">Depuis le ${formatDateCreation(c.dateCreation)}</span>
            </div>
        </div>
    `).join('');
}

function formatDateCreation(dateISO) {
    const d = new Date(dateISO);
    const mois = ['jan.','fév.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];
    return `${d.getDate()} ${mois[d.getMonth()]} ${d.getFullYear()}`;
}

// ──────────────────────────────────────────
// TRANSACTIONS
// ──────────────────────────────────────────

async function chargerTransactionsRecentes() {
    try {
        // D'abord, obtenir les comptes pour avoir le premier compte
        const { response, data } = await appelAPI('/comptes', 'GET', null, true);

        if (response.ok && data.succes && data.comptes.length > 0) {
            // Prendre le premier compte (chèques en général)
            const premierId = data.comptes[0].id;
            const { response: r2, data: d2 } = await appelAPI(`/comptes/${premierId}/transactions?limite=10`, 'GET', null, true);

            if (r2.ok && d2.succes) {
                afficherTransactions(d2.transactions);
            }
        }
    } catch (err) {
        console.error('Erreur charger transactions:', err);
    }
}

function afficherTransactions(transactions) {
    const conteneur = document.getElementById('listeTransactions');
    if (!conteneur) return;

    if (!transactions || transactions.length === 0) {
        conteneur.innerHTML = '<p class="texte-gris">Aucune transaction.</p>';
        return;
    }

    const icones = { deposit: '💰', withdrawal: '💸', transfer: '🔄', payment: '🧾', interac: '📱' };

    conteneur.innerHTML = transactions.map(t => {
        const estPositif = t.type === 'deposit';
        const classemontant = estPositif ? 'montant-positif' : 'montant-negatif';
        const prefixe = estPositif ? '+' : '-';

        return `
            <div class="ligne-transaction">
                <div class="icone-transaction">${icones[t.type] || '💵'}</div>
                <div class="info-transaction">
                    <span class="description-transaction">${t.description || t.typeFr}</span>
                    <span class="date-transaction">${formatDateRelative(t.date)}</span>
                </div>
                <div class="montant-transaction ${classemontant}">
                    ${prefixe}${formatMontant(Math.abs(t.montant))}
                </div>
            </div>
        `;
    }).join('');
}

// ──────────────────────────────────────────
// SESSION — surveillance + modal
// ──────────────────────────────────────────

function demarrerSurveillanceSession() {
    if (intervalSurveillance) clearInterval(intervalSurveillance);

    intervalSurveillance = setInterval(() => {
        const connexionTime = localStorage.getItem('banque_connexion_time');
        if (!connexionTime) { deconnexion(); return; }

        const elapsed = Date.now() - parseInt(connexionTime);

        if (elapsed >= SESSION_TIMEOUT) {
            deconnexion();
        } else if (elapsed >= SESSION_WARNING) {
            afficherModalSession(SESSION_TIMEOUT - elapsed);
        }
    }, 30000); // vérifier toutes les 30 secondes
}

function afficherModalSession(msRestant) {
    const modal = document.getElementById('modalSession');
    if (!modal || !modal.classList.contains('modal-cache')) return; // déjà affiché

    modal.classList.remove('modal-cache');

    // Countdown
    let secondes = Math.floor(msRestant / 1000);
    document.getElementById('tempsRestant').textContent = formatTemps(secondes);

    if (intervalCompte) clearInterval(intervalCompte);
    intervalCompte = setInterval(() => {
        secondes--;
        if (secondes <= 0) {
            clearInterval(intervalCompte);
            deconnexion();
        }
        document.getElementById('tempsRestant').textContent = formatTemps(secondes);
    }, 1000);
}

function formatTemps(totalSecondes) {
    const min = Math.floor(totalSecondes / 60).toString().padStart(2, '0');
    const sec = (totalSecondes % 60).toString().padStart(2, '0');
    return `${min}:${sec}`;
}

function prolongerSession() {
    // Réinitialiser le timestamp
    localStorage.setItem('banque_connexion_time', Date.now().toString());

    // Cacher la modal
    const modal = document.getElementById('modalSession');
    if (modal) modal.classList.add('modal-cache');

    if (intervalCompte) clearInterval(intervalCompte);
}

// ──────────────────────────────────────────
// DÉCONNEXION
// ──────────────────────────────────────────

async function deconnexion() {
    // Appeler l'API de déconnexion (optionnel, mais bon practice)
    try {
        await appelAPI('/auth/deconnexion', 'POST', null, true);
    } catch (e) { /* pas grave si ça échoue */ }

    // Nettoyer
    supprimerToken();
    if (intervalSurveillance) clearInterval(intervalSurveillance);
    if (intervalCompte) clearInterval(intervalCompte);

    window.location.href = 'index.html';
}
