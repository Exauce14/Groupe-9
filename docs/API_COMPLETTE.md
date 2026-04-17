# Documentation API complète

## 1. Présentation générale

Cette documentation couvre l'ensemble des endpoints de l'application bancaire. Le backend expose une API REST sécurisée, et le frontend communique avec le backend uniquement par des requêtes HTTP/HTTPS en JSON.

### Architecture

- Backend : Node.js avec Express
- Authentification : JWT Bearer token
- Communication : JSON request/response
- Sécurité : validation des données, vérification de rôle, gestion des erreurs

### Format général des requêtes

Headers communs :
- `Content-Type: application/json`
- `Authorization: Bearer <token>` (pour les routes protégées)

Les réponses renvoient toujours un objet JSON avec au minimum :
- `succes` : boolean
- `message` : string
- `data` ou payload selon le contexte

## 2. Connexion frontend-backend

### Étapes principales

1. Le frontend envoie les informations de connexion au backend.
2. Le backend vérifie l'identifiant et le mot de passe.
3. Si les informations sont correctes, le backend envoie un code 2FA par email.
4. Le frontend envoie ensuite le code 2FA au backend.
5. Le backend valide le code et retourne un token JWT.
6. Le frontend stocke le token JWT côté client et l'utilise pour toutes les requêtes suivantes.

### Exemple de flux

#### Frontend
```javascript
const response = await fetch('http://localhost:3000/api/auth/connexion', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});
const data = await response.json();

if (data.succes) {
  // envoyer le code 2FA
}
```

#### Backend

- Route : `POST /api/auth/connexion`
- Validation des identifiants
- Envoi du code 2FA
- Retourne un message de succès ou une erreur

#### Frontend après 2FA
```javascript
const response = await fetch('http://localhost:3000/api/auth/verifier-2fa', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, code })
});
const data = await response.json();
if (data.succes) {
  localStorage.setItem('token', data.token);
}
```

#### Backend après 2FA

- Route : `POST /api/auth/verifier-2fa`
- Vérifie le code
- Génère un token JWT
- Retourne : `token`, `utilisateur`

## 3. Endpoints principaux

### 3.1 Authentification

#### `POST /api/auth/inscription`
Créer un compte utilisateur.

Request body :
```json
{
  "email": "user@example.com",
  "password": "Password123!",
  "first_name": "Jean",
  "last_name": "Dupont",
  "phone": "4185551234",
  "address": "123 rue Principale",
  "date_of_birth": "1995-01-15",
  "gender": "male",
  "status": "employee",
  "annual_income": 45000,
  "residence_type": "owner",
  "sin": "123456789"
}
```

Réponse 201 :
```json
{
  "succes": true,
  "message": "Inscription réussie. Code 2FA envoyé par email.",
  "utilisateur": {
    "id": 101,
    "email": "user@example.com",
    "first_name": "Jean",
    "last_name": "Dupont",
    "role": "user"
  }
}
```

Erreurs possibles :
- 400 : donnée manquante ou invalide
- 409 : email déjà utilisé
- 500 : erreur serveur

#### `POST /api/auth/connexion`
Début du login, envoi du code 2FA si identifiants valides.

Request body :
```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```

Réponse 200 :
```json
{
  "succes": true,
  "message": "Code 2FA envoyé par email.",
  "utilisateur": {
    "id": 101,
    "email": "user@example.com"
  }
}
```

#### `POST /api/auth/verifier-2fa`
Vérifie le code 2FA et retourne le token JWT.

Request body :
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

Réponse 200 :
```json
{
  "succes": true,
  "token": "eyJhbGci...",
  "utilisateur": {
    "id": 101,
    "email": "user@example.com",
    "role": "user"
  }
}
```

#### `POST /api/auth/reset-password`
Demande de réinitialisation du mot de passe.

Request body :
```json
{
  "email": "user@example.com"
}
```

Réponse 200 :
```json
{
  "succes": true,
  "message": "Instructions envoyées par email."
}
```

### 3.2 Utilisateur

#### `GET /api/utilisateurs/mon-profil`
Retourne le profil connecté.

Headers :
- `Authorization: Bearer <token>`

Réponse 200 :
```json
{
  "succes": true,
  "utilisateur": {
    "id": 101,
    "email": "user@example.com",
    "first_name": "Jean",
    "last_name": "Dupont",
    "role": "user",
    "account_status": "active"
  }
}
```

### 3.3 Comptes

#### `GET /api/comptes/mes-comptes`
Liste des comptes du client connecté.

