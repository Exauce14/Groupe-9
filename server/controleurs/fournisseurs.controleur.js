const { query } = require('../config/baseDeDonnees');
const notificationModel = require('../modeles/notification.modele');

// ─── Lister les fournisseurs (avec icône et groupe) 
exports.listesFournisseurs = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, name AS nom, category AS categorie,
              reference_label AS libelle_reference,
              reference_example AS exemple_reference,
              is_default AS est_defaut,
              icon, group_name, enterprise_account_id AS compte_entreprise_id
       FROM providers WHERE is_active = true ORDER BY is_default DESC, group_name ASC, name ASC`
    );
    res.json({ succes: true, fournisseurs: result.rows });
  } catch (error) { next(error); }
};

//  Payer une facture 
// Si le fournisseur a un compte entreprise → pending (approbation requise)
// Sinon → immédiat (paiement externe)
exports.payerFacture = async (req, res, next) => {
  try {
    const utilisateurId = req.user.id;
    const { compteSourceId, carteId, fournisseurId, numeroReference, montant, description } = req.body;

    if (!fournisseurId || !montant || montant < 0.01) {
      return res.status(400).json({ succes: false, message: 'Paramètres invalides.' });
    }
    if (!compteSourceId && !carteId) {
      return res.status(400).json({ succes: false, message: 'Compte source ou carte requis.' });
    }

    // Vérifier le fournisseur
    const fournisseurRes = await query(
      `SELECT id, name AS nom, enterprise_account_id AS compte_entreprise_id
       FROM providers WHERE id = $1 AND is_active = true`,
      [fournisseurId]
    );
    if (!fournisseurRes.rows[0]) return res.status(404).json({ succes: false, message: 'Fournisseur introuvable.' });
    const fournisseur = fournisseurRes.rows[0];

    let soldeSource, typeSource, sourceId;

    if (carteId) {
      // Paiement par carte de crédit
      const carteRes = await query(
        `SELECT c.id, a.id AS account_id, a.balance AS solde,
                c.credit_limit, c.available_credit, a.status AS statut
         FROM cards c
         JOIN accounts a ON c.account_id = a.id
         WHERE c.id = $1 AND a.user_id = $2 AND c.card_type = 'credit'`,
        [carteId, utilisateurId]
      );
      if (!carteRes.rows[0]) return res.status(404).json({ succes: false, message: 'Carte introuvable.' });
      const carte = carteRes.rows[0];
      if (carte.statut !== 'active') return res.status(400).json({ succes: false, message: 'Compte carte inactif.' });
      const creditDispo = parseFloat(carte.available_credit ?? (parseFloat(carte.credit_limit || 0) + parseFloat(carte.solde)));
      if (creditDispo < montant) return res.status(400).json({ succes: false, message: 'Crédit disponible insuffisant.' });
      soldeSource = parseFloat(carte.solde);
      typeSource = 'credit';
      sourceId = carte.account_id;
    } else {
      // Paiement par compte
      const compteRes = await query(
        `SELECT id, balance AS solde, account_type AS type, status AS statut
         FROM accounts WHERE id = $1 AND user_id = $2`,
        [compteSourceId, utilisateurId]
      );
      if (!compteRes.rows[0]) return res.status(404).json({ succes: false, message: 'Compte source introuvable.' });
      const compte = compteRes.rows[0];
      if (compte.statut !== 'active') return res.status(400).json({ succes: false, message: 'Compte inactif.' });
      if (!['checking', 'savings', 'credit'].includes(compte.type)) {
        return res.status(400).json({ succes: false, message: 'Type de compte non accepté.' });
      }
      if (parseFloat(compte.solde) < montant) return res.status(400).json({ succes: false, message: 'Solde insuffisant.' });
      soldeSource = parseFloat(compte.solde);
      typeSource = compte.type;
      sourceId = compte.id;
    }

    // Débiter le client (toujours — l'argent est "retenu")
    const newSoldeClient = soldeSource - montant;
    await query('UPDATE accounts SET balance = $1, updated_at = NOW() WHERE id = $2', [newSoldeClient, sourceId]);
    const desc = description || `Paiement ${fournisseur.nom}${numeroReference ? ' - Réf: ' + numeroReference : ''}`;

    // Si fournisseur sans compte entreprise → paiement immédiat (externe)
    const pendingStatus = fournisseur.compte_entreprise_id ? 'pending' : 'completed';

    const txnClientRes = await query(
      `INSERT INTO transactions (account_id, transaction_type, amount, balance_after, description, status)
       VALUES ($1, 'payment', $2, $3, $4, $5) RETURNING id`,
      [sourceId, montant, newSoldeClient, desc, pendingStatus]
    );

    // Si fournisseur sans compte entreprise → créditer immédiatement (logique externe)
    if (!fournisseur.compte_entreprise_id) {
      await query(
        `INSERT INTO bill_payments (user_id, from_account_id, provider_id, reference_number, amount, description, transaction_id, status, processed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'approved', NOW())`,
        [utilisateurId, sourceId, fournisseurId, numeroReference || null, montant, description || null, txnClientRes.rows[0].id]
      );
      await notificationModel.creer({
        utilisateurId,
        type: 'payment_completed',
        titre: 'Paiement effectué',
        message: `Votre paiement de ${parseFloat(montant).toFixed(2)} $ à ${fournisseur.nom} a été effectué.`,
        lien: '/paiement-factures.html'
      });
      return res.json({ succes: true, message: 'Paiement effectué avec succès.' });
    }

    // Fournisseur avec compte entreprise → pending
    await query(
      `INSERT INTO bill_payments (user_id, from_account_id, provider_id, reference_number, amount, description, transaction_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')`,
      [utilisateurId, sourceId, fournisseurId, numeroReference || null, montant, description || null, txnClientRes.rows[0].id]
    );

    // Notifier l'entreprise
    const entrepriseUserRes = await query(
      'SELECT u.id FROM users u JOIN accounts a ON a.user_id = u.id WHERE a.id = $1',
      [fournisseur.compte_entreprise_id]
    );
    if (entrepriseUserRes.rows[0]) {
      await notificationModel.creer({
        utilisateurId: entrepriseUserRes.rows[0].id,
        type: 'payment_completed',
        titre: 'Nouveau paiement à approuver',
        message: `Paiement de ${parseFloat(montant).toFixed(2)} $ en attente d'approbation${numeroReference ? ' — Réf: ' + numeroReference : ''}.`,
        lien: '/dashboard-enterprise.html'
      });
    }

    await notificationModel.creer({
      utilisateurId,
      type: 'payment_completed',
      titre: 'Paiement soumis',
      message: `Votre paiement de ${parseFloat(montant).toFixed(2)} $ à ${fournisseur.nom} est en attente d'approbation.`,
      lien: '/paiement-factures.html'
    });

    res.json({ succes: true, message: 'Paiement soumis. En attente d\'approbation.', pending: true });
  } catch (error) {
    console.error('Erreur paiement facture:', error);
    next(error);
  }
};

