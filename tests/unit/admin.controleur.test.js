/**
 * Tests unitaires - Admin Contrôleur
 *
 * Ces tests vérifient la logique du contrôleur administrateur, qui gère :
 *  - Les statistiques du tableau de bord
 *  - L'approbation et le rejet des inscriptions en attente
 *  - Le blocage et le déblocage de comptes utilisateurs
 *  - L'approbation et le rejet de demandes (compte, carte de crédit, etc.)
 *
 * Tous les appels à la BD, aux emails et aux WebSockets sont mockés.
 * Chaque séquence de query.mockResolvedValueOnce() représente l'ordre
 * des requêtes SQL exécutées par le contrôleur testé.
 */

// Mocks — aucun contact avec la base de données réelle
jest.mock('../../server/config/baseDeDonnees', () => ({
  query: jest.fn()
}));
jest.mock('../../server/modeles/notification.modele', () => ({
  creer: jest.fn()
}));
// Les utilitaires email sont mockés pour éviter d'envoyer de vrais emails
jest.mock('../../server/utilitaires/email.utils', () => ({
  envoyerEmailDemandeApprouvee: jest.fn().mockResolvedValue(true),
  envoyerEmailDemandeRejetee: jest.fn().mockResolvedValue(true),
  envoyerEmailCompteSuspendu: jest.fn().mockResolvedValue(true),
  envoyerEmailCompteReactive: jest.fn().mockResolvedValue(true)
}));
// Les WebSockets sont mockés pour éviter de nécessiter une connexion active
jest.mock('../../server/utilitaires/websocket', () => ({
  sendNotificationToUser: jest.fn(),
  sendNotificationToAdmin: jest.fn()
}));

