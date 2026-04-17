/**
 * Tests unitaires - Authentification
 *
 * Ces tests vérifient les mécanismes de sécurité de base utilisés dans
 * l'authentification : hashage de mot de passe (bcrypt), génération et
 * validation de tokens JWT, validation du format d'email, et génération
 * de codes 2FA.
 *
 * Aucun mock ni accès à la base de données — ce sont des tests purs sur
 * des fonctions utilitaires et des librairies.
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authControleur = require('../../server/controleurs/auth.controleur');

describe('Tests Unitaires - Authentification', () => {

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // HASHAGE DE MOT DE PASSE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  describe('Hashage de mot de passe', () => {
    test('Le mot de passe doit être hashé avec bcrypt', async () => {
      const password = 'Test123!';
      const hashedPassword = await bcrypt.hash(password, 10);

      // Le hash ne doit jamais être identique au mot de passe original
      expect(hashedPassword).not.toBe(password);
      // Un hash bcrypt a toujours plus de 50 caractères
      expect(hashedPassword.length).toBeGreaterThan(50);
      // Format attendu d'un hash bcrypt (commence par $2a$, $2b$ ou $2y$)
      expect(hashedPassword).toMatch(/^\$2[ayb]\$.{56}$/);
    });

    test('Le hash doit être différent pour le même mot de passe', async () => {
      const password = 'Test123!';
      const hash1 = await bcrypt.hash(password, 10);
      const hash2 = await bcrypt.hash(password, 10);

      // bcrypt génère un sel aléatoire à chaque appel, donc deux hashs
      // du même mot de passe sont toujours différents — c'est voulu.
      expect(hash1).not.toBe(hash2);
    });

    test('bcrypt.compare doit valider le bon mot de passe', async () => {
      const password = 'Test123!';
      const hashedPassword = await bcrypt.hash(password, 10);

      // La comparaison doit retourner true si le mot de passe correspond au hash
      const isValid = await bcrypt.compare(password, hashedPassword);
      expect(isValid).toBe(true);
    });

    test('bcrypt.compare doit rejeter un mauvais mot de passe', async () => {
      const password = 'Test123!';
      const hashedPassword = await bcrypt.hash(password, 10);

      // Un mot de passe incorrect ne doit jamais correspondre au hash
      const isValid = await bcrypt.compare('WrongPassword!', hashedPassword);
      expect(isValid).toBe(false);
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // GÉNÉRATION DE TOKEN JWT
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  describe('Génération de token JWT', () => {
    // Clé secrète utilisée uniquement pour les tests (ne pas utiliser en prod)
    const JWT_SECRET = 'test_secret_key';

    test('Le token JWT doit être généré correctement', () => {
      const payload = {
        id: 1,
        email: 'test@example.com',
        role: 'client'
      };

      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

      // Un token JWT valide existe, est une chaîne, et est composé de 3 parties séparées par des points
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // header.payload.signature
    });

    test('Le token doit contenir le payload correct', () => {
      const payload = {
        id: 1,
        email: 'test@example.com',
        role: 'client'
      };

      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
      const decoded = jwt.verify(token, JWT_SECRET);

      // Après décodage, le contenu du token doit correspondre au payload d'origine
      expect(decoded.id).toBe(payload.id);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.role).toBe(payload.role);
    });

    test('Le token expiré doit être rejeté', (done) => {
      const payload = { id: 1, email: 'test@example.com' };
      // On crée un token avec une durée de vie de 1 milliseconde
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1ms' });

      setTimeout(() => {
        // Après 10 ms, le token est expiré — jwt.verify doit lever une erreur
        expect(() => {
          jwt.verify(token, JWT_SECRET);
        }).toThrow();
        done();
      }, 10);
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // VALIDATION DU FORMAT EMAIL
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  describe('Validation du format email', () => {
    // Expression régulière de base pour valider un email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    test('Email valide doit passer la validation', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.com',
        'user+tag@example.co.uk'
      ];

      // Tous ces formats d'email sont considérés valides par la regex
      validEmails.forEach(email => {
        expect(emailRegex.test(email)).toBe(true);
      });
    });

    test('Email invalide doit échouer la validation', () => {
      const invalidEmails = [
        'invalid',           // Pas de @
        '@example.com',      // Pas de partie locale
        'user@',             // Pas de domaine
        'user @example.com', // Espace interdit
        'user@.com'          // Domaine commence par un point
      ];

      // Aucun de ces formats ne doit passer la validation
      invalidEmails.forEach(email => {
        expect(emailRegex.test(email)).toBe(false);
      });
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // GÉNÉRATION DE CODE 2FA
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  describe('Génération de code 2FA', () => {
    test('Le code 2FA doit avoir 6 chiffres', () => {
      // Génère un entier entre 100000 et 999999, puis le convertit en chaîne
      const code = Math.floor(100000 + Math.random() * 900000).toString();

      // Le code doit être exactement 6 chiffres numériques
      expect(code).toHaveLength(6);
      expect(/^\d{6}$/.test(code)).toBe(true);
    });

    test('Le code 2FA doit être différent à chaque génération', () => {
      const code1 = Math.floor(100000 + Math.random() * 900000).toString();
      const code2 = Math.floor(100000 + Math.random() * 900000).toString();

      // Probabilité très faible d'avoir le même code (1/900000)
      // Ce test garantit que le générateur n'est pas statique
      expect(code1).not.toBe(code2);
    });
  });
});
