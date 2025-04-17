import { Request } from 'express';
import { User, Admin } from "@prisma/client";

/**
 * Definizioni dei tipi globali per l'applicazione.
 * 
 * Estende le interfacce standard di Express per supportare:
 * - Proprietà utente autenticato nella request
 * - Proprietà admin autenticato nella request
 * 
 * Questo approccio garantisce type safety quando si accede
 * ai dati dell'utente autenticato nei controller e middleware.
 */
declare global {
    namespace Express {
      /**
       * Entrambe le proprietà utilizzano il type picking per selezionare
       * solo i campi necessari dal modello completo, seguendo il principio
       * del privilegio minimo.
       */
      interface Request {
        admin?: Pick<Admin, 'id' | 'email'>;
        user?: Pick<User, 'id' | 'email' | 'role'>;
      }
    }
  }