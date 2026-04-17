// Routes d'authentification : inscription, connexion et vérification 2FA.
// Ces routes sont publiques et ne nécessitent pas de token JWT.
const express = require('express');
const router = express.Router();
const authControleur = require('../controleurs/auth.controleur');
const validationMiddleware = require('../middlewares/validation.middleware');

router.post(
  '/inscription',
  validationMiddleware.validerInscription,
  authControleur.inscription
);

router.post('/connexion', authControleur.connexion);

router.post('/verifier-2fa', authControleur.verifier2FA);

router.post('/renvoyer-code-2fa', authControleur.renvoyerCode2FA);

router.post('/mot-de-passe-oublie', authControleur.motDePasseOublie);

router.post('/reinitialiser-mot-de-passe', authControleur.reinitialiserMotDePasse);

module.exports = router;