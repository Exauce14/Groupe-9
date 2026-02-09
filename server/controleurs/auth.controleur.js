const bcrypt = require('bcrypt');
const utilisateurModel = require('../modeles/utilisateur.modele');
const compteModel = require('../modeles/compte.modele');
const verificationModel = require('../modeles/verification.modele');
const { genererToken } = require('../utilitaires/jwt.utils');
const { envoyerCode2FA } = require('../utilitaires/email.utils');

exports.inscription = async (req, res, next) => {
    try {
        const { email, motDePasse, prenom, nom, telephone, adresse } = req.body;

        const existant = await utilisateurModel.trouverParEmail(email);
        if (existant) {
            return res.status(400).json({ succes: false, message: 'Cet email est déjà utilisé' });
        }

        const motDePasseHache = await bcrypt.hash(motDePasse, parseInt(process.env.BCRYPT_ROUNDS) || 10);

        const nouvelUtilisateur = await utilisateurModel.creer({
            email, motDePasse: motDePasseHache, prenom, nom, telephone, adresse, role: 'user'
        });

        // Créer automatiquement un compte chèques avec 1000$
        const compteInitial = await compteModel.creer({
            utilisateurId: nouvelUtilisateur.id,
            typeCompte: 'checking',
            soldeInitial: 1000.00
        });

        // ──────────────────────────────────────────
        // 2FA : Générer et envoyer le code (comme à la connexion)
        // ──────────────────────────────────────────
        
        // Générer le code 2FA
        const code = verificationModel.genererCode();
        await verificationModel.creer({
            userId: nouvelUtilisateur.id,
            code,
            type: '2fa_login',
            dureeValiditeMinutes: 10
        });

        // Envoyer par email
        try {
            const emailResult = await envoyerCode2FA(nouvelUtilisateur.email, code, nouvelUtilisateur.prenom);
            console.log('✅ Code 2FA envoyé (inscription):', emailResult.mode === 'dev' ? `CODE=${code}` : 'email envoyé');
        } catch (emailError) {
            console.error('Erreur envoi email 2FA:', emailError);
        }

        // NE PAS générer le token ici — on attend la vérification 2FA
        res.status(201).json({
            succes: true,
            message: 'Inscription réussie ! Un code de vérification a été envoyé à votre email.',
            requires2FA: true,
            userId: nouvelUtilisateur.id,
            email: nouvelUtilisateur.email,
            compteInitial: {
                numeroCompte: compteInitial.account_number,
                type: compteInitial.account_type,
                solde: compteInitial.balance
            }
        });
    } catch (error) {
        console.error('Erreur inscription:', error);
        next(error);
    }
};

exports.connexion = async (req, res, next) => {
    try {
        const { email, motDePasse } = req.body;

        const utilisateur = await utilisateurModel.trouverParEmail(email);
        if (!utilisateur) {
            return res.status(401).json({ succes: false, message: 'Email ou mot de passe incorrect' });
        }

        if (!utilisateur.est_actif) {
            return res.status(403).json({ succes: false, message: 'Votre compte a été désactivé.' });
        }

        if (utilisateur.verrouille_jusqua && new Date(utilisateur.verrouille_jusqua) > new Date()) {
            const min = Math.ceil((new Date(utilisateur.verrouille_jusqua) - new Date()) / 60000);
            return res.status(403).json({ succes: false, message: `Compte verrouillé. Réessayez dans ${min} minute(s).` });
        }

        const valide = await bcrypt.compare(motDePasse, utilisateur.mot_de_passe);
        if (!valide) {
            await utilisateurModel.incrementerTentativesConnexion(utilisateur.id);
            const tentatives = utilisateur.tentatives_connexion + 1;
            const maxTentatives = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 3;

            if (tentatives >= maxTentatives) {
                const duree = parseInt(process.env.ACCOUNT_LOCK_DURATION) || 900000;
                await utilisateurModel.verrouillerCompte(utilisateur.id, duree);
                return res.status(403).json({ succes: false, message: 'Trop de tentatives échouées. Compte verrouillé pendant 15 minutes.' });
            }

            return res.status(401).json({
                succes: false,
                message: 'Email ou mot de passe incorrect',
                tentativesRestantes: maxTentatives - tentatives
            });
        }

        // ──────────────────────────────────────────
        // 2FA : Générer et envoyer le code
        // ──────────────────────────────────────────
        
        // Invalider les anciens codes
        await verificationModel.invaliderCodesUtilisateur(utilisateur.id, '2fa_login');
        
        // Générer nouveau code
        const code = verificationModel.genererCode();
        await verificationModel.creer({
            userId: utilisateur.id,
            code,
            type: '2fa_login',
            dureeValiditeMinutes: 10
        });

        // Envoyer par email
        try {
            const emailResult = await envoyerCode2FA(utilisateur.email, code, utilisateur.prenom);
            console.log('✅ Code 2FA envoyé:', emailResult.mode === 'dev' ? `CODE=${code}` : 'email envoyé');
        } catch (emailError) {
            console.error('Erreur envoi email 2FA:', emailError);
        }

        // Réinitialiser les tentatives
        await utilisateurModel.reinitialiserTentativesConnexion(utilisateur.id);

        // NE PAS envoyer le token complet — on attend la vérification 2FA
        res.json({
            succes: true,
            message: 'Un code de vérification a été envoyé à votre email.',
            requires2FA: true,
            userId: utilisateur.id,
            email: utilisateur.email
        });
    } catch (error) {
        console.error('Erreur connexion:', error);
        next(error);
    }
};

