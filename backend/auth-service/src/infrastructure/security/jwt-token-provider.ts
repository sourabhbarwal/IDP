import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';
import { User } from '../../domain/entities/user.entity';
import { AccessTokenClaims, IssuedAccessToken, TokenProvider } from '../../application/ports/token-provider.port';

@Injectable()
export class JwtTokenProvider implements TokenProvider {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  issueAccessToken(user: User): IssuedAccessToken {
    const expiresInSeconds = Number(this.config.get('JWT_ACCESS_TOKEN_TTL_SECONDS', 900));

    const claims: AccessTokenClaims = {
      sub: user.id,
      email: user.email,
      roles: user.roleNames(),
      permissions: user.permissions(),
    };

    const secret = this.config.get<string>('JWT_SECRET');
    console.log('[DEBUG] Signing with JWT_SECRET =', JSON.stringify(secret), '| length =', secret?.length);

    const token = this.jwtService.sign(claims, {
      secret,
      issuer: this.config.get<string>('JWT_ISSUER', 'idp-platform'),
      expiresIn: expiresInSeconds,
    });

    return { token, expiresInSeconds };
  }

  generateRefreshTokenValue(): string {
    // 256 bits of entropy, URL-safe.
    return randomBytes(32).toString('base64url');
  }

  refreshTokenTtlSeconds(): number {
    return Number(this.config.get('JWT_REFRESH_TOKEN_TTL_SECONDS', 604800));
  }
}
