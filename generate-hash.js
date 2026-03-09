const bcrypt = require('bcrypt');

async function genererHash() {
  const password = 'Admin123';
  const hash = await bcrypt.hash(password, 10);
  console.log('Mot de passe:', password);
  console.log('Hash:', hash);
}

genererHash();