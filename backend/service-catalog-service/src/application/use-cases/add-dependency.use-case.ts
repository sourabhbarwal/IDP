import { Inject, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AUDIT_PUBLISHER, AuditPublisher, createAuditEvent } from '@idp/common';
import { ApiException } from '@idp/common';
import { ServiceDependency } from '../../domain/entities/service-dependency.entity';
import { DependencyType } from '../../domain/enums/dependency-type.enum';

export interface AddDependencyCommand {
  serviceId:      string;
  dependencyId:   string;
  dependencyType: DependencyType;
  description:    string | null;
  actorId:        string;
  ipAddress:      string | null;
}

@Injectable()
export class AddDependencyUseCase {
  constructor(
    @InjectDataSource() private readonly db: DataSource,
    @Inject(AUDIT_PUBLISHER) private readonly audit: AuditPublisher,
  ) {}

  async execute(command: AddDependencyCommand): Promise<ServiceDependency> {
    if (command.serviceId === command.dependencyId) {
      throw ApiException.badRequest('A service cannot depend on itself');
    }

    // Verify both services exist
    const [svc, dep] = await Promise.all([
      this.db.query(
        `SELECT id, name FROM catalog.services WHERE id = $1 AND deleted_at IS NULL`,
        [command.serviceId],
      ),
      this.db.query(
        `SELECT id, name FROM catalog.services WHERE id = $1 AND deleted_at IS NULL`,
        [command.dependencyId],
      ),
    ]);

    if (!svc[0]) throw ApiException.notFound('Service', command.serviceId);
    if (!dep[0]) throw ApiException.notFound('Service', command.dependencyId);

    // Check for circular dependency
    const circular = await this.db.query(
      `SELECT 1 FROM catalog.service_dependencies
       WHERE service_id = $1 AND dependency_id = $2`,
      [command.dependencyId, command.serviceId],
    );
    if (circular.length > 0) {
      throw ApiException.badRequest(
        `Circular dependency detected: ${dep[0].name} already depends on ${svc[0].name}`,
      );
    }

    // Upsert the dependency
    const result = await this.db.query(
      `INSERT INTO catalog.service_dependencies
         (service_id, dependency_id, dependency_type, description)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (service_id, dependency_id)
         DO UPDATE SET
           dependency_type = EXCLUDED.dependency_type,
           description     = EXCLUDED.description
       RETURNING id, created_at`,
      [command.serviceId, command.dependencyId, command.dependencyType, command.description],
    );

    await this.audit.publish(createAuditEvent({
      userId:       command.actorId,
      action:       'SERVICE_DEPENDENCY_ADD',
      resourceType: 'SERVICE',
      resourceId:   command.serviceId,
      result:       'SUCCESS',
      ipAddress:    command.ipAddress,
      metadata: {
        dependencyId:   command.dependencyId,
        dependencyName: dep[0].name,
        dependencyType: command.dependencyType,
      },
    }));

    return new ServiceDependency({
      id:             result[0].id,
      serviceId:      command.serviceId,
      serviceName:    svc[0].name,
      dependencyId:   command.dependencyId,
      dependencyName: dep[0].name,
      dependencyType: command.dependencyType,
      description:    command.description,
      createdAt:      result[0].created_at,
    });
  }
}