import { Router } from 'express';
import authRoutes from '@features/auth/routes';
import passwordRoutes from '@features/password/routes';
import manageUsersRoutes from '@features/manage-users/routes';
import settingsRoutes from '@features/user-settings/routes';    
import signupRoutes from '@features/signup/routes';
/**
 * Modulo di routing principale dell'applicazione.
 * 
 * Implementa due router separati:
 * 1. apiRouter: per l'applicazione web standard
 * 2. mobileRouter: ottimizzato per app mobile
 * 
 * Ogni router organizza i percorsi in gruppi logici per feature,
 * seguendo il pattern di routing gerarchico che migliora:
 * - Organizzazione e manutenibilità del codice
 * - Separazione delle responsabilità
 * - Possibilità di gestire diversamente API web e mobile
 */
const apiRouter = Router();
const mobileRouter = Router();

/**
 * Routes per autenticazione
 * 
 * Web: login, logout, me, lastLogin (utente) && login, logout, me (admin)
 * Mobile: login, logout, me, lastLogin (solo utente)
 */
apiRouter.use('/auth', authRoutes.rootRouter);
mobileRouter.use('/auth', authRoutes.mobileRouter);

/**
 * Routes per gestione password
 * 
 * Web: forgot-password, reset-password, update-password (solo utente)
 * Mobile: stessi endpoint ottimizzati per mobile
 */
apiRouter.use('/password', passwordRoutes.rootRouter);
mobileRouter.use('/password', passwordRoutes.mobileRouter);

/**
 * Routes per impostazioni utente
 * 
 * Web: update-email (solo utente)
 * Mobile: stessi endpoint ottimizzati per mobile
 */
apiRouter.use('/settings', settingsRoutes.rootRouter);
mobileRouter.use('/settings', settingsRoutes.mobileRouter);

/**
 * Routes per gestione utenti (solo pannello amministrativo)
 * 
 * Solo web: list-users, get-user, update-user, delete-user
 * Nota: Non esposto su API mobile
 */
apiRouter.use('/manage-users', manageUsersRoutes.rootRouter);

/**
 * Routes per registrazione utenti
 * 
 * Web: signup (utente) && signup-user (admin)
 * Nota: Non esposto su API mobile
 */
apiRouter.use('/signup', signupRoutes.rootRouter);

export { apiRouter, mobileRouter };