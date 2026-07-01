import { Injectable } from '@nestjs/common';
import { DeploymentStrategyHandler, ExecuteStrategyParams } from './deployment-strategy.interface';
import { DeploymentHealth, KubernetesClient } from '../ports/kubernetes-client.port';

/**
 * Canary deployment: deploys a subset of replicas running the new version
 * alongside the stable version. The Service load-balances across both
 * label-matched Deployments, approximating a traffic percentage equal to
 * canaryReplicas / (stableReplicas + canaryReplicas).
 */
@Injectable()
export class CanaryStrategy implements DeploymentStrategyHandler {
  async execute(client: KubernetesClient, params: ExecuteStrategyParams): Promise<void> {
    await client.ensureNamespace(params.namespace);

    const weight = params.canaryWeight ?? 20; // default 20% canary traffic
    const canaryReplicas = Math.max(1, Math.round((params.replicas * weight) / 100));

    await client.applyCanaryDeployment({
      namespace: params.namespace,
      deploymentName: params.deploymentName,
      image: params.image,
      canaryReplicas,
      containerPort: params.containerPort,
    });
  }

  async checkHealth(
    client: KubernetesClient,
    namespace: string,
    deploymentName: string,
  ): Promise<DeploymentHealth> {
    return client.getDeploymentHealth(namespace, `${deploymentName}-canary`);
  }

  /** Promotes the canary to become the new stable version (100% traffic). */
  async promote(client: KubernetesClient, namespace: string, deploymentName: string): Promise<void> {
    await client.promoteCanary(namespace, deploymentName);
  }

  /** Removes the canary deployment without promoting (abort canary). */
  async abort(client: KubernetesClient, namespace: string, deploymentName: string): Promise<void> {
    await client.removeCanary(namespace, deploymentName);
  }
}