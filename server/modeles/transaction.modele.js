const { query } = require('../config/baseDeDonnees');

// Créer une transaction
exports.creer = async ({ compteId, typeTransaction, montant, soldeApres, description }) => {
  const res = await query(
    `INSERT INTO transactions (account_id, transaction_type, amount, balance_after, description)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING 
       id,
       account_id AS compte_id,
       transaction_type AS type_transaction,
       amount AS montant,
       balance_after AS solde_apres,
       description,
       reference_number AS numero_reference,
       created_at AS cree_le`,
    [compteId, typeTransaction, montant, soldeApres, description]
  );
  return res.rows[0];
};

// Trouver les transactions d'un compte
exports.trouverParCompte = async (compteId, limite = 10) => {
  const res = await query(
    `SELECT 
      id,
      account_id AS compte_id,
      transaction_type AS type_transaction,
      amount AS montant,
      balance_after AS solde_apres,
      description,
      reference_number AS numero_reference,
      created_at AS cree_le
    FROM transactions 
    WHERE account_id = $1
    ORDER BY created_at DESC
    LIMIT $2`,
    [compteId, limite]
  );
  return res.rows;
};

// Obtenir les transactions récentes d'un utilisateur
exports.trouverRecentesParUtilisateur = async (utilisateurId, limite = 10) => {
  const res = await query(
    `SELECT 
      t.id,
      t.account_id AS compte_id,
      a.account_number AS numero_compte,
      t.transaction_type AS type_transaction,
      t.amount AS montant,
      t.balance_after AS solde_apres,
      t.description,
      t.reference_number AS numero_reference,
      t.created_at AS cree_le
    FROM transactions t
    JOIN accounts a ON t.account_id = a.id
    WHERE a.user_id = $1
    ORDER BY t.created_at DESC
    LIMIT $2`,
    [utilisateurId, limite]
  );
  return res.rows;
};