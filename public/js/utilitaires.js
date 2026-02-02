// ============================================
// UTILITAIRES FRONT-END — SPRINT 1
// Fonctions communes utilisées par auth.js et app.js
// ============================================

// URL de base de l'API (même origin = pas besoin de port séparé)
const API_URL = '/api';

// ──────────────────────────────────────────
// REQUÊTES API
// ──────────────────────────────────────────

/**
 * Faire une requête à l'API
 * @param {string} endpoint   - Chemin après /api  (ex: '/auth/connexion')
 * @param {string} methode    - GET | POST | PUT | DELETE
 * @param {object} donnees    - Corps de la requête (sera JSON.stringify)
 * @param {boolean} avecAuth  - Ajouter le token Bearer ?
 */
async function appelAPI(endpoint, methode = 'GET', donnees = null, avecAuth = false) {
    const options = {
        method: methode,
        headers: { 'Content-Type': 'application/json' }
    };

    // Ajouter le token si nécessaire
    if (avecAuth) {
        const token = localStorage.getItem('banque_token');
        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }
    }

    // Ajouter le corps si présent
    if (donnees) {
        options.body = JSON.stringify(donnees);
    }

    const response = await fetch(`${API_URL}${endpoint}`, options);
    const data = await response.json();

    return { response, data };
}

// ──────────────────────────────────────────
// MESSAGES (toasts / alertes)
// ──────────────────────────────────────────

function afficherMessage(texte, type = 'info', duree = 5000) {
    const conteneur = document.getElementById('messageAuth');
    if (!conteneur) return;

    conteneur.className = `message message-${type}`;
    conteneur.textContent = texte;

    // Auto-cacher sauf les erreurs
    if (type !== 'erreur' && duree > 0) {
        setTimeout(() => { conteneur.className = 'message-cache'; }, duree);
    }
}

function afficherSucces(texte, duree = 5000) { afficherMessage(texte, 'succes', duree); }
function afficherErreur(texte) { afficherMessage(texte, 'erreur', 0); }
function afficherAvertissement(texte, duree = 5000) { afficherMessage(texte, 'avertissement', duree); }
function afficherInfo(texte, duree = 5000) { afficherMessage(texte, 'info', duree); }

// ──────────────────────────────────────────
// SPINNERS sur les boutons
// ──────────────────────────────────────────

function afficherSpinner(bouton) {
    if (!bouton) return;
    bouton.disabled = true;
    const spinner = bouton.querySelector('.spinner');
    const texte = bouton.querySelector('.texte-bouton');
    if (spinner) spinner.classList.remove('spinner-cache');
    if (texte) texte.style.visibility = 'hidden';
}

function masquerSpinner(bouton) {
    if (!bouton) return;
    bouton.disabled = false;
    const spinner = bouton.querySelector('.spinner');
    const texte = bouton.querySelector('.texte-bouton');
    if (spinner) spinner.classList.add('spinner-cache');
    if (texte) texte.style.visibility = 'visible';
}

// ──────────────────────────────────────────
// FORMATAGE
// ──────────────────────────────────────────

/** Formater un nombre en dollars canadiens  →  "2 500,00 $" */
function formatMontant(nombre) {
    return Number(nombre).toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' $';
}

/** Formater une date ISO en "il y a X jours" ou "aujourd'hui" */
function formatDateRelative(dateISO) {
    const date = new Date(dateISO);
    const maintenant = new Date();
    const diffMs = maintenant - date;
    const diffJours = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffJours === 0) return "Aujourd'hui";
    if (diffJours === 1) return "Hier";
    if (diffJours < 7) return `Il y a ${diffJours} jours`;
    if (diffJours < 30) return `Il y a ${Math.floor(diffJours / 7)} semaine(s)`;
    return date.toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ──────────────────────────────────────────
// SESSION / TOKEN
// ──────────────────────────────────────────

function sauvegarderToken(token) {
    localStorage.setItem('banque_token', token);
    localStorage.setItem('banque_connexion_time', Date.now().toString());
}

function supprimerToken() {
    localStorage.removeItem('banque_token');
    localStorage.removeItem('banque_connexion_time');
}

function obtenirToken() {
    return localStorage.getItem('banque_token');
}

/** Vérifier si le token existe — sinon rediriger vers login */
function verifierSessionOuRediriger() {
    if (!obtenirToken()) {
        window.location.href = 'index.html';
        return false;
    }
    return true;
}
