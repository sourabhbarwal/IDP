import { Repository } from './repository.entity';
import { RepositoryStatus } from '../enums/repository-status.enum';
import { RepositoryVisibility } from '../enums/repository-visibility.enum';

function makeRepo(status = RepositoryStatus.ACTIVE): Repository {
  return new Repository({
    id: 'r-1', serviceId: 's-1', serviceName: 'my-service', serviceType: 'NODEJS',
    githubOwner: 'test-org', githubRepo: 'my-service',
    fullName: 'test-org/my-service',
    defaultBranch: 'main',
    htmlUrl: 'https://github.com/test-org/my-service',
    cloneUrl: 'https://github.com/test-org/my-service.git',
    sshUrl: 'git@github.com:test-org/my-service.git',
    visibility: RepositoryVisibility.PRIVATE,
    status,
    provisionedBy: 'u-1',
    provisionedAt: new Date(),
    errorMessage: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

describe('Repository domain entity', () => {
  it('isActive() returns true when status is ACTIVE', () => {
    expect(makeRepo(RepositoryStatus.ACTIVE).isActive()).toBe(true);
  });

  it('isActive() returns false when status is PROVISIONING', () => {
    expect(makeRepo(RepositoryStatus.PROVISIONING).isActive()).toBe(false);
  });

  it('isActive() returns false when status is FAILED', () => {
    expect(makeRepo(RepositoryStatus.FAILED).isActive()).toBe(false);
  });
});