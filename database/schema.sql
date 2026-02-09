-- ============================================
-- SCHÉMA BASE DE DONNÉES — SPRINT 1
-- ============================================

DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
    id                SERIAL PRIMARY KEY,
    email             VARCHAR(100) UNIQUE NOT NULL,
    password          VARCHAR(255) NOT NULL,
    first_name        VARCHAR(50) NOT NULL,
    last_name         VARCHAR(50) NOT NULL,
    phone             VARCHAR(20),
    address           TEXT,
    role              VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    is_active         BOOLEAN DEFAULT true,
    login_attempts    INTEGER DEFAULT 0,
    locked_until      TIMESTAMP,
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE accounts (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_number  VARCHAR(20) UNIQUE NOT NULL,
    account_type    VARCHAR(20) NOT NULL CHECK (account_type IN ('checking','savings','credit','investment')),
    balance         DECIMAL(12,2) DEFAULT 0.00,
    credit_limit    DECIMAL(12,2),
    interest_rate   DECIMAL(5,2),
    status          VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','closed')),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE transactions (
    id                SERIAL PRIMARY KEY,
    account_id        INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    transaction_type  VARCHAR(20) NOT NULL CHECK (transaction_type IN ('deposit','withdrawal','transfer','payment','interac')),
    amount            DECIMAL(12,2) NOT NULL,
    balance_after     DECIMAL(12,2) NOT NULL,
    description       TEXT,
    reference_number  VARCHAR(50) UNIQUE,
    status            VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending','completed','failed','cancelled')),
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_accounts_number ON accounts(account_number);
CREATE INDEX idx_transactions_account ON transactions(account_id);
CREATE INDEX idx_transactions_date ON transactions(created_at DESC);
CREATE INDEX idx_transactions_ref ON transactions(reference_number);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated    BEFORE UPDATE ON users    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_accounts_updated BEFORE UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Fonction génération numéro de compte
CREATE OR REPLACE FUNCTION generate_account_number() RETURNS VARCHAR(20) AS $$
DECLARE new_number VARCHAR(20); exists BOOLEAN;
BEGIN
    LOOP
        new_number := LPAD(FLOOR(RANDOM()*10000)::TEXT,4,'0') || '-' ||
                      LPAD(FLOOR(RANDOM()*10000)::TEXT,4,'0') || '-' ||
                      LPAD(FLOOR(RANDOM()*10000)::TEXT,4,'0');
        SELECT EXISTS(SELECT 1 FROM accounts WHERE account_number = new_number) INTO exists;
        IF NOT exists THEN RETURN new_number; END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Fonction génération numéro de référence
CREATE OR REPLACE FUNCTION generate_reference_number() RETURNS VARCHAR(50) AS $$
DECLARE new_ref VARCHAR(50); exists BOOLEAN;
BEGIN
    LOOP
        new_ref := 'TRX-' || TO_CHAR(CURRENT_DATE,'YYYYMMDD') || '-' ||
                   LPAD(FLOOR(RANDOM()*1000000)::TEXT,6,'0');
        SELECT EXISTS(SELECT 1 FROM transactions WHERE reference_number = new_ref) INTO exists;
        IF NOT exists THEN RETURN new_ref; END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
    RAISE NOTICE '✅ Schéma créé avec succès — users, accounts, transactions';
END $$;
