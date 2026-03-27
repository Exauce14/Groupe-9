const express = require('express');
const router = express.Router();
const ajoutBeneficiaire = require('../controleurs/ajout.beneficiaire.controleur');
const { verifierToken } = require('../middlewares/auth.middleware');

router.post('/ajouter-beneficiaire', verifierToken, ajoutBeneficiaire.ajouterBeneficiaire);
router.get('/mes-beneficiaires', verifierToken, ajoutBeneficiaire.listerBeneficiaires);   
router.get('/mes-beneficiaires/:beneficiaireId', verifierToken, ajoutBeneficiaire.listerBeneficiairesParId);
router.get('/mes-beneficiaires/user/:email', verifierToken, ajoutBeneficiaire.listerUsersParEmail);
router.get('/mes-beneficiaires/user/id/:userId', verifierToken, ajoutBeneficiaire.listerUsersParUserId);
router.get('/mes-beneficiaires/users/all', verifierToken, ajoutBeneficiaire.listerAllUsers);
router.put('/mes-beneficiaires/user/id/:userId', verifierToken, ajoutBeneficiaire.updateParUserId);
router.put('/mes-beneficiaires/user/id/:userId/:compteId', verifierToken, ajoutBeneficiaire.updateComptesParUserIdEtIdCompte);

module.exports = router;