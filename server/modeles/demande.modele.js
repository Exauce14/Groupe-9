const { query } = require('../config/baseDeDonnees');

// Créer une demande
exports.creer = async ({ utilisateurId, typeRequete, typeCompte, typeCarte, limiteCredit, justification }) => {
  const res = await query(
    `INSERT INTO requests (user_id, request_type, account_type, card_type, requested_limit, justification)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING 
       id,
       user_id AS utilisateur_id,
       request_type AS type_requete,
       account_type AS type_compte,
       card_type AS type_carte,
       requested_limit AS limite_demandee,
       justification,
       status AS statut,
       created_at AS cree_le`,
    [utilisateurId, typeRequete, typeCompte, typeCarte, limiteCredit, justification]
  );
  return res.rows[0];
};

// Trouver les demandes d'un utilisateur
exports.trouverParUtilisateur = async (utilisateurId) => {
  const res = await query(
    `SELECT 
      id,
      user_id AS utilisateur_id,
      request_type AS type_requete,
      account_type AS type_compte,
      card_type AS type_carte,
      requested_limit AS limite_demandee,
      justification,
      status AS statut,
      reviewed_by AS revue_par,
      review_comment AS commentaire_revue,
      reviewed_at AS revue_le,
      created_at AS cree_le,
      updated_at AS mis_a_jour_le
    FROM requests 
    WHERE user_id = $1
    ORDER BY created_at DESC`,
    [utilisateurId]
  );
  return res.rows;
};

// Trouver toutes les demandes en attente (pour admin)
exports.trouverEnAttente = async () => {
  const res = await query(
    `SELECT 
      r.id,
      r.user_id AS utilisateur_id,
      u.first_name AS prenom,
      u.last_name AS nom,
      u.email,
      u.status AS statut_utilisateur,
      u.annual_income AS revenu_annuel,
      r.request_type AS type_requete,
      r.account_type AS type_compte,
      r.card_type AS type_carte,
      r.requested_limit AS limite_demandee,
      r.justification,
      r.status AS statut,
      r.created_at AS cree_le
    FROM requests r
    JOIN users u ON r.user_id = u.id
    WHERE r.status = 'pending'
    ORDER BY r.created_at ASC`
  );
  return res.rows;
};

// Approuver une demande
exports.approuver = async (demandeId, adminId, commentaire) => {
  const res = await query(
    `UPDATE requests 
     SET status = 'approved', 
         reviewed_by = $2, 
         review_comment = $3,
         reviewed_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING 
       id,
       user_id AS utilisateur_id,
       request_type AS type_requete,
       status AS statut`,
    [demandeId, adminId, commentaire]
  );
  return res.rows[0];
};

// Rejeter une demande
exports.rejeter = async (demandeId, adminId, commentaire) => {
  const res = await query(
    `UPDATE requests 
     SET status = 'rejected', 
         reviewed_by = $2, 
         review_comment = $3,
         reviewed_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING 
       id,
       user_id AS utilisateur_id,
       request_type AS type_requete,
       status AS statut`,
    [demandeId, adminId, commentaire]
  );
  return res.rows[0];
};

// Trouver une demande par ID
exports.trouverParId = async (demandeId) => {
  const res = await query(
    `SELECT 
      r.*,
      u.first_name AS prenom_utilisateur,
      u.last_name AS nom_utilisateur,
      u.email AS email_utilisateur,
      u.status AS statut_utilisateur,
      u.annual_income AS revenu_annuel
    FROM requests r
    JOIN users u ON r.user_id = u.id
    WHERE r.id = $1`,
    [demandeId]
  );
  return res.rows[0];
};