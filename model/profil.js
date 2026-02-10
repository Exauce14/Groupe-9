import bcrypt from 'bcrypt';
import { pool } from '../db/db.js';


//Recuperer tous les profils
export const getAllProfils = async () => {
    const resultats =  await pool.query(
        `SELECT 
        id, nom, prenom, date_naissance, age, 
        sexe, nationalite, nas, adresse, telephone, 
        email, statut FROM utilisateurs`);

    return resultats.rows

}

//Creer un profil 
export const createProfil = async (dataProfil) => {

    //Vérifie si l'utilisateur existe déjà (email, NAS, téléphone, password)
    const existingUser = await pool.query(
        `SELECT id FROM utilisateurs WHERE email = $1 OR nas = $2 OR telephone = $3`,
        [dataProfil.email, dataProfil.nas, dataProfil.telephone]
    );

    if (existingUser.rows.length > 0) {
        throw new Error('Un utilisateur avec cet email ou NAS existe déjà.');
    }

    const hash = await bcrypt.hash(dataProfil.password, 10);

    const resultats = await pool.query(
        `INSERT INTO utilisateurs 
            (nom, prenom, date_naissance, age, sexe, nationalite, nas, adresse, telephone, email, password) 
        VALUES 
            ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id`,
        [
            dataProfil.nom,
            dataProfil.prenom,
            dataProfil.date_naissance,
            dataProfil.age,
            dataProfil.sexe,
            dataProfil.nationalite,
            dataProfil.nas,
            dataProfil.adresse,
            dataProfil.telephone,
            dataProfil.email,
            hash
        ]
    );

    return {
        ...dataProfil,
        id: resultats.rows[0].id
    }

}

//Recuperer un profil par son id
export const getProfilById = async (id) => {
    const profilResult = await pool.query(
        `SELECT 
        id, nom, prenom, date_naissance, age, 
        sexe, nationalite, nas, adresse, telephone, 
        email FROM utilisateurs WHERE id = $1`, [id]);

    return profilResult.rows[0]
}
//Recuperer un profil par son email
export const getProfilByEmail = async (email) => {
    const result = await pool.query(
        `SELECT id, email, password, statut, tentatives
         FROM utilisateurs
         WHERE email = $1`,
        [email]
    );

    return result.rows[0] || null;
};
//Incrémenter le nombre de tentatives de connexion
export const incrementerTentatives = async (email) => {
    await pool.query(
        `UPDATE utilisateurs
         SET tentatives = tentatives + 1,
             derniere_tentative = NOW()
         WHERE email = $1`,
        [email]
    );
};
//bloquer un compte après trop de tentatives    
export const bloquerCompte = async (email) => {
    await pool.query(
        `UPDATE utilisateurs
         SET statut = 'bloquer'
         WHERE email = $1`,
        [email]
    );
};
//Réinitialiser le nombre de tentatives après une connexion réussie
export const resetTentatives = async (email) => {
    await pool.query(
        `UPDATE utilisateurs
         SET tentatives = 0
         WHERE email = $1`,
        [email]
    );
};



//Recuperer un profil par son statut
export const getProfilByStatut = async (statut) => {
    const profilResult = await pool.query(
        `SELECT 
        id, nom, prenom, date_naissance, age, 
        sexe, nationalite, nas, adresse, telephone, 
        email FROM utilisateurs WHERE statut = $1`, [statut]);

    return profilResult.rows

}


//Modifier un profil
export const updateProfil = async (id, dataProfil) => {
    try {
        // 1️⃣ Hasher le mot de passe uniquement si présent
        if (dataProfil.password) {
            dataProfil.password = await bcrypt.hash(dataProfil.password, 10);
        }

        // 2️⃣ Construire dynamiquement la requête SQL
        const fields = [];
        const values = [];
        let i = 1;

        for (const key in dataProfil) {
            fields.push(`${key} = $${i}`);
            values.push(dataProfil[key]);
            i++;
        }

        if (fields.length === 0) {
            throw new Error("Aucune donnée à mettre à jour");
        }

        values.push(id); // dernier paramètre pour WHERE id = $N

        const query = `
            UPDATE utilisateurs
            SET ${fields.join(', ')}
            WHERE id = $${i}
            RETURNING *;
        `;

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            throw new Error("Utilisateur introuvable");
        }

        return result.rows[0];

    } catch (error) {
        throw error;
    }
};


// Supprimer un profil
export const deleteProfil = async (id) => {

    const profilResult = await pool.query(
        `DELETE FROM utilisateurs WHERE id = $1`, [id]);

    return profilResult.rowCount > 0;   
}