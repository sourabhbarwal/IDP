import { ListAlertRulesUseCase } from './list-alert-rules.use-case';
import { AlertRuleRepository } from '../../domain/repositories/alert-rule.repository.port';

const mockRepo: jest.Mocked<AlertRuleRepository> = {
  findById: jest.fn(),
  findByName: jest.fn(),
  findAll: jest.fn(),
  findEnabled: jest.fn(),
  existsByName: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe('ListAlertRulesUseCase', () => {
  let useCase: ListAlertRulesUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new ListAlertRulesUseCase(mockRepo);
  });

  it('delegates to repository with pagination', async () => {
    mockRepo.findAll.mockResolvedValue({ items: [], total: 0 });

    await useCase.execute(0, 20);

    expect(mockRepo.findAll).toHaveBeenCalledWith(0, 20);
  });

  it('caps size at 100', async () => {
    mockRepo.findAll.mockResolvedValue({ items: [], total: 0 });

    await useCase.execute(0, 500);

    expect(mockRepo.findAll).toHaveBeenCalledWith(0, 100);
  });
});