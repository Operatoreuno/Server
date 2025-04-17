import { AdminService } from "./signup-user.service";
import { Request, Response } from "express";

/**
 * Controller per la gestione della creazione utenti da parte di amministratori.
 * 
 * @endpoint POST /admin/signup-user
 * @description Implementa il flusso di creazione account da admin:
 * 1. Estrae i dati di input dalla richiesta
 * 2. Delega al service la validazione e creazione dell'account
 * 3. Restituisce i dati dell'utente creato con status 201
 * 
 * @securityConsiderations
 * - Protetto da middleware di autenticazione admin
 * - Validazione input delegata al service
 * - Creazione di password temporanea automatica
 * - Invio email con token sicuro per primo accesso
 * 
 * @responseFormat JSON con oggetto utente e flag success
 */
export const signupUser = async (req: Request, res: Response) => {
    const { email, name, surname, role } = req.body;
    
    // Deleghiamo la logica di business al service
    const user = await AdminService.signup(email, name, surname, role);
    
    // Rispondiamo con status 201 (Created) e i dati dell'utente
    res.status(201).json(user);
}