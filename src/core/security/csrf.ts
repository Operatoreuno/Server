import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { ErrorCode } from '@errors/error.codes';
import { BadRequestException } from '@errors/exceptions/4xx';

/**
 * Modulo per la protezione contro attacchi Cross-Site Request Forgery (CSRF).
 * 
 * Implementa una strategia di difesa basata su token sincronizzati:
 * - Generazione di token crittograficamente sicuri
 * - Verifica del token per richieste non sicure (POST, PUT, DELETE)
 * - Pattern "double submit cookie" per validazione
 * 
 * Questa protezione impedisce a siti malevoli di eseguire azioni
 * non autorizzate sfruttando l'autenticazione dell'utente.
 */

/**
 * Genera un token CSRF crittograficamente sicuro.
 * 
 * @description Crea un token di 64 caratteri esadecimali (32 byte)
 * con sufficiente entropia per garantire sicurezza contro:
 * - Attacchi brute-force
 * - Tentativi di predizione
 * - Collision attack
 * 
 * @returns Token CSRF come stringa esadecimale
 */
export const generateCsrfToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Middleware per la verifica del token CSRF.
 * 
 * @description Implementa il pattern "double submit cookie":
 * 1. Confronta il token presente nel cookie con quello nell'header
 * 2. Verifica solo richieste non sicure (POST, PUT, DELETE)
 * 3. Genera errore 400 se i token non corrispondono
 * 
 * Il meccanismo protegge perché:
 * - Il token è accessibile via JavaScript solo dal dominio legittimo
 * - Le richieste da altri domini non possono leggere/impostare il cookie
 * - Solo richieste genuine avranno entrambi i token validi
 * 
 * @param req - Oggetto Request Express
 * @param res - Oggetto Response Express
 * @param next - Funzione NextFunction
 */
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  // Salta la verifica per metodi sicuri (GET, HEAD, OPTIONS)
  // che non comportano modifiche di stato
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Estrazione token dal cookie e dall'header personalizzato
  const cookieToken = req.cookies.csrf_token;
  const headerToken = req.headers['x-csrf-token'] as string;
  
  // Verifica presenza e corrispondenza dei token
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return next(new BadRequestException(
      'Token CSRF mancante o non valido', 
      ErrorCode.INVALID_CSRF_TOKEN
    ));
  }

  next();
}

/**
 * Middleware per la configurazione iniziale CSRF.
 * 
 * @description Imposta il sistema CSRF:
 * 1. Genera un nuovo token se non esiste nei cookie
 * 2. Configura i cookie con impostazioni di sicurezza adeguate
 * 3. Rende disponibile il token per l'inclusione in form/AJAX
 * 
 * Caratteristiche di sicurezza:
 * - Cookie non-httpOnly: necessario per accesso JavaScript
 * - SameSite=strict: previene invio del cookie in richieste cross-origin
 * - Secure: (in produzione) limita ai soli canali HTTPS
 * - Durata limitata: riduce la finestra di vulnerabilità
 * 
 * @param req - Oggetto Request Express
 * @param res - Oggetto Response Express
 * @param next - Funzione NextFunction
 */
export const setupCsrf = (req: Request, res: Response, next: NextFunction) => {
  // Genera un nuovo token solo se non esiste già
  if (!req.cookies.csrf_token) {
    const token = generateCsrfToken();
    
    // Imposta il cookie con opzioni di sicurezza
    res.cookie('csrf_token', token, {
      httpOnly: false,     // Deve essere false per permettere accesso JavaScript    
      secure: false,       // TODO: Cambiare in true in produzione (HTTPS only)
      sameSite: 'strict',  // Previene invio in richieste cross-origin
      maxAge: 24 * 60 * 60 * 1000  // 24 ore di validità
    });
    
    // Rende disponibile il token per template/vista
    res.locals.csrfToken = token;
  } else {
    // Usa il token esistente
    res.locals.csrfToken = req.cookies.csrf_token;
  }
  
  next();
}