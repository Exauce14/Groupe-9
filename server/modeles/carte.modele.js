const { query } = require('../config/baseDeDonnees');

// Obtenir toutes les cartes d'un utilisateur avec détails crédit
exports.obtenirCartesUtilisateur = async (utilisateurId) => {
  const result = await query(
    `SELECT 
      c.id,
      c.card_number AS numero_carte,
      c.card_type AS type_carte,
      c.expiry_date AS date_expiration,
      c.cvv,
      c.status AS statut,
      c.credit_limit AS limite_credit,
      c.available_credit AS credit_disponible,
      c.created_at AS date_creation,
      c.account_id,
      a.account_type AS type_compte,
      a.account_number AS numero_compte,
      COALESCE(c.credit_limit - c.available_credit, 0) AS solde_utilise
    FROM cards c
    JOIN accounts a ON c.account_id = a.id
    WHERE a.user_id = $1
    ORDER BY c.created_at DESC`,
    [utilisateurId]
  );

  return result.rows;
};

// Obtenir une carte par ID
exports.obtenirCarteParId = async (carteId) => {
  const result = await query(
    `SELECT 
      c.id,
      c.card_number AS numero_carte,
      c.card_type AS type_carte,
      c.expiry_date AS date_expiration,
      c.cvv,
      c.status AS statut,
      c.credit_limit AS limite_credit,
      c.available_credit AS credit_disponible,
      a.user_id AS utilisateur_id
    FROM cards c
    JOIN accounts a ON c.account_id = a.id
    WHERE c.id = $1`,
    [carteId]
  );

  return result.rows[0] || null;
};

// Bloquer une carte
exports.bloquerCarte = async (carteId, raison) => {
  const result = await query(
    `UPDATE cards 
     SET status = 'blocked',
         blocked_reason = $2,
         blocked_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING id`,
    [carteId, raison]
  );

  return result.rows[0];
};

// Débloquer une carte
exports.debloquerCarte = async (carteId) => {
  const result = await query(
    `UPDATE cards 
     SET status = 'active',
         blocked_reason = NULL,
         blocked_at = NULL
     WHERE id = $1
     RETURNING id`,
    [carteId]
  );

  return result.rows[0];
};