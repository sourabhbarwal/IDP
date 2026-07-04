import { AlertEvent } from '../entities/alert-event.entity';
import { AlertSeverity } from '../enums/alert-severity.enum';
import { AlertStatus } from '../enums/alert-status.enum';

export const ALERT_EVENT_REPOSITORY = 'ALERT_EVENT_REPOSITORY';

export interface AlertEventRepository {
  findById(id: string): Promise<AlertEvent | null>;
  findActive(): Promise<AlertEvent[]>;
  findByServiceId(serviceId: string, page: number, size: number): Promise<{ items: AlertEvent[]; total: number }>;
  findAll(page: number, size: number): Promise<{ items: AlertEvent[]; total: number }>;
  upsertFromAlertManager(params: {
    alertName: string;
    severity: AlertSeverity;
    status: AlertStatus;
    namespace: string | null;
    labels: Record<string, string>;
    annotations: Record<string, string>;
    startsAt: Date;
    endsAt: Date | null;
  }): Promise<AlertEvent>;
  acknowledge(id: string, acknowledgedBy: string): Promise<void>;
}