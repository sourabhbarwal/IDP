import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Service } from '../../../domain/entities/service.entity';
import { ServiceType } from '../../../domain/enums/service-type.enum';
import { ServiceStatus } from '../../../domain/enums/service-status.enum';
import {
  ListServicesFilter,
  ListServicesResult,
  ServiceRepository,
} from '../../../domain/repositories/service.repository.port';
import { ServiceOrmEntity } from '../orm-entities/service.orm-entity';
import { toDomainService } from './entity-mappers';

@Injectable()
export class ServiceRepositoryAdapter implements ServiceRepository {
  constructor(
    @InjectRepository(ServiceOrmEntity) private readonly repo: Repository<ServiceOrmEntity>,
  ) {}

  async findById(id: string): Promise<Service | null> {
    const e = await this.repo.findOne({ where: { id }, relations: { versions: true } });
    return e ? toDomainService(e) : null;
  }

  async findByName(name: string): Promise<Service | null> {
    const e = await this.repo.findOne({ where: { name }, relations: { versions: true } });
    return e ? toDomainService(e) : null;
  }

  async existsByName(name: string): Promise<boolean> {
    return (await this.repo.count({ where: { name } })) > 0;
  }

  async list(filter: ListServicesFilter): Promise<ListServicesResult> {
    const where: Record<string, unknown> = {};
    if (filter.type) where['type'] = filter.type;
    if (filter.status) where['status'] = filter.status;
    if (filter.ownerId) where['ownerId'] = filter.ownerId;
    if (filter.team) where['team'] = filter.team;
    if (filter.search) where['name'] = ILike(`%${filter.search}%`);

    const [items, total] = await this.repo.findAndCount({
      where,
      relations: { versions: true },
      order: { createdAt: 'DESC' },
      skip: filter.page * filter.size,
      take: filter.size,
    });

    return { items: items.map(toDomainService), total };
  }

  async create(params: {
    name: string;
    description: string | null;
    type: ServiceType;
    team: string | null;
    repositoryUrl: string | null;
    tags: string[];
    ownerId: string;
    ownerEmail: string;
    createdBy: string;
  }): Promise<Service> {
    const entity = this.repo.create({
      ...params,
      status: ServiceStatus.ACTIVE,
      versions: [],
    });
    const saved = await this.repo.save(entity);
    return toDomainService(saved);
  }

  async update(
    id: string,
    params: {
      description?: string | null;
      type?: ServiceType;
      status?: ServiceStatus;
      team?: string | null;
      repositoryUrl?: string | null;
      tags?: string[];
      updatedBy: string;
    },
  ): Promise<Service> {
    const updates: Partial<ServiceOrmEntity> = { updatedBy: params.updatedBy };
    if (params.description !== undefined) updates.description = params.description;
    if (params.type !== undefined) updates.type = params.type;
    if (params.status !== undefined) updates.status = params.status;
    if (params.team !== undefined) updates.team = params.team;
    if (params.repositoryUrl !== undefined) updates.repositoryUrl = params.repositoryUrl;
    if (params.tags !== undefined) updates.tags = params.tags;

    await this.repo.update({ id }, updates);
    const updated = await this.repo.findOneOrFail({
      where: { id },
      relations: { versions: true },
    });
    return toDomainService(updated);
  }

  async softDelete(id: string): Promise<void> {
    await this.repo.softDelete({ id });
  }
}