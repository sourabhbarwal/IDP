import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Deployment } from '../../../domain/entities/deployment.entity';
import { DeploymentStatus } from '../../../domain/enums/deployment-status.enum';
import { DeploymentStrategy } from '../../../domain/enums/deployment-strategy.enum';
import { EnvironmentName } from '../../../domain/enums/environment-name.enum';
import {
  DeploymentRepository,
  ListDeploymentsFilter,
} from '../../../domain/repositories/deployment.repository.port';
import { DeploymentOrmEntity } from '../orm-entities/deployment.orm-entity';
import { toDomainDeployment } from './entity-mappers';

@Injectable()
export class DeploymentRepositoryAdapter implements DeploymentRepository {
  constructor(
    @InjectRepository(DeploymentOrmEntity) private readonly repo: Repository<DeploymentOrmEntity>,
  ) {}

  async findById(id: string): Promise<Deployment | null> {
    const e = await this.repo.findOne({ where: { id } });
    return e ? toDomainDeployment(e) : null;
  }

  async findLastSuccessful(serviceId: string, environment: EnvironmentName): Promise<Deployment | null> {
    const e = await this.repo.findOne({
      where: { serviceId, environment, status: DeploymentStatus.SUCCEEDED },
      order: { createdAt: 'DESC' },
    });
    return e ? toDomainDeployment(e) : null;
  }

  async findLatestForServiceEnv(serviceId: string, environment: EnvironmentName): Promise<Deployment | null> {
    const e = await this.repo.findOne({
      where: { serviceId, environment },
      order: { createdAt: 'DESC' },
    });
    return e ? toDomainDeployment(e) : null;
  }

  async list(filter: ListDeploymentsFilter): Promise<{ items: Deployment[]; total: number }> {
    const where: Record<string, unknown> = {};
    if (filter.serviceId) where['serviceId'] = filter.serviceId;
    if (filter.environment) where['environment'] = filter.environment;

    const [items, total] = await this.repo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: filter.page * filter.size,
      take: filter.size,
    });

    return { items: items.map(toDomainDeployment), total };
  }

  async create(params: {
    serviceId: string;
    serviceName: string;
    environment: EnvironmentName;
    namespace: string;
    imageTag: string;
    strategy: DeploymentStrategy;
    previousImageTag: string | null;
    replicas: number;
    canaryWeight: number | null;
    triggeredBy: string;
  }): Promise<Deployment> {
    const entity = this.repo.create({ ...params, status: DeploymentStatus.IN_PROGRESS, errorMessage: null });
    const saved = await this.repo.save(entity);
    return toDomainDeployment(saved);
  }

  async updateStatus(id: string, status: DeploymentStatus, errorMessage?: string): Promise<void> {
    const isTerminal = [
      DeploymentStatus.SUCCEEDED,
      DeploymentStatus.FAILED,
      DeploymentStatus.ROLLED_BACK,
    ].includes(status);

    await this.repo.update(
      { id },
      {
        status,
        errorMessage: errorMessage ?? null,
        ...(isTerminal ? { completedAt: new Date() } : {}),
      },
    );
  }
}