// Nouvelle route : Vérifier le code 2FA
exports.verifier2FA = async (req, res, next) => {
    try {
        const { userId, code } = req.body;

        if (!userId || !code) {
            return res.status(400).json({ succes: false, message: 'Données manquantes' });
        }

        // Trouver le code valide
        const codeValide = await verificationModel.trouverCodeValide(userId, code, '2fa_login');
        
        if (!codeValide) {
            return res.status(401).json({ succes: false, message: 'Code invalide ou expiré' });
        }

        // Marquer comme utilisé
        await verificationModel.marquerUtilise(codeValide.id);

        // Récupérer l'utilisateur
        const utilisateur = await utilisateurModel.trouverParId(userId);
        if (!utilisateur) {
            return res.status(404).json({ succes: false, message: 'Utilisateur non trouvé' });
        }

        // Générer le token JWT complet
        const token = genererToken({ id: utilisateur.id, email: utilisateur.email, role: utilisateur.role });

        res.json({
            succes: true,
            message: 'Connexion réussie !',
            token,
            utilisateur: {
                id: utilisateur.id,
                email: utilisateur.email,
                prenom: utilisateur.prenom,
                nom: utilisateur.nom,
                role: utilisateur.role
            }
        });
    } catch (error) {
        console.error('Erreur vérification 2FA:', error);
        next(error);
    }
};

// Renvoyer un code 2FA
exports.renvoyerCode2FA = async (req, res, next) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ succes: false, message: 'Données manquantes' });
        }

        const utilisateur = await utilisateurModel.trouverParId(userId);
        if (!utilisateur) {
            return res.status(404).json({ succes: false, message: 'Utilisateur non trouvé' });
        }

        // Invalider les anciens codes
        await verificationModel.invaliderCodesUtilisateur(utilisateur.id, '2fa_login');
        
        // Générer nouveau code
        const code = verificationModel.genererCode();
        await verificationModel.creer({
            userId: utilisateur.id,
            code,
            type: '2fa_login',
            dureeValiditeMinutes: 10
        });

        // Envoyer
        try {
            await envoyerCode2FA(utilisateur.email, code, utilisateur.prenom);
        } catch (emailError) {
            console.error('Erreur renvoi email:', emailError);
        }

        res.json({ succes: true, message: 'Un nouveau code a été envoyé.' });
    } catch (error) {
        console.error('Erreur renvoi code:', error);
        next(error);
    }
};

exports.deconnexion = async (req, res) => {
    res.json({ succes: true, message: 'Déconnexion réussie !' });
};

exports.obtenirUtilisateurConnecte = async (req, res, next) => {
    try {
        const utilisateur = await utilisateurModel.trouverParId(req.utilisateur.id);
        if (!utilisateur) {
            return res.status(404).json({ succes: false, message: 'Utilisateur non trouvé' });
        }

        const comptes = await compteModel.trouverParUtilisateurId(utilisateur.id);

        res.json({
            succes: true,
            utilisateur: {
                id: utilisateur.id,
                email: utilisateur.email,
                prenom: utilisateur.prenom,
                nom: utilisateur.nom,
                telephone: utilisateur.telephone,
                adresse: utilisateur.adresse,
                role: utilisateur.role,
                nombreComptes: comptes.length,
                dateCreation: utilisateur.date_creation
            }
        });
    } catch (error) {
        console.error('Erreur profil:', error);
        next(error);
    }
};