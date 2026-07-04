import { Inject, Injectable, Logger } from '@nestjs/common';
import { AlertSeverity } from '../../domain/enums/alert-severity.enum';
import { AlertStatus } from '../../domain/enums/alert-status.enum';
import {
  ALERT_EVENT_REPOSITORY,
  AlertEventRepository,
} from '../../domain/repositories/alert-event.repository.port';

export interface AlertManagerAlert {
  status: 'firing' | 'resolved';
  labels: Record<string, string>;
  annotations: Record<string, string>;
  startsAt: string;
  endsAt: string;
  generatorURL: string;
}

export interface AlertManagerWebhookPayload {
  version: string;
  groupKey: string;
  status: 'firing' | 'resolved';
  receiver: string;
  alerts: AlertManagerAlert[];
  commonLabels: Record<string, string>;
  commonAnnotations: Record<string, string>;
  externalURL: string;
}

@Injectable()
export class ProcessAlertManagerWebhookUseCase {
  private readonly logger = new Logger(ProcessAlertManagerWebhookUseCase.name);

  constructor(
    @Inject(ALERT_EVENT_REPOSITORY) private readonly repo: AlertEventRepository,
  ) {}

  async execute(payload: AlertManagerWebhookPayload): Promise<void> {
    this.logger.log(
      `Processing AlertManager webhook: ${payload.alerts.length} alerts, status=${payload.status}`,
    );

    for (const alert of payload.alerts) {
      const severity = (alert.labels['severity'] as AlertSeverity) ?? AlertSeverity.WARNING;
      const status = alert.status === 'firing' ? AlertStatus.FIRING : AlertStatus.RESOLVED;
      const namespace = alert.labels['namespace'] ?? null;

      await this.repo.upsertFromAlertManager({
        alertName: alert.labels['alertname'] ?? 'unknown',
        severity,
        status,
        namespace,
        labels: alert.labels,
        annotations: alert.annotations,
        startsAt: new Date(alert.startsAt),
        endsAt: alert.endsAt && alert.endsAt !== '0001-01-01T00:00:00Z'
          ? new Date(alert.endsAt)
          : null,
      });
    }
  }
}