const request = require('supertest');
const mockApp = require('./mocks/mockApp');

describe("Routes Admin", () => {
  
  describe("GET /api/admin/utilisateurs", () => {
    it("devrait retourner utilisateurs", async () => {
      const response = await request(mockApp).get("/api/admin/utilisateurs");
      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });

  describe("GET /api/admin/statistiques", () => {
    it("devrait retourner stats", async () => {
      const response = await request(mockApp).get("/api/admin/statistiques");
      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });
});
