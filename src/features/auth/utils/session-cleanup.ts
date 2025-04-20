import { prismaClient } from "@app";
import { authLogger } from "@logger";

/**
 * Servizio per la gestione automatica delle sessioni utente.
 * 
 * Implementa meccanismi di pulizia e manutenzione delle sessioni:
 * - Invalidazione automatica delle sessioni inattive (30 giorni)
 * - Rimozione token scaduti dal database
 * - Monitoraggio delle sessioni attive
 * 
 * Il sistema è progettato per essere eseguito periodicamente
 * tramite job scheduler o all'avvio dell'applicazione.
 */
export class SessionCleanupService {
    /**
     * Rimuove le sessioni inattive per oltre 30 giorni.
     * 
     * @description Implementa la pulizia delle sessioni:
     * 1. Identifica gli utenti inattivi da oltre 30 giorni
     * 2. Trova tutte le sessioni appartenenti a questi utenti
     * 3. Revoca i refresh token corrispondenti
     * 
     * @returns Numero di sessioni revocate
     */
    static async cleanupInactiveSessions(): Promise<number> {
        try {
            // Data di 30 giorni fa
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            // Trova utenti inattivi (lastLogin più vecchio di 30 giorni)
            const inactiveUsers = await prismaClient.user.findMany({
                where: {
                    lastLogin: {
                        lt: thirtyDaysAgo
                    }
                },
                select: {
                    id: true
                }
            });
            
            if (inactiveUsers.length === 0) {
                authLogger.info("Nessun utente inattivo trovato");
                return 0;
            }
            
            // Estrai solo gli ID degli utenti inattivi
            const inactiveUserIds = inactiveUsers.map(user => user.id);
            
            // Revoca tutti i refresh token degli utenti inattivi
            const { count } = await prismaClient.userRefreshToken.updateMany({
                where: {
                    userId: {
                        in: inactiveUserIds
                    },
                    revoked: false
                },
                data: {
                    revoked: true
                }
            });
            
            authLogger.info(`Revocate ${count} sessioni di utenti inattivi`);
            return count;
        } catch (error) {
            authLogger.error("Errore durante la pulizia delle sessioni inattive", error);
            throw error;
        }
    }
    
    /**
     * Rimuove i token scaduti dal database.
     * 
     * @description Elimina i token che sono già scaduti:
     * 1. Identifica tutti i token con data di scadenza superata
     * 2. Rimuove i record dal database per mantenere dimensioni ottimali
     * 
     * @returns Numero di token eliminati
     */
    static async cleanupExpiredTokens(): Promise<number> {
        try {
            // Elimina token già scaduti
            const { count } = await prismaClient.userRefreshToken.deleteMany({
                where: {
                    expiresAt: {
                        lt: new Date()
                    }
                }
            });
            
            authLogger.info(`Eliminati ${count} token scaduti`);
            return count;
        } catch (error) {
            authLogger.error("Errore durante la pulizia dei token scaduti", error);
            throw error;
        }
    }
    
    /**
     * Esegue entrambe le procedure di pulizia.
     * 
     * @description Esegue in sequenza:
     * 1. Pulizia sessioni inattive
     * 2. Rimozione token scaduti
     * 
     * @returns Oggetto con conteggio delle operazioni effettuate
     */
    static async runCleanup(): Promise<{ inactiveSessions: number, expiredTokens: number }> {
        const inactiveSessions = await this.cleanupInactiveSessions();
        const expiredTokens = await this.cleanupExpiredTokens();
        
        return {
            inactiveSessions,
            expiredTokens
        };
    }
} 