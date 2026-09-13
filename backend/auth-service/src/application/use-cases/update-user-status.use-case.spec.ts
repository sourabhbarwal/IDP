import { UpdateUserStatusUseCase } from './update-user-status.use-case';
import { ApiException } from '@idp/common';

const mockUsers = {
  findById:     jest.fn(),
  updateStatus: jest.fn(),
};
const mockAudit = { publish: jest.fn() };

describe('UpdateUserStatusUseCase', () => {
  let useCase: UpdateUserStatusUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new UpdateUserStatusUseCase(mockUsers as never, mockAudit as never);
  });

  it('prevents self-status-change', async () => {
    await expect(useCase.execute({
      targetUserId: 'actor-id', status: 'DISABLED', actorId: 'actor-id', ipAddress: null,
    })).rejects.toThrow(ApiException);
    expect(mockUsers.updateStatus).not.toHaveBeenCalled();
  });

  it('throws 404 when target user does not exist', async () => {
    mockUsers.findById.mockResolvedValue(null);
    await expect(useCase.execute({
      targetUserId: 'ghost-id', status: 'DISABLED', actorId: 'admin-id', ipAddress: null,
    })).rejects.toThrow(ApiException);
  });

  it('prevents deactivating the seed admin account', async () => {
    mockUsers.findById.mockResolvedValue({ id: 'seed-id', email: 'dev@example.com', status: 'ACTIVE' });
    await expect(useCase.execute({
      targetUserId: 'seed-id', status: 'DISABLED', actorId: 'admin-id', ipAddress: null,
    })).rejects.toThrow(ApiException);
    expect(mockUsers.updateStatus).not.toHaveBeenCalled();
  });

  it('allows re-activating the seed admin account back to ACTIVE', async () => {
    mockUsers.findById.mockResolvedValue({ id: 'seed-id', email: 'dev@example.com', status: 'LOCKED' });
    mockUsers.updateStatus.mockResolvedValue({ id: 'seed-id', status: 'ACTIVE' });
    mockAudit.publish.mockResolvedValue(undefined);

    const result = await useCase.execute({
      targetUserId: 'seed-id', status: 'ACTIVE', actorId: 'admin-id', ipAddress: null,
    });

    expect(mockUsers.updateStatus).toHaveBeenCalledWith('seed-id', 'ACTIVE');
    expect(result.status).toBe('ACTIVE');
  });

  it('updates status for a regular user and publishes an audit event', async () => {
    mockUsers.findById.mockResolvedValue({ id: 'u-1', email: 'someone@team.com', status: 'ACTIVE' });
    mockUsers.updateStatus.mockResolvedValue({ id: 'u-1', status: 'DISABLED' });
    mockAudit.publish.mockResolvedValue(undefined);

    const result = await useCase.execute({
      targetUserId: 'u-1', status: 'DISABLED', actorId: 'admin-id', ipAddress: '127.0.0.1',
    });

    expect(mockUsers.updateStatus).toHaveBeenCalledWith('u-1', 'DISABLED');
    expect(result.status).toBe('DISABLED');
    expect(mockAudit.publish).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'USER_STATUS_UPDATED', resourceId: 'u-1' }),
    );
  });
});