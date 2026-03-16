-- ================================
-- SEED DATA COMPLET - SPRINT 1 FINAL
-- ================================

-- Supprimer les données existantes
TRUNCATE TABLE notifications, cards, requests, verification_codes, transactions, accounts, users RESTART IDENTITY CASCADE;

-- Insertion des utilisateurs
-- Mot de passe pour tous : Password123 (sauf admin)
-- Admin : Admin123

INSERT INTO users (
    email, password, first_name, last_name, phone, address,
    date_of_birth, gender, status, annual_income, residence_type, sin,
    role, account_status, email_verified, approved_at
) VALUES
-- ADMIN
('admin@banque.com', '$2b$10$XZhYZ1OQXqV7xYxK6OFnx.yD9KjGkqF0xK3xPj.Kq6H5mNzP9FJqO', 
 'Admin', 'Système', '5141111111', '1 Place Ville-Marie, Montréal, QC',
 '1980-01-01', 'other', 'professional', 100000.00, 'owner', '123456789',
 'admin', 'active', true, CURRENT_TIMESTAMP),

('bos@gmail.com', '$2b$10$8C2Vh5vVY7s3gH2uM1gMbe4y7s9KJ8p2V0dQxG3uJz2Nq4W7lCk5W', 
 'Admin', 'Système', '5141111111', '1 Place Ville-Marie, Montréal, QC',
 '1980-01-01', 'other', 'professional', 100000.00, 'owner', '123456789',
 'admin', 'active', true, CURRENT_TIMESTAMP),
-- Utilisateurs ACTIFS (approuvés)
('jean.dupont@email.com', '$2b$10$rZ0QkGJxKx.Vs5U6qPzFq.X5vL9zCPnLG0hH3RQqJ.mfvH4dRJqJG',
 'Jean', 'Dupont', '5141234567', '123 Rue Principale, Montréal, QC',
 '1990-05-15', 'male', 'employee', 55000.00, 'tenant', '234567890',
 'user', 'active', true, CURRENT_TIMESTAMP),

('marie.martin@email.com', '$2b$10$rZ0QkGJxKx.Vs5U6qPzFq.X5vL9zCPnLG0hH3RQqJ.mfvH4dRJqJG',
 'Marie', 'Martin', '5149876543', '456 Avenue du Parc, Montréal, QC',
 '1985-08-22', 'female', 'professional', 85000.00, 'owner', '345678901',
 'user', 'active', true, CURRENT_TIMESTAMP),

('pierre.dubois@email.com', '$2b$10$rZ0QkGJxKx.Vs5U6qPzFq.X5vL9zCPnLG0hH3RQqJ.mfvH4dRJqJG',
 'Pierre', 'Dubois', '4385551234', '789 Boulevard Saint-Laurent, Montréal, QC',
 '1988-12-03', 'male', 'employee', 65000.00, 'tenant', '456789012',
 'user', 'active', true, CURRENT_TIMESTAMP),

-- Utilisateur ÉTUDIANT (actif)
('sophie.tremblay@email.com', '$2b$10$rZ0QkGJxKx.Vs5U6qPzFq.X5vL9zCPnLG0hH3RQqJ.mfvH4dRJqJG',
 'Sophie', 'Tremblay', '5147778888', '321 Rue Sherbrooke, Montréal, QC',
 '2002-03-10', 'female', 'student', 15000.00, 'tenant', '567890123',
 'user', 'active', true, CURRENT_TIMESTAMP),

-- Utilisateur EN ATTENTE (pending)
('lucas.roy@email.com', '$2b$10$rZ0QkGJxKx.Vs5U6qPzFq.X5vL9zCPnLG0hH3RQqJ.mfvH4dRJqJG',
 'Lucas', 'Roy', '5144445555', '555 Rue Ontario, Montréal, QC',
 '1995-07-18', 'male', 'employee', 50000.00, 'tenant', '678901234',
 'user', 'pending', true, NULL);

-- Insertion des comptes bancaires (seulement pour utilisateurs actifs)
INSERT INTO accounts (user_id, account_type, balance, credit_limit, interest_rate, status) VALUES
-- Admin
(1, 'checking', 100000.00, NULL, NULL, 'active'),

-- Jean Dupont (ID 2)
(2, 'checking', 5.00, NULL, NULL, 'active'), -- Frais de bienvenue 5$
(2, 'savings', 15000.00, NULL, 2.5, 'active'),
(2, 'credit', -1200.00, 5000.00, 19.99, 'active'),

-- Marie Martin (ID 3)
(3, 'checking', 5.00, NULL, NULL, 'active'),
(3, 'savings', 25000.00, NULL, 2.75, 'active'),

-- Pierre Dubois (ID 4)
(4, 'checking', 5.00, NULL, NULL, 'active'),
(4, 'investment', 50000.00, NULL, 5.5, 'active'),

-- Sophie Tremblay - ÉTUDIANTE (ID 5)
(5, 'checking', 5.00, NULL, NULL, 'active');

-- PAS de compte pour Lucas (ID 6) car en attente

-- Insertion des transactions
INSERT INTO transactions (account_id, transaction_type, amount, balance_after, description) VALUES
-- Admin
(1, 'deposit', 100000.00, 100000.00, 'Fonds de démarrage système'),

