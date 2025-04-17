import { APIException } from "@exceptions/api.exception";
import { ErrorCode } from "@errors/error.codes";

/**
 * Eccezioni per errori server-side (5xx)
 * Ora supportano il campo `errors` e `originalError` per debugging
 */

// 500 - Errore generico del server
export class InternalServerError extends APIException {
    constructor(
        message: string,
        errorCode = ErrorCode.INTERNAL_SERVER_ERROR,
        public readonly originalError?: unknown,    
        public readonly errors?: any[]
    ) {
        super(message, errorCode, 500, errors);
    }
}

// 503 - Servizio temporaneamente non disponibile
export class ServiceUnavailable extends APIException {
    constructor(
        message: string,
        errorCode = ErrorCode.SERVICE_UNAVAILABLE,
        public readonly retryAfter?: number,
        public readonly errors?: any[]
    ) {
        super(message, errorCode, 503, errors);
    }
}