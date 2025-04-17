import { Request, Response } from "express";
import { AdminService } from "./admin.service";
import { ErrorCode } from "src/core/errors/error.codes";
import { BadRequestException, UnauthorizedException } from "src/core/errors/exceptions/4xx";

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
 * Endpoint protetto per ottenere i dati dell'admin corrente.
 * @description Questo endpoint richiede autenticazione tramite il middleware adminAuth
 * che inserisce i dati dell'admin in req.admin. Controlliamo nuovamente per sicurezza.
 */
export const adminMe = async (req: Request, res: Response) => {
  if (!req.admin) {
    throw new UnauthorizedException("Admin non autenticato", ErrorCode.UNAUTHORIZED);
  }
  res.json({ admin: req.admin });
}