import { Repository } from '../entities/repository.entity';
import { RepositoryStatus } from '../enums/repository-status.enum';
import { RepositoryVisibility } from '../enums/repository-visibility.enum';

export const REPOSITORY_REPOSITORY = 'REPOSITORY_REPOSITORY';

export interface RepositoryRepository {
  findById(id: string): Promise<Repository | null>;
  findByServiceId(serviceId: string): Promise<Repository | null>;
  findAll(page: number, size: number): Promise<{ items: Repository[]; total: number }>;
  existsByServiceId(serviceId: string): Promise<boolean>;
  create(params: {
    serviceId: string;
    serviceName: string;
    serviceType: string;
    githubOwner: string;
    githubRepo: string;
    fullName: string;
    defaultBranch: string;
    htmlUrl: string;
    cloneUrl: string;
    sshUrl: string;
    visibility: RepositoryVisibility;
    status: RepositoryStatus;
    provisionedBy: string;
  }): Promise<Repository>;
  updateStatus(id: string, status: RepositoryStatus, errorMessage?: string): Promise<void>;
  update(
    id: string,
    params: Partial<{
      githubOwner: string;
      githubRepo: string;
      fullName: string;
      htmlUrl: string;
      cloneUrl: string;
      sshUrl: string;
      visibility: RepositoryVisibility;
      status: RepositoryStatus;
      errorMessage: string | null;
    }>,
  ): Promise<Repository>;
}