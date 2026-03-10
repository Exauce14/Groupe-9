const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const utilisateurModel = require('../modeles/utilisateur.modele');
const verificationModel = require('../modeles/verification.modele');
const emailUtils = require('../utilitaires/email.utils');
const { query } = require('../config/baseDeDonnees');

// Inscription
exports.inscription = async (req, res, next) => {
  try {
    const {
      email, motDePasse, prenom, nom, telephone, adresse,
      dateNaissance, sexe, statut, revenuAnnuel, typeResidence, nas
    } = req.body;

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 NOUVELLE INSCRIPTION');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Email:', email);
    console.log('Nom complet:', prenom, nom);

    const utilisateurExistant = await utilisateurModel.trouverParEmail(email);
    if (utilisateurExistant) {
      return res.status(400).json({
        succes: false,
        message: 'Un compte existe déjà avec cet email'
      });
    }

    const motDePasseHash = await bcrypt.hash(motDePasse, 10);

    const nouvelUtilisateur = await utilisateurModel.creer({
      email,
      motDePasse: motDePasseHash,
      prenom,
      nom,
      telephone,
      adresse,
      dateNaissance,
      sexe,
      statut,
      revenuAnnuel,
      typeResidence,
      nas,
      role: 'user',
      accountStatus: 'pending'
    });

    console.log('✅ Utilisateur créé - ID:', nouvelUtilisateur.id);
    console.log('✅ Statut: pending (en attente d\'approbation)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    res.status(201).json({
      succes: true,
      message: 'Inscription réussie ! Votre compte est en attente d\'approbation par un administrateur.',
      utilisateur: {
        id: nouvelUtilisateur.id,
        email: nouvelUtilisateur.email,
        prenom: nouvelUtilisateur.prenom,
        nom: nouvelUtilisateur.nom
      }
    });
  } catch (error) {
    console.error('Erreur inscription:', error);
    next(error);
  }
};

// Connexion
exports.connexion = async (req, res, next) => {
  try {
    const { email, motDePasse } = req.body;

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔐 TENTATIVE DE CONNEXION');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Email:', email);

    const utilisateur = await query(
      `SELECT 
        id, email, password, first_name AS prenom, last_name AS nom, 
        role, account_status AS statut_compte, 
        login_attempts, locked_until
       FROM users 
       WHERE email = $1`,
      [email]
    );

    if (!utilisateur.rows[0]) {
      console.log('❌ Email non trouvé');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      return res.status(401).json({
        succes: false,
        message: 'Email ou mot de passe incorrect'
      });
    }

    const user = utilisateur.rows[0];

    // Vérifier si le compte est verrouillé
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const tempsRestant = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
      console.log('🔒 Compte verrouillé -', tempsRestant, 'minutes restantes');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      return res.status(423).json({
        succes: false,
        message: `Compte temporairement verrouillé. Réessayez dans ${tempsRestant} minutes.`
      });
    }

    // Vérifier le mot de passe
    const motDePasseValide = await bcrypt.compare(motDePasse, user.password);

    if (!motDePasseValide) {
      const nouvellesTentatives = (user.login_attempts || 0) + 1;
      
      if (nouvellesTentatives >= 3) {
        const lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // Format ISO
        await query(
          'UPDATE users SET login_attempts = $1, locked_until = $2 WHERE id = $3',
          [nouvellesTentatives, lockedUntil, user.id]
        );
        console.log('🔒 Compte verrouillé pour 15 minutes (3 tentatives échouées)');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        return res.status(423).json({
          succes: false,
          message: 'Trop de tentatives échouées. Compte verrouillé pour 15 minutes.'
        });
      } else {
        await query(
          'UPDATE users SET login_attempts = $1 WHERE id = $2',
          [nouvellesTentatives, user.id]
        );
        console.log('❌ Mot de passe incorrect - Tentative', nouvellesTentatives, '/3');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        return res.status(401).json({
          succes: false,
          message: `Mot de passe incorrect. ${3 - nouvellesTentatives} tentative(s) restante(s).`
        });
      }
    }

    // Vérifier le statut du compte
    if (user.statut_compte === 'suspended') {
      console.log('⛔ Compte suspendu');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      return res.status(403).json({
        succes: false,
        message: 'Votre compte a été suspendu. Contactez le support.'
      });
    }

    if (user.statut_compte === 'closed') {
      console.log('⛔ Compte fermé');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      return res.status(403).json({
        succes: false,
        message: 'Ce compte a été fermé.'
      });
    }

    if (user.statut_compte === 'rejected') {
      console.log('⛔ Inscription rejetée');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      return res.status(403).json({
        succes: false,
        message: 'Votre demande d\'inscription a été rejetée.'
      });
    }

    // Réinitialiser les tentatives
    await query(
      'UPDATE users SET login_attempts = 0, locked_until = NULL WHERE id = $1',
      [user.id]
    );

    // Générer le code 2FA
    const code2FA = verificationModel.genererCode();
    await verificationModel.creer({
      utilisateurId: user.id,
      code: code2FA,
      type: '2fa'
    });

    // Envoyer l'email avec le code
    await emailUtils.envoyerCode2FA(user.email, user.prenom, code2FA);

    console.log('✅ Mot de passe correct');
    console.log('✅ Code 2FA généré et envoyé');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    res.json({
      succes: true,
      message: 'Code de vérification envoyé par email',
      requiresVerification: true,
      userId: user.id
    });
  } catch (error) {
    console.error('Erreur connexion:', error);
    next(error);
  }
};

