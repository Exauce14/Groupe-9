class AppError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

class ValidationError extends AppError {
    constructor(message = 'Données invalides') { super(message, 400); this.name = 'ValidationError'; }
}
class AuthenticationError extends AppError {
    constructor(message = 'Authentification échouée') { super(message, 401); this.name = 'AuthenticationError'; }
}
class AuthorizationError extends AppError {
    constructor(message = 'Accès refusé') { super(message, 403); this.name = 'AuthorizationError'; }
}
class NotFoundError extends AppError {
    constructor(message = 'Ressource non trouvée') { super(message, 404); this.name = 'NotFoundError'; }
}
class ConflictError extends AppError {
    constructor(message = 'Conflit détecté') { super(message, 409); this.name = 'ConflictError'; }
}
class BusinessError extends AppError {
    constructor(message, statusCode = 400) { super(message, statusCode); this.name = 'BusinessError'; }
}

const gestionnaireErreurs = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    if (process.env.NODE_ENV === 'development') {
        console.error('❌ ERREUR:', err.message);
        return res.status(err.statusCode).json({
            succes: false, status: err.status, message: err.message, stack: err.stack
        });
    }

    if (err.isOperational) {
        return res.status(err.statusCode).json({ succes: false, status: err.status, message: err.message });
    }

    console.error('❌ ERREUR CRITIQUE:', err);
    return res.status(500).json({ succes: false, status: 'error', message: 'Une erreur est survenue sur le serveur' });
};

const gestionnaireRouteNonTrouvee = (req, res, next) => {
    next(new NotFoundError(`Route ${req.originalUrl} non trouvée`));
};

const catchAsync = (fn) => (req, res, next) => fn(req, res, next).catch(next);

module.exports = {
    AppError, ValidationError, AuthenticationError, AuthorizationError,
    NotFoundError, ConflictError, BusinessError,
    gestionnaireErreurs, gestionnaireRouteNonTrouvee, catchAsync
};
