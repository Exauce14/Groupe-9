const express = require('express');
const router = express.Router();
const ajoutBeneficiaire = require('../controleurs/ajout.beneficiaire.controleur');
const { verifierToken } = require('../middlewares/auth.middleware');

router.post('/ajouter-beneficiaire', verifierToken, ajoutBeneficiaire.ajouterBeneficiaire);
router.get('/mes-beneficiaires', verifierToken, ajoutBeneficiaire.listerBeneficiaires);    

module.exports = router;