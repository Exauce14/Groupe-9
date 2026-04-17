const nodemailer = require('nodemailer');

// Mode développement : logs seulement (pas d'envoi réel)
const MODE_DEV = !process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD || process.env.EMAIL_MODE === 'dev';

let transporter;

if (MODE_DEV) {
  // Transporter de test (mode dev)
  console.log('⚠️ MODE DÉVELOPPEMENT : Les emails seront affichés dans la console uniquement');
  transporter = {
    sendMail: async (mailOptions) => {
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📧 EMAIL SIMULÉ (MODE DEV)');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('À:', mailOptions.to);
      console.log('Sujet:', mailOptions.subject);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      return { messageId: 'dev-mode-' + Date.now() };
    }
  };
} else {
  // Configuration SMTP réelle avec Gmail
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
}

// Génère le template HTML commun pour tous les emails Fortivia Bank.
// Accepte un titre, un contenu HTML personnalisé et optionnellement un bouton d'action.
const getEmailTemplate = (title, content, buttonText = null, buttonLink = null) => {
  return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                background-color: #f3f4f6;
                padding: 40px 20px;
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
                background: white;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            }
            .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                padding: 40px 30px;
                text-align: center;
                color: white;
            }
            .logo {
                width: 64px;
                height: 64px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 50%;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                margin-bottom: 16px;
                font-size: 32px;
            }
            .header h1 {
                font-size: 28px;
                font-weight: 700;
                margin-bottom: 8px;
            }
            .header p {
                font-size: 16px;
                opacity: 0.9;
            }
            .content {
                padding: 40px 30px;
            }
            .content h2 {
                color: #1f2937;
                font-size: 24px;
                margin-bottom: 16px;
            }
            .content p {
                color: #6b7280;
                font-size: 16px;
                line-height: 1.6;
                margin-bottom: 16px;
            }
            .code-box {
                background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
                border: 2px solid #667eea;
                border-radius: 12px;
                padding: 24px;
                text-align: center;
                margin: 32px 0;
            }
            .code {
                font-size: 48px;
                font-weight: 700;
                color: #667eea;
                letter-spacing: 8px;
                font-family: 'Courier New', monospace;
            }
            .button {
                display: inline-block;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 14px 32px;
                border-radius: 8px;
                text-decoration: none;
                font-weight: 600;
                font-size: 16px;
                margin: 24px 0;
            }
            .footer {
                background: #f9fafb;
                padding: 30px;
                text-align: center;
                color: #6b7280;
                font-size: 14px;
                border-top: 1px solid #e5e7eb;
            }
            .footer p {
                margin-bottom: 8px;
            }
            .divider {
                height: 1px;
                background: #e5e7eb;
                margin: 24px 0;
            }
            .info-box {
                background: #f0f9ff;
                border-left: 4px solid #3b82f6;
                padding: 16px;
                border-radius: 8px;
                margin: 24px 0;
            }
            .info-box p {
                color: #1e40af;
                margin: 0;
            }
            .warning-box {
                background: #fef3c7;
                border-left: 4px solid #f59e0b;
                padding: 16px;
                border-radius: 8px;
                margin: 24px 0;
            }
            .warning-box p {
                color: #92400e;
                margin: 0;
            }
            .success-box {
                background: #d1fae5;
                border-left: 4px solid #10b981;
                padding: 16px;
                border-radius: 8px;
                margin: 24px 0;
            }
            .success-box p {
                color: #065f46;
                margin: 0;
            }
            .danger-box {
                background: #fee2e2;
                border-left: 4px solid #ef4444;
                padding: 16px;
                border-radius: 8px;
                margin: 24px 0;
            }
            .danger-box p {
                color: #991b1b;
                margin: 0;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🏦</div>
                <h1>Fortivia Bank</h1>
                <p>Votre partenaire bancaire de confiance</p>
            </div>
            <div class="content">
                ${content}
                ${buttonText && buttonLink ? `
                    <div style="text-align: center;">
                        <a href="${buttonLink}" class="button">${buttonText}</a>
                    </div>
                ` : ''}
            </div>
            <div class="footer">
                <p><strong>Fortivia Bank</strong></p>
                <p>801 Promenade de l'aviation, Ottawa, ON K1K 4B2</p>
                <p>Téléphone: (111) 000-0000 | Email: developer.exauce.ngolo@outlook.com</p>
                <div class="divider"></div>
                <p style="font-size: 12px; color: #9ca3af;">
                    Cet email a été envoyé automatiquement. Merci de ne pas y répondre.<br>
                    Si vous avez des questions, contactez notre service client.
                </p>
            </div>
        </div>
    </body>
    </html>
  `;
};

// Envoie le code de vérification 2FA à l'utilisateur par email.
// En mode développement, affiche le code dans la console au lieu d'envoyer un vrai email.
exports.envoyerCode2FA = async (email, prenom, code) => {
  const content = `
    <h2>Bonjour ${prenom},</h2>
    <p>Vous avez demandé à vous connecter à votre compte Fortivia Bank. Pour des raisons de sécurité, veuillez utiliser le code de vérification ci-dessous :</p>
    
    <div class="code-box">
        <div class="code">${code}</div>
    </div>

    <p>Si vous n'avez pas demandé ce code, veuillez ignorer cet email et contactez immédiatement notre service client.</p>
  `;

  const mailOptions = {
    from: `"Fortivia Bank" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: '🔐 Code de vérification - Fortivia Bank',
    html: getEmailTemplate('Code de vérification', content)
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`📧 CODE 2FA : ${code}`);
    console.log('✅ Email 2FA envoyé à:', email);
  } catch (error) {
    console.error('❌ Erreur envoi email 2FA:', error);
    if (MODE_DEV) {
      console.log('⚠️ Erreur ignorée en mode développement');
      console.log(`📧 CODE 2FA MANUEL : ${code}`);
    } else {
      throw error;
    }
  }
};

