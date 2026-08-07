import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlertSeverity } from '../../domain/enums/alert-severity.enum';
import { AlertStatus } from '../../domain/enums/alert-status.enum';
import {
  ALERT_EVENT_REPOSITORY,
  AlertEventRepository,
} from '../../domain/repositories/alert-event.repository.port';
import { resilientFetch, CircuitBreaker, CircuitOpenError } from '@idp/common';

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
  private readonly realtimeServiceUrl: string;
  private readonly internalToken: string;
  private readonly cbRealtime = new CircuitBreaker({
    name: 'realtime-service',
    failureThreshold: 5,
    recoveryTimeMs: 60_000, // longer recovery — realtime is non-critical
  });
  constructor(
    @Inject(ALERT_EVENT_REPOSITORY) private readonly repo: AlertEventRepository,
    private readonly config: ConfigService,
  ) {
    this.realtimeServiceUrl = config.get<string>(
      'REALTIME_SERVICE_URL',
      'http://realtime-service:3013',
    );
    this.internalToken = config.get<string>(
      'INTERNAL_WEBHOOK_TOKEN',
      '***REMOVED***',
    );
  }

  async execute(payload: AlertManagerWebhookPayload): Promise<void> {
    this.logger.log(
      `Processing AlertManager webhook: ${payload.alerts.length} alerts, ` +
      `status=${payload.status}`,
    );

    for (const alert of payload.alerts) {
      const severity =
        (alert.labels['severity'] as AlertSeverity) ?? AlertSeverity.WARNING;
      const status =
        alert.status === 'firing' ? AlertStatus.FIRING : AlertStatus.RESOLVED;
      const namespace = alert.labels['namespace'] ?? null;

      const event = await this.repo.upsertFromAlertManager({
        alertName:   alert.labels['alertname'] ?? 'unknown',
        severity,
        status,
        namespace,
        labels:      alert.labels,
        annotations: alert.annotations,
        startsAt:    new Date(alert.startsAt),
        endsAt:
          alert.endsAt && alert.endsAt !== '0001-01-01T00:00:00Z'
            ? new Date(alert.endsAt)
            : null,
      });

      await this.publishToRealtime(event.alertName, severity, status, namespace, alert.annotations);
    }
  }

  private async publishToRealtime(
    alertName: string,
    severity: AlertSeverity,
    status: AlertStatus,
    namespace: string | null,
    annotations: Record<string, string>,
  ): Promise<void> {
    const eventType = status === AlertStatus.FIRING
      ? 'alert:fired'
      : 'alert:resolved';

    try {
    const res = await resilientFetch(
      `${this.realtimeServiceUrl}/api/v1/events`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-token': this.internalToken,
        },
        body: JSON.stringify({
          type:     eventType,
          severity: severity === AlertSeverity.CRITICAL ? 'critical' : 'warning',
          payload: {
            alertName,
            severity,
            status,
            namespace,
            summary: annotations['summary'] ?? alertName,
          },
        }),
      },
      {
        timeoutMs:   3_000,
        maxAttempts: 2,     // Only 2 attempts — realtime is best-effort
        circuit:     this.cbRealtime,
      },
    );

    if (!res.ok) {
      this.logger.warn(`Realtime service returned ${res.status} for ${eventType}`);
      }
    } catch (err) {
      if (err instanceof CircuitOpenError) {
        this.logger.warn('Realtime service circuit is OPEN — skipping push notification');
      } else {
        this.logger.warn(`Could not notify realtime-service: ${err}`);
      }
      // Non-blocking — alert processing continues regardless
    }
  }
}