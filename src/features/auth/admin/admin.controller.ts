import { Request, Response } from "express";
import { AdminService } from "./admin.service";
import { ErrorCode } from "src/core/errors/error.codes";
import { BadRequestException, UnauthorizedException } from "src/core/errors/exceptions/4xx";
import { handleTokenRefresh } from "../utils/auth";
import { adminAuthConfig } from "./admin.config";

/**
 * Controller per il processo di autenticazione degli amministratori.
 * Gestisce il flusso di login, verifica profilo e logout.
 * Implementa il pattern controller-service separando 
 * la gestione delle richieste HTTP dalla logica di business.
 */

/**
 * Login amministratore.
 * @description Gestisce tutto il flusso di autenticazione:
 * 1. Verifica credenziali tramite il service dedicato
 * 2. Configura i cookie sicuri per il refresh token e la sessione
 * 3. Risponde con dati admin e access token per autenticazione successiva
 */
export const adminLogin = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const { admin, accessToken, refreshToken, sessionId } = await AdminService.login(email, password);

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: false,  // TODO: Cambiare in true in produzione
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  res.cookie('sessionId', sessionId, {
    httpOnly: true,
    secure: false,  // TODO: Cambiare in true in produzione
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  res.json({
    admin, token: accessToken, csrfToken: res.locals.csrfToken // Questo viene impostato dal middleware setupCsrf
  });
}

/**
 * Logout amministratore.
 * @description Revoca la sessione corrente dell'admin:
 * 1. Recupera l'ID sessione dal cookie
 * 2. Revoca la sessione tramite il Service
 * 3. Cancella i cookie di autenticazione
 */
export const adminLogout = async (req: Request, res: Response) => {
  const sessionId = req.cookies.sessionId;

  if (!sessionId) {
    throw new BadRequestException("SessionId mancante", ErrorCode.INVALID_REQUEST);
  }

  await AdminService.logout(sessionId, req);

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

  res.sendStatus(204);
};

/**
 * Controller per ottenere i dati dell'admin autenticato.
 * 
 * @endpoint GET /admin/me
 * @description Implementa il flusso di verifica autenticazione:
 * 1. Verifica presenza dell'admin nella request (impostato dal middleware)
 * 2. Restituisce i dati dell'admin autenticato
 * 
 * @securityConsiderations
 * - Protetto da middleware di autenticazione admin
 * 
 * @responseFormat JSON con dati admin
 */
export const adminMe = async (req: Request, res: Response) => {
  // Verifica ulteriore della presenza dell'admin nella request
  if (!req.admin) {
    throw new UnauthorizedException("Admin non autenticato", ErrorCode.UNAUTHORIZED);
  }

  // Risposta con dati admin
  res.json({ admin: req.admin });
}

/**
 * Controller per il refresh esplicito del token admin.
 * 
 * @description Gestisce il rinnovo manuale dei token admin quando l'access token scade:
 * - Utilizza la funzione handleTokenRefresh per generare nuovi token
 * - Restituisce un nuovo access token in risposta
 * 
 * @param req - Oggetto Request Express
 * @param res - Oggetto Response Express
 */
export const adminRefreshToken = async (req: Request, res: Response) => {
  // La funzione handleTokenRefresh si occupa di tutto il processo di rinnovo
  const payload = await handleTokenRefresh(req, res, adminAuthConfig);
  
  // Estraiamo il nuovo token dall'header Authorization appena aggiornato
  const newToken = req.headers.authorization?.split(' ')[1];
  
  res.json({
    success: true,
    token: newToken
  });
};