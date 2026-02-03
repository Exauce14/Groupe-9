import { pool } from '../db/db.js';

//Recuperer tous les comptes
export const getComptes = async () => {
    const resultats =  await pool.query(
        `SELECT 
        id, utilisateur_id, num_compte, type_compte, solde, devise, statut 
        FROM comptes`);
        
    return resultats.rows
}

export const createCompte = async (dataCompte) => {

    // Vérifier que l'utilisateur existe
    const utilisateurResult = await pool.query(
        `SELECT id FROM utilisateurs WHERE id = $1`,
        [dataCompte.utilisateur_id]
    );

    if (utilisateurResult.rows.length === 0) {
        throw new Error("Utilisateur inexistant");
    }

    const utilisateurId = utilisateurResult.rows[0].id;

    // Insérer le compte avec l'id utilisateur
    const resultats = await pool.query(
        `INSERT INTO comptes 
            (utilisateur_id, num_compte, type_compte, solde, devise, statut) 
         VALUES 
            ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [
            utilisateurId,
            dataCompte.num_compte,
            dataCompte.type_compte,
            dataCompte.solde,
            dataCompte.devise,
            dataCompte.statut
        ]
    );

    return {
        id: resultats.rows[0].id,
        utilisateur_id: utilisateurId,
        num_compte: dataCompte.num_compte,
        type_compte: dataCompte.type_compte,
        solde: dataCompte.solde,
        devise: dataCompte.devise,
        statut: dataCompte.statut
    };
};

// Mettre à jour un compte
export const updateCompte = async (id, dataCompte) => {
    const resultats = await pool.query(
        `UPDATE comptes SET 
            num_compte = COALESCE($1, num_compte),
            type_compte = COALESCE($2, type_compte),
            solde = COALESCE($3, solde),
            devise = COALESCE($4, devise),
            statut = COALESCE($5, statut)
        WHERE id = $6
        RETURNING *`,
        [
            dataCompte.num_compte,
            dataCompte.type_compte,
            dataCompte.solde,
            dataCompte.devise,
            dataCompte.statut,
            id
        ]
    );

    if (resultats.rows.length === 0) {
        return null;
    }

    return resultats.rows[0];
};



//Supprimer un compte
export const deleteCompte = async (id) => {
    const resultat = await pool.query(
        `DELETE FROM comptes WHERE id = $1`, [id]);
    
    return resultat.rowCount > 0;  
}   

//Recuperer un compte par son numero de compte
export const getCompteByNumCompte = async (num_compte) => {
    return compte.find(compte => compte.num_compte === num_compte) 
}

// Récupérer un compte par son id
export const getCompteById = async (id) => {
    const resultat = await pool.query(
        `SELECT 
        id, utilisateur_id, num_compte, type_compte, solde, devise, statut 
        FROM comptes WHERE id = $1`, [id]);

    return resultat.rows[0];
}


