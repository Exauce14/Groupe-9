/**
 * Tests unitaires - Cartes Contrôleur
 *
 * Ces tests vérifient la logique du contrôleur de gestion des cartes bancaires :
 *  - Récupération de la liste des cartes d'un utilisateur
 *  - Blocage d'une carte (vérification de propriété, statut, notification)
 *  - Déblocage d'une carte (mêmes vérifications dans l'autre sens)
 *
 * Le modèle carte et le modèle notification sont remplacés par des mocks Jest.
 * Les vérifications de sécurité (appartenance à l'utilisateur, statut de la carte)
 * sont toutes testées ici.
 */

// Mocks — aucun contact avec la base de données réelle
jest.mock('../../server/modeles/carte.modele', () => ({
  obtenirCartesUtilisateur: jest.fn(),
  obtenirCarteParId: jest.fn(),
  bloquerCarte: jest.fn(),
  debloquerCarte: jest.fn()
}));
jest.mock('../../server/modeles/notification.modele', () => ({
  creer: jest.fn()
}));

const carteModel = require('../../server/modeles/carte.modele');
const notificationModel = require('../../server/modeles/notification.modele');
const cartesControleur = require('../../server/controleurs/cartes.controleur');

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
// MES CARTES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe('Cartes Contrôleur - mesCartes', () => {

  test('Retourne la liste des cartes de l\'utilisateur', async () => {
    // Simule un utilisateur avec une carte de débit et une carte de crédit
    const cartesSimulees = [
      { id: 1, numero_carte: '4111111111111111', type_carte: 'debit', statut: 'active' },
      { id: 2, numero_carte: '5500000000000004', type_carte: 'credit', statut: 'active' }
    ];
    carteModel.obtenirCartesUtilisateur.mockResolvedValue(cartesSimulees);

    // req.user.id est injecté par le middleware d'authentification JWT
    const req = { user: { id: 42 } };
    const res = mockRes();
    const next = jest.fn();

    await cartesControleur.mesCartes(req, res, next);

    // Le modèle doit être appelé avec l'ID de l'utilisateur connecté
    expect(carteModel.obtenirCartesUtilisateur).toHaveBeenCalledWith(42);
    expect(res.json).toHaveBeenCalledWith({ succes: true, cartes: cartesSimulees });
  });

  test('Erreur BD — appelle next(error)', async () => {
    carteModel.obtenirCartesUtilisateur.mockRejectedValue(new Error('DB error'));

    const req = { user: { id: 42 } };
    const res = mockRes();
    const next = jest.fn();

    await cartesControleur.mesCartes(req, res, next);

    // L'erreur doit être transmise au middleware de gestion d'erreurs via next()
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BLOQUER UNE CARTE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe('Cartes Contrôleur - bloquerCarte', () => {
  // Représente une carte active appartenant à l'utilisateur 42
  const carteActive = {
    id: 1,
    numero_carte: '4111111111111111',
    utilisateur_id: 42,
    statut: 'active'
  };

  test('Carte non trouvée — retourne 404', async () => {
    // Simule : aucune carte avec cet ID en BD
    carteModel.obtenirCarteParId.mockResolvedValue(null);

    const req = { params: { carteId: '1' }, body: { raison: 'Perdue' }, user: { id: 42 } };
    const res = mockRes();
    const next = jest.fn();

    await cartesControleur.bloquerCarte(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ succes: false }));
  });

  test('Carte appartient à un autre utilisateur — retourne 403', async () => {
    // Simule : la carte existe mais appartient à l'utilisateur 99, pas 42
    // → vérification de propriété : un utilisateur ne peut bloquer que ses propres cartes
    carteModel.obtenirCarteParId.mockResolvedValue({ ...carteActive, utilisateur_id: 99 });

    const req = { params: { carteId: '1' }, body: { raison: 'Perdue' }, user: { id: 42 } };
    const res = mockRes();
    const next = jest.fn();

    await cartesControleur.bloquerCarte(req, res, next);

    // 403 Forbidden : l'utilisateur n'est pas propriétaire de cette carte
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('Carte déjà bloquée — retourne 400', async () => {
    // Simule : la carte est déjà dans l'état 'blocked' — aucune action nécessaire
    carteModel.obtenirCarteParId.mockResolvedValue({ ...carteActive, statut: 'blocked' });

    const req = { params: { carteId: '1' }, body: { raison: 'Perdue' }, user: { id: 42 } };
    const res = mockRes();
    const next = jest.fn();

    await cartesControleur.bloquerCarte(req, res, next);

    // 400 Bad Request : impossible de bloquer une carte déjà bloquée
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('Blocage réussi — retourne 200 et crée une notification', async () => {
    // Simule : la carte est active, appartient à l'utilisateur → blocage autorisé
    carteModel.obtenirCarteParId.mockResolvedValue(carteActive);
    carteModel.bloquerCarte.mockResolvedValue({ id: 1 });
    notificationModel.creer.mockResolvedValue({});

    const req = { params: { carteId: '1' }, body: { raison: 'Perdue' }, user: { id: 42 } };
    const res = mockRes();
    const next = jest.fn();

    await cartesControleur.bloquerCarte(req, res, next);

    // La raison du blocage doit être transmise au modèle pour archivage
    expect(carteModel.bloquerCarte).toHaveBeenCalledWith('1', 'Perdue');
    // Une notification 'card_blocked' doit être créée pour informer l'utilisateur
    expect(notificationModel.creer).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'card_blocked' })
    );
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ succes: true }));
  });

  test('Erreur BD — appelle next(error)', async () => {
    carteModel.obtenirCarteParId.mockRejectedValue(new Error('DB error'));

    const req = { params: { carteId: '1' }, body: { raison: 'Perdue' }, user: { id: 42 } };
    const res = mockRes();
    const next = jest.fn();

    await cartesControleur.bloquerCarte(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DÉBLOQUER UNE CARTE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe('Cartes Contrôleur - debloquerCarte', () => {
  // Représente une carte bloquée appartenant à l'utilisateur 42
  const carteBloquee = {
    id: 1,
    numero_carte: '4111111111111111',
    utilisateur_id: 42,
    statut: 'blocked'
  };

  test('Carte non trouvée — retourne 404', async () => {
    carteModel.obtenirCarteParId.mockResolvedValue(null);

    const req = { params: { carteId: '1' }, user: { id: 42 } };
    const res = mockRes();
    const next = jest.fn();

    await cartesControleur.debloquerCarte(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('Carte appartient à un autre utilisateur — retourne 403', async () => {
    // Même vérification de propriété que pour le blocage
    carteModel.obtenirCarteParId.mockResolvedValue({ ...carteBloquee, utilisateur_id: 99 });

    const req = { params: { carteId: '1' }, user: { id: 42 } };
    const res = mockRes();
    const next = jest.fn();

    await cartesControleur.debloquerCarte(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('Carte déjà active — retourne 400', async () => {
    // Simule : la carte est déjà active — inutile de la débloquer à nouveau
    carteModel.obtenirCarteParId.mockResolvedValue({ ...carteBloquee, statut: 'active' });

    const req = { params: { carteId: '1' }, user: { id: 42 } };
    const res = mockRes();
    const next = jest.fn();

    await cartesControleur.debloquerCarte(req, res, next);

    // 400 Bad Request : impossible de débloquer une carte qui n'est pas bloquée
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('Déblocage réussi — retourne 200 et crée une notification', async () => {
    // Simule : la carte est bloquée et appartient à l'utilisateur → déblocage autorisé
    carteModel.obtenirCarteParId.mockResolvedValue(carteBloquee);
    carteModel.debloquerCarte.mockResolvedValue({ id: 1 });
    notificationModel.creer.mockResolvedValue({});

    const req = { params: { carteId: '1' }, user: { id: 42 } };
    const res = mockRes();
    const next = jest.fn();

    await cartesControleur.debloquerCarte(req, res, next);

    expect(carteModel.debloquerCarte).toHaveBeenCalledWith('1');
    // Une notification 'card_unblocked' doit informer l'utilisateur du rétablissement
    expect(notificationModel.creer).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'card_unblocked' })
    );
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ succes: true }));
  });

  test('Erreur BD — appelle next(error)', async () => {
    carteModel.obtenirCarteParId.mockRejectedValue(new Error('DB error'));

    const req = { params: { carteId: '1' }, user: { id: 42 } };
    const res = mockRes();
    const next = jest.fn();

    await cartesControleur.debloquerCarte(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
