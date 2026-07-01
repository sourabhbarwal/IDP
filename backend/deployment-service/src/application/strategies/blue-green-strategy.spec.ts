import { BlueGreenStrategy } from './blue-green-strategy';
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

const baseParams = {
  namespace: 'dev-my-api',
  deploymentName: 'my-api',
  image: 'my-api:abc123',
  replicas: 2,
  containerPort: 3000,
};

describe('BlueGreenStrategy', () => {
  let strategy: BlueGreenStrategy;

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new BlueGreenStrategy();
  });

  it('deploys green, checks health, and switches Service selector when healthy', async () => {
    mockClient.ensureNamespace.mockResolvedValue(undefined);
    mockClient.applyBlueGreenDeployment.mockResolvedValue(undefined);
    mockClient.getDeploymentHealth.mockResolvedValue({ desiredReplicas: 2, readyReplicas: 2, isHealthy: true });
    mockClient.switchServiceSelector.mockResolvedValue(undefined);

    await strategy.execute(mockClient, baseParams);

    expect(mockClient.applyBlueGreenDeployment).toHaveBeenCalledWith(
      expect.objectContaining({ color: 'green' }),
    );
    expect(mockClient.switchServiceSelector).toHaveBeenCalledWith({
      namespace: 'dev-my-api',
      serviceName: 'my-api',
      activeColorLabel: 'green',
    });
  });

  it('throws and does not switch traffic when green is unhealthy', async () => {
    mockClient.ensureNamespace.mockResolvedValue(undefined);
    mockClient.applyBlueGreenDeployment.mockResolvedValue(undefined);
    mockClient.getDeploymentHealth.mockResolvedValue({ desiredReplicas: 2, readyReplicas: 0, isHealthy: false });

    await expect(strategy.execute(mockClient, baseParams)).rejects.toThrow(
      'Green deployment did not become healthy',
    );
    expect(mockClient.switchServiceSelector).not.toHaveBeenCalled();
  });
});