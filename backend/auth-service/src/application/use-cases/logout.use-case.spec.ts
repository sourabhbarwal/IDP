import { LogoutUseCase } from './logout.use-case';
import { RefreshToken } from '../../domain/entities/refresh-token.entity';
import { hashToken } from './hash-token.util';

const PLAIN_TOKEN = 'some-plain-refresh-token-value';

function makeToken(revokedAt: Date | null = null): RefreshToken {
  return new RefreshToken({
    id: 'rt-1',
    userId: 'user-1',
    tokenHash: hashToken(PLAIN_TOKEN),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    revokedAt,
    replacedByTokenId: null,
    createdByIp: '127.0.0.1',
    createdAt: new Date(),
  });
}

const mockRefreshRepo = {
  findByTokenHash: jest.fn(),
  revoke: jest.fn(),
  revokeAllForUser: jest.fn(),
  create: jest.fn(),
};
const mockAudit = { publish: jest.fn() };

describe('LogoutUseCase', () => {
  let useCase: LogoutUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new LogoutUseCase(mockRefreshRepo as any, mockAudit as any);
  });

  it('revokes an active refresh token and publishes LOGOUT audit event', async () => {
    mockRefreshRepo.findByTokenHash.mockResolvedValue(makeToken());
    mockRefreshRepo.revoke.mockResolvedValue(undefined);
    mockAudit.publish.mockResolvedValue(undefined);

    await useCase.execute({
      refreshToken: PLAIN_TOKEN,
      userId: 'user-1',
      ipAddress: '127.0.0.1',
    });

    expect(mockRefreshRepo.revoke).toHaveBeenCalledWith('rt-1', null);
    expect(mockAudit.publish).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'LOGOUT', result: 'SUCCESS', userId: 'user-1' }),
    );
  });

  it('still publishes audit event when token is not found', async () => {
    mockRefreshRepo.findByTokenHash.mockResolvedValue(null);
    mockAudit.publish.mockResolvedValue(undefined);

    await useCase.execute({
      refreshToken: 'unknown-token',
      userId: 'user-1',
      ipAddress: null,
    });

    expect(mockRefreshRepo.revoke).not.toHaveBeenCalled();
    expect(mockAudit.publish).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'LOGOUT', result: 'SUCCESS' }),
    );
  });

  it('skips revocation when token is already revoked', async () => {
    mockRefreshRepo.findByTokenHash.mockResolvedValue(makeToken(new Date()));
    mockAudit.publish.mockResolvedValue(undefined);

    await useCase.execute({
      refreshToken: PLAIN_TOKEN,
      userId: 'user-1',
      ipAddress: null,
    });

    expect(mockRefreshRepo.revoke).not.toHaveBeenCalled();
    expect(mockAudit.publish).toHaveBeenCalled();
  });
});