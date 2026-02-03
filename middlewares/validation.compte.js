import { isDeviseValide, isNumCompteValide, isSoldeValide, isStatutValide, isTypeCompteValide  } from '../public/js/validation.compte.js';

const isCompteValide = (compte) => {
    const erreurs = [];

    if ( !isNumCompteValide(compte.num_compte) ) {
        erreurs.push("Numéro de compte invalide");
    }

    if ( !isSoldeValide(compte.solde) ) {
        erreurs.push("Solde invalide");
    }

    if ( !isDeviseValide(compte.devise) ) {
        erreurs.push("Devise invalide");
    }

    if ( !isTypeCompteValide(compte.type_compte) ) {
        erreurs.push("Type de compte invalide");
    }

    if ( !isStatutValide(compte.statut) ) {
        erreurs.push("Statut invalide");
    }

    return {
        valide: erreurs.length === 0,
        erreurs
    };
}

export const compteValide = (request, response, next) => {
    const { utilisateur_id, num_compte, type_compte, solde, devise, statut } = request.body;

    const compte = {
        utilisateur_id,
        num_compte,
        type_compte,
        solde,
        devise,
        statut
    };

    const validation = isCompteValide(compte);

    if (!validation.valide) {
        return response.status(400).json({ erreurs: validation.erreurs });
    }

    next();
};
