import { CreateUserUseCase } from './create-user.use-case';
import { ApiException } from '@idp/common';

const mockUsers = {
  findByEmail: jest.fn(),
  createUser:  jest.fn(),
};
const mockRoles = {
  findByName: jest.fn(),
};
const mockAudit = { publish: jest.fn() };

describe('CreateUserUseCase', () => {
  let useCase: CreateUserUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new CreateUserUseCase(
      mockUsers as never,
      mockRoles as never,
      mockAudit as never,
    );
  });

  it('creates user with valid roles', async () => {
    mockUsers.findByEmail.mockResolvedValue(null);
    mockUsers.createUser.mockResolvedValue({
      id: 'u-1', email: 'test@x.com', roles: ['DEVELOPER'],
    });

    const result = await useCase.execute({
      email: 'test@x.com', password: 'Pass123!',
      fullName: 'Test User',
      roles: ['DEVELOPER'], actorId: 'admin-1', ipAddress: null,
    });
    expect(result.email).toBe('test@x.com');
    expect(mockAudit.publish).toHaveBeenCalled();
  });

  it('throws 409 if email already exists', async () => {
    mockUsers.findByEmail.mockResolvedValue({ id: 'existing' });
    await expect(useCase.execute({
      email: 'dupe@x.com', password: 'Pass123!',
      fullName: 'A B',
      roles: ['DEVELOPER'], actorId: 'admin-1', ipAddress: null,
    })).rejects.toThrow(ApiException);
  });

  it('throws 400 for invalid role name', async () => {
    mockUsers.findByEmail.mockResolvedValue(null);
    await expect(useCase.execute({
      email: 'x@x.com', password: 'Pass123!',
      fullName: 'A B',
      roles: ['SUPERUSER'], actorId: 'admin-1', ipAddress: null,
    })).rejects.toThrow(ApiException);
  });
});