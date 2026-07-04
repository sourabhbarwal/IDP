import { AlertRule } from '../../../domain/entities/alert-rule.entity';
import { AlertEvent } from '../../../domain/entities/alert-event.entity';
import { AlertRuleOrmEntity } from '../orm-entities/alert-rule.orm-entity';
import { AlertEventOrmEntity } from '../orm-entities/alert-event.orm-entity';

export function toDomainAlertRule(e: AlertRuleOrmEntity): AlertRule {
  return new AlertRule({
    id: e.id, name: e.name, description: e.description,
    promqlExpression: e.promqlExpression, forDuration: e.forDuration,
    severity: e.severity, serviceId: e.serviceId,
    labels: e.labels, annotations: e.annotations,
    enabled: e.enabled, createdBy: e.createdBy,
    createdAt: e.createdAt, updatedAt: e.updatedAt,
  });
}

export function toDomainAlertEvent(e: AlertEventOrmEntity): AlertEvent {
  return new AlertEvent({
    id: e.id, alertName: e.alertName, severity: e.severity,
    status: e.status, namespace: e.namespace, serviceId: e.serviceId,
    labels: e.labels, annotations: e.annotations,
    startsAt: e.startsAt, endsAt: e.endsAt,
    acknowledgedBy: e.acknowledgedBy, acknowledgedAt: e.acknowledgedAt,
    createdAt: e.createdAt,
  });
}