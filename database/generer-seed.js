/**
 * Script pour générer des données de test aléatoires
 * Usage: node database/generer-seed.js
 */

const bcrypt = require('bcrypt');

// Générer un mot de passe haché
async function genererMotDePasseHache(motDePasse) {
  return await bcrypt.hash(motDePasse, 10);
}

// Générer des utilisateurs aléatoires
async function genererUtilisateurs(nombre) {
  const prenoms = ['Jean', 'Marie', 'Pierre', 'Sophie', 'Luc', 'Emma', 'Thomas', 'Julie'];
  const noms = ['Dupont', 'Martin', 'Bernard', 'Dubois', 'Laurent', 'Simon', 'Michel', 'Lefebvre'];
  const statuts = ['student', 'employee', 'professional', 'retired'];
  
  const utilisateurs = [];
  const motDePasseHache = await genererMotDePasseHache('Password123');

  for (let i = 0; i < nombre; i++) {
    const prenom = prenoms[Math.floor(Math.random() * prenoms.length)];
    const nom = noms[Math.floor(Math.random() * noms.length)];
    const email = `${prenom.toLowerCase()}.${nom.toLowerCase()}${i}@email.com`;
    
    utilisateurs.push({
      email,
      password: motDePasseHache,
      first_name: prenom,
      last_name: nom,
      phone: `514${Math.floor(1000000 + Math.random() * 9000000)}`,
      address: `${Math.floor(100 + Math.random() * 900)} Rue ${nom}, Montréal, QC`,
      date_of_birth: new Date(1970 + Math.floor(Math.random() * 30), Math.floor(Math.random() * 12), Math.floor(1 + Math.random() * 28)),
      gender: Math.random() > 0.5 ? 'male' : 'female',
      status: statuts[Math.floor(Math.random() * statuts.length)],
      annual_income: Math.floor(20000 + Math.random() * 80000),
      residence_type: Math.random() > 0.5 ? 'owner' : 'tenant'
    });
  }

  return utilisateurs;
}

// Exécuter
(async () => {
  console.log('Génération de données de test...');
  const users = await genererUtilisateurs(5);
  console.log(JSON.stringify(users, null, 2));
})();