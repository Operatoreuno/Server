import dotenv from 'dotenv';
dotenv.config({path: '.env'});

/**
 * Variabili d'ambiente per la configurazione del server.
 * 
 * Questo modulo centralizza l'accesso a tutte le variabili d'ambiente
 * utilizzate nell'applicazione, garantendo un unico punto di riferimento.
 */

/** Porta su cui il server Express ascolta le richieste */
export const PORT = process.env.PORT;

/** Secret per la generazione dei JWT degli admin */
export const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET!

/** Secret per la generazione dei refresh token degli admin */
export const ADMIN_REFRESH_TOKEN_SECRET = process.env.ADMIN_REFRESH_TOKEN_SECRET!

/** Secret per la generazione dei JWT degli utenti standard */
export const USER_JWT_SECRET = process.env.USER_JWT_SECRET!

/** Secret per la generazione dei refresh token degli utenti standard */
export const USER_REFRESH_TOKEN_SECRET = process.env.USER_REFRESH_TOKEN_SECRET!

/** URL del frontend per configurazione CORS e redirezioni */
export const FRONTEND_URL = process.env.FRONTEND_URL!

/** Chiave API per l'integrazione con Mailgun */
export const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY!

/** Dominio configurato in Mailgun per l'invio delle email */
export const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN!

/** URL base dell'API Mailgun */
export const MAILGUN_API_URL = process.env.MAILGUN_API_URL!