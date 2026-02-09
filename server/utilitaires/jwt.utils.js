const jwt = require('jsonwebtoken');

exports.genererToken = (payload) => {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET non défini');
    return jwt.sign(payload, secret, {
        expiresIn: process.env.JWT_EXPIRES_IN || '30m',
        issuer: 'banque-app',
        audience: 'banque-users'
    });
};

exports.verifierToken = (token) => {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET non défini');
    try {
        return jwt.verify(token, secret, { issuer: 'banque-app', audience: 'banque-users' });
    } catch (error) {
        if (error.name === 'TokenExpiredError') throw new Error('TOKEN_EXPIRE');
        if (error.name === 'JsonWebTokenError') throw new Error('TOKEN_INVALIDE');
        throw error;
    }
};

exports.decoderToken = (token) => {
    try { return jwt.decode(token); }
    catch (e) { return null; }
};

exports.extraireToken = (authHeader) => {
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    return authHeader.split(' ')[1];
};

exports.estExpire = (token) => {
    try {
        const decoded = jwt.decode(token);
        if (!decoded || !decoded.exp) return true;
        return decoded.exp < Math.floor(Date.now() / 1000);
    } catch (e) { return true; }
};

exports.tempsRestant = (token) => {
    try {
        const decoded = jwt.decode(token);
        if (!decoded || !decoded.exp) return 0;
        const restant = decoded.exp - Math.floor(Date.now() / 1000);
        return restant > 0 ? restant : 0;
    } catch (e) { return 0; }
};
