const { extraireToken, verifierToken } = require('../utilitaires/jwt.utils');

exports.verifierToken = (req, res, next) => {
    try {
        const token = extraireToken(req.headers.authorization);
        if (!token) {
            return res.status(401).json({ succes: false, message: 'Aucun token fourni', codeErreur: 'TOKEN_MANQUANT' });
        }

        const decoded = verifierToken(token);
        req.utilisateur = decoded;
        next();
    } catch (error) {
        if (error.message === 'TOKEN_EXPIRE') {
            return res.status(401).json({ succes: false, message: 'Session expirée', codeErreur: 'TOKEN_EXPIRE' });
        }
        return res.status(401).json({ succes: false, message: 'Token invalide', codeErreur: 'TOKEN_INVALIDE' });
    }
};

exports.estAdmin = (req, res, next) => {
    if (req.utilisateur && req.utilisateur.role === 'admin') {
        next();
    } else {
        res.status(403).json({ succes: false, message: 'Accès réservé à l\'administrateur' });
    }
};
