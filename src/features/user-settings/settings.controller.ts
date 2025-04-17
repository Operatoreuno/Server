import { Request, Response } from "express";
import { SettingsService } from "./settings.service";
import { BadRequestException, UnauthorizedException } from "@errors/exceptions/4xx";
import { ErrorCode } from "@errors/error.codes";

/**
 * Controller per la gestione delle impostazioni dell'utente.
 * 
 * Implementa i seguenti endpoint:
 * 1. Aggiornamento email utente (updateEmail)
 * (Altri endpoint saranno implementati in futuro)
 * 
 * Ogni controller delega la logica di business al SettingsService
 * e si occupa solo di gestire la richiesta HTTP e formattare la risposta.
 */

/**
 * Controller per l'aggiornamento dell'email dell'utente.
 * 
 * @endpoint POST /settings/email
 * @description Gestisce la richiesta di modifica email:
 * 1. Estrae e valida i dati di input
 * 2. Verifica l'autenticazione dell'utente (tramite middleware auth)
 * 3. Delega la logica di business al service dedicato
 * 4. Invalida i cookie di autenticazione
 * 5. Restituisce la risposta al client
 * 
 * @securityConsiderations 
 * - Richiede autenticazione (gestita da middleware auth)
 * - Revoca automaticamente tutte le sessioni
 * - Cancella i cookie HTTP-only di autenticazione
 * 
 * @responseFormat JSON con messaggio di conferma e flag sessionTerminated
 */
export const updateEmail = async (req: Request, res: Response) => {
  const { newEmail, password } = req.body;

  // Deleghiamo tutta la logica di business al service
  await SettingsService.updateEmail(req, newEmail, password);

  // Revochiamo la sessione invalidando i cookie
  // Cancelliamo il cookie di refresh token
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: false, // TODO: Cambiare in true in produzione
    sameSite: 'strict'
  });

  // Cancelliamo il cookie di sessione
  res.clearCookie('sessionId', {
    httpOnly: true,
    secure: false, // TODO: Cambiare in true in produzione
    sameSite: 'strict'
  });
  
  // Indichiamo che la sessione è stata terminata per permettere al client
  // di reindirizzare l'utente alla pagina di login
  res.status(200).json({ 
    message: "Email cambiata con successo. Effettua nuovamente l'accesso.",
    sessionTerminated: true
  });
}
