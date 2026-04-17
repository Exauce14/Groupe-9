# 📋 TESTS MANUELS - FORTIVIA BANK SPRINT 1

## 🎯 Objectif
Ces tests manuels complètent les tests automatisés en vérifiant les aspects visuels, l'expérience utilisateur et les cas limites difficiles à automatiser.

---

## ✅ TEST MANUEL 1 : Inscription d'un nouveau client

**Objectif :** Vérifier que le processus d'inscription fonctionne de bout en bout avec validation visuelle.

**Prérequis :** 
- Serveur démarré (`npm run dev`)
- Base de données connectée
- Navigateur ouvert sur `http://localhost:3000/inscription.html`

**Étapes :**
1. Remplir le formulaire d'inscription avec des données valides :
   - Prénom : Jean
   - Nom : Dupont
   - Email : test.manuel1@example.com
   - Mot de passe : Test123!@#
   - Date de naissance : 01/01/1990
   - Téléphone : 514-555-1000
   - Adresse : 123 Rue Test
   - Ville : Montréal
   - Province : QC
   - Code postal : H3A 1A1
   - Revenu annuel : 50000
   - Statut : Employé

2. Cliquer sur "S'inscrire"

**Résultats attendus :**
- ✅ Message de confirmation "Inscription réussie"
- ✅ Redirection vers la page de connexion
- ✅ Email de confirmation reçu (vérifier la console en mode dev)
- ✅ Utilisateur créé dans la base de données avec statut "pending"

**Résultat réel :** ___________

**Statut :** ✅  Réussi



---

## ✅ TEST MANUEL 2 : Connexion avec 2FA

**Objectif :** Vérifier le processus complet de connexion avec authentification à deux facteurs.

**Prérequis :**
- Compte créé et approuvé par un admin
- Email : admin@fortivia.com / Password : Admin123

**Étapes :**
1. Aller sur `http://localhost:3000/index.html`
2. Entrer email : admin@fortivia.com
3. Entrer mot de passe : Admin123
4. Cliquer sur "Se connecter"
5. Observer la console du serveur pour récupérer le code 2FA
6. Entrer le code 2FA dans la page de vérification
7. Cliquer sur "Vérifier"

**Résultats attendus :**
- ✅ Après connexion, redirection vers page 2FA
- ✅ Code 2FA affiché dans la console du serveur
- ✅ Code 2FA valide pendant 10 minutes
- ✅ Après vérification, redirection vers le dashboard
- ✅ Token JWT stocké dans localStorage
- ✅ Message de bienvenue avec le prénom de l'utilisateur



**Statut :** ✅  Réussi



---

## ✅ TEST MANUEL 3 : Approbation d'inscription par l'admin

**Objectif :** Vérifier que l'admin peut approuver une inscription en attente.

**Prérequis :**
- Connecté en tant qu'admin
- Au moins une inscription en attente dans la base de données

**Étapes :**
1. Se connecter au dashboard admin
2. Aller dans la section "Inscriptions"
3. Repérer une inscription en attente
4. Cliquer sur "Approuver"
5. Confirmer l'approbation

**Résultats attendus :**
- ✅ Modal de confirmation s'affiche
- ✅ Message "Inscription approuvée avec succès"
- ✅ L'inscription disparaît de la liste "En attente"
- ✅ Compte chèques créé avec 5.00$ CAD
- ✅ Carte de débit générée automatiquement
- ✅ Email de confirmation envoyé à l'utilisateur
- ✅ Notification créée pour l'utilisateur
- ✅ Statut du compte passe à "active" dans la base de données


**Statut :** ✅ Réussi 



---

## ✅ TEST MANUEL 4 : Demande de carte de crédit

**Objectif :** Vérifier le processus complet de demande de carte de crédit par un client.

**Prérequis :**
- Connecté en tant que client avec compte approuvé
- Aucune carte de crédit existante

**Étapes :**
1. Aller dans "Mes demandes"
2. Cliquer sur la carte "Carte de crédit"
3. Remplir le formulaire :
   - Limite de crédit : 5000
4. Cliquer sur "Soumettre la demande"
5. Se connecter en tant qu'admin
6. Approuver la demande de carte de crédit

**Résultats attendus :**
- ✅ Message "Demande soumise avec succès"
- ✅ Demande visible dans l'historique du client
- ✅ Demande visible dans le dashboard admin
- ✅ Après approbation admin : carte générée automatiquement
- ✅ Carte visible dans "Mes cartes" du client
- ✅ Numéro de carte à 16 chiffres
- ✅ CVV à 3 chiffres
- ✅ Date d'expiration à 4 ans
- ✅ Limite de crédit = Crédit disponible = 5000$



**Statut :** ✅ Réussi 


---

## ✅ TEST MANUEL 5 : Demande de prêt personnel

**Objectif :** Vérifier le processus de demande de prêt personnel et le décaissement automatique.

**Prérequis :**
- Connecté en tant que client avec compte approuvé

**Étapes :**
1. Aller dans "Mes demandes"
2. Cliquer sur la carte "Prêt personnel"
3. Remplir le formulaire :
   - Montant : 10000
   - Durée : 36 mois
   - Raison : Rénovation domiciliaire
4. Cliquer sur "Soumettre la demande"
5. Se connecter en tant qu'admin
6. Approuver la demande de prêt
7. Retourner au dashboard client

**Résultats attendus :**
- ✅ Demande soumise avec succès
- ✅ Après approbation : montant déposé dans compte chèques
- ✅ Transaction visible dans l'historique du compte
- ✅ Description : "Prêt personnel - 10000.00$ sur 36 mois"
- ✅ Solde du compte chèques augmenté de 10000$
- ✅ Email de confirmation envoyé


