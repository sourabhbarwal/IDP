import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditEvent, AuditPublisher } from '@idp/common';
import { AuditLogOrmEntity } from '../persistence/orm-entities/audit-log.orm-entity';

@Injectable()
export class LocalAuditPublisher implements AuditPublisher {
  private readonly logger = new Logger('Audit');

  constructor(@InjectRepository(AuditLogOrmEntity) private readonly repo: Repository<AuditLogOrmEntity>) {}

  async publish(event: AuditEvent): Promise<void> {
    this.logger.log(JSON.stringify(event));
    const entity = this.repo.create({
      userId: event.userId,
      action: event.action,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      result: event.result,
      ipAddress: event.ipAddress,
      metadata: event.metadata ?? null,
    });
    await this.repo.save(entity);
  }
}