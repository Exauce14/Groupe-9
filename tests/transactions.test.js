const request = require('supertest');
const mockApp = require('./mocks/mockApp');

describe("Routes Transactions", () => {
  
  describe("GET /api/transactions", () => {
    it("devrait retourner historique", async () => {
      const response = await request(mockApp).get("/api/transactions");
      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });

  describe("POST /api/transactions/transfert", () => {
    it("devrait effectuer transfert", async () => {
      const donnees = { 
        compte_source_id: 1, 
        compte_destination_id: 2, 
        montant: 250 
      };
      const response = await request(mockApp).post("/api/transactions/transfert").send(donnees);
      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });
});
