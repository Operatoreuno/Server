import { NextFunction, Request, Response } from "express";

/**
 * Middleware per la sanitizzazione degli input HTTP.
 * 
 * Implementa la sanitizzazione centralizzata dei dati in ingresso:
 * - Viene eseguita prima dei controller
 * - Normalizza i dati comuni (email, stringhe, ecc.)
 * - Previene attacchi d'iniezione sanitizzando gli input
 * 
 * @param req - Richiesta Express
 * @param res - Risposta Express
 * @param next - Funzione next per continuare il ciclo delle richieste
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  // Funzione che applica sanitizzazione ricorsiva agli oggetti
  const sanitizeObject = (obj: any): any => {
    if (!obj || typeof obj !== 'object') return obj;
    
    // Gestiamo array e oggetti in modo ricorsivo
    if (Array.isArray(obj)) {
      return obj.map(item => sanitizeObject(item));
    }
    
    // Sanitizziamo le proprietà dell'oggetto
    const sanitized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      // Sanitizzazione ricorsiva per oggetti annidati
      if (value && typeof value === 'object') {
        sanitized[key] = sanitizeObject(value);
        continue;
      }
      
      // Sanitizzazione delle stringhe
      if (typeof value === 'string') {
        // Email: converti in minuscolo e trim
        if (key.toLowerCase().includes('email')) {
          sanitized[key] = value.trim().toLowerCase();
        }
        // Password: solo trim (mantiene la distinzione maiuscole/minuscole)
        else if (key.toLowerCase().includes('password')) {
          sanitized[key] = value.trim();
        }
        // Altre stringhe: trim per rimuovere spazi inutili
        else {
          sanitized[key] = value.trim();
        }
      } else {
        // Valori non-stringa rimangono invariati
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  };
  
  // Applica sanitizzazione a body, query e params
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  
  // Per query, sanitizza i valori senza riassegnare l'oggetto completo
  if (req.query && typeof req.query === 'object') {
    // Crea un oggetto sanitizzato con i valori di query
    const sanitizedQuery = sanitizeObject(req.query);
    
    // Pulisci le proprietà esistenti in query (senza riassegnare l'oggetto)
    Object.keys(req.query).forEach(key => {
      if (key in sanitizedQuery) {
        (req.query as any)[key] = sanitizedQuery[key];
      }
    });
  }
  
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params);
  }
  
  next();
}; 