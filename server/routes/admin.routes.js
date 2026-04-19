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
router.delete('/utilisateurs/:userId', adminControleur.supprimerUtilisateur);

// Toutes les transactions + annulation
router.get('/transactions', adminControleur.toutesTransactions);
router.post('/transactions/:transactionId/annuler', adminControleur.annulerTransaction);

// Dépôts et retraits en attente
router.get('/transactions-pending', adminControleur.transactionsPending);
router.post('/transactions/:transactionId/approuver-depot', adminControleur.approuverDepot);
router.post('/transactions/:transactionId/rejeter-depot', adminControleur.rejeterDepot);
router.post('/transactions/:transactionId/approuver-retrait', adminControleur.approuverRetrait);
router.post('/transactions/:transactionId/rejeter-retrait', adminControleur.rejeterRetrait);

// Comptes entreprise
router.get('/comptes-entreprise', adminControleur.comptesEntreprise);

// Détail utilisateur + transactions + modifier + reset password
router.get('/utilisateurs/:userId/detail', adminControleur.detailUtilisateur);
router.get('/utilisateurs/:userId/transactions', adminControleur.transactionsUtilisateur);
router.put('/utilisateurs/:userId/modifier', adminControleur.modifierUtilisateur);
router.post('/utilisateurs/:userId/reset-password', adminControleur.resetPassword);

module.exports = router;