Réponse 200 :
```json
{
  "succes": true,
  "comptes": [
    {
      "id": 1,
      "account_number": "1234-5678-9012",
      "account_type": "checking",
      "balance": 5200.75
    },
    {
      "id": 2,
      "account_number": "2345-6789-0123",
      "account_type": "savings",
      "balance": 15200.00
    }
  ]
}
```

#### `POST /api/comptes/creer`
Créer un nouveau compte pour l'utilisateur.

Request body :
```json
{
  "account_type": "savings"
}
```

Réponse 201 :
```json
{
  "succes": true,
  "message": "Compte créé avec succès.",
  "compte": {
    "id": 3,
    "account_number": "3456-7890-1234",
    "account_type": "savings",
    "balance": 0
  }
}
```

#### `GET /api/comptes/{id}/details`
Détails d'un compte spécifique.

Réponse 200 :
```json
{
  "succes": true,
  "compte": {
    "id": 1,
    "account_number": "1234-5678-9012",
    "account_type": "checking",
    "balance": 5200.75,
    "created_at": "2026-04-16T10:00:00Z"
  }
}
```

### 3.4 Cartes

#### `GET /api/cartes/mes-cartes`
Liste des cartes associées aux comptes du client.

#### `POST /api/cartes/creer`
Créer une nouvelle carte liée à un compte.

#### `PUT /api/cartes/{id}/bloquer`
Bloquer une carte existante.

### 3.5 Demandes

#### `POST /api/demandes/nouvelle`
Soumettre une demande de service (carte, prêt, ouverture de compte).

#### `GET /api/demandes/mes-demandes`
Lister les demandes de l'utilisateur connecté.

#### `PUT /api/demandes/{id}/annuler`
Annuler une demande en attente.

### 3.6 Transactions

#### `GET /api/transactions/historique`
Retourne l'historique des transactions du compte.

#### `POST /api/transactions/virement-interne`
Effectuer un virement entre comptes du même utilisateur.

#### `GET /api/transactions/{id}/details`
Récupérer les détails d'une transaction.

### 3.7 Interac

#### `GET /api/interac/transferts-envoyes`
Lister les transferts Interac envoyés.

#### `GET /api/interac/transferts-recus`
Lister les transferts Interac reçus.

#### `POST /api/interac/envoyer`
Envoyer un transfert Interac.

#### `POST /api/interac/recevoir`
Accepter un transfert Interac.

### 3.8 Notifications

#### `GET /api/notifications/liste`
Lister toutes les notifications pour l'utilisateur.

#### `PUT /api/notifications/{id}/lire`
Marquer une notification comme lue.

### 3.9 Fournisseurs et factures

#### `GET /api/fournisseurs/liste`
Lister les fournisseurs de factures disponibles.

#### `POST /api/paiements/payer-facture`
Payer une facture via l'un des fournisseurs.

#### `GET /api/paiements/mes-factures`
Lister les paiements de factures de l'utilisateur.

### 3.10 Administration

#### `GET /api/admin/utilisateurs`
Lister tous les utilisateurs (admin seulement).

#### `PUT /api/admin/utilisateurs/{id}/suspendre`
Suspendre un compte utilisateur.

#### `GET /api/admin/demandes`
Lister toutes les demandes en attente.

#### `PUT /api/admin/demandes/{id}/approuver`
Approuver une demande.

#### `GET /api/admin/statistiques`
Retourne des statistiques générales du système.

## 4. Gestion des erreurs

Les erreurs utilisent des codes HTTP standard et un message clair.

### Erreurs fréquentes

- `400 Bad Request` : données manquantes ou invalides
- `401 Unauthorized` : token manquant ou invalide
- `403 Forbidden` : accès refusé pour le rôle
- `404 Not Found` : ressource non trouvée
- `409 Conflict` : conflit de données (email déjà utilisé)
- `500 Internal Server Error` : erreur serveur inattendue

### Exemple d'erreur

```json
{
  "succes": false,
  "message": "Token invalide ou expiré",
  "erreurs": [
    { "champ": "authorization", "message": "Bearer token manquant ou invalide" }
  ]
}
```

## 5. Notes de connexion frontend-backend

- Le frontend stocke le token JWT côté client (localStorage ou sessionStorage).
- Chaque requête protégée doit inclure le header `Authorization: Bearer <token>`.
- Le backend vérifie le token avant de laisser passer la requête.
- Si le token expire, le backend répond `401 Unauthorized` et le frontend doit rediriger l'utilisateur vers la page de connexion.

## 6. Bonnes pratiques

- Toujours vérifier la présence du token avant d'envoyer une requête protégée.
- Valider les champs côté frontend avant envoi : email, mot de passe, montant, date.
- Afficher les erreurs claires récupérées du backend.
- Ne jamais stocker le mot de passe en clair.
- Ne jamais exposer les informations sensibles dans les réponses.
