import { Inject, Injectable } from '@nestjs/common';
import { AuditPublisher, AUDIT_PUBLISHER, createAuditEvent } from '@idp/common';
import { InvalidRefreshTokenError } from '../../domain/exceptions/domain-exceptions';
import { UserRepository, USER_REPOSITORY } from '../../domain/repositories/user.repository.port';
import {
  RefreshTokenRepository,
  REFRESH_TOKEN_REPOSITORY,
} from '../../domain/repositories/refresh-token.repository.port';
import { TokenProvider, TOKEN_PROVIDER } from '../ports/token-provider.port';
import { AuthTokens } from './login-user.use-case';
import { hashToken } from './hash-token.util';

export interface RefreshTokenCommand {
  refreshToken: string;
  ipAddress: string | null;
}

/**
 * Implements refresh token rotation with replay detection (ADR-0003):
 * - A valid, unused token is exchanged for a new access+refresh pair; the old
 *   token is marked revoked and linked to its replacement.
 * - If a *revoked* token is presented again (replay), ALL of that user's refresh
 *   tokens are revoked, forcing re-authentication.
 */
@Injectable()
export class RefreshTokenUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokenRepository: RefreshTokenRepository,
    @Inject(TOKEN_PROVIDER) private readonly tokenProvider: TokenProvider,
    @Inject(AUDIT_PUBLISHER) private readonly auditPublisher: AuditPublisher,
  ) {}

  async execute(command: RefreshTokenCommand): Promise<AuthTokens> {
    const incomingHash = hashToken(command.refreshToken);
    const existing = await this.refreshTokenRepository.findByTokenHash(incomingHash);

    if (!existing) {
      throw new InvalidRefreshTokenError();
    }

    if (existing.isRevoked()) {
      // Replay of an already-rotated/used token: revoke the whole session family.
      await this.refreshTokenRepository.revokeAllForUser(existing.userId);
      await this.auditPublisher.publish(
        createAuditEvent({
          userId: existing.userId,
          action: 'TOKEN_REUSE_DETECTED',
          resourceType: 'SESSION',
          resourceId: existing.id,
          result: 'FAILURE',
          ipAddress: command.ipAddress,
        }),
      );
      throw new InvalidRefreshTokenError();
    }

    if (existing.isExpired()) {
      throw new InvalidRefreshTokenError();
    }

    const user = await this.userRepository.findById(existing.userId);
    if (!user) {
      throw new InvalidRefreshTokenError();
    }

    const accessToken = this.tokenProvider.issueAccessToken(user);
    const newRefreshTokenValue = this.tokenProvider.generateRefreshTokenValue();
    const refreshTtl = this.tokenProvider.refreshTokenTtlSeconds();
    const expiresAt = new Date(Date.now() + refreshTtl * 1000);

    const newToken = await this.refreshTokenRepository.create({
      userId: user.id,
      tokenHash: hashToken(newRefreshTokenValue),
      expiresAt,
      createdByIp: command.ipAddress,
    });

    await this.refreshTokenRepository.revoke(existing.id, newToken.id);

    await this.auditPublisher.publish(
      createAuditEvent({
        userId: user.id,
        action: 'TOKEN_REFRESH',
        resourceType: 'SESSION',
        resourceId: newToken.id,
        result: 'SUCCESS',
        ipAddress: command.ipAddress,
      }),
    );

    return {
      accessToken: accessToken.token,
      accessTokenExpiresInSeconds: accessToken.expiresInSeconds,
      refreshToken: newRefreshTokenValue,
      refreshTokenExpiresInSeconds: refreshTtl,
      user,
    };
  }
}
