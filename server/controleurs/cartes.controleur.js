const carteModel = require('../modeles/carte.modele');
const notificationModel = require('../modeles/notification.modele');

// Obtenir mes cartes
exports.mesCartes = async (req, res, next) => {
  try {
    const utilisateurId = req.user.id;

    const cartes = await carteModel.obtenirCartesUtilisateur(utilisateurId);

    res.json({
      succes: true,
      cartes: cartes
    });
  } catch (error) {
    console.error('Erreur récupération cartes:', error);
    next(error);
  }
};

// Bloquer une carte
exports.bloquerCarte = async (req, res, next) => {
  try {
    const { carteId } = req.params;
    const { raison } = req.body;
    const utilisateurId = req.user.id;

    // Vérifier que la carte appartient à l'utilisateur
    const carte = await carteModel.obtenirCarteParId(carteId);

    if (!carte) {
      return res.status(404).json({
        succes: false,
        message: 'Carte non trouvée'
      });
    }

    if (carte.utilisateur_id !== utilisateurId) {
      return res.status(403).json({
        succes: false,
        message: 'Vous n\'êtes pas autorisé à bloquer cette carte'
      });
    }

    if (carte.statut === 'blocked') {
      return res.status(400).json({
        succes: false,
        message: 'Cette carte est déjà bloquée'
      });
    }

    // Bloquer la carte
    await carteModel.bloquerCarte(carteId, raison);

    // Créer une notification
    await notificationModel.creer({
      user_id: utilisateurId,
      type: 'card_blocked',
      titre: 'Carte bloquée',
      message: `Votre carte se terminant par ${carte.numero_carte.slice(-4)} a été bloquée.`,
      lien: '/mes-cartes.html'
    });

    res.json({
      succes: true,
      message: 'Carte bloquée avec succès'
    });
  } catch (error) {
    console.error('Erreur blocage carte:', error);
    next(error);
  }
};

// Débloquer une carte
exports.debloquerCarte = async (req, res, next) => {
  try {
    const { carteId } = req.params;
    const utilisateurId = req.user.id;

    // Vérifier que la carte appartient à l'utilisateur
    const carte = await carteModel.obtenirCarteParId(carteId);

    if (!carte) {
      return res.status(404).json({
        succes: false,
        message: 'Carte non trouvée'
      });
    }

    if (carte.utilisateur_id !== utilisateurId) {
      return res.status(403).json({
        succes: false,
        message: 'Vous n\'êtes pas autorisé à débloquer cette carte'
      });
    }

    if (carte.statut === 'active') {
      return res.status(400).json({
        succes: false,
        message: 'Cette carte est déjà active'
      });
    }

    // Débloquer la carte
    await carteModel.debloquerCarte(carteId);

    // Créer une notification
    await notificationModel.creer({
      user_id: utilisateurId,
      type: 'card_unblocked',
      titre: 'Carte débloquée',
      message: `Votre carte se terminant par ${carte.numero_carte.slice(-4)} a été débloquée.`,
      lien: '/mes-cartes.html'
    });

    res.json({
      succes: true,
      message: 'Carte débloquée avec succès'
    });
  } catch (error) {
    console.error('Erreur déblocage carte:', error);
    next(error);
  }
};