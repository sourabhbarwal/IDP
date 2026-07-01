export const KUBERNETES_CLIENT = 'KUBERNETES_CLIENT';

export interface DeployRollingParams {
  namespace: string;
  deploymentName: string;
  image: string;
  replicas: number;
  containerPort: number;
}

export interface BlueGreenSwitchParams {
  namespace: string;
  serviceName: string;
  activeColorLabel: string; // 'blue' | 'green'
}

export interface CanaryParams {
  namespace: string;
  deploymentName: string;
  image: string;
  canaryReplicas: number;
  containerPort: number;
}

export interface DeploymentHealth {
  desiredReplicas: number;
  readyReplicas: number;
  isHealthy: boolean;
}

/**
 * Port for Kubernetes API operations. Implemented with @kubernetes/client-node
 * in infrastructure; mocked in unit tests. Following the same pattern as
 * GithubClient in repository-service (ADR-0005).
 */
export interface KubernetesClient {
  ensureNamespace(namespace: string): Promise<void>;
  applyRollingDeployment(params: DeployRollingParams): Promise<void>;
  applyBlueGreenDeployment(params: DeployRollingParams & { color: 'blue' | 'green' }): Promise<void>;
  switchServiceSelector(params: BlueGreenSwitchParams): Promise<void>;
  applyCanaryDeployment(params: CanaryParams): Promise<void>;
  promoteCanary(namespace: string, deploymentName: string): Promise<void>;
  removeCanary(namespace: string, deploymentName: string): Promise<void>;
  getDeploymentHealth(namespace: string, deploymentName: string): Promise<DeploymentHealth>;
  rollbackDeployment(namespace: string, deploymentName: string, previousImage: string): Promise<void>;
  scaleDeployment(namespace: string, deploymentName: string, replicas: number): Promise<void>;
}