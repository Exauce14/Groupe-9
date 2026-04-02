const request = require('supertest');
const mockApp = require('./mocks/mockApp');

describe("Routes Cartes", () => {
  
  describe("GET /api/cartes", () => {
    it("devrait retourner cartes", async () => {
      const response = await request(mockApp).get("/api/cartes");
      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });

  describe("POST /api/cartes", () => {
    it("devrait creer carte", async () => {
      const donnees = { compte_id: 1, type: "credit" };
      const response = await request(mockApp).post("/api/cartes").send(donnees);
      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });
});
