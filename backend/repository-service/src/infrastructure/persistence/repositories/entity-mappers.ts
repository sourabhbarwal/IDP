import { Repository } from '../../../domain/entities/repository.entity';
import { RepositoryOrmEntity } from '../orm-entities/repository.orm-entity';

export function toDomainRepository(e: RepositoryOrmEntity): Repository {
  return new Repository({
    id: e.id,
    serviceId: e.serviceId,
    serviceName: e.serviceName,
    serviceType: e.serviceType,
    githubOwner: e.githubOwner,
    githubRepo: e.githubRepo,
    fullName: e.fullName,
    defaultBranch: e.defaultBranch,
    htmlUrl: e.htmlUrl,
    cloneUrl: e.cloneUrl,
    sshUrl: e.sshUrl,
    visibility: e.visibility,
    status: e.status,
    provisionedBy: e.provisionedBy,
    provisionedAt: e.provisionedAt,
    errorMessage: e.errorMessage,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  });
}