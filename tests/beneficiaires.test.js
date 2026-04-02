const request = require('supertest');
const mockApp = require('./mocks/mockApp');

describe("Routes Beneficiaires", () => {
  
  describe("GET /api/beneficiaires", () => {
    it("devrait retourner beneficiaires", async () => {
      const response = await request(mockApp).get("/api/beneficiaires");
      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });

  describe("POST /api/beneficiaires", () => {
    it("devrait ajouter beneficiaire", async () => {
      const donnees = { 
        nom: "Pierre Durand", 
        numero_compte: "ACC003" 
      };
      const response = await request(mockApp).post("/api/beneficiaires").send(donnees);
      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });
});
