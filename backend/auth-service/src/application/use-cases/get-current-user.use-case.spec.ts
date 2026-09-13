import { GetCurrentUserUseCase } from './get-current-user.use-case';
import { UserNotFoundError } from '../../domain/exceptions/domain-exceptions';
import { UserStatus } from '../../domain/enums/user-status.enum';
import { User } from '../../domain/entities/user.entity';
import { UserRepository } from '../../domain/repositories/user.repository.port';

function makeUser(): User {
  return new User({
    id: 'user-1',
    email: 'jane@example.com',
    passwordHash: 'hashed',
    fullName: 'Jane Doe',
    status: UserStatus.ACTIVE,
    organizationId: null,
    roles: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

const mockUserRepository: jest.Mocked<UserRepository> = {
  findById: jest.fn(),
  findByEmail: jest.fn(),
  existsByEmail: jest.fn(),
  createUser: jest.fn(),
  findAll: jest.fn(),
  updateRoles: jest.fn(),
  updateStatus: jest.fn(),
  softDelete: jest.fn(),
};

describe('GetCurrentUserUseCase', () => {
  let useCase: GetCurrentUserUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new GetCurrentUserUseCase(mockUserRepository);
  });

  it('returns the domain User when found', async () => {
    const user = makeUser();
    mockUserRepository.findById.mockResolvedValue(user);
    const result = await useCase.execute('user-1');
    expect(result).toBe(user);
    expect(mockUserRepository.findById).toHaveBeenCalledWith('user-1');
  });

  it('throws UserNotFoundError when user does not exist', async () => {
    mockUserRepository.findById.mockResolvedValue(null);
    await expect(useCase.execute('nonexistent-id')).rejects.toThrow(UserNotFoundError);
    expect(mockUserRepository.findById).toHaveBeenCalledWith('nonexistent-id');
  });
});