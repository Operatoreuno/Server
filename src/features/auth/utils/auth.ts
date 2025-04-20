import crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import { NextFunction, Request, Response } from "express";
import { AuthConfig, TokenPayload } from "@features/auth/utils/types";
import { adminAuthConfig } from "@features/auth/admin/admin.config";
import { userAuthConfig } from "@features/auth/user/user.config";
import { ErrorCode } from "@errors/error.codes";
import { UnauthorizedException } from "@errors/exceptions/4xx";

/**
 * Middleware avanzato per l'autenticazione nel sistema.
 * 
 * Implementa un sistema di autenticazione completo con:
 * - Pattern di "token rotation" per migliorare la sicurezza
 * - Supporto multi-tenant (utenti e admin)
 * - Rinnovo automatico dei token scaduti
 * - Gestione unificata degli errori di autenticazione
 * 
 * L'architettura segue il pattern di dependency injection tramite
 * interfaccia AuthConfig che permette di estendere facilmente
 * il sistema a diversi tipi di utenti.
 */

/**
 * Estrae il token JWT dall'header di autorizzazione.
 * 
 * @description Analizza l'header Authorization e estrae il token:
 * - Verifica che l'header sia presente
 * - Verifica che il formato sia "Bearer {token}"
 * - Estrae e restituisce solo la parte token
 * 
 * @param req - Oggetto Request Express
 * @returns Il token JWT o null se non trovato/invalido
 */
const extractToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  return authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
};

/**
 * Implementa il pattern "token rotation" per aumentare la sicurezza.
 * 
 * @description Gestisce il rinnovo di token scaduti:
 * 1. Verifica validità del refresh token dai cookie
 * 2. Controlla validità e scadenza nel database
 * 3. Revoca il token usato (one-time use)
 * 4. Genera nuova coppia di token (access + refresh)
 * 5. Aggiorna i cookie e l'header di autenticazione
 * 
 * Questo meccanismo segue le best practice di sicurezza:
 * - Ogni refresh token può essere usato una sola volta (one-time use)
 * - I token revocati non possono essere riutilizzati (mitigazione token theft)
 * - Il refresh token è memorizzato come cookie httpOnly (protezione XSS)
 * - Verifica incrociata tra token e database (protezione replay attack)
 * 
 * @param req - Oggetto Request Express
 * @param res - Oggetto Response Express
 * @param config - Configurazione di autenticazione specifica
 * @returns Payload con ID utente autenticato
 * @throws UnauthorizedException se il refresh token è invalido o scaduto
 */
export const handleTokenRefresh = async (req: Request, res: Response, config: AuthConfig): Promise<TokenPayload> => {
  // Estrazione refresh token dai cookie
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) throw new UnauthorizedException("Missing refresh token", ErrorCode.UNAUTHORIZED);

  // Verifica validità del refresh token e decodifica
  const refreshPayload = jwt.verify(refreshToken, config.refreshSecret) as TokenPayload;
  
  // Verifica esistenza e validità nel database
  const storedToken = await config.findRefreshToken(refreshToken);
  
  // Controlli di sicurezza sul token
  if (!storedToken || storedToken.expiresAt < new Date() || storedToken.revoked) {
    throw new UnauthorizedException("Invalid refresh token", ErrorCode.UNAUTHORIZED);
  }

  // Revoca del token corrente (pattern one-time use)
  await config.revokeRefreshToken(storedToken.id);
  
  // Generazione nuovo ID sessione con UUID v4
  const sessionId = crypto.randomUUID();
  
  // Creazione nuovo refresh token con payload minimale
  const newRefreshToken = jwt.sign({ id: refreshPayload.id }, config.refreshSecret, {
    expiresIn: `${config.refreshDuration}d`
  });
  
  // Creazione nuovo access token
  const newAccessToken = jwt.sign({ id: refreshPayload.id }, config.jwtSecret, {
    expiresIn: "15m"
  });

  // Salvataggio nuovo refresh token nel database
  await config.storeRefreshToken(
    newRefreshToken, 
    refreshPayload.id, 
    sessionId, 
    new Date(Date.now() + config.refreshDuration * 86400000)  // Conversione giorni in millisecondi
  );
  
  // Aggiornamento cookie per il client
  res.cookie("refreshToken", newRefreshToken, {
    httpOnly: true,      // Protezione XSS
    secure: false,       // TODO: Cambiare in true in produzione
    sameSite: "strict",  // Protezione CSRF
    maxAge: config.refreshDuration * 86400000 // Durata in millisecondi
  });

  // Aggiornamento dell'header di autorizzazione per questa richiesta
  req.headers.authorization = `Bearer ${newAccessToken}`;
  return { id: refreshPayload.id };
};

