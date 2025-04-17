
/**
 * Template per il messaggio di benvenuto per un nuovo utente.
 * 
 * @param name - Nome dell'utente
 * @param welcomeUrl - URL per accedere al sistema
 * @returns Template per il messaggio di benvenuto
 * 
 * @description
 * Questo template viene utilizzato per inviare un messaggio di benvenuto a un nuovo utente.
 * Il messaggio include un link per accedere al sistema.
 */
export const welcomeTemplate = (name: string, welcomeUrl: string) => ({
  subject: 'Benvenuto nella nostra piattaforma!',
  text: `Ciao ${name}, 
  Benvenuto nella nostra community! Siamo felici di averti con noi.
  Per iniziare, clicca sul link qui sotto per accedere al tuo account:
  ${welcomeUrl}
  Se hai bisogno di assistenza, rispondi pure a questa email.
  A presto,
  Il team di supporto`,
  
  html: `
    <h2>Ciao ${name},</h2>
    <p>Benvenuto nella nostra community! Siamo felici di averti con noi.</p>
    <p>
      <a href="${welcomeUrl}">Accedi al tuo account</a>
    </p>
    <p>Se hai bisogno di assistenza, rispondi pure a questa email.</p>
    <p>A presto,<br/>Il team di supporto</p>
  `
});