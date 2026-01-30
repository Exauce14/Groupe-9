import bcrypt from 'bcrypt'
import passport from 'passport'
import { Strategy } from 'passport-local'
import { getProfilById, getProfilByEmail } from './model/profil.js'

const config = {
    usernameField: 'email',
    passwordField: 'password'
};

passport.use(new Strategy(config, async (email, password, done) => {
    try {
        // On va chercher l'utilisateur dans la base
        // de données avec son identifiant, le
        // courriel ici
        const utilisateur = await getProfilByEmail(email);

          // Si on ne trouve pas l'utilisateur, on
        // retourne que l'authentification a échoué
        // avec un code d'erreur
        if (!utilisateur) {
            return done(null, false, { error: 'mauvais_utilisateur' });
        }

          // Si on a trouvé l'utilisateur, on compare
        // son mot de passe dans la base de données
        // avec celui envoyé au serveur. On utilise
        // une fonction de bcrypt pour le faire
        const valide = await bcrypt.compare(password, utilisateur.password);


        // Si les mot de passe ne concorde pas, on
        // retourne que l'authentification a échoué
        // avec un code d'erreur
        if (!valide) {
            return done(null, false, { error: 'mauvais_mot_de_passe' });
        }

        // Si les mot de passe concorde, on retourne
        // l'information de l'utilisateur au serveur
        return done(null, utilisateur);

         }
    catch (error) {
        return done(error);
    }
}));

passport.serializeUser((utilisateur, done) => {
    // On mets uniquement l'identifiant dans la session
    done(null, utilisateur.id);
});

passport.deserializeUser(async (idUtilisateur, done) => {
     // S'il y a une erreur de base de donnée, on
    // retourne l'erreur au serveur
    try {
        // Puisqu'on a juste l'identifiant dans la 
        // session, on doit être capable d'aller chercher 
        // l'utilisateur avec celle-ci dans la base de 
        // données.
        const utilisateur = await getProfilById(idUtilisateur);
        done(null, utilisateur);
    }    catch (error) {
        done(error);
    }
});
