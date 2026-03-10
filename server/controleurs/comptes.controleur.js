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

// Détail d'un compte
exports.detailCompte = async (req, res, next) => {
  try {
    const { compteId } = req.params;
    const utilisateurId = req.user.id;

    const compte = await compteModel.trouverParId(compteId);

    if (!compte) {
      return res.status(404).json({
        succes: false,
        message: 'Compte non trouvé'
      });
    }

    if (compte.utilisateur_id !== utilisateurId) {
      return res.status(403).json({
        succes: false,
        message: 'Accès refusé à ce compte'
      });
    }

    const transactions = await transactionModel.trouverParCompte(compteId, 10);

    res.json({
      succes: true,
      compte,
      transactions
    });
  } catch (error) {
    console.error('Erreur détail compte:', error);
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

// Retrait depuis un compte
exports.retraitCompte = async (req, res, next) => {
  try {
    const { compteId } = req.params;
    const { montant } = req.body;
    const utilisateurId = req.user.id;

    const compte = await compteModel.trouverParId(compteId);

    if (!compte || compte.utilisateur_id !== utilisateurId) {
      return res.status(404).json({
        succes: false,
        message: 'Compte introuvable'
      });
    }

    if (!montant || montant <= 0) {
      return res.status(400).json({
        succes: false,
        message: 'Montant invalide'
      });
    }

    if (Number(compte.solde) < Number(montant)) {
      return res.status(400).json({
        succes: false,
        message: 'Solde insuffisant'
      });
    }

    const nouveauSolde = Number(compte.solde) - Number(montant);

    await query(
      `UPDATE accounts SET balance = $1 WHERE id = $2`,
      [nouveauSolde, compteId]
    );

    const transaction = await transactionModel.creer({
      compteId,
      typeTransaction: 'withdrawal',
      montant: Number(montant),
      soldeApres: nouveauSolde,
      description: 'Retrait'
    });

    res.json({
      succes: true,
      message: 'Retrait effectué avec succès',
      transaction
    });
  } catch (error) {
    console.error('Erreur retrait:', error);
    next(error);
  }
};