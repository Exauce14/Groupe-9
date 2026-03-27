const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const transanctionModel = require('../modeles/transaction.modele');

// Toutes les routes nécessitent authentification
router.use(authMiddleware.verifierToken);

// Ajouter une transaction 
router.post('/creer/notif/transaction', async (req, res, next) => {
  try {
    const { account_id,type, amount, balanceAfter, description } = req.body;
   const transanction = await transanctionModel.creer({
  compteId: account_id,
  typeTransaction: type,
  montant: amount,
  soldeApres: balanceAfter,
  description: description
});

   console.log("Body reçu:", req.body);
    res.json({
      succes: true,
      transanction: transanction
    });
  } catch (error) {
    console.error('Erreur ajout transaction:', error);
    next(error);
  }
});


// Obtenir les transactions d'un compte
router.get('/compte/:compteId', async (req, res, next) => {
  try {
    const { compteId } = req.params;
    const transactions = await transanctionModel.trouverParCompte(compteId);
    
    res.json({
      succes: true,
      transactions: transactions
    });
  } catch (error) {
    console.error('Erreur récupération transactions:', error);
    next(error);
  }
});


module.exports = router;