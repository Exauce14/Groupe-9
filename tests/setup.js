// Charger les variables d'environnement de test
require('dotenv').config({ path: '.env.test' });

// Configuration globale pour tous les tests
process.env.NODE_ENV = 'test';

// Désactiver les logs pendant les tests (optionnel)
if (process.env.NODE_ENV === 'test') {
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
}