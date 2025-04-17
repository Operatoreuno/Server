/**
 * Enumerazione dei codici errore standardizzati.
 * Organizzati in range numerici per categoria:
 */
export enum ErrorCode {
    // Errori di dominio/business (1000-1999)
    NOT_FOUND = 1000,               // Risorsa non trovata
    ALREADY_EXISTS = 1001,          // Risorsa già registrata
    
    // Errori di validazione (2000-2999)
    UNPROCESSABLE_ENTITY = 2001,    // Validazione fallita
    INVALID_PASSWORD = 2002,        // Password non valida
    INVALID_REQUEST = 2003,         // Richiesta malformata
    INVALID_EMAIL = 2004,           // Email non valida
    
    // Errori di sistema/server (3000-3999)
    INTERNAL_SERVER_ERROR = 3001,   // Errore generico server
    EMAIL_SENDING_FAILED = 3002,    // Invio email fallito
    SERVICE_UNAVAILABLE = 3003,     // Servizio non disponibile
    
    // Errori di autenticazione/autorizzazione (4000-4999)
    UNAUTHORIZED = 4001,            // Non autenticato
    INVALID_TOKEN = 4002,           // Token JWT non valido
    REFRESH_TOKEN_EXPIRED = 4003,   // Refresh token scaduto
    REFRESH_TOKEN_REVOKED = 4004,   // Refresh token revocato
    FORBIDDEN = 4005,               // Autorizzazione negata
    INVALID_SESSION = 4006,         // Sessione non valida
    INVALID_CSRF_TOKEN = 4007       // Token CSRF non valido
}