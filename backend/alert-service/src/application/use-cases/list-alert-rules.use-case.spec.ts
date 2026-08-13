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

    expect(mockRepo.findAll).toHaveBeenCalledWith(0, 20, null);
  });

  it('caps size at 100', async () => {
    mockRepo.findAll.mockResolvedValue({ items: [], total: 0 });

    await useCase.execute(0, 500);

    expect(mockRepo.findAll).toHaveBeenCalledWith(0, 100, null);
  });

  it('forwards serviceId filter when provided', async () => {
    mockRepo.findAll.mockResolvedValue({ items: [], total: 0 });

    await useCase.execute(0, 20, 'svc-123');

    expect(mockRepo.findAll).toHaveBeenCalledWith(0, 20, 'svc-123');
  });

  it('defaults serviceId to null when omitted', async () => {
    mockRepo.findAll.mockResolvedValue({ items: [], total: 0 });

    await useCase.execute(0, 20);

    expect(mockRepo.findAll).toHaveBeenCalledWith(0, 20, null);
  });

  it('passes through explicit null serviceId unchanged', async () => {
    mockRepo.findAll.mockResolvedValue({ items: [], total: 0 });

    await useCase.execute(0, 20, null);

    expect(mockRepo.findAll).toHaveBeenCalledWith(0, 20, null);
  });
});