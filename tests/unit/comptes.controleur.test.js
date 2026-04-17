/**
 * Tests unitaires - Comptes Contrôleur
 *
 * Ces tests vérifient la logique du contrôleur de comptes bancaires :
 *  - Récupération de la liste des comptes d'un utilisateur
 *  - Calcul du résumé des soldes par type de compte
 *  - Récupération de l'historique des transactions d'un compte
 *
 * Les modèles (compte, transaction) sont remplacés par des mocks Jest
 * pour tester le contrôleur indépendamment de la base de données.
 */

// Mocks — aucun contact avec la base de données réelle
jest.mock('../../server/modeles/compte.modele', () => ({
  trouverParUtilisateur: jest.fn(),
  obtenirResumeSoldes: jest.fn()
}));
jest.mock('../../server/modeles/transaction.modele', () => ({
  trouverParCompte: jest.fn()
}));

const compteModel = require('../../server/modeles/compte.modele');
const transactionModel = require('../../server/modeles/transaction.modele');
const comptesControleur = require('../../server/controleurs/comptes.controleur');

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Crée un objet réponse Express simulé avec des méthodes chaînables.
 * Permet de vérifier les appels à res.status() et res.json() dans les tests.
 */
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// Réinitialise les mocks avant chaque test pour éviter les interférences
beforeEach(() => {
  jest.clearAllMocks();
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MES COMPTES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe('Comptes Contrôleur - mesComptes', () => {

  test('Retourne la liste des comptes de l\'utilisateur', async () => {
    // Simule un utilisateur avec un compte chèques et un compte épargne
    const comptesSimules = [
      { id: 1, type_compte: 'checking', solde: 500.00, statut: 'active' },
      { id: 2, type_compte: 'savings', solde: 1200.00, statut: 'active' }
    ];
    compteModel.trouverParUtilisateur.mockResolvedValue(comptesSimules);

    // req.user.id est injecté par le middleware d'authentification JWT
    const req = { user: { id: 42 } };
    const res = mockRes();
    const next = jest.fn();

    await comptesControleur.mesComptes(req, res, next);

    // Le modèle doit être appelé avec l'ID de l'utilisateur connecté
    expect(compteModel.trouverParUtilisateur).toHaveBeenCalledWith(42);
    expect(res.json).toHaveBeenCalledWith({
      succes: true,
      comptes: comptesSimules
    });
  });

  test('Retourne un tableau vide si aucun compte', async () => {
    // Cas d'un utilisateur qui n'a pas encore de compte (ex. inscription en attente)
    compteModel.trouverParUtilisateur.mockResolvedValue([]);

    const req = { user: { id: 42 } };
    const res = mockRes();
    const next = jest.fn();

    await comptesControleur.mesComptes(req, res, next);

    // Un tableau vide est une réponse valide — pas d'erreur
    expect(res.json).toHaveBeenCalledWith({ succes: true, comptes: [] });
  });

  test('Erreur BD — appelle next(error)', async () => {
    // Simule une erreur de connexion à la base de données
    compteModel.trouverParUtilisateur.mockRejectedValue(new Error('DB error'));

    const req = { user: { id: 42 } };
    const res = mockRes();
    const next = jest.fn();

    await comptesControleur.mesComptes(req, res, next);

    // L'erreur doit être transmise au middleware de gestion d'erreurs via next()
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RÉSUMÉ DES SOLDES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe('Comptes Contrôleur - resumeSoldes', () => {

  test('Retourne le résumé des soldes par type de compte', async () => {
    // Simule le résultat d'une requête SQL d'agrégation des soldes par type
    const resumeSimule = {
      total_cheques: '500.00',
      total_epargne: '1200.00',
      total_investissement: '0.00',
      total_general: '1700.00'
    };
    compteModel.obtenirResumeSoldes.mockResolvedValue(resumeSimule);

    const req = { user: { id: 42 } };
    const res = mockRes();
    const next = jest.fn();

    await comptesControleur.resumeSoldes(req, res, next);

    // Le modèle doit être appelé avec l'ID de l'utilisateur connecté
    expect(compteModel.obtenirResumeSoldes).toHaveBeenCalledWith(42);
    expect(res.json).toHaveBeenCalledWith({
      succes: true,
      resume: resumeSimule
    });
  });

  test('Erreur BD — appelle next(error)', async () => {
    compteModel.obtenirResumeSoldes.mockRejectedValue(new Error('DB error'));

    const req = { user: { id: 42 } };
    const res = mockRes();
    const next = jest.fn();

    await comptesControleur.resumeSoldes(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TRANSACTIONS D'UN COMPTE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe('Comptes Contrôleur - transactionsCompte', () => {

  test('Retourne les transactions du compte avec la limite par défaut (10)', async () => {
    // Simule deux transactions récentes sur le compte
    const transactionsSimulees = [
      { id: 1, type_transaction: 'deposit', montant: '50.00' },
      { id: 2, type_transaction: 'withdrawal', montant: '20.00' }
    ];
    transactionModel.trouverParCompte.mockResolvedValue(transactionsSimulees);

    // Aucune limite personnalisée dans query params → valeur par défaut de 10
    const req = { params: { compteId: '5' }, query: {} };
    const res = mockRes();
    const next = jest.fn();

    await comptesControleur.transactionsCompte(req, res, next);

    // Le modèle doit être appelé avec la limite par défaut de 10 transactions
    expect(transactionModel.trouverParCompte).toHaveBeenCalledWith('5', 10);
    expect(res.json).toHaveBeenCalledWith({
      succes: true,
      transactions: transactionsSimulees
    });
  });

  test('Retourne les transactions avec une limite personnalisée', async () => {
    // L'utilisateur demande les 25 dernières transactions via ?limite=25
    transactionModel.trouverParCompte.mockResolvedValue([]);

    const req = { params: { compteId: '5' }, query: { limite: '25' } };
    const res = mockRes();
    const next = jest.fn();

    await comptesControleur.transactionsCompte(req, res, next);

    // Le modèle doit recevoir la limite convertie en nombre (25, pas '25')
    expect(transactionModel.trouverParCompte).toHaveBeenCalledWith('5', 25);
  });

  test('Erreur BD — appelle next(error)', async () => {
    transactionModel.trouverParCompte.mockRejectedValue(new Error('DB error'));

    const req = { params: { compteId: '5' }, query: {} };
    const res = mockRes();
    const next = jest.fn();

    await comptesControleur.transactionsCompte(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
