// Routes des fournisseurs et paiements de factures.
// Inclut les paiements clients, l'approbation par les comptes entreprise, et la gestion admin des fournisseurs.
const express = require('express');
const router = express.Router();
const { verifierToken } = require('../middlewares/auth.middleware');
const { verifierAdmin } = require('../middlewares/admin.middleware');
const ctrl = require('../controleurs/fournisseurs.controleur');

router.use(verifierToken);

router.get('/', ctrl.listesFournisseurs);
router.post('/payer', ctrl.payerFacture);
router.put('/paiements/:paiementId/annuler', ctrl.annulerPaiementFacture);
router.get('/historique', ctrl.historiquePaiements);
router.post('/planifier', ctrl.planifierPaiement);
router.get('/planifies', ctrl.mesPaiementsPlanifies);
router.put('/planifies/:planifieId/annuler', ctrl.annulerPaiementPlanifie);

// Entreprise — approbation des paiements
router.get('/enterprise/mes-instances',     ctrl.mesInstancesEntreprise);
router.get('/enterprise/historique',        ctrl.historiquePaiementsEntreprise);
router.get('/enterprise/paiements-pending', ctrl.paiementsEnAttenteEntreprise);
router.post('/enterprise/paiements/:paiementId/approuver', ctrl.approuverPaiementFacture);
router.post('/enterprise/paiements/:paiementId/rejeter', ctrl.rejeterPaiementFacture);

// Admin seulement
router.post('/admin/creer', verifierAdmin, ctrl.creerFournisseurAdmin);
router.put('/admin/:fournisseurId', verifierAdmin, ctrl.modifierFournisseurAdmin);
router.delete('/admin/:fournisseurId', verifierAdmin, ctrl.supprimerFournisseurAdmin);

module.exports = router;
