// Routes des transactions : virements internes, dépôts et retraits (en attente d'approbation admin).
// Toutes les routes nécessitent un token JWT valide.
const express = require('express');
const router = express.Router();
const { verifierToken } = require('../middlewares/auth.middleware');
const ctrl = require('../controleurs/transactions.controleur');

router.use(verifierToken);

router.post('/virement-interne', ctrl.virementInterne);
router.post('/depot', ctrl.creerDepot);
router.post('/retrait', ctrl.creerRetrait);
router.get('/mes-pending', ctrl.mesTransactionsPending);

module.exports = router;
