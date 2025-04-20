/// <reference path="./core/types/global.d.ts" />

/**
 * Applicazione principale Express.
 * 
 * Configura il server con:
 * - Middleware di sicurezza (CORS, Helmet, CSRF)
 * - Gestione errori centralizzata
 * - Routing API per client web e mobile
 * - Pulizia automatica delle sessioni
 */

import express from "express";
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { setupCsrf, csrfProtection } from '@security/csrf';
import { FRONTEND_URL, PORT } from "@config/env";
import { PrismaClient } from "@prisma/client";
import { errorMiddleware } from "@errors/error.middleware";
import { apiRouter, mobileRouter } from '@core/routes';
import { sanitizeInput } from '@core/utils/sanitizer';
import { SessionCleanupService } from '@features/auth/utils/session-cleanup';
import { appLogger } from "@logger";

const app = express();

// Configurazione CORS per comunicazione sicura con il frontend
app.use(cors({
    origin: FRONTEND_URL,
    credentials: true
  }));

// Middleware di base per parsing e sicurezza
app.use(express.json());
app.use(cookieParser());
app.use(helmet());

// Middleware di sanitizzazione applicato globalmente a tutte le richieste
// Viene eseguito dopo il parsing del JSON ma prima del routing
app.use(sanitizeInput);

// Middleware di gestione errori centralizzato
app.use(errorMiddleware);

// Sistema anti-CSRF: setup prima della protezione per consentire l'accesso al token
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

/**
 * Istanza singleton di Prisma con logging delle query per debug
 * Centralizza l'accesso al database in tutta l'applicazione
 */
export const prismaClient = new PrismaClient({log: ['query']})

/**
 * Configura lo scheduler per la pulizia automatica delle sessioni
 * Implementa un meccanismo di retry con backoff esponenziale
 */
const scheduleSessionCleanup = () => {
  // Variabili per backoff esponenziale
  const MIN_RETRY_DELAY = 60 * 1000; // 1 minuto
  const MAX_RETRY_DELAY = 24 * 60 * 60 * 1000; // 24 ore
  let retryDelay = MIN_RETRY_DELAY;
  let retryCount = 0;
  let isRunning = false;

  const cleanupTask = async () => {
    // Previene esecuzioni sovrapposte
    if (isRunning) {
      appLogger.info("Pulizia sessioni già in esecuzione, operazione saltata");
      return;
    }
    
    isRunning = true;
    try {
      const result = await SessionCleanupService.runCleanup();
      appLogger.info("Pulizia sessioni completata", result);
      // Reset backoff in caso di successo
      retryDelay = MIN_RETRY_DELAY;
      retryCount = 0;
    } catch (error) {
      retryCount++;
      // Backoff esponenziale con jitter
      retryDelay = Math.min(retryDelay * 2 * (1 + Math.random() * 0.1), MAX_RETRY_DELAY);
      appLogger.error(`Errore durante la pulizia delle sessioni (tentativo ${retryCount})`, error);
    } finally {
      isRunning = false;
    }
  };

  // Esegui subito all'avvio dell'app
  cleanupTask();
  
  // Imposta un intervallo di 72 ore con controllo di errori
  const CLEANUP_INTERVAL = 72 * 60 * 60 * 1000; // 72 ore
  setInterval(cleanupTask, CLEANUP_INTERVAL);
};

// Avvia lo scheduler
scheduleSessionCleanup();

// Gestione dei percorsi non trovati
app.use((req, res) => {
  res.status(404).json({
    message: 'Risorsa non trovata'
  });
});

// Avvio del server sulla porta configurata
app.listen(PORT, () => {
  appLogger.info(`Server in esecuzione sulla porta ${PORT}`);
});