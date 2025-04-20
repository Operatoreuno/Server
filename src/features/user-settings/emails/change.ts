

export const changeEmailTemplate = (name: string) => ({
  subject: 'Cambio email',
  text: `Ciao ${name},
  Abbiamo ricevuto una richiesta per cambiare la tua email.
  Se non hai richiesto questa operazione, contatta immediatamente il supporto. 
  Grazie, 
  Il team di supporto`,
  
  html: `
  <h2>Ciao ${name},</h2>
  <p>Abbiamo ricevuto una richiesta per cambiare la tua email.</p>
  <p>Se non hai richiesto questa operazione, contatta immediatamente il supporto.</p>
  <p>Grazie,<br/>Il team di supporto</p>
  `
});