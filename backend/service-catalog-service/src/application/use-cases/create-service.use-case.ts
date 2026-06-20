import { Inject, Injectable } from '@nestjs/common';
import { AUDIT_PUBLISHER, AuditPublisher, createAuditEvent } from '@idp/common';
import { Service } from '../../domain/entities/service.entity';
import { ServiceType } from '../../domain/enums/service-type.enum';
import { ServiceNameConflictError } from '../../domain/exceptions/domain-exceptions';
import { SERVICE_REPOSITORY, ServiceRepository } from '../../domain/repositories/service.repository.port';

export interface CreateServiceCommand {
  name: string;
  description: string | null;
  type: ServiceType;
  team: string | null;
  repositoryUrl: string | null;
  tags: string[];
  actorId: string;
  actorEmail: string;
  ipAddress: string | null;
}

@Injectable()
export class CreateServiceUseCase {
  constructor(
    @Inject(SERVICE_REPOSITORY) private readonly serviceRepository: ServiceRepository,
    @Inject(AUDIT_PUBLISHER) private readonly auditPublisher: AuditPublisher,
  ) {}

  async execute(command: CreateServiceCommand): Promise<Service> {
    const normalizedName = command.name.trim().toLowerCase().replace(/\s+/g, '-');

    const exists = await this.serviceRepository.existsByName(normalizedName);
    if (exists) {
      await this.auditPublisher.publish(
        createAuditEvent({
          userId: command.actorId,
          action: 'SERVICE_CREATE',
          resourceType: 'SERVICE',
          resourceId: normalizedName,
          result: 'FAILURE',
          ipAddress: command.ipAddress,
          metadata: { reason: 'NAME_CONFLICT' },
        }),
      );
      throw new ServiceNameConflictError(normalizedName);
    }

    const service = await this.serviceRepository.create({
      name: normalizedName,
      description: command.description,
      type: command.type,
      team: command.team,
      repositoryUrl: command.repositoryUrl,
      tags: command.tags,
      ownerId: command.actorId,
      ownerEmail: command.actorEmail,
      createdBy: command.actorId,
    });

    await this.auditPublisher.publish(
      createAuditEvent({
        userId: command.actorId,
        action: 'SERVICE_CREATE',
        resourceType: 'SERVICE',
        resourceId: service.id,
        result: 'SUCCESS',
        ipAddress: command.ipAddress,
      }),
    );

    return service;
  }
}