//  Annuler un paiement de facture (client, si pending)
exports.annulerPaiementFacture = async (req, res, next) => {
  try {
    const { paiementId } = req.params;
    const utilisateurId = req.user.id;

    const res2 = await query(
      `SELECT bp.id, bp.amount, bp.from_account_id, bp.transaction_id, bp.status,
              p.name AS fournisseur
       FROM bill_payments bp
       JOIN providers p ON bp.provider_id = p.id
       WHERE bp.id = $1 AND bp.user_id = $2`,
      [paiementId, utilisateurId]
    );
    if (!res2.rows[0]) return res.status(404).json({ succes: false, message: 'Paiement introuvable.' });
    const paiement = res2.rows[0];
    if (paiement.status !== 'pending') {
      return res.status(400).json({ succes: false, message: 'Ce paiement ne peut plus être annulé.' });
    }

    // Rembourser
    const compteRes = await query('SELECT balance FROM accounts WHERE id = $1', [paiement.from_account_id]);
    const newSolde = parseFloat(compteRes.rows[0].balance) + parseFloat(paiement.amount);
    await query('UPDATE accounts SET balance = $1, updated_at = NOW() WHERE id = $2', [newSolde, paiement.from_account_id]);
    await query(
      `INSERT INTO transactions (account_id, transaction_type, amount, balance_after, description, status)
       VALUES ($1, 'payment', $2, $3, $4, 'completed')`,
      [paiement.from_account_id, paiement.amount, newSolde, `Remboursement annulation paiement ${paiement.fournisseur}`]
    );
    // Marquer l'ancienne transaction comme annulée
    await query('UPDATE transactions SET status = \'cancelled\' WHERE id = $1', [paiement.transaction_id]);
    await query('UPDATE bill_payments SET status = \'cancelled\', processed_at = NOW() WHERE id = $1', [paiementId]);

    await notificationModel.creer({
      utilisateurId,
      type: 'payment_completed',
      titre: 'Paiement annulé',
      message: `Votre paiement de ${parseFloat(paiement.amount).toFixed(2)} $ a été annulé et remboursé.`,
      lien: '/paiement-factures.html'
    });

    res.json({ succes: true, message: 'Paiement annulé et remboursé.' });
  } catch (error) {
    console.error('Erreur annulation paiement:', error);
    next(error);
  }
};

