import * as jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prismaClient } from "@app";
import { compare } from "bcrypt";
import { LoginSchema } from "@core/utils/schemas";
import { BadRequestException, ForbiddenException, NotFoundException } from "src/core/errors/exceptions/4xx";
import { ErrorCode } from "src/core/errors/error.codes";
import { ADMIN_JWT_SECRET, ADMIN_REFRESH_TOKEN_SECRET } from "@config/env";
import { authLogger } from "@logger";

/**
 * Servizio per la gestione dell'autenticazione degli amministratori.
 */
export class AdminService {
  
  /**
   * Gestione login amministratore con misure di sicurezza avanzate.
   * 
   * Caratteristiche di sicurezza implementate:
   * - Validazione input tramite Zod
   * - Verifica password con comparazione sicura bcrypt
   * - Limitazione sessioni attive contemporanee (max 2)
   * - Rotazione automatica sessioni (FIFO)
   * - Utilizzo UUID v4 per gli ID sessione
   * 
   * @param email - Email dell'amministratore
   * @param password - Password in chiaro (viene verificata con hash bcrypt)
   * @returns Oggetto contenente admin, tokens e sessionId
   * @throws BadRequestException per credenziali errate o problemi di validazione
   */
  static async login(email: string, password: string) {
    
    const validatedData = LoginSchema.parse({ email, password });

    const { email: sanitizedEmail, password: sanitizedPassword } = validatedData;

    const admin = await prismaClient.admin.findUnique({
      where: { email: sanitizedEmail },
      select: {
        id: true,
        email: true,
        password: true }
    });

    // Verifica password con timing attack safe comparison
    if (!admin || !(await compare(sanitizedPassword, admin.password))) {
      await new Promise(resolve => setTimeout(resolve, 200));
      authLogger.info(`Tentativo di login fallito per l'email: ${sanitizedEmail}`);
      throw new BadRequestException("Email o password errati", ErrorCode.INVALID_REQUEST);
    }

    const MAX_ACTIVE_SESSIONS = 2;
    // Utilizziamo una transazione per garantire l'atomicità delle operazioni
    const sessionId = crypto.randomUUID();
    
    // Creazione access e refresh token
    const accessToken = jwt.sign(
        { id: admin.id, email: admin.email }, 
        ADMIN_JWT_SECRET, 
        { expiresIn: '15m' }
    );
    
    const refreshToken = jwt.sign(
        { id: admin.id, sessionId }, 
        ADMIN_REFRESH_TOKEN_SECRET, 
        { expiresIn: '7d' }
    );
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 giorni
    
    // Inizia transazione per gestire sessioni e token
    const sessionData = await prismaClient.$transaction(async (tx) => {
        const activeSessions = await tx.adminRefreshToken.count({
            where: {
                adminId: admin.id,
                revoked: false
            }
        });
        
        // Se ci sono troppe sessioni attive, revoca la più vecchia
        if (activeSessions >= MAX_ACTIVE_SESSIONS) {
            const oldestSession = await tx.adminRefreshToken.findFirst({
                where: {
                    adminId: admin.id,
                    revoked: false
                },
                orderBy: {
                    createdAt: 'asc'
                }
            });
            
            if (oldestSession) {
                await tx.adminRefreshToken.update({
                    where: { id: oldestSession.id },
                    data: { revoked: true }
                });
                
                authLogger.info(`Sessione più vecchia revocata per admin ${admin.id} (${oldestSession.sessionId})`);
            }
        }
        
        // Salva il nuovo refresh token
        await tx.adminRefreshToken.create({
            data: {
                token: refreshToken,
                adminId: admin.id,
                sessionId,
                expiresAt
            }
        });
        
        authLogger.info(`Nuovo login per admin ${admin.id} con sessionId ${sessionId}`);
        
        return { accessToken, refreshToken, sessionId };
    });

    // Rimuovo password dal risultato
    const adminResponse = {
        id: admin.id,
        email: admin.email,
    };
    
    return { 
        admin: adminResponse, 
        accessToken: sessionData.accessToken, 
        refreshToken: sessionData.refreshToken, 
        sessionId: sessionData.sessionId 
    };
  }

  /**
   * Revoca di una specifica sessione amministratore (logout).
   * 
   * @param sessionId - ID della sessione da revocare
   * @throws BadRequestException se l'ID sessione non è valido
   */
  static async logout(sessionId: string, req: Express.Request) {
    if (!sessionId) {
      throw new BadRequestException("SessionId non valido", ErrorCode.INVALID_REQUEST);
    }
  
    // Verifica che l'admin sia autenticato
    if (!req.admin?.id) {
      throw new ForbiddenException("Accesso negato: admin non autenticato", ErrorCode.FORBIDDEN);
    }
  
    // Revoca SOLO se la sessione appartiene all'admin corrente
    const { count } = await prismaClient.adminRefreshToken.updateMany({
      where: { 
        sessionId,
        adminId: req.admin.id,
        revoked: false 
      },
      data: { revoked: true }
    });
  
    if (count === 0) {
      throw new NotFoundException("Sessione non trovata o già revocata");
    }
  }
}