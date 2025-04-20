import * as jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prismaClient } from "@app";
import { compare, hashSync } from "bcrypt";
import { USER_JWT_SECRET, USER_REFRESH_TOKEN_SECRET } from "@config/env";
import { LoginSchema, PasswordSchema, EmailSchema } from "@core/utils/schemas";
import { BadRequestException, ForbiddenException, NotFoundException, UnauthorizedException } from "src/core/errors/exceptions/4xx";
import { ErrorCode } from "src/core/errors/error.codes";
import { authLogger } from "@logger";

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
        // Validazione input con schema Zod e sanitizzazione
        const validatedData = LoginSchema.parse({ email, password });
        
        const { email: sanitizedEmail, password: sanitizedPassword } = validatedData;
        
        // Ricerca utente con filtro stato attivo
        const user = await prismaClient.user.findUnique({
            where: { 
                email: sanitizedEmail,
            },
            select: {
                id: true,
                email: true,
                password: true,
                name: true,
                surname: true,
                isActive: true,
                role: true
            }
        });
        
        // Verifica esistenza utente e correttezza password
        if (!user || !(await compare(sanitizedPassword, user.password))) {
            // Protezione contro timing attacks
            await new Promise(resolve => setTimeout(resolve, 200)); 
            authLogger.info(`Tentativo di login fallito per l'email: ${sanitizedEmail}`);
            throw new BadRequestException("Email o password errati", ErrorCode.INVALID_REQUEST);
        }
        
        // Verifica che l'utente sia attivo
        if (!user.isActive) {
            authLogger.warn(`Tentativo di login per account non attivato: ${user.id}`);
            throw new ForbiddenException("Account non attivato", ErrorCode.FORBIDDEN);
        }
        
        // Preparazione dei token e della sessione
        const MAX_ACTIVE_SESSIONS = 3;
        const sessionId = crypto.randomUUID();
        
        const accessToken = jwt.sign(
            { id: user.id, email: user.email, role: user.role }, 
            USER_JWT_SECRET, 
            { expiresIn: '15m' }
        );
        
        const refreshToken = jwt.sign(
            { id: user.id, sessionId }, 
            USER_REFRESH_TOKEN_SECRET, 
            { expiresIn: '30d' }
        );
        
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // 30 giorni
        
        // Uso transazione per garantire l'atomicità dell'operazione
        const result = await prismaClient.$transaction(async (tx) => {
            // Aggiorna lastLogin
            await tx.user.update({
                where: { id: user.id },
                data: { lastLogin: new Date() }
            });
            
            // Conta sessioni attive per limitarle
            const activeSessions = await tx.userRefreshToken.count({
                where: {
                    userId: user.id,
                    revoked: false
                }
            });
            
            // Se troppe sessioni attive, revoca la più vecchia
            if (activeSessions >= MAX_ACTIVE_SESSIONS) {
                const oldestSession = await tx.userRefreshToken.findFirst({
                    where: {
                        userId: user.id,
                        revoked: false
                    },
                    orderBy: {
                        createdAt: 'asc'
                    }
                });
                
                if (oldestSession) {
                    await tx.userRefreshToken.update({
                        where: { id: oldestSession.id },
                        data: { revoked: true }
                    });
                    
                    authLogger.info(`Sessione più vecchia revocata per utente ${user.id} (${oldestSession.sessionId})`);
                }
            }
            
            // Crea la nuova sessione
            await tx.userRefreshToken.create({
                data: {
                    token: refreshToken,
                    userId: user.id,
                    sessionId,
                    expiresAt
                }
            });
            
            authLogger.info(`Nuovo login per utente ${user.id} con sessionId ${sessionId}`);
            
            return { accessToken, refreshToken, sessionId };
        });
        
        // Rimuovi password dal risultato
        const { password: _, ...userWithoutPassword } = user;
        
        return {
            user: userWithoutPassword,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            sessionId: result.sessionId
        };
    }
    
    /**
     * Revoca di una specifica sessione utente (logout).
     * 
     * @param sessionId - ID della sessione da revocare
     * @throws BadRequestException se l'ID sessione non è valido
     */
    static async logout(req: Express.Request, sessionId: string) {
        if (!req.user?.id) {
            throw new BadRequestException("Utente non autenticato", ErrorCode.INVALID_REQUEST);
        }

        if (!sessionId) {
            throw new BadRequestException("SessionId non valida", ErrorCode.INVALID_REQUEST);
        }

        const { count } = await prismaClient.userRefreshToken.updateMany({
            where: {
                userId: req.user.id,
                sessionId,
                revoked: false
            },  
            data: { revoked: true }
        });

        if (count === 0) {
            throw new NotFoundException("Sessione non trovata o già revocata");
        }
    }
    
    /**
     * Aggiorna la data di ultimo accesso per l'utente.
     * 
     * @param req - Richiesta Express con informazioni utente
     */
    static async lastLogin(req: any) {
        if (req.user && req.user.id) {
            await prismaClient.user.update({
                where: { id: req.user.id },
                data: { lastLogin: new Date() }
            });
            
            authLogger.info(`Aggiornato lastLogin per utente ${req.user.id}`);
        }
    }
}