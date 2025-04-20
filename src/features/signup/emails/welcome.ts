

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