//  [ENTERPRISE] Instances (providers) liées à ce compte 
exports.mesInstancesEntreprise = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await query(
      `SELECT p.id, p.name AS nom, p.icon, p.category AS categorie,
              p.reference_label AS libelle_reference,
              COUNT(bp.id) FILTER (WHERE bp.status = 'approved') AS nb_approuves,
              COALESCE(SUM(bp.amount) FILTER (WHERE bp.status = 'approved'), 0) AS total_recu
       FROM providers p
       LEFT JOIN bill_payments bp ON bp.provider_id = p.id
       WHERE p.enterprise_account_id IN (SELECT id FROM accounts WHERE user_id = $1)
         AND p.is_active = true
       GROUP BY p.id
       ORDER BY p.name ASC`,
      [userId]
    );
    res.json({ succes: true, instances: result.rows });
  } catch (error) { next(error); }
};

// [ENTERPRISE] Historique complet (approuvés + rejetés) 
exports.historiquePaiementsEntreprise = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { instanceId } = req.query; // filtre optionnel par instance

    let whereExtra = '';
    const params = [userId];
    if (instanceId) {
      params.push(instanceId);
      whereExtra = `AND bp.provider_id = $${params.length}`;
    }

    const result = await query(
      `SELECT bp.id, bp.amount AS montant, bp.reference_number AS reference,
              bp.description, bp.created_at AS date_soumis, bp.processed_at AS date_traite,
              bp.status,
              p.name AS fournisseur, p.icon, p.id AS provider_id,
              a.account_number AS compte_source,
              u.first_name AS prenom_client, u.last_name AS nom_client,
              u.email AS email_client
       FROM bill_payments bp
       JOIN providers p ON bp.provider_id = p.id
       JOIN accounts a ON bp.from_account_id = a.id
       JOIN users u ON bp.user_id = u.id
       WHERE p.enterprise_account_id IN (SELECT id FROM accounts WHERE user_id = $1)
         ${whereExtra}
       ORDER BY COALESCE(bp.processed_at, bp.created_at) DESC
       LIMIT 100`,
      params
    );
    res.json({ succes: true, paiements: result.rows });
  } catch (error) { next(error); }
};

// [ENTERPRISE] Paiements en attente pour ce compte entreprise 
exports.paiementsEnAttenteEntreprise = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await query(
      `SELECT bp.id, bp.amount AS montant, bp.reference_number AS reference,
              bp.description, bp.created_at AS date, bp.status,
              p.name AS fournisseur, p.icon,
              a.account_number AS compte_source,
              u.first_name AS prenom_client, u.last_name AS nom_client
       FROM bill_payments bp
       JOIN providers p ON bp.provider_id = p.id
       JOIN accounts a ON bp.from_account_id = a.id
       JOIN users u ON bp.user_id = u.id
       WHERE bp.status = 'pending'
         AND p.enterprise_account_id IN (
           SELECT id FROM accounts WHERE user_id = $1
         )
       ORDER BY bp.created_at DESC`,
      [userId]
    );
    res.json({ succes: true, paiements: result.rows });
  } catch (error) { next(error); }
};

