import { z } from "zod";

/**
 * Modulo per la definizione degli schemi di validazione.
 * 
 * Implementa schemi centralizzati utilizzando Zod per:
 * - Validazione input lato server
 * - Tipizzazione sicura con TypeScript
 * - Messaggi di errore localizzati in italiano
 * - Sanitizzazione automatica degli input
 * 
 * Ogni schema implementa requisiti specifici di sicurezza e business
 * ed è riutilizzato in tutto il codebase per garantire coerenza.
 */

/**
 * Trasformazioni per la sanitizzazione degli input.
 * Funzioni da applicare agli schemi per normalizzare i dati in ingresso.
 */
const sanitize = {
  // Rimuove spazi all'inizio e alla fine della stringa
  trim: () => z.string().trim(),
  
  // Converte in minuscolo per normalizzazione
  lowercase: () => z.string().toLowerCase(),
  
  // Combina trim e lowercase per email
  email: () => z.string().trim().toLowerCase(),
};

/**
 * Schema di validazione per password.
 * 
 * Requisiti di sicurezza:
 * - Minimo 8 caratteri
 * - Almeno una lettera maiuscola
 * - Almeno una lettera minuscola
 * - Almeno un numero
 * - Nessuno spazio
 * 
 * @usage Validazione durante login, registrazione e cambio password
 */
export const PasswordSchema = sanitize.trim()
  .min(8, "La password deve avere almeno 8 caratteri")
  .regex(/[A-Z]/, "La password deve contenere almeno una maiuscola")
  .regex(/[a-z]/, "La password deve contenere almeno una minuscola")
  .regex(/[0-9]/, "La password deve contenere almeno un numero")
  .refine(password => !/\s/.test(password), {
    message: "La password non può contenere spazi"
  });

/**
 * Schema di validazione per email.
 * 
 * Utilizza la validazione email incorporata di Zod che include:
 * - Verifica formato standard RFC
 * - Controllo presenza @ e dominio
 * - Sanitizzazione automatica (trim e lowercase)
 * 
 * @usage Validazione durante login, registrazione e cambio email
 */
export const EmailSchema = sanitize.email().email("Email non valida");

/**
 * Schema completo per la registrazione utente.
 * 
 * Combina:
 * - Validazione email con sanitizzazione
 * - Validazione password con sanitizzazione
 * - Validazione nome (min 2 caratteri) con sanitizzazione
 * - Validazione cognome (min 2 caratteri) con sanitizzazione
 * 
 * @usage Validazione durante registrazione o creazione utenti
 */
export const SignUpSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  name: sanitize.trim().min(2, "Il nome deve essere almeno 2 caratteri"),
  surname: sanitize.trim().min(2, "Il cognome deve essere almeno 2 caratteri"),
});

/**
 * Schema per autenticazione.
 * 
 * Combina:
 * - Validazione email con sanitizzazione
 * - Validazione password con sanitizzazione
 * 
 * @usage Validazione durante login e verifica credenziali
 */
export const LoginSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
});