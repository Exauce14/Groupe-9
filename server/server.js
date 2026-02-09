const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth.routes');
const comptesRoutes = require('./routes/comptes.routes');
const { gestionnaireErreurs, gestionnaireRouteNonTrouvee } = require('./utilitaires/erreurs');
const { pool } = require('./config/baseDeDonnees');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Sécurité : helmet SANS la CSP (elle bloque le JS inline) ──
app.use(helmet({
    contentSecurityPolicy: false   // ← ça c'était le problème
}));

app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));

// ── FICHIERS STATIQUES en premier ──
app.use(express.static(path.join(__dirname, '..', 'public')));

// ── Health checks ──
app.get('/api/sante', (req, res) => {
    res.json({ succes: true, message: 'Serveur OK', timestamp: new Date().toISOString(), version: '1.0.0 - Sprint 1' });
});

app.get('/api/sante/bd', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.json({ succes: true, message: 'BD OK', timestamp: result.rows[0].now });
    } catch (error) {
        res.status(500).json({ succes: false, message: 'Erreur BD', erreur: error.message });
    }
});

// ── API Routes ──
app.use('/api/auth', authRoutes);
app.use('/api/comptes', comptesRoutes);

// ── Route racine → index.html ──
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Gestion des erreurs
app.use(gestionnaireRouteNonTrouvee);
app.use(gestionnaireErreurs);

// Gestion propre de l'arrêt
process.on('unhandledRejection', (err) => { console.error('❌ Promise non gérée:', err); server.close(() => process.exit(1)); });
process.on('uncaughtException', (err) => { console.error('❌ Exception non capturée:', err); process.exit(1); });

const server = app.listen(PORT, () => {
    console.log('');
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║   🏦  APPLICATION BANCAIRE - SPRINT 1  🏦    ║');
    console.log('╚══════════════════════════════════════════════╝');
    console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
    console.log(`💻 BD: ${process.env.DB_NAME || 'banque_db'}`);
    console.log(`🌐 Ouvrez http://localhost:${PORT} dans votre navigateur`);
    console.log('');
});

process.on('SIGTERM', () => { server.close(() => { pool.end(() => process.exit(0)); }); });
process.on('SIGINT', () => { console.log('\n👋 Arrêt...'); server.close(() => { pool.end(() => process.exit(0)); }); });

module.exports = app;