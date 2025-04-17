import { Request, Response } from "express";
import { ManageService } from "./manage.service";
import { ErrorCode } from "src/core/errors/error.codes";
import { BadRequestException } from "src/core/errors/exceptions/4xx";

/**
 * Controller per la gestione degli utenti.
 * 
 * Implementa le operazioni CRUD sugli utenti:
 * 1. Visualizzazione lista utenti (listUsers)
 * 2. Recupero dettagli singolo utente (getUserById)
 * 3. Aggiornamento dati utente (updateUser)
 * 4. Eliminazione utente (deleteUser)
 * 
 * Ogni controller delega la logica di business al ManageService
 * e si occupa solo di gestire la richiesta HTTP e formattare la risposta.
 */

/**
 * Controller per la visualizzazione della lista degli utenti.
 * 
 * @endpoint GET /list-users
 * @description Implementa il flusso di recupero lista utenti:
 * 1. Estrae i parametri di paginazione dalla query
 * 2. Delega al service il recupero dei dati
 * 3. Restituisce la lista di utenti in formato JSON
 * 
 * @securityConsiderations
 * - Protetto da middleware di autenticazione admin
 * - Implementa paginazione per limitare risultati per pagina
 * 
 * @responseFormat JSON con array di oggetti utente
 */
export const listUsers = async (req: Request, res: Response) => {
  // Estrazione parametri di paginazione dalla query
  const skip = req.query.skip ? parseInt(req.query.skip as string) : 0;
  
  // Deleghiamo la logica di business al service
  const users = await ManageService.listUsers(skip);
  
  // Rispondiamo con l'array di utenti in formato JSON
  res.json(users);
}

/**
 * Controller per il recupero di un utente specifico.
 * 
 * @endpoint GET /get-user/:id
 * @description Implementa il flusso di recupero dettagli utente:
 * 1. Estrae l'ID utente dai parametri
 * 2. Delega al service il recupero dei dati
 * 3. Restituisce i dettagli dell'utente in formato JSON
 * 
 * @securityConsiderations
 * - Protetto da middleware di autenticazione admin
 * - Verifica esistenza utente (lato service)
 * 
 * @responseFormat JSON con dettagli utente
 * @throws NotFoundException se l'utente non esiste (gestita lato service)
 */
export const getUserById = async (req: Request, res: Response) => {
  // Estrazione ID utente dai parametri URL
  const userId = Number(req.params.id);
  
  // Deleghiamo la logica di business al service
  const user = await ManageService.getUserById(userId);
  
  // Rispondiamo con i dettagli utente in formato JSON
  res.json(user);
}

/**
 * Controller per l'aggiornamento di un utente.
 * 
 * @endpoint PUT /update-user/:id
 * @description Implementa il flusso di aggiornamento utente:
 * 1. Estrae l'ID utente dai parametri
 * 2. Estrae i dati di aggiornamento dal body
 * 3. Delega al service l'aggiornamento
 * 4. Restituisce i dettagli aggiornati dell'utente
 * 
 * @securityConsiderations
 * - Protetto da middleware di autenticazione admin
 * - Verifica esistenza utente (lato service)
 * - Validazione dati gestita lato service
 * 
 * @responseFormat JSON con dettagli utente aggiornati
 * @throws NotFoundException se l'utente non esiste (gestita lato service)
 */
export const updateUser = async (req: Request, res: Response) => {
  // Estrazione ID utente dai parametri URL
  const userId = Number(req.params.id);
  
  // Estrazione dati di aggiornamento dal body
  const { name, surname, email, password, isActive } = req.body;
  
  // Deleghiamo la logica di business al service
  const user = await ManageService.updateUser(userId, { 
    name, 
    surname, 
    email, 
    password, 
    isActive 
  });
  
  // Rispondiamo con i dettagli utente aggiornati
  res.json(user);
}

/**
 * Controller per l'eliminazione di un utente.
 * 
 * @endpoint DELETE /delete-user/:id
 * @description Implementa il flusso di eliminazione utente:
 * 1. Estrae l'ID utente dai parametri
 * 2. Delega al service l'eliminazione
 * 3. Restituisce una risposta 204 No Content
 * 
 * @securityConsiderations
 * - Protetto da middleware di autenticazione admin
 * - Verifica esistenza utente (lato service)
 * - Risposta senza payload come best practice per DELETE
 * 
 * @responseFormat 204 No Content (nessun payload)
 * @throws NotFoundException se l'utente non esiste (gestita lato service)
 */
export const deleteUser = async (req: Request, res: Response) => {
  // Estrazione ID utente dai parametri URL
  const userId = Number(req.params.id);
  
  // Deleghiamo la logica di business al service
  await ManageService.deleteUser(userId);
  
  // Rispondiamo con status code 204 (No Content) come best practice per DELETE
  res.sendStatus(204);
}
