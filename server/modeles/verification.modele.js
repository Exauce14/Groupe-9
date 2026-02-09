const { query } = require('../config/baseDeDonnees');

// Générer un code à 6 chiffres
exports.genererCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Créer un code de vérification
exports.creer = async ({ userId, code, type, dureeValiditeMinutes = 10 }) => {
    const expiresAt = new Date(Date.now() + dureeValiditeMinutes * 60 * 1000);
    
    const res = await query(
        `INSERT INTO verification_codes (user_id, code, type, expires_at)
         VALUES ($1, $2, $3, $4)
         RETURNING id, user_id, code, type, expires_at, used`,
        [userId, code, type, expiresAt]
    );
    return res.rows[0];
};

// Trouver un code valide
exports.trouverCodeValide = async (userId, code, type) => {
    const res = await query(
        `SELECT * FROM verification_codes 
         WHERE user_id = $1 AND code = $2 AND type = $3 
         AND used = false AND expires_at > NOW()
         ORDER BY created_at DESC LIMIT 1`,
        [userId, code, type]
    );
    return res.rows[0] || null;
};

// Marquer un code comme utilisé
exports.marquerUtilise = async (id) => {
    await query('UPDATE verification_codes SET used = true WHERE id = $1', [id]);
};

// Supprimer les codes expirés (nettoyage)
exports.supprimerExpires = async () => {
    await query('DELETE FROM verification_codes WHERE expires_at < NOW()');
};

// Invalider tous les codes d'un utilisateur (lors de nouvelle demande)
exports.invaliderCodesUtilisateur = async (userId, type) => {
    await query(
        'UPDATE verification_codes SET used = true WHERE user_id = $1 AND type = $2 AND used = false',
        [userId, type]
    );
};
