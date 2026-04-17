/**
 * Tests d'intégration - Inscription
 *
 * Ces tests vérifient le flux complet d'inscription via l'API REST.
 * Contrairement aux tests unitaires (qui utilisent des mocks), ces tests
 * envoient de vraies requêtes HTTP au serveur et vérifient les réponses
 * avec la base de données réelle.
 *
 * Scénarios couverts :
 *  - Inscription réussie avec toutes les données valides (201)
 *  - Rejet si l'email est déjà utilisé (400)
 *  - Rejet si des champs obligatoires sont manquants (400)
 *  - Rejet si le format de l'email est invalide (400)
 *
 * Prérequis : le serveur doit être démarré sur le port 3000.
 *
 * Nettoyage : après chaque test, les utilisateurs dont l'email commence
 * par "test" sont supprimés pour éviter les conflits entre tests.
 */

const request = require('supertest');
const { query } = require('../../server/config/baseDeDonnees');

// URL de base de l'API
const baseURL = 'http://localhost:3000';

describe('Tests d\'Intégration - Inscription', () => {

  // Nettoyer les données de test après chaque test
  afterEach(async () => {
    try {
      await query('DELETE FROM users WHERE email LIKE $1', ['test%@example.com']);
    } catch (error) {
      console.error('Erreur nettoyage:', error);
    }
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CAS DE SUCCÈS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  test('POST /api/auth/inscription - Inscription réussie', async () => {
    // Données complètes et valides d'un nouvel utilisateur
    const nouveauUtilisateur = {
      prenom: 'Jean',
      nom: 'Dupont',
      email: 'test1@example.com',
      motDePasse: 'Test123!@#',
      dateNaissance: '1990-01-01',
      sexe: 'male',
      telephone: '5145550100',
      adresse: '123 Rue Principale',
      ville: 'Montréal',
      province: 'QC',
      codePostal: 'H3A 1A1',
      revenuAnnuel: 50000,
      statut: 'employee',
      typeResidence: 'owner'
    };

    const response = await request(baseURL)
      .post('/api/auth/inscription')
      .send(nouveauUtilisateur)
      .expect(201); // 201 Created : l'utilisateur a été créé avec succès

    expect(response.body.succes).toBe(true);
    expect(response.body.message).toContain('Inscription réussie');
    // Vérification que l'email retourné correspond bien à celui envoyé
    expect(response.body.utilisateur.email).toBe(nouveauUtilisateur.email);
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CAS D'ERREUR - EMAIL DUPLIQUÉ
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  test('POST /api/auth/inscription - Email déjà utilisé', async () => {
    const utilisateur = {
      prenom: 'Jean',
      nom: 'Dupont',
      email: 'test2@example.com',
      motDePasse: 'Test123!@#',
      dateNaissance: '1990-01-01',
      sexe: 'male',
      telephone: '5145550101',
      adresse: '123 Rue Principale',
      ville: 'Montréal',
      province: 'QC',
      codePostal: 'H3A 1A1',
      revenuAnnuel: 50000,
      statut: 'employee',
      typeResidence: 'owner'
    };

    // Première inscription — doit réussir
    await request(baseURL)
      .post('/api/auth/inscription')
      .send(utilisateur)
      .expect(201);

    // Deuxième inscription avec le même email — doit échouer
    const response = await request(baseURL)
      .post('/api/auth/inscription')
      .send(utilisateur)
      .expect(400); // 400 Bad Request : email déjà enregistré

    expect(response.body.succes).toBe(false);
    expect(response.body.message).toContain('Un compte existe déjà avec cet email');
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CAS D'ERREUR - DONNÉES MANQUANTES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  test('POST /api/auth/inscription - Données manquantes', async () => {
    // Payload incomplet : seul le prénom et l'email sont fournis
    // Tous les autres champs obligatoires sont absents
    const utilisateurIncomplet = {
      prenom: 'Jean',
      email: 'test3@example.com'
      // Champs manquants : nom, motDePasse, dateNaissance, telephone, etc.
    };

    const response = await request(baseURL)
      .post('/api/auth/inscription')
      .send(utilisateurIncomplet)
      .expect(400); // 400 Bad Request : validation des champs obligatoires échouée

    expect(response.body.succes).toBe(false);
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CAS D'ERREUR - FORMAT EMAIL INVALIDE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  test('POST /api/auth/inscription - Email invalide', async () => {
    // L'email "email-invalide" ne respecte pas le format attendu (sans @)
    const utilisateur = {
      prenom: 'Jean',
      nom: 'Dupont',
      email: 'email-invalide',
      motDePasse: 'Test123!@#',
      dateNaissance: '1990-01-01',
      sexe: 'male',
      telephone: '5145550102',
      adresse: '123 Rue Principale',
      ville: 'Montréal',
      province: 'QC',
      codePostal: 'H3A 1A1',
      revenuAnnuel: 50000,
      statut: 'employee',
      typeResidence: 'owner'
    };

    const response = await request(baseURL)
      .post('/api/auth/inscription')
      .send(utilisateur)
      .expect(400);

    expect(response.body.succes).toBe(false);
    // Le message d'erreur doit mentionner le problème lié à l'email (insensible à la casse)
    expect(response.body.message).toMatch(/email/i);
  });
});
