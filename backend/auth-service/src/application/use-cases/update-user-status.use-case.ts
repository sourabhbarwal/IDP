import { Inject, Injectable } from '@nestjs/common';
import { ApiException } from '@idp/common';
import {
  USER_REPOSITORY,
  UserRepository,
} from '../../domain/repositories/user.repository.port';
import { AUDIT_PUBLISHER, AuditPublisher, createAuditEvent } from '@idp/common';

export interface UpdateUserStatusCommand {
  targetUserId: string;
  status:       'ACTIVE' | 'DISABLED' | 'LOCKED';
  actorId:      string;
  ipAddress:    string | null;
}

@Injectable()
export class UpdateUserStatusUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(AUDIT_PUBLISHER) private readonly audit: AuditPublisher,
  ) {}

  async execute(command: UpdateUserStatusCommand) {
    if (command.targetUserId === command.actorId) {
      throw ApiException.badRequest('Administrators cannot deactivate their own account.');
    }

    const user = await this.users.findById(command.targetUserId);
    if (!user) {
      throw ApiException.notFound('User', command.targetUserId);
    }

    // Protect seed account
    if (user.email === 'dev@example.com' && command.status !== 'ACTIVE') {
      throw ApiException.badRequest(
        'Cannot deactivate the seed admin account (dev@example.com).',
      );
    }

    const updated = await this.users.updateStatus(command.targetUserId, command.status);

    await this.audit.publish(createAuditEvent({
      userId:       command.actorId,
      action:       'USER_STATUS_UPDATED',
      resourceType: 'USER',
      resourceId:   command.targetUserId,
      result:       'SUCCESS',
      ipAddress:    command.ipAddress,
      metadata: {
        targetEmail: user.email,
        previousStatus: user.status,
        newStatus: command.status,
      },
    }));

    return updated;
  }
}