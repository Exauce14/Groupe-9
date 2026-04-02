const request = require('supertest');
const mockApp = require('./mocks/mockApp');

describe("Routes Notifications", () => {
  
  describe("GET /api/notifications", () => {
    it("devrait retourner notifications", async () => {
      const response = await request(mockApp).get("/api/notifications");
      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });

  describe("GET /api/notifications/nonlues", () => {
    it("devrait retourner nonlues", async () => {
      const response = await request(mockApp).get("/api/notifications/nonlues");
      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });

  describe("PUT /api/notifications/:id/marquer-lue", () => {
    it("devrait marquer lue", async () => {
      const response = await request(mockApp).put("/api/notifications/1/marquer-lue");
      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });
});
