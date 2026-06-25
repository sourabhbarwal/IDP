import { ListServicesUseCase } from './list-services.use-case';
import { ServiceRepository } from '../../domain/repositories/service.repository.port';

const mockRepo: jest.Mocked<ServiceRepository> = {
  findById: jest.fn(),
  findByName: jest.fn(),
  existsByName: jest.fn(),
  list: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
};

describe('ListServicesUseCase', () => {
  let useCase: ListServicesUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new ListServicesUseCase(mockRepo);
  });

  it('delegates to repository with correct filter', async () => {
    mockRepo.list.mockResolvedValue({ items: [], total: 0 });

    await useCase.execute({ page: 0, size: 20 });

    expect(mockRepo.list).toHaveBeenCalledWith(
      expect.objectContaining({ page: 0, size: 20 }),
    );
  });

  it('caps size at 100', async () => {
    mockRepo.list.mockResolvedValue({ items: [], total: 0 });

    await useCase.execute({ page: 0, size: 999 });

    expect(mockRepo.list).toHaveBeenCalledWith(
      expect.objectContaining({ size: 100 }),
    );
  });

  it('passes optional search and filter params through', async () => {
    mockRepo.list.mockResolvedValue({ items: [], total: 0 });

    await useCase.execute({
      page: 1,
      size: 10,
      search: 'payments',
      team: 'platform',
    });

    expect(mockRepo.list).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'payments', team: 'platform', page: 1, size: 10 }),
    );
  });
});