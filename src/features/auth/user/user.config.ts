import { USER_JWT_SECRET, USER_REFRESH_TOKEN_SECRET } from "@config/env";
import { prismaClient } from "@app";
import { AuthConfig } from "../utils/types";

/**
 * Configurazione per l'autenticazione degli utenti standard.
 * Implementa l'interfaccia AuthConfig fornendo implementazioni specifiche
 * con un approccio di separazione dal contesto admin.
 * 
 * Differenze chiave rispetto alla configurazione admin:
 * - Segreti JWT separati per isolamento di sicurezza
 * - Durata refresh token più lunga (30gg) per migliorare UX
 * - Include campo 'role' per autorizzazione ruolo-basata
 */
export const userAuthConfig: AuthConfig = {
  /** Chiave segreta dedicata agli utenti normali */
  jwtSecret: USER_JWT_SECRET!,
  
  /** Chiave separata per refresh token utenti */
  refreshSecret: USER_REFRESH_TOKEN_SECRET!,
  
  /** Durata estesa a 30 giorni per migliorare esperienza utente */
  refreshDuration: 30,
  
  /** Identificatore dell'entità utente per il middleware auth */
  entity: 'USER',
  
  /**
   * Recupera un utente dal database, includendo il ruolo
   * necessario per il middleware di autorizzazione basato su ruoli
   */
  findEntity: async (id: number) => {
    return prismaClient.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true }
    });
  },
  
  /**
   * Salva un nuovo refresh token nel database
   * collegato all'ID utente e alla sessione specifica
   */
  storeRefreshToken: async (token: string, userId: number, sessionId: string, expiresAt: Date) => {
    await prismaClient.userRefreshToken.create({
    data: { token, userId, sessionId, expiresAt }
    });
  },
  
  /**
   * Revoca un token esistente impostando il flag revoked
   * Questa strategia soft-delete è utile per audit e analisi
   */
  revokeRefreshToken: async (id: number) => {
    await prismaClient.userRefreshToken.update({
      where: { id },
      data: { revoked: true }
    });
  },
  
  /**
   * Verifica che un token esista e sia ancora valido
   * Filtrando per i token già revocati per sicurezza
   */
  findRefreshToken: async (token: string) => {
    const stored = await prismaClient.userRefreshToken.findFirst({
      where: { token, revoked: false }
    });
    return stored ? { id: stored.id, expiresAt: stored.expiresAt, revoked: stored.revoked } : null;
  }
};