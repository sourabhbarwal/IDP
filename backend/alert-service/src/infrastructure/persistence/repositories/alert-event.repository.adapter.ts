import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AlertEvent } from '../../../domain/entities/alert-event.entity';
import { AlertSeverity } from '../../../domain/enums/alert-severity.enum';
import { AlertStatus } from '../../../domain/enums/alert-status.enum';
import { AlertEventRepository } from '../../../domain/repositories/alert-event.repository.port';
import { AlertEventOrmEntity } from '../orm-entities/alert-event.orm-entity';
import { toDomainAlertEvent } from './entity-mappers';

@Injectable()
export class AlertEventRepositoryAdapter implements AlertEventRepository {
  constructor(@InjectRepository(AlertEventOrmEntity) private readonly repo: Repository<AlertEventOrmEntity>) {}

  async findById(id: string): Promise<AlertEvent | null> {
    const e = await this.repo.findOne({ where: { id } });
    return e ? toDomainAlertEvent(e) : null;
  }

  async findActive(): Promise<AlertEvent[]> {
    const items = await this.repo.find({
      where: { status: AlertStatus.FIRING },
      order: { startsAt: 'DESC' },
    });
    return items.map(toDomainAlertEvent);
  }

  async findByServiceId(serviceId: string, page: number, size: number) {
    const [items, total] = await this.repo.findAndCount({
      where: { serviceId }, order: { startsAt: 'DESC' },
      skip: page * size, take: size,
    });
    return { items: items.map(toDomainAlertEvent), total };
  }

  async findAll(page: number, size: number) {
    const [items, total] = await this.repo.findAndCount({
      order: { startsAt: 'DESC' }, skip: page * size, take: size,
    });
    return { items: items.map(toDomainAlertEvent), total };
  }

  async upsertFromAlertManager(params: {
    alertName: string; severity: AlertSeverity; status: AlertStatus;
    namespace: string | null; labels: Record<string, string>;
    annotations: Record<string, string>; startsAt: Date; endsAt: Date | null;
  }): Promise<AlertEvent> {
    // Find existing firing alert by name + startsAt fingerprint
    let existing = await this.repo.findOne({
      where: { alertName: params.alertName, status: AlertStatus.FIRING },
    });

    if (existing) {
      await this.repo.update({ id: existing.id }, {
        status: params.status,
        endsAt: params.endsAt,
      });
      existing = await this.repo.findOneOrFail({ where: { id: existing.id } });
      return toDomainAlertEvent(existing);
    }

    const entity = this.repo.create({ ...params });
    const saved = await this.repo.save(entity);
    return toDomainAlertEvent(saved);
  }

  async acknowledge(id: string, acknowledgedBy: string): Promise<void> {
    await this.repo.update({ id }, {
      acknowledgedBy,
      acknowledgedAt: new Date(),
      status: AlertStatus.ACKNOWLEDGED,
    });
  }
}