-- Jean Dupont - Compte chèques (ID 2)
(2, 'deposit', 5.00, 5.00, 'Frais de bienvenue lors de la création du compte'),
(2, 'deposit', 2500.00, 2505.00, 'Dépôt initial'),
(2, 'withdrawal', 500.00, 2005.00, 'Retrait ATM'),
(2, 'payment', 1200.00, 805.00, 'Paiement loyer'),

-- Jean - Épargne (ID 3)
(3, 'deposit', 10000.00, 10000.00, 'Transfert initial'),
(3, 'deposit', 5000.00, 15000.00, 'Dépôt mensuel'),

-- Jean - Crédit (ID 4)
(4, 'payment', -500.00, -500.00, 'Achat supermarché'),
(4, 'payment', -700.00, -1200.00, 'Achat électronique'),

-- Marie Martin - Chèques (ID 5)
(5, 'deposit', 5.00, 5.00, 'Frais de bienvenue'),
(5, 'deposit', 3200.00, 3205.00, 'Dépôt initial'),

-- Marie - Épargne (ID 6)
(6, 'deposit', 20000.00, 20000.00, 'Transfert initial'),
(6, 'deposit', 5000.00, 25000.00, 'Bonus annuel'),

-- Pierre Dubois - Chèques (ID 7)
(7, 'deposit', 5.00, 5.00, 'Frais de bienvenue'),
(7, 'deposit', 1800.00, 1805.00, 'Dépôt initial'),

-- Pierre - Investissement (ID 8)
(8, 'deposit', 30000.00, 30000.00, 'Investissement initial'),
(8, 'deposit', 20000.00, 50000.00, 'Achat actions'),

-- Sophie - Chèques (ID 9)
(9, 'deposit', 5.00, 5.00, 'Frais de bienvenue');

-- Insertion des cartes
INSERT INTO cards (account_id, card_type, expiry_date, credit_limit, status) VALUES
-- Jean Dupont
(2, 'debit', DATE '2028-12-31', NULL, 'active'),
(4, 'credit', DATE '2028-12-31', 5000.00, 'active'),

-- Marie Martin
(5, 'debit', DATE '2028-12-31', NULL, 'active'),

-- Pierre Dubois
(7, 'debit', DATE '2028-12-31', NULL, 'active'),

-- Sophie Tremblay (ÉTUDIANTE - 0 frais)
(9, 'debit', DATE '2028-12-31', NULL, 'active');

-- Insertion des demandes (examples)
INSERT INTO requests (user_id, request_type, account_type, status, reviewed_by, review_comment, reviewed_at) VALUES
-- Jean - Demande compte épargne (APPROUVÉE)
(2, 'account_opening', 'savings', 'approved', 1, 'Demande approuvée - Revenus suffisants', CURRENT_TIMESTAMP - INTERVAL '5 days'),

-- Marie - Demande carte crédit (EN ATTENTE)
(3, 'credit_card', NULL, 'pending', NULL, NULL, NULL),

-- Sophie - Demande carte crédit étudiante (APPROUVÉE car étudiante)
(5, 'credit_card', NULL, 'approved', 1, 'Carte étudiante sans frais approuvée', CURRENT_TIMESTAMP - INTERVAL '2 days'),

-- Pierre - Demande investissement (REJETÉE)
(4, 'account_opening', 'investment', 'rejected', 1, 'Montant minimum non atteint', CURRENT_TIMESTAMP - INTERVAL '1 day');

-- Insertion des notifications
INSERT INTO notifications (user_id, type, title, message, read, created_at) VALUES
-- Jean
(2, 'request_approved', 'Demande approuvée', 'Votre demande de compte épargne a été approuvée !', true, CURRENT_TIMESTAMP - INTERVAL '5 days'),
(2, 'transaction', 'Retrait effectué', 'Un retrait de 500$ a été effectué sur votre compte', true, CURRENT_TIMESTAMP - INTERVAL '3 days'),

-- Marie
(3, 'request_submitted', 'Demande soumise', 'Votre demande de carte de crédit est en cours de traitement', false, CURRENT_TIMESTAMP - INTERVAL '1 hour'),

-- Sophie
(5, 'request_approved', 'Carte étudiante approuvée', 'Votre carte de crédit étudiante sans frais a été approuvée !', false, CURRENT_TIMESTAMP - INTERVAL '2 days'),

-- Pierre
(4, 'request_rejected', 'Demande rejetée', 'Votre demande de compte investissement a été rejetée. Montant minimum requis: 10,000$', false, CURRENT_TIMESTAMP - INTERVAL '1 day'),

-- Lucas (EN ATTENTE)
(6, 'system', 'Compte en attente', 'Votre inscription est en cours de vérification par un administrateur', false, CURRENT_TIMESTAMP - INTERVAL '2 hours');

-- Mettre à jour les numéros de référence
UPDATE transactions 
SET reference_number = 'TXN-' || TO_CHAR(created_at, 'YYYYMMDD') || '-' || LPAD(id::TEXT, 8, '0') 
WHERE reference_number IS NULL;