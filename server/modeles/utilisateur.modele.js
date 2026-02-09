const { query } = require('../config/baseDeDonnees');

// Colonnes réelles dans la BD : id, email, password, first_name, last_name,
// phone, address, role, is_active, login_attempts, locked_until, created_at, updated_at

exports.creer = async ({ email, motDePasse, prenom, nom, telephone, adresse, role }) => {
    const res = await query(
        `INSERT INTO users (email, password, first_name, last_name, phone, address, role)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, email, first_name AS prenom, last_name AS nom, phone AS telephone,
                   address AS adresse, role, is_active AS est_actif`,
        [email, motDePasse, prenom, nom, telephone || null, adresse || null, role || 'user']
    );
    return res.rows[0];
};

exports.trouverParEmail = async (email) => {
    const res = await query(
        `SELECT id, email, password AS mot_de_passe, first_name AS prenom, last_name AS nom,
                phone AS telephone, address AS adresse, role,
                is_active AS est_actif, login_attempts AS tentatives_connexion,
                locked_until AS verrouille_jusqua, created_at AS date_creation
         FROM users WHERE email = $1`,
        [email]
    );
    return res.rows[0] || null;
};

exports.trouverParId = async (id) => {
    const res = await query(
        `SELECT id, email, first_name AS prenom, last_name AS nom,
                phone AS telephone, address AS adresse, role,
                is_active AS est_actif, created_at AS date_creation
         FROM users WHERE id = $1`,
        [id]
    );
    return res.rows[0] || null;
};

exports.mettreAJour = async (id, donnees) => {
    const { prenom, nom, telephone, adresse } = donnees;
    const res = await query(
        `UPDATE users SET first_name=$1, last_name=$2, phone=$3, address=$4, updated_at=NOW()
         WHERE id=$5
         RETURNING id, email, first_name AS prenom, last_name AS nom,
                   phone AS telephone, address AS adresse, role`,
        [prenom, nom, telephone, adresse, id]
    );
    return res.rows[0];
};

exports.incrementerTentativesConnexion = async (id) => {
    await query('UPDATE users SET login_attempts = login_attempts + 1 WHERE id = $1', [id]);
};

exports.reinitialiserTentativesConnexion = async (id) => {
    await query('UPDATE users SET login_attempts = 0, locked_until = NULL WHERE id = $1', [id]);
};

exports.verrouillerCompte = async (id, dureeBlocageMs) => {
    const verrouillJusqua = new Date(Date.now() + dureeBlocageMs);
    await query('UPDATE users SET locked_until = $1 WHERE id = $2', [verrouillJusqua, id]);
};

exports.estVerrouille = async (id) => {
    const res = await query('SELECT locked_until FROM users WHERE id = $1', [id]);
    if (!res.rows[0] || !res.rows[0].locked_until) return false;
    return new Date(res.rows[0].locked_until) > new Date();
};

exports.changerStatut = async (id, estActif) => {
    await query('UPDATE users SET is_active = $1 WHERE id = $2', [estActif, id]);
};

exports.supprimer = async (id) => {
    await query('DELETE FROM users WHERE id = $1', [id]);
};

exports.obtenirTous = async (limite = 50, offset = 0) => {
    const res = await query(
        `SELECT id, email, first_name AS prenom, last_name AS nom, role, created_at AS date_creation
         FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
        [limite, offset]
    );
    return res.rows;
};

exports.compter = async () => {
    const res = await query('SELECT COUNT(*) as total FROM users');
    return parseInt(res.rows[0].total);
};
