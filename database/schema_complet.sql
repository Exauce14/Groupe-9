-- ================================
-- SCHEMA COMPLET - SPRINT 1 FINAL
-- ================================

-- Supprimer les tables existantes
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS cards CASCADE;
DROP TABLE IF EXISTS requests CASCADE;
DROP TABLE IF EXISTS verification_codes CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Fonction pour générer un numéro de compte unique
CREATE OR REPLACE FUNCTION generate_account_number()
RETURNS TEXT AS $$
DECLARE
    account_num TEXT;
    exists BOOLEAN;
BEGIN
    LOOP
        account_num := LPAD(FLOOR(RANDOM() * 1000000000000)::TEXT, 12, '0');
        account_num := SUBSTRING(account_num FROM 1 FOR 4) || '-' ||
                      SUBSTRING(account_num FROM 5 FOR 4) || '-' ||
                      SUBSTRING(account_num FROM 9 FOR 4);
        SELECT EXISTS(SELECT 1 FROM accounts WHERE account_number = account_num) INTO exists;
        EXIT WHEN NOT exists;
    END LOOP;
    RETURN account_num;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour générer un numéro de carte
CREATE OR REPLACE FUNCTION generate_card_number()
RETURNS TEXT AS $$
DECLARE
    card_num TEXT;
    exists BOOLEAN;
BEGIN
    LOOP
        card_num := '4' || LPAD(FLOOR(RANDOM() * 1000000000000000)::TEXT, 15, '0');
        card_num := SUBSTRING(card_num FROM 1 FOR 4) || ' ' ||
                   SUBSTRING(card_num FROM 5 FOR 4) || ' ' ||
                   SUBSTRING(card_num FROM 9 FOR 4) || ' ' ||
                   SUBSTRING(card_num FROM 13 FOR 4);
        SELECT EXISTS(SELECT 1 FROM cards WHERE card_number = card_num) INTO exists;
        EXIT WHEN NOT exists;
    END LOOP;
    RETURN card_num;
END;
$$ LANGUAGE plpgsql;

-- Table des utilisateurs (ÉTENDUE)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    
    -- NOUVELLES COLONNES
    date_of_birth DATE NOT NULL,
    gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other')),
    status VARCHAR(50) CHECK (status IN ('student', 'employee', 'professional', 'retired')) DEFAULT 'employee',
    annual_income DECIMAL(15, 2),
    residence_type VARCHAR(50) CHECK (residence_type IN ('owner', 'tenant', 'other')),
    sin VARCHAR(11), -- Numéro d'assurance sociale (9 chiffres)
    
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    account_status VARCHAR(50) DEFAULT 'pending' CHECK (account_status IN ('pending', 'active', 'suspended', 'closed')),
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des comptes bancaires
CREATE TABLE accounts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_number VARCHAR(20) UNIQUE DEFAULT generate_account_number(),
    account_type VARCHAR(50) NOT NULL CHECK (account_type IN ('checking', 'savings', 'credit', 'investment')),
    balance DECIMAL(15, 2) DEFAULT 0.00,
    credit_limit DECIMAL(15, 2),
    interest_rate DECIMAL(5, 2),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'closed', 'frozen')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des transactions
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal', 'transfer', 'payment', 'fee')),
    amount DECIMAL(15, 2) NOT NULL,
    balance_after DECIMAL(15, 2) NOT NULL,
    description TEXT,
    reference_number VARCHAR(50) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des codes de vérification (2FA)
CREATE TABLE verification_codes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code VARCHAR(10) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('2fa_login', 'email_verification', 'password_reset')),
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des demandes (NOUVELLE)
CREATE TABLE requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    request_type VARCHAR(50) NOT NULL CHECK (request_type IN ('account_opening', 'credit_card', 'loan', 'service')),
    account_type VARCHAR(50) CHECK (account_type IN ('savings', 'investment')),
    card_type VARCHAR(50) CHECK (card_type IN ('debit', 'credit')),
    requested_limit DECIMAL(15, 2),
    justification TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    reviewed_by INTEGER REFERENCES users(id),
    review_comment TEXT,
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des cartes bancaires (NOUVELLE)
CREATE TABLE cards (
    id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    card_number VARCHAR(20) UNIQUE DEFAULT generate_card_number(),
    card_type VARCHAR(50) NOT NULL CHECK (card_type IN ('debit', 'credit')),
    cvv VARCHAR(3) NOT NULL,
    expiry_date DATE NOT NULL,
    credit_limit DECIMAL(15, 2),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'blocked', 'expired', 'cancelled')),
    blocked_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des notifications (NOUVELLE)
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('request_submitted', 'request_approved', 'request_rejected', 'card_blocked', 'card_unblocked', 'transaction', 'system')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT false,
    link VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour améliorer les performances
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(account_status);
CREATE INDEX idx_users_dob ON users(date_of_birth);
CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_accounts_number ON accounts(account_number);
CREATE INDEX idx_transactions_account_id ON transactions(account_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX idx_verification_user_type ON verification_codes(user_id, type);
CREATE INDEX idx_verification_expires ON verification_codes(expires_at);
CREATE INDEX idx_requests_user_id ON requests(user_id);
CREATE INDEX idx_requests_status ON requests(status);
CREATE INDEX idx_cards_account_id ON cards(account_id);
CREATE INDEX idx_cards_status ON cards(status);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);

-- Trigger pour générer un numéro de référence unique pour les transactions
CREATE OR REPLACE FUNCTION generate_reference_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.reference_number := 'TXN-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEW.id::TEXT, 8, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_reference
AFTER INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION generate_reference_number();

-- Trigger pour générer un CVV aléatoire pour les cartes
CREATE OR REPLACE FUNCTION generate_cvv()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.cvv IS NULL OR NEW.cvv = '' THEN
        NEW.cvv := LPAD(FLOOR(RANDOM() * 1000)::TEXT, 3, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_cvv
BEFORE INSERT ON cards
FOR EACH ROW
EXECUTE FUNCTION generate_cvv();

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_requests_updated_at BEFORE UPDATE ON requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cards_updated_at BEFORE UPDATE ON cards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();