import { Inject, Injectable, Logger } from '@nestjs/common';
import { AUDIT_PUBLISHER, AuditPublisher, createAuditEvent } from '@idp/common';
import { Deployment } from '../../domain/entities/deployment.entity';
import { DeploymentStrategy } from '../../domain/enums/deployment-strategy.enum';
import { DeploymentStatus } from '../../domain/enums/deployment-status.enum';
import { EnvironmentName, namespacePrefix } from '../../domain/enums/environment-name.enum';
import { KubernetesOperationError } from '../../domain/exceptions/domain-exceptions';
import {
  DEPLOYMENT_REPOSITORY,
  DeploymentRepository,
} from '../../domain/repositories/deployment.repository.port';
import { KUBERNETES_CLIENT, KubernetesClient } from '../ports/kubernetes-client.port';
import { RollingStrategy } from '../strategies/rolling-strategy';
import { BlueGreenStrategy } from '../strategies/blue-green-strategy';
import { CanaryStrategy } from '../strategies/canary-strategy';

export interface CreateDeploymentCommand {
  serviceId: string;
  serviceName: string;
  environment: EnvironmentName;
  imageTag: string;
  strategy: DeploymentStrategy;
  replicas: number;
  containerPort: number;
  canaryWeight: number | null;
  actorId: string;
  ipAddress: string | null;
}

@Injectable()
export class CreateDeploymentUseCase {
  private readonly logger = new Logger(CreateDeploymentUseCase.name);

  constructor(
    @Inject(DEPLOYMENT_REPOSITORY) private readonly deploymentRepository: DeploymentRepository,
    @Inject(KUBERNETES_CLIENT) private readonly k8sClient: KubernetesClient,
    @Inject(AUDIT_PUBLISHER) private readonly auditPublisher: AuditPublisher,
    private readonly rollingStrategy: RollingStrategy,
    private readonly blueGreenStrategy: BlueGreenStrategy,
    private readonly canaryStrategy: CanaryStrategy,
  ) {}

  async execute(command: CreateDeploymentCommand): Promise<Deployment> {
    const namespace = `${namespacePrefix(command.environment)}-${command.serviceName}`;

    const previous = await this.deploymentRepository.findLastSuccessful(
      command.serviceId,
      command.environment,
    );

    const record = await this.deploymentRepository.create({
      serviceId: command.serviceId,
      serviceName: command.serviceName,
      environment: command.environment,
      namespace,
      imageTag: command.imageTag,
      strategy: command.strategy,
      previousImageTag: previous?.imageTag ?? null,
      replicas: command.replicas,
      canaryWeight: command.canaryWeight,
      triggeredBy: command.actorId,
    });

    try {
      const image = `${command.serviceName}:${command.imageTag}`;
      const strategyParams = {
        namespace,
        deploymentName: command.serviceName,
        image,
        replicas: command.replicas,
        containerPort: command.containerPort,
        canaryWeight: command.canaryWeight ?? undefined,
      };

      switch (command.strategy) {
        case DeploymentStrategy.ROLLING:
          await this.rollingStrategy.execute(this.k8sClient, strategyParams);
          break;
        case DeploymentStrategy.BLUE_GREEN:
          await this.blueGreenStrategy.execute(this.k8sClient, strategyParams);
          break;
        case DeploymentStrategy.CANARY:
          await this.canaryStrategy.execute(this.k8sClient, strategyParams);
          break;
      }

      await this.deploymentRepository.updateStatus(record.id, DeploymentStatus.SUCCEEDED);

      await this.auditPublisher.publish(
        createAuditEvent({
          userId: command.actorId,
          action: 'DEPLOYMENT_CREATE',
          resourceType: 'DEPLOYMENT',
          resourceId: record.id,
          result: 'SUCCESS',
          ipAddress: command.ipAddress,
          metadata: { strategy: command.strategy, environment: command.environment },
        }),
      );

      const updated = await this.deploymentRepository.findById(record.id);
      if (!updated) {
        throw new Error(`Deployment record ${record.id} not found after creation`);
      }
      return updated;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Deployment failed for ${command.serviceName}: ${message}`);
      await this.deploymentRepository.updateStatus(record.id, DeploymentStatus.FAILED, message);

      await this.auditPublisher.publish(
        createAuditEvent({
          userId: command.actorId,
          action: 'DEPLOYMENT_CREATE',
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