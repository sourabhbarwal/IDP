import { Inject, Injectable } from '@nestjs/common';
import { AUDIT_PUBLISHER, AuditPublisher, createAuditEvent } from '@idp/common';
import { Service } from '../../domain/entities/service.entity';
import { ServiceType } from '../../domain/enums/service-type.enum';
import { ServiceStatus } from '../../domain/enums/service-status.enum';
import {
  ServiceNotFoundError,
  ServiceAccessDeniedError,
} from '../../domain/exceptions/domain-exceptions';
import { SERVICE_REPOSITORY, ServiceRepository } from '../../domain/repositories/service.repository.port';

export interface UpdateServiceCommand {
  id: string;
  description?: string | null;
  type?: ServiceType;
  status?: ServiceStatus;
  team?: string | null;
  repositoryUrl?: string | null;
  tags?: string[];
  actorId: string;
  actorRoles: string[];
  ipAddress: string | null;
}

@Injectable()
export class UpdateServiceUseCase {
  constructor(
    @Inject(SERVICE_REPOSITORY) private readonly serviceRepository: ServiceRepository,
    @Inject(AUDIT_PUBLISHER) private readonly auditPublisher: AuditPublisher,
  ) {}

  async execute(command: UpdateServiceCommand): Promise<Service> {
    const existing = await this.serviceRepository.findById(command.id);
    if (!existing) throw new ServiceNotFoundError(command.id);

    // Only the owner or an admin-level role can update
    const canModify =
      existing.ownerId === command.actorId ||
      command.actorRoles.some((r) => ['ORG_ADMIN', 'PLATFORM_ENGINEER'].includes(r));

    if (!canModify) {
      await this.auditPublisher.publish(
        createAuditEvent({
          userId: command.actorId,
          action: 'SERVICE_UPDATE',
          resourceType: 'SERVICE',
          resourceId: command.id,
          result: 'FAILURE',
          ipAddress: command.ipAddress,
          metadata: { reason: 'ACCESS_DENIED' },
        }),
      );
      throw new ServiceAccessDeniedError();
    }

    const updated = await this.serviceRepository.update(command.id, {
      description: command.description,
      type: command.type,
      status: command.status,
      team: command.team,
      repositoryUrl: command.repositoryUrl,
      tags: command.tags,
      updatedBy: command.actorId,
    });

    await this.auditPublisher.publish(
      createAuditEvent({
        userId: command.actorId,
        action: 'SERVICE_UPDATE',
        resourceType: 'SERVICE',
        resourceId: command.id,
        result: 'SUCCESS',
        ipAddress: command.ipAddress,
      }),
    );

    return updated;
  }
}