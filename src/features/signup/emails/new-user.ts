

/**
 * Template per il messaggio di benvenuto per un nuovo utente.
 * 
 * @param name - Nome dell'utente
 * @param welcomeUrl - URL per accedere al sistema
 * @returns Template per il messaggio di benvenuto
 * 
 * @description
 * Questo template viene utilizzato per inviare un messaggio di benvenuto a un nuovo utente creato da un admin.
 * Il messaggio include un link per impostare una password e accedere al sistema.
 */
export const newUserTemplate = (name: string, welcomeUrl: string) => ({
  subject: 'Benvenuto nella nostra piattaforma!',
  text: `Ciao ${name},
  Benvenuto nella nostra community! Siamo felici di averti con noi.
  Un admin ha creato un account per te, per iniziare, clicca sul link qui sotto e crea una password per accedere al tuo account:
  ${welcomeUrl}
  Grazie, 
  Il team di supporto`,
  
  html: `
    <h2>Ciao ${name},</h2>
    <p>Benvenuto nella nostra community! Siamo felici di averti con noi.</p>
    <p>Un admin ha creato un account per te, per iniziare, clicca sul link qui sotto e crea una password per accedere al tuo account:</p>
    <a href="${welcomeUrl}">Crea password</a>
    <p>Grazie,<br/>Il team di supporto</p>
  `
});