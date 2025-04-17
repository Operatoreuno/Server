import { mg, emailFrom } from "@config/mailgun";
import { MAILGUN_DOMAIN } from "@config/env";

/**
 * Modulo per l'invio di email standardizzato.
 * 
 * Fornisce un'interfaccia semplificata per l'invio di email utilizzando Mailgun:
 * - Astrae i dettagli di implementazione del provider email
 * - Standardizza il formato delle email tramite template
 * - Garantisce coerenza nella gestione degli invii
 * 
 * Questo modulo rappresenta uno strato di astrazione che permette
 * di cambiare facilmente provider di email in futuro se necessario.
 */

/**
 * Interfaccia per template email standardizzati.
 * 
 * Definisce la struttura base di un template email con:
 * - Oggetto della email
 * - Versione in testo semplice (per client email che non supportano HTML)
 * - Versione HTML formattata
 * 
 * L'inclusione di entrambi i formati (text e HTML) garantisce
 * massima compatibilità e accessibilità.
 */
interface EmailTemplate {
  subject: string;
  text: string;
  html: string;
}

/**
 * Invia una email utilizzando il servizio configurato.
 * 
 * @description Funzione centralizzata per l'invio di email che:
 * - Utilizza sempre l'indirizzo mittente standardizzato
 * - Accetta template con formato predefinito
 * - Inoltra la richiesta al provider configurato (Mailgun)
 * 
 * @param email - Indirizzo email del destinatario
 * @param template - Template email con oggetto, versione testuale e HTML
 * @returns Promise che si risolve con la risposta dell'API Mailgun
 * @throws Errore in caso di problemi di connessione o invio
 */
export const sendEmail = async (email: string, template: EmailTemplate) => {

  return mg.messages.create(MAILGUN_DOMAIN, {
    from: emailFrom,        
    to: email,              
    subject: template.subject,
    text: template.text,    
    html: template.html     
  });
};