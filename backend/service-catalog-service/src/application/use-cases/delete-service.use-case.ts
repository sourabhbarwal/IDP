import { Inject, Injectable } from '@nestjs/common';
import { AUDIT_PUBLISHER, AuditPublisher, createAuditEvent } from '@idp/common';
import {
  ServiceNotFoundError,
  ServiceAccessDeniedError,
} from '../../domain/exceptions/domain-exceptions';
import { SERVICE_REPOSITORY, ServiceRepository } from '../../domain/repositories/service.repository.port';

export interface DeleteServiceCommand {
  id: string;
  actorId: string;
  actorRoles: string[];
  ipAddress: string | null;
}

@Injectable()
export class DeleteServiceUseCase {
  constructor(
    @Inject(SERVICE_REPOSITORY) private readonly serviceRepository: ServiceRepository,
    @Inject(AUDIT_PUBLISHER) private readonly auditPublisher: AuditPublisher,
  ) {}

  async execute(command: DeleteServiceCommand): Promise<void> {
    const existing = await this.serviceRepository.findById(command.id);
    if (!existing) throw new ServiceNotFoundError(command.id);

    const canDelete =
      existing.ownerId === command.actorId ||
      command.actorRoles.some((r) => ['ORG_ADMIN', 'PLATFORM_ENGINEER'].includes(r));

    if (!canDelete) {
      await this.auditPublisher.publish(
        createAuditEvent({
          userId: command.actorId,
          action: 'SERVICE_DELETE',
          resourceType: 'SERVICE',
          resourceId: command.id,
          result: 'FAILURE',
          ipAddress: command.ipAddress,
          metadata: { reason: 'ACCESS_DENIED' },
        }),
      );
      throw new ServiceAccessDeniedError();
    }

    await this.serviceRepository.softDelete(command.id);

    await this.auditPublisher.publish(
      createAuditEvent({
        userId: command.actorId,
        action: 'SERVICE_DELETE',
        resourceType: 'SERVICE',
        resourceId: command.id,
        result: 'SUCCESS',
        ipAddress: command.ipAddress,
      }),
    );
  }
}