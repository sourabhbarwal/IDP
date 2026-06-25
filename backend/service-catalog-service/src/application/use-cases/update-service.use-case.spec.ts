import { UpdateServiceUseCase } from './update-service.use-case';
import {
  ServiceAccessDeniedError,
  ServiceNotFoundError,
} from '../../domain/exceptions/domain-exceptions';
import { ServiceStatus } from '../../domain/enums/service-status.enum';
import { ServiceType } from '../../domain/enums/service-type.enum';
import { Service } from '../../domain/entities/service.entity';
import { ServiceRepository } from '../../domain/repositories/service.repository.port';
import { AuditPublisher } from '@idp/common';

function makeService(ownerId = 'u-1'): Service {
  return new Service({
    id: 's-1',
    name: 'my-service',
    description: 'original',
    type: ServiceType.NODEJS,
    status: ServiceStatus.ACTIVE,
    ownerId,
    ownerEmail: 'owner@example.com',
    team: null,
    repositoryUrl: null,
    tags: [],
    versions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: ownerId,
    updatedBy: null,
  });
}

const mockRepo: jest.Mocked<ServiceRepository> = {
  findById: jest.fn(),
  findByName: jest.fn(),
  existsByName: jest.fn(),
  list: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
};

const mockAudit: jest.Mocked<AuditPublisher> = {
  publish: jest.fn(),
};

describe('UpdateServiceUseCase', () => {
  let useCase: UpdateServiceUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new UpdateServiceUseCase(mockRepo, mockAudit);
  });

  it('updates service when actor is the owner', async () => {
    const updated = makeService('u-1');
    mockRepo.findById.mockResolvedValue(makeService('u-1'));
    mockRepo.update.mockResolvedValue(updated);
    mockAudit.publish.mockResolvedValue(undefined);

    const result = await useCase.execute({
      id: 's-1',
      description: 'updated description',
      actorId: 'u-1',
      actorRoles: ['DEVELOPER'],
      ipAddress: null,
    });

    expect(mockRepo.update).toHaveBeenCalledWith(
      's-1',
      expect.objectContaining({ description: 'updated description', updatedBy: 'u-1' }),
    );
    expect(result).toBe(updated);
    expect(mockAudit.publish).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'SERVICE_UPDATE', result: 'SUCCESS' }),
    );
  });

  it('updates service when actor is ORG_ADMIN (not owner)', async () => {
    const updated = makeService('other-user');
    mockRepo.findById.mockResolvedValue(makeService('other-user'));
    mockRepo.update.mockResolvedValue(updated);
    mockAudit.publish.mockResolvedValue(undefined);

    await useCase.execute({
      id: 's-1',
      actorId: 'admin-1',
      actorRoles: ['ORG_ADMIN'],
      ipAddress: null,
    });

    expect(mockRepo.update).toHaveBeenCalled();
  });

  it('updates service when actor is PLATFORM_ENGINEER', async () => {
    const updated = makeService('other-user');
    mockRepo.findById.mockResolvedValue(makeService('other-user'));
    mockRepo.update.mockResolvedValue(updated);
    mockAudit.publish.mockResolvedValue(undefined);

    await useCase.execute({
      id: 's-1',
      actorId: 'pe-1',
      actorRoles: ['PLATFORM_ENGINEER'],
      ipAddress: null,
    });

    expect(mockRepo.update).toHaveBeenCalled();
  });

  it('throws ServiceNotFoundError when service does not exist', async () => {
    mockRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ id: 'x', actorId: 'u-1', actorRoles: [], ipAddress: null }),
    ).rejects.toThrow(ServiceNotFoundError);
  });

  it('throws ServiceAccessDeniedError when non-owner DEVELOPER tries to update', async () => {
    mockRepo.findById.mockResolvedValue(makeService('other'));
    mockAudit.publish.mockResolvedValue(undefined);

    await expect(
      useCase.execute({ id: 's-1', actorId: 'u-1', actorRoles: ['DEVELOPER'], ipAddress: null }),
    ).rejects.toThrow(ServiceAccessDeniedError);
  });
});