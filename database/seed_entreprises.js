/**
 * Seed des comptes entreprise (fournisseurs)
 * Met à jour les emails et mots de passe des comptes entreprise existants.
 * Mot de passe : 12345
 *
 * Exécuter : node database/seed_entreprises.js
 * (depuis le dossier Groupe-9/server ou Groupe-9)
 */

require('dotenv').config({ path: __dirname + '/../server/.env' });
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const pool = new Pool({
  user:     process.env.DB_USER     || 'postgres',
  host:     process.env.DB_HOST     || 'localhost',
  database: process.env.DB_NAME     || 'base_de_donne_projet_integrateur',
  password: process.env.DB_PASSWORD || 'exauce2005',
  port:     parseInt(process.env.DB_PORT || '5432'),
});

// Correspondance : email interne → email professionnel
const ENTREPRISES = [
  { emailInterne: 'hydroquebec@systeme.fortivia',  emailPro: 'hydroquebec@fortivia.local',      nom: 'Hydro-Québec'         },
  { emailInterne: 'intact@systeme.fortivia',        emailPro: 'intact@fortivia.local',           nom: 'Intact Assurances'    },
  { emailInterne: 'tdassu@systeme.fortivia',        emailPro: 'td-assurances@fortivia.local',    nom: 'TD Assurances'        },
  { emailInterne: 'fortivia-ass@systeme.fortivia',  emailPro: 'fortivia-ass@fortivia.local',     nom: 'Fortivia Assurances'  },
  { emailInterne: 'saaq@systeme.fortivia',          emailPro: 'saaq@fortivia.local',             nom: 'SAAQ'                 },
  { emailInterne: 'videotron@systeme.fortivia',     emailPro: 'videotron@fortivia.local',        nom: 'Vidéotron'            },
  { emailInterne: 'bell@systeme.fortivia',          emailPro: 'bell@fortivia.local',             nom: 'Bell Canada'          },
  { emailInterne: 'virgin@systeme.fortivia',        emailPro: 'virgin@fortivia.local',           nom: 'Virgin Plus'          },
];

async function seed() {
  const hash = await bcrypt.hash('12345', 10);
  console.log(`Hash généré pour '12345': ${hash}`);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const e of ENTREPRISES) {
      // Vérifier si l'utilisateur avec l'email interne existe
      const existing = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [e.emailInterne]
      );

      if (existing.rows.length === 0) {
        // Vérifier si le profil existe déjà avec l'email pro
        const existingPro = await client.query(
          'SELECT id FROM users WHERE email = $1',
          [e.emailPro]
        );
        if (existingPro.rows.length > 0) {
          // Mettre à jour le mot de passe seulement
          await client.query(
            'UPDATE users SET password = $1 WHERE email = $2',
            [hash, e.emailPro]
          );
          console.log(`✅ MDP mis à jour pour ${e.emailPro}`);
        } else {
          console.log(`⚠️  Aucun compte trouvé pour ${e.emailInterne} ni ${e.emailPro}`);
        }
        continue;
      }

      const userId = existing.rows[0].id;

      // Mettre à jour : email pro + nouveau mot de passe
      await client.query(
        'UPDATE users SET email = $1, password = $2 WHERE id = $3',
        [e.emailPro, hash, userId]
      );

      console.log(`✅ ${e.nom} → ${e.emailPro} (id: ${userId})`);
    }

    await client.query('COMMIT');
    console.log('\n✅ Seed terminé ! Tous les comptes entreprise ont le mot de passe : 12345');
    console.log('Emails mis à jour :');
    ENTREPRISES.forEach(e => console.log(`  ${e.emailPro}`));
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Erreur lors du seed :', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
