import { CreateDeploymentUseCase } from './create-deployment.use-case';
import { ConfigService } from '@nestjs/config';
import { DeploymentStrategy } from '../../domain/enums/deployment-strategy.enum';
import { DeploymentStatus } from '../../domain/enums/deployment-status.enum';
import { EnvironmentName } from '../../domain/enums/environment-name.enum';
import { KubernetesOperationError } from '../../domain/exceptions/domain-exceptions';
import { Deployment } from '../../domain/entities/deployment.entity';
import { DeploymentRepository } from '../../domain/repositories/deployment.repository.port';
import { KubernetesClient } from '../ports/kubernetes-client.port';
import { AuditPublisher } from '@idp/common';
import { RollingStrategy } from '../strategies/rolling-strategy';
import { BlueGreenStrategy } from '../strategies/blue-green-strategy';
import { CanaryStrategy } from '../strategies/canary-strategy';

function makeDeployment(status = DeploymentStatus.SUCCEEDED): Deployment {
  return new Deployment({
    id: 'd-1', serviceId: 's-1', serviceName: 'my-api',
    environment: EnvironmentName.DEVELOPMENT, namespace: 'dev-my-api',
    imageTag: 'abc123', strategy: DeploymentStrategy.ROLLING, status,
    previousImageTag: null, replicas: 1, canaryWeight: null, errorMessage: null,
    triggeredBy: 'u-1', startedAt: new Date(), completedAt: null, createdAt: new Date(),
  });
}

const mockRepo: jest.Mocked<DeploymentRepository> = {
  findById: jest.fn(),
  findLastSuccessful: jest.fn(),
  findLatestForServiceEnv: jest.fn(),
  list: jest.fn(),
  create: jest.fn(),
  updateStatus: jest.fn(),
};

