import { errorHandler } from "@errors/error.handler";
import { Router } from "express";
import { userAuth } from "@features/auth/middleware/auth";
import { updateEmail } from "./settings.controller";
/**
 * Router per le funzionalità di impostazioni utente.
 * 
 * Percorsi esposti:
 * - POST /update-email: Aggiornamento email utente
 * 
 * Tutti i percorsi sono protetti da errorHandler centralizzato
 * per garantire gestione unificata degli errori.
 */
const rootRouter:Router = Router();
const mobileRouter:Router = Router();

// Routes User Web
rootRouter.use('/update-email', userAuth, errorHandler(updateEmail));

// Routes Mobile
mobileRouter.use('/update-email', userAuth, errorHandler(updateEmail));

export default {rootRouter, mobileRouter};