/**
 * Factory di middleware di autenticazione configurabile.
 * 
 * @description Crea un middleware personalizzato in base alla configurazione:
 * 1. Estrae e verifica il token di accesso
 * 2. Segnala quando un token è scaduto (richiedendo l'uso dell'endpoint di refresh)
 * 3. Recupera e aggiunge l'entità autenticata alla request
 * 
 * Implementa le seguenti misure di sicurezza:
 * - Verifica firma e validità JWT
 * - Error code specifico per token scaduti vs. token invalidi
 * - Verifica esistenza entità nel database
 * - Arricchimento sicuro della request con dati autenticati
 * 
 * Caratteristiche del sistema di token:
 * - Token di accesso a breve durata (15 minuti)
 * - Rinnovo esplicito tramite endpoint /refresh dedicato
 * - Pattern "one-time use" per i refresh token
 * - Tracciamento sessioni nel database con possibilità di revoca
 * 
 * @param config - Configurazione specifica per il tipo di entità (user/admin)
 * @returns Middleware Express per l'autenticazione
 */
export const createAuthMiddleware = (config: AuthConfig) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Estrazione token dall'header Authorization
      const token = extractToken(req);
      if (!token) throw new UnauthorizedException("Missing access token", ErrorCode.UNAUTHORIZED);

      let payload: TokenPayload;
      try {
        // Verifica validità del token JWT
        payload = jwt.verify(token, config.jwtSecret) as TokenPayload;
        
        // Rimuoviamo il rinnovo automatico ad ogni chiamata
        // payload = await handleTokenRefresh(req, res, config);
      } catch (error) {
        // Gestione specifica per token scaduti vs. token invalidi
        if (error instanceof jwt.TokenExpiredError) {
          // Non rinnoviamo automaticamente, restituiamo un errore che indica di usare l'endpoint di refresh
          throw new UnauthorizedException("Token scaduto, utilizzare l'endpoint di refresh", ErrorCode.TOKEN_EXPIRED);
        } else {
          // Altre tipologie di errore indicano un token non valido
          throw new UnauthorizedException("Invalid access token", ErrorCode.UNAUTHORIZED);
        }
      }

      // Verifica esistenza dell'entità nel database
      const entity = await config.findEntity(payload.id);
      if (!entity) throw new UnauthorizedException(`${config.entity} not found`, ErrorCode.UNAUTHORIZED);

      // Aggiunge l'entità autenticata alla request per l'accesso nei controller
      config.entity === 'ADMIN' ? req.admin = entity : req.user = entity;
      next();
    } catch (error) {
      // Propagazione dell'errore al middleware di gestione errori
      next(error);
    }
  };
};

/**
 * Middleware pre-configurati pronti all'uso.
 * 
 * adminAuth: Middleware per autenticazione amministratori
 * userAuth: Middleware per autenticazione utenti standard
 * 
 * Entrambi utilizzano lo stesso meccanismo ma con configurazioni 
 * specifiche per tipo di utente (secret, durata token, ecc.).
 */
export const adminAuth = createAuthMiddleware(adminAuthConfig);
export const userAuth = createAuthMiddleware(userAuthConfig);