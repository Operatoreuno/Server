import { Request, Response, NextFunction } from "express";
import { UserRole } from "@features/auth/utils/types";
import { ForbiddenException } from "@exceptions/4xx";
import { ErrorCode } from "@errors/error.codes";

/**
 * Factory per middleware di autorizzazione basata su ruoli.
 * Genera un middleware configurato per accettare solo utenti 
 * con il ruolo specificato.
 * 
 * Nota: ogni utente ha un solo ruolo assegnato e ogni endpoint
 * può essere accessibile da un solo tipo di ruolo.
 * 
 * @param allowedRole - Ruolo autorizzato ad accedere alla risorsa
 * @returns Middleware Express che lancia ForbiddenException se il ruolo non è autorizzato
 */
const createRoleMiddleware = (allowedRole: UserRole) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.user?.role;
    
    if (!userRole) {
      throw new ForbiddenException(
        "Accesso negato: Utente non autenticato correttamente", 
        ErrorCode.FORBIDDEN,
      );
    }
    
    // Verifica che il ruolo dell'utente corrisponda a quello consentito
    if (userRole !== allowedRole) {
      throw new ForbiddenException(
        "Accesso negato: Autorizzazione insufficiente per questa risorsa", 
        ErrorCode.FORBIDDEN,
      );
    }
    
    next();
  };
}

/**
 * Middleware preconfigurati per i ruoli principali dell'applicazione.
 * Ogni endpoint sarà accessibile solo da un tipo specifico di utente.
 * 
 * Utilizzo: router.get('/corsi', userAuth, isInstructor(), controller.getCorsi);
 */
export const isInstructor = () => createRoleMiddleware('INSTRUCTOR');
export const isStudent = () => createRoleMiddleware('STUDENT');
