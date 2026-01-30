import { 
    isNomValide, isMailValide, isPasswordValide, 
    isAgeValide, isTelephoneValide, isNASValide, 
    isDateDeNaissanceValide, isAdresseDomicileValide } from '../public/js/validation.js';

export const isProfilValide = (profil) => {
    const erreurs = [];

    if (!isNomValide(profil.nom)) {
        erreurs.push("Nom invalide");
    }

    if (!isNomValide(profil.prenom)) {
        erreurs.push("Prénom invalide");
    }

    if (!isMailValide(profil.email)) {
        erreurs.push("Email invalide");
    }

    if (!isPasswordValide(profil.password)) {
        erreurs.push(
            "Mot de passe invalide (8 caractères, majuscule, minuscule, chiffre)"
        );
    }

    if (!isDateDeNaissanceValide(profil.date_de_naissance)) {
        erreurs.push("Date de naissance invalide (18 ans minimum)");
    }

    if (!isAgeValide(profil.age)) {
        erreurs.push("Âge invalide");
    }

    if (!isTelephoneValide(profil.telephone)) {
        erreurs.push("Téléphone invalide");
    }

    if (!isNASValide(profil.nas)) {
        erreurs.push("NAS invalide");
    }

    if (!isAdresseDomicileValide(profil.adresse_domicile)) {
        erreurs.push("Adresse domiciliaire invalide");
    }

    return {
        valide: erreurs.length === 0,
        erreurs
    };
};

export const profilValide = (request, response, next) => {
    const { nom, prenom, date_de_naissance, age, sexe, nationalite, nas, adresse_domicile, telephone, email, password } = request.body;

    const profil = {
        nom,
        prenom,
        date_de_naissance,
        age,
        sexe,
        nationalite,
        nas,
        adresse_domicile,
        telephone,
        email,
        password
    };

    const resultat = isProfilValide(profil);

    if (resultat.valide) {
        return next();
    } 
    response.status(400).json({ erreurs: resultat.erreurs });
    

}