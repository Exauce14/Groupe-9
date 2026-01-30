import 'dotenv/config'
import express, { json } from 'express'
import helmet from 'helmet'
import compression from 'compression'
import cors from 'cors'
import session from 'express-session'
import memorystore from 'memorystore'
import passport from 'passport'
import './auth.js';

// Iportation des fonctions
import { createProfil, getAllProfils, getProfilById, updateProfil, deleteProfil} from './model/profil.js'
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
app.post('/api/profils', profilValide, async (request, response) => {
    const { nom, prenom, date_de_naissance, age, sexe, nationalite, nas, adresse_domicile, telephone, email, password } = request.body

    await createProfil({ nom, prenom, date_de_naissance, age, sexe, nationalite, nas, adresse_domicile, telephone, email, password })
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
app.post('/api/connexion', (request, response, next) => {
    passport.authenticate('local', (error, user, info) => {

        if (error) {
            return next(error);
        }

        if (!user) {
            return response.status(401).json({
                message: 'Email ou mot de passe incorrect'
            });
        }

        request.logIn(user, (error) => {
            if (error) {
                return next(error);
            }

            response.status(200).json({
                message: 'Connexion réussie'
            });
        });

    })(request, response, next);
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

