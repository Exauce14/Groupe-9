const { query } = require('../config/baseDeDonnees');

// Créer un compte
exports.creer = async ({ utilisateurId, typeCompte, soldeInitial }) => {
  const res = await query(
    `INSERT INTO accounts (user_id, account_type, balance)
     VALUES ($1, $2, $3)
     RETURNING 
       id, 
       user_id AS utilisateur_id, 
       account_number AS numero_compte,
       account_type AS type_compte, 
       balance AS solde,
       status AS statut`,
    [utilisateurId, typeCompte, soldeInitial || 0]
  );
  return res.rows[0];
};

// Trouver les comptes d'un utilisateur
exports.trouverParUtilisateur = async (utilisateurId) => {
  const res = await query(
    `SELECT 
      id,
      user_id AS utilisateur_id,
      account_number AS numero_compte,
      account_type AS type_compte,
      balance AS solde,
      credit_limit AS limite_credit,
      interest_rate AS taux_interet,
      status AS statut,
      created_at AS cree_le
    FROM accounts 
    WHERE user_id = $1
    ORDER BY created_at ASC`,
    [utilisateurId]
  );
  return res.rows;
};

// Obtenir le résumé des soldes
exports.obtenirResumeSoldes = async (utilisateurId) => {
  const res = await query(
    `SELECT 
      COALESCE(SUM(CASE WHEN account_type = 'checking' THEN balance ELSE 0 END), 0) as total_cheques,
      COALESCE(SUM(CASE WHEN account_type = 'savings' THEN balance ELSE 0 END), 0) as total_epargne,
      COALESCE(SUM(CASE WHEN account_type = 'investment' THEN balance ELSE 0 END), 0) as total_investissement,
      COALESCE(SUM(CASE WHEN account_type IN ('checking', 'savings', 'investment') THEN balance ELSE 0 END), 0) as total_general
    FROM accounts 
    WHERE user_id = $1 AND status = 'active'`,
    [utilisateurId]
  );
  return res.rows[0];
};

// Trouver un compte par ID
exports.trouverParId = async (compteId) => {
  const res = await query(
    `SELECT 
      id,
      user_id AS utilisateur_id,
      account_number AS numero_compte,
      account_type AS type_compte,
      balance AS solde,
      status AS statut
    FROM accounts 
    WHERE id = $1`,
    [compteId]
  );
  return res.rows[0];
};