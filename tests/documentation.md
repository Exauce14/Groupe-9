# Documentation des Tests - Fortivia Bank

## Résumé Exécutif

**Projet** : Fortivia Bank - Application bancaire web
**Sprint** : Sprint 1 + Sprint 2
**Date** : Mars 2026
**Framework de test** : Jest 29.x
**Langage** : JavaScript (Node.js)

### Métriques
---------------------------------------------------------------------
| Métrique               | Sprint 1          | Sprint 2 (actuel)    |
|------------------------|-------------------|----------------------|
| Total de tests         |      46           |     **121**          |
| Tests réussis          |      46 (100%)    |     **121 (100%)**   |
| Suites de tests        |      7            |     **13**           | 
| Temps d'exécution      |      ~5 secondes  |     ~4.5 secondes    |
| Couverture contrôleurs |      ~0%          |     **87%**          |
| Couverture globale     |      4.26%        |     **50.78%**       |
---------------------------------------------------------------------

---

## 1. Introduction

### 1.1 Objectif
Cette suite de tests automatisés vise à garantir la **sécurité**, la **fiabilité** et la **qualité** de l'application bancaire Fortivia Bank. Les tests couvrent trois aspects essentiels :
- Validation des fonctionnalités (tests unitaires)
- Sécurité de l'application (tests de sécurité)
- Parcours utilisateur complets (tests d'intégration)

### 1.2 Technologies utilisées
- **Jest** : Framework de test JavaScript
- **Supertest** : Tests d'API HTTP
- **PostgreSQL** : Base de données de test
- **Bcrypt** : Hashage de mots de passe
- **JWT** : Authentification par tokens

---

## 2. Architecture des Tests

### 2.1 Structure des dossiers
```
tests/
├── unit/                   Tests des fonctions isolées et des contrôleurs
├── security/               Tests de vulnérabilités
├── integration/            Tests de workflows complets
├── manuels/                Documentation tests manuels
├── setup.js               Configuration globale
└── .env.test              Variables d'environnement
```

### 2.2 Configuration
- **Fichier** : `jest.config.js`
- **Timeout** : 10 secondes par test
- **Environnement** : Node.js
- **Base de données** : PostgreSQL (base de test séparée)

### 2.3 Approche : Tests unitaires avec Mocking

Le **mocking** consiste à remplacer les dépendances réelles (base de données, emails, WebSockets)
par de faux objets contrôlés (`jest.fn()`). Cette approche garantit :

- ✅ **Aucun contact avec la base de données réelle** — les données ne sont jamais modifiées
- ✅ **Tests rapides** — pas de connexion réseau ni de BD
- ✅ **Tests déterministes** — on contrôle exactement ce que chaque dépendance retourne
- ✅ **Tests isolés** — chaque contrôleur est testé seul

| Dépendance mockée | Effet |
|---|---|
| `server/config/baseDeDonnees` (query) | Les requêtes SQL ne s'exécutent jamais |
| Modèles (`compte.modele`, `carte.modele`, etc.) | Les accès BD via les modèles sont simulés |
| `utilitaires/email.utils` | Aucun email n'est envoyé |
| `utilitaires/websocket` | Aucune notification WebSocket n'est envoyée |
| `bcrypt` | Le hashage/comparaison est simulé |
| `jsonwebtoken` | La génération de tokens est simulée |

---

## 3. Catalogue des Tests

### 3.1 Tests Unitaires (93 tests)

Les tests unitaires vérifient le bon fonctionnement des fonctions et contrôleurs individuels.

---

#### 3.1.1 Module Authentification — Logique pure (11 tests)
**Fichier** : `tests/unit/auth.test.js`

-------------------------------------------------------------------------------------------
| # |        Tests                    |                  Objectifs                        |
|---|---------------------------------|---------------------------------------------------|
| 1 | Hashage bcrypt                  | Vérifier que les mots de passe sont chiffrés      |
| 2 | Unicité des hashs               | Confirmer que le salt rend chaque hash unique     |
| 3 | Validation mot de passe correct | Tester bcrypt.compare() avec bon mot de passe     |
| 4 | Rejet mot de passe incorrect    | Tester bcrypt.compare() avec mauvais mot de passe |
| 5 | Génération token JWT            | Vérifier la création de tokens valides            |
| 6 | Contenu token JWT               | Valider les données dans le token                 |
| 7 | Expiration token JWT            | Confirmer que les tokens expirés sont rejetés     |
| 8 | Validation email valide         | Tester le regex d'email avec format correct       |
| 9 | Rejet email invalide            | Tester le regex avec formats incorrects           |
| 10 | Format code 2FA                | Vérifier que le code a 6 chiffres                 |
| 11 | Unicité code 2FA               | Confirmer que chaque code est unique              |
-------------------------------------------------------------------------------------------

---

#### 3.1.2 Module Authentification — Contrôleur (13 tests)
**Fichier** : `tests/unit/auth.controleur.test.js`

**Inscription (3 tests)**


--------------------------------------------------------------------------------
| # |       Tests         |             Ce qui est vérifié                     |
|---|---------------------|----------------------------------------------------|
| 1 | Inscription réussie | Retourne HTTP 201 avec email de l'utilisateur créé |
| 2 | Email déjà utilisé  | `trouverParEmail` retourne un user → HTTP 400      |
| 3 | Erreur BD           | Exception → `next(error)` appelé                   |
--------------------------------------------------------------------------------

**Connexion (7 tests)**

---------------------------------------------------------------------------------------------
| # |        Test                           |         Code HTTP attendu                     |
|---|---------------------------------------|-----------------------------------------------|
| 1 | Email non trouvé                      | 401                                           |
| 2 | Compte verrouillé                     | 423 avec temps restant                        |
| 3 | Mauvais mot de passe (< 3 tentatives) | 401, tentatives incrémentées                  |
| 4 | 3 tentatives échouées                 | 423, compte verrouillé 15 min                 |
| 5 | Compte suspendu                       | 403                                           |
| 6 | Compte fermé                          | 403                                           |
| 7 | Connexion réussie                     | Code 2FA généré, `requiresVerification: true` |
---------------------------------------------------------------------------------------------

**Vérification 2FA (3 tests)**

------------------------------------------------------------------------------
| # |       Test           |          Ce qui est vérifié                     |
|---|----------------------|-------------------------------------------------|
| 1 | Code invalide/expiré | HTTP 401                                        |
| 2 | Code valide          | Token JWT généré + infos utilisateur retournées |
| 3 | Erreur BD            | `next(error)` appelé                            |
------------------------------------------------------------------------------

---

#### 3.1.3 Module Demandes — Logique pure (11 tests)
**Fichier** : `tests/unit/demandes.test.js`

---------------------------------------------------------------------
| # |        Test                |      Règle métier validée        |
|---|----------------------------|----------------------------------|
| 1 | Carte de crédit - limites  | Limite entre 500$ et 50 000$     |
| 2 | Prêt personnel - montant   | Montant entre 1 000$ et 50 000$  |
| 3 | Prêt personnel - durée     | Durée entre 12 et 60 mois        |
| 4 | Prêt hypothécaire - minimum| Montant minimum 50 000$          |
| 5 | Compte placement - minimum | Montant minimum 1 000$           |
| 6 | Types de demande valides   | Liste blanche des types acceptés |
| 7 | Types de demande invalides | Rejet des types non reconnus     |
| 8 | Numéro de compte           | Format à 10 chiffres             |
| 9 | Numéro de carte            | Format à 16 chiffres             |
| 10 | CVV                       | Format à 3 chiffres              |
| 11 | Date expiration carte     |4 ans à partir de la date actuelle|
---------------------------------------------------------------------

---

#### 3.1.4 Module Demandes — Contrôleur (11 tests)
**Fichier** : `tests/unit/demandes.controleur.test.js`

**Créer une demande (5 tests)**

----------------------------------------------------------------------------------------------
| # |        Test                |                Ce qui est vérifié                         |
|---|----------------------------|-----------------------------------------------------------|
| 1 | Compte inactif (`pending`) | `account_status !== 'active'` → HTTP 403                  |
| 2 | Compte inexistant          | `rows: []` → HTTP 403                                     |
| 3 | Demande créée (happy path) | INSERT réussi → HTTP 201 avec `demandeId`                 |
| 4 | Notification créée | `notificationModel.creer` appelé avec `type: 'request_submitted'` |
| 5 | Erreur BD                  | `next(error)`                                             |
----------------------------------------------------------------------------------------------

**Lister les demandes (3 tests)**

----------------------------------------------------------------------
| # |     Test       |        Ce qui est vérifié                     |
|---|----------------|-----------------------------------------------|
| 1 | Liste normale  | SELECT retourne les demandes de l'utilisateur |
| 2 | Aucune demande | `{ demandes: [] }`                            |
| 3 | Erreur BD      | `next(error)`                                 |
----------------------------------------------------------------------

**Obtenir une demande (3 tests)**

----------------------------------------------------
| # |      Test           | Ce qui est vérifié     |
|---|---------------------|------------------------|
| 1 | Demande introuvable | HTTP 404               |
| 2 | Demande trouvée     | Objet demande retourné |
| 3 | Erreur BD           | `next(error)`          |
----------------------------------------------------

---

#### 3.1.5 Module Administration — Logique pure (6 tests)
**Fichier** : `tests/unit/admin.test.js`

------------------------------------------------------------------------------
| # |      Test               |          Règle de gestion                    |
|---|-------------------------|----------------------------------------------|
| 1 | Statuts valides         | pending, active, suspended, closed, rejected |
| 2 | Statuts invalides       | Rejet de valeurs non autorisées              |
| 3 | Raison blocage valide   | Minimum 2 caractères                         |
| 4 | Raison blocage invalide | Rejet si < 2 caractères                      |
| 5 | Bonus de bienvenue      | 5.00 CAD pour nouveau compte chèque          |
| 6 | Protection compte admin | Un admin ne peut pas se bloquer              |
------------------------------------------------------------------------------

---

#### 3.1.6 Module Administration — Contrôleur (22 tests)
**Fichier** : `tests/unit/admin.controleur.test.js`

-----------------------------------------------------------------------------------------
| # |     Fonction          |        Test                     |      Code HTTP          |
|---|-----------------------|---------------------------------|-------------------------|
| 1 | statistiques          | Retourne les stats du dashboard | 200                     |
| 2 | statistiques          | Erreur BD                       | next(error)             |
| 3 | inscriptionsEnAttente | Retourne la liste pending       | 200                     |
| 4 | inscriptionsEnAttente | Erreur BD                       | next(error)             |
| 5 | approuverInscription  | Approbation complète (compte chèques + carte débit) | 200 |
| 6 | approuverInscription  | Erreur BD                       | next(error)             |
| 7 | rejeterInscription    | Rejet + notification créée      | 200                     |
| 8 | rejeterInscription    | Erreur BD                       | next(error)             |
| 9 | bloquerUtilisateur    | User introuvable                | 404                     |
| 10 | bloquerUtilisateur   | Tentative sur un admin          | 403                     |
| 11 | bloquerUtilisateur   | Blocage réussi + notification   | 200                     |
| 12 | bloquerUtilisateur   | Erreur BD                       | next(error)             |
| 13 | debloquerUtilisateur | User introuvable                | 404                     |
| 14 | debloquerUtilisateur | Déblocage réussi + notification | 200                     |
| 15 | debloquerUtilisateur | Erreur BD                       | next(error)             |
| 16 | approuverDemande     | Demande introuvable             | 404                     |
| 17 | approuverDemande     | Type `account_opening` → compte épargne créé | 200        |
| 18 | approuverDemande     | Type `credit_card` → carte crédit créée | 200             |
| 19 | approuverDemande     | Erreur BD                       | next(error)             |
| 20 | rejeterDemande       | Rejet + notification utilisateur| 200                     |
| 21 | rejeterDemande       | Erreur BD                       | next(error)             |
| 22 | demandesEnAttente    | Retourne la liste pending       | 200                     |
-----------------------------------------------------------------------------------------

---

#### 3.1.7 Module Comptes — Contrôleur (8 tests)
**Fichier** : `tests/unit/comptes.controleur.test.js`

----------------------------------------------------------------------------------------------------
| # |      Fonction      |      Test                         |         Ce qui est vérifié          |
|---|--------------------|-----------------------------------|-------------------------------------|
| 1 | mesComptes         | Liste normale           | `trouverParUtilisateur(id)` + liste retournée |
| 2 | mesComptes         | Aucun compte                      | `{ comptes: [] }`                   |
| 3 | mesComptes         | Erreur BD                         | `next(error)`                       |
| 4 | resumeSoldes       | Résumé complet                  | Totaux chèques/épargne/investissement |
| 5 | resumeSoldes       | Erreur BD                         | `next(error)`                       |
| 6 | transactionsCompte | Limite par défaut                 | `trouverParCompte(id, 10)`          |
| 7 | transactionsCompte | Limite personnalisée (?limite=25) | `trouverParCompte(id, 25)`          |
| 8 | transactionsCompte | Erreur BD                         | `next(error)`                       |
----------------------------------------------------------------------------------------------------

---

#### 3.1.8 Module Cartes — Contrôleur (12 tests)
**Fichier** : `tests/unit/cartes.controleur.test.js`

--------------------------------------------------------------------
| # | Fonction        |            Test              | Code HTTP   |
|---|-----------------|------------------------------|-------------|
| 1 | mesCartes       | Retourne la liste des cartes | 200         |
| 2 | mesCartes       | Erreur BD                    | next(error) |
| 3 | bloquerCarte    | Carte introuvable            | 404         |
| 4 | bloquerCarte    | Carte d'un autre utilisateur | 403         | 
| 5 | bloquerCarte    | Carte déjà bloquée           | 400         |
| 6 | bloquerCarte    | Blocage réussi + notification| 200         |
| 7 | bloquerCarte    | Erreur BD                    | next(error) |
| 8 | debloquerCarte  | Carte introuvable            | 404         |
| 9 | debloquerCarte  | Carte d'un autre utilisateur | 403         |
| 10 | debloquerCarte | Carte déjà active            | 400         |
| 11 | debloquerCarte |Déblocage réussi+ notification| 200         | 
| 12 | debloquerCarte | Erreur BD                    | next(error) |
--------------------------------------------------------------------

---

#### 3.1.9 Module Notifications — Contrôleur (10 tests)
**Fichier** : `tests/unit/notifications.controleur.test.js`
 
-------------------------------------------------------------------------------------------
| # |      Fonction      |          Test            |       Ce qui est vérifié            |
|---|--------------------|--------------------------|-------------------------------------|
| 1 | mesNotifications   | Liste normale            | `trouverParUtilisateur(id)` + liste |
| 2 | mesNotifications   | Aucune notification      | `{ notifications: [] }`             |
| 3 | mesNotifications   | Erreur BD                | `next(error)`                       |
| 4 | compterNonLues     | Plusieurs non lues       | `{ count: 3 }`                      |
| 5 | compterNonLues     | Toutes lues              | `{ count: 0 }`                      |
| 6 | compterNonLues     | Erreur BD                | `next(error)`                       |
| 7 | marquerLue         | Marquer une notification | `marquerLue(id)` appelé             |
| 8 | marquerLue         | Erreur BD                | `next(error)`                       |
| 9 | marquerToutesLues  | Marquer toutes           | `marquerToutesLues(userId)` appelé  |
| 10 | marquerToutesLues | Erreur BD                | `next(error)`                       | 
-------------------------------------------------------------------------------------------

---

### 3.2 Tests de Sécurité (14 tests)

Les tests de sécurité détectent les vulnérabilités critiques.

#### 3.2.1 Injection SQL (5 tests)
**Fichier** : `tests/security/sql-injection.test.js`

**Vulnérabilité testée** : Injection de code SQL malveillant


-------------------------------------------------------------------
| # |    Attaque simulée   |      Protection vérifiée             |
|---|----------------------|--------------------------------------|
| 1 | `admin'--`           | Court-circuitage authentification    |
| 2 | `' OR '1'='1`        | Contournement WHERE clause           |
| 3 | `UNION SELECT`       | Extraction données autres tables     |
| 4 | `DROP TABLE`         | Suppression de tables                |
| 5 | Requêtes paramétrées | Utilisation correcte de $1, $2, etc. |
-------------------------------------------------------------------

**Mécanisme de protection** : Requêtes paramétrées PostgreSQL

#### 3.2.2 Cross-Site Scripting - XSS (3 tests)
**Fichier** : `tests/security/xss.test.js`

**Vulnérabilité testée** : Injection de scripts JavaScript malveillants


-----------------------------------------------------------------------
| # |      Attaque simulée               |     Protection vérifiée    |
|---|------------------------------------|----------------------------|
| 1 | `<script>alert('XSS')</script>`    | Sanitisation champ prénom  |
| 2 | `<img src=x onerror=alert('XSS')>` | Sanitisation champ adresse |
| 3 | `<div onmouseover="alert('XSS')">` | Blocage event handlers     |
-----------------------------------------------------------------------

**Mécanisme de protection** : Validation et sanitisation des inputs

#### 3.2.3 Authentification & Autorisation (6 tests)
**Fichier** : `tests/security/authentification.test.js`


----------------------------------------------------------------------------
| # |          Test           |          Mécanisme vérifié                 |
|---|-------------------------|--------------------------------------------|
| 1 | Accès sans token        | Rejet des requêtes non authentifiées (401) |
| 2 | Token invalide          | Validation signature JWT                   |
| 3 | Token expiré            | Validation expiration (24h)                |
| 4 | Élévation de privilèges | Séparation user/admin (403)                |
| 5 | CORS                    | Configuration cross-origin                 |
| 6 | Brute force             | Rate limiting (100 req/15min)              |
----------------------------------------------------------------------------

---

### 3.3 Tests d'Intégration (4 tests)

Les tests d'intégration valident des workflows utilisateur complets avec une vraie connexion serveur.

#### 3.3.1 Workflow Inscription (4 tests)
**Fichier** : `tests/integration/inscription.test.js`


-------------------------------------------------------------------
| # |     Scénario        |         Validation                    |
|---|---------------------|---------------------------------------|
| 1 | Inscription réussie | Création utilisateur + statut pending |
| 2 | Email déjà utilisé  | Rejet avec message d'erreur approprié |
| 3 | Données manquantes  | Validation champs obligatoires        |
| 4 | Email invalide      | Validation format email               |
-------------------------------------------------------------------

---

## 4. Exécution des Tests

### 4.1 Commandes disponibles
```bash
# Tous les tests
npm test

# Tests unitaires uniquement
npm run test:unit

# Tests de sécurité uniquement
npm run test:security

# Tests d'intégration uniquement
npm run test:integration

# Mode watch (surveillance continue)
npm run test:watch

# Avec rapport de couverture
npx jest tests/unit/ --coverage
```

### 4.2 Environnement de test

**Fichier** : `.env.test`
```env
DB_NAME=base_de_donne_projet_integrateur
DB_USER=postgres
DB_PASSWORD=admin
JWT_SECRET=test_secret_key_for_testing_only
EMAIL_MODE=dev
```

> **Important** : Les tests unitaires ne nécessitent **pas** que le serveur soit en marche.
> Les mocks interceptent tous les appels BD, emails et WebSockets.
> Les tests d'intégration nécessitent le serveur sur `localhost:3000`.

---

## 5. Résultats et Couverture

### 5.1 Résultats globaux
```
Test Suites: 13 passed, 13 total
Tests:       121 passed, 121 total
Time:        4.582s
```

### 5.2 Couverture par module
```
------------------------------|---------|----------|---------|---------|
File                          | % Stmts | % Branch | % Funcs | % Lines |
------------------------------|---------|----------|---------|---------|
All files                     |   50.78 |    33.04 |   26.88 |   50.96 |
 controleurs/                 |   87.33 |    73.62 |   88.88 |   87.33 |
  admin.controleur.js         |   80.18 |    41.66 |   80.00 |   80.18 |
  auth.controleur.js          |   85.34 |    95.45 |   75.00 |   85.34 |
  cartes.controleur.js        |  100.00 |   100.00 |  100.00 |  100.00 |
  comptes.controleur.js       |  100.00 |   100.00 |  100.00 |  100.00 |
  demandes.controleur.js      |  100.00 |    89.47 |  100.00 |  100.00 |
  notifications.controleur.js |  100.00 |   100.00 |  100.00 |  100.00 |
 middlewares/                 |    0.00 |     0.00 |    0.00 |    0.00 |
 modeles/                     |   29.16 |     0.00 |    0.00 |   29.16 |
 routes/                      |    0.00 |     0.00 |    0.00 |    0.00 |
 utilitaires/                 |    8.52 |     8.88 |    0.00 |    8.80 |
------------------------------|---------|----------|---------|---------|
```

### 5.3 Interprétation de la couverture

La couverture globale de **50.78%** inclut routes, middlewares et modèles qui ont 0% parce
qu'ils sont **remplacés intentionnellement par des mocks** dans les tests unitaires.

------------------------------------------------------------------------------------
|           Catégorie              | Couverture |       Explication                |
|----------------------------------|------------|----------------------------------|
| **Contrôleurs (logique métier)** | **87%**    | Objectif principal atteint       |
| Routes                           | 0%         | Nécessitent un vrai serveur HTTP |
| Middlewares                      | 0%         | Nécessitent des requêtes réelles |
| Modèles                          | ~29%       | Mockés → fonctions non exécutées |
| Utilitaires                      | ~8%        | Email/WebSocket mockés           |
------------------------------------------------------------------------------------

---

## 6. Tests Manuels

**Fichier** : `tests/manuels/`

10 cas de test manuels documentés couvrant :
- Inscription et connexion
- Gestion des comptes
- Demandes de services bancaires
- Interface administrateur
- Notifications

---

## 7. Maintenance

### 7.1 Ajouter un nouveau test
1. Identifier le type de test (unit/security/integration)
2. Créer le fichier dans le dossier approprié
3. Suivre la structure existante
4. Exécuter `npm test` pour validation

### 7.2 Déboguer un test échoué
```bash
# Exécuter un fichier spécifique
npx jest tests/unit/auth.controleur.test.js

# Mode verbose pour plus de détails
npx jest --verbose

# Détecter les fuites mémoire
npx jest --detectOpenHandles
```



---

## 8. Conclusion

Cette suite de tests automatisés fournit une **couverture solide** des fonctionnalités critiques de Fortivia Bank, avec un focus sur la **logique métier** (contrôleurs à 87%) et la **sécurité** (injection SQL, XSS, authentification).

**Évolution Sprint 1 → Sprint 2** :
- Tests : 46         → **121** (+163%)
- Couverture contrôleurs : ~0% → **87%**
- Fonctionnalités couvertes : 3 → **10**

**Recommandations futures** :
- Ajouter tests d'intégration pour connexion, cartes et demandes
- Couvrir les middlewares d'authentification et de validation
- Intégrer dans pipeline CI/CD
- Ajouter tests de performance
