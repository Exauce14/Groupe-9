const jwtUtils = require('../utilitaires/jwt.utils');

// Vérifier le token JWT
exports.verifierToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      succes: false, 
      message: 'Token manquant. Veuillez vous connecter.' 
    });
  }

  const token = authHeader.split(' ')[1];
  const decoded = jwtUtils.verifierToken(token);

  if (!decoded) {
    return res.status(401).json({ 
      succes: false, 
      message: 'Token invalide ou expiré. Veuillez vous reconnecter.' 
    });
  }

  // Attacher les informations de l'utilisateur à la requête
  req.user = decoded;
  next();
};

// Middleware optionnel : vérifier si l'utilisateur est actif
exports.verifierUtilisateurActif = async (req, res, next) => {
  try {
    const utilisateurModel = require('../modeles/utilisateur.modele');
    const utilisateur = await utilisateurModel.trouverParId(req.user.id);

    if (!utilisateur || !utilisateur.est_actif) {
      return res.status(403).json({
        succes: false,
        message: 'Compte inactif. Veuillez contacter le support.'
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};