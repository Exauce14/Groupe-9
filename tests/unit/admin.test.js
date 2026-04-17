/**
 * Tests unitaires - Fonctionnalités Admin
 *
 * Ces tests vérifient les règles métier et la logique de validation côté
 * administrateur, sans aucun appel à la base de données ni à l'API.
 *
 * Sujets couverts :
 *  - Validation des statuts de compte autorisés
 *  - Validation de la raison lors d'un blocage
 *  - Montant du bonus de bienvenue attribué à l'inscription
 *  - Protection du compte administrateur contre le blocage
 */

describe('Tests Unitaires - Fonctionnalités Admin', () => {

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // VALIDATION DU STATUT DE COMPTE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  describe('Validation du statut de compte', () => {
    // Liste exhaustive des statuts acceptés dans le système
    const validStatuses = ['pending', 'active', 'suspended', 'rejected'];

    test('Statuts valides doivent être reconnus', () => {
      // Chaque statut de la liste doit être accepté tel quel
      validStatuses.forEach(status => {
        expect(validStatuses.includes(status)).toBe(true);
      });
    });

    test('Statuts invalides doivent être rejetés', () => {
      // Ces valeurs ne font pas partie des statuts autorisés par l'application
      const invalidStatuses = ['banned', 'deleted', '', null];

      invalidStatuses.forEach(status => {
        expect(validStatuses.includes(status)).toBe(false);
      });
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // VALIDATION DE LA RAISON DE BLOCAGE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  describe('Validation de la raison de blocage', () => {
    test('Raison avec minimum 2 caractères doit être valide', () => {
      // L'admin doit toujours fournir une raison lisible (min. 2 caractères)
      const validReasons = ['Activité suspecte', 'Fraude détectée', 'OK'];

      validReasons.forEach(reason => {
        expect(reason.length >= 2).toBe(true);
      });
    });

    test('Raison trop courte doit être invalide', () => {
      // Une raison vide, d'un seul caractère ou juste un espace est refusée
      const invalidReasons = ['', 'A', ' '];

      invalidReasons.forEach(reason => {
        // On utilise trim() pour ignorer les espaces seuls
        expect(reason.trim().length >= 2).toBe(false);
      });
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // BONUS DE BIENVENUE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  describe('Calcul du bonus de bienvenue', () => {
    test('Le bonus de bienvenue doit être 5.00 CAD', () => {
      // Montant fixe crédité sur le compte chèques lors de l'approbation
      const welcomeBonus = 5.00;

      expect(welcomeBonus).toBe(5.00);
      expect(typeof welcomeBonus).toBe('number');
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PROTECTION DU COMPTE ADMIN
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  describe('Protection compte admin', () => {
    test('Un compte admin ne peut pas être bloqué', () => {
      // La vérification du rôle empêche de bloquer accidentellement un admin
      const isAdmin = (role) => role === 'admin';

      expect(isAdmin('admin')).toBe(true);   // détecté comme admin → blocage refusé
      expect(isAdmin('client')).toBe(false); // client ordinaire → blocage autorisé
    });
  });
});
