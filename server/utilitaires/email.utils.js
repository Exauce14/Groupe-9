const nodemailer = require('nodemailer');

// Configuration du transporteur email
let transporter = null;

const initialiserTransporter = () => {
    if (transporter) return transporter;

    // ── NOUVEAU : Variable pour forcer le mode dev même si email configuré ──
    const forceDevMode = process.env.EMAIL_MODE === 'dev';
    
    if (forceDevMode) {
        console.log('📧 Mode email: DÉVELOPPEMENT (codes dans console)');
        return null;
    }

    // Option 1 : Gmail (pour production/démo)
    if (process.env.EMAIL_SERVICE === 'gmail') {
        console.log('📧 Mode email: PRODUCTION (envoi réel via Gmail)');
        transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }
        });
    }
    // Option 2 : SMTP générique
    else if (process.env.SMTP_HOST) {
        console.log('📧 Mode email: PRODUCTION (envoi réel via SMTP)');
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASSWORD
            }
        });
    }
    // Option 3 : Mode développement (aucune config)
    else {
        console.log('📧 Mode email: DÉVELOPPEMENT (codes dans console)');
        transporter = null;
    }

    return transporter;
};

// Envoyer un email de code 2FA
exports.envoyerCode2FA = async (destinataire, code, prenom) => {
    const transport = initialiserTransporter();
    
    // Mode développement : logger le code
    if (!transport) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📧 EMAIL 2FA (MODE DEV)');
        console.log(`Pour: ${destinataire}`);
        console.log(`Code: ${code}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        return { success: true, mode: 'dev', code };
    }

    const mailOptions = {
        from: `"Ma Banque" <${process.env.EMAIL_USER || 'noreply@mabanque.com'}>`,
        to: destinataire,
        subject: 'Code de vérification - Ma Banque',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                    <h1 style="color: white; margin: 0;">🏦 Ma Banque</h1>
                </div>
                <div style="background: #f7f7f7; padding: 30px;">
                    <h2 style="color: #333;">Bonjour ${prenom || ''} !</h2>
                    <p style="font-size: 16px; color: #555;">
                        Voici votre code de vérification pour vous connecter à votre compte :
                    </p>
                    <div style="background: white; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
                        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #667eea;">
                            ${code}
                        </span>
                    </div>
                    <p style="font-size: 14px; color: #777;">
                        Ce code est valide pendant <strong>10 minutes</strong>.<br>
                        Si vous n'avez pas demandé ce code, ignorez cet email.
                    </p>
                </div>
                <div style="background: #333; padding: 20px; text-align: center; color: #999; font-size: 12px;">
                    © 2026 Ma Banque - Tous droits réservés
                </div>
            </div>
        `
    };

    try {
        const info = await transport.sendMail(mailOptions);
        console.log('✅ Email 2FA envoyé:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Erreur envoi email:', error);
        throw error;
    }
};

// Envoyer un email de vérification d'inscription
exports.envoyerVerificationEmail = async (destinataire, token, prenom) => {
    const transport = initialiserTransporter();
    const verificationUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/verifier-email?token=${token}`;

    if (!transport) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📧 EMAIL VERIFICATION (MODE DEV)');
        console.log(`Pour: ${destinataire}`);
        console.log(`URL: ${verificationUrl}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        return { success: true, mode: 'dev', url: verificationUrl };
    }

    const mailOptions = {
        from: `"Ma Banque" <${process.env.EMAIL_USER || 'noreply@mabanque.com'}>`,
        to: destinataire,
        subject: 'Vérifiez votre adresse email - Ma Banque',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                    <h1 style="color: white; margin: 0;">🏦 Ma Banque</h1>
                </div>
                <div style="background: #f7f7f7; padding: 30px;">
                    <h2 style="color: #333;">Bienvenue ${prenom || ''} !</h2>
                    <p style="font-size: 16px; color: #555;">
                        Merci de vous être inscrit à Ma Banque. Pour activer votre compte, veuillez vérifier votre adresse email en cliquant sur le bouton ci-dessous :
                    </p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${verificationUrl}" 
                           style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                            Vérifier mon email
                        </a>
                    </div>
                    <p style="font-size: 12px; color: #999;">
                        Ou copiez ce lien dans votre navigateur :<br>
                        <a href="${verificationUrl}" style="color: #667eea; word-break: break-all;">${verificationUrl}</a>
                    </p>
                    <p style="font-size: 14px; color: #777; margin-top: 20px;">
                        Ce lien est valide pendant <strong>24 heures</strong>.<br>
                        Si vous n'avez pas créé de compte, ignorez cet email.
                    </p>
                </div>
                <div style="background: #333; padding: 20px; text-align: center; color: #999; font-size: 12px;">
                    © 2026 Ma Banque - Tous droits réservés
                </div>
            </div>
        `
    };

    try {
        const info = await transport.sendMail(mailOptions);
        console.log('✅ Email vérification envoyé:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Erreur envoi email:', error);
        throw error;
    }
};
