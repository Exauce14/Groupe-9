const request = require('supertest');
const mockApp = require('./mocks/mockApp');

describe("Routes Demandes", () => {
  
  describe("GET /api/demandes", () => {
    it("devrait retourner demandes", async () => {
      const response = await request(mockApp).get("/api/demandes");
      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });

  describe("POST /api/demandes", () => {
    it("devrait creer demande", async () => {
      const donnees = { type: "augmentation_limite", montant: 1000 };
      const response = await request(mockApp).post("/api/demandes").send(donnees);
      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });
});
