const express = require('express');
const router = express.Router();
const comptesController = require('../controleurs/comptes.controleur');
const authMiddleware = require('../middleware/auth.middleware');

// Toutes les routes nécessitent l'authentification
router.use(authMiddleware.verifierToken);

router.get('/', comptesController.obtenirMesComptes);
router.get('/:id', comptesController.obtenirDetailsCompte);
router.get('/:id/transactions', comptesController.obtenirTransactionsCompte);

module.exports = router;