// Vérifier le code 2FA
exports.verifier2FA = async (req, res, next) => {
  try {
    const { userId, code } = req.body;

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔐 VÉRIFICATION 2FA');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('User ID:', userId);
    console.log('Code reçu:', code);

    const codeValide = await verificationModel.trouverCodeValide(userId, code, '2fa');

    if (!codeValide) {
      console.log('❌ Code invalide ou expiré');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      return res.status(401).json({
        succes: false,
        message: 'Code invalide ou expiré'
      });
    }

    await verificationModel.marquerUtilise(codeValide.id);

    const utilisateur = await query(
      `SELECT id, email, first_name AS prenom, last_name AS nom, role, account_status AS statut_compte
       FROM users WHERE id = $1`,
      [userId]
    );

    const user = utilisateur.rows[0];

    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        prenom: user.prenom,
        nom: user.nom,
        role: user.role,
        accountStatus: user.statut_compte
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('✅ Code 2FA valide');
    console.log('✅ Token JWT généré (valide 24h)');
    console.log('✅ Utilisateur:', user.prenom, user.nom);
    console.log('✅ Statut:', user.statut_compte);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    res.json({
      succes: true,
      message: 'Connexion réussie',
      token: token,
      utilisateur: {
        id: user.id,
        email: user.email,
        prenom: user.prenom,
        nom: user.nom,
        role: user.role,
        accountStatus: user.statut_compte
      }
    });
  } catch (error) {
    console.error('Erreur vérification 2FA:', error);
    next(error);
  }
};

// Renvoyer le code 2FA
exports.renvoyerCode2FA = async (req, res, next) => {
  try {
    const { userId } = req.body;

    await verificationModel.invaliderCodesUtilisateur(userId, '2fa');

    const nouveauCode = verificationModel.genererCode();
    await verificationModel.creer({
  utilisateurId: user.id,
  code: code2FA,
  type: '2fa_login'
  });

    const utilisateur = await query(
      'SELECT email, first_name AS prenom FROM users WHERE id = $1',
      [userId]
    );

    const user = utilisateur.rows[0];

    await emailUtils.envoyerCode2FA(user.email, user.prenom, nouveauCode);

    console.log('📧 Nouveau code 2FA envoyé pour user:', userId);

    res.json({
      succes: true,
      message: 'Nouveau code envoyé'
    });
  } catch (error) {
    console.error('Erreur renvoi code 2FA:', error);
    next(error);
  }
};