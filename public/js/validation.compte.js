export const isNumCompteValide = (num_compte) =>
    typeof num_compte === 'number' &&
    Number.isInteger(num_compte) &&
    num_compte > 0 && String(num_compte).length >= 10;

export const isSoldeValide = (solde) => {
    const soldeNumber = Number(solde);
    return !isNaN(soldeNumber) && soldeNumber >= 0;
}

export const isDeviseValide = (devise) => {
    const devisesValides = ['USD', 'EUR', 'CAD', 'GBP', 'JPY'];
    return devisesValides.includes(devise);
}

export const isTypeCompteValide = (type_compte) => {
    const typesValides = ['épargne', 'chèque', 'investissement'];
    return typesValides.includes(type_compte);
}

export const isStatutValide = (statut) => {
    const statutsValides = ['actif', 'inactif', 'suspendu'];
    return statutsValides.includes(statut);
}