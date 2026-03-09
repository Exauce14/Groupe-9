const bcrypt = require('bcrypt');

async function testerMotDePasse() {
  // Remplace ce hash par celui qui est dans ta base de données
  const hashDansLaBD = '$2b$10$YwN5T3EqXJ5qZ9Y.5XH3/.K5pXJ6vX9F5pJ6J5J5J5J5J5J5J5J5O';
  
  const motDePasseEssaye = 'Admin123';
  
  const resultat = await bcrypt.compare(motDePasseEssaye, hashDansLaBD);
  
  console.log('Mot de passe testé:', motDePasseEssaye);
  console.log('Hash dans la BD:', hashDansLaBD);
  console.log('Résultat:', resultat ? '✅ BON' : '❌ MAUVAIS');
}

testerMotDePasse();