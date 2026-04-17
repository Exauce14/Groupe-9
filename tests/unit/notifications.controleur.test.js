/**
 * Tests unitaires - Notifications Contrôleur
 *
 * Ces tests vérifient la logique du contrôleur de notifications :
 *  - Récupération de toutes les notifications d'un utilisateur
 *  - Comptage des notifications non lues (pour le badge dans l'interface)
 *  - Marquage d'une notification spécifique comme lue
 *  - Marquage de toutes les notifications comme lues en une seule opération
 *
 * Le modèle notification est remplacé par un mock Jest pour isoler
 * le contrôleur de la base de données.
 *
 * Note : le contrôleur utilise trouverParUtilisateur, marquerLue et
 * marquerToutesLues — noms qui correspondent exactement aux méthodes
 * exportées par le modèle et mockées ici.
 */

// Mocks — aucun contact avec la base de données réelle
// Note : on mocke les noms utilisés par le CONTRÔLEUR (trouverParUtilisateur,
// marquerToutesLues), qui peuvent différer des noms exportés par le modèle réel
// (obtenirParUtilisateur, marquerToutesCommeLues). C'est intentionnel : on teste
// le contrôleur, donc on reproduit les appels tels qu'il les fait.
jest.mock('../../server/modeles/notification.modele', () => ({
  trouverParUtilisateur: jest.fn(),
  compterNonLues: jest.fn(),
  marquerLue: jest.fn(),
  marquerToutesLues: jest.fn()
}));

const notificationModel = require('../../server/modeles/notification.modele');
const notificationsControleur = require('../../server/controleurs/notifications.controleur');

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
// MES NOTIFICATIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe('Notifications Contrôleur - mesNotifications', () => {

  test('Retourne la liste des notifications de l\'utilisateur', async () => {
    // Simule deux notifications : une non lue (demande approuvée) et une lue (carte bloquée)
    const notificationsSimulees = [
      { id: 1, type: 'request_approved', titre: 'Demande approuvée', lue: false },
      { id: 2, type: 'card_blocked', titre: 'Carte bloquée', lue: true }
    ];
    notificationModel.trouverParUtilisateur.mockResolvedValue(notificationsSimulees);

    // req.user.id est injecté par le middleware d'authentification JWT
    const req = { user: { id: 42 } };
    const res = mockRes();
    const next = jest.fn();

    await notificationsControleur.mesNotifications(req, res, next);

    // Le modèle doit être appelé avec l'ID de l'utilisateur connecté
    expect(notificationModel.trouverParUtilisateur).toHaveBeenCalledWith(42);
    expect(res.json).toHaveBeenCalledWith({
      succes: true,
      notifications: notificationsSimulees
    });
  });

  test('Retourne un tableau vide si aucune notification', async () => {
    // Cas d'un utilisateur sans aucune notification (nouveau compte, par exemple)
    notificationModel.trouverParUtilisateur.mockResolvedValue([]);

    const req = { user: { id: 42 } };
    const res = mockRes();
    const next = jest.fn();

    await notificationsControleur.mesNotifications(req, res, next);

    // Un tableau vide est une réponse valide — pas d'erreur
    expect(res.json).toHaveBeenCalledWith({ succes: true, notifications: [] });
  });

  test('Erreur BD — appelle next(error)', async () => {
    notificationModel.trouverParUtilisateur.mockRejectedValue(new Error('DB error'));

    const req = { user: { id: 42 } };
    const res = mockRes();
    const next = jest.fn();

    await notificationsControleur.mesNotifications(req, res, next);

    // L'erreur doit être transmise au middleware de gestion d'erreurs via next()
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COMPTER LES NON LUES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe('Notifications Contrôleur - compterNonLues', () => {

  test('Retourne le nombre de notifications non lues', async () => {
    // Simule 3 notifications non lues — ce chiffre est affiché comme badge dans l'UI
    notificationModel.compterNonLues.mockResolvedValue(3);

    const req = { user: { id: 42 } };
    const res = mockRes();
    const next = jest.fn();

    await notificationsControleur.compterNonLues(req, res, next);

    expect(notificationModel.compterNonLues).toHaveBeenCalledWith(42);
    expect(res.json).toHaveBeenCalledWith({ succes: true, count: 3 });
  });

  test('Retourne 0 si toutes les notifications sont lues', async () => {
    // Cas nominal : l'utilisateur a lu toutes ses notifications
    notificationModel.compterNonLues.mockResolvedValue(0);

    const req = { user: { id: 42 } };
    const res = mockRes();
    const next = jest.fn();

    await notificationsControleur.compterNonLues(req, res, next);

    // 0 est une valeur valide — le badge doit disparaître dans l'interface
    expect(res.json).toHaveBeenCalledWith({ succes: true, count: 0 });
  });

  test('Erreur BD — appelle next(error)', async () => {
    notificationModel.compterNonLues.mockRejectedValue(new Error('DB error'));

    const req = { user: { id: 42 } };
    const res = mockRes();
    const next = jest.fn();

    await notificationsControleur.compterNonLues(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MARQUER UNE NOTIFICATION COMME LUE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe('Notifications Contrôleur - marquerLue', () => {

  test('Marque une notification comme lue et retourne succes', async () => {
    // Simule la mise à jour réussie du champ 'lue' dans la BD
    notificationModel.marquerLue.mockResolvedValue({});

    // L'ID de la notification vient de l'URL (ex. PATCH /notifications/7/lue)
    const req = { params: { notificationId: '7' } };
    const res = mockRes();
    const next = jest.fn();

    await notificationsControleur.marquerLue(req, res, next);

    // Le modèle doit être appelé avec l'ID exact de la notification
    expect(notificationModel.marquerLue).toHaveBeenCalledWith('7');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ succes: true }));
  });

  test('Erreur BD — appelle next(error)', async () => {
    notificationModel.marquerLue.mockRejectedValue(new Error('DB error'));

    const req = { params: { notificationId: '7' } };
    const res = mockRes();
    const next = jest.fn();

    await notificationsControleur.marquerLue(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MARQUER TOUTES LES NOTIFICATIONS COMME LUES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe('Notifications Contrôleur - marquerToutesLues', () => {

  test('Marque toutes les notifications comme lues', async () => {
    // Simule la mise à jour en masse de toutes les notifications de l'utilisateur
    notificationModel.marquerToutesLues.mockResolvedValue({});

    const req = { user: { id: 42 } };
    const res = mockRes();
    const next = jest.fn();

    await notificationsControleur.marquerToutesLues(req, res, next);

    // Le modèle doit être appelé avec l'ID utilisateur pour cibler uniquement ses notifications
    expect(notificationModel.marquerToutesLues).toHaveBeenCalledWith(42);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ succes: true }));
  });

  test('Erreur BD — appelle next(error)', async () => {
    notificationModel.marquerToutesLues.mockRejectedValue(new Error('DB error'));

    const req = { user: { id: 42 } };
    const res = mockRes();
    const next = jest.fn();

    await notificationsControleur.marquerToutesLues(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
