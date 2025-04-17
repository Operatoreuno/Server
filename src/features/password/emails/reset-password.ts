export const resetPasswordTemplate = (name: string, resetPasswordUrl: string) => ({
  subject: 'Reimposta la tua password',
  text: `Ciao ${name},
  Abbiamo ricevuto una richiesta per reimpostare la tua password.
  Clicca sul link qui sotto per crearne una nuova:
  ${resetPasswordUrl}
  Se non hai richiesto questa operazione, puoi ignorare questa email. 
  Grazie, 
  Il team di supporto`,
  
  html: `
    <h2>Ciao ${name},</h2>
    <p>Abbiamo ricevuto una richiesta per reimpostare la tua password.</p>
    <p>
    <a href="${resetPasswordUrl}">Reimposta Password</a>
    </p>
    <p>Se non hai richiesto questa operazione, puoi ignorare questa email.</p>
    <p>Grazie,<br/>Il team di supporto</p>
  `
});