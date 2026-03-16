const express = require('express');
const router = express.Router();
const cartesControleur = require('../controleurs/cartes.controleur');
const authMiddleware = require('../middlewares/auth.middleware');

// Toutes les routes nécessitent authentification
router.use(authMiddleware.verifierToken);

// Routes des cartes
router.get('/mes-cartes', cartesControleur.mesCartes);
router.post('/:carteId/bloquer', cartesControleur.bloquerCarte);
router.post('/:carteId/debloquer', cartesControleur.debloquerCarte);

module.exports = router;