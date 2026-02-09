const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'banque_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
    console.error('❌ Erreur inattendue sur client inactif', err);
    process.exit(-1);
});

pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Erreur connexion BD:', err.message);
    } else {
        console.log('✅ Connecté à PostgreSQL');
        release();
    }
});

const query = async (text, params) => {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        console.log('✓ Requête', { duration: Date.now() - start + 'ms', rows: res.rowCount });
        return res;
    } catch (error) {
        console.error('❌ Erreur requête:', error.message);
        throw error;
    }
};

const getClient = async () => {
    const client = await pool.connect();
    const origQuery = client.query;
    const origRelease = client.release;
    const timeout = setTimeout(() => {
        console.error('⚠️ Client timeout');
    }, 5000);
    client.release = () => {
        clearTimeout(timeout);
        client.query = origQuery;
        client.release = origRelease;
        return origRelease.apply(client);
    };
    return client;
};

module.exports = { pool, query, getClient };
