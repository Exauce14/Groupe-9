const { query } = require('../config/baseDeDonnees');

// Créer un utilisateur
exports.creer = async (userData) => {
  const result = await query(
    `INSERT INTO users (
      email, password, first_name, last_name, phone, address,
      date_of_birth, gender, status, annual_income, residence_type, sin,
      role, account_status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING id, email, first_name AS prenom, last_name AS nom`,
    [
      userData.email,
      userData.motDePasse,
      userData.prenom,
      userData.nom,
      userData.telephone,
      userData.adresse,
      userData.dateNaissance, // Date directement
      userData.sexe,
      userData.statut,
      userData.revenuAnnuel,
      userData.typeResidence,
      userData.nas,
      userData.role || 'user',
      userData.accountStatus || 'pending'
    ]
  );

  return result.rows[0];
};

// Trouver par email
exports.trouverParEmail = async (email) => {
  const result = await query(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );

  return result.rows[0] || null;
};

// Trouver par ID
exports.trouverParId = async (id) => {
  const result = await query(
    'SELECT * FROM users WHERE id = $1',
    [id]
  );

  return result.rows[0] || null;
};