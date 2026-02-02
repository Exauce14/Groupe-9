// ============================================
// AUTH.JS — SPRINT 1
// Logique de connexion et d'inscription
// ============================================

// ──────────────────────────────────────────
// PAGE CONNEXION (index.html)
// ──────────────────────────────────────────

function initialiserPageConnexion() {
    // Si déjà connecté → aller au tableau de bord
    if (obtenirToken()) {
        window.location.href = 'tableau-bord.html';
        return;
    }

    const formulaire = document.getElementById('formulaireConnexion');
    const btnMdp = document.getElementById('btnAfficherMdp');
    const champMdp = document.getElementById('motDePasse');

    // Toggle visibilité mot de passe
    if (btnMdp && champMdp) {
        btnMdp.addEventListener('click', () => {
            champMdp.type = champMdp.type === 'password' ? 'text' : 'password';
            btnMdp.textContent = champMdp.type === 'password' ? '👁️' : '🙈';
        });
    }

    // Soumission du formulaire
    if (formulaire) {
        formulaire.addEventListener('submit', (e) => {
            e.preventDefault();
            connexion();
        });
    }
}

async function connexion() {
    const email = document.getElementById('email').value.trim();
    const motDePasse = document.getElementById('motDePasse').value;
    const btnConnexion = document.getElementById('btnConnexion');

    // Validation basique côté client
    if (!email || !motDePasse) {
        afficherErreur('Veuillez remplir tous les champs.');
        return;
    }

    afficherSpinner(btnConnexion);

    try {
        const { response, data } = await appelAPI('/auth/connexion', 'POST', { email, motDePasse });

        if (response.ok && data.succes) {
            // Sauvegarder le token
            sauvegarderToken(data.token);
            afficherSucces('Connexion réussie ! Redirection...');

            // Rediriger vers le tableau de bord après 1s
            setTimeout(() => { window.location.href = 'tableau-bord.html'; }, 1000);
        } else {
            afficherErreur(data.message || 'Erreur de connexion');
            masquerSpinner(btnConnexion);

            // Afficher tentatives restantes si présentes
            if (data.tentativesRestantes !== undefined) {
                afficherErreur(`${data.message} (${data.tentativesRestantes} tentative(s) restante(s))`);
            }
        }
    } catch (erreur) {
        console.error('Erreur réseau:', erreur);
        afficherErreur('Erreur réseau. Vérifiez votre connexion ou que le serveur est lancé.');
        masquerSpinner(btnConnexion);
    }
}

// ──────────────────────────────────────────
// PAGE INSCRIPTION (inscription.html)
// ──────────────────────────────────────────

function initialiserPageInscription() {
    // Si déjà connecté → aller au tableau de bord
    if (obtenirToken()) {
        window.location.href = 'tableau-bord.html';
        return;
    }

    const formulaire = document.getElementById('formulaireInscription');
    const btnMdp = document.getElementById('btnAfficherMdp');
    const champMdp = document.getElementById('motDePasse');
    const champConfirm = document.getElementById('confirmationMotDePasse');

    // Toggle visibilité mot de passe
    if (btnMdp && champMdp) {
        btnMdp.addEventListener('click', () => {
            champMdp.type = champMdp.type === 'password' ? 'text' : 'password';
            champConfirm.type = champMdp.type;
            btnMdp.textContent = champMdp.type === 'password' ? '👁️' : '🙈';
        });
    }

    // Indicateur de force en temps réel
    if (champMdp) {
        champMdp.addEventListener('input', () => {
            mettreAJourIndicateurForce(champMdp.value);
        });
    }

    // Soumission
    if (formulaire) {
        formulaire.addEventListener('submit', (e) => {
            e.preventDefault();
            inscription();
        });
    }
}

