/**
 * Fonctions utilitaires globales
 */

// Formater un montant en devise CAD
function formaterMontant(montant) {
    return new Intl.NumberFormat('fr-CA', {
        style: 'currency',
        currency: 'CAD'
    }).format(montant);
}

// Formater une date
function formaterDate(date) {
    return new Date(date).toLocaleDateString('fr-CA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Formater une date avec heure
function formaterDateHeure(date) {
    return new Date(date).toLocaleString('fr-CA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Valider un email
function validerEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

// Valider un numéro de téléphone (10 chiffres)
function validerTelephone(telephone) {
    const chiffres = telephone.replace(/\D/g, '');
    return chiffres.length === 10;
}

// Copier dans le presse-papier
async function copierTexte(texte) {
    try {
        await navigator.clipboard.writeText(texte);
        return true;
    } catch (error) {
        console.error('Erreur copie:', error);
        return false;
    }
}

// Afficher un message temporaire
function afficherMessage(message, type = 'info', duree = 3000) {
    const div = document.createElement('div');
    div.className = `alert alert-${type}`;
    div.textContent = message;
    div.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        min-width: 300px;
    `;

    document.body.appendChild(div);

    setTimeout(() => {
        div.style.transition = 'opacity 0.3s';
        div.style.opacity = '0';
        setTimeout(() => div.remove(), 300);
    }, duree);
}

// Décoder un token JWT (sans vérifier la signature)
function decoderJWT(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error('Erreur décodage JWT:', error);
        return null;
    }
}