const utilisateurModel = require("../../server/modeles/utilisateur.modele");
const { query } = require("../../server/config/baseDeDonnees");

jest.mock("../../server/config/baseDeDonnees");

describe("Modele Utilisateur", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("trouverParEmail", () => {
    it("devrait retourner utilisateur par email", async () => {
      const user = { id: 1, email: "test@example.com" };
      query.mockResolvedValue({ rows: [user] });

      const resultat = await utilisateurModel.trouverParEmail("test@example.com");
      expect(resultat).toEqual(user);
    });

    it("devrait retourner null", async () => {
      query.mockResolvedValue({ rows: [] });
      const resultat = await utilisateurModel.trouverParEmail("inexistant@example.com");
      expect(resultat).toBeNull();
    });
  });

  describe("creer", () => {
    it("devrait creer utilisateur", async () => {
      const user = { id: 1, email: "nouveau@example.com" };
      query.mockResolvedValue({ rows: [user] });

      const resultat = await utilisateurModel.creer({ email: "nouveau@example.com" });
      expect(resultat.id).toBe(1);
    });
  });

  describe("trouverParId", () => {
    it("devrait retourner utilisateur par ID", async () => {
      const user = { id: 1, email: "test@example.com" };
      query.mockResolvedValue({ rows: [user] });

      const resultat = await utilisateurModel.trouverParId(1);
      expect(resultat).toEqual(user);
    });
  });
});
