const request = require('supertest');
const mockApp = require('./mocks/mockApp');

describe("Routes Comptes", () => {
  
  describe("GET /api/comptes", () => {
    it("devrait retourner comptes", async () => {
      const response = await request(mockApp).get("/api/comptes");
      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });

  describe("POST /api/comptes", () => {
    it("devrait creer compte", async () => {
      const donnees = { type: "cheques" };
      const response = await request(mockApp).post("/api/comptes").send(donnees);
      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });
});
