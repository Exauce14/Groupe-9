const utilisateurModel = require('../modeles/utilisateur.modele');
const compteModel = require('../modeles/compte.modele');
const demandeModel = require('../modeles/demande.modele');
const carteModel = require('../modeles/carte.modele');
const notificationModel = require('../modeles/notification.modele');
const emailUtils = require('../utilitaires/email.utils');
const { sendNotificationToUser } = require('../utilitaires/websocket');
const { query } = require('../config/baseDeDonnees');

// Statistiques du dashboard admin
exports.statistiques = async (req, res, next) => {
  try {
    const stats = await query(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE account_status = 'pending') as inscriptions_attente,
        (SELECT COUNT(*) FROM requests WHERE status = 'pending') as demandes_attente,
        (SELECT COUNT(*) FROM users WHERE account_status = 'active') as utilisateurs_actifs,
        (SELECT COUNT(*) FROM cards WHERE status = 'active') as cartes_actives
    `);

    res.json({
      succes: true,
      stats: stats.rows[0]
    });
  } catch (error) {
    console.error('Erreur statistiques:', error);
    next(error);
  }
};

// Liste des inscriptions en attente
exports.inscriptionsEnAttente = async (req, res, next) => {
  try {
    const inscriptions = await query(
      `SELECT 
        id, 
        email, 
        first_name AS prenom, 
        last_name AS nom,
        phone AS telephone,
        date_of_birth AS date_naissance,
        status AS statut_professionnel,
        annual_income AS revenu_annuel,
        created_at AS date_inscription
      FROM users 
      WHERE account_status = 'pending'
      ORDER BY created_at DESC`
    );

    res.json({
      succes: true,
      inscriptions: inscriptions.rows
    });
  } catch (error) {
    console.error('Erreur inscriptions:', error);
    next(error);
  }
};

// Approuver une inscription
exports.approuverInscription = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const adminId = req.user.id;

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯 APPROBATION INSCRIPTION - DÉBUT');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👤 User ID:', userId);
    console.log('👨‍💼 Admin ID:', adminId);

    // 1. Mettre à jour le statut de l'utilisateur
    await query(
      `UPDATE users 
       SET account_status = 'active', 
           approved_by = $1, 
           approved_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [adminId, userId]
    );
    console.log('✅ Statut utilisateur mis à jour → active');

    // 2. Récupérer les infos de l'utilisateur
    const user = await query(
      'SELECT email, first_name AS prenom, last_name AS nom FROM users WHERE id = $1',
      [userId]
    );

    const utilisateur = user.rows[0];
    console.log('✅ Infos utilisateur récupérées:', utilisateur.prenom, utilisateur.nom);

    // 3. Créer un compte chèques par défaut avec solde initial de 5$
    console.log('\n💰 CRÉATION DU COMPTE CHÈQUES...');
    const typeCompte = 'checking'; // Compte chèques par défaut pour tous les nouveaux utilisateurs
    const compteResult = await query(
      `INSERT INTO accounts (user_id, account_type, balance)
       VALUES ($1, $2, 5.00)
       RETURNING id, account_number`,
      [userId, typeCompte]
    );

    const compte = compteResult.rows[0];
    console.log('✅ Compte chèques créé');
    console.log('  - ID:', compte.id);
    console.log('  - Numéro:', compte.account_number);
    console.log('  - Solde initial: 5.00$');

    // 4. Créer une transaction initiale pour le dépôt de bienvenue
    console.log('\n💵 CRÉATION TRANSACTION DE BIENVENUE...');
    await query(
      `INSERT INTO transactions (account_id, transaction_type, amount, balance_after, description)
       VALUES ($1, 'deposit', 5.00, 5.00, 'Dépôt de bienvenue - Ouverture de compte')`,
      [compte.id]
    );
    console.log('✅ Transaction de bienvenue créée (5.00$)');

    // 5. Créer automatiquement une carte de DÉBIT associée au compte chèques
    console.log('\n💳 CRÉATION CARTE DE DÉBIT...');
    const carteResult = await query(
      `INSERT INTO cards (account_id, card_type, expiry_date, cvv)
       VALUES ($1, 'debit', DATE(NOW() + INTERVAL '4 years'), LPAD(FLOOR(RANDOM() * 1000)::TEXT, 3, '0'))
       RETURNING id, card_number, cvv, expiry_date`,
      [compte.id]
    );

    const carte = carteResult.rows[0];
    console.log('✅ Carte de débit créée');
    console.log('  - ID:', carte.id);
    console.log('  - Numéro:', carte.card_number);
    console.log('  - CVV:', carte.cvv);
    console.log('  - Expiration:', new Date(carte.expiry_date).toLocaleDateString('fr-CA'));

    // 6. Créer une notification
    console.log('\n📢 CRÉATION NOTIFICATION...');
    await notificationModel.creer({
      user_id: userId,
      type: 'request_approved',
      titre: 'Compte approuvé',
      message: 'Félicitations ! Votre compte Fortivia Bank a été approuvé. Un compte chèques avec une carte de débit a été créé pour vous.',
      lien: '/tableau-bord.html'
    });
    console.log('✅ Notification créée');
    // Envoyer email (ne pas bloquer si erreur)
      try {
        await emailUtils.envoyerEmailDemandeApprouvee(
          utilisateur.email,
          utilisateur.prenom,
          'inscription' // Type de demande pour l'approbation d'inscription
      );
      } catch (emailError) {
        console.error('⚠️ Erreur envoi email (ignorée):', emailError.message);
      }
    console.log('✅ Email envoyé à:', utilisateur.email);

    // 8. Notifier l'utilisateur via WebSocket
    console.log('\n🔌 NOTIFICATION WEBSOCKET...');
    sendNotificationToUser(userId, {
      type: 'request_approved',
      titre: 'Compte approuvé',
      message: 'Votre compte a été approuvé avec succès ! Vous avez maintenant accès à votre compte chèques et à votre carte de débit.'
    });
    console.log('✅ Notification WebSocket envoyée');

    console.log('\n✅ APPROBATION TERMINÉE AVEC SUCCÈS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    res.json({
      succes: true,
      message: 'Inscription approuvée avec succès',
      details: {
        compte: {
          id: compte.id,
          numero: compte.account_number,
          solde: '5.00$'
        },
        carte: {
          id: carte.id,
          numero: carte.card_number,
          type: 'debit'
        }
      }
    });
  } catch (error) {
    console.error('\n❌ ERREUR APPROBATION INSCRIPTION:', error);
    console.error('Stack:', error.stack);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    next(error);
  }
};

