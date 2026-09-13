import { ListUsersUseCase } from './list-users.use-case';

const mockUsers = { findAll: jest.fn() };

describe('ListUsersUseCase', () => {
  let useCase: ListUsersUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new ListUsersUseCase(mockUsers as never);
  });

  it('delegates to the repository with pagination and filters', async () => {
    const page = { content: [], totalElements: 0, page: 0, size: 20, totalPages: 1 };
    mockUsers.findAll.mockResolvedValue(page);

    const result = await useCase.execute({
      page: 0, size: 20, search: 'jane', role: 'DEVELOPER', status: 'ACTIVE',
    });

    expect(mockUsers.findAll).toHaveBeenCalledWith({
      page: 0, size: 20, search: 'jane', role: 'DEVELOPER', status: 'ACTIVE',
    });
    expect(result).toBe(page);
  });

  it('works with no optional filters supplied', async () => {
    const page = { content: [], totalElements: 0, page: 0, size: 20, totalPages: 1 };
    mockUsers.findAll.mockResolvedValue(page);

    await useCase.execute({ page: 0, size: 20 });

    expect(mockUsers.findAll).toHaveBeenCalledWith({
      page: 0, size: 20, search: undefined, role: undefined, status: undefined,
    });
  });
});