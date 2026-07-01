import { RollbackDeploymentUseCase } from './rollback-deployment.use-case';
import { DeploymentStatus } from '../../domain/enums/deployment-status.enum';
import { DeploymentStrategy } from '../../domain/enums/deployment-strategy.enum';
import { EnvironmentName } from '../../domain/enums/environment-name.enum';
import {
  DeploymentNotFoundError,
  KubernetesOperationError,
  NoPreviousDeploymentError,
} from '../../domain/exceptions/domain-exceptions';
import { Deployment } from '../../domain/entities/deployment.entity';
import { DeploymentRepository } from '../../domain/repositories/deployment.repository.port';
import { KubernetesClient } from '../ports/kubernetes-client.port';
import { AuditPublisher } from '@idp/common';

function makeDeployment(overrides: Partial<ConstructorParameters<typeof Deployment>[0]> = {}): Deployment {
  return new Deployment({
    id: 'd-1', serviceId: 's-1', serviceName: 'my-api',
    environment: EnvironmentName.DEVELOPMENT, namespace: 'dev-my-api',
    imageTag: 'new-tag', strategy: DeploymentStrategy.ROLLING, status: DeploymentStatus.SUCCEEDED,
    previousImageTag: 'old-tag', replicas: 1, canaryWeight: null, errorMessage: null,
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

describe('RollbackDeploymentUseCase', () => {
  let useCase: RollbackDeploymentUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new RollbackDeploymentUseCase(mockRepo, mockK8s, mockAudit);
  });

  it('rolls back to previous image and marks both records ROLLED_BACK', async () => {
    const target = makeDeployment();
    mockRepo.findById
      .mockResolvedValueOnce(target)
      .mockResolvedValueOnce(makeDeployment({ id: 'd-2', status: DeploymentStatus.ROLLED_BACK }));
    mockRepo.create.mockResolvedValue(makeDeployment({ id: 'd-2' }));
    mockK8s.rollbackDeployment.mockResolvedValue(undefined);
    mockRepo.updateStatus.mockResolvedValue(undefined);
    mockAudit.publish.mockResolvedValue(undefined);

    const result = await useCase.execute({ deploymentId: 'd-1', actorId: 'u-1', ipAddress: null });

    expect(mockK8s.rollbackDeployment).toHaveBeenCalledWith('dev-my-api', 'my-api', 'my-api:old-tag');
    expect(mockRepo.updateStatus).toHaveBeenCalledWith('d-2', DeploymentStatus.ROLLED_BACK);
    expect(mockRepo.updateStatus).toHaveBeenCalledWith('d-1', DeploymentStatus.ROLLED_BACK);
    expect(result.id).toBe('d-2');
  });

  it('throws DeploymentNotFoundError when deployment does not exist', async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(
      useCase.execute({ deploymentId: 'bad-id', actorId: 'u-1', ipAddress: null }),
    ).rejects.toThrow(DeploymentNotFoundError);
  });

  it('throws NoPreviousDeploymentError when no previous image exists', async () => {
    mockRepo.findById.mockResolvedValue(makeDeployment({ previousImageTag: null }));
    await expect(
      useCase.execute({ deploymentId: 'd-1', actorId: 'u-1', ipAddress: null }),
    ).rejects.toThrow(NoPreviousDeploymentError);
  });

  it('marks rollback record FAILED when K8s operation throws', async () => {
    const target = makeDeployment();
    mockRepo.findById.mockResolvedValue(target);
    mockRepo.create.mockResolvedValue(makeDeployment({ id: 'd-2' }));
    mockK8s.rollbackDeployment.mockRejectedValue(new Error('K8s timeout'));
    mockRepo.updateStatus.mockResolvedValue(undefined);
    mockAudit.publish.mockResolvedValue(undefined);

    await expect(
      useCase.execute({ deploymentId: 'd-1', actorId: 'u-1', ipAddress: null }),
    ).rejects.toThrow(KubernetesOperationError);

    expect(mockRepo.updateStatus).toHaveBeenCalledWith(
      'd-2', DeploymentStatus.FAILED, expect.stringContaining('K8s timeout'),
    );
  });
});