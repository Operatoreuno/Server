import { PasswordService } from "@features/password/password.service";
import { Request, Response } from "express";

/**
 * Controller per la gestione delle operazioni relative alle password.
 * 
 * Implementa tre endpoint principali:
 * 1. Avvio procedura di recupero password (forgotPassword)
 * 2. Completamento reset password con token (setPassword)
 * 3. Cambio password per utenti autenticati (updatePassword)
 * 
 * Ogni controller delega la logica di business al PasswordService
 * e si occupa solo di gestire la richiesta HTTP e formattare la risposta.
 */

/**
 * Avvio procedura di recupero password.
 * 
 * @endpoint POST /password/forgot
 * @description Implementa il primo step del flusso "password dimenticata":
 * 1. Riceve l'email da parte dell'utente
 * 2. Delega al service la generazione del token e l'invio email
 * 3. Risponde sempre con successo (status 200) per evitare enumeration attack
 * 
 * @securityConsiderations Non rivela mai se l'email è registrata o meno
 * @responseFormat JSON con messaggio standard
 */
export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;
  
  // Deleghiamo tutta la logica di business al service
  await PasswordService.forgotPassword(email);
  
  // Risposta standardizzata per evitare enumeration attack
  res.status(200).json({ message: "Se l'account esiste, riceverai un'email con le istruzioni" });
}
  
/**
 * Completamento procedura di reimpostazione password.
 * 
 * @endpoint POST /password/reset
 * @description Secondo step del flusso di recupero:
 * 1. Riceve il token (inviato via email) e la nuova password
 * 2. Delega al service la verifica del token e l'aggiornamento
 * 3. Conferma l'avvenuto reset con status 200
 * 
 * @securityConsiderations Il token è verificato lato service per validità e scadenza
 * @responseFormat JSON con messaggio di conferma
 */
export const setPassword = async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;
  
  // Deleghiamo al service la verifica del token e l'impostazione della nuova password
  await PasswordService.setPassword(token, newPassword);
  
  // Conferma operazione completata con successo
  res.status(200).json({ message: "Password reimpostata con successo" });
}

/**
 * Aggiornamento password utente autenticato.
 * 
 * @endpoint POST /password/update
 * @description Permette all'utente di cambiare la propria password:
 * 1. Verifica la vecchia password (lato service)
 * 2. Aggiorna con la nuova password (lato service)
 * 3. Invalida tutte le sessioni attive (lato service)
 * 4. Cancella i cookie di autenticazione (lato controller)
 * 
 * @securityConsiderations 
 * - Richiede autenticazione (gestita da middleware auth)
 * - Revoca automaticamente tutte le sessioni
 * - Cancella i cookie HTTP-only di autenticazione
 * 
 * @responseFormat JSON con messaggio di conferma e flag sessionTerminated
 */
export const updatePassword = async (req: Request, res: Response) => {
  const { oldPassword, newPassword } = req.body;
  
  // Deleghiamo al service la verifica e l'aggiornamento della password
  await PasswordService.updatePassword(req, oldPassword, newPassword);

  // Cancelliamo il cookie di refresh token
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: false,  // TODO: Cambiare in true in produzione
    sameSite: 'strict'
  });

  // Cancelliamo il cookie di sessione
  res.clearCookie('sessionId', {
    httpOnly: true,
    secure: false,  // TODO: Cambiare in true in produzione
    sameSite: 'strict'
  });
  
  // Indichiamo che la sessione è stata terminata per permettere al client
  // di reindirizzare l'utente alla pagina di login
  res.status(200).json({ 
    message: "Password aggiornata con successo. Effettua nuovamente l'accesso.",
    sessionTerminated: true
  });
}
  
