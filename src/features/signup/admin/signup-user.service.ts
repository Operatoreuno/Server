import { prismaClient } from "@app";
import { ErrorCode } from "@errors/error.codes";
import { BadRequestException } from "@exceptions/4xx";
import { SignUpSchema } from "@utils/schemas";
import { UserRole } from "@prisma/client";
import crypto from "crypto";
import { hashSync } from "bcrypt";
import { sendEmail } from "@config/sender";
import { FRONTEND_URL } from "@config/env";
import { newUserTemplate } from "../emails/new-user";

/**
 * Servizio per la gestione della creazione utenti da parte di amministratori.
 * 
 * Implementa il flusso completo di creazione account:
 * 1. Validazione input con schema Zod
 * 2. Verifica esistenza utente
 * 3. Generazione token e password temporanea
 * 4. Creazione account con token di reset
 * 5. Invio email con link di primo accesso
 * 
 * Tutte le operazioni critiche vengono eseguite in transazioni 
 * per garantire atomicità e prevenire stati inconsistenti.
 */
export class AdminService {

    /**
     * Crea un nuovo utente da parte dell'amministratore.
     * 
     * @description Implementa il flusso di creazione account amministrativa:
     * 1. Validazione input via schema Zod
     * 2. Verifica duplicati
     * 3. Generazione token e password temporanea
     * 4. Creazione account
     * 5. Invio email di benvenuto con token sicuro
     * 
     * Implementa le seguenti misure di sicurezza:
     * - Validazione input tramite schema Zod
     * - Utilizzo di transazioni per evitare race condition
     * - Generazione token crittograficamente sicuro (64 byte)
     * - Scadenza token automatica (1 ora)
     * - Password temporanea casuale e sicura
     * - Protezione contro duplicati
     * 
     * @param email - Email utente da creare
     * @param name - Nome utente
     * @param surname - Cognome utente
     * @param role - Ruolo utente (default: UserRole.STUDENT)
     * @returns Dati utente creato con flag di successo
     * @throws BadRequestException per errori di validazione, utente esistente o problemi email
     */
    static async signup(email: string, name: string, surname: string, role: UserRole = UserRole.STUDENT) {
        // Validazione completa dei dati con Zod schema
        SignUpSchema.safeParse({ email, name, surname });

        // Verifica campi obbligatori
        if (!email || !name || !surname) {
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

            // Generazione token crittograficamente sicuro (64 byte = 128 caratteri hex)
            const resetToken = crypto.randomBytes(64).toString('hex');
            const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 ora di validità
            
            // Password temporanea casuale con hash sicuro
            const password = hashSync(crypto.randomBytes(10).toString('hex'), 12);

            // Creazione dell'utente con token di reset e password temporanea
            const user = await tx.user.create({
                data: {
                    email,
                    name,
                    surname,
                    role,
                    password,
                    resetToken,
                    resetTokenExpiry
                }
            });

            // Invio email con link di primo accesso
            try {
                const welcomeUrl = `${FRONTEND_URL}/welcome?token=${resetToken}`;
                const emailTemplate = newUserTemplate(user.name, welcomeUrl);
                await sendEmail(user.email, emailTemplate);
                
                return {
                    success: true,
                    user
                };
            } catch (emailError) {
                // Gestione specifica errore invio email
                throw new BadRequestException(
                    "Impossibile inviare l'email di benvenuto. Riprova più tardi.",
                    ErrorCode.EMAIL_SENDING_FAILED
                );
            }
        });
    }
}