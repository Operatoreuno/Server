import { Request, Response, NextFunction } from "express";
import { UserRole } from "@features/auth/types";
import { ForbiddenException } from "@exceptions/4xx";
import { ErrorCode } from "@errors/error.codes";

/**
 * Factory per middleware di autorizzazione basata su ruoli.
 * Genera un middleware configurato per accettare solo utenti 
 * con uno o più ruoli specifici.
 * 
 * @param allowedRoles - Ruolo singolo
 * @returns Middleware Express che lancia ForbiddenException se il ruolo non è autorizzato
 */
const createRoleMiddleware = (allowedRoles: UserRole) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.user?.role;
    
    if (!userRole) {
      throw new ForbiddenException(
        "Accesso negato: Utente non autenticato correttamente", 
        ErrorCode.FORBIDDEN,
      );
    }
    next();
  };
}

/**
 * Middleware preconfigurati per i ruoli principali dell'applicazione.
 * Utilizzo: router.get('/corsi', userAuth, isInstructor(), controller.getCorsi);
 */
export const isInstructor = () => createRoleMiddleware('INSTRUCTOR');
export const isStudent = () => createRoleMiddleware('STUDENT');
