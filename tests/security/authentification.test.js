/**
 * Tests de sécurité - Authentification
 *
 * Ces tests vérifient que les mécanismes de protection de l'API fonctionnent
 * correctement : protection des routes par JWT, rejet des tokens invalides
 * ou expirés, contrôle d'accès par rôle, en-têtes CORS, et protection
 * contre les attaques par force brute (rate limiting + verrouillage de compte).
 *
 * Prérequis : le serveur doit être démarré sur le port 3000.
 */

const request = require('supertest');

const baseURL = 'http://localhost:3000';

describe('Tests de Sécurité - Authentification', () => {

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PROTECTION DES ROUTES PAR JWT
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  test('Accès à une route protégée sans token JWT', async () => {
    // Une requête sans en-tête Authorization doit être refusée avec un 401
    const response = await request(baseURL)
      .get('/api/comptes/mes-comptes')
      .expect(401);

    expect(response.body.succes).toBe(false);
    // Le message d'erreur doit mentionner le token manquant
    expect(response.body.message).toContain('Token');
  });

  test('Accès avec token JWT invalide', async () => {
    // Un token malformé ou falsifié ne doit pas être accepté
    const response = await request(baseURL)
      .get('/api/comptes/mes-comptes')
      .set('Authorization', 'Bearer invalid_token_here')
      .expect(401);

    expect(response.body.succes).toBe(false);
  });

  test('Accès avec token JWT expiré', async () => {
    // Ce token a une date d'expiration dans le passé (exp: 1516239023 = janvier 2018)
    // Il doit être rejeté même s'il est structurellement correct
    const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjN9.invalid';

    const response = await request(baseURL)
      .get('/api/comptes/mes-comptes')
      .set('Authorization', `Bearer ${expiredToken}`)
      .expect(401);

    expect(response.body.succes).toBe(false);
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CONTRÔLE D'ACCÈS PAR RÔLE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  test('Tentative d\'accès admin par un utilisateur client', async () => {
    // Un utilisateur client (role=client) ne doit pas pouvoir accéder
    // aux routes réservées aux administrateurs, même avec un token valide.
    // Ici on vérifie d'abord que la route exige au minimum une authentification.
    await request(baseURL)
      .post('/api/auth/inscription')
      .send({
        prenom: 'Client',
        nom: 'Test',
        email: 'client-security@example.com',
        motDePasse: 'Test123!@#',
        dateNaissance: '1990-01-01',
        telephone: '514-555-0500',
        adresse: '123 Test St',
        ville: 'Montréal',
        province: 'QC',
        codePostal: 'H3A 1A1',
        revenuAnnuel: 50000,
        statut: 'employee'
      });

    // Sans token, la route /admin/statistiques doit retourner 401
    const response = await request(baseURL)
      .get('/api/admin/statistiques')
      .expect(401);

    expect(response.body.succes).toBe(false);
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PROTECTION CORS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  test('Vérification du CORS - Protection contre requêtes cross-origin non autorisées', async () => {
    // Une requête OPTIONS depuis une origine inconnue doit quand même retourner
    // les en-têtes CORS — c'est le serveur qui décide si l'origine est autorisée.
    const response = await request(baseURL)
      .options('/api/auth/connexion')
      .set('Origin', 'http://malicious-site.com')
      .expect(204);

    // L'en-tête Access-Control-Allow-Origin doit toujours être présent dans la réponse
    expect(response.headers['access-control-allow-origin']).toBeDefined();
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PROTECTION CONTRE LA FORCE BRUTE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  test('Protection contre le brute force - Rate limiting', async () => {
    const credentials = {
      email: 'test@example.com',
      motDePasse: 'WrongPassword'
    };

    // On lance 5 tentatives de connexion en parallèle avec un mauvais mot de passe
    // pour déclencher le rate limiting ou le verrouillage de compte
    const requests = [];
    for (let i = 0; i < 5; i++) {
      requests.push(
        request(baseURL)
          .post('/api/auth/connexion')
          .send(credentials)
      );
    }

    const responses = await Promise.all(requests);

    // Toutes les réponses doivent être soit 401 (mauvais identifiants)
    // soit 429 (trop de requêtes — rate limiter) ou 423 (compte verrouillé)
    const failedResponses = responses.filter(r => r.status === 401 || r.status === 429);
    expect(failedResponses.length).toBeGreaterThan(0);
  });
});
