import { UserService } from "./signup.service";
import { Request, Response } from "express";

/**
 * Controller per la gestione della registrazione utente.
 * 
 * @endpoint POST /signup
 * @description Implementa il flusso di registrazione utente standard:
 * 1. Estrae i dati di input dalla richiesta
 * 2. Delega al service la validazione e creazione dell'account
 * 3. Restituisce i dati dell'utente creato con status 201
 * 
 * @securityConsiderations
 * - Validazione input delegata al service
 * - Nessun dato sensibile restituito nella risposta
 * - Protezione contro duplicati gestita a livello service
 * 
 * @responseFormat JSON con oggetto utente e flag success
 */
export const signup = async (req: Request, res: Response) => {
    const { email, password, name, surname } = req.body;
    
    // Deleghiamo la logica di business al service
    const user = await UserService.signup(email, password, name, surname);
    
    // Rispondiamo con status 201 (Created) e i dati dell'utente
    res.status(201).json(user);  
}