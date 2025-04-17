import rateLimit from "express-rate-limit";

/**
 * Modulo per la protezione contro attacchi bruteforce e DoS.
 * 
 * Implementa limiti di frequenza per endpoint sensibili come:
 * - Login (3 tentativi ogni 30 minuti)
 * - Recupero password (2 tentativi ogni 15 minuti)
 * 
 * Ogni limitatore utilizza espressivamente un intervallo di tempo
 * e un numero massimo di richieste consentite in tale intervallo.
 */

/**
 * Factory function per creare limitatori di frequenza personalizzati.
 * 
 * @description Crea un middleware express-rate-limit configurato con:
 * - Finestra temporale personalizzabile
 * - Numero massimo di richieste personalizzabile
 * - Messaggio di errore personalizzabile
 * - Header standard RFC per comunicare i limiti al client
 * 
 * @param windowMS - Finestra temporale in millisecondi
 * @param max - Numero massimo di richieste nella finestra
 * @param message - Messaggio di errore da mostrare
 * @returns Middleware configurato per il rate limiting
 */
const Limiter = (windowMS: number, max: number, message: string) => {
    return rateLimit({
        windowMs: windowMS,        // Periodo di tempo da considerare
        max: max,                  // Numero massimo di richieste
        message: message,          // Messaggio di errore per l'utente
        standardHeaders: true,     // Header Rate-Limit-* conformi a RFC
        legacyHeaders: false,      // Disabilita header obsoleti X-RateLimit-*
    });
};

/**
 * Limitatore per endpoint di login.
 * 
 * Consente solo 3 tentativi ogni 30 minuti per indirizzo IP,
 * proteggendo contro attacchi brute force alle credenziali.
 */
export const loginLimiter = Limiter(
    30 * 60 * 1000,                // 30 minuti
    3,                             // 3 tentativi
    "Troppi tentativi. Attendere 30 minuti."
);

/**
 * Limitatore per endpoint di recupero password.
 * 
 * Consente solo 2 richieste ogni 15 minuti per indirizzo IP,
 * proteggendo contro abusi e spam di email di recupero.
 */
export const forgotPasswordLimiter = Limiter(
    15 * 60 * 1000,                // 15 minuti
    2,                             // 2 tentativi
    "Troppi tentativi. Attendere 15 minuti."
);

