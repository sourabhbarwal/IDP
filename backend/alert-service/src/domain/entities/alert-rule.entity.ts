import { AlertSeverity } from '../enums/alert-severity.enum';

export interface AlertRuleProps {
  id: string;
  name: string;
  description: string | null;
  promqlExpression: string;
  forDuration: string;
  severity: AlertSeverity;
  serviceId: string | null;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  enabled: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * AlertRule — a Prometheus alerting rule managed via the IDP portal.
 * Rules are stored in the DB and synced to Prometheus rule files.
 */
export class AlertRule {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly promqlExpression: string;
  readonly forDuration: string;
  readonly severity: AlertSeverity;
  readonly serviceId: string | null;
  readonly labels: Record<string, string>;
  readonly annotations: Record<string, string>;
  readonly enabled: boolean;
  readonly createdBy: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: AlertRuleProps) {
    this.id = props.id;
    this.name = props.name;
    this.description = props.description;
    this.promqlExpression = props.promqlExpression;
    this.forDuration = props.forDuration;
    this.severity = props.severity;
    this.serviceId = props.serviceId;
    this.labels = props.labels;
    this.annotations = props.annotations;
    this.enabled = props.enabled;
    this.createdBy = props.createdBy;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  toPrometheusRule(): object {
    return {
      alert: this.name,
      expr: this.promqlExpression,
      for: this.forDuration,
      labels: { severity: this.severity, ...this.labels },
      annotations: {
        summary: this.description ?? this.name,
        ...this.annotations,
      },
    };
  }
}