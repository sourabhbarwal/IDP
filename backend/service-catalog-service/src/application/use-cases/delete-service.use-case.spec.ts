import { DeleteServiceUseCase } from './delete-service.use-case';
import { ServiceAccessDeniedError, ServiceNotFoundError } from '../../domain/exceptions/domain-exceptions';
import { ServiceStatus } from '../../domain/enums/service-status.enum';
import { ServiceType } from '../../domain/enums/service-type.enum';
import { Service } from '../../domain/entities/service.entity';

function makeService(ownerId = 'u-1'): Service {
  return new Service({ id: 's-1', name: 'svc', description: null, type: ServiceType.NODEJS, status: ServiceStatus.ACTIVE, ownerId, ownerEmail: 'a@b.com', team: null, repositoryUrl: null, tags: [], versions: [], createdAt: new Date(), updatedAt: new Date(), createdBy: ownerId, updatedBy: null });
}

const mockRepo = { findById: jest.fn(), softDelete: jest.fn(), findByName: jest.fn(), existsByName: jest.fn(), list: jest.fn(), create: jest.fn(), update: jest.fn() };
const mockAudit = { publish: jest.fn() };

describe('DeleteServiceUseCase', () => {
  let useCase: DeleteServiceUseCase;
  beforeEach(() => { jest.clearAllMocks(); useCase = new DeleteServiceUseCase(mockRepo as any, mockAudit as any); });

  it('deletes service when actor is the owner', async () => {
    mockRepo.findById.mockResolvedValue(makeService('u-1'));
    mockRepo.softDelete.mockResolvedValue(undefined);
    mockAudit.publish.mockResolvedValue(undefined);

    await useCase.execute({ id: 's-1', actorId: 'u-1', actorRoles: ['DEVELOPER'], ipAddress: null });

    expect(mockRepo.softDelete).toHaveBeenCalledWith('s-1');
    expect(mockAudit.publish).toHaveBeenCalledWith(expect.objectContaining({ result: 'SUCCESS' }));
  });

  it('deletes service when actor is ORG_ADMIN', async () => {
    mockRepo.findById.mockResolvedValue(makeService('other-user'));
    mockRepo.softDelete.mockResolvedValue(undefined);
    mockAudit.publish.mockResolvedValue(undefined);

    await useCase.execute({ id: 's-1', actorId: 'admin-1', actorRoles: ['ORG_ADMIN'], ipAddress: null });

    expect(mockRepo.softDelete).toHaveBeenCalled();
  });

  it('throws ServiceNotFoundError when service does not exist', async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(useCase.execute({ id: 'x', actorId: 'u-1', actorRoles: [], ipAddress: null })).rejects.toThrow(ServiceNotFoundError);
  });

  it('throws ServiceAccessDeniedError when non-owner DEVELOPER tries to delete', async () => {
    mockRepo.findById.mockResolvedValue(makeService('other'));
    mockAudit.publish.mockResolvedValue(undefined);

    await expect(useCase.execute({ id: 's-1', actorId: 'u-1', actorRoles: ['DEVELOPER'], ipAddress: null })).rejects.toThrow(ServiceAccessDeniedError);
  });
});