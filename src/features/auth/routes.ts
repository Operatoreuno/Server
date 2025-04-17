import { Router } from "express";
import { errorHandler } from "@errors/error.handler";
import { adminLogin, adminMe, adminLogout } from "./admin/admin.controller";
import { userLogin, userMe, userLogout } from "./user/user.controller";
import { loginLimiter } from "@utils/rate-limits";
import { adminAuth } from "@features/auth/middleware/auth";
import { userAuth } from "@features/auth/middleware/auth";

/**
 * Router per le funzionalità di autenticazione del sistema.
 * 
 * Implementa due set di percorsi separati:
 * 1. Percorsi Web (rootRouter): per applicazione web standard
 * 2. Percorsi Mobile (mobileRouter): endpoint ottimizzati per app mobile
 * 
 * Per ciascun tipo di utente (admin/user) espone:
 * - Endpoint di login (con gestione token)
 * - Endpoint di verifica autenticazione (/me)
 * - Endpoint di logout (con revoca token)
 * 
 * Caratteristiche di sicurezza:
 * - Rate limiting sugli endpoint di login per prevenire attacchi brute force
 * - Protezione degli endpoint sensibili con middleware di autenticazione
 * - Gestione centralizzata degli errori con errorHandler
 */
const rootRouter:Router = Router();
const mobileRouter:Router = Router();

// Routes Admin Web
rootRouter.use('/admin/login', loginLimiter, errorHandler(adminLogin));
rootRouter.use('/admin/me', adminAuth, errorHandler(adminMe));
rootRouter.use('/admin/logout', adminAuth, errorHandler(adminLogout));

// Routes User Web
rootRouter.use('/login', loginLimiter, errorHandler(userLogin));
rootRouter.use('/me', userAuth, errorHandler(userMe));
rootRouter.use('/logout', userAuth, errorHandler(userLogout));

// Routes Mobile
mobileRouter.use('/login', loginLimiter, errorHandler(userLogin));
mobileRouter.use('/logout', userAuth, errorHandler(userLogout));

export default { rootRouter, mobileRouter };