const { query } = require('../config/baseDeDonnees');

async function ajouterBeneficiaire(utilisateurId, nom, email, telephone) {
  const res = await query(
    `INSERT INTO beneficiaires (utilisateur_id, nom, email, telephone)
     VALUES ($1, $2, $3, $4)
     RETURNING id, utilisateur_id AS utilisateurId, nom, email, telephone, created_at AS creeLe`,
    [utilisateurId, nom, email, telephone]
  );
  return res.rows[0];
}

async function obtenirBeneficiairesParUtilisateur(utilisateurId) {
  const res = await query(
    `SELECT id, utilisateur_id AS utilisateurId, nom, email, telephone, created_at AS creeLe
     FROM beneficiaires 
     WHERE utilisateur_id = $1
     ORDER BY created_at DESC`,
    [utilisateurId]
  );
  return res.rows;
}

module.exports = {
  ajouterBeneficiaire,
  obtenirBeneficiairesParUtilisateur
};