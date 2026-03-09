const bcrypt = require('bcrypt');

async function genererHash() {
  const password = 'Admin123';
  const hash = await bcrypt.hash(password, 10);
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔐 HASH GÉNÉRÉ POUR ADMIN');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Mot de passe:', password);
  console.log('Hash à copier:');
  console.log(hash);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('📋 SCRIPT SQL COMPLET À EXÉCUTER:\n');
  console.log(`TRUNCATE TABLE notifications, cards, requests, verification_codes, transactions, accounts, users RESTART IDENTITY CASCADE;

INSERT INTO users (
    email, password, first_name, last_name, phone, address,
    date_of_birth, gender, status, annual_income, residence_type, sin,
    role, account_status, email_verified, approved_at
) VALUES (
    'exaucengolo519@gmail.com',
    '${hash}',
    'Exaucé', 'Admin', '5141234567', '1 Place Ville-Marie, Montréal, QC',
    '1990-01-01', 'male', 'professional', 100000.00, 'owner', '123456789',
    'admin', 'active', true, CURRENT_TIMESTAMP
);

INSERT INTO accounts (user_id, account_type, balance) 
VALUES (1, 'checking', 100000.00);

INSERT INTO transactions (account_id, transaction_type, amount, balance_after, description)
VALUES (1, 'deposit', 100000.00, 100000.00, 'Fonds de démarrage système');`);
}

genererHash();