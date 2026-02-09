const express = require('express');
const router = express.Router();
const authControleur = require('../controleurs/auth.controleur');
const { verifierToken } = require('../middleware/auth.middleware');
const { validerInscription, validerConnexion } = require('../middleware/validation.middleware');

// Routes publiques
router.post('/inscription', validerInscription, authControleur.inscription);
router.post('/connexion', validerConnexion, authControleur.connexion);
router.post('/deconnexion', authControleur.deconnexion);

// Routes 2FA
router.post('/verifier-2fa', authControleur.verifier2FA);
router.post('/renvoyer-code', authControleur.renvoyerCode2FA);

// Routes protégées
router.get('/moi', verifierToken, authControleur.obtenirUtilisateurConnecte);
router.get('/verifier', verifierToken, (req, res) => {
    res.json({ succes: true, valide: true, utilisateur: req.utilisateur });
});

module.exports = router;
