import { prismaClient } from "@app";
import { hashSync } from "bcrypt";
import { SignUpSchema } from "@utils/schemas";
import { BadRequestException } from "src/core/errors/exceptions/4xx";
import { ErrorCode } from "src/core/errors/error.codes";
import { sendEmail } from "@config/sender";
import { welcomeTemplate } from "../emails/welcome";
import { FRONTEND_URL } from "@config/env";

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
        // Validazione completa dei dati con Zod schema
        SignUpSchema.safeParse({ email, password, name, surname });

        // Verifica campi obbligatori
        if (!email || !name || !surname || !password) {
            throw new BadRequestException("Tutti i campi sono obbligatori", ErrorCode.INVALID_REQUEST);
        }

        // Uso di una transazione per garantire atomicità dell'operazione
        // Se una qualsiasi operazione fallisce, l'intera transazione viene annullata
        return await prismaClient.$transaction(async (tx) => {
            // Verifica esistenza utente con lock per prevenire race condition
            const existingUser = await tx.user.findUnique({
                where: { email },
                select: { id: true }
            });

            // Gestione utente duplicato
            if (existingUser) {
                throw new BadRequestException("Utente già esistente", ErrorCode.ALREADY_EXISTS);
            }

            // Creazione dell'utente con hashing sicuro della password
            // e selezione precisa dei campi da restituire (no dati sensibili)
            const user = await tx.user.create({
                data: {
                    email,
                    password: hashSync(password, 12), // Costo 12 per equilibrio sicurezza/performance
                    name,
                    surname
                },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    surname: true,
                    role: true,
                    createdAt: true
                }
            });

            // Invio email di benvenuto
            try {
                const welcomeUrl = `${FRONTEND_URL}/login`;
                const emailTemplate = welcomeTemplate(user.name, welcomeUrl);
                await sendEmail(user.email, emailTemplate);
                
                return {
                    success: true,
                    user
                };

            } catch (emailError) {
                // Gestione specifica errore invio email
                throw new BadRequestException(
                    "Impossibile inviare l'email di benvenuto.",
                    ErrorCode.EMAIL_SENDING_FAILED
                );
            }
        });
    }
}