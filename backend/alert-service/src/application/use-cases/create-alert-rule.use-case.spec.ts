import { CreateAlertRuleUseCase } from './create-alert-rule.use-case';
import { AlertRuleNameConflictError } from '../../domain/exceptions/domain-exceptions';
import { AlertSeverity } from '../../domain/enums/alert-severity.enum';
import { AlertRule } from '../../domain/entities/alert-rule.entity';
import { AlertRuleRepository } from '../../domain/repositories/alert-rule.repository.port';
import { AuditPublisher } from '@idp/common';

function makeRule(): AlertRule {
  return new AlertRule({
    id: 'r-1', name: 'HighErrorRate', description: null,
    promqlExpression: 'sum(rate(errors[5m])) > 0.05',
    forDuration: '5m', severity: AlertSeverity.CRITICAL,
    serviceId: null, labels: {}, annotations: {}, enabled: true,
    createdBy: 'u-1', createdAt: new Date(), updatedAt: new Date(),
  });
}

const mockRepo: jest.Mocked<AlertRuleRepository> = {
  findById: jest.fn(), findByName: jest.fn(), findAll: jest.fn(),
  findEnabled: jest.fn(), existsByName: jest.fn(), create: jest.fn(),
  update: jest.fn(), delete: jest.fn(),
};
const mockAudit: jest.Mocked<AuditPublisher> = { publish: jest.fn() };

const command = {
  name: 'HighErrorRate', description: null,
  promqlExpression: 'sum(rate(errors[5m])) > 0.05',
  forDuration: '5m', severity: AlertSeverity.CRITICAL,
  serviceId: null, labels: {}, annotations: {},
  actorId: 'u-1', ipAddress: null,
};

describe('CreateAlertRuleUseCase', () => {
  let useCase: CreateAlertRuleUseCase;
  beforeEach(() => { jest.clearAllMocks(); useCase = new CreateAlertRuleUseCase(mockRepo, mockAudit); });

  it('creates an alert rule and returns it', async () => {
    mockRepo.existsByName.mockResolvedValue(false);
    mockRepo.create.mockResolvedValue(makeRule());
    mockAudit.publish.mockResolvedValue(undefined);

    const result = await useCase.execute(command);
    expect(result.name).toBe('HighErrorRate');
    expect(mockAudit.publish).toHaveBeenCalledWith(expect.objectContaining({ action: 'ALERT_RULE_CREATE', result: 'SUCCESS' }));
  });

  it('throws AlertRuleNameConflictError when name is taken', async () => {
    mockRepo.existsByName.mockResolvedValue(true);
    await expect(useCase.execute(command)).rejects.toThrow(AlertRuleNameConflictError);
  });
});