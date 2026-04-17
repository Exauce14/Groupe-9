/**
 * Tests de sécurité - XSS (Cross-Site Scripting)
 *
 * Ces tests vérifient que l'API d'inscription rejette ou assainit les
 * payloads contenant des injections HTML/JavaScript malveillantes.
 *
 * Stratégie : on envoie une vraie requête HTTP au serveur local (port 3000)
 * avec des champs contenant des balises ou des attributs dangereux, puis on
 * vérifie que les données retournées ne contiennent plus ces éléments.
 *
 * Prérequis : le serveur doit être démarré avant d'exécuter ces tests.
 *
 * Nettoyage : après chaque test, les utilisateurs créés avec un email
 * commençant par "xss" sont supprimés de la base de données.
 */

const request = require('supertest');
const { query } = require('../../server/config/baseDeDonnees');

const baseURL = 'http://localhost:3000';

describe('Tests de Sécurité - XSS (Cross-Site Scripting)', () => {

  // Supprime les données de test créées dans la BD après chaque cas
  afterEach(async () => {
    await query('DELETE FROM users WHERE email LIKE $1', ['xss%@example.com']);
  });

  test('Tentative XSS dans le champ prénom', async () => {
    // Payload avec une balise <script> dans le prénom — attaque XSS classique
    const xssPayload = {
      prenom: '<script>alert("XSS")</script>',
      nom: 'Test',
      email: 'xss1@example.com',
      motDePasse: 'Test123!@#',
      dateNaissance: '1990-01-01',
      telephone: '514-555-0400',
      adresse: '123 Test St',
      ville: 'Montréal',
      province: 'QC',
      codePostal: 'H3A 1A1',
      revenuAnnuel: 50000,
      statut: 'employee'
    };

    const response = await request(baseURL)
      .post('/api/auth/inscription')
      .send(xssPayload);

    // Si l'inscription a été acceptée, la balise script ne doit pas être présente
    // dans la réponse (elle doit avoir été échappée ou supprimée)
    if (response.body.succes) {
      expect(response.body.utilisateur.prenom).not.toContain('<script>');
    }
  });

  test('Tentative XSS avec balises HTML dans l\'adresse', async () => {
    // Attaque via une balise <img> avec un gestionnaire d'erreur (onerror)
    // qui exécuterait du JavaScript si affichée dans un navigateur
    const xssPayload = {
      prenom: 'Jean',
      nom: 'Test',
      email: 'xss2@example.com',
      motDePasse: 'Test123!@#',
      dateNaissance: '1990-01-01',
      telephone: '514-555-0401',
      adresse: '<img src=x onerror=alert("XSS")>',
      ville: 'Montréal',
      province: 'QC',
      codePostal: 'H3A 1A1',
      revenuAnnuel: 50000,
      statut: 'employee'
    };

    const response = await request(baseURL)
      .post('/api/auth/inscription')
      .send(xssPayload);

    if (response.body.succes) {
      // Ni la balise <img> ni l'attribut onerror ne doivent être retournés bruts
      expect(response.body.utilisateur.adresse).not.toContain('<img');
      expect(response.body.utilisateur.adresse).not.toContain('onerror');
    }
  });

  test('Tentative XSS avec event handlers', async () => {
    // Attaque via l'attribut onload sur une balise <div>
    const xssPayload = {
      prenom: 'Jean',
      nom: 'Test',
      email: 'xss3@example.com',
      motDePasse: 'Test123!@#',
      dateNaissance: '1990-01-01',
      telephone: '514-555-0402',
      adresse: '<div onload="alert(\'XSS\')">Test</div>',
      ville: 'Montréal',
      province: 'QC',
      codePostal: 'H3A 1A1',
      revenuAnnuel: 50000,
      statut: 'employee'
    };

    const response = await request(baseURL)
      .post('/api/auth/inscription')
      .send(xssPayload);

    if (response.body.succes) {
      // L'attribut onload ne doit pas apparaître dans la réponse
      expect(response.body.utilisateur.adresse).not.toContain('onload');
    }
  });
});
