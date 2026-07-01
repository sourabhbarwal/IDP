import { Injectable } from '@nestjs/common';
import { DeploymentStrategyHandler, ExecuteStrategyParams } from './deployment-strategy.interface';
import { DeploymentHealth, KubernetesClient } from '../ports/kubernetes-client.port';

/**
 * Blue-green deployment: deploy a parallel "green" Deployment alongside the
 * current "blue" one. Once green is healthy, the Service selector is
 * switched to route traffic to green. Blue remains for fast rollback.
 */
@Injectable()
export class BlueGreenStrategy implements DeploymentStrategyHandler {
  async execute(client: KubernetesClient, params: ExecuteStrategyParams): Promise<void> {
    await client.ensureNamespace(params.namespace);

    // Deploy the new version under the "green" label
    await client.applyBlueGreenDeployment({
      namespace: params.namespace,
      deploymentName: params.deploymentName,
      image: params.image,
      replicas: params.replicas,
      containerPort: params.containerPort,
      color: 'green',
    });

    // Wait for green to be healthy before switching traffic
    const health = await client.getDeploymentHealth(
      params.namespace,
      `${params.deploymentName}-green`,
    );

    if (!health.isHealthy) {
      throw new Error('Green deployment did not become healthy; aborting traffic switch');
    }

    // Switch the Service selector from blue to green
    await client.switchServiceSelector({
      namespace: params.namespace,
      serviceName: params.deploymentName,
      activeColorLabel: 'green',
    });
  }

  async checkHealth(
    client: KubernetesClient,
    namespace: string,
    deploymentName: string,
  ): Promise<DeploymentHealth> {
    return client.getDeploymentHealth(namespace, `${deploymentName}-green`);
  }
}