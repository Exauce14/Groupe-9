const bcrypt = require('bcrypt');

async function fixAdmin() {
  const password = 'Admin123';
  const hash = await bcrypt.hash(password, 10);
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔐 NOUVEAU HASH GÉNÉRÉ POUR Admin123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Hash:', hash);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('📋 COPIE ET EXÉCUTE CE SCRIPT SQL DANS PGADMIN:\n');
  console.log(`UPDATE users 
SET password = '${hash}', role='admin'
WHERE email = 'exaucengolo519@gmail.com';`);
  console.log('\n✅ Après avoir exécuté ce script, essaie de te reconnecter avec:');
  console.log('   Email: exaucengolo519@gmail.com');
  console.log('   Mot de passe: Admin123\n');
}

fixAdmin();