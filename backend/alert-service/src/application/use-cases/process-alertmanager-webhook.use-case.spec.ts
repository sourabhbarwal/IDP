import { ProcessAlertManagerWebhookUseCase, AlertManagerWebhookPayload } from './process-alertmanager-webhook.use-case';
import { AlertEvent } from '../../domain/entities/alert-event.entity';
import { AlertSeverity } from '../../domain/enums/alert-severity.enum';
import { AlertStatus } from '../../domain/enums/alert-status.enum';
import { AlertEventRepository } from '../../domain/repositories/alert-event.repository.port';
import { ConfigService } from '@nestjs/config';

const mockRepo: jest.Mocked<AlertEventRepository> = {
  findById: jest.fn(), findActive: jest.fn(), findByServiceId: jest.fn(),
  findAll: jest.fn(), upsertFromAlertManager: jest.fn(), acknowledge: jest.fn(),
};

const makeEvent = (): AlertEvent => new AlertEvent({
  id: 'e-1', alertName: 'HighErrorRate', severity: AlertSeverity.CRITICAL,
  status: AlertStatus.FIRING, namespace: 'dev-auth-service', serviceId: null,
  labels: {}, annotations: {}, startsAt: new Date(), endsAt: null,
  acknowledgedBy: null, acknowledgedAt: null, createdAt: new Date(),
});

const payload: AlertManagerWebhookPayload = {
  version: '4', groupKey: 'key', status: 'firing', receiver: 'webhook',
  externalURL: 'http://alertmanager:9093',
  commonLabels: {}, commonAnnotations: {},
  alerts: [
    {
      status: 'firing',
      labels: { alertname: 'HighErrorRate', severity: 'critical', namespace: 'dev-auth-service' },
      annotations: { summary: 'High error rate' },
      startsAt: new Date().toISOString(),
      endsAt: '0001-01-01T00:00:00Z',
      generatorURL: 'http://prometheus:9090/...',
    },
  ],
};

describe('ProcessAlertManagerWebhookUseCase', () => {
  let useCase: ProcessAlertManagerWebhookUseCase;
  const mockConfig = {
    get: jest.fn((key: string, def?: string) => def ?? ''),
  } as unknown as ConfigService;

  beforeEach(() => { jest.clearAllMocks(); useCase = new ProcessAlertManagerWebhookUseCase(mockRepo, mockConfig); });
  it('upserts each alert from the payload', async () => {
    mockRepo.upsertFromAlertManager.mockResolvedValue(makeEvent());

    await useCase.execute(payload);

    expect(mockRepo.upsertFromAlertManager).toHaveBeenCalledTimes(1);
    expect(mockRepo.upsertFromAlertManager).toHaveBeenCalledWith(
      expect.objectContaining({ alertName: 'HighErrorRate', status: AlertStatus.FIRING }),
    );
  });

  it('handles resolved alerts correctly', async () => {
    mockRepo.upsertFromAlertManager.mockResolvedValue(makeEvent());
    const resolvedPayload = { ...payload, alerts: [{ ...payload.alerts[0], status: 'resolved' as const }] };

    await useCase.execute(resolvedPayload);

    expect(mockRepo.upsertFromAlertManager).toHaveBeenCalledWith(
      expect.objectContaining({ status: AlertStatus.RESOLVED }),
    );
  });

  it('processes multiple alerts in one webhook call', async () => {
    mockRepo.upsertFromAlertManager.mockResolvedValue(makeEvent());
    const multiPayload = {
      ...payload,
      alerts: [
        { ...payload.alerts[0] },
        { ...payload.alerts[0], labels: { ...payload.alerts[0].labels, alertname: 'HighLatency' } },
      ],
    };

    await useCase.execute(multiPayload);

    expect(mockRepo.upsertFromAlertManager).toHaveBeenCalledTimes(2);
  });

  it('parses a real endsAt timestamp when alert has resolved with an end time', async () => {
    mockRepo.upsertFromAlertManager.mockResolvedValue(makeEvent());
    const realEndPayload = {
      ...payload,
      alerts: [{ ...payload.alerts[0], status: 'resolved' as const, endsAt: '2026-07-04T12:00:00Z' }],
    };

    await useCase.execute(realEndPayload);

    expect(mockRepo.upsertFromAlertManager).toHaveBeenCalledWith(
      expect.objectContaining({ endsAt: new Date('2026-07-04T12:00:00Z') }),
    );
  });
});