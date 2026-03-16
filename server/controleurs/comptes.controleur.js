const compteModel = require('../modeles/compte.modele');
const transactionModel = require('../modeles/transaction.modele');

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