import { ErrorCode } from "@errors/error.codes";

/**
 * Classe base per tutte le eccezioni dell'API.
 * Estende la classe nativa Error aggiungendo:
 * - Codice errore personalizzato
 * - Status code HTTP
 * - Stack trace preservato
 */

export class APIException extends Error {
    public readonly errorCode: ErrorCode;
    public readonly statusCode: number;
    public readonly errors?: any[];

    constructor(
        message: string,
        errorCode: ErrorCode,
        statusCode: number,
        errors?: any[]
    ) {
        super(message);
        this.errorCode = errorCode;
        this.statusCode = statusCode;
        this.errors = errors;
        
        // Mantiene lo stack trace per il debugging
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, APIException);
        }
    }
}