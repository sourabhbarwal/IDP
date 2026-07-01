import { DeploymentHealth, KubernetesClient } from '../ports/kubernetes-client.port';

export interface ExecuteStrategyParams {
  namespace: string;
  deploymentName: string;
  image: string;
  replicas: number;
  containerPort: number;
  canaryWeight?: number;
}

export interface DeploymentStrategyHandler {
  execute(client: KubernetesClient, params: ExecuteStrategyParams): Promise<void>;
  checkHealth(client: KubernetesClient, namespace: string, deploymentName: string): Promise<DeploymentHealth>;
}