const { query } = require('../../server/config/baseDeDonnees');
const notificationModel = require('../../server/modeles/notification.modele');
const adminControleur = require('../../server/controleurs/admin.controleur');

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
// STATISTIQUES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe('Admin Contrôleur - statistiques', () => {

  test('Retourne les statistiques du tableau de bord', async () => {
    // Simule les données agrégées retournées par la requête SQL de stats
    const statsSimulees = {
      inscriptions_attente: '3',
      demandes_attente: '5',
      utilisateurs_actifs: '42',
      cartes_actives: '38'
    };
    query.mockResolvedValue({ rows: [statsSimulees] });

    const req = { user: { id: 1 } };
    const res = mockRes();
    const next = jest.fn();

    await adminControleur.statistiques(req, res, next);

    // La réponse doit retourner exactement l'objet stats de la BD
    expect(res.json).toHaveBeenCalledWith({ succes: true, stats: statsSimulees });
  });

  test('Erreur BD — appelle next(error)', async () => {
    query.mockRejectedValue(new Error('DB error'));

    const req = { user: { id: 1 } };
    const res = mockRes();
    const next = jest.fn();

    await adminControleur.statistiques(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INSCRIPTIONS EN ATTENTE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe('Admin Contrôleur - inscriptionsEnAttente', () => {

  test('Retourne la liste des inscriptions en attente', async () => {
    // Simule deux utilisateurs dont le statut est 'pending'
    const inscriptions = [
      { id: 1, email: 'a@a.com', prenom: 'Alice', nom: 'Martin' },
      { id: 2, email: 'b@b.com', prenom: 'Bob', nom: 'Tremblay' }
    ];
    query.mockResolvedValue({ rows: inscriptions });

    const req = { user: { id: 1 } };
    const res = mockRes();
    const next = jest.fn();

    await adminControleur.inscriptionsEnAttente(req, res, next);

    expect(res.json).toHaveBeenCalledWith({ succes: true, inscriptions });
  });

  test('Erreur BD — appelle next(error)', async () => {
    query.mockRejectedValue(new Error('DB error'));

    const req = { user: { id: 1 } };
    const res = mockRes();
    const next = jest.fn();

    await adminControleur.inscriptionsEnAttente(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// APPROUVER UNE INSCRIPTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe('Admin Contrôleur - approuverInscription', () => {

  test('Approuve l\'inscription, crée compte chèques et carte de débit', async () => {
    // La séquence de requêtes SQL exécutées par le contrôleur lors de l'approbation :
    query
      .mockResolvedValueOnce({ rows: [] })                                               // 1. UPDATE statut → 'active'
      .mockResolvedValueOnce({ rows: [{ prenom: 'Jean', nom: 'D', email: 'j@j.com' }] }) // 2. SELECT infos utilisateur pour l'email
      .mockResolvedValueOnce({ rows: [{ id: 10, account_number: 'ACC001' }] })            // 3. INSERT compte chèques par défaut
      .mockResolvedValueOnce({ rows: [] })                                               // 4. INSERT transaction de bienvenue (5$)
      .mockResolvedValueOnce({ rows: [{ id: 5, card_number: '4111...', cvv: '123', expiry_date: '2029-01-01' }] }); // 5. INSERT carte de débit

    notificationModel.creer.mockResolvedValue({});

    const req = { params: { userId: '7' }, user: { id: 1 } };
    const res = mockRes();
    const next = jest.fn();

    await adminControleur.approuverInscription(req, res, next);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ succes: true })
    );
  });

  test('Erreur BD — appelle next(error)', async () => {
    query.mockRejectedValue(new Error('DB error'));

    const req = { params: { userId: '7' }, user: { id: 1 } };
    const res = mockRes();
    const next = jest.fn();

    await adminControleur.approuverInscription(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// REJETER UNE INSCRIPTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe('Admin Contrôleur - rejeterInscription', () => {

  test('Rejette l\'inscription et envoie un email', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ email: 'u@u.com', prenom: 'Marie' }] }) // SELECT infos pour l'email de rejet
      .mockResolvedValueOnce({ rows: [] });                                      // UPDATE statut → 'rejected'

    notificationModel.creer.mockResolvedValue({});

    const req = { params: { userId: '7' }, body: { raison: 'Informations invalides' }, user: { id: 1 } };
    const res = mockRes();
    const next = jest.fn();

    await adminControleur.rejeterInscription(req, res, next);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ succes: true }));
    // Une notification de type 'request_rejected' doit être créée pour l'utilisateur
    expect(notificationModel.creer).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'request_rejected', utilisateurId: '7' })
    );
  });

  test('Erreur BD — appelle next(error)', async () => {
    query.mockRejectedValue(new Error('DB error'));

    const req = { params: { userId: '7' }, body: { raison: 'Raison' }, user: { id: 1 } };
    const res = mockRes();
    const next = jest.fn();

    await adminControleur.rejeterInscription(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BLOQUER UN UTILISATEUR
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe('Admin Contrôleur - bloquerUtilisateur', () => {

  test('Utilisateur non trouvé — retourne 404', async () => {
    // Simule : aucun utilisateur avec cet ID en BD
    query.mockResolvedValueOnce({ rows: [] });

    const req = { params: { userId: '99' }, body: { raison: 'Fraude' } };
    const res = mockRes();
    const next = jest.fn();

    await adminControleur.bloquerUtilisateur(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('Tentative de bloquer un admin — retourne 403', async () => {
    // Simule : l'utilisateur ciblé est lui-même un administrateur
    // Un admin ne peut pas en bloquer un autre (protection des comptes privilégiés)
    query.mockResolvedValueOnce({
      rows: [{ role: 'admin', email: 'admin@admin.com', prenom: 'Admin' }]
    });

    const req = { params: { userId: '1' }, body: { raison: 'Test' } };
    const res = mockRes();
    const next = jest.fn();

    await adminControleur.bloquerUtilisateur(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ succes: false }));
  });

  test('Blocage réussi — suspend le compte et crée une notification', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ role: 'user', email: 'u@u.com', prenom: 'Jean' }] }) // SELECT vérification du rôle
      .mockResolvedValueOnce({ rows: [] });                                                   // UPDATE statut → 'suspended'

    notificationModel.creer.mockResolvedValue({});

    const req = { params: { userId: '7' }, body: { raison: 'Activité suspecte' } };
    const res = mockRes();
    const next = jest.fn();

    await adminControleur.bloquerUtilisateur(req, res, next);

    // Une notification 'account_suspended' doit être enregistrée pour l'utilisateur
    expect(notificationModel.creer).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'account_suspended' })
    );
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ succes: true }));
  });

  test('Erreur BD — appelle next(error)', async () => {
    query.mockRejectedValue(new Error('DB error'));

    const req = { params: { userId: '7' }, body: { raison: 'Test' } };
    const res = mockRes();
    const next = jest.fn();

    await adminControleur.bloquerUtilisateur(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DÉBLOQUER UN UTILISATEUR
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe('Admin Contrôleur - debloquerUtilisateur', () => {

  test('Utilisateur non trouvé — retourne 404', async () => {
    query.mockResolvedValueOnce({ rows: [] });

    const req = { params: { userId: '99' } };
    const res = mockRes();
    const next = jest.fn();

    await adminControleur.debloquerUtilisateur(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('Déblocage réussi — réactive le compte et crée une notification', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ email: 'u@u.com', prenom: 'Jean', account_status: 'suspended' }] }) // SELECT
      .mockResolvedValueOnce({ rows: [] });                                                                  // UPDATE statut → 'active'

    notificationModel.creer.mockResolvedValue({});

    const req = { params: { userId: '7' } };
    const res = mockRes();
    const next = jest.fn();

    await adminControleur.debloquerUtilisateur(req, res, next);

    // Une notification 'account_reactivated' informe l'utilisateur que son compte est rétabli
    expect(notificationModel.creer).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'account_reactivated' })
    );
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ succes: true }));
  });

  test('Erreur BD — appelle next(error)', async () => {
    query.mockRejectedValue(new Error('DB error'));

    const req = { params: { userId: '7' } };
    const res = mockRes();
    const next = jest.fn();

    await adminControleur.debloquerUtilisateur(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// APPROUVER UNE DEMANDE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe('Admin Contrôleur - approuverDemande', () => {

  test('Demande non trouvée — retourne 404', async () => {
    // Simule : aucune demande avec cet ID en BD
    query.mockResolvedValueOnce({ rows: [] });

    const req = { params: { demandeId: '99' }, body: { commentaire: 'OK' }, user: { id: 1 } };
    const res = mockRes();
    const next = jest.fn();

    await adminControleur.approuverDemande(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('Demande de type account_opening — crée un compte épargne', async () => {
    // Simule une demande d'ouverture de compte épargne approuvée
    const demande = {
      id: 5, user_id: 7, request_type: 'account_opening', account_type: 'savings',
      email: 'u@u.com', prenom: 'Jean'
    };
    query
      .mockResolvedValueOnce({ rows: [demande] })                           // SELECT demande + infos user
      .mockResolvedValueOnce({ rows: [] })                                  // UPDATE statut → 'approved'
      .mockResolvedValueOnce({ rows: [{ id: 10, account_number: 'SAV001' }] }); // INSERT nouveau compte épargne

    notificationModel.creer.mockResolvedValue({});

    const req = { params: { demandeId: '5' }, body: { commentaire: 'Approuvé' }, user: { id: 1 } };
    const res = mockRes();
    const next = jest.fn();

    await adminControleur.approuverDemande(req, res, next);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ succes: true }));
  });

  test('Demande de type credit_card — crée une carte de crédit', async () => {
    // Simule une demande de carte de crédit avec une limite de 5000 $
    const demande = {
      id: 6, user_id: 7, request_type: 'credit_card', requested_limit: 5000,
      email: 'u@u.com', prenom: 'Jean'
    };
    query
      .mockResolvedValueOnce({ rows: [demande] })
      .mockResolvedValueOnce({ rows: [] })                                                               // UPDATE approved
      .mockResolvedValueOnce({ rows: [{ id: 10 }] })                                                    // SELECT compte chèques principal (requis pour lier la carte)
      .mockResolvedValueOnce({ rows: [{ id: 15, card_number: '4111...', cvv: '456', credit_limit: 5000 }] }); // INSERT carte de crédit

    notificationModel.creer.mockResolvedValue({});

    const req = { params: { demandeId: '6' }, body: { commentaire: 'OK' }, user: { id: 1 } };
    const res = mockRes();
    const next = jest.fn();

    await adminControleur.approuverDemande(req, res, next);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ succes: true }));
  });

  test('Erreur BD — appelle next(error)', async () => {
    query.mockRejectedValue(new Error('DB error'));

    const req = { params: { demandeId: '5' }, body: { commentaire: 'OK' }, user: { id: 1 } };
    const res = mockRes();
    const next = jest.fn();

    await adminControleur.approuverDemande(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// REJETER UNE DEMANDE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe('Admin Contrôleur - rejeterDemande', () => {

  test('Rejette la demande et notifie l\'utilisateur', async () => {
    const demande = { id: 5, user_id: 7, request_type: 'loan', email: 'u@u.com', prenom: 'Jean' };
    query
      .mockResolvedValueOnce({ rows: [demande] }) // SELECT demande + infos utilisateur
      .mockResolvedValueOnce({ rows: [] });        // UPDATE statut → 'rejected'

    notificationModel.creer.mockResolvedValue({});

    const req = { params: { demandeId: '5' }, body: { raison: 'Revenu insuffisant' }, user: { id: 1 } };
    const res = mockRes();
    const next = jest.fn();

    await adminControleur.rejeterDemande(req, res, next);

    // Une notification de rejet doit être envoyée à l'utilisateur concerné
    expect(notificationModel.creer).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'request_rejected', utilisateurId: 7 })
    );
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ succes: true }));
  });

  test('Erreur BD — appelle next(error)', async () => {
    query.mockRejectedValue(new Error('DB error'));

    const req = { params: { demandeId: '5' }, body: { raison: 'Raison' }, user: { id: 1 } };
    const res = mockRes();
    const next = jest.fn();

    await adminControleur.rejeterDemande(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
