import { RefreshToken } from '../entities/refresh-token.entity';

export const REFRESH_TOKEN_REPOSITORY = 'REFRESH_TOKEN_REPOSITORY';

export interface RefreshTokenRepository {
  findByTokenHash(tokenHash: string): Promise<RefreshToken | null>;

  create(params: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    createdByIp: string | null;
  }): Promise<RefreshToken>;

  /** Marks a token as revoked, optionally linking it to its replacement (rotation). */
  revoke(id: string, replacedByTokenId: string | null): Promise<void>;

  /** Revokes all active refresh tokens for a user (e.g. on logout-all / replay detection). */
  revokeAllForUser(userId: string): Promise<void>;
}
