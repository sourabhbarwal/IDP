import { AlertSeverity } from '../enums/alert-severity.enum';
import { AlertStatus } from '../enums/alert-status.enum';

export interface AlertEventProps {
  id: string;
  alertName: string;
  severity: AlertSeverity;
  status: AlertStatus;
  namespace: string | null;
  serviceId: string | null;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  startsAt: Date;
  endsAt: Date | null;
  acknowledgedBy: string | null;
  acknowledgedAt: Date | null;
  createdAt: Date;
}

/**
 * AlertEvent — a fired alert instance received from AlertManager.
 */
export class AlertEvent {
  readonly id: string;
  readonly alertName: string;
  readonly severity: AlertSeverity;
  readonly status: AlertStatus;
  readonly namespace: string | null;
  readonly serviceId: string | null;
  readonly labels: Record<string, string>;
  readonly annotations: Record<string, string>;
  readonly startsAt: Date;
  readonly endsAt: Date | null;
  readonly acknowledgedBy: string | null;
  readonly acknowledgedAt: Date | null;
  readonly createdAt: Date;

  constructor(props: AlertEventProps) {
    this.id = props.id;
    this.alertName = props.alertName;
    this.severity = props.severity;
    this.status = props.status;
    this.namespace = props.namespace;
    this.serviceId = props.serviceId;
    this.labels = props.labels;
    this.annotations = props.annotations;
    this.startsAt = props.startsAt;
    this.endsAt = props.endsAt;
    this.acknowledgedBy = props.acknowledgedBy;
    this.acknowledgedAt = props.acknowledgedAt;
    this.createdAt = props.createdAt;
  }

  isFiring(): boolean {
    return this.status === AlertStatus.FIRING;
  }

  isAcknowledged(): boolean {
    return this.acknowledgedBy !== null;
  }

  durationMs(): number {
    const end = this.endsAt ?? new Date();
    return end.getTime() - this.startsAt.getTime();
  }
}