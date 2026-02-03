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
import { createCompte, getComptes, getCompteByNumCompte, getCompteById, updateCompte, deleteCompte } from './model/compte.js'
import { profilValide } from './middlewares/validation.js'
import { compteValide } from './middlewares/validation.compte.js'

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

// Définition des routes pour les profils
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
// Fin de définition des routes pour les profils ==========================

//Définition des routes pour les comptes
app.get('/api/comptes', async (resquest, response) => {
    const comptes =  await getComptes()
    response.status(200).json(comptes)
})
app.get('/api/comptes/:num_compte', async (request, response) => {
    const resquestNumCompte = parseInt(request.params.num_compte)
    const compte = await getCompteByNumCompte(resquestNumCompte)
    
    if (compte) {
        response.status(200).json(compte)
    } else {
        response.status(404).json({ message: "Compte non trouvé" })
    }
})
app.get('/api/comptesById/:id', async (request, response) => {
   const id = Number(request.params.id)

    const compte = await getCompteById(id)

    if (!compte) {
        return response.status(404).json({ message: "Compte non trouvé" })
    }

    response.status(200).json(compte)


})
app.post('/api/comptes', compteValide, async (request, response) => {
    const { utilisateur_id,num_compte, type_compte, solde, devise, statut } = request.body

    await createCompte({ utilisateur_id,num_compte, type_compte, solde, devise, statut })
    response.status(201).json( { message: "Compte créé avec succès" })
})
app.patch('/api/comptes/:id', async (request, response) => {
    const requestId = parseInt(request.params.id)
    const updatedCompte = await updateCompte(requestId, request.body)

    if (!updatedCompte) {
        return response.status(404).json({ message: "Compte non trouvé" })
    }
    response.status(200).json( { message: "Compte mis à jour avec succès" })

})
app.delete('/api/comptes/:id', async (request, response) => {
    const requestId = parseInt(request.params.id)
    const isDeleted = await deleteCompte(requestId)

    if (!isDeleted) {
        return response.status(404).json({ message: "Compte non trouvé" })
    }
    response.status(200).json( { message: "Compte supprimé avec succès" })
})

//Fin de définition des routes pour les comptes ==========================



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

