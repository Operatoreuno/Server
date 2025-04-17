import { Router } from "express";
import { errorHandler } from "@errors/error.handler";
import { forgotPassword, setPassword, updatePassword } from "./password.controller";
import { userAuth } from "@features/auth/middleware/auth";
import { forgotPasswordLimiter } from "@utils/rate-limits";
/**
 * Router per le funzionalità di gestione password.
 * 
 * Percorsi esposti:
 * - POST /forgot-password: Recupero password dimenticata
 * - POST /set-password: Impostazione password
 * - POST /update-password: Aggiornamento password utente
 * 
 * Tutti i percorsi sono protetti da errorHandler centralizzato
 * per garantire gestione unificata degli errori.
 */
const rootRouter:Router = Router();
const mobileRouter:Router = Router();

// Rotte Web
rootRouter.use('/forgot-password', forgotPasswordLimiter, errorHandler(forgotPassword));
rootRouter.use('/set-password', errorHandler(setPassword));
rootRouter.use('/update-password', userAuth, errorHandler(updatePassword));

// Rotte Mobile
mobileRouter.use('/update-password', userAuth, errorHandler(updatePassword));

export default { rootRouter, mobileRouter };