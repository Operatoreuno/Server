import formData from 'form-data';
import { MAILGUN_API_KEY, MAILGUN_API_URL, MAILGUN_DOMAIN } from './env';
import Mailgun from 'mailgun.js';

/**
 * Modulo di configurazione per il servizio email Mailgun.
 * 
 * Implementa l'integrazione con l'API Mailgun per:
 * - Invio di email transazionali (conferme, reset password, notifiche)
 * - Gestione dell'indirizzo mittente standardizzato
 * - Configurazione sicura tramite variabili d'ambiente
 * 
 * Il modulo espone un'istanza preconfigurata del client e
 * un indirizzo mittente standard per semplificare l'uso in tutta l'app.
 */

/**
 * Inizializzazione dell'SDK Mailgun.
 * 
 * Crea un'istanza base del client Mailgun.js configurata per:
 * - Utilizzare form-data per le richieste multipart
 * - Gestire correttamente i payload binari (allegati)
 * - Serializzare correttamente i dati per l'API REST
 */
const mailgun = new Mailgun(formData);

/**
 * Client Mailgun configurato per l'invio email.
 * 
 * Inizializzato con:
 * - Username API standard ('api')
 * - API key privata da variabili d'ambiente
 * - URL API personalizzabile per casi di test/staging
 * 
 * Questa istanza è pronta all'uso e condivisa in tutta l'applicazione
 * per garantire efficienza delle connessioni HTTP.
 * 
 * @type {import('mailgun.js').Client}
 */
export const mg = mailgun.client({
  username: 'api',  // Nome utente fisso per Mailgun API
  key: MAILGUN_API_KEY,  // API key presa dalle variabili d'ambiente
  url: MAILGUN_API_URL  // URL API (default: 'https://api.mailgun.net')
});

/**
 * Indirizzo email del mittente standard.
 * 
 * Formato nel pattern "Nome <indirizzo@dominio>" per:
 * - Massimizzare la deliverability
 * - Garantire coerenza in tutte le comunicazioni
 * - Evitare problemi di SPF/DKIM usando solo domini verificati
 * 
 * @example "App <no-reply@example.com>"
 */
export const emailFrom = `App <no-reply@${MAILGUN_DOMAIN}>`;
