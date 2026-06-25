import { GetRepositoryUseCase } from './get-repository.use-case';
import { RepositoryNotFoundError } from '../../domain/exceptions/domain-exceptions';
import { Repository } from '../../domain/entities/repository.entity';
import { RepositoryStatus } from '../../domain/enums/repository-status.enum';
import { RepositoryVisibility } from '../../domain/enums/repository-visibility.enum';
import { RepositoryRepository } from '../../domain/repositories/repository.repository.port';

function makeRepo(): Repository {
  return new Repository({
    id: 'r-1',
    serviceId: 's-1',
    serviceName: 'my-service',
    serviceType: 'NODEJS',
    githubOwner: 'test-org',
    githubRepo: 'my-service',
    fullName: 'test-org/my-service',
    defaultBranch: 'main',
    htmlUrl: 'https://github.com/test-org/my-service',
    cloneUrl: 'https://github.com/test-org/my-service.git',
    sshUrl: 'git@github.com:test-org/my-service.git',
    visibility: RepositoryVisibility.PRIVATE,
    status: RepositoryStatus.ACTIVE,
    provisionedBy: 'u-1',
    provisionedAt: new Date(),
    errorMessage: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

const mockRepo: jest.Mocked<RepositoryRepository> = {
  findById: jest.fn(),
  findByServiceId: jest.fn(),
  findAll: jest.fn(),
  existsByServiceId: jest.fn(),
  create: jest.fn(),
  updateStatus: jest.fn(),
};

describe('GetRepositoryUseCase', () => {
  let useCase: GetRepositoryUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new GetRepositoryUseCase(mockRepo);
  });

  describe('executeById', () => {
    it('returns repository when found by id', async () => {
      const repo = makeRepo();
      mockRepo.findById.mockResolvedValue(repo);

      const result = await useCase.executeById('r-1');
      expect(result).toBe(repo);
      expect(mockRepo.findById).toHaveBeenCalledWith('r-1');
    });

    it('throws RepositoryNotFoundError when not found by id', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(useCase.executeById('bad-id')).rejects.toThrow(RepositoryNotFoundError);
    });
  });

  describe('executeByServiceId', () => {
    it('returns repository when found by serviceId', async () => {
      const repo = makeRepo();
      mockRepo.findByServiceId.mockResolvedValue(repo);

      const result = await useCase.executeByServiceId('s-1');
      expect(result).toBe(repo);
      expect(mockRepo.findByServiceId).toHaveBeenCalledWith('s-1');
    });

    it('throws RepositoryNotFoundError when not found by serviceId', async () => {
      mockRepo.findByServiceId.mockResolvedValue(null);
      await expect(useCase.executeByServiceId('bad-id')).rejects.toThrow(RepositoryNotFoundError);
    });
  });
});