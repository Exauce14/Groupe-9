// Vérifier que l'utilisateur est admin
exports.verifierAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      succes: false,
      message: 'Accès refusé. Droits administrateur requis.'
    });
  }
  next();
};