// Rejeter une inscription
exports.rejeterInscription = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { raison } = req.body;
    const adminId = req.user.id;

    const user = await query(
      'SELECT email, first_name AS prenom FROM users WHERE id = $1',
      [userId]
    );

    const utilisateur = user.rows[0];

    await query(
      `UPDATE users 
       SET account_status = 'rejected', 
           approved_by = $1, 
           approved_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [adminId, userId]
    );

    await notificationModel.creer({
      user_id: userId,
      type: 'request_rejected',
      titre: 'Inscription refusée',
      message: `Votre demande d'inscription a été refusée. Raison: ${raison}`,
      lien: null
    });

    await emailUtils.envoyerEmailDemandeRejetee(
      utilisateur.email,
      utilisateur.prenom,
      'inscription',
      raison
    );

    res.json({
      succes: true,
      message: 'Inscription rejetée'
    });
  } catch (error) {
    console.error('Erreur rejet inscription:', error);
    next(error);
  }
};

// Liste des demandes en attente
exports.demandesEnAttente = async (req, res, next) => {
  try {
    const demandes = await query(
      `SELECT 
        r.id,
        r.request_type AS type_demande,
        r.account_type AS type_compte,
        r.card_type AS type_carte,
        r.requested_limit AS limite_demandee,
        r.justification,
        r.created_at AS date_demande,
        u.id AS utilisateur_id,
        u.first_name AS prenom,
        u.last_name AS nom,
        u.email,
        u.annual_income AS revenu_annuel
      FROM requests r
      JOIN users u ON r.user_id = u.id
      WHERE r.status = 'pending'
      ORDER BY r.created_at DESC`
    );

    res.json({
      succes: true,
      demandes: demandes.rows
    });
  } catch (error) {
    console.error('Erreur demandes:', error);
    next(error);
  }
};

