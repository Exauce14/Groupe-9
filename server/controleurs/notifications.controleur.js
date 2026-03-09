const notificationModel = require('../modeles/notification.modele');

// Lister mes notifications
exports.mesNotifications = async (req, res, next) => {
  try {
    const utilisateurId = req.user.id;
    const notifications = await notificationModel.trouverParUtilisateur(utilisateurId);
    
    res.json({ succes: true, notifications });
  } catch (error) {
    console.error('Erreur liste notifications:', error);
    next(error);
  }
};

// Compter les notifications non lues
exports.compterNonLues = async (req, res, next) => {
  try {
    const utilisateurId = req.user.id;
    const count = await notificationModel.compterNonLues(utilisateurId);
    
    res.json({ succes: true, count });
  } catch (error) {
    console.error('Erreur comptage notifications:', error);
    next(error);
  }
};

// Marquer une notification comme lue
exports.marquerLue = async (req, res, next) => {
  try {
    const { notificationId } = req.params;
    await notificationModel.marquerLue(notificationId);
    
    res.json({ succes: true, message: 'Notification marquée comme lue' });
  } catch (error) {
    console.error('Erreur marquage notification:', error);
    next(error);
  }
};

// Marquer toutes comme lues
exports.marquerToutesLues = async (req, res, next) => {
  try {
    const utilisateurId = req.user.id;
    await notificationModel.marquerToutesLues(utilisateurId);
    
    res.json({ succes: true, message: 'Toutes les notifications marquées comme lues' });
  } catch (error) {
    console.error('Erreur marquage toutes notifications:', error);
    next(error);
  }
};