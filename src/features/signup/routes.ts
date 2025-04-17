import { Router } from "express";
import { errorHandler } from "@errors/error.handler";
import { signup } from "./user/signup.controller";
import { signupUser } from "./admin/signup-user.controller";
import { adminAuth } from "@features/auth/middleware/auth";

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

// Routes User Web
rootRouter.use('/signup', errorHandler(signup));

// Routes Admin Web
rootRouter.use('/admin/signup-user', adminAuth, errorHandler(signupUser));

export default { rootRouter };