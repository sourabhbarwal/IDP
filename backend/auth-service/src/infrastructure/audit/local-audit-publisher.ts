import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditEvent, AuditPublisher } from '@idp/common';
import { AuditLogOrmEntity } from '../persistence/orm-entities/audit-log.orm-entity';

/**
 * Phase 1 implementation of {@link AuditPublisher}: writes structured log lines and
 * persists to `auth.audit_logs`. When `audit-service` exists, this is replaced (or
 * supplemented) by a Redis Streams publisher without any change to use cases
 * (ADR-0002 / ADR-0003).
 */
@Injectable()
export class LocalAuditPublisher implements AuditPublisher {
  private readonly logger = new Logger('Audit');

  constructor(@InjectRepository(AuditLogOrmEntity) private readonly auditLogs: Repository<AuditLogOrmEntity>) {}

  async publish(event: AuditEvent): Promise<void> {
    this.logger.log(JSON.stringify(event));

    const entity = this.auditLogs.create({
      userId: event.userId,
      action: event.action,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      result: event.result,
      ipAddress: event.ipAddress,
      metadata: event.metadata ?? null,
    });

    await this.auditLogs.save(entity);
  }
}
