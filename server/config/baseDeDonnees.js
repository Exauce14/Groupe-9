const { Pool } = require('pg');
require('dotenv').config();

// Configuration du pool de connexions
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'banque_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    max: 20, // Nombre maximum de clients dans le pool
    idleTimeoutMillis: 30000, // Temps avant fermeture d'une connexion inactive
    connectionTimeoutMillis: 2000, // Temps d'attente max pour obtenir une connexion
});

// Gestion des erreurs du pool
pool.on('error', (err, client) => {
    console.error('Erreur inattendue sur client inactif', err);
    process.exit(-1);
});

// Test de connexion
pool.connect((err, client, release) => {
    if (err) {
        console.error('Erreur de connexion à la base de données:', err.stack);
    } else {
        console.log('Connecté à la base de données PostgreSQL');
        release();
    }
});

// Fonction helper pour exécuter des requêtes
const query = async (text, params) => {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log('✓ Requête exécutée', { text, duration, rows: res.rowCount });
        return res;
    } catch (error) {
        console.error('Erreur lors de l\'exécution de la requête:', error);
        throw error;
    }
};

// Fonction pour obtenir un client (pour les transactions)
const getClient = async () => {
    const client = await pool.connect();
    const query = client.query;
    const release = client.release;

    // Timeout de 5 secondes pour les requêtes
    const timeout = setTimeout(() => {
        console.error('Client de base de données a dépassé le timeout');
    }, 5000);

    // Override de la fonction release
    client.release = () => {
        clearTimeout(timeout);
        client.query = query;
        client.release = release;
        return release.apply(client);
    };

    return client;
};

module.exports = {
    pool,
    query,
    getClient
};