const { query } = require('../config/baseDeDonnees');
const bcrypt = require('bcrypt');
// const hashedAnswer = await bcrypt.hash(security_answer, 10);
// Créer une notification
exports.creer = async ({ user_id, type, titre, message, lien = null }) => {
  const result = await query(
    `INSERT INTO notifications (user_id, type, title, message, link, read)
     VALUES ($1, $2, $3, $4, $5, false)
     RETURNING id`,
    [user_id, type, titre, message, lien]
  );

  return result.rows[0];
};




exports.creerAvecReponseSecurite = async ({notificationId, security_question, security_answer}) => {
  const hashedAnswer = await bcrypt.hash(security_answer, 10);

  const result = await query(
    `INSERT INTO verification_reponses (notification_id, question, reponse_hash)
    VALUES ($1, $2, $3)`,
    [notificationId, security_question, hashedAnswer]
  );

  return result.rows[0];
};


exports.verifierReponse = async (notificationId, reponseUtilisateur) => {
  try {
    // Récupère le hash stocké
    const result = await query(
      'SELECT reponse_hash FROM verification_reponses WHERE notification_id = $1',
      [notificationId]
    );

    if (result.rows.length === 0) {
      return false; // aucune réponse trouvée
    }

    const reponseHash = result.rows[0].reponse_hash;

    // Compare le hash avec la réponse fournie par l'utilisateur
    // (supposons que tu utilises bcrypt pour hasher les réponses)
    const bcrypt = require('bcrypt');
    const match = await bcrypt.compare(reponseUtilisateur, reponseHash);

    return match;

  } catch (err) {
    console.error('Erreur dans verifierReponse:', err);
    throw err;
  }
};


// Obtenir les notifications d'un utilisateur
exports.obtenirParUtilisateur = async (utilisateurId) => {
  const result = await query(
    `SELECT 
      id,
      type,
      title AS titre,
      message,
      link AS lien,
      read AS lue,
      created_at AS date_creation
     FROM notifications
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 50`,
    [utilisateurId]
  );

  return result.rows;
};

// Compter les notifications non lues
exports.compterNonLues = async (utilisateurId) => {
  const result = await query(
    'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND read = false',
    [utilisateurId]
  );

  return parseInt(result.rows[0].count);
};

// Marquer comme lue
exports.marquerCommeLue = async (notificationId, utilisateurId) => {
  await query(
    'UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2',
    [notificationId, utilisateurId]
  );
};

// Marquer toutes comme lues
exports.marquerToutesCommeLues = async (utilisateurId) => {
  await query(
    'UPDATE notifications SET read = true WHERE user_id = $1',
    [utilisateurId]
  );
};