import { APIException } from "@errors/exceptions/api.exception";
import { Request, Response, NextFunction } from "express";

export const errorMiddleware = (error: APIException, req: Request, res: Response, next: NextFunction) => { 
    res.status(error.statusCode).json({
        message: error.message,
        errorCode: error.errorCode,
    });
};