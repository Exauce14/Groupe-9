-- ================================
-- MIGRATION SPRINT 2
-- Exécuter dans pgAdmin ou psql
-- ================================

-- 1. Ajouter status aux transactions (pending pour dépôts/retraits)
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'completed'
CHECK (status IN ('pending', 'completed', 'cancelled', 'failed'));

ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS related_transaction_id INTEGER;

-- 2. Ajouter 'enterprise' aux types de compte
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_account_type_check;
ALTER TABLE accounts ADD CONSTRAINT accounts_account_type_check
CHECK (account_type IN ('checking', 'savings', 'credit', 'investment', 'enterprise'));

-- 3. Ajouter 'enterprise' aux rôles utilisateur
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
CHECK (role IN ('user', 'admin', 'enterprise'));

-- 4. Mettre à jour les types de notification
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
CHECK (type IN (
  'request_submitted', 'request_approved', 'request_rejected',
  'card_blocked', 'card_unblocked', 'transaction', 'system',
  'deposit_pending', 'deposit_approved', 'deposit_rejected',
  'withdrawal_pending', 'withdrawal_approved', 'withdrawal_rejected',
  'transfer_completed', 'interac_received', 'interac_deposited',
  'payment_completed', 'payment_scheduled',
  'account_suspended', 'account_reactivated'
));

-- 10. Colonnes manquantes dans la table cards
ALTER TABLE cards
ADD COLUMN IF NOT EXISTS available_credit DECIMAL(15, 2),
ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMP;

-- 11. Colonnes manquantes dans la table requests
ALTER TABLE requests
ADD COLUMN IF NOT EXISTS requested_amount DECIMAL(15, 2),
ADD COLUMN IF NOT EXISTS duration_months INTEGER,
ADD COLUMN IF NOT EXISTS property_value DECIMAL(15, 2);

-- 5. Table des bénéficiaires Interac
CREATE TABLE IF NOT EXISTS beneficiaries (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  email VARCHAR(200) NOT NULL,
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Table des virements Interac
CREATE TABLE IF NOT EXISTS interac_transfers (
  id SERIAL PRIMARY KEY,
  sender_id INTEGER NOT NULL REFERENCES users(id),
  recipient_email VARCHAR(200) NOT NULL,
  recipient_id INTEGER REFERENCES users(id),
  sender_account_id INTEGER NOT NULL REFERENCES accounts(id),
  deposit_account_id INTEGER REFERENCES accounts(id),
  amount DECIMAL(15,2) NOT NULL,
  message TEXT,
  security_question TEXT NOT NULL,
  security_answer VARCHAR(200) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'deposited', 'cancelled', 'expired')),
  expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days'),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deposited_at TIMESTAMP
);

-- 7. Table des fournisseurs de paiements
CREATE TABLE IF NOT EXISTS providers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  category VARCHAR(100),
  enterprise_account_id INTEGER REFERENCES accounts(id),
  reference_label VARCHAR(200),
  reference_example VARCHAR(200),
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Table des paiements de factures
CREATE TABLE IF NOT EXISTS bill_payments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  from_account_id INTEGER NOT NULL REFERENCES accounts(id),
  provider_id INTEGER NOT NULL REFERENCES providers(id),
  reference_number VARCHAR(200),
  amount DECIMAL(15,2) NOT NULL,
  description TEXT,
  transaction_id INTEGER REFERENCES transactions(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Table des paiements planifiés
CREATE TABLE IF NOT EXISTS scheduled_payments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  from_account_id INTEGER NOT NULL REFERENCES accounts(id),
  provider_id INTEGER REFERENCES providers(id),
  to_account_number VARCHAR(20),
  to_user_id INTEGER REFERENCES users(id),
  amount DECIMAL(15,2) NOT NULL,
  frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('once', 'weekly', 'biweekly', 'monthly')),
  day_of_month INTEGER CHECK (day_of_month BETWEEN 1 AND 28),
  next_execution_date DATE NOT NULL,
  end_date DATE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_executed_at TIMESTAMP
);

-- ================================
-- COMPTES ENTREPRISE FOURNISSEURS
-- ================================

