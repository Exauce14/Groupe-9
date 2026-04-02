# Guide des Tests - Fortivia Bank

## Structure des Tests

Le projet Fortivia Bank dispose d'une suite complète de tests en utilisant **Jest** et **Supertest**.

### Fichiers de Test Créés

```
tests/
├── auth.test.js                         # Tests routes d'authentification
├── admin.test.js                        # Tests routes admin
├── comptes.test.js                      # Tests gestion des comptes
├── cartes.test.js                       # Tests gestion des cartes
├── demandes.test.js                     # Tests des demandes
├── notification.test.js                 # Tests des notifications
├── beneficiaires.test.js                # Tests des bénéficiaires
├── transactions.test.js                 # Tests des transactions
├── validation.middleware.test.js        # Tests validation middleware
├── mocks/
│   └── mockApp.js                       # Application mock pour tests
└── models/
    ├── utilisateur.model.test.js        # Tests modèle utilisateur
    └── compte.model.test.js             # Tests modèle compte
└── middlewares/
    └── auth.middleware.test.js          # Tests middleware auth
```

## Installation et Configuration

### 1. Dépendances Requises
Les dépendances sont déjà dans `package.json`:
- `jest` ^29.7.0
- `supertest` ^6.3.4
- `@types/jest` ^29.5.0

### 2. Scripts NPM Disponibles

```bash
# Exécuter tous les tests
npm test

# Exécuter les tests en mode watch (réexécution automatique)
npm run test:watch

# Exécuter les tests avec coverage
npm test -- --coverage

# Exécuter un fichier de test spécifique
npm test -- auth.test.js

# Debug les tests
node --inspect-brk ./node_modules/.bin/jest --runInBand
```

## Couverture des Tests

### Tests d'Authentification (`auth.test.js`)
- ✓ Inscription avec validation des champs
- ✓ Vérification des doublons email
- ✓ Connexion avec identifiants corrects/incorrects
- ✓ Verification 2FA
- ✓ Renvoi du code 2FA

### Tests Admin (`admin.test.js`)
- ✓ Récupération liste utilisateurs
- ✓ Mise à jour statut utilisateur
- ✓ Statistiques du système
- ✓ Approbation/rejet des comptes en attente

### Tests Comptes (`comptes.test.js`)
- ✓ Création de comptes
- ✓ Récupération des comptes utilisateur
- ✓ Consultation détails compte
- ✓ Mise à jour solde

### Tests Cartes (`cartes.test.js`)
- ✓ Création de cartes
- ✓ Récupération des cartes
- ✓ Blocage/déblocage cartes
- ✓ Consultation détails carte

### Tests Demandes (`demandes.test.js`)
- ✓ Création demandes
- ✓ Récupération des demandes
- ✓ Mise à jour statut demandes
- ✓ Approbation/rejet demandes

### Tests Notifications (`notification.test.js`)
- ✓ Récupération notifications
- ✓ Notifications non lues
- ✓ Marquage comme lue
- ✓ Suppression notifications

### Tests Bénéficiaires (`beneficiaires.test.js`)
- ✓ Ajout bénéficiaire
- ✓ Récupération des bénéficiaires
- ✓ Suppression bénéficiaire

### Tests Transactions (`transactions.test.js`)
- ✓ Historique transactions
- ✓ Transfert entre comptes
- ✓ Dépôts
- ✓ Consultations transactions

### Tests Modèles
- **Utilisateur** (`models/utilisateur.model.test.js`)
  - Création utilisateur
  - Recherche par email/ID
  - Mise à jour utilisateur

- **Compte** (`models/compte.model.test.js`)
  - Création compte
  - Récupération comptes par utilisateur
  - Mise à jour solde

### Tests Middlewares
- **Authentification** (`middlewares/auth.middleware.test.js`)
  - Vérification token JWT
  - Vérification des rôles (user, admin)
  - Gestion des formats Authorization

- **Validation** (`validation.middleware.test.js`)
  - Validation formulaire inscription
  - Validation email
  - Validation forceur du mot de passe

## Configuration Jest

Le fichier `jest.config.js` contient:
- Environnement: Node.js
- Timeout: 10 secondes par test
- Pattern: `**/tests/**/*.test.js`
- Coverage: Exclut node_modules et utilitaires WebSocket

## Exécution des Tests

### Exécuter tous les tests
```bash
npm test
```

### Résultat attendu
```
PASS  tests/auth.test.js
PASS  tests/admin.test.js
PASS  tests/comptes.test.js
PASS  tests/cartes.test.js
PASS  tests/demandes.test.js
PASS  tests/notification.test.js
PASS  tests/beneficiaires.test.js
PASS  tests/transactions.test.js
PASS  tests/models/utilisateur.model.test.js
PASS  tests/models/compte.model.test.js
PASS  tests/middlewares/auth.middleware.test.js
PASS  tests/validation.middleware.test.js

Test Suites: 12 passed, 12 total
Tests:       50+ passed, 50+ total
```

## Architecture des Tests

### Structure des Tests d'Intégration (Routes)
```javascript
describe('Routes Authentification', () => {
  describe('POST /api/auth/inscription', () => {
    it('devrait créer un nouvel utilisateur avec succès', async () => {
      // Test
    });
  });
});
```

### Structure des Tests Unitaires (Modèles)
```javascript
describe('Modèle Utilisateur', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait retourner un utilisateur par email', async () => {
    // Mock setup, test
  });
});
```

### Mocks et Fixtures
- Mocks des modèles avec `jest.mock()`
- Mocks des middlewares d'auth
- Application mock (`mockApp`)
- Données de test cohérentes

## Ajouter Nouveaux Tests

Pour ajouter des tests à un module existant:

1. **Créer le fichier de test**
```bash
touch tests/nouveau-module.test.js
```

2. **Importer les dépendances**
```javascript
const request = require('supertest');
const mockApp = require('./mocks/mockApp');
const { jest } = require('@jest/globals');
```

3. **Écrire les tests**
```javascript
describe('Nouveau Module', () => {
  it('devrait faire quelque chose', () => {
    // Test
  });
});
```

4. **Exécuter**
```bash
npm test -- nouveau-module.test.js
```

## Débogage

### Activer les logs pour un test
```javascript
beforeEach(() => {
  console.log = jest.fn(); // Pour désactiver
  // ou
  jest.spyOn(console, 'log');
});
```

### Exécuter un seul test (`.only`)
```javascript
it.only('test spécifique', () => {
  // Seulement ce test s'exécutera
});
```

### Ignorer un test (`.skip`)
```javascript
it.skip('test à ignorer', () => {
  // Ce test sera ignoré
});
```

### Debug avec Node
```bash
node --inspect-brk ./node_modules/.bin/jest --runInBand
```

## Prochaines Étapes

1. **Intégration Continue**: Ajouter tests dans GitHub Actions
2. **Coverage Target**: Viser 80%+ coverage
3. **Tests E2E**: Ajouter tests avec Cypress/Playwright
4. **Performance**: Ajouter tests de charge avec Apache JMeter
5. **Sécurité**: Tests de sécurité OWASP

## Ressources

- [Jest Documentation](https://jestjs.io/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Node.js Testing Guide](https://nodejs.org/en/docs/guides/testing/)
