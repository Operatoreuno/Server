import { ZodError } from "zod";
import { NextFunction, Request, Response } from "express";
import { APIException } from "@errors/exceptions/api.exception";
import { ErrorCode } from "@errors/error.codes";
import { InternalServerError } from "@errors/exceptions/5xx";
import { BadRequestException } from "@errors/exceptions/4xx";

/**
 * Higher-order function che avvolge i controller per centralizzare la gestione degli errori.
 * Implementa il pattern Controller-Service con gestione errori centralizzata.
 * 
 * Vantaggi:
 * - Evita duplicazione di blocchi try/catch in ogni controller
 * - Standardizza la traduzione di errori specifici in risposte HTTP
 * - Permette la registrazione degli errori in un unico punto
 * 
 * @param method - Funzione controller da proteggere
 * @returns Middleware Express che cattura errori e li passa al middleware successivo
 */
export const errorHandler = (method: Function) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            await method(req, res, next);
        } catch (error) {
            // Trasforma gli errori in APIException standardizzate
            const exception = error instanceof APIException ? error
                : error instanceof ZodError 
                    ? new BadRequestException('Dati non validi', ErrorCode.UNPROCESSABLE_ENTITY)
                    : new InternalServerError('Errore del server', ErrorCode.INTERNAL_SERVER_ERROR);
            
            next(exception);
        }
    };
};