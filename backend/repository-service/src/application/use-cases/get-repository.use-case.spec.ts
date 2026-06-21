import { GetRepositoryUseCase } from './get-repository.use-case';
import { RepositoryNotFoundError } from '../../domain/exceptions/domain-exceptions';
import { Repository } from '../../domain/entities/repository.entity';
import { RepositoryStatus } from '../../domain/enums/repository-status.enum';
import { RepositoryVisibility } from '../../domain/enums/repository-visibility.enum';

const mockRepo = new Repository({
  id: 'r-1', serviceId: 's-1', serviceName: 'my-api', serviceType: 'NODEJS',
  githubOwner: 'org', githubRepo: 'my-api', fullName: 'org/my-api',
  defaultBranch: 'main', htmlUrl: 'https://github.com/org/my-api',
  cloneUrl: 'https://github.com/org/my-api.git', sshUrl: 'git@github.com:org/my-api.git',
  visibility: RepositoryVisibility.PRIVATE, status: RepositoryStatus.ACTIVE,
  provisionedBy: 'u-1', provisionedAt: new Date(), errorMessage: null,
  createdAt: new Date(), updatedAt: new Date(),
});

const mockRepoRepo = {
  findById: jest.fn(),
  findByServiceId: jest.fn(),
  existsByServiceId: jest.fn(),
  create: jest.fn(),
  findAll: jest.fn(),
  updateStatus: jest.fn(),
  update: jest.fn(),
};

describe('GetRepositoryUseCase', () => {
  let useCase: GetRepositoryUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new GetRepositoryUseCase(mockRepoRepo as any);
  });

  describe('executeById', () => {
    it('returns repository when found', async () => {
      mockRepoRepo.findById.mockResolvedValue(mockRepo);
      const result = await useCase.executeById('r-1');
      expect(result).toBe(mockRepo);
      expect(mockRepoRepo.findById).toHaveBeenCalledWith('r-1');
    });

    it('throws RepositoryNotFoundError when not found', async () => {
      mockRepoRepo.findById.mockResolvedValue(null);
      await expect(useCase.executeById('r-1')).rejects.toThrow(RepositoryNotFoundError);
    });
  });

  describe('executeByServiceId', () => {
    it('returns repository when found by service ID', async () => {
      mockRepoRepo.findByServiceId.mockResolvedValue(mockRepo);
      const result = await useCase.executeByServiceId('s-1');
      expect(result).toBe(mockRepo);
      expect(mockRepoRepo.findByServiceId).toHaveBeenCalledWith('s-1');
    });

    it('throws RepositoryNotFoundError when not found by service ID', async () => {
      mockRepoRepo.findByServiceId.mockResolvedValue(null);
      await expect(useCase.executeByServiceId('s-1')).rejects.toThrow(RepositoryNotFoundError);
    });
  });
});
