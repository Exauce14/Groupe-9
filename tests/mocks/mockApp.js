const express = require('express');

// Créer une app mock pour les tests
const mockApp = express();

mockApp.use(express.json());

// Middleware auth mock pour bypasser l'authentification
mockApp.use((req, res, next) => {
  req.user = {
    id: 1,
    email: 'test@example.com',
    role: 'user',
    iat: Math.floor(Date.now() / 1000)
  };
  next();
});

// Importer les routes réelles
mockApp.use('/api/auth', require('../../server/routes/auth.routes'));
mockApp.use('/api/admin', require('../../server/routes/admin.routes'));
mockApp.use('/api/comptes', require('../../server/routes/comptes.routes'));
mockApp.use('/api/cartes', require('../../server/routes/cartes.routes'));
mockApp.use('/api/demandes', require('../../server/routes/demandes.routes'));
mockApp.use('/api/notifications', require('../../server/routes/notifications.routes'));
mockApp.use('/api/utilisateurs', require('../../server/routes/utilisateurs.routes'));
mockApp.use('/api/beneficiaires', require('../../server/routes/beneficiaire.routes'));
mockApp.use('/api/transactions', require('../../server/routes/transanctions.routes'));

// Gestionnaire d'erreurs
mockApp.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    succes: false,
    message: err.message || 'Erreur interne du serveur'
  });
});

module.exports = mockApp;
