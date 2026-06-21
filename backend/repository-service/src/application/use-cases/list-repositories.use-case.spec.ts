import { ListRepositoriesUseCase } from './list-repositories.use-case';
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
  findAll: jest.fn(),
  findById: jest.fn(),
  findByServiceId: jest.fn(),
  existsByServiceId: jest.fn(),
  create: jest.fn(),
  updateStatus: jest.fn(),
};

describe('ListRepositoriesUseCase', () => {
  let useCase: ListRepositoriesUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new ListRepositoriesUseCase(mockRepoRepo as any);
  });

  it('lists repositories with pagination', async () => {
    const mockList = { items: [mockRepo], total: 1 };
    mockRepoRepo.findAll.mockResolvedValue(mockList);

    const result = await useCase.execute(0, 20);

    expect(result).toBe(mockList);
    expect(mockRepoRepo.findAll).toHaveBeenCalledWith(0, 20);
  });

  it('limits size to 100 max', async () => {
    mockRepoRepo.findAll.mockResolvedValue({ items: [], total: 0 });

    await useCase.execute(0, 150);

    expect(mockRepoRepo.findAll).toHaveBeenCalledWith(0, 100);
  });
});
