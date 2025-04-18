import { prismaClient } from "@app";
import { compare } from "bcrypt";
import { EmailSchema } from "@utils/schemas";
import { BadRequestException, UnauthorizedException } from "@errors/exceptions/4xx";
import { ErrorCode } from "@errors/error.codes";
import { sendEmail } from "@config/sender";
import { changeEmailTemplate } from "./emails/change";

// Interface per i risultati dei servizi
export interface ServiceResult {
  success: boolean;
  statusCode?: number;
  message?: string;
  error?: string;
}

/**
 * Servizio per la gestione delle impostazioni dell'utente.
 * Implementa il pattern Service Layer isolando la logica di business
 * dai controller e fornendo operazioni di alto livello.
 * 
 * Flussi supportati:
 * 1. Aggiornamento email con verifica sicurezza
 * (Altri flussi da implementare in futuro)
 * 
 * Tutte le operazioni critiche utilizzano validazione dei dati
 * e controlli di sicurezza per garantire l'integrità dei dati.
 */
export class SettingsService {

  /**
   * Aggiorna l'email dell'utente.
   * 
   * @description Implementa la logica di business per l'aggiornamento email:
   * 1. Validazione del formato email
   * 2. Verifica dell'esistenza dell'utente
   * 3. Verifica della password
   * 4. Controllo della disponibilità della nuova email
   * 5. Aggiornamento dell'email
   * 6. Invio di notifica via email
   * 
   * Implementa le seguenti misure di sicurezza:
   * - Verifica dell'identità tramite password
   * - Validazione formato email con Zod schema
   * - Controllo duplicate per prevenire conflitti
   * - Notifica di sicurezza via email
   * 
   * @param req - Oggetto Request Express con dati utente autenticato
   * @param newEmail - Nuova email da impostare
   * @param password - Password per conferma dell'identità
   * @returns Oggetto ServiceResult con esito operazione
   * @throws UnauthorizedException per utente non autenticato o password errata
   * @throws BadRequestException per errori di validazione, email già in uso o problemi di invio
   */
  static async updateEmail(req: Express.Request, newEmail: string, password: string) {

    // Verifica che l'utente sia autenticato e che l'ID sia presente
    if (!req.user?.id) {
      throw new UnauthorizedException("Utente non autenticato", ErrorCode.UNAUTHORIZED);
    }

    // Verifica che tutti i parametri richiesti siano presenti
    if (!newEmail || !password) {
      throw new BadRequestException("Email e password obbligatorie", ErrorCode.INVALID_REQUEST);
    }

    // Validazione formato email con Zod schema
    const emailValidation = EmailSchema.safeParse(newEmail);
    if (!emailValidation.success) {
      throw new BadRequestException(
        "Formato email non valido",
        ErrorCode.INVALID_EMAIL,
        emailValidation.error.errors
      );
    }

    const userId = req.user.id;

    // Ricerca dell'utente nel database
    const user = await prismaClient.user.findUnique({
      where: { id: userId },
    });

    // Verifica esistenza utente nel database
    if (!user) {
      throw new BadRequestException("Utente non trovato", ErrorCode.NOT_FOUND);
    }

    // Verifica della password come misura di sicurezza
    // per confermare l'identità dell'utente
    const isPasswordValid = await compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException("Password non valida", ErrorCode.INVALID_PASSWORD);
    }

    // Controllo se la nuova email è identica a quella attuale
    // per evitare operazioni inutili sul database
    if (newEmail === user.email) {
      throw new BadRequestException("Non puoi usare la stessa email", ErrorCode.INVALID_EMAIL);
    }

    // Controllo se l'email è già in uso da altro utente
    // per prevenire duplicati e conflitti
    const existingUser = await prismaClient.user.findUnique({
      where: { email: newEmail },
      select: { id: true, name: true, email: true }
    });

    if (existingUser) {
      throw new BadRequestException("Email già in uso", ErrorCode.ALREADY_EXISTS);
    }

    // Aggiornamento dell'email nel database
    await prismaClient.user.update({
      where: { id: userId },
      data: { email: newEmail },
    });

    // Invio notifica email come misura di sicurezza
    // per informare l'utente del cambio avvenuto
    try {
      const emailTemplate = changeEmailTemplate(user.name);
      await sendEmail(user.email, emailTemplate);
      return {
        success: true,
        message: "Email cambiata con successo!"
      };
    } catch (emailError) {
      // Lanciamo un'eccezione specifica per problemi di invio email
      // mantenendo traccia del tipo di errore
      throw new BadRequestException(
        "Impossibile inviare l'email di cambio email. Riprova più tardi.",
        ErrorCode.EMAIL_SENDING_FAILED
      );
    }
  }
}