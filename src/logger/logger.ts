/**
 * Sistema di logging centralizzato per l'applicazione.
 * 
 * Implementa un logger configurabile basato su Pino con:
 * - Supporto per transport multipli
 * - Formattazione personalizzata
 * - Supporto per log strutturati
 * 
 * Questo modulo fornisce un'interfaccia unificata per i log
 * in tutta l'applicazione, facilitando il debugging e il monitoraggio.
 */

import pino from 'pino';

/**
 * Configurazione del transport per i log.
 * Utilizza pino.transport per configurare la destinazione
 * dei log su file con rotazione.
 */
const transport = pino.transport({
  target: 'pino/file',
  options: {
    destination: './logs/app.log',
    mkdir: true,
    interval: '1d',     // ruota ogni giorno
    size: '10m',        // o quando il file raggiunge 10 MB
    rotate: true,
    maxFiles: 7         // conserva max 7 file ruotati
  }
});

/**
 * Istanza del logger configurata per produzione.
 * Offre metodi standard per logging a livello info e superiori
 * e supporta il context nesting tramite child loggers.
 */
export const logger = pino(
  {
    level: 'info',
    timestamp: pino.stdTimeFunctions.isoTime
  },
  transport
); 