//  [ENTERPRISE] Approuver un paiement 
exports.approuverPaiementFacture = async (req, res, next) => {
  try {
    const { paiementId } = req.params;
    const userId = req.user.id;

    const res2 = await query(
      `SELECT bp.*, p.enterprise_account_id AS compte_entreprise_id,
              p.name AS fournisseur, u.id AS client_id
       FROM bill_payments bp
       JOIN providers p ON bp.provider_id = p.id
       JOIN users u ON bp.user_id = u.id
       WHERE bp.id = $1 AND bp.status = 'pending'
         AND p.enterprise_account_id IN (SELECT id FROM accounts WHERE user_id = $2)`,
      [paiementId, userId]
    );
    if (!res2.rows[0]) return res.status(404).json({ succes: false, message: 'Paiement introuvable ou non autorisé.' });
    const p = res2.rows[0];

    // Créditer le compte entreprise
    const compteEntRes = await query('SELECT balance FROM accounts WHERE id = $1', [p.compte_entreprise_id]);
    const newSoldeEnt = parseFloat(compteEntRes.rows[0].balance) + parseFloat(p.amount);
    await query('UPDATE accounts SET balance = $1, updated_at = NOW() WHERE id = $2', [newSoldeEnt, p.compte_entreprise_id]);
    const entTxn = await query(
      `INSERT INTO transactions (account_id, transaction_type, amount, balance_after, description, status)
       VALUES ($1, 'payment', $2, $3, $4, 'completed') RETURNING id`,
      [p.compte_entreprise_id, p.amount, newSoldeEnt,
       `Paiement approuvé${p.reference_number ? ' - Réf: ' + p.reference_number : ''}`]
    );

    // Mettre à jour le bill_payment et la transaction client
    await query(
      `UPDATE bill_payments SET status = 'approved', enterprise_transaction_id = $1, processed_at = NOW() WHERE id = $2`,
      [entTxn.rows[0].id, paiementId]
    );
    await query('UPDATE transactions SET status = \'completed\' WHERE id = $1', [p.transaction_id]);

    // Notifier le client
    await notificationModel.creer({
      utilisateurId: p.client_id,
      type: 'payment_completed',
      titre: 'Paiement approuvé',
      message: `Votre paiement de ${parseFloat(p.amount).toFixed(2)} $ à ${p.fournisseur} a été approuvé.`,
      lien: '/paiement-factures.html'
    });

    res.json({ succes: true, message: 'Paiement approuvé.' });
  } catch (error) {
    console.error('Erreur approbation paiement:', error);
    next(error);
  }
};

//  [ENTERPRISE] Rejeter un paiement (rembourse le client) 
exports.rejeterPaiementFacture = async (req, res, next) => {
  try {
    const { paiementId } = req.params;
    const userId = req.user.id;

    const res2 = await query(
      `SELECT bp.*, p.enterprise_account_id AS compte_entreprise_id,
              p.name AS fournisseur, u.id AS client_id
       FROM bill_payments bp
       JOIN providers p ON bp.provider_id = p.id
       JOIN users u ON bp.user_id = u.id
       WHERE bp.id = $1 AND bp.status = 'pending'
         AND p.enterprise_account_id IN (SELECT id FROM accounts WHERE user_id = $2)`,
      [paiementId, userId]
    );
    if (!res2.rows[0]) return res.status(404).json({ succes: false, message: 'Paiement introuvable.' });
    const p = res2.rows[0];

    // Rembourser le client
    const compteClientRes = await query('SELECT balance FROM accounts WHERE id = $1', [p.from_account_id]);
    const newSolde = parseFloat(compteClientRes.rows[0].balance) + parseFloat(p.amount);
    await query('UPDATE accounts SET balance = $1, updated_at = NOW() WHERE id = $2', [newSolde, p.from_account_id]);
    await query(
      `INSERT INTO transactions (account_id, transaction_type, amount, balance_after, description, status)
       VALUES ($1, 'payment', $2, $3, $4, 'completed')`,
      [p.from_account_id, p.amount, newSolde, `Remboursement paiement rejeté — ${p.fournisseur}`]
    );
    await query('UPDATE transactions SET status = \'cancelled\' WHERE id = $1', [p.transaction_id]);
    await query('UPDATE bill_payments SET status = \'rejected\', processed_at = NOW() WHERE id = $1', [paiementId]);

    await notificationModel.creer({
      utilisateurId: p.client_id,
      type: 'payment_completed',
      titre: 'Paiement rejeté',
      message: `Votre paiement de ${parseFloat(p.amount).toFixed(2)} $ à ${p.fournisseur} a été rejeté. Montant remboursé.`,
      lien: '/paiement-factures.html'
    });

    res.json({ succes: true, message: 'Paiement rejeté et client remboursé.' });
  } catch (error) {
    console.error('Erreur rejet paiement:', error);
    next(error);
  }
};

