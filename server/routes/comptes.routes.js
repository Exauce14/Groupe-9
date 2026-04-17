const express = require('express');
const router = express.Router();
const comptesControleur = require('../controleurs/comptes.controleur');
const authMiddleware = require('../middlewares/auth.middleware');

// Toutes les routes nécessitent authentification
router.use(authMiddleware.verifierToken);

// Routes des comptes
router.get('/mes-comptes', comptesControleur.mesComptes);
router.get('/resume-soldes', comptesControleur.resumeSoldes);
router.get('/:compteId/transactions', comptesControleur.transactionsCompte);
// Obtenir les transactions d'un compte
router.get('/:compteId/transactions', async (req, res, next) => {
  try {
    const { compteId } = req.params;
    const utilisateurId = req.user.id;

    // Vérifier que le compte appartient à l'utilisateur
    const compteCheck = await query(
      'SELECT id FROM accounts WHERE id = $1 AND user_id = $2',
      [compteId, utilisateurId]
    );

    if (!compteCheck.rows[0]) {
      return res.status(404).json({
        succes: false,
        message: 'Compte non trouvé'
      });
    }

    //  Récupérer les transactions avec tous les champs nécessaires
    const transactions = await query(
      `SELECT 
        id,
        transaction_type AS type,
        amount AS montant,
        balance_after AS solde_apres,
        description,
        transaction_date AS date,
        created_at
       FROM transactions
       WHERE account_id = $1
       ORDER BY COALESCE(transaction_date, created_at) DESC
       LIMIT 100`,
      [compteId]
    );

    res.json({
      succes: true,
      transactions: transactions.rows
    });
  } catch (error) {
    console.error('Erreur récupération transactions:', error);
    next(error);
  }
});

module.exports = router;