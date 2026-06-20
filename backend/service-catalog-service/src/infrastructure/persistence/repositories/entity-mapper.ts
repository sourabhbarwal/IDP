import { Service } from '../../../domain/entities/service.entity';
import { ServiceVersion } from '../../../domain/entities/service-version.entity';
import { ServiceOrmEntity } from '../orm-entities/service.orm-entity';
import { ServiceVersionOrmEntity } from '../orm-entities/service-version.orm-entity';

export function toDomainServiceVersion(e: ServiceVersionOrmEntity): ServiceVersion {
  return new ServiceVersion({
    id: e.id,
    serviceId: e.serviceId,
    version: e.version,
    changelog: e.changelog,
    deployedAt: e.deployedAt,
    environment: e.environment,
    createdAt: e.createdAt,
    createdBy: e.createdBy,
  });
}

export function toDomainService(e: ServiceOrmEntity): Service {
  return new Service({
    id: e.id,
    name: e.name,
    description: e.description,
    type: e.type,
    status: e.status,
    ownerId: e.ownerId,
    ownerEmail: e.ownerEmail,
    team: e.team,
    repositoryUrl: e.repositoryUrl,
    tags: e.tags ?? [],
    versions: (e.versions ?? []).map(toDomainServiceVersion),
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
    createdBy: e.createdBy,
    updatedBy: e.updatedBy,
  });
}