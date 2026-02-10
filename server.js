import 'dotenv/config'
import express, { json } from 'express'
import helmet from 'helmet'
import compression from 'compression'
import cors from 'cors'
import session from 'express-session'
import memorystore from 'memorystore'
import passport from 'passport'
import './auth.js';
// import { pool } from '../db/db.js';

// Iportation des fonctions
import { createProfil, getAllProfils, getProfilById, getProfilByStatut, 
    updateProfil, deleteProfil, getProfilByEmail, resetTentatives, 
    bloquerCompte, incrementerTentatives} from './model/profil.js'
import { profilValide } from './middlewares/validation.js'

// Création du serveur
const app = express();

const MemoryStore = memorystore(session);

// Ajout de middlewares
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(json());
app.use(express.static('public'));

app.use(session({
    cookie: { maxAge: 3600000 },
    name: process.env.npm_package_name,
    store: new MemoryStore({ checkPeriod: 3600000 }),
    resave: false,
    saveUninitialized: false,
    rolling: true,
    secret: process.env.SESSION_SECRET
}));
app.use(passport.initialize());
app.use(passport.session());

// Définition des routes
app.get('/api/profils', async (request, response) => {
    const profils = await getAllProfils()
    response.status(200).json(profils)
})
app.get('/api/profils/:id', async ( request, response) => {
    const requestedId = parseInt(request.params.id)
    const profil = await getProfilById(requestedId)
    if (profil) {
        response.status(200).json(profil)
    } else {
        response.status(404).json({ message: "Profil non trouvé" })
    }
})
app.get('/api/profilsStatut/:statut', async (request, response) => {
    const requesteStatut = request.params.statut
    const profil = await getProfilByStatut(requesteStatut)

    if (profil) {
        response.status(200).json(profil)
    } else {
        response.status(404).json({ message: "Profil non trouvé" })
    }
})
app.post('/api/profils', profilValide, async (request, response) => {
    const { nom, prenom, date_naissance, age, sexe, nationalite, nas, adresse, telephone, email, password } = request.body

    await createProfil({ nom, prenom, date_naissance, age, sexe, nationalite, nas, adresse, telephone, email, password })
    response.status(201).json( { message: "Profil créé avec succès" })
})
app.patch('/api/profils/:id', async (request, response) => {
    const requestedId = parseInt(request.params.id)
    const updatedProfil = await updateProfil(requestedId, request.body)

    if (!updatedProfil) {
        return response.status(404).json({ message: "Profil non trouvé" })
    }
    response.status(200).json( { message: "Profil mis à jour avec succès" })

})
app.delete('/api/profils/:id', async (request, response) => {
    const requestedId = parseInt(request.params.id)
    const isDeleted = await deleteProfil(requestedId)

    if (!isDeleted) {
        return response.status(404).json({ message: "Profil non trouvé" })
    }
    response.status(200).json( { message: "Profil supprimé avec succès" })
})

//Route pour la connexion
app.post('/api/connexion', async (request, response, next) => {
    const { email } = request.body;

    try {
        const user = await getProfilByEmail(email);

        // Email inexistant
        if (!user) {
            return response.status(401).json({
                message: 'Email ou mot de passe incorrect'
            });
        }

        // Déjà bloqué
        if (user.statut === 'bloquer') {
            return response.status(403).json({
                message: 'Votre compte est bloqué. Veuillez contacter le support.'
            });
        }

        passport.authenticate('local', async (error, userAuth) => {

            if (error) return next(error);

            //Mot de passe incorrect
            if (!userAuth) {

                await incrementerTentatives(email);

                const tentatives = user.tentatives + 1;

                if (tentatives >= 3) {
                    await bloquerCompte(email);

                    return response.status(403).json({
                        message: 'Compte bloqué après 3 tentatives incorrectes.'
                    });
                }

                return response.status(401).json({
                    message: `Email ou mot de passe incorrect (${tentatives}/3)`
                });
            }

            //Connexion réussie
            await resetTentatives(email);

            request.logIn(userAuth, (error) => {
                if (error) return next(error);

                return response.status(200).json({
                    message: 'Connexion réussie'
                });
            });

        })(request, response, next);

    } catch (err) {
        console.error(err);
        response.status(500).json({ message: 'Erreur serveur' });
    }
});



// deconnexion
app.post('/api/deconnexion', (request, response, next) => {
    request.logout(err => {
        if (err) {
            return next(err);
        }

        request.session.destroy(() => {
            response.clearCookie(process.env.npm_package_name);
            response.status(200).json({
                message: 'Déconnexion réussie'
            });
        });
    });
});



process.env.NOM_VARIABLE
app.listen(process.env.PORT);

