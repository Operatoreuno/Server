import { prismaClient } from "@app";
import { ErrorCode } from "@errors/error.codes";
import { BadRequestException, ForbiddenException, UnauthorizedException } from "@errors/exceptions/4xx";
import { EmailSchema, PasswordSchema } from "@utils/schemas";
import crypto from "crypto";
import { compare, hashSync } from "bcrypt";
import { sendEmail } from "@config/sender";
import { resetPasswordTemplate } from "./emails/reset-password";
import { FRONTEND_URL } from "@config/env";

/**
 * Servizio per la gestione delle operazioni relative alle password.
 * Implementa tre flussi principali:
 * 1. Recupero password dimenticata (richiesta token via email)
 * 2. Reset password tramite token
 * 3. Cambio password per utenti autenticati
 * 
 * Tutte le operazioni critiche utilizzano transazioni per garantire
 * l'atomicità e prevenire stati inconsistenti del database.
 */

export class PasswordService {

  /**
   * Avvia il processo di recupero password generando un token
   * e inviando un'email all'utente.
   * 
   * Implementa le seguenti misure di sicurezza:
   * - Validazione formato email tramite Zod
   * - Protezione contro enumeration attack (risposta uniforme)
   * - Limitazione frequenza richieste (max 1 ogni 5 minuti)
   * - Token crittograficamente sicuro (64 byte random)
   * - Scadenza token automatica (1 ora)
   * 
   * @param email - Email dell'utente che richiede il reset
   * @returns Oggetto con stato operazione e messaggio standard
   * @throws BadRequestException per errori di validazione o invio email
   */
    static async forgotPassword(email: string) {
        // Validazione formato email con Zod schema
        const emailValidation = EmailSchema.safeParse({ email });
        if (!emailValidation.success) {
            throw new BadRequestException(
                "Formato email non valido", 
                ErrorCode.INVALID_EMAIL, 
                emailValidation.error.errors
            );
        }

        // Verifica esistenza utente nel database
        const user = await prismaClient.user.findFirst({
            where: { email },
            select: {
                id: true,
                email: true,
                name: true,
                resetToken: true,
                resetTokenExpiry: true
            }
        });

        // Importante: per prevenire enumeration attack, rispondiamo sempre con successo
        // anche se l'utente non esiste nel database
        if (!user) {
            return { success: true, message: "Se l'account esiste, riceverai un'email con le istruzioni" };
        }

        // Limitazione frequenza: verifica se esiste già una richiesta recente (ultimi 5 minuti)
        const recentRequest = user.resetTokenExpiry && user.resetTokenExpiry > new Date(Date.now() - 5 * 60 * 1000);
        if (recentRequest) {
            // Evitiamo di inviare troppe email, ma rispondiamo ugualmente con successo
            // Questo previene potenziali attacchi DoS tramite richieste multiple
            return { success: true, message: "Se l'account esiste, riceverai un'email con le istruzioni" };
        }

        // Generazione token crittograficamente sicuro (64 byte = 128 caratteri hex)
        const resetToken = crypto.randomBytes(64).toString('hex');
        const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 ora di validità

        // Salvataggio token nel database con scadenza
        await prismaClient.user.update({
            where: { id: user.id },
            data: {
                resetToken,
                resetTokenExpiry
            }
        });

        // Invio email
        try {
            const resetPasswordUrl = `${FRONTEND_URL}/reset-password?token=${resetToken}`;
            const emailTemplate = resetPasswordTemplate(user.name, resetPasswordUrl);
            await sendEmail(user.email, emailTemplate);
            return {
                success: true,
                message: "Se l'account esiste, riceverai un'email con le istruzioni"
            };
        } catch (emailError) {
            // In caso di errore nell'invio dell'email, annulliamo il token
            // per evitare stati inconsistenti e problemi di sicurezza
            await prismaClient.user.update({
                where: { id: user.id },
                data: {
                    resetToken: null,
                    resetTokenExpiry: null
                }
            });

            // Lanciamo un'eccezione specifica per problemi di invio email
            throw new BadRequestException(
                "Impossibile inviare l'email di reset. Riprova più tardi.",
                ErrorCode.EMAIL_SENDING_FAILED
            );
        }
    }


