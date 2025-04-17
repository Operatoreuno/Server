
/**
 * Template per il messaggio di cambio email.
 * 
 * @param name - Nome dell'utente
 * @returns Template per il messaggio di cambio email
 * 
 * @description
 * Questo template viene utilizzato per informare l'utente che la sua email è stata cambiata.
 */
export const changeEmailTemplate = (name: string) => ({
  subject: 'Cambio email',
  text: `Ciao ${name},
  Questa email è stata generata automaticamente dal sistema per informarti che la tua email è stata cambiata.
  Se non hai richiesto questa operazione, contatta immediatamente il supporto. 
  Grazie, 
  Il team di supporto`,
  
  html: `
  <h2>Ciao ${name},</h2>
  <p>Questa email è stata generata automaticamente dal sistema per informarti che la tua email è stata cambiata.</p>
  <p>Se non hai richiesto questa operazione, contatta immediatamente il supporto.</p>
  <p>Grazie,<br/>Il team di supporto</p>
  `
});