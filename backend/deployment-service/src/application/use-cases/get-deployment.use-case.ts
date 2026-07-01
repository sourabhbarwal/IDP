import { Inject, Injectable } from '@nestjs/common';
import { Deployment } from '../../domain/entities/deployment.entity';
import { DeploymentNotFoundError } from '../../domain/exceptions/domain-exceptions';
import {
  DEPLOYMENT_REPOSITORY,
  DeploymentRepository,
} from '../../domain/repositories/deployment.repository.port';

@Injectable()
export class GetDeploymentUseCase {
  constructor(@Inject(DEPLOYMENT_REPOSITORY) private readonly repo: DeploymentRepository) {}

  async execute(id: string): Promise<Deployment> {
    const deployment = await this.repo.findById(id);
    if (!deployment) throw new DeploymentNotFoundError(id);
    return deployment;
  }
}