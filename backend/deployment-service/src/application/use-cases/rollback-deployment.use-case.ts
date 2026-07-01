import { Inject, Injectable, Logger } from '@nestjs/common';
import { AUDIT_PUBLISHER, AuditPublisher, createAuditEvent } from '@idp/common';
import { Deployment } from '../../domain/entities/deployment.entity';
import { DeploymentStrategy } from '../../domain/enums/deployment-strategy.enum';
import { DeploymentStatus } from '../../domain/enums/deployment-status.enum';
import { EnvironmentName } from '../../domain/enums/environment-name.enum';
import {
  DeploymentNotFoundError,
  KubernetesOperationError,
  NoPreviousDeploymentError,
} from '../../domain/exceptions/domain-exceptions';
import {
  DEPLOYMENT_REPOSITORY,
  DeploymentRepository,
} from '../../domain/repositories/deployment.repository.port';
import { KUBERNETES_CLIENT, KubernetesClient } from '../ports/kubernetes-client.port';

export interface RollbackDeploymentCommand {
  deploymentId: string;
  actorId: string;
  ipAddress: string | null;
}

@Injectable()
export class RollbackDeploymentUseCase {
  private readonly logger = new Logger(RollbackDeploymentUseCase.name);

  constructor(
    @Inject(DEPLOYMENT_REPOSITORY) private readonly deploymentRepository: DeploymentRepository,
    @Inject(KUBERNETES_CLIENT) private readonly k8sClient: KubernetesClient,
    @Inject(AUDIT_PUBLISHER) private readonly auditPublisher: AuditPublisher,
  ) {}

  async execute(command: RollbackDeploymentCommand): Promise<Deployment> {
    const target = await this.deploymentRepository.findById(command.deploymentId);
    if (!target) throw new DeploymentNotFoundError(command.deploymentId);

    if (!target.previousImageTag) {
      throw new NoPreviousDeploymentError(target.serviceId, target.environment);
    }

    const rollbackRecord = await this.deploymentRepository.create({
      serviceId: target.serviceId,
      serviceName: target.serviceName,
      environment: target.environment,
      namespace: target.namespace,
      imageTag: target.previousImageTag,
      strategy: DeploymentStrategy.ROLLING,
      previousImageTag: target.imageTag,
      replicas: target.replicas,
      canaryWeight: null,
      triggeredBy: command.actorId,
    });

    try {
      const previousImage = `${target.serviceName}:${target.previousImageTag}`;
      await this.k8sClient.rollbackDeployment(target.namespace, target.serviceName, previousImage);

      await this.deploymentRepository.updateStatus(rollbackRecord.id, DeploymentStatus.ROLLED_BACK);
      await this.deploymentRepository.updateStatus(target.id, DeploymentStatus.ROLLED_BACK);

      await this.auditPublisher.publish(
        createAuditEvent({
          userId: command.actorId,
          action: 'DEPLOYMENT_ROLLBACK',
          resourceType: 'DEPLOYMENT',
          resourceId: target.id,
          result: 'SUCCESS',
          ipAddress: command.ipAddress,
          metadata: { rolledBackTo: target.previousImageTag },
        }),
      );

      const updated = await this.deploymentRepository.findById(rollbackRecord.id);
      if (!updated) {
        throw new Error(`Rollback record ${rollbackRecord.id} not found after creation`);
      }
      return updated;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Rollback failed for ${target.serviceName}: ${message}`);
      await this.deploymentRepository.updateStatus(rollbackRecord.id, DeploymentStatus.FAILED, message);

      await this.auditPublisher.publish(
        createAuditEvent({
          userId: command.actorId,
          action: 'DEPLOYMENT_ROLLBACK',
          resourceType: 'DEPLOYMENT',
          resourceId: target.id,
          result: 'FAILURE',
          ipAddress: command.ipAddress,
          metadata: { error: message },
        }),
      );

      throw new KubernetesOperationError(message);
    }
  }
}