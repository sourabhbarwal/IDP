import { Inject, Injectable } from '@nestjs/common';
import { AUDIT_PUBLISHER, AuditPublisher, createAuditEvent } from '@idp/common';
import { AlertRule } from '../../domain/entities/alert-rule.entity';
import { AlertSeverity } from '../../domain/enums/alert-severity.enum';
import {
  AlertRuleNameConflictError,
} from '../../domain/exceptions/domain-exceptions';
import {
  ALERT_RULE_REPOSITORY,
  AlertRuleRepository,
} from '../../domain/repositories/alert-rule.repository.port';

export interface CreateAlertRuleCommand {
  name: string;
  description: string | null;
  promqlExpression: string;
  forDuration: string;
  severity: AlertSeverity;
  serviceId: string | null;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  actorId: string;
  ipAddress: string | null;
}

@Injectable()
export class CreateAlertRuleUseCase {
  constructor(
    @Inject(ALERT_RULE_REPOSITORY) private readonly repo: AlertRuleRepository,
    @Inject(AUDIT_PUBLISHER) private readonly audit: AuditPublisher,
  ) {}

  async execute(command: CreateAlertRuleCommand): Promise<AlertRule> {
    const exists = await this.repo.existsByName(command.name);
    if (exists) throw new AlertRuleNameConflictError(command.name);

    const rule = await this.repo.create({
      name: command.name,
      description: command.description,
      promqlExpression: command.promqlExpression,
      forDuration: command.forDuration,
      severity: command.severity,
      serviceId: command.serviceId,
      labels: command.labels,
      annotations: command.annotations,
      createdBy: command.actorId,
    });

    await this.audit.publish(createAuditEvent({
      userId: command.actorId,
      action: 'ALERT_RULE_CREATE',
      resourceType: 'ALERT_RULE',
      resourceId: rule.id,
      result: 'SUCCESS',
      ipAddress: command.ipAddress,
    }));

    return rule;
  }
}