import { Inject, Injectable } from '@nestjs/common';
import { AUDIT_PUBLISHER, AuditPublisher, createAuditEvent } from '@idp/common';
import { AlertEventNotFoundError } from '../../domain/exceptions/domain-exceptions';
import {
  ALERT_EVENT_REPOSITORY,
  AlertEventRepository,
} from '../../domain/repositories/alert-event.repository.port';

export interface AcknowledgeAlertCommand {
  alertEventId: string;
  actorId: string;
  ipAddress: string | null;
}

@Injectable()
export class AcknowledgeAlertUseCase {
  constructor(
    @Inject(ALERT_EVENT_REPOSITORY) private readonly repo: AlertEventRepository,
    @Inject(AUDIT_PUBLISHER) private readonly audit: AuditPublisher,
  ) {}

  async execute(command: AcknowledgeAlertCommand): Promise<void> {
    const event = await this.repo.findById(command.alertEventId);
    if (!event) throw new AlertEventNotFoundError(command.alertEventId);

    await this.repo.acknowledge(command.alertEventId, command.actorId);

    await this.audit.publish(createAuditEvent({
      userId: command.actorId,
      action: 'ALERT_ACKNOWLEDGE',
      resourceType: 'ALERT_EVENT',
      resourceId: command.alertEventId,
      result: 'SUCCESS',
      ipAddress: command.ipAddress,
    }));
  }
}