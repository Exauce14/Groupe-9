const { query } = require('../config/baseDeDonnees');
const notificationModel = require('../modeles/notification.modele');
const { sendNotificationToAdmin } = require('../utilitaires/websocket');

// Frais de retrait de crédit : max(3% du montant, 3.50$) — standard banques canadiennes
function calculerFraisCredit(montant) {
  return Math.max(montant * 0.03, 3.50);
}

// Effectue un virement immédiat entre deux comptes appartenant au même utilisateur.
// Si le compte source est de type crédit, applique des frais d'avance de fonds (3%, min 3.50$).
exports.virementInterne = async (req, res, next) => {
  try {
    const utilisateurId = req.user.id;
    const { compteSourceId, compteDestinationId, montant, description } = req.body;

    if (!compteSourceId || !compteDestinationId || !montant || montant <= 0) {
      return res.status(400).json({ succes: false, message: 'Paramètres invalides.' });
    }
    if (compteSourceId === compteDestinationId) {
      return res.status(400).json({ succes: false, message: 'Les comptes source et destination doivent être différents.' });
    }

    // Vérifier propriété des comptes
    const comptesRes = await query(
      `SELECT id, account_type AS type, balance AS solde, status AS statut
       FROM accounts WHERE id = ANY($1::int[]) AND user_id = $2`,
      [[compteSourceId, compteDestinationId], utilisateurId]
    );
    if (comptesRes.rows.length !== 2) {
      return res.status(403).json({ succes: false, message: 'Comptes invalides ou non autorisés.' });
    }

    const source = comptesRes.rows.find(c => c.id === compteSourceId);
    const destination = comptesRes.rows.find(c => c.id === compteDestinationId);

    if (source.statut !== 'active' || destination.statut !== 'active') {
      return res.status(400).json({ succes: false, message: 'Les deux comptes doivent être actifs.' });
    }

    // Calcul des frais
    let frais = 0;
    if (source.type === 'credit') {
      frais = calculerFraisCredit(montant);
    }

    const totalDebit = montant + frais;

    // Vérifier solde source
    if (source.type !== 'credit' && parseFloat(source.solde) < totalDebit) {
      return res.status(400).json({ succes: false, message: 'Solde insuffisant.' });
    }
    if (source.type === 'credit') {
      const creditRes = await query(
        'SELECT credit_limit, balance FROM accounts WHERE id = $1',
        [compteSourceId]
      );
      const limite = parseFloat(creditRes.rows[0].credit_limit || 0);
      const soldeCredit = parseFloat(creditRes.rows[0].balance || 0);
      // Le solde crédit est négatif, disponible = limite + solde
      if ((limite + soldeCredit) < totalDebit) {
        return res.status(400).json({ succes: false, message: 'Crédit disponible insuffisant.' });
      }
    }

    // Débit du compte source
    const newSoldeSource = parseFloat(source.solde) - totalDebit;
    await query('UPDATE accounts SET balance = $1, updated_at = NOW() WHERE id = $2', [newSoldeSource, compteSourceId]);
    await query(
      `INSERT INTO transactions (account_id, transaction_type, amount, balance_after, description, status)
       VALUES ($1, 'transfer', $2, $3, $4, 'completed')`,
      [compteSourceId, montant, newSoldeSource, description || `Virement vers compte ${destination.type}`]
    );

    // Frais si applicable
    if (frais > 0) {
      const soldeApresFrais = newSoldeSource;
      await query(
        `INSERT INTO transactions (account_id, transaction_type, amount, balance_after, description, status)
         VALUES ($1, 'fee', $2, $3, $4, 'completed')`,
        [compteSourceId, frais, soldeApresFrais, 'Frais avance de fonds (3%, min $3.50)']
      );
    }

    // Crédit du compte destination
    const newSoldeDestination = parseFloat(destination.solde) + montant;
    await query('UPDATE accounts SET balance = $1, updated_at = NOW() WHERE id = $2', [newSoldeDestination, compteDestinationId]);
    await query(
      `INSERT INTO transactions (account_id, transaction_type, amount, balance_after, description, status)
       VALUES ($1, 'transfer', $2, $3, $4, 'completed')`,
      [compteDestinationId, montant, newSoldeDestination, description || `Virement reçu depuis compte ${source.type}`]
    );

    const typeLabels = { checking: 'chèques', savings: 'épargne', credit: 'crédit', investment: 'placement' };
    const msgFrais = frais > 0 ? ` (frais avance de fonds : ${frais.toFixed(2)} $)` : '';

    await notificationModel.creer({
      utilisateurId,
      type: 'transfer_completed',
      titre: 'Virement effectué',
      message: `Virement de ${montant.toFixed(2)} $ de votre compte ${typeLabels[source.type] || source.type} vers votre compte ${typeLabels[destination.type] || destination.type} effectué avec succès.${msgFrais}`,
      lien: '/tableau-bord.html'
    });

    res.json({
      succes: true,
      message: 'Virement effectué avec succès.',
      frais: frais > 0 ? frais : undefined
    });
  } catch (error) {
    console.error('Erreur virement interne:', error);
    next(error);
  }
};

