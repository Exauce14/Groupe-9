const validationMiddleware = require("../server/middlewares/validation.middleware");

describe("Middleware Validation", () => {
  let req, res, next;

  beforeEach(() => {
    req = { body: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
  });

  describe("validerInscription", () => {
    it("devrait accepter inscription", () => {
      req.body = {
        email: "test@example.com",
        motDePasse: "SecurePass123!",
        prenom: "Jean",
        nom: "Dupont",
        telephone: "5141234567",
        adresse: "123 rue Test",
        dateNaissance: "1990-01-01",
        sexe: "male",
        statut: "employee"
      };

      validationMiddleware.validerInscription(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it("devrait rejeter sans email", () => {
      req.body = {};
      validationMiddleware.validerInscription(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
