-- Migration : Ajout du système 2FA
-- À exécuter après schema.sql

CREATE TABLE IF NOT EXISTS verification_codes (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code            VARCHAR(6) NOT NULL,
    type            VARCHAR(20) NOT NULL CHECK (type IN ('2fa_login', 'email_verification')),
    expires_at      TIMESTAMP NOT NULL,
    used            BOOLEAN DEFAULT false,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour recherche rapide
CREATE INDEX idx_verification_user ON verification_codes(user_id, type);
CREATE INDEX idx_verification_code ON verification_codes(code);
CREATE INDEX idx_verification_expires ON verification_codes(expires_at);

-- Ajouter colonne email_verified dans users si pas déjà présente
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'email_verified'
    ) THEN
        ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT false;
    END IF;
END $$;

DO $$ BEGIN
    RAISE NOTICE '✅ Table verification_codes créée + colonne email_verified ajoutée';
END $$;
