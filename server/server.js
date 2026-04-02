require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const { connectDB } = require('./config/baseDeDonnees');
const { initWebSocket } = require('./utilitaires/websocket');
module.exports = app;

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/admin', require('./routes/admin.routes'));
app.use('/api/comptes', require('./routes/comptes.routes'));
app.use('/api/cartes', require('./routes/cartes.routes'));
app.use('/api/demandes', require('./routes/demandes.routes'));
app.use('/api/notifications', require('./routes/notifications.routes'));
app.use('/api/utilisateurs', require('./routes/utilisateurs.routes'));
app.use('/api/beneficiaires', require('./routes/beneficiaire.routes'));
app.use('/api/transactions', require('./routes/transanctions.routes'));


// Initialiser WebSocket
const io = initWebSocket(server);

// Gestionnaire d'erreurs global
app.use((err, req, res, next) => {
  console.error('❌ Erreur serveur:', err);
  res.status(err.status || 500).json({
    succes: false,
    message: err.message || 'Erreur interne du serveur'
  });
});

// Connexion à la base de données
connectDB();

// Démarrage du serveur
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  console.log(`📍 http://localhost:${PORT}`);
  console.log('🔌 WebSocket activé pour notifications temps réel');
});

module.exports = { app, server, io };