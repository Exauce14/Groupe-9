const { query } = require('../config/baseDeDonnees');
 const bcrypt = require('bcrypt');

async function ajouterBeneficiaire(utilisateurId, nom, email, telephone) {
  const res = await query(
    `INSERT INTO beneficiaires (utilisateur_id, nom, email, telephone)
     VALUES ($1, $2, $3, $4)
     RETURNING id, utilisateur_id AS utilisateurId, nom, email, telephone, created_at AS creeLe`,
    [utilisateurId, nom, email, telephone]
  );
  return res.rows[0];
}

async function obtenirBeneficiairesParUtilisateur(utilisateurId) {
  const res = await query(
    `SELECT id, utilisateur_id AS utilisateurId, nom, email, telephone, created_at AS creeLe
     FROM beneficiaires 
     WHERE utilisateur_id = $1
     ORDER BY created_at DESC`,
    [utilisateurId]
  );
  return res.rows;
}

async function trouverBeneficiaireParId(beneficiaireId) {
  const res = await query(
    `SELECT id, utilisateur_id AS utilisateurId, nom, email, telephone, created_at AS creeLe
     FROM beneficiaires 
     WHERE id = $1`,
    [beneficiaireId]
  );
  return res.rows[0] || null;
}

async function trouverUserParUserId(userId) {
  const res = await query(
    `SELECT id, email, password AS motDePasse FROM users WHERE id = $1`,
    [userId]
  );
  return res.rows;
}

async function updateUserParUserId(userId, newPassword) {
 
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  const res = await query(
    `UPDATE users SET password = $1 WHERE id = $2 RETURNING id, email`,
    [hashedPassword, userId]
  );

  return res.rows[0] || null;
}

async function trouverUsersParEmail(email) {
  const res = await query( 
    `SELECT id, email, first_name AS nom FROM users WHERE email = $1`,
    [email]
  );
  return res.rows[0] || null;
}

async function obtenirUserParUserId(userId) {
  const res = await query(
    `SELECT id, user_id, account_number, account_type, balance AS amount FROM accounts WHERE user_id = $1`,
    [userId]
  );
  return res.rows;
}



async function obtenirAllUsers() {
  const res = await query(
    `SELECT id, email, password, first_name AS nom FROM users`
  );
  return res.rows;
}


async function updateParUserId(userId, newBalance) {
  const res = await query(
    `UPDATE accounts SET balance = $1 WHERE user_id = $2 RETURNING id, user_id, account_number, account_type, balance AS amount`,
    [newBalance, userId]
  );
    console.log("UPDATE balance pour user_id:", userId);
  return res.rows[0] || null;


}

// Nouvelle fonction pour mettre à jour le solde d'un compte par userId et accountId
async function updateCompteParUserIdEtIdCompte(userId, accountId, newBalance) {
  const res = await query(
    `UPDATE accounts SET balance = $1 WHERE user_id = $2 AND id = $3 RETURNING id, user_id, account_number, account_type, balance AS amount`,
    [newBalance, userId, accountId]
  );
    console.log("UPDATE balance pour user_id:", userId + " et account_id: " + accountId);
  return res.rows[0] || null;


}

module.exports = {
  ajouterBeneficiaire,
  obtenirBeneficiairesParUtilisateur,
  trouverBeneficiaireParId,
  trouverUsersParEmail,
  obtenirUserParUserId,
  updateParUserId,
  obtenirAllUsers,
  updateCompteParUserIdEtIdCompte,
  trouverUserParUserId,
  updateUserParUserId
};