// Approuver une demande
exports.approuverDemande = async (req, res, next) => {
  try {
    const { demandeId } = req.params;
    const { commentaire } = req.body;
    const adminId = req.user.id;

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ APPROBATION DEMANDE - DÉBUT');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const demandeResult = await query(
      `SELECT 
  r.id,
  r.user_id,
  r.request_type,
  r.account_type,
  u.email,
  u.first_name AS prenom
FROM requests r
JOIN users u ON r.user_id = u.id
WHERE r.id = $1`,
      [demandeId]
    );

    const demande = demandeResult.rows[0];

    if (!demande) {
      return res.status(404).json({
        succes: false,
        message: 'Demande non trouvée'
      });
    }

    console.log('Type de demande:', demande.request_type);
    console.log('User ID:', demande.user_id);

    await query(
      `UPDATE requests 
       SET status = 'approved',
           reviewed_by = $1,
           review_comment = $2,
           reviewed_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [adminId, commentaire || 'Approuvé', demandeId]
    );

    console.log('✅ Statut demande mis à jour');

    if (demande.request_type === 'account_opening') {
      console.log('\n💰 CRÉATION COMPTE ÉPARGNE...');
      
      const accountType = demande.account_type || 'savings';
      const compteResult = await query(
        `INSERT INTO accounts (user_id, account_type, balance)
         VALUES ($1, $2, 0.00)
         RETURNING id, account_number`,
        [demande.user_id, accountType]
      );

      const compte = compteResult.rows[0];
      console.log('✅ Compte épargne créé');
      console.log('  - ID:', compte.id);
      console.log('  - Numéro:', compte.account_number);
      console.log('  - Solde initial: 0.00$');
    }

    else if (demande.request_type === 'investment') {
      console.log('\n📈 CRÉATION COMPTE PLACEMENT...');
      
      const montantInitial = parseFloat(demande.requested_amount || 0);
      
      const compteResult = await query(
        `INSERT INTO accounts (user_id, account_type, balance)
         VALUES ($1, $2, $3)
         RETURNING id, account_number`,
        [demande.user_id, demande.account_type, montantInitial]
      );

      const compte = compteResult.rows[0];
      console.log('✅ Compte placement créé');
      console.log('  - ID:', compte.id);
      console.log('  - Type:', demande.account_type);
      console.log('  - Solde initial:', montantInitial + '$');

      if (montantInitial > 0) {
        await query(
          `INSERT INTO transactions (account_id, transaction_type, amount, balance_after, description)
           VALUES ($1, 'deposit', $2, $2, 'Dépôt initial - Ouverture compte placement')`,
          [compte.id, montantInitial]
        );
        console.log('✅ Transaction de dépôt initial créée');
      }
    }

    else if (demande.request_type === 'credit_card') {
      console.log('\n💳 CRÉATION CARTE DE CRÉDIT...');
      
      const compteResult = await query(
        'SELECT id FROM accounts WHERE user_id = $1 AND account_type = $2 LIMIT 1',
        [demande.user_id, 'checking']
      );

      if (compteResult.rows.length > 0) {
        const compteId = compteResult.rows[0].id;
        const limiteCredit = parseFloat(demande.requested_limit || 5000);
        
        const carteResult = await query(
          `INSERT INTO cards (
            account_id, 
            card_type, 
            expiry_date, 
            credit_limit, 
            available_credit,
            cvv
          )
           VALUES ($1, 'credit', DATE(NOW() + INTERVAL '4 years'), $2, $2, LPAD(FLOOR(RANDOM() * 1000)::TEXT, 3, '0'))
           RETURNING id, card_number, cvv, credit_limit`,
          [compteId, limiteCredit]
        );

        const carte = carteResult.rows[0];
        console.log('✅ Carte de crédit créée');
        console.log('  - ID:', carte.id);
        console.log('  - Numéro:', carte.card_number);
        console.log('  - Limite de crédit:', limiteCredit + '$');
        console.log('  - Crédit disponible:', limiteCredit + '$');
      } else {
        console.log('❌ Aucun compte chèques trouvé');
      }
    }

    else if (demande.request_type === 'loan') {
      console.log('\n💵 APPROBATION PRÊT PERSONNEL...');
      
      const montantPret = parseFloat(demande.requested_amount || 0);
      console.log('  - Montant:', montantPret + '$');
      console.log('  - Durée:', demande.duration_months, 'mois');
      
      const compteResult = await query(
        'SELECT id, balance FROM accounts WHERE user_id = $1 AND account_type = $2 LIMIT 1',
        [demande.user_id, 'checking']
      );

      if (compteResult.rows.length > 0) {
        const compte = compteResult.rows[0];
        const nouveauSolde = parseFloat(compte.balance) + montantPret;

        await query(
          'UPDATE accounts SET balance = $1 WHERE id = $2',
          [nouveauSolde, compte.id]
        );

        await query(
          `INSERT INTO transactions (account_id, transaction_type, amount, balance_after, description)
           VALUES ($1, 'loan_disbursement', $2, $3, $4)`,
          [compte.id, montantPret, nouveauSolde, `Décaissement prêt personnel - ${demande.duration_months} mois`]
        );

        console.log('✅ Prêt déposé dans le compte chèques');
        console.log('  - Nouveau solde:', nouveauSolde + '$');
      }
    }

    else if (demande.request_type === 'mortgage') {
      console.log('\n🏠 APPROBATION PRÊT HYPOTHÉCAIRE...');
      
      const montantHypothecaire = parseFloat(demande.requested_amount || 0);
      const valeurPropriete = parseFloat(demande.property_value || 0);
      
      console.log('  - Montant:', montantHypothecaire + '$');
      console.log('  - Valeur propriété:', valeurPropriete + '$');
      console.log('  ⚠️  Gestion complète dans Sprint 2');
    }
    if (!demande.user_id) {
  console.error('❌ ERREUR: user_id manquant dans la demande');
  return res.status(500).json({
    succes: false,
    message: "Erreur interne: utilisateur introuvable pour cette demande"
  });
}
    await notificationModel.creer({
      user_id: demande.user_id,
      type: 'request_approved',
      titre: 'Demande approuvée',
      message: `Votre demande de ${demande.request_type} a été approuvée !`,
      lien: '/mes-demandes.html'
    });

    await emailUtils.envoyerEmailDemandeApprouvee(
      demande.email,
      demande.prenom,
      demande.request_type
    );

    sendNotificationToUser(demande.user_id, {
      type: 'request_approved',
      titre: 'Demande approuvée',
      message: 'Votre demande a été approuvée !'
    });

    console.log('\n✅ APPROBATION TERMINÉE AVEC SUCCÈS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    res.json({
      succes: true,
      message: 'Demande approuvée avec succès'
    });
  } catch (error) {
    console.error('\n❌ ERREUR APPROBATION DEMANDE:', error);
    console.error('Stack:', error.stack);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    next(error);
  }
};

// Rejeter une demande
exports.rejeterDemande = async (req, res, next) => {
  try {
    const { demandeId } = req.params;
    const { raison } = req.body;
    const adminId = req.user.id;

    const demandeResult = await query(
      `SELECT r.*, u.email, u.first_name AS prenom 
       FROM requests r
       JOIN users u ON r.user_id = u.id
       WHERE r.id = $1`,
      [demandeId]
    );

    const demande = demandeResult.rows[0];

    await query(
      `UPDATE requests 
       SET status = 'rejected',
           reviewed_by = $1,
           review_comment = $2,
           reviewed_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [adminId, raison, demandeId]
    );

    await notificationModel.creer({
      utilisateurId: demande.user_id,
      type: 'request_rejected',
      titre: 'Demande refusée',
      message: `Votre demande a été refusée. Raison: ${raison}`,
      lien: '/mes-demandes.html'
    });

    await emailUtils.envoyerEmailDemandeRejetee(
      demande.email,
      demande.prenom,
      demande.request_type,
      raison
    );

    res.json({
      succes: true,
      message: 'Demande rejetée'
    });
  } catch (error) {
    console.error('Erreur rejet demande:', error);
    next(error);
  }
};

