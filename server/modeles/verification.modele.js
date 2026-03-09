const { query } = require('../config/baseDeDonnees');

// Générer un code aléatoire à 6 chiffres
exports.genererCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Créer un code de vérification
exports.creer = async ({ utilisateurId, code, type }) => {
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  const result = await query(
    `INSERT INTO verification_codes (user_id, code, type, expires_at)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [utilisateurId, code, type, expiresAt]
  );

  return result.rows[0];
};

// Trouver un code valide (non expiré et non utilisé)
exports.trouverCodeValide = async (utilisateurId, code, type) => {
  const result = await query(
    `SELECT id, code, expires_at
     FROM verification_codes
     WHERE user_id = $1 
       AND code = $2 
       AND type = $3
       AND used = false
       AND expires_at > NOW()
     ORDER BY created_at DESC
     LIMIT 1`,
    [utilisateurId, code, type]
  );

  return result.rows[0] || null;
};

// Marquer un code comme utilisé
exports.marquerUtilise = async (codeId) => {
  await query(
    'UPDATE verification_codes SET used = true WHERE id = $1',
    [codeId]
  );
};

// Invalider tous les codes d'un utilisateur pour un type donné
exports.invaliderCodesUtilisateur = async (utilisateurId, type) => {
  await query(
    'UPDATE verification_codes SET used = true WHERE user_id = $1 AND type = $2',
    [utilisateurId, type]
  );
};

// Nettoyer les codes expirés (à exécuter périodiquement)
exports.nettoyerCodesExpires = async () => {
  const result = await query(
    'DELETE FROM verification_codes WHERE expires_at < NOW() OR used = true RETURNING id'
  );

  return result.rowCount;
};