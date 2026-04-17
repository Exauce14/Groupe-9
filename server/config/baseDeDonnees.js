const { Pool } = require('pg');

// Configuration de la connexion PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Fonction pour exécuter des requêtes
const query = (text, params) => pool.query(text, params);

// Fonction pour tester la connexion
const connectDB = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Connecté à PostgreSQL');
    
    const result = await client.query('SELECT current_database()');
    console.log('📊 Base de données:', result.rows[0].current_database);
    
    client.release();
  } catch (error) {
    console.error('❌ Erreur connexion PostgreSQL:', error.message);
    process.exit(1);
  }
};

module.exports = { pool, query, connectDB };