const compteModel = require('../modeles/compte.modele');
const transactionModel = require('../modeles/transaction.modele');
const { query } = require('../config/baseDeDonnees');

// Mes comptes
exports.mesComptes = async (req, res, next) => {
  try {
    const utilisateurId = req.user.id;
    const comptes = await compteModel.trouverParUtilisateur(utilisateurId);
    
    res.json({ succes: true, comptes });
  } catch (error) {
    console.error('Erreur liste comptes:', error);
    next(error);
  }
};

// Résumé des soldes
exports.resumeSoldes = async (req, res, next) => {
  try {
    const utilisateurId = req.user.id;
    const resume = await compteModel.obtenirResumeSoldes(utilisateurId);
    
    res.json({ succes: true, resume });
  } catch (error) {
    console.error('Erreur résumé soldes:', error);
    next(error);
  }
};

// Transactions d'un compte
exports.transactionsCompte = async (req, res, next) => {
  try {
    const { compteId } = req.params;
    const { limite } = req.query;
    
    const transactions = await transactionModel.trouverParCompte(
      compteId, 
      parseInt(limite) || 10
    );
    
    res.json({ succes: true, transactions });
  } catch (error) {
    console.error('Erreur transactions compte:', error);
    next(error);
  }
};

// Transfert interne entre comptes
exports.transfertInterne = async (req, res, next) => {
  try {
    const utilisateurId = req.user.id;
    const { compteSourceId, compteDestinationId, montant, description } = req.body;

    // Vérifier comptes
    const compteSource = await compteModel.trouverParId(compteSourceId);
    const compteDestination = await compteModel.trouverParId(compteDestinationId);

    if (!compteSource || !compteDestination) {
      return res.status(404).json({
        succes: false,
        message: 'Compte introuvable'
      });
    }

    // Vérifier appartenance
    if (
      compteSource.utilisateur_id !== utilisateurId ||
      compteDestination.utilisateur_id !== utilisateurId
    ) {
      return res.status(403).json({
        succes: false,
        message: 'Accès non autorisé'
      });
    }

    // Vérifier solde
    if (parseFloat(compteSource.solde) < montant) {
      return res.status(400).json({
        succes: false,
        message: 'Solde insuffisant'
      });
    }

    // 🔥 TRANSACTION SQL (IMPORTANT)
    await query('BEGIN');

    // Débiter source
    const nouveauSoldeSource = parseFloat(compteSource.solde) - montant;
    await query(
      'UPDATE accounts SET balance = $1 WHERE id = $2',
      [nouveauSoldeSource, compteSourceId]
    );

    // Créditer destination
    const nouveauSoldeDest = parseFloat(compteDestination.solde) + montant;
    await query(
      'UPDATE accounts SET balance = $1 WHERE id = $2',
      [nouveauSoldeDest, compteDestinationId]
    );

    // Transaction débit
    await query(
      `INSERT INTO transactions (account_id, transaction_type, amount, balance_after, description)
       VALUES ($1, 'transfer_out', $2, $3, $4)`,
      [compteSourceId, montant, nouveauSoldeSource, description]
    );

    // Transaction crédit
    await query(
      `INSERT INTO transactions (account_id, transaction_type, amount, balance_after, description)
       VALUES ($1, 'transfer_in', $2, $3, $4)`,
      [compteDestinationId, montant, nouveauSoldeDest, description]
    );

    await query('COMMIT');

    res.json({
      succes: true,
      message: 'Transfert effectué avec succès'
    });

  } catch (error) {
    await query('ROLLBACK');
    console.error('Erreur transfert:', error);
    next(error);
  }
};