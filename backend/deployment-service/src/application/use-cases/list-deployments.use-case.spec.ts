import { ListDeploymentsUseCase } from './list-deployments.use-case';
import { DeploymentRepository } from '../../domain/repositories/deployment.repository.port';

const mockRepo: jest.Mocked<DeploymentRepository> = {
  findById: jest.fn(), findLastSuccessful: jest.fn(), findLatestForServiceEnv: jest.fn(),
  list: jest.fn(), create: jest.fn(), updateStatus: jest.fn(),
};

describe('ListDeploymentsUseCase', () => {
  let useCase: ListDeploymentsUseCase;
  beforeEach(() => { jest.clearAllMocks(); useCase = new ListDeploymentsUseCase(mockRepo); });

  it('delegates to repository with pagination', async () => {
    mockRepo.list.mockResolvedValue({ items: [], total: 0 });
    await useCase.execute({ page: 0, size: 20 });
    expect(mockRepo.list).toHaveBeenCalledWith(expect.objectContaining({ page: 0, size: 20 }));
  });

  it('caps size at 100', async () => {
    mockRepo.list.mockResolvedValue({ items: [], total: 0 });
    await useCase.execute({ page: 0, size: 500 });
    expect(mockRepo.list).toHaveBeenCalledWith(expect.objectContaining({ size: 100 }));
  });
});