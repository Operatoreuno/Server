/**
 * Payload minimale contenuto nei token JWT.
 * Contiene solo l'ID dell'entità autenticata per minimizzare
 * la dimensione del token e ridurre i rischi di sicurezza.
 */
export interface TokenPayload { id: number; role?: UserRole; isActive?: boolean }

/**
 * Configurazione di autenticazione modulare tramite dependency injection.
 * Permette di riutilizzare la stessa logica di autenticazione per diverse
 * entità (admin, utenti) cambiando solo la configurazione.
 * 
 * Gestisce:
 * - Segreti per la firma dei token JWT
 * - Durata e storage del refresh token
 * - Revoca dei token con pattern repository
 */
export interface AuthConfig {
  /** Segreto per la firma dei token di accesso */
  jwtSecret: string;
  
  /** Segreto separato per la firma dei refresh token */
  refreshSecret: string;
  
  /** Durata del refresh token in giorni */
  refreshDuration: number;
  
  /** Tipo di entità autenticata ("ADMIN" o "USER") */
  entity: string;
  
  /** Repository pattern: recupera entità per ID */
  findEntity: (id: number) => Promise<any>;
  
  /** Salva un refresh token nel database */
  storeRefreshToken: (token: string, entityId: number, sessionId: string, expiresAt: Date) => Promise<void>;
  
  /** Revoca un refresh token (pattern one-time use) */
  revokeRefreshToken: (id: number) => Promise<void>;
  
  /** Cerca un refresh token nel database e verifica validità */
  findRefreshToken: (token: string) => Promise<{ id: number, expiresAt: Date, revoked: boolean } | null>;
}

/** Tipi di entità che possono autenticarsi */
export type AuthType = 'ADMIN' | 'USER';

/** Ruoli per gli utenti per gestire i permessi */
export type UserRole = 'INSTRUCTOR' | 'STUDENT';