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
        first_name        AS prenom,
        last_name         AS nom,
        phone             AS telephone,
        address           AS adresse,
        account_status    AS statut_compte,
        annual_income     AS revenu_annuel,
        status            AS statut_professionnel,
        residence_type    AS type_residence,
        date_of_birth     AS date_naissance
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

// Mettre à jour le profil de l'utilisateur connecté
router.put('/mon-profil', authMiddleware.verifierToken, async (req, res, next) => {
  try {
    const utilisateurId = req.user.id;
    const { prenom, nom, telephone, adresse, revenu_annuel, statut_professionnel, type_residence } = req.body;

    await query(
      `UPDATE users SET
        first_name = COALESCE($1, first_name),
        last_name  = COALESCE($2, last_name),
        phone      = COALESCE($3, phone),
        address    = COALESCE($4, address),
        annual_income = COALESCE($5, annual_income),
        status     = COALESCE($6, status),
        residence_type = COALESCE($7, residence_type),
        updated_at = NOW()
      WHERE id = $8`,
      [prenom || null, nom || null, telephone || null, adresse || null,
       revenu_annuel || null, statut_professionnel || null, type_residence || null, utilisateurId]
    );

    res.json({ succes: true, message: 'Profil mis à jour avec succès.' });
  } catch (error) {
    console.error('Erreur mise à jour profil:', error);
    next(error);
  }
});

module.exports = router;