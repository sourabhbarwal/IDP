import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository as TypeOrmRepo } from 'typeorm';
import { Repository } from '../../../domain/entities/repository.entity';
import { RepositoryStatus } from '../../../domain/enums/repository-status.enum';
import { RepositoryVisibility } from '../../../domain/enums/repository-visibility.enum';
import { RepositoryRepository } from '../../../domain/repositories/repository.repository.port';
import { RepositoryOrmEntity } from '../orm-entities/repository.orm-entity';
import { toDomainRepository } from './entity-mappers';

@Injectable()
export class RepositoryRepositoryAdapter implements RepositoryRepository {
  constructor(@InjectRepository(RepositoryOrmEntity) private readonly repo: TypeOrmRepo<RepositoryOrmEntity>) {}

  async findById(id: string): Promise<Repository | null> {
    const e = await this.repo.findOne({ where: { id } });
    return e ? toDomainRepository(e) : null;
  }

  async findByServiceId(serviceId: string): Promise<Repository | null> {
    const e = await this.repo.findOne({ where: { serviceId } });
    return e ? toDomainRepository(e) : null;
  }

  async findAll(page: number, size: number): Promise<{ items: Repository[]; total: number }> {
    const [items, total] = await this.repo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: page * size,
      take: size,
    });
    return { items: items.map(toDomainRepository), total };
  }

  async existsByServiceId(serviceId: string): Promise<boolean> {
    return (await this.repo.count({ where: { serviceId } })) > 0;
  }

  async create(params: {
    serviceId: string; serviceName: string; serviceType: string;
    githubOwner: string; githubRepo: string; fullName: string;
    defaultBranch: string; htmlUrl: string; cloneUrl: string; sshUrl: string;
    visibility: RepositoryVisibility; status: RepositoryStatus; provisionedBy: string;
  }): Promise<Repository> {
    const entity = this.repo.create({ ...params, errorMessage: null });
    const saved = await this.repo.save(entity);
    return toDomainRepository(saved);
  }

  async updateStatus(id: string, status: RepositoryStatus, errorMessage?: string): Promise<void> {
    await this.repo.update({ id }, { status, errorMessage: errorMessage ?? null });
  }
}