//  Historique des paiements (avec statut) 
exports.historiquePaiements = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT bp.id, bp.amount AS montant, bp.reference_number AS reference,
              bp.description, bp.created_at AS date, bp.status,
              p.name AS fournisseur, p.icon,
              a.account_number AS compte_source
       FROM bill_payments bp
       JOIN providers p ON bp.provider_id = p.id
       JOIN accounts a ON bp.from_account_id = a.id
       WHERE bp.user_id = $1
       ORDER BY bp.created_at DESC`,
      [req.user.id]
    );
    res.json({ succes: true, paiements: result.rows });
  } catch (error) { next(error); }
};

//  Planifier un paiement 
exports.planifierPaiement = async (req, res, next) => {
  try {
    const utilisateurId = req.user.id;
    const { compteSourceId, fournisseurId, destinataireNumeroCompte, montant, frequence, jourDuMois, dateFin, description } = req.body;

    if (!compteSourceId || !montant || !frequence) {
      return res.status(400).json({ succes: false, message: 'Paramètres requis : compte, montant, fréquence.' });
    }
    if (!fournisseurId && !destinataireNumeroCompte) {
      return res.status(400).json({ succes: false, message: 'Fournisseur ou numéro de compte destinataire requis.' });
    }

    // Vérifier le compte source appartient à l'utilisateur
    const compteRes = await query(
      'SELECT id FROM accounts WHERE id = $1 AND user_id = $2 AND status = \'active\'',
      [compteSourceId, utilisateurId]
    );
    if (!compteRes.rows[0]) return res.status(404).json({ succes: false, message: 'Compte source introuvable.' });

    // Calculer la prochaine date d'exécution
    let nextDate = new Date();
    if (frequence === 'monthly' && jourDuMois) {
      nextDate.setDate(jourDuMois);
      if (nextDate <= new Date()) nextDate.setMonth(nextDate.getMonth() + 1);
    } else {
      nextDate.setDate(nextDate.getDate() + 1);
    }

    // Si destinataire est un compte membre, trouver son user_id
    let toUserId = null;
    if (destinataireNumeroCompte) {
      const destRes = await query(
        'SELECT user_id FROM accounts WHERE account_number = $1 AND status = \'active\'',
        [destinataireNumeroCompte]
      );
      if (!destRes.rows[0]) return res.status(404).json({ succes: false, message: 'Numéro de compte destinataire introuvable.' });
      toUserId = destRes.rows[0].user_id;
    }

    await query(
      `INSERT INTO scheduled_payments
         (user_id, from_account_id, provider_id, to_account_number, to_user_id, amount, frequency, day_of_month, next_execution_date, end_date, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [utilisateurId, compteSourceId, fournisseurId || null, destinataireNumeroCompte || null,
       toUserId, montant, frequence, jourDuMois || null, nextDate.toISOString().split('T')[0],
       dateFin || null, description || null]
    );

    await notificationModel.creer({
      utilisateurId,
      type: 'payment_scheduled',
      titre: 'Paiement planifié',
      message: `Un paiement de ${parseFloat(montant).toFixed(2)} $ a été planifié (${frequence}).`,
      lien: '/paiement-factures.html'
    });

    res.status(201).json({ succes: true, message: 'Paiement planifié avec succès.' });
  } catch (error) {
    console.error('Erreur planification:', error);
    next(error);
  }
};

