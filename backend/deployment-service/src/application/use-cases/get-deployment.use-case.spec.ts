import { GetDeploymentUseCase } from './get-deployment.use-case';
import { DeploymentNotFoundError } from '../../domain/exceptions/domain-exceptions';
import { DeploymentStatus } from '../../domain/enums/deployment-status.enum';
import { DeploymentStrategy } from '../../domain/enums/deployment-strategy.enum';
import { EnvironmentName } from '../../domain/enums/environment-name.enum';
import { Deployment } from '../../domain/entities/deployment.entity';
import { DeploymentRepository } from '../../domain/repositories/deployment.repository.port';

const mockRepo: jest.Mocked<DeploymentRepository> = {
  findById: jest.fn(), findLastSuccessful: jest.fn(), findLatestForServiceEnv: jest.fn(),
  list: jest.fn(), create: jest.fn(), updateStatus: jest.fn(),
};

describe('GetDeploymentUseCase', () => {
  let useCase: GetDeploymentUseCase;
  beforeEach(() => { jest.clearAllMocks(); useCase = new GetDeploymentUseCase(mockRepo); });

  it('returns deployment when found', async () => {
    const d = new Deployment({
      id: 'd-1', serviceId: 's-1', serviceName: 'svc', environment: EnvironmentName.DEVELOPMENT,
      namespace: 'dev-svc', imageTag: 'tag', strategy: DeploymentStrategy.ROLLING,
      status: DeploymentStatus.SUCCEEDED, previousImageTag: null, replicas: 1, canaryWeight: null,
      errorMessage: null, triggeredBy: 'u-1', startedAt: new Date(), completedAt: new Date(), createdAt: new Date(),
    });
    mockRepo.findById.mockResolvedValue(d);
    const result = await useCase.execute('d-1');
    expect(result).toBe(d);
  });

  it('throws DeploymentNotFoundError when not found', async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(useCase.execute('bad-id')).rejects.toThrow(DeploymentNotFoundError);
  });
});