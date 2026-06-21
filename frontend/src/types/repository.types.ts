export type RepositoryStatus = 'PROVISIONING' | 'ACTIVE' | 'FAILED' | 'ARCHIVED';
export type RepositoryVisibility = 'public' | 'private' | 'internal';

export interface Repository {
  id: string;
  serviceId: string;
  serviceName: string;
  serviceType: string;
  fullName: string;
  htmlUrl: string;
  cloneUrl: string;
  sshUrl: string;
  defaultBranch: string;
  visibility: RepositoryVisibility;
  status: RepositoryStatus;
  errorMessage: string | null;
  provisionedBy: string;
  provisionedAt: string;
  createdAt: string;
}