exports.envoyerEmailResetMotDePasse = async (email, prenom, code) => {
  const content = `
    <h2>Bonjour ${prenom},</h2>
    <p>Une demande de réinitialisation de mot de passe a été initiée pour votre compte.</p>
    <p>Utilisez le code suivant pour réinitialiser votre mot de passe :</p>
    <div class="code-box">
        <div class="code">${code}</div>
    </div>
    <p>Ce code est valide pendant 10 minutes. Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
  `;

  const mailOptions = {
    from: `"Fortivia Bank" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: '🔑 Réinitialisation de mot de passe - Fortivia Bank',
    html: getEmailTemplate('Réinitialisation de mot de passe', content)
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('✅ Email de réinitialisation envoyé à:', email);
    console.log(`📧 CODE RESET : ${code}`);
  } catch (error) {
    console.error('❌ Erreur envoi email de réinitialisation:', error);
    if (MODE_DEV) {
      console.log('⚠️ Erreur ignorée en mode développement');
      console.log(`📧 CODE RESET MANUEL : ${code}`);
    } else {
      throw error;
    }
  }
};

exports.envoyerEmailConfirmationReinitialisationMotDePasse = async (email, prenom) => {
  const content = `
    <h2>Bonjour ${prenom},</h2>
    <div class="success-box">
        <p><strong>Votre mot de passe a été réinitialisé avec succès.</strong></p>
    </div>
    <p>Si vous n'êtes pas à l'origine de cette modification, contactez immédiatement notre service client.</p>
  `;

  const mailOptions = {
    from: `"Fortivia Bank" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: '✅ Mot de passe réinitialisé - Fortivia Bank',
    html: getEmailTemplate('Mot de passe réinitialisé', content)
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('✅ Email de confirmation de réinitialisation envoyé à:', email);
  } catch (error) {
    console.error('❌ Erreur envoi email de confirmation de réinitialisation:', error);
    if (MODE_DEV) {
      console.log('⚠️ Erreur ignorée en mode développement');
    } else {
      throw error;
    }
  }
};

exports.envoyerEmailConfirmationChangementMotDePasse = async (email, prenom) => {
  const content = `
    <h2>Bonjour ${prenom},</h2>
    <div class="success-box">
        <p><strong>Votre mot de passe a été modifié avec succès.</strong></p>
    </div>
    <p>Si vous n'êtes pas à l'origine de cette modification, contactez immédiatement notre service client.</p>
  `;

  const mailOptions = {
    from: `"Fortivia Bank" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: '✅ Mot de passe modifié - Fortivia Bank',
    html: getEmailTemplate('Mot de passe modifié', content)
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('✅ Email de confirmation de changement de mot de passe envoyé à:', email);
  } catch (error) {
    console.error('❌ Erreur envoi email de confirmation de changement de mot de passe:', error);
    if (MODE_DEV) {
      console.log('⚠️ Erreur ignorée en mode développement');
    } else {
      throw error;
    }
  }
};

// Envoie un email de confirmation à l'utilisateur lorsque sa demande (inscription, prêt, carte, etc.) est approuvée.
exports.envoyerEmailDemandeApprouvee = async (email, prenom, typeDemande) => {
  const typeLabels = {
    'Compte Chèques': 'inscription',
    'Compte Epargne': 'ouverture de compte',
    'Carte de crédit': 'carte de crédit',
    'Prêt personnel': 'prêt personnel',
    'Prêt hypothécaire': 'prêt hypothécaire',
    'Compte de placement': 'compte de placement'
  };

  const typeLabel = typeLabels[typeDemande] || typeDemande;

  const content = `
    <h2>Félicitations ${prenom} ! 🎉</h2>
    
    <div class="success-box">
        <p><strong>✓ Votre demande de ${typeLabel} a été approuvée</strong></p>
    </div>

    <p>Nous avons le plaisir de vous informer que votre demande a été examinée et approuvée par notre équipe.</p>

    ${typeDemande === 'Compte Chèques' ? `
        <div class="info-box">
            <p>
                <strong>🎁 Bonus de bienvenue :</strong><br>
                Un compte chèques avec 5,00$ CAD a été créé pour vous.<br>
                Une carte de débit a été générée automatiquement.
            </p>
        </div>
    ` : ''}

    <p>Vous pouvez dès maintenant accéder à votre compte et profiter de nos services.</p>
  `;

  const mailOptions = {
    from: `"Fortivia Bank" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `✅ Demande approuvée - ${typeLabel}`,
    html: getEmailTemplate('Demande approuvée', content, 'Accéder à mon compte', 'http://localhost:3000')
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('✅ Email approbation envoyé à:', email);
  } catch (error) {
    console.error('❌ Erreur envoi email approbation:', error);
    if (MODE_DEV) {
      console.log('⚠️ Erreur ignorée en mode développement');
    }
  }
};

