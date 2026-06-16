import { RegisterUserUseCase } from './register-user.use-case';
import { EmailAlreadyRegisteredError } from '../../domain/exceptions/domain-exceptions';
import { UserStatus } from '../../domain/enums/user-status.enum';
import { User } from '../../domain/entities/user.entity';

const mockUserRepository = {
  existsByEmail: jest.fn(),
  createUser: jest.fn(),
  findById: jest.fn(),
  findByEmail: jest.fn(),
};

const mockPasswordHasher = {
  hash: jest.fn(),
  compare: jest.fn(),
};

const mockAuditPublisher = {
  publish: jest.fn(),
};

function makeUser(): User {
  return new User({
    id: 'uuid-1',
    email: 'jane@example.com',
    passwordHash: 'hashed-pw',
    fullName: 'Jane Doe',
    status: UserStatus.ACTIVE,
    organizationId: null,
    roles: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

describe('RegisterUserUseCase', () => {
  let useCase: RegisterUserUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new RegisterUserUseCase(
      mockUserRepository as any,
      mockPasswordHasher as any,
      mockAuditPublisher as any,
    );
  });

  it('creates a user and returns domain User on success', async () => {
    const domainUser = makeUser();
    mockUserRepository.existsByEmail.mockResolvedValue(false);
    mockPasswordHasher.hash.mockResolvedValue('hashed-pw');
    mockUserRepository.createUser.mockResolvedValue(domainUser);
    mockAuditPublisher.publish.mockResolvedValue(undefined);

    const result = await useCase.execute({
      email: 'Jane@Example.com',
      password: 'S3cure!Passw0rd',
      fullName: 'Jane Doe',
      ipAddress: '127.0.0.1',
    });

    expect(mockUserRepository.existsByEmail).toHaveBeenCalledWith('jane@example.com');
    expect(mockPasswordHasher.hash).toHaveBeenCalledWith('S3cure!Passw0rd');
    expect(mockUserRepository.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'jane@example.com', fullName: 'Jane Doe' }),
    );
    expect(result.id).toBe('uuid-1');
    expect(mockAuditPublisher.publish).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'REGISTER', result: 'SUCCESS' }),
    );
  });

  it('normalises email to lowercase', async () => {
    mockUserRepository.existsByEmail.mockResolvedValue(false);
    mockPasswordHasher.hash.mockResolvedValue('hashed-pw');
    mockUserRepository.createUser.mockResolvedValue(makeUser());
    mockAuditPublisher.publish.mockResolvedValue(undefined);

    await useCase.execute({ email: 'UPPER@EXAMPLE.COM', password: 'pw', fullName: 'x', ipAddress: null });
    expect(mockUserRepository.existsByEmail).toHaveBeenCalledWith('upper@example.com');
  });

  it('throws EmailAlreadyRegisteredError when email is taken', async () => {
    mockUserRepository.existsByEmail.mockResolvedValue(true);
    mockAuditPublisher.publish.mockResolvedValue(undefined);

    await expect(
      useCase.execute({ email: 'jane@example.com', password: 'pw', fullName: 'Jane', ipAddress: null }),
    ).rejects.toThrow(EmailAlreadyRegisteredError);

    expect(mockAuditPublisher.publish).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'REGISTER', result: 'FAILURE' }),
    );
  });
});
