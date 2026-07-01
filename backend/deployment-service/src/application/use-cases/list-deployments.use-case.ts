import { Inject, Injectable } from '@nestjs/common';
import { EnvironmentName } from '../../domain/enums/environment-name.enum';
import {
  DEPLOYMENT_REPOSITORY,
  DeploymentRepository,
} from '../../domain/repositories/deployment.repository.port';

export interface ListDeploymentsQuery {
  serviceId?: string;
  environment?: EnvironmentName;
  page: number;
  size: number;
}

@Injectable()
export class ListDeploymentsUseCase {
  constructor(@Inject(DEPLOYMENT_REPOSITORY) private readonly repo: DeploymentRepository) {}

  async execute(query: ListDeploymentsQuery) {
    return this.repo.list({
      serviceId: query.serviceId,
      environment: query.environment,
      page: query.page,
      size: Math.min(query.size, 100),
    });
  }
}