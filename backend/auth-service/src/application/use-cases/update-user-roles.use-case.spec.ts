import { UpdateUserRolesUseCase } from './update-user-roles.use-case';
import { ApiException } from '@idp/common';

const mockUsers = {
  findById:    jest.fn(),
  updateRoles: jest.fn(),
};
const mockAudit = { publish: jest.fn() };

describe('UpdateUserRolesUseCase', () => {
  let useCase: UpdateUserRolesUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new UpdateUserRolesUseCase(mockUsers as never, mockAudit as never);
  });

  it('prevents self-role-change', async () => {
    await expect(useCase.execute({
      targetUserId: 'actor-id', roles: ['DEVELOPER'],
      actorId: 'actor-id', ipAddress: null,
    })).rejects.toThrow(ApiException);
  });

  it('prevents removing ORG_ADMIN from seed account', async () => {
    mockUsers.findById.mockResolvedValue({
      id: 'seed-id', email: 'dev@example.com', roles: ['ORG_ADMIN'], status: 'ACTIVE',
      roleNames: () => ['ORG_ADMIN'],
    });
    await expect(useCase.execute({
      targetUserId: 'seed-id', roles: ['DEVELOPER'],
      actorId: 'other-admin', ipAddress: null,
    })).rejects.toThrow(ApiException);
  });

  it('updates roles successfully', async () => {
    mockUsers.findById.mockResolvedValue({
      id: 'u-1', email: 'dev@team.com', roles: ['DEVELOPER'], status: 'ACTIVE',
      roleNames: () => ['DEVELOPER'],
    });
    mockUsers.updateRoles.mockResolvedValue({
      id: 'u-1', email: 'dev@team.com', roles: ['DEVELOPER', 'PLATFORM_ENGINEER'],
    });
    const result = await useCase.execute({
      targetUserId: 'u-1', roles: ['DEVELOPER', 'PLATFORM_ENGINEER'],
      actorId: 'admin-id', ipAddress: null,
    });
    expect(result.roles).toContain('PLATFORM_ENGINEER');
    expect(mockAudit.publish).toHaveBeenCalled();
  });
});