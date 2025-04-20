export const newUserTemplate = (name: string, welcomeUrl: string) => ({
  subject: 'Benvenuto nella nostra piattaforma!',
  text: `Ciao ${name},
  Benvenuto nella nostra community! Siamo felici di averti con noi.
  Per iniziare, clicca sul link qui sotto per impostare una password e accedere al tuo account:
  ${welcomeUrl}
  Grazie, 
  Il team di supporto`,
  
  html: `
    <h2>Ciao ${name},</h2>
    <p>Benvenuto nella nostra community! Siamo felici di averti con noi.</p>
    <p>
    <a href="${welcomeUrl}">Accedi al tuo account</a>
    </p>
    <p>Grazie,<br/>Il team di supporto</p>
  `
});