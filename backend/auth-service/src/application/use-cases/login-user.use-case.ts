import { Inject, Injectable } from '@nestjs/common';
import { AuditPublisher, AUDIT_PUBLISHER, createAuditEvent } from '@idp/common';
import { User } from '../../domain/entities/user.entity';
import {
  AccountNotActiveError,
  InvalidCredentialsError,
} from '../../domain/exceptions/domain-exceptions';
import { UserRepository, USER_REPOSITORY } from '../../domain/repositories/user.repository.port';
import {
  RefreshTokenRepository,
  REFRESH_TOKEN_REPOSITORY,
} from '../../domain/repositories/refresh-token.repository.port';
import { PasswordHasher, PASSWORD_HASHER } from '../ports/password-hasher.port';
import { TokenProvider, TOKEN_PROVIDER } from '../ports/token-provider.port';
import { hashToken } from './hash-token.util';

export interface LoginUserCommand {
  email: string;
  password: string;
  ipAddress: string | null;
}

export interface AuthTokens {
  accessToken: string;
  accessTokenExpiresInSeconds: number;
  refreshToken: string;
  refreshTokenExpiresInSeconds: number;
  user: User;
}

@Injectable()
export class LoginUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokenRepository: RefreshTokenRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    @Inject(TOKEN_PROVIDER) private readonly tokenProvider: TokenProvider,
    @Inject(AUDIT_PUBLISHER) private readonly auditPublisher: AuditPublisher,
  ) {}

  async execute(command: LoginUserCommand): Promise<AuthTokens> {
    const normalizedEmail = command.email.trim().toLowerCase();
    const user = await this.userRepository.findByEmail(normalizedEmail);

    if (!user) {
      await this.auditFailure(null, normalizedEmail, command.ipAddress, 'USER_NOT_FOUND');
      throw new InvalidCredentialsError();
    }

    const passwordMatches = await this.passwordHasher.compare(command.password, user.passwordHash);
    if (!passwordMatches) {
      await this.auditFailure(user.id, normalizedEmail, command.ipAddress, 'BAD_PASSWORD');
      throw new InvalidCredentialsError();
    }

    if (!user.isActive()) {
      await this.auditFailure(user.id, normalizedEmail, command.ipAddress, 'ACCOUNT_NOT_ACTIVE');
      throw new AccountNotActiveError(user.status);
    }

    const tokens = await this.issueTokens(user, command.ipAddress);

    await this.auditPublisher.publish(
      createAuditEvent({
        userId: user.id,
        action: 'LOGIN',
        resourceType: 'SESSION',
        resourceId: user.id,
        result: 'SUCCESS',
        ipAddress: command.ipAddress,
      }),
    );

    return tokens;
  }

  /** Issues a fresh access + refresh token pair and persists the refresh token hash. */
  async issueTokens(user: User, ipAddress: string | null): Promise<AuthTokens> {
    const accessToken = this.tokenProvider.issueAccessToken(user);
    const refreshTokenValue = this.tokenProvider.generateRefreshTokenValue();
    const refreshTtl = this.tokenProvider.refreshTokenTtlSeconds();
    const expiresAt = new Date(Date.now() + refreshTtl * 1000);

    await this.refreshTokenRepository.create({
      userId: user.id,
      tokenHash: hashToken(refreshTokenValue),
      expiresAt,
      createdByIp: ipAddress,
    });

    return {
      accessToken: accessToken.token,
      accessTokenExpiresInSeconds: accessToken.expiresInSeconds,
      refreshToken: refreshTokenValue,
      refreshTokenExpiresInSeconds: refreshTtl,
      user,
    };
  }

  private async auditFailure(
    userId: string | null,
    email: string,
    ipAddress: string | null,
    reason: string,
  ): Promise<void> {
    await this.auditPublisher.publish(
      createAuditEvent({
        userId,
        action: 'LOGIN',
        resourceType: 'SESSION',
        resourceId: email,
        result: 'FAILURE',
        ipAddress,
        metadata: { reason },
      }),
    );
  }
}
