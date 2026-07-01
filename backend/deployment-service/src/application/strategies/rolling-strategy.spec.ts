import { RollingStrategy } from './rolling-strategy';
import { KubernetesClient } from '../ports/kubernetes-client.port';

const mockClient: jest.Mocked<KubernetesClient> = {
  ensureNamespace: jest.fn(),
  applyRollingDeployment: jest.fn(),
  applyBlueGreenDeployment: jest.fn(),
  switchServiceSelector: jest.fn(),
  applyCanaryDeployment: jest.fn(),
  promoteCanary: jest.fn(),
  removeCanary: jest.fn(),
  getDeploymentHealth: jest.fn(),
  rollbackDeployment: jest.fn(),
  scaleDeployment: jest.fn(),
};

describe('RollingStrategy', () => {
  let strategy: RollingStrategy;

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new RollingStrategy();
  });

  it('ensures namespace and applies rolling deployment', async () => {
    mockClient.ensureNamespace.mockResolvedValue(undefined);
    mockClient.applyRollingDeployment.mockResolvedValue(undefined);

    await strategy.execute(mockClient, {
      namespace: 'dev-my-api',
      deploymentName: 'my-api',
      image: 'my-api:abc123',
      replicas: 2,
      containerPort: 3000,
    });

    expect(mockClient.ensureNamespace).toHaveBeenCalledWith('dev-my-api');
    expect(mockClient.applyRollingDeployment).toHaveBeenCalledWith({
      namespace: 'dev-my-api',
      deploymentName: 'my-api',
      image: 'my-api:abc123',
      replicas: 2,
      containerPort: 3000,
    });
  });

  it('checkHealth delegates to client.getDeploymentHealth', async () => {
    mockClient.getDeploymentHealth.mockResolvedValue({ desiredReplicas: 2, readyReplicas: 2, isHealthy: true });

    const result = await strategy.checkHealth(mockClient, 'dev-my-api', 'my-api');

    expect(mockClient.getDeploymentHealth).toHaveBeenCalledWith('dev-my-api', 'my-api');
    expect(result.isHealthy).toBe(true);
  });
});