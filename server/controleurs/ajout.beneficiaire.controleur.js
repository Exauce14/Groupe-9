const { ajouterBeneficiaire } = require('../modeles/ajout.beneficiaire');
const { obtenirBeneficiairesParUtilisateur } = require('../modeles/ajout.beneficiaire');

exports.ajouterBeneficiaire = async (req, res, next) => {
  try {
    const utilisateurId = req.user.id;
    const { nom, email, telephone } = req.body;

    if (!nom || !email) {
      return res.status(400).json({
        succes: false,
        message: 'Le nom et l\'email sont requis pour ajouter un bénéficiaire.'
      });
    }

    const nouveauBeneficiaire = await ajouterBeneficiaire(utilisateurId, nom, email, telephone);

    res.status(201).json({
      succes: true,
      message: 'Bénéficiaire ajouté avec succès.',
      beneficiaire: nouveauBeneficiaire
    });
  } catch (error) {
    console.error('Erreur ajout bénéficiaire:', error);
    next(error);
  }
};

exports.listerBeneficiaires = async (req, res, next) => {
  try {
    const utilisateurId = req.user.id;
    const beneficiaires = await obtenirBeneficiairesParUtilisateur(utilisateurId);

    res.json({
      succes: true,
      beneficiaires
    });
  } catch (error) {
    console.error('Erreur récupération bénéficiaires:', error);
    next(error);
  }
};