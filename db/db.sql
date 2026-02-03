-- DROP TABLE IF EXISTS utilisateurs CASCADE;
-- DROP TABLE IF EXISTS comptes CASCADE;

CREATE TABLE IF NOT EXISTS utilisateurs (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(30) NOT NULL,
    prenom VARCHAR(30) NOT NULL,
    date_naissance DATE NOT NULL,
    sexe VARCHAR(10),
    nationalite VARCHAR(50),
    nas CHAR(9) UNIQUE NOT NULL,
    adresse TEXT NOT NULL,
    telephone VARCHAR(15),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    statut VARCHAR(20) DEFAULT 'actif',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS comptes (
    id SERIAL PRIMARY KEY,
    utilisateur_id INT NOT NULL,
    num_compte VARCHAR(30) NOT NULL UNIQUE,
    type_compte VARCHAR(20) NOT NULL,
    solde NUMERIC(12,2) NOT NULL,
    devise VARCHAR(10) NOT NULL,
    statut VARCHAR(50) NOT NULL DEFAULT 'actif',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_utilisateur
        FOREIGN KEY (utilisateur_id)
        REFERENCES utilisateurs(id)
        ON DELETE CASCADE
);

