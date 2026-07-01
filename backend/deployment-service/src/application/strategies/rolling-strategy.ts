import { Injectable } from '@nestjs/common';
import { DeploymentStrategyHandler, ExecuteStrategyParams } from './deployment-strategy.interface';
import { DeploymentHealth, KubernetesClient } from '../ports/kubernetes-client.port';

/**
 * Rolling deployment: standard Kubernetes RollingUpdate. Pods are replaced
 * gradually; Kubernetes itself manages maxSurge/maxUnavailable.
 */
@Injectable()
export class RollingStrategy implements DeploymentStrategyHandler {
  async execute(client: KubernetesClient, params: ExecuteStrategyParams): Promise<void> {
    await client.ensureNamespace(params.namespace);
    await client.applyRollingDeployment({
      namespace: params.namespace,
      deploymentName: params.deploymentName,
      image: params.image,
      replicas: params.replicas,
      containerPort: params.containerPort,
    });
  }

  async checkHealth(
    client: KubernetesClient,
    namespace: string,
    deploymentName: string,
  ): Promise<DeploymentHealth> {
    return client.getDeploymentHealth(namespace, deploymentName);
  }
}