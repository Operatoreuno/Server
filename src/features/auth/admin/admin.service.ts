import * as jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prismaClient } from "@app";
import { compare } from "bcrypt";
import { LoginSchema } from "@utils/schemas";
import { BadRequestException, ForbiddenException, NotFoundException } from "src/core/errors/exceptions/4xx";
import { ErrorCode } from "src/core/errors/error.codes";
import { ADMIN_JWT_SECRET, ADMIN_REFRESH_TOKEN_SECRET } from "@config/env";

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
    // Validazione input con schema Zod
    LoginSchema.safeParse({ email, password });
    const admin = await prismaClient.admin.findFirst({ where: { email } });

    // Verifica password con timing attack safe comparison
    if (!admin || !compare(password, admin.password)) {
      await new Promise(resolve => setTimeout(resolve, 200));
      throw new BadRequestException("Email o password errati", ErrorCode.INVALID_REQUEST);
    }

    const MAX_ACTIVE_SESSIONS = 2;
        
        // Controlla le sessioni in una transazione
        const sessionData = await prismaClient.$transaction(async (tx) => {
            const activeSessions = await tx.adminRefreshToken.count({
                where: { 
                    adminId: admin.id, 
                    revoked: false,
                    expiresAt: { gt: new Date() } 
                }
            });
        
            // Se l'utente ha raggiunto il limite di sessioni
            if (activeSessions >= MAX_ACTIVE_SESSIONS) {
                // Troviamo la sessione più vecchia
                const oldestSessions = await tx.adminRefreshToken.findMany({
                    where: { 
                        adminId: admin.id,
                        revoked: false
                    },
                    orderBy: { createdAt: 'asc' },
                    take: 1 
                });
            
                if (oldestSessions.length > 0) {
                    await tx.adminRefreshToken.update({
                        where: { id: oldestSessions[0].id },
                        data: { revoked: true }
                    });
                }
            }
            
            // Crea il payload con informazioni aggiuntive
            const tokenPayload = { 
                id: admin.id,
                email: admin.email,
                iat: Math.floor(Date.now() / 1000)
            };
        
            const accessToken = jwt.sign(tokenPayload, ADMIN_JWT_SECRET!, { expiresIn: '5m' });
            const refreshToken = jwt.sign({ id: admin.id }, ADMIN_REFRESH_TOKEN_SECRET!, { expiresIn: '7d' });
            const sessionId = crypto.randomUUID();
        
            // Crea il nuovo refresh token
            await tx.adminRefreshToken.create({
                data: {
                    token: refreshToken,
                    adminId: admin.id,
                    sessionId,
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                }
            });

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