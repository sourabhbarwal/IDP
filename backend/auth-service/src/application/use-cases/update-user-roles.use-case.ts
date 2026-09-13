import { Inject, Injectable } from '@nestjs/common';
import { ApiException } from '@idp/common';
import {
  USER_REPOSITORY,
  UserRepository,
} from '../../domain/repositories/user.repository.port';
import { AUDIT_PUBLISHER, AuditPublisher, createAuditEvent } from '@idp/common';

const VALID_ROLES = ['DEVELOPER', 'DEVOPS_ENGINEER', 'PLATFORM_ENGINEER', 'SECURITY_ADMIN', 'ORG_ADMIN'];

export interface UpdateUserRolesCommand {
  targetUserId: string;
  roles:        string[];
  actorId:      string;
  ipAddress:    string | null;
}

@Injectable()
export class UpdateUserRolesUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(AUDIT_PUBLISHER) private readonly audit: AuditPublisher,
  ) {}

  async execute(command: UpdateUserRolesCommand) {
    if (command.targetUserId === command.actorId) {
      throw ApiException.badRequest(
        'Administrators cannot change their own roles. Ask another admin to update your roles.',
      );
    }

    const user = await this.users.findById(command.targetUserId);
    if (!user) {
      throw ApiException.notFound('User', command.targetUserId);
    }

    // Preserve emergency platform access on the seed account.
    if (user.email === 'dev@example.com' && !command.roles.includes('ORG_ADMIN')) {
      throw ApiException.badRequest(
        'Cannot remove ORG_ADMIN role from the seed account (dev@example.com). ' +
        'This preserves emergency platform access.',
      );
    }

    const invalid = command.roles.filter((r) => !VALID_ROLES.includes(r));
    if (invalid.length > 0) {
      throw ApiException.badRequest(`Invalid roles: ${invalid.join(', ')}`);
    }

    const previousRoles = user.roleNames();
    const updated = await this.users.updateRoles(command.targetUserId, command.roles);

    await this.audit.publish(createAuditEvent({
      userId:       command.actorId,
      action:       'USER_ROLES_UPDATED',
      resourceType: 'USER',
      resourceId:   command.targetUserId,
      result:       'SUCCESS',
      ipAddress:    command.ipAddress,
      metadata: {
        targetEmail: user.email,
        previousRoles,
        newRoles: command.roles,
      },
    }));

    return updated;
  }
}