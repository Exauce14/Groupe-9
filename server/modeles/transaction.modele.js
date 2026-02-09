const { query } = require('../config/baseDeDonnees');

// Colonnes réelles BD : id, account_id, transaction_type, amount, balance_after,
// description, reference_number, status, created_at
// Note : pas de compte_destination_id dans le schéma — on met dans description

const TYPES_FR = { deposit: 'Dépôt', withdrawal: 'Retrait', transfer: 'Virement', payment: 'Paiement', interac: 'Interac' };

exports.creer = async ({ compteId, typeTransaction, montant, soldeApres, description }) => {
    const res = await query(
        `INSERT INTO transactions (account_id, transaction_type, amount, balance_after, description, reference_number)
         VALUES ($1, $2, $3, $4, $5, generate_reference_number())
         RETURNING id, account_id, transaction_type, amount, balance_after, description, reference_number, status, created_at`,
        [compteId, typeTransaction, montant, soldeApres, description || '']
    );
    return res.rows[0];
};

exports.trouverParCompteId = async (compteId, limite = 25, offset = 0) => {
    const res = await query(
        `SELECT id, account_id AS compte_id, transaction_type AS type, amount AS montant,
                balance_after AS solde_apres, description, reference_number AS reference,
                status AS statut, created_at AS date
         FROM transactions WHERE account_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
        [compteId, limite, offset]
    );
    return res.rows.map(t => ({ ...t, typeFr: TYPES_FR[t.type] || t.type }));
};

exports.compterParCompteId = async (compteId) => {
    const res = await query('SELECT COUNT(*) as total FROM transactions WHERE account_id = $1', [compteId]);
    return parseInt(res.rows[0].total);
};

exports.trouverParId = async (id) => {
    const res = await query(
        `SELECT id, account_id AS compte_id, transaction_type AS type, amount AS montant,
                balance_after AS solde_apres, description, reference_number AS reference,
                status AS statut, created_at AS date
         FROM transactions WHERE id = $1`,
        [id]
    );
    const t = res.rows[0] || null;
    if (t) t.typeFr = TYPES_FR[t.type] || t.type;
    return t;
};

exports.trouverParReference = async (reference) => {
    const res = await query(
        `SELECT id, account_id AS compte_id, transaction_type AS type, amount AS montant,
                balance_after AS solde_apres, description, reference_number AS reference,
                status AS statut, created_at AS date
         FROM transactions WHERE reference_number = $1`,
        [reference]
    );
    return res.rows[0] || null;
};

exports.dernieresTransactionsUtilisateur = async (utilisateurId, limite = 10) => {
    const res = await query(
        `SELECT t.id, t.account_id AS compte_id, t.transaction_type AS type,
                t.amount AS montant, t.balance_after AS solde_apres,
                t.description, t.reference_number AS reference,
                t.status AS statut, t.created_at AS date
         FROM transactions t
         JOIN accounts a ON t.account_id = a.id
         WHERE a.user_id = $1
         ORDER BY t.created_at DESC LIMIT $2`,
        [utilisateurId, limite]
    );
    return res.rows.map(t => ({ ...t, typeFr: TYPES_FR[t.type] || t.type }));
};

exports.mettreAJourStatut = async (id, statut) => {
    await query('UPDATE transactions SET status = $1 WHERE id = $2', [statut, id]);
};

exports.supprimer = async (id) => {
    await query('DELETE FROM transactions WHERE id = $1', [id]);
};
