import { RefreshTokenUseCase } from './refresh-token.use-case';
import { InvalidRefreshTokenError } from '../../domain/exceptions/domain-exceptions';
import { RefreshToken } from '../../domain/entities/refresh-token.entity';
import { UserStatus } from '../../domain/enums/user-status.enum';
import { User } from '../../domain/entities/user.entity';
import { hashToken } from './hash-token.util';

const PLAIN_TOKEN = 'plain-refresh-token-value';

function makeActiveToken(overrides: Partial<ConstructorParameters<typeof RefreshToken>[0]> = {}): RefreshToken {
  return new RefreshToken({
    id: 'rt-1',
    userId: 'user-1',
    tokenHash: hashToken(PLAIN_TOKEN),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    revokedAt: null,
    replacedByTokenId: null,
    createdByIp: '127.0.0.1',
    createdAt: new Date(),
    ...overrides,
  });
}

const mockUserRepo = { findById: jest.fn() };
const mockRefreshRepo = { findByTokenHash: jest.fn(), create: jest.fn(), revoke: jest.fn(), revokeAllForUser: jest.fn() };
const mockTokenProvider = {
  issueAccessToken: jest.fn().mockReturnValue({ token: 'new-access', expiresInSeconds: 900 }),
  generateRefreshTokenValue: jest.fn().mockReturnValue('new-plain-token'),
  refreshTokenTtlSeconds: jest.fn().mockReturnValue(604800),
};
const mockAudit = { publish: jest.fn() };

describe('RefreshTokenUseCase', () => {
  let useCase: RefreshTokenUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new RefreshTokenUseCase(
      mockUserRepo as any,
      mockRefreshRepo as any,
      mockTokenProvider as any,
      mockAudit as any,
    );
  });

  it('issues new token pair and rotates existing token', async () => {
    const user = new User({ id: 'user-1', email: 'a@b.com', passwordHash: 'h', fullName: 'A',
      status: UserStatus.ACTIVE, organizationId: null, roles: [], createdAt: new Date(), updatedAt: new Date() });

    mockRefreshRepo.findByTokenHash.mockResolvedValue(makeActiveToken());
    mockUserRepo.findById.mockResolvedValue(user);
    mockRefreshRepo.create.mockResolvedValue({ id: 'rt-2' });
    mockRefreshRepo.revoke.mockResolvedValue(undefined);
    mockAudit.publish.mockResolvedValue(undefined);

    const result = await useCase.execute({ refreshToken: PLAIN_TOKEN, ipAddress: '1.2.3.4' });

    expect(result.accessToken).toBe('new-access');
    expect(result.refreshToken).toBe('new-plain-token');
    expect(mockRefreshRepo.revoke).toHaveBeenCalledWith('rt-1', 'rt-2');
  });

  it('throws InvalidRefreshTokenError when token not found', async () => {
    mockRefreshRepo.findByTokenHash.mockResolvedValue(null);
    await expect(useCase.execute({ refreshToken: 'bad', ipAddress: null })).rejects.toThrow(InvalidRefreshTokenError);
  });

  it('revokes all user tokens on replay (revoked token presented again)', async () => {
    const revokedToken = makeActiveToken({ revokedAt: new Date() });
    mockRefreshRepo.findByTokenHash.mockResolvedValue(revokedToken);
    mockRefreshRepo.revokeAllForUser.mockResolvedValue(undefined);
    mockAudit.publish.mockResolvedValue(undefined);

    await expect(useCase.execute({ refreshToken: PLAIN_TOKEN, ipAddress: null })).rejects.toThrow(InvalidRefreshTokenError);
    expect(mockRefreshRepo.revokeAllForUser).toHaveBeenCalledWith('user-1');
    expect(mockAudit.publish).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'TOKEN_REUSE_DETECTED', result: 'FAILURE' }),
    );
  });

  it('throws InvalidRefreshTokenError for expired token', async () => {
    const expired = makeActiveToken({ expiresAt: new Date(Date.now() - 1000) });
    mockRefreshRepo.findByTokenHash.mockResolvedValue(expired);
    await expect(useCase.execute({ refreshToken: PLAIN_TOKEN, ipAddress: null })).rejects.toThrow(InvalidRefreshTokenError);
  });
});
