import { LoginUserUseCase } from './login-user.use-case';
import {
  AccountNotActiveError,
  InvalidCredentialsError,
} from '../../domain/exceptions/domain-exceptions';
import { UserStatus } from '../../domain/enums/user-status.enum';
import { User } from '../../domain/entities/user.entity';

function makeUser(status = UserStatus.ACTIVE): User {
  return new User({
    id: 'user-1',
    email: 'jane@example.com',
    passwordHash: 'hashed-pw',
    fullName: 'Jane Doe',
    status,
    organizationId: null,
    roles: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

const mockUserRepo = { findByEmail: jest.fn() };
const mockRefreshRepo = { create: jest.fn() };
const mockHasher = { compare: jest.fn(), hash: jest.fn() };
const mockTokenProvider = {
  issueAccessToken: jest.fn().mockReturnValue({ token: 'access-jwt', expiresInSeconds: 900 }),
  generateRefreshTokenValue: jest.fn().mockReturnValue('plain-refresh-token'),
  refreshTokenTtlSeconds: jest.fn().mockReturnValue(604800),
};
const mockAudit = { publish: jest.fn() };

describe('LoginUserUseCase', () => {
  let useCase: LoginUserUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new LoginUserUseCase(
      mockUserRepo as any,
      mockRefreshRepo as any,
      mockHasher as any,
      mockTokenProvider as any,
      mockAudit as any,
    );
  });

  it('returns tokens on valid credentials', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(makeUser());
    mockHasher.compare.mockResolvedValue(true);
    mockRefreshRepo.create.mockResolvedValue({ id: 'rt-1' });
    mockAudit.publish.mockResolvedValue(undefined);

    const result = await useCase.execute({ email: 'jane@example.com', password: 'pw', ipAddress: '1.2.3.4' });

    expect(result.accessToken).toBe('access-jwt');
    expect(result.refreshToken).toBe('plain-refresh-token');
    expect(mockAudit.publish).toHaveBeenCalledWith(expect.objectContaining({ action: 'LOGIN', result: 'SUCCESS' }));
  });

  it('throws InvalidCredentialsError when user not found', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(null);
    mockAudit.publish.mockResolvedValue(undefined);

    await expect(
      useCase.execute({ email: 'nobody@example.com', password: 'pw', ipAddress: null }),
    ).rejects.toThrow(InvalidCredentialsError);
  });

  it('throws InvalidCredentialsError when password does not match', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(makeUser());
    mockHasher.compare.mockResolvedValue(false);
    mockAudit.publish.mockResolvedValue(undefined);

    await expect(
      useCase.execute({ email: 'jane@example.com', password: 'wrong', ipAddress: null }),
    ).rejects.toThrow(InvalidCredentialsError);
  });

  it('throws AccountNotActiveError when account is disabled', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(makeUser(UserStatus.DISABLED));
    mockHasher.compare.mockResolvedValue(true);
    mockAudit.publish.mockResolvedValue(undefined);

    await expect(
      useCase.execute({ email: 'jane@example.com', password: 'pw', ipAddress: null }),
    ).rejects.toThrow(AccountNotActiveError);
  });
});
