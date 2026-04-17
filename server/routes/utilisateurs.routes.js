const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const authControleur = require('../controleurs/auth.controleur');
const { query } = require('../config/baseDeDonnees');

// Obtenir le profil de l'utilisateur connecté
router.get('/mon-profil', authMiddleware.verifierToken, async (req, res, next) => {
  try {
    const utilisateurId = req.user.id;

    const result = await query(
      `SELECT 
        id, 
        email, 
        first_name AS prenom, 
        last_name AS nom,
        account_status AS statut_compte,
        annual_income AS revenu_annuel,
        status AS statut_professionnel
      FROM users 
      WHERE id = $1`,
      [utilisateurId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({
        succes: false,
        message: 'Utilisateur non trouvé'
      });
    }

    res.json({
      succes: true,
      utilisateur: result.rows[0]
    });
  } catch (error) {
    console.error('Erreur récupération profil:', error);
    next(error);
  }
});

router.put('/changer-mot-de-passe', authMiddleware.verifierToken, authControleur.changerMotDePasse);

module.exports = router;