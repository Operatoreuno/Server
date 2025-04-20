import { Router } from "express";
import { errorHandler } from "@errors/error.handler";
import { signup } from "./user/signup.controller";
import { signupUser } from "./admin/signup-user.controller";
import { adminAuth } from "@features/auth/utils/auth";

/**
 * Router per le funzionalità di registrazione utenti.
 * 
 * Percorsi esposti:
 * - POST /signup: Registrazione standard utente
 * - POST /admin/signup-user: Creazione utente da parte di admin
 * 
 * Tutti i percorsi sono protetti da errorHandler centralizzato
 * per garantire gestione unificata degli errori.
 */
const rootRouter:Router = Router();

// Registrazione standard per utenti finali
// Non richiede autenticazione
rootRouter.use('/signup', errorHandler(signup));

// Registrazione utente da parte di admin
// Protetto da middleware di autenticazione admin
rootRouter.use('/admin/signup-user', adminAuth, errorHandler(signupUser));

export default { rootRouter };