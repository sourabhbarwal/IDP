import { User } from '../../domain/entities/user.entity';

export const TOKEN_PROVIDER = 'TOKEN_PROVIDER';

export interface AccessTokenClaims {
  sub: string;
  email: string;
  roles: string[];
  permissions: string[];
}

export interface IssuedAccessToken {
  token: string;
  expiresInSeconds: number;
}

/**
 * Port for issuing signed JWT access tokens. Implemented with @nestjs/jwt
 * (HS256 for MVP, RS256 path documented in ADR-0003).
 */
export interface TokenProvider {
  issueAccessToken(user: User): IssuedAccessToken;

  /** Generates a cryptographically random opaque refresh token (plain text, to be hashed before storage). */
  generateRefreshTokenValue(): string;

  refreshTokenTtlSeconds(): number;
}