    /**
     * Completa il flusso di reset password verificando il token e impostando la nuova password.
     * 
     * Implementa le seguenti misure di sicurezza:
     * - Verifica presenza e validità del token
     * - Controllo scadenza token (max 1 ora)
     * - Validazione requisiti password tramite Zod
     * - Hash sicuro della password con bcrypt (costo 12)
     * - Transazione atomica per garantire coerenza dei dati
     * - Revoca automatica di tutte le sessioni attive dell'utente
     * 
     * @param token - Token univoco di reset inviato via email
     * @param newPassword - Nuova password da impostare
     * @returns Oggetto con stato operazione e messaggio di conferma
     * @throws BadRequestException per token invalido, scaduto o password non conforme
     */
    static async setPassword(token: string, newPassword: string) {
        // Verifica presenza token
        if (!token) {
            throw new BadRequestException("Token obbligatorio", ErrorCode.INVALID_TOKEN);
        }

        // Validazione requisiti sicurezza password
        const passwordValidation = PasswordSchema.safeParse(newPassword);
        if (!passwordValidation.success) {
            throw new BadRequestException(
                "La password non rispetta i requisiti di sicurezza", 
                ErrorCode.INVALID_PASSWORD, 
                passwordValidation.error.errors
            );
        }

        // Utilizziamo una transazione per garantire atomicità dell'operazione
        // Se una qualsiasi operazione fallisce, l'intera transazione viene annullata
        return await prismaClient.$transaction(async (tx) => {
            // Cerchiamo l'utente con il token valido e non scaduto
            const user = await tx.user.findFirst({
                where: {
                    resetToken: token,
                    resetTokenExpiry: {gt: new Date()} // Verifica che il token non sia scaduto
                },
                select: {
                    id: true,
                }
            });

            // Gestione token non valido o scaduto
            if (!user) {
                throw new BadRequestException("Token non valido o scaduto", ErrorCode.INVALID_TOKEN);
            }

            // Hash della password con bcrypt, fattore di costo 12
            const hashedPassword = hashSync(newPassword, 12);

            // Aggiorniamo la password e annulliamo il token di reset in un'unica operazione
            // per evitare riutilizzo del token
            await tx.user.update({
                where: { id: user.id },
                data: {
                    password: hashedPassword,
                    resetToken: null,
                    resetTokenExpiry: null
                }
            });

            // Misura di sicurezza: revochiamo tutte le sessioni attive dell'utente
            // Questo forza il logout su tutti i dispositivi dopo il reset della password
            await tx.userRefreshToken.updateMany({
                where: {
                    userId: user.id,
                    revoked: false
                },
                data: { revoked: true }
            });
            
            return { success: true, message: "Password impostata con successo" };
        });
    }


    /**
     * Aggiorna la password dell'utente autenticato, verificando prima la vecchia password.
     * 
     * Implementa le seguenti misure di sicurezza:
     * - Verifica autenticazione utente
     * - Controllo presenza parametri obbligatori
     * - Validazione requisiti nuova password tramite Zod
     * - Verifica correttezza vecchia password (previene modifiche non autorizzate)
     * - Hash sicuro della nuova password con bcrypt (costo 12)
     * - Transazione atomica per garantire coerenza dei dati
     * - Revoca automatica di tutte le sessioni attive (forzatura logout)
     * 
     * @param req - Richiesta Express con i dati dell'utente autenticato
     * @param oldPassword - Password attuale per verifica
     * @param newPassword - Nuova password da impostare
     * @returns Oggetto con stato operazione e messaggio di conferma
     * @throws BadRequestException | UnauthorizedException | ForbiddenException 
     */
    static async updatePassword(req: Express.Request, oldPassword: string, newPassword: string) {
        // Verifica che l'utente sia autenticato
        if (!req.user?.id) {
            throw new ForbiddenException("Accesso negato: utente non autenticato", ErrorCode.FORBIDDEN);
        }

        // Controllo presenza parametri obbligatori
        if (!oldPassword || !newPassword) {
            throw new BadRequestException("Vecchia e nuova password obbligatorie", ErrorCode.INVALID_REQUEST);
        }

        // Validazione requisiti sicurezza della nuova password
        const passwordValidation = PasswordSchema.safeParse(newPassword);
        if (!passwordValidation.success) {
            throw new BadRequestException(
                "La nuova password non rispetta i requisiti di sicurezza", 
                ErrorCode.INVALID_PASSWORD, 
                passwordValidation.error.errors
            );
        }

        const userId = req.user.id;

        // Utilizziamo una transazione per garantire atomicità dell'operazione
        return await prismaClient.$transaction(async (tx) => {
            // Recupero dati utente, necessario per la verifica della vecchia password
            const user = await tx.user.findUnique({
                where: { id: userId },
            });

            // Verifica esistenza utente nel database
            if (!user) {
                throw new BadRequestException("Utente non trovato", ErrorCode.NOT_FOUND);
            }

            // Verifica correttezza della vecchia password usando bcrypt.compare
            // che è resistente a timing attack durante il confronto
            const isPasswordValid = await compare(oldPassword, user.password);
            if (!isPasswordValid) {
                throw new UnauthorizedException("Vecchia password non valida", ErrorCode.UNAUTHORIZED);
            }

            // Hash della nuova password con bcrypt, fattore di costo 12
            const hashedPassword = hashSync(newPassword, 12);
            
            // Aggiornamento password nel database
            await tx.user.update({
                where: { id: userId },
                data: { password: hashedPassword },
            });

            // Misura di sicurezza: revochiamo tutte le sessioni attive dell'utente
            // Questo forza il logout su tutti i dispositivi dopo il cambio password
            await tx.userRefreshToken.updateMany({
                where: { 
                    userId: userId,
                    revoked: false
                },
                data: { revoked: true }
            });

            return {
                success: true,
                message: "Password aggiornata con successo. Effettua nuovamente il login.",
            };
        });
    }
}