// Soumet une demande de dépôt qui nécessite l'approbation d'un administrateur.
// Crée la transaction avec le statut "pending" et notifie l'admin via WebSocket.
exports.creerDepot = async (req, res, next) => {
  try {
    const utilisateurId = req.user.id;
    const { compteId, montant, description } = req.body;

    if (!compteId || !montant || montant < 1) {
      return res.status(400).json({ succes: false, message: 'Montant minimum : 1$.' });
    }

    const compteRes = await query(
      `SELECT id, account_type AS type, balance AS solde, account_number AS numero, status AS statut
       FROM accounts WHERE id = $1 AND user_id = $2`,
      [compteId, utilisateurId]
    );
    if (!compteRes.rows[0]) return res.status(404).json({ succes: false, message: 'Compte introuvable.' });

    const compte = compteRes.rows[0];
    if (compte.statut !== 'active') return res.status(400).json({ succes: false, message: 'Compte inactif.' });
    if (!['checking', 'savings'].includes(compte.type)) {
      return res.status(400).json({ succes: false, message: 'Dépôt uniquement dans un compte chèques ou épargne.' });
    }

    // Créer transaction en pending
    const txnRes = await query(
      `INSERT INTO transactions (account_id, transaction_type, amount, balance_after, description, status)
       VALUES ($1, 'deposit', $2, $3, $4, 'pending')
       RETURNING id`,
      [compteId, montant, compte.solde, description || 'Dépôt en attente d\'approbation']
    );

    await notificationModel.creer({
      utilisateurId,
      type: 'deposit_pending',
      titre: 'Dépôt soumis',
      message: `Votre dépôt de ${parseFloat(montant).toFixed(2)} $ est en attente d'approbation par un administrateur.`,
      lien: '/tableau-bord.html'
    });

    sendNotificationToAdmin({
      type: 'new_deposit',
      message: `Nouveau dépôt de ${parseFloat(montant).toFixed(2)} $ en attente d'approbation.`,
      userId: utilisateurId,
      transactionId: txnRes.rows[0].id
    });

    res.status(201).json({ succes: true, message: 'Dépôt soumis. En attente d\'approbation administrateur.', transactionId: txnRes.rows[0].id });
  } catch (error) {
    console.error('Erreur création dépôt:', error);
    next(error);
  }
};

// Soumet une demande de retrait qui nécessite l'approbation d'un administrateur.
// Vérifie que le solde est suffisant, crée la transaction en "pending" et notifie l'admin.
exports.creerRetrait = async (req, res, next) => {
  try {
    const utilisateurId = req.user.id;
    const { compteId, montant, description } = req.body;

    if (!compteId || !montant || montant < 1) {
      return res.status(400).json({ succes: false, message: 'Montant minimum : 1$.' });
    }

    const compteRes = await query(
      `SELECT id, account_type AS type, balance AS solde, account_number AS numero, status AS statut
       FROM accounts WHERE id = $1 AND user_id = $2`,
      [compteId, utilisateurId]
    );
    if (!compteRes.rows[0]) return res.status(404).json({ succes: false, message: 'Compte introuvable.' });

    const compte = compteRes.rows[0];
    if (compte.statut !== 'active') return res.status(400).json({ succes: false, message: 'Compte inactif.' });
    if (!['checking', 'savings'].includes(compte.type)) {
      return res.status(400).json({ succes: false, message: 'Retrait uniquement depuis un compte chèques ou épargne.' });
    }
    if (parseFloat(compte.solde) < montant) {
      return res.status(400).json({ succes: false, message: 'Solde insuffisant.' });
    }

    // Créer transaction en pending (on bloque le montant en réservant)
    const txnRes = await query(
      `INSERT INTO transactions (account_id, transaction_type, amount, balance_after, description, status)
       VALUES ($1, 'withdrawal', $2, $3, $4, 'pending')
       RETURNING id`,
      [compteId, montant, parseFloat(compte.solde) - montant, description || 'Retrait en attente d\'approbation']
    );

    await notificationModel.creer({
      utilisateurId,
      type: 'withdrawal_pending',
      titre: 'Retrait soumis',
      message: `Votre retrait de ${parseFloat(montant).toFixed(2)} $ est en attente d'approbation par un administrateur.`,
      lien: '/tableau-bord.html'
    });

    sendNotificationToAdmin({
      type: 'new_withdrawal',
      message: `Nouveau retrait de ${parseFloat(montant).toFixed(2)} $ en attente d'approbation.`,
      userId: utilisateurId,
      transactionId: txnRes.rows[0].id
    });

    res.status(201).json({ succes: true, message: 'Retrait soumis. En attente d\'approbation administrateur.', transactionId: txnRes.rows[0].id });
  } catch (error) {
    console.error('Erreur création retrait:', error);
    next(error);
  }
};

// Retourne les transactions en attente de l'utilisateur connecté (dépôts et retraits non encore approuvés).
exports.mesTransactionsPending = async (req, res, next) => {
  try {
    const utilisateurId = req.user.id;
    const result = await query(
      `SELECT t.id, t.transaction_type AS type, t.amount AS montant, t.description,
              t.status AS statut, t.created_at AS date,
              a.account_type AS type_compte, a.account_number AS numero_compte
       FROM transactions t
       JOIN accounts a ON t.account_id = a.id
       WHERE a.user_id = $1 AND t.status = 'pending'
       ORDER BY t.created_at DESC`,
      [utilisateurId]
    );
    res.json({ succes: true, transactions: result.rows });
  } catch (error) {
    next(error);
  }
};
