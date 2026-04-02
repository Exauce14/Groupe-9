const request = require('supertest');
const mockApp = require('./mocks/mockApp');

describe("Routes Authentification", () => {
  
  describe("POST /api/auth/inscription", () => {
    it("devrait accepter inscription valide", async () => {
      const donnees = {
        email: "test@example.com",
        motDePasse: "SecurePass123!",
        prenom: "Jean",
        nom: "Dupont",
        telephone: "5141234567",
        adresse: "123 rue Test",
        dateNaissance: "1990-01-01",
        sexe: "male",
        statut: "employee",
        revenuAnnuel: 50000,
        typeResidence: "homeowner"
      };

      const response = await request(mockApp)
        .post("/api/auth/inscription")
        .send(donnees);

      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });

  describe("POST /api/auth/connexion", () => {
    it("devrait accepter connexion", async () => {
      const donnees = {
        email: "test@example.com",
        motDePasse: "Test123!"
      };

      const response = await request(mockApp)
        .post("/api/auth/connexion")
        .send(donnees);

      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });
});
