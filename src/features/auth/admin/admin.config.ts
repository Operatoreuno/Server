import { prismaClient } from "@app";
import { AuthConfig } from "../utils/types";
import { ADMIN_JWT_SECRET, ADMIN_REFRESH_TOKEN_SECRET } from "@config/env";

/**
 * Configurazione completa per l'autenticazione degli amministratori.
 * Implementa l'interfaccia AuthConfig fornendo tutte le implementazioni
 * specifiche per gli admin usando il pattern di Dependency Injection.
 * 
 * Caratteristiche specifiche per admin:
 * - Chiavi di firma JWT separate da quelle utente
 * - Durata refresh token più breve (7 giorni vs 30 giorni utenti)
 * - Schema tabella database dedicato
 */
export const adminAuthConfig: AuthConfig = {
  /** Chiave segreta per firmare i token JWT di accesso admin */
  jwtSecret: ADMIN_JWT_SECRET!,
  
  /** Chiave separata per i refresh token (migliore protezione) */
  refreshSecret: ADMIN_REFRESH_TOKEN_SECRET!,
  
  /** Durata limitata a 7 giorni per maggiore sicurezza */
  refreshDuration: 7,
  
  /** Identificatore per il tipo di entità */
  entity: 'ADMIN',
  
  /**
   * Cerca un admin per ID nel database
   * Include solo i campi essenziali per ridurre payload
   * ed evitare leak di informazioni sensibili
   */
  findEntity: async (id: number) => {
    return prismaClient.admin.findUnique({
      where: { id },
      select: { id: true, email: true }
    });
  },

  /**
   * Memorizza un nuovo refresh token nel database
   * Associando il token all'ID dell'admin e della sessione
   */
  storeRefreshToken: async (token: string, adminId: number, sessionId: string, expiresAt: Date) => {
    await prismaClient.adminRefreshToken.create({
      data: { token, adminId, sessionId, expiresAt }
    });
  },

  /**
   * Revoca un refresh token senza eliminarlo
   * Questo pattern permette audit trail e rilevamento di tentativi di riuso
   */
  revokeRefreshToken: async (id: number) => {
    await prismaClient.adminRefreshToken.update({
      where: { id },
      data: { revoked: true }
    });
  },

  /**
   * Cerca un refresh token nel database verificando che non sia stato revocato
   * Restituisce solo i campi essenziali per la validazione
   */
  findRefreshToken: async (token: string) => {
    const stored = await prismaClient.adminRefreshToken.findFirst({
      where: { token, revoked: false }
    });
    return stored ? { id: stored.id, expiresAt: stored.expiresAt, revoked: stored.revoked } : null;
  }
};