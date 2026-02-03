// ============================================
// UTILITAIRES FRONT-END — SPRINT 1
// Fonctions communes utilisées par auth.js et app.js
// MODE LOCAL (Option B)
// ============================================

// ──────────────────────────────────────────
// CONSTANTES LOCALSTORAGE
// ──────────────────────────────────────────

const LS_USERS_KEY = "banque_users";
const LS_SESSION_KEY = "banque_session";
const LS_TOKEN_KEY = "banque_token";

// ──────────────────────────────────────────
// REQUÊTES API (SIMULÉES EN LOCAL)
// ──────────────────────────────────────────

/**
 * Simule une API backend (sans serveur)
 * Endpoints supportés :
 * - /auth/inscription
 * - /auth/connexion
 */
async function appelAPI(endpoint, methode = 'GET', donnees = null, avecAuth = false) {
    // Petit délai pour simuler un appel réseau
    await new Promise(r => setTimeout(r, 200));

    // Helpers localStorage
    function getUsers() {
        try {
            return JSON.parse(localStorage.getItem(LS_USERS_KEY)) || [];
        } catch {
            return [];
        }
    }

    function setUsers(users) {
        localStorage.setItem(LS_USERS_KEY, JSON.stringify(users));
    }

    function makeToken() {
        return "tok_" + Math.random().toString(36).slice(2) + "_" + Date.now();
    }

    function saveSession(user) {
        const safeUser = {
            prenom: user.prenom,
            nom: user.nom,
            email: user.email,
            telephone: user.telephone || "",
            adresse: user.adresse || ""
        };
        localStorage.setItem(LS_SESSION_KEY, JSON.stringify(safeUser));
    }

    // ───────── INSCRIPTION ─────────
    if (endpoint === '/auth/inscription' && methode === 'POST') {
        const users = getUsers();
        const email = (donnees?.email || "").trim().toLowerCase();
        const motDePasse = donnees?.motDePasse || "";

        if (!email || !motDePasse) {
            return { response: { ok: false }, data: { succes: false, message: "Email et mot de passe requis." } };
        }

        const existe = users.some(u => u.email.toLowerCase() === email);
        if (existe) {
            return { response: { ok: false }, data: { succes: false, message: "Cet email est déjà utilisé." } };
        }

        const newUser = {
            prenom: donnees?.prenom || "",
            nom: donnees?.nom || "",
            email,
            telephone: donnees?.telephone || "",
            adresse: donnees?.adresse || "",
            motDePasse
        };

        users.push(newUser);
        setUsers(users);

        const token = makeToken();
        localStorage.setItem(LS_TOKEN_KEY, token);
        saveSession(newUser);

        return { response: { ok: true }, data: { succes: true, token } };
    }

    // ───────── CONNEXION ─────────
    if (endpoint === '/auth/connexion' && methode === 'POST') {
        const users = getUsers();
        const email = (donnees?.email || "").trim().toLowerCase();
        const motDePasse = donnees?.motDePasse || "";

        const user = users.find(u => u.email.toLowerCase() === email);
        if (!user || user.motDePasse !== motDePasse) {
            return { response: { ok: false }, data: { succes: false, message: "Email ou mot de passe invalide." } };
        }

        const token = makeToken();
        localStorage.setItem(LS_TOKEN_KEY, token);
        saveSession(user);

        return { response: { ok: true }, data: { succes: true, token } };
    }

    return { response: { ok: false }, data: { succes: false, message: "Route inconnue (mode local)." } };
}

// ──────────────────────────────────────────
// MESSAGES (toasts / alertes)
// ──────────────────────────────────────────

function afficherMessage(texte, type = 'info', duree = 5000) {
    const conteneur = document.getElementById('messageAuth');
    if (!conteneur) return;

    conteneur.className = `message message-${type}`;
    conteneur.textContent = texte;

    if (type !== 'erreur' && duree > 0) {
        setTimeout(() => { conteneur.className = 'message-cache'; }, duree);
    }
}

function afficherSucces(texte, duree = 5000) { afficherMessage(texte, 'succes', duree); }
function afficherErreur(texte) { afficherMessage(texte, 'erreur', 0); }
function afficherAvertissement(texte, duree = 5000) { afficherMessage(texte, 'avertissement', duree); }
function afficherInfo(texte, duree = 5000) { afficherMessage(texte, 'info', duree); }

// ──────────────────────────────────────────
// SPINNERS
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

function formatMontant(nombre) {
    return Number(nombre).toLocaleString('fr-CA', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }) + ' $';
}

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
    localStorage.setItem(LS_TOKEN_KEY, token);
    localStorage.setItem('banque_connexion_time', Date.now().toString());
}

function supprimerToken() {
    localStorage.removeItem(LS_TOKEN_KEY);
    localStorage.removeItem('banque_connexion_time');
    localStorage.removeItem(LS_SESSION_KEY);
}

function obtenirToken() {
    return localStorage.getItem(LS_TOKEN_KEY);
}

function verifierSessionOuRediriger() {
    if (!obtenirToken()) {
        window.location.href = 'index.html';
        return false;
    }
    return true;
}
