import { ErrorCode } from "src/core/errors/error.codes";
import { UserService } from "./user.service";
import { Request, Response } from "express";
import { UnauthorizedException, BadRequestException } from "src/core/errors/exceptions/4xx";
import { handleTokenRefresh } from "../utils/auth";
import { userAuthConfig } from "./user.config";

/**
 * Controller per la gestione dell'autenticazione utenti.
 * 
 * Implementa i seguenti endpoint:
 * 1. Login con creazione token (userLogin)
 * 2. Verifica utente autenticato (userMe)
 * 3. Logout con revoca sessione (userLogout)
 * 4. Refresh token (refreshToken)
 * 
 * Ogni controller delega la logica di business al UserService
 * e si occupa solo di gestire la richiesta HTTP e formattare la risposta.
 */

/**
 * Controller per il login utente.
 * 
 * @endpoint POST /login
 * @description Implementa il flusso di login:
 * 1. Estrae credenziali dalla richiesta
 * 2. Delega al service la verifica e generazione token
 * 3. Configura cookie sicuri per refresh token e sessione
 * 4. Restituisce dati utente e token di accesso
 * 
 * @securityConsiderations
 * - Protetto da rate limiting per prevenire attacchi brute force
 * - Cookie HttpOnly per il refresh token contro XSS
 * - Cookie sameSite strict per prevenire CSRF
 * - Token CSRF per protezione aggiuntiva
 * 
 * @responseFormat JSON con dati utente, token e CSRF token
 */
export const userLogin = async (req: Request, res: Response) => {
  // Estrazione credenziali dal body
  const { email, password } = req.body;

  // Deleghiamo la logica di business al service
  const { user, accessToken, refreshToken, sessionId } = await UserService.login(email, password);

  // Cookie per il refresh token con protezioni di sicurezza
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,           // Non accessibile da JavaScript (protezione XSS)
    secure: false,            // TODO: Cambiare in true in produzione
    sameSite: 'strict',       // Previene CSRF
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 giorni
  });

  // Cookie per il sessionId con protezioni simili
  res.cookie('sessionId', sessionId, {
    httpOnly: true,
    secure: false,            // TODO: Cambiare in true in produzione
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 giorni
  });

  // Invia la risposta con token di accesso e CSRF token
  res.json({
    user,
    token: accessToken,
    csrfToken: res.locals.csrfToken // Impostato dal middleware setupCsrf
  });
}

/**
 * Controller per il logout utente.
 * 
 * @endpoint POST /logout
 * @description Implementa il flusso di logout:
 * 1. Estrae sessionId dai cookie
 * 2. Delega al service la revoca della sessione
 * 3. Rimuove i cookie di autenticazione
 * 4. Conferma l'operazione con risposta 204
 * 
 * @securityConsiderations
 * - Revoca sessione nel database (non solo client-side)
 * - Rimozione completa dei cookie lato client
 * - Protetto da middleware di autenticazione
 * 
 * @responseFormat 204 No Content
 */
export const userLogout = async (req: Request, res: Response) => {
  // Estrazione sessionId dai cookie
  const sessionId = req.cookies.sessionId;

  // Verifica presenza del sessionId
  if (!sessionId) {
    throw new BadRequestException("SessionId mancante", ErrorCode.INVALID_REQUEST);
  }

  // Deleghiamo la logica di business al service
  await UserService.logout(req, sessionId);

  // Rimuoviamo i cookie di autenticazione
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: false,  // TODO: Cambiare in true in produzione
    sameSite: 'strict'
  });

  res.clearCookie('sessionId', {
    httpOnly: true,
    secure: false,  // TODO: Cambiare in true in produzione
    sameSite: 'strict'
  });

  // Rispondiamo con status 204 (No Content) come best practice
  res.sendStatus(204);
}

/**
 * Controller per ottenere i dati dell'utente autenticato.
 * 
 * @endpoint GET /me
 * @description Implementa il flusso di verifica autenticazione:
 * 1. Verifica presenza dell'utente nella request (impostato dal middleware)
 * 2. Restituisce i dati dell'utente autenticato
 * 
 * @securityConsiderations
 * - Protetto da middleware di autenticazione
 * - Doppia verifica della presenza dell'utente
 * 
 * @responseFormat JSON con dati utente
 */
export const userMe = async (req: Request, res: Response) => {
  // Verifica ulteriore della presenza dell'utente nella request
  if (!req.user) {
    throw new UnauthorizedException("User non autenticato", ErrorCode.UNAUTHORIZED);
  }
  // Deleghiamo l'aggiornamento al service
  await UserService.lastLogin(req);
  res.json({ user: req.user });
}

/**
 * Controller per il refresh esplicito del token.
 * 
 * @description Gestisce il rinnovo manuale dei token quando l'access token scade:
 * - Utilizza la funzione handleTokenRefresh per generare nuovi token
 * - Restituisce un nuovo access token in risposta
 * 
 * @param req - Oggetto Request Express
 * @param res - Oggetto Response Express
 */
export const refreshToken = async (req: Request, res: Response) => {
  // La funzione handleTokenRefresh si occupa di tutto il processo di rinnovo
  const payload = await handleTokenRefresh(req, res, userAuthConfig);
  
  // Estraiamo il nuovo token dall'header Authorization appena aggiornato
  const newToken = req.headers.authorization?.split(' ')[1];
  
  res.json({
    success: true,
    token: newToken
  });
};