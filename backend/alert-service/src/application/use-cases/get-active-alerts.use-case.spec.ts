import { GetActiveAlertsUseCase } from './get-active-alerts.use-case';
import { AlertEvent } from '../../domain/entities/alert-event.entity';
import { AlertSeverity } from '../../domain/enums/alert-severity.enum';
import { AlertStatus } from '../../domain/enums/alert-status.enum';
import { AlertEventRepository } from '../../domain/repositories/alert-event.repository.port';

const mockRepo: jest.Mocked<AlertEventRepository> = {
  findById: jest.fn(),
  findActive: jest.fn(),
  findByServiceId: jest.fn(),
  findAll: jest.fn(),
  upsertFromAlertManager: jest.fn(),
  acknowledge: jest.fn(),
};

function makeEvent(): AlertEvent {
  return new AlertEvent({
    id: 'e-1',
    alertName: 'HighErrorRate',
    severity: AlertSeverity.CRITICAL,
    status: AlertStatus.FIRING,
    namespace: 'dev-auth-service',
    serviceId: null,
    labels: {},
    annotations: {},
    startsAt: new Date(),
    endsAt: null,
    acknowledgedBy: null,
    acknowledgedAt: null,
    createdAt: new Date(),
  });
}

describe('GetActiveAlertsUseCase', () => {
  let useCase: GetActiveAlertsUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new GetActiveAlertsUseCase(mockRepo);
  });

  it('returns active alert events from the repository', async () => {
    const event = makeEvent();
    mockRepo.findActive.mockResolvedValue([event]);

    const result = await useCase.execute();

    expect(mockRepo.findActive).toHaveBeenCalled();
    expect(result).toEqual([event]);
  });

  it('returns an empty array when nothing is firing', async () => {
    mockRepo.findActive.mockResolvedValue([]);

    const result = await useCase.execute();

    expect(result).toEqual([]);
  });
});