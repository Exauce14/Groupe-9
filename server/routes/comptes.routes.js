const express = require('express');
const router = express.Router();
const comptesControleur = require('../controleurs/comptes.controleur');
const authMiddleware = require('../middlewares/auth.middleware');

// Toutes les routes nécessitent authentification
router.use(authMiddleware.verifierToken);

// Routes des comptes
router.get('/mes-comptes', comptesControleur.mesComptes);
router.get('/resume-soldes', comptesControleur.resumeSoldes);
router.get('/:compteId', comptesControleur.detailCompte);
router.get('/:compteId/transactions', comptesControleur.transactionsCompte);
router.post('/:compteId/retrait', comptesControleur.retraitCompte);

module.exports = router;