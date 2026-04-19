# Documentation API - Plateforme Bancaire Digitale

**Version:** 1.0.0  
**Derniere mise a jour:** 2026-04-16  
**Base URL:** `http://localhost:3000/api`

---

## Table des matieres

1. [Vue d'ensemble](#vue-densemble)
2. [Authentification](#authentification)
3. [Connexion Frontend / Backend](#connexion-frontend--backend)
4. [Codes de reponse HTTP](#codes-de-reponse-http)
5. [Format des reponses](#format-des-reponses)
6. [Endpoints - Authentification](#endpoints---authentification)
7. [Endpoints - Utilisateurs](#endpoints---utilisateurs)
8. [Endpoints - Comptes bancaires](#endpoints---comptes-bancaires)
9. [Endpoints - Cartes](#endpoints---cartes)
10. [Endpoints - Transactions](#endpoints---transactions)
11. [Endpoints - Virements Interac](#endpoints---virements-interac)
12. [Endpoints - Paiements de factures](#endpoints---paiements-de-factures)
13. [Endpoints - Demandes](#endpoints---demandes)
14. [Endpoints - Notifications](#endpoints---notifications)
15. [Endpoints - Administration](#endpoints---administration)
16. [Communication en temps reel (WebSocket)](#communication-en-temps-reel-websocket)

---

## Vue d'ensemble

Cette API REST expose les fonctionnalites d'une plateforme bancaire digitale. Elle couvre l'inscription et la connexion des utilisateurs, la gestion des comptes et cartes bancaires, les virements internes, les transferts Interac, les paiements de factures, ainsi qu'un panneau d'administration complet.

**Technologies:**
- Runtime: Node.js
- Framework: Express.js 4.18.2
- Base de donnees: PostgreSQL
- Authentification: JWT (JSON Web Token) + authentification a deux facteurs (2FA) par courriel
- Reinitialisation de mot de passe: gestion des codes via la table existante `verification_codes`, sans ajout de nouvelle table
- Communication temps reel: Socket.io 4.6.1

---

## Authentification

L'API utilise des tokens JWT. La procedure de connexion se deroule en deux etapes obligatoires.

### Etape 1 - Connexion initiale

L'utilisateur soumet son adresse courriel et son mot de passe. Si les informations sont correctes et que le compte est actif, un code a six chiffres est envoye par courriel. Aucun token n'est delivre a cette etape.

### Etape 2 - Verification du code 2FA

L'utilisateur soumet le code recu. En cas de succes, un token JWT est retourne. Ce token doit etre inclus dans toutes les requetes subsequentes.

### Utilisation du token

Inclure le token dans l'en-tete `Authorization` de chaque requete protegee :

```
Authorization: Bearer <token>
```

Le token est valide pendant 24 heures. A expiration, l'utilisateur doit se reconnecter.

L'API prend egalement en charge la reinitialisation de mot de passe via email (`POST /auth/mot-de-passe-oublie` et `POST /auth/reinitialiser-mot-de-passe`) ainsi que la modification du mot de passe actuel par un endpoint authentifie (`PUT /utilisateurs/changer-mot-de-passe`).

### Niveaux d'acces

| Role        | Description                                                      |
|-------------|------------------------------------------------------------------|
| `user`      | Client bancaire standard. Acces a ses propres ressources uniquement. |
| `admin`     | Administrateur. Acces complet aux outils de gestion et d'approbation. |
| `enterprise`| Compte entreprise. Recoit les paiements de factures des utilisateurs. |

---

## Connexion Frontend / Backend

### Configuration de l'URL de base

Le frontend communique avec le backend via l'URL de base suivante :

```javascript
const API_URL = 'http://localhost:3000/api';
```

### Modele de requete standard

Toutes les requetes authentifiees suivent ce modele :

```javascript
const token = localStorage.getItem('token');

const response = await fetch(API_URL + '/endpoint', {
  method: 'GET',           // ou 'POST', 'PUT', 'DELETE'
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(payload)   // uniquement pour POST et PUT
});

const data = await response.json();

if (data.succes) {
  // traitement du succes
} else {
  // affichage du message d'erreur : data.message
}
```

### Stockage du token cote client

Le token JWT est stocke dans le `localStorage` du navigateur :

```javascript
// Apres verification 2FA reussie
localStorage.setItem('token', data.token);
localStorage.setItem('utilisateur', JSON.stringify(data.utilisateur));

// Lecture lors des requetes
const token = localStorage.getItem('token');

// Suppression a la deconnexion
localStorage.removeItem('token');
localStorage.removeItem('utilisateur');
```

### Gestion des erreurs d'authentification

Lorsqu'une reponse `401` est recue, le frontend redirige vers la page de connexion :

```javascript
if (response.status === 401) {
  localStorage.removeItem('token');
  window.location.href = '/index.html';
}
```

### Pages frontend et leurs routes API associees

| Page HTML                    | Routes API utilisees                                              |
|------------------------------|-------------------------------------------------------------------|
| `inscription.html`           | `POST /api/auth/inscription`                                      |
| `verification-2fa.html`      | `POST /api/auth/verifier-2fa`, `POST /api/auth/renvoyer-code-2fa` |
| `page de connexion`          | `POST /api/auth/mot-de-passe-oublie`, `POST /api/auth/reinitialiser-mot-de-passe` |
| `tableau-bord.html`          | `GET /api/comptes/resume-soldes`, `GET /api/utilisateurs/mon-profil` |
| `mes-cartes.html`            | `GET /api/cartes/mes-cartes`, `POST /api/cartes/:id/bloquer`      |
| `virements.html`             | `POST /api/transactions/virement-interne`                         |
| `virement-interac.html`      | `POST /api/interac/envoyer`, `GET /api/interac/mes-recus`         |
| `paiement-factures.html`     | `GET /api/fournisseurs`, `POST /api/fournisseurs/payer`           |
| `depot-retrait.html`         | `POST /api/transactions/depot`, `POST /api/transactions/retrait`  |
| `mes-demandes.html`          | `POST /api/demandes/nouvelle`, `GET /api/demandes/mes-demandes`   |
| `notifications.html`         | `GET /api/notifications/mes-notifications`                        |
| `dashboard-admin.html`       | `GET /api/admin/statistiques`, `GET /api/admin/inscriptions`      |
| `dashboard-enterprise.html`  | `GET /api/fournisseurs/mes-paiements`                             |

---

## Codes de reponse HTTP

| Code | Signification                                                              |
|------|----------------------------------------------------------------------------|
| 200  | Succes. La requete a ete traitee avec succes.                              |
| 201  | Ressource creee. Retourne apres un POST ayant cree une nouvelle entite.    |
| 400  | Requete invalide. Donnees manquantes ou mal formees.                       |
| 401  | Non authentifie. Token absent, invalide ou expire.                         |
| 403  | Acces refuse. L'utilisateur n'a pas les permissions requises.              |
| 404  | Ressource introuvable.                                                     |
| 409  | Conflit. Par exemple, un courriel deja utilise lors de l'inscription.      |
| 500  | Erreur interne du serveur.                                                 |

---

## Format des reponses

Toutes les reponses sont au format JSON et suivent la structure suivante.

**Reponse de succes :**
```json
{
  "succes": true,
  "message": "Description de l'operation",
  "data": { ... }
}
```

**Reponse d'erreur :**
```json
{
  "succes": false,
  "message": "Description de l'erreur"
}
```

---

## Endpoints - Authentification

Aucun token requis pour les endpoints de cette section.

---

### POST /auth/inscription

Cree un nouveau compte utilisateur. Le compte est place en attente d'approbation par un administrateur.

**Corps de la requete :**
```json
{
  "prenom": "Jean",
  "nom": "Tremblay",
  "courriel": "jean.tremblay@exemple.com",
  "motDePasse": "MotDePasse123!",
  "telephone": "514-555-0100",
  "dateNaissance": "1990-05-15",
  "adresse": "123 Rue Principale, Montreal, QC",
  "genre": "male",
  "statut": "employee",
  "revenuAnnuel": 55000,
  "typeResidence": "tenant",
  "nas": "123 456 789"
}
```

**Reponse (201) :**
```json
{
  "succes": true,
  "message": "Inscription reussie. Votre compte est en attente d'approbation."
}
```

**Erreurs possibles :**
- `409` : L'adresse courriel est deja associee a un compte existant.
- `400` : Un ou plusieurs champs obligatoires sont manquants ou invalides.

---

### POST /auth/connexion

Initie la connexion. Si les informations sont valides, envoie un code 2FA par courriel.

**Corps de la requete :**
```json
{
  "courriel": "jean.tremblay@exemple.com",
  "motDePasse": "MotDePasse123!"
}
```

**Reponse (200) :**
```json
{
  "succes": true,
  "message": "Code de verification envoye par courriel."
}
```

**Erreurs possibles :**
- `401` : Identifiants incorrects.
- `403` : Compte en attente d'approbation, suspendu ou ferme.
- `423` : Compte temporairement verrouille apres plusieurs tentatives echouees.

---

### POST /auth/verifier-2fa

Verifie le code 2FA et delivre le token JWT.

**Corps de la requete :**
```json
{
  "userId": 42,
  "code": "482917"
}
```

**Reponse (200) :**
```json
{
  "succes": true,
  "message": "Connexion reussie.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "utilisateur": {
    "id": 42,
    "prenom": "Jean",
    "nom": "Tremblay",
    "courriel": "jean.tremblay@exemple.com",
    "role": "user"
  }
}
```

**Erreurs possibles :**
- `400` : Code incorrect ou expire.

---

### POST /auth/renvoyer-code-2fa

Renvoie un nouveau code 2FA. L'ancien code est invalide.

**Corps de la requete :**
```json
{
  "userId": 42
}
```

**Reponse (200) :**
```json
{
  "succes": true,
  "message": "Nouveau code envoye"
}
```

---

### POST /auth/mot-de-passe-oublie

Demande l'envoi d'un code de reinitialisation de mot de passe par courriel.

**Corps de la requete :**
```json
{
  "courriel": "jean.tremblay@exemple.com"
}
```

**Reponse (200) :**
```json
{
  "succes": true,
  "message": "Un code de reinitialisation a ete envoye par courriel."
}
```

**Erreurs possibles :**
- `404` : Aucun compte n'est associe a cette adresse courriel.
- `400` : Adresse courriel manquante ou mal formatee.

---

### POST /auth/reinitialiser-mot-de-passe

Valide le code de reinitialisation et met a jour le mot de passe de l'utilisateur.

**Corps de la requete :**
```json
{
  "courriel": "jean.tremblay@exemple.com",
  "code": "482917",
  "nouveauMotDePasse": "NouveauMotDePasse123!",
  "confirmerNouveauMotDePasse": "NouveauMotDePasse123!"
}
```

**Reponse (200) :**
```json
{
  "succes": true,
  "message": "Mot de passe reinitialise avec succes."
}
```

**Erreurs possibles :**
- `400` : Donnees manquantes ou mots de passe non concordants.
- `401` : Code invalide ou expire.
- `404` : Aucun compte n'est associe a cette adresse courriel.

---

## Endpoints - Utilisateurs

Token JWT requis.

---

### GET /utilisateurs/mon-profil

Retourne le profil complet de l'utilisateur connecte.

**Reponse (200) :**
```json
{
  "succes": true,
  "utilisateur": {
    "id": 42,
    "prenom": "Jean",
    "nom": "Tremblay",
    "courriel": "jean.tremblay@exemple.com",
    "telephone": "514-555-0100",
    "adresse": "123 Rue Principale, Montreal, QC",
    "dateNaissance": "1990-05-15",
    "role": "user",
    "statutCompte": "active",
    "creeLe": "2025-01-10T14:30:00.000Z"
  }
}
```

---

### PUT /utilisateurs/changer-mot-de-passe

Change le mot de passe du compte connecte en validant le mot de passe actuel.

**Corps de la requete :**
```json
{
  "actuelMotDePasse": "MotDePasseActuel123!",
  "nouveauMotDePasse": "NouveauMotDePasse123!",
  "confirmerNouveauMotDePasse": "NouveauMotDePasse123!"
}
```

**Reponse (200) :**
```json
{
  "succes": true,
  "message": "Mot de passe mis a jour avec succes."
}
```

**Erreurs possibles :**
- `400` : Donnees manquantes ou nouveau mot de passe non concordant.
- `401` : Mot de passe actuel incorrect.
- `401` : Token JWT manquant ou invalide.

---

## Endpoints - Comptes bancaires

Token JWT requis.

---

### GET /comptes/mes-comptes

Retourne la liste de tous les comptes bancaires de l'utilisateur connecte.

**Reponse (200) :**
```json
{
  "succes": true,
  "comptes": [
    {
      "id": 10,
      "numeroCompte": "1234-5678-9012",
      "typeCompte": "checking",
      "solde": "1250.75",
      "limitCredit": null,
      "statut": "active",
      "creeLe": "2025-01-15T09:00:00.000Z"
    }
  ]
}
```

---

### GET /comptes/resume-soldes

Retourne un resume consolide des soldes de tous les comptes de l'utilisateur.

**Reponse (200) :**
```json
{
  "succes": true,
  "resume": {
    "soldeTotal": "3750.00",
    "nombreComptes": 3,
    "comptes": [
      { "type": "checking", "solde": "1250.75" },
      { "type": "savings", "solde": "2500.25" }
    ]
  }
}
```

---

### GET /comptes/:id/transactions

Retourne les 100 dernieres transactions du compte specifie. L'utilisateur ne peut acceder qu'a ses propres comptes.

**Parametres d'URL :**
- `id` (integer) : Identifiant du compte.

**Reponse (200) :**
```json
{
  "succes": true,
  "transactions": [
    {
      "id": 201,
      "typeTransaction": "transfer",
      "montant": "500.00",
      "soldeApres": "1250.75",
      "description": "Virement vers compte epargne",
      "numeroReference": "TXN-20250415-001",
      "statut": "completed",
      "creeLe": "2025-04-15T11:22:00.000Z"
    }
  ]
}
```

---

## Endpoints - Cartes

Token JWT requis.

---

### GET /cartes/mes-cartes

Retourne la liste de toutes les cartes associees aux comptes de l'utilisateur.

**Reponse (200) :**
```json
{
  "succes": true,
  "cartes": [
    {
      "id": 5,
      "numeroCarteCache": "**** **** **** 4321",
      "typeCarte": "debit",
      "dateExpiration": "2028-12-31",
      "statut": "active",
      "idCompte": 10
    }
  ]
}
```

---

### POST /cartes/:id/bloquer

Bloque la carte specifiee. Utile en cas de perte ou de vol.

**Parametres d'URL :**
- `id` (integer) : Identifiant de la carte.

**Corps de la requete :**
```json
{
  "raison": "Carte perdue"
}
```

**Reponse (200) :**
```json
{
  "succes": true,
  "message": "Carte bloquee avec succes."
}
```

---

### POST /cartes/:id/debloquer

Debloque une carte precedemment bloquee.

**Parametres d'URL :**
- `id` (integer) : Identifiant de la carte.

**Reponse (200) :**
```json
{
  "succes": true,
  "message": "Carte debloquee avec succes."
}
```

---

## Endpoints - Transactions

Token JWT requis.

---

### POST /transactions/virement-interne

Effectue un virement immediat entre deux comptes appartenant au meme utilisateur.

**Corps de la requete :**
```json
{
  "idCompteSource": 10,
  "idCompteDestination": 11,
  "montant": 250.00,
  "description": "Transfert vers epargne"
}
```

**Reponse (200) :**
```json
{
  "succes": true,
  "message": "Virement effectue avec succes.",
  "transaction": {
    "id": 202,
    "numeroReference": "TXN-20260416-002",
    "montant": "250.00",
    "statut": "completed"
  }
}
```

**Erreurs possibles :**
- `400` : Solde insuffisant.
- `400` : Les comptes source et destination sont identiques.
- `404` : Compte source ou destination introuvable.

---

### POST /transactions/depot

Soumet une demande de depot en especes. La transaction est placee en attente d'approbation par un administrateur.

**Corps de la requete :**
```json
{
  "idCompte": 10,
  "montant": 500.00,
  "description": "Depot en caisse"
}
```

**Reponse (201) :**
```json
{
  "succes": true,
  "message": "Demande de depot soumise. En attente d'approbation.",
  "idTransaction": 203
}
```

---

### POST /transactions/retrait

Soumet une demande de retrait en especes. La transaction est placee en attente d'approbation.

**Corps de la requete :**
```json
{
  "idCompte": 10,
  "montant": 200.00,
  "description": "Retrait en caisse"
}
```

**Reponse (201) :**
```json
{
  "succes": true,
  "message": "Demande de retrait soumise. En attente d'approbation.",
  "idTransaction": 204
}
```

---

### GET /transactions/mes-pending

Retourne les transactions en attente d'approbation de l'utilisateur connecte.

**Reponse (200) :**
```json
{
  "succes": true,
  "transactionsPending": [
    {
      "id": 203,
      "typeTransaction": "deposit",
      "montant": "500.00",
      "statut": "pending",
      "creeLe": "2026-04-16T10:00:00.000Z"
    }
  ]
}
```

---

## Endpoints - Virements Interac

Token JWT requis.

---

### POST /interac/envoyer

Envoie un transfert Interac a une adresse courriel. L'expediteur doit definir une question de securite et sa reponse.

**Corps de la requete :**
```json
{
  "idCompteExpediteur": 10,
  "courrielDestinataire": "marie.dupont@exemple.com",
  "montant": 100.00,
  "message": "Remboursement diner",
  "questionSecurite": "Quel est le nom de mon premier animal?",
  "reponseSecurite": "Fido"
}
```

**Reponse (201) :**
```json
{
  "succes": true,
  "message": "Transfert Interac envoye avec succes.",
  "idTransfert": 15,
  "dateExpiration": "2026-05-16T10:00:00.000Z"
}
```

**Erreurs possibles :**
- `400` : Solde insuffisant.
- `400` : Montant invalide (doit etre superieur a zero).

---

### GET /interac/mes-envoyes

Retourne la liste des transferts Interac envoyes par l'utilisateur.

**Reponse (200) :**
```json
{
  "succes": true,
  "transfertsEnvoyes": [
    {
      "id": 15,
      "courrielDestinataire": "marie.dupont@exemple.com",
      "montant": "100.00",
      "message": "Remboursement diner",
      "statut": "pending",
      "dateExpiration": "2026-05-16T10:00:00.000Z",
      "creeLe": "2026-04-16T10:00:00.000Z"
    }
  ]
}
```

---

### GET /interac/mes-recus

Retourne la liste des transferts Interac recus par l'utilisateur.

**Reponse (200) :**
```json
{
  "succes": true,
  "transfertsRecus": [
    {
      "id": 14,
      "courrielExpediteur": "paul.martin@exemple.com",
      "montant": "75.00",
      "message": "Quote-part loyer",
      "statut": "pending",
      "dateExpiration": "2026-05-10T08:00:00.000Z"
    }
  ]
}
```

---

### POST /interac/:id/verifier-reponse

Verifie la reponse a la question de securite avant de deposer un transfert.

**Parametres d'URL :**
- `id` (integer) : Identifiant du transfert.

**Corps de la requete :**
```json
{
  "reponse": "Fido"
}
```

**Reponse (200) :**
```json
{
  "succes": true,
  "message": "Reponse correcte. Vous pouvez maintenant deposer le transfert."
}
```

---

### POST /interac/:id/deposer

Depose un transfert Interac accepte sur un compte de l'utilisateur.

**Parametres d'URL :**
- `id` (integer) : Identifiant du transfert.

**Corps de la requete :**
```json
{
  "idCompteDest": 11
}
```

**Reponse (200) :**
```json
{
  "succes": true,
  "message": "Transfert de 75,00 $ depose sur votre compte avec succes."
}
```

---

### POST /interac/:id/annuler

Annule un transfert Interac envoye et rembourse le montant au compte expediteur.

**Parametres d'URL :**
- `id` (integer) : Identifiant du transfert.

**Reponse (200) :**
```json
{
  "succes": true,
  "message": "Transfert annule. Le montant a ete remboursé sur votre compte."
}
```

---

### GET /interac/beneficiaires/liste

Retourne la liste des beneficiaires sauvegardes par l'utilisateur.

**Reponse (200) :**
```json
{
  "succes": true,
  "beneficiaires": [
    {
      "id": 3,
      "nom": "Marie Dupont",
      "courriel": "marie.dupont@exemple.com",
      "note": "Coloc",
      "creeLe": "2025-09-01T00:00:00.000Z"
    }
  ]
}
```

---

### POST /interac/beneficiaires/ajouter

Ajoute un nouveau beneficiaire a la liste de contacts de l'utilisateur.

**Corps de la requete :**
```json
{
  "nom": "Marie Dupont",
  "courriel": "marie.dupont@exemple.com",
  "note": "Coloc"
}
```

**Reponse (201) :**
```json
{
  "succes": true,
  "message": "Beneficiaire ajoute avec succes.",
  "idBeneficiaire": 3
}
```

---

### DELETE /interac/beneficiaires/:id

Supprime un beneficiaire de la liste de contacts.

**Parametres d'URL :**
- `id` (integer) : Identifiant du beneficiaire.

**Reponse (200) :**
```json
{
  "succes": true,
  "message": "Beneficiaire supprime."
}
```

---

## Endpoints - Paiements de factures

Token JWT requis.

---

### GET /fournisseurs

Retourne la liste de tous les fournisseurs de services disponibles pour le paiement de factures.

**Reponse (200) :**
```json
{
  "succes": true,
  "fournisseurs": [
    {
      "id": 1,
      "nom": "Hydro-Quebec",
      "categorie": "utilities",
      "libelleReference": "Numero de client",
      "exempleReference": "1234567"
    },
    {
      "id": 7,
      "nom": "Videotron",
      "categorie": "telecom",
      "libelleReference": "Numero de compte",
      "exempleReference": "9876543"
    }
  ]
}
```

---

### POST /fournisseurs/payer

Effectue un paiement de facture immediat. Le paiement est soumis a approbation administrative.

**Corps de la requete :**
```json
{
  "idCompte": 10,
  "idFournisseur": 1,
  "numeroReference": "1234567",
  "montant": 85.50,
  "description": "Facture Hydro-Quebec - Avril 2026"
}
```

**Reponse (201) :**
```json
{
  "succes": true,
  "message": "Paiement soumis avec succes. En attente de traitement.",
  "idPaiement": 22
}
```

---

### POST /fournisseurs/planifier

Cree un paiement planifie recurrent.

**Corps de la requete :**
```json
{
  "idCompte": 10,
  "idFournisseur": 1,
  "numeroReference": "1234567",
  "montant": 85.50,
  "frequence": "monthly",
  "jourDuMois": 15,
  "dateFin": "2027-12-31",
  "description": "Paiement mensuel Hydro-Quebec"
}
```

**Valeurs acceptees pour `frequence` :** `once`, `weekly`, `biweekly`, `monthly`

**Reponse (201) :**
```json
{
  "succes": true,
  "message": "Paiement planifie cree avec succes.",
  "idPaiementPlanifie": 8,
  "prochainePaiement": "2026-05-15"
}
```

---

### GET /fournisseurs/planifies

Retourne la liste des paiements planifies actifs de l'utilisateur.

**Reponse (200) :**
```json
{
  "succes": true,
  "paiementsPlanifies": [
    {
      "id": 8,
      "nomFournisseur": "Hydro-Quebec",
      "montant": "85.50",
      "frequence": "monthly",
      "prochaineDateExecution": "2026-05-15",
      "estActif": true
    }
  ]
}
```

---

### PUT /fournisseurs/planifies/:id/annuler

Annule un paiement planifie.

**Parametres d'URL :**
- `id` (integer) : Identifiant du paiement planifie.

**Reponse (200) :**
```json
{
  "succes": true,
  "message": "Paiement planifie annule."
}
```

---

### GET /fournisseurs/mes-paiements

Retourne l'historique de tous les paiements de factures de l'utilisateur.

**Reponse (200) :**
```json
{
  "succes": true,
  "paiements": [
    {
      "id": 22,
      "nomFournisseur": "Hydro-Quebec",
      "montant": "85.50",
      "statut": "approved",
      "creeLe": "2026-04-16T10:00:00.000Z"
    }
  ]
}
```

---

## Endpoints - Demandes

Token JWT requis. Ces endpoints permettent a un utilisateur de soumettre des demandes de services bancaires (ouverture de compte, carte de credit, pret).

---

### POST /demandes/nouvelle

Soumet une nouvelle demande de service.

**Corps de la requete - Demande de compte epargne :**
```json
{
  "typeDemande": "account_opening",
  "typeCompte": "savings"
}
```

**Corps de la requete - Demande de carte de credit :**
```json
{
  "typeDemande": "credit_card",
  "typeCarte": "credit",
  "limiteDemandee": 5000,
  "justification": "Voyage professionnel prevu"
}
```

**Corps de la requete - Demande de pret :**
```json
{
  "typeDemande": "loan",
  "montantDemande": 20000,
  "dureeMois": 48,
  "justification": "Achat vehicule"
}
```

**Reponse (201) :**
```json
{
  "succes": true,
  "message": "Demande soumise avec succes. En attente d'examen.",
  "idDemande": 31
}
```

---

### GET /demandes/mes-demandes

Retourne la liste de toutes les demandes soumises par l'utilisateur.

**Reponse (200) :**
```json
{
  "succes": true,
  "demandes": [
    {
      "id": 31,
      "typeDemande": "credit_card",
      "statut": "pending",
      "commentaireRevision": null,
      "creeLe": "2026-04-16T10:00:00.000Z"
    }
  ]
}
```

---

### GET /demandes/:id

Retourne le detail d'une demande specifique.

**Parametres d'URL :**
- `id` (integer) : Identifiant de la demande.

**Reponse (200) :**
```json
{
  "succes": true,
  "demande": {
    "id": 31,
    "typeDemande": "credit_card",
    "typeCarte": "credit",
    "limiteDemandee": "5000.00",
    "statut": "approved",
    "commentaireRevision": "Demande approuvee. Carte generee.",
    "revueLe": "2026-04-17T09:00:00.000Z"
  }
}
```

---

## Endpoints - Notifications

Token JWT requis.

---

### GET /notifications/mes-notifications

Retourne la liste des notifications de l'utilisateur, de la plus recente a la plus ancienne.

**Reponse (200) :**
```json
{
  "succes": true,
  "notifications": [
    {
      "id": 55,
      "type": "request_approved",
      "titre": "Demande approuvee",
      "message": "Votre demande de carte de credit a ete approuvee.",
      "lue": false,
      "lien": "/mes-cartes.html",
      "creeLe": "2026-04-17T09:00:00.000Z"
    }
  ]
}
```

---

### GET /notifications/non-lues/count

Retourne le nombre de notifications non lues.

**Reponse (200) :**
```json
{
  "succes": true,
  "nonLues": 3
}
```

---

### PUT /notifications/:id/marquer-lue

Marque une notification specifique comme lue.

**Parametres d'URL :**
- `id` (integer) : Identifiant de la notification.

**Reponse (200) :**
```json
{
  "succes": true,
  "message": "Notification marquee comme lue."
}
```

---

### PUT /notifications/marquer-toutes-lues

Marque toutes les notifications de l'utilisateur comme lues.

**Reponse (200) :**
```json
{
  "succes": true,
  "message": "Toutes les notifications ont ete marquees comme lues."
}
```

---

## Endpoints - Administration

Token JWT requis. Role `admin` obligatoire pour tous les endpoints de cette section. Une reponse `403` est retournee si l'utilisateur connecte n'est pas administrateur.

---

### GET /admin/statistiques

Retourne les statistiques globales de la plateforme.

**Reponse (200) :**
```json
{
  "succes": true,
  "statistiques": {
    "totalUtilisateurs": 245,
    "utilisateursActifs": 198,
    "inscriptionsEnAttente": 12,
    "demandesEnAttente": 7,
    "transactionsEnAttente": 4,
    "soldeTotal": "1450320.50"
  }
}
```

---

### GET /admin/inscriptions

Retourne la liste des comptes utilisateurs en attente d'approbation.

**Reponse (200) :**
```json
{
  "succes": true,
  "inscriptions": [
    {
      "id": 300,
      "prenom": "Lucie",
      "nom": "Gagnon",
      "courriel": "lucie.gagnon@exemple.com",
      "creeLe": "2026-04-15T14:00:00.000Z"
    }
  ]
}
```

---

### POST /admin/inscriptions/:id/approuver

Approuve une inscription. Cree un compte bancaire courant pour l'utilisateur et lui envoie une notification.

**Parametres d'URL :**
- `id` (integer) : Identifiant de l'utilisateur.

**Reponse (200) :**
```json
{
  "succes": true,
  "message": "Inscription approuvee. Compte bancaire cree."
}
```

---

### POST /admin/inscriptions/:id/rejeter

Rejette une inscription.

**Parametres d'URL :**
- `id` (integer) : Identifiant de l'utilisateur.

**Corps de la requete :**
```json
{
  "commentaire": "Informations fournies insuffisantes."
}
```

**Reponse (200) :**
```json
{
  "succes": true,
  "message": "Inscription rejetee."
}
```

---

### GET /admin/demandes

Retourne la liste des demandes de service en attente d'examen.

**Reponse (200) :**
```json
{
  "succes": true,
  "demandes": [
    {
      "id": 31,
      "idUtilisateur": 42,
      "nomUtilisateur": "Jean Tremblay",
      "typeDemande": "credit_card",
      "limiteDemandee": "5000.00",
      "statut": "pending",
      "creeLe": "2026-04-16T10:00:00.000Z"
    }
  ]
}
```

---

### POST /admin/demandes/:id/approuver

Approuve une demande de service. Selon le type, cree le compte ou la carte correspondante.

**Parametres d'URL :**
- `id` (integer) : Identifiant de la demande.

**Corps de la requete :**
```json
{
  "commentaire": "Demande approuvee suite a verification."
}
```

**Reponse (200) :**
```json
{
  "succes": true,
  "message": "Demande approuvee."
}
```

---

### POST /admin/demandes/:id/rejeter

Rejette une demande de service.

**Parametres d'URL :**
- `id` (integer) : Identifiant de la demande.

**Corps de la requete :**
```json
{
  "commentaire": "Historique de credit insuffisant."
}
```

**Reponse (200) :**
```json
{
  "succes": true,
  "message": "Demande rejetee."
}
```

---

### GET /admin/utilisateurs

Retourne la liste complete des utilisateurs. Supporte un parametre de recherche et de filtrage.

**Parametres de requete (query string) :**
- `statut` (optionnel) : Filtre par statut (`active`, `pending`, `suspended`).
- `recherche` (optionnel) : Recherche par nom ou courriel.

**Exemple :** `GET /api/admin/utilisateurs?statut=active&recherche=tremblay`

**Reponse (200) :**
```json
{
  "succes": true,
  "utilisateurs": [
    {
      "id": 42,
      "prenom": "Jean",
      "nom": "Tremblay",
      "courriel": "jean.tremblay@exemple.com",
      "role": "user",
      "statutCompte": "active",
      "creeLe": "2025-01-10T14:30:00.000Z"
    }
  ]
}
```

---

### POST /admin/utilisateurs/:id/bloquer

Suspend le compte d'un utilisateur. L'utilisateur ne pourra plus se connecter.

**Parametres d'URL :**
- `id` (integer) : Identifiant de l'utilisateur.

**Reponse (200) :**
```json
{
  "succes": true,
  "message": "Compte utilisateur suspendu."
}
```

---

### POST /admin/utilisateurs/:id/debloquer

Reactive le compte d'un utilisateur suspendu.

**Parametres d'URL :**
- `id` (integer) : Identifiant de l'utilisateur.

**Reponse (200) :**
```json
{
  "succes": true,
  "message": "Compte utilisateur reactive."
}
```

---

### GET /admin/transactions-pending

Retourne la liste des demandes de depots et retraits en attente d'approbation.

**Reponse (200) :**
```json
{
  "succes": true,
  "transactions": [
    {
      "id": 203,
      "nomUtilisateur": "Jean Tremblay",
      "typeTransaction": "deposit",
      "montant": "500.00",
      "creeLe": "2026-04-16T10:00:00.000Z"
    }
  ]
}
```

---

### POST /admin/transactions/:id/approuver-depot

Approuve une demande de depot. Le montant est credite sur le compte de l'utilisateur.

**Parametres d'URL :**
- `id` (integer) : Identifiant de la transaction.

**Reponse (200) :**
```json
{
  "succes": true,
  "message": "Depot approuve et credite sur le compte."
}
```

---

### POST /admin/transactions/:id/approuver-retrait

Approuve une demande de retrait. Le montant est debite du compte de l'utilisateur.

**Parametres d'URL :**
- `id` (integer) : Identifiant de la transaction.

**Reponse (200) :**
```json
{
  "succes": true,
  "message": "Retrait approuve et debite du compte."
}
```

---

### GET /admin/bill-payments-pending

Retourne la liste des paiements de factures en attente de traitement.

**Reponse (200) :**
```json
{
  "succes": true,
  "paiements": [
    {
      "id": 22,
      "nomUtilisateur": "Jean Tremblay",
      "nomFournisseur": "Hydro-Quebec",
      "montant": "85.50",
      "statut": "pending",
      "creeLe": "2026-04-16T10:00:00.000Z"
    }
  ]
}
```

---

## Communication en temps reel (WebSocket)

La plateforme utilise Socket.io pour envoyer des notifications en temps reel sans rechargement de page.

### Etablissement de la connexion

```javascript
const socket = io('http://localhost:3000');

// Authentifier la connexion avec le token JWT
socket.emit('authenticate', localStorage.getItem('token'));
```

### Evenements recus par le client

| Evenement             | Declencheur                                                         |
|-----------------------|---------------------------------------------------------------------|
| `new_notification`    | Toute nouvelle notification generee pour l'utilisateur             |
| `authentication_error`| Token invalide ou expire lors de l'authentification WebSocket      |
| `disconnect`          | Deconnexion du serveur                                              |

### Traitement d'une notification entrante

```javascript
socket.on('new_notification', (notification) => {
  // notification contient : type, titre, message, lien, creeLe
  afficherNotification(notification);
  incrementerCompteurNonLus();
});
```

### Cas d'usage

Les notifications en temps reel sont emises dans les situations suivantes :
- Approbation ou rejet d'une inscription par un administrateur
- Approbation ou rejet d'une demande de service
- Reception d'un transfert Interac
- Confirmation d'un paiement de facture traite
- Confirmation d'un depot ou retrait approuve
- Blocage ou suspension d'un compte ou d'une carte
