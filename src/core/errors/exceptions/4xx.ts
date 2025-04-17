import { APIException } from "@exceptions/api.exception";
import { ErrorCode } from "@errors/error.codes";

/**
 * Eccezioni HTTP standard (4xx) per gestire errori client-side
 * Tutte estendono APIException con status code appropriato
 */

// 400 - Richiesta malformata
export class BadRequestException extends APIException {
    constructor(
        message: string, 
        errorCode = ErrorCode.INVALID_REQUEST,
        public readonly errors?: any[] 
    ) {
        super(message, errorCode, 400, errors);
    }
}

// 401 - Non autenticato
export class UnauthorizedException extends APIException {
    constructor(
        message: string, 
        errorCode = ErrorCode.UNAUTHORIZED,
        public readonly errors?: any[]
    ) {
        super(message, errorCode, 401, errors);
    }
}

// 403 - Autorizzazione negata
export class ForbiddenException extends APIException {
    constructor(
        message: string, 
        errorCode = ErrorCode.FORBIDDEN,
        public readonly errors?: any[]
    ) {
        super(message, errorCode, 403, errors);
    }
}

// 404 - Risorsa non trovata
export class NotFoundException extends APIException {
    constructor(
        message: string, 
        errorCode = ErrorCode.NOT_FOUND,
        public readonly errors?: any[]
    ) {
        super(message, errorCode, 404, errors);
    }
}

// 422 - Validazione fallita (specializzata per errori strutturati)
export class UnprocessableEntity extends APIException {
    constructor(
        message: string, 
        public readonly errors: any[], 
        errorCode = ErrorCode.UNPROCESSABLE_ENTITY
    ) {
        super(message, errorCode, 422, errors); 
    }
}

// 409 - Conflitto
export class ConflictException extends APIException {
    constructor(
        message: string, 
        errorCode = ErrorCode.ALREADY_EXISTS,
        public readonly errors?: any[]
    ) {
        super(message, errorCode, 409, errors);
    }
}