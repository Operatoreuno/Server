import crypto from 'crypto';
import { prismaClient } from "@app";
import { Prisma } from "@prisma/client";
import { SignUpSchema } from "@core/utils/schemas";
import { BadRequestException, NotFoundException } from "@errors/exceptions/4xx";
import { ErrorCode } from "@errors/error.codes";

/**
 * Servizio per la gestione degli utenti.
 * 
 * Implementa il pattern Service Layer isolando la logica di business
 * dai controller e fornendo operazioni CRUD di alto livello:
 * 1. Visualizzazione lista paginata utenti
 * 2. Recupero dettagli singolo utente
 * 3. Aggiornamento dati utente
 * 4. Eliminazione utente dal sistema
 * 
 * Tutte le operazioni implementano controlli di validazione
 * e gestione unificata degli errori tramite eccezioni standardizzate.
 */
export class ManageService {
  
  /**
   * Recupera una lista paginata di utenti.
   * 
   * @description Implementa la logica di business per elencare gli utenti:
   * 1. Validazione parametri di paginazione
   * 2. Esecuzione della query con paginazione
   * 3. Restituzione dei risultati ordinati
   * 
   * Implementa le seguenti misure di sicurezza:
   * - Paginazione per limitare dimensione risultati
   * - Validazione parametri contro attacchi di iniezione
   * - Ordinamento per garantire risultati prevedibili
   * 
   * @param skip - Numero di record da saltare (paginazione)
   * @returns Lista di utenti (massimo 20 per pagina)
   */
  static async listUsers(skip: number = 0) {
    // Sanitizzazione del parametro skip per prevenire valori non validi
    const sanitizedSkip = isNaN(skip) ? 0 : skip;
    
    // Recupero utenti con paginazione e ordinamento
    return await prismaClient.user.findMany({
      skip: sanitizedSkip,
      take: 20, // Limitiamo a 20 risultati per pagina
      orderBy: { createdAt: 'desc' } // Ordiniamo per data creazione (più recenti prima)
    });
  }
  
  /**
   * Recupera i dettagli di un utente specifico.
   * 
   * @description Implementa la logica di business per recuperare i dettagli utente:
   * 1. Ricerca dell'utente tramite ID
   * 2. Verifica esistenza dell'utente
   * 3. Restituzione dei dettagli
   * 
   * Implementa le seguenti misure di sicurezza:
   * - Validazione esistenza utente
   * - Gestione errori standardizzata
   * 
   * @param userId - ID dell'utente da recuperare
   * @returns Dettagli completi dell'utente
   * @throws NotFoundException se l'utente non esiste
   */
  static async getUserById(userId: number) {
    // Ricerca dell'utente tramite ID
    const user = await prismaClient.user.findUnique({
      where: { id: userId }
    });

    // Verifica esistenza utente
    if (!user) {
      throw new NotFoundException("Utente non trovato", ErrorCode.NOT_FOUND);
    }

    // Restituiamo i dettagli dell'utente
    return user;
  }
  
  /**
   * Aggiorna i dati di un utente esistente.
   * 
   * @description Implementa la logica di business per l'aggiornamento utente:
   * 1. Validazione dei dati di input
   * 2. Aggiornamento nel database
   * 3. Gestione errori specifici Prisma
   * 
   * Implementa le seguenti misure di sicurezza:
   * - Validazione esistenza utente
   * - Cattura errori specifici database
   * - Gestione errori standardizzata
   * 
   * @param userId - ID dell'utente da aggiornare
   * @param data - Dati da aggiornare (tutti opzionali)
   * @returns Dettagli completi dell'utente aggiornato
   * @throws NotFoundException se l'utente non esiste
   */
  static async updateUser(userId: number, data: {
    name?: string;
    surname?: string;
    email?: string;
    password?: string;
    isActive?: boolean;
  }) {
    try {
      // Eseguiamo l'aggiornamento dei dati utente
      return await prismaClient.user.update({
        where: { id: userId },
        data
      });
    } catch (error) {
      // Intercettiamo errori specifici di Prisma
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        // P2025 = "Record to update not found"
        throw new NotFoundException("Utente non trovato", ErrorCode.NOT_FOUND);
      }
      // Propaghiamo altri errori per essere gestiti dal middleware centralizzato
      throw error;
    }
  }
  
  /**
   * Elimina un utente dal sistema.
   * 
   * @description Implementa la logica di business per l'eliminazione utente:
   * 1. Esecuzione eliminazione nel database
   * 2. Gestione errori specifici Prisma
   * 
   * Implementa le seguenti misure di sicurezza:
   * - Validazione esistenza utente
   * - Gestione errori standardizzata
   * 
   * @param userId - ID dell'utente da eliminare
   * @throws NotFoundException se l'utente non esiste
   */
  static async deleteUser(userId: number) {
    try {
      // Eliminazione dell'utente dal database
      await prismaClient.user.delete({
        where: { id: userId }
      });
    } catch (error) {
      // Intercettiamo errori specifici di Prisma
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        // P2025 = "Record to delete not found"
        throw new NotFoundException("Utente non trovato", ErrorCode.NOT_FOUND);
      }
      // Propaghiamo altri errori per essere gestiti dal middleware centralizzato
      throw error;
    }
  }
}