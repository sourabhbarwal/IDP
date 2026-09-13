import { Inject, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ApiException } from '@idp/common';
import {
  USER_REPOSITORY,
  UserRepository,
} from '../../domain/repositories/user.repository.port';
import {
  ROLE_REPOSITORY,
  RoleRepository,
} from '../../domain/repositories/role.repository.port';
import { AUDIT_PUBLISHER, AuditPublisher, createAuditEvent } from '@idp/common';

const VALID_ROLES = ['DEVELOPER', 'DEVOPS_ENGINEER', 'PLATFORM_ENGINEER', 'SECURITY_ADMIN', 'ORG_ADMIN'];

export interface CreateUserCommand {
  email:     string;
  password:  string;
  fullName:  string;
  roles:     string[];   // role names e.g. ['DEVELOPER', 'SECURITY_ADMIN']
  actorId:   string;
  ipAddress: string | null;
}

@Injectable()
export class CreateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(ROLE_REPOSITORY) private readonly roles: RoleRepository,
    @Inject(AUDIT_PUBLISHER) private readonly audit: AuditPublisher,
  ) {}

  async execute(command: CreateUserCommand) {
    const existing = await this.users.findByEmail(command.email);
    if (existing) {
      throw ApiException.conflict(`A user with email '${command.email}' already exists`);
    }

    const invalidRoles = command.roles.filter((r) => !VALID_ROLES.includes(r));
    if (invalidRoles.length > 0) {
      throw ApiException.badRequest(
        `Invalid roles: ${invalidRoles.join(', ')}. Valid roles: ${VALID_ROLES.join(', ')}`,
      );
    }

    const passwordHash = await bcrypt.hash(command.password, 12);
    try {
      const user = await this.users.createUser({
        email: command.email,
        passwordHash,
        fullName: command.fullName,
        defaultRoleNames: command.roles,
      });

      await this.audit.publish(createAuditEvent({
        userId:       command.actorId,
        action:       'USER_CREATED_BY_ADMIN',
        resourceType: 'USER',
        resourceId:   user.id,
        result:       'SUCCESS',
        ipAddress:    command.ipAddress,
        metadata: {
          createdEmail: command.email,
          assignedRoles: command.roles,
        },
      }));

      return user;
    } catch (err) {
      // A soft-deleted user still occupies the DB's unique email constraint,
      // even though findByEmail() above correctly can't see it. Surface this
      // as a clean conflict instead of an unhandled 500.
      if (err instanceof Error && err.message.includes('duplicate key value') && err.message.includes('email')) {
        throw ApiException.conflict(
          `A user with email '${command.email}' already exists (possibly a previously deleted account). ` +
          `Contact an administrator to permanently remove the old record before reusing this email.`,
        );
      }
      throw err;
    }
  }
}