// Envoie un email à l'utilisateur pour l'informer que sa demande a été refusée, avec la raison fournie par l'admin.
exports.envoyerEmailDemandeRejetee = async (email, prenom, typeDemande, raison) => {
  const typeLabels = {
    'Compte Chèques': 'inscription',
    'Compte Epargne': 'ouverture de compte',
    'Carte de crédit': 'carte de crédit',
    'Prêt personnel': 'prêt personnel',
    'Prêt hypothécaire': 'prêt hypothécaire',
    'Compte de placement': 'compte de placement'
  };

  const typeLabel = typeLabels[typeDemande] || typeDemande;

  const content = `
    <h2>Bonjour ${prenom},</h2>
    
    <p>Nous avons examiné votre demande de ${typeLabel} et nous regrettons de vous informer qu'elle n'a pas pu être approuvée à ce stade.</p>

    <div class="warning-box">
        <p><strong>Raison :</strong> ${raison}</p>
    </div>

    <p>Nous comprenons que cette décision puisse être décevante. Si vous souhaitez plus d'informations ou discuter de votre situation, n'hésitez pas à contacter notre service client.</p>

    <div class="info-box">
        <p>
            <strong>💡 Que faire ensuite ?</strong><br>
            Vous pouvez soumettre une nouvelle demande après avoir résolu les points mentionnés ci-dessus.
        </p>
    </div>
  `;

  const mailOptions = {
    from: `"Fortivia Bank" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `❌ Demande non approuvée - ${typeLabel}`,
    html: getEmailTemplate('Demande non approuvée', content, 'Nous contacter', 'mailto:support@fortivia.com')
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('✅ Email rejet envoyé à:', email);
  } catch (error) {
    console.error('❌ Erreur envoi email rejet:', error);
    if (MODE_DEV) {
      console.log('⚠️ Erreur ignorée en mode développement');
    }
  }
};

// Envoie un email d'alerte à l'utilisateur dont le compte vient d'être suspendu par un administrateur.
exports.envoyerEmailCompteSuspendu = async (email, prenom, raison) => {
  const content = `
    <h2>Bonjour ${prenom},</h2>
    
    <div class="danger-box">
        <p><strong>⚠️ Votre compte a été temporairement suspendu</strong></p>
    </div>

    <p>Nous avons dû suspendre votre compte Fortivia Bank pour la raison suivante :</p>

    <div class="warning-box">
        <p><strong>Raison :</strong> ${raison}</p>
    </div>

    <p>Durant cette période de suspension, vous ne pourrez pas accéder à vos services bancaires en ligne.</p>

    <div class="info-box">
        <p>
            <strong>📞 Contactez-nous immédiatement</strong><br>
            Pour plus d'informations ou pour résoudre cette situation, veuillez contacter notre service client au (514) 555-1234.
        </p>
    </div>
  `;

  const mailOptions = {
    from: `"Fortivia Bank" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: '⚠️ Suspension de compte - Fortivia Bank',
    html: getEmailTemplate('Compte suspendu', content, 'Nous contacter', 'mailto:support@fortivia.com')
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('✅ Email suspension envoyé à:', email);
  } catch (error) {
    console.error('❌ Erreur envoi email suspension:', error);
    if (MODE_DEV) {
      console.log('⚠️ Erreur ignorée en mode développement');
    }
  }
};

// Envoie un email de confirmation à l'utilisateur dont le compte vient d'être réactivé par un administrateur.
exports.envoyerEmailCompteReactive = async (email, prenom) => {
  const content = `
    <h2>Bonne nouvelle ${prenom} ! 🎉</h2>
    
    <div class="success-box">
        <p><strong>✓ Votre compte a été réactivé</strong></p>
    </div>

    <p>Nous sommes heureux de vous informer que votre compte Fortivia Bank a été réactivé par notre équipe administrative.</p>

    <p>Vous pouvez maintenant accéder à nouveau à tous vos services bancaires en ligne.</p>

    <div class="info-box">
        <p>
            <strong>🔒 Recommandation de sécurité</strong><br>
            Nous vous recommandons de changer votre mot de passe lors de votre prochaine connexion.
        </p>
    </div>
  `;

  const mailOptions = {
    from: `"Fortivia Bank" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: '✅ Compte réactivé - Fortivia Bank',
    html: getEmailTemplate('Compte réactivé', content, 'Se connecter', 'http://localhost:3000')
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('✅ Email réactivation envoyé à:', email);
  } catch (error) {
    console.error('❌ Erreur envoi email réactivation:', error);
    if (MODE_DEV) {
      console.log('⚠️ Erreur ignorée en mode développement');
    }
  }
};