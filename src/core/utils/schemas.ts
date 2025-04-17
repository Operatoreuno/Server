import { z } from "zod";

/**
 * Modulo per la definizione degli schemi di validazione.
 * 
 * Implementa schemi centralizzati utilizzando Zod per:
 * - Validazione input lato server
 * - Tipizzazione sicura con TypeScript
 * - Messaggi di errore localizzati in italiano
 * 
 * Ogni schema implementa requisiti specifici di sicurezza e business
 * ed è riutilizzato in tutto il codebase per garantire coerenza.
 */

/**
 * Schema di validazione per password.
 * 
 * Requisiti di sicurezza:
 * - Minimo 8 caratteri
 * - Almeno una lettera maiuscola
 * - Almeno un numero
 * 
 * @usage Validazione durante login, registrazione e cambio password
 */
export const PasswordSchema = z.string()
  .min(8, "La password deve avere almeno 8 caratteri")
  .regex(/[A-Z]/, "La password deve contenere almeno una maiuscola")
  .regex(/[0-9]/, "La password deve contenere almeno un numero");

/**
 * Schema di validazione per email.
 * 
 * Utilizza la validazione email incorporata di Zod che include:
 * - Verifica formato standard RFC
 * - Controllo presenza @ e dominio
 * 
 * @usage Validazione durante login, registrazione e cambio email
 */
export const EmailSchema = z.string().email("Email non valida");

/**
 * Schema completo per la registrazione utente.
 * 
 * Combina:
 * - Validazione email
 * - Validazione password
 * - Validazione nome (min 2 caratteri)
 * - Validazione cognome (min 2 caratteri)
 * 
 * @usage Validazione durante registrazione o creazione utenti
 */
export const SignUpSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  name: z.string().min(2, "Il nome deve essere almeno 2 caratteri"),
  surname: z.string().min(2, "Il cognome deve essere almeno 2 caratteri"),
});

/**
 * Schema per autenticazione.
 * 
 * Combina:
 * - Validazione email
 * - Validazione password
 * 
 * @usage Validazione durante login e verifica credenziali
 */
export const LoginSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
});