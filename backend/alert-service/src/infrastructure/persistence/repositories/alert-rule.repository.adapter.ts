import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AlertRule } from '../../../domain/entities/alert-rule.entity';
import { AlertSeverity } from '../../../domain/enums/alert-severity.enum';
import { AlertRuleRepository } from '../../../domain/repositories/alert-rule.repository.port';
import { AlertRuleOrmEntity } from '../orm-entities/alert-rule.orm-entity';
import { toDomainAlertRule } from './entity-mappers';

@Injectable()
export class AlertRuleRepositoryAdapter implements AlertRuleRepository {
  constructor(@InjectRepository(AlertRuleOrmEntity) private readonly repo: Repository<AlertRuleOrmEntity>) {}

  async findById(id: string): Promise<AlertRule | null> {
    const e = await this.repo.findOne({ where: { id } });
    return e ? toDomainAlertRule(e) : null;
  }

  async findByName(name: string): Promise<AlertRule | null> {
    const e = await this.repo.findOne({ where: { name } });
    return e ? toDomainAlertRule(e) : null;
  }

  async findAll(page: number, size: number, serviceId?: string | null): Promise<{ items: AlertRule[]; total: number }> {
    const [items, total] = await this.repo.findAndCount({
      where: serviceId ? { serviceId } : {},
      order: { createdAt: 'DESC' }, skip: page * size, take: size,
    });
    return { items: items.map(toDomainAlertRule), total };
  }

  async findEnabled(): Promise<AlertRule[]> {
    const items = await this.repo.find({ where: { enabled: true } });
    return items.map(toDomainAlertRule);
  }

  async existsByName(name: string): Promise<boolean> {
    return (await this.repo.count({ where: { name } })) > 0;
  }

  async create(params: {
    name: string; description: string | null; promqlExpression: string;
    forDuration: string; severity: AlertSeverity; serviceId: string | null;
    labels: Record<string, string>; annotations: Record<string, string>; createdBy: string;
  }): Promise<AlertRule> {
    const entity = this.repo.create({ ...params, enabled: true });
    const saved = await this.repo.save(entity);
    return toDomainAlertRule(saved);
  }

  async update(id: string, params: Partial<{
    description: string | null; promqlExpression: string; forDuration: string;
    severity: AlertSeverity; labels: Record<string, string>;
    annotations: Record<string, string>; enabled: boolean;
  }>): Promise<AlertRule> {
    await this.repo.update({ id }, params);
    const updated = await this.repo.findOneOrFail({ where: { id } });
    return toDomainAlertRule(updated);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete({ id });
  }
}