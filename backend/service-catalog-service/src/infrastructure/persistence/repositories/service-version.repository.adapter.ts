import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceVersion } from '../../../domain/entities/service-version.entity';
import { ServiceVersionRepository } from '../../../domain/repositories/service-version.repository.port';
import { ServiceVersionOrmEntity } from '../orm-entities/service-version.orm-entity';
import { toDomainServiceVersion } from './entity-mappers';

@Injectable()
export class ServiceVersionRepositoryAdapter implements ServiceVersionRepository {
  constructor(
    @InjectRepository(ServiceVersionOrmEntity) private readonly repo: Repository<ServiceVersionOrmEntity>,
  ) {}

  async findByServiceId(serviceId: string): Promise<ServiceVersion[]> {
    const items = await this.repo.find({
      where: { serviceId },
      order: { createdAt: 'DESC' },
    });
    return items.map(toDomainServiceVersion);
  }

  async create(params: {
    serviceId: string; version: string; changelog: string | null;
    deployedAt: Date | null; environment: string | null; createdBy: string;
  }): Promise<ServiceVersion> {
    const entity = this.repo.create(params);
    const saved = await this.repo.save(entity);
    return toDomainServiceVersion(saved);
  }
}