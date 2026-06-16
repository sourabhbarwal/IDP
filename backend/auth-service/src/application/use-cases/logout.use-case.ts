import { Inject, Injectable } from '@nestjs/common';
import { AuditPublisher, AUDIT_PUBLISHER, createAuditEvent } from '@idp/common';
import {
  RefreshTokenRepository,
  REFRESH_TOKEN_REPOSITORY,
} from '../../domain/repositories/refresh-token.repository.port';
import { hashToken } from './hash-token.util';

export interface LogoutCommand {
  refreshToken: string;
  userId: string;
  ipAddress: string | null;
}

@Injectable()
export class LogoutUseCase {
  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokenRepository: RefreshTokenRepository,
    @Inject(AUDIT_PUBLISHER) private readonly auditPublisher: AuditPublisher,
  ) {}

  async execute(command: LogoutCommand): Promise<void> {
    const existing = await this.refreshTokenRepository.findByTokenHash(hashToken(command.refreshToken));

    if (existing && !existing.isRevoked()) {
      await this.refreshTokenRepository.revoke(existing.id, null);
    }

    await this.auditPublisher.publish(
      createAuditEvent({
        userId: command.userId,
        action: 'LOGOUT',
        resourceType: 'SESSION',
        resourceId: existing?.id ?? null,
        result: 'SUCCESS',
        ipAddress: command.ipAddress,
      }),
    );
  }
}
