const compteModel = require('../modeles/compte.modele');
const transactionModel = require('../modeles/transaction.modele');

// Les modèles retournent déjà des alias français :
//   compte  : numero_compte, type_compte, solde, limite_credit, taux_interet, statut, date_creation, typeFr, user_id
//   transaction: compte_id, type, montant, solde_apres, reference, statut, date, typeFr

exports.obtenirMesComptes = async (req, res, next) => {
    try {
        const comptes = await compteModel.trouverParUtilisateurId(req.utilisateur.id);

        const totaux = { depenses: 0, epargne: 0, credit: 0, investissement: 0 };
        comptes.forEach(c => {
            const solde = parseFloat(c.solde);
            if (c.type_compte === 'checking')    totaux.depenses      += solde;
            else if (c.type_compte === 'savings')    totaux.epargne       += solde;
            else if (c.type_compte === 'credit')     totaux.credit        += solde;
            else if (c.type_compte === 'investment') totaux.investissement += solde;
        });

        const comptesFormates = comptes.map(c => ({
            id:            c.id,
            numeroCompte:  c.numero_compte,
            type:          c.type_compte,
            typeFr:        c.typeFr,
            solde:         parseFloat(c.solde),
            limiteCredit:  c.limite_credit  ? parseFloat(c.limite_credit)  : null,
            tauxInteret:   c.taux_interet   ? parseFloat(c.taux_interet)   : null,
            statut:        c.statut,
            dateCreation:  c.date_creation
        }));

        res.json({ succes: true, comptes: comptesFormates, totaux, nombreComptes: comptes.length });
    } catch (error) {
        console.error('Erreur comptes:', error);
        next(error);
    }
};

exports.obtenirDetailsCompte = async (req, res, next) => {
    try {
        const compte = await compteModel.trouverParId(req.params.id);
        if (!compte) return res.status(404).json({ succes: false, message: 'Compte non trouvé' });
        if (compte.user_id !== req.utilisateur.id) return res.status(403).json({ succes: false, message: 'Accès non autorisé' });

        const transactions = await transactionModel.trouverParCompteId(compte.id, 10);

        res.json({
            succes: true,
            compte: {
                id: compte.id,
                numeroCompte: compte.numero_compte,
                type: compte.type_compte,
                typeFr: compte.typeFr,
                solde: parseFloat(compte.solde),
                statut: compte.statut,
                dateCreation: compte.date_creation
            },
            transactionsRecentes: transactions.map(t => ({
                id:          t.id,
                type:        t.type,
                typeFr:      t.typeFr,
                montant:     parseFloat(t.montant),
                soldeApres:  parseFloat(t.solde_apres),
                description: t.description,
                reference:   t.reference,
                statut:      t.statut,
                date:        t.date
            }))
        });
    } catch (error) { next(error); }
};

exports.obtenirTransactionsCompte = async (req, res, next) => {
    try {
        const compte = await compteModel.trouverParId(req.params.id);
        if (!compte || compte.user_id !== req.utilisateur.id) {
            return res.status(403).json({ succes: false, message: 'Accès non autorisé' });
        }

        const limite = parseInt(req.query.limite) || 25;
        const page   = parseInt(req.query.page)   || 1;
        const offset = (page - 1) * limite;

        const transactions = await transactionModel.trouverParCompteId(compte.id, limite, offset);
        const total        = await transactionModel.compterParCompteId(compte.id);

        res.json({
            succes: true,
            transactions: transactions.map(t => ({
                id:          t.id,
                type:        t.type,
                typeFr:      t.typeFr,
                montant:     parseFloat(t.montant),
                soldeApres:  parseFloat(t.solde_apres),
                description: t.description,
                reference:   t.reference,
                statut:      t.statut,
                date:        t.date
            })),
            pagination: { page, limite, total, pages: Math.ceil(total / limite) }
        });
    } catch (error) { next(error); }
};