// Liste de tous les utilisateurs
exports.tousLesUtilisateurs = async (req, res, next) => {
  try {
    const utilisateurs = await query(
      `SELECT 
        id,
        email,
        first_name AS prenom,
        last_name AS nom,
        account_status AS statut_compte,
        annual_income AS revenu_annuel,
        created_at AS date_creation,
        approved_at AS date_approbation
      FROM users
      WHERE role = 'user'
      ORDER BY created_at DESC`
    );

    res.json({
      succes: true,
      utilisateurs: utilisateurs.rows
    });
  } catch (error) {
    console.error('Erreur liste utilisateurs:', error);
    next(error);
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// NOUVELLES FONCTIONS - BLOQUER/DÉBLOQUER UTILISATEUR
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Bloquer un compte utilisateur
exports.bloquerUtilisateur = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { raison } = req.body;

    // Vérifier que ce n'est pas un admin
    const user = await query(
      'SELECT role, email, first_name AS prenom FROM users WHERE id = $1',
      [userId]
    );

    if (!user.rows[0]) {
      return res.status(404).json({
        succes: false,
        message: 'Utilisateur non trouvé'
      });
    }

    if (user.rows[0].role === 'admin') {
      return res.status(403).json({
        succes: false,
        message: 'Impossible de bloquer un administrateur'
      });
    }

    // Bloquer le compte
    await query(
      `UPDATE users 
       SET account_status = 'suspended',
           locked_until = NULL,
           login_attempts = 0
       WHERE id = $1`,
      [userId]
    );

    // Créer notification
    await notificationModel.creer({
      user_id: userId,
      type: 'account_suspended',
      titre: 'Compte suspendu',
      message: `Votre compte a été suspendu par un administrateur. Raison: ${raison}`,
      lien: null
    });

    res.json({
      succes: true,
      message: 'Compte utilisateur bloqué avec succès'
    });
  } catch (error) {
    console.error('Erreur blocage utilisateur:', error);
    next(error);
  }
};

// Débloquer un compte utilisateur
exports.debloquerUtilisateur = async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Récupérer l'utilisateur
    const user = await query(
      'SELECT email, first_name AS prenom, account_status FROM users WHERE id = $1',
      [userId]
    );

    if (!user.rows[0]) {
      return res.status(404).json({
        succes: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Débloquer le compte
    await query(
      `UPDATE users 
       SET account_status = 'active',
           locked_until = NULL,
           login_attempts = 0
       WHERE id = $1`,
      [userId]
    );

    // Créer notification
    await notificationModel.creer({
      user_id: userId,
      type: 'account_reactivated',
      titre: 'Compte réactivé',
      message: 'Votre compte a été réactivé par un administrateur. Vous pouvez maintenant vous reconnecter.',
      lien: '/tableau-bord.html'
    });

    res.json({
      succes: true,
      message: 'Compte utilisateur débloqué avec succès'
    });
  } catch (error) {
    console.error('Erreur déblocage utilisateur:', error);
    next(error);
  }
};