import { AcknowledgeAlertUseCase } from './acknowledge-alert.use-case';
import { AlertEventNotFoundError } from '../../domain/exceptions/domain-exceptions';
import { AlertEvent } from '../../domain/entities/alert-event.entity';
import { AlertSeverity } from '../../domain/enums/alert-severity.enum';
import { AlertStatus } from '../../domain/enums/alert-status.enum';
import { AlertEventRepository } from '../../domain/repositories/alert-event.repository.port';
import { AuditPublisher } from '@idp/common';

const mockRepo: jest.Mocked<AlertEventRepository> = {
  findById: jest.fn(), findActive: jest.fn(), findByServiceId: jest.fn(),
  findAll: jest.fn(), upsertFromAlertManager: jest.fn(), acknowledge: jest.fn(),
};
const mockAudit: jest.Mocked<AuditPublisher> = { publish: jest.fn() };

const makeEvent = (): AlertEvent => new AlertEvent({
  id: 'e-1', alertName: 'HighErrorRate', severity: AlertSeverity.CRITICAL,
  status: AlertStatus.FIRING, namespace: 'dev-auth-service', serviceId: null,
  labels: {}, annotations: {}, startsAt: new Date(), endsAt: null,
  acknowledgedBy: null, acknowledgedAt: null, createdAt: new Date(),
});

describe('AcknowledgeAlertUseCase', () => {
  let useCase: AcknowledgeAlertUseCase;
  beforeEach(() => { jest.clearAllMocks(); useCase = new AcknowledgeAlertUseCase(mockRepo, mockAudit); });

  it('acknowledges an existing alert event', async () => {
    mockRepo.findById.mockResolvedValue(makeEvent());
    mockRepo.acknowledge.mockResolvedValue(undefined);
    mockAudit.publish.mockResolvedValue(undefined);

    await useCase.execute({ alertEventId: 'e-1', actorId: 'u-1', ipAddress: null });

    expect(mockRepo.acknowledge).toHaveBeenCalledWith('e-1', 'u-1');
    expect(mockAudit.publish).toHaveBeenCalledWith(expect.objectContaining({ action: 'ALERT_ACKNOWLEDGE', result: 'SUCCESS' }));
  });

  it('throws AlertEventNotFoundError when event does not exist', async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(useCase.execute({ alertEventId: 'bad', actorId: 'u-1', ipAddress: null })).rejects.toThrow(AlertEventNotFoundError);
  });
});