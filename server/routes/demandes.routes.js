const express = require('express');
const router = express.Router();
const demandesControleur = require('../controleurs/demandes.controleur'); // ← PLURIEL avec "s"
const authMiddleware = require('../middlewares/auth.middleware');
const validationMiddleware = require('../middlewares/validation.middleware');

// Toutes les routes nécessitent l'authentification
router.use(authMiddleware.verifierToken);

// Créer une nouvelle demande
router.post('/nouvelle', validationMiddleware.validerDemande, demandesControleur.creerDemande);

// Obtenir mes demandes
router.get('/mes-demandes', demandesControleur.mesDemandes);

// Obtenir une demande spécifique
router.get('/:demandeId', demandesControleur.obtenirDemande);

module.exports = router;