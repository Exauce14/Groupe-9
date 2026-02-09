const { query } = require('../config/baseDeDonnees');

// Colonnes réelles BD : id, user_id, account_number, account_type, balance,
// credit_limit, interest_rate, status, created_at, updated_at

const TYPES_FR = { checking: 'Chèques', savings: 'Épargne', credit: 'Crédit', investment: 'Investissement' };

exports.creer = async ({ utilisateurId, typeCompte, soldeInitial = 0 }) => {
    const res = await query(
        `INSERT INTO accounts (user_id, account_number, account_type, balance)
         VALUES ($1, generate_account_number(), $2, $3)
         RETURNING id, user_id, account_number, account_type, balance, status, created_at`,
        [utilisateurId, typeCompte, soldeInitial]
    );
    const compte = res.rows[0];

    if (soldeInitial > 0) {
        const transactionModel = require('./transaction.modele');
        await transactionModel.creer({
            compteId: compte.id,
            typeTransaction: 'deposit',
            montant: soldeInitial,
            soldeApres: soldeInitial,
            description: 'Dépôt initial lors de la création du compte'
        });
    }

    return compte;
};

exports.trouverParUtilisateurId = async (utilisateurId) => {
    const res = await query(
        `SELECT id, user_id, account_number AS numero_compte, account_type AS type_compte,
                balance AS solde, credit_limit AS limite_credit, interest_rate AS taux_interet,
                status AS statut, created_at AS date_creation
         FROM accounts WHERE user_id = $1 ORDER BY created_at DESC`,
        [utilisateurId]
    );
    // Ajouter le label français du type
    return res.rows.map(c => ({ ...c, typeFr: TYPES_FR[c.type_compte] || c.type_compte }));
};

exports.trouverParId = async (id) => {
    const res = await query(
        `SELECT id, user_id, account_number AS numero_compte, account_type AS type_compte,
                balance AS solde, credit_limit AS limite_credit, interest_rate AS taux_interet,
                status AS statut, created_at AS date_creation
         FROM accounts WHERE id = $1`,
        [id]
    );
    const compte = res.rows[0] || null;
    if (compte) compte.typeFr = TYPES_FR[compte.type_compte] || compte.type_compte;
    return compte;
};

exports.trouverParNumero = async (numero) => {
    const res = await query(
        `SELECT id, user_id, account_number AS numero_compte, account_type AS type_compte,
                balance AS solde, status AS statut
         FROM accounts WHERE account_number = $1`,
        [numero]
    );
    return res.rows[0] || null;
};

exports.obtenirSolde = async (id) => {
    const res = await query('SELECT balance FROM accounts WHERE id = $1', [id]);
    return res.rows[0] ? parseFloat(res.rows[0].balance) : null;
};

exports.mettreAJourSolde = async (id, nouveauSolde) => {
    await query('UPDATE accounts SET balance = $1, updated_at = NOW() WHERE id = $2', [nouveauSolde, id]);
};

exports.compterParUtilisateur = async (utilisateurId) => {
    const res = await query('SELECT COUNT(*) as total FROM accounts WHERE user_id = $1', [utilisateurId]);
    return parseInt(res.rows[0].total);
};

exports.aDejaTypeCompte = async (utilisateurId, typeCompte) => {
    const res = await query(
        "SELECT COUNT(*) as total FROM accounts WHERE user_id = $1 AND account_type = $2 AND status = 'active'",
        [utilisateurId, typeCompte]
    );
    return parseInt(res.rows[0].total) > 0;
};

exports.fermer = async (id) => {
    await query("UPDATE accounts SET status = 'closed', updated_at = NOW() WHERE id = $1", [id]);
};

exports.supprimer = async (id) => {
    await query('DELETE FROM accounts WHERE id = $1', [id]);
};
