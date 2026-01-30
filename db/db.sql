-- DROP TABLE IF EXISTS utilisateurs CASCADE;

CREATE TABLE IF NOT EXISTS utilisateurs (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(30) NOT NULL,
    prenom VARCHAR(30) NOT NULL,
    date_naissance DATE NOT NULL,
    age INT NOT NULL CHECK (age > 0 AND age < 120),
    sexe VARCHAR(10),
    nationalite VARCHAR(50),
    nas CHAR(9) UNIQUE NOT NULL,
    adresse TEXT NOT NULL,
    telephone VARCHAR(15),
    email VARCHAR(255) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    statut VARCHAR(20) DEFAULT 'actif',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


