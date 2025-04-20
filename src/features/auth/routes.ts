import { Router } from "express";
import { errorHandler } from "@errors/error.handler";
import { adminLogin, adminMe, adminLogout, adminRefreshToken } from "./admin/admin.controller";
import { userLogin, userMe, userLogout, refreshToken } from "./user/user.controller";
import { loginLimiter } from "@core/utils/rate-limits";
import { adminAuth } from "@features/auth/utils/auth";
import { userAuth } from "@features/auth/utils/auth";

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
 * - Endpoint di refresh token (per rinnovo esplicito)
 * 
 * Caratteristiche di sicurezza:
 * - Rate limiting sugli endpoint di login per prevenire attacchi brute force
 * - Protezione degli endpoint sensibili con middleware di autenticazione
 * - Gestione centralizzata degli errori con errorHandler
 * - Pattern "one-time use" per i refresh token
 */
const rootRouter:Router = Router();
const mobileRouter:Router = Router();

// Rotte Admin Web
// Gestiscono autenticazione per pannello amministrativo
rootRouter.use('/admin/login', loginLimiter, errorHandler(adminLogin));
rootRouter.use('/admin/me', adminAuth, errorHandler(adminMe));
rootRouter.use('/admin/logout', adminAuth, errorHandler(adminLogout));
rootRouter.use('/admin/refresh', errorHandler(adminRefreshToken));

// Rotte User Web
// Gestiscono autenticazione per utenti standard (portale web)
rootRouter.use('/login', loginLimiter, errorHandler(userLogin));
rootRouter.use('/me', userAuth, errorHandler(userMe));
rootRouter.use('/logout', userAuth, errorHandler(userLogout));
rootRouter.use('/refresh', errorHandler(refreshToken));

// Rotte Mobile
// Endpoint dedicati per app mobile con stesse funzionalità ma ottimizzati
mobileRouter.use('/login', loginLimiter, errorHandler(userLogin));
mobileRouter.use('/logout', userAuth, errorHandler(userLogout));
mobileRouter.use('/refresh', errorHandler(refreshToken));

export default { rootRouter, mobileRouter };