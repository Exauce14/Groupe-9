# Documentation des Tests Unitaires – Fortivia Bank

## 1. Introduction

Dans le cadre du développement du système **Fortivia Bank**, des tests unitaires ont été mis en place afin de garantir le bon fonctionnement des différentes composantes de l’application.

Ces tests permettent de vérifier individuellement chaque fonctionnalité (modèles, contrôleurs, routes) et de détecter rapidement les erreurs.

---

## 2. Objectif des tests

Les tests unitaires ont pour objectifs :

- Vérifier le bon fonctionnement des fonctionnalités principales
- Détecter les erreurs le plus tôt possible
- Assurer la fiabilité du système
- Faciliter la maintenance et les évolutions futures

---

## 3. Outils utilisés

Les outils suivants ont été utilisés :

- **Jest** : framework de test JavaScript
- **Supertest** : pour tester les routes API (requêtes HTTP)
- **Node.js** : environnement d’exécution

---

## 4. Exécution des tests

### Lancer tous les tests

```bash
npm test

5. Types de tests réalisés
    Tests des modèles
Vérification des requêtes SQL
Validation des insertions et récupérations de données
Vérification des fonctions métier (ex: notifications)
    Tests des routes (API)
Vérification des endpoints
Tests des requêtes GET, POST, PUT
Vérification des réponses JSON
    Tests des middlewares
Authentification (JWT)
Validation des données

6. Exemple de test
test('retourne false si réponse incorrecte', async () => {
    const result = await notificationModel.verifierReponse(1, 'mauvaise');
    expect(result).toBe(false);
});
Ce test vérifie que le système refuse une réponse incorrecte à une question de sécurité.

7. Résultats des tests

Après exécution :

12 suites de tests
31 tests exécutés
0 échec

Tous les tests passent avec succès, ce qui valide les fonctionnalités principales.

8. Couverture du code

 Type       | Couverture 
 ---------- | ---------- 
 Statements | 27.37%     
 Branches   | 18.28%     
 Functions  | 10.37%     
 Lines      | 27.40%     

9. Limites
Couverture encore faible sur les contrôleurs
Certaines routes ne sont pas entièrement testées
Les interactions complexes avec la base de données peuvent être améliorées

10. Améliorations possibles

Pour améliorer la qualité du projet :

Ajouter des tests pour tous les contrôleurs
Simuler la base de données (mock)
Tester les cas d’erreur (ex: utilisateur inexistant)
Augmenter la couverture à plus de 60%

11. Analyse critique

Les tests actuels couvrent les fonctionnalités essentielles, notamment :

Authentification
Gestion des comptes
Notifications
Transactions

Cependant, certaines parties restent peu testées, ce qui peut représenter un risque en cas de modification du code.

12. Conclusion

Les tests unitaires mis en place permettent de garantir la stabilité et la fiabilité du système Fortivia Bank.

Ils constituent une base solide pour :

assurer la qualité du code
faciliter la maintenance
prévenir les bugs

13. Auteur

Projet réalisé dans le cadre du développement d’une application bancaire : Fortivia Bank.