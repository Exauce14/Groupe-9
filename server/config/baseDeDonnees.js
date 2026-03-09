const { Pool } = require('pg');

// Configuration de la connexion PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'base_de_donne_projet_integrateur',
  password: process.env.DB_PASSWORD || 'exauce2005',
  port: process.env.DB_PORT || 5432,
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