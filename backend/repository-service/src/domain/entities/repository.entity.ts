import { RepositoryStatus } from '../enums/repository-status.enum';
import { RepositoryVisibility } from '../enums/repository-visibility.enum';

export interface RepositoryProps {
  id: string;
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
  provisionedAt: Date;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Repository domain entity. Represents a provisioned GitHub repository
 * linked to a Service Catalog entry.
 */
export class Repository {
  readonly id!: string;
  readonly serviceId!: string;
  readonly serviceName!: string;
  readonly serviceType!: string;
  readonly githubOwner!: string;
  readonly githubRepo!: string;
  readonly fullName!: string;
  readonly defaultBranch!: string;
  readonly htmlUrl!: string;
  readonly cloneUrl!: string;
  readonly sshUrl!: string;
  readonly visibility!: RepositoryVisibility;
  readonly status!: RepositoryStatus;
  readonly provisionedBy!: string;
  readonly provisionedAt!: Date;
  readonly errorMessage!: string | null;
  readonly createdAt!: Date;
  readonly updatedAt!: Date;

  constructor(props: RepositoryProps) {
    Object.assign(this, props);
  }

  isActive(): boolean {
    return this.status === RepositoryStatus.ACTIVE;
  }
}