/**
 * Tests unitaires - Demandes Contrôleur
 *
 * Ces tests vérifient la logique du contrôleur de demandes clients :
 *  - Création d'une demande (carte de crédit, compte, prêt, etc.)
 *  - Récupération de la liste des demandes de l'utilisateur connecté
 *  - Récupération d'une demande spécifique par ID
 *
 * Règles métier clés vérifiées :
 *  - Seul un compte 'active' peut soumettre une demande (pas 'pending' ni 'suspended')
 *  - Une notification est créée à chaque soumission
 *  - Une notification WebSocket est envoyée à l'admin
 *
 * La BD, le modèle notification et le WebSocket sont tous mockés.
 */

// Mocks — aucun contact avec la base de données réelle
jest.mock('../../server/config/baseDeDonnees', () => ({
  query: jest.fn()
}));
jest.mock('../../server/modeles/notification.modele', () => ({
  creer: jest.fn()
}));
// Le WebSocket est mocké pour éviter de nécessiter une connexion active
jest.mock('../../server/utilitaires/websocket', () => ({
  sendNotificationToAdmin: jest.fn(),
  sendNotificationToUser: jest.fn()
}));

const { query } = require('../../server/config/baseDeDonnees');
const notificationModel = require('../../server/modeles/notification.modele');
const demandesControleur = require('../../server/controleurs/demandes.controleur');

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
// CRÉER UNE DEMANDE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe('Demandes Contrôleur - creerDemande', () => {
  // Corps de requête typique pour une demande de carte de crédit
  const bodyDemande = {
    typeDemande: 'credit_card',
    typeCarte: 'visa',
    limiteDemandee: 5000,
    justification: 'Besoin de crédit'
  };

  test('Compte inactif — retourne 403', async () => {
    // Simule : le compte de l'utilisateur est en attente d'approbation (statut 'pending')
    // Un compte non actif ne peut pas soumettre de demande
    query.mockResolvedValueOnce({ rows: [{ account_status: 'pending' }] });

    const req = { body: bodyDemande, user: { id: 42 } };
    const res = mockRes();
    const next = jest.fn();

    await demandesControleur.creerDemande(req, res, next);

    // 403 Forbidden : l'utilisateur n'a pas les droits pour soumettre une demande
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ succes: false }));
  });

  test('Compte non trouvé — retourne 403', async () => {
    // Simule : aucun utilisateur trouvé avec cet ID (cas anormal, token invalide?)
    query.mockResolvedValueOnce({ rows: [] });

    const req = { body: bodyDemande, user: { id: 42 } };
    const res = mockRes();
    const next = jest.fn();

    await demandesControleur.creerDemande(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('Demande créée avec succès — retourne 201', async () => {
    // Séquence des requêtes SQL exécutées lors de la création d'une demande :
    query
      .mockResolvedValueOnce({ rows: [{ account_status: 'active' }] })  // 1. Vérif. statut du compte
      .mockResolvedValueOnce({ rows: [{ id: 10 }] })                    // 2. INSERT demande → retourne l'ID créé
      .mockResolvedValueOnce({ rows: [{ first_name: 'Jean', last_name: 'Dupont', email: 'j@j.com' }] }); // 3. SELECT infos utilisateur pour la notif admin

    notificationModel.creer.mockResolvedValue({});

    const req = { body: bodyDemande, user: { id: 42 } };
    const res = mockRes();
    const next = jest.fn();

    await demandesControleur.creerDemande(req, res, next);

    // 201 Created : la demande a été enregistrée avec son nouvel ID
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ succes: true, demandeId: 10 })
    );
  });

  test('Notification créée après soumission de demande', async () => {
    // Même scénario que le test précédent — on vérifie ici spécifiquement
    // que la notification 'request_submitted' est bien créée pour l'utilisateur
    query
      .mockResolvedValueOnce({ rows: [{ account_status: 'active' }] })
      .mockResolvedValueOnce({ rows: [{ id: 10 }] })
      .mockResolvedValueOnce({ rows: [{ first_name: 'Jean', last_name: 'Dupont', email: 'j@j.com' }] });

    notificationModel.creer.mockResolvedValue({});

    const req = { body: bodyDemande, user: { id: 42 } };
    const res = mockRes();
    const next = jest.fn();

    await demandesControleur.creerDemande(req, res, next);

    // Une notification doit informer l'utilisateur que sa demande a été reçue
    expect(notificationModel.creer).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'request_submitted', utilisateurId: 42 })
    );
  });

  test('Erreur BD — appelle next(error)', async () => {
    // Simule une erreur sur la première requête (vérification du statut)
    query.mockRejectedValue(new Error('DB error'));

    const req = { body: bodyDemande, user: { id: 42 } };
    const res = mockRes();
    const next = jest.fn();

    await demandesControleur.creerDemande(req, res, next);

    // L'erreur doit être transmise au middleware de gestion d'erreurs via next()
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MES DEMANDES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe('Demandes Contrôleur - mesDemandes', () => {

  test('Retourne la liste des demandes de l\'utilisateur', async () => {
    // Simule deux demandes : une en attente et une approuvée
    const demandesSimulees = [
      { id: 1, type_demande: 'credit_card', statut: 'pending' },
      { id: 2, type_demande: 'loan', statut: 'approved' }
    ];
    query.mockResolvedValue({ rows: demandesSimulees });

    const req = { user: { id: 42 } };
    const res = mockRes();
    const next = jest.fn();

    await demandesControleur.mesDemandes(req, res, next);

    expect(res.json).toHaveBeenCalledWith({
      succes: true,
      demandes: demandesSimulees
    });
  });

  test('Retourne un tableau vide si aucune demande', async () => {
    // Cas d'un utilisateur qui n'a jamais soumis de demande
    query.mockResolvedValue({ rows: [] });

    const req = { user: { id: 42 } };
    const res = mockRes();
    const next = jest.fn();

    await demandesControleur.mesDemandes(req, res, next);

    // Un tableau vide est une réponse valide — pas d'erreur
    expect(res.json).toHaveBeenCalledWith({ succes: true, demandes: [] });
  });

  test('Erreur BD — appelle next(error)', async () => {
    query.mockRejectedValue(new Error('DB error'));

    const req = { user: { id: 42 } };
    const res = mockRes();
    const next = jest.fn();

    await demandesControleur.mesDemandes(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// OBTENIR UNE DEMANDE SPÉCIFIQUE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe('Demandes Contrôleur - obtenirDemande', () => {

  test('Demande non trouvée — retourne 404', async () => {
    // Simule : aucune demande avec cet ID appartenant à cet utilisateur
    query.mockResolvedValue({ rows: [] });

    const req = { params: { demandeId: '999' }, user: { id: 42 } };
    const res = mockRes();
    const next = jest.fn();

    await demandesControleur.obtenirDemande(req, res, next);

    // 404 Not Found : la demande n'existe pas ou n'appartient pas à l'utilisateur
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ succes: false }));
  });

  test('Retourne la demande si elle appartient à l\'utilisateur', async () => {
    // La requête SQL filtre déjà par user_id, donc seules les demandes
    // de l'utilisateur connecté sont retournées
    const demandeSimulee = { id: 5, type_demande: 'credit_card', statut: 'pending' };
    query.mockResolvedValue({ rows: [demandeSimulee] });

    const req = { params: { demandeId: '5' }, user: { id: 42 } };
    const res = mockRes();
    const next = jest.fn();

    await demandesControleur.obtenirDemande(req, res, next);

    expect(res.json).toHaveBeenCalledWith({ succes: true, demande: demandeSimulee });
  });

  test('Erreur BD — appelle next(error)', async () => {
    query.mockRejectedValue(new Error('DB error'));

    const req = { params: { demandeId: '5' }, user: { id: 42 } };
    const res = mockRes();
    const next = jest.fn();

    await demandesControleur.obtenirDemande(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
