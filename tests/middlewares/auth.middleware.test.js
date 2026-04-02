const jwt = require("jsonwebtoken");
const authMiddleware = require("../../server/middlewares/auth.middleware");

process.env.JWT_SECRET = "test-secret-key";

describe("Middleware Auth", () => {
  let req, res, next;

  beforeEach(() => {
    req = { headers: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
  });

  describe("verifierToken", () => {
    it("devrait passer avec token valide", () => {
      const token = jwt.sign({ id: 1, email: "test@example.com" }, process.env.JWT_SECRET);
      req.headers.authorization = `Bearer ${token}`;

      authMiddleware.verifierToken(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it("devrait rejeter sans token", () => {
      authMiddleware.verifierToken(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("devrait rejeter token invalide", () => {
      req.headers.authorization = "Bearer invalid_token";
      authMiddleware.verifierToken(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe("verifierUtilisateurActif", () => {
    it("devrait avoir la fonction", () => {
      expect(typeof authMiddleware.verifierUtilisateurActif).toBe("function");
    });
  });
});
