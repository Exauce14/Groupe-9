const jwtUtils = require('../utilitaires/jwt.utils');

// Middleware de protection des routes : extrait et vérifie le token JWT dans l'en-tête Authorization.
// Si valide, attache les informations de l'utilisateur décodées à req.user pour les contrôleurs suivants.
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

// Middleware optionnel qui vérifie que le compte de l'utilisateur est encore actif en base de données.
// À utiliser après verifierToken pour les routes sensibles nécessitant une vérification supplémentaire.
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