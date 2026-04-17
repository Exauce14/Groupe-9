const { query } = require('../config/baseDeDonnees');
const notificationModel = require('../modeles/notification.modele');
const bcrypt = require('bcrypt');

// Envoie un virement Interac à un destinataire par email.
// Débite immédiatement le compte source, stocke le virement avec une question de sécurité,
// et notifie le destinataire s'il est client de la banque.
exports.envoyerInterac = async (req, res, next) => {
  try {
    const senderId = req.user.id;
    const { compteSourceId, destinataireEmail, montant, message, questionSecurite, reponseSecurite } = req.body;

    if (!compteSourceId || !destinataireEmail || !montant || !questionSecurite || !reponseSecurite) {
      return res.status(400).json({ succes: false, message: 'Tous les champs sont requis.' });
    }
    if (montant < 0.01) {
      return res.status(400).json({ succes: false, message: 'Montant minimum : 0.01$.' });
    }
    if (reponseSecurite.trim().length < 2) {
      return res.status(400).json({ succes: false, message: 'La réponse de sécurité doit contenir au moins 2 caractères.' });
    }

    // Vérifier le compte source
    const compteRes = await query(
      `SELECT id, balance AS solde, account_type AS type, status AS statut
       FROM accounts WHERE id = $1 AND user_id = $2`,
      [compteSourceId, senderId]
    );
    if (!compteRes.rows[0]) return res.status(404).json({ succes: false, message: 'Compte source introuvable.' });

    const compte = compteRes.rows[0];
    if (compte.statut !== 'active') return res.status(400).json({ succes: false, message: 'Compte inactif.' });
    if (['credit', 'investment', 'enterprise'].includes(compte.type)) {
      return res.status(400).json({ succes: false, message: 'Interac uniquement depuis un compte chèques ou épargne.' });
    }
    if (parseFloat(compte.solde) < montant) {
      return res.status(400).json({ succes: false, message: 'Solde insuffisant.' });
    }

    // Vérifier que l'expéditeur n'envoie pas à lui-même
    const senderRes = await query('SELECT email FROM users WHERE id = $1', [senderId]);
    if (senderRes.rows[0].email === destinataireEmail) {
      return res.status(400).json({ succes: false, message: 'Vous ne pouvez pas vous envoyer un virement Interac à vous-même.' });
    }

    // Trouver le destinataire (s'il est dans notre banque)
    const recipientRes = await query(
      'SELECT id, first_name AS prenom, last_name AS nom FROM users WHERE email = $1 AND account_status = \'active\'',
      [destinataireEmail]
    );
    const recipientId = recipientRes.rows[0]?.id || null;

    // Débiter immédiatement le compte source
    const newSolde = parseFloat(compte.solde) - montant;
    await query('UPDATE accounts SET balance = $1, updated_at = NOW() WHERE id = $2', [newSolde, compteSourceId]);
    await query(
      `INSERT INTO transactions (account_id, transaction_type, amount, balance_after, description, status)
       VALUES ($1, 'transfer', $2, $3, $4, 'completed')`,
      [compteSourceId, montant, newSolde, `Virement Interac envoyé à ${destinataireEmail}`]
    );

    // Créer le virement Interac (réponse stockée en clair, en minuscules pour comparaison)
    const interacRes = await query(
      `INSERT INTO interac_transfers
         (sender_id, recipient_email, recipient_id, sender_account_id, amount, message, security_question, security_answer)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [senderId, destinataireEmail, recipientId, compteSourceId, montant, message || null, questionSecurite, reponseSecurite.toLowerCase().trim()]
    );
    const interacId = interacRes.rows[0].id;

    // Info expéditeur pour la notification
    const senderInfo = await query('SELECT first_name AS prenom, last_name AS nom FROM users WHERE id = $1', [senderId]);
    const expediteur = senderInfo.rows[0];

    // Notifier le destinataire s'il est dans notre banque
    if (recipientId) {
      await notificationModel.creer({
        utilisateurId: recipientId,
        type: 'interac_received',
        titre: 'Virement Interac reçu',
        message: `${expediteur.prenom} ${expediteur.nom} vous a envoyé ${parseFloat(montant).toFixed(2)} $. Cliquez pour déposer.`,
        lien: `/virement-interac.html?id=${interacId}`
      });
    }

    // Notifier l'expéditeur
    await notificationModel.creer({
      utilisateurId: senderId,
      type: 'transfer_completed',
      titre: 'Virement Interac envoyé',
      message: `Votre virement Interac de ${parseFloat(montant).toFixed(2)} $ a été envoyé à ${destinataireEmail}.`,
      lien: '/tableau-bord.html'
    });

    res.status(201).json({ succes: true, message: 'Virement Interac envoyé avec succès.', interacId });
  } catch (error) {
    console.error('Erreur envoi Interac:', error);
    next(error);
  }
};

// Retourne les détails d'un virement Interac destiné à l'utilisateur connecté.
// Vérifie que le virement est en attente et non expiré avant de retourner les données.
exports.obtenirInterac = async (req, res, next) => {
  try {
    const { interacId } = req.params;
    const utilisateurId = req.user.id;

    const result = await query(
      `SELECT it.id, it.amount AS montant, it.message, it.security_question AS question_securite,
              it.status AS statut, it.expires_at AS expire_le, it.created_at AS cree_le,
              u.first_name AS prenom_expediteur, u.last_name AS nom_expediteur
       FROM interac_transfers it
       JOIN users u ON it.sender_id = u.id
       WHERE it.id = $1 AND it.recipient_email = (SELECT email FROM users WHERE id = $2)`,
      [interacId, utilisateurId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ succes: false, message: 'Virement introuvable ou non autorisé.' });
    }

    const interac = result.rows[0];
    if (interac.statut !== 'pending') {
      return res.status(400).json({ succes: false, message: 'Ce virement a déjà été traité ou est expiré.' });
    }
    if (new Date(interac.expire_le) < new Date()) {
      await query('UPDATE interac_transfers SET status = \'expired\' WHERE id = $1', [interacId]);
      return res.status(400).json({ succes: false, message: 'Ce virement Interac a expiré.' });
    }

    res.json({ succes: true, interac });
  } catch (error) {
    next(error);
  }
};

// Vérifie que la réponse à la question de sécurité fournie par le destinataire est correcte.
// La comparaison est insensible à la casse. Retourne une erreur si le virement est expiré ou déjà traité.
exports.verifierReponse = async (req, res, next) => {
  try {
    const { interacId } = req.params;
    const { reponse } = req.body;
    const utilisateurId = req.user.id;

    const result = await query(
      `SELECT it.security_answer AS reponse_correcte, it.status AS statut, it.expires_at AS expire_le
       FROM interac_transfers it
       WHERE it.id = $1 AND it.recipient_email = (SELECT email FROM users WHERE id = $2)`,
      [interacId, utilisateurId]
    );

    if (!result.rows[0]) return res.status(404).json({ succes: false, message: 'Virement introuvable.' });

    const { reponse_correcte, statut, expire_le } = result.rows[0];
    if (statut !== 'pending') return res.status(400).json({ succes: false, message: 'Virement déjà traité.' });
    if (new Date(expire_le) < new Date()) return res.status(400).json({ succes: false, message: 'Virement expiré.' });

    const correct = reponse.toLowerCase().trim() === reponse_correcte;
    if (!correct) {
      return res.status(400).json({ succes: false, message: 'Réponse de sécurité incorrecte. Dépôt impossible.' });
    }

    res.json({ succes: true, message: 'Réponse correcte. Vous pouvez déposer le virement.' });
  } catch (error) {
    next(error);
  }
};

// Re-authentifie l'utilisateur avec son mot de passe avant de lui permettre de déposer un virement.
// Sert de confirmation d'identité supplémentaire avant une opération financière.
exports.verifierMotDePasse = async (req, res, next) => {
  try {
    const utilisateurId = req.user.id;
    const { motDePasse } = req.body;

    const userRes = await query('SELECT password FROM users WHERE id = $1', [utilisateurId]);
    if (!userRes.rows[0]) return res.status(404).json({ succes: false, message: 'Utilisateur introuvable.' });

    const valide = await bcrypt.compare(motDePasse, userRes.rows[0].password);
    if (!valide) return res.status(401).json({ succes: false, message: 'Mot de passe incorrect.' });

    res.json({ succes: true, message: 'Identité vérifiée.' });
  } catch (error) {
    next(error);
  }
};

// Dépose un virement Interac reçu dans le compte choisi par le destinataire.
// Crédite le compte, marque le virement comme "deposited" et notifie les deux parties.
exports.deposerInterac = async (req, res, next) => {
  try {
    const { interacId } = req.params;
    const { compteDestinationId } = req.body;
    const utilisateurId = req.user.id;

    if (!compteDestinationId) return res.status(400).json({ succes: false, message: 'Compte destination requis.' });

    // Vérifier le virement
    const interacRes = await query(
      `SELECT it.*, u.first_name AS prenom_expediteur, u.last_name AS nom_expediteur
       FROM interac_transfers it
       JOIN users u ON it.sender_id = u.id
       WHERE it.id = $1 AND it.recipient_email = (SELECT email FROM users WHERE id = $2) AND it.status = 'pending'`,
      [interacId, utilisateurId]
    );
    if (!interacRes.rows[0]) return res.status(404).json({ succes: false, message: 'Virement introuvable ou déjà traité.' });

    const interac = interacRes.rows[0];
    if (new Date(interac.expires_at) < new Date()) {
      await query('UPDATE interac_transfers SET status = \'expired\' WHERE id = $1', [interacId]);
      return res.status(400).json({ succes: false, message: 'Virement expiré.' });
    }

    // Vérifier le compte destination
    const compteRes = await query(
      `SELECT id, balance AS solde, account_type AS type, status AS statut
       FROM accounts WHERE id = $1 AND user_id = $2`,
      [compteDestinationId, utilisateurId]
    );
    if (!compteRes.rows[0]) return res.status(404).json({ succes: false, message: 'Compte destination introuvable.' });

    const compte = compteRes.rows[0];
    if (!['checking', 'savings'].includes(compte.type)) {
      return res.status(400).json({ succes: false, message: 'Dépôt uniquement dans un compte chèques ou épargne.' });
    }

    // Créditer le compte
    const newSolde = parseFloat(compte.solde) + parseFloat(interac.amount);
    await query('UPDATE accounts SET balance = $1, updated_at = NOW() WHERE id = $2', [newSolde, compteDestinationId]);
    await query(
      `INSERT INTO transactions (account_id, transaction_type, amount, balance_after, description, status)
       VALUES ($1, 'transfer', $2, $3, $4, 'completed')`,
      [compteDestinationId, interac.amount, newSolde, `Virement Interac reçu de ${interac.prenom_expediteur} ${interac.nom_expediteur}`]
    );

    // Marquer le virement comme déposé
    await query(
      'UPDATE interac_transfers SET status = \'deposited\', deposit_account_id = $1, deposited_at = NOW() WHERE id = $2',
      [compteDestinationId, interacId]
    );

    // Notifications
    await notificationModel.creer({
      utilisateurId,
      type: 'interac_deposited',
      titre: 'Virement Interac déposé',
      message: `Vous avez déposé ${parseFloat(interac.amount).toFixed(2)} $ de ${interac.prenom_expediteur} ${interac.nom_expediteur} dans votre compte.`,
      lien: '/tableau-bord.html'
    });

    res.json({ succes: true, message: 'Virement Interac déposé avec succès.' });
  } catch (error) {
    console.error('Erreur dépôt Interac:', error);
    next(error);
  }
};

// Annule un virement Interac en attente à la demande de l'expéditeur.
// Rembourse le montant sur le compte source et marque le virement comme "cancelled".
exports.annulerInterac = async (req, res, next) => {
  try {
    const { interacId } = req.params;
    const senderId = req.user.id;

    const interacRes = await query(
      `SELECT id, amount, sender_account_id, status AS statut
       FROM interac_transfers WHERE id = $1 AND sender_id = $2`,
      [interacId, senderId]
    );
    if (!interacRes.rows[0]) {
      return res.status(404).json({ succes: false, message: 'Virement introuvable.' });
    }
    const interac = interacRes.rows[0];
    if (interac.statut !== 'pending') {
      return res.status(400).json({ succes: false, message: 'Ce virement ne peut plus être annulé (déjà traité ou expiré).' });
    }

    // Rembourser le compte source
    const compteRes = await query('SELECT balance FROM accounts WHERE id = $1', [interac.sender_account_id]);
    const newSolde = parseFloat(compteRes.rows[0].balance) + parseFloat(interac.amount);
    await query('UPDATE accounts SET balance = $1, updated_at = NOW() WHERE id = $2', [newSolde, interac.sender_account_id]);
    await query(
      `INSERT INTO transactions (account_id, transaction_type, amount, balance_after, description, status)
       VALUES ($1, 'transfer', $2, $3, $4, 'completed')`,
      [interac.sender_account_id, interac.amount, newSolde, 'Annulation virement Interac — remboursement']
    );

    await query('UPDATE interac_transfers SET status = \'cancelled\' WHERE id = $1', [interacId]);

    await notificationModel.creer({
      utilisateurId: senderId,
      type: 'transfer_completed',
      titre: 'Virement Interac annulé',
      message: `Votre virement Interac de ${parseFloat(interac.amount).toFixed(2)} $ a été annulé. Le montant a été remboursé.`,
      lien: '/virement-interac.html'
    });

    res.json({ succes: true, message: 'Virement annulé et montant remboursé.' });
  } catch (error) {
    console.error('Erreur annulation Interac:', error);
    next(error);
  }
};

// Retourne les 20 derniers virements Interac envoyés par l'utilisateur connecté,
// avec le nom du destinataire s'il est client de la banque.
exports.mesVirementsEnvoyes = async (req, res, next) => {
  try {
    const senderId = req.user.id;
    const result = await query(
      `SELECT it.id, it.amount AS montant, it.recipient_email AS email_destinataire,
              it.message, it.status AS statut, it.created_at AS cree_le,
              it.expires_at AS expire_le,
              u.first_name AS prenom_destinataire, u.last_name AS nom_destinataire
       FROM interac_transfers it
       LEFT JOIN users u ON it.recipient_id = u.id
       WHERE it.sender_id = $1
       ORDER BY it.created_at DESC
       LIMIT 20`,
      [senderId]
    );
    res.json({ succes: true, virements: result.rows });
  } catch (error) { next(error); }
};

// Retourne la liste des bénéficiaires Interac enregistrés par l'utilisateur.
exports.mesBeneficiaires = async (req, res, next) => {
  try {
    const result = await query(
      'SELECT * FROM beneficiaries WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json({ succes: true, beneficiaires: result.rows });
  } catch (error) { next(error); }
};

// Ajoute un nouveau bénéficiaire Interac (nom + email) pour l'utilisateur connecté.
exports.ajouterBeneficiaire = async (req, res, next) => {
  try {
    const { nom, email, note } = req.body;
    if (!nom || !email) return res.status(400).json({ succes: false, message: 'Nom et email requis.' });

    const result = await query(
      'INSERT INTO beneficiaries (user_id, name, email, note) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.user.id, nom, email, note || null]
    );
    res.status(201).json({ succes: true, beneficiaire: result.rows[0] });
  } catch (error) { next(error); }
};

// Supprime un bénéficiaire Interac appartenant à l'utilisateur connecté.
exports.supprimerBeneficiaire = async (req, res, next) => {
  try {
    const { beneficiaireId } = req.params;
    await query('DELETE FROM beneficiaries WHERE id = $1 AND user_id = $2', [beneficiaireId, req.user.id]);
    res.json({ succes: true, message: 'Bénéficiaire supprimé.' });
  } catch (error) { next(error); }
};
