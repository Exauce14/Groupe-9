const { query } = require('../config/baseDeDonnees');

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
  return res.rows[0] || null;
}

async function obtenirAllUsers() {
  const res = await query(
    `SELECT id, email, first_name AS nom FROM users`
  );
  return res.rows;
}


async function updateParUserId(userId, newBalance) {
  const res = await query(
    `UPDATE accounts SET balance = $1 WHERE user_id = $2 RETURNING id, user_id, account_number, account_type, balance AS amount`,
    [newBalance, userId]
  );
  return res.rows[0] || null;
}

module.exports = {
  ajouterBeneficiaire,
  obtenirBeneficiairesParUtilisateur,
  trouverBeneficiaireParId,
  trouverUsersParEmail,
  obtenirUserParUserId,
  updateParUserId,
  obtenirAllUsers
};