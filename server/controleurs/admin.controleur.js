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

// Approuve l'inscription d'un utilisateur en attente.
// Change le statut du compte à "active", crée un compte chèques avec 5$ de dépôt de bienvenue,
// génère automatiquement une carte de débit, puis notifie l'utilisateur par email et WebSocket.
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
    const compteResult = await query(
      `INSERT INTO accounts (user_id, account_type, balance)
       VALUES ($1, 'checking', 5.00)
       RETURNING id, account_number`,
      [userId]
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
      utilisateurId: userId,
      type: 'request_approved',
      titre: 'Compte approuvé',
      message: 'Félicitations ! Votre compte Fortivia Bank a été approuvé. Un compte chèques avec une carte de débit a été créé pour vous.',
      lien: '/tableau-bord.html'
    });
    console.log('✅ Notification créée');
    // Envoyer email (ne pas bloquer si erreur)
      try {
        await emailUtils.envoyerEmailDemandeApprouvee(
          demande.email,
          demande.prenom,
          demande.request_type
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

// Rejette la demande d'inscription d'un utilisateur.
// Met le statut à "rejected", envoie une notification et un email avec la raison du refus.
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
      utilisateurId: userId,
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
        r.requested_amount AS montant_demande,
        r.duration_months AS duree_mois,
        r.property_value AS valeur_propriete,
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

// Approuve une demande de service (ouverture de compte, placement, carte de crédit, prêt, hypothèque).
// Selon le type de demande, crée les ressources correspondantes en base de données
// (compte épargne, carte de crédit, dépôt de prêt, etc.) et notifie l'utilisateur.
exports.approuverDemande = async (req, res, next) => {
  try {
    const { demandeId } = req.params;
    const { commentaire } = req.body;
    const adminId = req.user.id;

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ APPROBATION DEMANDE - DÉBUT');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const demandeResult = await query(
      `SELECT r.*, u.email, u.first_name AS prenom 
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
      
      const compteResult = await query(
        `INSERT INTO accounts (user_id, account_type, balance)
         VALUES ($1, $2, 0.00)
         RETURNING id, account_number`,
        [demande.user_id, demande.account_type]
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
           VALUES ($1, 'deposit', $2, $3, $4)`,
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

    await notificationModel.creer({
      utilisateurId: demande.user_id,
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

// Rejette une demande de service avec une raison fournie par l'admin.
// Met le statut à "rejected" et notifie l'utilisateur par notification interne et email.
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

    const labelTypeAdmin = demande.request_type === 'loan'
      ? (demande.property_value ? 'prêt hypothécaire' : 'prêt personnel')
      : { account_opening: 'ouverture de compte', credit_card: 'carte de crédit', service: 'service' }[demande.request_type] || demande.request_type;
    const montantAdmin = demande.requested_amount
      ? ` de ${Number(demande.requested_amount).toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' })}`
      : '';
    await notificationModel.creer({
      utilisateurId: demande.user_id,
      type: 'request_rejected',
      titre: 'Demande refusée',
      message: `Votre demande de ${labelTypeAdmin}${montantAdmin} a été refusée. Raison: ${raison}`,
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

// Suspend un compte utilisateur (ne peut pas suspendre un admin).
// Passe le statut à "suspended" et crée une notification pour l'utilisateur avec la raison.
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
      utilisateurId: userId,
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

// Réactive un compte utilisateur suspendu.
// Passe le statut à "active", réinitialise les tentatives de connexion et notifie l'utilisateur.
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
      utilisateurId: userId,
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

// Retourne toutes les transactions en attente d'approbation (dépôts et retraits),
// avec les informations du compte et de l'utilisateur associé.
exports.transactionsPending = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT t.id, t.transaction_type AS type, t.amount AS montant, t.description,
              t.created_at AS date, a.account_number AS numero_compte,
              a.account_type AS type_compte, a.balance AS solde_actuel,
              u.first_name AS prenom, u.last_name AS nom, u.email, u.id AS user_id
       FROM transactions t
       JOIN accounts a ON t.account_id = a.id
       JOIN users u ON a.user_id = u.id
       WHERE t.status = 'pending'
       ORDER BY t.created_at ASC`
    );
    res.json({ succes: true, transactions: result.rows });
  } catch (error) {
    console.error('Erreur transactions pending:', error);
    next(error);
  }
};

// Approuve un dépôt en attente : crédite le montant sur le compte de l'utilisateur,
// met la transaction à "completed" et envoie une notification à l'utilisateur.
exports.approuverDepot = async (req, res, next) => {
  try {
    const { transactionId } = req.params;
    const adminId = req.user.id;

    const txnRes = await query(
      `SELECT t.*, a.balance AS solde_actuel, a.id AS compte_id, a.user_id
       FROM transactions t
       JOIN accounts a ON t.account_id = a.id
       WHERE t.id = $1 AND t.status = 'pending' AND t.transaction_type = 'deposit'`,
      [transactionId]
    );
    if (!txnRes.rows[0]) return res.status(404).json({ succes: false, message: 'Transaction introuvable.' });

    const txn = txnRes.rows[0];
    const newSolde = parseFloat(txn.solde_actuel) + parseFloat(txn.amount);

    // Mettre à jour le solde
    await query('UPDATE accounts SET balance = $1, updated_at = NOW() WHERE id = $2', [newSolde, txn.compte_id]);

    // Mettre à jour la transaction
    await query(
      `UPDATE transactions SET status = 'completed', balance_after = $1, approved_by = $2, approved_at = NOW() WHERE id = $3`,
      [newSolde, adminId, transactionId]
    );

    await notificationModel.creer({
      utilisateurId: txn.user_id,
      type: 'deposit_approved',
      titre: 'Dépôt approuvé',
      message: `Votre dépôt de ${parseFloat(txn.amount).toFixed(2)} $ a été approuvé et crédité sur votre compte.`,
      lien: '/tableau-bord.html'
    });

    res.json({ succes: true, message: 'Dépôt approuvé avec succès.' });
  } catch (error) {
    console.error('Erreur approbation dépôt:', error);
    next(error);
  }
};

// Refuse un dépôt en attente : passe la transaction à "cancelled"
// et notifie l'utilisateur avec la raison du refus.
exports.rejeterDepot = async (req, res, next) => {
  try {
    const { transactionId } = req.params;
    const { raison } = req.body;
    const adminId = req.user.id;

    const txnRes = await query(
      `SELECT t.*, a.user_id FROM transactions t
       JOIN accounts a ON t.account_id = a.id
       WHERE t.id = $1 AND t.status = 'pending' AND t.transaction_type = 'deposit'`,
      [transactionId]
    );
    if (!txnRes.rows[0]) return res.status(404).json({ succes: false, message: 'Transaction introuvable.' });

    const txn = txnRes.rows[0];
    await query(
      `UPDATE transactions SET status = 'cancelled', approved_by = $1, approved_at = NOW() WHERE id = $2`,
      [adminId, transactionId]
    );

    await notificationModel.creer({
      utilisateurId: txn.user_id,
      type: 'deposit_rejected',
      titre: 'Dépôt refusé',
      message: `Votre dépôt de ${parseFloat(txn.amount).toFixed(2)} $ a été refusé.${raison ? ' Raison : ' + raison : ''}`,
      lien: '/tableau-bord.html'
    });

    res.json({ succes: true, message: 'Dépôt refusé.' });
  } catch (error) {
    console.error('Erreur rejet dépôt:', error);
    next(error);
  }
};

// Approuve un retrait en attente : vérifie que le solde est suffisant,
// déduit le montant du compte, met la transaction à "completed" et notifie l'utilisateur.
exports.approuverRetrait = async (req, res, next) => {
  try {
    const { transactionId } = req.params;
    const adminId = req.user.id;

    const txnRes = await query(
      `SELECT t.*, a.balance AS solde_actuel, a.id AS compte_id, a.user_id
       FROM transactions t
       JOIN accounts a ON t.account_id = a.id
       WHERE t.id = $1 AND t.status = 'pending' AND t.transaction_type = 'withdrawal'`,
      [transactionId]
    );
    if (!txnRes.rows[0]) return res.status(404).json({ succes: false, message: 'Transaction introuvable.' });

    const txn = txnRes.rows[0];
    if (parseFloat(txn.solde_actuel) < parseFloat(txn.amount)) {
      return res.status(400).json({ succes: false, message: 'Solde insuffisant pour effectuer le retrait.' });
    }

    const newSolde = parseFloat(txn.solde_actuel) - parseFloat(txn.amount);
    await query('UPDATE accounts SET balance = $1, updated_at = NOW() WHERE id = $2', [newSolde, txn.compte_id]);
    await query(
      `UPDATE transactions SET status = 'completed', balance_after = $1, approved_by = $2, approved_at = NOW() WHERE id = $3`,
      [newSolde, adminId, transactionId]
    );

    await notificationModel.creer({
      utilisateurId: txn.user_id,
      type: 'withdrawal_approved',
      titre: 'Retrait approuvé',
      message: `Votre retrait de ${parseFloat(txn.amount).toFixed(2)} $ a été approuvé et débité de votre compte.`,
      lien: '/tableau-bord.html'
    });

    res.json({ succes: true, message: 'Retrait approuvé avec succès.' });
  } catch (error) {
    console.error('Erreur approbation retrait:', error);
    next(error);
  }
};

// Refuse un retrait en attente : passe la transaction à "cancelled"
// sans débiter le compte, et notifie l'utilisateur avec la raison.
exports.rejeterRetrait = async (req, res, next) => {
  try {
    const { transactionId } = req.params;
    const { raison } = req.body;
    const adminId = req.user.id;

    const txnRes = await query(
      `SELECT t.*, a.user_id FROM transactions t
       JOIN accounts a ON t.account_id = a.id
       WHERE t.id = $1 AND t.status = 'pending' AND t.transaction_type = 'withdrawal'`,
      [transactionId]
    );
    if (!txnRes.rows[0]) return res.status(404).json({ succes: false, message: 'Transaction introuvable.' });

    const txn = txnRes.rows[0];
    await query(
      `UPDATE transactions SET status = 'cancelled', approved_by = $1, approved_at = NOW() WHERE id = $2`,
      [adminId, transactionId]
    );

    await notificationModel.creer({
      utilisateurId: txn.user_id,
      type: 'withdrawal_rejected',
      titre: 'Retrait refusé',
      message: `Votre retrait de ${parseFloat(txn.amount).toFixed(2)} $ a été refusé.${raison ? ' Raison : ' + raison : ''}`,
      lien: '/tableau-bord.html'
    });

    res.json({ succes: true, message: 'Retrait refusé.' });
  } catch (error) {
    console.error('Erreur rejet retrait:', error);
    next(error);
  }
};

// Supprimer un utilisateur et toutes ses données associées
exports.supprimerUtilisateur = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const adminId = req.user.id;

    if (parseInt(userId) === adminId) {
      return res.status(400).json({ succes: false, message: 'Impossible de supprimer votre propre compte.' });
    }

    const userRes = await query('SELECT id, email, role FROM users WHERE id = $1', [userId]);
    if (!userRes.rows[0]) return res.status(404).json({ succes: false, message: 'Utilisateur introuvable.' });
    if (userRes.rows[0].role === 'admin') return res.status(400).json({ succes: false, message: 'Impossible de supprimer un compte admin.' });

    // ── Suppression complète en cascade (12 tables) ────────────────────────
    const uid = userId;
    const acctSub = `(SELECT id FROM accounts WHERE user_id = ${uid})`;

    // Nullifier les colonnes qui pointent vers cet utilisateur sans CASCADE
    // (dans d'autres tables que celles de l'utilisateur)
    await query(`UPDATE transactions SET approved_by = NULL WHERE approved_by = $1`, [uid]);
    await query(`UPDATE requests      SET reviewed_by = NULL WHERE reviewed_by = $1`, [uid]);
    await query(`UPDATE users         SET approved_by = NULL WHERE approved_by = $1`, [uid]);

    // 1. bill_payments (→ users, accounts, transactions, providers)
    //    enterprise_transaction_id sur bill_payments pointe vers transactions
    await query(`DELETE FROM bill_payments WHERE user_id = $1`, [uid]);
    await query(`DELETE FROM bill_payments WHERE from_account_id IN ${acctSub}`);

    // 2. scheduled_payments (→ users, accounts, providers, to_user_id)
    await query(`DELETE FROM scheduled_payments WHERE user_id = $1 OR to_user_id = $1`, [uid]);
    await query(`DELETE FROM scheduled_payments WHERE from_account_id IN ${acctSub}`);

    // 3. interac_transfers (→ users, accounts)
    await query(`DELETE FROM interac_transfers WHERE sender_id = $1 OR recipient_id = $1`, [uid]);
    await query(`DELETE FROM interac_transfers WHERE sender_account_id IN ${acctSub} OR deposit_account_id IN ${acctSub}`);

    // 4. providers — nullifier enterprise_account_id (pas enterprise_transaction_id, qui est sur bill_payments)
    await query(`UPDATE providers SET enterprise_account_id = NULL WHERE enterprise_account_id IN ${acctSub}`);

    // 5. beneficiaries (→ users, CASCADE mais on reste explicite)
    await query(`DELETE FROM beneficiaries      WHERE user_id = $1`, [uid]);

    // 6. notifications, verification_codes, requests (→ users, CASCADE)
    await query(`DELETE FROM notifications      WHERE user_id = $1`, [uid]);
    await query(`DELETE FROM verification_codes WHERE user_id = $1`, [uid]);
    await query(`DELETE FROM requests           WHERE user_id = $1`, [uid]);

    // 7. transactions et cards (→ accounts, CASCADE — mais on reste explicite)
    await query(`DELETE FROM transactions WHERE account_id IN ${acctSub}`);
    await query(`DELETE FROM cards        WHERE account_id IN ${acctSub}`);

    // 8. accounts (→ users, CASCADE)
    await query(`DELETE FROM accounts WHERE user_id = $1`, [uid]);

    // 9. users
    await query(`DELETE FROM users WHERE id = $1`, [uid]);

    res.json({ succes: true, message: `Compte supprimé avec succès.` });
  } catch (error) {
    console.error('Erreur suppression utilisateur:', error);
    next(error);
  }
};

// Retourne toutes les transactions avec filtres optionnels
exports.toutesTransactions = async (req, res, next) => {
  try {
    const { statut, type, recherche, limite = 100 } = req.query;
    let conditions = [];
    let params = [];
    let i = 1;

    if (statut) { conditions.push(`t.status = $${i++}`); params.push(statut); }
    if (type)   { conditions.push(`t.transaction_type = $${i++}`); params.push(type); }
    if (recherche) {
      conditions.push(`(u.first_name ILIKE $${i} OR u.last_name ILIKE $${i} OR u.email ILIKE $${i} OR a.account_number ILIKE $${i})`);
      params.push(`%${recherche}%`); i++;
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    params.push(parseInt(limite));

    const result = await query(
      `SELECT t.id, t.transaction_type AS type, t.amount AS montant, t.description,
              t.status AS statut, t.created_at AS date, t.balance_after AS solde_apres,
              a.account_number AS numero_compte, a.account_type AS type_compte,
              u.first_name AS prenom, u.last_name AS nom, u.email, u.id AS user_id
       FROM transactions t
       JOIN accounts a ON t.account_id = a.id
       JOIN users u ON a.user_id = u.id
       ${where}
       ORDER BY t.created_at DESC
       LIMIT $${i}`,
      params
    );
    res.json({ succes: true, transactions: result.rows });
  } catch (error) { next(error); }
};

// Annuler/inverser une transaction complétée
exports.annulerTransaction = async (req, res, next) => {
  try {
    const { transactionId } = req.params;
    const adminId = req.user.id;

    const txnRes = await query(
      `SELECT t.*, a.balance AS solde_actuel, a.id AS compte_id, a.user_id
       FROM transactions t JOIN accounts a ON t.account_id = a.id
       WHERE t.id = $1`,
      [transactionId]
    );
    if (!txnRes.rows[0]) return res.status(404).json({ succes: false, message: 'Transaction introuvable.' });

    const txn = txnRes.rows[0];
    if (txn.status === 'cancelled') return res.status(400).json({ succes: false, message: 'Transaction déjà annulée.' });

    // Inverser l'effet sur le solde
    let newSolde = parseFloat(txn.solde_actuel);
    const montant = parseFloat(txn.amount);
    const typeCredit = ['deposit', 'transfer'].includes(txn.transaction_type);
    newSolde = typeCredit ? newSolde - montant : newSolde + montant;

    await query('UPDATE accounts SET balance = $1, updated_at = NOW() WHERE id = $2', [newSolde, txn.compte_id]);
    await query(`UPDATE transactions SET status = 'cancelled', approved_by = $1, approved_at = NOW() WHERE id = $2`, [adminId, transactionId]);
    await query(
      `INSERT INTO transactions (account_id, transaction_type, amount, balance_after, description, status)
       VALUES ($1, $2, $3, $4, $5, 'completed')`,
      [txn.compte_id, typeCredit ? 'withdrawal' : 'deposit', montant, newSolde,
       `Annulation admin - Transaction #${transactionId}`]
    );

    // Si le compte est lié à une carte de crédit, remettre le crédit disponible
    const carteRes = await query(
      `SELECT id, available_credit FROM cards WHERE account_id = $1 AND card_type = 'credit'`,
      [txn.compte_id]
    );
    if (carteRes.rows[0]) {
      const carte = carteRes.rows[0];
      // Annulation d'un paiement (débit) → on rend le crédit ; annulation d'un dépôt → on retire
      const newCredit = typeCredit
        ? parseFloat(carte.available_credit) - montant
        : parseFloat(carte.available_credit) + montant;
      await query('UPDATE cards SET available_credit = $1 WHERE id = $2', [newCredit, carte.id]);
    }

    res.json({ succes: true, message: `Transaction #${transactionId} annulée et solde corrigé.` });
  } catch (error) { next(error); }
};

// Retourne la liste de tous les comptes entreprise actifs avec le nom de l'entreprise,
// l'email et le fournisseur associé si disponible.
exports.comptesEntreprise = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT a.id, a.account_number AS numero_compte, a.balance AS solde,
              u.first_name AS nom_entreprise, u.email,
              p.name AS fournisseur
       FROM accounts a
       JOIN users u ON a.user_id = u.id
       LEFT JOIN providers p ON p.enterprise_account_id = a.id
       WHERE a.account_type = 'enterprise' AND a.status = 'active'
       ORDER BY u.first_name`
    );
    res.json({ succes: true, comptes: result.rows });
  } catch (error) { next(error); }
};

// ─── Détail complet d'un utilisateur ────────────────────────────────────────
exports.detailUtilisateur = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const userRes = await query(
      `SELECT id, email, first_name AS prenom, last_name AS nom,
              phone AS telephone, address AS adresse,
              account_status AS statut_compte, annual_income AS revenu_annuel,
              status AS statut_professionnel, residence_type AS type_residence,
              date_of_birth AS date_naissance, role,
              created_at AS date_creation, approved_at AS date_approbation
       FROM users WHERE id = $1`, [userId]
    );
    if (!userRes.rows[0]) return res.status(404).json({ succes: false, message: 'Utilisateur introuvable.' });

    const comptesRes = await query(
      `SELECT id, account_number AS numero_compte, account_type AS type_compte,
              balance AS solde, status AS statut, credit_limit AS limite_credit
       FROM accounts WHERE user_id = $1 ORDER BY created_at`, [userId]
    );

    res.json({ succes: true, utilisateur: userRes.rows[0], comptes: comptesRes.rows });
  } catch (error) { next(error); }
};

// ─── Transactions d'un utilisateur ──────────────────────────────────────────
exports.transactionsUtilisateur = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const txRes = await query(
      `SELECT t.id, t.transaction_type AS type, t.amount AS montant,
              t.description, t.status AS statut,
              t.created_at AS date, t.balance_after AS solde_apres,
              a.account_number AS numero_compte, a.account_type AS type_compte
       FROM transactions t
       JOIN accounts a ON t.account_id = a.id
       WHERE a.user_id = $1
       ORDER BY t.created_at DESC LIMIT 300`, [userId]
    );

    // Virements Interac envoyés (avec nom/email destinataire)
    const interacRes = await query(
      `SELECT it.id, it.amount AS montant, it.status AS statut,
              it.created_at AS date, it.recipient_email,
              it.message,
              COALESCE(u.first_name || ' ' || u.last_name, NULL) AS nom_destinataire,
              a.account_number AS numero_compte
       FROM interac_transfers it
       JOIN accounts a ON it.sender_account_id = a.id
       LEFT JOIN users u ON it.recipient_id = u.id
       WHERE it.sender_id = $1
       ORDER BY it.created_at DESC`, [userId]
    );

    res.json({ succes: true, transactions: txRes.rows, interac_envoyes: interacRes.rows });
  } catch (error) { next(error); }
};

// ─── Modifier les informations d'un utilisateur ─────────────────────────────
exports.modifierUtilisateur = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { prenom, nom, telephone, adresse, revenu_annuel, statut_professionnel, type_residence } = req.body;

    const userBefore = await query('SELECT first_name, last_name FROM users WHERE id = $1', [userId]);
    if (!userBefore.rows[0]) return res.status(404).json({ succes: false, message: 'Utilisateur introuvable.' });

    await query(
      `UPDATE users SET
         first_name     = COALESCE($1, first_name),
         last_name      = COALESCE($2, last_name),
         phone          = COALESCE($3, phone),
         address        = COALESCE($4, address),
         annual_income  = COALESCE($5, annual_income),
         status         = COALESCE($6, status),
         residence_type = COALESCE($7, residence_type),
         updated_at     = NOW()
       WHERE id = $8`,
      [prenom || null, nom || null, telephone || null, adresse || null,
       revenu_annuel || null, statut_professionnel || null, type_residence || null, userId]
    );

    // Log comme notification interne
    await notificationModel.creer({
      utilisateurId: parseInt(userId),
      type: 'profile_update',
      message: 'Vos informations personnelles ont été mises à jour par un administrateur.'
    });

    res.json({ succes: true, message: 'Informations mises à jour.' });
  } catch (error) { next(error); }
};

// ─── Reset du mot de passe par l'admin ──────────────────────────────────────
exports.resetPassword = async (req, res, next) => {
  try {
    const bcrypt = require('bcrypt');
    const { userId } = req.params;

    const userRes = await query('SELECT email, first_name AS prenom FROM users WHERE id = $1', [userId]);
    if (!userRes.rows[0]) return res.status(404).json({ succes: false, message: 'Utilisateur introuvable.' });
    const { email, prenom } = userRes.rows[0];

    // Générer un mot de passe temporaire
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let tempPassword = '';
    for (let i = 0; i < 10; i++) tempPassword += chars[Math.floor(Math.random() * chars.length)];

    const hash = await bcrypt.hash(tempPassword, 10);
    await query('UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2', [hash, userId]);

    // Notification interne
    await notificationModel.creer({
      utilisateurId: parseInt(userId),
      type: 'security_alert',
      message: 'Votre mot de passe a été réinitialisé par un administrateur. Consultez votre email.'
    });

    await emailUtils.envoyerCode2FA(email, prenom, tempPassword);

    res.json({ succes: true, message: `Mot de passe réinitialisé. Email envoyé à ${email}.`, tempPassword });
  } catch (error) { next(error); }
};

// ─── Virements Interac en attente (admin) ────────────────────────────────────
exports.interacPending = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT it.id, it.amount, it.status, it.created_at, it.expires_at,
              it.recipient_email, it.message,
              u.first_name || ' ' || u.last_name AS expediteur,
              a.account_number AS compte_expediteur,
              COALESCE(ur.first_name || ' ' || ur.last_name, NULL) AS destinataire
       FROM interac_transfers it
       JOIN users u ON it.sender_id = u.id
       JOIN accounts a ON it.sender_account_id = a.id
       LEFT JOIN users ur ON it.recipient_id = ur.id
       WHERE it.status = 'pending'
       ORDER BY it.created_at DESC`
    );
    res.json({ succes: true, virements: result.rows });
  } catch (error) { next(error); }
};

// ─── Annuler un virement Interac (admin) ─────────────────────────────────────
exports.annulerInteracAdmin = async (req, res, next) => {
  try {
    const { interacId } = req.params;
    const interacRes = await query(
      `SELECT id, amount, sender_account_id, sender_id, status
       FROM interac_transfers WHERE id = $1`,
      [interacId]
    );
    if (!interacRes.rows[0]) return res.status(404).json({ succes: false, message: 'Virement introuvable.' });
    const it = interacRes.rows[0];
    if (it.status !== 'pending') return res.status(400).json({ succes: false, message: 'Ce virement ne peut plus être annulé.' });

    const compteRes = await query('SELECT balance FROM accounts WHERE id = $1', [it.sender_account_id]);
    const newSolde = parseFloat(compteRes.rows[0].balance) + parseFloat(it.amount);
    await query('UPDATE accounts SET balance = $1, updated_at = NOW() WHERE id = $2', [newSolde, it.sender_account_id]);
    await query(
      `INSERT INTO transactions (account_id, transaction_type, amount, balance_after, description, status)
       VALUES ($1, 'transfer', $2, $3, 'Annulation virement Interac par admin — remboursement', 'completed')`,
      [it.sender_account_id, it.amount, newSolde]
    );
    await query(`UPDATE interac_transfers SET status = 'cancelled' WHERE id = $1`, [interacId]);

    await notificationModel.creer({
      utilisateurId: it.sender_id,
      type: 'transfer_completed',
      titre: 'Virement Interac annulé',
      message: `Votre virement Interac de ${parseFloat(it.amount).toFixed(2)} $ a été annulé par un administrateur. Le montant a été remboursé.`,
      lien: '/virement-interac.html'
    });

    res.json({ succes: true, message: 'Virement annulé et montant remboursé.' });
  } catch (error) { next(error); }
};

// ─── Paiements planifiés (admin) ─────────────────────────────────────────────
exports.paiementsPlanifies = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT sp.id, sp.amount AS montant, sp.frequency AS frequence,
              sp.next_execution_date AS prochaine_execution, sp.end_date AS date_fin,
              sp.description, sp.is_active AS actif, sp.created_at,
              u.first_name || ' ' || u.last_name AS client,
              u.email AS email_client,
              a.account_number AS compte_source,
              p.name AS fournisseur,
              sp.to_account_number AS compte_destinataire
       FROM scheduled_payments sp
       JOIN users u ON sp.user_id = u.id
       JOIN accounts a ON sp.from_account_id = a.id
       LEFT JOIN providers p ON sp.provider_id = p.id
       WHERE sp.is_active = true
       ORDER BY sp.created_at DESC`
    );
    res.json({ succes: true, paiements: result.rows });
  } catch (error) { next(error); }
};
