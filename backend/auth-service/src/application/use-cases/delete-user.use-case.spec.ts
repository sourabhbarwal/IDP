import { DeleteUserUseCase } from './delete-user.use-case';
import { ApiException } from '@idp/common';

const mockUsers = {
  findById:   jest.fn(),
  softDelete: jest.fn(),
};
const mockAudit = { publish: jest.fn() };

describe('DeleteUserUseCase', () => {
  let useCase: DeleteUserUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new DeleteUserUseCase(mockUsers as never, mockAudit as never);
  });

  it('prevents self-delete', async () => {
    await expect(useCase.execute({
      targetUserId: 'actor-id', actorId: 'actor-id', ipAddress: null,
    })).rejects.toThrow(ApiException);
    expect(mockUsers.softDelete).not.toHaveBeenCalled();
  });

  it('throws 404 when target user does not exist', async () => {
    mockUsers.findById.mockResolvedValue(null);
    await expect(useCase.execute({
      targetUserId: 'ghost-id', actorId: 'admin-id', ipAddress: null,
    })).rejects.toThrow(ApiException);
  });

  it('prevents deleting the seed admin account', async () => {
    mockUsers.findById.mockResolvedValue({ id: 'seed-id', email: 'dev@example.com' });
    await expect(useCase.execute({
      targetUserId: 'seed-id', actorId: 'admin-id', ipAddress: null,
    })).rejects.toThrow(ApiException);
    expect(mockUsers.softDelete).not.toHaveBeenCalled();
  });

  it('soft-deletes a regular user and publishes an audit event', async () => {
    mockUsers.findById.mockResolvedValue({ id: 'u-1', email: 'someone@team.com' });
    mockUsers.softDelete.mockResolvedValue(undefined);
    mockAudit.publish.mockResolvedValue(undefined);

    await useCase.execute({ targetUserId: 'u-1', actorId: 'admin-id', ipAddress: '127.0.0.1' });

    expect(mockUsers.softDelete).toHaveBeenCalledWith('u-1');
    expect(mockAudit.publish).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'USER_DELETED', resourceId: 'u-1' }),
    );
  });
});