/// <reference path="./core/types/global.d.ts" />

import express from "express";
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { setupCsrf, csrfProtection } from '@security/csrf';
import { FRONTEND_URL, PORT } from "@config/env";
import { PrismaClient } from "@prisma/client";
import { errorMiddleware } from "@errors/error.middleware";
import { apiRouter, mobileRouter } from '@core/routes';

const app = express();

app.use(cors({
    origin: FRONTEND_URL,
    credentials: true
  }));

app.use(express.json());
app.use(cookieParser());
app.use(errorMiddleware);
app.use(helmet()); 

// Sistema anti-CSRF
app.use(setupCsrf);
app.use('/api', csrfProtection);

// Rotte Client Web
/**
 * Configurazione avanzata della Content Security Policy
 * Restringe le sorgenti consentite per ogni tipo di risorsa
 * per mitigare XSS e altri attacchi basati su injection
 */
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:"],
    connectSrc: ["'self'"]
  }
}));

// Header X-XSS-Protection per browser legacy
app.use((req, res, next) => {
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Definizione dei namespace API
app.use('/api', apiRouter);
app.use('/mobile', mobileRouter);

// Istanza singleton di Prisma con logging delle query per debug
export const prismaClient = new PrismaClient({log: ['query']})

app.listen(PORT, () => {console.log(`Server Working`);});