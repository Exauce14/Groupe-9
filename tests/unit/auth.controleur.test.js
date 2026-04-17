/**
 * Tests unitaires - Auth Contrôleur
 *
 * Ces tests vérifient la logique du contrôleur d'authentification en isolant
 * complètement la base de données et les dépendances externes (email, bcrypt, JWT).
 *
 * Flux d'authentification testé :
 *  1. Inscription  → hash du mot de passe + création de l'utilisateur
 *  2. Connexion    → vérification du compte + envoi du code 2FA par email
 *  3. Vérif. 2FA   → validation du code + émission du token JWT
 *
 * Approche : tous les modules externes sont remplacés par des mocks Jest,
 * ce qui permet de tester chaque branche logique sans serveur ni BD réelle.
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Mocks — aucun contact avec la base de données réelle
jest.mock('../../server/config/baseDeDonnees', () => ({
  query: jest.fn()
}));
jest.mock('../../server/modeles/utilisateur.modele', () => ({
  trouverParEmail: jest.fn(),
  creer: jest.fn()
}));
jest.mock('../../server/modeles/verification.modele', () => ({
  genererCode: jest.fn(),
  creer: jest.fn(),
  trouverCodeValide: jest.fn(),
  marquerUtilise: jest.fn(),
  invaliderCodesUtilisateur: jest.fn()
}));
// L'utilitaire email est mocké pour éviter d'envoyer de vrais emails pendant les tests
jest.mock('../../server/utilitaires/email.utils', () => ({
  envoyerCode2FA: jest.fn().mockResolvedValue(true)
}));
jest.mock('bcrypt');
jest.mock('jsonwebtoken');

const { query } = require('../../server/config/baseDeDonnees');
const utilisateurModel = require('../../server/modeles/utilisateur.modele');
const verificationModel = require('../../server/modeles/verification.modele');
const authControleur = require('../../server/controleurs/auth.controleur');

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

/** Crée une fonction next() simulée pour capturer les erreurs propagées. */
const mockNext = () => jest.fn();

