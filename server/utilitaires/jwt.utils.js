const jwt = require('jsonwebtoken');

// Générer un token JWT
exports.genererToken = (utilisateur) => {
  const payload = {
    id: utilisateur.id,
    email: utilisateur.email,
    prenom: utilisateur.prenom,
    nom: utilisateur.nom,
    role: utilisateur.role
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRATION || '30m'
  });
};

// Vérifier un token JWT
exports.verifierToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Décoder un token sans vérifier (pour debug)
exports.decoderToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    return null;
  }
};