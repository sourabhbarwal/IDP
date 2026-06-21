import { Inject, Injectable } from '@nestjs/common';
import { Repository } from '../../domain/entities/repository.entity';
import { RepositoryNotFoundError } from '../../domain/exceptions/domain-exceptions';
import { REPOSITORY_REPOSITORY, RepositoryRepository } from '../../domain/repositories/repository.repository.port';

@Injectable()
export class GetRepositoryUseCase {
  constructor(@Inject(REPOSITORY_REPOSITORY) private readonly repo: RepositoryRepository) {}

  async executeById(id: string): Promise<Repository> {
    const repository = await this.repo.findById(id);
    if (!repository) throw new RepositoryNotFoundError(id);
    return repository;
  }

  async executeByServiceId(serviceId: string): Promise<Repository> {
    const repository = await this.repo.findByServiceId(serviceId);
    if (!repository) throw new RepositoryNotFoundError(`serviceId:${serviceId}`);
    return repository;
  }
}