-- Créer les utilisateurs entreprise (un par entité SAAQ pour qu'ils partagent le même compte)
INSERT INTO users (email, password, first_name, last_name, date_of_birth, role, account_status, is_active, email_verified)
VALUES
  ('hydroquebec@systeme.fortivia', '$2b$10$dummy', 'Hydro', 'Québec', '1944-04-14', 'enterprise', 'active', true, true),
  ('intact@systeme.fortivia', '$2b$10$dummy', 'Intact', 'Assurances', '1954-01-01', 'enterprise', 'active', true, true),
  ('tdassu@systeme.fortivia', '$2b$10$dummy', 'TD', 'Assurances', '1855-01-01', 'enterprise', 'active', true, true),
  ('fortivia-ass@systeme.fortivia', '$2b$10$dummy', 'Fortivia', 'Assurances', '2020-01-01', 'enterprise', 'active', true, true),
  ('saaq@systeme.fortivia', '$2b$10$dummy', 'SAAQ', 'Gouvernement', '1978-01-01', 'enterprise', 'active', true, true),
  ('videotron@systeme.fortivia', '$2b$10$dummy', 'Vidéotron', 'Entreprise', '1964-01-01', 'enterprise', 'active', true, true),
  ('bell@systeme.fortivia', '$2b$10$dummy', 'Bell', 'Canada', '1880-01-01', 'enterprise', 'active', true, true),
  ('virgin@systeme.fortivia', '$2b$10$dummy', 'Virgin', 'Plus', '2005-01-01', 'enterprise', 'active', true, true)
ON CONFLICT (email) DO NOTHING;

-- Créer les comptes entreprise
DO $$
DECLARE
  uid_hydro INTEGER;
  uid_intact INTEGER;
  uid_td INTEGER;
  uid_fortivia_ass INTEGER;
  uid_saaq INTEGER;
  uid_videotron INTEGER;
  uid_bell INTEGER;
  uid_virgin INTEGER;
  acc_id_hydro INTEGER;
  acc_id_intact INTEGER;
  acc_id_td INTEGER;
  acc_id_fortivia_ass INTEGER;
  acc_id_saaq INTEGER;
  acc_id_videotron INTEGER;
  acc_id_bell INTEGER;
  acc_id_virgin INTEGER;
BEGIN
  SELECT id INTO uid_hydro FROM users WHERE email = 'hydroquebec@systeme.fortivia';
  SELECT id INTO uid_intact FROM users WHERE email = 'intact@systeme.fortivia';
  SELECT id INTO uid_td FROM users WHERE email = 'tdassu@systeme.fortivia';
  SELECT id INTO uid_fortivia_ass FROM users WHERE email = 'fortivia-ass@systeme.fortivia';
  SELECT id INTO uid_saaq FROM users WHERE email = 'saaq@systeme.fortivia';
  SELECT id INTO uid_videotron FROM users WHERE email = 'videotron@systeme.fortivia';
  SELECT id INTO uid_bell FROM users WHERE email = 'bell@systeme.fortivia';
  SELECT id INTO uid_virgin FROM users WHERE email = 'virgin@systeme.fortivia';

  INSERT INTO accounts (user_id, account_type, balance) VALUES (uid_hydro, 'enterprise', 30000.00) RETURNING id INTO acc_id_hydro;
  INSERT INTO accounts (user_id, account_type, balance) VALUES (uid_intact, 'enterprise', 30000.00) RETURNING id INTO acc_id_intact;
  INSERT INTO accounts (user_id, account_type, balance) VALUES (uid_td, 'enterprise', 30000.00) RETURNING id INTO acc_id_td;
  INSERT INTO accounts (user_id, account_type, balance) VALUES (uid_fortivia_ass, 'enterprise', 30000.00) RETURNING id INTO acc_id_fortivia_ass;
  INSERT INTO accounts (user_id, account_type, balance) VALUES (uid_saaq, 'enterprise', 30000.00) RETURNING id INTO acc_id_saaq;
  INSERT INTO accounts (user_id, account_type, balance) VALUES (uid_videotron, 'enterprise', 30000.00) RETURNING id INTO acc_id_videotron;
  INSERT INTO accounts (user_id, account_type, balance) VALUES (uid_bell, 'enterprise', 30000.00) RETURNING id INTO acc_id_bell;
  INSERT INTO accounts (user_id, account_type, balance) VALUES (uid_virgin, 'enterprise', 30000.00) RETURNING id INTO acc_id_virgin;

  INSERT INTO providers (name, category, enterprise_account_id, reference_label, reference_example, is_default) VALUES
    ('Hydro-Québec', 'Énergie', acc_id_hydro, 'Numéro de client', '1234567 (7 chiffres)', true),
    ('Intact Assurances', 'Assurance', acc_id_intact, 'Numéro de police', 'INS-2024-001234', true),
    ('TD Assurances', 'Assurance', acc_id_td, 'Numéro de police', 'POL-123456', true),
    ('Fortivia Assurances', 'Assurance', acc_id_fortivia_ass, 'Numéro de police', 'FA-2024-789012', true),
    ('SAAQ - Immatriculation', 'Gouvernement', acc_id_saaq, 'Numéro de plaque', 'ABC-1234', true),
    ('SAAQ - Permis de conduire', 'Gouvernement', acc_id_saaq, 'Numéro de permis', 'DUPOJ12345612 (12 caractères)', true),
    ('Vidéotron', 'Télécommunications', acc_id_videotron, 'Numéro de compte', '1234567890 (10 chiffres)', true),
    ('Bell Canada', 'Télécommunications', acc_id_bell, 'Numéro de compte', '7654321', true),
    ('Virgin Plus', 'Télécommunications', acc_id_virgin, 'Numéro de compte', '987654321', true);
END $$;
