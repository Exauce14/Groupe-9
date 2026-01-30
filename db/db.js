import pkg from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();
const { Pool } = pkg;

export const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
});

// Charger le fichier SQL
const sql = fs.readFileSync(
    path.resolve('db/db.sql'),
    'utf-8'
);

// Créer les tables au démarrage
pool.query(sql)
    .then(() => console.log('📦 Base de données prête'))
    .catch(err => console.error('Erreur DB', err));
