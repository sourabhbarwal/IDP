import { CanaryStrategy } from './canary-strategy';
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

describe('CanaryStrategy', () => {
  let strategy: CanaryStrategy;

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new CanaryStrategy();
  });

  it('computes canary replicas from weight and applies canary deployment', async () => {
    mockClient.ensureNamespace.mockResolvedValue(undefined);
    mockClient.applyCanaryDeployment.mockResolvedValue(undefined);

    await strategy.execute(mockClient, {
      namespace: 'dev-my-api',
      deploymentName: 'my-api',
      image: 'my-api:abc123',
      replicas: 10,
      containerPort: 3000,
      canaryWeight: 20,
    });

    expect(mockClient.applyCanaryDeployment).toHaveBeenCalledWith(
      expect.objectContaining({ canaryReplicas: 2 }), // 20% of 10
    );
  });

  it('defaults to 20% weight when not specified', async () => {
    mockClient.ensureNamespace.mockResolvedValue(undefined);
    mockClient.applyCanaryDeployment.mockResolvedValue(undefined);

    await strategy.execute(mockClient, {
      namespace: 'dev-my-api',
      deploymentName: 'my-api',
      image: 'my-api:abc123',
      replicas: 5,
      containerPort: 3000,
    });

    expect(mockClient.applyCanaryDeployment).toHaveBeenCalledWith(
      expect.objectContaining({ canaryReplicas: 1 }), // 20% of 5 = 1
    );
  });

  it('ensures at least 1 canary replica even for small percentages', async () => {
    mockClient.ensureNamespace.mockResolvedValue(undefined);
    mockClient.applyCanaryDeployment.mockResolvedValue(undefined);

    await strategy.execute(mockClient, {
      namespace: 'dev-my-api',
      deploymentName: 'my-api',
      image: 'my-api:abc123',
      replicas: 1,
      containerPort: 3000,
      canaryWeight: 5,
    });

    expect(mockClient.applyCanaryDeployment).toHaveBeenCalledWith(
      expect.objectContaining({ canaryReplicas: 1 }),
    );
  });

  it('promote() delegates to client.promoteCanary', async () => {
    mockClient.promoteCanary.mockResolvedValue(undefined);
    await strategy.promote(mockClient, 'dev-my-api', 'my-api');
    expect(mockClient.promoteCanary).toHaveBeenCalledWith('dev-my-api', 'my-api');
  });

  it('abort() delegates to client.removeCanary', async () => {
    mockClient.removeCanary.mockResolvedValue(undefined);
    await strategy.abort(mockClient, 'dev-my-api', 'my-api');
    expect(mockClient.removeCanary).toHaveBeenCalledWith('dev-my-api', 'my-api');
  });
});