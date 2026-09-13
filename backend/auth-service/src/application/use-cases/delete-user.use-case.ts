import { Inject, Injectable } from '@nestjs/common';
import { ApiException } from '@idp/common';
import {
  USER_REPOSITORY,
  UserRepository,
} from '../../domain/repositories/user.repository.port';
import { AUDIT_PUBLISHER, AuditPublisher, createAuditEvent } from '@idp/common';

export interface DeleteUserCommand {
  targetUserId: string;
  actorId:      string;
  ipAddress:    string | null;
}

@Injectable()
export class DeleteUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(AUDIT_PUBLISHER) private readonly audit: AuditPublisher,
  ) {}

  async execute(command: DeleteUserCommand) {
    if (command.targetUserId === command.actorId) {
      throw ApiException.badRequest('Administrators cannot delete their own account.');
    }

    const user = await this.users.findById(command.targetUserId);
    if (!user) {
      throw ApiException.notFound('User', command.targetUserId);
    }

    if (user.email === 'dev@example.com') {
      throw ApiException.badRequest('Cannot delete the seed admin account (dev@example.com).');
    }

    await this.users.softDelete(command.targetUserId);

    await this.audit.publish(createAuditEvent({
      userId:       command.actorId,
      action:       'USER_DELETED',
      resourceType: 'USER',
      resourceId:   command.targetUserId,
      result:       'SUCCESS',
      ipAddress:    command.ipAddress,
      metadata:     { deletedEmail: user.email },
    }));
  }
}