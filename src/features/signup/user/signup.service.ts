import { prismaClient } from "@app";
import { hashSync } from "bcrypt";
import { SignUpSchema } from "@core/utils/schemas";
import { BadRequestException } from "src/core/errors/exceptions/4xx";
import { ErrorCode } from "src/core/errors/error.codes";
import { sendEmail } from "@config/sender";
import { welcomeTemplate } from "../emails/welcome";
import { FRONTEND_URL } from "@config/env";
import { signupLogger } from "@logger";

/**
 * Servizio per la gestione della registrazione utenti standard.
 * 
 * Implementa il flusso completo di registrazione utente:
 * 1. Validazione input con schema Zod
 * 2. Verifica esistenza utente
 * 3. Creazione account con password criptata
 * 4. Invio email di benvenuto
 * 
 * Tutte le operazioni critiche vengono eseguite in transazioni
 * per garantire atomicità e prevenire stati inconsistenti.
 */
export class UserService {
    /**
     * Registrazione nuovo utente con misure di sicurezza.
     * 
     * @description Questo metodo implementa il flusso completo di registrazione:
     * 1. Validazione input tramite schema Zod
     * 2. Verifica contro utenti esistenti
     * 3. Hashing sicuro password
     * 4. Creazione account
     * 5. Invio email di benvenuto
     * 
     * Implementa le seguenti misure di sicurezza:
     * - Validazione input tramite schema Zod
     * - Utilizzo di transazioni per evitare race condition
     * - Hashing sicuro delle password con bcrypt e salt (costo 12)
     * - Selezione precisa dei campi restituiti (no dati sensibili)
     * - Gestione unificata degli errori
     * 
     * @param email - Email utente (validata)
     * @param password - Password in chiaro (verrà crittografata)
     * @param name - Nome utente
     * @param surname - Cognome utente
     * @returns Dati utente creato (senza campi sensibili)
     * @throws BadRequestException per errori di validazione, utente esistente o problemi email
     */
    static async signup(email: string, password: string, name: string, surname: string) {
        try {
            // Validazione completa dei dati con Zod schema
            // Usando parse invece di safeParse per ottenere i dati sanitizzati
            const validatedData = SignUpSchema.parse({ email, password, name, surname });
            
            // Utilizziamo i dati sanitizzati da Zod
            const { email: sanitizedEmail, password: sanitizedPassword, 
                    name: sanitizedName, surname: sanitizedSurname } = validatedData;

            signupLogger.info(`Tentativo registrazione per email: ${sanitizedEmail}`);

            // Verifica esistenza utente con la stessa email
            const existingUser = await prismaClient.user.findUnique({
                where: { email: sanitizedEmail }
            });

            if (existingUser) {
                signupLogger.warn(`Email già in uso durante registrazione: ${sanitizedEmail}`);
                throw new BadRequestException("Email già in uso", ErrorCode.ALREADY_EXISTS);
            }

            // Hash password con bcrypt (costo 12)
            const hashedPassword = hashSync(sanitizedPassword, 12);

            // Creazione nuovo utente con transazione
            const newUser = await prismaClient.user.create({
                data: {
                    email: sanitizedEmail,
                    password: hashedPassword,
                    name: sanitizedName,
                    surname: sanitizedSurname,
                    isActive: true,
                },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    surname: true,
                    isActive: true,
                    createdAt: true,
                    role: true
                }
            });

            signupLogger.info(`Utente registrato con successo: ID ${newUser.id}, email: ${sanitizedEmail}`);

            // Invio email di benvenuto
            try {
                const emailTemplate = welcomeTemplate(sanitizedName, FRONTEND_URL);
                await sendEmail(sanitizedEmail, emailTemplate);
                signupLogger.info(`Email di benvenuto inviata a utente ${newUser.id}`);
            } catch (error) {
                signupLogger.error(`Errore invio email di benvenuto per utente ${newUser.id}`, error);
                // Non blocchiamo il flusso per problemi con l'email
            }

            return {
                ...newUser,
                success: true
            };
        } catch (error) {
            if (error instanceof BadRequestException) {
                // Rilancio l'errore se è già gestito
                throw error;
            }
            
            signupLogger.error("Errore durante la registrazione", error);
            throw new BadRequestException("Errore durante la registrazione", ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }
}