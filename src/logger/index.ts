/**
 * Esportazione dei logger specifici per contesto.
 * 
 * Configura e esporta logger specializzati per differenti
 * aree dell'applicazione, tutti configurati per produzione.
 * Ogni logger mantiene il contesto nel formato dei log.
 */
import { logger as baseLogger } from './logger';

export const logger = baseLogger;

// Core
export const appLogger = baseLogger.child({ context: 'app' });
export const dbLogger = baseLogger.child({ context: 'db' });

// Autenticazione e sicurezza
export const authLogger = baseLogger.child({ context: 'auth' });
export const passwordLogger = baseLogger.child({ context: 'password' });

// Gestione utenti
export const signupLogger = baseLogger.child({ context: 'signup' });
export const userSettingsLogger = baseLogger.child({ context: 'user-settings' });
export const manageUsersLogger = baseLogger.child({ context: 'manage-users' });