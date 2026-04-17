-- ================================
-- MIGRATION SPRINT 3
-- Exécuter dans pgAdmin ou psql
-- ================================

-- 1. Statut et suivi des paiements de factures (workflow pending → approved/cancelled)
ALTER TABLE bill_payments
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending'
  CHECK (status IN ('pending', 'approved', 'cancelled', 'rejected')),
ADD COLUMN IF NOT EXISTS enterprise_transaction_id INTEGER REFERENCES transactions(id),
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP;

-- 2. Icône et groupe d'affichage pour les fournisseurs
ALTER TABLE providers
ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT '🏢',
ADD COLUMN IF NOT EXISTS group_name VARCHAR(200);

-- Mettre à jour les icônes des fournisseurs existants
UPDATE providers SET icon = '⚡', group_name = 'Hydro-Québec' WHERE name = 'Hydro-Québec';
UPDATE providers SET icon = '🛡️', group_name = 'Intact Assurances' WHERE name = 'Intact Assurances';
UPDATE providers SET icon = '🛡️', group_name = 'TD Assurances' WHERE name = 'TD Assurances';
UPDATE providers SET icon = '🏦', group_name = 'Fortivia Assurances' WHERE name = 'Fortivia Assurances';
UPDATE providers SET icon = '🚗', group_name = 'SAAQ' WHERE name LIKE 'SAAQ%';
UPDATE providers SET icon = '📡', group_name = 'Vidéotron' WHERE name = 'Vidéotron';
UPDATE providers SET icon = '📡', group_name = 'Bell Canada' WHERE name = 'Bell Canada';
UPDATE providers SET icon = '📱', group_name = 'Virgin Plus' WHERE name = 'Virgin Plus';

-- 3. Ajouter la colonne 'cancelled' au statut interac (déjà dans le check?)
-- Vérification: le statut 'cancelled' n'est peut-être pas dans le check existant
ALTER TABLE interac_transfers DROP CONSTRAINT IF EXISTS interac_transfers_status_check;
ALTER TABLE interac_transfers ADD CONSTRAINT interac_transfers_status_check
  CHECK (status IN ('pending', 'deposited', 'cancelled', 'expired'));

-- 4. Mettre à jour le mot de passe des comptes entreprise existants
-- (password hash de '12345' avec bcrypt rounds=10)
-- NOTE: Ce hash doit être généré par l'application — voir seed_entreprises.sql