const mockK8s: jest.Mocked<KubernetesClient> = {
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

const mockAudit: jest.Mocked<AuditPublisher> = { publish: jest.fn() };

// notifyRealtime() makes a real fetch() call to realtime-service. Outside Docker
// (e.g. running `npm test` on the host), that hostname doesn't resolve, and
// resilientFetch's retry/timeout config can push a single test well past Jest's
// default 5s timeout. Mock fetch so these tests never depend on real network
// timing — notifyRealtime already treats failures as non-fatal (best-effort).
let fetchSpy: jest.SpyInstance;
beforeAll(() => {
  fetchSpy = jest.spyOn(global, 'fetch').mockRejectedValue(new Error('mocked: no network in unit tests'));
});
afterAll(() => {
  fetchSpy.mockRestore();
});

// Mimics ConfigService well enough for this use case's two calls:
// get('REALTIME_SERVICE_URL', default) and getOrThrow('INTERNAL_WEBHOOK_TOKEN').
const mockConfig = {
  get: jest.fn((key: string, defaultValue?: string) => {
    if (key === 'REALTIME_SERVICE_URL') return 'http://realtime-service:3013';
    return defaultValue;
  }),
  getOrThrow: jest.fn((key: string) => {
    if (key === 'INTERNAL_WEBHOOK_TOKEN') return 'test-internal-token';
    throw new Error(`mockConfig.getOrThrow: no test value configured for "${key}"`);
  }),
} as unknown as jest.Mocked<ConfigService>;

const command = {
  serviceId: 's-1', serviceName: 'my-api', environment: EnvironmentName.DEVELOPMENT,
  imageTag: 'abc123', strategy: DeploymentStrategy.ROLLING, replicas: 1,
  containerPort: 3000, canaryWeight: null, actorId: 'u-1', ipAddress: null,
};

describe('CreateDeploymentUseCase', () => {
  let useCase: CreateDeploymentUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new CreateDeploymentUseCase(
      mockRepo, mockK8s, mockAudit,
      new RollingStrategy(), new BlueGreenStrategy(), new CanaryStrategy(),
      mockConfig,
    );
  });

  it('creates a rolling deployment and marks it SUCCEEDED', async () => {
    mockRepo.findLastSuccessful.mockResolvedValue(null);
    mockRepo.create.mockResolvedValue(makeDeployment(DeploymentStatus.IN_PROGRESS));
    mockK8s.ensureNamespace.mockResolvedValue(undefined);
    mockK8s.applyRollingDeployment.mockResolvedValue(undefined);
    mockRepo.updateStatus.mockResolvedValue(undefined);
    mockRepo.findById.mockResolvedValue(makeDeployment(DeploymentStatus.SUCCEEDED));
    mockAudit.publish.mockResolvedValue(undefined);

    const result = await useCase.execute(command);

    expect(mockK8s.applyRollingDeployment).toHaveBeenCalled();
    expect(mockRepo.updateStatus).toHaveBeenCalledWith('d-1', DeploymentStatus.SUCCEEDED);
    expect(result.status).toBe(DeploymentStatus.SUCCEEDED);
    expect(mockAudit.publish).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'DEPLOYMENT_CREATE', result: 'SUCCESS' }),
    );
  });

  it('creates a blue-green deployment using BlueGreenStrategy', async () => {
    mockRepo.findLastSuccessful.mockResolvedValue(null);
    mockRepo.create.mockResolvedValue(makeDeployment(DeploymentStatus.IN_PROGRESS));
    mockK8s.ensureNamespace.mockResolvedValue(undefined);
    mockK8s.applyBlueGreenDeployment.mockResolvedValue(undefined);
    mockK8s.getDeploymentHealth.mockResolvedValue({ desiredReplicas: 1, readyReplicas: 1, isHealthy: true });
    mockK8s.switchServiceSelector.mockResolvedValue(undefined);
    mockRepo.updateStatus.mockResolvedValue(undefined);
    mockRepo.findById.mockResolvedValue(makeDeployment(DeploymentStatus.SUCCEEDED));
    mockAudit.publish.mockResolvedValue(undefined);

    await useCase.execute({ ...command, strategy: DeploymentStrategy.BLUE_GREEN });

    expect(mockK8s.applyBlueGreenDeployment).toHaveBeenCalled();
    expect(mockK8s.switchServiceSelector).toHaveBeenCalled();
  });

  it('creates a canary deployment using CanaryStrategy', async () => {
    mockRepo.findLastSuccessful.mockResolvedValue(null);
    mockRepo.create.mockResolvedValue(makeDeployment(DeploymentStatus.IN_PROGRESS));
    mockK8s.ensureNamespace.mockResolvedValue(undefined);
    mockK8s.applyCanaryDeployment.mockResolvedValue(undefined);
    mockRepo.updateStatus.mockResolvedValue(undefined);
    mockRepo.findById.mockResolvedValue(makeDeployment(DeploymentStatus.SUCCEEDED));
    mockAudit.publish.mockResolvedValue(undefined);

    await useCase.execute({ ...command, strategy: DeploymentStrategy.CANARY, canaryWeight: 30 });

    expect(mockK8s.applyCanaryDeployment).toHaveBeenCalled();
  });

  it('marks deployment FAILED and audits failure when Kubernetes operation throws', async () => {
    mockRepo.findLastSuccessful.mockResolvedValue(null);
    mockRepo.create.mockResolvedValue(makeDeployment(DeploymentStatus.IN_PROGRESS));
    mockK8s.ensureNamespace.mockResolvedValue(undefined);
    mockK8s.applyRollingDeployment.mockRejectedValue(new Error('K8s API unreachable'));
    mockRepo.updateStatus.mockResolvedValue(undefined);
    mockAudit.publish.mockResolvedValue(undefined);

    await expect(useCase.execute(command)).rejects.toThrow(KubernetesOperationError);

    expect(mockRepo.updateStatus).toHaveBeenCalledWith(
      'd-1', DeploymentStatus.FAILED, expect.stringContaining('K8s API unreachable'),
    );
    expect(mockAudit.publish).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'DEPLOYMENT_CREATE', result: 'FAILURE' }),
    );
  });

  it('captures previousImageTag from last successful deployment', async () => {
    mockRepo.findLastSuccessful.mockResolvedValue(makeDeployment(DeploymentStatus.SUCCEEDED));
    mockRepo.create.mockResolvedValue(makeDeployment(DeploymentStatus.IN_PROGRESS));
    mockK8s.ensureNamespace.mockResolvedValue(undefined);
    mockK8s.applyRollingDeployment.mockResolvedValue(undefined);
    mockRepo.updateStatus.mockResolvedValue(undefined);
    mockRepo.findById.mockResolvedValue(makeDeployment(DeploymentStatus.SUCCEEDED));
    mockAudit.publish.mockResolvedValue(undefined);

    await useCase.execute(command);

    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ previousImageTag: 'abc123' }),
    );
  });

  it('fails the deployment (does not crash the process) when INTERNAL_WEBHOOK_TOKEN is unset', async () => {
    mockConfig.getOrThrow.mockImplementationOnce(() => {
      throw new Error('Missing required environment variable: INTERNAL_WEBHOOK_TOKEN');
    });
    mockRepo.findLastSuccessful.mockResolvedValue(null);
    mockRepo.create.mockResolvedValue(makeDeployment(DeploymentStatus.IN_PROGRESS));
    mockK8s.ensureNamespace.mockResolvedValue(undefined);
    mockK8s.applyRollingDeployment.mockResolvedValue(undefined);
    mockRepo.updateStatus.mockResolvedValue(undefined);
    mockAudit.publish.mockResolvedValue(undefined);

    // getOrThrow fires inside notifyRealtime, which execute() calls within its own
    // try/catch — so a missing token surfaces as a failed deployment, not an
    // unhandled crash. Confirms the fail-fast config change degrades safely.
    await expect(useCase.execute(command)).rejects.toThrow(KubernetesOperationError);
    expect(mockRepo.updateStatus).toHaveBeenCalledWith(
      'd-1', DeploymentStatus.FAILED, expect.stringContaining('INTERNAL_WEBHOOK_TOKEN'),
    );
  });
});