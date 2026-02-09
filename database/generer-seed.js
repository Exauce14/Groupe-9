// ============================================
// GÉNÉRATEUR DE DONNÉES DE TEST
// Exécuter: node database/generer-seed.js
// Puis copier le contenu dans pgAdmin et exécuter
// ============================================

const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

async function generer() {
    const hash = await bcrypt.hash('Password123', 10);
    console.log('✅ Hash généré pour "Password123":', hash);

    const sql = `-- ============================================
-- DONNÉES DE TEST — SPRINT 1
-- Mot de passe pour tous: Password123
-- Hash généré: ${new Date().toISOString()}
-- ============================================

-- Supprimer les données existantes
TRUNCATE TABLE transactions CASCADE;
TRUNCATE TABLE accounts CASCADE;
TRUNCATE TABLE users CASCADE;

-- ── UTILISATEURS ──
INSERT INTO users (email, password, first_name, last_name, phone, address, role)
VALUES
    ('jean.dupont@email.com',      '${hash}', 'Jean',   'Dupont',    '514-555-0101', '123 Rue Principale, Montréal, QC H2X 1Y5', 'user'),
    ('marie.tremblay@email.com',   '${hash}', 'Marie',  'Tremblay',  '514-555-0102', '456 Avenue du Parc, Montréal, QC H3G 2K8', 'user'),
    ('pierre.gagnon@email.com',    '${hash}', 'Pierre', 'Gagnon',    '514-555-0103', '789 Blvd Saint-Laurent, Montréal, QC H2X 2V1', 'user'),
    ('admin@banque.com',           '${hash}', 'Admin',  'Système',   '514-555-0001', '1000 Rue de la Banque, Montréal, QC H3B 4W5', 'admin');

-- ── COMPTES ──
-- Jean (user_id=1)
INSERT INTO accounts (user_id, account_number, account_type, balance, credit_limit, interest_rate) VALUES
    (1, '1234-5678-9001', 'checking',    2500.00, NULL,    NULL),
    (1, '1234-5678-9002', 'savings',    15000.00, NULL,    2.00),
    (1, '1234-5678-9003', 'credit',      -850.50, 5000.00, NULL);

-- Marie (user_id=2)
INSERT INTO accounts (user_id, account_number, account_type, balance, interest_rate) VALUES
    (2, '2234-5678-9001', 'checking', 3200.00, NULL),
    (2, '2234-5678-9002', 'savings',  8500.00, 2.00);

-- Pierre (user_id=3)
INSERT INTO accounts (user_id, account_number, account_type, balance) VALUES
    (3, '3234-5678-9001', 'checking',    1800.00),
    (3, '3234-5678-9002', 'investment', 25000.00);

-- Admin (user_id=4)
INSERT INTO accounts (user_id, account_number, account_type, balance) VALUES
    (4, '9999-9999-9999', 'checking', 100000.00);

-- ── TRANSACTIONS ──
-- Jean — chèques (account_id=1)
INSERT INTO transactions (account_id, transaction_type, amount, balance_after, description, reference_number, created_at) VALUES
    (1, 'deposit',    1000.00,  1000.00, 'Dépôt initial',                  'TRX-20260115-000001', CURRENT_TIMESTAMP - INTERVAL '14 days'),
    (1, 'deposit',    2500.00,  3500.00, 'Salaire — Janvier',             'TRX-20260120-000002', CURRENT_TIMESTAMP - INTERVAL '9 days'),
    (1, 'withdrawal',  200.00,  3300.00, 'Retrait guichet',               'TRX-20260121-000003', CURRENT_TIMESTAMP - INTERVAL '8 days'),
    (1, 'payment',     150.00,  3150.00, 'Paiement — Hydro-Québec',      'TRX-20260122-000004', CURRENT_TIMESTAMP - INTERVAL '7 days'),
    (1, 'payment',      85.50,  3064.50, 'Paiement — Vidéotron',         'TRX-20260123-000005', CURRENT_TIMESTAMP - INTERVAL '6 days'),
    (1, 'withdrawal',  100.00,  2964.50, 'Retrait guichet',               'TRX-20260124-000006', CURRENT_TIMESTAMP - INTERVAL '5 days'),
    (1, 'payment',      45.00,  2919.50, 'Paiement en ligne',             'TRX-20260125-000007', CURRENT_TIMESTAMP - INTERVAL '4 days'),
    (1, 'withdrawal',   80.00,  2839.50, 'Retrait guichet',               'TRX-20260126-000008', CURRENT_TIMESTAMP - INTERVAL '3 days'),
    (1, 'deposit',     150.00,  2989.50, 'Remboursement',                 'TRX-20260127-000009', CURRENT_TIMESTAMP - INTERVAL '2 days'),
    (1, 'payment',     489.50,  2500.00, 'Paiement loyer',                'TRX-20260128-000010', CURRENT_TIMESTAMP - INTERVAL '1 day');

-- Jean — épargne (account_id=2)
INSERT INTO transactions (account_id, transaction_type, amount, balance_after, description, reference_number, created_at) VALUES
    (2, 'deposit', 10000.00, 10000.00, 'Dépôt initial',     'TRX-20260115-000011', CURRENT_TIMESTAMP - INTERVAL '14 days'),
    (2, 'deposit',  5000.00, 15000.00, 'Épargne mensuelle', 'TRX-20260120-000012', CURRENT_TIMESTAMP - INTERVAL '9 days');

-- Jean — crédit (account_id=3)
INSERT INTO transactions (account_id, transaction_type, amount, balance_after, description, reference_number, created_at) VALUES
    (3, 'payment', -350.50, -350.50, 'Achat — Épicerie',    'TRX-20260118-000013', CURRENT_TIMESTAMP - INTERVAL '11 days'),
    (3, 'payment', -250.00, -600.50, 'Achat — Restaurant',  'TRX-20260120-000014', CURRENT_TIMESTAMP - INTERVAL '9 days'),
    (3, 'payment', -150.00, -750.50, 'Achat — Essence',     'TRX-20260123-000015', CURRENT_TIMESTAMP - INTERVAL '6 days'),
    (3, 'payment', -100.00, -850.50, 'Achat — Pharmacie',   'TRX-20260126-000016', CURRENT_TIMESTAMP - INTERVAL '3 days');

-- Marie — chèques (account_id=4)
INSERT INTO transactions (account_id, transaction_type, amount, balance_after, description, reference_number, created_at) VALUES
    (4, 'deposit',    2000.00, 2000.00, 'Dépôt initial',          'TRX-20260116-000017', CURRENT_TIMESTAMP - INTERVAL '13 days'),
    (4, 'deposit',    3000.00, 5000.00, 'Salaire — Janvier',      'TRX-20260120-000018', CURRENT_TIMESTAMP - INTERVAL '9 days'),
    (4, 'payment',    1200.00, 3800.00, 'Paiement loyer',         'TRX-20260121-000019', CURRENT_TIMESTAMP - INTERVAL '8 days'),
    (4, 'payment',     120.00, 3680.00, 'Paiement — Bell',        'TRX-20260122-000020', CURRENT_TIMESTAMP - INTERVAL '7 days'),
    (4, 'withdrawal',  200.00, 3480.00, 'Retrait guichet',        'TRX-20260124-000021', CURRENT_TIMESTAMP - INTERVAL '5 days'),
    (4, 'withdrawal',  280.00, 3200.00, 'Retrait guichet',        'TRX-20260127-000022', CURRENT_TIMESTAMP - INTERVAL '2 days');

-- Marie — épargne (account_id=5)
INSERT INTO transactions (account_id, transaction_type, amount, balance_after, description, reference_number, created_at) VALUES
    (5, 'deposit', 5000.00, 5000.00, 'Dépôt initial',     'TRX-20260116-000023', CURRENT_TIMESTAMP - INTERVAL '13 days'),
    (5, 'deposit', 3500.00, 8500.00, 'Épargne mensuelle', 'TRX-20260120-000024', CURRENT_TIMESTAMP - INTERVAL '9 days');

-- Pierre — chèques (account_id=6)
INSERT INTO transactions (account_id, transaction_type, amount, balance_after, description, reference_number, created_at) VALUES
    (6, 'deposit',    1500.00, 1500.00, 'Dépôt initial',     'TRX-20260117-000025', CURRENT_TIMESTAMP - INTERVAL '12 days'),
    (6, 'deposit',    2800.00, 4300.00, 'Salaire — Janvier', 'TRX-20260120-000026', CURRENT_TIMESTAMP - INTERVAL '9 days'),
    (6, 'payment',     950.00, 3350.00, 'Paiement loyer',    'TRX-20260121-000027', CURRENT_TIMESTAMP - INTERVAL '8 days'),
    (6, 'payment',     850.00, 2500.00, 'Paiement voiture',  'TRX-20260123-000028', CURRENT_TIMESTAMP - INTERVAL '6 days'),
    (6, 'withdrawal',  700.00, 1800.00, 'Retrait guichet',   'TRX-20260126-000029', CURRENT_TIMESTAMP - INTERVAL '3 days');

-- Pierre — investissement (account_id=7)
INSERT INTO transactions (account_id, transaction_type, amount, balance_after, description, reference_number, created_at) VALUES
    (7, 'deposit', 20000.00, 20000.00, 'Dépôt initial',      'TRX-20260117-000030', CURRENT_TIMESTAMP - INTERVAL '12 days'),
    (7, 'deposit',  5000.00, 25000.00, 'Contribution REER',  'TRX-20260120-000031', CURRENT_TIMESTAMP - INTERVAL '9 days');

DO $$
BEGIN
    RAISE NOTICE '✅ Données de test insérées!';
    RAISE NOTICE '👤 4 utilisateurs | 💳 8 comptes | 📊 31 transactions';
    RAISE NOTICE '🔑 Mot de passe pour tous: Password123';
    RAISE NOTICE '   jean.dupont@email.com';
    RAISE NOTICE '   marie.tremblay@email.com';
    RAISE NOTICE '   pierre.gagnon@email.com';
    RAISE NOTICE '   admin@banque.com';
END $$;
`;

    const outputPath = path.join(__dirname, 'seed.sql');
    fs.writeFileSync(outputPath, sql, 'utf8');
    console.log(`✅ seed.sql généré dans: ${outputPath}`);
    console.log('📋 Copiez le contenu de seed.sql dans pgAdmin et exécutez');
}

generer().catch(console.error);
