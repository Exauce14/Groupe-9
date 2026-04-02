const compteModel = require("../../server/modeles/compte.modele");
const { query } = require("../../server/config/baseDeDonnees");

jest.mock("../../server/config/baseDeDonnees");

describe("Modele Compte", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("creer", () => {
    it("devrait creer compte", async () => {
      const compte = { id: 1, utilisateur_id: 1, type_compte: "cheques", solde: 0 };
      query.mockResolvedValue({ rows: [compte] });

      const resultat = await compteModel.creer({ utilisateurId: 1, typeCompte: "cheques" });
      expect(resultat.id).toBe(1);
    });
  });

  describe("trouverParUtilisateur", () => {
    it("devrait retourner comptes utilisateur", async () => {
      const comptes = [
        { id: 1, utilisateur_id: 1, type_compte: "cheques", solde: 1000 },
        { id: 2, utilisateur_id: 1, type_compte: "epargne", solde: 5000 }
      ];
      query.mockResolvedValue({ rows: comptes });

      const resultat = await compteModel.trouverParUtilisateur(1);
      expect(resultat).toHaveLength(2);
    });
  });

  describe("trouverParId", () => {
    it("devrait retourner compte par ID", async () => {
      const compte = { id: 1, utilisateur_id: 1, type_compte: "cheques", solde: 1000 };
      query.mockResolvedValue({ rows: [compte] });

      const resultat = await compteModel.trouverParId(1);
      expect(resultat).toEqual(compte);
    });
  });

  describe("Autres fonctions", () => {
    it("devrait avoir fonction creer", () => {
      expect(typeof compteModel.creer).toBe("function");
    });
  });
});
