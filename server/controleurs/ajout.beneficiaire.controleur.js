const { ajouterBeneficiaire } = require('../modeles/ajout.beneficiaire');
const { obtenirBeneficiairesParUtilisateur, trouverUsersParEmail, obtenirComptesParUserId, updateParUserId, obtenirAllUsers, updateCompteParUserIdEtIdCompte, trouverUserParUserId, updateUserParUserId, obtenirUserParUserId} = require('../modeles/ajout.beneficiaire');
const bcrypt = require('bcrypt');
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

exports.listerBeneficiairesParId = async (req, res, next) => {
  try {
    const utilisateurId = req.user.id;
    const { beneficiaireId } = req.params;

    const beneficiaires = await obtenirBeneficiairesParUtilisateur(utilisateurId);
    const beneficiaire = beneficiaires.find(b => b.id === parseInt(beneficiaireId));

    if (!beneficiaire) {
      return res.status(404).json({
        succes: false,
        message: 'Bénéficiaire non trouvé'
      });
    }

    res.json({
      succes: true,
      beneficiaire
    });
  } catch (error) {
    console.error('Erreur récupération bénéficiaire par ID:', error);
    next(error);
  }
};

exports.listerUsersParEmail = async (req, res, next) => {
  try {
    const { email } = req.params;
    const user = await trouverUsersParEmail(email);

    if (!user) {
      return res.status(404).json({
        succes: false,
        message: 'Utilisateur non trouvé'
      });
    }

    res.json({
      succes: true,
      user
    });
  } catch (error) {
    console.error('Erreur récupération utilisateur par email:', error);
    next(error);
  }
};

exports.listerUsersParUserId = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = await obtenirUserParUserId(userId);

    if (!user || user.length === 0) {
      return res.status(404).json({
        succes: false,
        message: 'Aucun compte trouvé pour cet utilisateur'
      });
    }

    res.json({
      succes: true,
      user
    });
  } catch (error) {
    console.error('Erreur récupération comptes utilisateur:', error);
    next(error);
  }
};

exports.listerUserParUserId= async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = await trouverUserParUserId(userId);

console.log("USER BACKEND:", user);

    if (!user) {
      return res.status(404).json({
        succes: false,
        message: 'Utilisateur non trouvé'
      });
    }

    res.json({
      succes: true,
      user
    });
  } catch (error) {
    console.error('Erreur récupération utilisateur par userId:', error);
    next(error);
  }
};

exports.updateUserParUserId = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { ancienMotDePasse, nouveauMotDePasse } = req.body;

    if (!ancienMotDePasse || !nouveauMotDePasse) {
      return res.status(400).json({
        succes: false,
        message: 'Ancien et nouveau mot de passe requis'
      });
    }

    const user = await trouverUserParUserId(userId);

    if (!user) {
      return res.status(404).json({
        succes: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // sécurité importante
    if (!user.motdepasse) {
      return res.status(500).json({
        succes: false,
        message: 'Mot de passe introuvable en base'
      });
    }

    const motDePasseValide = await bcrypt.compare(
      ancienMotDePasse,
      user.motdepasse
    );

    if (!motDePasseValide) {
      return res.status(401).json({
        succes: false,
        message: 'Ancien mot de passe incorrect'
      });
    }

    const updatedUser = await updateUserParUserId(userId, nouveauMotDePasse);

    res.json({
      succes: true,
      message: 'Mot de passe modifié avec succès'
    });

  } catch (error) {
    console.error(error);
    next(error);
  }
};

exports.listerAllUsers = async (req, res, next) => {
  try {
    const users = await obtenirAllUsers();

    res.json({
      succes: true,
      users
    });
  } catch (error) {
    console.error('Erreur récupération de tous les utilisateurs:', error);
    next(error);
  }
};

exports.updateParUserId = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { newBalance } = req.body;

    if (newBalance === undefined) {
      return res.status(400).json({
        succes: false,
        message: 'Le nouveau solde est requis pour la mise à jour.'
      });
    }

    const balance = parseFloat(newBalance);

    if (isNaN(balance)) {
      return res.status(400).json({
        succes: false,
        message: "Montant invalide (NaN interdit)"
      });
    }

    const updatedAccount = await updateParUserId(userId, balance); // ✅ utiliser balance

    if (!updatedAccount) {
      return res.status(404).json({
        succes: false,
        message: 'Utilisateur non trouvé pour la mise à jour du solde'
      });
    }

    res.json({
      succes: true,
      account: updatedAccount
    });

  } catch (error) {
    console.error('Erreur mise à jour solde par userId:', error);
    next(error);
  }
};


exports.updateComptesParUserIdEtIdCompte = async (req, res, next) => {
  try {
    const { userId, compteId  } = req.params;
    const { newBalance } = req.body;

    console.log('🔄 Requête mise à jour solde reçue - UserID:', userId, 'CompteID:', compteId, 'Nouveau solde:', newBalance);

    if (newBalance === undefined) {
      return res.status(400).json({
        succes: false,
        message: 'Le nouveau solde est requis pour la mise à jour.'
      });
    }

    const balance = parseFloat(newBalance);

    if (isNaN(balance)) {
      return res.status(400).json({
        succes: false,
        message: "Montant invalide (NaN interdit)"
      });
    }

    console.log('💰 Solde parsé:', balance);

    const updatedAccount = await updateCompteParUserIdEtIdCompte(userId, compteId, balance); // ✅ utiliser balance

    console.log('📝 Résultat mise à jour:', updatedAccount);

    if (!updatedAccount) {
      return res.status(404).json({
        succes: false,
        message: 'Utilisateur non trouvé pour la mise à jour du solde'
      });
    }

    res.json({
      succes: true,
      account: updatedAccount
    });

  } catch (error) {
    console.error('❌ Erreur mise à jour solde par userId:', error);
    next(error);
  }
};
