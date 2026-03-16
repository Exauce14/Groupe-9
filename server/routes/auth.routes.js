const express = require('express');
const router = express.Router();
const authControleur = require('../controleurs/auth.controleur');
const validationMiddleware = require('../middlewares/validation.middleware');

// Routes publiques
router.post(
  '/inscription',
  validationMiddleware.validerInscription,
  authControleur.inscription
);

router.post('/connexion', authControleur.connexion);

router.post('/verifier-2fa', authControleur.verifier2FA);

router.post('/renvoyer-code-2fa', authControleur.renvoyerCode2FA);

module.exports = router;