**Statut :** ✅  Réussi 



---

## ✅ TEST MANUEL 6 : Blocage et déblocage d'un compte utilisateur

**Objectif :** Vérifier que l'admin peut bloquer et débloquer un compte utilisateur.

**Prérequis :**
- Connecté en tant qu'admin
- Au moins un compte utilisateur actif

**Étapes :**
1. Aller dans la section "Utilisateurs"
2. Repérer un compte actif (non admin)
3. Cliquer sur "🔒 Bloquer"
4. Entrer une raison : "Activité suspecte détectée"
5. Confirmer le blocage
6. Tenter de se connecter avec ce compte
7. Retourner au dashboard admin
8. Cliquer sur "🔓 Débloquer"
9. Confirmer le déblocage
10. Tenter de se connecter à nouveau

**Résultats attendus :**
- ✅ Après blocage : message "Compte bloqué avec succès"
- ✅ Statut du compte passe à "suspended"
- ✅ Email de suspension envoyé à l'utilisateur
- ✅ Tentative de connexion : message "Compte suspendu"
- ✅ Après déblocage : message "Compte débloqué avec succès"
- ✅ Statut du compte passe à "active"
- ✅ Email de réactivation envoyé
- ✅ Connexion possible à nouveau


**Statut :** ✅ Réussi 



---

## ✅ TEST MANUEL 7 : Visualisation de l'historique des transactions

**Objectif :** Vérifier que l'historique des transactions s'affiche correctement.

**Prérequis :**
- Connecté en tant que client
- Au moins un compte avec des transactions

**Étapes :**
1. Aller sur le dashboard
2. Cliquer sur le compte chèques
3. Observer le modal d'historique
4. Vérifier les détails de chaque transaction
5. Fermer le modal
6. Cliquer sur un autre compte (épargne ou placement si disponible)

**Résultats attendus :**
- ✅ Modal s'ouvre avec l'historique complet
- ✅ Transactions triées par date (plus récente en haut)
- ✅ Colonnes : Date, Type, Description, Montant, Solde après
- ✅ Crédits en vert avec "+"
- ✅ Débits en rouge avec "-"
- ✅ Dates formatées correctement (ex: 5 mars 2026, 14:30)
- ✅ Modal scrollable si plus de 10 transactions
- ✅ Bouton "Fermer" fonctionne



**Statut :** ✅  Réussi 



---

## ✅ TEST MANUEL 8 : Système de notifications en temps réel

**Objectif :** Vérifier que les notifications s'affichent en temps réel via WebSocket.

**Prérequis :**
- Deux navigateurs ouverts : un client et un admin

**Étapes :**
1. **Navigateur 1 (Client) :** Se connecter en tant que client
2. **Navigateur 2 (Admin) :** Se connecter en tant qu'admin
3. **Admin :** Approuver une demande du client
4. **Client :** Observer le badge de notification
5. **Client :** Cliquer sur "Notifications"
6. **Client :** Vérifier la nouvelle notification

**Résultats attendus :**
- ✅ Badge de notification apparaît immédiatement (sans rafraîchissement)
- ✅ Nombre correct de notifications non lues
- ✅ Notification affichée avec icône, titre, message
- ✅ Fond bleu pour notification non lue
- ✅ Cliquer marque comme lue (fond blanc)
- ✅ Badge se met à jour automatiquement


**Statut :** ✅ Réussi 



---

## ✅ TEST MANUEL 9 : Validation côté client des formulaires

**Objectif :** Vérifier que les validations JavaScript fonctionnent avant soumission.

**Prérequis :**
- Navigateur ouvert sur page d'inscription

**Étapes :**
1. Essayer de soumettre le formulaire vide
2. Entrer un email invalide (ex: "test@")
3. Entrer un mot de passe faible (ex: "123")
4. Entrer un code postal invalide (ex: "12345")
5. Entrer un numéro de téléphone invalide
6. Entrer un revenu négatif

**Résultats attendus :**
- ✅ Messages d'erreur s'affichent en rouge
- ✅ Email invalide : "Format d'email invalide"
- ✅ Mot de passe faible : message indiquant les critères
- ✅ Code postal invalide : "Format invalide (ex: H3A 1A1)"
- ✅ Téléphone invalide : "Format invalide (ex: 514-555-1234)"
- ✅ Revenu négatif : "Le revenu doit être positif"
- ✅ Formulaire non soumis tant qu'il y a des erreurs



**Statut :** ✅  Réussi 



---

## ✅ TEST MANUEL 10 : Responsive Design

**Objectif :** Vérifier que l'interface s'adapte correctement aux différentes tailles d'écran.

**Prérequis :**
- Navigateur avec outils de développement (F12)

**Étapes :**
1. Ouvrir le dashboard client
2. Ouvrir les DevTools (F12)
3. Activer le mode responsive (Ctrl+Shift+M)
4. Tester les résolutions suivantes :
   - Desktop : 1920x1080
   - Laptop : 1366x768
   - Tablet : 768x1024
   - Mobile : 375x667

**Résultats attendus :**
- ✅ **Desktop :** Toutes les cartes visibles côte à côte
- ✅ **Laptop :** Layout adapté, navigation accessible
- ✅ **Tablet :** Cartes empilées, menu accessible
- ✅ **Mobile :** Layout vertical, texte lisible
- ✅ Pas de défilement horizontal
- ✅ Boutons cliquables facilement
- ✅ Images/logos proportionnés
- ✅ Modals centrés sur tous les écrans



**Statut :** ✅ Réussi 



---

