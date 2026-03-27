const { query } = require('../config/baseDeDonnees');
const notificationModel = require('../modeles/notification.modele');
const { sendNotificationToAdmin } = require('../utilitaires/websocket');

// Créer une nouvelle demande
exports.creerDemande = async (req, res, next) => {
  try {
    const utilisateurId = req.user.id;
    const {
      typeDemande,
      typeCompte,
      typeCarte,
      limiteDemandee,
      montantDemande,
      montantInitial,
      dureeMois,
      valeurPropriete,
      justification
    } = req.body;

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 NOUVELLE DEMANDE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Type:', typeDemande);
    console.log('User ID:', utilisateurId);

    // Vérifier que l'utilisateur est actif
    const userCheck = await query(
      'SELECT account_status FROM users WHERE id = $1',
      [utilisateurId]
    );

    if (!userCheck.rows[0] || userCheck.rows[0].account_status !== 'active') {
      return res.status(403).json({
        succes: false,
        message: 'Votre compte doit être actif pour faire une demande'
      });
    }

    // Insérer la demande
    const result = await query(
      `INSERT INTO requests (
        user_id,
        request_type,
        account_type,
        card_type,
        requested_limit,
        justification,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6,'pending')
      RETURNING id`,
      [
        utilisateurId,
        typeDemande,
        typeCompte || null,
        typeCarte || null,
        limiteDemandee || null,
        justification
      ]
    );

    const demandeId = result.rows[0].id;

    console.log('✅ Demande créée - ID:', demandeId);

    // Créer notification pour l'utilisateur
    await notificationModel.creer({
      user_id: utilisateurId,
      type: 'request_submitted',
      titre: 'Demande soumise',
      message: `Votre demande de ${typeDemande} a été soumise et est en cours d'examen.`,
      lien: '/mes-demandes.html'
    });

    // Récupérer le nom de l'utilisateur pour la notification admin
    const userInfo = await query(
      'SELECT first_name, last_name, email FROM users WHERE id = $1',
      [utilisateurId]
    );

    const user = userInfo.rows[0];

    // Notifier les admins via WebSocket
    sendNotificationToAdmin({
      type: 'new_request',
      message: `Nouvelle demande de ${user.first_name} ${user.last_name} : ${typeDemande}`,
      userId: utilisateurId,
      requestId: demandeId
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    res.status(201).json({
      succes: true,
      message: 'Demande soumise avec succès',
      demandeId: demandeId
    });
  } catch (error) {
    console.error('Erreur création demande:', error);
    next(error);
  }
};

// Obtenir mes demandes
exports.mesDemandes = async (req, res, next) => {
  try {
    const utilisateurId = req.user.id;

    const result = await query(
      `SELECT 
        id,
        request_type AS type_demande,
        account_type AS type_compte,
        card_type AS type_carte,
        requested_limit AS limite_demandee,
        requested_amount AS montant_demande,
        duration_months AS duree_mois,
        property_value AS valeur_propriete,
        justification,
        status AS statut,
        review_comment AS commentaire_admin,
        created_at AS date_demande,
        reviewed_at AS date_examen
      FROM requests
      WHERE user_id = $1
      ORDER BY created_at DESC`,
      [utilisateurId]
    );

    res.json({
      succes: true,
      demandes: result.rows
    });
  } catch (error) {
    console.error('Erreur récupération demandes:', error);
    next(error);
  }
};

// Obtenir une demande spécifique
exports.obtenirDemande = async (req, res, next) => {
  try {
    const { demandeId } = req.params;
    const utilisateurId = req.user.id;

    const result = await query(
      `SELECT 
        id,
        request_type AS type_demande,
        account_type AS type_compte,
        card_type AS type_carte,
        requested_limit AS limite_demandee,
        requested_amount AS montant_demande,
        duration_months AS duree_mois,
        property_value AS valeur_propriete,
        justification,
        status AS statut,
        review_comment AS commentaire_admin,
        created_at AS date_demande,
        reviewed_at AS date_examen
      FROM requests
      WHERE id = $1 AND user_id = $2`,
      [demandeId, utilisateurId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        succes: false,
        message: 'Demande non trouvée'
      });
    }

    res.json({
      succes: true,
      demande: result.rows[0]
    });
  } catch (error) {
    console.error('Erreur récupération demande:', error);
    next(error);
  }
};