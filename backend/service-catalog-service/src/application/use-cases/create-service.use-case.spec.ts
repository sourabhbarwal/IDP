import { CreateServiceUseCase } from './create-service.use-case';
import { ServiceNameConflictError } from '../../domain/exceptions/domain-exceptions';
import { ServiceType } from '../../domain/enums/service-type.enum';
import { ServiceStatus } from '../../domain/enums/service-status.enum';
import { Service } from '../../domain/entities/service.entity';

function makeService(): Service {
  return new Service({
    id: 's-1', name: 'my-service', description: null, type: ServiceType.NODEJS,
    status: ServiceStatus.ACTIVE, ownerId: 'u-1', ownerEmail: 'dev@example.com',
    team: null, repositoryUrl: null, tags: [], versions: [],
    createdAt: new Date(), updatedAt: new Date(), createdBy: 'u-1', updatedBy: null,
  });
}

const mockRepo = { existsByName: jest.fn(), create: jest.fn(), findById: jest.fn(), findByName: jest.fn(), list: jest.fn(), update: jest.fn(), softDelete: jest.fn() };
const mockAudit = { publish: jest.fn() };

describe('CreateServiceUseCase', () => {
  let useCase: CreateServiceUseCase;
  beforeEach(() => { jest.clearAllMocks(); useCase = new CreateServiceUseCase(mockRepo as any, mockAudit as any); });

  it('creates service with normalised name and returns domain entity', async () => {
    mockRepo.existsByName.mockResolvedValue(false);
    mockRepo.create.mockResolvedValue(makeService());
    mockAudit.publish.mockResolvedValue(undefined);

    const result = await useCase.execute({
      name: 'My Service', description: null, type: ServiceType.NODEJS,
      team: null, repositoryUrl: null, tags: [],
      actorId: 'u-1', actorEmail: 'dev@example.com', ipAddress: '1.2.3.4',
    });

    expect(mockRepo.existsByName).toHaveBeenCalledWith('my-service');
    expect(result.id).toBe('s-1');
    expect(mockAudit.publish).toHaveBeenCalledWith(expect.objectContaining({ action: 'SERVICE_CREATE', result: 'SUCCESS' }));
  });

  it('throws ServiceNameConflictError and audits failure when name is taken', async () => {
    mockRepo.existsByName.mockResolvedValue(true);
    mockAudit.publish.mockResolvedValue(undefined);

    await expect(useCase.execute({
      name: 'my-service', description: null, type: ServiceType.NODEJS,
      team: null, repositoryUrl: null, tags: [],
      actorId: 'u-1', actorEmail: 'dev@example.com', ipAddress: null,
    })).rejects.toThrow(ServiceNameConflictError);

    expect(mockAudit.publish).toHaveBeenCalledWith(expect.objectContaining({ result: 'FAILURE' }));
  });
});