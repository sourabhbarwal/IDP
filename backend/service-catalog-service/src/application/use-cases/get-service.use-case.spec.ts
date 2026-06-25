import { GetServiceUseCase } from './get-service.use-case';
import { ServiceNotFoundError } from '../../domain/exceptions/domain-exceptions';
import { ServiceStatus } from '../../domain/enums/service-status.enum';
import { ServiceType } from '../../domain/enums/service-type.enum';
import { Service } from '../../domain/entities/service.entity';
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

describe('GetServiceUseCase', () => {
  let useCase: GetServiceUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new GetServiceUseCase(mockRepo);
  });

  it('returns service when found', async () => {
    const service = new Service({
      id: 's-1',
      name: 'svc',
      description: null,
      type: ServiceType.GO,
      status: ServiceStatus.ACTIVE,
      ownerId: 'u-1',
      ownerEmail: 'a@b.com',
      team: null,
      repositoryUrl: null,
      tags: [],
      versions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'u-1',
      updatedBy: null,
    });
    mockRepo.findById.mockResolvedValue(service);

    const result = await useCase.execute('s-1');
    expect(result).toBe(service);
  });

  it('throws ServiceNotFoundError when not found', async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(useCase.execute('bad-id')).rejects.toThrow(ServiceNotFoundError);
  });
});