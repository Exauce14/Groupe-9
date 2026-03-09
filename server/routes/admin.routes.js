const express = require('express');
const router = express.Router();
const adminControleur = require('../controleurs/admin.controleur');
const authMiddleware = require('../middlewares/auth.middleware');
const adminMiddleware = require('../middlewares/admin.middleware');

// Toutes les routes nécessitent authentification + rôle admin
router.use(authMiddleware.verifierToken);
router.use(adminMiddleware.verifierAdmin);

// Statistiques
router.get('/statistiques', adminControleur.statistiques);

// Inscriptions
router.get('/inscriptions', adminControleur.inscriptionsEnAttente);
router.post('/inscriptions/:userId/approuver', adminControleur.approuverInscription);
router.post('/inscriptions/:userId/rejeter', adminControleur.rejeterInscription);

// Demandes
router.get('/demandes', adminControleur.demandesEnAttente);
router.post('/demandes/:demandeId/approuver', adminControleur.approuverDemande);
router.post('/demandes/:demandeId/rejeter', adminControleur.rejeterDemande);

// Utilisateurs
router.get('/utilisateurs', adminControleur.tousLesUtilisateurs);
router.post('/utilisateurs/:userId/bloquer', adminControleur.bloquerUtilisateur);
router.post('/utilisateurs/:userId/debloquer', adminControleur.debloquerUtilisateur);

module.exports = router;