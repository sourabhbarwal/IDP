import { PromoteDeploymentUseCase } from './promote-deployment.use-case';
import { DeploymentStatus } from '../../domain/enums/deployment-status.enum';
import { DeploymentStrategy } from '../../domain/enums/deployment-strategy.enum';
import { EnvironmentName } from '../../domain/enums/environment-name.enum';
import {
  CannotPromoteError,
  DeploymentNotFoundError,
  KubernetesOperationError,
} from '../../domain/exceptions/domain-exceptions';
import { Deployment } from '../../domain/entities/deployment.entity';
import { DeploymentRepository } from '../../domain/repositories/deployment.repository.port';
import { KubernetesClient } from '../ports/kubernetes-client.port';
import { AuditPublisher } from '@idp/common';
import { RollingStrategy } from '../strategies/rolling-strategy';

function makeDeployment(overrides: Partial<ConstructorParameters<typeof Deployment>[0]> = {}): Deployment {
  return new Deployment({
    id: 'd-1', serviceId: 's-1', serviceName: 'my-api',
    environment: EnvironmentName.DEVELOPMENT, namespace: 'dev-my-api',
    imageTag: 'abc123', strategy: DeploymentStrategy.ROLLING, status: DeploymentStatus.SUCCEEDED,
    previousImageTag: null, replicas: 1, canaryWeight: null, errorMessage: null,
    triggeredBy: 'u-1', startedAt: new Date(), completedAt: new Date(), createdAt: new Date(),
    ...overrides,
  });
}

const mockRepo: jest.Mocked<DeploymentRepository> = {
  findById: jest.fn(), findLastSuccessful: jest.fn(), findLatestForServiceEnv: jest.fn(),
  list: jest.fn(), create: jest.fn(), updateStatus: jest.fn(),
};

const mockK8s: jest.Mocked<KubernetesClient> = {
  ensureNamespace: jest.fn(), applyRollingDeployment: jest.fn(), applyBlueGreenDeployment: jest.fn(),
  switchServiceSelector: jest.fn(), applyCanaryDeployment: jest.fn(), promoteCanary: jest.fn(),
  removeCanary: jest.fn(), getDeploymentHealth: jest.fn(), rollbackDeployment: jest.fn(), scaleDeployment: jest.fn(),
};

const mockAudit: jest.Mocked<AuditPublisher> = { publish: jest.fn() };

describe('PromoteDeploymentUseCase', () => {
  let useCase: PromoteDeploymentUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new PromoteDeploymentUseCase(mockRepo, mockK8s, mockAudit, new RollingStrategy());
  });

  it('promotes a SUCCEEDED dev deployment to test environment', async () => {
    const source = makeDeployment({ environment: EnvironmentName.DEVELOPMENT });
    mockRepo.findById
      .mockResolvedValueOnce(source)
      .mockResolvedValueOnce(makeDeployment({ id: 'd-2', environment: EnvironmentName.TESTING }));
    mockRepo.findLastSuccessful.mockResolvedValue(null);
    mockRepo.create.mockResolvedValue(makeDeployment({ id: 'd-2', environment: EnvironmentName.TESTING }));
    mockK8s.ensureNamespace.mockResolvedValue(undefined);
    mockK8s.applyRollingDeployment.mockResolvedValue(undefined);
    mockRepo.updateStatus.mockResolvedValue(undefined);
    mockAudit.publish.mockResolvedValue(undefined);

    const result = await useCase.execute({ deploymentId: 'd-1', containerPort: 3000, actorId: 'u-1', ipAddress: null });

    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ environment: EnvironmentName.TESTING, namespace: 'test-my-api' }),
    );
    expect(result.environment).toBe(EnvironmentName.TESTING);
  });

  it('throws DeploymentNotFoundError when source does not exist', async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(
      useCase.execute({ deploymentId: 'bad-id', containerPort: 3000, actorId: 'u-1', ipAddress: null }),
    ).rejects.toThrow(DeploymentNotFoundError);
  });

  it('throws CannotPromoteError when source is not SUCCEEDED', async () => {
    mockRepo.findById.mockResolvedValue(makeDeployment({ status: DeploymentStatus.FAILED }));
    await expect(
      useCase.execute({ deploymentId: 'd-1', containerPort: 3000, actorId: 'u-1', ipAddress: null }),
    ).rejects.toThrow(CannotPromoteError);
  });

  it('throws CannotPromoteError when already in PRODUCTION (no next environment)', async () => {
    mockRepo.findById.mockResolvedValue(makeDeployment({ environment: EnvironmentName.PRODUCTION }));
    await expect(
      useCase.execute({ deploymentId: 'd-1', containerPort: 3000, actorId: 'u-1', ipAddress: null }),
    ).rejects.toThrow(CannotPromoteError);
  });

  it('marks promotion FAILED when K8s operation throws', async () => {
    mockRepo.findById.mockResolvedValue(makeDeployment());
    mockRepo.findLastSuccessful.mockResolvedValue(null);
    mockRepo.create.mockResolvedValue(makeDeployment({ id: 'd-2' }));
    mockK8s.ensureNamespace.mockResolvedValue(undefined);
    mockK8s.applyRollingDeployment.mockRejectedValue(new Error('K8s error'));
    mockRepo.updateStatus.mockResolvedValue(undefined);
    mockAudit.publish.mockResolvedValue(undefined);

    await expect(
      useCase.execute({ deploymentId: 'd-1', containerPort: 3000, actorId: 'u-1', ipAddress: null }),
    ).rejects.toThrow(KubernetesOperationError);
  });
});