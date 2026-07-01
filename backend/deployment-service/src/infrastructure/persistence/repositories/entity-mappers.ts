import { Deployment } from '../../../domain/entities/deployment.entity';
import { DeploymentOrmEntity } from '../orm-entities/deployment.orm-entity';

export function toDomainDeployment(e: DeploymentOrmEntity): Deployment {
  return new Deployment({
    id: e.id,
    serviceId: e.serviceId,
    serviceName: e.serviceName,
    environment: e.environment,
    namespace: e.namespace,
    imageTag: e.imageTag,
    strategy: e.strategy,
    status: e.status,
    previousImageTag: e.previousImageTag,
    replicas: e.replicas,
    canaryWeight: e.canaryWeight,
    errorMessage: e.errorMessage,
    triggeredBy: e.triggeredBy,
    startedAt: e.startedAt,
    completedAt: e.completedAt,
    createdAt: e.createdAt,
  });
}