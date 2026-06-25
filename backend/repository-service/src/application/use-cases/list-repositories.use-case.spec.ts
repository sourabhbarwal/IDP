import { ListRepositoriesUseCase } from './list-repositories.use-case';
import { RepositoryRepository } from '../../domain/repositories/repository.repository.port';

const mockRepo: jest.Mocked<RepositoryRepository> = {
  findById: jest.fn(),
  findByServiceId: jest.fn(),
  findAll: jest.fn(),
  existsByServiceId: jest.fn(),
  create: jest.fn(),
  updateStatus: jest.fn(),
};

describe('ListRepositoriesUseCase', () => {
  let useCase: ListRepositoriesUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new ListRepositoriesUseCase(mockRepo);
  });

  it('delegates to repository with correct pagination', async () => {
    mockRepo.findAll.mockResolvedValue({ items: [], total: 0 });

    await useCase.execute(0, 20);

    expect(mockRepo.findAll).toHaveBeenCalledWith(0, 20);
  });

  it('caps size at 100', async () => {
    mockRepo.findAll.mockResolvedValue({ items: [], total: 0 });

    await useCase.execute(0, 999);

    expect(mockRepo.findAll).toHaveBeenCalledWith(0, 100);
  });

  it('returns repository result', async () => {
    const result = { items: [], total: 5 };
    mockRepo.findAll.mockResolvedValue(result);

    const output = await useCase.execute(0, 10);
    expect(output).toBe(result);
  });
});