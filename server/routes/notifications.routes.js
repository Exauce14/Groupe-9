const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const notificationModel = require('../modeles/notification.modele');

// Toutes les routes nécessitent authentification
router.use(authMiddleware.verifierToken);

// Obtenir mes notifications
router.get('/mes-notifications', async (req, res, next) => {
  try {
    const utilisateurId = req.user.id;

    const notifications = await notificationModel.obtenirParUtilisateur(utilisateurId);

    res.json({
      succes: true,
      notifications: notifications
    });
  } catch (error) {
    console.error('Erreur récupération notifications:', error);
    next(error);
  }
});

// Compter les notifications non lues
router.get('/non-lues/count', async (req, res, next) => {
  try {
    const utilisateurId = req.user.id;

    const count = await notificationModel.compterNonLues(utilisateurId);

    res.json({
      succes: true,
      count: count
    });
  } catch (error) {
    console.error('Erreur comptage notifications:', error);
    next(error);
  }
});

// Marquer une notification comme lue
router.put('/:notificationId/marquer-lue', async (req, res, next) => {
  try {
    const { notificationId } = req.params;
    const utilisateurId = req.user.id;

    await notificationModel.marquerCommeLue(notificationId, utilisateurId);

    res.json({
      succes: true,
      message: 'Notification marquée comme lue'
    });
  } catch (error) {
    console.error('Erreur marquage notification:', error);
    next(error);
  }
});

// Marquer toutes comme lues
router.put('/marquer-toutes-lues', async (req, res, next) => {
  try {
    const utilisateurId = req.user.id;

    await notificationModel.marquerToutesCommeLues(utilisateurId);

    res.json({
      succes: true,
      message: 'Toutes les notifications ont été marquées comme lues'
    });
  } catch (error) {
    console.error('Erreur marquage toutes notifications:', error);
    next(error);
  }
});

router.post('/creer/notif/trasfert', async (req, res, next) => {
  try {
    const {  titre, message, user_id, type, security_question, security_answer } = req.body;

       // 1. créer la notification
    const notification = await notificationModel.creer({
      titre,
      message,
      user_id,
      type
    });

        // 2. ajouter la réponse de sécurité
    if (security_question && security_answer) {
      await notificationModel.creerAvecReponseSecurite({
        notificationId: notification.id,
        security_question,
        security_answer
      });
    }


    res.json({
      succes: true,
      notification: notification
    });
  } catch (error) {
    console.error('Erreur création notification:', error);
    next(error);
  }
});

router.post('/verifier-reponse', async (req, res, next) => {
  try {
    const { notification_id, reponse } = req.body;

    const resultat = await notificationModel.verifierReponse(notification_id, reponse);

    res.json({
      succes: resultat
    });
  } catch (error) {
    console.error('Erreur vérification réponse:', error);
    next(error);
  }
});

module.exports = router;