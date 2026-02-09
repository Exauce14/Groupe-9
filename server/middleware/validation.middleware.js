const { body, validationResult } = require('express-validator');

// ── Défini EN PREMIER parce que les tableaux ci-dessous l'utilisent ──
const gererErreursValidation = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const erreurs = errors.array().map(e => e.msg);
        return res.status(400).json({
            succes: false,
            message: erreurs[0],
            erreurs: erreurs
        });
    }
    next();
};

exports.gererErreursValidation = gererErreursValidation;

exports.validerInscription = [
    body('email')
        .isEmail().withMessage('Email invalide')
        .normalizeEmail(),
    body('motDePasse')
        .isLength({ min: 8 }).withMessage('Le mot de passe doit contenir au moins 8 caractères')
        .matches(/[A-Z]/).withMessage('Le mot de passe doit contenir une majuscule')
        .matches(/[a-z]/).withMessage('Le mot de passe doit contenir une minuscule')
        .matches(/\d/).withMessage('Le mot de passe doit contenir un chiffre'),
    body('prenom')
        .isLength({ min: 2, max: 50 }).withMessage('Le prénom doit contenir entre 2 et 50 caractères')
        .trim(),
    body('nom')
        .isLength({ min: 2, max: 50 }).withMessage('Le nom doit contenir entre 2 et 50 caractères')
        .trim(),
    body('telephone')
        .optional({ checkFalsy: true })
        .matches(/^(\+1[-.\s]?)?(\([0-9]{3}\)|[0-9]{3})[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}$/)
        .withMessage('Format de téléphone invalide (ex: 514-555-0101)'),
    gererErreursValidation
];

exports.validerConnexion = [
    body('email').isEmail().withMessage('Email invalide').normalizeEmail(),
    body('motDePasse').notEmpty().withMessage('Le mot de passe est requis'),
    gererErreursValidation
];
