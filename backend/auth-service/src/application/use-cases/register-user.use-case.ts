import { Inject, Injectable } from '@nestjs/common';
import { AuditPublisher, AUDIT_PUBLISHER, createAuditEvent } from '@idp/common';
import { User } from '../../domain/entities/user.entity';
import { ROLE_NAMES } from '../../domain/entities/role.entity';
import { EmailAlreadyRegisteredError } from '../../domain/exceptions/domain-exceptions';
import { UserRepository, USER_REPOSITORY } from '../../domain/repositories/user.repository.port';
import { PasswordHasher, PASSWORD_HASHER } from '../ports/password-hasher.port';

export interface RegisterUserCommand {
  email: string;
  password: string;
  fullName: string;
  ipAddress: string | null;
}

/**
 * Registers a new user with the default DEVELOPER role (RBAC defaults per ADR-0003).
 * Org Admins can later promote/assign additional roles via a future endpoint
 * (Phase 2+ — user management UI).
 */
@Injectable()
export class RegisterUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    @Inject(AUDIT_PUBLISHER) private readonly auditPublisher: AuditPublisher,
  ) {}

  async execute(command: RegisterUserCommand): Promise<User> {
    const normalizedEmail = command.email.trim().toLowerCase();

    const exists = await this.userRepository.existsByEmail(normalizedEmail);
    if (exists) {
      await this.auditPublisher.publish(
        createAuditEvent({
          userId: null,
          action: 'REGISTER',
          resourceType: 'USER',
          resourceId: normalizedEmail,
          result: 'FAILURE',
          ipAddress: command.ipAddress,
          metadata: { reason: 'EMAIL_ALREADY_REGISTERED' },
        }),
      );
      throw new EmailAlreadyRegisteredError(normalizedEmail);
    }

    const passwordHash = await this.passwordHasher.hash(command.password);

    const user = await this.userRepository.createUser({
      email: normalizedEmail,
      passwordHash,
      fullName: command.fullName.trim(),
      defaultRoleNames: [ROLE_NAMES.DEVELOPER],
    });

    await this.auditPublisher.publish(
      createAuditEvent({
        userId: user.id,
        action: 'REGISTER',
        resourceType: 'USER',
        resourceId: user.id,
        result: 'SUCCESS',
        ipAddress: command.ipAddress,
      }),
    );

    return user;
  }
}
