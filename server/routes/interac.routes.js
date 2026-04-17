// Routes Interac : envoi, dépôt, annulation de virements et gestion des bénéficiaires.
// Toutes les routes nécessitent un token JWT valide.
const express = require('express');
const router = express.Router();
const { verifierToken } = require('../middlewares/auth.middleware');
const ctrl = require('../controleurs/interac.controleur');

router.use(verifierToken);

router.post('/envoyer', ctrl.envoyerInterac);
router.get('/mes-envoyes', ctrl.mesVirementsEnvoyes);
router.get('/:interacId', ctrl.obtenirInterac);
router.post('/:interacId/verifier-reponse', ctrl.verifierReponse);
router.post('/verifier-motdepasse', ctrl.verifierMotDePasse);
router.post('/:interacId/deposer', ctrl.deposerInterac);
router.post('/:interacId/annuler', ctrl.annulerInterac);

router.get('/beneficiaires/liste', ctrl.mesBeneficiaires);
router.post('/beneficiaires/ajouter', ctrl.ajouterBeneficiaire);
router.delete('/beneficiaires/:beneficiaireId', ctrl.supprimerBeneficiaire);

module.exports = router;
