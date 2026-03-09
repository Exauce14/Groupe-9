// Validation de l'inscription (wizard complet)
exports.validerInscription = (req, res, next) => {
  const { 
    email, motDePasse, prenom, nom, telephone, adresse,
    dateNaissance, sexe, statut, revenuAnnuel, typeResidence 
  } = req.body;

  // Validation email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return res.status(400).json({ 
      succes: false, 
      message: 'Email invalide' 
    });
  }

  // Validation mot de passe
  if (!motDePasse || motDePasse.length < 8) {
    return res.status(400).json({ 
      succes: false, 
      message: 'Le mot de passe doit contenir au moins 8 caractères' 
    });
  }

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
  if (!passwordRegex.test(motDePasse)) {
    return res.status(400).json({ 
      succes: false, 
      message: 'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre' 
    });
  }

  // Validation nom et prénom (minimum 2 caractères)
  if (!prenom || prenom.trim().length < 2) {
    return res.status(400).json({ 
      succes: false, 
      message: 'Prénom invalide (minimum 2 caractères)' 
    });
  }

  if (!nom || nom.trim().length < 2) {
    return res.status(400).json({ 
      succes: false, 
      message: 'Nom invalide (minimum 2 caractères)' 
    });
  }

  // Validation téléphone
  const phoneRegex = /^[0-9]{10}$/;
  if (!telephone || !phoneRegex.test(telephone.replace(/\D/g, ''))) {
    return res.status(400).json({ 
      succes: false, 
      message: 'Numéro de téléphone invalide (10 chiffres requis)' 
    });
  }

  // Validation date de naissance (minimum 16 ans)
  if (!dateNaissance) {
    return res.status(400).json({ 
      succes: false, 
      message: 'Date de naissance requise' 
    });
  }

  const birthDate = new Date(dateNaissance);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  if (age < 16) {
    return res.status(400).json({ 
      succes: false, 
      message: 'Vous devez avoir au moins 16 ans pour créer un compte' 
    });
  }

  // Validation sexe
  const sexesValides = ['male', 'female', 'other'];
  if (!sexe || !sexesValides.includes(sexe)) {
    return res.status(400).json({ 
      succes: false, 
      message: 'Sexe invalide' 
    });
  }

  // Validation statut
  const statutsValides = ['student', 'employee', 'professional', 'retired'];
  if (!statut || !statutsValides.includes(statut)) {
    return res.status(400).json({ 
      succes: false, 
      message: 'Statut invalide' 
    });
  }

  // Validation adresse (minimum 2 caractères)
  if (!adresse || adresse.trim().length < 2) {
    return res.status(400).json({ 
      succes: false, 
      message: 'Adresse invalide (minimum 2 caractères)' 
    });
  }

  next();
};

// Validation de la demande (minimum 2 caractères pour justification)
exports.validerDemande = (req, res, next) => {
  const { justification } = req.body;

  if (!justification || justification.trim().length < 2) {
    return res.status(400).json({ 
      succes: false, 
      message: 'Justification requise (minimum 2 caractères)' 
    });
  }

  next();
};

// Validation email simple
exports.validerEmail = (req, res, next) => {
  const { email } = req.body;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!email || !emailRegex.test(email)) {
    return res.status(400).json({ 
      succes: false, 
      message: 'Email invalide' 
    });
  }

  next();
};