/** Mettre à jour la barre de force et les critères visuels */
function mettreAJourIndicateurForce(motDePasse) {
    const progression = document.getElementById('progressionMdp');
    const texteForce = document.getElementById('texteForceMdp');

    // Critères
    const longueur  = motDePasse.length >= 8;
    const majuscule = /[A-Z]/.test(motDePasse);
    const minuscule = /[a-z]/.test(motDePasse);
    const chiffre   = /\d/.test(motDePasse);

    // Mettre à jour les icônes
    document.getElementById('critere-longueur').className  = longueur  ? 'critere-satisfait' : '';
    document.getElementById('critere-majuscule').className = majuscule ? 'critere-satisfait' : '';
    document.getElementById('critere-minuscule').className = minuscule ? 'critere-satisfait' : '';
    document.getElementById('critere-chiffre').className   = chiffre   ? 'critere-satisfait' : '';

    // Met à jour les icônes dans le span
    document.querySelector('#critere-longueur .icone-critere').textContent  = longueur  ? '✓' : '○';
    document.querySelector('#critere-majuscule .icone-critere').textContent = majuscule ? '✓' : '○';
    document.querySelector('#critere-minuscule .icone-critere').textContent = minuscule ? '✓' : '○';
    document.querySelector('#critere-chiffre .icone-critere').textContent   = chiffre   ? '✓' : '○';

    // Score 0-4
    const score = [longueur, majuscule, minuscule, chiffre].filter(Boolean).length;

    // Couleur + texte selon le score
    const niveaux = [
        { texte: 'Entrez un mot de passe', classe: '', largeur: '0%' },
        { texte: 'Très faible', classe: 'force-faible', largeur: '25%' },
        { texte: 'Faible',      classe: 'force-faible', largeur: '25%' },
        { texte: 'Moyen',       classe: 'force-moyen',  largeur: '50%' },
        { texte: 'Fort',        classe: 'force-fort',   largeur: '100%' }
    ];

    const niveau = niveaux[score];
    if (progression) {
        progression.style.width = niveau.largeur;
        progression.className = 'progression-mdp ' + niveau.classe;
    }
    if (texteForce) {
        texteForce.textContent = niveau.texte;
        texteForce.className = 'texte-force-mdp ' + niveau.classe;
    }
}

async function inscription() {
    const prenom   = document.getElementById('prenom').value.trim();
    const nom      = document.getElementById('nom').value.trim();
    const email    = document.getElementById('email').value.trim();
    const telephone = document.getElementById('telephone').value.trim();
    const adresse  = document.getElementById('adresse').value.trim();
    const motDePasse = document.getElementById('motDePasse').value;
    const confirmMdp = document.getElementById('confirmationMotDePasse').value;
    const accepter   = document.getElementById('accepterConditions').checked;
    const btnInscription = document.getElementById('btnInscription');

    // ── Validations côté client ──
    if (!prenom || prenom.length < 2) { afficherErreur('Le prénom doit contenir au moins 2 caractères.'); return; }
    if (!nom || nom.length < 2)       { afficherErreur('Le nom doit contenir au moins 2 caractères.'); return; }
    if (!email)                       { afficherErreur('L\'adresse email est requise.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { afficherErreur('Format d\'email invalide.'); return; }
    if (!motDePasse || motDePasse.length < 8) { afficherErreur('Le mot de passe doit contenir au moins 8 caractères.'); return; }
    if (!/[A-Z]/.test(motDePasse))    { afficherErreur('Le mot de passe doit contenir une majuscule.'); return; }
    if (!/[a-z]/.test(motDePasse))    { afficherErreur('Le mot de passe doit contenir une minuscule.'); return; }
    if (!/\d/.test(motDePasse))       { afficherErreur('Le mot de passe doit contenir un chiffre.'); return; }
    if (motDePasse !== confirmMdp)    { afficherErreur('Les mots de passe ne correspondent pas.'); return; }
    if (telephone && !/^(\+1[-.\s]?)?(\([0-9]{3}\)|[0-9]{3})[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}$/.test(telephone))
        { afficherErreur('Format téléphone invalide (ex: 514-555-0101).'); return; }
    if (!accepter) { afficherErreur('Vous devez accepter les conditions.'); return; }

    afficherSpinner(btnInscription);

    try {
        const { response, data } = await appelAPI('/auth/inscription', 'POST', {
            email, motDePasse, prenom, nom, telephone, adresse
        });

        if (response.ok && data.succes) {
            sauvegarderToken(data.token);
            afficherSucces('Compte créé avec succès ! Redirection vers le tableau de bord...');
            setTimeout(() => { window.location.href = 'tableau-bord.html'; }, 1500);
        } else {
            afficherErreur(data.message || 'Erreur lors de l\'inscription');
            masquerSpinner(btnInscription);
        }
    } catch (erreur) {
        console.error('Erreur réseau:', erreur);
        afficherErreur('Erreur réseau. Vérifiez que le serveur est lancé.');
        masquerSpinner(btnInscription);
    }
}
