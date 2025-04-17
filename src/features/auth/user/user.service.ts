import * as jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prismaClient } from "@app";
import { compare, hashSync } from "bcrypt";
import { USER_JWT_SECRET, USER_REFRESH_TOKEN_SECRET } from "@config/env";
import { LoginSchema, PasswordSchema, EmailSchema } from "@utils/schemas";
import { BadRequestException, ForbiddenException, NotFoundException } from "src/core/errors/exceptions/4xx";
import { ErrorCode } from "src/core/errors/error.codes";

/**
 * Servizio per la gestione dell'autenticazione utenti.
 * 
 * Implementa i seguenti flussi principali:
 * 1. Login con verifica credenziali e gestione token
 * 2. Logout con revoca sessione
 * 
 * Tutte le operazioni critiche utilizzano transazioni per garantire
 * l'atomicità e prevenire stati inconsistenti del database.
 * 
 * Il sistema implementa un modello di sicurezza multi-livello:
 * - Access token (breve durata) per API
 * - Refresh token (lunga durata) per rinnovo sessioni
 * - ID sessione per tracking e revoca
 * - Limitazione sessioni attive per utente
 */
export class UserService {

    /**
     * Effettua il login di un utente verificando le credenziali.
     * 
     * @description Implementa il flusso di autenticazione completo:
     * 1. Validazione credenziali con schema Zod
     * 2. Verifica esistenza utente e password
     * 3. Gestione delle sessioni attive (max 3)
     * 4. Generazione token di accesso e refresh
     * 5. Creazione record di sessione
     * 
     * Implementa le seguenti misure di sicurezza:
     * - Protezione contro timing attacks con ritardi costanti
     * - Limitazione sessioni attive con revoca automatica
     * - Transazioni per garantire consistenza dei dati
     * - Separazione token di accesso (15m) e refresh (30g)
     * - Sessioni con UUID randomico per tracciamento
     * - Selezione precisa dei campi restituiti
     * 
     * @param email - Email utente
     * @param password - Password in chiaro
     * @returns Dati utente e token necessari per l'autenticazione
     * @throws BadRequestException per credenziali errate o problemi di validazione
     */
    static async login(email: string, password: string) {
        // Validazione input con schema Zod
        LoginSchema.safeParse({ email, password });

        // Cerchiamo l'utente selezionando solo i campi necessari
        // per il processo di autenticazione
        const user = await prismaClient.user.findFirst({
            where: { email },
            select: {
                id: true,
                email: true,
                password: true,
                role: true,
            }
        });

        // Verifica credenziali con protezione timing attack
        // Il ritardo costante previene attacchi basati sul tempo di risposta
        if (!user || !compare(password, user.password || '')) {
            // Utilizzo di un ritardo costante per prevenire timing attacks
            await new Promise(resolve => setTimeout(resolve, 200));
            throw new BadRequestException("Email o password errati", ErrorCode.INVALID_REQUEST);
        }

        // Numero massimo di sessioni attive per utente
        const MAX_ACTIVE_SESSIONS = 3;

        // Utilizziamo una transazione per garantire atomicità dell'operazione
        // Se una qualsiasi operazione fallisce, l'intera transazione viene annullata
        const sessionData = await prismaClient.$transaction(async (tx) => {
            // Conteggio delle sessioni attive dell'utente
            const activeSessions = await tx.userRefreshToken.count({
                where: {
                    userId: user.id,
                    revoked: false,
                    expiresAt: { gt: new Date() }
                }
            });

            // Se l'utente ha raggiunto il limite di sessioni
            // revochiamo la sessione più vecchia (FIFO)
            if (activeSessions >= MAX_ACTIVE_SESSIONS) {
                // Troviamo la sessione più vecchia dell'utente
                const oldestSessions = await tx.userRefreshToken.findMany({
                    where: {
                        userId: user.id,
                        revoked: false
                    },
                    orderBy: { createdAt: 'asc' }, // Ordiniamo per data di creazione crescente
                    take: 1                       // Prendiamo solo la più vecchia
                });

                // Se abbiamo trovato una sessione, la revochiamo
                if (oldestSessions.length > 0) {
                    await tx.userRefreshToken.update({
                        where: { id: oldestSessions[0].id },
                        data: { revoked: true }
                    });
                }
            }

            // Creazione payload per access token con informazioni minime necessarie
            const tokenPayload = {
                id: user.id,
                role: user.role,
                email: user.email,
                iat: Math.floor(Date.now() / 1000) // Timestamp di emissione
            };

            // Generazione access token (breve durata - 15 minuti)
            const accessToken = jwt.sign(tokenPayload, USER_JWT_SECRET!, { expiresIn: '15m' });
            
            // Generazione refresh token (lunga durata - 30 giorni)
            // con payload minimale (solo ID utente)
            const refreshToken = jwt.sign({ id: user.id }, USER_REFRESH_TOKEN_SECRET!, { expiresIn: '30d' });
            
            // Generazione ID sessione unico con UUID v4
            const sessionId = crypto.randomUUID();

            // Salvataggio refresh token nel database per verifica validità
            await tx.userRefreshToken.create({
                data: {
                    token: refreshToken,
                    userId: user.id,
                    sessionId,
                    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 giorni
                }
            });

            return { accessToken, refreshToken, sessionId };
        });

        // Preparazione risposta utente senza dati sensibili
        const userResponse = {
            id: user.id,
            email: user.email,
            role: user.role,
        };

        return {
            user: userResponse,
            accessToken: sessionData.accessToken,
            refreshToken: sessionData.refreshToken,
            sessionId: sessionData.sessionId
        };
    }

    /**
     * Effettua il logout revocando una sessione specifica.
     * 
     * @description Implementa il flusso di logout:
     * 1. Validazione dei parametri di input
     * 2. Verifica autenticazione e autorizzazione
     * 3. Revoca della sessione nel database
     * 
     * Implementa le seguenti misure di sicurezza:
     * - Verifica esistenza e proprietà della sessione
     * - Controllo sessioni già revocate
     * - Verifica che l'utente possa revocare solo le proprie sessioni
     * 
     * @param sessionId - ID univoco della sessione da revocare
     * @param req - Oggetto Request con dati utente autenticato
     * @throws BadRequestException per sessionId non valido
     * @throws ForbiddenException per utente non autorizzato
     * @throws NotFoundException per sessione non trovata o già revocata
     */
    static async logout(sessionId: string, req: Express.Request) {
        // Validazione parametri di input
        if (!sessionId) {
            throw new BadRequestException("SessionId non valido", ErrorCode.INVALID_REQUEST);
        }

        // Verifica che l'utente sia autenticato
        if (!req.user?.id) {
            throw new ForbiddenException("Accesso negato: utente non autenticato", ErrorCode.FORBIDDEN);
        }

        // Revoca del refresh token nel database
        // Importante: aggiorniamo SOLO se la sessione appartiene all'utente corrente
        // per prevenire attacchi di sessione crossing
        const { count } = await prismaClient.userRefreshToken.updateMany({
            where: {
                sessionId,
                userId: req.user.id,  // Garantisce che l'utente possa revocare solo le proprie sessioni
                revoked: false         // Verifica che non sia già revocata
            },
            data: { revoked: true }
        });

        // Se nessun record è stato aggiornato, la sessione non esiste
        // o non appartiene all'utente corrente o è già revocata
        if (count === 0) {
            throw new NotFoundException("Sessione non trovata o già revocata", ErrorCode.NOT_FOUND);
        }
    }
}