// Mes paiements planifiés 
exports.mesPaiementsPlanifies = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT sp.id, sp.amount AS montant, sp.frequency AS frequence, sp.day_of_month AS jour_du_mois,
              sp.next_execution_date AS prochaine_execution, sp.end_date AS date_fin,
              sp.description, sp.is_active AS actif,
              p.name AS fournisseur, a.account_number AS compte_source,
              sp.to_account_number AS compte_destinataire
       FROM scheduled_payments sp
       JOIN accounts a ON sp.from_account_id = a.id
       LEFT JOIN providers p ON sp.provider_id = p.id
       WHERE sp.user_id = $1
       ORDER BY sp.created_at DESC`,
      [req.user.id]
    );
    res.json({ succes: true, paiements: result.rows });
  } catch (error) { next(error); }
};

//  Annuler un paiement planifié 
exports.annulerPaiementPlanifie = async (req, res, next) => {
  try {
    const { planifieId } = req.params;
    await query(
      'UPDATE scheduled_payments SET is_active = false WHERE id = $1 AND user_id = $2',
      [planifieId, req.user.id]
    );
    res.json({ succes: true, message: 'Paiement planifié annulé.' });
  } catch (error) { next(error); }
};

//  [ADMIN] Créer un compte entreprise avec ses instances (fournisseurs) 
// Body: { nomEntreprise, email, categorie, icon, instances: [{nom, libelleRef, exempleRef}] }
exports.creerFournisseurAdmin = async (req, res, next) => {
  try {
    const { nomEntreprise, email, categorie, icon, instances } = req.body;
    if (!nomEntreprise) return res.status(400).json({ succes: false, message: 'Nom entreprise requis.' });
    if (!instances || instances.length === 0) return res.status(400).json({ succes: false, message: 'Au moins une instance requise.' });

    const bcrypt = require('bcrypt');
    const slug = nomEntreprise.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const emailEntreprise = email || `${slug}@fortivia.com`;
    const passwordHash = await bcrypt.hash('12345', 10);

    // Créer ou récupérer l'utilisateur entreprise
    let entrepriseUserId;
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [emailEntreprise]);
    if (existingUser.rows[0]) {
      entrepriseUserId = existingUser.rows[0].id;
    } else {
      const userRes = await query(
        `INSERT INTO users (email, password, first_name, last_name, date_of_birth, role, account_status, is_active, email_verified)
         VALUES ($1, $2, $3, '', '2000-01-01', 'enterprise', 'active', true, true) RETURNING id`,
        [emailEntreprise, passwordHash, nomEntreprise]
      );
      entrepriseUserId = userRes.rows[0].id;
    }

    // Créer le compte entreprise
    const compteRes = await query(
      `INSERT INTO accounts (user_id, account_type, balance) VALUES ($1, 'enterprise', 0.00) RETURNING id`,
      [entrepriseUserId]
    );
    const compteId = compteRes.rows[0].id;

    // Créer toutes les instances comme fournisseurs distincts
    const fournisseurs = [];
    for (const inst of instances) {
      const f = await query(
        `INSERT INTO providers (name, category, enterprise_account_id, reference_label, reference_example, icon, group_name, is_default)
         VALUES ($1, $2, $3, $4, $5, $6, $7, false) RETURNING id, name AS nom`,
        [
          inst.nom,
          categorie || null,
          compteId,
          inst.libelleRef || 'Numéro de référence',
          inst.exempleRef || null,
          icon || '🏢',
          nomEntreprise
        ]
      );
      fournisseurs.push(f.rows[0]);
    }

    res.status(201).json({
      succes: true,
      entreprise: { userId: entrepriseUserId, compteId, email: emailEntreprise },
      fournisseurs
    });
  } catch (error) {
    console.error('Erreur création entreprise:', error);
    next(error);
  }
};

// [ADMIN] Modifier un fournisseur
exports.modifierFournisseurAdmin = async (req, res, next) => {
  try {
    const { fournisseurId } = req.params;
    const { nom, categorie, libelleRef, exempleRef, icon, groupName } = req.body;
    await query(
      `UPDATE providers SET name = COALESCE($1, name), category = COALESCE($2, category),
              reference_label = COALESCE($3, reference_label), reference_example = COALESCE($4, reference_example),
              icon = COALESCE($5, icon), group_name = COALESCE($6, group_name)
       WHERE id = $7`,
      [nom, categorie, libelleRef, exempleRef, icon, groupName, fournisseurId]
    );
    res.json({ succes: true });
  } catch (error) { next(error); }
};

//  [ADMIN] Supprimer (désactiver) un fournisseur 
exports.supprimerFournisseurAdmin = async (req, res, next) => {
  try {
    const { fournisseurId } = req.params;
    await query('UPDATE providers SET is_active = false WHERE id = $1', [fournisseurId]);
    res.json({ succes: true });
  } catch (error) { next(error); }
};

// Exécuter les paiements planifiés dus (appelé par le scheduler) 
exports.executerPaiementsPlanifies = async () => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const planifies = await query(
      `SELECT sp.*, a.balance AS solde_source, p.enterprise_account_id AS compte_entreprise_id
       FROM scheduled_payments sp
       JOIN accounts a ON sp.from_account_id = a.id
       LEFT JOIN providers p ON sp.provider_id = p.id
       WHERE sp.is_active = true AND sp.next_execution_date <= $1
         AND (sp.end_date IS NULL OR sp.end_date >= $1)`,
      [today]
    );

    for (const paiement of planifies.rows) {
      try {
        if (parseFloat(paiement.solde_source) < paiement.amount) continue;

        // Débiter source
        const newSolde = parseFloat(paiement.solde_source) - paiement.amount;
        await query('UPDATE accounts SET balance = $1, updated_at = NOW() WHERE id = $2', [newSolde, paiement.from_account_id]);
        const txnRes = await query(
          `INSERT INTO transactions (account_id, transaction_type, amount, balance_after, description, status)
           VALUES ($1, 'payment', $2, $3, $4, 'completed') RETURNING id`,
          [paiement.from_account_id, paiement.amount, newSolde, paiement.description || 'Paiement planifié automatique']
        );

        // Créditer fournisseur ou membre
        if (paiement.compte_entreprise_id) {
          const entRes = await query('SELECT balance FROM accounts WHERE id = $1', [paiement.compte_entreprise_id]);
          const newEnt = parseFloat(entRes.rows[0].balance) + paiement.amount;
          await query('UPDATE accounts SET balance = $1, updated_at = NOW() WHERE id = $2', [newEnt, paiement.compte_entreprise_id]);
          await query(
            `INSERT INTO transactions (account_id, transaction_type, amount, balance_after, description, status)
             VALUES ($1, 'payment', $2, $3, $4, 'completed')`,
            [paiement.compte_entreprise_id, paiement.amount, newEnt, `Paiement planifié reçu`]
          );
        } else if (paiement.to_account_number) {
          const destRes = await query(
            'SELECT id, balance FROM accounts WHERE account_number = $1 AND status = \'active\'',
            [paiement.to_account_number]
          );
          if (destRes.rows[0]) {
            const newDest = parseFloat(destRes.rows[0].balance) + paiement.amount;
            await query('UPDATE accounts SET balance = $1, updated_at = NOW() WHERE id = $2', [newDest, destRes.rows[0].id]);
            await query(
              `INSERT INTO transactions (account_id, transaction_type, amount, balance_after, description, status)
               VALUES ($1, 'transfer', $2, $3, $4, 'completed')`,
              [destRes.rows[0].id, paiement.amount, newDest, paiement.description || 'Virement planifié reçu']
            );
            if (paiement.to_user_id) {
              await query(
                `INSERT INTO notifications (user_id, type, title, message, link)
                 VALUES ($1, 'payment_completed', 'Virement reçu', $2, '/tableau-bord.html')`,
                [paiement.to_user_id, `Vous avez reçu un virement planifié de ${parseFloat(paiement.amount).toFixed(2)} $.`]
              );
            }
          }
        }

        // Notification client
        await query(
          `INSERT INTO notifications (user_id, type, title, message, link)
           VALUES ($1, 'payment_completed', 'Paiement planifié effectué', $2, '/paiement-factures.html')`,
          [paiement.user_id, `Paiement planifié de ${parseFloat(paiement.amount).toFixed(2)} $ effectué.`]
        );

        // Calculer prochaine date d'exécution
        let nextDate = new Date(paiement.next_execution_date);
        switch (paiement.frequency) {
          case 'once': await query('UPDATE scheduled_payments SET is_active = false WHERE id = $1', [paiement.id]); continue;
          case 'weekly': nextDate.setDate(nextDate.getDate() + 7); break;
          case 'biweekly': nextDate.setDate(nextDate.getDate() + 14); break;
          case 'monthly': nextDate.setMonth(nextDate.getMonth() + 1); break;
        }

        await query(
          'UPDATE scheduled_payments SET next_execution_date = $1, last_executed_at = NOW() WHERE id = $2',
          [nextDate.toISOString().split('T')[0], paiement.id]
        );
      } catch (errPaiement) {
        console.error(`Erreur exécution paiement planifié #${paiement.id}:`, errPaiement);
      }
    }
  } catch (error) {
    console.error('Erreur scheduler paiements:', error);
  }
};
