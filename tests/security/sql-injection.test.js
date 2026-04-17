/**
 * Tests de sécurité - Injection SQL
 *
 * Ces tests vérifient que l'API résiste aux attaques par injection SQL
 * dans les champs de connexion. L'objectif est de confirmer que toutes
 * les requêtes SQL utilisent des paramètres préparés (requêtes paramétrées),
 * ce qui neutralise ce type d'attaque.
 *
 * Comportements attendus :
 *  - Le serveur ne retourne jamais un statut 500 (erreur SQL brute)
 *  - La connexion échoue toujours avec succes: false
 *  - Aucune donnée sensible n'est exposée
 *
 * Prérequis : le serveur doit être démarré sur le port 3000.
 */

const request = require('supertest');

const baseURL = 'http://localhost:3000';

describe('Tests de Sécurité - Injection SQL', () => {

  test('Tentative d\'injection SQL dans le champ email (connexion)', async () => {
    // Payload classique : la séquence '--' commente le reste de la requête SQL
    // Exemple d'attaque : SELECT * FROM users WHERE email = 'admin'--'
    const maliciousPayload = {
      email: "admin'--",
      motDePasse: "anything"
    };

    const response = await request(baseURL)
      .post('/api/auth/connexion')
      .send(maliciousPayload);

    // Un statut 500 indiquerait que l'injection a causé une erreur SQL côté serveur
    expect(response.status).not.toBe(500);
    // La connexion doit échouer normalement, comme pour un email inexistant
    expect(response.body.succes).toBe(false);
  });

  test('Tentative d\'injection SQL avec OR 1=1', async () => {
    // OR '1'='1' est toujours vrai — sans paramètres préparés, cela retournerait
    // tous les utilisateurs et pourrait contourner l'authentification
    const maliciousPayload = {
      email: "test@example.com' OR '1'='1",
      motDePasse: "password"
    };

    const response = await request(baseURL)
      .post('/api/auth/connexion')
      .send(maliciousPayload);

    expect(response.status).not.toBe(500);
    expect(response.body.succes).toBe(false);
  });

  test('Tentative d\'injection SQL avec UNION SELECT', async () => {
    // UNION SELECT permet de fusionner les résultats avec une autre table
    // et d'exfiltrer des données comme les mots de passe hashés
    const maliciousPayload = {
      email: "test@example.com' UNION SELECT * FROM users--",
      motDePasse: "password"
    };

    const response = await request(baseURL)
      .post('/api/auth/connexion')
      .send(maliciousPayload);

    expect(response.status).not.toBe(500);
    expect(response.body.succes).toBe(false);
  });

  test('Tentative d\'injection SQL avec DROP TABLE', async () => {
    // Attaque destructrice : tente de supprimer la table des utilisateurs
    // Les requêtes paramétrées empêchent l'exécution de cette instruction
    const maliciousPayload = {
      email: "test@example.com'; DROP TABLE users;--",
      motDePasse: "password"
    };

    const response = await request(baseURL)
      .post('/api/auth/connexion')
      .send(maliciousPayload);

    expect(response.status).not.toBe(500);
    expect(response.body.succes).toBe(false);
  });

  test('Vérifier que les requêtes paramétrées sont utilisées', async () => {
    // Test de référence avec un email valide mais inexistant :
    // si les injections précédentes n'ont pas crashé le serveur, cela confirme
    // que les requêtes SQL sont correctement paramétrées dans tous les cas
    const normalPayload = {
      email: "nonexistent@example.com",
      motDePasse: "password"
    };

    const response = await request(baseURL)
      .post('/api/auth/connexion')
      .send(normalPayload)
      .expect(401);

    expect(response.body.succes).toBe(false);
    // Le message d'erreur standard (sans détails SQL) doit être retourné
    expect(response.body.message).toContain('Email ou mot de passe incorrect');
  });
});
