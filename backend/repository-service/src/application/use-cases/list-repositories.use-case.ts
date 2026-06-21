import { Inject, Injectable } from '@nestjs/common';
import { REPOSITORY_REPOSITORY, RepositoryRepository } from '../../domain/repositories/repository.repository.port';

@Injectable()
export class ListRepositoriesUseCase {
  constructor(@Inject(REPOSITORY_REPOSITORY) private readonly repo: RepositoryRepository) {}

  async execute(page: number, size: number) {
    return this.repo.findAll(page, Math.min(size, 100));
  }
}