// Réinitialise tous les mocks avant chaque test pour éviter les interférences
beforeEach(() => {
  jest.resetAllMocks();
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INSCRIPTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe('Auth Contrôleur - Inscription', () => {
  // Corps de requête complet représentant un nouvel utilisateur
  const bodyInscription = {
    email: 'test@example.com',
    motDePasse: 'Test123!',
    prenom: 'Jean',
    nom: 'Dupont',
    telephone: '5145550100',
    adresse: '123 Rue Principale',
    dateNaissance: '1990-01-01',
    sexe: 'male',
    statut: 'employee',
    revenuAnnuel: 50000,
    typeResidence: 'owner'
  };

  test('Inscription réussie — retourne 201 avec les infos utilisateur', async () => {
    // Simule : aucun utilisateur existant avec cet email
    utilisateurModel.trouverParEmail.mockResolvedValue(null);
    // Simule : bcrypt hash du mot de passe
    bcrypt.hash.mockResolvedValue('hashed_password');
    // Simule : l'utilisateur est créé et retourné depuis la BD
    utilisateurModel.creer.mockResolvedValue({
      id: 1,
      email: bodyInscription.email,
      prenom: 'Jean',
      nom: 'Dupont'
    });

    const req = { body: bodyInscription };
    const res = mockRes();
    const next = mockNext();

    await authControleur.inscription(req, res, next);

    // Le contrôleur doit répondre 201 Created avec les données de l'utilisateur créé
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        succes: true,
        utilisateur: expect.objectContaining({ email: bodyInscription.email })
      })
    );
  });

  test('Inscription — email déjà utilisé retourne 400', async () => {
    // Simule : un utilisateur existe déjà avec cet email
    utilisateurModel.trouverParEmail.mockResolvedValue({ id: 1, email: bodyInscription.email });

    const req = { body: bodyInscription };
    const res = mockRes();
    const next = mockNext();

    await authControleur.inscription(req, res, next);

    // L'inscription doit être refusée avec un code 400 (requête invalide)
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ succes: false })
    );
  });

  test('Inscription — erreur BD appelle next(error)', async () => {
    // Simule : la BD lève une erreur lors de la recherche par email
    utilisateurModel.trouverParEmail.mockRejectedValue(new Error('DB error'));

    const req = { body: bodyInscription };
    const res = mockRes();
    const next = mockNext();

    await authControleur.inscription(req, res, next);

    // L'erreur doit être transmise au middleware de gestion d'erreurs via next()
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONNEXION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe('Auth Contrôleur - Connexion', () => {
  const bodyConnexion = { email: 'test@example.com', motDePasse: 'Test123!' };

  // Représentation d'un utilisateur typique tel qu'il serait retourné par la BD
  const utilisateurDB = {
    id: 1,
    email: 'test@example.com',
    password: 'hashed_password',
    prenom: 'Jean',
    nom: 'Dupont',
    role: 'user',
    statut_compte: 'active',
    login_attempts: 0,
    locked_until: null
  };

  test('Connexion — email non trouvé retourne 401', async () => {
    // Simule : la requête SELECT ne retourne aucun utilisateur
    query.mockResolvedValue({ rows: [] });

    const req = { body: bodyConnexion };
    const res = mockRes();
    const next = mockNext();

    await authControleur.connexion(req, res, next);

    // 401 Unauthorized : identifiants incorrects (email inconnu)
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ succes: false })
    );
  });

  test('Connexion — compte verrouillé retourne 423', async () => {
    // Simule : le compte est verrouillé jusqu'à dans 10 minutes
    const futur = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    query.mockResolvedValue({
      rows: [{ ...utilisateurDB, locked_until: futur }]
    });

    const req = { body: bodyConnexion };
    const res = mockRes();
    const next = mockNext();

    await authControleur.connexion(req, res, next);

    // 423 Locked : le compte est temporairement verrouillé suite à trop de tentatives
    expect(res.status).toHaveBeenCalledWith(423);
  });

  test('Connexion — mauvais mot de passe retourne 401', async () => {
    // Simule : l'utilisateur est trouvé, mais le mot de passe ne correspond pas
    query.mockResolvedValueOnce({ rows: [utilisateurDB] });
    bcrypt.compare.mockResolvedValue(false);
    query.mockResolvedValueOnce({ rows: [] }); // UPDATE login_attempts (incrémentation)

    const req = { body: bodyConnexion };
    const res = mockRes();
    const next = mockNext();

    await authControleur.connexion(req, res, next);

    // 401 : mauvais mot de passe — le compteur de tentatives est incrémenté
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ succes: false })
    );
  });

  test('Connexion — 3 tentatives échouées verrouille le compte (423)', async () => {
    // Simule : l'utilisateur est à sa 3e tentative (login_attempts: 2 = 0-indexé)
    query.mockResolvedValueOnce({ rows: [{ ...utilisateurDB, login_attempts: 2 }] });
    bcrypt.compare.mockResolvedValue(false);
    query.mockResolvedValueOnce({ rows: [] }); // UPDATE locked_until (verrouillage)

    const req = { body: bodyConnexion };
    const res = mockRes();
    const next = mockNext();

    await authControleur.connexion(req, res, next);

    // Après 3 échecs, le compte est verrouillé temporairement (423 Locked)
    expect(res.status).toHaveBeenCalledWith(423);
  });

  test('Connexion — compte suspendu retourne 403', async () => {
    // Simule : le mot de passe est correct mais le compte a été suspendu par un admin
    query.mockResolvedValueOnce({
      rows: [{ ...utilisateurDB, statut_compte: 'suspended' }]
    });
    bcrypt.compare.mockResolvedValue(true);
    query.mockResolvedValueOnce({ rows: [] }); // reset login_attempts après bon mot de passe

    const req = { body: bodyConnexion };
    const res = mockRes();
    const next = mockNext();

    await authControleur.connexion(req, res, next);

    // 403 Forbidden : le compte existe mais n'est pas accessible
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('Connexion — compte fermé retourne 403', async () => {
    // Simule : le compte a été clôturé (statut 'closed')
    query.mockResolvedValueOnce({
      rows: [{ ...utilisateurDB, statut_compte: 'closed' }]
    });
    bcrypt.compare.mockResolvedValue(true);
    query.mockResolvedValueOnce({ rows: [] });

    const req = { body: bodyConnexion };
    const res = mockRes();
    const next = mockNext();

    await authControleur.connexion(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('Connexion réussie — envoie le code 2FA et retourne requiresVerification', async () => {
    // Simule : identifiants corrects, compte actif → déclenchement du flux 2FA
    query.mockResolvedValueOnce({ rows: [utilisateurDB] });
    bcrypt.compare.mockResolvedValue(true);
    query.mockResolvedValueOnce({ rows: [] }); // reset login_attempts
    verificationModel.genererCode.mockReturnValue('123456');
    verificationModel.creer.mockResolvedValue({});

    const req = { body: bodyConnexion };
    const res = mockRes();
    const next = mockNext();

    await authControleur.connexion(req, res, next);

    // La réponse indique que la vérification 2FA est requise avant d'émettre le JWT
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        succes: true,
        requiresVerification: true,
        userId: utilisateurDB.id
      })
    );
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VÉRIFICATION 2FA
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe('Auth Contrôleur - Vérification 2FA', () => {

  test('Code invalide retourne 401', async () => {
    // Simule : aucun code valide trouvé pour cet userId (code expiré ou incorrect)
    verificationModel.trouverCodeValide.mockResolvedValue(null);

    const req = { body: { userId: 1, code: '999999' } };
    const res = mockRes();
    const next = mockNext();

    await authControleur.verifier2FA(req, res, next);

    // 401 : le code 2FA ne correspond à aucun enregistrement valide en BD
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ succes: false })
    );
  });

  test('Code valide — retourne le token JWT et les infos utilisateur', async () => {
    // Simule : le code est trouvé, marqué comme utilisé, et l'utilisateur est récupéré
    verificationModel.trouverCodeValide.mockResolvedValue({ id: 10 });
    verificationModel.marquerUtilise.mockResolvedValue({});
    query.mockResolvedValue({
      rows: [{
        id: 1,
        email: 'test@example.com',
        prenom: 'Jean',
        nom: 'Dupont',
        role: 'user',
        statut_compte: 'active'
      }]
    });
    // jwt.sign est mocké pour retourner un token prévisible dans les assertions
    jwt.sign.mockReturnValue('fake_jwt_token');

    const req = { body: { userId: 1, code: '123456' } };
    const res = mockRes();
    const next = mockNext();

    await authControleur.verifier2FA(req, res, next);

    // La réponse doit contenir le token JWT et les informations de l'utilisateur connecté
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        succes: true,
        token: 'fake_jwt_token',
        utilisateur: expect.objectContaining({ email: 'test@example.com' })
      })
    );
  });

  test('Erreur BD appelle next(error)', async () => {
    // Simule : la BD est inaccessible lors de la recherche du code
    verificationModel.trouverCodeValide.mockRejectedValue(new Error('DB error'));

    const req = { body: { userId: 1, code: '123456' } };
    const res = mockRes();
    const next = mockNext();

    await authControleur.verifier2FA(req, res, next);

    // L'erreur doit être forwarded au middleware d'erreurs Express
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
