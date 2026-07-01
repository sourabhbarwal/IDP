import { Inject, Injectable, Logger } from '@nestjs/common';
import { AUDIT_PUBLISHER, AuditPublisher, createAuditEvent } from '@idp/common';
import { Deployment } from '../../domain/entities/deployment.entity';
import { DeploymentStrategy } from '../../domain/enums/deployment-strategy.enum';
import { DeploymentStatus } from '../../domain/enums/deployment-status.enum';
import { nextEnvironment, namespacePrefix } from '../../domain/enums/environment-name.enum';
import {
  CannotPromoteError,
  DeploymentNotFoundError,
  KubernetesOperationError,
} from '../../domain/exceptions/domain-exceptions';
import {
  DEPLOYMENT_REPOSITORY,
  DeploymentRepository,
} from '../../domain/repositories/deployment.repository.port';
import { KUBERNETES_CLIENT, KubernetesClient } from '../ports/kubernetes-client.port';
import { RollingStrategy } from '../strategies/rolling-strategy';

export interface PromoteDeploymentCommand {
  deploymentId: string;
  containerPort: number;
  actorId: string;
  ipAddress: string | null;
}

/**
 * Promotes a successful deployment to the next environment in the
 * promotion chain (dev -> test -> staging -> prod), re-deploying the
 * same image tag using the rolling strategy in the target environment.
 */
@Injectable()
export class PromoteDeploymentUseCase {
  private readonly logger = new Logger(PromoteDeploymentUseCase.name);

  constructor(
    @Inject(DEPLOYMENT_REPOSITORY) private readonly deploymentRepository: DeploymentRepository,
    @Inject(KUBERNETES_CLIENT) private readonly k8sClient: KubernetesClient,
    @Inject(AUDIT_PUBLISHER) private readonly auditPublisher: AuditPublisher,
    private readonly rollingStrategy: RollingStrategy,
  ) {}

  async execute(command: PromoteDeploymentCommand): Promise<Deployment> {
    const source = await this.deploymentRepository.findById(command.deploymentId);
    if (!source) throw new DeploymentNotFoundError(command.deploymentId);

    if (source.status !== DeploymentStatus.SUCCEEDED) {
      throw new CannotPromoteError(
        `Deployment '${source.id}' must be SUCCEEDED to promote (currently ${source.status})`,
      );
    }

    const target = nextEnvironment(source.environment);
    if (!target) {
      throw new CannotPromoteError(
        `Environment '${source.environment}' has no next environment to promote to`,
      );
    }

    const namespace = `${namespacePrefix(target)}-${source.serviceName}`;
    const previousInTarget = await this.deploymentRepository.findLastSuccessful(
      source.serviceId,
      target,
    );

    const record = await this.deploymentRepository.create({
      serviceId: source.serviceId,
      serviceName: source.serviceName,
      environment: target,
      namespace,
      imageTag: source.imageTag,
      strategy: DeploymentStrategy.ROLLING,
      previousImageTag: previousInTarget?.imageTag ?? null,
      replicas: source.replicas,
      canaryWeight: null,
      triggeredBy: command.actorId,
    });

    try {
      const image = `${source.serviceName}:${source.imageTag}`;
      await this.rollingStrategy.execute(this.k8sClient, {
        namespace,
        deploymentName: source.serviceName,
        image,
        replicas: source.replicas,
        containerPort: command.containerPort,
      });

      await this.deploymentRepository.updateStatus(record.id, DeploymentStatus.SUCCEEDED);

      await this.auditPublisher.publish(
        createAuditEvent({
          userId: command.actorId,
          action: 'DEPLOYMENT_PROMOTE',
          resourceType: 'DEPLOYMENT',
          resourceId: record.id,
          result: 'SUCCESS',
          ipAddress: command.ipAddress,
          metadata: { from: source.environment, to: target },
        }),
      );

      const updated = await this.deploymentRepository.findById(record.id);
      if (!updated) {
        throw new Error(`Promotion record ${record.id} not found after creation`);
      }
      return updated;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Promotion failed for ${source.serviceName}: ${message}`);
      await this.deploymentRepository.updateStatus(record.id, DeploymentStatus.FAILED, message);

      await this.auditPublisher.publish(
        createAuditEvent({
          userId: command.actorId,
          action: 'DEPLOYMENT_PROMOTE',
          resourceType: 'DEPLOYMENT',
          resourceId: record.id,
          result: 'FAILURE',
          ipAddress: command.ipAddress,
          metadata: { error: message },
        }),
      );

      throw new KubernetesOperationError(message);
    }
  }
}